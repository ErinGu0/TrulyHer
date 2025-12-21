import React from "react";
import { motion } from "framer-motion";
import { Download } from "lucide-react";

const emotionColors = [
  "text-pink-600",
  "text-purple-600",
  "text-indigo-600",
  "text-blue-600",
  "text-teal-600",
  "text-green-600",
  "text-yellow-600",
  "text-orange-600",
  "text-rose-600",
  "text-fuchsia-600",
  "text-cyan-600",
  "text-emerald-600"
];

export default function EmotionCloud({ emotions = [] }) {
  const cloudRef = React.useRef(null);

  if (!emotions || emotions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>Start journaling to see your emotion patterns! 💭</p>
      </div>
    );
  }

  const maxCount = Math.max(...emotions.map(e => e.count));
  const minCount = Math.min(...emotions.map(e => e.count));

  // Calculate font size based on frequency (bigger = more frequent)
  const getFontSize = (count) => {
    if (maxCount === minCount) return 1.0;
    const normalized = (count - minCount) / (maxCount - minCount);
    return 0.8 + normalized * 1.4; // Range from 0.8rem to 2.2rem (even smaller to reduce overlap)
  };

  // Download as image
  const downloadCloud = async () => {
    if (!cloudRef.current) return;
    
    try {
      const html2canvas = (await import('html2canvas')).default;
      
      // Force a specific size for consistent rendering
      const canvas = await html2canvas(cloudRef.current, {
        backgroundColor: null,
        scale: 3,
        logging: false,
        useCORS: true,
        allowTaint: true,
        width: cloudRef.current.scrollWidth,
        height: cloudRef.current.scrollHeight,
      });
      
      const link = document.createElement('a');
      link.download = `emotion-cloud-${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();
    } catch (error) {
      console.error('Download failed:', error);
      alert('To download, please run: npm install html2canvas');
    }
  };

  // Create a more organic, cloud-like layout - MORE LEFT with BETTER vertical spacing
  const positions = [
    { x: 15, y: 14, rotate: -5 },
    { x: 33, y: 10, rotate: 3 },
    { x: 50, y: 18, rotate: -2 },
    { x: 10, y: 32, rotate: 4 },
    { x: 28, y: 30, rotate: 2 },
    { x: 44, y: 38, rotate: -3 },
    { x: 18, y: 50, rotate: 1 },
    { x: 36, y: 54, rotate: -4 },
    { x: 52, y: 62, rotate: 3 },
    { x: 16, y: 70, rotate: -1 },
    { x: 34, y: 76, rotate: 2 },
    { x: 48, y: 84, rotate: -2 }
  ];

  return (
    <div className="relative">
      {/* Download Button */}
      <button
        onClick={downloadCloud}
        className="absolute -top-10 right-0 flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs rounded-full hover:scale-105 transition-transform shadow-lg z-20"
      >
        <Download className="w-3 h-3" />
        Download
      </button>

      {/* Cloud Container */}
      <div 
        ref={cloudRef}
        className="relative w-full rounded-3xl p-14"
        style={{ 
          height: '350px',
          maxWidth: '100%',
          background: 'linear-gradient(135deg, #fce7f3 0%, #e9d5ff 50%, #dbeafe 100%)'
        }}
      >
        {emotions.map((item, index) => {
          const size = getFontSize(item.count);
          const color = emotionColors[index % emotionColors.length];
          const position = positions[index % positions.length];
          
          return (
            <motion.div
              key={item.emotion}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ 
                delay: index * 0.08,
                type: "spring",
                stiffness: 150,
                damping: 12
              }}
              whileHover={{ 
                scale: 1.15,
                zIndex: 10,
                transition: { duration: 0.2 }
              }}
              className="absolute cursor-default"
              style={{
                left: `${position.x}%`,
                top: `${position.y}%`,
                transform: `translate(-50%, -50%) rotate(${position.rotate}deg)`,
              }}
            >
              <div 
                className={`${color} font-extrabold whitespace-nowrap`}
                style={{ 
                  fontSize: `${size}rem`,
                  textShadow: '2px 2px 4px rgba(0,0,0,0.15)'
                }}
              >
                {item.emotion}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 text-center text-xs text-gray-500">
        <p>✨ Bigger words appear more frequently in your journal</p>
      </div>
    </div>
  );
}