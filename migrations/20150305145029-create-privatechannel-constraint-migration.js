"use strict";
module.exports = {
  up: function (migration, DataTypes, done) {
    migration.sequelize.query('alter table "PrivateChannels" drop constraint "PrivateChannels_name_key"').done(function () {
      migration.sequelize.query('alter table "PrivateChannels" add unique ("name", "ownerUserId")').done(done);
    });
  },
  down: function (migration, DataTypes, done) {
    migration.sequelize.query('alter table "PrivateChannels" drop constraint "PrivateChannels_name_ownerUserId_key"').done(function () {
      console.log('Possiblly validation error');
      migration.sequelize.query('alter table "PrivateChannels" add unique ("name")').done(done);
    });
  }
};