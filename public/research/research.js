angular.module('research', ['ngResource', 'ngGrid', 'ngPDFViewer'])
.controller('ResearchCtrl', ['$scope', '$resource', '$timeout', 'PDFViewerService', function($scope, $resource, $timeout, pdf) {
	$scope.viewer = pdf.Instance('paper-canvas');

	$scope.commandType = 'All';

	$scope.selectedPapers = [];
	$scope.papersGridOptions = {
		data: 'papers',
		columnDefs: [{
			field: 'title',
			displayName: 'Title'
		},{
			field: 'authorsString',
			displayName: 'Authors'
		},{
			field: 'keywordsString'
		}],
		selectedItems: $scope.selectedPapers,
		multiSelect: false,
		showFilter: true,
		filterOptions: {
			filterText: ''
		}
	};

	$scope.nextPage = $scope.viewer.nextPage;
	$scope.previousPage = $scope.viewer.prevPage;
	$scope.zoomOut = $scope.viewer.zoomOut;
	$scope.zoomIn = $scope.viewer.zoomIn;

	$scope.$watchCollection('selectedPapers', function(newValue, oldValue) {
		$scope.selectedPaper = newValue.length > 0 ? newValue[0] : null;
		if ($scope.selectedPaper == null) return;

		var url = $scope.selectedPaper.url;
		$scope.currentPaperUrl = url;

		$scope.showPDF = true;



	 //    var canvas = document.getElementById('paper-canvas'),
	 //    	context = canvas.getContext('2d');
	    
	 //    $scope.showPDF = false;
	 //    $timeout(function() {
	 //    	if (url != $scope.currentPaperUrl) return;

		//     PDFJS.getDocument(url).then(function(pdf) {
		// 		pdf.getPage(1).then(function(page) {
		// 			if (url != $scope.currentPaperUrl) return;

		// 			var scale = 1.5,
		// 				viewport = page.getViewport(scale);

		// 			canvas.height = viewport.height;
		// 			canvas.width = viewport.width;

		// 			page.render({canvasContext: context, viewport: viewport});
		// 			$scope.showPDF = true;
		// 			console.log($scope.showPDF);
		// 			$scope.$apply();
		// 		});
		//     });
		// }, 500);
	});

	var Paper = $resource('/papers/:id');

	Paper.get(function(papers, headers) {
		console.log(papers);
		$scope.papers = papers.papers;
		$scope.selectedPapers.splice(0, 1, papers.papers[0]);
	});

	$scope.papers = [{
		title: '',
		authors: [{name: ''}],
		fileName: '',
		url: '',
		tags: [{name:''}],
		comments: [{
			author: '',
			comment: ''
		}]
	}];

	var executeCommand = function() {
		var command = $scope.command;


	};

	$scope.handleKeydown = function(event) {
		if (event.which == 13) executeCommand();
	};
}])
.directive('commandBar', function() {
	return {
		link: function($scope, element, attributes) {

		}
	};
});