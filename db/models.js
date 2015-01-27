var Sequelize = require('sequelize')
  , sequelize = new Sequelize('database', 'username', 'password', {
    dialect: "sqlite",
    storage: "./im.db",
    pool: {
      max: 5,
      min: 0,
      idle: 10000
    }
  })
  , async = require('async');

var Channel = sequelize.define('Channel', {
  name: {
    type: Sequelize.STRING,
    unique: true
  },
  isPrivate: Sequelize.BOOLEAN
});

var Message = sequelize.define('Message', {
  message: Sequelize.TEXT, 
  guid: Sequelize.UUID
});

var User = sequelize.define('User', {
  id : Sequelize.INTEGER
});


Channel.hasMany(User);
Message.belongsTo(Channel);
Message.belongsTo(User);


module.exports = {
  Message: Message,
  Channel: Channel,
  User: User,

  sync: function () {
    return sequelize.sync({force: true}).then(function () {
      console.log('finish sync');
    });
  }

};