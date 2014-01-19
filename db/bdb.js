





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

	return _.extend(db, {
		name: name,

		collections: collections,

		addCollection: function(name) {
			if (_.has(collections, name)) throw 'collection ' + name + ' exists!';

			var collection = {};
			db.collections[name] = collection;
			return collection;
		}
	});
};

var db = createDB('db'),
	users = db.addCollection('users');

console.log(users);









var obj = {
	name: 'Blake',
	email: 'blakelapierre@gmail.com',

	_nextObj: null,
	_getNextObj: function()
};

