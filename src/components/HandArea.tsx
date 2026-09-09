import { useDraggable } from '@dnd-kit/core';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { Card } from './Card';
import type { CardInstance } from '../types';

function DraggableCard({ card, index }: { card: CardInstance; index: number }) {
  const phase = useGameStore((s) => s.phase);
  const globalDamageBonus = useGameStore((s) => s.globalDamageBonus);

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `hand-card-${card.uuid}`,
    data: { type: 'hand-card', card },
    disabled: phase !== 'PLAY',
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: isDragging ? 100 : 1,
      }
    : undefined;

  const totalCards = useGameStore((s) => s.hand.length);
  const midIndex = (totalCards - 1) / 2;
  const rotation = (index - midIndex) * 2.5;
  const yOffset = Math.abs(index - midIndex) * 3;

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      initial={{ y: 100, opacity: 0 }}
      animate={{
        y: yOffset,
        opacity: 1,
        rotate: isDragging ? 0 : rotation,
      }}
      transition={{
        type: 'spring',
        stiffness: 200,
        damping: 20,
        delay: index * 0.03,
      }}
      whileHover={{ y: -12, scale: 1.08, rotate: 0, zIndex: 50 }}
      className="cursor-grab active:cursor-grabbing -ml-2 first:ml-0"
    >
      <Card card={card} isDragging={isDragging} damageBonus={globalDamageBonus} />
    </motion.div>
  );
}

export function HandArea() {
  const hand = useGameStore((s) => s.hand);
  const phase = useGameStore((s) => s.phase);

  return (
    <div className="flex flex-col items-center gap-0.5 pt-2">
      {phase === 'PLAY' && hand.length > 0 && (
        <span className="text-[10px] text-green-400/60">拖拽卡牌到上方槽位</span>
      )}
      <div className="flex items-end justify-center min-h-[200px] pb-1">
        <AnimatePresence mode="popLayout">
          {hand.map((card, i) => (
            <DraggableCard key={card.uuid} card={card} index={i} />
          ))}
        </AnimatePresence>
        {hand.length === 0 && phase === 'PLAY' && (
          <span className="text-white/30 text-sm">手牌已清空</span>
        )}
      </div>
    </div>
  );
}
