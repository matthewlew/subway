-- Database schema for Subway Tracker backend
-- PostgreSQL or MySQL compatible

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    preferences JSONB DEFAULT '{}'::jsonb
);

-- Rides table
CREATE TABLE rides (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    station_id VARCHAR(10) NOT NULL,
    station_name VARCHAR(200) NOT NULL,
    line VARCHAR(5),
    direction VARCHAR(50),
    car_number VARCHAR(10),
    car_model VARCHAR(50),
    note TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    timestamp BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for performance
CREATE INDEX idx_rides_user_id ON rides(user_id);
CREATE INDEX idx_rides_timestamp ON rides(timestamp);
CREATE INDEX idx_rides_station_id ON rides(station_id);
CREATE INDEX idx_rides_line ON rides(line);
CREATE INDEX idx_rides_car_number ON rides(car_number);

-- Train cars table (community data)
CREATE TABLE train_cars (
    car_number VARCHAR(10) PRIMARY KEY,
    model VARCHAR(50),
    line VARCHAR(5),
    first_spotted TIMESTAMP,
    last_spotted TIMESTAMP,
    times_spotted INTEGER DEFAULT 1,
    reported_by_users INTEGER DEFAULT 1,
    status VARCHAR(20) DEFAULT 'active', -- active, retired, maintenance
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Stations reference table
CREATE TABLE stations (
    id VARCHAR(10) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    lines TEXT[] NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    borough VARCHAR(50),
    accessibility BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- User stats cache (for performance)
CREATE TABLE user_stats (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    total_rides INTEGER DEFAULT 0,
    total_cars_spotted INTEGER DEFAULT 0,
    favorite_line VARCHAR(5),
    favorite_station_id VARCHAR(10),
    total_time_underground_minutes INTEGER DEFAULT 0,
    riding_days INTEGER DEFAULT 0,
    last_ride_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User achievements/badges
CREATE TABLE achievements (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    achievement_type VARCHAR(50) NOT NULL, -- first_ride, 100_rides, night_owl, etc.
    achieved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb,
    UNIQUE(user_id, achievement_type)
);

-- Community car sightings (for tracking specific cars)
CREATE TABLE car_sightings (
    id SERIAL PRIMARY KEY,
    car_number VARCHAR(10) NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    station_id VARCHAR(10),
    line VARCHAR(5),
    sighted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8)
);

CREATE INDEX idx_car_sightings_car_number ON car_sightings(car_number);
CREATE INDEX idx_car_sightings_user_id ON car_sightings(user_id);

-- Sample data for stations (partial NYC Subway)
INSERT INTO stations (id, name, lines, latitude, longitude, borough) VALUES
('127', 'Times Sq-42 St', ARRAY['1','2','3','N','Q','R','W'], 40.7580, -73.9855, 'Manhattan'),
('120', 'Grand Central-42 St', ARRAY['4','5','6'], 40.7527, -73.9772, 'Manhattan'),
('132', 'Union Sq-14 St', ARRAY['4','5','6','L','N','Q','R','W'], 40.7347, -73.9906, 'Manhattan'),
('A27', 'Penn Station-34 St', ARRAY['1','2','3'], 40.7505, -73.9934, 'Manhattan'),
('D15', 'Herald Sq-34 St', ARRAY['N','Q','R','W'], 40.7497, -73.9880, 'Manhattan');

-- Views for analytics

-- User ride summary
CREATE VIEW user_ride_summary AS
SELECT 
    user_id,
    COUNT(*) as total_rides,
    COUNT(DISTINCT station_id) as unique_stations,
    COUNT(DISTINCT line) as lines_used,
    COUNT(DISTINCT car_number) FILTER (WHERE car_number IS NOT NULL) as cars_spotted,
    MIN(timestamp) as first_ride,
    MAX(timestamp) as last_ride
FROM rides
GROUP BY user_id;

-- Popular stations
CREATE VIEW popular_stations AS
SELECT 
    station_id,
    station_name,
    COUNT(*) as ride_count,
    COUNT(DISTINCT user_id) as unique_users
FROM rides
GROUP BY station_id, station_name
ORDER BY ride_count DESC;

-- Most spotted train cars
CREATE VIEW popular_cars AS
SELECT 
    car_number,
    car_model,
    COUNT(*) as times_spotted,
    COUNT(DISTINCT user_id) as spotted_by_users,
    MAX(timestamp) as last_seen
FROM rides
WHERE car_number IS NOT NULL
GROUP BY car_number, car_model
ORDER BY times_spotted DESC;