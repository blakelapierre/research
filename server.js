var fs = require('fs'),
	path = require('path'),
	express = require('express'),
	_ = require('underscore'),
	BibtexParser = require('./lib/BibtexParser.js'),
    app = express(),
	port = 3007;

_.split = function(arr, fn) {
	var pass = [],
		fail = [];
	for (var i = 0; i < arr.length; i++) {
		var item = arr[i];
		if (fn(item)) pass.push(item);
		else fail.push(item);
	}
	return {pass: pass, fail: fail};
};

app.use(express.static(__dirname + '/public'));

app.get('/', function(req, res) {});


var papers = [],
	directories = [],
	papersLocation = 'c:\\users\\public\\new folder\\correct reference files\\Mendeley Desktop\\',
	bibtexLocation = 'c:\\users\\public\\new folder\\correct reference files\\My collection.bib',
	bibtexText = fs.readFileSync(bibtexLocation).toString(),
	bibtexEntries = BibtexParser(bibtexText).entries;

var files = fs.readdirSync(papersLocation),
	parts = _.split(files, function(file) {
					var fileLocation = papersLocation + file,
						stat = fs.statSync(fileLocation);
					
					return !stat.isDirectory();
				}),
	directories = parts.fail,
	papers = _.map(parts.pass, function(file) { 
		return {
			fileName: papersLocation + file,
			url: '/paper/' + file, 
			title: file
		}; 
	});

var fields = [],
	keywords = [];
_.each(bibtexEntries, function(entry) {
	var f = entry.Fields,
		kw = f.keywords;

	_.each(_.keys(f), function(key) { fields.push(key); });

	if (kw) {
		_.each(kw.split(','), function(word) {
			keywords.push(word.trim());
		});
	}
});
console.log(_.uniq(fields), _.uniq(keywords));

var parseFileName = function(name) {
	return name == null ? null : name.replace(/^\:/, '').replace(/\:\.?pdf$/, '');
};

_.each(papers, function(paper) {
	var paperFileName = path.basename(paper.fileName).toLowerCase().replace('\\', '/').trim();
	//console.log('searching for', paperFileName);
	var match = _.find(bibtexEntries, function(entry) { 
		var file = parseFileName(entry.Fields.file);
		if (file == null) return false;
		file = path.basename(file).toLowerCase().replace('\\', '/').trim();
		
		return file == paperFileName; 
	});
	if (match) {
		var fields = match.Fields,
			authors = _.map(fields.author.split(' and '), function(name) { return {name: name.trim()}; }),
			keywords = (fields.keywords || '').split(',');

		_.extend(paper, {
			bibtex: fields,
			title: fields.title,
			authors: authors,
			authorsString: _.pluck(authors, 'name').join(' and ').trim(),
			keywords: keywords,
			keywordsString: fields.keywords
		});
	}
});

app.get('/papers', function(req, res) {
	res.json({directories: directories, papers: papers});
});

app.get('/paper/:fileName', function(req, res) {
	var fileName = req.params.fileName;
	res.sendfile(papersLocation + fileName);
});

app.listen(port);
console.log('Listening on ' + port);

_.split = function(arr, fn) {
	var pass = [],
		fail = [];
	for (var i = 0; i < arr.length; i++) {
		var item = arr[i];
		if (fn(item)) pass.push(item);
		else fail.push(item);
	}
	return {pass: pass, fail: fail};
};