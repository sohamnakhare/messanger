const OAUTH_CLIENTID = '178466460871-h7rd1j9fqi3kj31v2uu2964ve6341d00.apps.googleusercontent.com';
const OAUTH_CLIENT_SECRET = 'QgBE4Uplms4-zOGVLh1vMKDi';

const FACEBOOK_APPID = '381736985661759';
const FACEBOOK_SECRET = 'af02a082d64ac33476fb16f7f1c93c77';

const COVERTFOX_ACCESS_TOKEN = "sKCXx2Oh7Q2QSgkP4quhFB490GpGn+vaJGVhZLCODr3vi02sjpksoBUKNYSBF1t0Es4=";

const axios = require('axios');

exports.install = function () {
    F.route('/login/google/', oauth_login, ['unauthorize']);
    F.route('/login/google/callback/', oauth_login_callback, ['unauthorize']);
    F.route('/login/facebook/', oauth_login_facebook, ['unauthorize']);
    F.route('/login/facebook/callback/', oauth_login_facebook_callback, ['unauthorize']);
};

function oauth_login() {
    var self = this;
    var type = self.req.path[1];

    self.host(F.config.base_path_assets +
        '/login/google/callback/')

    MODULE('oauth2').redirect(type, OAUTH_CLIENTID,
        self.host('/messenger/login/google/callback/'), self);
}

function oauth_login_callback() {
    var self = this;
    var type = self.req.path[1];
    var url = self.host('/messenger/login/' + type + '/callback/');

    MODULE('oauth2').callback(type, OAUTH_CLIENTID, OAUTH_CLIENT_SECRET, url, self,
        function (err, profile, access_token) {
            var email = profile.emails[0].value;
            OPERATION('admin.notify', { type: 'admin.login', message: email });
            setCookies(profile, email, 'google', self);
        });
}

function oauth_login_facebook() {
    var self = this;
    var type = self.req.path[1];

    MODULE('oauth2').redirect(type, FACEBOOK_APPID,
        self.host('/messenger/login/facebook/callback/').replace('http', 'https'), self);
} 

function oauth_login_facebook_callback() {
    var self = this;
    var type = self.req.path[1];
    var url = self.host('/messenger/login/' + type + '/callback/').replace('http', 'https');

    MODULE('oauth2').callback(type, FACEBOOK_APPID, FACEBOOK_SECRET, url, self,
        function (err, profile, access_token) {
            var email = profile.email;
            OPERATION('admin.notify', { type: 'admin.login', message: email });
            setCookies(profile, email, 'facebook', self);
        });
}

function registerUser(profile, type, callback) {

    var user = ((authType) => {
        switch (authType) {
            case 'facebook':
                return getUserFacebook(profile);
            case 'google':
                return getUserGoogle(profile);
        }
    })(type);

    var users = DATABASE('users');
    users.insertOne(user, (err, results) => {
        if (err) {
            return callback(err);
        }
        registerInCovertFox(user);
        return callback(null, user);

    });
}

function registerInCovertFox(user) {
    var users = DATABASE('users');
    users.find({email: user.email}).toArray(function(err, docs) {
        if(err) {
            return;
        }

        const userFromDB = docs[0];
        const payload = {
            email: userFromDB.email,
            user_id: userFromDB._id,
            name: userFromDB.name
        };
        axios.post("https://api.convertfox.com/users", payload, {
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${COVERTFOX_ACCESS_TOKEN}`
            }
        }).then(()=>{
            console.log('user registered in covert fox');
        }, (err)=>{
            console.log('user registration failed in covert fox: ', err);
        })
    });
    
}

function getUserFacebook(profile) {
    const name = profile.name;
    const email = profile.email;
    const User = MODEL('users').UserModel;
    const user = new User(UID(), name, email, ['Profile']);
    user.picture = profile.picture.data.url;
    return user;
}

function getUserGoogle(profile) {
    const name = (profile.name.givenName || '') + ' ' + (profile.name.familyName || '');
    const email = profile.emails[0].value;
    const User = MODEL('users').UserModel;
    const user = new User(UID(), name, email, ['Profile']);
    user.picture = profile.image.url;
    return user;
}

function setCookies(profile, email, type, controller) {
    var users = DATABASE('users');
    users.find({ email: email }).toArray(function (err, docs) {
        var user = docs[0];
        if (!user) {
            registerUser(profile, type, (err, newUser) => {
                if (err) {
                    controller.redirect('/messenger/');
                    return;
                }
                setGlobalCookie(newUser, controller);
                setAllUsersGlobally(function () {
                    controller.redirect('/messenger/');
                });
            });
            return;
        }

        setGlobalCookie(user, controller);
        setAllUsersGlobally(function () {
            controller.redirect('/messenger/');
        });
    });
}

function setGlobalCookie(user, controller) {
    const User = MODEL('users').UserModel;
    user = Object.assign({}, new User(), user);
    var globalCookie = F.encrypt(JSON.stringify(user) + '|' + F.datetime.getTime());
    controller.cookie(CONFIG('global-cookie'), globalCookie, '1 month');
    // controller.cookie(CONFIG('cookie'), globalCookie, '1 month'); 
}

function setAllUsersGlobally(next) {
    var users = DATABASE('users');
    users.find().toArray(function (err, docs) {
        if (err) {
            F.global.users = [];
            return next();
        }
        F.global.users = docs;
        return next();
    });
}
