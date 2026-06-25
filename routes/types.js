const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const typeValidation = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }),
];

router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    const [incomingTypes] = await pool.query(
      'SELECT * FROM incoming_types WHERE user_id = ? ORDER BY name',
      [userId]
    );
    const [outgoingTypes] = await pool.query(
      'SELECT * FROM outgoing_types WHERE user_id = ? ORDER BY name',
      [userId]
    );

    res.render('types/index', {
      title: 'Types',
      incomingTypes,
      outgoingTypes,
      errors: [],
    });
  } catch (err) {
    console.error(err);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Could not load types.',
    });
  }
});

router.post('/incoming', requireAuth, typeValidation, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return redirectWithTypesError(req, res, errors.array());
  }

  try {
    await pool.query(
      'INSERT INTO incoming_types (user_id, name) VALUES (?, ?)',
      [req.user.id, req.body.name.trim()]
    );
    res.redirect('/types?success=Incoming type added');
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.redirect('/types?error=That incoming type already exists');
    }
    console.error(err);
    res.redirect('/types?error=Could not add incoming type');
  }
});

router.post('/outgoing', requireAuth, typeValidation, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return redirectWithTypesError(req, res, errors.array());
  }

  try {
    await pool.query(
      'INSERT INTO outgoing_types (user_id, name) VALUES (?, ?)',
      [req.user.id, req.body.name.trim()]
    );
    res.redirect('/types?success=Outgoing type added');
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.redirect('/types?error=That outgoing type already exists');
    }
    console.error(err);
    res.redirect('/types?error=Could not add outgoing type');
  }
});

router.post('/incoming/:id/delete', requireAuth, async (req, res) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM incoming_types WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (result.affectedRows === 0) {
      return res.redirect('/types?error=Incoming type not found');
    }
    res.redirect('/types?success=Incoming type deleted');
  } catch (err) {
    if (err.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.redirect('/types?error=Cannot delete type that has incomings');
    }
    console.error(err);
    res.redirect('/types?error=Could not delete incoming type');
  }
});

router.post('/outgoing/:id/delete', requireAuth, async (req, res) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM outgoing_types WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (result.affectedRows === 0) {
      return res.redirect('/types?error=Outgoing type not found');
    }
    res.redirect('/types?success=Outgoing type deleted');
  } catch (err) {
    if (err.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.redirect('/types?error=Cannot delete type that has outgoings');
    }
    console.error(err);
    res.redirect('/types?error=Could not delete outgoing type');
  }
});

async function redirectWithTypesError(req, res, errors) {
  const userId = req.user.id;
  const [incomingTypes] = await pool.query(
    'SELECT * FROM incoming_types WHERE user_id = ? ORDER BY name',
    [userId]
  );
  const [outgoingTypes] = await pool.query(
    'SELECT * FROM outgoing_types WHERE user_id = ? ORDER BY name',
    [userId]
  );

  res.status(400).render('types/index', {
    title: 'Types',
    incomingTypes,
    outgoingTypes,
    errors,
  });
}

module.exports = router;