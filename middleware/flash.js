function flashMiddleware(req, res, next) {
  res.locals.flash = {
    success: req.query.success || null,
    error: req.query.error || null,
  };
  res.locals.user = req.user || null;
  next();
}

module.exports = flashMiddleware;