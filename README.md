# pre-install
 - install Postgres && create database im 
 - set password to 123456 or define process.env.DATABASE_URL like postgres://postgres:123456@localhost:5432/im

# init db
 - npm install
 - node db/dbInit.js

# start server
 ```javascript
 node app.js
 ```