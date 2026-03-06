# Subway Tracker API Endpoints

Base URL: `https://api.subwaytracker.app/v1`

## Authentication
All endpoints require Bearer token authentication:
```
Authorization: Bearer <token>
```

## Endpoints

### 1. User Management

#### POST /auth/register
Register a new user
```json
{
  "email": "user@example.com",
  "username": "subway_rider",
  "password": "secure_password"
}
```

Response: `200 OK`
```json
{
  "user_id": 123,
  "token": "jwt_token_here"
}
```

#### POST /auth/login
Login user
```json
{
  "email": "user@example.com",
  "password": "secure_password"
}
```

Response: `200 OK`
```json
{
  "user_id": 123,
  "token": "jwt_token_here"
}
```

---

### 2. Ride Management

#### POST /rides
Log a new ride
```json
{
  "station_id": "127",
  "station_name": "Times Sq-42 St",
  "line": "N",
  "direction": "Downtown",
  "car_number": "9876",
  "note": "Very crowded",
  "latitude": 40.7580,
  "longitude": -73.9855,
  "timestamp": 1709740800000
}
```

Response: `201 Created`
```json
{
  "ride_id": 456,
  "status": "success"
}
```

#### GET /rides
Get user's rides
Query params:
- `limit` (default: 50, max: 100)
- `offset` (default: 0)
- `start_date` (Unix timestamp)
- `end_date` (Unix timestamp)
- `station_id` (filter by station)
- `line` (filter by line)

Response: `200 OK`
```json
{
  "rides": [
    {
      "id": 456,
      "station_name": "Times Sq-42 St",
      "line": "N",
      "car_number": "9876",
      "timestamp": 1709740800000,
      "note": "Very crowded"
    }
  ],
  "total": 150,
  "has_more": true
}
```

#### GET /rides/:id
Get specific ride details

Response: `200 OK`
```json
{
  "id": 456,
  "station_id": "127",
  "station_name": "Times Sq-42 St",
  "line": "N",
  "direction": "Downtown",
  "car_number": "9876",
  "car_model": "R68A",
  "note": "Very crowded",
  "timestamp": 1709740800000
}
```

#### DELETE /rides/:id
Delete a ride

Response: `204 No Content`

---

### 3. Statistics

#### GET /stats
Get user statistics
Query params:
- `period` (7, 30, or 'all')

Response: `200 OK`
```json
{
  "total_rides": 150,
  "unique_stations": 25,
  "lines_used": 12,
  "cars_spotted": 87,
  "time_underground_minutes": 3750,
  "riding_days": 45,
  "favorite_line": "N",
  "favorite_station": {
    "id": "127",
    "name": "Times Sq-42 St",
    "ride_count": 45
  },
  "line_breakdown": [
    {"line": "N", "count": 45},
    {"line": "R", "count": 38}
  ]
}
```

#### GET /stats/achievements
Get user achievements

Response: `200 OK`
```json
{
  "achievements": [
    {
      "type": "first_ride",
      "achieved_at": "2024-01-15T10:30:00Z"
    },
    {
      "type": "100_rides",
      "achieved_at": "2024-03-01T15:20:00Z"
    }
  ]
}
```

---

### 4. Train Cars

#### GET /cars
Get train cars spotted by user

Response: `200 OK`
```json
{
  "cars": [
    {
      "car_number": "9876",
      "model": "R68A",
      "times_spotted": 5,
      "first_seen": 1709740800000,
      "last_seen": 1710345600000
    }
  ]
}
```

#### GET /cars/:car_number
Get specific car details and community data

Response: `200 OK`
```json
{
  "car_number": "9876",
  "model": "R68A",
  "line": "N",
  "status": "active",
  "community_stats": {
    "total_sightings": 1500,
    "unique_users": 450,
    "last_spotted": 1710345600000
  }
}
```

---

### 5. Stations & Arrivals

#### GET /stations/nearby
Get nearby stations
Query params:
- `lat` (required)
- `lng` (required)
- `radius` (miles, default: 0.5)

Response: `200 OK`
```json
{
  "stations": [
    {
      "id": "127",
      "name": "Times Sq-42 St",
      "lines": ["1","2","3","N","Q","R","W"],
      "distance": 0.2,
      "latitude": 40.7580,
      "longitude": -73.9855
    }
  ]
}
```

#### GET /arrivals/:station_id
Get real-time arrivals for station (proxy to MTA GTFS-realtime)

Response: `200 OK`
```json
{
  "arrivals": [
    {
      "line": "N",
      "direction": "Downtown",
      "destination": "Coney Island",
      "arrival_time": 1709741100000,
      "minutes_away": 5
    }
  ]
}
```

---

### 6. Community Features

#### GET /leaderboard
Get community leaderboard
Query params:
- `type` (rides, cars, stations, time)
- `period` (week, month, all)
- `limit` (default: 10)

Response: `200 OK`
```json
{
  "leaderboard": [
    {
      "rank": 1,
      "username": "subway_king",
      "value": 450,
      "type": "rides"
    }
  ]
}
```

---

## Rate Limiting
- 100 requests per minute per user
- 1000 requests per hour per user

## Error Responses
All errors follow this format:
```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Car number must be 4 digits"
  }
}
```

Common error codes:
- `UNAUTHORIZED` (401)
- `FORBIDDEN` (403)
- `NOT_FOUND` (404)
- `RATE_LIMIT_EXCEEDED` (429)
- `INTERNAL_ERROR` (500)