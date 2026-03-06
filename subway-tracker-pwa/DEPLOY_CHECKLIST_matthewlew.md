# Deployment Checklist for @matthewlew

Complete these steps to deploy your Subway Tracker PWA to Vercel.

## Pre-Deployment ⏳

### 1. Get MTA API Key
- [ ] Visit https://api.mta.info/
- [ ] Register with your email
- [ ] Save API key somewhere safe (password manager recommended)
- [ ] Test API key works (optional but recommended)

### 2. GitHub Setup
- [ ] Ensure you have a GitHub account at https://github.com/matthewlew
- [ ] Install Git on your local machine (if not already)
- [ ] Configure Git with your name and email:
  ```bash
  git config --global user.name "Matthew Nguyen"
  git config --global user.email "your-email@example.com"
  ```

### 3. Vercel Account
- [ ] Sign up at https://vercel.com/ using your GitHub account
- [ ] Grant Vercel access to your GitHub repositories

## Deployment Steps 🚀

### Step 1: Push to GitHub (5 minutes)
```bash
cd subway-tracker-pwa

# Initialize repository
git init
git add .
git commit -m "Initial commit: Subway Tracker PWA"

# Create repository on GitHub (via website)
# Then connect and push:
git remote add origin https://github.com/matthewlew/subway-tracker-pwa.git
git branch -M main
git push -u origin main
```

- [ ] Repository created on GitHub
- [ ] Code pushed successfully
- [ ] Can view repository at https://github.com/matthewlew/subway-tracker-pwa

### Step 2: Deploy to Vercel (3 minutes)
- [ ] Go to https://vercel.com/new
- [ ] Select "subway-tracker-pwa" repository
- [ ] Click "Import"
- [ ] Set Project Name: `subway-tracker-pwa`
- [ ] Set Framework: Other
- [ ] Set Root Directory: `./`
- [ ] Set Output Directory: `public`
- [ ] Add Environment Variable:
  - Name: `VITE_MTA_API_KEY`
  - Value: [Your MTA API key]
- [ ] Click "Deploy"
- [ ] Wait for deployment to complete (~30 seconds)

### Step 3: Verify Deployment (2 minutes)
- [ ] Visit your production URL: `https://subway-tracker-pwa.vercel.app`
- [ ] App loads correctly
- [ ] No console errors in DevTools
- [ ] Location permission prompt appears
- [ ] Arrivals screen shows trains (or mock data)
- [ ] Can log a test ride
- [ ] Stats screen displays data

## Post-Deployment ✅

### Test PWA Features
- [ ] Test on mobile device
- [ ] Install to home screen works
- [ ] App works in standalone mode
- [ ] Offline mode works (enable airplane mode)
- [ ] Service Worker registered (check DevTools)

### Configure Settings (Optional)
- [ ] Add custom domain (if you have one)
- [ ] Enable Vercel Analytics
- [ ] Set up monitoring alerts

### Share with Users
- [ ] Test with a friend on the subway
- [ ] Collect initial feedback
- [ ] Note any bugs or feature requests
- [ ] Create GitHub Issues for improvements

## Troubleshooting 🔧

### If deployment fails:
1. Check Vercel deployment logs
2. Verify all files are committed to GitHub
3. Ensure vercel.json is in root directory
4. Check build logs for errors

### If app shows mock data:
1. Verify API key in Vercel environment variables
2. Redeploy project
3. Clear browser cache
4. Check browser console for API errors

### If Service Worker doesn't work:
1. Ensure HTTPS is used (Vercel provides this)
2. Unregister old service workers in DevTools
3. Check Service Worker console for errors
4. Verify sw.js is accessible at root URL

## Maintenance 🛠️

### Regular Updates
```bash
# Make changes locally
git add .
git commit -m "Description of changes"
git push

# Vercel auto-deploys
```

### Update MTA API Key
1. Vercel Dashboard → Project → Settings → Environment Variables
2. Edit `VITE_MTA_API_KEY`
3. Save and redeploy

### Monitor Usage
- Check Vercel Analytics dashboard weekly
- Monitor bandwidth usage (100GB free tier)
- Review deployment logs for errors

## Quick Reference 📋

### URLs
- **Production**: https://subway-tracker-pwa.vercel.app
- **GitHub**: https://github.com/matthewlew/subway-tracker-pwa
- **Vercel Dashboard**: https://vercel.com/matthewlew
- **MTA API**: https://api.mta.info/

### Key Files
- `vercel.json` - Vercel configuration
- `public/index.html` - Main app
- `src/js/mtaService.js` - MTA API integration
- `.env.example` - Environment variable template

### Support
- Vercel Docs: https://vercel.com/docs
- MTA Docs: https://www.mta.info/developers
- GitHub Issues: Create at repository Issues tab

---

## Status

- [ ] Pre-deployment complete
- [ ] Deployed to Vercel
- [ ] Verified working
- [ ] Shared with users

**Date Deployed**: _______________  
**Production URL**: _______________

---

Good luck with your deployment! 🚀

Feel free to reach out if you encounter any issues.
