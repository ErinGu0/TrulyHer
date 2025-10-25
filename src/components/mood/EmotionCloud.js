import React from "react";
import { motion } from "framer-motion";

const emotionColors = [
  "bg-pink-100 text-pink-700 border-pink-200",
  "bg-purple-100 text-purple-700 border-purple-200", 
  "bg-indigo-100 text-indigo-700 border-indigo-200",
  "bg-blue-100 text-blue-700 border-blue-200",
  "bg-teal-100 text-teal-700 border-teal-200",
  "bg-green-100 text-green-700 border-green-200",
  "bg-yellow-100 text-yellow-700 border-yellow-200",
  "bg-orange-100 text-orange-700 border-orange-200"
];

export default function EmotionCloud({ emotions }) {
  if (!emotions.length) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>Start journaling to see your emotion patterns! 💭</p>
      </div>
    );
  }

  const maxCount = Math.max(...emotions.map(e => e.count));

  return (
    <div className="flex flex-wrap gap-3 justify-center p-4">
      {emotions.map((item, index) => {
        const size = Math.max(0.8, (item.count / maxCount) * 1.5);
        const colorClass = emotionColors[index % emotionColors.length];
        
        return (
          <motion.div
            key={item.emotion}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            className={`px-4 py-2 rounded-full border-2 font-medium ${colorClass}`}
            style={{ 
              fontSize: `${size}rem`,
              transform: `scale(${0.8 + size * 0.2})`
            }}
          >
            {item.emotion} ({item.count})
          </motion.div>
        );
      })}
    </div>
  );
}