# TODO: Priority Feature Implementation

## Backend Changes (server/routes/optimize.js)
- [x] 1. Accept priority flag in restaurant data from frontend
- [x] 2. Add priorities array to data model (warehouses=0, restaurants=from input)
- [x] 3. Implement penalty-based solver logic with AddDisjunction concept
- [x] 4. Track dropped/skipped nodes in solution
- [x] 5. Return skippedRestaurants in API response

## Frontend Changes (src/components/OptimizeRouteDialog.jsx)
- [x] 1. Add state for restaurant priorities (default 0)
- [x] 2. Add star/unstar toggle button for each restaurant
- [x] 3. Pass priority flag with restaurant data to backend
- [x] 4. Display VIP/Regular indicator in restaurant list

## Frontend Changes (src/components/RouteResultsDialog.jsx)
- [x] 1. Display skipped restaurants in results
- [x] 2. Show VIP vs Regular status for skipped items
- [x] 3. Show VIP indicator on route stops

## Testing
- [ ] 1. Test with priority restaurants (starred)
- [ ] 2. Test with regular restaurants (unstarred)
- [ ] 3. Verify VIP restaurants are never skipped
- [ ] 4. Verify regular restaurants can be skipped with penalty

## Key Changes Summary

### Backend (optimize.js)
- Added `priorities` array to track VIP (1) vs Regular (0) restaurants
- Implemented priority-based routing: VIP restaurants are served first
- Added penalty system: Regular=50,000, VIP=10,000,000
- Track skipped restaurants with priority and reason
- Return `skippedRestaurants` in summary

### Frontend (OptimizeRouteDialog.jsx)
- Added star/unstar button (gold star for VIP)
- Priority stored in state during session (no DB change)
- Pass `priority: 0|1` with restaurant data to backend

### Frontend (RouteResultsDialog.jsx)
- New "Skipped Restaurants" accordion showing unassigned items
- VIP restaurants marked with gold star chip
- VIP indicators shown on route stops


