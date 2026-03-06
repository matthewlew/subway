# MTA API Setup Checklist

## Step-by-Step Setup (5 minutes)

### ☐ Step 1: Get API Key
1. Go to https://api.mta.info/
2. Click "Request API Access"
3. Fill out form:
   - Name: [Your name]
   - Email: [Your email]
   - App: Subway Tracker PWA
   - Description: PWA for tracking subway rides
4. Check email for API key

### ☐ Step 2: Add GTFS Library
Add to `public/index.html` before closing `</body>`:

```html
<script src="https://cdn.jsdelivr.net/npm/gtfs-realtime-bindings@1.1.2/dist/bundle.min.js"></script>
```

### ☐ Step 3: Configure API Key
Edit `src/js/mtaService.js`:

```javascript
// Line 7
this.apiKey = 'YOUR_API_KEY_HERE';  // ← Paste your key

// Line 38
this.mockArrivals = false;  // ← Switch to real data
```

### ☐ Step 4: Test Locally
```bash
cd subway-tracker-pwa
python -m http.server 8000
# Open http://localhost:8000/public/
```

Test checklist:
- [ ] Arrivals screen shows nearby stations
- [ ] Real train times appear
- [ ] Times count down every 30 seconds
- [ ] Multiple lines display correctly
- [ ] No console errors

### ☐ Step 5: Add Attribution
Add to your app footer (in `public/index.html`):

```html
<footer style="text-align:center; padding:20px; font-size:12px; color:#7F8C8D;">
    Real-time data from <a href="https://www.mta.info">MTA</a>
</footer>
```

## Verification

### Check Your Setup

Open browser console and run:

```javascript
// Should show your API key (first/last 4 chars)
console.log('API Key:', mtaService.apiKey.slice(0,4) + '...' + mtaService.apiKey.slice(-4));

// Should be false for real data
console.log('Mock mode:', mtaService.mockArrivals);

// Test fetch
mtaService.getArrivalsForStation('127', ['N','Q','R']).then(arrivals => {
    console.log('Arrivals:', arrivals);
});
```

### Expected Output

```javascript
API Key: abc1...xyz9
Mock mode: false
Arrivals: [
  {
    line: "N",
    direction: "Downtown",
    destination: "Coney Island-Stillwell Av",
    arrivalTime: 1709741400000,
    minutesAway: 3,
    stationId: "127"
  },
  // ... more arrivals
]
```

## Troubleshooting

### "401 Unauthorized"
→ API key is incorrect or not in header
→ Check `this.apiKey` value in mtaService.js

### "GtfsRealtimeBindings is not defined"
→ Library not loaded
→ Add script tag to index.html

### Empty arrivals array
→ Check station ID format (should end with N/S)
→ Verify lines array matches station
→ Try different time of day (trains may be infrequent)

### Network error
→ Check internet connection
→ Verify HTTPS is used
→ Check browser console for CORS issues

## Quick Reference

### Feed URLs
- 1,2,3,4,5,6: `nyct%2Fgtfs`
- A,C,E: `nyct%2Fgtfs-ace`
- B,D,F,M: `nyct%2Fgtfs-bdfm`
- G: `nyct%2Fgtfs-g`
- J,Z: `nyct%2Fgtfs-jz`
- N,Q,R,W: `nyct%2Fgtfs-nqrw`
- L: `nyct%2Fgtfs-l`

### Station ID Format
- Times Square North: `127N`
- Times Square South: `127S`
- Union Square North: `132N`
- Union Square South: `132S`

### Cache Duration
- **30 seconds** (matches MTA update frequency)

## Done! 🎉

Your app now displays real-time MTA train arrivals!

Next: Deploy to Netlify/Vercel and share with commuters.
