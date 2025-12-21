import React, { useState } from 'react';
import JournalPage from './pages/JournalPage';
import MoodDashboardPage from './pages/MoodDashboardPage';
import HistoryPage from './pages/HistoryPage';
import InsightsPage from './pages/InsightsPage';
import BadgesPage from './pages/BadgesPage';
import ActionPage from './pages/ActionPage'; // NEW: Import Action Page
import Layout from './components/layout/Layout';
import './App.css';

function App() {
  const [currentPage, setCurrentPage] = useState('journal');

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <MoodDashboardPage />;
      case 'history': return <HistoryPage />;
      case 'insights': return <InsightsPage />;
      case 'badges': return <BadgesPage />;
      case 'action': return <ActionPage />; // NEW: Action page route
      default: return <JournalPage />;
    }
  };

  return (
    <Layout currentPageName={currentPage} onPageChange={setCurrentPage}>
      {renderPage()}
    </Layout>
  );
}

export default App;