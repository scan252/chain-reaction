import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/gameStore';

export function BuffDisplay() {
  const globalDamageBonus = useGameStore((s) => s.globalDamageBonus);
  const [showTooltip, setShowTooltip] = useState(false);

  if (globalDamageBonus <= 0) return null;

  return (
    <div className="flex flex-col items-center gap-1 mt-2">
      <div className="text-white/40 text-[10px] text-shadow-sm">增益</div>
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-600 to-green-800 border border-green-400/50 flex items-center justify-center cursor-help shadow-lg shadow-green-900/30">
          <span className="text-sm font-bold text-white text-shadow">+{globalDamageBonus}</span>
        </div>
        
        <AnimatePresence>
          {showTooltip && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              className="absolute top-full mt-1 left-1/2 -translate-x-1/2 w-40 p-2 bg-gray-900/95 border border-green-500/30 rounded-lg shadow-xl z-50"
            >
              <div className="text-green-400 font-bold text-xs mb-1 text-shadow-sm">共鸣增幅</div>
              <div className="text-white/70 text-[10px] leading-relaxed text-shadow-sm">
                所有动作牌基础数值 +{globalDamageBonus}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
