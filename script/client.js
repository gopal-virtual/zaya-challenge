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
                url: '/',
                templateUrl: '/home.html',
                controller : 'homeController',
                controllerAs : 'homeCtrl'
            },
            {
                name: 'challenge',
                url: '/challenge',
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

    homeController.$inject = ['Rest'];

    /* @ngInject */
    function homeController(Rest) {
        var homeCtrl = this;
        homeCtrl.challenges = Rest.getChallenges();
        homeCtrl.leaderboard = Rest.getLeaderBoard();
    }
})();
(function() {
    'use strict';

    angular
        .module('zayaChallenge')
        .controller('challengeController', challengeController);

    challengeController.$inject = ['Rest'];

    /* @ngInject */
    function challengeController(Rest) {
        var challengeCtrl = this;
        challengeCtrl.quiz = Rest.getQuiz();
        challengeCtrl.prose = challengeCtrl.quiz.node.title;
        challengeCtrl.currentIndex = 0;
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

    Rest.$inject = [];

    /* @ngInject */
    function Rest() {
        var Rest = {
            getChallenges: getChallenges, // user based challenge list : @input : userid
            getLeaderBoard : getLeaderBoard, // user leaderboard : @input : userid
            getQuiz : getQuiz, // get questions for the challenge : @input : quizid
            setReport : setReport,
            
        };

        return Rest;

        function setReport(report){

        }

        function getChallenges(userid) {
          return [
            {
              name : '1st week',
              questions : 10,
              lock : false
            },
            {
              name : '2nd week',
              questions : 10,
              lock : false
            },
            {
              name : '3rd week',
              questions : 10,
              lock : true
            },
            {
              name : '4th week',
              questions : 10,
              lock : true
            },
            {
              name : '5th week',
              questions : 10,
              lock : true
            },
            {
              name : '6th week',
              questions : 10,
              lock : true
            }
          ]
        }
        function getLeaderBoard(userid){
          return [
            {
              rank : 1,
              username : 'Heli Shah',
              points : 12343
            },
            {
              rank : 2,
              username : 'Gopal Ojha',
              points : 12343
            },
            {
              rank : 3,
              username : 'Ayush Shah',
              points : 12343
            },
            {
              rank : 39,
              username : 'Vaidehi Rajdhakswya',
              points : 12343
            }
          ]
        }
        function getQuiz(challengeId) {
          return {
            node : {
              title : "Lorem ipsum dolor sit amet, consectetur adipisicing elit. Debitis, ipsam quasi ipsa assumenda eius, eum magni optio molestiae reprehenderit error totam repudiandae, voluptate corporis vitae quidem praesentium libero itaque ut dolor accusantium expedita eos sunt. Maxime distinctio, in voluptatibus quam doloremque illum non! Non provident dignissimos voluptate cumque, impedit distinctio, atque repellendus sunt explicabo aut facilis ullam asperiores, veritatis neque soluta a tenetur labore excepturi quos nihil libero. Ullam rem quaerat, illum ipsum adipisci quam deleniti assumenda ad quas harum animi laboriosam dolorem eum qui aliquid iure blanditiis nam asperiores officia vel similique nisi corporis quo accusamus nihil? Possimus, at."
            },
            objects : [
              {
                node : {
                  title : "Lorem ipsum dolor sit amet, consectetur adipisicing elit. Quo, eaque!",
                  options : {
                    a : "first answer",
                    b : "second answer",
                    c : "third answer",
                    d : "fourth answer"
                  }
                }
              },
              {
                node : {
                  title : "Sit amet, consectetur adipisicing elit",
                  options : {
                    a : "first answer",
                    b : "second answer",
                    c : "third answer",
                    d : "fourth answer"
                  }
                }
              },
              {
                node : {
                  title : "Lorem ipsum dolor Quo, eaque!",
                  options : {
                    a : "first answer",
                    b : "second answer",
                    c : "third answer",
                    d : "fourth answer"
                  }
                }
              }
            ]
          }
        }
    }
})();
