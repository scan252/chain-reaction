import { motion } from 'framer-motion';
import { useGameStore } from '../store/gameStore';

export function DeckPile({ onClick }: { onClick?: () => void }) {
  const drawPile = useGameStore((s) => s.drawPile);

  return (
    <motion.div
      className="flex flex-col items-center gap-1 cursor-pointer"
      whileHover={{ scale: 1.08 }}
      onClick={onClick}
    >
      <div className="w-16 h-22 rounded-lg bg-gradient-to-br from-blue-800 to-blue-950 border border-blue-500/30 flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_4px,rgba(255,255,255,0.03)_4px,rgba(255,255,255,0.03)_8px)]" />
        <span className="text-blue-300 text-lg font-bold z-10 text-shadow">{drawPile.length}</span>
      </div>
      <span className="text-[10px] text-blue-400/60 ">牌库</span>
    </motion.div>
  );
}

export function DiscardPile({ onClick }: { onClick?: () => void }) {
  const discardPile = useGameStore((s) => s.discardPile);

  return (
    <motion.div
      className="flex flex-col items-center gap-1 cursor-pointer"
      whileHover={{ scale: 1.08 }}
      onClick={onClick}
    >
      <div className="w-16 h-22 rounded-lg bg-gradient-to-br from-gray-700 to-gray-900 border border-gray-600/30 flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[repeating-linear-gradient(-45deg,transparent,transparent_4px,rgba(255,255,255,0.02)_4px,rgba(255,255,255,0.02)_8px)]" />
        <span className="text-gray-400 text-lg font-bold z-10 text-shadow">{discardPile.length}</span>
      </div>
      <span className="text-[10px] text-gray-500/60 ">弃牌堆</span>
    </motion.div>
  );
}

export function ExhaustPile({ onClick }: { onClick?: () => void }) {
  const exhaustPile = useGameStore((s) => s.exhaustPile);

  return (
    <motion.div
      className="flex flex-col items-center gap-1 cursor-pointer"
      whileHover={{ scale: 1.08 }}
      onClick={onClick}
    >
      <div className="w-16 h-22 rounded-lg bg-gradient-to-br from-orange-800 to-red-950 border border-orange-600/30 flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_4px,rgba(255,255,255,0.03)_4px,rgba(255,255,255,0.03)_8px)]" />
        <span className="text-orange-300 text-lg font-bold z-10 text-shadow">{exhaustPile.length}</span>
      </div>
      <span className="text-[10px] text-orange-500/60 ">消耗堆</span>
    </motion.div>
  );
}
