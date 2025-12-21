import React, { useState, useEffect, useRef } from "react";
import { journalService } from "../services/journalService";
import { personalizationService } from "../services/personalizationService";
import { Button } from "../components/ui/Button";
import { Card, CardContent, CardHeader } from "../components/ui/Card";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Sparkles, 
  Zap, 
  Target,
  Brain,
  Heart,
  Clock,
  CheckCircle2,
  Wind,
  Mountain
} from "lucide-react";

export default function ActionPage() {
  const [activeMode, setActiveMode] = useState(null);
  const [timeLeft, setTimeLeft] = useState(300);
  const [isRunning, setIsRunning] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
  const [meditationStep, setMeditationStep] = useState(0);
  const [currentEncouragement, setCurrentEncouragement] = useState(0);
  const [personalizedMessages, setPersonalizedMessages] = useState([]);
  const [isLoadingPersonalization, setIsLoadingPersonalization] = useState(false);
  const [userPreferences, setUserPreferences] = useState(null);
  
  const timerRef = useRef(null);
  const meditationTimerRef = useRef(null);

  // Generic fallback encouragements
  const genericEncouragements = [
    {
      title: "You Don't Need to Feel Ready",
      message: "The secret? Start before you feel ready. Motivation comes AFTER you begin, not before. That uncomfortable feeling is just your brain resisting change—push through it.",
      icon: Zap,
      color: "from-orange-400 to-pink-500"
    },
    {
      title: "Just 5 Minutes",
      message: "Commit to just 5 minutes. That's it. Once you start, momentum takes over. The hardest part is beginning, and you're about to conquer that right now.",
      icon: Clock,
      color: "from-purple-400 to-indigo-500"
    },
    {
      title: "Future You is Watching",
      message: "The person you'll be in 1 hour is counting on you. Will you make them proud? Every moment you delay is a moment you can't get back. Act now.",
      icon: Target,
      color: "from-blue-400 to-cyan-500"
    },
    {
      title: "Break the Pattern",
      message: "Procrastination is a habit loop. Right now, you have the power to break it. One small action creates a crack in that pattern. Be the disruptor.",
      icon: Sparkles,
      color: "from-pink-400 to-rose-500"
    },
    {
      title: "Your Brain is Lying",
      message: "That voice saying 'later' or 'I'm not in the mood'? It's your brain's defense mechanism against discomfort. Acknowledge it, then do it anyway. You're stronger than the resistance.",
      icon: Brain,
      color: "from-green-400 to-emerald-500"
    },
    {
      title: "Imperfect Action > Perfect Planning",
      message: "Stop waiting for the perfect moment, perfect plan, or perfect mood. Messy action beats perfect inaction every single time. Start messy, refine later.",
      icon: Mountain,
      color: "from-yellow-400 to-orange-500"
    }
  ];

  // Use personalized messages if available, otherwise use generic
  const encouragements = personalizedMessages.length > 0 
    ? [...personalizedMessages, ...genericEncouragements]
    : genericEncouragements;

  const meditationSteps = [
    {
      duration: 60,
      instruction: "Close your eyes. Take a deep breath in through your nose... hold it... now exhale slowly through your mouth. Feel your body settling.",
      breath: "Deep breathing"
    },
    {
      duration: 45,
      instruction: "Notice where you're holding tension. Your shoulders, your jaw, your hands. Let them relax. You're safe. You're ready.",
      breath: "Body scan"
    },
    {
      duration: 45,
      instruction: "Imagine yourself taking that first step. See yourself doing the task. Notice how capable you are. You've done hard things before.",
      breath: "Visualization"
    },
    {
      duration: 30,
      instruction: "Set your intention: 'I choose action over comfort. I choose progress over perfection.' Feel the power in that choice.",
      breath: "Affirmation"
    }
  ];

  // Load user preferences and generate personalized messages
  useEffect(() => {
    loadPersonalization();
  }, []);
const loadPersonalization = async () => {
  setIsLoadingPersonalization(true);
  console.log("🔄 Starting personalization...");
  
  try {
    // Try to load cached preferences first
    let preferences = null;
    try {
      const cached = localStorage.getItem('user_preferences');
      if (cached) {
        preferences = JSON.parse(cached);
        console.log("✅ Loaded cached preferences:", preferences);
      }
    } catch (error) {
      console.log("ℹ️ No cached preferences found");
    }
    
    // If no cached preferences, extract from journal entries
    if (!preferences) {
      console.log("📖 Fetching journal entries...");
      const entries = await journalService.getEntries(20);
      console.log(`📊 Found ${entries.length} journal entries`);
      
      if (entries.length > 0) {
        console.log("🧠 Extracting preferences from entries...");
        preferences = await personalizationService.extractPreferences(entries);
        console.log("✨ Extracted preferences:", preferences);
        
        if (preferences) {
localStorage.setItem('user_preferences', JSON.stringify(preferences));
          console.log("💾 Saved preferences to storage");
        } else {
          console.warn("⚠️ Preference extraction returned null");
        }
      } else {
        console.log("ℹ️ No journal entries to analyze");
      }
    }
    
    setUserPreferences(preferences);
    
    // Generate personalized messages
    if (preferences) {
      console.log("💬 Generating personalized messages...");
      
      // Use the new batch method
      const messages = await personalizationService.generateMultipleMessages(
        preferences, 
        ["starting_task", "overcoming_resistance", "building_momentum"]
      );
      
      console.log(`✅ Generated ${messages.length} messages:`, messages);
      
      if (messages && messages.length > 0) {
        const validMessages = messages.map((msg, idx) => ({
          title: msg.title,
          message: msg.message,
          connection: msg.connection,
          icon: [Zap, Sparkles, Target, Brain, Heart, Mountain][idx % 6],
          color: [
            "from-orange-400 to-pink-500",
            "from-purple-400 to-indigo-500",
            "from-blue-400 to-cyan-500",
            "from-pink-400 to-rose-500",
            "from-green-400 to-emerald-500",
            "from-yellow-400 to-orange-500"
          ][idx % 6]
        }));
        
        console.log("✅ Formatted messages:", validMessages);
        setPersonalizedMessages(validMessages);
      } else {
        console.warn("⚠️ No valid messages generated");
      }
    } else {
      console.log("ℹ️ No preferences available, skipping message generation");
    }
  } catch (error) {
    console.error("❌ Error loading personalization:", error);
    console.error("Error details:", error.message, error.stack);
  }
  
  setIsLoadingPersonalization(false);
  console.log("✅ Personalization complete");
};
  // Timer effect
  useEffect(() => {
    if (isRunning && activeMode === 'timer') {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            setShowCompletion(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRunning, activeMode]);

  // Meditation effect
  useEffect(() => {
    if (isRunning && activeMode === 'meditation' && meditationStep < meditationSteps.length) {
      const currentStep = meditationSteps[meditationStep];
      
      meditationTimerRef.current = setTimeout(() => {
        if (meditationStep + 1 >= meditationSteps.length) {
          setIsRunning(false);
          setShowCompletion(true);
        }
        setMeditationStep((prev) => prev + 1);
      }, currentStep.duration * 1000);
    } else {
      if (meditationTimerRef.current) {
        clearTimeout(meditationTimerRef.current);
        meditationTimerRef.current = null;
      }
    }

    return () => {
      if (meditationTimerRef.current) {
        clearTimeout(meditationTimerRef.current);
      }
    };
  }, [isRunning, activeMode, meditationStep]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartTimer = () => {
    setIsRunning(true);
  };

  const handlePauseTimer = () => {
    setIsRunning(false);
  };

  const handleResetTimer = () => {
    setTimeLeft(300);
    setIsRunning(false);
    setShowCompletion(false);
  };

  const handleStartMeditation = () => {
    setIsRunning(true);
  };

  const handlePauseMeditation = () => {
    setIsRunning(false);
  };

  const handleResetMeditation = () => {
    setMeditationStep(0);
    setIsRunning(false);
    setShowCompletion(false);
  };

  const handleStartMode = (mode) => {
    setActiveMode(mode);
    setTimeLeft(300);
    setMeditationStep(0);
    setIsRunning(false);
    setShowCompletion(false);
    if (mode === 'encouragement') {
      setCurrentEncouragement(0);
    }
  };

  const handleBackToMenu = () => {
    setActiveMode(null);
    setIsRunning(false);
    setShowCompletion(false);
    setTimeLeft(300);
    setMeditationStep(0);
  };

  const handleCycleEncouragement = () => {
    setCurrentEncouragement((prev) => (prev + 1) % encouragements.length);
  };

  if (!activeMode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 py-8 px-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto space-y-8"
        >
          <div className="text-center space-y-4">
            <motion.div
              animate={{ 
                rotate: [0, 5, -5, 0],
                scale: [1, 1.05, 1]
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className="inline-block"
            >
              <div className="w-20 h-20 bg-gradient-to-br from-orange-400 via-red-400 to-pink-500 rounded-full flex items-center justify-center shadow-2xl">
                <Zap className="w-10 h-10 text-white" />
              </div>
            </motion.div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-600 via-red-600 to-pink-600 bg-clip-text text-transparent">
              Action Mode
            </h1>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              Feeling stuck? Choose your weapon against procrastination. Every great achievement starts with a single action.
            </p>
            
            {userPreferences && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-100 to-pink-100 rounded-full text-sm text-purple-700 font-medium"
              >
                <Sparkles className="w-4 h-4" />
                Personalized for you
              </motion.div>
            )}
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <motion.div whileHover={{ scale: 1.03, y: -5 }} whileTap={{ scale: 0.98 }}>
              <div 
                className="cursor-pointer border-2 border-orange-200 hover:border-orange-400 transition-all duration-300 shadow-lg hover:shadow-2xl bg-gradient-to-br from-white to-orange-50 h-full rounded-xl p-6"
                onClick={() => handleStartMode('timer')}
              >
                <div className="text-center pb-3">
                  <div className="flex justify-center mb-3">
                    <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center">
                      <Clock className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-gray-800">5-Minute Starter</h3>
                </div>
                <div className="text-center space-y-3">
                  <p className="text-gray-600">
                    Commit to just 5 minutes. Once you start, momentum takes over. The hardest part is beginning.
                  </p>
                  <div className="text-sm text-orange-600 font-semibold">
                    → Start Now
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div whileHover={{ scale: 1.03, y: -5 }} whileTap={{ scale: 0.98 }}>
              <div 
                className="cursor-pointer border-2 border-purple-200 hover:border-purple-400 transition-all duration-300 shadow-lg hover:shadow-2xl bg-gradient-to-br from-white to-purple-50 h-full rounded-xl p-6"
                onClick={() => handleStartMode('meditation')}
              >
                <div className="text-center pb-3">
                  <div className="flex justify-center mb-3">
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-indigo-500 rounded-full flex items-center justify-center">
                      <Wind className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-gray-800">Quick Meditation</h3>
                </div>
                <div className="text-center space-y-3">
                  <p className="text-gray-600">
                    3-minute guided practice to clear mental blocks and center yourself before taking action.
                  </p>
                  <div className="text-sm text-purple-600 font-semibold">
                    → Begin Practice
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div whileHover={{ scale: 1.03, y: -5 }} whileTap={{ scale: 0.98 }}>
              <div 
                className="cursor-pointer border-2 border-pink-200 hover:border-pink-400 transition-all duration-300 shadow-lg hover:shadow-2xl bg-gradient-to-br from-white to-pink-50 h-full rounded-xl p-6"
                onClick={() => handleStartMode('encouragement')}
              >
                <div className="text-center pb-3">
                  <div className="flex justify-center mb-3">
                    <div className="w-16 h-16 bg-gradient-to-br from-pink-400 to-rose-500 rounded-full flex items-center justify-center">
                      <Sparkles className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-gray-800">
                    {personalizedMessages.length > 0 ? "Personal Motivation" : "Motivation Boost"}
                  </h3>
                </div>
                <div className="text-center space-y-3">
                  <p className="text-gray-600">
                    {personalizedMessages.length > 0 
                      ? "Tailored messages based on YOUR interests and goals to snap you out of procrastination."
                      : "Powerful reminders and truth bombs to snap you out of procrastination mode right now."}
                  </p>
                  <div className="text-sm text-pink-600 font-semibold">
                    → Get Inspired
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          <Card className="border-2 border-gray-200 bg-white/80 backdrop-blur">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <Target className="w-5 h-5 text-indigo-500" />
                  Anti-Procrastination Mindset
                </h3>
                {isLoadingPersonalization && (
                  <div className="flex items-center gap-2 text-sm text-purple-600">
                    <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                    Personalizing...
                  </div>
                )}
              </div>
              <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-600">
                <div className="flex gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <p><strong>Start ugly:</strong> Don't wait for perfect conditions. Begin with whatever you have, wherever you are.</p>
                </div>
                <div className="flex gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <p><strong>2-minute rule:</strong> If it takes less than 2 minutes, do it immediately. Build momentum.</p>
                </div>
                <div className="flex gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <p><strong>Procrastination = emotion management:</strong> You're not lazy. You're avoiding discomfort. Acknowledge it, then act anyway.</p>
                </div>
                <div className="flex gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <p><strong>Break the task down:</strong> Large tasks paralyze. What's the smallest possible next step? Do that.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {personalizedMessages.length === 0 && !isLoadingPersonalization && (
            <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
              <CardContent className="p-6 text-center">
                <Sparkles className="w-12 h-12 text-purple-500 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-gray-800 mb-2">Want Personalized Motivation?</h3>
                <p className="text-gray-600 mb-4">
                  Write a few journal entries about what you love, your goals, and your interests. I'll create custom motivation messages just for you!
                </p>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>
    );
  }

  if (activeMode === 'timer') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 py-8 px-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} 
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-2xl mx-auto"
        >
          <button
            onClick={handleBackToMenu}
            className="mb-6 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            ← Back to Menu
          </button>

          <AnimatePresence mode="wait">
            {!showCompletion ? (
              <motion.div
                key="timer"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <Card className="border-2 border-orange-200 shadow-2xl">
                  <CardHeader className="text-center pb-6 bg-gradient-to-r from-orange-50 to-red-50">
                    <div className="flex justify-center mb-4">
                      <motion.div
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="w-20 h-20 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center shadow-xl"
                      >
                        <Clock className="w-10 h-10 text-white" />
                      </motion.div>
                    </div>
                    <h2 className="text-3xl font-bold text-gray-800">5-Minute Action Timer</h2>
                    <p className="text-gray-600 mt-2">Just start. Momentum will handle the rest.</p>
                  </CardHeader>
                  
                  <CardContent className="p-8 space-y-8">
                    <div className="text-center">
                      <motion.div
                        animate={{ scale: isRunning ? [1, 1.02, 1] : 1 }}
                        transition={{ duration: 1, repeat: isRunning ? Infinity : 0 }}
                        className="text-8xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent"
                      >
                        {formatTime(timeLeft)}
                      </motion.div>
                      <p className="text-gray-500 mt-2">
                        {isRunning ? "You're doing it! Keep going..." : "Ready when you are"}
                      </p>
                    </div>

                    <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-orange-400 to-red-500"
                        style={{ width: `${((300 - timeLeft) / 300) * 100}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>

                    <div className="flex gap-4 justify-center">
                      <Button
                        onClick={isRunning ? handlePauseTimer : handleStartTimer}
                        className="px-8 py-6 text-lg rounded-xl"
                      >
                        {isRunning ? (
                          <>
                            <Pause className="w-6 h-6 mr-2 inline" />
                            Pause
                          </>
                        ) : (
                          <>
                            <Play className="w-6 h-6 mr-2 inline" />
                            Start Now
                          </>
                        )}
                      </Button>
                      <button
                        onClick={handleResetTimer}
                        className="border-2 border-orange-300 px-6 py-6 text-lg rounded-xl bg-white hover:bg-orange-50 transition-colors"
                      >
                        <RotateCcw className="w-6 h-6" />
                      </button>
                    </div>

                    <div className="bg-gradient-to-r from-orange-50 to-red-50 p-6 rounded-2xl border-2 border-orange-200">
                      <p className="text-gray-700 text-center font-medium">
                        💪 {isRunning 
                          ? "You're breaking through the resistance. This is where growth happens!"
                          : "The hardest part is starting. Click that button and prove to yourself you can do this."}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <motion.div
                key="completion"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <Card className="border-2 border-green-200 shadow-2xl bg-gradient-to-br from-green-50 to-emerald-50">
                  <CardContent className="p-12 text-center space-y-6">
                    <motion.div
                      animate={{ 
                        rotate: [0, 10, -10, 0],
                        scale: [1, 1.2, 1]
                      }}
                      transition={{ duration: 0.5 }}
                      className="flex justify-center"
                    >
                      <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-2xl">
                        <CheckCircle2 className="w-14 h-14 text-white" />
                      </div>
                    </motion.div>
                    <h2 className="text-4xl font-bold text-gray-800">You Did It! 🎉</h2>
                    <p className="text-xl text-gray-600">
                      5 minutes of focused action completed. You've broken through the resistance!
                    </p>
                    <p className="text-lg text-gray-600">
                      Notice how you feel now? That's momentum. Keep it going or celebrate this win.
                    </p>
                    <div className="flex gap-4 justify-center pt-4">
                      <Button
                        onClick={handleResetTimer}
                        className="px-8 py-6 text-lg rounded-xl"
                      >
                        Another 5 Minutes
                      </Button>
                      <button
                        onClick={handleBackToMenu}
                        className="border-2 border-green-300 px-8 py-6 text-lg rounded-xl bg-white hover:bg-green-50 transition-colors"
                      >
                        Back to Menu
                      </button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    );
  }

  if (activeMode === 'meditation') {
    const currentStep = meditationSteps[meditationStep] || meditationSteps[meditationSteps.length - 1];
    const progress = ((meditationStep + 1) / meditationSteps.length) * 100;

    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 py-8 px-4">
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }}
          className="max-w-2xl mx-auto"
        >
          <button
            onClick={handleBackToMenu}
            className="mb-6 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            ← Back to Menu
          </button>

          <AnimatePresence mode="wait">
            {!showCompletion ? (
              <motion.div
                key="meditation"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Card className="border-2 border-purple-200 shadow-2xl">
                  <CardContent className="p-12 space-y-8">
                    <div className="flex justify-center">
                      <motion.div
                        animate={{ 
                          scale: isRunning ? [1, 1.3, 1] : 1,
                          opacity: isRunning ? [0.7, 1, 0.7] : 1
                        }}
                        transition={{ 
                          duration: 4, 
                          repeat: isRunning ? Infinity : 0,
                          ease: "easeInOut"
                        }}
                        className="w-40 h-40 bg-gradient-to-br from-purple-400 to-indigo-500 rounded-full flex items-center justify-center shadow-2xl"
                      >
                        <Wind className="w-20 h-20 text-white" />
                      </motion.div>
                    </div>

                    <div className="text-center space-y-4">
                      <div className="text-sm text-purple-600 font-semibold uppercase tracking-wide">
                        {currentStep.breath}
                      </div>
                      <motion.p
                        key={meditationStep}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-xl text-gray-700 leading-relaxed max-w-lg mx-auto"
                      >
                        {currentStep.instruction}
                      </motion.p>
                    </div>

                    <div className="space-y-2">
                      <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-purple-400 to-indigo-500"
                          style={{ width: `${progress}%` }}
                          transition={{ duration: 0.5 }}
                        />
                      </div>
                      <p className="text-center text-sm text-gray-500">
                        Step {meditationStep + 1} of {meditationSteps.length}
                      </p>
                    </div>

                    <div className="flex gap-4 justify-center">
                      {!isRunning ? (
                        <Button
                          onClick={handleStartMeditation}
                          className="px-12 py-6 text-lg rounded-xl"
                        >
                          <Play className="w-6 h-6 mr-2 inline" />
                          Begin Meditation
                        </Button>
                      ) : (
                        <button
                          onClick={handlePauseMeditation}
                          className="border-2 border-purple-300 px-12 py-6 text-lg rounded-xl bg-white hover:bg-purple-50 transition-colors"
                        >
                          <Pause className="w-6 h-6 mr-2 inline" />
                          Pause
                        </button>
                      )}
                      <button
                        onClick={handleResetMeditation}
                        className="border-2 border-purple-300 px-6 py-6 text-lg rounded-xl bg-white hover:bg-purple-50 transition-colors"
                      >
                        <RotateCcw className="w-6 h-6" />
                      </button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <motion.div
                key="completion"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <Card className="border-2 border-green-200 shadow-2xl bg-gradient-to-br from-green-50 to-emerald-50">
                  <CardContent className="p-12 text-center space-y-6">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1 }}
                      className="flex justify-center"
                    >
                      <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-2xl">
                        <Heart className="w-14 h-14 text-white" />
                      </div>
                    </motion.div>
                    <h2 className="text-4xl font-bold text-gray-800">Centered & Ready ✨</h2>
                    <p className="text-xl text-gray-600">
                      You've cleared the mental fog. Your mind is sharp and focused.
                    </p>
                    <p className="text-lg text-gray-600">
                      Now take that first action step. You're ready.
                    </p>
                    <div className="flex gap-4 justify-center pt-4">
                      <Button
                        onClick={handleResetMeditation}
                        className="px-8 py-6 text-lg rounded-xl"
                      >
                        Practice Again
                      </Button>
                      <button
                        onClick={handleBackToMenu}
                        className="border-2 border-purple-300 px-8 py-6 text-lg rounded-xl bg-white hover:bg-purple-50 transition-colors"
                      >
                        Back to Menu
                      </button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    );
  }

  if (activeMode === 'encouragement') {
    const currentMsg = encouragements[currentEncouragement];
    const Icon = currentMsg.icon;
    const isPersonalized = currentEncouragement < personalizedMessages.length;

    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-rose-50 to-orange-50 py-8 px-4">
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }}
          className="max-w-2xl mx-auto"
        >
          <button
            onClick={handleBackToMenu}
            className="mb-6 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            ← Back to Menu
          </button>

          <motion.div
            key={currentEncouragement}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
          >
            <Card className="border-2 border-pink-200 shadow-2xl">
              <CardContent className="p-12 space-y-8">
                <div className="flex justify-center">
                  <motion.div
                    animate={{ 
                      rotate: [0, -5, 5, 0],
                      scale: [1, 1.1, 1]
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className={`w-24 h-24 bg-gradient-to-br ${currentMsg.color} rounded-full flex items-center justify-center shadow-2xl`}
                  >
                    <Icon className="w-12 h-12 text-white" />
                  </motion.div>
                </div>

                {isPersonalized && (
                  <div className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-100 to-pink-100 rounded-full text-sm text-purple-700 font-medium mx-auto w-fit">
                    <Sparkles className="w-4 h-4" />
                    Personalized for You
                  </div>
                )}

                <div className="text-center space-y-4">
                  <h2 className="text-3xl font-bold text-gray-800">
                    {currentMsg.title}
                  </h2>
                  <p className="text-xl text-gray-700 leading-relaxed">
                    {currentMsg.message}
                  </p>
                  {currentMsg.connection && (
                    <p className="text-lg text-purple-600 italic leading-relaxed pt-2">
                      {currentMsg.connection}
                    </p>
                  )}
                </div>

                <div className="flex gap-4 justify-center pt-4">
                  <Button
                    onClick={handleCycleEncouragement}
                    className="px-8 py-6 text-lg rounded-xl"
                  >
                    <Sparkles className="w-6 h-6 mr-2 inline" />
                    Next Message
                  </Button>
                  <button
                    onClick={handleBackToMenu}
                    className="border-2 border-pink-300 px-8 py-6 text-lg rounded-xl bg-white hover:bg-pink-50 transition-colors"
                  >
                    Back to Menu
                  </button>
                </div>

                <div className="bg-gradient-to-r from-pink-50 to-rose-50 p-6 rounded-2xl border-2 border-pink-200">
                  <p className="text-gray-700 text-center font-medium">
                    ⚡ You have {encouragements.length} powerful messages ({personalizedMessages.length} personalized). Keep cycling until one resonates deeply.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return null;
}