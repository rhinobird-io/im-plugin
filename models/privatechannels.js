"use strict";
module.exports = function(sequelize, DataTypes) {
  var PrivateChannels = sequelize.define("PrivateChannels", {
    id : {
      type: DataTypes.STRING,
      primaryKey : true
    },
    name: {
      type: DataTypes.STRING,
      unique : true
    },
    ownerUserId : {
      type: DataTypes.INTEGER
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