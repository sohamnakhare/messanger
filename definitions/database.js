var MC = require('mongodb').MongoClient;
var DB = null;

F.wait('database');

const connectionString = 'mongodb://'+
process.env.MONGODB_PORT_27017_TCP_ADDR + ':' + process.env.MONGODB_PORT_27017_TCP_PORT;

console.log('connectionString: ', connectionString);

MC.connect(connectionString, function (err, db) {
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
			var i = F.global.users.findIndex((userObj) => {
				return user.email === userObj.email
			});
			if (i != -1) {
				const oldUser = Object.assign({}, F.global.users[i]);
				F.global.users[i] = Object.assign({}, oldUser, user);
				F.global.refresh();
				return;
			}
			F.global.users.push(user);
			F.global.refresh && F.global.refresh();
			OPERATION('users.save', NOOP);
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
			F.global.refresh && F.global.refresh();
			OPERATION('users.save', NOOP);
		}
	});
}

F.database = function (collection) {
	return collection ? DB.collection(collection) : DB;
};
