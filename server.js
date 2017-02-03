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

var challengeMeta = {
	current_date : false,
	locked_threshold : 2,
	range : {
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
}


var server = app.listen(8062, 'localhost', function() {

    var host = server.address().address
    var port = server.address().port

    console.log("Example app listening at http://%s:%s", host, port)

})

function home(req, res) {
    res.sendFile(__dirname + "/index.html");
}

function getChallenges (req, res) {
	if(!req.headers.authorization){
		res.writeHead(400, {
            'Content-Type': 'text/json'
        });
        return res.end(JSON.stringify({
        	'token' : 'You\'re not authorized'
        }))
	}
	else{

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
				err = JSON.parse(err)
		        res.writeHead(err.status, {
		            'Content-Type': 'text/json'
		        });
				return res.end(JSON.stringify(err.body));
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
			request(config, function(error, response, body){
				if(error){
			        callback(JSON.stringify({
						'status' : 400,
						'body' : {
							'msg' : error
						}
					}));
				}
				else {
					if(response.statusCode == '200'){
						var challenges = JSON.parse(body)
						if(challenges.length){
							var challengeId = challenges[0].id;
					        callback(null, challengeId);
						}
						else{
							callback(
								JSON.stringify({
									'status' : 404,
									'body' : {
										'msg' : "no challenges found"
									}
								})
							)
						}
					}
					else{
						callback(
							JSON.stringify({
								'status' : response.statusCode,
								'body' : {
									'msg' : JSON.parse(body)
								}
							})
						)
					}
				}
			})
	    }

	    function getQuizList(challengeId, callback) {
			var config = {
				uri : 'https://cc-test-2.zaya.in/api/v1/accounts/'+accountid+'/lessons/'+ challengeId +'/',
				method : 'GET',
				headers : {
					Authorization : token
				}
			};
			//test from local file
			// fs.readFile('quiz.json', 'utf8', function(err, data) {
			// 	callback && callback(null, JSON.parse(data));
			// })
	        request(config, function(error, response, body){
	        	if(error){
	        		callback(JSON.stringify({
						'status' : 400,
						'body' : {
							'msg' : error
						}
					}))
	        	}
	        	else {
	        		if(response.statusCode == '200'){
		        		body = JSON.parse(body).objects;
		        		callback(null, JSON.stringify(body))
	        		}
	        		else{
	        			callback(JSON.stringify({
							'status' : response.statusCode,
							'body' : {
								'msg' : JSON.parse(body)
							}
						}))
	        		}
	        	}
			})
	    }

	    function getFilteredQuizList (quizList, callback) {
			var config = {
				uri : 'https://cc-test-2.zaya.in/api/v1/profiles/'+profileid+'/points/',
				method : 'GET',
				headers : {
					Authorization : token
				}
			}
			
			request(config, function(error, response, body){
				if(error){
					callback(JSON.stringify({
						'status' : 400,
						'body' : {
							'msg' : error
						}
					}))
				}
				else{
					if(response.statusCode == 200){
						var quiz = calculate(JSON.parse(quizList), JSON.parse(body), challengeMeta.current_date, challengeMeta.range, challengeMeta.locked_threshold)
						callback(null, JSON.stringify(quiz))
					}
					else{
						callback(JSON.stringify({
							'status' : response.statusCode,
							'body' : {
								'msg' : JSON.parse(body)
							}
						}))
					}
				}
			})
		}
	}
}


function calculate(quizList, pointList, current_date, date_range, threshold) {
	var current_date = current_date || new Date();
	var totalPoints;
	var totalNodes;
	var currentIndex;

	quizList.forEach(function(quiz, index){
		quiz['meta'] = {};
		quiz.meta['threshold'] = challengeMeta.locked_threshold;
		if(quiz.objects){
			quiz.meta['total_questions'] = quiz.objects.length ? quiz.objects[0].objects.length : 0;
		}
		quiz.meta['active'] = true;
		quiz.meta['current'] = false;
		totalNodes = 0;
		totalPoints = 0;
		var start_date = date_range[index].start;
		var end_date = (date_range[index+1] && date_range[index+1].start) || (date_range[index].end);

		// find current week
		if(current_date >= start_date && current_date < end_date){
			currentIndex = index;
		}


		// get points in that date date_range
		pointList.forEach(function(dataPoints){
			if(new Date(dataPoints.created) >= start_date && new Date(dataPoints.created) < end_date){
				totalPoints += dataPoints.score;
				totalNodes += dataPoints.action == 'node_complete' ? 1 : 0;
			}
		})


		quiz.meta['total_nodes_consumed'] = totalNodes;
		quiz.meta['total_points_earned'] = totalPoints;

		// lock node
		quiz.meta['locked'] = quiz.meta.total_nodes_consumed < threshold ? true : false;
	})
	// tag quiz as current quiz
	if(currentIndex)
		quizList[currentIndex].meta.current = true;
	// traverse back from currentIndex and change lock value by adding extra points accumulated from the current node
	// find excess
	var excess = 0;
	// excess += quizList[currentIndex].total_nodes_consumed > 2 ? quizList[currentIndex].total_nodes_consumed - 2 : 0;
	for (var i = currentIndex; i >= 0; i--) {
		if(quizList[i].meta.total_nodes_consumed - threshold > 0){
			excess += quizList[i].meta.total_nodes_consumed - threshold;
		}
	}

	// traverse down and add node
	for (var c = 0; c <= currentIndex; c++) {
		console.log('before :',excess)
		if(quizList[c].meta.locked && (excess - (threshold - quizList[c].meta.total_nodes_consumed)) >= 0){
			quizList[c].meta.locked = false;
			excess = excess - (threshold - quizList[c].meta.total_nodes_consumed);
		}
		console.log('after :',excess)
	}

	for (var x = currentIndex + 1; x < quizList.length; x++) {
		quizList[x].meta.locked = true;
		quizList[x].meta.active = false;
	}

	return quizList;

}

function test(){
	currentDate1 = new Date('2017-02-27T08:10:39.923746Z');
	quizList1 = [{
		objects : []
	},{
		objects : []
	},{
		objects : []
	},{
		objects : []
	},{
		objects : []
	},{
		objects : []
	}];
	pointList1 = [
		{
			created : '2017-02-03T08:10:39.923746Z',
			score : 10,
			action : 'node_complete'
		},{
			created : '2017-02-05T08:10:39.923746Z',
			score : 20,
			action : 'node_complete'
		},{
			created : '2017-02-01T08:10:39.923746Z',
			score : 200,
			action : 'node_complete'
		},{
			created : '2017-02-07T08:10:39.923746Z',
			score : 150,
			action : 'node_complete',
		},{
			created : '2017-02-20T08:10:39.923746Z',
			score : 890,
			action : 'node_complete'
		},{
			created : '2017-02-21T08:10:39.923746Z',
			score : 890,
			action : 'node_complete'
		},{
			created : '2017-02-28T08:10:39.923746Z',
			score : 890,
			action : 'node_complete'
		},{
			created : '2017-02-29T08:10:39.923746Z',
			score : 890,
			action : 'node_complete'
		},{
			created : '2017-02-30T08:10:39.923746Z',
			score : 890,
			action : 'node_complete'
		}
	]
	var quizList = calculate(quizList1, pointList1, challengeMeta.current_date, challengeMeta.range, challengeMeta.locked_threshold);
	// print
	quizList.forEach(function(quiz, index){
		console.log(index, JSON.stringify(quiz))
		// if(index == currentIndex)
		// 	console.log('^')
	})
	// calculate(quizList2, currentDate2, data2);
	// calculate(quizList3, currentDate3, data3);
}

test();