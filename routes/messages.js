
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
  Message.search(req.query.q).then(function(messages){
    res.json(messages[0]);
  })
};
