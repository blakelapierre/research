var research = angular.module('research', ['ngRoute', 'ngResource', 'ngGrid', 'ngPDFViewer']);

research.config(function($controllerProvider, $compileProvider, $routeProvider, $filterProvider, $provide) {
	console.log('research');
	research.lazy = {
		controller: $controllerProvider.register,
		directive: $compileProvider.directive,
		filter: $filterProvider.register,
		factory: $provide.factory,
		service: $provide.service
	};

	var resolveToController = function(controller) {
		return {
			templateUrl: controller + '.html',
			resolve: {
				load: ['$q', '$rootScope', function($q, $rootScope) {
					var deferred = $q.defer();

					require([controller + '.js'], function() {
						$rootScope.$apply(function() {
							deferred.resolve();
						});
					});

					return deferred.promise;	
				}]
			}
		};
	};

	$routeProvider.when('/papers', resolveToController('/research/papers/controllers/papers'));
	$routeProvider.when('/code', resolveToController('/research/code/controllers/code'));
});

research
.directive('commandBar', function() {
	return {
		link: function($scope, element, attributes) {

		}
	};
})
.directive('networkedInput', function() {
	return {
		restrict: 'A',
		require: '?ngModel',
		link: function(scope, element, attrs, ngModel) {
			if (!ngModel) return;

			ngModel.$viewChangeListeners.push(function(c) {
				console.log('change:', c);
			});
		}
	};
})
.factory('socket', function($rootScope) {
	var socket = io.connect('http://' + window.location.host);
	return socket;
});