import { useDroppable } from '@dnd-kit/core';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
// import { useRunStore } from '../store/runStore';
import { Card } from './Card';
import { StatusEffectType } from '../types';
import type { SlotPreview, SlotLink } from '../types';

// 闪电链接特效组件
function LightningLink({ from, to, type }: { from: number; to: number; type: SlotLink['type'] }) {
  // 计算链接的位置
  const slotWidth = 128; // w-32 = 128px
  const gap = 8; // gap-2 = 8px
  
  // 从 from 槽位的右侧到 to 槽位的左侧
  const fromX = from * (slotWidth + gap) + slotWidth;
  const toX = to * (slotWidth + gap);
  
  // 确定方向（从左到右或从右到左）
  const isForward = to > from;
  const linkWidth = Math.abs(toX - fromX + (isForward ? 0 : slotWidth));
  
  // 根据类型确定颜色
  const getColor = () => {
    switch (type) {
      case 'MODIFIER':
        return '#facc15'; // 黄色
      case 'RESONANCE':
        return '#22d3ee'; // 青色
      case 'CHAIN_DEFENSE':
        return '#3b82f6'; // 蓝色
      case 'DESPERATE_STRIKE':
        return '#ef4444'; // 红色
      default:
        return '#facc15';
    }
  };
  
  const color = getColor();
  
  return (
    <motion.div
      className="absolute top-1/2 -translate-y-1/2 h-1 rounded-full pointer-events-none z-20"
      style={{
        left: `${Math.min(fromX, toX + (isForward ? 0 : slotWidth))}px`,
        width: `${linkWidth}px`,
        background: `linear-gradient(90deg, ${color}80, ${color}, ${color}80)`,
        boxShadow: `0 0 10px ${color}, 0 0 20px ${color}80`,
      }}
      initial={{ opacity: 0, scaleX: 0 }}
      animate={{ 
        opacity: 1, 
        scaleX: 1,
      }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      {/* 闪电图标 */}
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-lg"
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.7, 1, 0.7],
        }}
        transition={{
          duration: 0.8,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        style={{ color }}
      >
        ⚡
      </motion.div>
      
      {/* 流动光效 */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
        }}
        animate={{
          x: isForward ? ['-100%', '100%'] : ['100%', '-100%'],
        }}
        transition={{
          duration: 1,
          repeat: Infinity,
          ease: 'linear',
        }}
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

// 伤害特效组件
function DamageEffects() {
  const turnSummary = useGameStore((s) => s.turnSummary);
  const showExecutionSummary = useGameStore((s) => s.showExecutionSummary);
  const phase = useGameStore((s) => s.phase);
  
  // 在结算阶段或胜利/失败阶段都显示伤害跳字
  const shouldShowDamage = phase === 'EXECUTE_PHASE3' || phase === 'VICTORY' || phase === 'DEFEAT';
  
  if (!showExecutionSummary || !shouldShowDamage || !turnSummary) {
    return null;
  }
  
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
          <div className="text-6xl font-black text-red-500 drop-shadow-[0_0_20px_rgba(239,68,68,0.8)]"
            style={{ 
              textShadow: '0 0 30px rgba(239,68,68,0.8), 0 0 60px rgba(239,68,68,0.5)',
              WebkitTextStroke: '2px white'
            }}
          >
            -{turnSummary.hpLoss}
          </div>
        </motion.div>
      )}
      
      {/* 怪物受伤特效 */}
      {turnSummary.totalDamage > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5, x: 100 }}
          animate={{ opacity: 1, scale: 1.2, x: 150 }}
          exit={{ opacity: 0, y: -50 }}
          transition={{ duration: 0.5, type: 'spring', delay: 0.1 }}
          className="fixed right-1/4 top-1/2 z-50 pointer-events-none"
        >
          <div className="text-6xl font-black text-orange-500 drop-shadow-[0_0_20px_rgba(249,115,22,0.8)]"
            style={{ 
              textShadow: '0 0 30px rgba(249,115,22,0.8), 0 0 60px rgba(249,115,22,0.5)',
              WebkitTextStroke: '2px white'
            }}
          >
            -{turnSummary.totalDamage}
          </div>
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
      className="absolute -top-14 left-1/2 -translate-x-1/2 font-black text-red-500 bg-red-950/90 border-2 border-red-500/70 rounded-xl px-4 py-2 whitespace-nowrap z-10 shadow-lg shadow-red-900/50"
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
      className="absolute -top-44 left-1/2 -translate-x-1/2 font-bold bg-black/95 border-2 border-white/40 rounded-2xl px-5 py-3 whitespace-nowrap z-20 flex flex-col items-center gap-2 shadow-2xl"
      style={{ fontSize: '16px' }}
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

function PipelineSlot({ index, keepVisible }: { index: number; keepVisible?: boolean }) {
  const card = useGameStore((s) => s.pipeline[index]);
  const executingIndex = useGameStore((s) => s.executingIndex);
  const phase = useGameStore((s) => s.phase);
  const removeFromPipeline = useGameStore((s) => s.removeFromPipeline);
  const slotStatus = useGameStore((s) => s.slotStatuses[index]);
  const slotPreviews = useGameStore((s) => s.slotPreviews);
  const intent = useGameStore((s) => s.enemy.intent);
  const globalDamageBonus = useGameStore((s) => s.globalDamageBonus);

  const isLocked = slotStatus?.isLocked ?? false;
  const isBurning = slotStatus?.statusEffects.some((e) => e.type === StatusEffectType.BURNING) ?? false;
  const isAttackTarget = intent.attacks.some((a) => a.slotIndex === index);
  const preview = slotPreviews.find((p) => p.slotIndex === index);

  const { setNodeRef, isOver } = useDroppable({
    id: `pipeline-slot-${index}`,
    data: { type: 'pipeline-slot', index },
    disabled: phase !== 'PLAY' || isLocked,
  });

  const isHighlighted = (phase === 'EXECUTE_PHASE1' || phase === 'EXECUTE_PHASE2') && executingIndex === index;
  const isPhase2Attack = phase === 'EXECUTE_PHASE2' && executingIndex === index;

  return (
    <motion.div
      ref={setNodeRef}
      className={`
        w-32 h-44 rounded-xl border-2 border-dashed flex items-center justify-center
        transition-colors relative
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

      {/* 燃烧指示器 */}
      {isBurning && !isLocked && (
        <motion.div
          className="absolute -top-2 right-0 text-sm"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 0.8, repeat: Infinity }}
        >
          🔥
        </motion.div>
      )}

      <AnimatePresence mode="popLayout">
        {(card && !isLocked) || (keepVisible && card) ? (
          <motion.div
            key={card?.uuid || 'empty'}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0, y: -20 }}
            className="absolute inset-0"
          >
            <div onClick={() => phase === 'PLAY' && removeFromPipeline(index)}>
              {card && <Card card={card} isHighlighted={isHighlighted} damageBonus={globalDamageBonus} />}
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
  // const executePipelineAction = useGameStore((s) => s.executePipelineAction);
  // const pipeline = useGameStore((s) => s.pipeline);
  const executionLog = useGameStore((s) => s.executionLog);
  const lastExecutionResult = useGameStore((s) => s.lastExecutionResult);
  const showExecutionSummary = useGameStore((s) => s.showExecutionSummary);
  const dismissExecutionSummary = useGameStore((s) => s.dismissExecutionSummary);
  const nextTurn = useGameStore((s) => s.nextTurn);
  const pipelineSlots = useGameStore((s) => s.pipelineSlots);
  // const playerHp = useGameStore((s) => s.playerHp);
  const turnSummary = useGameStore((s) => s.turnSummary);
  // const battleStats = useGameStore((s) => s.battleStats);
  // const enemy = useGameStore((s) => s.enemy);
  // const onBattleVictory = useRunStore((s) => s.onBattleVictory);
  // const onBattleDefeat = useRunStore((s) => s.onBattleDefeat);
  const slotLinks = useGameStore((s) => s.slotLinks);

  // const hasCards = pipeline.some((c) => c !== null);

  // const handleExecute = async () => {
  //   await executePipelineAction();
  // };

  // const handleVictory = () => {
  //   // 传递战斗统计信息
  //   onBattleVictory(playerHp, {
  //     totalDamage: battleStats.totalDamage,
  //     totalArmor: battleStats.totalArmor,
  //     effectiveArmor: battleStats.effectiveArmor,
  //     enemyName: enemy.name,
  //   });
  // };

  const handleDismissSummary = () => {
    // 只有非胜利/失败状态才进入下一回合
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

  // 在结算阶段且显示总结时，保持管道卡牌可见
  const keepPipelineVisible = phase === 'EXECUTE_PHASE3' && showExecutionSummary;
  
  // 是否触发震动（玩家或怪物受伤）
  const shouldShake = showExecutionSummary && phase === 'EXECUTE_PHASE3' && turnSummary && 
    (turnSummary.hpLoss > 0 || turnSummary.totalDamage > 0);

  return (
    <motion.div 
      className="flex flex-col items-center gap-3 py-3 px-4 w-full"
      animate={shouldShake ? {
        x: [0, -10, 10, -10, 10, 0],
        transition: { duration: 0.5 }
      } : {}}
    >
      {/* 毛玻璃托盘背景 - 覆盖1-5号槽位区域 */}
      <div className="relative">
        <div 
          className="absolute inset-0 rounded-2xl"
          style={{
            backgroundColor: 'rgba(15, 23, 42, 0.7)', // 深藏青色，70%透明度
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            margin: '-12px -16px -8px -16px', // 减少底部margin，避免遮挡按钮
            padding: '12px 16px 8px 16px',
          }}
        />
        {/* 动态槽位 */}
        <div className="flex items-center gap-2 relative z-10">
          {Array.from({ length: pipelineSlots }).map((_, i) => (
            <div key={i} className="flex items-center">
              <PipelineSlot index={i} keepVisible={keepPipelineVisible} />
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
            <div className="absolute inset-0 pointer-events-none">
              {slotLinks.map((link, index) => (
                <LightningLink
                  key={`${link.from}-${link.to}-${index}`}
                  from={link.from}
                  to={link.to}
                  type={link.type}
                />
              ))}
            </div>
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
                key={i}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: i * 0.05 }}
                className="text-xs px-2 py-1 rounded-full bg-white/10 text-yellow-300/80 text-shadow-sm"
              >
                {log}
              </motion.span>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 回合总结 - 点击后消失 */}
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
          <div className="text-white/40 text-xs mt-1 text-shadow-sm">点击查看下回合</div>
        </motion.div>
      )}

      {/* 伤害特效 */}
      <DamageEffects />

    </motion.div>
  );
}
