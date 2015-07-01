
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

exports.getUnreadCount = function (req, res) {
  var userId = req.userId;
  var channelIds = req.body.channelIds;
  
  var queryStr = 'SELECT m."channelId" as "channelId", count(m."id") as "unreadCount" FROM "Messages" as "m", "UsersChannelsMessages" as "u" WHERE m."channelId" = u."channelId" and u."userId" = :userId and m."id" > u."messageId" and u."channelId" in (';
  channelIds.forEach(function (channelId){
  	queryStr += "'" + channelId + "',";
  });
  queryStr = queryStr.substring(0, queryStr.length - 1);
  queryStr += ') group by m."channelId"';
  Sequelize.query(queryStr,
    { replacements: { userId: userId}, type: Sequelize.QueryTypes.SELECT }
  ).then(function(c) {
    res.json(c);
  });
};

exports.getTotalCount = function (req, res) {
  var userId = req.userId;
  var channelIds = req.body.channelIds;
  Message.findAll({ attributes: ['channelId', [Sequelize.fn('count', Sequelize.col('id')), 'amount']] ,group : '"channelId"', where : { 'channelId' : channelIds }}).then(function (messages) {
    res.json(messages);
  });
};

exports.getLastSeenMessages = function (req, res){
  var userId = req.body.userId;
  UsersChannelsMessages.findAll({where: {userId : userId}})
      .then(function (usersChannelsMessages){
        res.json(usersChannelsMessages);
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
