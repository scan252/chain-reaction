import { motion, AnimatePresence } from 'framer-motion';
import type { CardInstance } from '../types';
import { Card } from './Card';
import { Icon } from './icons';

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
          <div className="absolute inset-0 overlay" />

          {/* 面板 */}
          <motion.div
            initial={{ scale: 0.88, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 12 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            className="relative panel panel-gold p-6 max-w-xl w-[90%] max-h-[70vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 标题 */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="flex items-baseline gap-2 text-base font-black tracking-[0.24em]" style={{ color: 'var(--brass-200)' }}>
                {title}
                <span className="num text-[13px] font-semibold tracking-normal" style={{ color: 'var(--text-muted)' }}>
                  {cards.length} 张
                </span>
              </h3>
              <button
                onClick={onClose}
                className="w-7 h-7 flex items-center justify-center rounded-md cursor-pointer transition-colors"
                style={{ color: 'var(--text-muted)', border: '1px solid var(--line-soft)' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
                title="关闭"
              >
                <Icon name="x" size={13} />
              </button>
            </div>

            <div className="hairline-gold mb-4" />

            {/* 卡牌网格 */}
            <div className="overflow-y-auto flex-1 pr-1">
              {cards.length === 0 ? (
                <div className="etch-label text-center py-10" style={{ letterSpacing: '0.3em' }}>暂 无 卡 牌</div>
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
