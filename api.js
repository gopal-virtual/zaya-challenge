var request = require('request');
var async = require('async');
var utility = require('./utility.js').utility;
var server = 'https://cc-test-2.zaya.in/api/v1';

var API = {
    processQuiz: processQuiz,
    getChallenges: getChallenges,
    getDates : getDates,
    setMeta : setMeta,
    updateLessons : updateLessons,
    sendReport : sendReport,
    syncChallenge : syncChallenge
}

var quizList;
var ell_token = "Token 730c311c6c1c0e056405704314465c9849f1e121";

function getChallengeList(accountid, token, callback) {
    var config = {
        uri: server+'/accounts/' + accountid + '/challenges/',
        method: 'GET',
        headers: {
            Authorization: token
        }
    };
    request(config, function(error, response, body) {
        console.log(config, response.statusCode)
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

                    // get challenge id list
                    var challengeIdList = {};
                    challenges.forEach(function(challenge){
                        challengeIdList[challenge.type.grade] = {
                            id : challenge.id
                        }
                    })

                    // pass challenge id list to get quiz list
                    callback(null, challengeIdList);
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
                            'msg': body
                        }
                    })
                )
            }
        }
    })
}

function getQuizList(accountid, token, challengeList, callback){
    async.each(Object.keys(challengeList), function(grade, eachCallback) {
        var config = {
                uri: server+'/accounts/' + accountid + '/lessons/' + challengeList[grade].id + '/',
                method: 'GET',
                headers: {
                    Authorization: token
                }
        };
        console.log(config)
        request(config, function(error, response, body) {
            if (error) {
                eachCallback({
                    status : 400,
                    msg : error
                })
            } else {
                if (response.statusCode == '200') {
                    challengeList[grade]["quizList"] = JSON.parse(body).objects;
                    eachCallback();
                } else {
                    eachCallback({
                        status : response.statusCode,
                        msg : body
                    })
                }
            }
        })

    }, function(err) {
        if( err ) {
          callback(JSON.stringify(err))
        } else {
            callback(null, challengeList)
        }
    });
}

function syncQuizData(quizList, callback){
    utility.writeFile('./quizlist.json', JSON.stringify(quizList), function(){
        callback(null, quizList)
    })
}

function respondSyncRequest(responseObj, error, result){
    if(!error){
        quizList = result;
        responseObj.writeHead(200, {'Content-Type': 'text/json'});
        responseObj.end(JSON.stringify(result))
    }
    else{
        responseObj.writeHead(400, {'Content-Type': 'text/json'});
        responseObj.end(error)   
    }
}

function syncChallenge (req, res) {

    if(req.query.accountid){
        async.waterfall([
            function(callback){
                getChallengeList(req.query.accountid, ell_token, callback)
            },
            function(challengeIdList, callback){
                getQuizList(req.query.accountid, ell_token, challengeIdList, callback)
            },
            syncQuizData
        ], function(error, callback){
            respondSyncRequest(res, error, callback)
        });
    }
    else {
        res.writeHead(400, {
            'Content-Type': 'text/json'
        });
        res.end("account id or token is missing")
    }
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
                setPoints
            ], sendResponse);


    })

    function setPoints(profile_id, points, callback){
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

function getIdList(list){
    var idlist = [];
    list.forEach(function(item){
        idlist.push(item.id)
    })
    return idlist;
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
    var current_date = current_date ? new Date(current_date) : new Date();
    var totalPoints, totalNodes, currentIndex;
    console.log('current_date',current_date);
    quizList.forEach(function(quiz, index) {
        var start_date = new Date(date_range[index].start);
        quiz['meta'] = {};
        quiz.meta['threshold'] = threshold;
        quiz.meta['attempted'] = false;
        quiz.meta['total_points_earned'] = 0;
        // console.log(current_date, start_date, current_date > start_date)
        if (total_number_of_nodes >= 0 && current_date >= start_date) {
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
 function responseChallengeList(responseObj, err, modifiedQuizList) {
    if (err) {
        err = JSON.parse(err)
        responseObj.writeHead(err.status, {
            'Content-Type': 'text/json'
        });
        return responseObj.end(JSON.stringify(err.body));
    }
    responseObj.writeHead(200, {
        'Content-Type': 'text/json'
    });
    return responseObj.end(modifiedQuizList);
}

function getProfileId(clientid, token, callback) {
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
            var profile = JSON.parse(body)
            if(profile.length){
                callback(null, profile[0].id)
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


function getFilteredQuizList(token, profileid, quizList, callback) {
    // from_date=2017-02-09&till_date=2017-02-10&action=node_complete
    utility.getMetaFile('./variables.json',function(meta){
        meta = JSON.parse(meta);
        var config = {
            uri: server+'/profiles/' + profileid + '/points/',
            method: 'GET',
            headers: {
                Authorization: token
            },
            qs : {
                from_date : meta.range["0"].start_date,
                till_date : meta.range["0"].end_date,
                action : 'node_complete'
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
                        var pointList = JSON.parse(body)
                        // console.log(pointList)
                        meta.current_date = meta.current_date == 'false' ? false : meta.current_date;
                        var quiz = API.processQuiz(quizList, pointList, meta.current_date, meta.range, meta.threshold)
                        callback(null, profileid, quiz)
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
    })
}

function oneTimeLock(token, profileid, quizList, callback){
    // traverse the unlock nodes
    // check whether they have a point already generated
    // if yes -> lock them, keep them active, i.e. true
    // else let it be as it is
    var idList = {};
    quizList.forEach(function(quiz){
        if(!quiz.meta.locked && quiz.objects.length){
            // check if the quiz inside is taken or not !important
            idList[quiz.objects[0].node.id] = null;
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
                // console.log(idList)
                quizList.forEach(function(quiz){
                    var length = quiz.objects.length;
                    var id = length ? quiz.objects[0].node.id : false;
                    if(length && idList.hasOwnProperty(id) && idList[id] != null){
                        quiz.meta.attempted = true;
                        quiz.meta.total_points_earned = idList[id].score;
                    }
                })
            }
            callback(null, JSON.stringify(quizList))
        }
    })

}

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
        var grade = req.query.grade;
        var accountid = req.query.account;
        var clientid = req.query.profile;

        if (accountid && clientid && grade) {
            /* Why by gopal : pass output from one function to the other one in
                the chain using waterfall method of async library
            */

            async.waterfall([
                function(callback){
                    getProfileId(clientid, token, callback)
                },
                function(profileId, callback){

                    if(quizList){
                        getFilteredQuizList(token, profileId, quizList[grade]["quizList"], callback)
                    }
                    else {
                        // fallback : if quizlist does not exists in memory, fetch from file
                        utility.getFile('./quizlist.json', function(quizList){
                            quizList = JSON.parse(quizList);
                            getFilteredQuizList(token, profileId, quizList[grade]["quizList"], callback)
                        })
                    }
                },
                function(profileid, quizList, callback){
                    oneTimeLock(token, profileid, quizList, callback)
                }
            ], function(err, result){
                responseChallengeList(res, err, result)
            });
        } else {
            res.writeHead(400, {
                'Content-Type': 'text/json'
            });
            return res.end(JSON.stringify({
                'missing': 'account_id or profile_id or grade is not provided'
            }))
        }
        
    }
}


exports.API = API;
