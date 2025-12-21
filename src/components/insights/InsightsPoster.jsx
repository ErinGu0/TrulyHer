import React from "react";
import { motion } from "framer-motion";
import { Download, Sparkles, Star, Heart, Zap } from "lucide-react";

export default function InsightsPoster({ 
  strengths = [], 
  growthAreas = [], 
  tips = [],
  encouragingMessage = ""
}) {
  const posterRef = React.useRef(null);

  // Download as high-res image
  const downloadPoster = async () => {
    if (!posterRef.current) return;
    
    try {
      const html2canvas = (await import('html2canvas')).default;
      
      const canvas = await html2canvas(posterRef.current, {
        backgroundColor: '#f8f9fa',
        scale: 4,
        logging: false,
        useCORS: true,
        allowTaint: true,
        width: posterRef.current.offsetWidth,
        height: posterRef.current.offsetHeight,
      });
      
      const link = document.createElement('a');
      link.download = `emotional-insights-${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();
    } catch (error) {
      console.error('Download failed:', error);
      alert('To download, please run: npm install html2canvas');
    }
  };

  if (!strengths.length && !growthAreas.length && !tips.length) {
    return null;
  }

  // Redistribute content evenly - aim for 3 items per column
  const maxItems = Math.max(strengths.length, growthAreas.length, tips.length);
  const targetItems = 3;
  
  const balancedStrengths = strengths.slice(0, targetItems);
  const balancedGrowth = growthAreas.slice(0, targetItems);
  const balancedTips = tips.slice(0, targetItems);

  return (
    <div className="relative w-full max-w-5xl mx-auto my-16">
      {/* Download Button */}
      <motion.button
        onClick={downloadPoster}
        whileHover={{ scale: 1.05, y: -2 }}
        whileTap={{ scale: 0.95 }}
        className="absolute -top-16 right-4 flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-pink-300 via-purple-300 to-blue-300 text-white font-semibold rounded-full hover:shadow-2xl transition-all z-20 text-sm backdrop-blur-sm"
        style={{
          boxShadow: '0 8px 32px rgba(219, 112, 255, 0.3)'
        }}
      >
        <Download className="w-4 h-4" />
        Save Your Journey
      </motion.button>

      {/* Poster Container */}
      <motion.div
        ref={posterRef}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative w-full overflow-hidden rounded-[40px] shadow-2xl"
        style={{
          background: 'linear-gradient(135deg, #fbc2eb 0%, #a6c1ee 25%, #c2e9fb 50%, #fbc2eb 75%, #e0c3fc 100%)',
          boxShadow: '0 20px 60px rgba(139, 92, 246, 0.3)'
        }}
      >
        <div className="relative bg-gradient-to-br from-white/95 via-white/90 to-white/95 backdrop-blur-xl p-16">
          {/* Floating Decorative Elements */}
          <div className="absolute inset-0 overflow-hidden opacity-60">
            <div className="absolute top-10 left-10 w-32 h-32 rounded-full bg-gradient-to-br from-pink-200 to-purple-200 blur-3xl animate-pulse"></div>
            <div className="absolute top-20 right-20 w-40 h-40 rounded-full bg-gradient-to-br from-blue-200 to-cyan-200 blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
            <div className="absolute bottom-20 left-1/4 w-36 h-36 rounded-full bg-gradient-to-br from-purple-200 to-pink-200 blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
            <div className="absolute bottom-10 right-1/3 w-28 h-28 rounded-full bg-gradient-to-br from-cyan-200 to-blue-200 blur-3xl animate-pulse" style={{ animationDelay: '0.5s' }}></div>
          </div>

          {/* Sparkle Decorations */}
          <div className="absolute top-8 left-8 text-pink-300 opacity-60">
            <Star className="w-6 h-6 fill-current" />
          </div>
          <div className="absolute top-12 right-12 text-purple-300 opacity-60">
            <Sparkles className="w-7 h-7 fill-current" />
          </div>
          <div className="absolute bottom-12 left-16 text-blue-300 opacity-60">
            <Heart className="w-6 h-6 fill-current" />
          </div>

          {/* Content */}
          <div className="relative z-10">
            {/* Header */}
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="text-center mb-14"
            >
              <motion.div 
                className="inline-block mb-6"
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              >
                <Sparkles className="w-12 h-12 text-purple-400 mx-auto" style={{ filter: 'drop-shadow(0 4px 12px rgba(168, 85, 247, 0.4))' }} />
              </motion.div>
              <h1 
                className="text-7xl font-black mb-4 tracking-tight leading-none"
                style={{
                  background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 50%, #3b82f6 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  fontFamily: "'Quicksand', 'Comfortaa', sans-serif",
                  textShadow: '0 0 40px rgba(168, 85, 247, 0.15)'
                }}
              >
                Your Journey
              </h1>
              <p 
                className="text-xl text-gray-500 font-light tracking-wide"
                style={{ fontFamily: "'Quicksand', sans-serif" }}
              >
                a reflection of your beautiful growth ✨
              </p>
            </motion.div>

            {/* Three Sections Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
              {/* Strengths */}
              {balancedStrengths.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.6 }}
                  className="relative group"
                >
                  <div 
                    className="absolute inset-0 rounded-[32px] opacity-70 group-hover:opacity-100 transition-opacity duration-300"
                    style={{
                      background: 'linear-gradient(135deg, #fce7f3 0%, #f3e8ff 100%)',
                      boxShadow: '0 8px 32px rgba(236, 72, 153, 0.15)'
                    }}
                  ></div>
                  <div className="relative p-8 backdrop-blur-sm">
                    <div className="flex flex-col items-center mb-8">
                      <motion.div
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        className="mb-3"
                      >
                        <Star className="w-8 h-8 text-pink-400 fill-pink-400" style={{ filter: 'drop-shadow(0 4px 8px rgba(236, 72, 153, 0.3))' }} />
                      </motion.div>
                      <h2 
                        className="text-3xl font-bold text-pink-600"
                        style={{ fontFamily: "'Quicksand', sans-serif" }}
                      >
                        Strengths
                      </h2>
                    </div>
                    <div className="space-y-5">
                      {balancedStrengths.map((strength, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.4 + idx * 0.1, duration: 0.5 }}
                          className="flex items-start gap-4"
                        >
                          <div 
                            className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg"
                            style={{
                              background: 'linear-gradient(135deg, #ec4899 0%, #f472b6 100%)',
                              boxShadow: '0 4px 12px rgba(236, 72, 153, 0.4)'
                            }}
                          >
                            {idx + 1}
                          </div>
                          <p 
                            className="text-gray-700 text-sm leading-relaxed font-medium"
                            style={{ fontFamily: "'Nunito', sans-serif" }}
                          >
                            {strength}
                          </p>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Growth Opportunities */}
              {balancedGrowth.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.6 }}
                  className="relative group"
                >
                  <div 
                    className="absolute inset-0 rounded-[32px] opacity-70 group-hover:opacity-100 transition-opacity duration-300"
                    style={{
                      background: 'linear-gradient(135deg, #dbeafe 0%, #e0e7ff 100%)',
                      boxShadow: '0 8px 32px rgba(59, 130, 246, 0.15)'
                    }}
                  ></div>
                  <div className="relative p-8 backdrop-blur-sm">
                    <div className="flex flex-col items-center mb-8">
                      <motion.div
                        whileHover={{ scale: 1.1, rotate: -5 }}
                        className="mb-3"
                      >
                        <Zap className="w-8 h-8 text-blue-400 fill-blue-400" style={{ filter: 'drop-shadow(0 4px 8px rgba(59, 130, 246, 0.3))' }} />
                      </motion.div>
                      <h2 
                        className="text-3xl font-bold text-blue-600"
                        style={{ fontFamily: "'Quicksand', sans-serif" }}
                      >
                        Growth
                      </h2>
                    </div>
                    <div className="space-y-5">
                      {balancedGrowth.map((area, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.6 + idx * 0.1, duration: 0.5 }}
                          className="flex items-start gap-4"
                        >
                          <div 
                            className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg"
                            style={{
                              background: 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)',
                              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)'
                            }}
                          >
                            {idx + 1}
                          </div>
                          <p 
                            className="text-gray-700 text-sm leading-relaxed font-medium"
                            style={{ fontFamily: "'Nunito', sans-serif" }}
                          >
                            {area}
                          </p>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Self-Care Tips */}
              {balancedTips.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7, duration: 0.6 }}
                  className="relative group"
                >
                  <div 
                    className="absolute inset-0 rounded-[32px] opacity-70 group-hover:opacity-100 transition-opacity duration-300"
                    style={{
                      background: 'linear-gradient(135deg, #fae8ff 0%, #ede9fe 100%)',
                      boxShadow: '0 8px 32px rgba(168, 85, 247, 0.15)'
                    }}
                  ></div>
                  <div className="relative p-8 backdrop-blur-sm">
                    <div className="flex flex-col items-center mb-8">
                      <motion.div
                        whileHover={{ scale: 1.1 }}
                        animate={{ scale: [1, 1.05, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="mb-3"
                      >
                        <Heart className="w-8 h-8 text-purple-400 fill-purple-400" style={{ filter: 'drop-shadow(0 4px 8px rgba(168, 85, 247, 0.3))' }} />
                      </motion.div>
                      <h2 
                        className="text-3xl font-bold text-purple-600"
                        style={{ fontFamily: "'Quicksand', sans-serif" }}
                      >
                        Self-Care
                      </h2>
                    </div>
                    <div className="space-y-5">
                      {balancedTips.map((tip, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.8 + idx * 0.1, duration: 0.5 }}
                          className="flex items-start gap-4"
                        >
                          <div 
                            className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg"
                            style={{
                              background: 'linear-gradient(135deg, #a855f7 0%, #c084fc 100%)',
                              boxShadow: '0 4px 12px rgba(168, 85, 247, 0.4)'
                            }}
                          >
                            {idx + 1}
                          </div>
                          <p 
                            className="text-gray-700 text-sm leading-relaxed font-medium"
                            style={{ fontFamily: "'Nunito', sans-serif" }}
                          >
                            {tip}
                          </p>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Motivational Message */}
            {encouragingMessage && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.9, duration: 0.6 }}
                className="relative"
              >
                <div 
                  className="absolute inset-0 rounded-[32px] opacity-60"
                  style={{
                    background: 'linear-gradient(135deg, #fae8ff 0%, #dbeafe 100%)',
                    boxShadow: '0 8px 32px rgba(168, 85, 247, 0.1)'
                  }}
                ></div>
                <div className="relative px-10 py-10 text-center backdrop-blur-sm">
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <Sparkles className="w-10 h-10 text-purple-300 mx-auto mb-4" style={{ filter: 'drop-shadow(0 4px 8px rgba(168, 85, 247, 0.3))' }} />
                  </motion.div>
                  <p 
                    className="text-lg font-medium text-gray-700 leading-relaxed italic"
                    style={{ fontFamily: "'Crimson Text', 'Lora', serif" }}
                  >
                    "{encouragingMessage}"
                  </p>
                </div>
              </motion.div>
            )}

            {/* Footer */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.1, duration: 0.6 }}
              className="mt-12 text-center"
            >
              <p 
                className="text-sm text-gray-400 font-light tracking-wider"
                style={{ fontFamily: "'Quicksand', sans-serif" }}
              >
                {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Google Fonts Import */}
      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Quicksand:wght@300;400;500;600;700&family=Nunito:wght@400;500;600;700&family=Comfortaa:wght@300;400;500;600;700&family=Crimson+Text:ital,wght@0,400;0,600;1,400&family=Lora:ital,wght@0,400;0,500;1,400&display=swap');
      `}</style>
    </div>
  );
}