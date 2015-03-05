BASEDIR=$(dirname $0)
echo $BASEDIR

cd $BASEDIR/..

PGPASSWORD=123456 psql -p 35432 -h localhost -U postgres -c "create database im;"
NODE_ENV=docker_development93 ./node_modules/sequelize-cli/bin/sequelize db:migrate
