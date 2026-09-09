import { motion } from 'framer-motion';
import { type CardInstance, CardType, RARITY_META, ARCHETYPE_META, type Archetype } from '../types';

interface CardProps {
  card: CardInstance;
  isHighlighted?: boolean;
  isDragging?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  damageBonus?: number;
}

/** 关键词角标内容 */
function keywordBadges(card: CardInstance): { text: string; title: string; className: string }[] {
  const badges: { text: string; title: string; className: string }[] = [];
  if (card.chain) badges.push({ text: `连${card.chain}`, title: `连锁${card.chain}`, className: 'bg-yellow-500/80 text-black' });
  if (card.resonance) badges.push({ text: '共鸣', title: '共鸣', className: 'bg-cyan-500/80 text-black' });
  if (card.riposte) badges.push({ text: `反${card.riposte}`, title: `反击${card.riposte}`, className: 'bg-red-500/80 text-white' });
  if (card.burnCost) badges.push({ text: `焚${card.burnCost}`, title: `焚身${card.burnCost}`, className: 'bg-orange-600/80 text-white' });
  return badges;
}

function getDisplayValue(card: CardInstance): string {
  if (card.effectId === 'DEADLY') return '⚡';
  if (card.effectId === 'RESONANCE_TUNER') return '≋';
  if (card.effectId === 'REVENGE_VOW') return '⚔';
  if (card.effectId === 'DESPERATE_STRIKE') return '?';
  if (card.effectId === 'CHAIN_DEFENSE') return '⛊';
  const isModifier = card.type === CardType.MODIFIER;
  return isModifier ? `x${card.baseValue}` : `${card.baseValue}`;
}

export function Card({ card, isHighlighted, isDragging, size = 'md', onClick, damageBonus = 0 }: CardProps) {
  const isModifier = card.type === CardType.MODIFIER;
  const rarity = RARITY_META[card.rarity];
  const archetype = ARCHETYPE_META[card.archetype ?? ('GENERIC' as Archetype)];
  const badges = keywordBadges(card);

  const sizeClasses = size === 'sm'
    ? 'w-24 h-32 text-sm'
    : size === 'lg'
      ? 'w-40 h-56 text-lg'
      : 'w-32 h-44 text-base';

  const displayValue = !isModifier && damageBonus > 0
    ? `${card.baseValue + damageBonus}`
    : getDisplayValue(card);

  return (
    <motion.div
      layout
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{
        scale: isDragging ? 1.1 : 1,
        opacity: isDragging ? 0.8 : 1,
        y: isHighlighted ? -8 : 0,
        boxShadow: isHighlighted
          ? `0 0 20px ${card.color}, 0 0 40px ${card.color}60`
          : `0 2px 8px rgba(0,0,0,0.3), 0 0 12px ${rarity.glow}`,
      }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      onClick={onClick}
      className={`
        ${sizeClasses}
        relative flex flex-col rounded-xl cursor-pointer select-none overflow-hidden
        border-2
        ${isHighlighted ? 'border-yellow-400' : card.upgraded ? 'border-amber-300' : ''}
      `}
      style={{
        borderColor: isHighlighted ? '#facc15' : card.upgraded ? '#fbbf24' : rarity.color,
        background: isModifier
          ? 'linear-gradient(to bottom, #4c1d95e6, #2e1065e6)'
          : 'linear-gradient(to bottom, #1e293be6, #0f172ae6)',
      }}
    >
      {/* 顶部色条（稀有度色） */}
      <div
        className="h-1.5 w-full shrink-0"
        style={{ backgroundColor: card.color }}
      />

      {/* 稀有度标记（右上角） */}
      <div
        className="absolute top-2 right-1 text-[9px] font-bold rounded-full px-1.5 py-0.5 leading-none"
        style={{ backgroundColor: `${rarity.color}30`, color: rarity.color, border: `1px solid ${rarity.color}80` }}
      >
        {rarity.label}
      </div>

      {/* 流派图标（左上角） */}
      {card.archetype && card.archetype !== 'GENERIC' && (
        <div
          className="absolute top-2 left-1 text-[11px] w-5 h-5 flex items-center justify-center rounded-full font-bold"
          style={{ backgroundColor: `${archetype.color}30`, color: archetype.color }}
          title={archetype.label}
        >
          {archetype.icon}
        </div>
      )}

      {/* 全局伤害加成（左上角下方） */}
      {!isModifier && damageBonus > 0 && (
        <div className={`absolute ${card.archetype && card.archetype !== 'GENERIC' ? 'top-8' : 'top-2'} left-1 text-[9px] font-bold rounded-full w-5 h-5 flex items-center justify-center bg-green-500/80 text-white border border-green-400/50`}>
          +{damageBonus}
        </div>
      )}

      {/* 卡牌内容 */}
      <div className="flex-1 flex flex-col items-center justify-center gap-1 px-1.5 py-1">
        {/* 数值 */}
        <div
          className={`font-bold leading-none ${size === 'lg' ? 'text-4xl' : 'text-2xl'}`}
          style={{ color: card.color }}
        >
          {displayValue}
        </div>

        {/* 名称 */}
        <div className={`text-white font-medium text-center leading-tight truncate w-full ${size === 'lg' ? 'text-lg' : ''}`}>
          {card.name}
        </div>

        {/* 描述 */}
        <div className={`text-white/50 text-center leading-tight overflow-hidden ${size === 'lg' ? 'text-xs' : 'text-[9px]'}`}
          style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}
        >
          {card.description}
        </div>
      </div>

      {/* 关键词角标（底部） */}
      {badges.length > 0 && (
        <div className="absolute bottom-5 left-0 right-0 flex justify-center gap-1">
          {badges.map((b) => (
            <span
              key={b.title}
              title={b.title}
              className={`text-[9px] font-bold px-1 py-0.5 rounded ${b.className}`}
            >
              {b.text}
            </span>
          ))}
        </div>
      )}

      {/* 类型标签 */}
      <div
        className="text-[9px] text-center py-0.5 font-medium tracking-wider"
        style={{ backgroundColor: `${card.color}30`, color: card.color }}
      >
        {isModifier ? '修饰' : '动作'}
      </div>
    </motion.div>
  );
}
