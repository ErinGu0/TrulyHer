import React from "react";
import { Heart, BookOpen, TrendingUp, Sparkles, Award, Zap } from "lucide-react";
import StreakCounter from "./StreakCounter";

export default function Layout({ children, currentPageName, onPageChange }) {
  const navItems = [
    { name: "Journal", key: "journal", icon: BookOpen },
    { name: "Mood", key: "dashboard", icon: TrendingUp },
    { name: "History", key: "history", icon: Heart },
    { name: "Badges", key: "badges", icon: Award },
    { name: "Insights", key: "insights", icon: Sparkles },
    { name: "Action", key: "action", icon: Zap }, // NEW: Action page
  ];

  return (
    <div className="min-h-screen relative">
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="bg-white/90 backdrop-blur-md border-b border-orange-200/40 sticky top-0 z-40">
          <div className="max-w-6xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div 
                className="flex items-center gap-3 group cursor-pointer" 
                onClick={() => onPageChange('journal')}
              >
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <Heart className="w-5 h-5 text-white" />
                </div>
                <div className="text-center">
                  <h1 className="text-xl font-bold sunset-gradient-text">TrulyHer</h1>
                  <p className="text-xs text-gray-600">Your authentic voice matters</p>
                </div>
              </div>
              <StreakCounter />
            </div>
          </div>
        </header>

        {/* Desktop Sidebar */}
        <div className="fixed left-0 top-0 h-full pt-28 w-64 z-30">
          <nav className="p-8">
            <ul className="space-y-4">
              {navItems.map((item) => {
                const isActive = currentPageName === item.key;
                const Icon = item.icon;
                return (
                  <li key={item.key}>
                    <button
                      onClick={() => onPageChange(item.key)}
                      className={`flex items-center gap-6 px-8 py-6 rounded-3xl transition-all duration-300 w-full glass-effect border-0 ${
                        isActive 
                          ? "bg-gradient-to-r from-pink-100/90 via-blue-100/90 to-purple-100/90 text-pink-700 scale-105 ring-4 ring-pink-100 shadow-2xl" 
                          : "bg-white/80 text-gray-700 hover:bg-purple-50 hover:scale-105 shadow-lg hover:shadow-2xl"
                      }`}
                      style={{boxShadow: '0 12px 40px 0 rgba(31, 38, 135, 0.12)', fontSize: '1.18rem', fontWeight: 700, letterSpacing: '0.03em'}}
                    >
                      <Icon className="w-8 h-8 mr-3 drop-shadow-sm" />
                      <span className="font-semibold tracking-wide" style={{fontFamily: 'Poppins, Quicksand, Segoe UI, sans-serif'}}>{item.name}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>

        {/* Main Content */}
        <div className="pb-24 md:pb-0 md:pl-64 flex-1">
          <main className="max-w-4xl w-full mx-auto px-4 py-8 md:py-12">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}