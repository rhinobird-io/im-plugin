/**
 * Module dependencies.
 */

var express = require('express'),
  socket = require('./routes/socket.js')
  , Sequelize = require('./db/models.js').Sequelize
  , PrivateChannelsUsers = require('./db/models.js').PrivateChannelsUsers
  , Message = require('./db/models.js').Message
  , PrivateChannel = require('./db/models.js').PrivateChannel
  , UsersChannelsMessages = require('./db/models.js').UsersChannelsMessages
  , ogp = require("open-graph")
  , _ = require('lodash')
  , async = require('async')
  , http = require('http')
  , bodyParser = require('body-parser')
  , methodOverride = require('method-override')
  , errorhandler = require('errorhandler');

var app = module.exports = express();
var server = http.Server(app);

// Hook Socket.io into Express
var io = require('socket.io')(server);

var port = process.env.PORT || 3000;
var env = process.env.NODE_ENV || 'development';

server.listen(port, function () {
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


if ('development' == env) {
  app.use(allowCrossDomain);
  app.use(bodyParser.urlencoded({
    extended: true
  }));
  app.use(bodyParser.json());
  app.use(methodOverride());
  app.use(express.static(__dirname + '/public'));
  app.use(errorhandler({dumpExceptions: true, showStack: true}));
}

if ('production' == env) {
  app.use(allowCrossDomain);
  app.use(bodyParser.urlencoded({
    extended: true
  }));
  app.use(bodyParser.json());
  app.use(methodOverride());
  app.use(express.static(__dirname + '/public'));
  app.use(errorhandler());
}





// Routes

app.get('/api/channels/:channelId/messages', function (req, res) {
  var sinceId = req.query.sinceId || 0;
  var beforeId = req.query.beforeId || 1 << 30;
  var limit = req.query.limit || beforeId - sinceId;

  Message.findAndCountAll({
    where: {channelId: req.params.channelId, id: {gt: sinceId, lt: beforeId}}, order: 'id DESC', limit: limit
  }).then(function (messages) {
    res.json(messages.rows.reverse());
  });
});


app.get('/api/channels', function (req, res) {
  var userId = req.headers['x-user'];
  var channelName = req.query.name;
  if (channelName) {
    PrivateChannel.findAll( { where : {name : channelName}}).then(function(privateChannel) {
      res.json(privateChannel);
    });
  } else {
    PrivateChannelsUsers.findAll({where: {userId: userId}}).then(function (privateChannelsUsers) {
      PrivateChannel.findAll({where: {id: _.pluck(privateChannelsUsers, 'privateChannelId')}}).then(function (channels) {
        res.json(channels);
      })
    });
  }
});

app.get('/api/channels/:channelId/users', function (req, res) {
  var userId = req.headers['x-user'];
  var channelId = req.params.channelId;

  PrivateChannelsUsers.findAll({where: {privateChannelId: channelId}}).then(function (privateChannelsUsers) {
    res.json(privateChannelsUsers);
  });
});

app.post('/api/channels', function (req, res) {
  var ownerUserId = req.headers['x-user'];
  var name = req.body.name;
  var users = req.body.users;
  var id = req.body.id;

  Sequelize.transaction(function(t){
    return PrivateChannel.create({
      id: id,
      name: name,
      ownerUserId: ownerUserId
    }, {transaction : t}).then(function(channel) {
      var temp = [];
      users.forEach(function (userId) {
        temp.push({
          userId: userId,
          privateChannelId: channel.id
        })
      });
      return PrivateChannelsUsers.bulkCreate(temp, {transaction : t});
    });
  }).then(function(result) {
    PrivateChannel.find(id).then(function(channel){
      res.json(channel);
    })
  }).catch(function(err) {
    res.sendStatus(500);
  });
});

app.delete('/api/channels/:channelId', function (req, res) {
  var userId = req.headers['x-user'];
  var channelId = req.params.channelId;
  PrivateChannelsUsers.destroy( { where : {userId : userId, privateChannelId: channelId}}).then(function(result){
    res.sendStatus(200);
  });

});

app.post('/api/messages/latest', function (req, res) {
  var userId = req.headers['x-user'];
  var channelIds = req.body.channelIds;
  Message.findAll({ attributes: ['channelId', [Sequelize.fn('max', Sequelize.col('id')), 'messageId']] ,group : '"channelId"', where : { 'channelId' : channelIds }}).then(function (messages) {
    res.json(messages);
  });
});

app.get('/api/channels/:channelId/lastSeenMessageId', function (req, res){
  var channelId = req.params.channelId;
  var userId = req.headers['x-user'];
  UsersChannelsMessages.findOne({where: {channelId: ''+ channelId, userId : userId}})
    .then(function (usersChannelsMessages){
      res.json(usersChannelsMessages);
    });
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


