var fs = require('fs'),
	events = require('events'),
	_ = require('underscore'),
	papersDB = require('./papersDB.js'),
	PDFParser = require('pdf2json'),
	pdfParser = new PDFParser();

var databaseName = 'db.json',
	papersLocation = '[--REDACTED--]',
	bibtexLocation = '[--REDACTED--]',
	db = papersDB(databaseName, papersLocation, bibtexLocation),
	papers = db.db.papers;

function pdfParserPromise(fileName) {
	console.log('Reading', fileName);
	var promise = new(events.EventEmitter);

	var pdfParser = new PDFParser();

	pdfParser.on("pdfParser_dataReady", function(evtData) {
	if ((!!evtData) && (!!evtData.data)) {
		promise.emit('success', evtData);
	}
	else {
		promise.emit('error', new Error());
	}
	});

	pdfParser.on("pdfParser_dataError", function(evtData) {
		promise.emit('error', evtData.data);
	});

	pdfParser.loadPDF(fileName);

	return promise;
};

var paperCount = 0;
var readPaper = function(paper) {
	var promise = pdfParserPromise(papersLocation + paper.fileName);
	
	promise.on('success', function(data) {
		console.log('Read ', data.pdfFilePath);
		if (data.data.Pages == null) {
			console.log('no pages!');
			if (papers.length >= paperCount) readPDF(papersLocation + papers[++paperCount].fileName);
			return;
		}
		console.log('Pages', data.data.Pages.length);
		var chunks = _.flatten(_.map(data.data.Pages || [], function(page) {
			return _.flatten(_.map(page.Texts || [], function(text) {
				return _.flatten(_.map(text.R || [], function(r) {
					return unescape(r.T);
				}));
			}));
		}));
		//console.log(chunks);
		console.log('word count', chunks.length);

		var counts = _.reduce(chunks, function(memo, chunk) {
			memo[chunk] = (memo[chunk] || 0) + 1;
			return memo;
		}, {});

		var paper = _.find(papers, function(paper) { return (papersLocation + paper.fileName) == data.pdfFilePath; });
		//paper.wordCounts = _.sortBy(_.map(counts, function(count, word) { return [word, count]; }), function(w) { return w[1]; });
		db.processRequest({action: 'add', path: 'papers.' + paper.id, data: {wordCounts: counts, text: chunks, totalWords: chunks.length}})
		//paper.wordCounts = counts;
		//console.log(paper.text);
	//	console.log(counts);
		//if (++paperCount % 100 == 0) //saveDatabase('db' + paperCount + '.json', db);
		if (papers.length >= paperCount) readPaper(papers[++paperCount]);
	//	console.log(_.sortBy(_.map(counts, function(count, word) { return {word: word, count: count}; }), 'count'));
	});
};
readPaper(papers[0])