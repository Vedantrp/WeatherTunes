import fetch from 'node-fetch';

// Load keys from Netlify Environment Variables
const WEATHER_API_KEY = process.env.WEATHER_API_KEY;

// Weather to Mood Mapping (Copied from previous server.js)
const weatherMoodMap = {
    'sunny': { mood: 'upbeat', genres: ['Pop', 'Electronic', 'Indie Pop', 'Dance'] },
    'clear': { mood: 'upbeat', genres: ['Pop', 'Electronic', 'Indie Pop', 'Dance'] },
    'rainy': { mood: 'cozy', genres: ['Lo-Fi', 'Jazz', 'Indie Folk', 'Acoustic'] },
    'drizzle': { mood: 'cozy', genres: ['Lo-Fi', 'Jazz', 'Indie Folk', 'Acoustic'] },
    'cloudy': { mood: 'relaxed', genres: ['Ambient', 'Chillout', 'Indie', 'Singer-Songwriter'] },
    'partly-cloudy': { mood: 'balanced', genres: ['Indie Pop', 'Alternative', 'Folk Pop', 'Soft Rock'] },
    'snow': { mood: 'calm', genres: ['Classical', 'Ambient', 'Cinematic', 'Piano'] },
    'fog': { mood: 'mysterious', genres: ['Ambient', 'Post-Rock', 'Experimental', 'Electronic'] },
    'windy': { mood: 'energetic', genres: ['Rock', 'Alternative Rock', 'Indie Rock', 'Garage Rock'] },
    'storm': { mood: 'intense', genres: ['Rock', 'Metal', 'Electronic', 'Industrial'] },
    'hot': { mood: 'tropical', genres: ['Reggae', 'Tropical House', 'Latin', 'Samba'] },
    'cold': { mood: 'warm', genres: ['Indie Folk', 'Singer-Songwriter', 'Acoustic', 'Coffee House'] }
};

function getWeatherMood(condition, temp) {
    const conditionLower = condition.toLowerCase();
    
    if (temp >= 30) return weatherMoodMap['hot'];
    if (temp <= 5) return weatherMoodMap['cold'];
    
    if (conditionLower.includes('sunny') || conditionLower.includes('clear')) return weatherMoodMap['sunny'];
    if (conditionLower.includes('rain') || conditionLower.includes('shower')) return conditionLower.includes('storm') ? weatherMoodMap['storm'] : weatherMoodMap['rainy'];
    if (conditionLower.includes('drizzle')) return weatherMoodMap['drizzle'];
    if (conditionLower.includes('snow')) return weatherMoodMap['snow'];
    if (conditionLower.includes('fog') || conditionLower.includes('mist')) return weatherMoodMap['fog'];
    if (conditionLower.includes('partly cloudy') || conditionLower.includes('partly-cloudy')) return weatherMoodMap['partly-cloudy'];
    if (conditionLower.includes('cloud')) return weatherMoodMap['cloudy'];
    if (conditionLower.includes('wind')) return weatherMoodMap['windy'];
    
    return weatherMoodMap['partly-cloudy'];
}

export const handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    try {
        const { location, language } = JSON.parse(event.body);

        if (!location) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Location is required' }) };
        }

        // 1. Get weather data
        const weatherResponse = await fetch(
            `http://api.weatherapi.com/v1/current.json?key=${WEATHER_API_KEY}&q=${encodeURIComponent(location)}&aqi=no`
        );

        if (!weatherResponse.ok) {
            return { statusCode: 500, body: JSON.stringify({ error: 'Weather data not found. Please check the location name.' }) };
        }

        const weatherData = await weatherResponse.json();
        const condition = weatherData.current.condition.text;
        const temp = weatherData.current.temp_c;

        // 2. Get mood based on weather
        const moodData = getWeatherMood(condition, temp);
        const condLower = condition.toLowerCase();

        // 3. Custom suggestions (Hindi example)
        let customSearch = null;
        if (language && language.toLowerCase().includes('hindi')) {
            if (condLower.includes('sunny') || condLower.includes('clear')) {
                customSearch = 'Upbeat Hindi playlist';
            } else if (condLower.includes('rain') || condLower.includes('cloud')) {
                customSearch = 'Hindi Lofi playlist';
            }
        }

        return {
            statusCode: 200,
            body: JSON.stringify({
                weather: {
                    location: weatherData.location.name,
                    country: weatherData.location.country,
                    condition: condition,
                    temperature: Math.round(temp),
                    feelsLike: Math.round(weatherData.current.feelslike_c),
                    humidity: weatherData.current.humidity,
                    windSpeed: weatherData.current.wind_kph,
                    icon: `https:${weatherData.current.condition.icon}`,
                    localtime: weatherData.location.localtime,
                },
                mood: {
                    type: moodData.mood,
                    genres: moodData.genres,
                    suggestion: customSearch 
                        ? `Custom ${language} vibes!` 
                        : `Perfect for ${moodData.mood} weather!`,
                },
                spotifySearchUrl: `https://open.spotify.com/search/${encodeURIComponent(customSearch || moodData.genres[0] + ' playlist ' + moodData.mood)}`,
            })
        };
    } catch (error) {
        console.error('Weather Playlist Function Error:', error);
        return { statusCode: 500, body: JSON.stringify({ error: error.message || 'Internal Server Error' }) };
    }
};