import fetch from 'node-fetch';

// Load keys from Netlify Environment Variables
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export const handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    if (!GEMINI_API_KEY) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Gemini API key not configured.' }) };
    }

    try {
        const { weather, mood, genres, language } = JSON.parse(event.body);
        
        const systemInstruction = 'You are an expert music curator specializing in creating perfect, highly-structured JSON playlists.';

        // --- ENHANCED PROMPT ---
        const prompt = `You are a world-class Spotify music curator specializing in **${language} ${mood}** music. Your task is to generate a highly personalized playlist.

**CONTEXT:**
- **Current Weather:** ${weather}
- **Target Mood:** ${mood} 
- **Primary Genres:** ${genres.join(', ')}

**STRICT INSTRUCTIONS:**
1. **Quantity:** List EXACTLY 30 popular, streamable tracks.
2. **Language Constraint:** All 30 songs MUST be **100% in the ${language} language**. (For languages like Hindi, this means focusing on Bollywood, Indian Pop, or regional hits).
3. **Vibe Match:** The songs must perfectly match the **${mood}** mood and the **${weather}** context.
4. **Constraint Check:** Only suggest artists and songs that are highly likely to be available in the global Spotify catalog, such as established artists within that specific language scene (e.g., if Hindi: Arijit Singh, Shreya Ghoshal, Pritam, etc.).

Generate a JSON array of objects following the provided schema.`;

        // JSON Schema for structured output
        const responseSchema = {
            type: 'array',
            description: 'A list of 30 song recommendations.',
            items: {
                type: 'object',
                required: ['artist', 'title'],
                properties: {
                    artist: { type: 'string', description: 'The name of the song artist.' },
                    title: { type: 'string', description: 'The title of the song.' }
                }
            }
        };

        const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                systemInstruction: { parts: [{ text: systemInstruction }] },
                generationConfig: {
                    responseMimeType: 'application/json',
                    responseSchema: responseSchema,
                    temperature: 0.8
                }
            })
        });

        if (!geminiResponse.ok) {
            const errorData = await geminiResponse.json();
            console.error('Gemini API Error Response:', errorData);
            return { statusCode: 500, body: JSON.stringify({ error: errorData.error?.message || 'Failed to generate AI playlist from Gemini API.' }) };
        }

        const data = await geminiResponse.json();
        const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!aiText) {
             return { statusCode: 500, body: JSON.stringify({ error: "Gemini returned no content or an empty response." }) };
        }

        let songs = [];
        try {
            const jsonSongs = JSON.parse(aiText); 
            if (Array.isArray(jsonSongs)) {
                songs = jsonSongs.slice(0, 30).map(item => ({ artist: item.artist, title: item.title }));
            }
        } catch (parseError) {
            return { statusCode: 500, body: JSON.stringify({ error: 'AI output was malformed. Failed to parse JSON.' }) };
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ success: true, songs: songs })
        };

    } catch (error) {
        console.error('AI Playlist Function Error:', error);
        return { statusCode: 500, body: JSON.stringify({ error: error.message || 'Internal Server Error' }) };
    }
};