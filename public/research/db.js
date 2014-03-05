var require = require || function() {};

var _ = _ || require('underscore'),
	fs = typeof module == 'undefined' ? null : require('fs');

var makeDB = function() {
	var arg0 = arguments[0],
		database;

	if (fs && typeof arg0 == 'string') {
		database = JSON.parse(fs.readFileSync(arg0).toString());
	}
	else {
		database = {
			data: arg0
		};
	}

	database.history = database.history || [];
	database.map = database.map || {};

	var subscriptions = {};

	// untested!
	var walkDB = function(db, map, action, path) {
		if (db == null) return;

		action = action || function() {};
		path = path || '';

		if (_.isArray(db)) {
			for (var i = 0; i < db.length; i++) {
				var value = db[i],
					newPath = path + '[' + i + ']';

				action(key, value, newPath);
				walkDB(value, action, newPath);
			}
		}
		else if (_.isObject(db)) {
			for (var key in db) {
				var value = db[key],
					newPath = path + '.key';

				action(key, value, newPath);
				walkDB(value, action, newPath);
			}
		}

		return db;
	};

	var buildMap = function(db, action, path) {
		if (db == null) return;

		var map;

		action = action || function() {};
		path = path || '';

		if (_.isArray(db)) {
			map = {_version: 0, _type: 'array', _path: path, _map: []};
			for (var i = 0; i < db.length; i++) {
				var value = db[i],
					newPath = path + '[' + i + ']';

				action(key, value, newPath);
				var childMap = buildMap(value, action, newPath);
				if (childMap) {
					childMap._parent = map;
					map._map.push(childMap);
				}
			}
		}
		else if (_.isObject(db)) {
			map = {_version: 0, _path: path, _map: {}};
			for (var key in db) {
				if (key.indexOf('$') == 0) continue;

				var value = db[key],
					newPath = path.length > 0 ? path + '.' + key : key;

				action(key, value, newPath);
				var childMap = buildMap(value, action, newPath);
				if (childMap) {
					childMap._parent = map;
					map._map[key] = childMap;
				}
			}
		}

		return map;
	};

	var incrementVersion = function(map) {
		if (map == null) return;
		map._version++;
		incrementVersion(map._parent);
	};

	database.map = buildMap(database.data);
	//console.log('map', database.map);

	var processRequest = function(request) {
		//console.log('processing', request);
		var history = database.history,
			historyEntry = {
				id: history.length,
				time: new Date().getTime(),
				request: request,
				accepted: actionMap[request.action](request)
		};
		history.push(historyEntry);
		//if (database.map._map.papers /*&& database.map._map.papers._map.length > 0*/) console.log('map', database.map._map.papers._map);
		return historyEntry;
	};

	var actionMap = (function() {
		var removeFromList = function(list, query) {
			var idField = query.idField || 'id',
				id = query.id;

			for (var i = 0; i < list.length; i++) {
				var item = list[i];

				if (item[idField] === id) {
					list.splice(i, 1);
					i--;
				}
			}
		};

		var subscribableAction = function(actionFn) {
			return function(request) {
				var accepted = actionFn(request);
				if (accepted) notifySubscribers(request);
				return accepted;
			};
		};

		return {
			add: subscribableAction(function(request) {
				var result = navigateTo(request.path, database.data, database.map),
					map = result.map,
					obj = result.obj;
console.log(request.path, obj);				
				if (_.isArray(obj)) obj.push(request.data);
				else _.extend(obj, request.data);

				incrementVersion(map);

				return true;
			}),
			remove: subscribableAction(function(request) {
				var result = navigateTo(request.path, database.data, database.map),
					map = result.map,
					obj = result.obj;

				if (_.isArray(obj)) removeFromList(obj, query);
				else delete obj[request.key];

				incrementVersion(map);

				return true;
			}),
			modify: subscribableAction(function(request) {
				if (request.modifications) {
					for (var path in request.modifications) {
						setValue(path, request.modifications[path]);
					}
				}
				else {
					var result = navigateTo(request.path, database.data, database.map),
						map = result.map,
						obj = result.obj;
					_.extend(obj, request.data);

					incrementVersion(map);
				}

				return true;
			})
		};
	})();

	var navigateTo = function(path, db, map) {
		if (db == null) return null;
		if (path == null || path == '') return {obj: db, map: map};


		var parts = /^(\w*|\[(.+?)\])\.?(.*)$/.exec(path),
			name = parts ? parts[1] : null,
			index = parts ? parts[2] : null,
			rest = parts ? parts[3] : null;

		if (index) {
			if (rest) return navigateTo(rest, db[index], map._map[index]);
			else return {obj: db[index], map: map._map[index]};
		}
		if (name) {
			if (rest) return navigateTo(rest, db[name], map._map[name]);
			else return {obj: db[name], map: map._map[name]};
		}

		throw 'navigation error!' + path;
	};

	var navigateOrCreateTo = function(path, obj) {
		obj = obj || {};

		if (path == null || path == '') return obj;

		var parts = /^(\w*|\[(.+?)\])\.?(.*)$/.exec(path),
			index = parts ? parts[2] : null,
			name = parts ? parts[1] : index,
			rest = parts ? parts[3] : null;

		if (name) {
			var child = navigateOrCreateTo(rest, obj[name]);
			child.__parent = obj;
			obj[name] = child;
		}
		else throw 'look into this!';

		return obj;
	};

	var setValue = function(path, value) {
		var parts = /(\.|\[)(\w*)\]*$/.exec(path),
			name = parts ? parts[2] : null;

		if (name == null) throw 'look into this! (no name)';

		var stripAt = path.lastIndexOf(parts[0]),
			result = navigateTo(path.substring(0, stripAt), database.data, database.map),
			obj = result.obj,
			map = result.map;

		if (obj == null) throw 'look into this! (no obj)';

		obj[name] = value;

		incrementVersion(map);
	};

	var subscribeTo = function(path, callback) {
		var obj = navigateOrCreateTo(path, subscriptions);
		obj.__subscriptions = obj.__subscriptions || [];
		obj.__subscriptions.push(callback);
	};

	var notifySubscribers = function(request) {
		var obj = navigateOrCreateTo(request.path, subscriptions);

		var notify = function(obj) {
			if (obj == null || obj.__subscriptions == null) return;
			_.each(obj.__subscriptions, function(callback) {
				callback(request);
			});
			notify(obj.parent);
		};
		
		notify(obj);
	};

	var saveDatabase = function(name, db) {
		if (fs == null) throw 'you\'re in the browser! (!)';

		console.log('Saving database to', name, '...');
		fs.writeFileSync(name, JSON.stringify(self.data, function(key, value) {
			if (key === '_parent') return undefined;
			return value;
		}, '\t'));
		console.log('Database saved!');
	};


	var self = {
		data: database,
		processRequest: processRequest,
		subscribeTo: subscribeTo,
		subscriptions: subscriptions,
		navigateTo: function(path) { return navigateTo(path, database.data, database.map).obj; },
		saveDatabase: function(fileName) { return saveDatabase(fileName, self.data); }
	};

	return self;
};

var db = {users: {}};
var d = makeDB(db);

d.subscribeTo('users', function(change) {
	//console.log('change', change);
});

d.processRequest({action: 'add', path: 'users', data: {1: {id: 1, name: 'blake'}}});
d.processRequest({action: 'add', path: 'users', data: {2: {id: 2, name: 'kim'}}});
d.processRequest({action: 'add', path: 'users', data: {3: {id: 3, name: 'someone_else'}}});

d.processRequest({action: 'modify', path: 'users.1', data: {name: 'blakel'}});

d.processRequest({action: 'remove', path: 'users', id: 3});

d.processRequest({action: 'add', path: 'users.1', data: {tags:['male', 'adult', 'programmer']}});

//console.log(db.users);

var module = module || {};
if (module.exports) {
	module.exports = makeDB;
}