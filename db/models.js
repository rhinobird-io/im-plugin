var pg = require('pg'),
  Sequelize = require('sequelize'),
  async = require('async');

var url = process.env.DATABASE_URL || 'postgres://postgres:123456@localhost:5432/im';
var sequelize = new Sequelize(url);

/**
 * use to store private channels, ** ONLY ** private channels
 * @type {*|Model}
 */
var PrivateChannel = sequelize.define('PrivateChannel', {
  name: {
    type: Sequelize.STRING,
    unique: true
  }
});

var PrivateChannelsUsers = sequelize.define('PrivateChannelsUsers', {
  userId: {
    type: Sequelize.INTEGER,
    primaryKey: true
  },
  PrivateChannelId: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    references: "PrivateChannels",
    referencesKey: "id",
    onDelete: "cascade"
  }
});

var Message = sequelize.define('Message', {
  channelId: Sequelize.STRING,
  userId: Sequelize.INTEGER,
  message: Sequelize.TEXT,
  guid: Sequelize.UUID
});

var UsersChannelsMessages = sequelize.define('UsersChannelsMessages', {
  userId: {
    type: Sequelize.INTEGER,
    primaryKey: true
  },
  channelId: {
    type: Sequelize.STRING,
    primaryKey: true
  }
});


PrivateChannelsUsers.belongsTo(PrivateChannel);
UsersChannelsMessages.belongsTo(Message);

module.exports = {
  Message: Message,
  PrivateChannel: PrivateChannel,
  PrivateChannelsUsers: PrivateChannelsUsers,
  UsersChannelsMessages: UsersChannelsMessages,

  sync: function () {
    return sequelize.sync({force: true}).then(function () {
      console.log('finish sync');
    });
  }

};