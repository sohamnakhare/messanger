NEWSCHEMA('Account').make(function(schema) {

	schema.define('name', 'String(50)', true);
	schema.define('email', 'Email', true);
	schema.define('picture', 'String');
	schema.define('notifications', Boolean);
	schema.define('citizenship', 'String(30)');
	schema.define('currentJob', 'String(30)');
	schema.define('currentLocation', 'String(30)');
	schema.define('lookingFor', 'String(30)');
	schema.define('education', 'String(30)');
	schema.define('age', 'String(30)');

	schema.setSave(function(error, model, options, callback, controller) {
		var users = DATABASE('users');
		users.find({email: controller.user.email}).toArray(function(err, docs) {
			if(err) {
				return callback(SUCCESS(true));
			}
			var user = docs[0];
			if (user) {
				var notify = user.name !== model.name || user.picture !== model.picture && user.status !== model.status;
				user.name = model.name;
				user.email = model.email;
				user.picture = model.picture;
				user.notifications = model.notifications;
				user.citizenship = model.citizenship;
				user.currentJob = model.currentJob;
				user.currentLocation = model.currentLocation;
				user.lookingFor = model.lookingFor;
				user.education = model.education;
				user.age = model.age;

				users.update({email: controller.user.email}, user, (err, results)=>{
					if(err) {
						return callback(SUCCESS(true));
					}
					OPERATION('users.save', NOOP);
					F.global.refresh();
					return callback(SUCCESS(true));
				});
				return;
			}
		});
	});

});