(function() {
    'use strict';

    angular
        .module('zayaChallenge', [
            'ui.router',
            'ngMorph',
            'ngSanitize'
        ]);
})();

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
            name: 'challenge',
            url: '/challenge',
            params: {
                quiz: null,
                userid : null,
                token : null
            },
            templateUrl: '/challenge.html',
            controller: 'challengeController',
            controllerAs: 'challengeCtrl'
        }, {
            name: 'result',
            url: '/result',
            params : {
              score : null,
              time : null,
              userid : null,
              quizid : null,
              token : null
            },
            templateUrl: '/result.html',
            controller: 'resultController',
            controllerAs: 'resultCtrl'
        },
        {
            name: 'guide',
            url: '/guide',
            templateUrl: '/guide.html',
            controller: 'guideController',
            controllerAs: 'guideCtrl'
        }
        ]

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

        $stateParams.accountid && $stateParams.userid && $stateParams.token &&
            Rest
            .getChallenges($stateParams.accountid, $stateParams.userid, $stateParams.token)
            .then(function successCallback(response) {
                homeCtrl.challenges = response.data.objects;
            }, function errorCallback(error) {
                console.log(error)
            })

        Rest.getLeaderBoard($stateParams.userid, $stateParams.token)
        .then(function successCallback(response){
          $scope.leaderboard = response.data;
          console.log(response);
        },function errorCallback(error){
          console.log(error)
        })
        $scope.mapRank = utility.mapRank;

        function startChallenge(quiz) {
            $state.go('challenge', {
                quiz: quiz,
                userid : $stateParams.userid,
                token : $stateParams.token
            })
        }
    }
})();
(function() {
    'use strict';

    angular
        .module('zayaChallenge')
        .controller('challengeController', challengeController);

    challengeController.$inject = ['Rest', '$stateParams', '$state', '$timeout', '$scope'];

    /* @ngInject */
    function challengeController(Rest, $stateParams, $state, $timeout, $scope) {
        var challengeCtrl = this;
        challengeCtrl.quiz = $stateParams.quiz;
        challengeCtrl.prose = challengeCtrl.quiz.node.title;
        $scope.prose = challengeCtrl.prose;
        challengeCtrl.submit = submit;
        challengeCtrl.next = next;
        challengeCtrl.currentIndex = 0;
        challengeCtrl.result = {};
        challengeCtrl.selectOption = selectOption;
        challengeCtrl.calculateScore = calculateScore;
        challengeCtrl.score = 0;
        challengeCtrl.getElapsedTime = getElapsedTime;

        function selectOption(key) {
          challengeCtrl.quiz.objects[challengeCtrl.currentIndex]['selected'] = key;
        }

        function getElapsedTime (onlyMinutes){
          var timeElapsed = ~~(challengeCtrl.time - challengeCtrl.startTime)/1000;
          var seconds = timeElapsed % 60;
          var minutes = (timeElapsed - seconds)/60;
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

        function calculateScore(){
          var score = 0;
          for (var key in challengeCtrl.result) {
            if (challengeCtrl.result.hasOwnProperty(key)) {
              if(challengeCtrl.result[key])
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
                  score : challengeCtrl.score,
                  time : challengeCtrl.getElapsedTime(true),
                  userid : $stateParams.userid,
                  quizid : challengeCtrl.quiz.node.id,
                  token : $stateParams.token
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
      		"action":"quiz_complete",
      		"score": resultCtrl.points,
      		"content_type":"node",
      		"object_id": $stateParams.quizid,
      	})
        .then(function successCallback(response){
          return Rest.getLeaderBoard($stateParams.userid, $stateParams.token)
        })
        .then(function successCallback(response){
          $scope.leaderboard = response.data;
          console.log(response);
        },function errorCallback(error){
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
            $timeout(function(){
                el.owlCarousel({
                    items : 1,
                    autoplay : true,
                    autoplayTimeout : 3000
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

    Rest.$inject = ['$http'];

    /* @ngInject */
    function Rest($http) {
        var Rest = {
            getChallenges: getChallenges, // user based challenge list : @input : userid
            getLeaderBoard: getLeaderBoard, // user leaderboard : @input : userid
            sendReport: sendReport
        };

        return Rest;

        function sendReport(profile_id, token, report) {
          return $http({
            method : 'POST',
            url : 'https://cc-test-2.zaya.in/api/v1/profiles/'+profile_id+'/points/',
            headers: {
                'Authorization': 'Token ' + token
            },
            data : report
          })
        }

        function getChallenges(userid, accountid, token) {
            return $http({
                method : 'GET',
                url : 'https//challenge.zaya.in/get/challenges',
                headers : {
                    'Authorization' : 'Token ' + token
                },
                params : {
                    account : accountid,
                    profile : userid
                }
            })
        }

        function getLeaderBoard(userid, token) {
            return $http({
              method : 'GET',
              headers : {
                'Authorization' : 'Token ' + token
              },
              url : 'https://cc-test-2.zaya.in/api/v1/profiles/'+userid+'/leaderboard/'
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
