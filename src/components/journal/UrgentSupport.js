import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";
import { AlertTriangle, Phone, MessageCircle, Heart, Shield, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

const supportInfo = {
  imposter_syndrome: {
    title: "You're Not Alone",
    subtitle: "Support for Imposter Syndrome",
    message: "You're experiencing something that 75% of successful women face - imposter syndrome. These feelings don't reflect your actual capabilities or worth.",
    statistics: "Research shows 75% of women executives experience imposter syndrome. Your achievements are earned and deserved.",
    tips: [
      "Acknowledge these feelings are normal and temporary",
      "Practice daily affirmations: 'I deserve my success' and 'I am qualified and capable'",
      "Keep an accomplishment journal to document your wins, big and small",
      "Reframe your inner dialogue: Replace 'I was lucky' with 'I created that opportunity'"
    ],
    resources: [
      { name: "Crisis Text Line", contact: "Text CONNECT to 686868", icon: MessageCircle },
      { name: "Mental Health Support", contact: "1-866-925-5454", icon: Phone }
    ],
    color: "orange"
  },
  depression: {
    title: "You Deserve Support",
    subtitle: "Help for Difficult Times",
    message: "Things are feeling really heavy right now, and that's okay. Support is available, and you don't have to go through this alone.",
    tips: [
      "Practice self-compassion - it's okay to not be okay",
      "Engage in a small, manageable activity you usually enjoy",
      "Reach out to a trusted friend or family member",
      "Try a grounding exercise: Name 5 things you can see, 4 you can touch, 3 you can hear"
    ],
    resources: [
      { name: "Crisis Text Line", contact: "Text CONNECT to 686868", icon: MessageCircle },
      { name: "Mental Health Support", contact: "1-866-925-5454", icon: Phone }
    ],
    color: "red"
  }
};

export default function UrgentSupport({ alerts }) {
  if (!alerts || alerts.length === 0) return null;

  const alertData = supportInfo[alerts[0]];
  if (!alertData) return null;

  const colorScheme = alertData.color === "orange" ? {
    gradient: "from-orange-50 via-amber-50 to-yellow-50",
    border: "border-orange-300",
    iconBg: "from-orange-400 to-amber-500",
    textPrimary: "text-orange-900",
    textSecondary: "text-orange-800",
    badge: "bg-orange-100 text-orange-700 border-orange-200",
    cardBg: "bg-white/80",
    accentBorder: "border-orange-400"
  } : {
    gradient: "from-red-50 via-pink-50 to-rose-50",
    border: "border-red-300",
    iconBg: "from-red-400 to-pink-500",
    textPrimary: "text-red-900",
    textSecondary: "text-red-800",
    badge: "bg-red-100 text-red-700 border-red-200",
    cardBg: "bg-white/80",
    accentBorder: "border-red-400"
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 30, scale: 0.95 }} 
      animate={{ opacity: 1, y: 0, scale: 1 }} 
      transition={{ duration: 0.5, type: "spring", stiffness: 200 }}
      className="relative"
    >
      {/* Glow effect */}
      <div className={`absolute inset-0 bg-gradient-to-r ${colorScheme.iconBg} opacity-10 blur-2xl rounded-3xl`} />
      
      <Card className={`border-2 ${colorScheme.border} bg-gradient-to-br ${colorScheme.gradient} shadow-2xl overflow-hidden relative`}>
        {/* Header with Icon */}
        <CardHeader className={`${colorScheme.cardBg} backdrop-blur-sm border-b-2 ${colorScheme.border}`}>
          <div className="flex items-start gap-4">
            <motion.div
              animate={{ 
                scale: [1, 1.1, 1],
                rotate: [0, -5, 5, 0]
              }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              className={`p-4 bg-gradient-to-br ${colorScheme.iconBg} rounded-2xl shadow-lg flex-shrink-0`}
            >
              <Shield className="w-8 h-8 text-white" />
            </motion.div>
            <div className="flex-1">
              <CardTitle className={`${colorScheme.textPrimary} text-2xl font-bold mb-1`}>
                {alertData.title}
              </CardTitle>
              <p className={`${colorScheme.textSecondary} text-sm font-medium`}>
                {alertData.subtitle}
              </p>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-8 space-y-6">
          {/* Main Message */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={`p-6 ${colorScheme.cardBg} backdrop-blur-sm rounded-2xl border-2 ${colorScheme.border} shadow-sm`}
          >
            <p className={`${colorScheme.textSecondary} text-lg leading-relaxed font-medium`}>
              {alertData.message}
            </p>
          </motion.div>
          
          {/* Statistics */}
          {alertData.statistics && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className={`p-5 bg-white rounded-2xl border-l-4 ${colorScheme.accentBorder} shadow-md`}
            >
              <div className="flex items-start gap-3">
                <Sparkles className={`w-6 h-6 ${colorScheme.textSecondary} flex-shrink-0 mt-0.5`} />
                <div>
                  <p className="font-semibold text-gray-900 mb-1">You're Not Alone</p>
                  <p className={`${colorScheme.textSecondary} leading-relaxed`}>
                    {alertData.statistics}
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Support Resources */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-4"
          >
            <h4 className={`${colorScheme.textPrimary} text-xl font-bold flex items-center gap-2`}>
              <Heart className="w-6 h-6" />
              Immediate Support Available
            </h4>
            <div className="grid gap-4">
              {alertData.resources.map((resource, i) => {
                const Icon = resource.icon;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + i * 0.1 }}
                    whileHover={{ scale: 1.02, x: 5 }}
                    className="p-5 bg-white rounded-2xl border-2 border-gray-200 hover:border-gray-300 shadow-md hover:shadow-xl transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-3 bg-gradient-to-br ${colorScheme.iconBg} rounded-xl shadow-md group-hover:scale-110 transition-transform`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className={`${colorScheme.textPrimary} font-bold text-lg mb-1`}>
                          {resource.name}
                        </p>
                        <p className={`${colorScheme.textSecondary} font-mono text-xl font-semibold`}>
                          {resource.contact}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          {/* Helpful Strategies */}
          {alertData.tips && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="space-y-4"
            >
              <h4 className={`${colorScheme.textPrimary} text-xl font-bold`}>
                Helpful Strategies
              </h4>
              <div className="space-y-3">
                {alertData.tips.map((tip, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7 + i * 0.1 }}
                    className={`flex items-start gap-4 p-4 ${colorScheme.cardBg} backdrop-blur-sm rounded-xl border border-gray-200 hover:border-gray-300 transition-all`}
                  >
                    <div className={`w-2 h-2 rounded-full bg-gradient-to-br ${colorScheme.iconBg} mt-2 flex-shrink-0 shadow-sm`} />
                    <p className={`${colorScheme.textSecondary} leading-relaxed flex-1`}>
                      {tip}
                    </p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Disclaimer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className={`p-5 ${colorScheme.badge} border-2 rounded-2xl text-center shadow-sm`}
          >
            <p className="text-sm font-semibold">
              <strong className="font-bold">Important:</strong> This app is a supportive tool, not a substitute for professional medical help. If you're in crisis, please reach out to the resources above.
            </p>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
}