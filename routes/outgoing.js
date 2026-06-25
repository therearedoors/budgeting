const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const { formatGBP } = require('../utils/format');

const router = express.Router();

const entryValidation = [
  body('type_id').isInt({ min: 1 }).withMessage('Select a type'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than zero'),
  body('entry_date').isISO8601().withMessage('Enter a valid date'),
  body('description').optional({ checkFalsy: true }).trim().isLength({ max: 500 }),
];

async function getOutgoingTypes(userId) {
  const [types] = await pool.query(
    'SELECT * FROM outgoing_types WHERE user_id = ? ORDER BY name',
    [userId]
  );
  return types;
}

router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const types = await getOutgoingTypes(userId);

    const [entries] = await pool.query(
      `SELECT uo.*, ot.name AS type_name
       FROM user_outgoing uo
       JOIN outgoing_types ot ON uo.type_id = ot.id
       WHERE uo.user_id = ?
       ORDER BY uo.entry_date DESC, uo.id DESC`,
      [userId]
    );

    res.render('outgoing/index', {
      title: 'Outgoings',
      entries,
      types,
      errors: [],
      editing: null,
      form: null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Could not load outgoings.',
    });
  }
});

router.post('/', requireAuth, entryValidation, async (req, res) => {
  const errors = validationResult(req);
  const userId = req.user.id;
  const types = await getOutgoingTypes(userId);

  if (errors.isEmpty()) {
    const typeOwned = types.some((t) => t.id === Number(req.body.type_id));
    if (!typeOwned) {
      errors.errors.push({ msg: 'Invalid type selected' });
    }
  }

  if (!errors.isEmpty()) {
    const [entries] = await pool.query(
      `SELECT uo.*, ot.name AS type_name
       FROM user_outgoing uo
       JOIN outgoing_types ot ON uo.type_id = ot.id
       WHERE uo.user_id = ?
       ORDER BY uo.entry_date DESC, uo.id DESC`,
      [userId]
    );

    return res.status(400).render('outgoing/index', {
      title: 'Outgoings',
      entries,
      types,
      errors: errors.array(),
      formatGBP,
      editing: null,
      form: req.body,
    });
  }

  try {
    await pool.query(
      `INSERT INTO user_outgoing (user_id, type_id, amount, description, entry_date)
       VALUES (?, ?, ?, ?, ?)`,
      [
        userId,
        req.body.type_id,
        req.body.amount,
        req.body.description?.trim() || null,
        req.body.entry_date,
      ]
    );
    res.redirect('/outgoing?success=Outgoing added');
  } catch (err) {
    console.error(err);
    res.redirect('/outgoing?error=Could not add outgoing');
  }
});

router.get('/:id/edit', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const types = await getOutgoingTypes(userId);

    const [entries] = await pool.query(
      `SELECT uo.*, ot.name AS type_name
       FROM user_outgoing uo
       JOIN outgoing_types ot ON uo.type_id = ot.id
       WHERE uo.user_id = ?
       ORDER BY uo.entry_date DESC, uo.id DESC`,
      [userId]
    );

    const editing = entries.find((e) => e.id === Number(req.params.id));
    if (!editing) {
      return res.redirect('/outgoing?error=Outgoing not found');
    }

    res.render('outgoing/index', {
      title: 'Outgoings',
      entries,
      types,
      errors: [],
      editing,
      form: null,
    });
  } catch (err) {
    console.error(err);
    res.redirect('/outgoing?error=Could not load outgoing');
  }
});

router.post('/:id', requireAuth, entryValidation, async (req, res) => {
  const errors = validationResult(req);
  const userId = req.user.id;
  const types = await getOutgoingTypes(userId);

  if (errors.isEmpty()) {
    const typeOwned = types.some((t) => t.id === Number(req.body.type_id));
    if (!typeOwned) {
      errors.errors.push({ msg: 'Invalid type selected' });
    }
  }

  if (!errors.isEmpty()) {
    const [entries] = await pool.query(
      `SELECT uo.*, ot.name AS type_name
       FROM user_outgoing uo
       JOIN outgoing_types ot ON uo.type_id = ot.id
       WHERE uo.user_id = ?
       ORDER BY uo.entry_date DESC, uo.id DESC`,
      [userId]
    );

    return res.status(400).render('outgoing/index', {
      title: 'Outgoings',
      entries,
      types,
      errors: errors.array(),
      formatGBP,
      editing: { id: Number(req.params.id), ...req.body },
      form: req.body,
    });
  }

  try {
    const [result] = await pool.query(
      `UPDATE user_outgoing
       SET type_id = ?, amount = ?, description = ?, entry_date = ?
       WHERE id = ? AND user_id = ?`,
      [
        req.body.type_id,
        req.body.amount,
        req.body.description?.trim() || null,
        req.body.entry_date,
        req.params.id,
        userId,
      ]
    );

    if (result.affectedRows === 0) {
      return res.redirect('/outgoing?error=Outgoing not found');
    }

    res.redirect('/outgoing?success=Outgoing updated');
  } catch (err) {
    console.error(err);
    res.redirect('/outgoing?error=Could not update outgoing');
  }
});

router.post('/:id/delete', requireAuth, async (req, res) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM user_outgoing WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.redirect('/outgoing?error=Outgoing not found');
    }

    res.redirect('/outgoing?success=Outgoing deleted');
  } catch (err) {
    console.error(err);
    res.redirect('/outgoing?error=Could not delete outgoing');
  }
});

module.exports = router;