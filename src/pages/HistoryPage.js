import React, { useState, useEffect } from "react";
import { journalService } from "../services/journalService";
import { Card, CardContent, CardHeader } from "../components/ui/Card";
import { format } from "date-fns";
import { Heart, Calendar, Sparkles, Search } from "lucide-react";
import { motion } from "framer-motion";

import EntryCard from "../components/history/EntryCard";
import SearchBar from "../components/history/SearchBar";

export default function HistoryPage() {
  const [entries, setEntries] = useState([]);
  const [filteredEntries, setFilteredEntries] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [semanticSearch, setSemanticSearch] = useState(false);

  useEffect(() => {
    loadEntries();
  }, []);

  // Search by meaning, not by substring. "felt like a fraud in standup" should
  // surface the entry that says "everyone else clearly knew what they were
  // doing" even though they share no words. Debounced because each query costs
  // one embedding call.
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredEntries(entries);
      setSemanticSearch(false);
      return undefined;
    }

    let cancelled = false;
    setIsSearching(true);

    const timer = setTimeout(async () => {
      const results = await journalService.searchEntries(searchTerm);
      if (cancelled) return;

      setFilteredEntries(results);
      // Similarity scores only come back from the vector search; their presence
      // is how we know we are not looking at the substring fallback.
      setSemanticSearch(results.some((entry) => entry.similarity !== undefined));
      setIsSearching(false);
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      setIsSearching(false);
    };
  }, [entries, searchTerm]);

  const loadEntries = async () => {
    try {
      const data = await journalService.getEntries(100);
      setEntries(data);
      setFilteredEntries(data);
    } catch (error) {
      console.error("Error loading entries:", error);
    }
    setIsLoading(false);
  };

  const getMoodColor = (mood) => {
    if (mood >= 8) return "bg-green-100 text-green-700";
    if (mood >= 6) return "bg-yellow-100 text-yellow-700";
    if (mood >= 4) return "bg-orange-100 text-orange-700";
    return "bg-red-100 text-red-700";
  };

  const getMoodEmoji = (mood) => {
    if (mood >= 8) return "😊";
    if (mood >= 6) return "🙂";
    if (mood >= 4) return "😐";
    return "😔";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-gradient-to-r from-indigo-400 to-purple-400 rounded-full flex items-center justify-center shadow-lg">
            <Heart className="w-8 h-8 text-white" />
          </div>
        </div>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">
          Your Journey So Far
        </h1>
        <p className="text-gray-600">
          Revisit your beautiful thoughts and growth 📖
        </p>
      </div>

      {/* Search */}
      <div className="space-y-2">
        <SearchBar value={searchTerm} onChange={setSearchTerm} />
        {searchTerm.trim() && (
          <p className="text-center text-xs text-gray-500">
            {isSearching
              ? "Searching…"
              : semanticSearch
                ? "Matched by meaning, not keywords"
                : "Keyword match (semantic search unavailable offline)"}
          </p>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-pink-200 text-center p-4 shadow-lg">
          <div className="text-2xl font-bold text-gray-800">{entries.length}</div>
          <div className="text-sm text-gray-500">Total Entries</div>
        </Card>
        <Card className="border-pink-200 text-center p-4 shadow-lg">
          <div className="text-2xl font-bold text-gray-800">
            {entries.length > 0 ? Math.ceil(entries.length / 7) : 0}
          </div>
          <div className="text-sm text-gray-500">Weeks Tracking</div>
        </Card>
        <Card className="border-pink-200 text-center p-4 shadow-lg">
          <div className="text-2xl font-bold text-gray-800">
            {entries.length > 0 ? (entries.reduce((sum, e) => sum + (e.mood_score || 0), 0) / entries.length).toFixed(1) : '0.0'}
          </div>
          <div className="text-sm text-gray-500">Avg Mood</div>
        </Card>
        <Card className="border-pink-200 text-center p-4 shadow-lg">
          <div className="text-2xl font-bold text-gray-800">
            {[...new Set(entries.flatMap(e => e.emotions || []))].length}
          </div>
          <div className="text-sm text-gray-500">Emotions Felt</div>
        </Card>
      </div>

      {/* Entries */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin w-8 h-8 border-4 border-pink-200 border-t-pink-500 rounded-full mx-auto"></div>
            <p className="text-gray-500 mt-2">Loading your memories...</p>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="text-center py-8">
            <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">
              {searchTerm ? "No entries match your search" : "Start your journey by writing your first entry!"}
            </p>
          </div>
        ) : (
          filteredEntries.map((entry, index) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <EntryCard 
                entry={entry}
                getMoodColor={getMoodColor}
                getMoodEmoji={getMoodEmoji}
              />
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}