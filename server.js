var fs = require('fs'),
	path = require('path'),
	express = require('express'),
	_ = require('underscore'),
	BibtexParser = require('./lib/BibtexParser.js'),
	makeDB = require('./public/research/db.js'),
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

app.use(express.bodyParser());
app.use(express.static(__dirname + '/public'));

app.get('/', function(req, res) {});

var papersLocation = 'c:\\users\\public\\new folder\\correct reference files\\Mendeley Desktop\\';

var loadPapers = function() {
	var papers = [],
		directories = [],
		bibtexLocation = 'c:\\users\\public\\new folder\\correct reference files\\My collection.bib',
		bibtexText = fs.readFileSync(bibtexLocation).toString(),
		bibtexEntries = BibtexParser(bibtexText).entries,
		nextID = 0;

	var files = fs.readdirSync(papersLocation),
		parts = _.split(files, function(file) {
						var fileLocation = papersLocation + file,
							stat = fs.statSync(fileLocation);
						
						return !stat.isDirectory();
					}),
		directories = parts.fail,
		papers = _.map(parts.pass, function(file) { 
			return {
				id: nextID++,
				fileName: file,
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
				doi: fields.doi,
				journal: fields.journal,
				issn: fields.issn,
				//authorsString: _.pluck(authors, 'name').join(' and ').trim(),
				keywords: keywords,
				//keywordsString: fields.keywords,
				canonicalURL: fields.url
			});

			delete fields.file;
			delete fields.title;
			delete fields.author;
			delete fields.doi;
			delete fields.journal;
			delete fields.issn;
			delete fields.keywords;
			delete fields.url;
		}
	});	

	return {
		papers: papers,
		directories: directories
	};
};

var saveDatabase = function(name, db) {
	fs.writeFileSync(name, JSON.stringify(db, null, '\t'));
};

var loadDatabase = function(name) {
	return JSON.parse(fs.readFileSync(name).toString())
};


var databaseName = 'db.json',
	db;
if (fs.existsSync(databaseName)) {
	db = loadDatabase(databaseName);
	papers = db.papers;
	directories = db.directories;
}
else {
	db = loadPapers();
	papers = db.papers;
	directories = db.directories;
	saveDatabase(databaseName, db);
}

var d = makeDB(db);

app.get('/papers', function(req, res) {
	res.json(papers);
});

app.get('/paper/:fileName', function(req, res) {
	var fileName = req.params.fileName;
	res.sendfile(papersLocation + fileName);
});

app.post('/papers/:id', function(req, res) {

	var id = req.params.id,
		data = req.body,
		//paper = _.find(papers, function(paper) { return paper.id == id; });
		paper = d.navigateTo('papers.' + id);

	//console.log('paper:', paper);
	//console.log(_.keys(data), _.keys(paper));
	//console.log('diff', getDifferences(paper, data));

	if (paper) {
		var diff = getDifferences(paper, data);

		var mods = {};
		var getModifications = function(diff, path) {
			for (var key in diff) {
				var value = diff[key],
					keyPath = path + '.' + key;
				if (_.isObject(value)) getModifications(value, keyPath);
				else mods[keyPath] = value;
			}
		};

		getModifications(diff, 'papers.' + id)
		console.log('mods:', mods);

		//console.log('diff:', diff);
		if (diff) d.processRequest({action: 'modify', modifications: mods});

		console.log(db.papers[id]);
		//console.log(d.history);
		//_.extend(paper, data);
		//saveDatabase(databaseName, db);
	}
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

var getDifferences = function(prev, next) {
	if (prev == null && next == null) return null;
	if (prev == undefined && next == undefined) return null;
	if (prev === next) return null;

	var prevIsArray = _.isArray(prev),
		nextIsArray = _.isArray(next);

	if (prevIsArray != nextIsArray) return next;

	if (prevIsArray) {
		if (prev.length != next.length) return next; // this isn't exactly the difference

		var diff = [];
		for (var i = 0; i < prev.length; i++) {
			var difference = getDifferences(prev[i], next[i]);
			if (difference) diff.push(difference);
		}

		for (i++;i < next.length; i++) {
			diff.push(next[i]);
		}
		
		return diff.length > 0 ? diff : null;
	}


	var prevIsObject = _.isObject(prev),
		nextIsObject = _.isObject(next);

	if (prevIsObject != nextIsObject) return next;

	if (prevIsObject) {
		var diff = {},
			prevKeys = _.keys(prev),
			nextKeys = _.keys(next),
			newKeys = _.difference(nextKeys, prevKeys),
			droppedKeys = _.difference(prevKeys, nextKeys),
			remainingKeys = _.difference(nextKeys, newKeys, droppedKeys);

		_.each(newKeys, function(key) {
			var value = getDifferences(prev[key], next[key]);
			if (value) diff[key] = value;
		});

		_.each(remainingKeys, function(key) {
			var value = getDifferences(prev[key], next[key]);
			if (value) diff[key] = value;
		});
		return !_.isEmpty(diff) ? diff : null;
	}

	return next;
};