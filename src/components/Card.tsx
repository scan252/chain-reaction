import { motion } from 'framer-motion';
import { type CardInstance, CardType } from '../types';

interface CardProps {
  card: CardInstance;
  isHighlighted?: boolean;
  isDragging?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  damageBonus?: number; // 全局伤害加成（显示在右上角）
}

function getSpecialIcon(effectId: string): string | null {
  switch (effectId) {
    case 'PHASE_SHIFT': return '→';
    case 'MIRROR_REFLECT': return '⟐';
    case 'RESONANCE_AMP': return '≋';
    case 'DESPERATE_STRIKE': return '!';
    case 'CHAIN_DEFENSE': return '⊞';
    default: return null;
  }
}

function getDisplayValue(card: CardInstance): string {
  const isModifier = card.type === CardType.MODIFIER;
  // 共鸣增幅显示 x2 而非 0
  if (card.effectId === 'RESONANCE_AMP') return 'x2';
  // 背水一战显示 ?
  if (card.effectId === 'DESPERATE_STRIKE') return '?';
  // 连锁防线显示盾牌
  if (card.effectId === 'CHAIN_DEFENSE') return '⛊';
  // 正常逻辑
  return isModifier ? `x${card.baseValue}` : `${card.baseValue}`;
}

export function Card({ card, isHighlighted, isDragging, size = 'md', onClick, damageBonus = 0 }: CardProps) {
  const isModifier = card.type === CardType.MODIFIER;
  const sizeClasses = size === 'sm' 
    ? 'w-24 h-32 text-sm' 
    : size === 'lg' 
      ? 'w-40 h-56 text-lg' 
      : 'w-32 h-44 text-base';
  const specialIcon = getSpecialIcon(card.effectId);
  
  // 计算显示值（包含全局加成）
  const displayValue = card.type === CardType.MODIFIER 
    ? getDisplayValue(card)
    : `${card.baseValue + damageBonus}`;

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
          : '0 2px 8px rgba(0,0,0,0.3)',
      }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      onClick={onClick}
      className={`
        ${sizeClasses}
        relative flex flex-col rounded-xl cursor-pointer select-none overflow-hidden
        border-2 transition-colors
        ${isHighlighted ? 'border-yellow-400' : 'border-white/20'}
        ${isModifier ? 'bg-gradient-to-b from-purple-900/90 to-purple-950/90' : 'bg-gradient-to-b from-slate-800/90 to-slate-900/90'}
      `}
      style={{
        borderColor: isHighlighted ? '#facc15' : `${card.color}60`,
      }}
    >
      {/* 顶部色条 */}
      <div
        className="h-1.5 w-full shrink-0"
        style={{ backgroundColor: card.color }}
      />

      {/* 特殊图标角标 */}
      {specialIcon && (
        <div
          className="absolute top-2 right-1 text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center"
          style={{ backgroundColor: `${card.color}40`, color: card.color }}
        >
          {specialIcon}
        </div>
      )}
      
      {/* 全局伤害加成标记 */}
      {!isModifier && damageBonus > 0 && (
        <div className="absolute top-1 right-1 text-[9px] font-bold rounded-full w-5 h-5 flex items-center justify-center bg-green-500/80 text-white border border-green-400/50">
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
        <div className={`text-white/50 text-center leading-tight ${size === 'lg' ? 'text-sm' : 'text-[10px]'}`}>
          {card.description}
        </div>
      </div>

      {/* 类型标签 */}
      <div
        className="text-[9px] text-center py-0.5 font-medium tracking-wider uppercase"
        style={{ backgroundColor: `${card.color}30`, color: card.color }}
      >
        {isModifier ? '修饰' : '动作'}
      </div>
    </motion.div>
  );
}
