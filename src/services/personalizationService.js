// src/services/personalizationService.js

const apiKey = process.env.REACT_APP_GEMINI_API_KEY;

if (!apiKey) {
  console.error("Gemini API Key is missing for personalization service.");
}

const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const MODEL_NAME = "gemini-2.5-flash-preview-09-2025";
const API_URL = `${BASE_URL}/${MODEL_NAME}:generateContent?key=${apiKey}`;

const _callGeminiApi = async (prompt, responseSchema) => {
  const payload = {
    contents: [
      {
        parts: [{ text: prompt }]
      }
    ],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: responseSchema
    }
  };

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const result = await response.json();
    const candidate = result.candidates?.[0];

    if (candidate && candidate.content?.parts?.[0]?.text) {
      return JSON.parse(candidate.content.parts[0].text);
    } else {
      throw new Error("Invalid response from Gemini API.");
    }
  } catch (error) {
    console.error("Gemini API call failed:", error);
    throw error;
  }
};

export const personalizationService = {
  // Extract preferences from journal entries with deep psychological analysis
  async extractPreferences(entries) {
    if (!entries || entries.length === 0) return null;

    const allContent = entries
      .slice(0, 20)
      .map(e => e.content)
      .join('\n\n---\n\n');

    const prompt = `You are a deeply empathetic psychologist and motivational coach. Analyze these journal entries to understand this person on a deep level.

Extract and infer:
1. EXPLICIT interests (TV shows, hobbies, activities they mention by name)
2. IMPLICIT themes (what they struggle with, what they fear, what they dream about)
3. EMOTIONAL patterns (recurring feelings, anxieties, hopes)
4. VALUES and what matters to them
5. STRENGTHS they demonstrate (even if they don't see them)
6. CHALLENGES they face
7. GOALS and aspirations (stated or implied)
8. METAPHORS or analogies that would resonate with them based on their language

BE CREATIVE and INSIGHTFUL. If they mention "fear of losing", capture that. If they talk about relationships, work stress, creative blocks - note ALL of it. This will be used to create deeply personalized motivation.

Journal entries:
${allContent.slice(0, 4000)}

Extract comprehensive insights about this person.`;

    const schema = {
      type: "object",
      properties: {
        tv_shows: {
          type: "array",
          items: { type: "string" },
          description: "Any shows/movies they mentioned"
        },
        hobbies: {
          type: "array",
          items: { type: "string" },
          description: "Activities they do or want to do"
        },
        goals: {
          type: "array",
          items: { type: "string" },
          description: "Specific goals OR inferred aspirations"
        },
        interests: {
          type: "array",
          items: { type: "string" },
          description: "Topics they care about"
        },
        favorite_things: {
          type: "array",
          items: { type: "string" },
          description: "Things that bring them joy"
        },
        characters_or_people: {
          type: "array",
          items: { type: "string" },
          description: "People/characters they mention or admire"
        },
        fears: {
          type: "array",
          items: { type: "string" },
          description: "What they're afraid of - be specific"
        },
        struggles: {
          type: "array",
          items: { type: "string" },
          description: "Recurring challenges they face"
        },
        strengths: {
          type: "array",
          items: { type: "string" },
          description: "Qualities they demonstrate"
        },
        emotional_themes: {
          type: "array",
          items: { type: "string" },
          description: "Recurring emotional patterns"
        },
        values: {
          type: "array",
          items: { type: "string" },
          description: "What matters most to them"
        },
        dream_life: {
          type: "array",
          items: { type: "string" },
          description: "What their ideal life looks like"
        },
        personality_traits: {
          type: "array",
          items: { type: "string" },
          description: "Their communication style, energy level, etc"
        }
      },
      required: [
        "tv_shows", "hobbies", "goals", "interests", "favorite_things",
        "characters_or_people", "fears", "struggles", "strengths",
        "emotional_themes", "values", "dream_life", "personality_traits"
      ]
    };

    try {
      const preferences = await _callGeminiApi(prompt, schema);
      console.log("📊 Extracted Preferences:", preferences);
      return preferences;
    } catch (error) {
      console.error("Error extracting preferences:", error);
      return null;
    }
  },

  // Generate multiple personalized messages at once
  async generateMultipleMessages(preferences, contexts = ["starting_task", "overcoming_resistance", "building_momentum"]) {
    if (!preferences) return [];

    const preferencesText = JSON.stringify(preferences, null, 2);

    const prompt = `You are creating ${contexts.length} DEEPLY PERSONALIZED anti-procrastination messages for someone you know well.

Their profile:
${preferencesText}

Create ${contexts.length} different messages for these contexts: ${contexts.join(", ")}

Each message should:
1. Speak directly to THEIR specific situation
2. Reference their actual fears, struggles, interests, or goals
3. Use metaphors from THEIR life
4. Feel genuinely personal and specific
5. Address different angles of procrastination

MAKE EACH MESSAGE UNIQUE and reference DIFFERENT aspects of their profile.

Examples of what to do:
- If they fear losing relationships → "The people you love aren't going anywhere because you took 30 minutes for yourself. Start now."
- If they love running → "You know that feeling when you hit mile 3 and everything clicks? This task is mile 1. Just start moving."
- If they mention imposter syndrome → "That voice saying you're not ready? It's been wrong before. Prove it wrong again."
- If they watch detective shows → "Detective work isn't about having all the answers first. It's about following the next clue. What's your next clue?"
- If they struggle with perfectionism → "You've been waiting for the perfect moment. This IS the moment. Messy progress beats perfect paralysis."
- If they value family → "The best gift you can give your family is a YOU who's moving forward. Start now."

BE SPECIFIC. BE BOLD. BE REAL. Reference actual things from their profile.

Create ${contexts.length} unique messages.`;

    const schema = {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "A punchy, personal title that references their life (5-8 words)"
          },
          message: {
            type: "string",
            description: "2-3 sentences that speak to THEIR situation, fears, or dreams. Reference specific things from their profile."
          },
          connection: {
            type: "string",
            description: "One sentence explaining why this matters to THEM specifically"
          }
        },
        required: ["title", "message", "connection"]
      }
    };

    try {
      const messages = await _callGeminiApi(prompt, schema);
      console.log("💬 Generated Multiple Messages:", messages);
      return Array.isArray(messages) ? messages : [];
    } catch (error) {
      console.error("Error generating multiple messages:", error);
      return [];
    }
  }
};