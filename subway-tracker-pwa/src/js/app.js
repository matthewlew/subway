// Main application logic
class SubwayTrackerApp {
    constructor() {
        this.currentScreen = 'arrivals';
        this.selectedArrival = null;
        this.countdownInterval = null;
        this.renderedArrivals = [];
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
        document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));

        // Show selected screen
        const screen = document.getElementById(`${screenName}-screen`);
        if (screen) {
            screen.classList.add('active');
            this.currentScreen = screenName;

            if (screenName === 'stats') {
                this.loadStatsScreen();
            }
        }

        // Sync nav button active state
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.screen === screenName);
        });
    }

    setupPreRideScreen() {
        const refreshBtn = document.getElementById('refresh-arrivals');
        const quickLogBtn = document.getElementById('quick-log-from-arrival');
        const detectBtn = document.getElementById('detect-location-btn');

        refreshBtn?.addEventListener('click', () => this.loadPreRideScreen());

        quickLogBtn?.addEventListener('click', async () => {
            if (this.selectedArrival) {
                rideLogger.setSelectedArrival(this.selectedArrival);
                // Pre-fill line selector on log screen
                const lineSelector = document.getElementById('line-selector');
                if (lineSelector && this.selectedArrival.line) {
                    lineSelector.value = this.selectedArrival.line;
                }
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

        // Keep search box filled
        const searchInput = document.getElementById('station-search');
        if (searchInput && !searchInput.value) searchInput.value = station.name;

        const arrivals = await mtaService.getArrivalsForStation(station.id, station.lines);
        this.renderArrivals(arrivals);
        this.startCountdown();
    }

    async loadPreRideScreen() {
        const locationStatusMsg = document.getElementById('location-status-msg');
        const arrivalsList = document.getElementById('arrivals-list');
        const detectBtn = document.getElementById('detect-location-btn');

        if (locationStatusMsg) locationStatusMsg.textContent = '📍 Getting your location…';
        if (detectBtn) { detectBtn.disabled = true; detectBtn.textContent = 'Detecting…'; }

        try {
            await locationService.getCurrentPosition();

            let nearbyStations = locationService.getNearbyStations(0.5);
            if (nearbyStations.length === 0) nearbyStations = locationService.getNearbyStations(5.0);

            if (nearbyStations.length === 0) {
                if (locationStatusMsg) locationStatusMsg.textContent = '⚠️ No stations found. Are you in NYC?';
                if (detectBtn) { detectBtn.disabled = false; detectBtn.textContent = '📍 Use My Location'; }
                return;
            }

            const closestStation = nearbyStations[0];
            if (locationStatusMsg) locationStatusMsg.textContent = `📍 Nearest: ${closestStation.name} — ${(closestStation.distance * 5280).toFixed(0)} ft away`;
            if (detectBtn) { detectBtn.disabled = false; detectBtn.textContent = '↻ Refresh Location'; }

            // Fill in the search box
            const searchInput = document.getElementById('station-search');
            if (searchInput) searchInput.value = closestStation.name;

            const arrivals = await mtaService.getArrivalsForStation(closestStation.id, closestStation.lines);
            this.renderArrivals(arrivals);
            this.startCountdown();

        } catch (error) {
            console.error('Location error:', error);
            let msg = '❌ Could not get location.';
            if (error.code === 1) msg = '🚫 Permission denied — enable location in Settings.';
            else if (error.code === 2) msg = '⚠️ Position unavailable. Try again.';
            else if (error.code === 3) msg = '⏱ Timed out. Try again.';
            if (locationStatusMsg) locationStatusMsg.style.color = '#E74C3C';
            if (locationStatusMsg) locationStatusMsg.textContent = msg;
            if (detectBtn) { detectBtn.disabled = false; detectBtn.textContent = '📍 Use My Location'; }
        }
    }

    renderArrivals(arrivals) {
        const arrivalsList = document.getElementById('arrivals-list');
        const quickLogBtn = document.getElementById('quick-log-from-arrival');

        // Store for countdown updates
        this.renderedArrivals = arrivals.map(a => ({ ...a, fetchedAt: Date.now() }));
        this.selectedArrival = null;

        if (quickLogBtn) {
            quickLogBtn.style.display = 'none';
            quickLogBtn.disabled = true;
        }

        if (arrivals.length === 0) {
            arrivalsList.innerHTML = '<p style="text-align:center;color:#7F8C8D;padding:20px;">No upcoming trains</p>';
            return;
        }

        this._renderArrivalCards(arrivalsList, arrivals, quickLogBtn);
    }

    _renderArrivalCards(arrivalsList, arrivals, quickLogBtn) {
        arrivalsList.innerHTML = arrivals.map((arrival, idx) => `
            <div class="arrival-card" data-index="${idx}">
                <span class="line-badge" style="background:${statsService.getLineColor(arrival.line)};color:${['N','Q','R','W','L'].includes(arrival.line) ? '#000' : '#fff'}">${arrival.line}</span>
                <div class="arrival-info">
                    <div class="destination">${arrival.destination}</div>
                    <div class="direction">${arrival.direction}</div>
                </div>
                <div class="arrival-time${arrival.minutesAway < 1 ? ' arriving' : ''}" data-arrival-idx="${idx}">
                    ${mtaService.formatArrivalTime(arrival.minutesAway)}
                </div>
            </div>
        `).join('');

        // Add click handlers
        const arrivalCards = arrivalsList.querySelectorAll('.arrival-card');
        arrivalCards.forEach((card, idx) => {
            card.addEventListener('click', () => {
                arrivalCards.forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                this.selectedArrival = arrivals[idx];

                if (quickLogBtn) {
                    quickLogBtn.style.display = 'block';
                    quickLogBtn.disabled = false;
                    quickLogBtn.classList.remove('disabled');
                    quickLogBtn.textContent = `🚇 Log ${arrivals[idx].line} to ${arrivals[idx].destination}`;
                }
            });
        });
    }

    // Update arrival time displays every 30s without re-rendering the whole list
    startCountdown() {
        if (this.countdownInterval) clearInterval(this.countdownInterval);

        this.countdownInterval = setInterval(() => {
            const now = Date.now();
            this.renderedArrivals.forEach((arrival, idx) => {
                const elapsed = Math.floor((now - arrival.fetchedAt) / 60000);
                const currentMins = Math.max(0, arrival.minutesAway - elapsed);
                const el = document.querySelector(`[data-arrival-idx="${idx}"]`);
                if (el) {
                    el.textContent = mtaService.formatArrivalTime(currentMins);
                    el.className = `arrival-time${currentMins < 1 ? ' arriving' : ''}`;
                }
            });
        }, 15000); // update every 15 seconds
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

            logBtn.disabled = true;
            logBtn.textContent = 'Logging…';

            // Log the ride
            const result = await rideLogger.logRide({
                line,
                carNumber: carNumber || null,
                note: note || null
            });

            logBtn.disabled = false;
            logBtn.innerHTML = '<span>🚇</span> Log Ride Now';

            if (result.success) {
                // Clear inputs
                if (carNumberInput) carNumberInput.value = '';
                if (rideNoteInput) rideNoteInput.value = '';
                if (lineSelector) lineSelector.value = '';
                const modelInfo = document.getElementById('car-model-info');
                if (modelInfo) modelInfo.textContent = '';

                // Switch to stats after a short delay
                setTimeout(() => {
                    this.switchScreen('stats');
                }, 800);
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
                stationEl.value = station.name;
            } else {
                stationEl.value = 'Unknown (enable location)';
            }
        } catch (error) {
            stationEl.value = 'Unknown';
        }
    }

    openCameraModal() {
        const modal = document.getElementById('camera-modal');
        const video = document.getElementById('camera-feed');
        const captureBtn = document.getElementById('capture-btn');
        const closeBtn = modal?.querySelector('.modal-close');

        if (!modal) return;
        modal.style.display = 'flex';

        // Request camera access
        navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
            .then(stream => {
                video.srcObject = stream;
            })
            .catch(error => {
                console.error('Camera error:', error);
                alert('Camera access denied');
                modal.style.display = 'none';
            });

        // Capture button — remove old listeners first
        const newCaptureBtn = captureBtn.cloneNode(true);
        captureBtn.parentNode.replaceChild(newCaptureBtn, captureBtn);
        newCaptureBtn.addEventListener('click', () => {
            this.captureCarNumber(video);
        });

        // Close button
        const newCloseBtn = closeBtn?.cloneNode(true);
        if (closeBtn && newCloseBtn) {
            closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
            newCloseBtn.addEventListener('click', () => {
                this.closeCameraModal(modal, video);
            });
        }
    }

    closeCameraModal(modal, video) {
        const stream = video?.srcObject;
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        if (video) video.srcObject = null;
        if (modal) modal.style.display = 'none';
    }

    captureCarNumber(video) {
        const canvas = document.getElementById('camera-canvas');
        if (!canvas || !video) return;

        const ctx = canvas.getContext('2d');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);

        const ocrResult = document.getElementById('ocr-result');
        if (ocrResult) ocrResult.innerHTML = '<p style="color:#666;">OCR processing… (add Tesseract.js for production)</p>';

        // Simulate OCR result for now
        setTimeout(() => {
            const mockCarNumber = '1234';
            const carInput = document.getElementById('car-number');
            if (carInput) carInput.value = mockCarNumber;

            const modal = document.getElementById('camera-modal');
            this.closeCameraModal(modal, video);
        }, 1500);
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
            stats.timeUnderground.hours > 0
                ? `${stats.timeUnderground.hours}h ${stats.timeUnderground.minutes}m`
                : `${stats.timeUnderground.minutes}m`;
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
            container.innerHTML = '<p style="text-align:center;color:#7F8C8D;">No rides yet — log your first ride!</p>';
            return;
        }

        container.innerHTML = rides.map(ride => `
            <div class="ride-item">
                <span class="line-badge" style="background:${statsService.getLineColor(ride.line)};color:${['N','Q','R','W','L'].includes(ride.line) ? '#000' : '#fff'};width:32px;height:32px;font-size:15px;">${ride.line || '?'}</span>
                <div class="ride-details">
                    <div class="station-name">${ride.station}</div>
                    <div class="ride-time">${statsService.formatDate(ride.timestamp)}</div>
                </div>
            </div>
        `).join('');
    }

    async renderCarsList() {
        const container = document.getElementById('cars-list');
        if (!container) return;

        const cars = await dbService.getAllCars();

        if (cars.length === 0) {
            container.innerHTML = '<p style="color:#7F8C8D;">No cars logged yet — add a car number when logging rides</p>';
            return;
        }

        const sortedCars = cars.sort((a, b) => b.timesSpotted - a.timesSpotted).slice(0, 10);

        container.innerHTML = sortedCars.map(car => `
            <div class="car-item" style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #f0f0f0;">
                <div>
                    <strong>Car ${car.carNumber}</strong>
                    <div style="font-size:12px;color:#7F8C8D;">${car.model}</div>
                </div>
                <span class="car-badge">${car.timesSpotted}×</span>
            </div>
        `).join('');
    }

    setupInstallPrompt() {
        let deferredPrompt;

        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
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
