import React, { useState } from "react";
import { journalService } from "../services/journalService";
import { mockAiService } from "../services/mockAiService";
import { Button } from "../components/ui/Button";
import { Card, CardContent, CardHeader } from "../components/ui/Card";
import { Textarea } from "../components/ui/Textarea";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Sparkles, Loader2, Send } from "lucide-react";

import VoiceRecorder from "../components/journal/VoiceRecorder";
import MoodIndicator from "../components/journal/MoodIndicator";
import EntrySubmittedAnimation from "../components/journal/EntrySubmittedAnimation";
import UrgentSupport from "../components/journal/UrgentSupport";
import DailyTask from "../components/journal/DailyTask";
import DetailedAnalysis from "../components/journal/DetailedAnalysis";

const awardBadge = async (user, badgeId) => {
  if (!user || user.badges?.some(b => b.id === badgeId)) return;

  const badgeDefinitions = {
    first_entry: { name: "First Step", description: "You've started your empowering journey." },
  };

  const badge = badgeDefinitions[badgeId];
  if (!badge) return;

  const newBadge = {
    id: badgeId,
    name: badge.name,
    description: badge.description,
    date_earned: new Date().toISOString()
  };

  const updatedBadges = [...(user.badges || []), newBadge];
  await journalService.updateUser({ ...user, badges: updatedBadges });
};

export default function JournalPage() {
  const [content, setContent] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastEntry, setLastEntry] = useState(null);
  const [audioAnalysis, setAudioAnalysis] = useState(null);
  const [showSubmittedAnimation, setShowSubmittedAnimation] = useState(false);

  const handleLiveTranscription = (transcription) => {
    setContent(transcription);
  };

  const handleAudioAnalysis = (analysis) => {
    setAudioAnalysis(analysis);
  };

  const analyzeAndSave = async () => {
    if (!content.trim()) return;
    setIsAnalyzing(true);
    
    try {
      const analysis = await mockAiService.analyzeJournalEntry(content, audioAnalysis);

      const newEntry = {
        content: content.trim(),
        mood_score: analysis.mood_score,
        emotions: analysis.emotions,
        ai_insights: analysis.insights,
        critical_alerts: analysis.critical_alerts || [],
        suggested_task: analysis.suggested_task,
        entry_date: new Date().toISOString(),
        audio_analysis: audioAnalysis,
      };

      const savedEntry = await journalService.createEntry(newEntry);
      
      const user = await journalService.getUser();
      if (user && (!user.badges || !user.badges.some(b => b.id === 'first_entry'))) {
        await awardBadge(user, 'first_entry');
      }
      
      setLastEntry(savedEntry);
      setShowSubmittedAnimation(true);
      setContent("");
      setAudioAnalysis(null);
      
    } catch (error) {
      console.error("Error saving journal entry:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  const resetState = () => {
    setLastEntry(null);
    setShowSubmittedAnimation(false);
  }

  if (lastEntry && !showSubmittedAnimation) {
    return (
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {lastEntry.critical_alerts && lastEntry.critical_alerts.length > 0 && (
            <UrgentSupport alerts={lastEntry.critical_alerts} />
          )}
          
          <DetailedAnalysis entry={lastEntry} />
          
          {lastEntry.suggested_task && (
            <DailyTask task={lastEntry.suggested_task} />
          )}
          
          <Button onClick={resetState} className="w-full mt-6 bg-gray-500 hover:bg-gray-600">
            Write Another Entry
          </Button>
        </motion.div>
      </div>
    );
  }
  
  if (showSubmittedAnimation) {
    return <EntrySubmittedAnimation onComplete={() => setShowSubmittedAnimation(false)} />;
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-3">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-gradient-to-br from-pink-400 to-orange-400 rounded-full flex items-center justify-center shadow-lg">
            <Heart className="w-8 h-8 text-white animate-pulse" />
          </div>
        </div>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-500 to-pink-600 bg-clip-text text-transparent">
          How are you feeling today?
        </h1>
        <p className="text-gray-600 max-w-md mx-auto">
          This is your safe space to reflect, process, and grow. Your thoughts and experiences matter ✨
        </p>
      </motion.div>

      <Card className="border-pink-200 shadow-lg">
        <CardHeader className="text-center pb-3">
          <div className="flex items-center justify-center gap-2">
            <Sparkles className="w-5 h-5 text-orange-500" />
            <h2 className="text-lg font-semibold text-gray-700">Today's Reflection</h2>
            <Sparkles className="w-5 h-5 text-pink-500" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Share what's on your mind, your challenges, victories, or anything you need to process... 💭"
              className="min-h-[150px] border-pink-300/50 bg-white/50 rounded-2xl"
              rows={6}
            />
            {content && (
              <div className="absolute bottom-3 right-3">
                <MoodIndicator text={content} />
              </div>
            )}
          </div>

          <VoiceRecorder 
            onLiveTranscription={handleLiveTranscription}
            onAudioAnalysis={handleAudioAnalysis}
            isRecording={isRecording}
            setIsRecording={setIsRecording}
            currentContent={content}
          />

          <Button
            onClick={analyzeAndSave}
            disabled={!content.trim() || isAnalyzing || isRecording}
            className="w-full bg-gradient-to-r from-pink-500 to-orange-500 text-white rounded-2xl py-4 text-lg font-medium hover:from-pink-600 hover:to-orange-600 disabled:from-gray-300 disabled:to-gray-400"
          >
            {isAnalyzing ? (
              <div className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                Analyzing your reflection...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Send className="w-5 h-5" />
                Save My Reflection
              </div>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}