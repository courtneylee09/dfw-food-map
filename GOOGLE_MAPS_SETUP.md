# Google Maps Setup Guide

Your app now uses Google Maps instead of OpenStreetMap! Follow these steps to get it working.

## Step 1: Get a Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Maps JavaScript API**:
   - Go to "APIs & Services" → "Library"
   - Search for "Maps JavaScript API"
   - Click "Enable"
4. Create an API Key:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "API Key"
   - Copy your API key

## Step 2: Restrict Your API Key (Recommended for Production)

1. Click on your API key to edit it
2. Under "API restrictions", select "Restrict key"
3. Choose "Maps JavaScript API"
4. Under "Application restrictions", you can restrict by:
   - HTTP referrers (for web apps)
   - IP addresses (for server-side)
5. Save your changes

## Step 3: Add API Key to Your Project

Create or update your `.env` file in the root directory (`DFW-Food-Map/DFW-Food-Map/`):

```env
VITE_GOOGLE_MAPS_API_KEY=your-api-key-here
```

**Important:** 
- Replace `your-api-key-here` with your actual API key
- Never commit the `.env` file to git (it's already in `.gitignore`)
- The `VITE_` prefix is required for Vite to expose it to the frontend

## Step 4: Restart Your Server

Stop your server (Ctrl+C) and restart it:

```bash
npm run dev
```

## Step 5: Test It Out

1. Open http://localhost:5000 in your browser
2. You should see Google Maps instead of OpenStreetMap
3. The map should show your food resources with custom markers

## Troubleshooting

### "Google Maps API Key Required" message
- Make sure `VITE_GOOGLE_MAPS_API_KEY` is set in your `.env` file
- Restart your server after adding the key
- Check that the key starts with `VITE_`

### "This page can't load Google Maps correctly"
- Check that the Maps JavaScript API is enabled
- Verify your API key is correct
- Check browser console for specific error messages
- Make sure billing is enabled (Google requires a billing account, but gives $200 free credit/month)

### Map not showing
- Check browser console (F12) for errors
- Verify the API key has the correct restrictions
- Make sure you're using `VITE_GOOGLE_MAPS_API_KEY` (not just `GOOGLE_MAPS_API_KEY`)

## Google Maps Pricing

- **Free tier:** $200 credit per month
- **Maps JavaScript API:** $7 per 1,000 map loads
- For most small to medium apps, the free tier is sufficient

## What Changed?

- ✅ Replaced Leaflet/OpenStreetMap with Google Maps
- ✅ Custom markers with icons for different resource types
- ✅ Info windows when clicking markers
- ✅ Same functionality, better map quality

The app will show a helpful message if the API key is missing, so you can still develop other features while setting up Google Maps.



