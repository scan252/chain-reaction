import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { StatusEffectType } from '../types';
import { STATUS } from '../config/balance';

// 通用增益/减益图标（悬停或点按查看详情，兼容触屏）
function StatusIcon({
  icon,
  value,
  name,
  description,
  tone,
}: {
  icon: string;
  value: number | string;
  name: string;
  description: string;
  tone: 'buff' | 'debuff';
}) {
  const [showTip, setShowTip] = useState(false);
  const isBuff = tone === 'buff';

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
        className={`w-8 h-8 rounded-lg border flex items-center justify-center cursor-help shadow-lg ${
          isBuff
            ? 'bg-gradient-to-br from-green-600 to-green-800 border-green-400/50 shadow-green-900/30'
            : 'bg-gradient-to-br from-rose-600 to-rose-900 border-rose-400/50 shadow-rose-900/30'
        }`}
      >
        <span className="text-sm font-bold text-white text-shadow">{icon}{value}</span>
      </div>

      <AnimatePresence>
        {showTip && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className={`absolute top-full mt-1 left-1/2 -translate-x-1/2 w-44 p-2 bg-gray-900/95 border rounded-lg shadow-xl z-50 ${
              isBuff ? 'border-green-500/30' : 'border-rose-500/30'
            }`}
          >
            <div className={`font-bold text-xs mb-1 text-shadow-sm ${isBuff ? 'text-green-400' : 'text-rose-400'}`}>{name}</div>
            <div className="text-white/70 text-[10px] leading-relaxed text-shadow-sm">{description}</div>
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

  if (globalDamageBonus <= 0 && vulnerableStacks <= 0) return null;

  return (
    <div className="flex flex-col items-center gap-1 mt-2">
      <div className="text-white/40 text-[10px] text-shadow-sm">增益/减益</div>
      <div className="flex items-center gap-2">
        {globalDamageBonus > 0 && (
          <StatusIcon
            icon="+"
            value={globalDamageBonus}
            name="共鸣增幅"
            description={`所有动作牌基础数值 +${globalDamageBonus}`}
            tone="buff"
          />
        )}
        {vulnerableStacks > 0 && (
          <StatusIcon
            icon="💔"
            value={`x${vulnerableStacks}`}
            name={`破绽 (${vulnerableStacks} 层)`}
            description={`受到的攻击伤害 +${Math.round(STATUS.VULNERABLE_DAMAGE_AMP_PER_STACK * vulnerableStacks * 100)}%`}
            tone="debuff"
          />
        )}
      </div>
    </div>
  );
}
