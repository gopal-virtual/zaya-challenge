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

    homeController.$inject = [];

    /* @ngInject */
    function homeController() {
        var homeCtrl = this;
    }
})();
(function() {
    'use strict';

    angular
        .module('zayaChallenge')
        .controller('challengeController', challengeController);

    challengeController.$inject = [];

    /* @ngInject */
    function challengeController() {
        var challengeCtrl = this;

    }
})();
(function() {
    'use strict';

    angular
        .module('zayaChallenge')
        .controller('resultController', resultController);

    resultController.$inject = [];

    /* @ngInject */
    function resultController() {
        var challengeCtrl = this;

    }
})();
