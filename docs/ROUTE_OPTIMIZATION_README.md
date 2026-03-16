# Route Optimization Feature Documentation

## Overview

This document describes the route optimization feature with priority (VIP) support and multi-trip logic for the Byufuel app.

## Architecture

### Backend (server/routes/optimize.js)

The route optimization is implemented using a **Greedy Heuristic Solver** written in JavaScript. It is NOT Google OR-Tools - it's a custom algorithm that is faster but may produce less efficient routes (higher mileage) compared to global optimizers.

### Frontend Components

1. **OptimizeRouteDialog.jsx** - Multi-step dialog for selecting warehouses, fleets, and restaurants with priority toggle
2. **RouteResultsDialog.jsx** - Displays optimization results including skipped restaurants

---

## Priority Feature (VIP Restaurants)

### Concept

Restaurants can be marked as VIP (Priority = 1) or Regular (Priority = 0). VIP restaurants get priority during route optimization:

- **VIP restaurants are always served first** - They appear at the top of the candidate list
- **Regular restaurants may be skipped** if capacity/time constraints prevent serving them
- **VIPs should never be skipped** - Only regular restaurants can be left unassigned

### Data Structure

```javascript
// Restaurant priority in request
{
  id: restaurant_id,
  name: "Restaurant Name",
  amount: "100",  // UCO amount in liters
  latitude: 28.5686,
  longitude: 77.2580,
  priority: 1  // 1 = VIP, 0 = Regular (default)
}
```

### Penalty System

When restaurants cannot be served, penalties are calculated:

| Type | Penalty | Description |
|------|---------|-------------|
| Regular | 50,000 | Cost to skip a regular restaurant |
| VIP | 10,000,000 | Cost to skip a VIP (essentially undroppable) |

---

## Multi-Trip Logic

### Problem Solved

Previously, vehicles performed a single trip: Depot → Restaurants → Depot. Once full, they would retire for the day even with hours of remaining time.

### Solution

The new multi-trip logic allows vehicles to make multiple trips:

1. **Trip 1**: Depot → Restaurants → Depot (unload)
2. **Trip 2**: If time < 10 hours, reload and go out again
3. **Trip 3+**: Continue until no more restaurants or time runs out

### Time Constraints

- **Start Time**: 8:00 AM
- **Max Daily Time**: 10 hours (36,000 seconds) per vehicle
- **Service Time**: 15 minutes (900 seconds) per restaurant
- **Return Time**: Must return to depot before time limit

### Warehouse Stops

During multi-trip routes, warehouse stops include a note indicating the purpose:

```javascript
{
  type: 'warehouse',
  name: 'Warehouse Name',
  arrivalTime: '10:43',
  load: 75,
  note: 'Unloading / Battery Swap'
}
```

---

## API Reference

### POST /api/optimize/route

Request body:
```javascript
{
  warehouses: [
    {
      id: 1,
      name: "Main Warehouse",
      latitude: 28.5686,
      longitude: 77.2580
    }
  ],
  fleets: [
    {
      warehouseId: 1,
      warehouseName: "Main Warehouse",
      fleets: [
        {
          id: 1,
          vehicle: "Moped",
          vehicle_type: "2 Wheeler",
          capacity: 50,
          totalCount: 2,
          availableCount: 2
        }
      ]
    }
  ],
  restaurants: [
    {
      id: 1,
      name: "VIP Restaurant",
      amount: "100",
      latitude: 28.5686,
      longitude: 77.2580,
      priority: 1  // VIP
    },
    {
      id: 2,
      name: "Regular Restaurant",
      amount: "50",
      latitude: 28.5355,
      longitude: 77.2101,
      priority: 0  // Regular (default)
    }
  ]
}
```

Response:
```javascript
{
  success: true,
  routes: [
    {
      vehicleName: "Moped_1",
      warehouse: 0,
      warehouseName: "Main Warehouse",
      stops: [
        {
          index: 0,
          type: "warehouse",
          name: "Main Warehouse",
          arrivalTime: "08:00",
          load: 0
        },
        {
          index: 5,
          type: "restaurant",
          priority: 1,
          name: "VIP Restaurant",
          arrivalTime: "08:45",
          load: 100
        },
        // ... more stops
      ],
      distance: 15000,
      load: 100,
      cost: 32.55
    }
  ],
  summary: {
    totalRoutes: 3,
    totalDistance: 45.5,  // km
    totalLoad: 500,      // liters
    totalCost: 150.00,
    totalPenalty: 0,
    unassignedCount: 0,
    skippedRestaurants: []
  },
  waypoints: [
    { index: 0, longitude: 77.2580, latitude: 28.5686, type: 'warehouse', name: 'Main Warehouse' },
    // ...
  ]
}
```

---

## Frontend Implementation

### Step 3: Restaurant Selection with Priority Toggle

In the OptimizeRouteDialog component, each restaurant shows:
- **Checkbox** - Select/deselect restaurant
- **Star Icon** - Toggle VIP status (gold = VIP, gray = Regular)
- **Amount Input** - Enter UCO amount in liters

```javascript
// State
const [restaurantPriorities, setRestaurantPriorities] = useState({});
const [restaurantAmounts, setRestaurantAmounts] = useState({});

// Toggle priority
const handlePriorityToggle = (restaurantId) => {
  setRestaurantPriorities(prev => ({
    ...prev,
    [restaurantId]: prev[restaurantId] === 1 ? 0 : 1
  }));
};

// Pass to backend
restaurants.map(r => ({
  ...r,
  priority: restaurantPriorities[r.id] || 0
}))
```

### Results Display

The RouteResultsDialog shows:

1. **VIP Indicators** - Gold stars next to VIP restaurants in route stops
2. **Skipped Restaurants Section** - Accordion showing unassigned restaurants with:
   - Restaurant name
   - Priority (VIP/Regular chip)
   - Reason (Capacity constraint / Time constraint)

---

## Changes Summary

### Files Modified

| File | Changes |
|------|---------|
| `server/routes/optimize.js` | Priority support, multi-trip logic, simplified algorithm |
| `src/components/OptimizeRouteDialog.jsx` | Priority toggle, star icons, priority in API request |
| `src/components/RouteResultsDialog.jsx` | VIP indicators, skipped restaurants display |

### Key Code Changes

#### Backend Priority Processing
```javascript
// Collect priorities
const priorities = [];
warehouses.forEach(wh => priorities.push(0));  // Warehouses = 0
restaurants.forEach(r => priorities.push(r.priority === 1 ? 1 : 0));  // VIP = 1, Regular = 0

// Sort candidates: VIPs first, then by distance
candidates.sort((a, b) => {
  const prioA = priorities[a] || 0;
  const prioB = priorities[b] || 0;
  if (prioA !== prioB) return prioB - prioA;  // VIP Descending
  return distanceMatrix[currentLocation][a] - distanceMatrix[currentLocation][b];  // Distance Ascending
});
```

#### Multi-Trip Loop
```javascript
while (activeTrip) {
  // 1. Find unassigned restaurants
  // 2. Sort by priority (VIPs first)
  // 3. Fill vehicle
  // 4. Return to depot, unload, reset load
  
  if (tripMadePickup) {
    // Return to warehouse
    // Reset load to 0 for next trip
    // Continue if time < 10 hours
  } else {
    activeTrip = false;  // Done
  }
}
```

---

## Testing Checklist

- [ ] VIP restaurants are always assigned before regulars
- [ ] Regular restaurants can be skipped due to capacity/time
- [ ] VIP restaurants are never skipped
- [ ] Vehicles make multiple trips when time permits
- [ ] Skipped restaurants show correct priority (VIP/Regular)
- [ ] Route times are within 10-hour limit
- [ ] Warehouse stops show "Unloading / Battery Swap" note

---

## Future Improvements

1. **Better Load Balancing** - Distribute load more evenly across vehicles
2. **Clustering** - Group nearby restaurants to reduce travel time
3. **Real OR-Tools Integration** - For optimal global solutions
4. **Time Windows** - Add delivery time windows for restaurants
5. **Priority Levels** - Support more than 2 priority levels

