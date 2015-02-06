var memCache = require('memory-cache');

module.exports = function (req, res, next) {
  var meta = memCache.get(req.query['url']);
  if (meta) {
    res.send(meta);
  } else {
    next();
  }
};