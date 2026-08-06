import { lambdaService } from './lambdaService';

/**
 * geminiAnalysisService.js
 * ULTRA-ENHANCED - Maximum anti-repetition + EMOTION DETECTION + DynamoDB Storage
 */

// All Gemini calls happen server-side in Lambda (see lambda-function-complete.js) so the
// API key never reaches the browser bundle. This service just calls the authenticated
// API Gateway endpoint and post-processes the result.

const analyzeJournalEntry = async (entryText, moodScore) => {
    const response = await lambdaService.analyzeJournalEntry(entryText, moodScore);
    const parsedAnalysis = response.analysis;

    try {
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
        console.error("Failed to process AI analysis:", e, "Raw response:", response);
        return {
            overall_analysis: "Analysis failed: Could not parse AI response. Please try again.",
            detected_emotions: [],
            imposter_syndrome_detected: false,
            imposter_confidence: 0,
            urgent_support_needed: false,
            key_insights: ["Unable to analyze entry at this time"],
            recommendations: ["Check your network connection", "Try submitting your entry again"]
        };
    }
};

export const geminiAnalysisService = {
    analyzeJournalEntry,
};