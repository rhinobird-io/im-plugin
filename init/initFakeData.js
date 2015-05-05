var faker = require('faker'),
  uuid = require('node-uuid');
  _ = require('lodash');
var models = require('../models')
  , Sequelize = models.sequelize
  , PrivateChannelsUsers = models.PrivateChannelsUsers
  , Message = models.Messages
  , PrivateChannel = models.PrivateChannels
  , UsersChannelsMessages = models.UsersChannelsMessages;

var randomName = faker.name.findName(); // Rowan Nikolaus
var randomEmail = faker.internet.email(); // Kassandra.Haley@erich.biz
var randomCard = faker.helpers.createCard(); // random contact card containing many properties

var channels = [];
var messages = [];
var users = [];

_.times(100, function(){
  channels.push({
    id: uuid.v4(),
    name: faker.name.findName(),
    ownerUserId: 1
  });
});

channels.forEach(function(channel) {
  _.times(30, function(n) {
    users.push({
      userId: n,
      privateChannelId: channel.id
    });
  });
});

_.times(300, function(){
  messages.push({
    text: faker.lorem.sentence(),
    userId: _.random(1,3),
    channelId: 'team_' + _.random(1,4),
    guid: uuid.v4()
  });
});

PrivateChannel.bulkCreate(channels).then(function(){
  PrivateChannelsUsers.bulkCreate(users).then(function(){
      console.log('insert channels');
  });
});



Message.bulkCreate(messages).then(function(){
  console.log('insert messages');
});
