import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";
import { Button } from "../ui/Button";
import { Check, Lightbulb } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function DailyTask({ task }) {
  const [completedSteps, setCompletedSteps] = useState([]);

  if (!task) return null;

  const toggleStep = (step) => {
    setCompletedSteps(prev => 
      prev.includes(step) ? prev.filter(s => s !== step) : [...prev, step]
    );
  };

  const isAllCompleted = task.steps.length > 0 && completedSteps.length === task.steps.length;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
      <Card className="border-purple-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-purple-700">
            <Lightbulb className="text-yellow-500" />
            Today's Wellness Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold text-lg text-gray-800">{task.title}</h3>
            <p className="text-gray-600 mt-1">{task.description}</p>
          </div>
          
          <div className="space-y-3">
            {task.steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div
                  onClick={() => toggleStep(step)}
                  className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 bg-gray-50 hover:bg-purple-50 border border-transparent hover:border-purple-200"
                >
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                    completedSteps.includes(step) 
                      ? 'bg-green-500 border-green-500' 
                      : 'border-purple-300'
                  }`}>
                    {completedSteps.includes(step) && <Check className="w-4 h-4 text-white" />}
                  </div>
                  <span className={`text-gray-700 transition-all ${
                    completedSteps.includes(step) ? 'line-through text-gray-400' : ''
                  }`}>
                    {step}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
          
          <AnimatePresence>
            {isAllCompleted && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200"
              >
                <p className="font-semibold text-green-600">🎉 Amazing job! You're taking great care of yourself.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}