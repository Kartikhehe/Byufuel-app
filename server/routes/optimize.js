import express from 'express';
import pool from '../database/connection.js';
import { authenticateToken } from '../middleware/auth.js';
import axios from 'axios';

const router = express.Router();

router.use(authenticateToken);

// Route optimization endpoint using OR-Tools
router.post('/route', async (req, res) => {
  try {
    const { warehouses, fleets, restaurants } = req.body;
    const userId = req.user?.id;

    console.log('=== Route Optimization Request ===');
    console.log('Warehouses:', JSON.stringify(warehouses, null, 2));
    console.log('Fleets:', JSON.stringify(fleets, null, 2));
    console.log('Restaurants:', JSON.stringify(restaurants, null, 2));

    if (!warehouses || warehouses.length === 0) {
      console.log('ERROR: No warehouses provided');
      return res.status(400).json({ error: 'At least one warehouse is required' });
    }
    if (!restaurants || restaurants.length === 0) {
      console.log('ERROR: No restaurants provided');
      return res.status(400).json({ error: 'At least one restaurant is required' });
    }

    // Collect all fleet data
    let allFleets = [];
    fleets.forEach(warehouseFleet => {
      if (warehouseFleet.fleets) {
        warehouseFleet.fleets.forEach(fleet => {
          allFleets.push({
            id: fleet.id,
            name: fleet.vehicle,
            // Use capacity from fleet record, or calculate based on vehicle type if not available
            capacity: fleet.capacity || getDefaultCapacity(fleet.vehicle, fleet.vehicle_type),
            availableCount: fleet.availableCount,
            totalCount: fleet.totalCount,
            warehouseId: warehouseFleet.warehouseId,
            warehouseName: warehouseFleet.warehouseName
          });
        });
      }
    });

    console.log('Collected fleets:', JSON.stringify(allFleets, null, 2));

    // If no fleets specified, use all user's fleets
    if (allFleets.length === 0) {
      console.log('No fleets from frontend, querying database...');
      const fleetResult = await pool.query(
        `SELECT f.*, w.name as warehouse_name 
         FROM fleets f 
         LEFT JOIN warehouses w ON f.warehouse_id = w.id 
         WHERE f.user_id = $1 AND f.available > 0`,
        [userId]
      );
      console.log('Found fleets in DB:', fleetResult.rows.length);
      allFleets = fleetResult.rows.map(f => ({
        id: f.id,
        name: f.vehicle,
        capacity: f.capacity || getDefaultCapacity(f.vehicle, f.vehicle_type),
        availableCount: f.available,
        totalCount: f.count,
        warehouseId: f.warehouse_id,
        warehouseName: f.warehouse_name
      }));
    }

    if (allFleets.length === 0) {
      console.log('WARNING: No fleets available!');
    }

    // Prepare coordinates array: warehouses first, then restaurants
    const coords = [];
    const warehouseMap = new Map(); // warehouseId -> index in coords
    
    // Add warehouses
    warehouses.forEach((wh, index) => {
      coords.push([parseFloat(wh.longitude), parseFloat(wh.latitude)]);
      warehouseMap.set(wh.id, index);
    });

    // Add restaurants and parse constraints
    const restaurantCoords = [];
    restaurants.forEach((r, index) => {
      coords.push([parseFloat(r.longitude), parseFloat(r.latitude)]);
      
      // Parse time window to seconds relative to 8:00 AM (0 seconds)
      let parsedTimeWindow = null;
      if (r.timeWindow && r.timeWindow.start && r.timeWindow.end) {
        const parseTime = (t) => {
          const [h, m] = t.split(':').map(Number);
          return ((h - 8) * 3600) + (m * 60);
        };
        parsedTimeWindow = {
          start: parseTime(r.timeWindow.start),
          end: parseTime(r.timeWindow.end)
        };
      }

      restaurantCoords.push({
        index: coords.length - 1,
        priorityLevel: parseInt(r.priorityLevel) || 1, // Default to 1 (Normal)
        parsedTimeWindow: parsedTimeWindow,
        ...r
      });
    });

    // Get OpenRouteService API key from environment or config
    const ORS_API_KEY = process.env.ORS_API_KEY || 'your-ors-api-key';

    // Fetch distance and duration matrices
    const orsUrl = 'https://api.openrouteservice.org/v2/matrix/driving-car';
    const orsHeaders = {
      'Authorization': ORS_API_KEY,
      'Content-Type': 'application/json; charset=utf-8'
    };
    const orsBody = {
      locations: coords,
      metrics: ['distance', 'duration']
    };

    let distanceMatrix, durationMatrix;
    try {
      const orsResponse = await axios.post(orsUrl, orsBody, { headers: orsHeaders });
      distanceMatrix = orsResponse.data.distances;
      durationMatrix = orsResponse.data.durations;
    } catch (orsError) {
      console.error('ORS API Error:', orsError.response?.data || orsError.message);
      // Fallback: use Haversine distance
      distanceMatrix = createHaversineMatrix(coords);
      durationMatrix = createHaversineMatrix(coords, true);
    }

    // Build fleet data for OR-Tools
    const fleetData = [];
    allFleets.forEach((fleet, idx) => {
      const startWarehouseIndex = fleet.warehouseId ? warehouseMap.get(fleet.warehouseId) : 0;
      console.log(`Fleet "${fleet.name}": warehouseId=${fleet.warehouseId}, startWarehouseIndex=${startWarehouseIndex}, availableCount=${fleet.availableCount}, capacity=${fleet.capacity}`);
      
      if (startWarehouseIndex !== undefined) {
        // Create one entry per available vehicle
        for (let i = 0; i < fleet.availableCount; i++) {
          fleetData.push({
            name: `${fleet.name}_${i + 1}`,
            capacity: fleet.capacity,
            start: startWarehouseIndex,
            end: startWarehouseIndex,
            costFactor: getVehicleCostFactor(fleet.name)
          });
        }
      }
    });

    console.log('Total vehicles created:', fleetData.length);
    if (fleetData.length > 0) {
      console.log('Vehicle capacities:', fleetData.map(f => f.capacity));
    }

    // If no fleet available, create default fleet from warehouses
    if (fleetData.length === 0) {
      warehouses.forEach((wh, idx) => {
        fleetData.push({
          name: `Warehouse_${idx + 1}_Vehicle`,
          capacity: 800, // Default capacity
          start: idx,
          end: idx,
          costFactor: 3.0
        });
      });
    }

    // Build demand array (warehouses = 0, restaurants = amount in liters)
    const demands = [];
    const numWarehouses = warehouses.length;
    for (let i = 0; i < numWarehouses; i++) {
      demands.push(0);
    }
    restaurants.forEach(r => {
      const amount = parseFloat(r.amount) || 0;
      demands.push(amount); // Keep as liters - vehicle capacity is also in liters
    });

    console.log('Demands array:', demands);
    console.log('Total demand:', demands.reduce((a, b) => a + b, 0), 'liters');

    // Solve VRP using OR-Tools (simulated for Node.js)
    const solution = solveVRP(
      coords,
      distanceMatrix,
      durationMatrix,
      fleetData,
      demands,
      numWarehouses,
      warehouses,
      restaurantCoords
    );

    res.json({
      success: true,
      routes: solution.routes,
      summary: solution.summary,
      waypoints: coords.map((c, i) => ({
        index: i,
        longitude: c[0],
        latitude: c[1],
        type: i < numWarehouses ? 'warehouse' : 'restaurant',
        name: i < numWarehouses 
          ? warehouses[i]?.name 
          : restaurants[i - numWarehouses]?.name || `Restaurant ${i - numWarehouses + 1}`
      }))
    });
  } catch (error) {
    console.error('Route optimization error:', error);
    res.status(500).json({ error: 'Failed to optimize route: ' + error.message });
  }
});

// Add this below your existing router.post('/route', ...)

// Dynamic Reroute Endpoint
router.post('/dynamic-reroute', async (req, res) => {
  try {
    const { activeVehicles, unservedRestaurants, newPickup, warehouses, currentTimeSeconds } = req.body;

    console.log('=== Dynamic Reroute Request ===');

    const currentTime = parseInt(currentTimeSeconds) || 0; // start offset seconds

    // 1. Build Coordinates Array
    const coords = [];
    
    // Add vehicle current locations first (These act as the new "Start Depots")
    activeVehicles.forEach(v => coords.push([parseFloat(v.lng), parseFloat(v.lat)]));
    const vehicleOffset = coords.length;

    // Add warehouses (for the vehicles to return to at the end)
    warehouses.forEach(wh => coords.push([parseFloat(wh.longitude), parseFloat(wh.latitude)]));
    
    // Add unserved and new restaurants
    const combinedRestaurants = [...unservedRestaurants];
    if (newPickup) combinedRestaurants.push(newPickup);
    
    const restaurantCoords = [];
    combinedRestaurants.forEach((r, index) => {
      coords.push([parseFloat(r.longitude), parseFloat(r.latitude)]);
      restaurantCoords.push({
        index: coords.length - 1,
        priorityLevel: parseInt(r.priorityLevel) || (r.isNewUrgent ? 3 : 1), // Urgent pickups get Supreme priority
        parsedTimeWindow: r.parsedTimeWindow || null,
        name: r.name || r.outlet_name || `Restaurant ${index + 1}`, // <--- ADDED HERE
        address: r.address || r.area || '', // <--- ADDED HERE
        ...r
      });
    });

    // 2. Fetch ORS Matrix for the new current state...

    // 2. Fetch ORS Matrix for the new current state
    const ORS_API_KEY = process.env.ORS_API_KEY || 'your-ors-api-key';
    let distanceMatrix, durationMatrix;
    try {
      const orsResponse = await axios.post('https://api.openrouteservice.org/v2/matrix/driving-car', {
        locations: coords,
        metrics: ['distance', 'duration']
      }, {
        headers: { 'Authorization': ORS_API_KEY, 'Content-Type': 'application/json' }
      });
      distanceMatrix = orsResponse.data.distances;
      durationMatrix = orsResponse.data.durations;
    } catch (error) {
      console.warn('ORS failed, using Haversine fallback for reroute');
      distanceMatrix = createHaversineMatrix(coords);
      durationMatrix = createHaversineMatrix(coords, true);
    }

    // 3. Configure Fleet Data for the remaining journey
    // NOTE: This solver is greedy and only tracks loads via `demands`.
    // For live dispatch we MUST start from the vehicle's already-picked load.
    // So we pass `startLoad` and start `currentLoad` from it inside solveVRP.
    const fleetData = activeVehicles.map((v, idx) => ({
      name: v.name,
      capacity: v.totalCapacity - (v.startLoad ?? 0), // remaining capacity
      start: idx, // Start at their current GPS coordinate index
      end: vehicleOffset + warehouses.findIndex(wh => wh.id === v.warehouseId), // End at their original warehouse
      costFactor: getVehicleCostFactor(v.name),
      startTime: currentTime,
      startLoad: v.startLoad ?? v.currentLoad ?? 0
    }));

    // 4. Build Demands Array
    const demands = new Array(vehicleOffset + warehouses.length).fill(0); // Vehicles and warehouses have 0 demand
    combinedRestaurants.forEach(r => demands.push(parseFloat(r.amount) || 0));

    // 5. Run the existing solver
    const solution = solveVRP(
      coords,
      distanceMatrix,
      durationMatrix,
      fleetData,
      demands,
      vehicleOffset + warehouses.length, // Treat vehicles + warehouses as "depots"
      [...activeVehicles.map(v => ({ name: 'Current Location' })), ...warehouses],
      restaurantCoords
    );


    // FIX: Properly format the waypoints array with index, name, and type!
    res.json({
      success: true,
      routes: solution.routes,
      summary: solution.summary,
      waypoints: coords.map((c, i) => {
        let wpName = 'Unknown';
        let wpType = 'unknown';

        if (i < vehicleOffset) {
          wpName = 'Current GPS Location';
          wpType = 'warehouse';
        } else if (i < vehicleOffset + warehouses.length) {
          wpName = warehouses[i - vehicleOffset]?.name || 'Warehouse';
          wpType = 'warehouse';
        } else {
          const rData = combinedRestaurants[i - (vehicleOffset + warehouses.length)];
          wpName = rData?.name || rData?.outlet_name || `Restaurant ${i - (vehicleOffset + warehouses.length) + 1}`;
          wpType = 'restaurant';
        }

        return {
          index: i,
          longitude: c[0],
          latitude: c[1],
          type: wpType,
          name: wpName
        };
      })
    });

  } catch (error) {
    console.error('Dynamic Reroute Error:', error);
    res.status(500).json({ error: 'Failed to reroute: ' + error.message });
  }
});

// Helper function to determine vehicle cost factor
function getVehicleCostFactor(vehicleName) {
  const name = vehicleName.toLowerCase();
  if (name.includes('moped')) return 2.17;
  if (name.includes('intra')) return 3.52;
  if (name.includes('bolero')) return 5.34;
  if (name.includes('maxima')) return 2.65;
  return 3.0; // Default cost factor
}

// Helper function to get default capacity based on vehicle type
function getDefaultCapacity(vehicleName, vehicleType) {
  const name = vehicleName.toLowerCase();
  const type = vehicleType?.toLowerCase() || '';
  
  if (type.includes('2 wheeler') || name.includes('moped')) return 50; 
  if (name.includes('intra') || name.includes('maxima')) return 300;
  if (name.includes('bolero') || type.includes('4 wheeler')) return 500;
  return 200; 
}

// Create Haversine distance matrix (fallback)
function createHaversineMatrix(coords, asDuration = false) {
  const n = coords.length;
  const matrix = Array(n).fill(null).map(() => Array(n).fill(0));
  const R = 6371; // Earth's radius in km
  const avgSpeed = asDuration ? 30 : 1; // km/h for duration

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i !== j) {
        const [lon1, lat1] = coords[i];
        const [lon2, lat2] = coords[j];
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c; // km
        
        if (asDuration) {
          matrix[i][j] = (distance / avgSpeed) * 3600; // seconds
        } else {
          matrix[i][j] = distance * 1000; // meters
        }
      }
    }
  }
  return matrix;
}

// Solve VRP (simplified implementation for Node.js)
// Solve VRP (Parallel Concurrent Implementation for Node.js)
function solveVRP(coords, distanceMatrix, durationMatrix, fleetData, demands, numWarehouses, warehouses, restaurantCoords) {
  console.log('=== Starting Parallel VRP Solver ===');
  
  const n = coords.length;
  const unassigned = new Set();
  for (let i = numWarehouses; i < n; i++) {
    unassigned.add(i);
  }

  // 1. Initialize all vehicles concurrently
  const vStates = fleetData.map(v => ({
    ...v,
    currentLocation: v.start,
    // live dispatch must start with the load already picked up before reroute
    currentLoad: v.startLoad ?? 0,
    cumulativeTime: v.startTime || 0,
    route: {
      vehicleName: v.name,
      warehouse: v.start,
      warehouseName: warehouses[v.start]?.name || 'Unknown Warehouse',
      stops: [{

        index: v.start,
        type: 'warehouse',
        name: v.startTime ? 'Current GPS Location' : (warehouses[v.start]?.name || 'Warehouse'),
        arrivalTime: formatTime(v.startTime || 0),
        cumulativeSeconds: v.startTime || 0,
        // live dispatch must reflect already-picked-up load at reroute time
        load: v.startLoad ?? 0
      }],
      distance: 0,
      load: 0,
      cost: 0
    }
  }));

  let progress = true;

  // 2. Parallel Greedy Assignment
  // Every vehicle competes for the absolute best next stop globally
  while (unassigned.size > 0 && progress) {
    progress = false;

    let bestVehicleIdx = -1;
    let bestStop = null;
    let bestScore = Infinity;
    let bestArrivalTime = 0;
    let bestWaitTime = 0;

    for (let vIdx = 0; vIdx < vStates.length; vIdx++) {
      const vState = vStates[vIdx];

      for (const idx of unassigned) {
        const rData = restaurantCoords[idx - numWarehouses];
        const demand = demands[idx];
        const priority = rData.priorityLevel || 1;

        if (vState.currentLoad + demand > vState.capacity) continue;

        const timeTo = durationMatrix[vState.currentLocation][idx];
        let arrival = vState.cumulativeTime + timeTo;
        let wait = 0;

        const tw = rData.parsedTimeWindow;
        if (tw) {
          if (arrival > tw.end) continue;
          if (arrival < tw.start) {
            wait = tw.start - arrival;
            arrival = tw.start;
          }
        }

        const returnTime = durationMatrix[idx][vState.end];
        if (arrival + 900 + returnTime > 43200) continue; // 12-hour constraint

        // Tier multipliers: Supreme (3) is heavily favored
        let tierMultiplier = priority === 3 ? 0.01 : (priority === 2 ? 0.3 : 1.0);
        
        // The score factors in the vehicle's specific cost! (Prefers cheaper vehicles for close stops)
        let score = (timeTo + (wait * 1.5)) * tierMultiplier * vState.costFactor;

        if (score < bestScore) {
          bestScore = score;
          bestStop = idx;
          bestVehicleIdx = vIdx;
          bestArrivalTime = arrival;
          bestWaitTime = wait;
        }
      }
    }

    // 3. Execute the absolute best move
    if (bestStop !== null) {
      const vState = vStates[bestVehicleIdx];
      
      vState.currentLoad += demands[bestStop];
      vState.cumulativeTime = bestArrivalTime + 900; // Adds the 15-minute service time
      
      vState.route.load = vState.currentLoad;
      vState.route.distance += distanceMatrix[vState.currentLocation][bestStop];
      
      vState.route.stops.push({
        index: bestStop,
        type: 'restaurant',
        name: restaurantCoords[bestStop - numWarehouses]?.name || `Restaurant ${bestStop - numWarehouses + 1}`,
        address: restaurantCoords[bestStop - numWarehouses]?.address || '',
        arrivalTime: formatTime(bestArrivalTime),
        cumulativeSeconds: vState.cumulativeTime,
        load: vState.currentLoad,
        waited: bestWaitTime > 0 ? `${Math.round(bestWaitTime/60)}m` : '0m',
        priorityLevel: restaurantCoords[bestStop - numWarehouses]?.priorityLevel
      });

      vState.currentLocation = bestStop;
      unassigned.delete(bestStop);
      progress = true; 
    }
  }

  // 4. Finalize all active routes (Return to Warehouse)
  const routes = [];
  let totalDistance = 0;
  let totalLoad = 0;
  let totalCost = 0;

  vStates.forEach(vState => {
    // If vehicle did work, OR if it's currently stranded on the road (Current GPS != End Warehouse)
    if (vState.route.stops.length > 1 || vState.currentLocation !== vState.end) {
      const returnDist = distanceMatrix[vState.currentLocation][vState.end];
      const returnTime = durationMatrix[vState.currentLocation][vState.end];
      
      vState.route.distance += returnDist;
      vState.route.cost = vState.route.distance * vState.costFactor / 1000;
      
      totalDistance += vState.route.distance;
      totalCost += vState.route.cost;
      
      const returnCumulativeTime = vState.cumulativeTime + returnTime;
      
      vState.route.stops.push({
        index: vState.end,
        type: 'warehouse',
        name: warehouses[vState.end]?.name || 'Warehouse',
        arrivalTime: formatTime(returnCumulativeTime),
        cumulativeSeconds: returnCumulativeTime,
        // end-of-route: load is delivered back/emptied at warehouse
        load: 0
      });
      
      routes.push(vState.route);
    } else {
      // Vehicle is empty and sitting at the original warehouse (Completely unused)
      routes.push({
        ...vState.route,
        warning: 'No task assigned'
      });
    }
  });

  // 5. Unassigned Summary
  if (unassigned.size > 0) {
    const remainingRestaurants = Array.from(unassigned);
    const totalDemand = remainingRestaurants.reduce((sum, idx) => sum + demands[idx], 0);
    routes.push({
      vehicleName: 'Unassigned',
      warehouse: null,
      stops: remainingRestaurants.map(idx => ({
        index: idx,
        type: 'restaurant',
        name: restaurantCoords[idx - numWarehouses]?.name || `Restaurant`,
        load: demands[idx]
      })),
      distance: 0, load: totalDemand, cost: 0,
      warning: 'Could not assign all restaurants to available fleet'
    });
  }

  return {
    routes,
    summary: {
      totalRoutes: routes.length,
      totalDistance: totalDistance / 1000,
      totalLoad: totalLoad,
      totalCost: totalCost,
      unassignedCount: unassigned.size
    }
  };
}

// Helper function to format time from seconds (8:00 AM base)
function formatTime(seconds) {
  const baseHour = 8;
  const totalMinutes = Math.round(seconds / 60);
  const hours = baseHour + Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  if (hours >= 24) {
    return `Next day ${(hours - 24).toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

export default router;