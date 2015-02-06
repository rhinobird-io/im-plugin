/**
 * Module dependencies.
 */

var express = require('express')
  , http = require('http')
  , bodyParser = require('body-parser')
  , methodOverride = require('method-override')
  , errorhandler = require('errorhandler')
  , socket = require('./routes/socket.js');

var app = module.exports = express();
var routes = require('./routes.js');

app.use(require('./middleware/crossDomain.js'));
app.use(require('./middleware/userIdExtractor.js'));
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());
app.use(methodOverride());
app.use(express.static(__dirname + '/public'));

// Routes
routes(app);


// Hook Socket.io into Express
var server = http.Server(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 3000;
var env = process.env.NODE_ENV || 'development';
if ('development' == env) {
  app.use(errorhandler({dumpExceptions: true, showStack: true}));
}

if ('production' == env) {
  app.use(errorhandler());
}
server.listen(port, function () {
  console.log("Express server listening on port %d in %s mode", server.address().port, app.settings.env);
});

// Socket.io Communication
io.on('connection', socket);

