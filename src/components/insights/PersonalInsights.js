import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";
import { Heart, Star } from "lucide-react";
import { motion } from "framer-motion";

export default function PersonalInsights({ strengths, encouragingMessage }) {
  if (!strengths && !encouragingMessage) return null;

  return (
    <div className="space-y-4">
      {encouragingMessage && (
        <Card className="border-pink-200 shadow-lg bg-gradient-to-r from-pink-50 to-purple-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <Heart className="w-6 h-6 text-pink-500" />
              <h3 className="text-lg font-semibold text-gray-800">A Message for You</h3>
            </div>
            <p className="text-gray-700 italic leading-relaxed">"{encouragingMessage}"</p>
          </CardContent>
        </Card>
      )}

      {strengths && strengths.length > 0 && (
        <Card className="border-yellow-200 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-700">
              <Star className="w-5 h-5 text-yellow-400" />
              Your Beautiful Strengths
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {strengths.map((strength, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-start gap-3 p-3 rounded-xl bg-yellow-50 border border-yellow-100"
              >
                <div className="w-2 h-2 bg-yellow-400 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-gray-700">{strength}</p>
              </motion.div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}