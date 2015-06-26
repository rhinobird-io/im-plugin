var channels = require('./routes/channels');
var messages = require('./routes/messages');
var ogp = require("open-graph");
var memCache = require('memory-cache');

module.exports = function (app) {

  app.get('/api/channels/:channelId/messages', channels.getPrivateChannelMessage);
  app.get('/api/channels/:channelId/messagescount', channels.getPrivateChannelMessageCount);
  app.get('/api/channels', channels.getPrivateChannels);
  app.get('/api/channels/:channelId/users', channels.getPrivateChannelUsers);
  app.post('/api/channels', channels.addPrivateChannel);
  app.get('/api/channels/:channelId', channels.getOnePrivateChannel);
  app.delete('/api/channels/:channelId', channels.deletePrivateChannel);

  app.post('/api/messages/latest', messages.getLatestMessages);
  app.post('/api/messages/lastSeen', messages.getLastSeenMessages);
  app.get('/api/messages', messages.queryMessage);
  app.get('/api/channels/:channelId/messages/lastSeen', messages.getLastSeenMessage);

  app.get('/api/urlMetadata', function (req, res) {
    try{
      ogp(req.query['url'], function (error, data) {
        if (error) {
          res.send({});
          return;
        }
        memCache.put(req.query['url'], data, 86400 * 1000);
        res.send(data);
      });
    }catch(ex){
      console.log(ex);
      res.send({});
    }
  });

  app.get('*', function (req, res) {
    res.sendfile('index.html', {root: __dirname + '/public'});
  });

};
