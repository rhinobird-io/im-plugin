docker run -p 35432:5432 -e POSTGRES_PASSWORD=123456 -d postgres:9.3

BASEDIR=$(dirname $0)
echo $BASEDIR

cd $BASEDIR/..

while :
do
    echo "try to connect to database"
    PGPASSWORD=123456 psql -p 35432 -h localhost -U postgres -c "create database im;"
    createResult=$?
    echo ${createResult}
    if [ ${createResult} -eq 0 ]; then
        break
    else
        echo "wait for 1s"
        sleep 1
    fi
done

NODE_ENV=docker_development93 ./node_modules/sequelize-cli/bin/sequelize db:migrate
NODE_ENV=docker_development93 node init/initFakeData.js