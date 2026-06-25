const jwt = require('jsonwebtoken');

function loadUser(req, res, next) {
  const token = req.cookies.token;

  if (token) {
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      req.user = { id: payload.userId, email: payload.email };
    } catch {
      res.clearCookie('token');
    }
  }

  next();
}

function requireAuth(req, res, next) {
  if (!req.user) {
    return res.redirect('/login');
  }
  next();
}

function redirectIfAuth(req, res, next) {
  const token = req.cookies.token;

  if (!token) {
    return next();
  }

  try {
    jwt.verify(token, process.env.JWT_SECRET);
    return res.redirect('/');
  } catch {
    res.clearCookie('token');
    next();
  }
}

module.exports = { loadUser, requireAuth, redirectIfAuth };