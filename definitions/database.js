var MC = require('mongodb').MongoClient;
var DB = null;

F.wait('database');

MC.connect(CONFIG('database'), function(err, db) {
	if (err)
		throw err;
    console.log('connecting');
    DB = db.db('cms');
	F.wait('database');
});

F.database = function(collection) {
	return collection ? DB.collection(collection) : DB;
};