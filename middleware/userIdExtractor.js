module.exports = function(req, res, next) {
  req.userId = req.headers['x-user'];
  next();
};