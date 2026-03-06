// Location service for detecting nearby stations
class LocationService {
    constructor() {
        this.currentLocation = null;
        this.watchId = null;

        // NYC Subway stations (sample data - in production, load from API)
        this.stations = [
            { id: '127', name: 'Times Sq-42 St', lat: 40.7580, lng: -73.9855, lines: ['1', '2', '3', 'N', 'Q', 'R', 'W'] },
            { id: '120', name: 'Grand Central-42 St', lat: 40.7527, lng: -73.9772, lines: ['4', '5', '6'] },
            { id: '132', name: 'Union Sq-14 St', lat: 40.7347, lng: -73.9906, lines: ['4', '5', '6', 'L', 'N', 'Q', 'R', 'W'] },
            { id: 'A27', name: 'Penn Station-34 St', lat: 40.7505, lng: -73.9934, lines: ['1', '2', '3'] },
            { id: 'D15', name: 'Herald Sq-34 St', lat: 40.7497, lng: -73.9880, lines: ['N', 'Q', 'R', 'W'] },
            { id: 'R16', name: 'Canal St', lat: 40.7188, lng: -74.0062, lines: ['N', 'Q', 'R', 'W', '6'] },
            { id: 'A32', name: 'Fulton St', lat: 40.7098, lng: -74.0088, lines: ['2', '3', '4', '5', 'A', 'C'] },
            { id: '140', name: 'Atlantic Av-Barclays Ctr', lat: 40.6844, lng: -73.9772, lines: ['2', '3', '4', '5', 'B', 'D', 'N', 'Q', 'R'] },
            { id: 'G08', name: 'Court Sq', lat: 40.7467, lng: -73.9459, lines: ['E', 'M', 'G'] },
            { id: 'L01', name: '8 Av', lat: 40.7392, lng: -74.0027, lines: ['L'] }
        ];
    }

    async getCurrentPosition() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation not supported'));
                return;
            }

            navigator.geolocation.getCurrentPosition(
                position => {
                    this.currentLocation = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                        accuracy: position.coords.accuracy
                    };
                    resolve(this.currentLocation);
                },
                error => reject(error),
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 30000
                }
            );
        });
    }

    startWatching(callback) {
        if (!navigator.geolocation) return;

        this.watchId = navigator.geolocation.watchPosition(
            position => {
                this.currentLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    accuracy: position.coords.accuracy
                };
                callback(this.currentLocation);
            },
            error => console.error('Location watch error:', error),
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 30000
            }
        );
    }

    stopWatching() {
        if (this.watchId) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
        }
    }

    getNearbyStations(maxDistance = 0.5) {
        if (!this.currentLocation) return [];

        return this.stations
            .map(station => ({
                ...station,
                distance: this.calculateDistance(
                    this.currentLocation.lat,
                    this.currentLocation.lng,
                    station.lat,
                    station.lng
                )
            }))
            .filter(station => station.distance <= maxDistance)
            .sort((a, b) => a.distance - b.distance);
    }

    getClosestStation() {
        const nearby = this.getNearbyStations(2.0); // 2 miles
        return nearby.length > 0 ? nearby[0] : null;
    }

    calculateDistance(lat1, lng1, lat2, lng2) {
        // Haversine formula for distance in miles
        const R = 3959; // Earth's radius in miles
        const dLat = this.toRad(lat2 - lat1);
        const dLng = this.toRad(lng2 - lng1);

        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
                  Math.sin(dLng/2) * Math.sin(dLng/2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    toRad(degrees) {
        return degrees * (Math.PI / 180);
    }

    getStationById(stationId) {
        return this.stations.find(s => s.id === stationId);
    }

    getStationsByLine(line) {
        return this.stations.filter(s => s.lines.includes(line));
    }

    // Infer likely line based on station and time of day
    inferLine(station, timestamp = Date.now()) {
        if (!station || !station.lines || station.lines.length === 0) {
            return null;
        }

        // If only one line at station, return it
        if (station.lines.length === 1) {
            return station.lines[0];
        }

        // Simple heuristic: return the first line
        // In production, use real-time data or user history
        return station.lines[0];
    }
}

// Create global instance
const locationService = new LocationService();