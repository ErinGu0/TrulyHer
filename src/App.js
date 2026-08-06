import React, { useState, useEffect } from 'react';
import { authService } from './services/authService';
import JournalPage from './pages/JournalPage';
import MoodDashboardPage from './pages/MoodDashboardPage';
import HistoryPage from './pages/HistoryPage';
import InsightsPage from './pages/InsightsPage';
import BadgesPage from './pages/BadgesPage';
import ActionPage from './pages/ActionPage';
import LoginPage from './pages/LoginPageNew';
import Layout from './components/layout/Layout';
import './App.css';

function App() {
  const [currentPage, setCurrentPage] = useState('journal');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const savedUser = localStorage.getItem('trulyher_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    authService.signOut();
    localStorage.removeItem('trulyher_user');
    setUser(null);
    setCurrentPage('journal');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg animate-pulse">
            <span className="text-white text-2xl">💝</span>
          </div>
          <p className="text-gray-600">Loading TrulyHer...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <MoodDashboardPage />;
      case 'history': return <HistoryPage />;
      case 'insights': return <InsightsPage />;
      case 'badges': return <BadgesPage />;
      case 'action': return <ActionPage />;
      default: return <JournalPage />;
    }
  };

  return (
    <Layout
      currentPageName={currentPage}
      onPageChange={setCurrentPage}
      user={user}
      onLogout={handleLogout}
    >
      {renderPage()}
    </Layout>
  );
}

export default App;
