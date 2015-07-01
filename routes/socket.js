var models = require('../models')
  , Sequelize = models.sequelize
  , PrivateChannelsUsers = models.PrivateChannelsUsers
  , Message = models.Messages
  , PrivateChannel = models.PrivateChannels
  , UsersChannelsMessages = models.UsersChannelsMessages;

var socketsMap = {};
// export function for listening to the socket
module.exports = function (socket) {
  var defaultChannel = 'default';
  var userId = 'unknow';
  var self = this;

  socket.on('init', function (data, callback) {
    userId = data.userId;
    var myPublicChannels = data.publicChannels;
    var myPrivateChannels = data.privateChannels;
    var myTeamMemberChannels = data.teamMemberChannels;
    var currentChannel = data.currentChannel;

    socketsMap[userId] = socket;
    socket.userId = userId;
    socket.channels = [];
    if (myPublicChannels){
      myPublicChannels.forEach(function (channel) {
        socket.join(channel.id);
        socket.channels.push(channel.id);
      });
    }
    if (myTeamMemberChannels){
      myTeamMemberChannels.forEach(function (channel) {
        socket.join(channel.id);
        socket.channels.push(channel.id);
      });
    }
    if (myPrivateChannels){
      myPrivateChannels.forEach(function (channel) {
        socket.join(channel.id);
        socket.channels.push(channel.id);
      });
    }

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

  socket.on('message:seen', function(data){
	UsersChannelsMessages
      .findOne({where: {userId: data.userId, channelId: ''+ data.channelId }})
      .then(function (instance){
        if (!instance){
          UsersChannelsMessages.create({messageId:data.messageId, userId: data.userId, channelId: ''+ data.channelId });
          return;
        }
        instance.update({messageId:data.messageId});
      });
  	
  });
  socket.on('message:sync', function(data, cb){
    var latestReceiveMessageId = data.latestReceiveMessageId;
    // get messages after this id which can be seen by this user
    Message.findAndCountAll({
      where: { channelId: this.channels, id: {gt: latestReceiveMessageId}}, order: 'id DESC' }).then(function (messages) {
        cb(messages.rows.reverse());
    });
  });

  // broadcast a user's message to other users
  socket.on('message:send', function (data, callback) {
    if (!socketsMap[userId]){
      socketsMap[userId] = socket;
    }
    if (data.text === undefined || data.text === ''){
      return;
    }
    Message.create({
      text: data.text,
      userId: data.userId,
      channelId: data.channelId,
      guid: data.guid
    }).then(function (afterCreate) {
      var message = afterCreate.dataValues;
      message.messageStatus = 'done';
      UsersChannelsMessages
      .findOne({where: {userId: data.userId, channelId: ''+ data.channelId }})
      .then(function (instance){
        if (!instance){
          UsersChannelsMessages.create({messageId:message.id, userId: data.userId, channelId: ''+ data.channelId });
          return;
        }
        instance.update({messageId:message.id});
      });

      /**
       * it is possible that the opposite user(s) may not join the channel, we need to force them to join the channel
       *
       */
      socket.broadcast.to(message.channelId).emit('message:send', message);
      callback(message);
    });
  });

  socket.on('channel:created', function(data, callback) {
    var channel = data.channel;
    var privateChannelUsers = data.users;
    var userId = data.userId;

    privateChannelUsers.forEach(function(privateChannelUser) {
      if (socketsMap[privateChannelUser.userId]) {
        socketsMap[privateChannelUser.userId].join(channel.id);
      }
    });
    socket.broadcast.to(channel.id).emit('channel:created', { channel : channel});
    callback();
  });

  socket.on('channel:deleted', function(data, callback) {
    var channel = data.channel;
    var privateChannelUsers = data.users;
    var userId = data.userId;

    privateChannelUsers.forEach(function(privateChannelUser) {
      if (socketsMap[privateChannelUser.userId]) {
        socketsMap[privateChannelUser.userId].leave(channel.id);
        socket.broadcast.to(socketsMap[privateChannelUser.userId].id).emit('channel:deleted', { channel : channel});
      }
    });

    callback();
  });

  // clean up when a user leaves, and broadcast it to other users
  socket.on('disconnect', function (data) {
    // only the positive disconnect know the userId
    userId = this.userId;
    delete socketsMap[userId];
    socket.broadcast.to(defaultChannel).emit('user:left', {
      // notify other clients that a new user has joined
      userId: userId,
      channelId: defaultChannel
    });
  });
};
