/**
 * Module dependencies.
 */

var express = require('express'),
  socket = require('./routes/socket.js')
  , Sequelize = require('./db/models.js').Sequelize
  , PrivateChannelUsers = require('./db/models.js').PrivateChannelUsers
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

app.post('/api/messages/latest', function (req, res) {
  var userId = req.headers.user;
  var channelIds = req.body.channelIds;
  Message.findAll({ attributes: ['channelId', [Sequelize.fn('max', Sequelize.col('id')), 'messageId']] ,group : '"channelId"', where : { 'channelId' : channelIds }}).then(function (messages) {
    res.json(messages);
  });
});

app.get('/api/channels/:channelId/lastSeenMessageId', function (req, res){
  var channelId = req.params.channelId;
  var userId = req.headers.user;
  UsersChannelsMessages.findOne({where: {channelId: ''+ channelId, userId : userId}})
    .then(function (usersChannelsMessages){
      res.json(usersChannelsMessages);
    });
});

//app.post('/api/userId/:userId/allChannels', function (req, res){
//
//  var body = req.body;
//  var userId = req.params.userId;
//
//  if (userId === -1){
//    res.sendStatus(404);
//    return;
//  }
//
//  async.waterfall([
//    function(callback){
//      async.each(body.teamMembers,
//        function(teamMember, cb){
//          var minId = userId > teamMember.id ? teamMember.id : userId;
//          var maxId = userId > teamMember.id ? userId : teamMember.id;
//          Channel.findOrCreate({where: {name: '' + minId + ':' + maxId, isPrivate: true}})
//                 .then(function (channels) {
//                    var channel = channels[0];
//                    User.findOrCreate({where:{id:minId, ChannelId: channel.dataValues.id}})
//                        .then(function(){
//                           User.findOrCreate({where:{id:maxId, ChannelId: channel.dataValues.id}})
//                               .then(function(){
//                                teamMember.channelId = channel.id;
//                                cb();
//                               });
//                        });
//                  });
//        },
//        function (err){
//          if (!err){
//            callback();
//          }
//        }
//      );
//    },
//    function (callback){
//      async.each(body.myPublicChannels,
//        function(group, cb){
//          Channel.findOrCreate({where: {name: group.id, isPrivate: false}})
//           .then(function (channels) {
//              var  channel= channels[0];
//              User.findOrCreate({where:{id:userId, ChannelId: channel.dataValues.id}})
//                  .then(function(){
//                    group.channelId = channel.id;
//                    cb();
//                  });
//          });
//        },
//        function (err){
//          if (!err){
//            callback();
//          }
//        }
//      );
//    }
//    ],
//    function (err, result) {
//      if (err) {
//        console.log('Error : ' + err);
//      }
//      res.json(body);
//    }
//    );
//});




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


