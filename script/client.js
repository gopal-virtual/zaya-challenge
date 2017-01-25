(function() {
   'use strict';

    angular
        .module('zayaChallenge', [
            'ui.router'
        ]);
})();

(function() {
    'use strict';

    angular
        .module('zayaChallenge')
        .config(config);

    function config($urlRouterProvider, $injector, $stateProvider) {
        $urlRouterProvider.otherwise(function ($injector) {
            $injector.get('$state').go('home');
        });

        var states = [
            {
                name: 'home',
                url: '/:accountid/:userid/:token',
                templateUrl: '/home.html',
                controller : 'homeController',
                controllerAs : 'homeCtrl'
            },
            {
                name: 'unauthorized',
                url: '/unauthorized',
                templateUrl: '/unauthorized.html'
            },
            {
                name: 'challenge',
                url: '/challenge',
                params : {
                    quiz : null
                },
                templateUrl: '/challenge.html',
                controller : 'challengeController',
                controllerAs : 'challengeCtrl'
            },
            {
                name: 'result',
                url: '/result',
                templateUrl: '/result.html',
                controller : 'resultController',
                controllerAs : 'resultCtrl'
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

    homeController.$inject = ['Rest','$state', '$stateParams'];

    /* @ngInject */
    function homeController(Rest, $state, $stateParams) {
        var homeCtrl = this;
        homeCtrl.startChallenge = startChallenge;

        $stateParams.accountid && $stateParams.userid && $stateParams.token &&
        Rest
            .getChallenges($stateParams.accountid, $stateParams.userid, $stateParams.token)
            .then(function successCallback(response) {
                homeCtrl.challenges = response.data.objects;
            })
        homeCtrl.leaderboard = Rest.getLeaderBoard();

        function startChallenge(quiz){
            $state.go('challenge',{
                quiz : quiz
            })
        }
    }
})();
(function() {
    'use strict';

    angular
        .module('zayaChallenge')
        .controller('challengeController', challengeController);

    challengeController.$inject = ['Rest','$stateParams', '$state'];

    /* @ngInject */
    function challengeController(Rest, $stateParams, $state) {
        var challengeCtrl = this;
        challengeCtrl.quiz = $stateParams.quiz;
        challengeCtrl.prose = challengeCtrl.quiz.node.title;
        challengeCtrl.submit = submit;
        challengeCtrl.next = next;
        challengeCtrl.currentIndex = 0;

        function submit() {
            // submit points
        }

        function next(){
            if(challengeCtrl.currentIndex < challengeCtrl.quiz.objects.length - 1){
                ++challengeCtrl.currentIndex
            }
            else{
                $state.go('result',{})
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

    resultController.$inject = ['Rest'];

    /* @ngInject */
    function resultController(Rest) {
        var resultCtrl = this;
        resultCtrl.leaderboard = Rest.getLeaderBoard();
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
            getLeaderBoard : getLeaderBoard, // user leaderboard : @input : userid
            setReport : setReport
        };

        return Rest;

        function setReport(report){

        }

        function getChallenges(userid, accountid, token) {
          return $http({
              method: 'GET',
              url: 'https://cc-test-2.zaya.in/api/v1/accounts/'+accountid+'/challenges/',
              headers: {
               'Authorization': 'Token ' + token
             },
          })
          .then(function(response){
              return $http({
                  method : 'GET',
                  url : 'https://cc-test-2.zaya.in/api/v1/accounts/'+accountid+'/lessons/'+response.data[0].id+'/',
                  headers: {
                   'Authorization': 'Token ' + token
                 },
              })
          })
        }
        function getLeaderBoard(userid){
        }
    }
})();
(function(){
  'use strict';
  angular
    .module('zayaChallenge')
    .run(run);

    run.$inject = ['$rootScope','$state'];
    function run($rootScope, $state){
        $rootScope.$on('$stateChangeStart', function(event, toState, toParams, fromState, fromParams) {
          if (toState.name == 'home' && !toParams.token){
            event.preventDefault();
            $state.go('unauthorized')
          }
        });
    }
})();
