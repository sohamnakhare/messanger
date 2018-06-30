NEWSCHEMA('User').make(function (schema) {

	schema.define('id', 'UID');
	schema.define('name', 'String(50)', true);
	schema.define('email', 'Email', true);
	schema.define('password', 'String(30)');
	schema.define('status', 'String(50)');
	schema.define('position', 'String(30)', true);
	schema.define('department', 'String(30)', true);
	schema.define('picture', 'String');
	schema.define('channels', 'Object');
	schema.define('blocked', Boolean);
	schema.define('notifications', Boolean);
	schema.define('sa', Boolean);

	schema.setSave(function (error, model, options, callback, controller) {
		if (!controller.user.sa) {
			error.push('error-user-privileges');
			return callback();
		}

		var tmp;
		var isNewUser = false;
		if (model.id) {
			tmp = F.global.users.findItem('id', model.id);
			tmp.name = model.name;
			tmp.email = model.email;
			tmp.position = model.position;
			tmp.department = model.department;
			tmp.picture = model.picture;
			tmp.blocked = model.blocked;
			var linker = model.name.slug(); // beacause of unicodes (e.g. Chinese chars)
			linker && (tmp.linker = linker);
			// tmp.linker = model.email;
			tmp.channels = model.channels;
			tmp.status = model.status;
			tmp.notifications = model.notifications;
			model.password && !model.password.startsWith('****') && (tmp.password = model.password.sha1());
			tmp.channels && F.global.channels.forEach(n => tmp.unread[n.id] && (delete tmp.unread[n.id]));
			tmp.sa = model.sa;
		} else {
			tmp = model.$clean();
			tmp.id = UID();
			tmp.password = model.password.sha1();
			tmp.datecreated = F.datetime;
			tmp.unread = {};
			tmp.recent = {};
			tmp.lastmessages = {};
			tmp.online = false;
			tmp.linker = model.name.slug();
			// tmp.linker = tmp.email;
			tmp.sa = model.sa;
			tmp.theme = 'dark';
			isNewUser = true;
			// F.global.users.push(tmp);
		}

		// !tmp.linker && (tmp.linker = U.GUID(10));
		// var index = F.global.users.findIndex(n => n.id !== tmp.id && n.linker === tmp.linker);
		// index !== -1 && (tmp.linker += U.GUID(3));

		var users = DATABASE('users');
		if (isNewUser) {
			users.insertOne(tmp, (err, results) => {
				if (err) {
					return callback(err);
				}
				// F.global.users.push(tmp);
				F.global.users.quicksort('name');
				F.global.refresh && F.global.refresh();
				OPERATION('users.save', NOOP);
				callback(SUCCESS(true));
			});
			return;
		}
		users.update({ email: tmp.email }, { "$set": tmp }, (err, results) => {
			if (err) {
				console.log('error');
				return callback(SUCCESS(true));
			}

			F.global.users.quicksort('name');
			F.global.refresh && F.global.refresh();
			OPERATION('users.save', NOOP);
			callback(SUCCESS(true));
		});
	});

	schema.setGet(function (error, model, options, callback, controller) {

		if (!controller.user.sa) {
			error.push('error-user-privileges');
			return callback();
		}

		var item = F.global.users.findItem('id', controller.id);
		!item && error.push('error-user-404');
		callback(item);
	});

	schema.setRemove(function (error, options, callback, controller) {

		if (!controller.user.sa) {
			error.push('error-user-privileges');
			return callback();
		}

		F.global.users = F.global.users.remove('id', controller.id);
		F.global.refresh && F.global.refresh();
		OPERATION('users.save', NOOP);
		callback(SUCCESS(true));
	});

});

exports.UserModel = function (id = '', name = '', email = '', roles = [], status = '',
	position = 'Digital Nomad', department = 'Digital Nomad', channels = null, blocked = false, notifications = true,
	sa = false, linker, picture = 'face', mobile = false, theme = 'dark') {
	this.id = id;
	this.name = name;
	this.email = email;
	this.roles = roles;
	this.status = status;
	this.position = position;
	this.department = department;
	this.picture = picture;
	this.channels = channels;
	this.blocked = blocked;
	this.notifications = notifications;
	this.sa = sa;
	this.linker = name.slug();
	this.mobile = mobile;
	this.unread = {};
	this.recent = {};
	this.lastmessages = {},
		this.blacklist = {};
	this.online = false;
	this.picture = picture;
	this.theme = theme;
};

exports.getUser = function (email, callback) {
	var users = DATABASE('users');
	users.find({ email: email }).toArray(function (err, docs) {
		if (err) {
			return callback(err);
		}

		return callback(null, docs);
	});
}
