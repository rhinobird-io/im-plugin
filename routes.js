var channels = require('./routes/channels');
var messages = require('./routes/messages');
var ogp = require("open-graph");

module.exports = function(app) {

  app.get('/api/channels/:channelId/messages', channels.getPrivateChannelMessage);
  app.get('/api/channels', channels.getPrivateChannels);
  app.get('/api/channels/:channelId/users', channels.getPrivateChannelUsers);
  app.post('/api/channels', channels.addPrivateChannel);
  app.delete('/api/channels/:channelId', channels.deletePrivateChannel);

  app.post('/api/messages/latest', messages.getLatestMessages);
  app.get('/api/channels/:channelId/lastSeenMessageId', messages.getLastSeenMessage);

  app.get('/api/urlMetadata', function (req, res) {
    ogp(req.query['url'], function (error, data) {
      if (error) {
        return;
      }
      res.send(data);
    });
  });

  app.get('*', function (req, res) {
    res.sendfile('index.html', {root: __dirname + '/public'});
  });

};
