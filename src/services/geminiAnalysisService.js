/**
 * geminiAnalysisService.js
 *
 * Thin client over /api/analyze.
 *
 * The prompt used to live here, in the browser, and most of it was a plea for
 * the model to stop repeating itself -- necessary because a stateless call has
 * no idea what it said last week. That whole section is gone. The server now
 * retrieves the user's semantically nearest past entries, hands the model the
 * advice it has already given, and rejects paraphrases by cosine distance.
 * Prompt engineering was standing in for memory; this is the memory.
 */

import { identityHeaders } from './deviceIdentity';
import { classifyEntry } from './imposterClassifier';

const ANALYZE_URL = '/api/analyze';
const API_PROXY_URL = '/api/gemini';

const createFallbackAnalysis = () => ({
    overall_analysis: "Your journal entry is saved locally. AI insights are temporarily unavailable.",
    continuity_note: "",
    detected_emotions: [],
    imposter_syndrome_detected: false,
    imposter_confidence: 0,
    urgent_support_needed: false,
    key_insights: ["Your entry is safe on this device"],
    recommendations: ["Keep journaling to build your history", "Try again once the connection is back"]
});

/**
 * Analyze an entry against the user's history.
 *
 * @returns {Promise<{analysis: object, memory: object, entry: object|null}>}
 */
const analyzeJournalEntry = async (entryText, moodScore, audioAnalysis = null) => {
    // Runs the fine-tuned classifier in this tab, on this device. The journal
    // text is only sent to the server for the language generation step; the
    // imposter-syndrome classification itself never leaves the browser.
    const signals = await classifyEntry(entryText);

    try {
        const response = await fetch(ANALYZE_URL, {
            method: 'POST',
            headers: identityHeaders(),
            body: JSON.stringify({
                content: entryText,
                moodScore,
                audioAnalysis,
                signals
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
        }

        const result = await response.json();
        return {
            analysis: result.analysis,
            memory: result.memory || { enabled: false, retrievedCount: 0, relatedEntries: [] },
            entry: result.entry || null
        };
    } catch (error) {
        console.error('Analysis request failed:', error);

        const fallback = createFallbackAnalysis();
        // Even with the server unreachable, the local classifier still produced
        // a real prediction -- keep it rather than showing zeros.
        if (signals) {
            fallback.imposter_syndrome_detected = signals.detected;
            fallback.imposter_confidence = signals.confidence;
            fallback.imposter_labels = signals.labels;
            fallback.imposter_source = signals.source;
        }

        return {
            analysis: fallback,
            memory: { enabled: false, retrievedCount: 0, relatedEntries: [] },
            entry: null
        };
    }
};

const analyzeMoodWithAI = async (text) => {
    const systemPrompt = `You are an emotion detection AI. Based only on the provided text,
    identify the primary emotion or mood (e.g., "Calm", "Anxious", "Excited", "Reflective").
    Respond with only the single, most appropriate word or short phrase. Do not add any punctuation or extra explanation.`;

    try {
        const response = await fetch(API_PROXY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'mood',
                payload: { prompt: text, systemPrompt }
            })
        });

        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

        const result = await response.json();
        return result?.data?.text || result?.data || "Neutral";
    } catch (error) {
        console.warn("Mood analysis unavailable:", error.message);
        return "Neutral";
    }
};

export const geminiAnalysisService = {
    analyzeJournalEntry,
    analyzeMoodWithAI
};
