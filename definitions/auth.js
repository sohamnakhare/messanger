const SESSION = {};

F.onAuthorize = function (req, res, flags, next) {
	var cookie = req.cookie(F.config.cookie) || req.cookie(CONFIG('global-cookie'));
	if (!cookie)
		return next(false);

	var id = F.decrypt(cookie, false);
	id && (id = id.substring(0, id.indexOf('|')));
	if (!id)
		return next(false);
	var userInCookie = JSON.parse(id);

	MODEL('users').getUser(userInCookie.email, (err, docs) => {
		var users = DATABASE('users');
		users.find().toArray(function (error, allusers) {
			if (error) {
				F.global.users = [];
			} else {
				F.global.users = F.global.users.length > 0 ? F.global.users : allusers;
			}

			var user = docs[0];
			if (!user) {
				next(false);
				return;
			}
			
			user = F.global.users.find(item => item.email === user.email);

			var id = user.id;
			SESSION[id] = user;
			if (SESSION[id] && !SESSION[id].blocked) {
				SESSION[id].ticks = F.datetime;
				return next(true, SESSION[id]);
			}

			if (user && !user.blocked) {
				user.ticks = F.datetime;
				user.datelogged = F.datetime;
				OPERATION('users.save', NOOP);
				SESSION[id] = user;
				next(true, user);
			} else
				next(false);
		});
	});
};

F.on('service', function (counter) {
	if (counter % 5 !== 0)
		return;
	var ticks = F.datetime.add('-10 mintes');
	Object.keys(SESSION).forEach(function (key) {
		if (SESSION[key].ticks < ticks)
			delete SESSION[key];
	});
});