
var models = require('../models')
  , Sequelize = models.sequelize
  , PrivateChannelsUsers = models.PrivateChannelsUsers
  , Message = models.Messages
  , PrivateChannel = models.PrivateChannels
  , UsersChannelsMessages = models.UsersChannelsMessages;

var _ = require('lodash');

exports.getLatestMessages = function (req, res) {
  var userId = req.userId;
  var channelIds = req.body.channelIds;
  Message.findAll({ attributes: ['channelId', [Sequelize.fn('max', Sequelize.col('id')), 'messageId']] ,group : '"channelId"', where : { 'channelId' : channelIds }}).then(function (messages) {
    res.json(messages);
  });
};


exports.getLastSeenMessage = function (req, res){
  var channelId = req.params.channelId;
  var userId = req.userId;
  UsersChannelsMessages.findOne({where: {channelId: ''+ channelId, userId : userId}})
    .then(function (usersChannelsMessages){
      res.json(usersChannelsMessages);
    });
};

exports.queryMessage = function(req, res) {
  if (req.query.channelId) {
    // should valid the user has the authorization to access this channel
    PrivateChannelsUsers.findOne({ where : {
      userId : req.userId,
      privateChannelId : req.query.channelId
    }}).then(function(privateChannelUser){
      if (privateChannelUser) {
        Message.searchSingleChannel(req.query.q, privateChannelUser.privateChannelId).then(function(messages){
          res.json(messages[0]);
        });
      } else {
        res.sendStatus(403);
      }

    });

  } else {
    var userId = req.userId;
    PrivateChannelsUsers.findAll({
      where : {
        userId : userId
      }
    }).then(function(privateChannelUsers) {
      var channelIds = [];
      privateChannelUsers.forEach(function(users) {
        channelIds.push(users.privateChannelId);
      });
      Message.searchMultiChannels(req.query.q, channelIds).then(function(messages){
        res.json(messages[0]);
      });
    });

  }

};
