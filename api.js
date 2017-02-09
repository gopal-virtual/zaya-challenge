var request = require('request');
var async = require('async');
var utility = require('./utility.js').utility;
// var meta = require('./variables.js').meta;
var server = 'https://cc-test-2.zaya.in/api/v1';

var API = {
    processQuiz: processQuiz,
    getChallenges: getChallenges,
    getDates : getDates,
    setMeta : setMeta,
    updateLessons : updateLessons,
    sendReport : sendReport
}

function getIdList(list){
    var idlist = [];
    list.forEach(function(item){
        idlist.push(item.id)
    })
    return idlist;
}

function sendReport (req, res) {
    var jsonString = '';

    req.on('data', function(data) {
        jsonString += data;
    });

    req.on('end', function() {
        data = JSON.parse(jsonString)

        async.waterfall([
                function(callback){
                    getProfileIdfromClientId(data, callback)
                },
                getPoints
            ], sendResponse);


    })

    function getPoints(profile_id, points, callback){
        var config = {
            uri : server+'/profiles/' + profile_id + '/points/',
            method: 'POST',
            headers: {
                Authorization: req.headers.authorization
            },
            json : points
        }
        // console.log(config)
        request(config, function(error, response, body){
            // console.log(body)
            if (!error) {
                if (response.statusCode == '200') {
                    callback(null, body)
                }
                else{
                    callback(JSON.stringify({
                        'status': response.statusCode,
                        'body': {
                            'msg': body
                        }
                    }))
                }
            } else {
                callback(JSON.stringify({
                    'status': 400,
                    'body': {
                        'msg': error
                    }
                }))
            }
        })

    }

    function getProfileIdfromClientId (dataPoint, callback) {
        var config = {
            uri: server+'/profiles',
            method: 'GET',
            qs : {
                client_uid : dataPoint.client_id
            },
            headers: {
                Authorization: req.headers.authorization
            }
        };
        request(config, function(error, response, body) {
            if (!error) {
                if (response.statusCode == '200') {
                    body = JSON.parse(body)
                    var id = body.length && body[0].id
                    if(id){
                        callback(null, id, dataPoint.points);
                    }
                    else{
                        callback(JSON.stringify({
                            'status': 400,
                            'body': {
                                'msg': "No profile found"
                            }
                        }))
                    }
                }
                else{
                    callback(JSON.stringify({
                        'status': response.statusCode,
                        'body': {
                            'msg': body
                        }
                    }))
                }
            } else {
                callback(JSON.stringify({
                    'status': 400,
                    'body': {
                        'msg': error
                    }
                }))
            }
        })
    }

    function sendResponse (err, result) {
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

}
function updateLessons (req, res) {
    if(req.query.accountid && req.headers.authorization){
        var token = 'Token ' + req.headers.authorization.split(' ')[1];
        var config = {
            uri: server+'/accounts/' + req.query.accountid + '/lessons/',
            method: 'GET',
            headers: {
                Authorization: token
            }
        };
        request(config, function(error, response, body) {
            if (error) {
                res.writeHead(500, {
                    'Content-Type': 'text/json'
                });
                res.end(JSON.stringify({
                    msg : error
                }))
            } else {
                body = JSON.stringify(getIdList(JSON.parse(body)))
                utility.setMetaFile('./lesson_list.json', body, function(err){
                    if(!err){
                        res.writeHead(response.statusCode , {
                            'Content-Type': 'text/json'
                        });
                        res.end(body)
                    }
                    else{
                        res.writeHead(500 , {
                            'Content-Type': 'text/json'
                        });
                        res.end(err)
                    }
                })
            }
        })
    }
    else {
        res.writeHead(500, {
            'Content-Type': 'text/json'
        });
        res.end(JSON.stringify({
            msg : 'accountid/authorization not provided'
        }))
    }
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
    var current_date = new Date(current_date) || new Date();
    var totalPoints, totalNodes, currentIndex;

    quizList.forEach(function(quiz, index) {
        var start_date = new Date(date_range[index].start);
        quiz['meta'] = {};
        quiz.meta['threshold'] = threshold;
        quiz.meta['attempted'] = false;
        quiz.meta['total_points_earned'] = 0;
        // console.log(current_date, start_date, current_date > start_date)
        if (total_number_of_nodes > 0 && current_date >= start_date) {
            quiz.meta['active'] = true;
            quiz.meta['total_nodes_consumed'] = total_number_of_nodes >= threshold ? threshold : total_number_of_nodes;
            quiz.meta['locked'] = quiz.meta.total_nodes_consumed < threshold ? true : false;
            total_number_of_nodes = total_number_of_nodes - threshold;
        }
        else {
            quiz.meta['total_nodes_consumed'] = 0;
            quiz.meta['active'] = false;
            quiz.meta['locked'] = true;
        }
    })

    quizList[0].meta.active = !quizList[0].meta.active ? true : quizList[0].meta.active;
    // console.log(quizList)
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
        var clientid = req.query.profile;


        if (accountid && clientid) {
            /* pass output from one function to the other one in
                the chain using waterfall method of async library
            */
            async.waterfall([
                getProfileId,
                getChallengeList,
                getQuizList,
                getFilteredQuizList,
                oneTimeLock
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

        function getProfileId(callback) {
            var config = {
                uri: server+'/profiles',
                method: 'GET',
                qs : {
                    client_uid : clientid
                },
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
                    body = JSON.parse(body)
                    // console.log(body)
                    if(body.length){
                        callback(null, body[0].id)
                    }
                    else{
                        callback(JSON.stringify({
                            'status': 404,
                            'body': {
                                'msg': 'No profile found'
                            }
                        }))
                    }
                }
            })
        }

        function getChallengeList(profileid, callback) {
            var config = {
                uri: server+'/accounts/' + accountid + '/challenges/',
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
                            callback(null, profileid, challengeId);
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

        function getQuizList(profileid, challengeId, callback) {
            var config = {
                uri: server+'/accounts/' + accountid + '/lessons/' + challengeId + '/',
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
                        callback(null, profileid, JSON.stringify(body))
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

        function getFilteredQuizList(profileid, quizList, callback) {
            var config = {
                uri: server+'/profiles/' + profileid + '/points/',
                method: 'GET',
                headers: {
                    Authorization: token
                }
            }
            // console.log(config)
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
                            callback(null, profileid, quiz)
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

        function oneTimeLock(profileid, quizList, callback){
            // traverse the unlock nodes
            // check whether they have a point already generated
            // if yes -> lock them, keep them active, i.e. true
            // else let it be as it is
            var idList = {};
            quizList.forEach(function(quiz){
                if(!quiz.meta.locked){
                    idList[quiz.node.id] = null;
                }
            })

            var config = {
                uri: server+'/profiles/'+ profileid +'/points/',
                method: 'GET',
                qs : {
                    object_id : Object.keys(idList).toString()
                },
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
                    var pointList = JSON.parse(body)
                    if(pointList.length){
                        pointList.forEach(function(point){
                            if(idList.hasOwnProperty(point.object_id)){
                                idList[point.object_id] = point
                            }
                        })
                        quizList.forEach(function(quiz){
                            if(idList.hasOwnProperty(quiz.node.id) && idList[quiz.node.id] != null){
                                quiz.meta.attempted = true;
                                quiz.meta.total_points_earned = idList[quiz.node.id].score;
                            }
                        })
                    }
                    callback(null, JSON.stringify(quizList))
                }
            })

        }
    }
}


exports.API = API;
