var pg = require('pg'),
    Sequelize = require('sequelize'),
    async = require('async');

var url = process.env.DATABASE_URL || 'postgres://postgres:123456@localhost:5432/im'
var sequelize = new Sequelize(url);

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