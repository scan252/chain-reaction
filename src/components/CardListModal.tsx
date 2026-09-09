import { motion, AnimatePresence } from 'framer-motion';
import type { CardInstance } from '../types';
import { Card } from './Card';

interface CardListModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  cards: CardInstance[];
}

export function CardListModal({ isOpen, onClose, title, cards }: CardListModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={onClose}
        >
          {/* 遮罩 */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

          {/* 面板 */}
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.85, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="relative panel p-6 max-w-xl w-[90%] max-h-[70vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 标题 */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-[var(--text-primary)] tracking-[0.2em]">{title} <span className="num text-[var(--text-muted)]">({cards.length})</span></h3>
              <button
                onClick={onClose}
                className="text-white/40 hover:text-white text-xl cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* 卡牌网格 */}
            <div className="overflow-y-auto flex-1 pr-1">
              {cards.length === 0 ? (
                <div className="text-white/30 text-center py-8">暂无卡牌</div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 justify-items-center">
                  {cards.map((card) => (
                    <Card key={card.uuid} card={card} size="sm" />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
