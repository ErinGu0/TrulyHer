import React, { useState, useEffect } from "react";
import { Smile, Meh, Frown, Heart } from "lucide-react";

export default function MoodIndicator({ text }) {
  const [mood, setMood] = useState(null);

  useEffect(() => {
    if (!text || text.trim().length < 5) {
      setMood(null);
      return;
    }

    const lowerContent = text.toLowerCase();
    
    const positiveWords = ['happy', 'joy', 'great', 'amazing', 'wonderful', 'love', 'excited', 'grateful', 'blessed', 'good', 'awesome'];
    const negativeWords = ['sad', 'angry', 'frustrated', 'worried', 'anxious', 'upset', 'stressed', 'overwhelmed', 'tired', 'exhausted', 'bad'];
    
    const words = lowerContent.split(/\s+/);
    const positiveCount = words.filter(word => positiveWords.some(pos => word.includes(pos))).length;
    const negativeCount = words.filter(word => negativeWords.some(neg => word.includes(neg))).length;
    
    if (positiveCount > negativeCount) {
      setMood('positive');
    } else if (negativeCount > positiveCount) {
      setMood('negative');
    } else {
      setMood('neutral');
    }
  }, [text]);

  if (!mood) return null;

  let icon = null;
  let color = '';
  let label = '';
  if (mood === 'positive') {
    icon = <Smile className="w-6 h-6 text-yellow-400 mr-2" />;
    color = 'text-yellow-600';
    label = 'Positive vibes ✨';
  } else if (mood === 'negative') {
    icon = <Frown className="w-6 h-6 text-blue-400 mr-2" />;
    color = 'text-blue-600';
    label = 'Challenging day';
  } else {
    icon = <Meh className="w-6 h-6 text-gray-400 mr-2" />;
    color = 'text-gray-600';
    label = 'Neutral mood';
  }

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-full border bg-white/70 shadow-sm`}>
      {icon}
      <span className={`font-semibold text-sm ${color}`}>{label}</span>
    </div>
  );
}