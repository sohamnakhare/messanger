const OAUTH_CLIENTID = '178466460871-h7rd1j9fqi3kj31v2uu2964ve6341d00.apps.googleusercontent.com';
const OAUTH_CLIENT_SECRET = 'QgBE4Uplms4-zOGVLh1vMKDi';

exports.install = function() { 
    F.route('/login/google/', oauth_login, ['unauthorize']);
    F.route('/login/google/callback/', oauth_login_callback, ['unauthorize']);
};

function oauth_login() {
    var self = this;
    var type = self.req.path[1];

    self.host(F.config.base_path_assets+
        '/login/google/callback/')

    MODULE('oauth2').redirect(type, OAUTH_CLIENTID,
        self.host('/messenger/login/google/callback/'), self);
}

function oauth_login_callback() {
    var self = this;
    var type = self.req.path[1];
    var url = self.host('/messenger/login/' + type + '/callback/');

    MODULE('oauth2').callback(type, OAUTH_CLIENTID, OAUTH_CLIENT_SECRET, url, self,
        function(err, profile, access_token) {
            var email = profile.emails[0].value;
            OPERATION('admin.notify', { type: 'admin.login', message: email});
            setCookies(profile, email, self);
    });
}

function registerUser(profile, callback){
    const name = (profile.name.givenName || '') + ' ' + (profile.name.familyName || '');
    const email = profile.emails[0].value;
    const User = MODEL('users').UserModel;
    const user = new User(UID(), name, email, ['Profile']);
    user.picture = profile.image.url;
    var users = DATABASE('users');
    users.insertOne(user, (err, results)=>{
        if(err) {
            return callback(err);
        }
        return callback(null, user);
    });
}

function setCookies(profile, email, controller) {
    var users = DATABASE('users');
    users.find({email: email}).toArray(function(err, docs) {
        var user = docs[0];
        if(!user) {
            registerUser(profile, (err, newUser)=>{
                if(err) {
                    controller.redirect('/settings/');
                    return;
                }
                setGlobalCookie(newUser, controller);
                setAllUsersGlobally(function(){
                    controller.redirect('/settings/');
                });
            });
            return;
        }

        setGlobalCookie(user, controller);
        setAllUsersGlobally(function(){
            controller.redirect('/admin/');
        });
    });
}

function setGlobalCookie(user, controller) {
    const User = MODEL('users').UserModel;
    user = Object.assign({}, new User(), user);
    var globalCookie = F.encrypt( JSON.stringify(user) + '|' + controller.ip + '|' + F.datetime.getTime());
    controller.cookie(CONFIG('global-cookie'), globalCookie, '1 month');
   // controller.cookie(CONFIG('cookie'), globalCookie, '1 month'); 
}

function setAllUsersGlobally(next) {
    var users = DATABASE('users');
    users.find().toArray(function(err, docs){
        if(err) {
            F.global.users = [];
            return next();    
        }
        F.global.users = docs;
        return next();
    });
}
