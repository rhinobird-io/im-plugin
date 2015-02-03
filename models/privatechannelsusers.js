"use strict";
module.exports = function(sequelize, DataTypes) {
  var PrivateChannelsUsers = sequelize.define("PrivateChannelsUsers", {
    userId: {
      type: DataTypes.INTEGER,
      primaryKey: true
    },
    privateChannelId: {
      type: DataTypes.STRING,
      primaryKey: true,
      references: "PrivateChannels",
      referencesKey: "id",
      onDelete: "cascade"
    }
  }, {
    classMethods: {
      associate: function(models) {
        PrivateChannelsUsers.belongsTo(models.PrivateChannels, { foreignKey : 'privateChannelId'});
      }
    }
  });
  return PrivateChannelsUsers;
};