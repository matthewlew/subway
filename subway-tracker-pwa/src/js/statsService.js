// Stats service for calculating user metrics
class StatsService {
    constructor() {
        this.avgRideDuration = 25; // minutes (default estimate)
    }

    async calculateStats(rides, period = 'all') {
        const filteredRides = this.filterByPeriod(rides, period);

        return {
            totalRides: filteredRides.length,
            timeUnderground: this.calculateTimeUnderground(filteredRides),
            topStation: this.getMostCommon(filteredRides, 'station'),
            topLine: this.getMostCommon(filteredRides, 'line'),
            lineBreakdown: this.getLineBreakdown(filteredRides),
            recentRides: this.getRecentRides(filteredRides, 10),
            ridingDays: this.getRidingDays(filteredRides),
            averagePerDay: this.getAveragePerDay(filteredRides)
        };
    }

    filterByPeriod(rides, period) {
        if (period === 'all') return rides;

        const now = Date.now();
        const daysAgo = period === '7' ? 7 : 30;
        const cutoff = now - (daysAgo * 24 * 60 * 60 * 1000);

        return rides.filter(ride => ride.timestamp >= cutoff);
    }

    calculateTimeUnderground(rides) {
        const totalMinutes = rides.length * this.avgRideDuration;
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        return { hours, minutes, totalMinutes };
    }

    getMostCommon(rides, field) {
        if (rides.length === 0) return null;

        const counts = {};
        rides.forEach(ride => {
            const value = ride[field];
            if (value) {
                counts[value] = (counts[value] || 0) + 1;
            }
        });

        let maxCount = 0;
        let mostCommon = null;

        for (const [value, count] of Object.entries(counts)) {
            if (count > maxCount) {
                maxCount = count;
                mostCommon = value;
            }
        }

        return mostCommon;
    }

    getLineBreakdown(rides) {
        const lineCounts = {};

        rides.forEach(ride => {
            if (ride.line) {
                lineCounts[ride.line] = (lineCounts[ride.line] || 0) + 1;
            }
        });

        return Object.entries(lineCounts)
            .map(([line, count]) => ({ line, count }))
            .sort((a, b) => b.count - a.count);
    }

    getRecentRides(rides, limit = 10) {
        return rides
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, limit);
    }

    getRidingDays(rides) {
        const days = new Set();
        rides.forEach(ride => {
            const date = new Date(ride.timestamp);
            const dayKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
            days.add(dayKey);
        });
        return days.size;
    }

    getAveragePerDay(rides) {
        const ridingDays = this.getRidingDays(rides);
        if (ridingDays === 0) return 0;
        return (rides.length / ridingDays).toFixed(1);
    }

    async getCarStats() {
        const cars = await dbService.getAllCars();

        return {
            totalCars: cars.length,
            mostSpottedCar: cars.sort((a, b) => b.timesSpotted - a.timesSpotted)[0],
            carsByModel: this.groupByModel(cars)
        };
    }

    groupByModel(cars) {
        const models = {};

        cars.forEach(car => {
            const model = car.model || 'Unknown';
            if (!models[model]) {
                models[model] = { model, count: 0, cars: [] };
            }
            models[model].count++;
            models[model].cars.push(car.carNumber);
        });

        return Object.values(models).sort((a, b) => b.count - a.count);
    }

    formatDuration(minutes) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;

        if (hours === 0) return `${mins}m`;
        if (mins === 0) return `${hours}h`;
        return `${hours}h ${mins}m`;
    }

    formatDate(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;

        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    getLineColor(line) {
        const colors = {
            '1': '#EE352E', '2': '#EE352E', '3': '#EE352E',
            '4': '#00933C', '5': '#00933C', '6': '#00933C',
            '7': '#B933AD',
            'A': '#0039A6', 'C': '#0039A6', 'E': '#0039A6',
            'B': '#FF6319', 'D': '#FF6319', 'F': '#FF6319', 'M': '#FF6319',
            'G': '#6CBE45',
            'J': '#996633', 'Z': '#996633',
            'L': '#A7A9AC',
            'N': '#FCCC0A', 'Q': '#FCCC0A', 'R': '#FCCC0A', 'W': '#FCCC0A',
            'S': '#808183'
        };
        return colors[line] || '#2C3E50';
    }
}

// Create global instance
const statsService = new StatsService();