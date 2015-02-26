"use strict";

var Message = {
  tableName : 'Messages'
};
var vectorName = 'textVector';
var searchFields = ['text'];

module.exports = {
  up: function(migration, DataTypes, done) {


    migration.sequelize.query('ALTER TABLE "' + Message.tableName + '" ADD COLUMN "' + vectorName + '" TSVECTOR')
      .done(function(){
        migration.sequelize
          .query('CREATE INDEX message_search_idx ON "' + Message.tableName + '" USING gin("' + vectorName + '");')
          .done(function(){
            migration.sequelize
              .query('CREATE TRIGGER message_vector_update BEFORE INSERT OR UPDATE ON "' + Message.tableName + '" FOR EACH ROW EXECUTE PROCEDURE tsvector_update_trigger("' + vectorName + '", \'pg_catalog.english\', ' + searchFields.join(', ') + ')')
              .done(done);
          })
      });
  },

  down: function(migration, DataTypes, done) {
    migration.sequelize.query('DROP trigger if exists message_vector_update on "Messages"').done(function(){
      migration.sequelize.query('DROP index if exists message_search_idx').done(function(){
        migration.removeColumn(Message.tableName, vectorName).done(done);
      })
    });
  }
};
