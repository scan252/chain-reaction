import { useDraggable } from '@dnd-kit/core';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { Card } from './Card';
import type { CardInstance } from '../types';
import { useIsMobile } from '../hooks/useIsMobile';

interface HandAreaProps {
  selectedUuid?: string | null;
  onSelectCard?: (uuid: string) => void;
}

function DraggableCard({
  card,
  index,
  selected,
  onSelect,
}: {
  card: CardInstance;
  index: number;
  selected: boolean;
  onSelect?: (uuid: string) => void;
}) {
  const isMobile = useIsMobile();
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
  const rotation = (index - midIndex) * (isMobile ? 1.4 : 2.2);
  const yOffset = Math.abs(index - midIndex) * (isMobile ? 2 : 3);

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      initial={{ y: 80, opacity: 0 }}
      animate={{
        y: selected ? -18 : yOffset,
        opacity: isDragging ? 0.35 : 1,
        rotate: isDragging ? 0 : rotation,
      }}
      transition={{
        type: 'spring',
        stiffness: 260,
        damping: 24,
        delay: index * 0.03,
      }}
      whileHover={{ y: selected ? -18 : -14, rotate: 0, zIndex: 50 }}
      onClick={() => onSelect?.(card.uuid)}
      className={`cursor-grab active:cursor-grabbing touch-none -ml-4 sm:-ml-2 first:ml-0 ${selected ? 'z-40' : ''}`}
    >
      <div className={selected ? 'ring-2 ring-[var(--gold-400)] rounded-xl shadow-[0_0_18px_rgba(212,169,92,0.45)]' : ''}>
        <Card card={card} size={isMobile ? 'xs' : 'md'} isDragging={isDragging} damageBonus={globalDamageBonus} />
      </div>
    </motion.div>
  );
}

export function HandArea({ selectedUuid, onSelectCard }: HandAreaProps) {
  const hand = useGameStore((s) => s.hand);
  const phase = useGameStore((s) => s.phase);

  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="flex items-end justify-center min-h-[84px] sm:min-h-[136px] overflow-x-clip px-2">
        <AnimatePresence mode="popLayout">
          {hand.map((card, i) => (
            <DraggableCard
              key={card.uuid}
              card={card}
              index={i}
              selected={selectedUuid === card.uuid}
              onSelect={onSelectCard}
            />
          ))}
        </AnimatePresence>
        {hand.length === 0 && phase === 'PLAY' && (
          <span className="text-xs text-[var(--text-muted)] tracking-[0.25em] py-8">手牌已出完</span>
        )}
      </div>
    </div>
  );
}
