import React, { useState, useEffect } from "react";
import { journalService } from "../services/journalService";
import { lambdaService } from "../services/lambdaService";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Sparkles, Heart, TrendingUp, RefreshCw, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

import PersonalInsights from "../components/insights/PersonalInsights";
import GrowthPatterns from "../components/insights/GrowthPatterns";
import SelfCareReminders from "../components/insights/SelfCareReminders";
import InsightsPoster from "../components/insights/InsightsPoster";
import ImpostorPatterns from "../components/insights/ImpostorPatterns";

export default function InsightsPage() {
  const [entries, setEntries] = useState([]);
  const [insights, setInsights] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await journalService.getEntries(50);
      setEntries(data);
    } catch (error) {
      console.error("Error loading entries:", error);
    }
    setIsLoading(false);
  };

  const generateInsights = async () => {
    if (entries.length === 0) return;
    
    setIsGenerating(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const recentEntries = entries.slice(0, 10);
      
      // Extract AI-generated insights from actual entries
      const allStrengths = [];
      const allGrowthAreas = [];
      const allRecommendations = [];
      
      recentEntries.forEach(entry => {
        if (entry.ai_analysis) {
          // Extract key insights as strengths
          if (entry.ai_analysis.key_insights) {
            allStrengths.push(...entry.ai_analysis.key_insights);
          }
          
          // Extract recommendations as growth areas
          if (entry.ai_analysis.recommendations) {
            allGrowthAreas.push(...entry.ai_analysis.recommendations);
          }
        }
      });
      
      // Remove duplicates and get unique insights
      const uniqueStrengths = [...new Set(allStrengths)].slice(0, 3);
      const uniqueGrowthAreas = [...new Set(allGrowthAreas)].slice(0, 3);
      
      // Calculate average mood for patterns and encouragement
      const avgMood = recentEntries.length > 0 
        ? recentEntries.reduce((sum, e) => sum + (e.mood_score || 5), 0) / recentEntries.length 
        : 5;
      
      // Get most common emotions
      const emotionCount = {};
      recentEntries.forEach(entry => {
        (entry.emotions || []).forEach(emotion => {
          emotionCount[emotion] = (emotionCount[emotion] || 0) + 1;
        });
      });
      
      const commonEmotions = Object.entries(emotionCount)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([emotion]) => emotion);

      // Generate self-care tips
      const selfCareTips = generateSelfCareTips(avgMood, commonEmotions);
      
      const generatedInsights = {
        strengths: uniqueStrengths.length > 0 ? uniqueStrengths : generateFallbackStrengths(avgMood, commonEmotions),
        growth_areas: uniqueGrowthAreas.length > 0 ? uniqueGrowthAreas : generateFallbackGrowthAreas(avgMood, commonEmotions),
        emotional_patterns: generatePatterns(avgMood, commonEmotions),
        self_care_tips: selfCareTips,
        encouraging_message: generateEncouragement(avgMood, entries.length),
        entryCount: entries.length
      };

      setInsights(generatedInsights);

      // Store insights in DynamoDB
      try {
        await lambdaService.storeInsightsGeneration(generatedInsights);
        console.log('✅ Insights stored in DynamoDB');
      } catch (storageError) {
        console.warn('⚠️ Failed to store insights:', storageError);
      }
    } catch (error) {
      console.error("Error generating insights:", error);
    }
    
    setIsGenerating(false);
  };

  const generateFallbackStrengths = (avgMood, emotions) => {
    const strengths = [];
    
    if (avgMood >= 7) {
      strengths.push("You maintain a consistently positive outlook even through life's challenges");
      strengths.push("Your resilience in maintaining good moods shows impressive emotional strength");
    }
    
    if (emotions.includes('grateful') || emotions.includes('happy')) {
      strengths.push("You have a strong sense of gratitude and find joy in everyday moments");
    }
    
    if (emotions.includes('calm') || emotions.includes('peaceful')) {
      strengths.push("You demonstrate excellent emotional regulation and inner peace");
    }
    
    strengths.push("Your commitment to self-reflection shows deep self-awareness and wisdom");
    strengths.push("You're building healthy habits through consistent journaling and growth");
    
    return strengths.slice(0, 3);
  };

  const generateFallbackGrowthAreas = (avgMood, emotions) => {
    const areas = [];
    
    if (avgMood <= 5) {
      areas.push("Exploring techniques to boost daily mood and restore your natural energy");
      areas.push("Developing personalized strategies for managing challenging emotions with grace");
    }
    
    if (emotions.includes('anxious') || emotions.includes('worried')) {
      areas.push("Practicing mindfulness and grounding techniques to reduce anxiety patterns");
    }
    
    areas.push("Continuing to build on your self-reflection practice with compassion");
    areas.push("Exploring new self-care activities that align with your authentic needs");
    
    return areas.slice(0, 3);
  };

  const generatePatterns = (avgMood, emotions) => {
    if (avgMood >= 7) {
      return "You show a wonderful pattern of maintaining positive emotional states. Your consistency in finding joy and gratitude in daily life is a real strength that will serve you well in challenging times.";
    } else if (avgMood >= 5) {
      return "Your emotional patterns show healthy variation, indicating good emotional awareness. You experience a balanced range of feelings while maintaining overall stability.";
    } else {
      return "You're navigating some challenging emotional patterns with courage. Remember that acknowledging difficult feelings is the first step toward meaningful growth and resilience.";
    }
  };

  const generateSelfCareTips = (avgMood, emotions) => {
    const tips = [
      "Take 5 minutes each morning to set positive intentions for the day ahead",
      "Practice deep breathing whenever you feel overwhelmed or anxious",
      "Schedule regular breaks during your day to reset and recharge your energy",
      "Create a calming evening routine to promote restful, restorative sleep"
    ];
    
    if (avgMood <= 5) {
      tips.unshift("Prioritize activities that bring you genuine joy and deep relaxation");
      tips.unshift("Be gentle with yourself - progress isn't always linear, and that's okay");
    }
    
    if (emotions.includes('stressed') || emotions.includes('overwhelmed')) {
      tips.push("Connect with supportive friends or family members who uplift you");
    }
    
    return tips.slice(0, 4);
  };

  const generateEncouragement = (avgMood, entryCount) => {
    if (entryCount === 0) return "Start your journey today - every entry is a step toward greater self-understanding!";
    
    if (avgMood >= 7) {
      return "Your positive energy and self-awareness are truly inspiring! Keep nurturing this beautiful relationship with yourself.";
    } else if (avgMood >= 5) {
      return "You're doing the important work of self-discovery. Every entry, no matter the mood, contributes to your growth journey.";
    } else {
      return "Your courage in facing difficult emotions is remarkable. Remember that storms always pass, and you're building incredible resilience.";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 rounded-full flex items-center justify-center shadow-lg">
            <Sparkles className="w-8 h-8 text-white animate-pulse" />
          </div>
        </div>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-500 via-pink-600 to-indigo-600 bg-clip-text text-transparent">
          Personal Insights
        </h1>
        <p className="text-gray-600">
          Discover beautiful patterns in your emotional journey ✨
        </p>
      </div>

      {/* Generate Insights Button */}
      <div className="text-center">
        <Button
          onClick={generateInsights}
          disabled={isGenerating || entries.length === 0}
          className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-8 py-3 rounded-2xl shadow-lg hover:shadow-xl transition-all"
        >
          {isGenerating ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              Analyzing your beautiful mind...
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5" />
              Generate New Insights
            </div>
          )}
        </Button>
        
        {entries.length === 0 && (
          <p className="text-sm text-gray-500 mt-2">
            Start journaling to unlock personalized insights! 💝
          </p>
        )}
      </div>

      {/* Insights Content */}
      {insights && !isGenerating && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <PersonalInsights 
            strengths={insights.strengths}
            encouragingMessage={insights.encouraging_message}
            showCheckboxes={false}
          />

          <ImpostorPatterns />

          <GrowthPatterns
            patterns={insights.emotional_patterns}
            growthAreas={insights.growth_areas}
            showCheckboxes={false}
          />
          
          <SelfCareReminders tips={insights.self_care_tips} />

          {/* Beautiful Insights Poster */}
          <InsightsPoster 
            strengths={insights.strengths}
            growthAreas={insights.growth_areas}
            tips={insights.self_care_tips}
            encouragingMessage={insights.encouraging_message}
            entries={entries}
          />
        </motion.div>
      )}

      {!insights && !isGenerating && entries.length > 0 && (
        <Card className="border-pink-200 text-center p-8 shadow-lg">
          <Sparkles className="w-12 h-12 text-pink-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Ready for Insights!</h3>
          <p className="text-gray-600">Click the button above to generate personalized insights based on your journal entries.</p>
        </Card>
      )}
    </div>
  );
}