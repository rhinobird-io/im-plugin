
var models = require('../models')
  , Sequelize = models.sequelize
  , PrivateChannelsUsers = models.PrivateChannelsUsers
  , Message = models.Messages
  , PrivateChannel = models.PrivateChannels
  , UsersChannelsMessages = models.UsersChannelsMessages;

var _ = require('lodash');
var async = require('async');

exports.addPrivateChannel = function (req, res) {
  var ownerUserId = req.userId;
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
};

exports.getPrivateChannelMessage = function(req, res) {
  var sinceId = req.query.sinceId || 0;
  var beforeId = req.query.beforeId || 1 << 30;
  var limit = req.query.limit || beforeId - sinceId;

  Message.findAndCountAll({
    where: {channelId: req.params.channelId, id: {gt: sinceId, lt: beforeId}}, order: 'id DESC', limit: limit
  }).then(function (messages) {
    res.json(messages.rows.reverse());
  });
};

/**
 * get a user's private channels
 * @param req
 * @param res
 */
exports.getPrivateChannels = function(req, res) {
  var userId = req.userId;
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
};

exports.getPrivateChannelUsers = function (req, res) {
  var channelId = req.params.channelId;
  PrivateChannelsUsers.findAll({where: {privateChannelId: channelId}}).then(function (privateChannelsUsers) {
    res.json(privateChannelsUsers);
  });
};

exports.deletePrivateChannel = function (req, res) {
  var userId = req.userId;
  var channelId = req.params.channelId;
  PrivateChannelsUsers.destroy( { where : {userId : userId, privateChannelId: channelId}}).then(function(result){
    res.sendStatus(200);
  });
};
