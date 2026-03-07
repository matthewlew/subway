// MTA GTFS-realtime service
// Documentation: https://www.mta.info/developers
// API Registration: https://api.mta.info/

class MTAService {
    constructor() {
        // Get API key from environment variable or use placeholder
        // For Vercel: Set VITE_MTA_API_KEY in project settings
        this.apiKey = this.getApiKey();

        // Official MTA GTFS-realtime feed URLs (as of March 2026)
        this.feedUrls = {
            '123456': 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs',
            'ACE': 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-ace',
            'BDFM': 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-bdfm',
            'G': 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-g',
            'JZ': 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-jz',
            'NQRW': 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-nqrw',
            'L': 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-l',
            'SI': 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-si'
        };

        // Use mock data if no API key or explicitly set
        this.mockArrivals = this.shouldUseMockData();

        // Cache arrivals data (30 second cache matches MTA update frequency)
        this.arrivalsCache = new Map();
        this.cacheDuration = 30000; // 30 seconds
    }

    /**
     * Get API key from environment or config
     */
    getApiKey() {
        // Check for environment variable (Vercel deployment)
        if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_MTA_API_KEY) {
            return import.meta.env.VITE_MTA_API_KEY;
        }

        // Check for window config (set in index.html)
        if (typeof window !== 'undefined' && window.MTA_CONFIG?.apiKey) {
            return window.MTA_CONFIG.apiKey;
        }

        // Fallback: Check localStorage (for user-configured key)
        if (typeof localStorage !== 'undefined') {
            const storedKey = localStorage.getItem('mta_api_key');
            if (storedKey) return storedKey;
        }

        // Default placeholder
        return 'YOUR_MTA_API_KEY';
    }

    /**
     * Determine if mock data should be used
     */
    shouldUseMockData() {
        // Check environment variable
        if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_USE_MOCK_DATA === 'true') {
            return true;
        }

        // Check if API key is still placeholder
        if (!this.apiKey || this.apiKey === 'YOUR_MTA_API_KEY') {
            console.warn('MTA API key not configured. Using mock data. Get your key at: https://api.mta.info/');
            return true;
        }

        return false;
    }

    /**
     * Get real-time arrivals for a station.
     * Strategy: memory cache → localStorage cache (offline fallback) → live API → mock
     */
    async getArrivalsForStation(stationId, lines = []) {
        const cacheKey = `${stationId}-${lines.join(',')}`;
        const lsKey = `arrivals_${cacheKey}`;

        // 1. Hot in-memory cache (30s)
        const memCached = this.arrivalsCache.get(cacheKey);
        if (memCached && (Date.now() - memCached.timestamp < this.cacheDuration)) {
            return memCached.data;
        }

        // 2. If offline, serve localStorage cache (up to 10 min stale)
        if (!navigator.onLine) {
            const lsCached = this.getLocalCache(lsKey);
            if (lsCached) {
                lsCached.data.forEach(a => { a._cached = true; a._cacheAge = Date.now() - lsCached.timestamp; });
                return lsCached.data;
            }
            // No cache available offline — fall through to mock
            return this.getMockArrivals(stationId, lines);
        }

        // 3. Mock mode
        if (this.mockArrivals) {
            const mockData = this.getMockArrivals(stationId, lines);
            this.saveLocalCache(lsKey, mockData);
            this.arrivalsCache.set(cacheKey, { data: mockData, timestamp: Date.now() });
            return mockData;
        }

        // 4. Live API
        try {
            const arrivals = [];
            const feedGroups = new Set(lines.map(line => this.getFeedGroup(line)));

            for (const feedGroup of feedGroups) {
                const feedArrivals = await this.fetchFeedArrivals(feedGroup, stationId, lines);
                arrivals.push(...feedArrivals);
            }

            arrivals.sort((a, b) => a.arrivalTime - b.arrivalTime);
            this.arrivalsCache.set(cacheKey, { data: arrivals, timestamp: Date.now() });
            this.saveLocalCache(lsKey, arrivals);
            return arrivals;
        } catch (error) {
            console.error('MTA API error:', error);
            // Try localStorage before falling to mock
            const lsCached = this.getLocalCache(lsKey);
            if (lsCached) {
                lsCached.data.forEach(a => { a._cached = true; a._cacheAge = Date.now() - lsCached.timestamp; });
                return lsCached.data;
            }
            return this.getMockArrivals(stationId, lines);
        }
    }

    saveLocalCache(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
        } catch (e) { /* storage full, ignore */ }
    }

    getLocalCache(key, maxAgeMs = 10 * 60 * 1000) {
        try {
            const raw = localStorage.getItem(key);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            if (Date.now() - parsed.timestamp > maxAgeMs) return null;
            return parsed;
        } catch (e) { return null; }
    }

    async fetchFeedArrivals(feedGroup, stationId, lines) {
        const feedUrl = this.feedUrls[feedGroup];

        try {
            const response = await fetch(feedUrl, {
                headers: { 'x-api-key': this.apiKey }
            });

            if (!response.ok) {
                throw new Error(`MTA API returned ${response.status}`);
            }

            const buffer = await response.arrayBuffer();

            if (typeof GtfsRealtimeBindings !== 'undefined') {
                const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
                    new Uint8Array(buffer)
                );
                return this.parseGTFSFeed(feed, stationId, lines);
            } else {
                console.warn('GTFS-realtime-bindings not loaded');
                return [];
            }
        } catch (error) {
            console.error(`Error fetching feed ${feedGroup}:`, error);
            return [];
        }
    }

    parseGTFSFeed(feed, stationId, lines) {
        const arrivals = [];
        const now = Date.now();

        for (const entity of feed.entity) {
            if (entity.tripUpdate) {
                const tripUpdate = entity.tripUpdate;
                const trip = tripUpdate.trip;

                if (!lines.includes(trip.routeId)) continue;

                for (const stopTimeUpdate of tripUpdate.stopTimeUpdate || []) {
                    const stopId = stopTimeUpdate.stopId;
                    if (!stopId.startsWith(stationId)) continue;

                    const direction = stopId.endsWith('N') ? 'Uptown' : 'Downtown';
                    const arrivalTime = stopTimeUpdate.arrival?.time || stopTimeUpdate.departure?.time;

                    if (!arrivalTime) continue;

                    const arrivalTimestamp = arrivalTime.toNumber() * 1000;
                    const minutesAway = Math.max(0, Math.floor((arrivalTimestamp - now) / 60000));

                    if (minutesAway > 60) continue;

                    arrivals.push({
                        line: trip.routeId,
                        direction: direction,
                        destination: this.getDestination(trip.routeId, direction === 'Uptown'),
                        arrivalTime: arrivalTimestamp,
                        minutesAway: minutesAway,
                        stationId: stationId,
                        tripId: trip.tripId
                    });
                }
            }
        }

        return arrivals;
    }

    getMockArrivals(stationId, lines) {
        const now = Date.now();
        const arrivals = [];

        lines.forEach((line, idx) => {
            for (let i = 1; i <= 3; i++) {
                arrivals.push({
                    line: line,
                    direction: i % 2 === 0 ? 'Uptown' : 'Downtown',
                    destination: this.getDestination(line, i % 2 === 0),
                    arrivalTime: now + (i * 3 + idx * 2) * 60 * 1000,
                    minutesAway: i * 3 + idx * 2,
                    stationId: stationId
                });
            }
        });

        return arrivals.sort((a, b) => a.arrivalTime - b.arrivalTime);
    }

    getDestination(line, isUptown) {
        const destinations = {
            '1': { up: 'Van Cortlandt Park-242 St', down: 'South Ferry' },
            '2': { up: 'Wakefield-241 St', down: 'Flatbush Av-Brooklyn College' },
            '3': { up: 'Harlem-148 St', down: 'New Lots Av' },
            '4': { up: 'Woodlawn', down: 'Crown Hts-Utica Av' },
            '5': { up: 'Eastchester-Dyre Av', down: 'Flatbush Av-Brooklyn College' },
            '6': { up: 'Pelham Bay Park', down: 'Brooklyn Bridge-City Hall' },
            '7': { up: 'Flushing-Main St', down: '34 St-Hudson Yards' },
            'A': { up: 'Inwood-207 St', down: 'Far Rockaway-Mott Av' },
            'C': { up: '168 St', down: 'Euclid Av' },
            'E': { up: 'Jamaica Center-Parsons/Archer', down: 'World Trade Center' },
            'B': { up: 'Bedford Park Blvd', down: 'Brighton Beach' },
            'D': { up: 'Norwood-205 St', down: 'Coney Island-Stillwell Av' },
            'F': { up: 'Jamaica-179 St', down: 'Coney Island-Stillwell Av' },
            'M': { up: 'Metropolitan Av', down: 'Middle Village-Metropolitan Av' },
            'G': { up: 'Court Sq', down: 'Church Av' },
            'J': { up: 'Jamaica Center-Parsons/Archer', down: 'Broad St' },
            'Z': { up: 'Jamaica Center-Parsons/Archer', down: 'Broad St' },
            'L': { up: '8 Av', down: 'Canarsie-Rockaway Pkwy' },
            'N': { up: 'Astoria-Ditmars Blvd', down: 'Coney Island-Stillwell Av' },
            'Q': { up: '96 St-2 Av', down: 'Coney Island-Stillwell Av' },
            'R': { up: 'Forest Hills-71 Av', down: 'Bay Ridge-95 St' },
            'W': { up: 'Astoria-Ditmars Blvd', down: 'Whitehall St-South Ferry' },
            'S': { up: 'Times Sq-42 St', down: 'Grand Central-42 St' }
        };

        const dest = destinations[line] || { up: 'Uptown', down: 'Downtown' };
        return isUptown ? dest.up : dest.down;
    }

    getFeedGroup(line) {
        if (['1', '2', '3', '4', '5', '6', 'S'].includes(line)) return '123456';
        if (['A', 'C', 'E'].includes(line)) return 'ACE';
        if (['B', 'D', 'F', 'M'].includes(line)) return 'BDFM';
        if (line === 'G') return 'G';
        if (['J', 'Z'].includes(line)) return 'JZ';
        if (['N', 'Q', 'R', 'W'].includes(line)) return 'NQRW';
        if (line === 'L') return 'L';
        if (line === 'SI') return 'SI';
        return '123456';
    }

    formatArrivalTime(minutesAway) {
        if (minutesAway < 1) return 'Arriving';
        if (minutesAway === 1) return '1 min';
        return `${minutesAway} min`;
    }

    clearCache() {
        this.arrivalsCache.clear();
    }
}

const mtaService = new MTAService();