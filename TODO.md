# Byufuel App Modifications - TODO List

## Frontend Changes

### 1. Navbar.jsx
- [x] Remove the logo icon (NearMeOutlinedIcon)
- [x] Change title from "GPS-based Survey App" to "Byufuel app"

### 2. Sidebar.jsx
- [x] Remove "Single Point Capture" menu item
- [x] Remove "Export Data" menu item
- [x] Remove "Import File" menu item
- [x] Rename "Start Survey" → "Add Warehouse"
- [x] Rename "View Saved Points" → "View Warehouses"

### 3. StartSurveyDialog.jsx
- [x] Change dialog title to "Warehouse and Depot"
- [x] Rename "New" toggle → "Warehouse"
- [x] Rename "Resume" toggle → "Depot"
- [x] Update button text "Start Survey" → "Add Warehouse"
- [x] Update button text "Resume Survey" → "Resume Depot"

### 4. MapApp.jsx
- [x] Remove Single Point Capture functionality
- [x] Remove GPS tracking and project recording features
- [x] Simplify to warehouse/depot focused view

### 5. SavedPoints.jsx
- [x] Update labels to use warehouse terminology

### 6. api.js
- [x] Remove waypointsAPI
- [x] Remove projectsAPI
- [x] Remove tracksAPI
- [x] Remove uploadAPI
- [x] Keep only authAPI

## Backend Changes

### 7. schema.sql
- [x] Remove waypoints table
- [x] Remove projects table
- [x] Remove tracks table
- [x] Keep only users table

### 8. Remove backend routes
- [x] Delete projects.js
- [x] Delete waypoints.js
- [x] Delete tracks.js
- [x] Delete upload.js

### 9. Update server.js
- [x] Remove route imports and usage

## Completion Status
- [x] All frontend changes completed
- [x] All backend changes completed

