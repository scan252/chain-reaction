import { motion } from 'framer-motion';
import { type CardTemplate, CardType, RARITY_META, ARCHETYPE_META, type Archetype } from '../types';
import { Icon, type IconName } from './icons';

interface CardProps {
  /** 接受模板或运行时实例（uuid 仅外部用作 key，允许可选附带） */
  card: CardTemplate & { uuid?: string };
  isHighlighted?: boolean;
  isDragging?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  damageBonus?: number;
}

/** 流派 → 符文图标 */
const ARCHETYPE_ICON: Partial<Record<Archetype, IconName>> = {
  CHAIN: 'bolt',
  RESONANCE: 'waves',
  RIPOSTE: 'riposte',
  BURN: 'flame',
};

/** 关键词印记（底部） */
function keywordPips(card: CardTemplate): { icon: IconName; text: string; title: string; color: string }[] {
  const pips: { icon: IconName; text: string; title: string; color: string }[] = [];
  if (card.chain) pips.push({ icon: 'bolt', text: `${card.chain}`, title: `连锁${card.chain}`, color: '#f0d060' });
  if (card.resonance) pips.push({ icon: 'waves', text: '', title: '共鸣', color: '#5ee0e6' });
  if (card.riposte) pips.push({ icon: 'riposte', text: `${card.riposte}`, title: `反击${card.riposte}`, color: '#f27d72' });
  if (card.burnCost) pips.push({ icon: 'flame', text: `${card.burnCost}`, title: `焚身${card.burnCost}`, color: '#fb923c' });
  return pips;
}

/** 特殊效果卡的徽章图标（替代数值） */
function specialIcon(card: CardTemplate): IconName | null {
  switch (card.effectId) {
    case 'DEADLY': return 'bolt';
    case 'RESONANCE_TUNER': return 'waves';
    case 'REVENGE_VOW': return 'riposte';
    case 'CHAIN_DEFENSE': return 'shield';
    default: return null;
  }
}

function getDisplayValue(card: CardTemplate): string {
  if (card.effectId === 'DESPERATE_STRIKE') return '?';
  const isModifier = card.type === CardType.MODIFIER;
  return isModifier ? `×${card.baseValue}` : `${card.baseValue}`;
}

/** 尺寸规格表 */
const SIZE_SPEC = {
  sm: {
    frame: 'w-20 h-[112px] rounded-lg',
    name: 'text-[8.5px] px-1 h-[15px]',
    gemSize: 9,
    medallion: 'w-9 h-9',
    medallionHex: 'w-10 h-9',
    value: 'text-[15px]',
    iconSize: 15,
    desc: 'hidden',
    pips: 'gap-[2px] bottom-[16px]',
    pip: 'text-[7px] px-[3px] py-[1px]',
    pipIcon: 7,
    ribbon: 'text-[7px] h-[13px] gap-[2px]',
    ribbonIcon: 7,
    archIcon: 9,
    archBox: 'top-[3px] left-[3px]',
    gemBox: 'top-[3px] right-[3px]',
    ring: 16,
  },
  md: {
    frame: 'w-28 h-40 rounded-[10px]',
    name: 'text-[11px] px-1.5 h-[22px]',
    gemSize: 12,
    medallion: 'w-[54px] h-[54px]',
    medallionHex: 'w-[60px] h-[54px]',
    value: 'text-[26px]',
    iconSize: 24,
    desc: 'text-[9px] leading-[1.35] px-1.5 h-[38px]',
    pips: 'gap-1 bottom-[22px]',
    pip: 'text-[9px] px-[5px] py-[1px]',
    pipIcon: 9,
    ribbon: 'text-[9px] h-[18px] gap-1',
    ribbonIcon: 10,
    archIcon: 12,
    archBox: 'top-1 left-1',
    gemBox: 'top-1 right-1',
    ring: 26,
  },
  lg: {
    frame: 'w-36 h-[204px] rounded-xl',
    name: 'text-[13px] px-2 h-[28px]',
    gemSize: 14,
    medallion: 'w-[68px] h-[68px]',
    medallionHex: 'w-[76px] h-[68px]',
    value: 'text-[34px]',
    iconSize: 30,
    desc: 'text-[10.5px] leading-[1.4] px-2 h-[56px]',
    pips: 'gap-1 bottom-[26px]',
    pip: 'text-[10px] px-[6px] py-[2px]',
    pipIcon: 11,
    ribbon: 'text-[10px] h-[22px] gap-1',
    ribbonIcon: 12,
    archIcon: 14,
    archBox: 'top-1.5 left-1.5',
    gemBox: 'top-1.5 right-1.5',
    ring: 33,
  },
} as const;

export function Card({ card, isHighlighted, isDragging, size = 'md', onClick, damageBonus = 0 }: CardProps) {
  const isModifier = card.type === CardType.MODIFIER;
  const rarity = RARITY_META[card.rarity];
  const archetype = ARCHETYPE_META[card.archetype ?? ('GENERIC' as Archetype)];
  const pips = keywordPips(card);
  const spec = SIZE_SPEC[size];
  const special = specialIcon(card);
  const archIcon = card.archetype && card.archetype !== 'GENERIC' ? ARCHETYPE_ICON[card.archetype] : null;

  const displayValue = !isModifier && damageBonus > 0
    ? `${card.baseValue + damageBonus}`
    : getDisplayValue(card);
  const buffed = !isModifier && damageBonus > 0;

  const frameColor = isHighlighted ? '#e6cc8b' : card.upgraded ? '#d9b869' : rarity.color;

  return (
    <motion.div
      layout
      initial={{ scale: 0.85, opacity: 0 }}
      animate={{
        scale: isDragging ? 1.08 : 1,
        opacity: isDragging ? 0.85 : 1,
        y: isHighlighted ? -8 : 0,
        boxShadow: isHighlighted
          ? `0 6px 24px rgba(0,0,0,0.55), 0 0 22px ${card.color}90, 0 0 44px ${card.color}40`
          : `0 4px 14px rgba(0,0,0,0.5), 0 0 10px ${rarity.glow}`,
      }}
      transition={{ type: 'spring', stiffness: 320, damping: 26 }}
      onClick={onClick}
      className={`${spec.frame} relative flex flex-col cursor-pointer select-none overflow-hidden`}
      style={{
        border: `1.5px solid ${frameColor}`,
        background: `
          radial-gradient(130% 70% at 50% 0%, ${card.color}26 0%, transparent 62%),
          linear-gradient(180deg, rgba(38, 46, 72, 0.97) 0%, rgba(17, 21, 35, 0.98) 46%, rgba(10, 13, 22, 0.99) 100%)
        `,
      }}
    >
      {/* 稀有卡箔光 */}
      {card.rarity === 'RARE' && <div className="foil-sheen" />}

      {/* 框内蚀刻细边 */}
      <div
        className="absolute inset-[3px] pointer-events-none rounded-[inherit]"
        style={{ border: '1px solid rgba(168,182,214,0.10)', borderRadius: 'inherit' }}
      />

      {/* 名牌 */}
      <div
        className={`${spec.name} relative shrink-0 w-full flex items-center justify-center font-bold tracking-wide`}
        style={{
          color: '#e8e2d2',
          background: `linear-gradient(180deg, ${card.color}30, ${card.color}14 55%, transparent)`,
          borderBottom: `1px solid ${card.color}38`,
          textShadow: '0 1px 2px rgba(0,0,0,0.8)',
        }}
      >
        <span className="truncate">{card.name}{card.upgraded ? <span style={{ color: '#e6cc8b' }}>+</span> : null}</span>
      </div>

      {/* 流派符文（左上） */}
      {archIcon && (
        <div className={`absolute ${spec.archBox} z-10`} title={archetype.label} style={{ color: archetype.color, filter: `drop-shadow(0 0 4px ${archetype.color}80)` }}>
          <Icon name={archIcon} size={spec.archIcon} />
        </div>
      )}

      {/* 稀有度宝石（右上） */}
      <div className={`absolute ${spec.gemBox} z-10`} title={rarity.label}>
        <svg width={spec.gemSize} height={spec.gemSize} viewBox="0 0 24 24" style={{ filter: `drop-shadow(0 0 4px ${rarity.color}90)` }}>
          <path d="M12 2.5 21 12 12 21.5 3 12z" fill={`${rarity.color}33`} stroke={rarity.color} strokeWidth="2" />
          <path d="M12 8l4 4-4 4-4-4z" fill={rarity.color} />
        </svg>
      </div>

      {/* 强化角标 */}
      {buffed && (
        <div
          className="absolute z-10 flex items-center justify-center rounded-full font-black"
          style={{
            top: spec === SIZE_SPEC.sm ? 14 : size === 'lg' ? 30 : 24,
            left: 4,
            width: size === 'sm' ? 14 : 18,
            height: size === 'sm' ? 14 : 18,
            fontSize: size === 'sm' ? 8 : 10,
            color: '#a7f3c8',
            background: 'rgba(38, 153, 102, 0.25)',
            border: '1px solid rgba(94, 224, 158, 0.55)',
          }}
        >
          +{damageBonus}
        </div>
      )}

      {/* 中区：数值盘 + 描述 */}
      <div className="flex-1 flex flex-col items-center justify-center min-h-0 pt-1">
        {/* 数值盘 */}
        <div className="relative flex items-center justify-center shrink-0">
          {/* 符环 */}
          <svg
            className={`${isModifier ? spec.medallionHex : spec.medallion} absolute`}
            viewBox="0 0 72 72"
            style={{ filter: `drop-shadow(0 0 8px ${card.color}55)` }}
          >
            {isModifier ? (
              <>
                <polygon points="36,4 64,20 64,52 36,68 8,52 8,20" fill={`${card.color}14`} stroke={card.color} strokeWidth="1.6" />
                <polygon points="36,10 58.5,23.5 58.5,48.5 36,62 13.5,48.5 13.5,23.5" fill="none" stroke={`${card.color}55`} strokeWidth="0.8" strokeDasharray="3 2.5" />
              </>
            ) : (
              <>
                <circle cx="36" cy="36" r="32" fill={`${card.color}14`} stroke={card.color} strokeWidth="1.6" />
                <circle cx="36" cy="36" r="27" fill="none" stroke={`${card.color}55`} strokeWidth="0.8" strokeDasharray="3 2.5" />
              </>
            )}
          </svg>
          {/* 辉光 */}
          <div
            className="absolute rounded-full"
            style={{
              inset: '18%',
              background: `radial-gradient(circle, ${card.color}40 0%, transparent 70%)`,
            }}
          />
          {/* 数值 / 特殊图标 */}
          {special ? (
            <span className="relative z-10" style={{ color: card.color, filter: `drop-shadow(0 0 6px ${card.color})` }}>
              <Icon name={special} size={spec.iconSize} strokeWidth={2} />
            </span>
          ) : (
            <span
              className={`${spec.value} relative z-10 font-black num leading-none`}
              style={{
                color: buffed ? '#a7f3c8' : card.color,
                textShadow: `0 0 12px ${card.color}70, 0 2px 3px rgba(0,0,0,0.85)`,
                letterSpacing: '-0.02em',
              }}
            >
              {displayValue}
            </span>
          )}
        </div>

        {/* 描述 */}
        {spec.desc !== 'hidden' && (
          <p
            className={`${spec.desc} mt-1.5 w-full text-center overflow-hidden`}
            style={{
              color: 'rgba(190, 198, 216, 0.72)',
              display: '-webkit-box',
              WebkitLineClamp: size === 'lg' ? 3 : 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {card.description}
          </p>
        )}
      </div>

      {/* 关键词印记 */}
      {pips.length > 0 && (
        <div className={`absolute ${spec.pips} left-0 right-0 flex justify-center z-10`}>
          {pips.map((p) => (
            <span
              key={p.title}
              title={p.title}
              className={`${spec.pip} inline-flex items-center gap-[2px] rounded-full font-bold num leading-none`}
              style={{
                color: p.color,
                background: 'rgba(6, 8, 14, 0.72)',
                border: `1px solid ${p.color}66`,
                boxShadow: `0 0 6px ${p.color}30`,
              }}
            >
              <Icon name={p.icon} size={spec.pipIcon} strokeWidth={2.2} />
              {p.text && p.text}
            </span>
          ))}
        </div>
      )}

      {/* 类型缎带 */}
      <div
        className={`${spec.ribbon} shrink-0 w-full flex items-center justify-center font-bold tracking-[0.2em] relative`}
        style={{
          color: card.color,
          background: `linear-gradient(180deg, ${card.color}1f, ${card.color}0d)`,
          borderTop: `1px solid ${card.color}38`,
          textIndent: '0.2em',
        }}
      >
        <Icon name={isModifier ? 'hexagon' : 'sword'} size={spec.ribbonIcon} strokeWidth={2.2} />
        {isModifier ? '修饰' : '动作'}
      </div>
    </motion.div>
  );
}
