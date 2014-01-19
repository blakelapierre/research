var _ = require('underscore');

var makeDB = function(db) {
	var history = [],
		subscriptions = {};

	

	var processRequest = function(request) {
		var historyEntry = {
			id: history.length,
			time: new Date().getTime(),
			request: request,
			accepted: actionMap[request.action](request)
		};

		history.push(historyEntry);

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

		var subscribedAction = function(actionFn) {
			return function(request) {
				var accepted = actionFn(request);

				if (accepted) notifySubscribers(request);

				return accepted;
			};
		};

		return {
			add: subscribedAction(function(request) {
				var obj = navigateTo(db, request.path);
				
				if (_.isArray(obj)) obj.push(request.data);
				else _.extend(obj, request.data);

				return true;
			}),
			remove: subscribedAction(function(request) {
				var obj = navigateTo(db, request.path);

				if (_.isArray(obj)) removeFromList(obj, query);
				else delete obj[request.key];

				return true;
			}),
			modify: subscribedAction(function(request) {
				if (request.modifications) {
					for (var path in request.modifications) {
						setValue(path, request.modifications[path]);
					}
				}
				else {
					var obj = navigateTo(db, request.path);
					_.extend(obj, request.data);
				}

				return true;
			})
		};
	})();

	var navigateTo = function(db, path) {
		if (db == null) return null;
		if (path == null) return db;

		var parts = /^(\w*|\[(.+?)\])\.?(.*)$/.exec(path),
			name = parts ? parts[1] : null,
			index = parts ? parts[2] : null,
			rest = parts ? parts[3] : null;

		if (index) {
			if (rest) return navigateTo(db[index], rest);
			else return navigateTo(db[index]);
		}
		if (name) {
			if (rest) return navigateTo(db[name], rest);
			else return navigateTo(db[name]);
		}

		throw 'navigation error!';
	};

	var navigateOrCreateTo = function(obj, path) {
		obj = obj || {};

		if (path == null || path == '') return obj;

		var parts = /^(\w*|\[(.+?)\])\.?(.*)$/.exec(path),
			index = parts ? parts[2] : null,
			name = parts ? parts[1] : index,
			rest = parts ? parts[3] : null;

		if (name) {
			var child = navigateOrCreateTo(obj[name], rest);
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
			obj = navigateTo(db, path.substring(0, stripAt));

		if (obj == null) throw 'look into this! (no obj)';

		obj[name] = value;
	};

	var subscribeTo = function(path, callback) {
		var obj = navigateOrCreateTo(subscriptions, path);
		obj.__subscriptions = obj.__subscriptions || [];
		obj.__subscriptions.push(callback);
	};

	var notifySubscribers = function(request) {
		var obj = navigateOrCreateTo(subscriptions, request.path);

		var notify = function(obj) {
			if (obj == null || obj.__subscriptions == null) return;
			_.each(obj.__subscriptions, function(callback) {
				callback(request);
			});
			notify(obj.parent);
		};
		notify(obj);
	};

	return {
		db: db,
		processRequest: processRequest,
		subscribeTo: subscribeTo,
		history: history,
		subscriptions: subscriptions,
		navigateTo: function(path) { return navigateTo(db, path); }
	};
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


module.exports = makeDB;