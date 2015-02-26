"use strict";
module.exports = {
  up: function(migration, DataTypes, done) {
    migration.createTable("UsersChannelsMessages", {
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
        references: "Messages",
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
    console.log('try down of UsersChannelsMessages');
    migration.dropTable('UsersChannelsMessages').done(done);
  }
};