/**
 * AWS Lambda Function: Complete TrulyHer Backend
 * Handles Gemini AI analysis, data storage, and user authentication
 */

const AWS = require('aws-sdk');
const jwt = require('jsonwebtoken');
const jwkToPem = require('jwk-to-pem');
const fetch = require('node-fetch');

const dynamodb = new AWS.DynamoDB.DocumentClient();
const ANALYSIS_TABLE = 'TrulyHer-ImpostorAnalysis';
const INSIGHTS_TABLE = 'TrulyHer-Insights';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Verify Cognito JWT token
const verifyToken = async (token) => {
    // In production, fetch JWKs from Cognito and verify properly
    // For now, decode without verification (add proper verification later)
    const decoded = jwt.decode(token);
    return decoded;
};

// Call Gemini AI
const callGeminiAI = async (entryText, moodScore) => {
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.7-flash:generateContent?key=${GEMINI_API_KEY}`;
    
    const systemPrompt = `You are a compassionate personal journal analyst. Analyze the journal entry and output ONLY a valid JSON object with: overall_analysis, detected_emotions, imposter_syndrome_detected, imposter_confidence, urgent_support_needed, key_insights, recommendations.`;
    
    const payload = {
        contents: [{
            parts: [{ text: `${systemPrompt}\n\nJOURNAL ENTRY: "${entryText}"` }]
        }],
        generationConfig: {
            responseMimeType: "application/json"
        }
    };

    const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
    }

    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) {
        throw new Error('No response from Gemini');
    }

    return JSON.parse(text);
};

exports.handler = async (event) => {
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
    };

    try {
        const { httpMethod, path, pathParameters, queryStringParameters, body, headers: requestHeaders } = event;

        // Handle CORS
        if (httpMethod === 'OPTIONS') {
            return { statusCode: 200, headers, body: JSON.stringify({ message: 'CORS OK' }) };
        }

        // Verify authentication
        const authHeader = requestHeaders.Authorization || requestHeaders.authorization;
        if (!authHeader) {
            return { statusCode: 401, headers, body: JSON.stringify({ error: 'No authorization header' }) };
        }

        const token = authHeader.replace('Bearer ', '');
        const user = await verifyToken(token);
        const userId = user.sub || user['cognito:username'];

        // Analyze journal entry with Gemini
        if (httpMethod === 'POST' && path.includes('/analyze-journal')) {
            const { entryText, moodScore } = JSON.parse(body);
            
            const analysis = await callGeminiAI(entryText, moodScore);
            
            // Store in DynamoDB
            const item = {
                userId,
                timestamp: new Date().toISOString(),
                analysisId: `${userId}_${Date.now()}`,
                journalEntry: entryText,
                moodScore,
                ...analysis,
                createdAt: new Date().toISOString()
            };

            await dynamodb.put({
                TableName: ANALYSIS_TABLE,
                Item: item
            }).promise();

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    analysis,
                    analysisId: item.analysisId
                })
            };
        }

        // Store insights
        if (httpMethod === 'POST' && path.includes('/insights')) {
            const data = JSON.parse(body);
            
            const item = {
                userId,
                timestamp: new Date().toISOString(),
                insightId: `insight_${userId}_${Date.now()}`,
                insights: data.insights,
                entryCount: data.entryCount,
                createdAt: new Date().toISOString()
            };

            await dynamodb.put({
                TableName: INSIGHTS_TABLE,
                Item: item
            }).promise();

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    insightId: item.insightId
                })
            };
        }

        // Get patterns
        if (httpMethod === 'GET' && path.includes('/impostor-patterns')) {
            const timeRange = queryStringParameters?.range || '30d';
            const daysBack = timeRange === '7d' ? 7 : timeRange === '90d' ? 90 : 30;
            const startDate = new Date(Date.now() - (daysBack * 24 * 60 * 60 * 1000));

            const params = {
                TableName: ANALYSIS_TABLE,
                FilterExpression: 'userId = :userId AND createdAt >= :startDate',
                ExpressionAttributeValues: {
                    ':userId': userId,
                    ':startDate': startDate.toISOString()
                }
            };

            const result = await dynamodb.scan(params).promise();
            
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    timeRange,
                    totalEntries: result.Items.length,
                    patterns: analyzePatterns(result.Items)
                })
            };
        }

        return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Endpoint not found' })
        };

    } catch (error) {
        console.error('Lambda error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Internal server error',
                message: error.message
            })
        };
    }
};

function analyzePatterns(items) {
    if (!items || items.length === 0) {
        return {
            imposterSyndromeFrequency: 0,
            averageConfidence: 0,
            commonEmotions: [],
            moodTrends: [],
            urgentSupportCount: 0
        };
    }

    const imposterDetected = items.filter(item => item.imposter_syndrome_detected);
    const allEmotions = items.flatMap(item => item.detected_emotions || []);
    const emotionCounts = {};
    
    allEmotions.forEach(emotion => {
        emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
    });

    const commonEmotions = Object.entries(emotionCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([emotion, count]) => ({ emotion, count }));

    return {
        imposterSyndromeFrequency: (imposterDetected.length / items.length) * 100,
        averageConfidence: imposterDetected.reduce((sum, item) => sum + (item.imposter_confidence || 0), 0) / imposterDetected.length || 0,
        commonEmotions,
        moodTrends: items.map(item => ({
            date: item.createdAt,
            moodScore: item.moodScore,
            imposterDetected: item.imposter_syndrome_detected
        })),
        urgentSupportCount: items.filter(item => item.urgent_support_needed).length
    };
}