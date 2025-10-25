import React from "react";
import { Card, CardContent } from "../ui/Card";
import { motion } from "framer-motion";

export default function MoodSummary({ title, value, icon: Icon, color, description }) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 400 }}
    >
      <Card className="border-pink-200 shadow-lg hover:shadow-xl transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">{title}</p>
              <p className="text-2xl font-bold text-gray-800">{value}</p>
              <p className="text-xs text-gray-400 mt-1">{description}</p>
            </div>
            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-r ${color} flex items-center justify-center shadow-md`}>
              <Icon className="w-6 h-6 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}