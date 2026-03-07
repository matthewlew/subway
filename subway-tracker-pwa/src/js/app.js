// Main application logic — Train Tagger
class SubwayTrackerApp {
    constructor() {
        this.currentScreen = 'tag';
        this.selectedLine   = null;   // selected line on Tag screen
        this.tagStation     = null;   // selected station on Tag screen
        this.selectedArrival = null;
        this.countdownInterval = null;
        this.renderedArrivals  = [];
        this.editingRideId  = null;   // ride id open in edit sheet
    }

    async init() {
        console.log('Initializing Train Tagger…');
        await dbService.init();

        this.setupNavigation();
        this.setupTagScreen();
        this.setupPreRideScreen();
        this.setupStatsScreen();
        this.setupStatsExtras();
        this.setupEditRideSheet();
        this.setupConnectivity();

        await rideLogger.requestNotificationPermission();
        this.setupInstallPrompt();
        this.handleURLParams();

        this.switchScreen('tag');
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
            const lastStation = this.getLastStation();
            if (lastStation && this.currentScreen === 'arrivals') {
                this.loadArrivalsForStation(lastStation, false);
            }
        });
        window.addEventListener('offline', () => updateDot());
    }

    // ─── Last station memory ─────────────────────────────────────────────────

    saveLastStation(station) {
        try {
            localStorage.setItem('last_station', JSON.stringify({
                id: station.id, name: station.name,
                lines: station.lines, lat: station.lat, lng: station.lng
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
        const searchInput = document.getElementById('station-search');
        if (searchInput && !searchInput.value) searchInput.value = last.name;
        this.updateStationHeader(last, 'Last visited · tap 📍 to update');
        this.loadArrivalsForStation(last, false);
    }

    // ─── Navigation ──────────────────────────────────────────────────────────

    setupNavigation() {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => this.switchScreen(btn.dataset.screen));
        });
    }

    switchScreen(screenName) {
        document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
        const screen = document.getElementById(`${screenName}-screen`);
        if (screen) {
            screen.classList.add('active');
            this.currentScreen = screenName;
            if (screenName === 'stats')   this.loadStatsScreen();
            if (screenName === 'fleet')   this.loadFleetScreen();
            // Load arrivals lazily — only when first switching to the tab
            if (screenName === 'arrivals' && this.renderedArrivals.length === 0) {
                this.restoreLastStation();
            }
        }
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.screen === screenName);
        });
        // Location FAB only visible on arrivals tab
        const fab = document.getElementById('detect-location-btn');
        if (fab) fab.style.display = screenName === 'arrivals' ? '' : 'none';
    }

    // ─── Tag screen (PRIMARY) ─────────────────────────────────────────────────

    setupTagScreen() {
        // ── Line selector grid ──
        const grid = document.getElementById('line-selector-grid');
        if (grid) {
            const lines = ['1','2','3','4','5','6','7','A','C','E','B','D','F','M','G','J','Z','L','N','Q','R','W','S'];
            const lightLines = ['N','Q','R','W','L','S'];
            grid.innerHTML = lines.map(line => {
                const color = statsService.getLineColor(line);
                const tc = lightLines.includes(line) ? '#000' : '#fff';
                return `<button class="line-pick-btn" data-line="${line}"
                    style="background:${color};color:${tc};"
                    aria-label="Line ${line}">${line}</button>`;
            }).join('');

            grid.querySelectorAll('.line-pick-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    grid.querySelectorAll('.line-pick-btn').forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                    this.selectedLine = btn.dataset.line;
                    this.updateTagButton();
                });
            });
        }

        // ── Car number input → model detection ──
        const carInput = document.getElementById('tag-car-input');
        const modelEl  = document.getElementById('tag-car-model');
        carInput?.addEventListener('input', () => {
            const val = carInput.value.trim();
            if (val.length === 4 && rideLogger.validateCarNumber(val)) {
                if (modelEl) modelEl.textContent = rideLogger.getCarModel(val);
            } else {
                if (modelEl) modelEl.textContent = '';
            }
            this.updateTagButton();
        });

        // ── Station search ──
        this.setupTagStationSearch();

        // ── GPS button ──
        document.getElementById('tag-location-btn')?.addEventListener('click', async () => {
            const btn = document.getElementById('tag-location-btn');
            if (btn) { btn.disabled = true; btn.textContent = '⏳'; }
            try {
                await locationService.getCurrentPosition();
                const station = locationService.getClosestStation();
                if (station) {
                    this.tagStation = station;
                    const searchInput = document.getElementById('tag-station-search');
                    if (searchInput) searchInput.value = station.name;
                    const suggestionsEl = document.getElementById('tag-station-suggestions');
                    if (suggestionsEl) suggestionsEl.style.display = 'none';
                }
            } catch (e) {
                console.error('Location error:', e);
            } finally {
                if (btn) { btn.disabled = false; btn.textContent = '📍'; }
            }
        });

        // ── Log Car button ──
        document.getElementById('log-car-btn')?.addEventListener('click', () => this.logCar());
    }

    setupTagStationSearch() {
        const input = document.getElementById('tag-station-search');
        const suggestionsEl = document.getElementById('tag-station-suggestions');
        if (!input || !suggestionsEl) return;

        const allStations = locationService.stations;

        input.addEventListener('input', () => {
            const query = input.value.trim().toLowerCase();
            if (query.length < 2) {
                suggestionsEl.style.display = 'none';
                if (!input.value.trim()) this.tagStation = null;
                return;
            }
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
                const pick = (e) => {
                    e.preventDefault();
                    const station = allStations.find(s => s.id === item.dataset.id);
                    if (!station) return;
                    this.tagStation = station;
                    input.value = station.name;
                    suggestionsEl.style.display = 'none';
                };
                item.addEventListener('mousedown', pick);
                item.addEventListener('touchstart', pick, { passive: false });
            });
        });

        input.addEventListener('blur', () => {
            setTimeout(() => { suggestionsEl.style.display = 'none'; }, 150);
        });

        input.addEventListener('change', () => {
            if (!input.value.trim()) this.tagStation = null;
        });
    }

    updateTagButton() {
        const btn = document.getElementById('log-car-btn');
        if (!btn) return;
        const carInput = document.getElementById('tag-car-input');
        const val = carInput?.value.trim() || '';
        const valid = this.selectedLine && val.length === 4 && rideLogger.validateCarNumber(val);
        btn.disabled = !valid;
    }

    async logCar() {
        const carInput = document.getElementById('tag-car-input');
        const carNumber = carInput?.value.trim();
        const btn = document.getElementById('log-car-btn');
        if (!this.selectedLine || !carNumber || !rideLogger.validateCarNumber(carNumber)) return;

        btn.disabled = true;
        btn.textContent = 'Tagging…';

        const result = await rideLogger.logRide({
            line:      this.selectedLine,
            carNumber,
            station:   this.tagStation?.name  || null,
            stationId: this.tagStation?.id    || null
        });

        btn.disabled = false;
        btn.textContent = 'Log Car →';

        if (result.success) {
            // Check how many times this car has been spotted (updateCar already ran inside logRide)
            const cars = await dbService.getAllCars();
            const carData = cars.find(c => c.carNumber === carNumber);
            const model = rideLogger.getCarModel(carNumber);
            this.showTagSuccess(carNumber, model, carData?.timesSpotted || 1);

            // Clear car number input; keep line and station selected for rapid re-tagging
            if (carInput) carInput.value = '';
            const modelEl = document.getElementById('tag-car-model');
            if (modelEl) modelEl.textContent = '';
            this.updateTagButton();
        }
    }

    showTagSuccess(carNumber, model, timesSpotted) {
        const statusEl = document.getElementById('tag-status');
        if (!statusEl) return;

        const isNew = timesSpotted === 1;
        if (isNew) {
            statusEl.textContent = `🎉 New car! ${carNumber} — ${model} added to your fleet`;
            statusEl.className = 'tag-status new-car';
        } else {
            const sfx = timesSpotted === 2 ? '2nd' : timesSpotted === 3 ? '3rd' : `${timesSpotted}th`;
            statusEl.textContent = `✅ ${carNumber} logged — ${sfx} time on this ${model}`;
            statusEl.className = 'tag-status success';
        }
        statusEl.style.display = 'block';
        setTimeout(() => {
            statusEl.style.display = 'none';
            statusEl.textContent = '';
        }, 4000);
    }

    // ─── Arrivals screen ──────────────────────────────────────────────────────

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
        const nameEl   = document.getElementById('station-display-name');
        const linesEl  = document.getElementById('station-display-lines');
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
    }

    async loadArrivalsForStation(station, showLoading = true) {
        const arrivalsList = document.getElementById('arrivals-list');
        const searchInput  = document.getElementById('station-search');

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
        this.renderArrivals(arrivals, isCached, station);
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
            const last = this.getLastStation();
            if (last) this.loadArrivalsForStation(last, false);
        }
    }

    renderArrivals(arrivals, isCached = false, station = null) {
        const arrivalsList = document.getElementById('arrivals-list');
        this.renderedArrivals = arrivals.map(a => ({ ...a, fetchedAt: Date.now() }));
        this.selectedArrival = null;

        if (arrivals.length === 0) {
            arrivalsList.innerHTML = `
                <div style="text-align:center;color:var(--text-secondary);padding:32px 20px;">
                    <div style="font-size:40px;margin-bottom:12px;">${navigator.onLine ? '🚇' : '📡'}</div>
                    <p>${navigator.onLine ? 'No upcoming trains found.' : 'Offline — no cached arrivals for this station.'}</p>
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

        arrivalsList.querySelectorAll('.board-inline-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const idx = parseInt(btn.dataset.boardIdx, 10);
                this.selectedArrival = arrivals[idx];
                this.showBoardingSheet(arrivals[idx]);
            });
        });

        arrivalsList.querySelectorAll('.arrival-card').forEach((card, idx) => {
            card.addEventListener('click', () => {
                arrivalsList.querySelectorAll('.arrival-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                this.selectedArrival = arrivals[idx];
            });
        });
    }

    // ─── Boarding sheet (from Arrivals — logs directly) ──────────────────────

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

        document.getElementById('boarding-confirm-btn')?.addEventListener('click', () => this.confirmBoarding());
    }

    showBoardingSheet(arrival) {
        const sheet = document.getElementById('boarding-sheet');
        if (!sheet) return;

        const lightLines = ['N', 'Q', 'R', 'W', 'L'];
        const lineColor = statsService.getLineColor(arrival.line);
        const textColor = lightLines.includes(arrival.line) ? '#000' : '#fff';

        const badge = document.getElementById('boarding-sheet-badge');
        if (badge) { badge.textContent = arrival.line; badge.style.background = lineColor; badge.style.color = textColor; }

        const destEl = document.getElementById('boarding-sheet-dest');
        const dirEl  = document.getElementById('boarding-sheet-dir');
        if (destEl) destEl.textContent = `→ ${arrival.destination}`;
        if (dirEl)  dirEl.textContent  = arrival.direction;

        const confirmBtn = document.getElementById('boarding-confirm-btn');
        if (confirmBtn) {
            confirmBtn.style.background  = lineColor;
            confirmBtn.style.borderColor = lineColor;
            confirmBtn.style.color       = textColor;
        }

        const pinInput = document.getElementById('boarding-pin-input');
        if (pinInput) pinInput.value = '';
        const modelEl = document.getElementById('boarding-pin-model');
        if (modelEl) modelEl.textContent = '';

        sheet.style.display = 'flex';
        setTimeout(() => pinInput?.focus(), 350);
    }

    hideBoardingSheet() {
        const sheet = document.getElementById('boarding-sheet');
        if (sheet) sheet.style.display = 'none';
    }

    async confirmBoarding() {
        if (!this.selectedArrival) return;

        const pinInput = document.getElementById('boarding-pin-input');
        const carNumber = pinInput?.value.trim() || null;

        if (carNumber && !rideLogger.validateCarNumber(carNumber)) {
            if (pinInput) {
                pinInput.style.borderColor = '#e74c3c';
                setTimeout(() => { if (pinInput) pinInput.style.borderColor = ''; }, 1500);
            }
            return;
        }

        const confirmBtn = document.getElementById('boarding-confirm-btn');
        if (confirmBtn) { confirmBtn.disabled = true; confirmBtn.textContent = 'Tagging…'; }

        const lastStation = this.getLastStation();
        const result = await rideLogger.logRide({
            line:      this.selectedArrival.line,
            direction: this.selectedArrival.direction,
            station:   lastStation?.name || null,
            stationId: lastStation?.id   || null,
            carNumber: carNumber || null
        });

        if (confirmBtn) { confirmBtn.disabled = false; confirmBtn.textContent = 'Board & Tag →'; }
        this.hideBoardingSheet();

        if (result.success) {
            // Navigate to fleet if they tagged a car, otherwise stats
            setTimeout(() => this.switchScreen(carNumber ? 'fleet' : 'stats'), 600);
        }
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

    // ─── Stats screen ─────────────────────────────────────────────────────────

    async setupStatsScreen() {
        document.getElementById('stats-period')?.addEventListener('change', () => this.loadStatsScreen());
        await this.loadStatsScreen();
    }

    async loadStatsScreen() {
        const period = document.getElementById('stats-period')?.value || 'all';
        const rides  = await dbService.getAllRides();
        const stats  = await statsService.calculateStats(rides, period);
        const carStats = await statsService.getCarStats();

        document.getElementById('total-rides').textContent  = stats.totalRides;
        document.getElementById('unique-cars').textContent  = carStats.totalCars;
        document.getElementById('top-station').textContent  = stats.topStation || '--';
        document.getElementById('top-line').textContent     = stats.topLine    || '--';

        this.renderModelBreakdown(carStats.carsByModel);
        this.renderRecentRides(stats.recentRides);
    }

    renderModelBreakdown(carsByModel) {
        const container = document.getElementById('model-breakdown-list');
        if (!container) return;

        if (!carsByModel || carsByModel.length === 0) {
            container.innerHTML = '<p style="color:var(--text-secondary);font-size:14px;">No cars tagged yet.</p>';
            return;
        }

        const maxCount = carsByModel[0]?.count || 1;
        container.innerHTML = carsByModel.map(item => `
            <div class="model-row">
                <div style="flex:1;min-width:0;">
                    <div class="model-row-name">${item.model}</div>
                    <div class="model-row-bar" style="width:${Math.round((item.count / maxCount) * 100)}%;"></div>
                </div>
                <div class="model-row-count">${item.count}</div>
            </div>
        `).join('');
    }

    renderRecentRides(rides) {
        const container = document.getElementById('recent-rides-list');
        if (!container) return;

        if (rides.length === 0) {
            container.innerHTML = '<p style="text-align:center;color:var(--text-secondary);padding:24px 0;">No tags yet — go tag a car!</p>';
            return;
        }

        const lightLines = ['N', 'Q', 'R', 'W', 'L'];
        container.innerHTML = rides.map(ride => {
            const lineColor = statsService.getLineColor(ride.line);
            const textColor = lightLines.includes(ride.line) ? '#000' : '#fff';
            const model = ride.carNumber ? rideLogger.getCarModel(ride.carNumber) : null;
            return `
            <div class="ride-item" data-ride-id="${ride.id}">
                <span class="line-badge" style="background:${lineColor};color:${textColor};width:32px;height:32px;font-size:15px;">${ride.line || '?'}</span>
                <div class="ride-details">
                    ${ride.carNumber ? `<div class="ride-car-number">${ride.carNumber}</div>` : ''}
                    ${model && ride.carNumber ? `<div class="ride-car-model">${model}</div>` : ''}
                    <div class="station-name">${ride.station || '—'}</div>
                    <div class="ride-time">${statsService.formatDate(ride.timestamp)}</div>
                </div>
                <button class="ride-edit-btn" data-ride-id="${ride.id}" title="Edit tag" aria-label="Edit tag">✏️</button>
            </div>`;
        }).join('');

        container.querySelectorAll('.ride-edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const rideId = parseInt(btn.dataset.rideId, 10);
                const ride = rides.find(r => r.id === rideId);
                if (ride) this.openEditRide(ride);
            });
        });
    }

    // ─── Edit Ride Sheet ──────────────────────────────────────────────────────

    setupEditRideSheet() {
        document.getElementById('edit-ride-overlay')?.addEventListener('click', () => this.hideEditRideSheet());
        document.getElementById('edit-ride-close')?.addEventListener('click',   () => this.hideEditRideSheet());

        document.getElementById('edit-car-input')?.addEventListener('input', (e) => {
            const val = e.target.value.trim();
            const modelEl = document.getElementById('edit-car-model');
            if (val.length === 4 && rideLogger.validateCarNumber(val)) {
                if (modelEl) modelEl.textContent = rideLogger.getCarModel(val);
            } else {
                if (modelEl) modelEl.textContent = '';
            }
        });

        document.getElementById('edit-ride-save-btn')?.addEventListener('click',   () => this.saveEditRide());
        document.getElementById('edit-ride-delete-btn')?.addEventListener('click', () => this.deleteEditRide());
    }

    openEditRide(ride) {
        this.editingRideId = ride.id;

        const carInput  = document.getElementById('edit-car-input');
        const noteInput = document.getElementById('edit-note-input');
        const modelEl   = document.getElementById('edit-car-model');
        const rideIdInput = document.getElementById('edit-ride-id');

        if (carInput)   carInput.value  = ride.carNumber || '';
        if (noteInput)  noteInput.value = ride.note      || '';
        if (rideIdInput) rideIdInput.value = ride.id;

        if (ride.carNumber && rideLogger.validateCarNumber(ride.carNumber)) {
            if (modelEl) modelEl.textContent = rideLogger.getCarModel(ride.carNumber);
        } else {
            if (modelEl) modelEl.textContent = '';
        }

        const sheet = document.getElementById('edit-ride-sheet');
        if (sheet) sheet.style.display = 'flex';
        setTimeout(() => carInput?.focus(), 350);
    }

    hideEditRideSheet() {
        const sheet = document.getElementById('edit-ride-sheet');
        if (sheet) sheet.style.display = 'none';
        this.editingRideId = null;
    }

    async saveEditRide() {
        if (!this.editingRideId) return;

        const carInput  = document.getElementById('edit-car-input');
        const noteInput = document.getElementById('edit-note-input');
        const carNumber = carInput?.value.trim()  || null;
        const note      = noteInput?.value.trim() || null;

        if (carNumber && !rideLogger.validateCarNumber(carNumber)) {
            if (carInput) {
                carInput.style.borderColor = '#e74c3c';
                setTimeout(() => { if (carInput) carInput.style.borderColor = ''; }, 1500);
            }
            return;
        }

        const saveBtn = document.getElementById('edit-ride-save-btn');
        if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Saving…'; }

        try {
            await dbService.updateRide(this.editingRideId, { carNumber, note });
            if (carNumber) await dbService.updateCar(carNumber);
            this.hideEditRideSheet();
            await this.loadStatsScreen();
        } catch (e) {
            console.error('Save error:', e);
        } finally {
            if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Save'; }
        }
    }

    async deleteEditRide() {
        if (!this.editingRideId) return;
        if (!confirm('Delete this tag? This cannot be undone.')) return;

        const deleteBtn = document.getElementById('edit-ride-delete-btn');
        if (deleteBtn) { deleteBtn.disabled = true; deleteBtn.textContent = 'Deleting…'; }

        try {
            await dbService.deleteRide(this.editingRideId);
            this.hideEditRideSheet();
            await this.loadStatsScreen();
        } catch (e) {
            console.error('Delete error:', e);
        } finally {
            if (deleteBtn) { deleteBtn.disabled = false; deleteBtn.textContent = 'Delete'; }
        }
    }

    // ─── Fleet screen ─────────────────────────────────────────────────────────

    async loadFleetScreen() {
        const listEl  = document.getElementById('fleet-list');
        const emptyEl = document.getElementById('fleet-empty');
        if (!listEl) return;

        const cars  = await dbService.getAllCars();
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
                    <div class="fleet-car-count-label">${car.timesSpotted === 1 ? 'tag' : 'tags'}</div>
                </div>
            </div>`;
        }).join('');
    }

    // ─── Stats extras: API key + data export ──────────────────────────────────

    setupStatsExtras() {
        const saveBtn  = document.getElementById('save-api-key-btn');
        const keyInput = document.getElementById('api-key-input');
        const keyStatus = document.getElementById('api-key-status');

        const currentKey = localStorage.getItem('mta_api_key');
        if (currentKey) {
            if (keyInput)  keyInput.placeholder = `Key set: …${currentKey.slice(-6)}`;
            if (keyStatus) keyStatus.textContent = '✅ API key is active — real arrivals enabled';
        }

        saveBtn?.addEventListener('click', () => {
            const key = keyInput?.value.trim();
            if (!key) { if (keyStatus) keyStatus.textContent = '⚠️ Enter a key first.'; return; }
            localStorage.setItem('mta_api_key', key);
            if (keyStatus) keyStatus.textContent = '✅ Saved! Reload the app to use real arrivals.';
            if (keyInput) { keyInput.value = ''; keyInput.placeholder = `Key set: …${key.slice(-6)}`; }
        });

        document.getElementById('export-data-btn')?.addEventListener('click', async () => {
            const rides = await dbService.getAllRides();
            const cars  = await dbService.getAllCars();
            const payload = { exportedAt: new Date().toISOString(), rides, cars };
            const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `train-tagger-export-${new Date().toISOString().slice(0,10)}.json`;
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
        if (action === 'log' || action === 'tag') this.switchScreen('tag');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.subwayApp = new SubwayTrackerApp();
    window.subwayApp.init();
});
