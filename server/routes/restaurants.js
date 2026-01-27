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
      `SELECT id, outlet_name, area, city, pincode, latitude, longitude, created_at 
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
      `SELECT id, outlet_name, area, city, pincode, latitude, longitude, created_at 
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

// Create new restaurant
router.post('/', async (req, res) => {
  try {
    const { outlet_name, area, city, pincode, latitude, longitude } = req.body;
    const userId = req.user?.id;

    if (!outlet_name) {
      return res.status(400).json({ error: 'Outlet name is required' });
    }

    // Check for duplicate outlet name
    const existing = await pool.query(
      'SELECT id FROM restaurants WHERE user_id = $1 AND LOWER(outlet_name) = $2',
      [userId, outlet_name.toLowerCase()]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Restaurant with this name already exists' });
    }

    const result = await pool.query(
      `INSERT INTO restaurants (outlet_name, area, city, pincode, latitude, longitude, user_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING id, outlet_name, area, city, pincode, latitude, longitude, created_at`,
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

    // Check for duplicate name (excluding current restaurant)
    const existing = await pool.query(
      'SELECT id FROM restaurants WHERE user_id = $1 AND LOWER(outlet_name) = $2 AND id != $3',
      [userId, outlet_name.toLowerCase(), id]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Restaurant with this name already exists' });
    }

    const result = await pool.query(
      `UPDATE restaurants 
       SET outlet_name = $1, area = $2, city = $3, pincode = $4, latitude = $5, longitude = $6, updated_at = CURRENT_TIMESTAMP
       WHERE id = $7 AND user_id = $8 
       RETURNING id, outlet_name, area, city, pincode, latitude, longitude, created_at`,
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

