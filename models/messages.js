"use strict";
module.exports = function (sequelize, DataTypes) {
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
      associate: function (models) {
        // associations can be defined here
      },

      getSearchVector: function () {
        return 'textVector';
      },

      searchAllChannel: function (query) {
        if (sequelize.options.dialect !== 'postgres') {
          console.log('Search is only implemented on POSTGRES database');
          return;
        }
        var Message = this;
        query = sequelize.getQueryInterface().escape(query);
        return sequelize
          .query('SELECT * FROM "' + Message.tableName + '" WHERE "' + Message.getSearchVector() + '" @@ plainto_tsquery(\'english\', ' + query + ')', Message);
      },

      searchSingleChannel: function (query, channelId) {
        if (sequelize.options.dialect !== 'postgres') {
          console.log('Search is only implemented on POSTGRES database');
          return;
        }
        var Message = this;
        query = sequelize.getQueryInterface().escape(query);
        return sequelize
          .query('SELECT * FROM "' + Message.tableName + '" WHERE "Messages"."channelId" = \'' + channelId +'\'  and "' + Message.getSearchVector() + '" @@ plainto_tsquery(\'english\', ' + query + ')', Message);
      }
    }
  });
  return Messages;
};