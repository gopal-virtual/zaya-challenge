var express = require('express');
var app = express();
var request = require('request');
var async = require('async');
var fs = require("fs");

app.get('/', home);
app.get('/get/challenges', getChallenges)

app.use(express.static(__dirname + '/node_modules'));
app.use(express.static(__dirname + '/bower_components'));
app.use(express.static(__dirname + '/templates'));
app.use(express.static(__dirname + '/script'));
app.use(express.static(__dirname + '/assets'));
app.use(express.static(__dirname + '/font'));
app.use(express.static(__dirname + '/css'));


var locked_threshold = 2;

var server = app.listen(8062, 'localhost', function() {

    var host = server.address().address
    var port = server.address().port

    console.log("Example app listening at http://%s:%s", host, port)

})

function home(req, res) {
    res.sendFile(__dirname + "/index.html");
}

function getChallenges (req, res) {
	var token = 'Token ' + req.headers.authorization.split(' ')[1];
	var accountid = req.query.account;
	var profileid = req.query.profile;

	if(accountid && profileid){
		async.waterfall([
		    getChallengeList,
		    getQuizList,
		    getFilteredQuizList
		], finalCallback);
	}
	else{
		res.writeHead(400, {
            'Content-Type': 'text/json'
        });
        return res.end(JSON.stringify({
        	'missing' : 'account_id or profile_id is not provided'
        }))
	}


	function finalCallback(err, result) {
		if(err){
	        res.writeHead(400, {
	            'Content-Type': 'text/json'
	        });
			return res.end(err);
		}
        res.writeHead(200, {
            'Content-Type': 'text/json'
        });
		return res.end(result);
	}

    function getChallengeList(callback) {
    	var config = {
			uri : 'https://cc-test-2.zaya.in/api/v1/accounts/'+ accountid +'/challenges/',
			method : 'GET',
			headers : {
				Authorization : token
			}
		};
		// request(config, function(error, response, body){
		// 	if(error){
		//         callback('error');
		// 	}
		// 	else {
		// 		var challenges = JSON.parse(body)
		// 		var challengeId = challenges[0].id;
		//         callback(null, challengeId);
		// 	}
		// })
        callback && callback(null, '5f4c3be1-837d-4955-8daf-6d9f216af021');
    }

    function getQuizList(challengeId, callback) {
		var config = {
			uri : 'https://cc-test-2.zaya.in/api/v1/accounts/'+accountid+'/lessons/'+ challengeId +'/',
			method : 'GET',
			headers : {
				Authorization : token
			}
		};
		fs.readFile('quiz.json', 'utf8', function(err, data) {
			callback && callback(null, JSON.parse(data));
		})
  //       request(config, function(error, response, body){
  //       	if(error){
  //       		callback('error')
  //       	}
  //       	else {
  //       		body = JSON.parse(body).objects;
  //       		callback(null, body)

  //       	}
		// })
    }

    function getFilteredQuizList (quizList, callback) {
		var config = {
			uri : 'https://cc-test-2.zaya.in/api/v1/profiles/'+profileid+'/points/',
			method : 'GET',
			headers : {
				Authorization : token
			}
		}
		fs.readFile('points.json', 'utf8', function(err, data) {
			data = JSON.parse(data);
			// logic for extracting data
			var accumulatedNodes = 0;
			var current_date = new Date();
			quizList.forEach(function(quiz, index){
				var totalPoints = 0;
				var totalNodes = 0;
				var start_date = range[index].start;
				var end_date = range[index+1].start || range[index].end;
				data.forEach(function(dataPoints){
					if(new Date(dataPoints.created) >= start_date && new Date(dataPoints.created) < end_date){
						totalPoints += dataPoints.score;
						totalNodes += dataPoints.action == 'node_complete' ? 1 : 0;
						accumulatedNodes = totalNodes;
					}
				})
				quiz['total_nodes_consumed'] = totalNodes;
				quiz['total_points_earned'] = totalPoints;
				if(current_date >= start_date && current_date < end_date){
					quiz['locked'] = totalNodes < locked_threshold ? true : false;
				}
				else if(current_date > end_date){
					quiz['locked'] = accumulatedNodes < locked_threshold*(index+1) ? true : false;
				}
				console.log(quiz.total_nodes_consumed, quiz.total_points_earned, quiz.locked)
			})
			// end : logic for extracting data
			callback && callback(null, JSON.stringify(data))

		});
		// request(config, function(error, response, body){
		// 	if(error){
		// 		callback('error')
		// 	}
		// 	else{
		// 		callback(null, body)
		// 	}
		// })
		// callback(null, JSON.stringify(quizList))

	}

}


function calculate(quizList, pointList, current_date) {
	var current_date = current_date || new Date();
	var totalPoints;
	var totalNodes;
	var currentIndex;

	quizList.forEach(function(quiz, index){
		totalNodes = 0;
		totalPoints = 0;
		var start_date = range[index].start;
		var end_date = (range[index+1] && range[index+1].start) || (range[index].end);

		// find current week
		if(current_date >= start_date && current_date < end_date){
			currentIndex = index;
		}


		// get points in that date range
		pointList.forEach(function(dataPoints){
			if(new Date(dataPoints.created) >= start_date && new Date(dataPoints.created) < end_date){
				totalPoints += dataPoints.score;
				totalNodes += dataPoints.action == 'node_complete' ? 1 : 0;
			}
		})


		quiz['total_nodes_consumed'] = totalNodes;
		quiz['total_points_earned'] = totalPoints;

		// lock node
		quiz['locked'] = quiz.total_nodes_consumed < locked_threshold ? true : false;
	})

	// traverse back from currentIndex and change lock value by adding extra points accumulated from the current node
	// find sum
	var sum = 0;
	sum += quizList[currentIndex].total_nodes_consumed > 2 ? quizList[currentIndex].total_nodes_consumed - 2 : 0;
	for (var i = currentIndex-1; i >= 0; i--) {
		if(quizList[i].total_nodes_consumed - locked_threshold > 0)
		sum += quizList[i].total_nodes_consumed - locked_threshold;
	}

	// traverse down and add node
	for (var c = 0; c < currentIndex; c++) {
		console.log('before :',sum)
		if(quizList[c].locked && (sum - (locked_threshold - quizList[c].total_nodes_consumed)) >= 0){
			quizList[c].locked = false;
			sum = sum - (locked_threshold - quizList[c].total_nodes_consumed);
		}
		console.log('after :',sum)
	}

	for (var x = currentIndex + 1; x < quizList.length; x++) {
		quizList[x].locked = true;
	}

	// print
	quizList.forEach(function(quiz, index){
		console.log(index, JSON.stringify(quiz))
		if(index == currentIndex)
			console.log('^')
	})
}

var range = {
	0 : {
		start : new Date('2017-01-30'),
		end : new Date('2017-03-12')
	},
	1 : {
		start : new Date('2017-02-06'),
		end : new Date('2017-03-12')
	},
	2 : {
		start : new Date('2017-02-13'),
		end : new Date('2017-03-12')
	},
	3 : {
		start : new Date('2017-02-20'),
		end : new Date('2017-03-12')
	},
	4 : {
		start : new Date('2017-02-27'),	
		end : new Date('2017-03-12')
	},
	5 : {
		start : new Date('2017-03-06'),
		end : new Date('2017-03-12')
	}
}

function test(){
	currentDate1 = new Date('2017-03-06T08:10:39.923746Z');
	quizList1 = [{},{},{},{},{},{}];
	pointList1 = [
		{
			created : '2017-02-03T08:10:39.923746Z',
			score : 10,
			action : 'node_complete'
		},{
			created : '2017-02-07T08:10:39.923746Z',
			score : 20,
			action : 'node_complete'
		},{
			created : '2017-02-21T08:10:39.923746Z',
			score : 200,
			action : 'node_complete'
		},{
			created : '2017-02-21T08:10:39.923746Z',
			score : 150,
			action : 'node_complete',
		},{
			created : '2017-02-27T08:10:39.923746Z',
			score : 890,
			action : 'node_complete'
		},{
			created : '2017-02-28T08:10:39.923746Z',
			score : 890,
			action : 'node_complete'
		},{
			created : '2017-02-28T08:10:39.923746Z',
			score : 890,
			action : 'node_complete'
		},{
			created : '2017-03-06T08:10:39.923746Z',
			score : 890,
			action : 'node_complete'
		},{
			created : '2017-03-06T08:10:39.923746Z',
			score : 890,
			action : 'node_complete'
		}
	]
	calculate(quizList1, pointList1, currentDate1);
	// calculate(quizList2, currentDate2, data2);
	// calculate(quizList3, currentDate3, data3);
}

test();