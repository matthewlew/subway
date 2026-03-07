// Ride logger - handles one-tap ride logging
class RideLogger {
    constructor() {
        this.currentStation = null;
        this.selectedArrival = null;
    }

    async logRide(options = {}) {
        try {
            // Use pre-supplied station (from boarding state) or detect from GPS
            if (!options.station && !this.currentStation) {
                await this.detectStation();
            }

            // Build ride data
            const rideData = {
                timestamp: Date.now(),
                station: options.station || this.currentStation?.name || 'Unknown',
                stationId: options.stationId || this.currentStation?.id || null,
                line: options.line || this.inferLine(),
                direction: options.direction || this.inferDirection(),
                carNumber: options.carNumber || null,
                note: options.note || null,
                location: locationService.currentLocation
            };

            // Save to IndexedDB
            const rideId = await dbService.addRide(rideData);

            // Update car database if car number provided
            if (options.carNumber) {
                await dbService.updateCar(options.carNumber);
            }

            // Sync to backend if online
            if (navigator.onLine) {
                this.syncToBackend(rideData).catch(() => {
                    // Backend not configured yet — ignore silently
                });
            } else {
                await dbService.addPendingRide(rideData);
                // Register background sync
                if ('serviceWorker' in navigator) {
                    try {
                        const registration = await navigator.serviceWorker.ready;
                        if ('sync' in registration) {
                            await registration.sync.register('sync-rides');
                        }
                    } catch (e) {
                        // Background sync not supported
                    }
                }
            }

            // Show success notification
            this.showNotification('Ride logged! 🚇', 'success');

            return { success: true, rideId, rideData };
        } catch (error) {
            console.error('Error logging ride:', error);
            this.showNotification('Failed to log ride', 'error');
            return { success: false, error };
        }
    }

    async detectStation() {
        try {
            const position = await locationService.getCurrentPosition();
            this.currentStation = locationService.getClosestStation();
            return this.currentStation;
        } catch (error) {
            console.error('Location error:', error);
            return null;
        }
    }

    inferLine() {
        if (this.selectedArrival) {
            return this.selectedArrival.line;
        }
        if (this.currentStation && this.currentStation.lines.length > 0) {
            return locationService.inferLine(this.currentStation);
        }
        return null;
    }

    inferDirection() {
        if (this.selectedArrival) {
            return this.selectedArrival.direction;
        }
        // Could use GPS heading or historical patterns
        return 'Unknown';
    }

    async syncToBackend(rideData) {
        // Replace with your actual backend endpoint
        const endpoint = '/api/rides';

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // Add authentication header if needed
                },
                body: JSON.stringify(rideData)
            });

            if (!response.ok) {
                throw new Error('Backend sync failed');
            }

            return await response.json();
        } catch (error) {
            console.error('Backend sync error:', error);
            // Save to pending queue for later
            await dbService.addPendingRide(rideData);
            throw error;
        }
    }

    showNotification(message, type = 'info') {
        const statusEl = document.getElementById('log-status');
        if (statusEl) {
            statusEl.textContent = message;
            statusEl.style.display = 'block';
            statusEl.style.background = type === 'success' ? '#d4edda' : type === 'error' ? '#f8d7da' : '#d1ecf1';
            statusEl.style.color = type === 'success' ? '#155724' : type === 'error' ? '#721c24' : '#0c5460';
            setTimeout(() => {
                statusEl.textContent = '';
                statusEl.style.display = 'none';
            }, 3000);
        }

        // Show browser notification if permitted
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Subway Tracker', {
                body: message,
                icon: '/icons/icon-192x192.png',
                badge: '/icons/icon-96x96.png'
            });
        }
    }

    async requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            const permission = await Notification.requestPermission();
            return permission === 'granted';
        }
        return Notification.permission === 'granted';
    }

    validateCarNumber(carNumber) {
        // Basic validation for NYC subway car numbers (4 digits)
        const pattern = /^[0-9]{4}$/;
        return pattern.test(carNumber);
    }

    getCarModel(carNumber) {
        return dbService.inferCarModel(carNumber);
    }

    setSelectedArrival(arrival) {
        this.selectedArrival = arrival;
    }

    clearSelectedArrival() {
        this.selectedArrival = null;
    }
}

// Create global instance
const rideLogger = new RideLogger();