# Byufuel App

A comprehensive fuel delivery and route optimization platform with warehouse management, fleet tracking, and GPS-enabled navigation.

## Features

### 🏭 Warehouse Management
- Add and manage warehouses/depots
- Track warehouse locations with GPS coordinates
- View and resume existing warehouse surveys

### 🛵 Fleet Management
- Add and manage delivery vehicles
- Track fleet assignments to warehouses
- Monitor vehicle capacity and status

### 🍽️ Restaurant/Client Management
- Manage restaurant/client locations
- Track delivery requirements and fuel needs
- Assign restaurants to optimal delivery routes

### 🗺️ Route Optimization
- Auto-optimize delivery routes for multiple vehicles
- Minimize total distance and fuel costs
- Generate turn-by-turn navigation links

### 📍 GPS Tracking
- Real-time location tracking
- GPS accuracy monitoring
- Mobile-friendly map interface

## Tech Stack

### Frontend
- **React** - UI framework
- **Vite** - Build tool
- **Material UI** - Component library
- **Leaflet** - Interactive maps
- **React Context** - State management

### Backend
- **Node.js** - Runtime environment
- **Express** - Web framework
- **PostgreSQL** - Database
- **PostGIS** - Geospatial operations
- **JWT** - Authentication

## Project Structure

```
Byufuel app/
├── src/
│   ├── components/     # React components
│   │   ├── Navbar.jsx
│   │   ├── Sidebar.jsx
│   │   ├── RouteResultsDialog.jsx
│   │   ├── OptimizeRouteDialog.jsx
│   │   └── ...
│   ├── pages/
│   │   ├── MapApp.jsx      # Main map application
│   │   ├── Login.jsx
│   │   └── Signup.jsx
│   ├── services/
│   │   └── api.js          # API client
│   ├── context/
│   │   └── AuthContext.jsx # Auth state
│   ├── utils/
│   │   └── mapUtils.js
│   └── theme/
│       └── theme.js        # MUI theme
├── server/
│   ├── routes/
│   │   ├── auth.js         # Authentication
│   │   ├── warehouses.js   # Warehouse CRUD
│   │   ├── fleets.js       # Fleet management
│   │   ├── restaurants.js  # Restaurant management
│   │   └── optimize.js     # Route optimization
│   ├── database/
│   │   ├── schema.sql      # Database schema
│   │   ├── connection.js   # DB connection
│   │   └── migrations/     # Schema migrations
│   └── server.js           # Express server
└── package.json
```

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 14+ with PostGIS extension
- npm or yarn

### Installation

1. **Install frontend dependencies:**
```bash
cd /Users/kartikraj/Desktop/Byufuel\ app
npm install
```

2. **Install backend dependencies:**
```bash
cd server
npm install
```

3. **Configure database:**
```bash
# Create database and enable PostGIS
psql -U postgres -c "CREATE DATABASE byufuel;"
psql -U postgres -d byufuel -c "CREATE EXTENSION postgis;"

# Run schema
psql -U postgres -d byufuel -f database/schema.sql
```

4. **Configure environment:**
Create `server/.env`:
```env
JWT_SECRET=your-secret-key
PORT=3001
NODE_ENV=development
DATABASE_URL=postgresql://user:password@localhost:5432/byufuel
```

### Running the Application

1. **Start backend server:**
```bash
cd server
npm run dev
```

2. **Start frontend (in separate terminal):**
```bash
npm run dev
```

3. **Access the app:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

### Database Commands

Initialize database and run migrations:
```bash
cd server
npm run init-db
```

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/signup` | Register new user |
| POST | `/auth/login` | User login |
| POST | `/auth/logout` | User logout |
| GET | `/auth/me` | Get current user |

### Warehouses
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/warehouses` | List all warehouses |
| GET | `/api/warehouses/:id` | Get warehouse details |
| POST | `/api/warehouses` | Create warehouse |
| PUT | `/api/warehouses/:id` | Update warehouse |
| DELETE | `/api/warehouses/:id` | Delete warehouse |

### Fleets
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/fleets` | List all fleets |
| POST | `/api/fleets` | Create fleet |
| PUT | `/api/fleets/:id` | Update fleet |
| DELETE | `/api/fleets/:id` | Delete fleet |

### Restaurants
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/restaurants` | List all restaurants |
| POST | `/api/restaurants` | Create restaurant |
| PUT | `/api/restaurants/:id` | Update restaurant |
| DELETE | `/api/restaurants/:id` | Delete restaurant |

### Route Optimization
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/optimize/route` | Optimize delivery routes |
| GET | `/api/optimize/results/:id` | Get optimization results |

## Auto-Pause Feature

The server includes a background job that automatically pauses playing projects that haven't had activity for more than 6 hours. This helps optimize resource usage.

## License

MIT

