import React from "react";
import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";
import { Card, CardContent } from "../ui/Card";

// Plain-language names. The model's label ids are for the pipeline; nobody
// reading their own journal should be shown "attribution_to_luck".
const LABEL_COPY = {
  attribution_to_luck: "Crediting it to luck",
  fear_of_exposure: "Fear of being found out",
  discounting_praise: "Brushing off praise",
  overworking_to_compensate: "Overworking to keep up",
  comparison_to_peers: "Measuring against others"
};

/**
 * Breakdown from the on-device classifier.
 *
 * Only renders when the local model actually ran (`imposter_source` is
 * 'onnx-local'). If the server fell back to the generative model's guess there
 * is no calibrated number to show, and showing an uncalibrated one as if it
 * were measured would be the exact problem the classifier was built to fix.
 */
export default function ImposterSignals({ analysis }) {
  if (analysis?.imposter_source !== "onnx-local") return null;

  const labels = analysis.imposter_labels || {};
  const present = Object.entries(labels)
    .filter(([, probability]) => probability >= 0.3)
    .sort(([, a], [, b]) => b - a);

  if (present.length === 0) return null;

  return (
    <Card className="border-2 border-teal-200 bg-gradient-to-br from-teal-50/70 to-cyan-50/70 shadow-lg">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-teal-600" />
          <h3 className="font-semibold text-gray-800">What showed up in this entry</h3>
        </div>

        <div className="space-y-3">
          {present.map(([label, probability], index) => (
            <div key={label} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-700">{LABEL_COPY[label] || label}</span>
                <span className="text-gray-500 tabular-nums">
                  {Math.round(probability * 100)}%
                </span>
              </div>
              <div className="h-2 bg-white/70 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${probability * 100}%` }}
                  transition={{ delay: 0.1 * index, duration: 0.5 }}
                  className="h-full bg-gradient-to-r from-teal-400 to-cyan-500"
                />
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-gray-500 italic">
          Measured on your device by a calibrated model — this text was never sent anywhere to be scored.
        </p>
      </CardContent>
    </Card>
  );
}
