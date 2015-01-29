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

    socket.broadcast.to(currentChannel.id).emit('user:join', {
      // notify other clients that a new user has joined
      userId: userId,
      channelId: currentChannel.id
    });
  });

  // broadcast a user's message to other users
  socket.on('send:message', function (data, callback) {
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


  // clean up when a user leaves, and broadcast it to other users
  socket.on('disconnect', function (data) {
    delete socketsMap[userId];
    // need to leave rooms

    //User.findAll({where:{id:userId}}).then(function(users){
    //  users.forEach(function(user){
    //    socket.broadcast.to(user.ChannelId).emit('user:left', {
    //      userId: data.userId,
    //      channelId: user.channelId
    //    });
    //    socket.leave(user.ChannelId);
    //  });
    //});
  });
};
