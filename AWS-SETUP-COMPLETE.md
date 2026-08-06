# Complete AWS Setup for TrulyHer with Authentication

## Architecture Overview
- **AWS Cognito**: User authentication
- **API Gateway**: REST API endpoints with Cognito authorization
- **Lambda**: Gemini AI calls + data processing
- **DynamoDB**: Data storage with user-specific records

## 1. Create AWS Cognito User Pool

```bash
aws cognito-idp create-user-pool \
    --pool-name TrulyHer-UserPool \
    --policies "PasswordPolicy={MinimumLength=8,RequireUppercase=true,RequireLowercase=true,RequireNumbers=true}" \
    --auto-verified-attributes email \
    --region us-east-1
```

Create app client:
```bash
aws cognito-idp create-user-pool-client \
    --user-pool-id us-east-1_xxxxxxxxx \
    --client-name TrulyHer-WebClient \
    --no-generate-secret \
    --explicit-auth-flows ADMIN_NO_SRP_AUTH USER_PASSWORD_AUTH \
    --region us-east-1
```

## 2. Create DynamoDB Tables

```bash
# Analysis table
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
        --timestamp,AttributeType=S \
    --key-schema \
        AttributeName=userId,KeyType=HASH \
        AttributeName=timestamp,KeyType=RANGE \
    --billing-mode PAY_PER_REQUEST \
    --region us-east-1
```

## 3. Deploy Lambda Function

1. Install dependencies:
```bash
npm install --production
```

2. Create deployment package:
```bash
zip -r trulyher-lambda.zip lambda-function-complete.js node_modules/
```

3. Create Lambda function:
```bash
aws lambda create-function \
    --function-name trulyher-complete-backend \
    --runtime nodejs18.x \
    --role arn:aws:iam::YOUR-ACCOUNT:role/lambda-execution-role \
    --handler lambda-function-complete.handler \
    --zip-file fileb://trulyher-lambda.zip \
    --environment Variables='{GEMINI_API_KEY=your-gemini-key}' \
    --region us-east-1
```

## 4. Create API Gateway with Cognito Authorization

1. Create REST API
2. Create Cognito Authorizer using your User Pool
3. Create resources with Cognito authorization:
   - `POST /analyze-journal` (requires auth)
   - `POST /insights` (requires auth)  
   - `GET /impostor-patterns/{userId}` (requires auth)
4. Deploy to stage

## 5. Lambda IAM Permissions

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
            "Resource": [
                "arn:aws:dynamodb:us-east-1:*:table/TrulyHer-ImpostorAnalysis",
                "arn:aws:dynamodb:us-east-1:*:table/TrulyHer-Insights"
            ]
        }
    ]
}
```

## 6. Install React Dependencies

```bash
npm install amazon-cognito-identity-js
```

## 7. Update Environment Variables

```env
REACT_APP_API_GATEWAY_URL=https://your-api-id.execute-api.us-east-1.amazonaws.com/prod
REACT_APP_COGNITO_USER_POOL_ID=us-east-1_xxxxxxxxx
REACT_APP_COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
```

## Data Flow
1. User signs up/in via Cognito
2. React app gets JWT token
3. All API calls include JWT token
4. Lambda verifies token and extracts userId
5. All data stored with userId for user-specific access
6. Gemini AI calls happen server-side in Lambda

## Security Features
- JWT token authentication
- User-specific data isolation
- Server-side API key protection
- CORS properly configured