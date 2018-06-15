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
		if(change.operationType === 'insert') {
			const user = change.fullDocument;
			F.global.users.push(user);
		}
	});
}

F.database = function (collection) {
	return collection ? DB.collection(collection) : DB;
};