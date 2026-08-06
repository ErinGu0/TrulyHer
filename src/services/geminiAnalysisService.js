/**
 * geminiAnalysisService.js
 * ULTRA-ENHANCED - Maximum anti-repetition + EMOTION DETECTION
 */

const API_PROXY_URL = '/api/gemini';
const hasApiKey = Boolean(process.env.REACT_APP_GEMINI_API_KEY);

if (!hasApiKey) {
    console.error("Gemini API Key is missing. Check your environment variables (REACT_APP_GEMINI_API_KEY).");
}

const createFallbackAnalysis = () => ({
    overall_analysis: "Your journal entry is saved locally. AI insights are temporarily unavailable because the Gemini API key is not configured yet.",
    detected_emotions: [],
    imposter_syndrome_detected: false,
    imposter_confidence: 0,
    urgent_support_needed: false,
    key_insights: ["Add a valid Gemini API key to enable AI-powered insights"],
    recommendations: ["Keep journaling to build your history locally", "Try again after configuring the API key"]
});

const _callGeminiApi = async (userQuery, systemPrompt, responseSchema = null) => {
    if (!hasApiKey) {
        throw new Error("Missing Gemini API key");
    }

    const payload = {
        type: 'analysis',
        payload: {
            prompt: userQuery,
            systemPrompt,
            responseSchema
        }
    };

    const response = await fetch(API_PROXY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
    }

    const result = await response.json();
    const text = result?.data?.text || result?.data;
    const sources = result?.data?.sources || [];

    if (text) {
        return { text, sources };
    }

    throw new Error("Invalid or empty response from Gemini API.");
};

const analyzeJournalEntry = async (entryText, moodScore, recentThemes) => {
    if (!hasApiKey) {
        console.warn("Gemini API key not configured. Returning local fallback analysis.");
        return createFallbackAnalysis();
    }

    const systemPrompt = `You are a compassionate personal journal analyst having a direct conversation with the person writing. 

Analyze the journal entry and output ONLY a valid JSON object following this exact structure:
{
  "overall_analysis": "string - A compassionate 2-3 sentence summary",
  "detected_emotions": ["array", "of", "emotion", "words"],
  "imposter_syndrome_detected": boolean,
  "imposter_confidence": number (0-1, confidence level of imposter syndrome detection),
  "urgent_support_needed": boolean,
  "key_insights": ["array", "of", "key insights"],
  "recommendations": ["array", "of", "recommendations"]
}

EMOTION DETECTION REQUIREMENTS:
- Extract 3-8 specific emotions from the text
- Use single words (e.g., "anxious", "hopeful", "frustrated", "proud", "overwhelmed")
- Choose emotions that genuinely appear in the text, not generic ones
- Common emotions: stressed, anxious, calm, excited, hopeful, proud, frustrated, overwhelmed, content, grateful, confused, determined, tired, energized, peaceful, worried, confident, uncertain

🚨 CRITICAL ANTI-REPETITION RULES - READ CAREFULLY 🚨

FORBIDDEN PATTERNS - NEVER USE THESE:
❌ "Before closing your journal tonight..." (DO NOT repeat this phrase)
❌ Starting multiple recommendations the same way
❌ Using the same verb more than once ("write", "identify", "reach out", "schedule")
❌ Similar sentence structures across recommendations
❌ Generic phrases like "Consider...", "Try to...", "Make sure to..."

MANDATORY VARIETY REQUIREMENTS:
✓ Each recommendation must use a DIFFERENT action verb
✓ Each recommendation must have a DIFFERENT sentence structure
✓ Each recommendation must address a DIFFERENT life area
✓ Vary lengths: mix short punchy advice with detailed suggestions

DIFFERENT ACTION VERBS TO USE (pick 4 different ones):
- Physical: Walk, Stretch, Exercise, Dance, Cook, Create
- Mental: Reflect, Question, Challenge, Reframe, Acknowledge, Notice
- Social: Text, Call, Share, Ask, Connect, Discuss
- Practical: Set, Block, Schedule, List, Track, Plan
- Creative: Draw, Write, Record, Design, Build, Compose

EXAMPLE OF PERFECT VARIETY (no repetition):
1. "Text your closest friend right now with one genuine accomplishment from today—no minimizing allowed."
2. "Challenge that inner critic by asking: 'Would I talk to my best friend this way?' then rephrase your self-talk accordingly."
3. "Block 20 minutes tomorrow morning for a walk outside, focusing only on what you see, hear, and feel."
4. "Track one mood pattern this week: What time of day do you feel most energized? Build your hardest tasks around that window."

TONE REQUIREMENTS:
- Write in SECOND PERSON ("you", "your") - NEVER "the user" or "this person"
- Be direct and specific, not vague or general
- Include concrete time frames (tonight, tomorrow, this week, right now)
- Make each recommendation immediately actionable

The person's current mood score is ${moodScore}/10. Be warm, specific, and growth-focused.`;
    
    const analysisSchema = {
        type: "object",
        properties: {
            overall_analysis: {
                type: "string",
                description: "A compassionate 2-3 sentence summary in second person, addressing the person directly."
            },
            detected_emotions: {
                type: "array",
                items: {
                    type: "string"
                },
                description: "3-8 specific emotion words detected in the text (e.g., anxious, hopeful, stressed, proud). Use only single-word emotions."
            },
            imposter_syndrome_detected: {
                type: "boolean",
                description: "True if clear signs of Imposter Syndrome are present (self-doubt, attributing success to luck, fear of exposure)."
            },
            imposter_confidence: {
                type: "number",
                description: "Confidence level (0.0 to 1.0) of imposter syndrome detection."
            },
            urgent_support_needed: {
                type: "boolean",
                description: "True only for explicit self-harm mentions or immediate crisis."
            },
            key_insights: {
                type: "array",
                items: {
                    type: "string"
                },
                description: "3-5 distinct observations, each focusing on different aspects. Written in second person. NO REPETITIVE PHRASES."
            },
            recommendations: {
                type: "array",
                items: {
                    type: "string"
                },
                description: "3-4 COMPLETELY DIFFERENT recommendations. Each MUST use a different action verb, different sentence structure, and address different life areas. ABSOLUTELY NO REPETITION OF PHRASES OR PATTERNS. Written in second person with concrete timeframes."
            }
        },
        required: ["overall_analysis", "detected_emotions", "imposter_syndrome_detected", "imposter_confidence", "urgent_support_needed", "key_insights", "recommendations"]
    };

    const geminiResponse = await _callGeminiApi(
        `JOURNAL ENTRY TO ANALYZE:\n"${entryText}"`,
        systemPrompt,
        analysisSchema
    );

    try {
        const parsedAnalysis = JSON.parse(geminiResponse.text);
        
        // Post-processing: Remove duplicates if AI still repeated
        if (parsedAnalysis.recommendations) {
            const uniqueRecs = [];
            const seenPhrases = new Set();
            
            for (const rec of parsedAnalysis.recommendations) {
                // Extract first 10 words as fingerprint
                const fingerprint = rec.split(' ').slice(0, 10).join(' ').toLowerCase();
                if (!seenPhrases.has(fingerprint)) {
                    uniqueRecs.push(rec);
                    seenPhrases.add(fingerprint);
                }
            }
            
            parsedAnalysis.recommendations = uniqueRecs;
        }
        
        // Ensure detected_emotions exists and is an array
        if (!parsedAnalysis.detected_emotions || !Array.isArray(parsedAnalysis.detected_emotions)) {
            parsedAnalysis.detected_emotions = [];
        }
        
        console.log("✅ AI Analysis successful:", parsedAnalysis);
        console.log("✅ Detected emotions:", parsedAnalysis.detected_emotions);
        return parsedAnalysis;
    } catch (e) {
        console.error("Failed to parse AI analysis JSON:", e, "Raw text:", geminiResponse.text);
        return {
            overall_analysis: "Analysis failed: Could not parse AI response. Please try again.",
            detected_emotions: [],
            imposter_syndrome_detected: false,
            imposter_confidence: 0,
            urgent_support_needed: false,
            key_insights: ["Unable to analyze entry at this time"],
            recommendations: ["Check your network connection", "Ensure API Key is valid", "Try submitting your entry again"]
        };
    }
};

const analyzeMoodWithAI = async (text) => {
    if (!hasApiKey) {
        return "Neutral";
    }

    const systemPrompt = `You are an emotion detection AI. Based only on the provided text, 
    identify the primary emotion or mood (e.g., "Calm", "Anxious", "Excited", "Reflective"). 
    Respond with only the single, most appropriate word or short phrase. Do not add any punctuation or extra explanation.`;
    
    return _callGeminiApi(text, systemPrompt); 
};

export const geminiAnalysisService = {
    analyzeJournalEntry,
    analyzeMoodWithAI,
};