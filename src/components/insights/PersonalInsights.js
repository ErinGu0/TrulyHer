import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";
import { Heart, Star, TrendingDown, Sparkles, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { journalService } from "../../services/journalService";
import { geminiAnalysisService } from "../../services/geminiAnalysisService";

export default function PersonalInsights() {
  const [insights, setInsights] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    generatePersonalizedInsights();
  }, []);

  const generatePersonalizedInsights = async () => {
    setIsLoading(true);

    if (!process.env.REACT_APP_GEMINI_API_KEY) {
      setInsights({
        encouragingMessage: "Your journal is working locally. Add a Gemini API key to unlock AI-generated insights.",
        strengths: [
          "You are building self-awareness through reflection",
          "You are showing consistency by journaling"
        ],
        growth_areas: [
          "Consider adding a Gemini API key for richer insights",
          "Keep capturing entries to build a fuller picture over time"
        ]
      });
      setIsLoading(false);
      return;
    }

    try {
      // Get recent journal entries
      const entries = await journalService.getEntries(20);
      
      if (entries.length === 0) {
        setInsights({
          encouragingMessage: "Start your journaling journey today! Every entry helps you understand yourself better.",
          strengths: [],
          weaknesses: []
        });
        setIsLoading(false);
        return;
      }

      // Prepare data for AI analysis
      const recentContent = entries.slice(0, 10).map(e => e.content).join("\n\n---\n\n");
      const avgMood = entries.reduce((sum, e) => sum + (e.mood_score || 5), 0) / entries.length;
      const allEmotions = entries.flatMap(e => e.emotions || []);
      const emotionCounts = {};
      allEmotions.forEach(emotion => {
        emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
      });

      // Call Gemini API for personalized insights
      const systemPrompt = `You are a compassionate personal development analyst. Analyze the user's journal entries and provide personalized insights in SECOND PERSON (using "you", "your").

Based on their journal history, identify:
1. Three specific strengths they've demonstrated (be concrete and specific based on their actual entries)
2. Three growth areas where they could improve (frame constructively, not negatively)
3. One encouraging, personalized message (2-3 sentences)

Average mood: ${avgMood.toFixed(1)}/10
Most common emotions: ${Object.entries(emotionCounts).sort((a,b) => b[1] - a[1]).slice(0, 5).map(([e]) => e).join(", ")}
Number of entries: ${entries.length}

Output ONLY valid JSON in this exact structure:
{
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "growth_areas": ["area 1", "area 2", "area 3"],
  "encouraging_message": "Your personalized encouraging message here"
}

Make it personal, specific, and based on their actual patterns. Use "you" and "your" throughout.`;

      const response = await fetch("/api/gemini", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          type: "insights",
          payload: {
            prompt: `Recent journal entries:\n${recentContent.substring(0, 3000)}`,
            systemPrompt
          }
        })
      });

      const data = await response.json();
      const resultText = data?.data?.text || data?.data;
      
      if (resultText) {
        const parsedInsights = typeof resultText === 'string' ? JSON.parse(resultText) : resultText;
        setInsights(parsedInsights);
      } else {
        throw new Error("No insights generated");
      }
    } catch (error) {
      console.error("Error generating insights:", error);
      // Fallback to basic insights
      setInsights({
        encouragingMessage: "You're doing great by taking time to reflect on yourself! Keep up the amazing work.",
        strengths: [
          "You show dedication by consistently journaling",
          "You're building self-awareness through reflection",
          "You demonstrate courage by being honest with yourself"
        ],
        growth_areas: [
          "Consider exploring new coping strategies",
          "Try to identify patterns in your emotional responses",
          "Practice self-compassion during difficult moments"
        ]
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="border-2 border-purple-200 bg-gradient-to-br from-white to-purple-50 shadow-xl">
        <CardContent className="p-12 text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 mx-auto mb-4"
          >
            <Loader2 className="w-16 h-16 text-purple-600" />
          </motion.div>
          <p className="text-purple-700 font-semibold text-lg">Analyzing your journey...</p>
          <p className="text-purple-600 text-sm mt-2">Discovering your unique patterns</p>
        </CardContent>
      </Card>
    );
  }

  if (!insights) return null;

  return (
    <div className="space-y-6">
      {/* Encouraging Message */}
      {insights.encouragingMessage && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-2 border-pink-300 bg-gradient-to-br from-pink-50 via-rose-50 to-purple-50 shadow-xl overflow-hidden relative">
            <div className="absolute top-0 right-0 w-48 h-48 bg-pink-200/30 rounded-full blur-3xl" />
            <CardContent className="p-8 relative">
              <div className="flex items-start gap-4 mb-4">
                <motion.div
                  animate={{ 
                    scale: [1, 1.1, 1],
                    rotate: [0, 5, -5, 0]
                  }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="p-3 bg-gradient-to-br from-pink-400 to-rose-500 rounded-2xl shadow-lg flex-shrink-0"
                >
                  <Heart className="w-7 h-7 text-white" />
                </motion.div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">A Message for You</h3>
                  <p className="text-gray-700 leading-relaxed text-lg italic">
                    "{insights.encouragingMessage}"
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Strengths & Growth Areas Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Strengths */}
        {insights.strengths && insights.strengths.length > 0 && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="border-2 border-yellow-300 bg-gradient-to-br from-white to-yellow-50 shadow-xl h-full">
              <CardHeader className="border-b-2 border-yellow-200 bg-gradient-to-r from-yellow-50 to-amber-50 pb-4">
                <CardTitle className="flex items-center gap-3 text-gray-900">
                  <div className="p-2 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-xl shadow-md">
                    <Star className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="text-xl font-bold">Your Beautiful Strengths</div>
                    <div className="text-sm text-gray-600 font-normal">What makes you amazing</div>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {insights.strengths.map((strength, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + index * 0.1 }}
                    className="p-5 rounded-2xl bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-200"
                  >
                    <p className="text-gray-800 leading-relaxed text-base">
                      {strength}
                    </p>
                  </motion.div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Growth Areas (Weaknesses) */}
        {insights.growth_areas && insights.growth_areas.length > 0 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="border-2 border-indigo-300 bg-gradient-to-br from-white to-indigo-50 shadow-xl h-full">
              <CardHeader className="border-b-2 border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50 pb-4">
                <CardTitle className="flex items-center gap-3 text-gray-900">
                  <div className="p-2 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-xl shadow-md">
                    <TrendingDown className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="text-xl font-bold">Growth Opportunities</div>
                    <div className="text-sm text-gray-600 font-normal">Areas to explore</div>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {insights.growth_areas.map((area, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + index * 0.1 }}
                    className="p-5 rounded-2xl bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200"
                  >
                    <p className="text-gray-800 leading-relaxed text-base">
                      {area}
                    </p>
                  </motion.div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}