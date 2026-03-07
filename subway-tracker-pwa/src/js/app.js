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
        this.setupStatsExtras();
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

    boardTrain(arrival, station, carNumber = null) {
        this.activeBoarding = {
            line: arrival.line,
            destination: arrival.destination,
            direction: arrival.direction,
            station: station?.name || 'Unknown station',
            stationId: station?.id || null,
            carNumber: carNumber || null,
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
            direction: this.activeBoarding.direction,
            carNumber: this.activeBoarding.carNumber || null
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

        // Fill search box with last station name
        const searchInput = document.getElementById('station-search');
        if (searchInput && !searchInput.value) searchInput.value = last.name;

        // Show station name immediately in the big header
        this.updateStationHeader(last, 'Last visited · tap 📍 to update');

        // Load arrivals (works from cache if offline)
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
            if (screenName === 'stats')  this.loadStatsScreen();
            if (screenName === 'fleet')  this.loadFleetScreen();
        }
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.screen === screenName);
        });
        // Hide location FAB when not on arrivals tab
        const fab = document.getElementById('detect-location-btn');
        if (fab) fab.style.display = screenName === 'arrivals' ? '' : 'none';
    }

    // ─── Pre-ride (arrivals) screen ──────────────────────────────────────────

    setupPreRideScreen() {
        const detectBtn = document.getElementById('detect-location-btn');

        detectBtn?.addEventListener('click', () => {
            detectBtn.classList.add('detecting');
            detectBtn.style.pointerEvents = 'none';
            this.loadPreRideScreen().finally(() => {
                detectBtn.classList.remove('detecting');
                detectBtn.style.pointerEvents = '';
            });
        });

        this.setupStationSearch();
        this.setupBoardingSheet();
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

    updateStationHeader(station, statusHtml = '') {
        const nameEl = document.getElementById('station-display-name');
        const linesEl = document.getElementById('station-display-lines');
        const statusEl = document.getElementById('station-display-status');

        if (nameEl) nameEl.textContent = station.name;

        if (linesEl && station.lines) {
            const lightLines = ['N', 'Q', 'R', 'W', 'L'];
            linesEl.innerHTML = station.lines.map(line => {
                const color = statsService.getLineColor(line);
                const tc = lightLines.includes(line) ? '#000' : '#fff';
                return `<span class="line-badge" style="background:${color};color:${tc}">${line}</span>`;
            }).join('');
        }

        if (statusEl) statusEl.innerHTML = statusHtml;

        // Keep log-screen station input in sync
        const stationInput = document.getElementById('current-station');
        if (stationInput) stationInput.value = station.name;
    }

    async loadArrivalsForStation(station, showLoading = true) {
        const arrivalsList = document.getElementById('arrivals-list');
        const searchInput = document.getElementById('station-search');

        if (showLoading) {
            this.updateStationHeader(station, '⏳ Loading arrivals…');
            if (arrivalsList) arrivalsList.innerHTML = '<p style="color:var(--text-secondary);padding:16px;">Loading arrivals…</p>';
        }

        if (searchInput && !searchInput.value) searchInput.value = station.name;

        this.saveLastStation(station);

        const arrivals = await mtaService.getArrivalsForStation(station.id, station.lines);
        const isCached = arrivals.length > 0 && arrivals[0]._cached;

        let statusHtml = 'Live arrivals';
        if (isCached) {
            const ageMin = Math.round(arrivals[0]._cacheAge / 60000);
            statusHtml = `<span class="stale-badge">Cached ${ageMin}m ago</span> · offline data`;
        }
        this.updateStationHeader(station, statusHtml);

        this.renderArrivals(arrivals, isCached);
        this.startCountdown();
    }

    async loadPreRideScreen() {
        const statusEl = document.getElementById('station-display-status');
        if (statusEl) statusEl.textContent = '📍 Getting your location…';

        try {
            await locationService.getCurrentPosition();

            let nearby = locationService.getNearbyStations(0.5);
            if (!nearby.length) nearby = locationService.getNearbyStations(5.0);

            if (!nearby.length) {
                if (statusEl) statusEl.textContent = '⚠️ No stations found nearby — try searching.';
                return;
            }

            const closest = nearby[0];
            const searchInput = document.getElementById('station-search');
            if (searchInput) searchInput.value = closest.name;

            await this.loadArrivalsForStation(closest);

        } catch (error) {
            console.error('Location error:', error);
            let msg = '❌ Could not get location.';
            if (error.code === 1) msg = '🚫 Location access denied — search for a station.';
            else if (error.code === 3) msg = '⏱ Location timed out — try again.';
            if (statusEl) statusEl.textContent = msg;

            // Fall back to last station from cache
            const last = this.getLastStation();
            if (last) this.loadArrivalsForStation(last, false);
        }
    }

    renderArrivals(arrivals, isCached = false) {
        const arrivalsList = document.getElementById('arrivals-list');
        this.renderedArrivals = arrivals.map(a => ({ ...a, fetchedAt: Date.now() }));
        this.selectedArrival = null;

        if (arrivals.length === 0) {
            arrivalsList.innerHTML = `
                <div style="text-align:center;color:var(--text-secondary);padding:32px 20px;">
                    <div style="font-size:40px;margin-bottom:12px;">${navigator.onLine ? '🚇' : '📡'}</div>
                    <p>${navigator.onLine ? 'No upcoming trains found.' : 'Offline — no cached arrivals for this station.'}</p>
                    ${!navigator.onLine ? '<p style="font-size:13px;margin-top:8px;color:var(--text-secondary);">You can still log a ride manually from the Log tab.</p>' : ''}
                </div>`;
            return;
        }

        const lightLines = ['N', 'Q', 'R', 'W', 'L'];
        arrivalsList.innerHTML = arrivals.map((arrival, idx) => {
            const textColor = lightLines.includes(arrival.line) ? '#000' : '#fff';
            const lineColor = statsService.getLineColor(arrival.line);
            return `
            <div class="arrival-card${isCached ? ' cached' : ''}" data-index="${idx}">
                <span class="line-badge" style="background:${lineColor};color:${textColor}">${arrival.line}</span>
                <div class="arrival-info">
                    <div class="destination">${arrival.destination}</div>
                    <div class="direction">${arrival.direction}</div>
                </div>
                <div class="arrival-right">
                    <div class="arrival-time${arrival.minutesAway < 1 ? ' arriving' : ''}" data-arrival-idx="${idx}">
                        ${mtaService.formatArrivalTime(arrival.minutesAway)}
                    </div>
                    <button class="board-inline-btn" data-board-idx="${idx}" style="border-color:${lineColor};color:${lineColor};">Board →</button>
                </div>
            </div>`;
        }).join('');

        // Wire up Board buttons — open boarding sheet directly
        arrivalsList.querySelectorAll('.board-inline-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const idx = parseInt(btn.dataset.boardIdx, 10);
                this.selectedArrival = arrivals[idx];
                this.showBoardingSheet(arrivals[idx]);
            });
        });

        // Tapping the card itself also selects it (highlights it)
        arrivalsList.querySelectorAll('.arrival-card').forEach((card, idx) => {
            card.addEventListener('click', () => {
                arrivalsList.querySelectorAll('.arrival-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                this.selectedArrival = arrivals[idx];
            });
        });
    }

    // ─── Boarding sheet (PIN entry) ──────────────────────────────────────────

    setupBoardingSheet() {
        document.getElementById('boarding-sheet-overlay')?.addEventListener('click', () => this.hideBoardingSheet());
        document.getElementById('boarding-sheet-close')?.addEventListener('click', () => this.hideBoardingSheet());

        document.getElementById('boarding-pin-input')?.addEventListener('input', (e) => {
            const val = e.target.value.trim();
            const modelEl = document.getElementById('boarding-pin-model');
            if (val.length === 4 && rideLogger.validateCarNumber(val)) {
                if (modelEl) modelEl.textContent = rideLogger.getCarModel(val);
            } else {
                if (modelEl) modelEl.textContent = '';
            }
        });

        document.getElementById('boarding-confirm-btn')?.addEventListener('click', () => {
            this.confirmBoarding();
        });
    }

    showBoardingSheet(arrival) {
        const sheet = document.getElementById('boarding-sheet');
        if (!sheet) return;

        const lightLines = ['N', 'Q', 'R', 'W', 'L'];
        const lineColor = statsService.getLineColor(arrival.line);
        const textColor = lightLines.includes(arrival.line) ? '#000' : '#fff';

        const badge = document.getElementById('boarding-sheet-badge');
        if (badge) {
            badge.textContent = arrival.line;
            badge.style.background = lineColor;
            badge.style.color = textColor;
        }

        const destEl = document.getElementById('boarding-sheet-dest');
        const dirEl  = document.getElementById('boarding-sheet-dir');
        if (destEl) destEl.textContent = `→ ${arrival.destination}`;
        if (dirEl)  dirEl.textContent  = arrival.direction;

        // Tint confirm button to match line color
        const confirmBtn = document.getElementById('boarding-confirm-btn');
        if (confirmBtn) {
            confirmBtn.style.background = lineColor;
            confirmBtn.style.borderColor = lineColor;
            confirmBtn.style.color = textColor;
        }

        // Clear previous PIN
        const pinInput = document.getElementById('boarding-pin-input');
        if (pinInput) pinInput.value = '';
        const modelEl = document.getElementById('boarding-pin-model');
        if (modelEl) modelEl.textContent = '';

        sheet.style.display = 'flex';
        // Focus PIN input after animation
        setTimeout(() => pinInput?.focus(), 350);
    }

    hideBoardingSheet() {
        const sheet = document.getElementById('boarding-sheet');
        if (sheet) sheet.style.display = 'none';
    }

    confirmBoarding() {
        if (!this.selectedArrival) return;

        const pinInput = document.getElementById('boarding-pin-input');
        const carNumber = pinInput?.value.trim() || null;

        if (carNumber && !rideLogger.validateCarNumber(carNumber)) {
            pinInput.style.borderColor = '#e74c3c';
            setTimeout(() => { if (pinInput) pinInput.style.borderColor = ''; }, 1500);
            return;
        }

        const lastStation = this.getLastStation();
        this.boardTrain(this.selectedArrival, lastStation, carNumber);

        // Pre-fill log screen
        const lineSelector = document.getElementById('line-selector');
        if (lineSelector) lineSelector.value = this.selectedArrival.line;
        if (carNumber) {
            const carInput = document.getElementById('car-number');
            if (carInput) carInput.value = carNumber;
        }

        this.hideBoardingSheet();
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

    // ─── Fleet screen ─────────────────────────────────────────────────────────

    async loadFleetScreen() {
        const listEl = document.getElementById('fleet-list');
        const emptyEl = document.getElementById('fleet-empty');
        if (!listEl) return;

        const cars = await dbService.getAllCars();
        const rides = await dbService.getAllRides();

        if (cars.length === 0) {
            if (emptyEl) emptyEl.style.display = 'block';
            listEl.innerHTML = '';
            return;
        }
        if (emptyEl) emptyEl.style.display = 'none';

        // Build a map of carNumber → lines seen on
        const carLineMap = {};
        rides.forEach(r => {
            if (r.carNumber && r.line) {
                if (!carLineMap[r.carNumber]) carLineMap[r.carNumber] = new Set();
                carLineMap[r.carNumber].add(r.line);
            }
        });

        const lightLines = ['N', 'Q', 'R', 'W', 'L'];
        const sorted = [...cars].sort((a, b) => b.timesSpotted - a.timesSpotted);

        listEl.innerHTML = sorted.map(car => {
            const lines = carLineMap[car.carNumber] ? [...carLineMap[car.carNumber]] : [];
            const lineBadges = lines.map(line => {
                const color = statsService.getLineColor(line);
                const tc = lightLines.includes(line) ? '#000' : '#fff';
                return `<span class="line-badge" style="background:${color};color:${tc}">${line}</span>`;
            }).join('');

            const firstDate = car.firstSeen
                ? new Date(car.firstSeen).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                : '—';
            const lastDate = car.lastSeen
                ? new Date(car.lastSeen).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                : '—';

            return `
            <div class="fleet-car-card">
                <div class="fleet-car-number">${car.carNumber}</div>
                <div class="fleet-car-info">
                    <div class="fleet-car-model">${car.model}</div>
                    <div class="fleet-car-meta">First: ${firstDate} · Last: ${lastDate}</div>
                    ${lineBadges ? `<div class="fleet-car-lines">${lineBadges}</div>` : ''}
                </div>
                <div class="fleet-car-stats">
                    <div class="fleet-car-count">${car.timesSpotted}</div>
                    <div class="fleet-car-count-label">${car.timesSpotted === 1 ? 'ride' : 'rides'}</div>
                </div>
            </div>`;
        }).join('');
    }

    // ─── Stats extras: API key + data export ──────────────────────────────────

    setupStatsExtras() {
        // API key save
        const saveBtn = document.getElementById('save-api-key-btn');
        const keyInput = document.getElementById('api-key-input');
        const keyStatus = document.getElementById('api-key-status');

        // Show current key state
        const currentKey = localStorage.getItem('mta_api_key');
        if (currentKey) {
            if (keyInput) keyInput.placeholder = `Key set: …${currentKey.slice(-6)}`;
            if (keyStatus) keyStatus.textContent = '✅ API key is active — real arrivals enabled';
        }

        saveBtn?.addEventListener('click', () => {
            const key = keyInput?.value.trim();
            if (!key) {
                if (keyStatus) keyStatus.textContent = '⚠️ Enter a key first.';
                return;
            }
            localStorage.setItem('mta_api_key', key);
            if (keyStatus) keyStatus.textContent = '✅ Saved! Reload the app to use real arrivals.';
            if (keyInput) { keyInput.value = ''; keyInput.placeholder = `Key set: …${key.slice(-6)}`; }
        });

        // Data export
        document.getElementById('export-data-btn')?.addEventListener('click', async () => {
            const rides = await dbService.getAllRides();
            const cars  = await dbService.getAllCars();
            const payload = { exportedAt: new Date().toISOString(), rides, cars };
            const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `subway-tracker-export-${new Date().toISOString().slice(0,10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
        });
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
