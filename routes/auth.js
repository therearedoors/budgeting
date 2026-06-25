const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const pool = require('../config/db');
const { redirectIfAuth } = require('../middleware/auth');

const router = express.Router();

const registerValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Enter a valid email'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),
];

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Enter a valid email'),
  body('password').notEmpty().withMessage('Password is required'),
];

function setTokenCookie(res, user) {
  const token = jwt.sign(
    { userId: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.cookie('token', token, {
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    sameSite: 'lax',
  });
}

router.get('/register', redirectIfAuth, (req, res) => {
  res.render('auth/register', { title: 'Register', errors: [] });
});

router.post('/register', redirectIfAuth, registerValidation, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).render('auth/register', {
      title: 'Register',
      errors: errors.array(),
      email: req.body.email,
    });
  }

  const { email, password } = req.body;

  try {
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).render('auth/register', {
        title: 'Register',
        errors: [{ msg: 'Email already registered' }],
        email,
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO users (email, password_hash) VALUES (?, ?)',
      [email, passwordHash]
    );

    setTokenCookie(res, { id: result.insertId, email });
    res.redirect('/?success=Account created');
  } catch (err) {
    console.error(err);
    res.status(500).render('auth/register', {
      title: 'Register',
      errors: [{ msg: 'Something went wrong. Please try again.' }],
      email,
    });
  }
});

router.get('/login', redirectIfAuth, (req, res) => {
  res.render('auth/login', { title: 'Login', errors: [] });
});

router.post('/login', redirectIfAuth, loginValidation, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).render('auth/login', {
      title: 'Login',
      errors: errors.array(),
      email: req.body.email,
    });
  }

  const { email, password } = req.body;

  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(400).render('auth/login', {
        title: 'Login',
        errors: [{ msg: 'Invalid email or password' }],
        email,
      });
    }

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(400).render('auth/login', {
        title: 'Login',
        errors: [{ msg: 'Invalid email or password' }],
        email,
      });
    }

    setTokenCookie(res, user);
    res.redirect('/');
  } catch (err) {
    console.error(err);
    res.status(500).render('auth/login', {
      title: 'Login',
      errors: [{ msg: 'Something went wrong. Please try again.' }],
      email,
    });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.redirect('/login?success=Logged out');
});

module.exports = router;