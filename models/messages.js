"use strict";
module.exports = function(sequelize, DataTypes) {
  var Messages = sequelize.define("Messages", {
    channelId: {
      type: DataTypes.STRING,
      allowNull: false
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    text: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    guid: {
      type: DataTypes.UUID,
      allowNull: false
    }
  }, {
    classMethods: {
      associate: function(models) {
        // associations can be defined here
      }
    }
  });
  return Messages;
};