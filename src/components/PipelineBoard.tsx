import { useEffect, useRef, useState } from 'react';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { Card } from './Card';
import { StatusEffectType } from '../types';
import type { SlotPreview, SlotLink } from '../types';
import { JUICE } from '../config/balance';

// --- 闪电链接容器：按实际 DOM 位置绘制链接，避免硬编码宽度误差 ---
function LightningLinkLayer({ links }: { links: SlotLink[] }) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [slotRects, setSlotRects] = useState<{ left: number; right: number; top: number; height: number }[]>([]);

  useEffect(() => {
    const measure = () => {
      const row = rowRef.current;
      if (!row) return;
      const containerRect = row.getBoundingClientRect();
      const rects = Array.from(row.querySelectorAll<HTMLElement>('[data-slot-index]')).map((el) => {
        const r = el.getBoundingClientRect();
        return {
          left: r.left - containerRect.left,
          right: r.right - containerRect.left,
          top: r.top - containerRect.top,
          height: r.height,
        };
      });
      setSlotRects(rects);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [links.length]);

  if (slotRects.length === 0) return null;

  return (
    <div ref={rowRef} className="absolute inset-0 pointer-events-none z-20">
      {links.map((link, index) => {
        const from = slotRects[link.from];
        const to = slotRects[link.to];
        if (!from || !to) return null;
        return <LightningLink key={`${link.from}-${link.to}-${index}`} from={from} to={to} type={link.type} />;
      })}
    </div>
  );
}

// 闪电链接特效组件（基于测量到的槽位坐标）
function LightningLink({
  from,
  to,
  type,
}: {
  from: { left: number; right: number; top: number; height: number };
  to: { left: number; right: number; top: number; height: number };
  type: SlotLink['type'];
}) {
  const isForward = to.left >= from.right;
  const startX = isForward ? from.right : from.left;
  const endX = isForward ? to.left : to.right;
  const linkWidth = Math.max(8, Math.abs(endX - startX));
  const centerY = from.top + from.height / 2;

  const getColor = () => {
    switch (type) {
      case 'RESONANCE':
        return '#22d3ee'; // 青色
      case 'CHAIN_DEFENSE':
        return '#3b82f6'; // 蓝色
      case 'DESPERATE_STRIKE':
        return '#ef4444'; // 红色
      default:
        return '#facc15'; // 黄色
    }
  };

  const color = getColor();

  return (
    <motion.div
      className="absolute h-1 rounded-full"
      style={{
        left: `${Math.min(startX, endX)}px`,
        top: `${centerY}px`,
        width: `${linkWidth}px`,
        background: `linear-gradient(90deg, ${color}80, ${color}, ${color}80)`,
        boxShadow: `0 0 10px ${color}, 0 0 20px ${color}80`,
      }}
      initial={{ opacity: 0, scaleX: 0 }}
      animate={{ opacity: 1, scaleX: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      {/* 闪电图标 */}
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-lg"
        animate={{ scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }}
        style={{ color }}
      >
        ⚡
      </motion.div>

      {/* 流动光效 */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }}
        animate={{ x: isForward ? ['-100%', '100%'] : ['100%', '-100%'] }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      />
    </motion.div>
  );
}

// 回合总结显示组件
function TurnSummaryDisplay() {
  const turnSummary = useGameStore((s) => s.turnSummary);

  if (!turnSummary) return null;

  return (
    <div className="flex items-center justify-center gap-3 text-xs">
      <span className="text-blue-300 text-shadow-sm">生成护盾: {turnSummary.totalArmor}</span>
      <span className="text-cyan-300 text-shadow-sm">有效护盾: {turnSummary.effectiveArmor}</span>
      <span className="text-red-300 text-shadow-sm">扣血: {turnSummary.hpLoss}</span>
    </div>
  );
}

// 伤害分级配色（爽点层：数字越大越炸裂）
function damageTierStyle(dmg: number): { color: string; shadow: string; fontSize: string } {
  const [T1, T2, T3, T4] = JUICE.DAMAGE_TIERS;
  if (dmg >= T4) {
    return {
      color: '#f0abfc',
      shadow: '0 0 30px rgba(240,171,252,0.9), 0 0 60px rgba(217,70,239,0.6), -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000',
      fontSize: '5rem',
    };
  }
  if (dmg >= T3) {
    return {
      color: '#ef4444',
      shadow: '0 0 30px rgba(239,68,68,0.9), 0 0 60px rgba(239,68,68,0.5), -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000',
      fontSize: '4.5rem',
    };
  }
  if (dmg >= T2) {
    return {
      color: '#fb923c',
      shadow: '0 0 24px rgba(249,115,22,0.8), -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000',
      fontSize: '4rem',
    };
  }
  if (dmg >= T1) {
    return {
      color: '#facc15',
      shadow: '0 0 20px rgba(250,204,21,0.8), -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000',
      fontSize: '3.5rem',
    };
  }
  return {
    color: '#e5e7eb',
    shadow: '0 0 12px rgba(229,231,235,0.6), -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000',
    fontSize: '3rem',
  };
}

// 伤害特效组件
function DamageEffects() {
  const turnSummary = useGameStore((s) => s.turnSummary);
  const showExecutionSummary = useGameStore((s) => s.showExecutionSummary);
  const phase = useGameStore((s) => s.phase);

  const shouldShowDamage = phase === 'EXECUTE_PHASE3' || phase === 'VICTORY' || phase === 'DEFEAT';

  if (!showExecutionSummary || !shouldShowDamage || !turnSummary) {
    return null;
  }

  const tier = damageTierStyle(turnSummary.totalDamage);

  return (
    <>
      {/* 玩家受伤特效 */}
      {turnSummary.hpLoss > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5, x: -100 }}
          animate={{ opacity: 1, scale: 1.2, x: -150 }}
          exit={{ opacity: 0, y: 50 }}
          transition={{ duration: 0.5, type: 'spring' }}
          className="fixed left-1/4 top-1/2 z-50 pointer-events-none"
        >
          <div
            className="font-black text-red-500"
            style={{
              fontSize: '3.5rem',
              textShadow: '0 0 30px rgba(239,68,68,0.8), 0 0 60px rgba(239,68,68,0.5), -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000',
              WebkitTextStroke: '2px white',
            }}
          >
            -{turnSummary.hpLoss}
          </div>
        </motion.div>
      )}

      {/* 怪物受伤特效（分级变色） */}
      {turnSummary.totalDamage > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5, x: 100 }}
          animate={{ opacity: 1, scale: 1.2, x: 150 }}
          exit={{ opacity: 0, y: -50 }}
          transition={{ duration: 0.5, type: 'spring', delay: 0.1 }}
          className="fixed right-1/4 top-1/2 z-50 pointer-events-none flex flex-col items-center"
        >
          <div className="font-black" style={{ color: tier.color, fontSize: tier.fontSize, textShadow: tier.shadow }}>
            -{turnSummary.totalDamage}
          </div>
          {turnSummary.overdrive && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: [1, 1.25, 1] }}
              transition={{ duration: 0.8, repeat: 2 }}
              className="font-black text-2xl mt-1"
              style={{ color: '#fde047', textShadow: '0 0 20px #fde047, -2px -2px 0 #000, 2px 2px 0 #000' }}
            >
              ⚡ OVERDRIVE ⚡
            </motion.div>
          )}
          {turnSummary.riposteDamage > 0 && (
            <div className="font-bold text-xl mt-1" style={{ color: '#fb923c', textShadow: '0 0 12px #fb923c, -2px -2px 0 #000, 2px 2px 0 #000' }}>
              反! +{turnSummary.riposteDamage}
            </div>
          )}
        </motion.div>
      )}
    </>
  );
}

function SlotAttackIndicator({ slotIndex }: { slotIndex: number }) {
  const intent = useGameStore((s) => s.enemy.intent);
  const attack = intent.attacks.find((a) => a.slotIndex === slotIndex);

  if (!attack) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="absolute -top-12 left-1/2 -translate-x-1/2 font-black text-red-500 bg-red-950/90 border-2 border-red-500/70 rounded-xl px-4 py-2 whitespace-nowrap z-10 shadow-lg shadow-red-900/50"
      style={{
        fontSize: '24px',
        textShadow: '0 0 12px rgba(239, 68, 68, 1), -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000',
      }}
    >
      ⚔ {attack.damage}
    </motion.div>
  );
}

function SlotPreviewOverlay({ preview }: { preview: SlotPreview }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="absolute top-full mt-1 left-1/2 -translate-x-1/2 font-bold bg-black/95 pointer-events-none border-2 border-white/40 rounded-2xl px-4 py-2 whitespace-nowrap z-20 flex flex-col items-center gap-0.5 shadow-2xl"
      style={{ fontSize: '13px' }}
    >
      <span className="text-red-400 text-shadow">⚔ 受击 {preview.incomingDamage}</span>
      {preview.blockedDamage > 0 && (
        <span className="text-blue-400 text-shadow">🛡 格挡 {preview.blockedDamage}</span>
      )}
      <span className={preview.hpLoss > 0 ? 'text-red-500 font-black text-shadow' : 'text-green-400 font-bold text-shadow'}>
        {preview.hpLoss > 0 ? `💔 掉血 ${preview.hpLoss}` : '完全格挡!'}
      </span>
      {preview.isVulnerablePenalty && (
        <span className="text-purple-400 text-shadow">💥 破绽!</span>
      )}
    </motion.div>
  );
}

function PipelineSlot({ index }: { index: number }) {
  const card = useGameStore((s) => s.pipeline[index]);
  const pipelineSnapshot = useGameStore((s) => s.pipelineSnapshot);
  const executingIndex = useGameStore((s) => s.executingIndex);
  const phase = useGameStore((s) => s.phase);
  const removeFromPipeline = useGameStore((s) => s.removeFromPipeline);
  const slotStatus = useGameStore((s) => s.slotStatuses[index]);
  const slotPreviews = useGameStore((s) => s.slotPreviews);
  const intent = useGameStore((s) => s.enemy.intent);
  const globalDamageBonus = useGameStore((s) => s.globalDamageBonus);

  // 结算阶段展示快照（此时 pipeline 已清空进弃牌堆）
  const displayCard = card ?? (phase === 'EXECUTE_PHASE3' ? pipelineSnapshot?.[index] ?? null : null);

  const isLocked = slotStatus?.isLocked ?? false;
  const isBurning = slotStatus?.statusEffects.some((e) => e.type === StatusEffectType.BURNING) ?? false;
  const isIgnited = slotStatus?.statusEffects.some((e) => e.type === StatusEffectType.IGNITED) ?? false;
  const isAttackTarget = intent.attacks.some((a) => a.slotIndex === index);
  const preview = slotPreviews.find((p) => p.slotIndex === index);

  const { setNodeRef, isOver } = useDroppable({
    id: `pipeline-slot-${index}`,
    data: { type: 'pipeline-slot', index },
    disabled: phase !== 'PLAY' || isLocked,
  });

  // 槽内卡牌可拖拽换位（PLAY 阶段）
  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
    id: `pipeline-card-${index}`,
    data: { type: 'pipeline-card', index, card },
    disabled: phase !== 'PLAY' || !card,
  });

  const isHighlighted = (phase === 'EXECUTE_PHASE1' || phase === 'EXECUTE_PHASE2') && executingIndex === index;
  const isPhase2Attack = phase === 'EXECUTE_PHASE2' && executingIndex === index;

  return (
    <motion.div
      ref={setNodeRef}
      data-slot-index={index}
      className={`
        w-32 h-40 rounded-xl border-2 border-dashed flex items-center justify-center
        transition-colors relative touch-none
        ${isLocked
          ? 'border-purple-500/50 bg-purple-900/20'
          : isPhase2Attack
          ? 'border-red-500 bg-red-500/15'
          : isOver
          ? 'border-cyan-400 bg-cyan-400/10'
          : isHighlighted
          ? 'border-yellow-400 bg-yellow-400/10'
          : isBurning
          ? 'border-orange-500/60 bg-orange-500/10'
          : isAttackTarget && phase === 'PLAY'
          ? 'border-red-400/40 bg-red-500/5'
          : 'border-white/20 bg-white/5'}
      `}
      animate={isHighlighted ? {
        boxShadow: ['0 0 0px transparent', '0 0 20px #facc1580', '0 0 0px transparent'],
      } : isPhase2Attack ? {
        boxShadow: ['0 0 0px transparent', '0 0 20px #ef444480', '0 0 0px transparent'],
      } : {}}
      transition={{ duration: 0.6, repeat: (isHighlighted || isPhase2Attack) ? Infinity : 0 }}
    >
      {/* 攻击标记 */}
      {isAttackTarget && phase === 'PLAY' && <SlotAttackIndicator slotIndex={index} />}

      {/* 预览 */}
      {preview && phase === 'PLAY' && <SlotPreviewOverlay preview={preview} />}

      {/* 锁定覆盖 */}
      {isLocked && (
        <div className="absolute inset-0 rounded-xl bg-purple-900/30 flex items-center justify-center z-10">
          <span className="text-2xl">🔒</span>
        </div>
      )}

      {/* 焦土点燃指示器 */}
      {isIgnited && !isLocked && (
        <motion.div
          className="absolute top-1 left-1 text-sm"
          animate={{ scale: [1, 1.25, 1], rotate: [0, 8, -8, 0] }}
          transition={{ duration: 0.9, repeat: Infinity }}
          title="焦土：此槽卡牌数值 +100%"
        >
          🔥✚
        </motion.div>
      )}

      {/* 燃烧指示器 */}
      {isBurning && !isLocked && (
        <motion.div
          className="absolute top-1 right-1 text-sm"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 0.8, repeat: Infinity }}
        >
          🔥
        </motion.div>
      )}

      <AnimatePresence mode="popLayout">
        {displayCard && !isLocked ? (
          <motion.div
            key={displayCard.uuid || 'snapshot'}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: isDragging ? 0.35 : 1 }}
            exit={{ scale: 0.5, opacity: 0, y: -20 }}
            className="absolute inset-0"
          >
            <div
              ref={setDragRef}
              {...attributes}
              {...listeners}
              onClick={() => phase === 'PLAY' && removeFromPipeline(index)}
              className="w-full h-full cursor-grab active:cursor-grabbing"
            >
              <Card card={displayCard} isHighlighted={isHighlighted} damageBonus={globalDamageBonus} />
            </div>
          </motion.div>
        ) : !isLocked ? (
          <span className="text-white/20 text-xs">{index + 1}</span>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}

export function PipelineBoard() {
  const phase = useGameStore((s) => s.phase);
  const executionLog = useGameStore((s) => s.executionLog);
  const lastExecutionResult = useGameStore((s) => s.lastExecutionResult);
  const showExecutionSummary = useGameStore((s) => s.showExecutionSummary);
  const dismissExecutionSummary = useGameStore((s) => s.dismissExecutionSummary);
  const nextTurn = useGameStore((s) => s.nextTurn);
  const pipelineSlots = useGameStore((s) => s.pipelineSlots);
  const turnSummary = useGameStore((s) => s.turnSummary);
  const slotLinks = useGameStore((s) => s.slotLinks);

  const handleDismissSummary = () => {
    if (phase !== 'VICTORY' && phase !== 'DEFEAT') {
      nextTurn();
    }
    dismissExecutionSummary();
  };

  // 阶段显示文案
  const phaseLabel =
    phase === 'EXECUTE_PHASE1' ? '⚡ 管道执行中...' :
    phase === 'EXECUTE_PHASE2' ? '⚔ 敌方攻击中...' :
    phase === 'EXECUTE_PHASE3' ? '📊 结算中...' :
    null;

  // 是否触发震动（玩家或怪物受伤）
  const shouldShake = showExecutionSummary && phase === 'EXECUTE_PHASE3' && turnSummary &&
    (turnSummary.hpLoss > 0 || turnSummary.totalDamage > 0);

  return (
    <motion.div
      className="flex flex-col items-center gap-3 py-3 px-4 w-full"
      animate={shouldShake ? {
        x: [0, -10, 10, -10, 10, 0],
        transition: { duration: 0.5 },
      } : {}}
    >
      {/* 毛玻璃托盘背景 - 覆盖槽位区域 */}
      <div className="relative">
        <div
          className="absolute inset-0 rounded-2xl"
          style={{
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            margin: '-10px -16px -6px -16px',
            padding: '10px 16px 6px 16px',
          }}
        />
        {/* 动态槽位 */}
        <div className="flex items-center gap-2 relative z-10">
          {Array.from({ length: pipelineSlots }).map((_, i) => (
            <div key={i} className="flex items-center">
              <PipelineSlot index={i} />
              {i < pipelineSlots - 1 && (
                <motion.span
                  className="text-white/30 mx-1 text-lg"
                  animate={phase === 'EXECUTE_PHASE1' ? { color: ['#ffffff30', '#facc15', '#ffffff30'] } : {}}
                  transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                >
                  →
                </motion.span>
              )}
            </div>
          ))}

          {/* 闪电链接特效 - 只在 PLAY 阶段且槽位放满时显示 */}
          {phase === 'PLAY' && slotLinks.length > 0 && (
            <LightningLinkLayer links={slotLinks} />
          )}
        </div>
      </div>

      {/* 阶段指示器 */}
      {phaseLabel && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm font-bold text-yellow-300/80 text-shadow"
        >
          {phaseLabel}
        </motion.div>
      )}

      {/* 结算日志 */}
      <AnimatePresence>
        {executionLog.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="flex flex-wrap gap-2 justify-center max-w-full"
          >
            {executionLog.map((log, i) => (
              <motion.span
                key={`${i}-${log}`}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: Math.min(i * 0.05, 0.4) }}
                className="text-xs px-2 py-1 rounded-full bg-black/40 text-amber-200"
              >
                {log}
              </motion.span>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 回合总结 - 点击后继续 */}
      {phase === 'EXECUTE_PHASE3' && showExecutionSummary && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm text-center cursor-pointer hover:bg-white/5 rounded-lg p-2 transition-colors"
          onClick={handleDismissSummary}
        >
          {/* 第一行：伤害计算结果 */}
          {lastExecutionResult && (
            <div className="flex items-center justify-center gap-4 mb-1">
              <span className="text-red-400 font-bold text-shadow">总伤害: {lastExecutionResult.accumulatedDamage}</span>
              {lastExecutionResult.accumulatedArmor > 0 && (
                <span className="text-blue-400 font-bold text-shadow">总护甲: {lastExecutionResult.accumulatedArmor}</span>
              )}
            </div>
          )}
          {/* 第二行：护盾和扣血总结 */}
          <TurnSummaryDisplay />
          <div className="text-white/40 text-xs mt-1 text-shadow-sm">点击进入下一回合</div>
        </motion.div>
      )}

      {/* 伤害特效 */}
      <AnimatePresence>
        <DamageEffects />
      </AnimatePresence>

    </motion.div>
  );
}
