import React, { useState } from "react";
import { Card, CardContent, CardHeader } from "../ui/Card";
import { Button } from "../ui/Button";
import { Calendar, Heart, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

export default function EntryCard({ entry, getMoodColor, getMoodEmoji }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card className="border-pink-200 shadow-lg hover:shadow-xl transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-pink-400 to-purple-400 rounded-full flex items-center justify-center">
              <span className="text-lg">{getMoodEmoji(entry.mood_score)}</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600">
                  {format(new Date(entry.entry_date), "MMM d, yyyy 'at' h:mm a")}
                </span>
              </div>
              {entry.mood_score && (
                <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-1 ${getMoodColor(entry.mood_score)}`}>
                  Mood: {entry.mood_score}/10
                </span>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-500 hover:text-pink-600"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="prose prose-sm max-w-none">
          <p className="text-gray-700 leading-relaxed">
            {entry.content.length > 150 && !isExpanded 
              ? `${entry.content.substring(0, 150)}...`
              : entry.content
            }
          </p>
        </div>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4"
            >
              {entry.emotions && entry.emotions.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-600 mb-2">Emotions felt:</h4>
                  <div className="flex flex-wrap gap-2">
                    {entry.emotions.map((emotion, i) => (
                      <span key={i} className="px-3 py-1 bg-purple-50 text-purple-600 rounded-full text-xs border border-purple-200">
                        {emotion}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {entry.ai_insights && (
                <div className="bg-gradient-to-r from-pink-50 to-purple-50 p-4 rounded-xl border border-pink-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Heart className="w-4 h-4 text-pink-500" />
                    <span className="text-sm font-medium text-gray-700">AI Insights</span>
                  </div>
                  <p className="text-sm text-gray-600 italic">"{entry.ai_insights}"</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}