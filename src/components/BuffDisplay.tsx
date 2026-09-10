import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { StatusEffectType } from '../types';
import { STATUS } from '../config/balance';
import { Icon, type IconName } from './icons';

// 通用增益/减益蚀刻章（悬停或点按查看详情，兼容触屏）
function StatusSeal({
  icon,
  value,
  name,
  description,
  tone,
}: {
  icon: IconName;
  value: number | string;
  name: string;
  description: string;
  tone: 'buff' | 'debuff';
}) {
  const [showTip, setShowTip] = useState(false);
  const isBuff = tone === 'buff';
  const accent = isBuff ? '#8fc77a' : '#e5736b';

  return (
    <div
      className="relative"
      onMouseEnter={() => setShowTip(true)}
      onMouseLeave={() => setShowTip(false)}
      onClick={(e) => {
        e.stopPropagation();
        setShowTip((v) => !v);
      }}
    >
      <div
        className="h-8 pl-1.5 pr-2 rounded-lg flex items-center gap-1 cursor-help"
        style={{
          background: `linear-gradient(180deg, ${accent}1f, ${accent}0d)`,
          border: `1px solid ${accent}55`,
          boxShadow: `0 2px 8px rgba(3,4,8,0.45), 0 0 8px ${accent}20`,
          color: accent,
        }}
      >
        <Icon name={icon} size={13} strokeWidth={2.2} />
        <span className="num text-[12px] font-black leading-none">{value}</span>
      </div>

      <AnimatePresence>
        {showTip && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="absolute top-full mt-1.5 left-1/2 -translate-x-1/2 w-44 p-2.5 panel z-50"
            style={{ borderColor: `${accent}44` }}
          >
            <div className="font-bold text-xs mb-1" style={{ color: accent }}>{name}</div>
            <div className="text-[10px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{description}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function BuffDisplay() {
  const globalDamageBonus = useGameStore((s) => s.globalDamageBonus);
  const playerStatusEffects = useGameStore((s) => s.playerStatusEffects);

  const vulnerableStacks = playerStatusEffects
    .filter((e) => e.type === StatusEffectType.VULNERABLE)
    .reduce((sum, e) => sum + e.stacks, 0);
  const weakened = playerStatusEffects.some((e) => e.type === StatusEffectType.WEAKENED);

  if (globalDamageBonus <= 0 && vulnerableStacks <= 0 && !weakened) return null;

  return (
    <div className="flex flex-col items-start gap-1">
      <div className="etch-label">状态</div>
      <div className="flex items-center gap-1.5 flex-wrap">
        {globalDamageBonus > 0 && (
          <StatusSeal
            icon="plus"
            value={globalDamageBonus}
            name="全场强化"
            description={`所有动作牌基础数值 +${globalDamageBonus}`}
            tone="buff"
          />
        )}
        {vulnerableStacks > 0 && (
          <StatusSeal
            icon="target"
            value={`×${vulnerableStacks}`}
            name={`破绽 (${vulnerableStacks} 层)`}
            description={`受到的攻击伤害 +${Math.round(STATUS.VULNERABLE_DAMAGE_AMP_PER_STACK * vulnerableStacks * 100)}%`}
            tone="debuff"
          />
        )}
        {weakened && (
          <StatusSeal
            icon="vortex"
            value="-25%"
            name="衰弱"
            description="本回合卡牌数值 -25%"
            tone="debuff"
          />
        )}
      </div>
    </div>
  );
}
