import React, { useState, useEffect } from "react";
import { journalService } from "../services/journalService";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import { TrendingUp, Heart, Sparkles, Calendar, BarChart3, Cloud, Zap } from "lucide-react";
import { format, subDays } from "date-fns";
import { motion } from "framer-motion";

import MoodChart from "../components/mood/MoodChart";
import EmotionCloud from "../components/mood/EmotionCloud";
import MoodSummary from "../components/mood/MoodSummary";

export default function MoodDashboardPage() {
  const [entries, setEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    try {
      const data = await journalService.getEntries(30);
      setEntries(data);
    } catch (error) {
      console.error("Error loading entries:", error);
    }
    setIsLoading(false);
  };

  const getRecentMoodData = () => {
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dayEntries = entries.filter(entry => 
        format(new Date(entry.entry_date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
      );
      
      const avgMood = dayEntries.length > 0 
        ? dayEntries.reduce((sum, entry) => sum + (entry.mood_score || 5), 0) / dayEntries.length
        : null;

      last7Days.push({
        date: format(date, 'MM/dd'),
        mood: avgMood,
        entries: dayEntries.length
      });
    }
    return last7Days;
  };

  const getAllEmotions = () => {
    const emotionCount = {};
    entries.forEach(entry => {
      (entry.emotions || []).forEach(emotion => {
        emotionCount[emotion] = (emotionCount[emotion] || 0) + 1;
      });
    });
    return Object.entries(emotionCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 12)
      .map(([emotion, count]) => ({ emotion, count }));
  };

  const averageMood = entries.length > 0 
    ? entries.reduce((sum, entry) => sum + (entry.mood_score || 5), 0) / entries.length 
    : 5;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex justify-center items-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 py-8 px-4 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-10 right-10 w-64 h-64 bg-purple-200/20 rounded-full blur-3xl" />
      <div className="absolute bottom-10 left-10 w-80 h-80 bg-pink-200/20 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-indigo-200/10 rounded-full blur-3xl" />

      <div className="max-w-7xl mx-auto space-y-8 relative z-10">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          <div className="flex justify-center">
            <motion.div 
              animate={{ 
                rotate: [0, 5, -5, 0],
                scale: [1, 1.05, 1]
              }}
              transition={{ duration: 3, repeat: Infinity }}
              className="relative"
            >
              <div className="w-24 h-24 bg-gradient-to-br from-purple-400 via-pink-400 to-indigo-500 rounded-3xl flex items-center justify-center shadow-2xl rotate-12">
                <TrendingUp className="w-12 h-12 text-white -rotate-12" />
              </div>
              <motion.div
                animate={{ 
                  y: [0, -10, 0],
                  opacity: [0.7, 1, 0.7]
                }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute -top-2 -right-2"
              >
                <Sparkles className="w-8 h-8 text-yellow-400" />
              </motion.div>
            </motion.div>
          </div>
          <div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 bg-clip-text text-transparent mb-2">
              Your Mood Journey
            </h1>
            <p className="text-gray-600 text-lg">
              Beautiful patterns in your emotional landscape ✨
            </p>
          </div>
        </motion.div>

        {/* Summary Cards */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          <motion.div
            whileHover={{ scale: 1.03, y: -5 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <Card className="border-2 border-pink-200 bg-gradient-to-br from-white to-pink-50/50 shadow-xl backdrop-blur-sm overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-pink-200/20 rounded-full blur-2xl" />
              <CardContent className="p-6 relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-pink-400 to-rose-500 rounded-2xl shadow-lg">
                    <Heart className="w-8 h-8 text-white" />
                  </div>
                  <div className="text-right">
                    <div className="text-4xl font-bold bg-gradient-to-br from-pink-600 to-rose-600 bg-clip-text text-transparent">
                      {averageMood.toFixed(1)}
                    </div>
                    <div className="text-xs text-gray-500 font-medium">out of 10</div>
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-1">Average Mood</h3>
                <p className="text-sm text-gray-600">Overall happiness level</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.03, y: -5 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <Card className="border-2 border-purple-200 bg-gradient-to-br from-white to-purple-50/50 shadow-xl backdrop-blur-sm overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-200/20 rounded-full blur-2xl" />
              <CardContent className="p-6 relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-purple-400 to-indigo-500 rounded-2xl shadow-lg">
                    <Calendar className="w-8 h-8 text-white" />
                  </div>
                  <div className="text-right">
                    <div className="text-4xl font-bold bg-gradient-to-br from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                      {entries.length}
                    </div>
                    <div className="text-xs text-gray-500 font-medium">entries</div>
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-1">Total Entries</h3>
                <p className="text-sm text-gray-600">Journal entries recorded</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.03, y: -5 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <Card className="border-2 border-indigo-200 bg-gradient-to-br from-white to-indigo-50/50 shadow-xl backdrop-blur-sm overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-200/20 rounded-full blur-2xl" />
              <CardContent className="p-6 relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-2xl shadow-lg">
                    <Zap className="w-8 h-8 text-white" />
                  </div>
                  <div className="text-right">
                    <div className="text-4xl font-bold bg-gradient-to-br from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                      {entries.filter(e => new Date(e.entry_date) >= subDays(new Date(), 7)).length}
                    </div>
                    <div className="text-xs text-gray-500 font-medium">this week</div>
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-1">Recent Activity</h3>
                <p className="text-sm text-gray-600">Weekly reflections</p>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* Mood Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-2 border-purple-200 bg-white/80 backdrop-blur-sm shadow-2xl">
            <CardHeader className="border-b border-purple-100 bg-gradient-to-r from-purple-50 to-pink-50">
              <CardTitle className="flex items-center gap-3 text-gray-800">
                <div className="p-2 bg-gradient-to-br from-purple-400 to-pink-400 rounded-xl">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl">7-Day Mood Trend</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <MoodChart data={getRecentMoodData()} />
            </CardContent>
          </Card>
        </motion.div>

        {/* Emotion Analysis & Recent Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="border-2 border-pink-200 bg-white/80 backdrop-blur-sm shadow-2xl h-full">
              <CardHeader className="border-b border-pink-100 bg-gradient-to-r from-pink-50 to-rose-50">
                <CardTitle className="flex items-center gap-3 text-gray-800">
                  <div className="p-2 bg-gradient-to-br from-pink-400 to-rose-400 rounded-xl">
                    <Cloud className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-xl">Emotion Cloud</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <EmotionCloud emotions={getAllEmotions()} />
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="border-2 border-indigo-200 bg-white/80 backdrop-blur-sm shadow-2xl h-full">
              <CardHeader className="border-b border-indigo-100 bg-gradient-to-r from-indigo-50 to-purple-50">
                <CardTitle className="flex items-center gap-3 text-gray-800">
                  <div className="p-2 bg-gradient-to-br from-indigo-400 to-purple-400 rounded-xl">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-xl">Recent Insights</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {entries.slice(0, 3).map((entry, index) => (
                  <motion.div 
                    key={entry.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 + index * 0.1 }}
                    className="p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border-2 border-indigo-100 hover:border-indigo-300 transition-all hover:shadow-lg"
                  >
                    <p className="text-gray-700 leading-relaxed mb-3">
                      "{entry.ai_insights?.substring(0, 120)}..."
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-indigo-600 bg-indigo-100 px-3 py-1 rounded-full">
                        {format(new Date(entry.entry_date), "MMM d, yyyy")}
                      </span>
                      <span className="text-xs font-semibold text-purple-600">
                        Mood: {entry.mood_score}/10
                      </span>
                    </div>
                  </motion.div>
                ))}
                
                {entries.length === 0 && (
                  <div className="text-center py-12">
                    <Cloud className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">Start journaling to see insights here!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}