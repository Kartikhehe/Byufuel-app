# Navigation and Tracking App

A web application for tracking and managing waypoints with coordinate data, images, and notes.

## Features

- Interactive map with waypoint marking
- Real-time coordinate tracking
- Image upload to Cloudinary
- PostgreSQL database for persistent storage
- View saved waypoints
- Export functionality

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v12 or higher)
- Cloudinary account (free tier available)

## Setup Instructions

### 1. PostgreSQL Database Setup

#### Option A: Using NeonDB (Recommended - Serverless PostgreSQL)

[NeonDB](https://neon.tech) is a serverless PostgreSQL database that's perfect for development and production.

**Step 1: Create a NeonDB Account**

1. Go to [neon.tech](https://neon.tech) and sign up for a free account
2. Create a new project
3. Create a new database (or use the default one)

**Step 2: Get Your Connection String**

1. In your NeonDB dashboard, go to your project
2. Click on "Connection Details" or "Connection String"
3. Copy the connection string (it will look like this):
   ```
   postgresql://username:password@ep-xxx-xxx.region.aws.neon.tech/dbname?sslmode=require
   ```

**Step 3: Create the Database Schema**

You can create the schema using one of these methods:

**Method 1: Using NeonDB SQL Editor (Easiest)**

1. In your NeonDB dashboard, click on "SQL Editor"
2. Copy and paste the following SQL commands:

```sql
-- Create waypoints table
CREATE TABLE IF NOT EXISTS waypoints (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    notes TEXT,
    image_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on coordinates for faster queries
CREATE INDEX IF NOT EXISTS idx_waypoints_coordinates ON waypoints(latitude, longitude);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_waypoints_created_at ON waypoints(created_at DESC);

-- Insert default location (required for the app to work properly)
INSERT INTO waypoints (name, latitude, longitude, notes)
VALUES ('Default Location', 26.516654, 80.231507, 'Default location when GPS is unavailable')
ON CONFLICT DO NOTHING;
```

3. Click "Run" to execute the commands

**Note**: The default location (26.516654, 80.231507) is required for the app to function properly. If it doesn't exist, the app will use this fallback location.

**Method 2: Using psql Command Line**

```bash
# Install psql if you don't have it (macOS)
brew install postgresql

# Connect to NeonDB using your connection string
psql "postgresql://username:password@ep-xxx-xxx.region.aws.neon.tech/dbname?sslmode=require"

# Or use the schema file
psql "YOUR_CONNECTION_STRING" -f server/database/schema.sql
```

**Method 3: Using the Schema File**

```bash
# Navigate to project root
cd "/Users/kartikraj/Desktop/TerrAqua UAV/Navigation and tracking app/Navigation and Tracking App"

# Run schema file with your NeonDB connection string
psql "YOUR_NEONDB_CONNECTION_STRING" -f server/database/schema.sql
```

**Step 4: Configure Environment Variables**

Add your NeonDB connection string to `server/.env`:

```env
# NeonDB Connection String (Recommended)
DATABASE_URL=postgresql://username:password@ep-xxx-xxx.region.aws.neon.tech/dbname?sslmode=require
```

#### Option B: Using Local PostgreSQL

If you prefer to use a local PostgreSQL installation:

**For macOS (using Homebrew):**

```bash
# Install PostgreSQL
brew install postgresql@14

# Start PostgreSQL service
brew services start postgresql@14

# Create a new database user (optional, or use your existing user)
createuser -s your_username

# Create the database
createdb navigation_tracking
```

**For Linux (Ubuntu/Debian):**

```bash
# Install PostgreSQL
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Switch to postgres user and create database
sudo -u postgres psql

# In PostgreSQL prompt:
CREATE USER your_username WITH PASSWORD 'your_password';
CREATE DATABASE navigation_tracking OWNER your_username;
GRANT ALL PRIVILEGES ON DATABASE navigation_tracking TO your_username;
\q
```

**For Windows:**

1. Download and install PostgreSQL from [postgresql.org](https://www.postgresql.org/download/windows/)
2. During installation, set a password for the `postgres` user
3. Open pgAdmin or psql command line
4. Create a new database:
   ```sql
   CREATE DATABASE navigation_tracking;
   ```

#### Create Database Schema (For Local PostgreSQL):

**Option 1: Using the schema file (Recommended)**

```bash
# Navigate to the project root directory
cd "/Users/kartikraj/Desktop/TerrAqua UAV/Navigation and tracking app/Navigation and Tracking App"

# Run the schema file (replace 'your_username' with your PostgreSQL username)
psql -U your_username -d navigation_tracking -f server/database/schema.sql
```

**Option 2: Using psql interactive mode**

```bash
# Connect to your database
psql -U your_username -d navigation_tracking

# Then copy and paste the following SQL commands:
```

```sql
-- Create waypoints table
CREATE TABLE IF NOT EXISTS waypoints (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    notes TEXT,
    image_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on coordinates for faster queries
CREATE INDEX IF NOT EXISTS idx_waypoints_coordinates ON waypoints(latitude, longitude);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_waypoints_created_at ON waypoints(created_at DESC);

-- Insert default location (required for the app to work properly)
INSERT INTO waypoints (name, latitude, longitude, notes)
VALUES ('Default Location', 26.516654, 80.231507, 'Default location when GPS is unavailable')
ON CONFLICT DO NOTHING;

-- Exit psql
\q
```

**Verify the table was created:**

```bash
# For NeonDB: Use SQL Editor in dashboard or:
psql "YOUR_NEONDB_CONNECTION_STRING" -c "\d waypoints"

# For Local PostgreSQL:
psql -U your_username -d navigation_tracking -c "\d waypoints"
```

### 2. Cloudinary Setup

1. Sign up for a free account at [cloudinary.com](https://cloudinary.com/)
2. Go to your Dashboard
3. Copy your:
   - Cloud Name
   - API Key
   - API Secret

### 3. Environment Variables

1. Navigate to the `server` directory:
   ```bash
   cd server
   ```

2. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

3. Edit `.env` and fill in your credentials:

   **For NeonDB (Recommended):**
   ```env
   # NeonDB Connection String (use this if you're using NeonDB)
   DATABASE_URL=postgresql://username:password@ep-xxx-xxx.region.aws.neon.tech/dbname?sslmode=require

   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret

   PORT=3001
   NODE_ENV=development
   ```

   **For Local PostgreSQL:**
   ```env
   # PostgreSQL Database Configuration
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=navigation_tracking
   DB_USER=your_username
   DB_PASSWORD=your_password

   # SSL Configuration (set DB_SSL=true if your database requires SSL)
   DB_SSL=false
   DB_SSL_MODE=disable
   DB_SSL_REJECT_UNAUTHORIZED=false

   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret

   PORT=3001
   NODE_ENV=development
   ```

   **Note**: 
   - If using **NeonDB**, only the `DATABASE_URL` is needed (SSL is automatically configured)
   - If using **local PostgreSQL**, use the individual `DB_*` parameters
   - If using other cloud databases (Heroku Postgres, AWS RDS, etc.), set `DB_SSL=true`

### 4. Install Dependencies

#### Backend:
```bash
cd server
npm install
```

#### Frontend:
```bash
# From project root
npm install
```

### 5. Run the Application

#### Start the Backend Server:
```bash
cd server
npm run dev
```

The server will run on `http://localhost:3001`

#### Start the Frontend:
```bash
# From project root
npm run dev
```

The frontend will run on `http://localhost:5173` (or the port Vite assigns)

## Project Structure

```
Navigation and Tracking App/
├── server/
│   ├── config/
│   │   └── cloudinary.js
│   ├── database/
│   │   ├── connection.js
│   │   └── schema.sql
│   ├── routes/
│   │   ├── waypoints.js
│   │   └── upload.js
│   ├── .env
│   ├── .env.example
│   ├── package.json
│   └── server.js
├── src/
│   ├── components/
│   │   ├── Navbar.jsx
│   │   ├── Sidebar.jsx
│   │   ├── LiveCoordinates.jsx
│   │   ├── WaypointDetails.jsx
│   │   └── WaypointSelector.jsx
│   ├── App.jsx
│   └── ...
├── package.json
└── README.md
```

## API Endpoints

### Waypoints

- `GET /api/waypoints` - Get all waypoints
- `GET /api/waypoints/:id` - Get a single waypoint
- `POST /api/waypoints` - Create a new waypoint
- `PUT /api/waypoints/:id` - Update a waypoint
- `DELETE /api/waypoints/:id` - Delete a waypoint

### Upload

- `POST /api/upload` - Upload an image to Cloudinary (multipart/form-data with 'image' field)

## Troubleshooting

### PostgreSQL Connection Issues

- Ensure PostgreSQL is running: `brew services list` (macOS) or `sudo systemctl status postgresql` (Linux)
- Check your credentials in `.env`
- Verify database exists: `psql -U your_username -l`

### Cloudinary Upload Issues

- Verify your API credentials in `.env`
- Check file size (max 10MB)
- Ensure you're uploading image files only

### Port Already in Use

- Change the PORT in `.env` if 3001 is already in use
- Update the frontend API base URL accordingly

## License

MIT
