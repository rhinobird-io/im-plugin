"use strict";
module.exports = function(sequelize, DataTypes) {
  var PrivateChannels = sequelize.define("PrivateChannels", {
    id : {
      type: DataTypes.STRING,
      primaryKey : true
    },
    name: {
      type: DataTypes.STRING,
      unique : "PrivateChannels_name_ownerUserId_key"
    },
    ownerUserId : {
      type: DataTypes.INTEGER,
      unique : "PrivateChannels_name_ownerUserId_key"
    }
  }, {
    classMethods: {
      associate: function(models) {
        // associations can be defined here
      }
    }
  });
  return PrivateChannels;
};