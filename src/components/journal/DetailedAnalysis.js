import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";
import { Button } from "../ui/Button";
import { Brain, Activity, ChevronDown, ChevronUp, AlertTriangle, Sparkles, Cpu, Lightbulb, Target, CheckCircle2, Circle, TrendingUp, Heart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function DetailedAnalysis({ entry, aiAnalysis }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [checkedRecommendations, setCheckedRecommendations] = useState({});
  const [checkedInsights, setCheckedInsights] = useState({});

  const localAiAnalysis = aiAnalysis;
  const isAnalyzing = !aiAnalysis; 

  const toggleRecommendation = (index) => {
    setCheckedRecommendations(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const toggleInsight = (index) => {
    setCheckedInsights(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };
  
  const getMoodColor = (mood) => {
    if (mood >= 8) return {
      gradient: "from-green-100 via-emerald-100 to-teal-100",
      border: "border-green-400",
      text: "text-green-900",
      iconBg: "from-green-400 to-emerald-500"
    };
    if (mood >= 6) return {
      gradient: "from-blue-100 via-cyan-100 to-sky-100",
      border: "border-blue-400",
      text: "text-blue-900",
      iconBg: "from-blue-400 to-cyan-500"
    };
    if (mood >= 4) return {
      gradient: "from-yellow-100 via-amber-100 to-orange-100",
      border: "border-yellow-400",
      text: "text-yellow-900",
      iconBg: "from-yellow-400 to-amber-500"
    };
    return {
      gradient: "from-red-100 via-pink-100 to-rose-100",
      border: "border-red-400",
      text: "text-red-900",
      iconBg: "from-red-400 to-pink-500"
    };
  };

  const getMoodDescription = (mood) => {
    if (mood >= 8) return "High positive mood - You're feeling great!";
    if (mood >= 6) return "Good mood - Things are going well";
    if (mood >= 4) return "Neutral mood - Balanced emotional state";
    return "Low mood - You may need some extra support";
  };

  const moodColors = getMoodColor(entry.mood_score);

  return (
    <Card className="border-2 border-indigo-300 bg-white/90 backdrop-blur-sm shadow-2xl overflow-hidden relative">
      {/* Decorative glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-purple-200/20 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-pink-200/20 rounded-full blur-3xl" />
      
      <CardHeader className="pb-6 border-b-2 border-indigo-100 bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 relative">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-4 text-gray-900">
            <motion.div 
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="p-3 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-2xl shadow-lg"
            >
              <Brain className="w-7 h-7 text-white" />
            </motion.div>
            <div>
              <div className="text-2xl font-bold">Detailed Analysis & Insights</div>
              <div className="text-sm text-gray-600 font-normal">AI-powered understanding of your journey</div>
            </div>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors p-3"
          >
            {isExpanded ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
          </Button>
        </div>
      </CardHeader>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
          >
            <CardContent className="space-y-10 pt-8 pb-8 relative">
              {/* Mood Analysis */}
              <div className="space-y-5">
                <h3 className="font-bold text-gray-900 flex items-center gap-3 text-xl">
                  <div className="p-2 bg-gradient-to-br from-pink-400 to-rose-500 rounded-xl">
                    <Activity className="w-6 h-6 text-white" />
                  </div>
                  Emotional Analysis
                </h3>
                <div className="grid md:grid-cols-2 gap-5">
                  <motion.div 
                    whileHover={{ scale: 1.02, y: -5 }}
                    className={`p-6 rounded-3xl border-2 ${moodColors.border} bg-gradient-to-br ${moodColors.gradient} shadow-xl relative overflow-hidden`}
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/20 rounded-full blur-2xl" />
                    <div className="relative">
                      <div className="flex items-center justify-between mb-4">
                        <span className={`font-bold text-lg ${moodColors.text}`}>Mood Score</span>
                        <div className={`p-3 bg-gradient-to-br ${moodColors.iconBg} rounded-2xl shadow-lg`}>
                          <Heart className="w-6 h-6 text-white" />
                        </div>
                      </div>
                      <div className={`text-5xl font-black mb-3 ${moodColors.text}`}>
                        {entry.mood_score}/10
                      </div>
                      <p className={`text-sm ${moodColors.text} font-medium leading-relaxed`}>
                        {getMoodDescription(entry.mood_score)}
                      </p>
                    </div>
                  </motion.div>
                  
                  {entry.emotions && entry.emotions.length > 0 && (
                    <motion.div 
                      whileHover={{ scale: 1.02, y: -5 }}
                      className="p-6 bg-gradient-to-br from-purple-100 via-pink-100 to-fuchsia-100 rounded-3xl border-2 border-purple-400 shadow-xl relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 w-24 h-24 bg-white/20 rounded-full blur-2xl" />
                      <div className="relative">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="p-2 bg-gradient-to-br from-purple-400 to-fuchsia-500 rounded-xl">
                            <Sparkles className="w-5 h-5 text-white" />
                          </div>
                          <h4 className="font-bold text-gray-900 text-lg">Emotions Identified</h4>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {entry.emotions.map((emotion, i) => (
                            <motion.span 
                              key={i}
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: i * 0.05 }}
                              whileHover={{ scale: 1.1, y: -2 }}
                              className="px-4 py-2 bg-white/90 backdrop-blur-sm rounded-full text-sm font-bold border-2 border-purple-300 text-purple-800 shadow-md"
                            >
                              {emotion}
                            </motion.span>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>

              {/* AI Analysis Section */}
              <div className="space-y-5">
                <h3 className="font-bold text-gray-900 flex items-center gap-3 text-xl">
                  <div className="p-2 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-xl">
                    <Brain className="w-6 h-6 text-white" />
                  </div>
                  Personal Insights
                </h3>
                
                {isAnalyzing ? (
                  <div className="bg-gradient-to-br from-purple-100 via-blue-100 to-indigo-100 p-12 rounded-3xl border-2 border-purple-400 text-center shadow-xl">
                    <div className="animate-pulse flex flex-col items-center gap-5">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="relative"
                      >
                        <Cpu className="w-16 h-16 text-purple-600" />
                        <motion.div
                          animate={{ scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                          className="absolute -top-2 -right-2"
                        >
                          <Sparkles className="w-8 h-8 text-pink-500" />
                        </motion.div>
                      </motion.div>
                      <div className="space-y-3">
                        <p className="text-purple-900 font-bold text-xl">Reading your thoughts carefully...</p>
                        <p className="text-purple-700 text-base">Understanding your unique situation</p>
                      </div>
                    </div>
                  </div>
                ) : localAiAnalysis ? (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-7"
                  >
                    {/* Overall Analysis */}
                    <motion.div 
                      whileHover={{ scale: 1.01 }}
                      className="bg-gradient-to-br from-teal-100 via-cyan-100 to-blue-100 p-7 rounded-3xl border-2 border-teal-400 shadow-xl relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full blur-2xl" />
                      <p className="text-gray-900 leading-relaxed text-lg font-medium relative">{localAiAnalysis.overall_analysis}</p>
                    </motion.div>
                    
                    {/* Imposter Syndrome */}
                    {localAiAnalysis.imposter_syndrome_detected && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        whileHover={{ scale: 1.01 }}
                        className="p-7 bg-gradient-to-br from-orange-100 to-amber-100 rounded-3xl border-l-4 border-orange-500 shadow-xl"
                      >
                        <div className="flex items-center gap-4 mb-4">
                          <div className="p-3 bg-gradient-to-br from-orange-400 to-amber-500 rounded-2xl shadow-lg">
                            <AlertTriangle className="w-7 h-7 text-white" />
                          </div>
                          <p className="text-orange-950 font-bold text-xl">Patterns Noticed</p>
                        </div>
                        <p className="text-orange-900 leading-relaxed text-base font-medium mb-4">
                          I'm noticing some self-doubt patterns that many high-achievers experience. 
                          This doesn't reflect your actual capabilities.
                        </p>
                        <div className="mt-4 px-4 py-3 bg-orange-200/50 rounded-2xl border border-orange-300">
                          <p className="text-sm text-orange-800 font-bold">
                            Confidence: {Math.round(localAiAnalysis.imposter_confidence * 100)}% match with imposter syndrome patterns
                          </p>
                        </div>
                      </motion.div>
                    )}
                    
                    {/* Key Insights */}
                    <div className="space-y-5">
                      <h4 className="font-bold text-gray-900 flex items-center gap-3 text-lg">
                        <div className="p-2 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-xl">
                          <Lightbulb className="w-6 h-6 text-white" />
                        </div>
                        What Stands Out
                      </h4>
                      <div className="space-y-3">
                        {localAiAnalysis.key_insights.map((insight, i) => (
                          <motion.div 
                            key={i}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.1 }}
                            onClick={() => toggleInsight(i)}
                            whileHover={{ scale: 1.02, x: 5 }}
                            className={`flex items-start gap-4 p-5 rounded-2xl border-2 cursor-pointer transition-all duration-300 ${
                              checkedInsights[i] 
                                ? 'bg-gradient-to-r from-blue-200 to-blue-100 border-blue-500 shadow-xl' 
                                : 'bg-gradient-to-r from-white to-blue-50/50 border-gray-300 hover:border-blue-400 hover:shadow-lg'
                            }`}
                          >
                            <div className="flex-shrink-0 mt-1">
                              {checkedInsights[i] ? (
                                <motion.div
                                  initial={{ scale: 0, rotate: -180 }}
                                  animate={{ scale: 1, rotate: 0 }}
                                  transition={{ type: "spring", stiffness: 300 }}
                                >
                                  <CheckCircle2 className="w-7 h-7 text-blue-700" />
                                </motion.div>
                              ) : (
                                <Circle className="w-7 h-7 text-gray-400" />
                              )}
                            </div>
                            <p className={`text-gray-800 leading-relaxed flex-1 text-base ${checkedInsights[i] ? 'line-through text-gray-500' : ''}`}>
                              {insight}
                            </p>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Recommendations */}
                    <div className="space-y-5">
                      <h4 className="font-bold text-gray-900 flex items-center gap-3 text-lg">
                        <div className="p-2 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl">
                          <Target className="w-6 h-6 text-white" />
                        </div>
                        Suggestions for You
                      </h4>
                      <div className="space-y-3">
                        {localAiAnalysis.recommendations.map((rec, i) => (
                          <motion.div 
                            key={i}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.1 + 0.3 }}
                            onClick={() => toggleRecommendation(i)}
                            whileHover={{ scale: 1.02, x: 5 }}
                            className={`flex items-start gap-4 p-5 rounded-2xl border-2 cursor-pointer transition-all duration-300 ${
                              checkedRecommendations[i] 
                                ? 'bg-gradient-to-r from-green-300 to-emerald-200 border-green-600 shadow-xl' 
                                : 'bg-gradient-to-r from-green-100 to-emerald-100 border-green-400 hover:border-green-500 hover:shadow-lg'
                            }`}
                          >
                            <div className="flex-shrink-0 mt-1">
                              {checkedRecommendations[i] ? (
                                <motion.div
                                  initial={{ scale: 0, rotate: -180 }}
                                  animate={{ scale: 1, rotate: 0 }}
                                  transition={{ type: "spring", stiffness: 300 }}
                                >
                                  <CheckCircle2 className="w-7 h-7 text-green-800" />
                                </motion.div>
                              ) : (
                                <Circle className="w-7 h-7 text-green-600" />
                              )}
                            </div>
                            <p className={`text-gray-800 leading-relaxed flex-1 text-base ${checkedRecommendations[i] ? 'line-through text-gray-500' : ''}`}>
                              {rec}
                            </p>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                ) : null}
              </div>
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}