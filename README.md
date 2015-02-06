
# Deployment
## pre-install
 - install Postgres
 - change the database setting in config/config.json as you like

## init db
 - npm install
 - ./node_modules/sequelize-cli/bin/sequelize db:migrate

## start server
 ```javascript
 node app.js
 ```

# Develop specification
## Socket event
Follow verb:noun

## Restful API
It should represent a resource, only noun can be used.
