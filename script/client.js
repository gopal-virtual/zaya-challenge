(function() {
    'use strict';

    angular
        .module('zayaChallenge', [
            'ui.router',
            'ngMorph'
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
                quiz: null
            },
            templateUrl: '/challenge.html',
            controller: 'challengeController',
            controllerAs: 'challengeCtrl'
        }, {
            name: 'result',
            url: '/result',
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

        $scope.leaderboard = Rest.getLeaderBoard();
        $scope.mapRank = utility.mapRank;

        function startChallenge(quiz) {
            $state.go('challenge', {
                quiz: quiz
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
        challengeCtrl.submit = submit;
        challengeCtrl.next = next;
        challengeCtrl.currentIndex = 0;

        $scope.settings = {
            closeEl: '.close',
		    overlay: {
		      templateUrl: '/reading-comprehension.html'
		    }
        }

        var interval = 1000; // ms
        challengeCtrl.time = Date.now() + interval;
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
            // submit points
        }

        function next() {
            if (challengeCtrl.currentIndex < challengeCtrl.quiz.objects.length - 1) {
                ++challengeCtrl.currentIndex
            } else {
                $state.go('result', {})
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

    resultController.$inject = ['Rest', '$scope', 'utility'];

    /* @ngInject */
    function resultController(Rest, $scope, utility) {
        var resultCtrl = this;
        $scope.leaderboard = Rest.getLeaderBoard();
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
            setReport: setReport
        };

        return Rest;

        function setReport(report) {

        }

        function getChallenges(userid, accountid, token) {
            return $http({
                    method: 'GET',
                    url: 'https://cc-test-2.zaya.in/api/v1/accounts/' + accountid + '/challenges/',
                    headers: {
                        'Authorization': 'Token ' + token
                    },
                })
                .then(function(response) {
                    return $http({
                        method: 'GET',
                        url: 'https://cc-test-2.zaya.in/api/v1/accounts/' + accountid + '/lessons/' + response.data[0].id + '/',
                        headers: {
                            'Authorization': 'Token ' + token
                        },
                    })
                })
        }

        function getLeaderBoard(userid) {
            return {
                1: {
                    userid: 23094,
                    username: 'heli',
                    points: 342
                },
                2: {
                    userid: 20394,
                    username: 'gopal',
                    points: 312
                },
                3: {
                    userid: 2342423,
                    username: 'ayush',
                    points: 234
                },
                334: {
                    userid: 23423,
                    username: 'Kartik',
                    points: 23
                }
            }
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
        });
    }
})();
