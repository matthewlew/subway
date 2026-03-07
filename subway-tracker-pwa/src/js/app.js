// Main application logic
class SubwayTrackerApp {
    constructor() {
        this.currentScreen = 'arrivals';
        this.selectedArrival = null;
        this.countdownInterval = null;
        this.renderedArrivals = [];
        this.activeBoarding = null; // { line, destination, direction, station, boardedAt }
    }

    async init() {
        console.log('Initializing Subway Tracker…');
        await dbService.init();

        this.setupNavigation();
        this.setupPreRideScreen();
        this.setupLogRideScreen();
        this.setupStatsScreen();
        this.setupConnectivity();

        await rideLogger.requestNotificationPermission();
        this.setupInstallPrompt();
        this.handleURLParams();

        // Restore boarding state from previous session
        this.loadActiveBoardingState();

        // Restore last viewed station without needing GPS
        this.restoreLastStation();

        console.log('✓ App initialized');
    }

    // ─── Connectivity ────────────────────────────────────────────────────────

    setupConnectivity() {
        const updateDot = () => {
            const dot = document.getElementById('connectivity-dot');
            if (!dot) return;
            const online = navigator.onLine;
            dot.className = `connectivity-dot ${online ? 'online' : 'offline'}`;
            dot.title = online ? 'Online' : 'Offline — data is cached';
        };

        updateDot();
        window.addEventListener('online', () => {
            updateDot();
            // Refresh arrivals when connection returns
            const lastStation = this.getLastStation();
            if (lastStation && this.currentScreen === 'arrivals') {
                this.loadArrivalsForStation(lastStation, false);
            }
        });
        window.addEventListener('offline', () => updateDot());
    }

    // ─── Boarding state ──────────────────────────────────────────────────────

    boardTrain(arrival, station) {
        this.activeBoarding = {
            line: arrival.line,
            destination: arrival.destination,
            direction: arrival.direction,
            station: station?.name || 'Unknown station',
            stationId: station?.id || null,
            boardedAt: Date.now()
        };
        localStorage.setItem('active_boarding', JSON.stringify(this.activeBoarding));
        this.showActiveBoardingBanner();
    }

    loadActiveBoardingState() {
        try {
            const raw = localStorage.getItem('active_boarding');
            if (!raw) return;
            const boarding = JSON.parse(raw);
            // Auto-expire after 3 hours (probably forgot to clear it)
            if (Date.now() - boarding.boardedAt > 3 * 60 * 60 * 1000) {
                localStorage.removeItem('active_boarding');
                return;
            }
            this.activeBoarding = boarding;
            this.showActiveBoardingBanner();
        } catch (e) { /* ignore */ }
    }

    clearActiveBoarding() {
        this.activeBoarding = null;
        localStorage.removeItem('active_boarding');
        this.hideActiveBoardingBanner();
    }

    showActiveBoardingBanner() {
        const bar = document.getElementById('active-ride-bar');
        if (!bar || !this.activeBoarding) return;

        const b = this.activeBoarding;
        const lineColor = statsService.getLineColor(b.line);
        const lightLines = ['N', 'Q', 'R', 'W', 'L'];
        const textColor = lightLines.includes(b.line) ? '#000' : '#fff';
        const elapsed = Math.round((Date.now() - b.boardedAt) / 60000);
        const elapsedStr = elapsed < 1 ? 'just now' : `${elapsed}m ago`;

        bar.style.display = 'flex';
        bar.style.borderLeftColor = lineColor;
        bar.innerHTML = `
            <div class="active-ride-line-badge" style="background:${lineColor};color:${textColor}">${b.line}</div>
            <div class="active-ride-info">
                <div class="active-ride-label">Riding now · boarded ${elapsedStr}</div>
                <div class="active-ride-dest">${b.direction} → ${b.destination}</div>
                <div class="active-ride-station">from ${b.station}</div>
            </div>
            <div class="active-ride-actions">
                <button class="active-ride-log-btn" id="active-log-btn">Log ride</button>
                <button class="active-ride-clear-btn" id="active-clear-btn">✕</button>
            </div>
        `;

        document.getElementById('active-log-btn')?.addEventListener('click', () => {
            this.logBoardingDirectly();
        });
        document.getElementById('active-clear-btn')?.addEventListener('click', () => {
            this.clearActiveBoarding();
        });

        document.body.classList.add('has-active-ride');
    }

    hideActiveBoardingBanner() {
        const bar = document.getElementById('active-ride-bar');
        if (bar) bar.style.display = 'none';
        document.body.classList.remove('has-active-ride');
    }

    async logBoardingDirectly() {
        if (!this.activeBoarding) return;

        const btn = document.getElementById('active-log-btn');
        if (btn) { btn.disabled = true; btn.textContent = 'Logging…'; }

        const result = await rideLogger.logRide({
            line: this.activeBoarding.line,
            station: this.activeBoarding.station,
            stationId: this.activeBoarding.stationId,
            direction: this.activeBoarding.direction
        });

        if (result.success) {
            this.clearActiveBoarding();
            this.switchScreen('stats');
        } else {
            if (btn) { btn.disabled = false; btn.textContent = 'Log ride'; }
        }
    }

    // ─── Last station memory ─────────────────────────────────────────────────

    saveLastStation(station) {
        try {
            localStorage.setItem('last_station', JSON.stringify({
                id: station.id,
                name: station.name,
                lines: station.lines,
                lat: station.lat,
                lng: station.lng
            }));
        } catch (e) { /* ignore */ }
    }

    getLastStation() {
        try {
            const raw = localStorage.getItem('last_station');
            return raw ? JSON.parse(raw) : null;
        } catch (e) { return null; }
    }

    restoreLastStation() {
        const last = this.getLastStation();
        if (!last) return;

        // Fill search box with last station name so user sees context immediately
        const searchInput = document.getElementById('station-search');
        if (searchInput && !searchInput.value) searchInput.value = last.name;

        const statusMsg = document.getElementById('location-status-msg');
        if (statusMsg) statusMsg.textContent = `📍 Last: ${last.name} — tap GPS to update`;

        // Load arrivals for last station (works from cache if offline)
        this.loadArrivalsForStation(last, false);
    }

    // ─── Navigation ──────────────────────────────────────────────────────────

    setupNavigation() {
        const navButtons = document.querySelectorAll('.nav-btn');
        navButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                this.switchScreen(btn.dataset.screen);
            });
        });
    }

    switchScreen(screenName) {
        document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
        const screen = document.getElementById(`${screenName}-screen`);
        if (screen) {
            screen.classList.add('active');
            this.currentScreen = screenName;
            if (screenName === 'stats') this.loadStatsScreen();
        }
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.screen === screenName);
        });
    }

    // ─── Pre-ride (arrivals) screen ──────────────────────────────────────────

    setupPreRideScreen() {
        const quickLogBtn = document.getElementById('quick-log-from-arrival');
        const detectBtn = document.getElementById('detect-location-btn');

        quickLogBtn?.addEventListener('click', () => {
            if (this.selectedArrival) {
                const lastStation = this.getLastStation();
                this.boardTrain(this.selectedArrival, lastStation);
                // Also pre-fill log screen line in case they go manual
                const lineSelector = document.getElementById('line-selector');
                if (lineSelector) lineSelector.value = this.selectedArrival.line;
            }
        });

        detectBtn?.addEventListener('click', () => {
            detectBtn.disabled = true;
            detectBtn.textContent = 'Detecting…';
            this.loadPreRideScreen();
        });

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
                <div class="suggestion-item" data-id="${s.id}">
                    <strong class="suggestion-name">${s.name}</strong>
                    <span class="suggestion-lines">${s.lines.join(', ')}</span>
                </div>
            `).join('');
            suggestionsEl.style.display = 'block';

            suggestionsEl.querySelectorAll('.suggestion-item').forEach(item => {
                const pick = async (e) => {
                    e.preventDefault();
                    const station = allStations.find(s => s.id === item.dataset.id);
                    if (!station) return;
                    input.value = station.name;
                    suggestionsEl.style.display = 'none';
                    await this.loadArrivalsForStation(station);
                };
                item.addEventListener('mousedown', pick);
                item.addEventListener('touchstart', pick, { passive: false });
            });
        });

        input.addEventListener('blur', () => {
            setTimeout(() => { suggestionsEl.style.display = 'none'; }, 150);
        });
    }

    async loadArrivalsForStation(station, showLoading = true) {
        const locationStatusMsg = document.getElementById('location-status-msg');
        const arrivalsList = document.getElementById('arrivals-list');
        const stationInput = document.getElementById('current-station');

        if (showLoading) {
            if (locationStatusMsg) locationStatusMsg.textContent = `📍 Showing: ${station.name}`;
            if (arrivalsList) arrivalsList.innerHTML = '<p style="color:#999;padding:16px;">Loading arrivals…</p>';
        }

        if (stationInput) stationInput.value = station.name;

        const searchInput = document.getElementById('station-search');
        if (searchInput && !searchInput.value) searchInput.value = station.name;

        this.saveLastStation(station);

        const arrivals = await mtaService.getArrivalsForStation(station.id, station.lines);
        const isCached = arrivals.length > 0 && arrivals[0]._cached;

        if (locationStatusMsg) {
            if (isCached) {
                const ageMin = Math.round(arrivals[0]._cacheAge / 60000);
                locationStatusMsg.innerHTML = `📍 ${station.name} <span class="stale-badge">cached ${ageMin}m ago</span>`;
            } else {
                locationStatusMsg.textContent = `📍 ${station.name}`;
            }
        }

        this.renderArrivals(arrivals, isCached);
        this.startCountdown();
    }

    async loadPreRideScreen() {
        const locationStatusMsg = document.getElementById('location-status-msg');
        const detectBtn = document.getElementById('detect-location-btn');

        if (locationStatusMsg) locationStatusMsg.textContent = '📍 Getting your location…';
        if (detectBtn) { detectBtn.disabled = true; detectBtn.textContent = 'Detecting…'; }

        try {
            await locationService.getCurrentPosition();

            let nearby = locationService.getNearbyStations(0.5);
            if (!nearby.length) nearby = locationService.getNearbyStations(5.0);

            if (!nearby.length) {
                if (locationStatusMsg) locationStatusMsg.textContent = '⚠️ No stations found nearby.';
                if (detectBtn) { detectBtn.disabled = false; detectBtn.textContent = '📍 Use My Location'; }
                return;
            }

            const closest = nearby[0];
            if (detectBtn) { detectBtn.disabled = false; detectBtn.textContent = '↻ Refresh'; }

            const searchInput = document.getElementById('station-search');
            if (searchInput) searchInput.value = closest.name;

            await this.loadArrivalsForStation(closest);

        } catch (error) {
            console.error('Location error:', error);
            let msg = '❌ Could not get location.';
            if (error.code === 1) msg = '🚫 Location denied — search manually above.';
            else if (error.code === 3) msg = '⏱ Location timed out — try again.';
            if (locationStatusMsg) locationStatusMsg.textContent = msg;
            if (detectBtn) { detectBtn.disabled = false; detectBtn.textContent = '📍 Use My Location'; }

            // Fall back to last station from cache
            const last = this.getLastStation();
            if (last) this.loadArrivalsForStation(last, false);
        }
    }

    renderArrivals(arrivals, isCached = false) {
        const arrivalsList = document.getElementById('arrivals-list');
        const quickLogBtn = document.getElementById('quick-log-from-arrival');

        this.renderedArrivals = arrivals.map(a => ({ ...a, fetchedAt: Date.now() }));
        this.selectedArrival = null;

        if (quickLogBtn) { quickLogBtn.style.display = 'none'; quickLogBtn.disabled = true; }

        if (arrivals.length === 0) {
            arrivalsList.innerHTML = `
                <div style="text-align:center;color:#7F8C8D;padding:32px 20px;">
                    <div style="font-size:40px;margin-bottom:12px;">${navigator.onLine ? '🚇' : '📡'}</div>
                    <p>${navigator.onLine ? 'No upcoming trains found.' : 'Offline — no cached arrivals for this station.'}</p>
                    ${!navigator.onLine ? '<p style="font-size:13px;margin-top:8px;color:#bbb;">You can still log a ride manually →</p>' : ''}
                </div>`;
            return;
        }

        arrivalsList.innerHTML = arrivals.map((arrival, idx) => {
            const lightLines = ['N', 'Q', 'R', 'W', 'L'];
            const textColor = lightLines.includes(arrival.line) ? '#000' : '#fff';
            return `
            <div class="arrival-card${isCached ? ' cached' : ''}" data-index="${idx}">
                <span class="line-badge" style="background:${statsService.getLineColor(arrival.line)};color:${textColor}">${arrival.line}</span>
                <div class="arrival-info">
                    <div class="destination">${arrival.destination}</div>
                    <div class="direction">${arrival.direction}</div>
                </div>
                <div class="arrival-time${arrival.minutesAway < 1 ? ' arriving' : ''}" data-arrival-idx="${idx}">
                    ${mtaService.formatArrivalTime(arrival.minutesAway)}
                </div>
            </div>`;
        }).join('');

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
                    const lineColor = statsService.getLineColor(arrivals[idx].line);
                    quickLogBtn.style.background = lineColor;
                    quickLogBtn.style.borderColor = lineColor;
                    const lightLines = ['N', 'Q', 'R', 'W', 'L'];
                    quickLogBtn.style.color = lightLines.includes(arrivals[idx].line) ? '#000' : '#fff';
                    quickLogBtn.textContent = `Board ${arrivals[idx].line} → ${arrivals[idx].destination}`;
                }
            });
        });
    }

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
        }, 15000);
    }

    // ─── Log ride screen ─────────────────────────────────────────────────────

    setupLogRideScreen() {
        const logBtn = document.getElementById('log-ride-btn');
        const carNumberInput = document.getElementById('car-number');
        const scanCarBtn = document.getElementById('scan-car-btn');

        this.updateCurrentTime();
        setInterval(() => this.updateCurrentTime(), 1000);
        this.updateCurrentStation();

        logBtn?.addEventListener('click', async () => {
            const carNumber = carNumberInput?.value.trim();
            const note = document.getElementById('ride-note')?.value.trim();
            const line = document.getElementById('line-selector')?.value || null;

            if (carNumber && !rideLogger.validateCarNumber(carNumber)) {
                alert('Car number must be 4 digits');
                return;
            }

            logBtn.disabled = true;
            logBtn.textContent = 'Logging…';

            const result = await rideLogger.logRide({ line, carNumber: carNumber || null, note: note || null });

            logBtn.disabled = false;
            logBtn.innerHTML = '<span>🚇</span> Log Ride Now';

            if (result.success) {
                if (carNumberInput) carNumberInput.value = '';
                document.getElementById('ride-note').value = '';
                document.getElementById('line-selector').value = '';
                const modelInfo = document.getElementById('car-model-info');
                if (modelInfo) modelInfo.textContent = '';
                this.clearActiveBoarding();
                setTimeout(() => this.switchScreen('stats'), 600);
            }
        });

        carNumberInput?.addEventListener('input', (e) => {
            const val = e.target.value.trim();
            const modelInfo = document.getElementById('car-model-info');
            if (val.length === 4 && rideLogger.validateCarNumber(val)) {
                modelInfo.textContent = `Model: ${rideLogger.getCarModel(val)}`;
                modelInfo.style.color = '#27AE60';
            } else {
                modelInfo.textContent = '';
            }
        });

        scanCarBtn?.addEventListener('click', () => this.openCameraModal());
    }

    updateCurrentTime() {
        const el = document.getElementById('current-time');
        if (el) el.textContent = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    }

    async updateCurrentStation() {
        const el = document.getElementById('current-station');
        if (!el) return;
        const last = this.getLastStation();
        if (last) { el.value = last.name; return; }
        try {
            const station = await rideLogger.detectStation();
            el.value = station ? station.name : 'Unknown (enable location)';
        } catch { el.value = 'Unknown'; }
    }

    // ─── Camera ──────────────────────────────────────────────────────────────

    openCameraModal() {
        const modal = document.getElementById('camera-modal');
        const video = document.getElementById('camera-feed');
        const captureBtn = document.getElementById('capture-btn');
        const closeBtn = modal?.querySelector('.modal-close');
        if (!modal) return;

        modal.style.display = 'flex';

        navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
            .then(stream => { video.srcObject = stream; })
            .catch(() => { alert('Camera access denied'); modal.style.display = 'none'; });

        const newCapture = captureBtn.cloneNode(true);
        captureBtn.parentNode.replaceChild(newCapture, captureBtn);
        newCapture.addEventListener('click', () => this.captureCarNumber(video));

        const newClose = closeBtn?.cloneNode(true);
        if (closeBtn && newClose) {
            closeBtn.parentNode.replaceChild(newClose, closeBtn);
            newClose.addEventListener('click', () => this.closeCameraModal(modal, video));
        }
    }

    closeCameraModal(modal, video) {
        video?.srcObject?.getTracks().forEach(t => t.stop());
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
        if (ocrResult) ocrResult.innerHTML = '<p style="color:#666;">Processing…</p>';
        setTimeout(() => {
            const carInput = document.getElementById('car-number');
            if (carInput) carInput.value = '1234'; // replace with real OCR
            this.closeCameraModal(document.getElementById('camera-modal'), video);
        }, 1500);
    }

    // ─── Stats screen ────────────────────────────────────────────────────────

    async setupStatsScreen() {
        document.getElementById('stats-period')?.addEventListener('change', () => this.loadStatsScreen());
        await this.loadStatsScreen();
    }

    async loadStatsScreen() {
        const period = document.getElementById('stats-period')?.value || 'all';
        const rides = await dbService.getAllRides();
        const stats = await statsService.calculateStats(rides, period);

        document.getElementById('total-rides').textContent = stats.totalRides;
        document.getElementById('time-underground').textContent =
            stats.timeUnderground.hours > 0
                ? `${stats.timeUnderground.hours}h ${stats.timeUnderground.minutes}m`
                : `${stats.timeUnderground.minutes}m`;
        document.getElementById('top-station').textContent = stats.topStation || '--';
        document.getElementById('top-line').textContent = stats.topLine || '--';

        this.renderRecentRides(stats.recentRides);
        await this.renderCarsList();
    }

    renderRecentRides(rides) {
        const container = document.getElementById('recent-rides-list');
        if (!container) return;
        if (rides.length === 0) {
            container.innerHTML = '<p style="text-align:center;color:#7F8C8D;padding:16px 0;">No rides yet — board a train to start!</p>';
            return;
        }
        const lightLines = ['N', 'Q', 'R', 'W', 'L'];
        container.innerHTML = rides.map(ride => `
            <div class="ride-item">
                <span class="line-badge" style="background:${statsService.getLineColor(ride.line)};color:${lightLines.includes(ride.line) ? '#000' : '#fff'};width:32px;height:32px;font-size:15px;">${ride.line || '?'}</span>
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
            container.innerHTML = '<p style="color:#7F8C8D;">No cars yet — add a car number when logging</p>';
            return;
        }
        container.innerHTML = cars
            .sort((a, b) => b.timesSpotted - a.timesSpotted)
            .slice(0, 10)
            .map(car => `
                <div class="car-item" style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #f0f0f0;">
                    <div>
                        <strong>Car ${car.carNumber}</strong>
                        <div style="font-size:12px;color:#7F8C8D;">${car.model}</div>
                    </div>
                    <span class="car-badge">${car.timesSpotted}×</span>
                </div>
            `).join('');
    }

    // ─── Misc ────────────────────────────────────────────────────────────────

    setupInstallPrompt() {
        let deferredPrompt;
        window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e; });
        window.addEventListener('appinstalled', () => { deferredPrompt = null; });
    }

    handleURLParams() {
        const action = new URLSearchParams(window.location.search).get('action');
        if (action === 'log') this.switchScreen('log-ride');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.subwayApp = new SubwayTrackerApp();
    window.subwayApp.init();
});
