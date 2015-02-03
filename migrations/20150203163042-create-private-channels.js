"use strict";
module.exports = {
  up: function(migration, DataTypes, done) {
    migration.createTable("PrivateChannels", {
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
      },
      createdAt: {
        allowNull: false,
        type: DataTypes.DATE
      },
      updatedAt: {
        allowNull: false,
        type: DataTypes.DATE
      }
    }).done(done);
  },
  down: function(migration, DataTypes, done) {
    migration.dropTable("PrivateChannels").done(done);
  }
};