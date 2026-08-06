/**
 * AWS Cognito Authentication Service
 */

import { CognitoUserPool, CognitoUser, AuthenticationDetails, CognitoUserAttribute } from 'amazon-cognito-identity-js';

const poolData = {
    UserPoolId: process.env.REACT_APP_COGNITO_USER_POOL_ID,
    ClientId: process.env.REACT_APP_COGNITO_CLIENT_ID
};

const userPool = new CognitoUserPool(poolData);

// Confirm signup with verification code
const confirmSignUp = (email, code) => {
    return new Promise((resolve, reject) => {
        const cognitoUser = new CognitoUser({
            Username: email,
            Pool: userPool
        });

        cognitoUser.confirmRegistration(code, true, (err, result) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(result);
        });
    });
};

// Sign up new user
const signUp = (email, password, name) => {
    return new Promise((resolve, reject) => {
        const attributeList = [
            new CognitoUserAttribute({
                Name: 'email',
                Value: email
            }),
            new CognitoUserAttribute({
                Name: 'name',
                Value: name
            })
        ];

        userPool.signUp(email, password, attributeList, null, (err, result) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(result.user);
        });
    });
};

// Sign in user
const signIn = (email, password) => {
    return new Promise((resolve, reject) => {
        const authenticationDetails = new AuthenticationDetails({
            Username: email,
            Password: password
        });

        const cognitoUser = new CognitoUser({
            Username: email,
            Pool: userPool
        });

        cognitoUser.authenticateUser(authenticationDetails, {
            onSuccess: (result) => {
                resolve({
                    accessToken: result.getAccessToken().getJwtToken(),
                    idToken: result.getIdToken().getJwtToken(),
                    refreshToken: result.getRefreshToken().getToken(),
                    user: cognitoUser
                });
            },
            onFailure: (err) => {
                reject(err);
            }
        });
    });
};

// Get current user
const getCurrentUser = () => {
    return new Promise((resolve, reject) => {
        const cognitoUser = userPool.getCurrentUser();
        
        if (!cognitoUser) {
            reject(new Error('No user found'));
            return;
        }

        cognitoUser.getSession((err, session) => {
            if (err) {
                reject(err);
                return;
            }

            if (session.isValid()) {
                cognitoUser.getUserAttributes((err, attributes) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    const userInfo = {};
                    attributes.forEach(attr => {
                        userInfo[attr.getName()] = attr.getValue();
                    });

                    resolve({
                        ...userInfo,
                        userId: cognitoUser.getUsername(),
                        accessToken: session.getAccessToken().getJwtToken()
                    });
                });
            } else {
                reject(new Error('Session invalid'));
            }
        });
    });
};

// Sign out
const signOut = () => {
    const cognitoUser = userPool.getCurrentUser();
    if (cognitoUser) {
        cognitoUser.signOut();
    }
};

export const authService = {
    signUp,
    confirmSignUp,
    signIn,
    getCurrentUser,
    signOut
};