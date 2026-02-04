import express from 'express';
import pool from '../database/connection.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

// Get all restaurants
router.get('/', async (req, res) => {
  try {
    const userId = req.user?.id;
    const result = await pool.query(
      `SELECT id, outlet_name, area, city, pincode, latitude, longitude, uco_pickup_history, created_at 
       FROM restaurants WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching restaurants:', err);
    res.status(500).json({ error: 'Failed to fetch restaurants' });
  }
});

// Get restaurant by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const result = await pool.query(
      `SELECT id, outlet_name, area, city, pincode, latitude, longitude, uco_pickup_history, created_at 
       FROM restaurants WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching restaurant:', err);
    res.status(500).json({ error: 'Failed to fetch restaurant' });
  }
});

// Add UCO pickup amount to restaurant's history (backend-only)
router.post('/:id/uco-history', async (req, res) => {
  try {
    const { id } = req.params;
    const { amount } = req.body;
    const userId = req.user?.id;

    if (amount === undefined || amount === null) {
      return res.status(400).json({ error: 'Amount is required' });
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount)) {
      return res.status(400).json({ error: 'Amount must be a valid number' });
    }

    const result = await pool.query(
      `UPDATE restaurants 
       SET uco_pickup_history = COALESCE(uco_pickup_history, ARRAY[]::INTEGER[]) || $1::INTEGER, 
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND user_id = $3 
       RETURNING id, outlet_name, uco_pickup_history`,
      [numericAmount, id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    res.json({
      message: 'UCO pickup amount added to history',
      restaurant: result.rows[0]
    });
  } catch (err) {
    console.error('Error adding UCO history:', err);
    res.status(500).json({ error: 'Failed to add UCO history' });
  }
});

// Create new restaurant
router.post('/', async (req, res) => {
  try {
    const { outlet_name, area, city, pincode, latitude, longitude } = req.body;
    const userId = req.user?.id;

    if (!outlet_name) {
      return res.status(400).json({ error: 'Outlet name is required' });
    }

    // Check for duplicate outlet name with same pincode (composite unique constraint)
    const existing = await pool.query(
      'SELECT id FROM restaurants WHERE user_id = $1 AND LOWER(outlet_name) = $2 AND (pincode = $3 OR (pincode IS NULL AND $3 IS NULL))',
      [userId, outlet_name.toLowerCase(), pincode || null]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Restaurant with this name and pincode already exists' });
    }

    const result = await pool.query(
      `INSERT INTO restaurants (outlet_name, area, city, pincode, latitude, longitude, user_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING id, outlet_name, area, city, pincode, latitude, longitude, uco_pickup_history, created_at`,
      [outlet_name, area || '', city || '', pincode || null, latitude || null, longitude || null, userId]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating restaurant:', err);
    res.status(500).json({ error: 'Failed to create restaurant' });
  }
});

// Update restaurant
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { outlet_name, area, city, pincode, latitude, longitude } = req.body;
    const userId = req.user?.id;

    if (!outlet_name) {
      return res.status(400).json({ error: 'Outlet name is required' });
    }

    // Check for duplicate name with same pincode (excluding current restaurant)
    const existing = await pool.query(
      'SELECT id FROM restaurants WHERE user_id = $1 AND LOWER(outlet_name) = $2 AND (pincode = $3 OR (pincode IS NULL AND $3 IS NULL)) AND id != $4',
      [userId, outlet_name.toLowerCase(), pincode || null, id]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Restaurant with this name and pincode already exists' });
    }

    const result = await pool.query(
      `UPDATE restaurants 
       SET outlet_name = $1, area = $2, city = $3, pincode = $4, latitude = $5, longitude = $6, updated_at = CURRENT_TIMESTAMP
       WHERE id = $7 AND user_id = $8 
       RETURNING id, outlet_name, area, city, pincode, latitude, longitude, uco_pickup_history, created_at`,
      [outlet_name, area || '', city || '', pincode || null, latitude || null, longitude || null, id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating restaurant:', err);
    res.status(500).json({ error: 'Failed to update restaurant' });
  }
});

// Delete restaurant
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const result = await pool.query('DELETE FROM restaurants WHERE id = $1 AND user_id = $2 RETURNING id', [id, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    res.json({ message: 'Restaurant deleted successfully' });
  } catch (err) {
    console.error('Error deleting restaurant:', err);
    res.status(500).json({ error: 'Failed to delete restaurant' });
  }
});

export default router;

