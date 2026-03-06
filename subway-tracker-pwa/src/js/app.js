// Main application logic
class SubwayTrackerApp {
    constructor() {
        this.currentScreen = 'pre-ride';
        this.selectedArrival = null;
        this.updateInterval = null;
    }

    async init() {
        console.log('Initializing Subway Tracker...');

        // Initialize database
        await dbService.init();

        // Setup navigation
        this.setupNavigation();

        // Setup screens
        this.setupPreRideScreen();
        this.setupLogRideScreen();
        this.setupStatsScreen();

        // Request notification permission
        await rideLogger.requestNotificationPermission();

        // Check for install prompt
        this.setupInstallPrompt();

        // Handle URL parameters (e.g., ?action=log for shortcuts)
        this.handleURLParams();

        console.log('✓ App initialized');
    }

    setupNavigation() {
        const navButtons = document.querySelectorAll('.nav-btn');

        navButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const screen = btn.dataset.screen;
                this.switchScreen(screen);

                // Update active state
                navButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
    }

    switchScreen(screenName) {
        // Hide all screens
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));

        // Show selected screen
        const screen = document.getElementById(`${screenName}-screen`);
        if (screen) {
            screen.classList.add('active');
            this.currentScreen = screenName;

            // Load screen data
            if (screenName === 'pre-ride') {
                this.loadPreRideScreen();
            } else if (screenName === 'stats') {
                this.loadStatsScreen();
            }
        }
    }

    setupPreRideScreen() {
        const refreshBtn = document.getElementById('refresh-arrivals');
        const quickLogBtn = document.getElementById('quick-log-from-arrival');
        const detectBtn = document.getElementById('detect-location-btn');

        refreshBtn?.addEventListener('click', () => this.loadPreRideScreen());

        quickLogBtn?.addEventListener('click', async () => {
            if (this.selectedArrival) {
                rideLogger.setSelectedArrival(this.selectedArrival);
                this.switchScreen('log-ride');
            }
        });

        // Trigger location only on user gesture
        detectBtn?.addEventListener('click', () => {
            detectBtn.disabled = true;
            detectBtn.textContent = 'Detecting…';
            this.loadPreRideScreen();
        });

        // Manual station search
        this.setupStationSearch();
    }

    setupStationSearch() {
        const input = document.getElementById('station-search');
        const suggestionsEl = document.getElementById('station-suggestions');
        if (!input || !suggestionsEl) return;

        const allStations = locationService.stations;

        input.addEventListener('input', () => {
            const query = input.value.trim().toLowerCase();
            if (query.length < 2) { suggestionsEl.style.display = 'none'; return; }

            const matches = allStations.filter(s => s.name.toLowerCase().includes(query)).slice(0, 8);
            if (!matches.length) { suggestionsEl.style.display = 'none'; return; }

            suggestionsEl.innerHTML = matches.map(s => `
                <div class="suggestion-item" data-id="${s.id}" style="padding:10px 14px;cursor:pointer;border-bottom:1px solid #f0f0f0;font-size:14px;">
                    <strong>${s.name}</strong>
                    <span style="color:#999;font-size:12px;margin-left:6px;">${s.lines.join(', ')}</span>
                </div>
            `).join('');
            suggestionsEl.style.display = 'block';

            suggestionsEl.querySelectorAll('.suggestion-item').forEach(item => {
                item.addEventListener('mousedown', async (e) => {
                    e.preventDefault();
                    const stationId = item.dataset.id;
                    const station = allStations.find(s => s.id === stationId);
                    input.value = station.name;
                    suggestionsEl.style.display = 'none';
                    await this.loadArrivalsForStation(station);
                });
                item.addEventListener('touchstart', async (e) => {
                    const stationId = item.dataset.id;
                    const station = allStations.find(s => s.id === stationId);
                    input.value = station.name;
                    suggestionsEl.style.display = 'none';
                    await this.loadArrivalsForStation(station);
                });
            });
        });

        // Hide suggestions on blur
        input.addEventListener('blur', () => {
            setTimeout(() => { suggestionsEl.style.display = 'none'; }, 150);
        });
    }

    async loadArrivalsForStation(station) {
        const locationStatus = document.getElementById('location-status');
        const arrivalsList = document.getElementById('arrivals-list');

        locationStatus.querySelector('p').textContent = `📍 Showing: ${station.name}`;
        arrivalsList.innerHTML = '<p style="color:#999;padding:16px;">Loading arrivals…</p>';

        // Update log screen station field too
        const stationInput = document.getElementById('current-station');
        if (stationInput) stationInput.value = station.name;

        const arrivals = await mtaService.getArrivalsForStation(station.id, station.lines);
        this.renderArrivals(arrivals);
    }

    async loadPreRideScreen() {
        const locationStatus = document.getElementById('location-status');
        const arrivalsList = document.getElementById('arrivals-list');

        try {
            locationStatus.innerHTML = '<p>📍 Getting your location…</p>';

            // Get location
            await locationService.getCurrentPosition();

            // Try within 0.5 miles first, then fall back to closest overall
            let nearbyStations = locationService.getNearbyStations(0.5);
            if (nearbyStations.length === 0) {
                nearbyStations = locationService.getNearbyStations(5.0);
            }

            if (nearbyStations.length === 0) {
                locationStatus.innerHTML = '<p>⚠️ No stations found nearby. Are you in NYC?</p>';
                arrivalsList.innerHTML = '';
                return;
            }

            const closestStation = nearbyStations[0];
            locationStatus.innerHTML = `
                <p>📍 Nearest: <strong>${closestStation.name}</strong> 
                &mdash; ${(closestStation.distance * 5280).toFixed(0)} ft away</p>
                <button id="detect-location-btn" onclick="window.subwayApp.loadPreRideScreen()" 
                  style="margin-top:8px;padding:6px 14px;background:#ECF0F1;border:none;border-radius:6px;cursor:pointer;font-size:13px;">
                  ↻ Refresh
                </button>
            `;

            // Load arrivals
            const arrivals = await mtaService.getArrivalsForStation(
                closestStation.id,
                closestStation.lines
            );

            this.renderArrivals(arrivals);

        } catch (error) {
            console.error('Location error:', error);
            let msg = '❌ Could not get location.';
            if (error.code === 1) msg = '🚫 Location permission denied. Go to Settings → Privacy → Location and enable for your browser.';
            else if (error.code === 2) msg = '⚠️ Location unavailable. Try again.';
            else if (error.code === 3) msg = '⏱ Location timed out. Try again.';
            locationStatus.innerHTML = `
                <p style="color:#E74C3C">${msg}</p>
                <button id="detect-location-btn" onclick="window.subwayApp.loadPreRideScreen()" class="btn-primary" style="margin-top:10px;">Try Again</button>
            `;
            arrivalsList.innerHTML = '';
        }
    }

    renderArrivals(arrivals) {
        const arrivalsList = document.getElementById('arrivals-list');
        const quickLogBtn = document.getElementById('quick-log-from-arrival');

        if (arrivals.length === 0) {
            arrivalsList.innerHTML = '<p style="text-align:center;color:#7F8C8D;padding:20px;">No upcoming trains</p>';
            return;
        }

        arrivalsList.innerHTML = arrivals.map((arrival, idx) => `
            <div class="arrival-card" data-index="${idx}">
                <div class="arrival-info">
                    <div>
                        <span class="arrival-line" style="background:${statsService.getLineColor(arrival.line)}">${arrival.line}</span>
                        <span>${arrival.destination}</span>
                    </div>
                    <div class="arrival-destination">${arrival.direction}</div>
                </div>
                <div class="arrival-time">${mtaService.formatArrivalTime(arrival.minutesAway)}</div>
            </div>
        `).join('');

        // Add click handlers
        const arrivalCards = arrivalsList.querySelectorAll('.arrival-card');
        arrivalCards.forEach((card, idx) => {
            card.addEventListener('click', () => {
                // Remove previous selection
                arrivalCards.forEach(c => c.classList.remove('selected'));

                // Select this arrival
                card.classList.add('selected');
                this.selectedArrival = arrivals[idx];

                // Enable quick log button
                quickLogBtn.classList.remove('disabled');
                quickLogBtn.textContent = `Log ${arrivals[idx].line} train to ${arrivals[idx].destination}`;
            });
        });
    }

    setupLogRideScreen() {
        const logBtn = document.getElementById('log-ride-btn');
        const lineSelector = document.getElementById('line-selector');
        const carNumberInput = document.getElementById('car-number');
        const scanCarBtn = document.getElementById('scan-car-btn');
        const rideNoteInput = document.getElementById('ride-note');

        // Update current time every second
        this.updateCurrentTime();
        setInterval(() => this.updateCurrentTime(), 1000);

        // Update current station
        this.updateCurrentStation();

        // Log ride button
        logBtn?.addEventListener('click', async () => {
            const carNumber = carNumberInput?.value.trim();
            const note = rideNoteInput?.value.trim();
            const line = lineSelector?.value || null;

            // Validate car number if provided
            if (carNumber && !rideLogger.validateCarNumber(carNumber)) {
                alert('Car number must be 4 digits');
                return;
            }

            // Log the ride
            const result = await rideLogger.logRide({
                line,
                carNumber: carNumber || null,
                note: note || null
            });

            if (result.success) {
                // Clear inputs
                if (carNumberInput) carNumberInput.value = '';
                if (rideNoteInput) rideNoteInput.value = '';
                if (lineSelector) lineSelector.value = '';
                document.getElementById('car-model-info').textContent = '';

                // Update stats
                setTimeout(() => this.loadStatsScreen(), 500);
            }
        });

        // Car number input - show model info
        carNumberInput?.addEventListener('input', (e) => {
            const carNumber = e.target.value.trim();
            const modelInfo = document.getElementById('car-model-info');

            if (carNumber.length === 4 && rideLogger.validateCarNumber(carNumber)) {
                const model = rideLogger.getCarModel(carNumber);
                modelInfo.textContent = `Model: ${model}`;
                modelInfo.style.color = '#27AE60';
            } else {
                modelInfo.textContent = '';
            }
        });

        // Scan car button
        scanCarBtn?.addEventListener('click', () => this.openCameraModal());
    }

    updateCurrentTime() {
        const timeEl = document.getElementById('current-time');
        if (timeEl) {
            const now = new Date();
            timeEl.textContent = now.toLocaleTimeString('en-US', { 
                hour: 'numeric', 
                minute: '2-digit',
                hour12: true 
            });
        }
    }

    async updateCurrentStation() {
        const stationEl = document.getElementById('current-station');
        if (!stationEl) return;

        try {
            const station = await rideLogger.detectStation();
            if (station) {
                stationEl.textContent = station.name;
            } else {
                stationEl.textContent = 'Unknown (enable location)';
            }
        } catch (error) {
            stationEl.textContent = 'Unknown';
        }
    }

    openCameraModal() {
        const modal = document.getElementById('camera-modal');
        const video = document.getElementById('camera-feed');
        const captureBtn = document.getElementById('capture-btn');
        const closeBtn = modal?.querySelector('.modal-close');

        modal?.classList.add('active');

        // Request camera access
        navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
            .then(stream => {
                video.srcObject = stream;
            })
            .catch(error => {
                console.error('Camera error:', error);
                alert('Camera access denied');
                modal?.classList.remove('active');
            });

        // Capture button
        captureBtn?.addEventListener('click', () => {
            this.captureCarNumber(video);
        });

        // Close button
        closeBtn?.addEventListener('click', () => {
            const stream = video.srcObject;
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
            modal?.classList.remove('active');
        });
    }

    captureCarNumber(video) {
        const canvas = document.getElementById('camera-canvas');
        const ctx = canvas.getContext('2d');

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);

        // In production, use OCR library (e.g., Tesseract.js)
        // For now, show placeholder
        const ocrResult = document.getElementById('ocr-result');
        ocrResult.innerHTML = '<p>OCR processing... (add Tesseract.js for production)</p>';

        // Simulate OCR result
        setTimeout(() => {
            const mockCarNumber = '1234'; // Replace with actual OCR
            document.getElementById('car-number').value = mockCarNumber;

            // Close modal
            const modal = document.getElementById('camera-modal');
            const stream = video.srcObject;
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
            modal?.classList.remove('active');
        }, 2000);
    }

    async setupStatsScreen() {
        const periodSelector = document.getElementById('stats-period');

        periodSelector?.addEventListener('change', () => {
            this.loadStatsScreen();
        });

        await this.loadStatsScreen();
    }

    async loadStatsScreen() {
        const period = document.getElementById('stats-period')?.value || 'all';
        const rides = await dbService.getAllRides();
        const stats = await statsService.calculateStats(rides, period);

        // Update stat cards
        document.getElementById('total-rides').textContent = stats.totalRides;
        document.getElementById('time-underground').textContent = 
            `${stats.timeUnderground.hours}h ${stats.timeUnderground.minutes}m`;
        document.getElementById('top-station').textContent = stats.topStation || '--';
        document.getElementById('top-line').textContent = stats.topLine || '--';

        // Render recent rides
        this.renderRecentRides(stats.recentRides);

        // Render cars list
        await this.renderCarsList();
    }

    renderRecentRides(rides) {
        const container = document.getElementById('recent-rides-list');
        if (!container) return;

        if (rides.length === 0) {
            container.innerHTML = '<p style="text-align:center;color:#7F8C8D;">No rides yet</p>';
            return;
        }

        container.innerHTML = rides.map(ride => `
            <div class="ride-item">
                <div class="ride-item-left">
                    <span class="ride-line-badge" style="background:${statsService.getLineColor(ride.line)}">${ride.line || '?'}</span>
                    <span>${ride.station}</span>
                </div>
                <span class="ride-time">${statsService.formatDate(ride.timestamp)}</span>
            </div>
        `).join('');
    }

    async renderCarsList() {
        const container = document.getElementById('cars-list');
        if (!container) return;

        const cars = await dbService.getAllCars();

        if (cars.length === 0) {
            container.innerHTML = '<p style="text-align:center;color:#7F8C8D;">No cars logged yet</p>';
            return;
        }

        const sortedCars = cars.sort((a, b) => b.timesSpotted - a.timesSpotted).slice(0, 10);

        container.innerHTML = sortedCars.map(car => `
            <div class="car-item">
                <div>
                    <strong>Car ${car.carNumber}</strong>
                    <div style="font-size:12px;color:#7F8C8D;">${car.model}</div>
                </div>
                <span>${car.timesSpotted}× spotted</span>
            </div>
        `).join('');
    }

    setupInstallPrompt() {
        let deferredPrompt;

        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;

            // Show install button or prompt
            console.log('PWA install available');
        });

        window.addEventListener('appinstalled', () => {
            console.log('PWA installed');
            deferredPrompt = null;
        });
    }

    handleURLParams() {
        const params = new URLSearchParams(window.location.search);
        const action = params.get('action');

        if (action === 'log') {
            this.switchScreen('log-ride');
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const app = new SubwayTrackerApp();
    app.init();

    // Make app globally accessible for debugging
    window.subwayApp = app;
});