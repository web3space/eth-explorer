'use strict';

$.getJSON( "./config.json" , function( result ){
    $(document).ready(function() {
    angular.module('ethExplorer', ['ngRoute','ui.bootstrap', 'ethExplorer.search', 'ethExplorer.address', 'ethExplorer.tx', 'ethExplorer.main', 'ethExplorer.block'])
        .config(['$routeProvider', '$locationProvider',
            function($routeProvider, $locationProvider) {
                $locationProvider.html5Mode(true);
                $routeProvider.
                    when('/', {
                        templateUrl: 'views/main.html',
                        controller: 'mainCtrl'
                    }).
                    when('/block/:blockId', {
                        templateUrl: 'views/blockInfos.html',
                        controller: 'blockInfosCtrl'
                    }).
                    when('/transaction/:transactionId', {
                        templateUrl: 'views/transactionInfos.html',
                        controller: 'transactionInfosCtrl'
                    }).
                    when('/address/:addressId', {
                        templateUrl: 'views/addressInfo.html',
                        controller: 'addressInfoCtrl'
                    }).
                    otherwise({
                        redirectTo: '/'
                    });
            }])
    .run(function($rootScope) {
                    var web3 = new Web3();
                    
            	    web3.setProvider(new web3.providers.HttpProvider(result.rpcUrl));
                    
                    $rootScope.web3 = web3;
                    
                    $rootScope.safeApply = function(fn) {
                          var phase = this.$root.$$phase;
                          if(phase == '$apply' || phase == '$digest') {
                            if(fn && (typeof(fn) === 'function')) {
                              fn();
                            }
                          } else {
                            this.$apply(fn);
                          }
                    };
                    
            });
    angular.bootstrap(document, ['ethExplorer']);
    });
});