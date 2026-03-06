# Subway Tracker PWA 🚇

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/matthewlew/subway-tracker-pwa)

A Progressive Web App for NYC subway commuters to log rides, track train cars, and view commuting statistics. Built as a "Flighty for subway" concept.

![PWA Badge](https://img.shields.io/badge/PWA-enabled-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## 🚀 Live Demo

**Production**: [Coming soon - Deploy to Vercel]

## ✨ Features

- 📍 **Real-time train arrivals** using MTA GTFS-realtime feeds
- ⚡ **One-tap ride logging** with automatic station detection
- 🚃 **Train car tracking** with model inference
- 📊 **Commuting statistics** and visualizations
- 📱 **Installable PWA** with offline support
- 🔄 **Background sync** for offline rides

## 🏃 Quick Start

### Option 1: Deploy to Vercel (Recommended for @matthewlew)

1. Click the "Deploy with Vercel" button above
2. Connect your GitHub account
3. Add your MTA API key as environment variable
4. Deploy! (takes ~30 seconds)

**Detailed guide**: See [VERCEL_DEPLOY.md](VERCEL_DEPLOY.md)

### Option 2: Run Locally

```bash
# Clone repository
git clone https://github.com/matthewlew/subway-tracker-pwa.git
cd subway-tracker-pwa

# Get MTA API key from https://api.mta.info/

# Serve locally
python -m http.server 8000

# Open http://localhost:8000/public/
```

## 🔑 Configuration

### Environment Variables (Vercel)

Set in Vercel project settings:

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_MTA_API_KEY` | Your MTA GTFS-realtime API key | Yes |
| `VITE_USE_MOCK_DATA` | Use mock data instead of real API | No |

### Local Development

1. Copy `.env.example` to `.env.local`
2. Add your MTA API key
3. The app will automatically use it

## 📱 PWA Features

- ✅ Installable to home screen
- ✅ Offline support with Service Worker
- ✅ Background sync for offline rides
- ✅ Push notifications (optional)
- ✅ Fast loading with caching

## 🏗️ Tech Stack

- **Frontend**: Vanilla JavaScript (ES6+), HTML5, CSS3
- **Storage**: IndexedDB for offline data
- **APIs**: MTA GTFS-realtime, Geolocation, Camera (optional)
- **Deployment**: Vercel with CDN
- **PWA**: Service Workers, Web App Manifest

## 📂 Project Structure

```
subway-tracker-pwa/
├── public/              # Static files (entry point)
│   ├── index.html       # Main app interface
│   ├── manifest.json    # PWA manifest
│   └── sw.js            # Service Worker
├── src/
│   ├── js/              # JavaScript modules
│   │   ├── app.js           # Main app logic
│   │   ├── mtaService.js    # MTA API integration
│   │   ├── rideLogger.js    # Ride logging
│   │   ├── statsService.js  # Analytics
│   │   ├── locationService.js # GPS handling
│   │   └── dbService.js     # IndexedDB
│   └── css/
│       └── styles.css   # All styles
├── backend/             # Backend schema & docs
└── vercel.json          # Vercel config
```

## 🚦 Development

### Local Development Server

```bash
python -m http.server 8000
# or
npx http-server -p 8000
```

### Test PWA Features

1. Open in Chrome/Edge
2. DevTools → Application → Service Workers
3. Enable "Offline" to test offline mode
4. Click install icon in address bar

### Enable Real MTA Data

Edit `src/js/mtaService.js`:

```javascript
this.apiKey = 'YOUR_MTA_API_KEY';
this.mockArrivals = false;
```

## 📖 Documentation

- **[VERCEL_DEPLOY.md](VERCEL_DEPLOY.md)** - Complete Vercel deployment guide for @matthewlew
- **[MTA_INTEGRATION_GUIDE.md](backend/MTA_INTEGRATION_GUIDE.md)** - MTA API integration details
- **[MTA_SETUP_CHECKLIST.md](MTA_SETUP_CHECKLIST.md)** - 5-minute API setup
- **[README.md](README.md)** - Full technical documentation

## 🔐 Security

- ✅ API keys stored as environment variables (never in code)
- ✅ `.gitignore` prevents sensitive data commits
- ✅ HTTPS enforced by Vercel
- ✅ Service Worker with secure headers

## 🤝 Contributing

Contributions welcome! This is a personal project for testing the concept.

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📝 License

MIT License - See [LICENSE](LICENSE) for details

## 🙏 Credits

- **MTA Data**: Metropolitan Transportation Authority
- **Concept**: Inspired by Flighty app for flight tracking
- **Developer**: [@matthewlew](https://github.com/matthewlew)

## 🐛 Issues & Support

- Report bugs: [GitHub Issues](https://github.com/matthewlew/subway-tracker-pwa/issues)
- MTA API Support: [Google Group](https://groups.google.com/g/mtadeveloperresources)

## 🎯 Roadmap

- [x] MVP: One-tap ride logging
- [x] Real-time arrivals
- [x] Stats dashboard
- [x] Offline support
- [ ] OCR car number scanning
- [ ] User accounts & cloud sync
- [ ] Social features
- [ ] Route tracking
- [ ] Native iOS/Android apps

## 📧 Contact

**Matthew Nguyen**  
GitHub: [@matthewlew](https://github.com/matthewlew)  
Location: Escondido, CA

---

Made with ❤️ for NYC subway commuters
