import React, { useState, useEffect } from 'react';
import { Flame } from 'lucide-react';

export default function StreakCounter() {
  const [streak, setStreak] = useState(1);

  useEffect(() => {
    const calculateStreak = () => {
      try {
        const entries = JSON.parse(localStorage.getItem('journalEntries') || '[]');
        if (entries.length === 0) {
          setStreak(1);
          return;
        }

        // Get unique dates and convert to timestamps for proper sorting
        const uniqueDates = [...new Set(entries.map(entry => {
          const date = new Date(entry.entry_date);
          return date.setHours(0, 0, 0, 0); // Normalize to midnight
        }))];
        
        // Sort dates descending (newest first)
        uniqueDates.sort((a, b) => b - a);
        
        const today = new Date().setHours(0, 0, 0, 0);
        let currentStreak = 0;

        // If most recent entry is not today, streak is 1 (since user started today)
        if (uniqueDates[0] !== today) {
          setStreak(1);
          return;
        }

        // Calculate consecutive days
        currentStreak = 1;
        for (let i = 0; i < uniqueDates.length - 1; i++) {
          const currentDate = uniqueDates[i];
          const nextDate = uniqueDates[i + 1];
          const diffDays = (currentDate - nextDate) / (1000 * 60 * 60 * 24);
          
          if (diffDays === 1) {
            currentStreak++;
          } else {
            break; // Streak broken
          }
        }
        
        setStreak(currentStreak);
      } catch (error) {
        console.error('Error calculating streak:', error);
        setStreak(0);
      }
    };

    calculateStreak();
  }, []);

  return (
    <div className="flex items-center gap-4 px-5 py-2 rounded-full bg-gradient-to-r from-pink-100/80 to-orange-100/80 shadow-lg border border-pink-100/60">
      <Flame className={`w-5 h-5 transition-colors ${streak > 0 ? 'text-orange-500' : 'text-gray-400'}`} />
      <span className="font-extrabold text-2xl text-pink-600" style={{fontFamily: 'Poppins, Quicksand, Segoe UI, sans-serif', letterSpacing: '0.04em'}}>{streak}</span>
      <span className="text-base text-gray-500 ml-2" style={{fontFamily: 'Poppins, Quicksand, Segoe UI, sans-serif', letterSpacing: '0.04em'}}>&nbsp;Day Streak</span>
    </div>
  );
}