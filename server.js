var fs = require('fs'),
	path = require('path'),
	express = require('express'),
	_ = require('underscore'),
	BibtexParser = require('./lib/BibtexParser.js'),
	papersDB = require('./papersDB.js'),
	restler = require('restler'),
	streamifier = require('streamifier'),
	//searchIndex = new requestJSON.JsonClient("http://localhost:3000"),
	//readPDFs = require('./readPDFs.js'),
    app = express(),
	port = 3007;


var databaseName = 'db.json',
	papersLocation = '[--REDACTED--]',
	bibtexLocation = '[--REDACTED--]',
	db = papersDB(databaseName, papersLocation, bibtexLocation);

// db.data.history = [];
// db.saveDatabase(databaseName);

console.log('db', db);


var nextIndex = 0;
var indexNextPaper = function() {
	var papersIndex = db.navigateTo('papersIndex');

	if (nextIndex > papersIndex.length) return;

	var	index = papersIndex[nextIndex++];
	if (index) {
		console.log('Adding', index.id, index.title, 'to index');
		index.name = 'test';
		var data = {};
		//data['paper-' + index.id] = { title: index.title, text: index.text };

		_.each(papersIndex, function(i) { 
			data['paper-' + i.id] = { title: i.title, text: i.text };
		});

		fs.writeFileSync('./paperText.json', JSON.stringify(data));
		var stat = fs.statSync('./paperText.json');
		restler.post('http://localhost:3000/indexer', {
			multipart: true,
			data: {
				'document': restler.file('./paperText.json', null, stat.size, null, 'text/json')
			}
		}).on('complete', function(data) {
			console.log('response', data);
			setTimeout(indexNextPaper, 100);
		});
	}
};
//setTimeout(indexNextPaper, 100);


app.use(express.bodyParser());
app.use(express.static(__dirname + '/public'));
app.use(express.logger());

app.get('/readJob', function(req, res) {
	console.log('readJob');
	var papersIndex = db.navigateTo('papersIndex');
	for (var i = 0; i < papersIndex.length; i++) {
		var paperIndex = papersIndex[i];
		if (paperIndex.id != null && (paperIndex.text == null || paperIndex.text == undefined)) {
			var paper = db.navigateTo('papers.' + paperIndex.id);
			res.json({
				id: paperIndex.id,
				path: paper.url
			});
			return;
		}
	}
	res.send(404);
});

app.put('/submitJob', function(req, res) {
	console.log('submitJob');
	var paper = db.navigateTo('papers.' + req.body.id);
	db.processRequest({action: 'modify', path: 'papersIndex.' + paper.id, data: {text: req.body.text}});
	res.end();
});

app.get('/papers', function(req, res) {
	console.log('*****papers*****');
	res.json(db.navigateTo('papers'));
});

app.get('/papers/search/:term', function(req, res) {
	console.log('*******search********', req.params.term);

	var lunrResults = lunrIndex.search(req.params.term),
		papers = db.navigateTo('papers'),
		results = _.map(lunrResults, function(result) {
			var paper = papers[parseInt(result.ref)];
			return {
				id: paper.id,
				score: result.score,
				title: paper.title
			};
		});
	res.json(results);
});

app.get('/paper/:fileName', function(req, res) {
	var fileName = req.params.fileName;
	console.log(req.url);

	if (req.query.base64 === 'true') {
		fs.readFile(papersLocation + fileName, {encoding: 'base64'}, function(err, pdf) {
			res.type('application/pdf');
			res.send(pdf);
		});
	}
	else res.sendfile(papersLocation + fileName);
});

app.post('/papers/:id', function(req, res) {
	var id = req.params.id,
		data = req.body,
		paper = db.navigateTo('papers.' + id);
console.log('paper', paper);
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

		getModifications(diff, 'papers.' + id);

		if (diff) db.processRequest({action: 'modify', modifications: mods});
	}

	res.end();
});

app.get('/savePapers/:really', function(req, res) {
	if (req.params.really) db.saveDatabase(databaseName);

	res.json({success: true});
});

var io = require('socket.io').listen(app.listen(port));
io.set('log level', 0);

io.sockets.on('connection', function(socket) {
	socket.on('listenTo', function(data) {
		// validate incoming data? !!
		console.log('client subscribing to:', data.path);
		db.subscribeTo(data.path, function(update) {
			// should/can we use socket.io 'rooms'?
			socket.emit('update', update);
		});
	});

	socket.emit('hello');
});

console.log('Listening on ' + port);


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