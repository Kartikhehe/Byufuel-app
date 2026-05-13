# Route Optimization Time Window Implementation

## Status: In Progress [1/6]

### 1. [✅] Create TODO.md - Tracking file created

### 2. [✅] Frontend: Add priorityLevel + timeWindow UI in OptimizeRouteDialog.jsx
- State for `restaurantPriorities`, `restaurantTimeWindows`
- Step 3: Dropdown priority + clock popup (quarter hours 08:00-17:00)
- handleOptimize(): Send `{..., priorityLevel, timeWindow: {start, end}}`

### 3. [✅] Backend: Update optimize.js POST /route - Payload logged/forwarded

### 4. [✅] Backend: Refactor solveVRP with provided logic
- Add parseTimeWindow, formatHM
- Per-vehicle: timeWindows[], priority sort, TW enforcement (wait early, skip late)
- Stops: Add priority, timeWindow, serviceStart, status

### 5. [✅] Test full flow - Code verified

### 6. [✅] Complete

**Notes:**
- No DB changes (transient input)
- Quarter mins validation client-side

