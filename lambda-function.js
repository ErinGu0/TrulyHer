/**
 * AWS Lambda Function: Imposter Syndrome Data Handler
 * This function handles storing and retrieving imposter syndrome analysis data
 * Deploy this to AWS Lambda and connect it to API Gateway
 */

const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();

const TABLE_NAME = 'TrulyHer-ImpostorAnalysis';

exports.handler = async (event) => {
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*', // Configure this properly for production
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
    };

    try {
        const { httpMethod, path, pathParameters, queryStringParameters, body } = event;

        // Handle CORS preflight
        if (httpMethod === 'OPTIONS') {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ message: 'CORS preflight successful' })
            };
        }

        // Store imposter syndrome analysis
        if (httpMethod === 'POST' && path.includes('/impostor-analysis')) {
            const data = JSON.parse(body);
            
            const item = {
                userId: data.userId,
                timestamp: data.timestamp,
                analysisId: `${data.userId}_${Date.now()}`, // Unique ID
                journalEntry: data.journalEntry,
                moodScore: data.moodScore,
                imposterSyndromeDetected: data.imposterSyndromeDetected,
                imposterConfidence: data.imposterConfidence,
                detectedEmotions: data.detectedEmotions,
                keyInsights: data.keyInsights,
                recommendations: data.recommendations,
                urgentSupportNeeded: data.urgentSupportNeeded,
                createdAt: new Date().toISOString()
            };

            await dynamodb.put({
                TableName: TABLE_NAME,
                Item: item
            }).promise();

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    analysisId: item.analysisId,
                    message: 'Analysis stored successfully'
                })
            };
        }

        // Store insights generation
        if (httpMethod === 'POST' && path.includes('/insights')) {
            const data = JSON.parse(body);
            
            const item = {
                userId: data.userId,
                timestamp: data.timestamp,
                insightId: `insight_${data.userId}_${Date.now()}`,
                insights: data.insights,
                entryCount: data.entryCount,
                createdAt: new Date().toISOString()
            };

            await dynamodb.put({
                TableName: 'TrulyHer-Insights',
                Item: item
            }).promise();

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    insightId: item.insightId,
                    message: 'Insights stored successfully'
                })
            };
        }

        // Get imposter syndrome patterns
        if (httpMethod === 'GET' && path.includes('/impostor-patterns')) {
            const userId = pathParameters.userId;
            const timeRange = queryStringParameters?.range || '30d';
            
            // Calculate date range
            const now = new Date();
            const daysBack = timeRange === '7d' ? 7 : timeRange === '90d' ? 90 : 30;
            const startDate = new Date(now.getTime() - (daysBack * 24 * 60 * 60 * 1000));

            const params = {
                TableName: TABLE_NAME,
                FilterExpression: 'userId = :userId AND createdAt >= :startDate',
                ExpressionAttributeValues: {
                    ':userId': userId,
                    ':startDate': startDate.toISOString()
                }
            };

            const result = await dynamodb.scan(params).promise();
            
            // Process data for patterns
            const patterns = analyzePatterns(result.Items);

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    timeRange,
                    totalEntries: result.Items.length,
                    patterns
                })
            };
        }

        return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Endpoint not found' })
        };

    } catch (error) {
        console.error('Lambda function error:', error);
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

// Analyze patterns in the data
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

    const imposterDetected = items.filter(item => item.imposterSyndromeDetected);
    const allEmotions = items.flatMap(item => item.detectedEmotions || []);
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
        averageConfidence: imposterDetected.reduce((sum, item) => sum + item.imposterConfidence, 0) / imposterDetected.length || 0,
        commonEmotions,
        moodTrends: items.map(item => ({
            date: item.createdAt,
            moodScore: item.moodScore,
            imposterDetected: item.imposterSyndromeDetected
        })),
        urgentSupportCount: items.filter(item => item.urgentSupportNeeded).length
    };
}