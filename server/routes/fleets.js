import express from 'express';
import pool from '../database/connection.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

// Get all fleets for the current user with warehouse info
router.get('/', async (req, res) => {
  try {
    const userId = req.user?.id;
    const result = await pool.query(
      `SELECT f.*, w.name as warehouse_name 
       FROM fleets f 
       LEFT JOIN warehouses w ON f.warehouse_id = w.id 
       WHERE f.user_id = $1 
       ORDER BY w.name ASC, f.created_at DESC`,
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching fleets:', error);
    res.status(500).json({ error: 'Failed to fetch fleets' });
  }
});

// Get fleets grouped by warehouse
router.get('/grouped-by-warehouse', async (req, res) => {
  try {
    const userId = req.user?.id;
    const result = await pool.query(
      `SELECT 
         w.id as warehouse_id,
         w.name as warehouse_name,
         w.latitude,
         w.longitude,
         json_agg(
           json_build_object(
             'id', f.id,
             'vehicle', f.vehicle,
             'vehicle_type', f.vehicle_type,
             'count', f.count,
             'capacity', f.capacity,
             'fuel_type', f.fuel_type,
             'available', f.available,
             'created_at', f.created_at
           )
         ) FILTER (WHERE f.id IS NOT NULL) as fleets
       FROM warehouses w
       LEFT JOIN fleets f ON f.warehouse_id = w.id AND f.user_id = $1
       WHERE w.user_id = $1
       GROUP BY w.id, w.name, w.latitude, w.longitude
       ORDER BY w.name ASC`,
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching fleets by warehouse:', error);
    res.status(500).json({ error: 'Failed to fetch fleets' });
  }
});

// Get a single fleet by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const result = await pool.query(
      `SELECT f.*, w.name as warehouse_name 
       FROM fleets f 
       LEFT JOIN warehouses w ON f.warehouse_id = w.id 
       WHERE f.id = $1 AND f.user_id = $2`,
      [id, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Fleet not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching fleet:', error);
    res.status(500).json({ error: 'Failed to fetch fleet' });
  }
});

// Create a new fleet
router.post('/', async (req, res) => {
  try {
    const { vehicle, vehicle_type, count, capacity, fuel_type, warehouse_id, available } = req.body;
    const userId = req.user?.id;
    
    if (!vehicle || !vehicle.trim()) {
      return res.status(400).json({ error: 'Vehicle name is required' });
    }

    if (!vehicle_type || !vehicle_type.trim()) {
      return res.status(400).json({ error: 'Vehicle type is required' });
    }

    if (count === undefined || count === null) {
      return res.status(400).json({ error: 'Count is required' });
    }

    if (available === undefined || available === null) {
      return res.status(400).json({ error: 'Available count is required' });
    }

    if (available > count) {
      return res.status(400).json({ error: 'Available count cannot be greater than total count' });
    }

    // Verify warehouse exists if warehouse_id is provided
    if (warehouse_id) {
      const warehouseCheck = await pool.query(
        'SELECT id FROM warehouses WHERE id = $1 AND user_id = $2',
        [warehouse_id, userId]
      );
      if (warehouseCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid warehouse_id' });
      }
    }

    const result = await pool.query(
      `INSERT INTO fleets (vehicle, vehicle_type, count, capacity, fuel_type, warehouse_id, available, user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        vehicle.trim(),
        vehicle_type.trim(),
        count,
        capacity || null,
        fuel_type ? fuel_type.trim() : null,
        warehouse_id || null,
        available,
        userId
      ]
    );

    // Fetch the created fleet with warehouse name
    const createdFleet = await pool.query(
      `SELECT f.*, w.name as warehouse_name 
       FROM fleets f 
       LEFT JOIN warehouses w ON f.warehouse_id = w.id 
       WHERE f.id = $1`,
      [result.rows[0].id]
    );

    res.status(201).json(createdFleet.rows[0]);
  } catch (error) {
    console.error('Error creating fleet:', error);
    res.status(500).json({ error: 'Failed to create fleet' });
  }
});

// Update a fleet
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { vehicle, vehicle_type, count, capacity, fuel_type, warehouse_id, available } = req.body;
    const userId = req.user?.id;
    
    const currentFleet = await pool.query(
      'SELECT * FROM fleets WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    
    if (currentFleet.rows.length === 0) {
      return res.status(404).json({ error: 'Fleet not found' });
    }

    // Validate available <= count
    const newCount = count !== undefined ? count : currentFleet.rows[0].count;
    const newAvailable = available !== undefined ? available : currentFleet.rows[0].available;
    if (newAvailable > newCount) {
      return res.status(400).json({ error: 'Available count cannot be greater than total count' });
    }

    // Verify warehouse exists if warehouse_id is provided
    if (warehouse_id) {
      const warehouseCheck = await pool.query(
        'SELECT id FROM warehouses WHERE id = $1 AND user_id = $2',
        [warehouse_id, userId]
      );
      if (warehouseCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid warehouse_id' });
      }
    }

    const result = await pool.query(
      `UPDATE fleets 
       SET vehicle = COALESCE($1, vehicle), 
           vehicle_type = COALESCE($2, vehicle_type), 
           count = COALESCE($3, count), 
           capacity = COALESCE($4, capacity), 
           fuel_type = COALESCE($5, fuel_type), 
           warehouse_id = COALESCE($6, warehouse_id),
           available = COALESCE($7, available),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $8 AND user_id = $9
       RETURNING *`,
      [vehicle, vehicle_type, count, capacity, fuel_type, warehouse_id, available, id, userId]
    );

    // Fetch the updated fleet with warehouse name
    const updatedFleet = await pool.query(
      `SELECT f.*, w.name as warehouse_name 
       FROM fleets f 
       LEFT JOIN warehouses w ON f.warehouse_id = w.id 
       WHERE f.id = $1`,
      [id]
    );

    res.json(updatedFleet.rows[0]);
  } catch (error) {
    console.error('Error updating fleet:', error);
    res.status(500).json({ error: 'Failed to update fleet' });
  }
});

// Delete a fleet
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    
    const fleetRes = await pool.query(
      'SELECT * FROM fleets WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    
    if (fleetRes.rows.length === 0) {
      return res.status(404).json({ error: 'Fleet not found' });
    }

    const result = await pool.query(
      'DELETE FROM fleets WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, userId]
    );

    res.json({ message: 'Fleet deleted successfully', fleet: result.rows[0] });
  } catch (error) {
    console.error('Error deleting fleet:', error);
    res.status(500).json({ error: 'Failed to delete fleet' });
  }
});

export default router;

