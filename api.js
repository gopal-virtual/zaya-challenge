var request = require('request');
var async = require('async');
var utility = require('./utility.js').utility;
// var meta = require('./variables.js').meta;

var API = {
    processQuiz: processQuiz,
    getChallenges: getChallenges,
    getDates : getDates,
    setMeta : setMeta
}

function setMeta (req, res) {
    var file = './variables.json'
    var jsonString = '';

    req.on('data', function(data) {
        jsonString += data;
    });

    req.on('end', function() {
        utility.setMetaFile(file, jsonString, function(err){
            if (err) {
                res.writeHead(400, {
                    'Content-Type': 'text/json'
                });
                return res.end(JSON.stringify({
                    "error": err
                }));
            } else {
                return res.end(jsonString)
            }
        })
    });
}
function getDates(req, res) {
var file = './variables.json'
  utility.getMetaFile(file, function(data){
      res.writeHead(200, {
          'Content-Type': 'text/json'
      });
      res.end(data)
  })
}


/* process quiz : push meta data : locked, active & total number of nodes consumed
 ****************************
 ****************************
 */
function processQuiz(quizList, pointList, current_date, date_range, threshold) {
    // accumulate the scores and distribute, and unlock it accordingly
    var total_number_of_nodes = pointList.length;
    var current_date = current_date || new Date();
    var totalPoints, totalNodes, currentIndex;

    quizList.forEach(function(quiz, index) {
        var start_date = date_range[index].start;
        quiz['meta'] = {};
        quiz.meta['threshold'] = threshold;
        if (total_number_of_nodes > 0 && current_date > start_date) {
            quiz.meta['active'] = true;
            quiz.meta['total_nodes_consumed'] = total_number_of_nodes >= threshold ? threshold : total_number_of_nodes;
            quiz.meta['locked'] = quiz.meta.total_nodes_consumed < threshold ? true : false;
            total_number_of_nodes = total_number_of_nodes - threshold;
        }
    })
    return quizList;
}



/* get list of challenges
 ****************************
 ****************************
 */
function getChallenges(req, res) {

    if (!req.headers.authorization) {
        res.writeHead(400, {
            'Content-Type': 'text/json'
        });
        return res.end(JSON.stringify({
            'token': 'You\'re not authorized'
        }))
    } else {

        var token = 'Token ' + req.headers.authorization.split(' ')[1];
        var accountid = req.query.account;
        var profileid = req.query.profile;


        if (accountid && profileid) {
            /* pass output from one function to the other one in
                the chain using waterfall method of async library
            */
            async.waterfall([
                getChallengeList,
                getQuizList,
                getFilteredQuizList
            ], finalCallback);
        } else {
            res.writeHead(400, {
                'Content-Type': 'text/json'
            });
            return res.end(JSON.stringify({
                'missing': 'account_id or profile_id is not provided'
            }))
        }



        function finalCallback(err, result) {
            if (err) {
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
                uri: 'https://cc-test-2.zaya.in/api/v1/accounts/' + accountid + '/challenges/',
                method: 'GET',
                headers: {
                    Authorization: token
                }
            };
            request(config, function(error, response, body) {
                if (error) {
                    callback(JSON.stringify({
                        'status': 400,
                        'body': {
                            'msg': error
                        }
                    }));
                } else {
                    if (response.statusCode == '200') {
                        var challenges = JSON.parse(body)
                        if (challenges.length) {
                            var challengeId = challenges[0].id;
                            callback(null, challengeId);
                        } else {
                            callback(
                                JSON.stringify({
                                    'status': 404,
                                    'body': {
                                        'msg': "no challenges found"
                                    }
                                })
                            )
                        }
                    } else {
                        callback(
                            JSON.stringify({
                                'status': response.statusCode,
                                'body': {
                                    'msg': JSON.parse(body)
                                }
                            })
                        )
                    }
                }
            })
        }



        function getQuizList(challengeId, callback) {
            var config = {
                uri: 'https://cc-test-2.zaya.in/api/v1/accounts/' + accountid + '/lessons/' + challengeId + '/',
                method: 'GET',
                headers: {
                    Authorization: token
                }
            };
            request(config, function(error, response, body) {
                if (error) {
                    callback(JSON.stringify({
                        'status': 400,
                        'body': {
                            'msg': error
                        }
                    }))
                } else {
                    if (response.statusCode == '200') {
                        body = JSON.parse(body).objects;
                        callback(null, JSON.stringify(body))
                    } else {
                        callback(JSON.stringify({
                            'status': response.statusCode,
                            'body': {
                                'msg': JSON.parse(body)
                            }
                        }))
                    }
                }
            })
        }

        function getFilteredQuizList(quizList, callback) {
            var config = {
                uri: 'https://cc-test-2.zaya.in/api/v1/profiles/' + profileid + '/points/',
                method: 'GET',
                headers: {
                    Authorization: token
                }
            }

            request(config, function(error, response, body) {
                if (error) {
                    callback(JSON.stringify({
                        'status': 400,
                        'body': {
                            'msg': error
                        }
                    }))
                } else {
                    if (response.statusCode == '200') {
                        utility.getMetaFile('./variables.json',function(meta){
                            meta = JSON.parse(meta)
                            var quiz = API.processQuiz(JSON.parse(quizList), JSON.parse(body), meta.current_date, meta.range, meta.threshold)
                            callback(null, JSON.stringify(quiz))
                        })
                    } else {
                        callback(JSON.stringify({
                            'status': response.statusCode,
                            'body': {
                                'msg': 'no points found'
                            }
                        }))
                    }
                }
            })
        }
    }
}


exports.API = API;
