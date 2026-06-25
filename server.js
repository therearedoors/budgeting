require('dotenv').config();

const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const flashMiddleware = require('./middleware/flash');
const { loadUser } = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const incomingRoutes = require('./routes/incoming');
const outgoingRoutes = require('./routes/outgoing');
const typesRoutes = require('./routes/types');
const { formatGBP, formatDate, displayDate } = require('./utils/format');

if (!process.env.JWT_SECRET) {
  console.warn('Warning: JWT_SECRET is not set. Auth will not work correctly.');
}

console.log('Starting app', {
  port: process.env.PORT,
  nodeEnv: process.env.NODE_ENV,
});

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('view cache', process.env.NODE_ENV === 'production');
app.locals.formatGBP = formatGBP;
app.locals.formatDate = formatDate;
app.locals.displayDate = displayDate;
app.locals.form = null;
app.locals.editing = null;

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

function healthHandler(req, res) {
  res.sendStatus(200);
}

['/health', '/healthcheck', '/healthz'].forEach((healthPath) => {
  app.get(healthPath, healthHandler);
  app.head(healthPath, healthHandler);
});

app.use(cookieParser());
app.use(loadUser);
app.use(flashMiddleware);

app.get('/', (req, res) => {
  if (req.user) {
    return res.redirect('/dashboard');
  }
  res.render('home', { title: 'Budgeting' });
});

app.use(authRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/incoming', incomingRoutes);
app.use('/outgoing', outgoingRoutes);
app.use('/types', typesRoutes);

app.use((req, res) => {
  res.status(404).render('error', {
    title: 'Not Found',
    message: 'Page not found.',
  });
});

const server = app.listen(PORT, 
  //'0.0.0.0', 
  () => {
  console.log(`Listening on port ${PORT}`);
});

server.on('error', (err) => {
  console.error('Server failed to start:', err);
  process.exit(1);
});