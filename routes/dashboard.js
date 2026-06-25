const express = require('express');
const pool = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const { formatGBP } = require('../utils/format');

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    const [[incomingTotal]] = await pool.query(
      'SELECT COALESCE(SUM(amount), 0) AS total FROM user_incoming WHERE user_id = ?',
      [userId]
    );
    const [[outgoingTotal]] = await pool.query(
      'SELECT COALESCE(SUM(amount), 0) AS total FROM user_outgoing WHERE user_id = ?',
      [userId]
    );

    const totalIncomings = Number(incomingTotal.total);
    const totalOutgoings = Number(outgoingTotal.total);
    const balance = totalIncomings - totalOutgoings;

    const [recentIncomings] = await pool.query(
      `SELECT ui.id, ui.amount, ui.description, ui.entry_date, it.name AS type_name, 'incoming' AS kind
       FROM user_incoming ui
       JOIN incoming_types it ON ui.type_id = it.id
       WHERE ui.user_id = ?
       ORDER BY ui.entry_date DESC, ui.id DESC
       LIMIT 5`,
      [userId]
    );

    const [recentOutgoings] = await pool.query(
      `SELECT uo.id, uo.amount, uo.description, uo.entry_date, ot.name AS type_name, 'outgoing' AS kind
       FROM user_outgoing uo
       JOIN outgoing_types ot ON uo.type_id = ot.id
       WHERE uo.user_id = ?
       ORDER BY uo.entry_date DESC, uo.id DESC
       LIMIT 5`,
      [userId]
    );

    const recent = [...recentIncomings, ...recentOutgoings]
      .sort((a, b) => {
        const dateDiff = new Date(b.entry_date) - new Date(a.entry_date);
        return dateDiff !== 0 ? dateDiff : b.id - a.id;
      })
      .slice(0, 10);

    res.render('dashboard', {
      title: 'Dashboard',
      totalIncomings,
      totalOutgoings,
      balance,
      recent,
      formatGBP,
    });
  } catch (err) {
    console.error(err);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Could not load dashboard.',
    });
  }
});

module.exports = router;