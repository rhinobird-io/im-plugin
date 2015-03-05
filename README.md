
# Deployment
## pre-install
 - install Postgres
 - change the database setting in config/config.json as you like

## init db

### Not use docker
 - npm install
 - ./node_modules/sequelize-cli/bin/sequelize db:migrate

### Use docker
 - ./init/run_docker_postgres.sh
 - ./init/run_db_create_migrate.sh
    

## start server
 ```javascript
 node app.js
 ```

# Develop specification
## Socket event
Follow verb:noun

## Restful API
It should represent a resource, only noun can be used.
