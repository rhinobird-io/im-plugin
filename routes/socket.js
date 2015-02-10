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

  // broadcast a user's message to other users
  socket.on('message:send', function (data, callback) {
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
