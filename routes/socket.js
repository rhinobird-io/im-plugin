var Message = require('../db/models.js').Message
  , User = require('../db/models.js').User
  , Channel = require('../db/models.js').Channel;

var async = require('async');
var socketsMap = {};
// export function for listening to the socket
module.exports = function (socket) {
  var defaultChannel = 'lobby';
  var userId = 'unknow';
  var self = this;

  socket.on('init', function (data, callback) {
    userId = data.userId;
    if (socketsMap[userId]){
      socketsMap[userId].disconnect();
    }
    socketsMap[userId] = socket;

    User.findAll({where : {id:userId}}).then(function(users){
          users.forEach(function (user) {
            socket.join(user.ChannelId);
            // notify other clients that a new user has joined
            socket.broadcast.to(user.ChannelId).emit('user:join', {
              userId: userId,
              channelId: user.channelId
            });
        });
      
    });

    
  });

  // broadcast a user's message to other users
  socket.on('send:message', function (data, callback) {

    Channel.find(data.channelId).then(function (channel) {
      Message.create({message: data.message, 
                      UserId: userId, 
                      ChannelId: channel.id, 
                      guid: data.guid}).then(function (afterCreate) {
        var message = {};
        message.userId = userId;
        message.guid = data.guid;
        message.id = afterCreate.dataValues.id;
        message.text = data.message;
        message.updatedAt = afterCreate.dataValues.updatedAt;
        message.messageStatus = "done";
        message.channelId = data.channelId;

        socket.broadcast.to(data.channelId).emit('send:message', message);
        callback(message); 
      });
    });
  });


  // clean up when a user leaves, and broadcast it to other users
  socket.on('disconnect', function (data) {
    delete socketsMap[userId];
    User.findAll({where:{id:userId}}).then(function(users){
      users.forEach(function(user){
        socket.broadcast.to(user.ChannelId).emit('user:left', {
          userId: data.userId,
          channelId: user.channelId
        });
        socket.leave(user.ChannelId);
      });
    });
  });
};
