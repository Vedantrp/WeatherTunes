# 🔧 WeatherTunes Setup Guide

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

This will install:
- `express` - Web server
- `node-fetch` - HTTP requests
- `cors` - Cross-origin support
- `dotenv` - Environment variables
- `nodemon` (dev) - Auto-restart on changes

### 2. Create `.env` File

Create a `.env` file in the project root with your API keys:

```env
# Spotify API Credentials (Required)
SPOTIFY_CLIENT_ID=your_spotify_client_id_here
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret_here

# Weather API Key (Required)
WEATHER_API_KEY=your_weather_api_key_here

# OpenAI API Key (Optional - for AI-generated playlists)
OPENAI_API_KEY=your_openai_api_key_here

# Server Configuration
PORT=3000
REDIRECT_URI=http://127.0.0.1:3000/api/callback
```

### 3. Get Your API Keys

#### Spotify API (Required)
1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Click "Create an App"
3. Fill in app details
4. **Important**: Add redirect URI: `http://127.0.0.1:3000/api/callback`
5. Copy Client ID and Client Secret to `.env`

#### Weather API (Required)
1. Go to [WeatherAPI.com](https://www.weatherapi.com/)
2. Sign up for free account
3. Copy your API key to `.env`

#### OpenAI API (Optional)
1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in
3. Create API key
4. Copy to `.env` (optional - app works without it)

### 4. Start the Server

```bash
npm start
```

Or for development with auto-reload:

```bash
npm run dev
```

### 5. Open in Browser

Visit: `http://localhost:3000`

## Troubleshooting

### Server won't start
- Check that all required API keys are in `.env`
- Make sure `.env` file is in the project root
- Verify no syntax errors in `.env` (no quotes needed)

### Spotify login doesn't work
- Verify redirect URI matches exactly: `http://127.0.0.1:3000/api/callback`
- Check Spotify app settings in developer dashboard
- Make sure backend server is running

### AI playlists not working
- Check if `OPENAI_API_KEY` is set in `.env`
- Verify API key is valid
- App will fall back to genre-based search if AI fails

## Security Notes

⚠️ **Never commit your `.env` file to Git!**

The `.gitignore` file already excludes `.env`, but double-check before pushing to GitHub.

## Production Deployment

For production:
1. Use environment variables provided by your hosting platform
2. Never hardcode API keys in code
3. Use HTTPS for redirect URIs
4. Update `REDIRECT_URI` in production environment



