var express = require('express')
  , passport = require('passport')
  , LinkedinStrategy = require('./lib').Strategy;
var levelup = require('levelup')
var leveldown = require('leveldown')
var DATABASE = levelup(leveldown('./tokenDatabase'))

// API Access link for creating client ID and secret:
// https://www.linkedin.com/secure/developer
var LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID;
var LINKEDIN_CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET;
var CALLBACK_URL = process.env.CALLBACK_URL || 'https://oauth.abndigital.com.ar/auth/linkedin/callback';
var ROBOTS_TRABAJANDO_PARA_TI = "https://abndigital.com.ar/en/auth-linkedin/"
var PORT = process.env.PORT || 8080;
var REQUESTED_LINKEDIN_SCOPES = ['r_ads_reporting','r_basicprofile','r_organization_social','rw_ads','rw_organization_admin']
var TEST_REQUESTED_LINKEDIN_SCOPES = ['r_ads_reporting','r_basicprofile','r_organization_social','rw_ads']

// Passport session setup.
//   To support persistent login sessions, Passport needs to be able to
//   serialize users into and deserialize users out of the session.  Typically,
//   this will be as simple as storing the user ID when serializing, and finding
//   the user by ID when deserializing.  However, since this example does not
//   have a database of user records, the complete Linkedin profile is
//   serialized and deserialized.
passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});


// Use the LinkedinStrategy within Passport.
//   Strategies in Passport require a `verify` function, which accept
//   credentials (in this case, an accessToken, refreshToken, and Linkedin
//   profile), and invoke a callback with a user object.
passport.use(new LinkedinStrategy({
    clientID:     LINKEDIN_CLIENT_ID,
    clientSecret: LINKEDIN_CLIENT_SECRET,
    callbackURL:  CALLBACK_URL,
    scope: REQUESTED_LINKEDIN_SCOPES,
    passReqToCallback: true,
    state:true
  },
  function(req, accessToken, refreshToken, profile, done) {
    // asynchronous verification, for effect...
    req.session.accessToken = accessToken;
    process.nextTick(function () {
      // To keep the example simple, the user's Linkedin profile is returned to
      // represent the logged-in user.  In a typical application, you would want
      // to associate the Linkedin account with a user record in your database,
      // and return that user instead.
      return done(null, profile);
    });
  }
));




var app = express();

// configure Express
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(express.logger());
app.use(express.cookieParser());
app.use(express.urlencoded());
app.use(express.json());
app.use(express.session({ secret: 'HcEFx4rbDFBXHM9P' }));
// Initialize Passport!  Also use passport.session() middleware, to support
// persistent login sessions (recommended).
app.use(passport.initialize());
app.use(passport.session());
app.use(app.router);
app.use(express.static(__dirname + '/public'));


app.get('/', function(req, res){
  console.log("Llega aca la request")
  res.render('index', { user: req.user });
});

app.get('/account', ensureAuthenticated, function(req, res){
  res.render('account', { user: req.user });
});

// GET /auth/linkedin
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  The first step in Linkedin authentication will involve
//   redirecting the user to linkedin.com.  After authorization, Linkedin
//   will redirect the user back to this application at /auth/linkedin/callback
app.get('/auth/linkedin',
  passport.authenticate('linkedin'),
  function(req, res){
    // The request will be redirected to Linkedin for authentication, so this
    // function will not be called.
  });

// GET /auth/linkedin/callback
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  If authentication fails, the user will be redirected back to the
//   login page.  Otherwise, the primary route function function will be called,
//   which, in this example, will redirect the user to the home page.
app.get('/auth/linkedin/callback',
  passport.authenticate('linkedin', { failureRedirect: '/login' }),
  function(req, res) {
    console.log("Saving token to database and redirecting user to landing page")
    DATABASE.put(req.user.id, JSON.stringify({
      "linkedInId": req.user.id,
      "displayName": req.user.displayName,
      "token": req.session.accessToken
    }))
    res.redirect(ROBOTS_TRABAJANDO_PARA_TI);
  });

app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});

var http = require('http');

http.createServer(app).listen(PORT, () => {
  console.log(`Server listening on port ${PORT}...`);
});


// Simple route middleware to ensure user is authenticated.
//   Use this route middleware on any resource that needs to be protected.  If
//   the request is authenticated (typically via a persistent login session),
//   the request will proceed.  Otherwise, the user will be redirected to the
//   login page.
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/login');
}
