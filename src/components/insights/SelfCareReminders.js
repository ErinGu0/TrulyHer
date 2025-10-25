import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";
import { Heart, Flower } from "lucide-react";
import { motion } from "framer-motion";

export default function SelfCareReminders({ tips }) {
  if (!tips || !tips.length) return null;

  return (
    <Card className="border-pink-200 shadow-lg bg-gradient-to-r from-pink-50 to-rose-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-700">
          <Flower className="w-5 h-5 text-pink-400" />
          Self-Care Reminders
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {tips.map((tip, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-start gap-3 p-4 rounded-xl bg-white/50 border border-pink-200"
          >
            <Heart className="w-5 h-5 text-pink-400 mt-0.5 flex-shrink-0" />
            <p className="text-gray-700">{tip}</p>
          </motion.div>
        ))}
      </CardContent>
    </Card>
  );
}