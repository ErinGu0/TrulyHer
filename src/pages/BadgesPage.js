import React, { useState, useEffect } from "react";
import { journalService } from "../services/journalService";
import { Award } from "lucide-react";

const allBadges = {
  first_entry: { 
    name: "First Step", 
    description: "You've started your beautiful journey, keep at it!", 
    icon: '⭐'
  },
  three_day_streak: { 
    name: "Budding Habit", 
    description: "3 days of reflection in a row!", 
    icon: '⚡'
  },
  seven_day_streak: { 
    name: "Consistent Heart", 
    description: "A whole week of self-care!", 
    icon: '💗'
  },
  mood_tracker: { 
    name: "Emotional Explorer", 
    description: "Tracked your mood 10 times", 
    icon: '📖'
  },
  reflective_writer: { 
    name: "Reflective Writer", 
    description: "Wrote 20 journal entries", 
    icon: '📚'
  },
  journey_master: { 
    name: "Journey Master", 
    description: "Completed 50 entries!", 
    icon: '🏆'
  },
};

export default function BadgesPage() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await journalService.getUser();
        setUser(currentUser);
        
        await checkAndAwardBadges(currentUser);
      } catch (e) {
        console.error("Failed to fetch user");
        setUser({ badges: [] });
      }
      setIsLoading(false);
    };
    fetchUser();
  }, []);

  const checkAndAwardBadges = async (currentUser) => {
    const entries = await journalService.getEntries();
    const newBadges = [];
    
    if (entries.length > 0 && !currentUser.badges?.some(b => b.id === 'first_entry')) {
      newBadges.push({
        id: 'first_entry',
        date_earned: new Date().toISOString()
      });
    }
    
    if (entries.length >= 10 && !currentUser.badges?.some(b => b.id === 'mood_tracker')) {
      newBadges.push({
        id: 'mood_tracker',
        date_earned: new Date().toISOString()
      });
    }
    
    if (entries.length >= 20 && !currentUser.badges?.some(b => b.id === 'reflective_writer')) {
      newBadges.push({
        id: 'reflective_writer',
        date_earned: new Date().toISOString()
      });
    }
    
    if (entries.length >= 50 && !currentUser.badges?.some(b => b.id === 'journey_master')) {
      newBadges.push({
        id: 'journey_master',
        date_earned: new Date().toISOString()
      });
    }
    
    if (newBadges.length > 0) {
      const updatedBadges = [...(currentUser.badges || []), ...newBadges];
      const updatedUser = { ...currentUser, badges: updatedBadges };
      setUser(updatedUser);
      await journalService.updateUser(updatedUser);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
      </div>
    );
  }

  const earnedBadges = user?.badges || [];
  const earnedBadgeIds = earnedBadges.map(b => b.id);

  const badges = Object.entries(allBadges).map(([id, badge]) => ({
    id,
    ...badge,
    earned: earnedBadgeIds.includes(id),
    earnedDate: earnedBadges.find(b => b.id === id)?.date_earned
  }));

  const earnedBadgesList = badges.filter(b => b.earned);
  const lockedBadges = badges.filter(b => !b.earned);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="flex items-center justify-center mb-3">
          <Award className="w-8 h-8 text-gray-700" />
        </div>
        <h1 className="text-gray-800 mb-2">Your Accomplishments</h1>
        <p className="text-gray-600">Celebrating every step of your beautiful journey 💗</p>
      </div>

      {/* Stats */}
      <div className="bg-white/70 backdrop-blur-md rounded-3xl p-8 border border-white/60 shadow-lg text-center">
        <div className="text-5xl mb-3">🎖️</div>
        <h2 className="text-gray-800 mb-2">{earnedBadgesList.length} of {badges.length} badges earned</h2>
        <p className="text-gray-600">Keep journaling to unlock more achievements!</p>
      </div>

      {/* Earned Badges */}
      <div>
        <h3 className="text-gray-800 mb-6">✨ Earned Badges</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {earnedBadgesList.map((badge) => (
            <div
              key={badge.id}
              className="bg-white/70 backdrop-blur-md rounded-3xl p-6 border border-white/60 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-yellow-300 to-orange-400 rounded-full flex items-center justify-center shadow-md flex-shrink-0">
                  <span className="text-3xl">{badge.icon}</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-gray-800 mb-1">{badge.name}</h3>
                  <p className="text-gray-600 text-sm mb-2">{badge.description}</p>
                  {badge.earnedDate && (
                    <p className="text-xs text-gray-500">Earned on {new Date(badge.earnedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Locked Badges */}
      <div>
        <h3 className="text-gray-800 mb-6">🔒 Locked Badges</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {lockedBadges.map((badge) => (
            <div
              key={badge.id}
              className="bg-white/50 backdrop-blur-md rounded-3xl p-6 border border-white/50 shadow-lg relative overflow-hidden"
            >
              <div className="flex items-start gap-4 opacity-60">
                <div className="w-16 h-16 bg-gradient-to-br from-gray-300 to-gray-400 rounded-full flex items-center justify-center shadow-md flex-shrink-0">
                  <span className="text-3xl grayscale">{badge.icon}</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-gray-700 mb-1">{badge.name}</h3>
                  <p className="text-gray-600 text-sm mb-2">{badge.description}</p>
                  <p className="text-xs text-gray-500 italic">Keep going to unlock!</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}