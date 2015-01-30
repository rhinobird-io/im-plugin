var PrivateChannelUsers = require('../db/models.js').PrivateChannelUsers
  , Message = require('../db/models.js').Message
  , PrivateChannel = require('../db/models.js').PrivateChannel
  , UsersChannelsMessages = require('../db/models.js').UsersChannelsMessages
  , async = require('async');

var socketsMap = {};
// export function for listening to the socket
module.exports = function (socket) {
  var defaultChannel = 'default';
  var userId = 'unknow';
  var self = this;

  socket.on('init', function (data, callback) {
    userId = data.userId;
    var myPublicChannels = data.myPublicChannels;
    var myPrivateChannels = data.myPrivateChannels;
    var myTeamMemberChannels = data.myTeamMemberChannels;
    var currentChannel = data.currentChannel;

    socketsMap[userId] = socket;

    myPublicChannels.forEach(function (channel) {
      socket.join(channel.id);
    });

    myTeamMemberChannels.forEach(function (channel) {
      socket.join(channel.id);
    });

    myPrivateChannels.forEach(function (channel) {
      socket.join(channel.id);
    });

    socket.join(defaultChannel);

    socket.broadcast.to(defaultChannel).emit('user:join', {
      // notify other clients that a new user has joined
      userId: userId,
      channelId: defaultChannel
    });
    var keys = {};
    for (var key in socketsMap) {
      keys[key] = 1;
    };
    callback(keys);
  });

  // broadcast a user's message to other users
  socket.on('send:message', function (data, callback) {
    if (!socketsMap[userId]){
      socketsMap[userId] = socket;
    }
    Message.create({
      text: data.text,
      userId: data.userId,
      channelId: data.channelId,
      guid: data.guid
    }).then(function (afterCreate) {
      var message = afterCreate.dataValues;
      message.messageStatus = 'done';

      /**
       * it is possible that the opposite user(s) may not join the channel, we need to force them to join the channel
       *
       */
      socket.broadcast.to(message.channelId).emit('send:message', message);
      callback(message);
    });
  });

  // due to sometimes it will discconect randomly (heartbeat problem) 
  //  socket.io:client client close with reason ping timeout
  //  socket.io:socket closing socket - reason ping timeout +0ms
  //  socket.io:client ignoring remove for xxxxxxx
  socket.on('user:alive', function(){
    socketsMap[userId] = socket;
    socket.broadcast.to(defaultChannel).emit('user:join', {
      // notify other clients that a new user has joined
      userId: userId,
      channelId: defaultChannel
    });
  });

  // clean up when a user leaves, and broadcast it to other users
  socket.on('disconnect', function (data) {
    delete socketsMap[userId];
    socket.broadcast.to(defaultChannel).emit('user:left', {
      // notify other clients that a new user has joined
      userId: userId,
      channelId: defaultChannel
    });
    try{
      socket.broadcast.to(socketsMap[user.id].id).emit('user:dead', {});
    }catch(err){

    }
    // need to leave rooms
    // ans: don't need, but if you want to have something on leave, 
    // you can do like this
    // var rooms = io.sockets.manager.roomClients[socket.id];
    //    for(var room in rooms) {
    //        socket.leave(room);
    //    }

  });
};
