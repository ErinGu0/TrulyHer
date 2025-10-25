import React, { useState, useEffect } from "react";
import { journalService } from "../services/journalService";
import { Card, CardContent, CardHeader } from "../components/ui/Card";
import { Star, Zap, Calendar, Heart, BookOpen, Trophy, Award } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";

const allBadges = {
  first_entry: { 
    name: "First Step", 
    description: "You've started your beautiful journey, keep at it!", 
    icon: Star,
    color: "from-yellow-400 to-orange-400"
  },
  three_day_streak: { 
    name: "Budding Habit", 
    description: "3 days of reflection in a row!", 
    icon: Zap,
    color: "from-green-400 to-blue-400"
  },
  seven_day_streak: { 
    name: "Consistent Heart", 
    description: "A whole week of self-care!", 
    icon: Calendar,
    color: "from-purple-400 to-pink-400"
  },
  mood_tracker: { 
    name: "Emotional Explorer", 
    description: "Tracked your mood 10 times", 
    icon: Heart,
    color: "from-pink-400 to-rose-400"
  },
  reflective_writer: { 
    name: "Reflective Writer", 
    description: "Wrote 20 journal entries", 
    icon: BookOpen,
    color: "from-blue-400 to-cyan-400"
  },
  journey_master: { 
    name: "Journey Master", 
    description: "Completed 50 entries!", 
    icon: Trophy,
    color: "from-orange-400 to-red-400"
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
        
        // Auto-award badges based on journal entries
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
    
    // Check for first entry badge
    if (entries.length > 0 && !currentUser.badges?.some(b => b.id === 'first_entry')) {
      newBadges.push({
        id: 'first_entry',
        date_earned: new Date().toISOString()
      });
    }
    
    // Check for mood tracker badge
    if (entries.length >= 10 && !currentUser.badges?.some(b => b.id === 'mood_tracker')) {
      newBadges.push({
        id: 'mood_tracker',
        date_earned: new Date().toISOString()
      });
    }
    
    // Check for reflective writer badge
    if (entries.length >= 20 && !currentUser.badges?.some(b => b.id === 'reflective_writer')) {
      newBadges.push({
        id: 'reflective_writer',
        date_earned: new Date().toISOString()
      });
    }
    
    // Check for journey master badge
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

  const earnedBadges = user?.badges || [];
  const earnedBadgeIds = earnedBadges.map(b => b.id);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-3">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-400 rounded-full flex items-center justify-center shadow-lg">
            <Award className="w-8 h-8 text-white" />
          </div>
        </div>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-yellow-500 to-orange-600 bg-clip-text text-transparent">
          Your Accomplishments
        </h1>
        <p className="text-gray-600">
          Celebrating every step of your beautiful journey 💖
        </p>
        
        <div className="bg-gradient-to-r from-pink-50 to-orange-50 p-4 rounded-xl border border-pink-200">
          <p className="text-sm text-gray-700">
            <strong>{earnedBadges.length} of {Object.keys(allBadges).length} badges earned</strong>
          </p>
          <p className="text-xs text-gray-500 mt-1">Keep journaling to unlock more achievements!</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(allBadges).map(([id, badge], index) => {
          const earned = earnedBadgeIds.includes(id);
          const earnedInfo = earned ? earnedBadges.find(b => b.id === id) : null;
          const Icon = badge.icon;

          return (
            <motion.div
              key={id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className={`h-full text-center p-4 transition-all duration-300 border-2 ${
                earned ? 'border-yellow-300 shadow-lg' : 'border-gray-200'
              }`}>
                <CardHeader>
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 transition-all ${
                    earned ? `bg-gradient-to-br ${badge.color} shadow-md` : 'bg-gray-200'
                  }`}>
                    <Icon className={`w-8 h-8 ${earned ? 'text-white' : 'text-gray-400'}`} />
                  </div>
                  <h3 className={`font-bold text-lg ${earned ? 'text-gray-800' : 'text-gray-400'}`}>
                    {badge.name}
                  </h3>
                </CardHeader>
                <CardContent>
                  <p className={`text-sm mt-1 ${earned ? 'text-gray-600' : 'text-gray-400'}`}>
                    {badge.description}
                  </p>
                  {earned && earnedInfo && (
                    <p className="text-xs text-yellow-600 font-semibold mt-2">
                      Earned on {format(new Date(earnedInfo.date_earned), 'MMM d, yyyy')}
                    </p>
                  )}
                  {!earned && (
                    <p className="text-xs text-gray-400 mt-2">Keep going to unlock!</p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}