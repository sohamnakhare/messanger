var MC = require('mongodb').MongoClient;
var DB = null;

F.wait('database');

MC.connect(CONFIG('database'), function (err, db) {
	if (err)
		throw err;
	console.log('mongo connected');
	DB = db.db('cms');
	watchCollections(DB);
	F.wait('database');
});

function watchCollections(db) {
	const collection = db.collection('users')
	const changeStream = collection.watch({ fullDocument: 'updateLookup' });
	changeStream.on('change', function (change) {
		if (change.operationType === 'insert') {
			const user = change.fullDocument;
			F.global.users.push(user);
		}

		if (change.operationType === 'update') {
			const user = change.fullDocument;
			var i = F.global.users.findIndex((userObj) => {
				return user.email === userObj.email
			});
			if (i != -1) {
				const oldUser = Object.assign({}, F.global.users[i]);
				F.global.users[i] = Object.assign({}, oldUser, user);
			}
		}
	});
}

F.database = function (collection) {
	return collection ? DB.collection(collection) : DB;
};