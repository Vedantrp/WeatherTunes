// WeatherTunes - Frontend Application

// Detect API base URL: For production, Vercel uses /api; Netlify uses /.netlify/functions
const getApiBaseUrl = () => {
    // Check if deployed to Netlify (common practice)
    if (window.location.host.includes('netlify.app') || window.location.host.includes('netlify.com')) {
        return '/.netlify/functions'; 
    }
    // Default for Vercel/Local Development
    return '/api';
};

const API_BASE_URL = getApiBaseUrl();

// State
let spotifyAccessToken = null;
let spotifyRefreshToken = null;
let currentUser = null;
let currentWeatherData = null;
let currentMoodData = null;
let currentLanguage = 'english';
let cachedAiSongs = null; // New global variable to store AI songs before creation

// DOM Elements
const locationInput = document.getElementById('locationInput');
const languageSelect = document.getElementById('languageSelect');
const activitySelect = document.getElementById('activitySelect'); // NEW
const discoveryDial = document.getElementById('discoveryDial');     // NEW
const discoveryLabel = document.getElementById('discoveryLabel');   // NEW
const searchBtn = document.getElementById('searchBtn');
const loading = document.getElementById('loading');
const weatherCard = document.getElementById('weatherCard');
const playlistCard = document.getElementById('playlistCard');
const error = document.getElementById('error');
const serverStatus = document.getElementById('serverStatus');
const serverHelpLink = document.getElementById('serverHelpLink');
const serverHelp = document.getElementById('serverHelp');

// Auth elements
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const authStatus = document.getElementById('authStatus');
const userInfo = document.getElementById('userInfo');
const userName = document.getElementById('userName');

// Weather data elements
const cityName = document.getElementById('cityName');
const dateTime = document.getElementById('dateTime');
const temperature = document.getElementById('temperature');
const weatherDescription = document.getElementById('weatherDescription');
const weatherIcon = document.getElementById('weatherIcon');
const feelsLike = document.getElementById('feelsLike');
const humidity = document.getElementById('humidity');
const windSpeed = document.getElementById('windSpeed');
const weatherStatusBar = document.getElementById('weatherStatusBar'); // NEW

// Playlist elements
const moodType = document.getElementById('moodType');
const playlistSuggestion = document.getElementById('playlistSuggestion');
const genreTags = document.getElementById('genreTags');
const createPlaylistBtn = document.getElementById('createPlaylistBtn');
const createPlaylistText = document.getElementById('createPlaylistText');
const openSpotifyBtn = document.getElementById('openSpotifyBtn');
const createdPlaylist = document.getElementById('createdPlaylist');
const playlistLink = document.getElementById('playlistLink');
const matchScore = document.getElementById('matchScore'); // NEW

// New DOM elements for AI song list (Must match index.html addition)
const aiPlaylistSection = document.getElementById('aiPlaylistSection');
const aiSongList = document.getElementById('aiSongList');


// Helper function to get emoji (maintains UI flair without complex mapping)
function getMoodEmoji(mood) {
    const emojiMap = {
        'upbeat': '☀️', 'cozy': '🌧️', 'relaxed': '☁️', 'balanced': '⛅',
        'calm': '❄️', 'mysterious': '🌫️', 'energetic': '💨', 'intense': '⛈️',
        'tropical': '🌡️', 'warm': '🧊', 'focus': '🧠', 'workout': '💪', 'party': '🎉',
        'sleep': '😴', 'commute': '🚗'
    };
    return emojiMap[mood.toLowerCase()] || '🎶';
}


// Format date and time
function formatDateTime(dateString) {
    const date = new Date(dateString);
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    return date.toLocaleDateString('en-US', options);
}

// Display weather information
function displayWeather(data) {
    const weather = data.current;
    const location = data.location;
    
    cityName.textContent = `${location.location}, ${location.country}`;
    dateTime.textContent = formatDateTime(location.localtime);
    temperature.textContent = Math.round(weather.temp_c);
    weatherDescription.textContent = weather.condition.text;
    
    weatherIcon.src = weather.condition.icon; 
    weatherIcon.alt = weather.condition.text;
    
    feelsLike.textContent = `${Math.round(weather.feelslike_c)}°C`;
    humidity.textContent = `${weather.humidity}%`;
    windSpeed.textContent = `${weather.wind_kph} km/h`;
    
    weatherCard.classList.remove('hidden');

    // NEW FEATURE: Update Weather Status Bar based on temperature
    if (weatherStatusBar) {
        const tempC = weather.temp_c;
        let color = '#1DB954'; // Default Green/Spotify color
        let width = 50;
        
        if (tempC >= 30) { color = '#FF4500'; width = 90; } // Hot (Orange-Red)
        else if (tempC >= 20) { color = '#FFA500'; width = 70; } // Warm (Orange)
        else if (tempC <= 5) { color = '#4682B4'; width = 30; } // Cold (Steel Blue)

        weatherStatusBar.style.width = `${width}%`;
        weatherStatusBar.style.backgroundColor = color;
    }
}

// =======================================================================================
// === CORE AUTH AND HELPER FUNCTIONS (Defined early to ensure hoisting works) ===========
// =======================================================================================

function updateAuthUI() {
    if (spotifyAccessToken && currentUser) {
        loginBtn.classList.add('hidden');
        userInfo.classList.remove('hidden');
        userName.textContent = `Logged in as ${currentUser.display_name || currentUser.id}`;
    } else {
        loginBtn.classList.remove('hidden');
        userInfo.classList.add('hidden');
    }
}

function logout() {
    spotifyAccessToken = null;
    spotifyRefreshToken = null;
    currentUser = null;
    
    localStorage.removeItem('spotifyAccessToken');
    localStorage.removeItem('spotifyRefreshToken');
    localStorage.removeItem('spotifyUser');
    
    updateAuthUI();
    createPlaylistBtn.disabled = true;
    createdPlaylist.classList.add('hidden');
    cachedAiSongs = null; // Clear cached songs on logout
}

// Restore auth from localStorage
function restoreAuth() {
    const token = localStorage.getItem('spotifyAccessToken');
    const refreshToken = localStorage.getItem('spotifyRefreshToken');
    const userStr = localStorage.getItem('spotifyUser');
    
    if (token && refreshToken && userStr) {
        spotifyAccessToken = token;
        spotifyRefreshToken = refreshToken;
        currentUser = JSON.parse(userStr);
        updateAuthUI();
    }
}


// Refresh access token if needed
async function refreshAccessToken() {
    if (!spotifyRefreshToken) return false;
    
    try {
        // --- UPDATED FOR NETLIFY FUNCTION ---
        const response = await fetch(`${API_BASE_URL}/spotify-actions?action=refresh-token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken: spotifyRefreshToken })
        });
        
        const data = await response.json();
        if (data.accessToken) {
            spotifyAccessToken = data.accessToken;
            localStorage.setItem('spotifyAccessToken', spotifyAccessToken);
            return true;
        }
    } catch (error) {
        console.error('Token refresh failed:', error);
    }
    
    return false;
}

// Check server status on load
async function checkServerStatus() {
    // NOTE: Simplified health check for Netlify deployment
    return true; 
}

// Show error message
function showError(message) {
    error.textContent = message;
    error.classList.remove('hidden');
    
    // Show server status if connection refused
    if (message.includes('Backend server') || message.includes('not running') || message.includes('ERR_CONNECTION_REFUSED')) {
        serverStatus.classList.remove('hidden');
    } else {
        serverStatus.classList.add('hidden');
    }
    
    setTimeout(() => {
        error.classList.add('hidden');
    }, 10000); // Show for 10 seconds
}

function hideError() {
    error.classList.add('hidden');
}

// Hide all cards
function hideAll() {
    weatherCard.classList.add('hidden');
    playlistCard.classList.add('hidden');
    error.classList.add('hidden');
}


// Function to display the AI Song List and enable the button
function displayAiSongsAndEnableCreation(songs) {
    // NOTE: aiPlaylistSection and aiSongList are defined globally at the top
    if (!aiPlaylistSection || !aiSongList) return; 
    
    cachedAiSongs = songs; // Cache the songs globally
    aiSongList.innerHTML = songs.map(song => 
        // Display songs in white text inside the black box
        `<li style="color: white;">${song.artist} — ${song.title}</li>`
    ).join('');

    // Ensure the main mood/genre text and tags are visible
    displayPlaylistSuggestion({mood: currentMoodData, spotifySearchUrl: `https://open.spotify.com/search/`});

    // CRITICAL FIX: Remove 'hidden' class to show the song list
    aiPlaylistSection.classList.remove('hidden');
    
    playlistCard.classList.remove('hidden');

    // NEW FEATURE: Calculate and display a simple match score
    if (matchScore) {
        // Simple score based on successful track retrieval rate
        const matchRate = (songs.length / 30) * 100;
        matchScore.textContent = `AI Match: ${Math.round(matchRate)}%`;
        matchScore.classList.remove('hidden');
    }
    
    // The button should only be disabled if not logged in
    if (spotifyAccessToken && currentUser) {
        createPlaylistBtn.disabled = false;
        createPlaylistText.textContent = 'Create Playlist';
    } else {
        createPlaylistBtn.disabled = true;
        createPlaylistText.textContent = 'Login to Create';
    }
    createdPlaylist.classList.add('hidden');
}


// Display playlist suggestion - now uses data from backend's combined response
function displayPlaylistSuggestion(combinedData) {
    const moodData = combinedData.mood;
    const spotifySearchUrl = combinedData.spotifySearchUrl;
    
    // Set global data from the backend
    currentMoodData = moodData; 
    
    // 1. Update the Card Content
    moodType.textContent = moodData.type;
    playlistSuggestion.textContent = `${getMoodEmoji(moodData.type)} ${moodData.suggestion}`;
    
    // Display selected language
    const selectedLanguage = languageSelect.options[languageSelect.selectedIndex].text;
    const selectedLanguageText = document.getElementById('selectedLanguageText');
    if (selectedLanguageText) {
        if (currentLanguage && currentLanguage !== 'english') {
            selectedLanguageText.textContent = `Language: ${selectedLanguage}`;
            selectedLanguageText.style.display = 'block';
        } else {
            selectedLanguageText.textContent = '';
            selectedLanguageText.style.display = 'none';
        }
    }
    
    // Display genre tags
    genreTags.innerHTML = '';
    moodData.genres.forEach(genre => {
        const tag = document.createElement('span');
        tag.className = 'genre-tag';
        tag.textContent = genre;
        genreTags.appendChild(tag);
    });
    
    // Set Spotify Search URL handler
    openSpotifyBtn.onclick = () => {
        // Correct placeholder URL: https://open.spotify.com/search/$ -> https://open.spotify.com/search/
        window.open(spotifySearchUrl.replace('https://open.spotify.com/search/$', 'https://open.spotify.com/search/'), '_blank');
    };
    
    // 2. Manage UI Visibility
    
    // Hide the AI song list section when showing the default genre suggestion
    const aiSection = document.getElementById('aiPlaylistSection');
    if (aiSection) aiSection.classList.add('hidden');
    if (matchScore) matchScore.classList.add('hidden'); 

    // Enable/disable create playlist button based on auth
    if (spotifyAccessToken && currentUser) {
        createPlaylistBtn.disabled = false;
        createPlaylistText.textContent = 'Create Playlist';
    } else {
        createPlaylistBtn.disabled = true;
        createPlaylistText.textContent = 'Login to Create'; // Guide the user
    }
    
    createdPlaylist.classList.add('hidden');
    
    // CRITICAL: Make the playlist card visible
    playlistCard.classList.remove('hidden'); 
}

// Generate AI playlist suggestions
async function generateAIPlaylist() {
    try {
        const weather = currentWeatherData.current.condition.text;
        const mood = currentMoodData.type;
        const genres = currentMoodData.genres;
        const language = languageSelect.options[languageSelect.selectedIndex].text;
        
        // NEW FEATURE: Get Activity and Discovery input
        const activity = activitySelect.value; 
        const discoveryValue = discoveryDial.value;

        // --- UPDATED FOR NETLIFY FUNCTION ---
        const response = await fetch(`${API_BASE_URL}/ai-playlist`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                weather: weather,
                mood: mood,
                genres: genres,
                language: language,
                activity: activity,
                discovery: discoveryValue
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            // Check for explicit session expired error from the server
            if (errorData.error && errorData.error.includes('Session expired')) {
                throw new Error(errorData.error);
            }
            // If API key is missing, fail silently and let the app fall back to standard search
            if (errorData.error.includes('Gemini API key not configured')) {
                return null;
            }
            throw new Error(errorData.error || 'Failed to generate AI playlist');
        }

        const data = await response.json();
        return data.songs; // Returns array of {artist, title}
    } catch (error) {
        console.error('AI playlist error:', error);
        // CRITICAL: Re-throw Session expired errors to be caught in handleSearch
        if (error.message.includes('Session expired')) {
             throw error;
        }
        return null; // Return null if AI fails, fall back to regular search
    }
}

// Create playlist function with AI enhancement (using parallel search)
async function createPlaylist(preFetchedAiSongs = null) {
    
    if (!spotifyAccessToken || !currentUser || !currentWeatherData || !currentMoodData) {
        showError('Please login with Spotify first');
        return;
    }
    
    // *** CRITICAL CHANGE: Use cached songs if available ***
    const songsToProcess = preFetchedAiSongs || cachedAiSongs;

    if (!songsToProcess || songsToProcess.length === 0) {
        // If the button was clicked manually without a pre-fetched list
        showError('No AI song list found. Please search for a location first.');
        createPlaylistBtn.disabled = false;
        createPlaylistText.textContent = 'Create Playlist';
        return;
    }
    
    createPlaylistBtn.disabled = true;
    createPlaylistText.textContent = 'Curating songs...';
    hideError();
    
    // Define language map and term here for scope
    const languageMap = {
        'english': '',
        'hindi': 'hindi',
        'spanish': 'spanish',
        'french': 'french',
        'japanese': 'japanese',
        'korean': 'korean',
        'portuguese': 'portuguese',
        'german': 'german',
        'italian': 'italian',
        'chinese': 'chinese',
        'tamil': 'tamil',
        'telugu': 'telugu',
        'punjabi': 'punjabi'
    };
    
    const languageTerm = languageMap[currentLanguage] || '';
    let allTracks = [];

    try {
        
        // 2. Search for AI-suggested songs (PARALLEL PROCESSING)
        if (songsToProcess.length > 0) {
            createPlaylistText.textContent = 'Finding AI-curated songs (fast-tracking search)...';
            
            // Create an array of promises for concurrent search requests
            const searchPromises = songsToProcess.slice(0, 30).map(song => {
                const searchQuery = `${song.artist} ${song.title} ${languageTerm}`; 
                
                // --- UPDATED FOR NETLIFY FUNCTION ---
                return fetch(`${API_BASE_URL}/spotify-actions?action=search-tracks`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        accessToken: spotifyAccessToken,
                        query: searchQuery,
                        limit: 1 // Get best match for each song
                    })
                })
                .then(async response => {
                    if (response.status === 401) {
                         // Flag unauthorized error to be handled globally after Promise.all
                         throw new Error('401_UNAUTHORIZED'); 
                    }
                    if (response.status === 500) {
                        const errorBody = await response.json();
                         // CRITICAL: Propagate the 'Session expired' error from the backend
                        if (errorBody.error && errorBody.error.includes('The access token expired')) {
                            throw new Error('Session expired. Please log out and log in again.');
                        }
                        // Handle generic server error
                        throw new Error(`Server error during search: ${errorBody.error || 'Unknown'}`);
                    }
                    if (response.ok) {
                        const searchData = await response.json();
                        // Return the first track found, or null if none
                        return searchData.tracks && searchData.tracks.length > 0 ? searchData.tracks[0] : null;
                    }
                    return null;
                })
                .catch(err => {
                    if (err.message.includes('Session expired') || err.message === '401_UNAUTHORIZED') {
                        throw err; 
                    }
                    console.error('Parallel search failed:', err);
                    return null;
                });
            });

            // Wait for all search promises to resolve
            try {
                const results = await Promise.all(searchPromises);
                allTracks = results.filter(track => track !== null);
            } catch (error) {
                // Check if any error was a critical token failure
                if (error.message.includes('Session expired') || error.message.includes('401_UNAUTHORIZED')) {
                    // Attempt token refresh
                    const refreshed = await refreshAccessToken();
                    if (!refreshed) {
                        throw new Error('Session expired. Please log out and log in again.');
                    }
                    // Token refreshed, but since we can't easily retry the Promise.all,
                    // we rely on the supplementary search below.
                    createPlaylistText.textContent = 'Token refreshed, supplementing playlist...';
                } else {
                    throw error; // Re-throw other errors
                }
            }
        }
        
        // 3. If we still need tracks, supplement with genre searches
        const tracksNeeded = 30 - allTracks.length;
        
        if (tracksNeeded > 0) {
            // Build search queries - focus on actual songs, hits, and popular tracks
            createPlaylistText.textContent = 'Filling remaining slots with genre search...';
            
            const searchQueries = [];
            
            // Helper function to build song-focused queries
            const buildSongQueries = (genre, mood, lang = '') => {
                const queries = [];
                const langTerm = lang ? `${lang} ` : '';
                
                // Focus on actual songs and popular tracks
                queries.push(`${langTerm}${genre} ${mood} song`);
                queries.push(`${langTerm}${genre} ${mood} hit`);
                queries.push(`${langTerm}${genre} ${mood} popular`);
                
                return queries;
            };
            
            // Add initial genre searches
            currentMoodData.genres.slice(0, 3).forEach(genre => {
                searchQueries.push(...buildSongQueries(genre, currentMoodData.type, languageTerm));
            });
            
            // Add general popular mood songs if language is not set (i.e. English/mixed)
            if (!languageTerm) {
                searchQueries.push(`${currentMoodData.type} songs`);
            } else {
                searchQueries.push(`popular ${languageTerm} ${currentMoodData.type}`);
            }
            
            // Search for additional tracks
            createPlaylistText.textContent = 'Finding more great songs...';
            // Only use a few queries to fill the gap
            for (const query of searchQueries.slice(0, Math.ceil(tracksNeeded / 5))) {
            try {
                // --- UPDATED FOR NETLIFY FUNCTION ---
                const searchResponse = await fetch(`${API_BASE_URL}/spotify-actions?action=search-tracks`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        accessToken: spotifyAccessToken,
                        query: query,
                        limit: Math.min(20, tracksNeeded) // Limit based on what we need
                    })
                });
                
                if (searchResponse.ok) {
                    const searchData = await response.json();
                    allTracks.push(...searchData.tracks);
                } else if (searchResponse.status === 401) {
                    // Token expired, try to refresh
                    const refreshed = await refreshAccessToken();
                    if (refreshed) {
                        // Retry the search
                        const retryResponse = await fetch(`${API_BASE_URL}/spotify-actions?action=search-tracks`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                accessToken: spotifyAccessToken,
                                query: query,
                                limit: Math.min(20, tracksNeeded)
                            })
                        });
                        
                        if (retryResponse.ok) {
                            const retryData = await retryResponse.json();
                            allTracks.push(...retryData.tracks);
                        }
                    } else {
                        // If refresh fails, log out and inform user
                        throw new Error('Session expired. Please log out and log in again.');
                    }
                } else if (searchResponse.status === 500) {
                     const errorBody = await searchResponse.json();
                    if (errorBody.error && errorBody.error.includes('The access token expired')) {
                         throw new Error('Session expired. Please log out and log in again.');
                    }
                }
            } catch (err) {
                console.error('Search error:', err);
            }
            }
        }
        
        if (allTracks.length === 0) {
            throw new Error('No tracks found. Please try again.');
        }
        
        // 4. Filter and Finalize Playlist
        // Remove duplicates and prepare final list
        const uniqueTracks = Array.from(
            new Map(allTracks.map(track => [track.uri, track])).values()
        );
        
        // Prioritize tracks by popularity (higher is better)
        uniqueTracks.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
        
        // Mix: 70% popular tracks (>20 pop), 30% variety (<=20 pop)
        let finalTracks = [];
        const popularTracks = uniqueTracks.filter(t => (t.popularity || 0) > 20);
        const otherTracks = uniqueTracks.filter(t => (t.popularity || 0) <= 20);
        
        const popularCount = Math.min(Math.floor(30 * 0.7), popularTracks.length);
        const varietyCount = Math.min(30 - popularCount, otherTracks.length);
        
        finalTracks = [
            ...popularTracks.slice(0, popularCount),
            ...otherTracks.slice(0, varietyCount)
        ];
        
        // If still under 30, fill the rest from the top of the unique list
        if (finalTracks.length < 30) {
            const remaining = uniqueTracks.filter(t => 
                !finalTracks.some(ft => ft.uri === t.uri)
            );
            finalTracks.push(...remaining.slice(0, 30 - finalTracks.length));
        }
        
        // Final limit to 30 tracks
        const finalLimitedTracks = finalTracks.slice(0, 30);
        const trackUris = finalLimitedTracks.map(track => track.uri);
        
        if (trackUris.length === 0) {
            throw new Error(`No ${languageTerm ? languageTerm : 'English'} tracks found. Please try a different language or search again.`);
        }
        
        // 5. Create playlist with language info
        createPlaylistText.textContent = `Creating playlist with ${trackUris.length} songs...`;
        const locationName = currentWeatherData.location.name;
        const condition = currentWeatherData.current.condition.text;
        const languageName = languageSelect.options[languageSelect.selectedIndex].text;
        const playlistName = `WeatherTunes: ${condition} in ${locationName} (${languageName})`;
        const description = `${getMoodEmoji(currentMoodData.type)} ${currentMoodData.suggestion} | ${languageName} playlist | Created by WeatherTunes`;
        
        // --- UPDATED FOR NETLIFY FUNCTION ---
        let createResponse = await fetch(`${API_BASE_URL}/spotify-actions?action=create-playlist`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                accessToken: spotifyAccessToken,
                playlistName: playlistName,
                description: description,
                trackUris: trackUris
            })
        });
        
        if (createResponse.status === 401) {
            // Token expired during creation, try to refresh
            const refreshed = await refreshAccessToken();
            if (refreshed) {
                // Retry creation with new token
                createResponse = await fetch(`${API_BASE_URL}/spotify-actions?action=create-playlist`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        accessToken: spotifyAccessToken,
                        playlistName: playlistName,
                        description: description,
                        trackUris: trackUris
                    })
                });
            } else {
                // If creation refresh fails, log out and inform user
                throw new Error('Session expired. Please log out and log in again.');
            }
        }
        
        if (!createResponse.ok) {
            const errorData = await createResponse.json();
            throw new Error(errorData.error || 'Failed to create playlist');
        }
        
        const playlistData = await createResponse.json();
        displayCreatedPlaylist(playlistData.playlist);
        } catch (error) {
            // Handle explicit logout on session expiration
            if (error.message.includes('Session expired')) {
                showError(error.message);
                logout();
            } else {
                showError(error.message);
            }
            createPlaylistBtn.disabled = false;
            createPlaylistText.textContent = 'Create Playlist';
        }
}

function displayCreatedPlaylist(playlist) {
    playlistLink.href = playlist.url;
    playlistLink.textContent = `Open "${playlist.name}" on Spotify →`;
    createdPlaylist.classList.remove('hidden');
    createPlaylistText.textContent = 'Create Playlist';
    createPlaylistBtn.disabled = true; // Disable after creation to prevent duplicates
}

function hideError() {
    error.classList.add('hidden');
}


// Handle search (REFACTORED to use backend's combined API)
async function handleSearch() {
    const location = locationInput.value.trim();
    currentLanguage = languageSelect.value || 'english';
    
    if (!location) {
        showError('Please enter a location');
        return;
    }
    
    hideAll();
    loading.classList.remove('hidden');
    
    // Check if the temporary AI list section exists and hide it
    const aiSection = document.getElementById('aiPlaylistSection');
    if (aiSection) aiSection.classList.add('hidden');

    try {
        // --- UPDATED FOR NETLIFY FUNCTION ---
        const response = await fetch(`${API_BASE_URL}/weather-playlist`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                location: location,
                language: currentLanguage // Pass language to the backend
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch combined weather and playlist data.');
        }
        
        const data = await response.json();
        
        // Adapt the backend's data structure to fit existing display functions
        currentWeatherData = {
            current: { 
                condition: { 
                    text: data.weather.condition, 
                    icon: data.weather.icon
                }, 
                temp_c: data.weather.temperature, 
                feelslike_c: data.weather.feelsLike,
                humidity: data.weather.humidity,
                wind_kph: data.weather.windSpeed
            },
            location: data.weather
        };
        currentMoodData = data.mood;
        
        // 1. Display the Weather Card (This part works)
        displayWeather(currentWeatherData);
        
        // --- AI-powered playlist integration (DISPLAY SONGS BEFORE CREATION) ---
        let aiSongs = null;
        try {
            playlistCard.classList.add('hidden'); 
            playlistSuggestion.textContent = 'Curating song ideas with Gemini...';
            
            aiSongs = await generateAIPlaylist();
            
            // IF AI SONGS FOUND, CACHE THEM AND DISPLAY THE LIST
            if (aiSongs && aiSongs.length > 0) {
                // Display Mood Text and Genres
                displayPlaylistSuggestion(data); 
                
                // CRITICAL: Display the list of songs and enable the button
                displayAiSongsAndEnableCreation(aiSongs);
                
                return; // Exit here if AI path was successful or partially handled
            }
        } catch (err) {
            // Check for critical session errors that originate from the server crash
            if (err.message.includes('Session expired')) {
                showError(err.message);
                logout();
                return;
            }
            console.warn('AI playlist generation failed (falling back to standard):', err);
        }
        
        // 2. Final Fallback: If AI failed OR no AI key is present, run the genre fallback
        displayPlaylistSuggestion(data);
        
    } catch (err) {
        // If the error is 'Failed to fetch', assume server is down
        if (err.message.includes('Failed to fetch') || err.message.includes('ERR_CONNECTION_REFUSED')) {
            showError('❌ Backend server/Netlify Functions failed to connect. Please ensure your deployment is live.');
        } else {
            showError(`Error: ${err.message}`);
        }
    } finally {
        loading.classList.add('hidden');
    }
}

// Spotify Authentication Functions
async function loginWithSpotify() {
    try {
        // Check if backend server is accessible first
        try {
            // Health check is omitted for serverless, rely on auth flow
        } catch (err) {
            // Fall through
        }
        
        // --- UPDATED FOR NETLIFY FUNCTION ---
        const response = await fetch('/api/login'); // Assuming a Netlify/Vercel rewrite rule handles this
        
        if (!response.ok) {
             throw new Error("Could not initiate login. Ensure the /api/login endpoint is configured.");
        }
        
        const data = await response.json();
        
        // Open Spotify auth in popup
        const width = 500;
        const height = 700;
        const left = (window.innerWidth - width) / 2;
        const top = (window.innerHeight - height) / 2;
        
        const popup = window.open(
            data.authUrl,
            'Spotify Login',
            `width=${width},height=${height},left=${left},top=${top}`
        );
        
        // Listen for auth success
        const messageListener = (event) => {
            if (event.data.type === 'SPOTIFY_AUTH_SUCCESS') {
                spotifyAccessToken = event.data.token;
                spotifyRefreshToken = event.data.refreshToken;
                currentUser = event.data.user;
                
                // Save to localStorage
                localStorage.setItem('spotifyAccessToken', spotifyAccessToken);
                localStorage.setItem('spotifyRefreshToken', spotifyRefreshToken);
                localStorage.setItem('spotifyUser', JSON.stringify(currentUser));
                
                updateAuthUI();
                popup.close();
                window.removeEventListener('message', messageListener);

                if (currentWeatherData && currentMoodData) {
                    createPlaylistBtn.disabled = false;
                    // If weather data is present after login, re-run search to trigger AI creation
                    handleSearch(); 
                }
            } else if (event.data.error) {
                showError('Spotify authentication failed: ' + event.data.error);
                popup.close();
                window.removeEventListener('message', messageListener);
            }
        };
        
        window.addEventListener('message', messageListener);
        
    } catch (error) {
        showError('Failed to initiate Spotify login: ' + error.message);
    }
}
