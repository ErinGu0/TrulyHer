/**
 * AWS Cognito Authentication Service
 */

import { CognitoUserPool, CognitoUser, AuthenticationDetails, CognitoUserAttribute } from 'amazon-cognito-identity-js';

// These two are IDs, not secrets -- Cognito pool and client ids are public by
// design and appear in every browser request, so REACT_APP_ is correct here.
const POOL_ID = process.env.REACT_APP_COGNITO_USER_POOL_ID;
const CLIENT_ID = process.env.REACT_APP_COGNITO_CLIENT_ID;

const isConfigured = () => Boolean(POOL_ID && CLIENT_ID);

// Built lazily. Constructing a CognitoUserPool with undefined ids throws
// "Both UserPoolId and ClientId are required" at MODULE LOAD, which takes down
// the entire app before React renders anything -- not just the login screen.
let cachedPool = null;
const getPool = () => {
    if (!isConfigured()) {
        throw new Error('Cognito is not configured');
    }
    if (!cachedPool) {
        cachedPool = new CognitoUserPool({ UserPoolId: POOL_ID, ClientId: CLIENT_ID });
    }
    return cachedPool;
};

// Confirm signup with verification code
const confirmSignUp = (email, code) => {
    return new Promise((resolve, reject) => {
        const cognitoUser = new CognitoUser({
            Username: email,
            Pool: getPool()
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

        getPool().signUp(email, password, attributeList, null, (err, result) => {
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
            Pool: getPool()
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
        const cognitoUser = getPool().getCurrentUser();
        
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
    if (!isConfigured()) return;
    const cognitoUser = getPool().getCurrentUser();
    if (cognitoUser) {
        cognitoUser.signOut();
    }
};

export const authService = {
    isConfigured,
    signUp,
    confirmSignUp,
    signIn,
    getCurrentUser,
    signOut
};