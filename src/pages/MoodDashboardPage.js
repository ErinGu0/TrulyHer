import React, { useState, useEffect } from "react";
import { journalService } from "../services/journalService";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import { TrendingUp, Heart, Sparkles, Calendar } from "lucide-react";
import { format, subDays } from "date-fns";

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
      <div className="flex justify-center items-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center shadow-lg">
            <TrendingUp className="w-8 h-8 text-white" />
          </div>
        </div>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-500 to-pink-600 bg-clip-text text-transparent">
          Your Mood Journey
        </h1>
        <p className="text-gray-600">
          Beautiful patterns in your emotional landscape ✨
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MoodSummary
          title="Average Mood"
          value={averageMood.toFixed(1)}
          icon={Heart}
          color="from-pink-400 to-rose-400"
          description="Overall happiness level"
        />
        <MoodSummary
          title="Total Entries"
          value={entries.length}
          icon={Calendar}
          color="from-purple-400 to-indigo-400"
          description="Journal entries recorded"
        />
        <MoodSummary
          title="This Week"
          value={entries.filter(e => new Date(e.entry_date) >= subDays(new Date(), 7)).length}
          icon={Sparkles}
          color="from-indigo-400 to-purple-400"
          description="Recent reflections"
        />
      </div>

      {/* Mood Chart */}
      <Card className="border-pink-200 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-700">
            <TrendingUp className="w-5 h-5 text-purple-400" />
            7-Day Mood Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <MoodChart data={getRecentMoodData()} />
        </CardContent>
      </Card>

      {/* Emotion Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-pink-200 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-700">
              <Sparkles className="w-5 h-5 text-pink-400" />
              Emotion Cloud
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EmotionCloud emotions={getAllEmotions()} />
          </CardContent>
        </Card>

        <Card className="border-pink-200 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-700">
              <Heart className="w-5 h-5 text-purple-400" />
              Recent Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {entries.slice(0, 3).map((entry, index) => (
              <div key={entry.id} className="p-3 bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl">
                <p className="text-sm text-gray-600 italic">"{entry.ai_insights?.substring(0, 100)}..."</p>
                <p className="text-xs text-gray-400 mt-1">
                  {format(new Date(entry.entry_date), "MMM d")}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}