import React, { useState, useEffect, useRef, useCallback } from "react";
import { Smile, Meh, Frown, Loader2, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function MoodIndicator({ text, onMoodScoreChange }) {
  const [mood, setMood] = useState(null);
  const [moodScore, setMoodScore] = useState(5);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const timeoutRef = useRef(null);
  
  const analyzeMoodWithAI = useCallback(async (textToAnalyze) => {
    if (!textToAnalyze || textToAnalyze.trim().length < 15) return;

    // Mood scoring runs entirely through /api/gemini; if the server has no key
    // the request fails and the catch below falls back to a neutral score.
    setIsAnalyzing(true);
    try {
      const prompt = `
      Analyze the emotional tone of this journal entry and return ONLY a single number between 1-10.
      
      Scoring guide:
      1-2: Extremely negative (depressed, hopeless, devastated)
      3-4: Very negative (sad, angry, distressed) 
      5-6: Neutral or mixed emotions
      7-8: Positive (happy, content, optimistic)
      9-10: Very positive (joyful, excited, ecstatic)
      
      Journal entry: "${textToAnalyze}"
      
      Return ONLY the number, no other text.`;

      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'mood',
          payload: { prompt }
        })
      });

      const result = await response.json();
      const scoreText = result?.data?.text || result?.data || '';
      console.log("📊 AI returned:", scoreText); // DEBUG
      
      const score = parseInt(scoreText);
      
      if (score >= 1 && score <= 10) {
        setMoodScore(score);
        onMoodScoreChange?.(score);
        
        let newMood;
        if (score >= 8) newMood = 'positive';
        else if (score <= 4) newMood = 'negative';
        else newMood = 'neutral';
        
        setMood(newMood);
        
        console.log("✅ Mood set:", { score, mood: newMood }); // DEBUG
      } else {
        throw new Error(`Invalid score returned: ${scoreText}`);
      }
    } catch (error) {
      console.error('❌ AI Mood analysis failed:', error); // DEBUG
      setMood('neutral');
      setMoodScore(5);
      onMoodScoreChange?.(5);
    } finally {
      setIsAnalyzing(false);
    }
  }, [onMoodScoreChange]);
  
  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (!text || text.trim().length < 15) {
      setMood(null);
      setMoodScore(5);
      onMoodScoreChange?.(5);
      return;
    }

    timeoutRef.current = setTimeout(() => {
      analyzeMoodWithAI(text);
    }, 1500);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [text, onMoodScoreChange, analyzeMoodWithAI]);

  if (!text || text.trim().length < 15) return null;

  const getMoodConfig = () => {
    if (mood === 'positive') {
      return {
        icon: Smile,
        color: 'text-green-600',
        bgGradient: 'from-green-400 to-emerald-500',
        borderColor: 'border-green-300',
        bg: 'bg-gradient-to-br from-green-50 to-emerald-50',
        label: 'Positive',
        emoji: '😊'
      };
    } else if (mood === 'negative') {
      return {
        icon: Frown,
        color: 'text-red-600',
        bgGradient: 'from-red-400 to-pink-500',
        borderColor: 'border-red-300',
        bg: 'bg-gradient-to-br from-red-50 to-pink-50',
        label: 'Challenging',
        emoji: '😔'
      };
    } else {
      return {
        icon: Meh,
        color: 'text-yellow-600',
        bgGradient: 'from-yellow-400 to-amber-500',
        borderColor: 'border-yellow-300',
        bg: 'bg-gradient-to-br from-yellow-50 to-amber-50',
        label: 'Neutral',
        emoji: '😐'
      };
    }
  };

  const config = getMoodConfig();
  const Icon = config.icon;

  return (
    <AnimatePresence mode="wait">
      {isAnalyzing ? (
        <motion.div
          key="analyzing"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className="flex items-center gap-3 px-5 py-3 rounded-2xl border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50 shadow-lg backdrop-blur-sm"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <Loader2 className="w-6 h-6 text-purple-600" />
          </motion.div>
          <div className="flex flex-col">
            <span className="font-bold text-sm text-purple-700">AI analyzing...</span>
            <span className="text-xs text-purple-600">Reading your emotions</span>
          </div>
          <motion.div
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.5, 1, 0.5]
            }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <Sparkles className="w-5 h-5 text-pink-500" />
          </motion.div>
        </motion.div>
      ) : (
        <motion.div
          key="result"
          initial={{ opacity: 0, scale: 0.8, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8 }}
          whileHover={{ scale: 1.05 }}
          className={`flex items-center gap-3 px-5 py-3 rounded-2xl border-2 ${config.borderColor} ${config.bg} shadow-xl backdrop-blur-sm`}
        >
          <motion.div
            animate={{ 
              rotate: [0, 10, -10, 0],
              scale: [1, 1.1, 1]
            }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            className={`p-2 bg-gradient-to-br ${config.bgGradient} rounded-xl shadow-md`}
          >
            <Icon className="w-6 h-6 text-white" />
          </motion.div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className={`font-bold text-lg ${config.color}`}>
                {config.label}
              </span>
              <span className="text-2xl">{config.emoji}</span>
            </div>
            <span className={`text-sm font-semibold ${config.color}`}>
              {moodScore}/10
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}