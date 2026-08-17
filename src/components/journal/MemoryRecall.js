import React from "react";
import { motion } from "framer-motion";
import { History, Sparkles } from "lucide-react";
import { Card, CardContent } from "../ui/Card";
import { format } from "date-fns";

/**
 * Shows what the analysis was actually grounded in.
 *
 * Being explicit about this matters for trust: "I noticed a pattern" from an
 * app that cannot remember anything is a claim, and people can tell. Naming the
 * dates it drew on makes it checkable.
 */
export default function MemoryRecall({ memory, continuityNote }) {
  if (!memory?.enabled || !memory.retrievedCount) return null;
  if (!continuityNote || !continuityNote.trim()) return null;

  const { relatedEntries = [] } = memory;

  return (
    <Card className="border-2 border-indigo-200 bg-gradient-to-br from-indigo-50/80 to-purple-50/80 shadow-lg">
      <CardContent className="p-6 space-y-3">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-indigo-500" />
          <h3 className="font-semibold text-gray-800">You've been here before</h3>
          <Sparkles className="w-4 h-4 text-purple-400" />
        </div>

        <p className="text-gray-700 leading-relaxed">{continuityNote}</p>

        <div className="flex flex-wrap gap-2 pt-1">
          {relatedEntries.map((entry, index) => (
            <motion.span
              key={entry.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * index }}
              className="text-xs bg-white/80 border border-indigo-200 rounded-full px-3 py-1 text-indigo-700"
              title={`Cosine similarity ${entry.similarity}`}
            >
              {format(new Date(entry.entryDate), "MMM d")}
              {entry.moodScore != null && ` · mood ${entry.moodScore}/10`}
            </motion.span>
          ))}
        </div>

        <p className="text-xs text-gray-500 italic">
          Drawn from {memory.retrievedCount} of your past{" "}
          {memory.retrievedCount === 1 ? "entry" : "entries"}, matched by meaning rather than keywords.
        </p>
      </CardContent>
    </Card>
  );
}
