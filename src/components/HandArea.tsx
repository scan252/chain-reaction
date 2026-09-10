import { useEffect, useRef, useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { Card } from './Card';
import type { CardInstance } from '../types';

interface HandAreaProps {
  selectedUuid?: string | null;
  onSelectCard?: (uuid: string) => void;
}

const CARD_W = 112; // w-28
const CARD_H = 160; // h-40
const MIN_VISIBLE = 34; // 重叠时每张至少露出的宽度

function DraggableCard({
  card,
  index,
  count,
  overlap,
  selected,
  onSelect,
}: {
  card: CardInstance;
  index: number;
  count: number;
  overlap: number;
  selected: boolean;
  onSelect?: (uuid: string) => void;
}) {
  const phase = useGameStore((s) => s.phase);
  const globalDamageBonus = useGameStore((s) => s.globalDamageBonus);

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `hand-card-${card.uuid}`,
    data: { type: 'hand-card', card },
    disabled: phase !== 'PLAY',
  });

  const mid = (count - 1) / 2;
  const offset = index - mid;
  const rotation = count > 1 ? offset * 2.6 : 0;
  // 扇形弧度：离中心越远越低
  const arcY = count > 1 ? Math.pow(Math.abs(offset), 1.6) * 3.2 : 0;

  const style: React.CSSProperties = {
    transformOrigin: 'bottom center',
    marginLeft: index === 0 ? 0 : -overlap,
    zIndex: isDragging ? 100 : index,
    ...(transform
      ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
      : undefined),
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      initial={{ y: 90, opacity: 0 }}
      animate={{
        y: selected ? -20 : arcY,
        opacity: isDragging ? 0.3 : 1,
        rotate: isDragging ? 0 : rotation,
      }}
      transition={{ type: 'spring', stiffness: 280, damping: 26, delay: index * 0.025 }}
      whileHover={{ y: selected ? -20 : -22, rotate: 0, zIndex: 60 }}
      onClick={() => onSelect?.(card.uuid)}
      className="cursor-grab active:cursor-grabbing shrink-0"
    >
      <div
        className={selected ? 'rounded-[10px]' : undefined}
        style={selected ? { boxShadow: '0 0 0 2px #e6cc8b, 0 0 22px rgba(217,184,105,0.55)' } : undefined}
      >
        <Card card={card} isDragging={isDragging} damageBonus={globalDamageBonus} />
      </div>
    </motion.div>
  );
}

export function HandArea({ selectedUuid, onSelectCard }: HandAreaProps) {
  const hand = useGameStore((s) => s.hand);
  const phase = useGameStore((s) => s.phase);
  const containerRef = useRef<HTMLDivElement>(null);
  const [availWidth, setAvailWidth] = useState(720);

  // 容器宽度变化时重算重叠量，保证任意手牌数都不溢出
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setAvailWidth(e.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const n = hand.length;
  const natural = n * CARD_W;
  const overlap = n > 1 && natural > availWidth
    ? Math.min((natural - availWidth) / (n - 1), CARD_W - MIN_VISIBLE)
    : 0;

  // 扇形弧度最大下沉量，容器需预留，防止边缘卡牌被视口裁掉
  const arcMax = n > 1 ? Math.pow((n - 1) / 2, 1.6) * 3.2 : 0;

  return (
    <div ref={containerRef} className="w-full flex flex-col items-center justify-end">
      <div
        className="flex items-start justify-center w-full"
        style={{ height: CARD_H + 12 + Math.ceil(arcMax), paddingTop: 12 }}
      >
        <AnimatePresence mode="popLayout">
          {hand.map((card, i) => (
            <DraggableCard
              key={card.uuid}
              card={card}
              index={i}
              count={n}
              overlap={overlap}
              selected={selectedUuid === card.uuid}
              onSelect={onSelectCard}
            />
          ))}
        </AnimatePresence>
        {n === 0 && phase === 'PLAY' && (
          <span className="etch-label py-10" style={{ letterSpacing: '0.3em' }}>手 牌 已 出 完</span>
        )}
      </div>
    </div>
  );
}
