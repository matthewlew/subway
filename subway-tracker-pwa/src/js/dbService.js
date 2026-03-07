// Car model reference data — keyed by the model names returned by inferCarModel()
const CAR_MODEL_DATA = {
    'R62/R62A': {
        built:        '1983–1985',
        manufacturer: 'Bombardier / St. Louis Car Co.',
        lines:        ['1','2','3','4','5','6'],
        note:         'Last of the classic IRT fleet; still serving 60 years on'
    },
    'R142/R142A': {
        built:        '1999–2006',
        manufacturer: 'Bombardier / Kawasaki',
        lines:        ['1','2','3','4','5'],
        note:         'First NYC cars with automated passenger information displays'
    },
    'R160': {
        built:        '2006–2010',
        manufacturer: 'Alstom / Kawasaki',
        lines:        ['A','C','E','J','Z','N','Q','R'],
        note:         'Largest single order in MTA history — 1,662 cars'
    },
    'R68/R68A': {
        built:        '1986–1988',
        manufacturer: 'Kawasaki / Bombardier',
        lines:        ['B','D','F','N','Q'],
        note:         'BMT workhorse — originally had no exterior route signs'
    },
    'R143/R160': {
        built:        '2001–2010',
        manufacturer: 'Kawasaki / Alstom',
        lines:        ['L','A','C','E'],
        note:         'R143 was built exclusively for the L line'
    },
    'R46': {
        built:        '1975–1978',
        manufacturer: 'Pullman Standard',
        lines:        ['A','C','F','R'],
        note:         'One of the oldest cars still in service — outlasted many newer models'
    },
    'R179': {
        built:        '2018–2020',
        manufacturer: 'Bombardier',
        lines:        ['A','C','J','Z'],
        note:         'Delivery ran 2+ years behind schedule'
    },
    'R211': {
        built:        '2022–present',
        manufacturer: 'Kawasaki',
        lines:        ['A','C','E','B','D','F'],
        note:         'The newest fleet — open gangways between cars'
    },
    'R32 (Vintage)': {
        built:        '1964–1965',
        manufacturer: 'Budd Company',
        lines:        ['A','C'],
        note:         '"Brightliners" — served 50+ years before retirement'
    },
    'Unknown': {
        built:        '—',
        manufacturer: '—',
        lines:        [],
        note:         'Car number not in a known range'
    }
};

// IndexedDB service for offline data storage
class DBService {
    constructor() {
        this.dbName = 'SubwayTrackerDB';
        this.version = 1;
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Rides store
                if (!db.objectStoreNames.contains('rides')) {
                    const ridesStore = db.createObjectStore('rides', { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                    ridesStore.createIndex('timestamp', 'timestamp', { unique: false });
                    ridesStore.createIndex('station', 'station', { unique: false });
                    ridesStore.createIndex('line', 'line', { unique: false });
                    ridesStore.createIndex('carNumber', 'carNumber', { unique: false });
                }

                // Pending rides (for offline sync)
                if (!db.objectStoreNames.contains('pending-rides')) {
                    db.createObjectStore('pending-rides', { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                }

                // Stations cache
                if (!db.objectStoreNames.contains('stations')) {
                    const stationsStore = db.createObjectStore('stations', { keyPath: 'id' });
                    stationsStore.createIndex('name', 'name', { unique: false });
                }

                // Train cars spotted
                if (!db.objectStoreNames.contains('cars')) {
                    const carsStore = db.createObjectStore('cars', { keyPath: 'carNumber' });
                    carsStore.createIndex('model', 'model', { unique: false });
                    carsStore.createIndex('timesSpotted', 'timesSpotted', { unique: false });
                }
            };
        });
    }

    async addRide(rideData) {
        const tx = this.db.transaction(['rides'], 'readwrite');
        const store = tx.objectStore('rides');

        const ride = {
            ...rideData,
            timestamp: rideData.timestamp || Date.now(),
            synced: navigator.onLine
        };

        const request = store.add(ride);

        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async addPendingRide(rideData) {
        const tx = this.db.transaction(['pending-rides'], 'readwrite');
        const store = tx.objectStore('pending-rides');
        const request = store.add(rideData);

        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getAllRides() {
        const tx = this.db.transaction(['rides'], 'readonly');
        const store = tx.objectStore('rides');
        const request = store.getAll();

        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getRidesByDateRange(startDate, endDate) {
        const allRides = await this.getAllRides();
        return allRides.filter(ride => {
            return ride.timestamp >= startDate && ride.timestamp <= endDate;
        });
    }

    async deleteRide(id) {
        const tx = this.db.transaction(['rides'], 'readwrite');
        const store = tx.objectStore('rides');
        const request = store.delete(id);
        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async updateRide(id, updates) {
        const tx = this.db.transaction(['rides'], 'readwrite');
        const store = tx.objectStore('rides');
        const getRequest = store.get(id);
        return new Promise((resolve, reject) => {
            getRequest.onsuccess = () => {
                const existing = getRequest.result;
                if (!existing) { reject(new Error('Ride not found')); return; }
                const updated = { ...existing, ...updates };
                const putRequest = store.put(updated);
                putRequest.onsuccess = () => resolve(updated);
                putRequest.onerror = () => reject(putRequest.error);
            };
            getRequest.onerror = () => reject(getRequest.error);
        });
    }

    async updateCar(carNumber, model) {
        const tx = this.db.transaction(['cars'], 'readwrite');
        const store = tx.objectStore('cars');

        // Check if car exists
        const getRequest = store.get(carNumber);

        return new Promise((resolve, reject) => {
            getRequest.onsuccess = () => {
                const existingCar = getRequest.result;

                const carData = existingCar ? {
                    ...existingCar,
                    timesSpotted: existingCar.timesSpotted + 1,
                    lastSeen: Date.now()
                } : {
                    carNumber,
                    model: model || this.inferCarModel(carNumber),
                    timesSpotted: 1,
                    firstSeen: Date.now(),
                    lastSeen: Date.now()
                };

                const putRequest = store.put(carData);
                putRequest.onsuccess = () => resolve(carData);
                putRequest.onerror = () => reject(putRequest.error);
            };
            getRequest.onerror = () => reject(getRequest.error);
        });
    }

    async getAllCars() {
        const tx = this.db.transaction(['cars'], 'readonly');
        const store = tx.objectStore('cars');
        const request = store.getAll();

        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    inferCarModel(carNumber) {
        const num = parseInt(carNumber);

        if (num >= 1000 && num <= 1802) return 'R62/R62A';
        if (num >= 2000 && num <= 2925) return 'R142/R142A';
        if (num >= 3000 && num <= 3999) return 'R160';
        if (num >= 4000 && num <= 4999) return 'R68/R68A';
        if (num >= 5000 && num <= 5999) return 'R143/R160';
        if (num >= 6000 && num <= 6999) return 'R46';
        if (num >= 7000 && num <= 7999) return 'R179';
        if (num >= 8000 && num <= 8999) return 'R211';
        if (num >= 9000 && num <= 9999) return 'R32 (Vintage)';

        return 'Unknown';
    }

    getCarModelInfo(carNumber) {
        const model = this.inferCarModel(carNumber);
        return { model, ...CAR_MODEL_DATA[model] };
    }

    async cacheStation(stationData) {
        const tx = this.db.transaction(['stations'], 'readwrite');
        const store = tx.objectStore('stations');
        const request = store.put(stationData);

        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getStation(stationId) {
        const tx = this.db.transaction(['stations'], 'readonly');
        const store = tx.objectStore('stations');
        const request = store.get(stationId);

        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
}

// Create global instance
const dbService = new DBService();