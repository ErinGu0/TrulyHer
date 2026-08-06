import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";
import { Heart, Flower, CheckCircle2, Circle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function SelfCareReminders({ tips }) {
  const [checkedTips, setCheckedTips] = useState({});

  const toggleTip = (index) => {
    setCheckedTips(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  if (!tips || !tips.length) return null;

  const completedCount = Object.values(checkedTips).filter(Boolean).length;
  const totalCount = tips.length;

  return (
    <Card className="border-2 border-pink-300 shadow-xl bg-gradient-to-br from-pink-50 via-rose-50 to-pink-100 overflow-hidden relative">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-pink-200/30 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-40 h-40 bg-rose-200/30 rounded-full blur-3xl"></div>
      
      <CardHeader className="relative">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3 text-gray-800">
            <div className="p-2 bg-gradient-to-br from-pink-400 to-rose-400 rounded-xl shadow-md">
              <Flower className="w-5 h-5 text-white" />
            </div>
            Today's Wellness Activities
          </CardTitle>
          {totalCount > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-white/70 backdrop-blur-sm rounded-full border-2 border-pink-300 shadow-sm">
              <span className="text-sm font-semibold text-pink-600">
                {completedCount}/{totalCount}
              </span>
              <Heart className="w-4 h-4 text-pink-500" />
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3 relative">
        <AnimatePresence>
          {tips.map((tip, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => toggleTip(index)}
              className={`flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all duration-300 group ${
                checkedTips[index]
                  ? 'bg-gradient-to-r from-green-100 via-emerald-100 to-teal-100 border-2 border-green-400 shadow-lg scale-[0.98]'
                  : 'bg-white/80 backdrop-blur-sm border-2 border-pink-200 hover:border-pink-400 hover:shadow-lg hover:scale-[1.02]'
              }`}
            >
              {/* Checkbox */}
              <div className="flex-shrink-0">
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className="relative"
                >
                  {checkedTips[index] ? (
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", stiffness: 200, damping: 15 }}
                    >
                      <CheckCircle2 className="w-7 h-7 text-green-600 drop-shadow-md" />
                    </motion.div>
                  ) : (
                    <Circle className="w-7 h-7 text-pink-300 group-hover:text-pink-500 transition-colors" />
                  )}
                </motion.div>
              </div>

              {/* Heart Icon */}
              <div className="flex-shrink-0">
                <motion.div
                  animate={checkedTips[index] ? { 
                    scale: [1, 1.2, 1],
                    rotate: [0, 10, -10, 0]
                  } : {}}
                  transition={{ duration: 0.5 }}
                >
                  <Heart 
                    className={`w-5 h-5 transition-all duration-300 ${
                      checkedTips[index] 
                        ? 'text-green-500 fill-green-500' 
                        : 'text-pink-400 group-hover:text-pink-500'
                    }`} 
                  />
                </motion.div>
              </div>

              {/* Tip Text */}
              <p className={`text-gray-700 leading-relaxed flex-1 transition-all duration-300 ${
                checkedTips[index] ? 'line-through text-gray-500' : ''
              }`}>
                {tip}
              </p>

              {/* Completion Badge */}
              <AnimatePresence>
                {checkedTips[index] && (
                  <motion.div
                    initial={{ scale: 0, rotate: -90 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0, rotate: 90 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="flex-shrink-0"
                  >
                    <div className="px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-full shadow-md">
                      ✓ Done
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Celebration Message */}
        <AnimatePresence>
          {completedCount === totalCount && totalCount > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="mt-6 p-5 bg-gradient-to-r from-green-100 via-emerald-100 to-teal-100 rounded-2xl border-2 border-green-400 shadow-lg text-center"
            >
              <motion.div
                animate={{ 
                  rotate: [0, 10, -10, 10, 0],
                  scale: [1, 1.1, 1, 1.1, 1]
                }}
                transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
                className="text-4xl mb-2"
              >
                🎉
              </motion.div>
              <p className="text-green-800 font-semibold text-lg">
                Amazing! You completed all activities today!
              </p>
              <p className="text-green-600 text-sm mt-1">
                You're taking wonderful care of yourself ✨
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}