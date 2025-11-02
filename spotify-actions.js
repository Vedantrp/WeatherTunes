import fetch from 'node-fetch';
import { URLSearchParams } from 'url';

// Load keys from Netlify Environment Variables
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

// Helper to make Spotify API calls
async function spotifyFetch(url, options, token) {
    const response = await fetch(url, {
        ...options,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            ...(options.headers || {})
        }
    });

    // Handle token expiration explicitly
    if (response.status === 401) {
        return { status: 401, body: { error: 'The access token expired.' } };
    }

    const data = await response.json();
    return { status: response.status, body: data };
}

export const handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }
    
    const action = event.queryStringParameters.action;
    let body;

    try {
        body = JSON.parse(event.body);
    } catch (e) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body.' }) };
    }

    const { accessToken, refreshToken, query, playlistName, description, trackUris } = body;

    // --- REFRESH TOKEN ACTION ---
    if (action === 'refresh-token') {
        if (!refreshToken) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Refresh token required' }) };
        }
        try {
            const response = await fetch('https://accounts.spotify.com/api/token', {
                method: 'POST',
                headers: {
                    'Authorization': 'Basic ' + Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64'),
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    grant_type: 'refresh_token',
                    refresh_token: refreshToken
                })
            });
            const data = await response.json();
            if (!response.ok) {
                return { statusCode: 500, body: JSON.stringify({ error: data.error_description || 'Failed to refresh token' }) };
            }
            return { statusCode: 200, body: JSON.stringify({ accessToken: data.access_token }) };
        } catch (error) {
            return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
        }

    // --- SEARCH TRACKS ACTION ---
    } else if (action === 'search-tracks') {
        if (!accessToken || !query) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Access token and query required' }) };
        }
        const searchResult = await spotifyFetch(
            `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=1&market=US`,
            { method: 'GET' },
            accessToken
        );
        
        if (searchResult.status !== 200) {
            // Propagate the status code and error message from the spotifyFetch helper
            return { statusCode: searchResult.status, body: JSON.stringify(searchResult.body) };
        }
        
        const tracks = searchResult.body.tracks.items.map(track => ({
            id: track.id, name: track.name, artist: track.artists[0].name, uri: track.uri, popularity: track.popularity || 0
        }));
        return { statusCode: 200, body: JSON.stringify({ tracks }) };

    // --- CREATE PLAYLIST ACTION ---
    } else if (action === 'create-playlist') {
        if (!accessToken || !playlistName || !trackUris) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Missing required parameters.' }) };
        }

        // 1. Create playlist
        const createResult = await spotifyFetch(`https://api.spotify.com/v1/me/playlists`, 
            { method: 'POST', body: JSON.stringify({ name: playlistName, description: description, public: true }) },
            accessToken
        );
        if (createResult.status !== 200 && createResult.status !== 201) {
            return { statusCode: createResult.status, body: JSON.stringify(createResult.body) };
        }
        const playlist = createResult.body;

        // 2. Add tracks to playlist
        const batchSize = 100;
        for (let i = 0; i < trackUris.length; i += batchSize) {
            const batch = trackUris.slice(i, i + batchSize);
            const addResult = await spotifyFetch(`https://api.spotify.com/v1/playlists/${playlist.id}/tracks`, 
                { method: 'POST', body: JSON.stringify({ uris: batch }) },
                accessToken
            );
            if (addResult.status !== 201) {
                return { statusCode: addResult.status, body: JSON.stringify({ error: 'Failed to add tracks' }) };
            }
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ success: true, playlist: { id: playlist.id, name: playlist.name, url: playlist.external_urls.spotify, tracks: trackUris.length } })
        };
    }

    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid action parameter.' }) };
};