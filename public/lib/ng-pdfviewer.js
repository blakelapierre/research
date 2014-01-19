// Copyright (c) 2013 Andreas Krennmair ak@synflood.at

// Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

/**
 * @preserve AngularJS PDF viewer directive using pdf.js.
 *
 * https://github.com/akrennmair/ng-pdfviewer 
 *
 * MIT license
 */

angular.module('ngPDFViewer', []).
directive('pdfviewer', [ '$parse', function($parse) {
	var canvas = null;
	var instance_id = null;

	return {
		restrict: "E",
		template: '<canvas></canvas>',
		scope: {
			onPageLoad: '&',
			loadProgress: '&',
			src: '@',
			id: '='
		},
		controller: [ '$scope', function($scope) {
			$scope.pageNum = 1;
			$scope.pdfDoc = null;
			$scope.scale = 1.5;
			$scope.pageRotation = 0;

			$scope.documentProgress = function(progressData) {
				if ($scope.loadProgress) {
					$scope.loadProgress({state: "loading", loaded: progressData.loaded, total: progressData.total});
				}
			};

			$scope.loadPDF = function(path) {
				PDFJS.getDocument(path, null, null, $scope.documentProgress).then(function(_pdfDoc) {
					$scope.pdfDoc = _pdfDoc;
					$scope.renderPage($scope.pageNum, function(success) {
						if ($scope.loadProgress) {
							$scope.loadProgress({state: "finished", loaded: 0, total: 0});
						}
					});

					var text = [];
					for (var i = 0; i < _pdfDoc.numPages; i++) {
						_pdfDoc.getPage(i).then(function(page) {
							page.getTextContent().then(function(content) {
								for (var j = 0; j < content.bidiTexts.length; j++) {
									text.push(content.bidiTexts[j].str);
								}
							});
						});
					}

					setTimeout(function() { console.log(text.join(' ')); }, 2000);

				}, function(message, exception) {
					console.log("PDF load error: " + message);
					if ($scope.loadProgress) {
						$scope.loadProgress({state: "error", loaded: 0, total: 0});
					}
				});
			};

			$scope.renderPage = function(num, callback) {
				$scope.pdfDoc.getPage(num).then(function(page) {
					console.log(page);
					var viewport = page.getViewport($scope.scale, $scope.pageRotation);
					var ctx = canvas.getContext('2d');

					canvas.height = viewport.height;
					canvas.width = viewport.width;

					page.getTextContent().then(function(text) { console.log('text:', text); });

					//ctx.rotate(Math.PI / 4);

					page.render({ canvasContext: ctx, viewport: viewport }).then(
						function() { 
							if (callback) {
								callback(true);
							}
							$scope.$apply(function() {
								$scope.onPageLoad({ page: $scope.pageNum, total: $scope.pdfDoc.numPages });
							});
						}, 
						function() {
							if (callback) {
								callback(false);
							}
							console.log('page.render failed');
						}
					);
				});
			};

			$scope.$on('pdfviewer.nextPage', function(evt, id) {
				if (id !== instance_id) {
					return;
				}

				if ($scope.pageNum < $scope.pdfDoc.numPages) {
					$scope.pageNum++;
					$scope.renderPage($scope.pageNum);
				}
			});

			$scope.$on('pdfviewer.prevPage', function(evt, id) {
				if (id !== instance_id) {
					return;
				}

				if ($scope.pageNum > 1) {
					$scope.pageNum--;
					$scope.renderPage($scope.pageNum);
				}
			});

			$scope.$on('pdfviewer.gotoPage', function(evt, id, page) {
				if (id !== instance_id) {
					return;
				}

				if (page >= 1 && page <= $scope.pdfDoc.numPages) {
					$scope.pageNum = page;
					$scope.renderPage($scope.pageNum);
				}
			});

			$scope.$on('pdfviewer.zoomIn', function(evt, id) {
				if (id !== instance_id) return;

				$scope.scale *= 1.1;
				$scope.renderPage($scope.pageNum);
			});

			$scope.$on('pdfviewer.zoomOut', function(evt, id) {
				if (id !== instance_id) return;

				$scope.scale *= 0.9;
				$scope.renderPage($scope.pageNum);
			});

			var rotatePage = function(degrees) {
				$scope.pageRotation += degrees;
				$scope.renderPage($scope.pageNum);
			};

			$scope.$on('pdfviewer.rotate90DegreesClockwise', function(evt, id) {
				rotatePage(90);
			});

			$scope.$on('pdfviewer.rotate90DegreesCounterclockwise', function(evt, id) {
				rotatePage(-90);
			});
		} ],
		link: function(scope, iElement, iAttr) {
			canvas = iElement.find('canvas')[0];
			instance_id = iAttr.id;

			iAttr.$observe('src', function(v) {
				console.log('src attribute changed, new value is', v);
				if (v !== undefined && v !== null && v !== '') {
					scope.pageNum = 1;
					scope.loadPDF(scope.src);
				}
			});
		}
	};
}]).
service("PDFViewerService", [ '$rootScope', function($rootScope) {

	var svc = { };
	svc.nextPage = function() {
		$rootScope.$broadcast('pdfviewer.nextPage');
	};

	svc.prevPage = function() {
		$rootScope.$broadcast('pdfviewer.prevPage');
	};

	svc.Instance = function(id) {
		var instance_id = id;

		return {
			prevPage: function() {
				$rootScope.$broadcast('pdfviewer.prevPage', instance_id);
			},
			nextPage: function() {
				$rootScope.$broadcast('pdfviewer.nextPage', instance_id);
			},
			gotoPage: function(page) {
				$rootScope.$broadcast('pdfviewer.gotoPage', instance_id, page);
			},
			zoomOut: function() {
				$rootScope.$broadcast('pdfviewer.zoomOut', instance_id);
			},
			zoomIn: function() {
				$rootScope.$broadcast('pdfviewer.zoomIn', instance_id);
			},
			rotate90DegreesClockwise: function() {
				$rootScope.$broadcast('pdfviewer.rotate90DegreesClockwise', instance_id);
			},
			rotate90DegreesCounterclockwise: function() {
				$rootScope.$broadcast('pdfviewer.rotate90DegreesCounterclockwise', instance_id);
			}
		};
	};

	return svc;
}]);