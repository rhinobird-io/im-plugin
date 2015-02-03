"use strict";
module.exports = {
  up: function(migration, DataTypes, done) {
    migration.createTable("PrivateChannelsUsers", {
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
    migration.dropTable("PrivateChannelsUsers").done(done);
  }
};