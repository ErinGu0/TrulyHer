import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";
import { TrendingUp, Sprout } from "lucide-react";
import { motion } from "framer-motion";

export default function GrowthPatterns({ patterns, growthAreas }) {
  if (!patterns && (!growthAreas || !growthAreas.length)) return null;

  return (
    <div className="space-y-4">
      {patterns && (
        <Card className="border-purple-200 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-700">
              <TrendingUp className="w-5 h-5 text-purple-400" />
              Emotional Patterns
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-200">
              <p className="text-gray-700 leading-relaxed">{patterns}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {growthAreas && growthAreas.length > 0 && (
        <Card className="border-green-200 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-700">
              <Sprout className="w-5 h-5 text-green-400" />
              Gentle Growth Opportunities
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {growthAreas.map((area, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-start gap-3 p-3 rounded-xl bg-green-50 border border-green-100"
              >
                <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-gray-700">{area}</p>
              </motion.div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}