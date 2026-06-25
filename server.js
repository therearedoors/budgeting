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

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('view cache', false);
app.locals.formatGBP = formatGBP;
app.locals.formatDate = formatDate;
app.locals.displayDate = displayDate;
app.locals.form = null;
app.locals.editing = null;

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());
app.use(loadUser);
app.use(flashMiddleware);

app.use(authRoutes);
app.use(dashboardRoutes);
app.use('/incoming', incomingRoutes);
app.use('/outgoing', outgoingRoutes);
app.use('/types', typesRoutes);

app.use((req, res) => {
  res.status(404).render('error', {
    title: 'Not Found',
    message: 'Page not found.',
  });
});

app.listen(PORT, () => {
  console.log(`Budgeting app running at http://localhost:${PORT}`);
});