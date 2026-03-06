# Vercel Deployment Guide for @matthewlew

This guide will help you deploy the Subway Tracker PWA to Vercel in under 5 minutes.

## Prerequisites

- GitHub account (https://github.com/matthewlew)
- Vercel account (free tier works perfectly)
- MTA API key from https://api.mta.info/

## Quick Deploy (5 Minutes)

### Step 1: Push to GitHub

1. **Initialize Git repository**
   ```bash
   cd subway-tracker-pwa
   git init
   git add .
   git commit -m "Initial commit: Subway Tracker PWA"
   ```

2. **Create GitHub repository**
   - Go to https://github.com/new
   - Repository name: `subway-tracker-pwa`
   - Set to Public or Private
   - Click "Create repository"

3. **Push to GitHub**
   ```bash
   git remote add origin https://github.com/matthewlew/subway-tracker-pwa.git
   git branch -M main
   git push -u origin main
   ```

### Step 2: Deploy to Vercel

1. **Visit Vercel**
   - Go to https://vercel.com/
   - Sign in with GitHub

2. **Import Project**
   - Click "Add New..." → "Project"
   - Select your `subway-tracker-pwa` repository
   - Click "Import"

3. **Configure Project**
   - **Project Name**: subway-tracker-pwa
   - **Framework Preset**: Other
   - **Root Directory**: `./` (leave as default)
   - **Build Command**: Leave empty (static site)
   - **Output Directory**: `public`

4. **Add Environment Variable**
   - Click "Environment Variables"
   - Add variable:
     - **Name**: `VITE_MTA_API_KEY`
     - **Value**: [Paste your MTA API key]
   - Click "Add"

5. **Deploy**
   - Click "Deploy"
   - Wait 30-60 seconds
   - Your app is live! 🎉

### Step 3: Get Your URL

After deployment completes:
- Production URL: `https://subway-tracker-pwa.vercel.app`
- Custom domains can be added in Settings

## Configuration Details

### Environment Variables on Vercel

Add these in Project Settings → Environment Variables:

| Variable | Value | Required |
|----------|-------|----------|
| `VITE_MTA_API_KEY` | Your MTA API key | Yes |
| `VITE_USE_MOCK_DATA` | `false` | No (defaults to false) |

**Important**: Never commit your API key to GitHub! Always use environment variables.

### Project Structure for Vercel

```
subway-tracker-pwa/
├── vercel.json          ← Vercel configuration
├── public/              ← Static files (served at root)
│   ├── index.html
│   ├── manifest.json
│   ├── sw.js
│   └── src/
└── .gitignore           ← Prevents API keys from being committed
```

The `vercel.json` file configures:
- Routes: All requests go to `/public/`
- Headers: Service Worker and caching headers
- Clean URLs: Removes `.html` extensions

## Continuous Deployment

Vercel automatically deploys when you push to GitHub:

```bash
# Make changes
git add .
git commit -m "Add feature X"
git push

# Vercel auto-deploys in ~30 seconds
```

### Preview Deployments

Every pull request gets a preview URL:
- Push to feature branch
- Create PR on GitHub
- Vercel comments with preview URL
- Test before merging to main

## Custom Domain (Optional)

### Add Custom Domain

1. Go to Project Settings → Domains
2. Add your domain (e.g., `subwaytracker.app`)
3. Follow DNS configuration instructions
4. Vercel handles SSL automatically

### Recommended Domains
- `subwaytracker.app`
- `flighty-subway.com`
- `mysubway.app`

## PWA on Vercel

### HTTPS
✓ Vercel provides free HTTPS  
✓ Required for PWA features  
✓ Automatic SSL certificate renewal

### Service Worker
✓ Configured in `vercel.json`  
✓ Correct headers for offline caching  
✓ Background sync enabled

### Install Prompt
✓ Works on Chrome, Edge, Samsung Internet  
✓ iOS Safari: Add to Home Screen manually  
✓ Desktop: Install icon in address bar

## Monitoring & Analytics

### Vercel Analytics (Optional)

1. Enable in Project Settings → Analytics
2. Free tier includes:
   - Page views
   - Top pages
   - Referrers
   - Devices

### Check Logs

View deployment logs:
- Go to Deployments tab
- Click on latest deployment
- View "Build Logs" and "Function Logs"

## Troubleshooting

### API Key Not Working

**Symptom**: Mock data still showing

**Solution**:
1. Verify API key in Vercel dashboard: Settings → Environment Variables
2. Redeploy: Deployments → Three dots → Redeploy
3. Clear browser cache and reload

### Service Worker Not Caching

**Symptom**: App doesn't work offline

**Solution**:
1. Check `vercel.json` is in repository root
2. Verify Service Worker headers in Network tab (DevTools)
3. Unregister old service workers: DevTools → Application → Service Workers → Unregister

### Routes Not Working

**Symptom**: 404 on `/src/js/app.js`

**Solution**:
1. Ensure `vercel.json` routes are correct
2. Check files are in `/public/` directory
3. Redeploy project

### Build Fails

**Symptom**: Deployment stuck or failed

**Solution**:
1. Check build logs for errors
2. Ensure no large files (>100MB) in repo
3. Verify all files are committed to GitHub

## Performance Optimization

### Enable Caching

Already configured in `vercel.json`:
- JavaScript files: 1 year cache
- Service Worker: No cache (always fresh)
- Images: 1 year cache

### Compress Assets

Vercel automatically:
- ✓ Gzip compression
- ✓ Brotli compression
- ✓ Image optimization (for `/public/icons/`)

### Edge Network

Vercel's global CDN:
- ✓ 70+ edge locations worldwide
- ✓ Automatic SSL
- ✓ DDoS protection

## Updating Your App

### Regular Updates

```bash
# 1. Make changes locally
nano src/js/app.js

# 2. Test locally
python -m http.server 8000

# 3. Commit and push
git add .
git commit -m "Update feature"
git push

# 4. Vercel auto-deploys
# Check https://subway-tracker-pwa.vercel.app
```

### Update Environment Variables

1. Project Settings → Environment Variables
2. Edit `VITE_MTA_API_KEY`
3. Click "Save"
4. Redeploy for changes to take effect

## Security Best Practices

### ✓ API Key Protection
- ✅ API key stored in Vercel environment variables
- ✅ Never in code or GitHub
- ✅ `.gitignore` blocks accidental commits

### ✓ HTTPS Only
- ✅ Enforced by Vercel
- ✅ HSTS headers enabled
- ✅ Free SSL certificates

### ✓ Content Security Policy
Add to `public/index.html` (optional but recommended):

```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; 
               connect-src 'self' https://api-endpoint.mta.info; 
               style-src 'self' 'unsafe-inline';">
```

## Rollback a Deployment

If something breaks:

1. Go to Deployments tab
2. Find last working deployment
3. Click three dots → "Promote to Production"
4. Previous version restored instantly

## Cost

### Free Tier Includes:
- ✓ Unlimited deployments
- ✓ 100GB bandwidth/month
- ✓ Custom domain
- ✓ Automatic HTTPS
- ✓ Preview deployments
- ✓ Analytics (basic)

**Perfect for personal projects!**

### Bandwidth Usage Estimate
- Average page load: ~500KB
- 100GB = ~200,000 page views/month
- More than enough for early testing

## Next Steps After Deployment

1. ✅ Test on mobile device
2. ✅ Install as PWA from browser
3. ✅ Test offline mode (airplane mode)
4. ✅ Share with friends to get feedback
5. ✅ Monitor Vercel analytics
6. ✅ Add custom domain (optional)

## Support Resources

### Vercel Documentation
- Deployment: https://vercel.com/docs/deployments/overview
- Environment Variables: https://vercel.com/docs/environment-variables
- Custom Domains: https://vercel.com/docs/custom-domains

### Project Repository
- GitHub: https://github.com/matthewlew/subway-tracker-pwa
- Issues: Report bugs in GitHub Issues tab

### MTA API Support
- Docs: https://www.mta.info/developers
- Support: https://groups.google.com/g/mtadeveloperresources

## Quick Commands Cheat Sheet

```bash
# Local development
cd subway-tracker-pwa
python -m http.server 8000

# Git operations
git status                    # Check changes
git add .                     # Stage all files
git commit -m "message"       # Commit changes
git push                      # Deploy to Vercel

# Vercel CLI (optional)
npm i -g vercel              # Install CLI
vercel                       # Deploy from terminal
vercel --prod                # Deploy to production
vercel logs                  # View logs
vercel env ls                # List environment variables
```

## Congratulations! 🎉

Your Subway Tracker PWA is now live on Vercel!

**Your URL**: https://subway-tracker-pwa.vercel.app

Share it with NYC subway commuters and start collecting feedback!

---

**Deployed by**: @matthewlew  
**Platform**: Vercel  
**Last Updated**: March 2026
