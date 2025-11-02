# Spotify Redirect URI Setup Guide

## How to Add Redirect URI in Spotify Developer Dashboard

### Step 1: Go to Your Spotify App
1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Log in with your Spotify account
3. Click on your app (or create a new one if you haven't)

### Step 2: Add Redirect URI
1. In your app settings, scroll down to **"Redirect URIs"** section
2. Click **"Edit Settings"** or the **"+"** button
3. Add this **exact** URL:
   ```
   http://localhost:3000/api/callback
   ```
4. Click **"Add"** or **"Save"**

### Important Notes:
- ✅ **HTTP is allowed for localhost** - Spotify accepts `http://localhost` URLs
- ❌ **Don't use HTTPS** - Unless you have a valid SSL certificate for localhost
- ✅ **Port number is required** - Must include `:3000`
- ✅ **Exact path matters** - Must be `/api/callback` (exactly as in your code)
- ✅ **No trailing slash** - Don't add `/` at the end

### If You Still Get Errors:

1. **Make sure the URL matches exactly:**
   ```
   http://localhost:3000/api/callback
   ```

2. **For production, use HTTPS:**
   ```
   https://yourdomain.com/api/callback
   ```

3. **Multiple Redirect URIs:**
   - You can add multiple redirect URIs
   - Each redirect URI must be on a new line or separate entry
   - Common ones for development:
     - `http://localhost:3000/api/callback`
     - `http://127.0.0.1:3000/api/callback`

4. **After adding, wait a few minutes** for changes to propagate

### Troubleshooting:

**Error: "Invalid redirect URI"**
- Check for typos
- Make sure it's `http://` not `https://` for localhost
- Verify the port number matches your server (3000)
- Make sure the path is exactly `/api/callback`

**Error: "Redirect URI mismatch"**
- The redirect URI in your Spotify app must match EXACTLY what's in your code
- Check `script.js` line where `REDIRECT_URI` is defined
- Currently it's: `http://localhost:${PORT}/api/callback` where PORT=3000

**Still Not Working?**
- Try adding both:
  - `http://localhost:3000/api/callback`
  - `http://127.0.0.1:3000/api/callback`
- Make sure your backend server is running on port 3000
- Check browser console for specific error messages

