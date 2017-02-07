(function() {
    'use strict';

    angular
        .module('zayaChallenge', [
            'ui.router',
            'ngMorph',
            'ngSanitize'
        ]);
})();
// (function() {
//     'use strict';
//
//     angular
//         .module('zayaChallenge')
//         .constant('SERVER', 'https://cc-test-2.zaya.in/api/v1');
//
// })();
(function() {
    'use strict';

    angular
        .module('zayaChallenge')
        .config(config);

    function config($urlRouterProvider, $injector, $stateProvider) {
        $urlRouterProvider.otherwise(function($injector) {
            $injector.get('$state').go('home');
        });

        var states = [{
            name: 'home',
            url: '/:accountid/:userid/:token',
            templateUrl: '/home.html',
            controller: 'homeController',
            controllerAs: 'homeCtrl'
        }, {
            name: 'unauthorized',
            url: '/unauthorized',
            templateUrl: '/unauthorized.html'
        }, {
            name: 'date',
            url: '/date',
            templateUrl: 'date.html',
            controller: 'dateController as dateCtrl'
        }, {
            name: 'challenge',
            url: '/challenge',
            params: {
                quiz: null,
                userid: null,
                token: null
            },
            templateUrl: '/challenge.html',
            controller: 'challengeController',
            controllerAs: 'challengeCtrl'
        }, {
            name: 'result',
            url: '/result',
            params: {
                score: null,
                time: null,
                userid: null,
                quizid: null,
                token: null
            },
            templateUrl: '/result.html',
            controller: 'resultController',
            controllerAs: 'resultCtrl'
        }, {
            name: 'guide',
            url: '/guide',
            templateUrl: '/guide.html',
            controller: 'guideController',
            controllerAs: 'guideCtrl'
        }]

        states.forEach(function(state) {
            $stateProvider.state(state);
        });
    }
})();

(function() {
    'use strict';

    angular
        .module('zayaChallenge')
        .controller('homeController', homeController);

    homeController.$inject = ['Rest', '$state', '$stateParams', 'utility', '$scope'];

    /* @ngInject */
    function homeController(Rest, $state, $stateParams, utility, $scope) {
        var homeCtrl = this;
        homeCtrl.startChallenge = startChallenge;
        homeCtrl.getProgress = getProgress;
        homeCtrl.goBacktoMap = goBacktoMap;

        function goBacktoMap() {

        }

        $stateParams.accountid && $stateParams.userid && $stateParams.token &&
            Rest
            .getChallenges($stateParams.accountid, $stateParams.userid, $stateParams.token)
            .then(function successCallback(response) {
                homeCtrl.challenges = response.data;
            }, function errorCallback(error) {
                console.log(error)
            })
        Rest.getProfileId($stateParams.userid, $stateParams.token)
            .then(function(response) {
                $stateParams.userid = response.data[0].id;
                console.log($stateParams.userid)
                Rest.getLeaderBoard($stateParams.userid, $stateParams.token)
                    .then(function(response) {
                        $scope.leaderboard = response.data;
                    }, function(error) {
                        console.log(r)
                    })
            }, function(error) {
                console.log(error)
            })

        $scope.mapRank = utility.mapRank;

        function startChallenge(quiz) {
            $state.go('challenge', {
                quiz: quiz,
                userid: $stateParams.userid,
                token: $stateParams.token
            })
        }

        function getProgress(nodes, threshold) {
            if (nodes > threshold) {
                return '100';
            } else {
                return ((nodes / threshold) * 100).toString();
            }
        }
    }
})();
(function() {
    'use strict';

    angular
        .module('zayaChallenge')
        .controller('dateController', dateController);

    dateController.$inject = ['Rest'];

    /* @ngInject */
    function dateController(Rest) {
        var dateCtrl = this;
        dateCtrl.setMeta = setMeta;
        Rest.getDates()
            .then(function successCallback(response) {
                dateCtrl.meta = response.data;
                console.log(response);
            }, function errorCallback(error) {
                console.log(error)
            })

        function setMeta(data) {
            console.log(data)
            Rest.setMeta(data)
                .then(function successCallback(response) {
                    dateCtrl.meta = response.data;
                    console.log(response);
                }, function errorCallback(error) {
                    console.log(error)
                })
        }
    }
})();
(function() {
    'use strict';

    angular
        .module('zayaChallenge')
        .controller('challengeController', challengeController);

    challengeController.$inject = ['Rest', '$stateParams', '$state', '$timeout', '$scope', 'quizFactory'];

    /* @ngInject */
    function challengeController(Rest, $stateParams, $state, $timeout, $scope, quizFactory) {
        var challengeCtrl = this;
        quizFactory.getQuiz($stateParams.quiz)
            .then(function(quiz) {
                challengeCtrl.quiz = quiz;
                challengeCtrl.prose = challengeCtrl.quiz.node.title;
                $scope.prose = challengeCtrl.prose;
                console.log(challengeCtrl.quiz)
            });
        challengeCtrl.submit = submit;
        challengeCtrl.next = next;
        challengeCtrl.currentIndex = 0;
        challengeCtrl.result = {};
        challengeCtrl.selectOption = selectOption;
        challengeCtrl.calculateScore = calculateScore;
        challengeCtrl.score = 0;
        challengeCtrl.getElapsedTime = getElapsedTime;
        $scope.closeRead = closeRead;

        function openRead () {
            $(".button-float").trigger("click");
        }
        $timeout(function(){
            openRead()
        })
        function closeRead () {
            $("#close-read").trigger("click");
        }

        function selectOption(key) {
            challengeCtrl.quiz.objects[challengeCtrl.currentIndex]['selected'] = key;
        }

        function getElapsedTime(onlyMinutes) {
            var timeElapsed = ~~(challengeCtrl.time - challengeCtrl.startTime) / 1000;
            var seconds = timeElapsed % 60;
            var minutes = (timeElapsed - seconds) / 60;
            return onlyMinutes ? minutes : minutes + ":" + seconds;
        }

        $scope.settings = {
            closeEl: '.close',
            overlay: {
                templateUrl: '/reading-comprehension.html'
            }
        }

        var interval = 1000; // ms
        challengeCtrl.startTime = Date.now();
        challengeCtrl.time = challengeCtrl.startTime + interval;
        $timeout(step, interval);

        function step() {
            var dt = Date.now() - challengeCtrl.time; // the drift (positive for overshooting)
            if (dt > interval) {
                console.log('timer delayed')
            }
            challengeCtrl.time += interval;
            $timeout(step, Math.max(0, interval - dt)); // take into account drift
        }

        function submit() {
            var question = challengeCtrl.quiz.objects[challengeCtrl.currentIndex];
            challengeCtrl.result[question.node.id] = question.selected == question.node.type.answer[0] ? true : false;
            challengeCtrl.calculateScore()
        }

        function calculateScore() {
            var score = 0;
            for (var key in challengeCtrl.result) {
                if (challengeCtrl.result.hasOwnProperty(key)) {
                    if (challengeCtrl.result[key])
                        score += 100;
                }
            }
            challengeCtrl.score = score;
        }

        function next() {
            if (challengeCtrl.currentIndex < challengeCtrl.quiz.objects.length - 1) {
                ++challengeCtrl.currentIndex
            } else {
                $state.go('result', {
                    score: challengeCtrl.score,
                    time: challengeCtrl.getElapsedTime(true),
                    userid: $stateParams.userid,
                    quizid: challengeCtrl.quiz.node.id,
                    token: $stateParams.token
                })
            }
        }

        console.log(challengeCtrl.quiz)
    }
})();
(function() {
    'use strict';

    angular
        .module('zayaChallenge')
        .controller('resultController', resultController);

    resultController.$inject = ['Rest', '$scope', 'utility', '$stateParams'];

    /* @ngInject */
    function resultController(Rest, $scope, utility, $stateParams) {
        var resultCtrl = this;
        console.log($stateParams)
        resultCtrl.points = $stateParams.score - $stateParams.time * 10;
        Rest.sendReport($stateParams.userid, $stateParams.token, {
                "action": "quiz_complete",
                "score": resultCtrl.points,
                "content_type": "node",
                "object_id": $stateParams.quizid,
            })
            .then(function successCallback(response) {
                return Rest.getLeaderBoard($stateParams.userid, $stateParams.token)
            })
            .then(function successCallback(response) {
                $scope.leaderboard = response.data;
                console.log(response);
            }, function errorCallback(error) {
                console.log(error)
            })
        $scope.mapRank = utility.mapRank;
    }
})();
(function() {
    'use strict';

    angular
        .module('zayaChallenge')
        .directive('carousel', carousel);

    /* @ngInject */
    function carousel($timeout) {
        var carousel = {
            restrict: 'A',
            link: linkFunc
        };

        return carousel;

        function linkFunc(scope, el, attr, ctrl) {
            $timeout(function() {
                el.owlCarousel({
                    items: 1,
                    autoplay: true,
                    autoplayTimeout: 3000
                });
            })
        }
    }
})();
(function() {
    'use strict';

    angular
        .module('zayaChallenge')
        .controller('guideController', guideController);

    guideController.$inject = [];

    /* @ngInject */
    function guideController() {
        var guideCtrl = this;
    }
})();

(function() {
    'use strict';

    angular
        .module('zayaChallenge')
        .factory('utility', utility);

    utility.$inject = [];

    /* @ngInject */
    function utility() {
        var utility = {
            mapRank: mapRank
        };

        return utility;

        function mapRank(rank) {
            if (rank == 1) {
                return 'rank-one'
            } else if (rank == 2) {
                return 'rank-second'
            } else if (rank == 3) {
                return 'rank-third'
            } else {
                return 'rank-none'
            }
        }
    }
})();
(function() {
    'use strict';

    angular
        .module('zayaChallenge')
        .factory('Rest', Rest);

    Rest.$inject = ['$http', 'CONSTANT'];

    /* @ngInject */
    function Rest($http, CONSTANT) {
        var Rest = {
            getChallenges: getChallenges, // user based challenge list : @input : userid
            getLeaderBoard: getLeaderBoard, // user leaderboard : @input : userid
            sendReport: sendReport,
            getDates: getDates,
            setMeta: setMeta,
            getProfileId: getProfileId,
        };

        return Rest;

        function getProfileId(clientid, token, callback) {
            return $http({
                url: CONSTANT.SERVER + '/profiles/',
                method: 'GET',
                params: {
                    client_uid: clientid
                },
                headers: {
                    Authorization: 'Token ' + token
                }
            })
        }

        function setMeta(data) {
            return $http({
                method: 'POST',
                url: '/update/meta',
                data: data
            })
        }

        function getDates() {
            return $http({
                method: 'GET',
                url: '/get/dates'
            })
        }

        function sendReport(profile_id, token, report) {
            return $http({
                method: 'POST',
                url: CONSTANT.SERVER + '/profiles/' + profile_id + '/points/',
                headers: {
                    'Authorization': 'Token ' + token
                },
                data: report
            })
        }

        function getChallenges(accountid, userid, token) {
            return $http({
                method: 'GET',
                url: '/get/challenges',
                headers: {
                    'Authorization': 'Token ' + token
                },
                params: {
                    account: accountid,
                    profile: userid
                }
            })
        }

        function getLeaderBoard(userid, token) {
            return $http({
                method: 'GET',
                headers: {
                    'Authorization': 'Token ' + token
                },
                url: CONSTANT.SERVER + '/profiles/' + userid + '/leaderboard/'
            })
        }
    }
})();
(function() {
    'use strict';
    angular
        .module('zayaChallenge')
        .run(run);

    run.$inject = ['$rootScope', '$state'];

    function run($rootScope, $state) {
        $rootScope.$on('$stateChangeStart', function(event, toState, toParams, fromState, fromParams) {
            console.log(toState)
            if (toState.name == 'home' && !toParams.token) {
                event.preventDefault();
                $state.go('unauthorized')
            }
            if (toState.name == 'challenge' && !toParams.quiz) {
                event.preventDefault();
                $state.go('home')
            }
            if (toState.name == 'result' && !toParams.userid) {
                event.preventDefault();
                $state.go('home')
            }
        });
    }
})();
(function() {
    'use strict';
    angular
        .module('zayaChallenge')
        .factory('widgetParser', widgetParser)
    widgetParser.$inject = ['CONSTANT', '$log', '$q'];

    function widgetParser(CONSTANT, $log, $q) {
        var soundIdRegex = /(?:\[\[)(?:sound)(?:\s)(?:id=)([0-9]+)(?:\]\])/;
        var imageTagRegex = /(?:\[\[)(?:img)(?:\s)(?:id=)([0-9]+)(?:\]\])/;
        return {
            getSoundId: getSoundId,
            getImageId: getImageId,
            getImageSrc: getImageSrc,
            getSoundSrc: getSoundSrc,
            parseToDisplay: parseToDisplay,
            replaceImageTag: replaceImageTag,
            removeSoundTag: removeSoundTag,
            removeImageTag: removeImageTag,
            getLayout: getLayout,
            getOptionsFontSize: getOptionsFontSize,
            addContainerToText: addContainerToText
        }

        function getSoundId(string) {
            if (soundIdRegex.exec(string)) {
                return soundIdRegex.exec(string)[1];
            }
        }

        function getImageId(string) {
            if (imageTagRegex.exec(string)) {
                return imageTagRegex.exec(string)[1];
            }
        }

        function getImageSrc(id, index, quiz) {

            // return mediaManager.getPath(quiz.objects[index].node.type.content.widgets.images[id]);
            var d = $q.defer();
            d.resolve(CONSTANT.SERVER + quiz.objects[index].node.type.content.widgets.images[id])
            return d.promise;
        }

        function getSoundSrc(id, index, quiz) {
            // return mediaManager.getPath(quiz.objects[index].node.type.content.widgets.sounds[id]);
            var d = $q.defer();
            d.resolve(CONSTANT.SERVER + quiz.objects[index].node.type.content.widgets.sounds[id])
            return d.promise;
        }

        function parseToDisplay(string, index, quiz) {
            console.log(string, index, quiz)
            var d = $q.defer();
            var text = this.removeSoundTag(string, index);
            text = this.addContainerToText(text)
            if (this.getImageId(text)) {
                this.replaceImageTag(text, index, quiz).then(function(text) {
                    d.resolve(text.trim().length > 0 ? text.trim() : CONSTANT.WIDGETS.SPEAKER_IMAGE)
                });
            } else {
                d.resolve(text.trim().length > 0 ? text.trim() : CONSTANT.WIDGETS.SPEAKER_IMAGE)
            }
            return d.promise;
        }

        function addContainerToText(text) {
            if (text.replace(imageTagRegex, "").trim().length) {
                return text.match(imageTagRegex) ? "<div>" + text.replace(imageTagRegex, "") + "</div>" + text.match(imageTagRegex)[0] : "<div>" + text.replace(imageTagRegex, "") + "</div>";
            } else {
                return text.match(imageTagRegex) ? text.match(imageTagRegex)[0] : "";
            }
        }

        function removeSoundTag(string) {
            return string.replace(soundIdRegex, "");
        }

        function removeImageTag(string) {
            return string.replace(imageTagRegex, "");
        }

        function replaceImageTag(string, index, quiz) {
            return this.getImageSrc(this.getImageId(string), index, quiz).then(function(data) {
                return string.replace(imageTagRegex, "<img class='content-image' src='" +
                    data + "'>");
            })
        }

        function getLayout(question, index, quiz) {
            var layout = CONSTANT.WIDGETS.LAYOUT.LIST;

            angular.forEach(question.node.type.content.options, function(option) {
                if (this.getImageId(option.option) || this.getSoundId(option.option)) {
                    layout = CONSTANT.WIDGETS.LAYOUT.GRID;
                }
            }, this, CONSTANT);
            return layout;
        }

        function getOptionsFontSize(options) {
            var size = 'font-lg'
            angular.forEach(options, function(option) {
                if (option.widgetHtml.length > CONSTANT.WIDGETS.OPTIONS.FONT_SIZE_THRESHOLD) {
                    size = 'font-md'
                }
            })
            return size;
        }
    }
})();
(function() {
    'use strict';

    angular
        .module('zayaChallenge')
        .factory('quizFactory', quizFactory);

    quizFactory.$inject = ['widgetParser', '$q'];

    /* @ngInject */
    function quizFactory(widgetParser, $q) {
        var quizFactory = {
            getQuiz: getQuiz
        };

        return quizFactory;

        function getQuiz(quiz) {
            // return quiz;
            var d = $q.defer();
            var promises = [];
            for (var index = 0; index < quiz.objects.length; index++) {
                // if (quiz.objects[index].node.meta && quiz.objects[index].node.meta.instructions && quiz.objects[index].node.meta.instructions.sounds[0] && localStorage.getItem(quiz.objects[index].node.meta.instructions.sounds[0]) != 'played') {
                //     localStorage.setItem(quiz.objects[index].node.meta.instructions.sounds[0], 'played');
                //     promises.push(mediaManager.getPath(quiz.objects[index].node.meta.instructions.sounds[0]).then(
                //         function(index) {
                //             return function(path) {
                //                 quiz.objects[index].node.instructionSound = path
                //             }
                //         }(index)
                //     ))
                // }
                promises.push(
                    widgetParser.parseToDisplay(quiz.objects[index].node.title, index, quiz).then(
                        function(index) {
                            return function(result) {
                                console.log(result)
                                quiz.objects[index].node.widgetHtml = result;
                            }
                        }(index)
                    )
                );
                quiz.objects[index].node.widgetSound = null;
                if (widgetParser.getSoundId(quiz.objects[index].node.title)) {
                    promises.push(widgetParser.getSoundSrc(widgetParser.getSoundId(quiz.objects[index].node.title), index, quiz).then(
                        function(index) {
                            return function(result) {
                                quiz.objects[index].node.widgetSound = result;
                            }
                        }(index)
                    ))
                }
                for (var j = 0; j < quiz.objects[index].node.type.content.options.length; j++) {
                    promises.push(widgetParser.parseToDisplay(quiz.objects[index].node.type.content.options[j].option, index, quiz).then(
                        function(index, j) {
                            return function(result) {
                                quiz.objects[index].node.type.content.options[j].widgetHtml = result;
                            }
                        }(index, j)
                    ));
                    quiz.objects[index].node.type.content.options[j].widgetSound = null;
                    if (widgetParser.getSoundId(quiz.objects[index].node.type.content.options[j].option)) {
                        promises.push(widgetParser.getSoundSrc(widgetParser.getSoundId(quiz.objects[index].node.type.content.options[j].option), index, quiz).then(
                            function(index, j) {
                                return function(result) {
                                    quiz.objects[index].node.type.content.options[j].widgetSound = result;
                                }
                            }(index, j)
                        ))
                    }
                }
            }
            $q.all(promises).then(function() {
                d.resolve(quiz)
            });
            return d.promise;
        }
    }
})();
(function() {
    angular
        .module('zayaChallenge')
        .constant('CONSTANT', {
            'SERVER': 'https://cc-test-2.zaya.in/api/v1',
            'WIDGETS': {
                'SPEAKER_IMAGE': '<div class="sound-image sbtn sbtn-sound"></div>',
                'SPEAKER_IMAGE_SELECTED': '<div class="sound-image sbtn sbtn-sound activated animation-repeat-bounce"></div>',
                'OPTIONS': {
                    'LAYOUT_THRESHOLD': 55,
                    'FONT_SIZE_THRESHOLD': 6
                },
                'QUESTION_TYPES': {
                    'CHOICE_QUESTION': 'choicequestion',
                    'SCQ': 'scq',
                    'MCQ': 'mcq'
                },
                'LAYOUT': {
                    'LIST': 'list',
                    'GRID': 'grid'
                }
            }
        })
})();
(function() {
    'use strict';

    angular
        .module('zayaChallenge')
        .factory('audio', audio)

    function audio($log) {

        return {
            player: {
                play: playSound, // replaces current sound and removes next sound
                stop: stopSound,
                isPaused: isPaused,
                removeCallback: removeCallback,
                resume: resume,
                chain: chain,
                addCallback: addCallback
            }
        };

        function playSound(url, callback) {
            angular.element("#audioplayer")[0].onended = null;
            angular.element("#audioplayer")[0].pause();
            if (url) {
                angular.element("#audioSource")[0].src = url;
                angular.element("#audioplayer")[0].load();
            }
            if (url && callback) {
                angular.element("#audioplayer")[0].onended = callback;
            }
        }

        function chain(count, soundArr, callback) {
            angular.element("#audioplayer")[0].onended = null;
            angular.element("#audioplayer")[0].pause();
            angular.element("#audioSource")[0].src = soundArr[count];
            angular.element("#audioplayer")[0].load();
            angular.element("#audioplayer")[0].play();
            if (soundArr[count + 1]) {
                angular.element("#audioplayer")[0].onended = function() {
                    chain(++count, soundArr, callback);
                }
            } else {
                if (callback)
                    angular.element("#audioplayer")[0].onended = callback;
            }
        }

        function resume() {
            angular.element("#audioplayer")[0].play();
        }

        function stopSound() {
            angular.element("#audioplayer")[0].onended = null;
            angular.element("#audioplayer")[0].pause();
        }

        function isPaused() {
            return angular.element("#audioplayer")[0].paused;
        }

        function removeCallback() {
            angular.element("#audioplayer")[0].onended = null;
        }

        function addCallback(callBack) {
            angular.element("#audioplayer")[0].onended = callBack;
        }


    }
})();
