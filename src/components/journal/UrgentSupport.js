import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";
import { AlertTriangle, Phone, MessageCircle, Heart } from "lucide-react";
import { motion } from "framer-motion";

const supportInfo = {
  imposter_syndrome: {
    title: "You're Not Alone - Imposter Syndrome Support",
    message: "It sounds like you're experiencing imposter syndrome - feeling like a fraud or undeserving of your success. This is incredibly common among successful women.",
    statistics: "According to research, 75% of women executives experience imposter syndrome. Remember that your achievements are earned and deserved.",
    tips: [
      "Acknowledge these feelings are normal and temporary",
      "Practice daily affirmations: 'I deserve my success', 'I am qualified and capable'",
      "Keep an accomplishment journal - document your wins, big and small",
      "Reframe your inner dialogue: Replace 'I was lucky' with 'I created that opportunity'"
    ],
    resources: [
      { name: "Crisis Text Line", contact: "Text CONNECT to 686868", icon: MessageCircle },
      { name: "Mental Health Support", contact: "1-866-925-5454", icon: Phone }
    ]
  },
  depression: {
    title: "Support for Low Mood & Depression",
    message: "It sounds like things are feeling really heavy right now. Please know that support is available and you don't have to go through this alone.",
    tips: [
      "Practice self-compassion; it's okay to not be okay",
      "Engage in a small, manageable activity you usually enjoy",
      "Reach out to a trusted friend or family member",
      "Consider a grounding exercise: Name things you can see, touch, hear, smell"
    ],
    resources: [
      { name: "Crisis Text Line", contact: "Text CONNECT to 686868", icon: MessageCircle },
      { name: "Mental Health Support", contact: "1-866-925-5454", icon: Phone }
    ]
  }
};

export default function UrgentSupport({ alerts }) {
  if (!alerts || alerts.length === 0) return null;

  const alertData = supportInfo[alerts[0]];
  if (!alertData) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
      <Card className="border-red-300 bg-red-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-red-700">
            <AlertTriangle className="w-6 h-6" />
            {alertData.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-red-800 font-medium">{alertData.message}</p>
          
          {alertData.statistics && (
            <div className="bg-pink-50 p-4 rounded-lg border-l-4 border-pink-400">
              <p className="text-pink-800"><strong>You're not alone:</strong> {alertData.statistics}</p>
            </div>
          )}

          {/* Support Resources */}
          <div className="space-y-3">
            <h4 className="font-semibold text-red-700 flex items-center gap-2">
              <Heart className="w-5 h-5" />
              Support Resources
            </h4>
            <div className="grid gap-3">
              {alertData.resources.map((resource, i) => {
                const Icon = resource.icon;
                return (
                  <div key={i} className="p-3 bg-white rounded-lg border border-red-200">
                    <div className="flex items-center gap-3 mb-1">
                      <Icon className="w-4 h-4 text-red-600" />
                      <span className="font-semibold text-red-800">{resource.name}</span>
                    </div>
                    <p className="text-red-700 font-mono">{resource.contact}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {alertData.tips && (
            <div className="space-y-2">
              <h4 className="font-semibold text-red-700">Helpful Strategies:</h4>
              <ul className="list-disc list-inside space-y-2 text-red-800">
                {alertData.tips.map((tip, i) => <li key={i}>{tip}</li>)}
              </ul>
            </div>
          )}

          <div className="text-xs text-red-600 italic text-center p-3 border-t border-red-200 bg-red-100 rounded">
            <strong>Important:</strong> This app is a supportive tool, not a substitute for professional medical help.
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}