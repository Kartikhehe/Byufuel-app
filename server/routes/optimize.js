import express from 'express';
import pool from '../database/connection.js';
import { authenticateToken } from '../middleware/auth.js';
import axios from 'axios';

const router = express.Router();

router.use(authenticateToken);

// Route optimization endpoint using Greedy Heuristic Solver
// Note: This is NOT Google OR-Tools. It's a custom greedy heuristic algorithm written in JavaScript.
// OR-Tools is a global optimizer (looks at whole picture), while this is "greedy" (step-by-step).
// Greedy is faster but less efficient (higher mileage) than OR-Tools.
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
        // Use capacity from database, or calculate based on vehicle type
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
    const priorities = []; // Priority array: 0 = regular, 1 = VIP
    
    // Add warehouses (priority 0 for depots)
    warehouses.forEach((wh, index) => {
      coords.push([parseFloat(wh.longitude), parseFloat(wh.latitude)]);
      warehouseMap.set(wh.id, index);
      priorities.push(0); // Warehouses have 0 priority
    });

    // Add restaurants with their priorities
    const restaurantCoords = [];
    restaurants.forEach((r, index) => {
      coords.push([parseFloat(r.longitude), parseFloat(r.latitude)]);
      // Priority: 2 = Critical (must serve), 1 = Priority, 0 = Regular (default to 0 if not provided)
      const priority = r.priority === 2 ? 2 : (r.priority === 1 ? 1 : 0);
      priorities.push(priority);
      restaurantCoords.push({
        index: coords.length - 1,
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
      priorities, // Pass priorities array
      numWarehouses,
      warehouses,
      restaurants
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
  
  // 2 Wheeler - small capacity
  if (type.includes('2 wheeler') || name.includes('moped')) {
    return 50; // 50 liters
  }
  
  // Small 4 Wheeler
  if (name.includes('intra') || name.includes('maxima')) {
    return 300; // 300 liters
  }
  
  // Large 4 Wheeler
  if (name.includes('bolero') || type.includes('4 wheeler')) {
    return 500; // 500 liters
  }
  
  // Default capacity
  return 200; // 200 liters
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

// Solve VRP using Greedy Heuristic Solver
function solveVRP(coords, distanceMatrix, durationMatrix, fleetData, demands, priorities, numWarehouses, warehouses, restaurants) {
  console.log('=== Starting VRP Solver ===');
  console.log('Total locations:', coords.length);
  console.log('Warehouses:', numWarehouses);
  console.log('Restaurants:', coords.length - numWarehouses);
  console.log('Fleet size:', fleetData.length);
  console.log('Demands:', demands);
  console.log('Priorities:', priorities);
  
  // Penalty constants for drop logic
  const PENALTY_REGULAR = 50000;     // Cost to skip a regular restaurant (priority 0)
  const PENALTY_VIP = 100000;        // Cost to skip a priority restaurant (priority 1)
  const PENALTY_CRITICAL = 10000000; // Cost to skip a critical restaurant (priority 2 - must serve)
  
  const n = coords.length;
  const routes = [];
  let totalDistance = 0;
  let totalLoad = 0;
  let totalCost = 0;
  let totalPenalty = 0;

  // Track skipped restaurants with their priorities
  const skippedRestaurants = []; // { index, name, priority, reason }
  
  // Sort fleet by capacity (smallest first for efficiency)
  const sortedFleet = [...fleetData].sort((a, b) => a.capacity - b.capacity);

// Greedy assignment for each vehicle
  sortedFleet.forEach((vehicle, vehicleIdx) => {
    console.log(`Processing vehicle ${vehicleIdx + 1}/${sortedFleet.length}: ${vehicle.name}`);
    
    // Initialize Route
    const route = {
      vehicleName: vehicle.name,
      warehouse: vehicle.start,
      warehouseName: warehouses[vehicle.start]?.name || 'Unknown Warehouse',
      stops: [],
      distance: 0,
      load: 0,
      cost: 0
    };

    let cumulativeTime = 0; // Starts at 0 (8:00 AM)
    let currentLocation = vehicle.start;
    let currentLoad = 0;

    // Add initial start point
    route.stops.push({
      index: vehicle.start,
      type: 'warehouse',
      name: warehouses[vehicle.start]?.name || 'Warehouse',
      arrivalTime: formatTime(0),
      load: 0
    });

    // --- MULTI-TRIP LOOP ---
    // Keep sending the vehicle out as long as it has time left (e.g., before 6 PM)
    let activeTrip = true;
    
    while (activeTrip) {
        
        // 1. Identification: Who is still unassigned?
        const assignedIndices = new Set();
        routes.forEach(r => r.stops.forEach(s => s.type === 'restaurant' && assignedIndices.add(s.index)));
        route.stops.forEach(s => s.type === 'restaurant' && assignedIndices.add(s.index));

        const candidates = [];
        for (let i = numWarehouses; i < n; i++) {
          if (!assignedIndices.has(i)) candidates.push(i);
        }

        // Stop if no one left to serve
        if (candidates.length === 0) {
            activeTrip = false;
            break;
        }

        // 2. Sorting: Critical (2) first, then Priority (1), then Regular (0), then by distance
        candidates.sort((a, b) => {
          const prioA = priorities[a] || 0;
          const prioB = priorities[b] || 0;
          
          // Primary Sort: Critical (2) > Priority (1) > Regular (0)
          if (prioA !== prioB) return prioB - prioA;
          
          // Secondary Sort: Distance from current location (Ascending)
          const distA = distanceMatrix[currentLocation][a] || 999999;
          const distB = distanceMatrix[currentLocation][b] || 999999;
          return distA - distB;
        });

        let tripMadePickup = false;

        // 3. Fill the vehicle for this trip
        for (const restaurantIdx of candidates) {
            const demand = demands[restaurantIdx];
            const distanceTo = distanceMatrix[currentLocation][restaurantIdx];
            const timeTo = durationMatrix[currentLocation][restaurantIdx];
            
            // Validate Matrix Data (Fix for "Time Constraint" bug)
            if (timeTo === undefined || timeTo === null) {
                console.log(`  WARNING: No time data for Node ${restaurantIdx}. Skipping.`);
                continue;
            }

            // Check Limits
            // We need enough time to: Go there + Service + Return to Depot
            const returnTime = durationMatrix[restaurantIdx][vehicle.start];
            const totalTripTime = cumulativeTime + timeTo + 900 + returnTime;

            if (currentLoad + demand <= vehicle.capacity) {
                if (totalTripTime < 43200) { // 12 Hours limit
                    // ASSIGN
                    currentLoad += demand;
                    cumulativeTime += (timeTo + 900); // Add Travel + Service (Wait to add return time)
                    
                    route.stops.push({
                        index: restaurantIdx,
                        type: 'restaurant',
                        priority: priorities[restaurantIdx],
                        name: restaurants[restaurantIdx - numWarehouses]?.name,
                        arrivalTime: formatTime(cumulativeTime),
                        load: currentLoad
                    });

                    route.distance += distanceTo;
                    currentLocation = restaurantIdx;
                    tripMadePickup = true;
                } else {
                     // Log the specific reason for VIP failures
                     if (priorities[restaurantIdx] === 1) {
                         console.log(`  VIP Skip Detail: CurrTime=${formatTime(cumulativeTime)}, Travel=${Math.round(timeTo/60)}m, Return=${Math.round(returnTime/60)}m. Limit Exceeded.`);
                     }
                }
            }
        }

        // 4. Trip End Logic
        if (tripMadePickup) {
            // Return to warehouse to unload
            const returnDist = distanceMatrix[currentLocation][vehicle.start];
            const returnTime = durationMatrix[currentLocation][vehicle.start];
            
            cumulativeTime += returnTime;
            route.distance += returnDist;
            currentLocation = vehicle.start; // Back at depot
            
            // ADD WAREHOUSE STOP (Unload)
            route.stops.push({
                index: vehicle.start,
                type: 'warehouse',
                name: warehouses[vehicle.start]?.name,
                arrivalTime: formatTime(cumulativeTime),
                load: currentLoad,
                note: "Unloading / Battery Swap"
            });
            
            // RESET LOAD for next trip!
            currentLoad = 0; 

            // If it's too late to start a new trip (e.g., past 6 PM), stop.
            if (cumulativeTime > 36000) { // 10:00 Hours
                activeTrip = false;
            }
        } else {
            // Could not pick up ANYTHING (even with empty truck) -> Vehicle is done
            activeTrip = false;
        }
    } // End While Loop

// Finalize Route Cost
    if (route.stops.length > 1) {
      // Calculate total load from all stops
      const routeLoad = route.stops
        .filter(s => s.type === 'restaurant')
        .reduce((sum, s) => sum + (s.load || 0), 0);
      
      route.load = routeLoad;
      route.cost = route.distance * vehicle.costFactor / 1000;
      routes.push(route);
      
      // Update totals
      totalDistance += route.distance;
      totalLoad += routeLoad;
      totalCost += route.cost;
    }
  });

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
        load: 0
      }],
      distance: 0,
      load: 0,
      cost: 0,
      warning: 'No task assigned'
    });
  });

  // Check for any remaining unassigned restaurants
  const assignedIndices = new Set();
  routes.forEach(r => {
    if (r.vehicleName !== 'Unassigned') {
      r.stops.forEach(stop => {
        if (stop.type === 'restaurant') {
          assignedIndices.add(stop.index);
        }
      });
    }
  });

  // Find remaining unassigned (Critical and Priority should be served, Regular can be skipped)
  const remainingUnassigned = [];
  for (let i = numWarehouses; i < n; i++) {
    if (!assignedIndices.has(i)) {
      const priority = priorities[i] || 0;
      remainingUnassigned.push({
        index: i,
        name: restaurants[i - numWarehouses]?.name || `Restaurant ${i - numWarehouses + 1}`,
        priority: priority,
        reason: 'No vehicle capacity'
      });
      
      // Critical (priority 2) and Priority (priority 1) should never be skipped
      if (priority === 2) {
        console.error(`CRITICAL: Critical restaurant ${restaurants[i - numWarehouses]?.name} was not assigned!`);
        skippedRestaurants.push({
          index: i,
          name: restaurants[i - numWarehouses]?.name || `Restaurant ${i - numWarehouses + 1}`,
          priority: 2,
          reason: 'CRITICAL: No vehicle could accommodate'
        });
      } else if (priority === 1) {
        console.error(`ERROR: Priority restaurant ${restaurants[i - numWarehouses]?.name} was not assigned!`);
        skippedRestaurants.push({
          index: i,
          name: restaurants[i - numWarehouses]?.name || `Restaurant ${i - numWarehouses + 1}`,
          priority: 1,
          reason: 'No vehicle capacity'
        });
      } else {
        skippedRestaurants.push({
          index: i,
          name: restaurants[i - numWarehouses]?.name || `Restaurant ${i - numWarehouses + 1}`,
          priority: 0,
          reason: 'No vehicle capacity'
        });
      }
    }
  }

  console.log('Final unassigned count:', remainingUnassigned.length);

  // If restaurants remain unassigned, create a summary (should only happen for regulars)
  if (remainingUnassigned.length > 0) {
    const totalDemand = remainingUnassigned.reduce((sum, item) => sum + demands[item.index], 0);
    
    routes.push({
      vehicleName: 'Unassigned',
      warehouse: null,
      warehouseName: null,
      stops: remainingUnassigned.map(item => ({
        index: item.index,
        type: 'restaurant',
        priority: item.priority,
        name: item.name,
        address: restaurants[item.index - numWarehouses]?.address || '',
        arrivalTime: null,
        cumulativeSeconds: null,
        load: demands[item.index]
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

  // Calculate total penalty
  skippedRestaurants.forEach(item => {
    let penalty = PENALTY_REGULAR;
    if (item.priority === 2) {
      penalty = PENALTY_CRITICAL;
    } else if (item.priority === 1) {
      penalty = PENALTY_VIP;
    }
    totalPenalty += penalty;
  });

  return {
    routes,
    summary: {
      totalRoutes: routes.length,
      totalDistance: totalDistance / 1000, // km
      totalLoad: totalLoad,
      totalCost: totalCost,
      totalPenalty: totalPenalty,
      unassignedCount: remainingUnassigned.length,
      skippedRestaurants: skippedRestaurants
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

