import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";
import { Button } from "../ui/Button";
import { Brain, Activity, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function DetailedAnalysis({ entry }) {
  const [isExpanded, setIsExpanded] = useState(true);

  const getMoodColor = (mood) => {
    if (mood >= 8) return "bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border-green-200";
    if (mood >= 6) return "bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-800 border-blue-200";
    if (mood >= 4) return "bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-800 border-yellow-200";
    return "bg-gradient-to-r from-red-100 to-pink-100 text-red-800 border-red-200";
  };

  const getMoodDescription = (mood) => {
    if (mood >= 8) return "High positive mood - You're feeling great!";
    if (mood >= 6) return "Good mood - Things are going well";
    if (mood >= 4) return "Neutral mood - Balanced emotional state";
    return "Low mood - You may need some extra support";
  };

  return (
    <Card className="border-blue-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-gray-700">
            <Brain className="w-5 h-5 text-blue-500" />
            Detailed Analysis & Insights
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-500 hover:text-blue-600"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
      </CardHeader>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <CardContent className="space-y-6">
              {/* Mood Analysis */}
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-500" />
                  Emotional Analysis
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className={`p-4 rounded-xl border-2 ${getMoodColor(entry.mood_score)}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Mood Score</span>
                      <span className="text-2xl font-bold">{entry.mood_score}/10</span>
                    </div>
                    <p className="text-sm">{getMoodDescription(entry.mood_score)}</p>
                  </div>
                  
                  {entry.emotions && entry.emotions.length > 0 && (
                    <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border-2 border-purple-200">
                      <h4 className="font-medium text-gray-800 mb-2">Emotions Identified</h4>
                      <div className="flex flex-wrap gap-2">
                        {entry.emotions.map((emotion, i) => (
                          <span key={i} className="px-3 py-1 bg-white rounded-full text-sm border border-purple-200">
                            {emotion}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* AI Insights */}
              {entry.ai_insights && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-800">Professional Insights</h3>
                  <div className="bg-gradient-to-r from-teal-50 to-blue-50 p-4 rounded-xl border-2 border-teal-200">
                    <p className="text-gray-700 leading-relaxed italic">"{entry.ai_insights}"</p>
                  </div>
                </div>
              )}

              {/* Audio Analysis */}
              {entry.audio_analysis && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-800">Voice Analysis</h3>
                  <div className="p-4 bg-green-50 rounded-xl border-2 border-green-200">
                    <h4 className="font-medium text-green-800 mb-2">Voice Patterns</h4>
                    <div className="space-y-1 text-sm">
                      {entry.audio_analysis.stress_level && (
                        <p><span className="font-medium">Stress Level:</span> {entry.audio_analysis.stress_level}</p>
                      )}
                      {entry.audio_analysis.vocal_stress_indicators && (
                        <p><span className="font-medium">Analysis:</span> {entry.audio_analysis.vocal_stress_indicators}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Critical Alerts Summary */}
              {entry.critical_alerts && entry.critical_alerts.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-800">Areas of Focus</h3>
                  <div className="p-3 bg-yellow-50 rounded-xl border-2 border-yellow-200">
                    <p className="text-sm text-yellow-800">
                      We've identified some areas where you might benefit from additional support. 
                      Please review the resources provided above.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}