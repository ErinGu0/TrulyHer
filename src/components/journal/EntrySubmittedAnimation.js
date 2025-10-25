import React from "react";
import { motion } from "framer-motion";
import { CheckCircle, Sparkles } from "lucide-react";

export default function EntrySubmittedAnimation({ onComplete }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4 cursor-pointer"
      onClick={onComplete}
    >
      <motion.div
        initial={{ scale: 0.8, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white rounded-3xl p-8 text-center max-w-sm shadow-2xl border border-pink-100"
      >
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="w-20 h-20 mx-auto mb-4 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center"
        >
          <CheckCircle className="w-10 h-10 text-white" />
        </motion.div>
        
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Entry Saved! 💖</h2>
        <p className="text-gray-600 mb-4">Your thoughts are safe with us. You're doing amazing.</p>
        
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="flex justify-center gap-2 items-center text-sm font-medium text-pink-500"
        >
          <Sparkles className="w-4 h-4" />
          Tap anywhere to continue
          <Sparkles className="w-4 h-4" />
        </motion.div>
      </motion.div>
    </motion.div>
  );
}