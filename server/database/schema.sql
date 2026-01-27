-- Create database (run this manually in PostgreSQL)
-- CREATE DATABASE byufuel_app;

-- Users table for authentication
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Warehouses table for warehouse/depot management
CREATE TABLE IF NOT EXISTS warehouses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    state VARCHAR(100),
    rent_type VARCHAR(50) DEFAULT 'WH Rent',
    address TEXT,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_warehouses_user_id ON warehouses(user_id);
CREATE INDEX IF NOT EXISTS idx_warehouses_state ON warehouses(state);
CREATE INDEX IF NOT EXISTS idx_warehouses_rent_type ON warehouses(rent_type);
CREATE INDEX IF NOT EXISTS idx_warehouses_created_at ON warehouses(created_at DESC);

-- Fleets table for vehicle fleet management
CREATE TABLE IF NOT EXISTS fleets (
    id SERIAL PRIMARY KEY,
    vehicle VARCHAR(255) NOT NULL,
    vehicle_type VARCHAR(100) NOT NULL,
    count INTEGER NOT NULL DEFAULT 1,
    capacity DECIMAL(10, 2),
    fuel_type VARCHAR(50),
    warehouse_id INTEGER REFERENCES warehouses(id) ON DELETE SET NULL,
    available INTEGER NOT NULL DEFAULT 0,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT available_check CHECK (available <= count)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_fleets_user_id ON fleets(user_id);
CREATE INDEX IF NOT EXISTS idx_fleets_vehicle ON fleets(vehicle);
CREATE INDEX IF NOT EXISTS idx_fleets_vehicle_type ON fleets(vehicle_type);
CREATE INDEX IF NOT EXISTS idx_fleets_fuel_type ON fleets(fuel_type);
CREATE INDEX IF NOT EXISTS idx_fleets_warehouse_id ON fleets(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_fleets_created_at ON fleets(created_at DESC);

-- Restaurants table for restaurant/outlet management
CREATE TABLE IF NOT EXISTS restaurants (
    id SERIAL PRIMARY KEY,
    outlet_name VARCHAR(255) NOT NULL,
    area VARCHAR(255),
    city VARCHAR(100),
    pincode INTEGER,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT outlet_name_unique UNIQUE (outlet_name)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_restaurants_user_id ON restaurants(user_id);
CREATE INDEX IF NOT EXISTS idx_restaurants_outlet_name ON restaurants(outlet_name);
CREATE INDEX IF NOT EXISTS idx_restaurants_area ON restaurants(area);
CREATE INDEX IF NOT EXISTS idx_restaurants_city ON restaurants(city);
CREATE INDEX IF NOT EXISTS idx_restaurants_created_at ON restaurants(created_at DESC);
