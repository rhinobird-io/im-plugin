var models = require('../models')
    , Sequelize = models.sequelize
    , PrivateChannelsUsers = models.PrivateChannelsUsers
    , Message = models.Messages
    , PrivateChannel = models.PrivateChannels
    , UsersChannelsMessages = models.UsersChannelsMessages;

var _ = require('lodash');

var users = [1, 2, 3, 4, 5];

Sequelize.transaction(function (t) {
    return PrivateChannel.create({
        id: 'hncuidsbnikvhfdiiencvldsi',
        name: 'test-scroll',
        ownerUserId: 1
    }, {transaction: t}).then(function (channel) {
        var temp = [];
        users.forEach(function (userId) {
            temp.push({
                userId: userId,
                privateChannelId: channel.id
            })
        });
        return PrivateChannelsUsers.bulkCreate(temp, {transaction: t});
    }).then(function (channel) {
        var messages = [];
        for (var i = 0; i < 1000; i++) {
            messages.push({
                text: '' + i,
                userId: i % 5 + 1,
                channelId: 'hncuidsbnikvhfdiiencvldsi',
                guid: 'f62d85ee-7161-4a79-be65-0d80d1b972ec'
            });
        }

        return Message.bulkCreate(messages, {transaction: t});
    });
}).then(function (result) {
    console.log('Finish insert fake data');

}).catch(function (err) {
    console.log('Cannot insert fake data');
});
