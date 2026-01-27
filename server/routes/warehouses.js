import express from 'express';
import pool from '../database/connection.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/', async (req, res) => {
  try {
    const userId = req.user?.id;
    const result = await pool.query(
      `SELECT * FROM warehouses WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching warehouses:', error);
    res.status(500).json({ error: 'Failed to fetch warehouses' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const result = await pool.query(
      'SELECT * FROM warehouses WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Warehouse not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching warehouse:', error);
    res.status(500).json({ error: 'Failed to fetch warehouse' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, state, rent_type, address, latitude, longitude } = req.body;
    const userId = req.user?.id;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Warehouse name is required' });
    }

    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    const existing = await pool.query(
      'SELECT id FROM warehouses WHERE user_id = $1 AND LOWER(name) = $2',
      [userId, name.trim().toLowerCase()]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Warehouse with this name already exists' });
    }

    const result = await pool.query(
      `INSERT INTO warehouses (name, state, rent_type, address, latitude, longitude, user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [name.trim(), state || '', rent_type || 'WH Rent', address || '', latitude, longitude, userId]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating warehouse:', error);
    res.status(500).json({ error: 'Failed to create warehouse' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, state, rent_type, address, latitude, longitude } = req.body;
    const userId = req.user?.id;
    
    const currentWarehouse = await pool.query(
      'SELECT * FROM warehouses WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    
    if (currentWarehouse.rows.length === 0) {
      return res.status(404).json({ error: 'Warehouse not found' });
    }

    if (name && name.trim().toLowerCase() !== currentWarehouse.rows[0].name.toLowerCase()) {
      const existing = await pool.query(
        'SELECT id FROM warehouses WHERE user_id = $1 AND LOWER(name) = $2 AND id != $3',
        [userId, name.trim().toLowerCase(), id]
      );
      if (existing.rows.length > 0) {
        return res.status(400).json({ error: 'Warehouse with this name already exists' });
      }
    }

    const result = await pool.query(
      `UPDATE warehouses 
       SET name = COALESCE($1, name), 
           state = COALESCE($2, state), 
           rent_type = COALESCE($3, rent_type), 
           address = COALESCE($4, address), 
           latitude = COALESCE($5, latitude), 
           longitude = COALESCE($6, longitude),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7 AND user_id = $8
       RETURNING *`,
      [name, state, rent_type, address, latitude, longitude, id, userId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating warehouse:', error);
    res.status(500).json({ error: 'Failed to update warehouse' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    
    const warehouseRes = await pool.query(
      'SELECT * FROM warehouses WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    
    if (warehouseRes.rows.length === 0) {
      return res.status(404).json({ error: 'Warehouse not found' });
    }

    const result = await pool.query(
      'DELETE FROM warehouses WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, userId]
    );

    res.json({ message: 'Warehouse deleted successfully', warehouse: result.rows[0] });
  } catch (error) {
    console.error('Error deleting warehouse:', error);
    res.status(500).json({ error: 'Failed to delete warehouse' });
  }
});

export default router;
