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

	$scope.selected = {};

	$scope.$watchCollection('selectedPapers', function(newValue, oldValue) {
		$scope.selected.paper = newValue.length > 0 ? newValue[0] : null;
		if ($scope.selected.paper == null) return;

		var url = $scope.selected.paper.url;
		$scope.currentPaperUrl = url;

		$scope.showPDF = true;
	});

	var Paper = $resource('/papers/:id', {id: '@id'});

	Paper.query(function(papers, headers) {
		_.each(papers, function(paper) {
			paper.authorsString = _.pluck(paper.authors, 'name').join(' and ');
			paper.keywordsString = (paper.keywords || []).join(', ');
		});
		$scope.papers = papers;
		$scope.selectedPapers.splice(0, 1, papers[0]);
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

	$scope.bibtexUpdated = function() {
		console.log($scope.selected);
		$scope.selected.paper.$save();
	};
}])
.directive('commandBar', function() {
	return {
		link: function($scope, element, attributes) {

		}
	};
});