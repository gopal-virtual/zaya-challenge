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
		request(config, function(error, response, body){
			if(error){
		        callback('error');
			}
			else {
				var challenges = JSON.parse(body)
				var challengeId = challenges[0].id;
		        callback(null, challengeId);
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
        request(config, function(error, response, body){
        	if(error){
        		callback('error')
        	}
        	else {
        		// body = JSON.parse(body).objects;
        		// callback(null, body)

        		fs.readFile('quiz.json', 'utf8', function(err, data) {
        			callback(null, JSON.parse(data));
        		})
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
				callback('error')
			}
			else{
				// var
				// var points = {
				// 	week1 : {
				// 		node_count : 0,
				// 		points : 0
				// 	}
				// }
				fs.readFile('points.json', 'utf8', function(err, data) {
					data = JSON.parse(data);
					// logic for extracting data
					quizList.forEach(function(quiz, index){
						var totalPoints = 0;
						var totalNodes = 0;
						data.forEach(function(dataPoints){
							// console.log(new Date(dataPoints.created), new Date(quiz.created), range[index].end)
							if(new Date(dataPoints.created) >= new Date(quiz.created) && new Date(dataPoints.created) < range[index].end){
								console.log('true')
								totalPoints += dataPoints.score;
								totalNodes++;
							}
						})
						console.log(totalPoints, totalNodes)
					})
					// end : logic for extracting data

				});
				// callback(null, body)
			}
		})
		callback(null, JSON.stringify(quizList))

	}

}
