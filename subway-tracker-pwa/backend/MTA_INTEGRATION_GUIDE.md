# MTA GTFS-Realtime Integration Guide

## Overview

The Subway Tracker PWA uses the official MTA GTFS-realtime API to display live train arrival times. This guide explains how to set up and use the real-time feeds.

## Getting Started

### 1. Register for an API Key

1. Visit **https://api.mta.info/**
2. Click "Request API Access"
3. Fill out the registration form with:
   - Your name and email
   - App name: "Subway Tracker PWA"
   - App description: Brief description of your use case
4. Accept the Terms and Conditions
5. You'll receive your API key via email (usually within minutes)

### 2. Configure Your API Key

Edit `src/js/mtaService.js` and replace the placeholder:

```javascript
this.apiKey = 'YOUR_ACTUAL_API_KEY_HERE';
```

Also set:

```javascript
this.mockArrivals = false;  // Switch from mock to real data
```

## API Endpoints

The MTA provides separate GTFS-realtime feeds for different line groups:

| Feed Group | Lines | URL |
|------------|-------|-----|
| 123456 | 1, 2, 3, 4, 5, 6, S | `https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs` |
| ACE | A, C, E | `https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-ace` |
| BDFM | B, D, F, M | `https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-bdfm` |
| G | G | `https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-g` |
| JZ | J, Z | `https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-jz` |
| NQRW | N, Q, R, W | `https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-nqrw` |
| L | L | `https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-l` |
| SI | Staten Island Railway | `https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-si` |

### Authentication

All requests must include your API key in the header:

```javascript
headers: {
    'x-api-key': 'YOUR_API_KEY'
}
```

## Feed Format

MTA feeds use the **GTFS-realtime protocol buffer format**. You'll need to parse the binary protobuf data.

### Installing GTFS-Realtime Bindings

Add to your `index.html` before other scripts:

```html
<script src="https://cdn.jsdelivr.net/npm/gtfs-realtime-bindings@1.1.2/dist/bundle.min.js"></script>
```

Or install via npm:

```bash
npm install gtfs-realtime-bindings
```

### Parsing Feed Data

```javascript
// Fetch the feed
const response = await fetch(feedUrl, {
    headers: { 'x-api-key': apiKey }
});

// Parse protobuf
const buffer = await response.arrayBuffer();
const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
    new Uint8Array(buffer)
);

// Iterate through entities
for (const entity of feed.entity) {
    if (entity.tripUpdate) {
        const trip = entity.tripUpdate.trip;
        const stopTimeUpdates = entity.tripUpdate.stopTimeUpdate;

        // Process arrivals...
    }
}
```

## NYC Subway Specific Details

### Station IDs

MTA station IDs include a direction suffix:
- **N** = Northbound (Uptown/Bronx)
- **S** = Southbound (Downtown/Brooklyn)

Example: `127N` = Times Square-42 St, Northbound platform

### Feed Update Frequency

- Feeds are updated **every 30 seconds**
- Cache arrivals for 30 seconds to reduce API calls
- Don't poll more frequently than every 30 seconds

### Trip Replacement Period

The feed contains:
- **All trips currently underway** (assigned trains)
- **Trips starting in the next 30 minutes** (unassigned trains)

If a scheduled trip is NOT in the feed, consider it cancelled.

### Train Assignment

- `is_assigned = true`: Train is already running or will depart soon
- `is_assigned = false`: Train is scheduled but not yet confirmed

### Stop Time Updates

For each stop, the feed provides:
- **Arrival time**: When the train arrives
- **Departure time**: When the train leaves (at terminals and "scheduled holds")
- **Transit time**: For mid-route stops

## Implementation in Subway Tracker

### How the App Uses MTA Data

1. **User opens Arrivals screen**
   ```
   locationService.getCurrentPosition()
   → locationService.getNearbyStations()
   → mtaService.getArrivalsForStation(stationId, lines)
   ```

2. **MTA service fetches data**
   ```
   - Determine which feed groups are needed
   - Fetch from relevant feeds (e.g., NQRW for N/Q/R/W trains)
   - Parse protobuf response
   - Filter by station ID
   - Sort by arrival time
   - Cache for 30 seconds
   ```

3. **Display to user**
   ```
   - Show line badge with MTA colors
   - Show destination
   - Show minutes away ("3 min", "Arriving")
   - Update every 30 seconds
   ```

### Caching Strategy

```javascript
// Cache arrivals by station + lines
const cacheKey = `${stationId}-${lines.join(',')}`;
const cached = this.arrivalsCache.get(cacheKey);

// Use cache if less than 30 seconds old
if (cached && (Date.now() - cached.timestamp < 30000)) {
    return cached.data;
}
```

## Error Handling

### Common Issues

1. **Invalid API Key**
   - Status: 401 Unauthorized
   - Solution: Verify your API key is correct

2. **Rate Limiting**
   - MTA may limit requests per minute
   - Solution: Implement caching (30 seconds minimum)

3. **Network Errors**
   - Solution: Fall back to mock data or cached data

4. **Empty Feed**
   - Some feeds may be empty during overnight hours
   - Solution: Show "No upcoming trains" message

### Fallback Strategy

```javascript
try {
    const arrivals = await this.fetchFeedArrivals(feedGroup, stationId, lines);
    return arrivals;
} catch (error) {
    console.error('MTA API error:', error);
    // Fall back to mock data
    return this.getMockArrivals(stationId, lines);
}
```

## Testing Your Integration

### 1. Test with Mock Data First

```javascript
this.mockArrivals = true;  // Use mock data
```

Verify:
- ✓ Arrivals display correctly
- ✓ Times count down
- ✓ UI updates every 30 seconds

### 2. Switch to Real API

```javascript
this.apiKey = 'YOUR_REAL_KEY';
this.mockArrivals = false;
```

Test at different times:
- **Peak hours** (8am, 6pm): High frequency
- **Midday** (12pm): Moderate frequency
- **Late night** (1am): Low frequency or empty

### 3. Test Edge Cases

- Station with no upcoming trains
- Single line vs multiple lines
- Network disconnection (offline mode)
- API key errors

## Performance Optimization

### Best Practices

1. **Cache aggressively**: 30 second minimum
2. **Batch requests**: Fetch multiple lines from one feed
3. **Lazy load**: Only fetch when user views Arrivals screen
4. **Debounce**: Don't fetch on every location update

### Reducing API Calls

```javascript
// Good: Fetch once for all lines
const arrivals = await mtaService.getArrivalsForStation('127', ['N','Q','R','W']);

// Bad: Fetch separately for each line
const nTrains = await mtaService.getArrivalsForStation('127', ['N']);
const qTrains = await mtaService.getArrivalsForStation('127', ['Q']);
// ... (wastes API calls)
```

## Advanced Features (Optional)

### Service Alerts

Fetch service alerts from:
```
https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/camsys%2Fsubway-alerts
```

### Vehicle Positions

Some feeds include real-time train positions:

```javascript
for (const entity of feed.entity) {
    if (entity.vehicle) {
        const position = entity.vehicle.position;
        const timestamp = entity.vehicle.timestamp;
        // Use for train tracking on map
    }
}
```

### Train Car Numbers

The MTA feed includes train IDs:

```javascript
const trainId = entity.tripUpdate.trip.nyctTripDescriptor?.trainId;
// Example: "06 0123+ PEL/BBR"
```

## Compliance and Terms

### MTA Terms of Service

- Free for non-commercial use
- Attribution required: "Powered by MTA Real-Time Data"
- No excessive polling (respect 30 second update frequency)
- Data is provided as-is, no guarantees

### Rate Limits

- Not officially published
- Recommended: Max 2 requests per minute per feed
- Use caching to stay well under limits

### Attribution

Add to your app's footer or About page:

```html
<p>Real-time train data provided by 
   <a href="https://www.mta.info">Metropolitan Transportation Authority</a>
</p>
```

## Resources

### Official Documentation

- **MTA Developers Portal**: https://www.mta.info/developers
- **GTFS-Realtime Spec**: https://developers.google.com/transit/gtfs-realtime/
- **NYC Subway Extensions**: Download nyct-subway.proto from MTA site
- **API Support Group**: https://groups.google.com/g/mtadeveloperresources

### Code Examples

- **Andrew-Dickinson/nyct-gtfs** (Python): https://github.com/Andrew-Dickinson/nyct-gtfs
- **mimouncadosch/MTA-API** (Node.js): https://github.com/mimouncadosch/MTA-API

### Static GTFS Data

For station names, coordinates, and schedules:
- **Regular GTFS**: Updated quarterly
- **Supplemented GTFS**: Updated hourly with service changes
- Download: https://www.mta.info/developers

## Troubleshooting

### Feed Returns Empty Results

**Cause**: Station ID format may be wrong

**Solution**: Ensure station IDs include direction:
```javascript
// Correct
const stopId = '127N';  // Times Square northbound

// Wrong
const stopId = '127';   // Missing direction
```

### Times Not Updating

**Cause**: Trains may be stalled or feed is stale

**Solution**: Check `vehicle.timestamp`:
```javascript
const lastUpdate = entity.vehicle?.timestamp?.toNumber() * 1000;
const stalled = (Date.now() - lastUpdate) > 90000;  // 90 seconds
```

### CORS Errors

**Cause**: Browser blocking cross-origin requests

**Solution**: MTA API supports CORS. If issues persist:
1. Verify you're using HTTPS
2. Check API key is in header, not URL
3. Consider using a proxy for development

## Next Steps

1. ✓ Register for API key
2. ✓ Add gtfs-realtime-bindings library
3. ✓ Update mtaService.js with your key
4. ✓ Test with real MTA data
5. ✓ Add proper attribution
6. ✓ Deploy your app!

---

**Last Updated**: March 2026  
**MTA API Version**: GTFS-realtime 1.0 with NYC extensions 1.1
