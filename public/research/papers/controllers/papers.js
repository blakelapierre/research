research
.lazy
.controller('ResearchCtrl',	['$scope', '$resource', '$timeout', 'PDFViewerService', 'socket', 
	function($scope, $resource, $timeout, pdf, socket) {

	$scope.mode = 'papers';
	$scope.user = {};
	$scope.viewer = pdf.Instance('paper-canvas');

	$scope.commandType = 'All';

	$scope.selectedPapers = [];
	$scope.papersGridOptions = {
		data: 'papers',
		columnDefs: [{
			field: 'title',
			displayName: 'Title'
		},{
			field: 'journal',
			displayName: 'Journal'
		},{
			field: 'authorsString',
			displayName: 'Authors'
		},{
			field: 'keywordsString'
		}],
		selectedItems: $scope.selectedPapers,
		multiSelect: false,
		filterOptions: {
			filterText: ''
		}
	};

	$scope.nextPage = $scope.viewer.nextPage;
	$scope.previousPage = $scope.viewer.prevPage;
	$scope.zoomOut = $scope.viewer.zoomOut;
	$scope.zoomIn = $scope.viewer.zoomIn;
	$scope.rotateClockwise = $scope.viewer.rotate90DegreesClockwise;
	$scope.rotateCounterclockwise = $scope.viewer.rotate90DegreesCounterclockwise;


	$scope.selected = {};

	$scope.$watchCollection('selectedPapers', function(newValue, oldValue) {
		var paper = newValue.length > 0 ? newValue[0] : null;
		$scope.selected.paper = paper;
		if ($scope.selected.paper == null) return;

		$scope.currentPaperUrl = paper.url;
		$scope.showPDF = true;

		socket.emit('listenTo', {path: 'papers.' + paper.id});
	});

	var Paper = $resource('/papers/:id', {id: '@id'}),
		db;

	window.paperIndex = lunr(function() {
		this.field('title');
		this.field('text');
		this.ref('id');
	});

	Paper.query(function(papers, headers) {
		for (var i = 0; i < 10; i++) window.paperIndex.add(papers[i]);

		_.each(papers, function(paper) {
			paper.authorsString = _.pluck(paper.authors, 'name').join(' and ');
			paper.keywordsString = (paper.keywords || []).join(', ');
			//window.paperIndex.add(paper);
		});
		db = makeDB({papers:papers});
		console.log(db);
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

	socket.on('update', function(update) {
		db.processRequest(update);
		$scope.$apply();
	});

	$scope.codeChanged = function() {
		var test = function(t) { alert(t); };
		var papers = function() { return $scope.papers ;};
		try {
			eval($scope.user.code);
		} catch (e) {
			$scope.results = e;
		}
	};
}]);