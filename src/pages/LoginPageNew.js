import React, { useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Heart, Lock, User, Mail } from 'lucide-react';

const LoginPage = ({ onLogin }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        name: '',
        verificationCode: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [needsVerification, setNeedsVerification] = useState(false);

    useEffect(() => {
        checkCurrentUser();
    }, []);

    const checkCurrentUser = async () => {
        try {
            const user = await authService.getCurrentUser();
            onLogin(user);
        } catch (error) {
            // No current user
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            if (needsVerification) {
                // Confirm verification code
                await authService.confirmSignUp(formData.email, formData.verificationCode);
                setNeedsVerification(false);
                setIsLogin(true);
                setError('Account verified! Please sign in.');
            } else if (isLogin) {
                await authService.signIn(formData.email, formData.password);
                const user = await authService.getCurrentUser();
                localStorage.setItem('trulyher_user', JSON.stringify(user));
                onLogin(user);
            } else {
                if (formData.password !== formData.confirmPassword) {
                    throw new Error('Passwords do not match');
                }
                await authService.signUp(formData.email, formData.password, formData.name);
                setNeedsVerification(true);
                setError('Account created! Check your email for verification code.');
            }
        } catch (error) {
            setError(error.message || 'Authentication failed');
        }
        
        setLoading(false);
    };

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md p-8 shadow-xl border-pink-200">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                        <Heart className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-500 via-pink-600 to-indigo-600 bg-clip-text text-transparent">
                        Welcome to TrulyHer
                    </h1>
                    <p className="text-gray-600 mt-2">
                        {needsVerification ? 'Enter verification code from your email' : 
                         isLogin ? 'Sign in to continue your journey' : 'Start your empowerment journey'}
                    </p>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {needsVerification ? (
                        // Verification code form
                        <div className="relative">
                            <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                            <Input
                                type="text"
                                name="verificationCode"
                                placeholder="Enter verification code"
                                value={formData.verificationCode}
                                onChange={handleChange}
                                className="pl-10 border-pink-200 focus:border-pink-400"
                                required
                            />
                        </div>
                    ) : (
                        // Regular login/signup form
                        <>
                            {!isLogin && (
                                <div className="relative">
                                    <User className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                                    <Input
                                        type="text"
                                        name="name"
                                        placeholder="Your name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        className="pl-10 border-pink-200 focus:border-pink-400"
                                        required={!isLogin}
                                    />
                                </div>
                            )}
                            
                            <div className="relative">
                                <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                                <Input
                                    type="email"
                                    name="email"
                                    placeholder="Email address"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="pl-10 border-pink-200 focus:border-pink-400"
                                    required
                                />
                            </div>
                            
                            <div className="relative">
                                <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                                <Input
                                    type="password"
                                    name="password"
                                    placeholder="Password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    className="pl-10 border-pink-200 focus:border-pink-400"
                                    required
                                />
                            </div>
                            
                            {!isLogin && (
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                                    <Input
                                        type="password"
                                        name="confirmPassword"
                                        placeholder="Confirm password"
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
                                        className="pl-10 border-pink-200 focus:border-pink-400"
                                        required={!isLogin}
                                    />
                                </div>
                            )}
                        </>
                    )}
                    
                    <Button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white py-3 rounded-2xl shadow-lg hover:shadow-xl transition-all"
                    >
                        {loading ? 'Please wait...' : 
                         needsVerification ? 'Verify Code' :
                         isLogin ? 'Sign In' : 'Create Account'}
                    </Button>
                </form>

                <div className="text-center mt-6">
                    {!needsVerification && (
                        <button
                            type="button"
                            onClick={() => setIsLogin(!isLogin)}
                            className="text-purple-600 hover:text-purple-800 text-sm font-medium"
                        >
                            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
                        </button>
                    )}
                </div>

                <div className="text-center mt-4">
                    <p className="text-xs text-gray-500">
                        Secure authentication with AWS Cognito
                    </p>
                </div>
            </Card>
        </div>
    );
};

export default LoginPage;