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
function solveVRP(coords, distanceMatrix, durationMatrix, fleetData, demands, numWarehouses, warehouses, restaurantCoords) {
  console.log('=== Starting VRP Solver ===');
  console.log('Total locations:', coords.length);
  console.log('Warehouses:', numWarehouses);
  console.log('Restaurants:', coords.length - numWarehouses);
  console.log('Fleet size:', fleetData.length);
  console.log('Demands:', demands);
  
  const n = coords.length;
  const routes = [];
  let totalDistance = 0;
  let totalLoad = 0;
  let totalCost = 0;

  // Sort fleet by capacity (smallest first for efficiency)
  const sortedFleet = [...fleetData].sort((a, b) => a.capacity - b.capacity);

  // Track unassigned restaurants
  const unassigned = new Set();
  for (let i = numWarehouses; i < n; i++) {
    unassigned.add(i);
  }
  console.log('Initial unassigned count:', unassigned.size);

  // Greedy assignment for each vehicle
  sortedFleet.forEach((vehicle, vehicleIdx) => {
    console.log(`Processing vehicle ${vehicleIdx + 1}/${sortedFleet.length}: ${vehicle.name} (capacity: ${vehicle.capacity})`);
    
    const route = {
      vehicleName: vehicle.name,
      warehouse: vehicle.start,
      warehouseName: warehouses[vehicle.start]?.name || 'Unknown Warehouse',
      stops: [],
      distance: 0,
      load: 0,
      cost: 0
    };

    let currentLoad = 0;
    let currentLocation = vehicle.start;
    let cumulativeTime = 0; // Time in seconds from start (8:00 AM)
    let assignedCount = 0;

    // Add departure time from warehouse (EXACTLY ONCE)
    route.stops.push({
      index: vehicle.start,
      type: 'warehouse',
      name: warehouses[vehicle.start]?.name || 'Warehouse',
      arrivalTime: formatTime(0), // 8:00 AM
      cumulativeSeconds: 0,
      load: 0
    });

    while (unassigned.size > 0) {
      let bestStop = null;
      let bestArrivalTime = 0;
      let bestWaitTime = 0;

      // --- PHASE 1: "Immediate Supreme" Override ---
      let immediateSupremeStop = null;
      let immediateSupremeScore = Infinity;

      for (const idx of unassigned) {
        const rData = restaurantCoords[idx - numWarehouses];
        if (rData.priorityLevel === 3 && !rData.parsedTimeWindow) {
          const demand = demands[idx];
          if (currentLoad + demand <= vehicle.capacity) {
            const timeTo = durationMatrix[currentLocation][idx];
            const returnTime = durationMatrix[idx][vehicle.end];
            if (cumulativeTime + timeTo + 900 + returnTime <= 43200) {
              if (timeTo < immediateSupremeScore) {
                immediateSupremeScore = timeTo;
                immediateSupremeStop = idx;
              }
            }
          }
        }
      }

      if (immediateSupremeStop !== null) {
        bestStop = immediateSupremeStop;
        bestArrivalTime = cumulativeTime + immediateSupremeScore;
        bestWaitTime = 0;
      } else {
        // --- PHASE 2: Find the "Priority Anchor" ---
        let anchor = null;
        let anchorScore = Infinity;

        for (let tier = 3; tier >= 2; tier--) {
          for (const idx of unassigned) {
            const rData = restaurantCoords[idx - numWarehouses];
            if (rData.priorityLevel !== tier || !rData.parsedTimeWindow) continue;
            
            const demand = demands[idx];
            if (currentLoad + demand > vehicle.capacity) continue;
            
            const tw = rData.parsedTimeWindow;
            const timeTo = durationMatrix[currentLocation][idx];
            let arrival = cumulativeTime + timeTo;
            
            if (arrival > tw.end) continue; 
            
            let wait = arrival < tw.start ? tw.start - arrival : 0;
            let score = timeTo + wait; 
            
            if (score < anchorScore) {
              anchorScore = score;
              anchor = { idx, demand, tw, arrival, wait };
            }
          }
          if (anchor) break; 
        }

        // --- PHASE 3: Smart Interleaving & Nearest Neighbor ---
        let bestScore = Infinity;

        for (const idx of unassigned) {
          const rData = restaurantCoords[idx - numWarehouses];
          const demand = demands[idx];
          const priority = rData.priorityLevel || 1;

          if (currentLoad + demand > vehicle.capacity) continue;

          const timeTo = durationMatrix[currentLocation][idx];
          let arrival = cumulativeTime + timeTo;
          let wait = 0;
          const tw = rData.parsedTimeWindow;

          if (tw) {
            if (arrival > tw.end) continue;
            if (arrival < tw.start) {
              wait = tw.start - arrival;
              arrival = tw.start;
            }
          }

          if (anchor && anchor.idx !== idx) {
            if (currentLoad + demand + anchor.demand > vehicle.capacity) continue;
            const timeToAnchor = durationMatrix[idx][anchor.idx];
            const arrivalAtAnchor = arrival + 900 + timeToAnchor; 
            if (arrivalAtAnchor > anchor.tw.end) continue; 
          }

          const returnTime = durationMatrix[idx][vehicle.end];
          if (arrival + 900 + returnTime > 43200) continue;

          let tierMultiplier = priority === 3 ? 0.1 : (priority === 2 ? 0.4 : 1.0);
          let score = (timeTo + (wait * 1.5)) * tierMultiplier;

          if (score < bestScore) {
            bestScore = score;
            bestStop = idx;
            bestArrivalTime = arrival;
            bestWaitTime = wait;
          }
        }
      }

      // --- EXECUTE STOP ---
      if (bestStop === null) break; 
      
      currentLoad += demands[bestStop];
      totalLoad += demands[bestStop];
      cumulativeTime = bestArrivalTime + 900; 

      route.load = currentLoad;
      route.distance += distanceMatrix[currentLocation][bestStop];
      
      route.stops.push({
        index: bestStop,
        type: 'restaurant',
        name: restaurantCoords[bestStop - numWarehouses]?.name || `Restaurant ${bestStop - numWarehouses + 1}`,
        address: restaurantCoords[bestStop - numWarehouses]?.address || '',
        arrivalTime: formatTime(bestArrivalTime),
        cumulativeSeconds: cumulativeTime,
        load: currentLoad,
        waited: bestWaitTime > 0 ? `${Math.round(bestWaitTime/60)}m` : '0m',
        priorityLevel: restaurantCoords[bestStop - numWarehouses]?.priorityLevel
      });

      currentLocation = bestStop;
      unassigned.delete(bestStop);
      assignedCount++; // Tracking for the logs
    }

    console.log(`  Vehicle ${vehicle.name}: assigned ${assignedCount} restaurants`);

    // Return to depot - ONLY if we have assigned restaurants
    if (route.stops.length > 1) { 
      const returnDist = distanceMatrix[currentLocation][vehicle.end];
      const returnTime = durationMatrix[currentLocation][vehicle.end];
      route.distance += returnDist;
      route.cost = route.distance * vehicle.costFactor / 1000;
      totalDistance += route.distance;
      totalCost += route.cost;
      
      // Add return to warehouse
      const returnCumulativeTime = cumulativeTime + returnTime;
      route.stops.push({
        index: vehicle.end,
        type: 'warehouse',
        name: warehouses[vehicle.end]?.name || 'Warehouse',
        arrivalTime: formatTime(returnCumulativeTime),
        cumulativeSeconds: returnCumulativeTime,
        load: 0
      });
      
      routes.push(route);
    }
  });

  console.log('Final unassigned count:', unassigned.size);

  // Track all vehicles that got no assignments (empty routes)
  const emptyVehicles = sortedFleet.filter(vehicle => {
    return !routes.some(r => r.vehicleName === vehicle.name);
  });

  // Add empty vehicles as "No Task" routes
  emptyVehicles.forEach(vehicle => {
    const warehouseIndex = vehicle.start;
    routes.push({
      vehicleName: vehicle.name,
      warehouse: warehouseIndex,
      warehouseName: warehouses[warehouseIndex]?.name || 'Unknown Warehouse',
      stops: [{
        index: warehouseIndex,
        type: 'warehouse',
        name: warehouses[warehouseIndex]?.name || 'Warehouse',
        arrivalTime: formatTime(0),
        cumulativeSeconds: 0,
        load: 0
      }],
      distance: 0,
      load: 0,
      cost: 0,
      warning: 'No task assigned'
    });
  });

  // If restaurants remain unassigned, create a summary
  if (unassigned.size > 0) {
    const remainingRestaurants = Array.from(unassigned);
    const totalDemand = remainingRestaurants.reduce((sum, idx) => sum + demands[idx], 0);
    
    routes.push({
      vehicleName: 'Unassigned',
      warehouse: null,
      warehouseName: null,
      stops: remainingRestaurants.map(idx => ({
        index: idx,
        type: 'restaurant',
        name: restaurantCoords[idx - numWarehouses]?.name || `Restaurant ${idx - numWarehouses + 1}`,
        address: restaurantCoords[idx - numWarehouses]?.address || '',
        arrivalTime: null,
        cumulativeSeconds: null,
        load: demands[idx]
      })),
      distance: 0,
      load: totalDemand,
      cost: 0,
      warning: 'Could not assign all restaurants to available fleet'
    });
  }

  console.log('=== VRP Solver Complete ===');
  console.log('Total routes:', routes.length);
  console.log('Assigned routes:', routes.filter(r => r.vehicleName !== 'Unassigned').length);
  console.log('Unassigned routes:', routes.filter(r => r.vehicleName === 'Unassigned').length);

  return {
    routes,
    summary: {
      totalRoutes: routes.length,
      totalDistance: totalDistance / 1000, // km
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