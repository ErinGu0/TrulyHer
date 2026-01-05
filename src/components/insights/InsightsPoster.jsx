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
        scale: 3,
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

  // Simply use the insights provided - no extra analysis
  const displayStrengths = strengths.slice(0, 3);
  const displayGrowth = growthAreas.slice(0, 3);
  const displayTips = tips.slice(0, 3);

  if (!displayStrengths.length && !displayGrowth.length && !displayTips.length) {
    return null;
  }

  return (
    <div className="relative w-full mx-auto my-12">
      {/* Download Button */}
      <motion.button
        onClick={downloadPoster}
        whileHover={{ scale: 1.05, y: -2 }}
        whileTap={{ scale: 0.95 }}
        className="absolute -top-14 right-4 flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 text-white font-semibold rounded-full hover:shadow-2xl transition-all z-20 text-sm"
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
        className="relative w-full overflow-hidden rounded-3xl shadow-2xl"
        style={{
          background: 'linear-gradient(135deg, #fbc2eb 0%, #a6c1ee 25%, #c2e9fb 50%, #fbc2eb 75%, #e0c3fc 100%)',
          boxShadow: '0 20px 60px rgba(139, 92, 246, 0.3)'
        }}
      >
        <div className="relative bg-gradient-to-br from-white/95 via-white/90 to-white/95 backdrop-blur-xl p-10">
          {/* Floating Decorative Elements */}
          <div className="absolute inset-0 overflow-hidden opacity-50">
            <div className="absolute top-10 left-10 w-24 h-24 rounded-full bg-gradient-to-br from-pink-200 to-purple-200 blur-3xl animate-pulse"></div>
            <div className="absolute top-10 right-10 w-32 h-32 rounded-full bg-gradient-to-br from-blue-200 to-cyan-200 blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
            <div className="absolute bottom-10 left-1/3 w-28 h-28 rounded-full bg-gradient-to-br from-purple-200 to-pink-200 blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
          </div>

          {/* Content */}
          <div className="relative z-10">
            {/* Header */}
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="text-center mb-8"
            >
              <motion.div 
                className="inline-block mb-3"
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              >
                <Sparkles className="w-10 h-10 text-purple-400 mx-auto" style={{ filter: 'drop-shadow(0 4px 12px rgba(168, 85, 247, 0.4))' }} />
              </motion.div>
              <h1 
                className="text-5xl font-black mb-2 tracking-tight leading-none"
                style={{
                  background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 50%, #3b82f6 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  fontFamily: "'Playfair Display', 'Cormorant Garamond', serif",
                  textShadow: '0 0 40px rgba(168, 85, 247, 0.15)'
                }}
              >
                Your Journey
              </h1>
              <p 
                className="text-base text-gray-500 font-light tracking-wide"
                style={{ fontFamily: "'Lora', 'Crimson Text', serif" }}
              >
                a reflection of your beautiful growth ✨
              </p>
            </motion.div>

            {/* Strengths Section - Horizontal */}
            {displayStrengths.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.6 }}
                className="mb-6"
              >
                <div className="flex items-center gap-3 mb-4">
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: 5 }}
                  >
                    <Star className="w-6 h-6 text-pink-400 fill-pink-400" style={{ filter: 'drop-shadow(0 4px 8px rgba(236, 72, 153, 0.3))' }} />
                  </motion.div>
                  <h2 
                    className="text-2xl font-bold text-pink-600"
                    style={{ fontFamily: "'Playfair Display', serif" }}
                  >
                    Strengths
                  </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {displayStrengths.map((strength, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + idx * 0.1, duration: 0.5 }}
                      className="relative group"
                    >
                      <div 
                        className="absolute inset-0 rounded-2xl opacity-60 group-hover:opacity-80 transition-opacity"
                        style={{
                          background: 'linear-gradient(135deg, #fce7f3 0%, #f3e8ff 100%)',
                          boxShadow: '0 4px 16px rgba(236, 72, 153, 0.1)'
                        }}
                      ></div>
                      <div className="relative p-4 flex items-start gap-3">
                        <div 
                          className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-md"
                          style={{
                            background: 'linear-gradient(135deg, #ec4899 0%, #f472b6 100%)',
                            boxShadow: '0 2px 8px rgba(236, 72, 153, 0.3)'
                          }}
                        >
                          {idx + 1}
                        </div>
                        <p 
                          className="text-gray-700 text-sm leading-relaxed font-medium"
                          style={{ fontFamily: "'Source Sans Pro', 'Inter', sans-serif" }}
                        >
                          {strength}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Growth Section - Horizontal */}
            {displayGrowth.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.6 }}
                className="mb-6"
              >
                <div className="flex items-center gap-3 mb-4">
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: -5 }}
                  >
                    <Zap className="w-6 h-6 text-blue-400 fill-blue-400" style={{ filter: 'drop-shadow(0 4px 8px rgba(59, 130, 246, 0.3))' }} />
                  </motion.div>
                  <h2 
                    className="text-2xl font-bold text-blue-600"
                    style={{ fontFamily: "'Quicksand', sans-serif" }}
                  >
                    Growth Opportunities
                  </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {displayGrowth.map((area, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6 + idx * 0.1, duration: 0.5 }}
                      className="relative group"
                    >
                      <div 
                        className="absolute inset-0 rounded-2xl opacity-60 group-hover:opacity-80 transition-opacity"
                        style={{
                          background: 'linear-gradient(135deg, #dbeafe 0%, #e0e7ff 100%)',
                          boxShadow: '0 4px 16px rgba(59, 130, 246, 0.1)'
                        }}
                      ></div>
                      <div className="relative p-4 flex items-start gap-3">
                        <div 
                          className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-md"
                          style={{
                            background: 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)',
                            boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)'
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
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Self-Care Section - Horizontal */}
            {displayTips.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7, duration: 0.6 }}
                className="mb-6"
              >
                <div className="flex items-center gap-3 mb-4">
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Heart className="w-6 h-6 text-purple-400 fill-purple-400" style={{ filter: 'drop-shadow(0 4px 8px rgba(168, 85, 247, 0.3))' }} />
                  </motion.div>
                  <h2 
                    className="text-2xl font-bold text-purple-600"
                    style={{ fontFamily: "'Quicksand', sans-serif" }}
                  >
                    Self-Care Tips
                  </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {displayTips.map((tip, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.8 + idx * 0.1, duration: 0.5 }}
                      className="relative group"
                    >
                      <div 
                        className="absolute inset-0 rounded-2xl opacity-60 group-hover:opacity-80 transition-opacity"
                        style={{
                          background: 'linear-gradient(135deg, #fae8ff 0%, #ede9fe 100%)',
                          boxShadow: '0 4px 16px rgba(168, 85, 247, 0.1)'
                        }}
                      ></div>
                      <div className="relative p-4 flex items-start gap-3">
                        <div 
                          className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-md"
                          style={{
                            background: 'linear-gradient(135deg, #a855f7 0%, #c084fc 100%)',
                            boxShadow: '0 2px 8px rgba(168, 85, 247, 0.3)'
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
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Motivational Message */}
            {encouragingMessage && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.9, duration: 0.6 }}
                className="relative mt-6"
              >
                <div 
                  className="absolute inset-0 rounded-2xl opacity-50"
                  style={{
                    background: 'linear-gradient(135deg, #fae8ff 0%, #dbeafe 100%)',
                    boxShadow: '0 4px 16px rgba(168, 85, 247, 0.1)'
                  }}
                ></div>
                <div className="relative px-8 py-6 text-center">
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <Sparkles className="w-8 h-8 text-purple-300 mx-auto mb-3" style={{ filter: 'drop-shadow(0 4px 8px rgba(168, 85, 247, 0.3))' }} />
                  </motion.div>
                  <p 
                    className="text-base font-medium text-gray-700 leading-relaxed italic"
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
              transition={{ delay: 1.0, duration: 0.6 }}
              className="mt-6 text-center"
            >
              <p 
                className="text-xs text-gray-400 font-light tracking-wider"
                style={{ fontFamily: "'Quicksand', sans-serif" }}
              >
                {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Google Fonts Import */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700;800;900&family=Lora:ital,wght@0,400;0,500;0,600;1,400&family=Crimson+Text:ital,wght@0,400;0,600;1,400&family=Source+Sans+Pro:wght@300;400;600;700&family=Inter:wght@300;400;500;600&family=Cormorant+Garamond:wght@300;400;500;600;700&display=swap');
      `}</style>
    </div>
  );
}