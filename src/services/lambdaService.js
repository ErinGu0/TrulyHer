/**
 * lambdaService.js
 * Service for all AWS Lambda calls including Gemini AI analysis
 */

const API_GATEWAY_BASE_URL = process.env.REACT_APP_API_GATEWAY_URL;

// Get auth token for API calls
const getAuthToken = () => {
    const user = JSON.parse(localStorage.getItem('trulyher_user') || '{}');
    return user.accessToken;
};

// Call Gemini AI through Lambda
const analyzeJournalEntry = async (entryText, moodScore) => {
    if (!API_GATEWAY_BASE_URL) {
        throw new Error('API Gateway URL not configured');
    }

    try {
        const response = await fetch(`${API_GATEWAY_BASE_URL}/analyze-journal`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`
            },
            body: JSON.stringify({
                entryText,
                moodScore
            })
        });

        if (!response.ok) {
            throw new Error(`Analysis failed: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Failed to analyze journal entry:', error);
        throw error;
    }
};

// Store insights generation in DynamoDB
const storeInsightsGeneration = async (insightsData) => {
    if (!API_GATEWAY_BASE_URL) {
        console.warn('API Gateway URL not configured - insights not stored');
        return null;
    }

    try {
const response = await fetch(`${API_GATEWAY_BASE_URL}/analyze-journal`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`
            },
            body: JSON.stringify({
                userId: generateUserId(),
                timestamp: new Date().toISOString(),
                insights: insightsData,
                entryCount: insightsData.entryCount || 0
            })
        });

        if (!response.ok) {
            throw new Error(`Failed to store insights: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Failed to store insights:', error);
        return null;
    }
};

// Store imposter syndrome analysis in DynamoDB
const storeImpostorAnalysis = async (analysisData) => {
    if (!API_GATEWAY_BASE_URL) {
        console.warn('API Gateway URL not configured - analysis not stored');
        return null;
    }

    try {
const response = await fetch(`${API_GATEWAY_BASE_URL}/analyze-journal`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId: generateUserId(), // Simple user identification
                timestamp: new Date().toISOString(),
                journalEntry: analysisData.entryText,
                moodScore: analysisData.moodScore,
                imposterSyndromeDetected: analysisData.imposter_syndrome_detected,
                imposterConfidence: analysisData.imposter_confidence,
                detectedEmotions: analysisData.detected_emotions,
                keyInsights: analysisData.key_insights,
                recommendations: analysisData.recommendations,
                urgentSupportNeeded: analysisData.urgent_support_needed
            })
        });

        if (!response.ok) {
            throw new Error(`Failed to store analysis: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Failed to store imposter syndrome analysis:', error);
        return null; // Don't break the app if storage fails
    }
};

// Get user's imposter syndrome patterns
const getImpostorPatterns = async (timeRange = '30d') => {
    if (!API_GATEWAY_BASE_URL) return null;

    try {
        const userId = generateUserId();
const response = await fetch(`${API_GATEWAY_BASE_URL}/analyze-journal/${userId}?range=${timeRange}`, {
            headers: {
                'Authorization': `Bearer ${getAuthToken()}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`Failed to fetch patterns: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Failed to fetch imposter patterns:', error);
        return null;
    }
};

// Simple user ID generation (you might want to use proper auth later)
const generateUserId = () => {
    let userId = localStorage.getItem('trulyher_user_id');
    if (!userId) {
        userId = 'user_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('trulyher_user_id', userId);
    }
    return userId;
};

export const lambdaService = {
    analyzeJournalEntry,
    storeImpostorAnalysis,
    getImpostorPatterns,
    storeInsightsGeneration
};