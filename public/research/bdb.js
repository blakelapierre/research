





// var db = {

// 	users: {
// 		1: {id: 1, name: 'Blake'},
// 		2: {id: 2, name: 'Kim'}
// 	}

// };


// db = {

// 	users: {
// 		1: {id: 1, name: 'Blake', email: 'blakelapierre@gmail.com', _db: {uid:previousObject: {id: 1, name: 'Blake'}}}
// 	}
// }


var createDB = function(name) {
	var db = {},
		collections = {},
		uid = 0,
		nextUid = function() { return ++uid; };

	var makeDBObject = function(obj, previousObject) {
		if (_.has(obj, '_db')) throw 'already DB object!';

		_.extend(obj, {
			_db: {
				uid: nextUid(),
				previousObject: previousObject
			}
		});
	};

	makeDBObject(db, null);

	var createCollection = function(name) {
		var collection = {},
			objects = {};

		return _.extend(collection, {
			objects: objects,
			insert: function(key, object) {
				if (key == null) throw new 'null key!';
				if (_.has(objects, key)) throw 'object with key ' + key + ' already exists!';

				objects[key] = makeDBObject(object, null);

				return object;
			},
			update: function(key, object) {
				if (key == null) throw new 'null key!';
				if (!_.has(objects, key)) throw 'invalid key!';

				var oldObject = collection[key];

				if (oldObject === object) throw new 'cannot update with same object!';

				makeDBObject(object, oldObject);

				collection[key] = object;

				return object;
			}
		});
	};

	return _.extend(db, {
		name: name,

		collections: collections,

		addCollection: function(name) {
			if (_.has(collections, name)) throw 'collection ' + name + ' exists!';

			var collection = createCollection(name);
			db.collections[name] = collection;
			return collection;
		}
	});
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
		
		return diff;
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
		return diff;
	}

	return next;
};

var db = createDB('db'),
	users = db.addCollection('users');

console.log(users);









var obj = {
	name: 'Blake',
	email: 'blakelapierre@gmail.com',

	_nextObj: null,
	_getNextObj: function() {}
};

