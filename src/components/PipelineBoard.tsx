import { useEffect, useRef, useState } from 'react';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { Card } from './Card';
import { StatusEffectType } from '../types';
import type { SlotPreview, SlotLink } from '../types';

// --- 闪电链接层：按实际 DOM 位置绘制 ---
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
    <div className="absolute inset-0 pointer-events-none z-20">
      {links.map((link, index) => {
        const from = slotRects[link.from];
        const to = slotRects[link.to];
        if (!from || !to) return null;
        return <LightningLink key={`${link.from}-${link.to}-${index}`} from={from} to={to} type={link.type} />;
      })}
    </div>
  );
}

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

  const color =
    type === 'RESONANCE' ? '#22d3ee' : type === 'CHAIN_DEFENSE' ? '#3b82f6' : type === 'DESPERATE_STRIKE' ? '#ef4444' : '#d4a95c';

  return (
    <motion.div
      className="absolute h-[3px] rounded-full"
      style={{
        left: `${Math.min(startX, endX)}px`,
        top: `${centerY}px`,
        width: `${linkWidth}px`,
        background: `linear-gradient(90deg, ${color}60, ${color}, ${color}60)`,
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.7), transparent)' }}
        animate={{ x: isForward ? ['-100%', '100%'] : ['100%', '-100%'] }}
        transition={{ duration: 1.1, repeat: Infinity, ease: 'linear' }}
      />
    </motion.div>
  );
}

// 受击预告：槽位底边的内嵌结果签（替代浮动的预览框）
function SlotResultTag({ preview }: { preview: SlotPreview }) {
  const fullyBlocked = preview.hpLoss === 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className={`absolute bottom-1 left-1 right-1 z-20 flex items-center justify-center gap-1 rounded-md py-[3px] text-[11px] font-bold pointer-events-none ${
        fullyBlocked
          ? 'bg-[rgba(110,180,110,0.16)] text-[#9ed49e] border border-[rgba(110,180,110,0.4)]'
          : 'bg-[rgba(217,86,79,0.16)] text-[#e89a94] border border-[rgba(217,86,79,0.4)]'
      }`}
    >
      {preview.isVulnerablePenalty ? (
        <span>破绽！掉血 {preview.hpLoss}</span>
      ) : fullyBlocked ? (
        <span>格挡 ✓</span>
      ) : (
        <span>
          掉血 {preview.hpLoss}
          <span className="opacity-60"> / {preview.incomingDamage}</span>
        </span>
      )}
    </motion.div>
  );
}

// 敌方攻击预告：骑在槽位上边缘的小红签
function SlotAttackIndicator({ slotIndex }: { slotIndex: number }) {
  const intent = useGameStore((s) => s.enemy.intent);
  const attack = intent.attacks.find((a) => a.slotIndex === slotIndex);
  if (!attack) return null;

  return (
    <div
      className="absolute -top-[11px] left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 rounded-full bg-[#3a1210] border border-[rgba(217,86,79,0.7)] px-2 py-[2px] whitespace-nowrap shadow-md"
      title={`敌人将攻击此槽位，伤害 ${attack.damage}`}
    >
      <span className="text-[#e88a84] text-[10px] leading-none">⚔</span>
      <span className="num text-[12px] font-black leading-none text-[#f0a49e]">{attack.damage}</span>
    </div>
  );
}

function PipelineSlot({
  index,
  selectedUuid,
  onSlotClick,
}: {
  index: number;
  selectedUuid?: string | null;
  onSlotClick?: (slot: number) => void;
}) {
  const card = useGameStore((s) => s.pipeline[index]);
  const pipelineSnapshot = useGameStore((s) => s.pipelineSnapshot);
  const executingIndex = useGameStore((s) => s.executingIndex);
  const phase = useGameStore((s) => s.phase);
  const removeFromPipeline = useGameStore((s) => s.removeFromPipeline);
  const slotStatus = useGameStore((s) => s.slotStatuses[index]);
  const slotPreviews = useGameStore((s) => s.slotPreviews);
  const intent = useGameStore((s) => s.enemy.intent);
  const globalDamageBonus = useGameStore((s) => s.globalDamageBonus);

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

  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
    id: `pipeline-card-${index}`,
    data: { type: 'pipeline-card', index, card },
    disabled: phase !== 'PLAY' || !card,
  });

  const isHighlighted = (phase === 'EXECUTE_PHASE1' || phase === 'EXECUTE_PHASE2') && executingIndex === index;
  const isPhase2Attack = phase === 'EXECUTE_PHASE2' && executingIndex === index;

  return (
    <div
      ref={setNodeRef}
      data-slot-index={index}
      onClick={() => {
        if (phase === 'PLAY' && selectedUuid && !displayCard && !isLocked) onSlotClick?.(index);
      }}
      className={`relative w-32 h-40 rounded-lg border flex items-center justify-center transition-colors ${
        isLocked
          ? 'border-[rgba(157,123,224,0.5)] bg-[rgba(157,123,224,0.08)]'
          : isPhase2Attack
            ? 'border-[rgba(217,86,79,0.8)] bg-[rgba(217,86,79,0.1)]'
            : isOver
              ? 'border-[var(--gold-400)] bg-[rgba(212,169,92,0.1)]'
              : isHighlighted
                ? 'border-[var(--gold-400)] bg-[rgba(212,169,92,0.08)]'
                : isIgnited
                  ? 'border-[rgba(240,146,60,0.7)] bg-[rgba(240,146,60,0.08)]'
                  : isBurning
                    ? 'border-[rgba(240,146,60,0.45)] bg-[rgba(240,146,60,0.05)]'
                    : isAttackTarget && phase === 'PLAY'
                      ? 'border-[rgba(217,86,79,0.45)] bg-[rgba(217,86,79,0.04)]'
                      : isHighlighted
                        ? 'border-[var(--gold-400)] ring-2 ring-[rgba(212,169,92,0.45)] bg-[rgba(212,169,92,0.08)]'
                        : isPhase2Attack
                        ? 'border-[rgba(217,86,79,0.9)] ring-2 ring-[rgba(217,86,79,0.45)] bg-[rgba(217,86,79,0.08)]'
                        : selectedUuid && !displayCard
                        ? 'border-[var(--gold-500)]/60 bg-[rgba(212,169,92,0.05)] animate-pulse'
                        : 'border-dashed border-[var(--line)] bg-white/[0.02]'
      }`}
    >
      {/* 敌方攻击预告：骑上边缘 */}
      {isAttackTarget && phase === 'PLAY' && <SlotAttackIndicator slotIndex={index} />}

      {/* 预览结果签 */}
      {preview && phase === 'PLAY' && !isLocked && <SlotResultTag preview={preview} />}

      {/* 锁定 */}
      {isLocked && (
        <div className="absolute inset-0 rounded-lg bg-[rgba(157,123,224,0.12)] flex items-center justify-center z-10">
          <span className="text-xl opacity-80">🔒</span>
        </div>
      )}

      {/* 状态角标 */}
      {isIgnited && !isLocked && (
        <div className="absolute top-1 left-1 text-[11px]" title="焦土：此槽卡牌数值 +100%">
          🔥
        </div>
      )}
      {isBurning && !isLocked && (
        <motion.div
          className="absolute top-1 right-1 text-[11px]"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 0.9, repeat: Infinity }}
          title="燃烧：此槽卡牌数值减半"
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
            exit={{ scale: 0.5, opacity: 0 }}
            className="absolute inset-0"
          >
            <div
              ref={setDragRef}
              {...attributes}
              {...listeners}
              onClick={() => {
                if (phase !== 'PLAY') return;
                if (selectedUuid && !card) onSlotClick?.(index);
                else if (!selectedUuid && card) removeFromPipeline(index);
              }}
              className="w-full h-full cursor-grab active:cursor-grabbing"
            >
              <Card card={displayCard} isHighlighted={isHighlighted} damageBonus={globalDamageBonus} />
            </div>
          </motion.div>
        ) : !isLocked ? (
          <span className="num text-[15px] text-white/20">{index + 1}</span>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

// ============================== 战斗控制台 ==============================

export function PipelineBoard({
  selectedUuid,
  onSlotClick,
  onExecute,
  onNextTurn,
}: {
  selectedUuid?: string | null;
  onSlotClick?: (slot: number) => void;
  onExecute?: () => void;
  onNextTurn?: () => void;
} = {}) {
  const phase = useGameStore((s) => s.phase);
  const executionLog = useGameStore((s) => s.executionLog);
  const showExecutionSummary = useGameStore((s) => s.showExecutionSummary);
  const pipelineSlots = useGameStore((s) => s.pipelineSlots);
  const turnSummary = useGameStore((s) => s.turnSummary);
  const slotLinks = useGameStore((s) => s.slotLinks);
  const pipeline = useGameStore((s) => s.pipeline);

  const logRef = useRef<HTMLDivElement>(null);
  const hasCards = pipeline.some((c) => c !== null);

  // 日志自动滚动到底
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [executionLog.length]);

  const isExecuting = phase === 'EXECUTE_PHASE1' || phase === 'EXECUTE_PHASE2';
  const showSummary = showExecutionSummary && phase === 'EXECUTE_PHASE3' && !!turnSummary;
  const shouldShake = showSummary && turnSummary && (turnSummary.hpLoss > 0 || turnSummary.totalDamage > 0);

  const phaseLabel =
    phase === 'EXECUTE_PHASE1' ? '管道执行中' : phase === 'EXECUTE_PHASE2' ? '敌方攻击中' : phase === 'EXECUTE_PHASE3' ? '结算完成' : null;

  return (
    <motion.div
      className="mx-auto w-fit max-w-full px-4"
      animate={shouldShake ? { x: [0, -8, 8, -6, 6, 0], transition: { duration: 0.45 } } : {}}
    >
      <div className="panel relative px-5 pt-4 pb-3">
        {/* ===== 槽位行 ===== */}
        <div className="relative flex items-center justify-center gap-2.5">
          {Array.from({ length: pipelineSlots }).map((_, i) => (
            <div key={i} className="flex items-center">
              <PipelineSlot index={i} selectedUuid={selectedUuid} onSlotClick={onSlotClick} />
              {i < pipelineSlots - 1 && (
                <motion.span
                  className="mx-1 text-[13px] text-[var(--text-muted)]"
                  animate={phase === 'EXECUTE_PHASE1' ? { color: ['#4a5468', '#d4a95c', '#4a5468'] } : {}}
                  transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.14 }}
                >
                  →
                </motion.span>
              )}
            </div>
          ))}

          {/* 执行按钮：与槽位同行右置 */}
          {phase === 'PLAY' && (
            <button
              onClick={onExecute}
              disabled={!hasCards}
              className={`btn btn-danger ml-5 shrink-0 ${hasCards ? '' : 'btn-secondary'}`}
              style={{ height: 48, letterSpacing: '0.3em', textIndent: '0.3em' }}
            >
              执行结算
            </button>
          )}
        </div>

        {/* 闪电链接 */}
        {phase === 'PLAY' && slotLinks.length > 0 && (
          <div className="absolute inset-x-5 top-4 h-40 pointer-events-none">
            <LightningLinkLayer links={slotLinks} />
          </div>
        )}

        {/* ===== 日志 / 结算区 ===== */}
        <div className="mt-3 border-t border-[var(--line)] pt-2">
          {/* 日志主体：固定高度，逐行，自动滚底 */}
          <div ref={logRef} className="h-[72px] overflow-y-auto pr-1 flex flex-col gap-[3px]">
            {executionLog.length === 0 && !isExecuting && !showSummary && (
              <div className="text-[12px] text-[var(--text-muted)] tracking-[0.12em] py-1">
                {phase === 'PLAY'
                  ? selectedUuid
                    ? '点击上方发光的空槽位，放置选中的卡牌'
                    : '将卡牌置入序列槽 · 修饰牌放左侧强化右侧 · 敌方将攻击红边标记的槽位'
                  : ''}
              </div>
            )}
            {executionLog.map((log, i) => (
              <div key={`${i}-${log}`} className="text-[12.5px] leading-[1.5] text-[var(--text-secondary)] num">
                {log}
              </div>
            ))}
          </div>

          {/* 阶段指示 */}
          {phaseLabel && (
            <div className="flex items-center gap-2 mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--gold-400)] animate-pulse" />
              <span className="text-[12px] font-bold text-[var(--gold-300)] tracking-[0.2em]">{phaseLabel}</span>
            </div>
          )}

          {/* 结算摘要行 */}
          <AnimatePresence>
            {showSummary && turnSummary && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-2 pt-2 border-t border-[var(--line)] flex items-center justify-between gap-4 flex-wrap"
              >
                <div className="flex items-center gap-4 flex-wrap text-[13px]">
                  <span className="text-[var(--text-secondary)]">
                    总伤害 <span className="num text-[15px] font-black text-[#f0a49e]">{turnSummary.totalDamage}</span>
                  </span>
                  {turnSummary.totalArmor > 0 && (
                    <span className="text-[var(--text-secondary)]">
                      护盾 <span className="num text-[15px] font-black text-[#8fb8e0]">{turnSummary.effectiveArmor}</span>
                      {turnSummary.totalArmor !== turnSummary.effectiveArmor && (
                        <span className="num text-[11px] text-[var(--text-muted)]">/{turnSummary.totalArmor}</span>
                      )}
                    </span>
                  )}
                  {turnSummary.hpLoss > 0 && (
                    <span className="text-[var(--text-secondary)]">
                      扣血 <span className="num text-[15px] font-black text-[#e88a84]">{turnSummary.hpLoss}</span>
                    </span>
                  )}
                  {turnSummary.riposteDamage > 0 && (
                    <span className="text-[var(--text-secondary)]">
                      反击 <span className="num text-[15px] font-black text-[#f0b46a]">+{turnSummary.riposteDamage}</span>
                    </span>
                  )}
                  {turnSummary.overdrive && (
                    <span className="text-[12px] font-black text-[var(--gold-300)] tracking-[0.2em] animate-pulse">⚡ OVERDRIVE</span>
                  )}
                </div>
                <button onClick={onNextTurn} className="btn btn-primary shrink-0" style={{ height: 34, fontSize: 13 }}>
                  下一回合
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
