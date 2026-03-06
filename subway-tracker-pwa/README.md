# Subway Tracker PWA 🚇

A Progressive Web App for subway commuters to log rides, track train cars, and view commuting statistics. Built as a "Flighty for subway" concept to test the idea before building a full native app.

## Features

### ✅ Core Features (MVP)

1. **Pre-ride Train Times**
   - Real-time MTA arrivals using GTFS-realtime feeds
   - Displays nearby stations based on GPS location
   - Shows upcoming trains with live countdown timers

2. **One-Tap Ride Logging**
   - Instantly log a ride with a single tap
   - Automatically captures timestamp and location
   - Infers station and train line from GPS and real-time data

3. **Optional Car Number & Tags**
   - Type or scan train car numbers via camera
   - Automatic train model inference from car number
   - Add quick notes/tags to rides (one sentence)

4. **Stats & Dashboards**
   - Total rides tracked
   - Most common stations and lines
   - Time spent underground
   - Train cars spotted
   - Visual timeline of journeys

5. **PWA Features**
   - Installable to home screen
   - Offline support with background sync
   - Quick-access shortcuts
   - Push notifications for ride streaks

---

## Project Structure

```
subway-tracker-pwa/
├── public/
│   ├── index.html           # Main HTML entry point
│   ├── manifest.json        # PWA manifest
│   ├── sw.js                # Service Worker for offline support
│   └── icons/               # App icons (multiple sizes)
├── src/
│   ├── js/
│   │   ├── app.js           # Main application logic & UI
│   │   ├── rideLogger.js    # Core ride logging functionality
│   │   ├── mtaService.js    # MTA GTFS-realtime integration
│   │   ├── statsService.js  # Analytics and stats calculations
│   │   ├── locationService.js # GPS/location handling
│   │   └── dbService.js     # IndexedDB for offline storage
│   ├── css/
│   │   └── styles.css       # All styles
│   └── components/          # Future: modular UI components
├── backend/
│   ├── schema.sql           # Database schema
│   └── api-endpoints.md     # API documentation
└── README.md
```

---

## Getting Started

### Prerequisites
- Modern web browser (Chrome, Safari, Firefox, Edge)
- MTA API key (get from https://api.mta.info/)
- Node.js and npm (for local development server)

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd subway-tracker-pwa
```

2. **Set up MTA API key**
   - Register at https://api.mta.info/
   - Copy your API key
   - Edit `src/js/mtaService.js` and replace `YOUR_MTA_API_KEY`

3. **Serve locally**
```bash
# Using Python
python -m http.server 8000

# Or using Node.js http-server
npx http-server -p 8000
```

4. **Open in browser**
```
http://localhost:8000/public/
```

5. **Install as PWA**
   - On mobile: Tap "Add to Home Screen" in browser menu
   - On desktop: Look for install icon in address bar

---

## Key Technologies

- **Frontend**: Vanilla JavaScript (ES6+), HTML5, CSS3
- **Storage**: IndexedDB for offline data persistence
- **APIs**: 
  - MTA GTFS-realtime API for train arrivals
  - Geolocation API for station detection
  - Camera API for car number scanning (optional)
- **PWA**: Service Workers, Web App Manifest, Background Sync
- **Backend** (optional): PostgreSQL/MySQL, REST API

---

## Configuration

### MTA GTFS-Realtime Setup

1. Get API key from https://api.mta.info/
2. Update `src/js/mtaService.js`:
```javascript
this.apiKey = 'YOUR_ACTUAL_API_KEY';
```

### Backend Setup (Optional)

For production deployment with user accounts:

1. Set up PostgreSQL database
2. Run `backend/schema.sql` to create tables
3. Deploy API endpoints (see `backend/api-endpoints.md`)
4. Update API endpoint URLs in:
   - `src/js/rideLogger.js` (syncToBackend method)
   - `src/js/statsService.js`

---

## Usage Guide

### Logging a Ride

**Method 1: Quick Log from Arrivals**
1. Open app → Arrivals tab
2. Tap on an upcoming train
3. Tap "Log [Train] to [Destination]"

**Method 2: Manual Log**
1. Open app → Log Ride tab
2. Verify station/time is correct
3. Tap "LOG RIDE NOW"
4. (Optional) Add car number and notes

### Scanning Car Numbers

1. Open Log Ride screen
2. Expand "Add car number & notes"
3. Tap 📷 Scan button
4. Point camera at car number placard
5. Capture and confirm

**Note**: OCR requires Tesseract.js library. Add to `index.html`:
```html
<script src="https://cdn.jsdelivr.net/npm/tesseract.js@4/dist/tesseract.min.js"></script>
```

### Viewing Stats

1. Open app → Stats tab
2. Select time period (7 days, 30 days, all time)
3. View:
   - Total rides
   - Time underground
   - Favorite stations/lines
   - Train cars spotted
   - Recent activity

---

## Offline Support

The app works offline using:

1. **Service Worker**: Caches static assets and API responses
2. **IndexedDB**: Stores all ride data locally
3. **Background Sync**: Syncs rides to backend when connection restored

### How it works:
- All ride logs are saved to IndexedDB immediately
- If online: also syncs to backend
- If offline: queued for background sync
- When online again: service worker auto-syncs pending rides

---

## Customization

### Adding More Stations

Edit `src/js/locationService.js`:
```javascript
this.stations = [
  { 
    id: '127', 
    name: 'Times Sq-42 St', 
    lat: 40.7580, 
    lng: -73.9855, 
    lines: ['1','2','3','N','Q','R','W'] 
  },
  // Add more stations...
];
```

### Changing Theme Colors

Edit CSS variables in `src/css/styles.css`:
```css
:root {
    --primary-color: #2C3E50;
    --secondary-color: #3498DB;
    --accent-color: #E74C3C;
}
```

### Train Car Model Inference

Edit `src/js/dbService.js` → `inferCarModel()` method:
```javascript
inferCarModel(carNumber) {
    const num = parseInt(carNumber);
    if (num >= 1000 && num <= 1802) return 'R62/R62A';
    // Add your logic...
}
```

---

## PWA Features Explained

### 1. Install Prompt
- Automatically shows "Add to Home Screen" on supported devices
- Creates native-like app icon
- Launches in standalone mode (no browser UI)

### 2. Offline Caching
- Service worker caches HTML, CSS, JS files
- Rides can be logged without internet
- Background sync queues offline actions

### 3. App Shortcuts
Defined in `manifest.json`:
```json
"shortcuts": [
  {
    "name": "Log Ride",
    "url": "/?action=log"
  }
]
```

### 4. Notifications (Future)
```javascript
// Request permission
await rideLogger.requestNotificationPermission();

// Show notification
new Notification('Subway Tracker', {
  body: 'Ride logged successfully!',
  icon: '/icons/icon-192x192.png'
});
```

---

## Development Roadmap

### Phase 1: MVP (Current)
- ✅ One-tap ride logging
- ✅ Real-time arrivals (mock data)
- ✅ Basic stats dashboard
- ✅ Offline support
- ✅ PWA installable

### Phase 2: Enhanced Features
- [ ] Real MTA GTFS-realtime integration
- [ ] OCR for car number scanning
- [ ] User accounts & cloud sync
- [ ] Social features (share stats)
- [ ] Ride streaks & gamification

### Phase 3: Advanced
- [ ] Route tracking with GPS
- [ ] Transfer detection
- [ ] Commute patterns analysis
- [ ] Carbon footprint tracking
- [ ] Community car database

---

## Browser Support

| Feature | Chrome | Safari | Firefox | Edge |
|---------|--------|--------|---------|------|
| PWA Install | ✅ | ✅ | ⚠️ | ✅ |
| Service Worker | ✅ | ✅ | ✅ | ✅ |
| IndexedDB | ✅ | ✅ | ✅ | ✅ |
| Geolocation | ✅ | ✅ | ✅ | ✅ |
| Camera API | ✅ | ✅ | ✅ | ✅ |
| Background Sync | ✅ | ❌ | ❌ | ✅ |

⚠️ Firefox requires manual "Add to Home Screen" via menu

---

## Production Deployment

### 1. Build for Production
```bash
# Minify JavaScript
npx terser src/js/*.js -o dist/app.min.js

# Minify CSS
npx csso src/css/styles.css -o dist/styles.min.css

# Optimize images
# Use imagemin or similar tools
```

### 2. Deploy Static Files
Upload to:
- **Netlify**: `netlify deploy --prod`
- **Vercel**: `vercel --prod`
- **GitHub Pages**: Push to `gh-pages` branch
- **AWS S3 + CloudFront**: For scalability

### 3. HTTPS Required
PWAs require HTTPS for:
- Service Workers
- Geolocation
- Camera access
- Install prompts

### 4. Configure Backend
- Set up PostgreSQL database
- Deploy API (Node.js, Python, Go, etc.)
- Configure CORS for API
- Set up authentication (JWT recommended)

---

## Troubleshooting

### Location not working
- Enable location permissions in browser
- Ensure HTTPS connection
- Check browser console for errors

### Service Worker not caching
- Clear browser cache
- Check Developer Tools → Application → Service Workers
- Verify service worker registration in console

### Rides not syncing
- Check network connection
- Verify backend API endpoint URL
- Check browser console for API errors

### App not installing
- Must be served over HTTPS (or localhost)
- Check manifest.json is valid
- Ensure all required icons exist

---

## Performance Tips

1. **Lazy Load Images**: Load station images only when visible
2. **Debounce Location Updates**: Don't query location too frequently
3. **Cache MTA Responses**: Store arrivals for 30 seconds
4. **Limit Stats Period**: Default to 30 days, not "all time"
5. **Paginate Ride History**: Load 50 rides at a time

---

## Security Considerations

- Never commit API keys to repository (use environment variables)
- Validate all user inputs (car numbers, notes)
- Sanitize data before displaying (prevent XSS)
- Use HTTPS for all API calls
- Implement rate limiting on backend
- Add authentication for user accounts

---

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

---

## License

MIT License - feel free to use for your own projects!

---

## Credits

- **MTA Data**: Metropolitan Transportation Authority
- **Icons**: (Add your icon source)
- **Inspiration**: Flighty app for flight tracking

---

## Contact

Questions or feedback? Open an issue on GitHub!

---

## Next Steps

1. **Get MTA API Key**: https://api.mta.info/
2. **Test Location Services**: Enable GPS on device
3. **Log Your First Ride**: Take the subway and try it out!
4. **Share Feedback**: What features do you want most?

Happy commuting! 🚇✨
