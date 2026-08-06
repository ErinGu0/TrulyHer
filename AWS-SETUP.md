# AWS Setup Instructions for TrulyHer Imposter Syndrome Tracking

## 1. Create DynamoDB Tables

```bash
# Imposter syndrome analysis table
aws dynamodb create-table \
    --table-name TrulyHer-ImpostorAnalysis \
    --attribute-definitions \
        AttributeName=userId,AttributeType=S \
        AttributeName=timestamp,AttributeType=S \
    --key-schema \
        AttributeName=userId,KeyType=HASH \
        AttributeName=timestamp,KeyType=RANGE \
    --billing-mode PAY_PER_REQUEST \
    --region us-east-1

# Insights table
aws dynamodb create-table \
    --table-name TrulyHer-Insights \
    --attribute-definitions \
        AttributeName=userId,AttributeType=S \
        AttributeName=timestamp,AttributeType=S \
    --key-schema \
        AttributeName=userId,KeyType=HASH \
        AttributeName=timestamp,KeyType=RANGE \
    --billing-mode PAY_PER_REQUEST \
    --region us-east-1
```

## 2. Create Lambda Function

1. Zip the lambda-function.js file
2. Create Lambda function in AWS Console:
   - Runtime: Node.js 18.x
   - Function name: trulyher-impostor-analysis
   - Upload the zip file
   - Set environment variables if needed

## 3. Create API Gateway

1. Create REST API in API Gateway
2. Create resources:
   - `/impostor-analysis` (POST)
   - `/impostor-patterns/{userId}` (GET)
3. Enable CORS for both resources
4. Deploy to a stage (e.g., 'prod')

## 4. Lambda IAM Role Permissions

Add this policy to your Lambda execution role:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "dynamodb:PutItem",
                "dynamodb:GetItem",
                "dynamodb:Scan",
                "dynamodb:Query"
            ],
            "Resource": "arn:aws:dynamodb:us-east-1:*:table/TrulyHer-ImpostorAnalysis"
        }
    ]
}
```

## 5. Update Your .env File

Replace the placeholder URL with your actual API Gateway URL:
```
REACT_APP_API_GATEWAY_URL=https://your-actual-api-id.execute-api.us-east-1.amazonaws.com/prod
```

## DynamoDB Table Structure

The table stores:
- userId (Partition Key)
- timestamp (Sort Key)
- analysisId (Unique identifier)
- journalEntry (User's journal text)
- moodScore (1-10 mood rating)
- imposterSyndromeDetected (boolean)
- imposterConfidence (0-1 confidence score)
- detectedEmotions (array of emotion strings)
- keyInsights (array of insights)
- recommendations (array of recommendations)
- urgentSupportNeeded (boolean)
- createdAt (ISO timestamp)

## API Endpoints

### POST /impostor-analysis
Stores a new analysis entry

### GET /impostor-patterns/{userId}?range=30d
Retrieves patterns for a user (7d, 30d, or 90d)