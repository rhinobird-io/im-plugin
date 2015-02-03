"use strict";
module.exports = {
  up: function(migration, DataTypes, done) {
    migration.createTable("Messages", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER
      },
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
    migration.dropTable("Messages").done(done);
  }
};