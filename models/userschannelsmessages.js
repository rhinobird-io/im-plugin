"use strict";
module.exports = function(sequelize, DataTypes) {
  var UsersChannelsMessages = sequelize.define("UsersChannelsMessages", {
    userId: {
      type: DataTypes.INTEGER,
      primaryKey: true
    },
    channelId: {
      type: DataTypes.STRING,
      primaryKey: true
    },
    messageId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: "Messages",
      referencesKey: "id",
      onDelete: "cascade"
    }
  }, {
    classMethods: {
      associate: function(models) {
        UsersChannelsMessages.belongsTo(models.Messages, {foreignKey : 'messageId'});
      }
    }
  });
  return UsersChannelsMessages;
};