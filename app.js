/**
 * Module dependencies.
 */

var express = require('express'),
  socket = require('./routes/socket.js')
  , User = require('./db/models.js').User
  , Message = require('./db/models.js').Message
  , Channel = require('./db/models.js').Channel
  , ogp = require("open-graph")
  , _ = require('lodash');

var async = require('async'),
  http = require('http'),
  bodyParser = require('body-parser'),
  methodOverride = require('method-override'),
  errorhandler = require('errorhandler');

var app = module.exports = express();
var server = http.Server(app);

// Hook Socket.io into Express
var io = require('socket.io')(server);

server.listen(3000, function () {
  console.log("Express server listening on port %d in %s mode", server.address().port, app.settings.env);
});

var allowCrossDomain = function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');

  // intercept OPTIONS method
  if ('OPTIONS' == req.method) {
    res.sendStatus(200);
  }
  else {
    next();
  }
};

app.use(allowCrossDomain);
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());
app.use(methodOverride());
app.use(express.static(__dirname + '/public'));
app.use(errorhandler({dumpExceptions: true, showStack: true}));


// Routes

app.get('/api/channels/:channelId/messages', function (req, res) {
  var sinceId = req.query.sinceId || 0;
  var beforeId = req.query.beforeId || 1 << 30;
  var limit = req.query.limit || beforeId - sinceId;

  Message.findAndCountAll({
    where: {channelId: req.params.channelId, id : { gt : sinceId, lt : beforeId }}, order: 'id DESC', limit: limit
  }).then(function (messages) {
    res.json(messages.rows.reverse());
  });
});


app.get('/api/channels', function (req, res) {
  var isPrivate = req.query.isPrivate === 'true';
  var userId = req.query.from;
  var URLChannelId = req.query.URLChannelId;
  if (URLChannelId === -1){
    res.sendStatus(404);
    return;
  }

  if (isPrivate) {
    var minId = userId > URLChannelId ? URLChannelId : userId;
    var maxId = userId > URLChannelId ? userId : URLChannelId;
    Channel.findOrCreate({where: {name: '' + minId + ':' + maxId, isPrivate: true}})
           .then(function (channels) {
              var channel = channels[0];
              User.findOrCreate({where:{id:minId, ChannelId: channel.dataValues.id}})
                  .then(function(){
                     User.findOrCreate({where:{id:maxId, ChannelId: channel.dataValues.id}})
                         .then(function(){
                          res.json(channel.dataValues);
                         });
                  });
             
              
            });
  } else {
    Channel.findOrCreate({where: {name: URLChannelId, isPrivate: false}})
           .then(function (channels) {
              var  channel= channels[0];
              User.findOrCreate({where:{id:userId, ChannelId: channel.dataValues.id}})
                  .then(function(){
                    res.json(channel.dataValues);
                  });
            });
  }
});



app.get('/api/urlMetadata', function (req, res) {
  ogp(req.query['url'], function (error, data) {
    if (error) {
      return;
    }
    res.send(data);
  });
});

app.get('*', function (req, res) {
  res.sendfile('index.html', {root: __dirname + '/public'});
});


// Socket.io Communication

io.on('connection', socket);

// Start server


