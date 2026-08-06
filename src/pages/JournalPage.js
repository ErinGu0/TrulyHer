import React, { useState, useRef } from "react";
import { journalService } from "../services/journalService";
import { geminiAnalysisService } from "../services/geminiAnalysisService";
import { Button } from "../components/ui/Button";
import { Card, CardContent, CardHeader } from "../components/ui/Card";
import { Textarea } from "../components/ui/Textarea";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Sparkles, Loader2, Send, Moon, Sun, Cloud, Star } from "lucide-react";

import VoiceRecorder from "../components/journal/VoiceRecorder";
import MoodIndicator from "../components/journal/MoodIndicator";
import EntrySubmittedAnimation from "../components/journal/EntrySubmittedAnimation";
import UrgentSupport from "../components/journal/UrgentSupport";
import DailyTask from "../components/journal/DailyTask";
import DetailedAnalysis from "../components/journal/DetailedAnalysis";

export default function JournalPage() {
  const [content, setContent] = useState("");
  const [moodScore, setMoodScore] = useState(5);
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastEntry, setLastEntry] = useState(null);
  const [audioAnalysis, setAudioAnalysis] = useState(null);
  const [showSubmittedAnimation, setShowSubmittedAnimation] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  
  const moodScoreRef = useRef(5);

  const handleLiveTranscription = (transcription) => {
    setContent(transcription);
  };

  const handleAudioAnalysis = (analysis) => {
    setAudioAnalysis(analysis);
  };

  const handleMoodScoreChange = (score) => {
    moodScoreRef.current = score;
    setMoodScore(score);
  };

  const analyzeAndSave = async () => {
    if (!content.trim()) return;
    
    setIsAnalyzing(true);
    console.log('Starting AI analysis with mood score:', moodScoreRef.current);
    
    try {
      const analysis = await geminiAnalysisService.analyzeJournalEntry(
        content, 
        moodScoreRef.current,
        []
      );

      console.log('AI analysis completed (Structured):', analysis);
      setAiAnalysis(analysis);

      let criticalAlerts = [];
      if (analysis.imposter_syndrome_detected) {
          criticalAlerts.push('imposter_syndrome');
      }
      if (analysis.urgent_support_needed) {
          criticalAlerts.push('urgent_support');
      }

      const newEntry = {
        content: content.trim(),
        mood_score: moodScoreRef.current,
        emotions: analysis.detected_emotions || [],
        ai_insights: analysis.overall_analysis,
        critical_alerts: criticalAlerts,
        // Don't duplicate recommendations in suggested_task
        suggested_task: null,
        entry_date: new Date().toISOString(),
        audio_analysis: audioAnalysis,
        imposter_syndrome_detected: analysis.imposter_syndrome_detected
      };

      const savedEntry = await journalService.createEntry(newEntry);
      
      setLastEntry(savedEntry);
      setShowSubmittedAnimation(true);
      setContent("");
      setAudioAnalysis(null);
      setMoodScore(5);
      moodScoreRef.current = 5;
      
    } catch (error) {
      console.error("Error saving journal entry:", error);
      console.error("Sorry, there was an error analyzing your entry. Please check your API key and try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  const resetState = () => {
    setLastEntry(null);
    setShowSubmittedAnimation(false);
    setAiAnalysis(null);
    setMoodScore(5);
    moodScoreRef.current = 5;
  };

  // Results view - only show DailyTask once
  if (lastEntry && !showSubmittedAnimation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 py-8 px-4">
        <motion.div 
          initial={{ opacity: 0, y: 30 }} 
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="max-w-4xl mx-auto space-y-6"
        >
          {/* Celebration Header */}
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-center space-y-4 mb-8"
          >
            <div className="flex justify-center">
              <motion.div 
                animate={{ 
                  rotate: [0, 10, -10, 0],
                  scale: [1, 1.1, 1]
                }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                className="relative"
              >
                <div className="w-20 h-20 bg-gradient-to-br from-green-400 via-emerald-400 to-teal-500 rounded-full flex items-center justify-center shadow-2xl">
                  <Sparkles className="w-10 h-10 text-white" />
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-xl">✨</span>
                </div>
              </motion.div>
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 bg-clip-text text-transparent">
              Your Journey Continues
            </h1>
            <p className="text-gray-600 text-lg">Here's what I learned about your experience today</p>
          </motion.div>

          {/* Urgent Support Alert */}
          {aiAnalysis?.imposter_syndrome_detected && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <UrgentSupport alerts={lastEntry.critical_alerts} />
            </motion.div>
          )}
          
          {/* Detailed Analysis - includes recommendations */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <DetailedAnalysis entry={lastEntry} aiAnalysis={aiAnalysis} />
          </motion.div>
          
          {/* Action Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="pt-4"
          >
            <Button 
              onClick={resetState} 
              className="w-full bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500 text-white rounded-2xl py-6 text-lg font-semibold shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all duration-300"
            >
              <div className="flex items-center justify-center gap-3">
                <Heart className="w-6 h-6" />
                Write Another Entry
                <Sparkles className="w-5 h-5" />
              </div>
            </Button>
          </motion.div>
        </motion.div>
      </div>
    );
  }
  
  // Animation view
  if (showSubmittedAnimation) {
    return <EntrySubmittedAnimation onComplete={() => setShowSubmittedAnimation(false)} />;
  }

  // Main journal entry view
  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-orange-50 py-8 px-4 relative overflow-hidden">
      {/* Decorative floating elements */}
      <div className="absolute top-20 left-10 opacity-20">
        <motion.div
          animate={{ 
            y: [0, -20, 0],
            rotate: [0, 10, 0]
          }}
          transition={{ duration: 6, repeat: Infinity }}
        >
          <Cloud className="w-16 h-16 text-pink-300" />
        </motion.div>
      </div>
      <div className="absolute top-40 right-20 opacity-20">
        <motion.div
          animate={{ 
            y: [0, 20, 0],
            rotate: [0, -10, 0]
          }}
          transition={{ duration: 5, repeat: Infinity }}
        >
          <Star className="w-12 h-12 text-yellow-400" />
        </motion.div>
      </div>
      <div className="absolute bottom-20 right-10 opacity-20">
        <motion.div
          animate={{ 
            y: [0, -15, 0],
            x: [0, 10, 0]
          }}
          transition={{ duration: 7, repeat: Infinity }}
        >
          <Heart className="w-14 h-14 text-rose-300" />
        </motion.div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }}
        className="max-w-3xl mx-auto space-y-8 relative z-10"
      >
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="text-center space-y-4"
        >
          <div className="flex justify-center">
            <motion.div 
              animate={{ 
                scale: [1, 1.05, 1],
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className="relative"
            >
              <div className="w-20 h-20 bg-gradient-to-br from-pink-400 via-rose-400 to-orange-400 rounded-full flex items-center justify-center shadow-2xl">
                <Heart className="w-10 h-10 text-white" />
              </div>
              <motion.div
                animate={{ 
                  rotate: 360,
                  scale: [1, 1.2, 1]
                }}
                transition={{ duration: 3, repeat: Infinity }}
                className="absolute -top-1 -right-1"
              >
                <Sparkles className="w-6 h-6 text-yellow-400" />
              </motion.div>
            </motion.div>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-orange-600 bg-clip-text text-transparent">
            How are you feeling today?
          </h1>
          <p className="text-gray-600 text-lg max-w-xl mx-auto leading-relaxed">
            This is your safe space to reflect, process, and grow. Your thoughts and experiences matter ✨
          </p>
        </motion.div>

        {/* Main Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-2 border-pink-200 shadow-2xl backdrop-blur-sm bg-white/90 overflow-hidden">
            <CardHeader className="text-center pb-4 bg-gradient-to-r from-pink-50 to-orange-50">
              <div className="flex items-center justify-center gap-3">
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                >
                  <Sparkles className="w-6 h-6 text-orange-500" />
                </motion.div>
                <h2 className="text-2xl font-bold text-gray-800">Today's Reflection</h2>
                <motion.div
                  animate={{ rotate: [0, -10, 10, 0] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                >
                  <Sparkles className="w-6 h-6 text-pink-500" />
                </motion.div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-6 p-8">
              {/* Textarea with floating mood */}
              <div className="relative">
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Share what's on your mind, your challenges, victories, or anything you need to process... 💭"
                  className="min-h-[200px] border-2 border-pink-200 focus:border-pink-400 bg-gradient-to-br from-white to-pink-50/30 rounded-2xl text-lg p-6 resize-none transition-all duration-300 focus:shadow-lg"
                  rows={8}
                />
                <AnimatePresence>
                  {content && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="absolute bottom-4 right-4"
                    >
                      <MoodIndicator 
                        text={content} 
                        onMoodScoreChange={handleMoodScoreChange} 
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Voice Recorder */}
              <VoiceRecorder 
                onLiveTranscription={handleLiveTranscription}
                onAudioAnalysis={handleAudioAnalysis}
                isRecording={isRecording}
                setIsRecording={setIsRecording}
                currentContent={content}
              />

              {/* Submit Button */}
              <Button
                onClick={analyzeAndSave}
                disabled={!content.trim() || isAnalyzing || isRecording}
                className="w-full bg-gradient-to-r from-pink-500 via-rose-500 to-orange-500 text-white rounded-2xl py-6 text-xl font-bold hover:from-pink-600 hover:via-rose-600 hover:to-orange-600 disabled:from-gray-300 disabled:to-gray-400 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl disabled:hover:scale-100 disabled:cursor-not-allowed shadow-xl"
              >
                {isAnalyzing ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center justify-center gap-3"
                  >
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span>AI is analyzing your thoughts...</span>
                    <Sparkles className="w-5 h-5 animate-pulse" />
                  </motion.div>
                ) : (
                  <div className="flex items-center justify-center gap-3">
                    <Send className="w-6 h-6" />
                    <span>Save My Reflection</span>
                    <Heart className="w-5 h-5" />
                  </div>
                )}
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Encouraging footer text */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center text-gray-500 text-sm italic"
        >
          Every entry is a step toward understanding yourself better 🌸
        </motion.p>
      </motion.div>
    </div>
  );
}