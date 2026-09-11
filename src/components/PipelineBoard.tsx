import { useEffect, useRef, useState } from 'react';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { Card } from './Card';
import { Icon } from './icons';
import { StatusEffectType } from '../types';
import type { SlotPreview, SlotLink } from '../types';
import { useIsMobile } from '../hooks/useIsMobile';

// --- 链能连线层：按实际 DOM 位置绘制 ---
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
    type === 'RESONANCE' ? '#5ee0e6' : type === 'CHAIN_DEFENSE' ? '#7ea6d8' : type === 'DESPERATE_STRIKE' ? '#e5736b' : '#d9b869';

  return (
    <motion.div
      className="absolute h-[3px] rounded-full"
      style={{
        left: `${Math.min(startX, endX)}px`,
        top: `${centerY}px`,
        width: `${linkWidth}px`,
        background: `linear-gradient(90deg, ${color}50, ${color}, ${color}50)`,
        boxShadow: `0 0 10px ${color}80`,
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent)' }}
        animate={{ x: isForward ? ['-100%', '100%'] : ['100%', '-100%'] }}
        transition={{ duration: 1.1, repeat: Infinity, ease: 'linear' }}
      />
    </motion.div>
  );
}

// 受击预告：骑在槽位下边缘的迷你结果章（与上方攻击牌呼应，不遮卡牌）
function SlotResultTag({ preview, compact }: { preview: SlotPreview; compact?: boolean }) {
  const fullyBlocked = preview.hpLoss === 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className={`absolute -bottom-[12px] left-1/2 -translate-x-1/2 z-30 flex items-center justify-center gap-1 rounded-md px-2 py-[2px] font-bold whitespace-nowrap pointer-events-none ${compact ? "text-[8px]" : "text-[10px]"}`}
      style={
        fullyBlocked
          ? { color: '#a9c6e8', background: 'rgba(16,26,44,0.95)', border: '1px solid rgba(126,166,216,0.5)', boxShadow: '0 2px 8px rgba(3,4,8,0.5)' }
          : { color: '#f2a29b', background: 'rgba(44,14,12,0.95)', border: '1px solid rgba(209,83,75,0.55)', boxShadow: '0 2px 8px rgba(3,4,8,0.5)' }
      }
    >
      {preview.isVulnerablePenalty ? (
        <span>破绽 · 受创 {preview.hpLoss}</span>
      ) : fullyBlocked ? (
        <span className="inline-flex items-center gap-1"><Icon name="shield" size={9} />格挡</span>
      ) : (
        <span>
          受创 {preview.hpLoss}
          <span className="opacity-60">/{preview.incomingDamage}</span>
        </span>
      )}
    </motion.div>
  );
}

// 敌方攻击预告：骑在槽位上边缘的血铜小牌
function SlotAttackIndicator({ slotIndex, compact }: { slotIndex: number; compact?: boolean }) {
  const intent = useGameStore((s) => s.enemy.intent);
  const attack = intent.attacks.find((a) => a.slotIndex === slotIndex);
  if (!attack) return null;

  return (
    <div
      className="absolute -top-[13px] left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 rounded-md px-2 py-[3px] whitespace-nowrap"
      style={{
        background: 'linear-gradient(180deg, rgba(60,18,15,0.95), rgba(40,12,10,0.95))',
        border: '1px solid rgba(229,115,107,0.65)',
        boxShadow: '0 2px 10px rgba(209,83,75,0.35), 0 0 8px rgba(209,83,75,0.25)',
      }}
      title={`敌人将攻击此槽位，伤害 ${attack.damage}`}
    >
      <span className="text-[#e5736b]"><Icon name="sword" size={compact ? 8 : 10} strokeWidth={2.2} /></span>
      <span className={`num font-black leading-none text-[#f2a29b] ${compact ? 'text-[10px]' : 'text-[12px]'}`}>{attack.damage}</span>
    </div>
  );
}

function PipelineSlot({
  index,
  compact,
  selectedUuid,
  onSlotClick,
}: {
  index: number;
  compact?: boolean;
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

  const isExecuting = (phase === 'EXECUTE_PHASE1' || phase === 'EXECUTE_PHASE2') && executingIndex === index;
  const isPhase2Attack = phase === 'EXECUTE_PHASE2' && executingIndex === index;

  // 槽井配色（玄铁井 + 状态色描边）
  let wellStyle: React.CSSProperties = {
    background: 'linear-gradient(180deg, rgba(6,8,14,0.72), rgba(12,16,27,0.55))',
    border: '1px dashed rgba(168,182,214,0.22)',
    boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.5)',
  };
  if (selectedUuid && !displayCard && !isLocked && phase === 'PLAY') {
    wellStyle = {
      background: 'rgba(200,162,78,0.07)',
      border: '1px dashed rgba(217,184,105,0.55)',
      boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.5), 0 0 14px rgba(217,184,105,0.15)',
    };
  }
  if (isAttackTarget && phase === 'PLAY') {
    wellStyle = {
      background: 'rgba(209,83,75,0.06)',
      border: '1px solid rgba(209,83,75,0.5)',
      boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.5), 0 0 12px rgba(209,83,75,0.12)',
    };
  }
  if (isBurning) {
    wellStyle = {
      background: 'rgba(240,146,60,0.06)',
      border: '1px solid rgba(240,146,60,0.5)',
      boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.5)',
    };
  }
  if (isIgnited) {
    wellStyle = {
      background: 'rgba(240,146,60,0.1)',
      border: '1px solid rgba(240,146,60,0.75)',
      boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.5), 0 0 14px rgba(240,146,60,0.2)',
    };
  }
  if (isOver) {
    wellStyle = {
      background: 'rgba(200,162,78,0.12)',
      border: '1px solid #d9b869',
      boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.5), 0 0 20px rgba(217,184,105,0.35)',
    };
  }
  if (isLocked) {
    wellStyle = {
      background: 'rgba(168,127,224,0.09)',
      border: '1px solid rgba(168,127,224,0.55)',
      boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.5)',
    };
  }
  if (isExecuting) {
    wellStyle = {
      background: 'rgba(200,162,78,0.1)',
      border: '1px solid #d9b869',
      boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.5), 0 0 24px rgba(217,184,105,0.5)',
    };
  }
  if (isPhase2Attack) {
    wellStyle = {
      background: 'rgba(209,83,75,0.12)',
      border: '1px solid #e5736b',
      boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.5), 0 0 24px rgba(209,83,75,0.5)',
    };
  }

  return (
    <div
      ref={setNodeRef}
      data-slot-index={index}
      onClick={() => {
        if (phase === 'PLAY' && selectedUuid && !displayCard && !isLocked) onSlotClick?.(index);
      }}
      className={`relative ${compact ? 'w-14 h-20 rounded-md' : 'w-28 h-40 rounded-[10px]'} flex items-center justify-center transition-all duration-200`}
      style={wellStyle}
    >
      {/* 敌方攻击预告 */}
      {isAttackTarget && phase === 'PLAY' && <SlotAttackIndicator slotIndex={index} compact={compact} />}

      {/* 预览结果签 */}
      {preview && phase === 'PLAY' && !isLocked && <SlotResultTag preview={preview} compact={compact} />}

      {/* 锁定 */}
      {isLocked && (
        <div className="absolute inset-0 rounded-[10px] flex items-center justify-center z-10" style={{ background: 'rgba(120,90,180,0.12)' }}>
          <span className="text-[#c4a8ee] opacity-90"><Icon name="lock" size={20} /></span>
        </div>
      )}

      {/* 状态角标 */}
      {isIgnited && !isLocked && (
        <div className="absolute top-1 left-1 z-10 text-[#fb923c]" title="焦土：此槽卡牌数值 +100%">
          <Icon name="flame" size={13} />
        </div>
      )}
      {isBurning && !isLocked && (
        <motion.div
          className="absolute top-1 right-1 z-10 text-[#fb923c]"
          animate={{ scale: [1, 1.25, 1] }}
          transition={{ duration: 0.9, repeat: Infinity }}
          title="燃烧：此槽卡牌数值减半"
        >
          <Icon name="flame" size={13} />
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
              <Card card={displayCard} size={compact ? 'xs' : 'md'} />
            </div>
          </motion.div>
        ) : !isLocked ? (
          <span
            className="num text-[15px] font-bold"
            style={{ color: 'rgba(168,182,214,0.22)', textShadow: '0 1px 0 rgba(0,0,0,0.6)' }}
          >
            {String(index + 1).padStart(2, '0')}
          </span>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/** 槽间流向箭头 */
function FlowChevron({ active, delay }: { active: boolean; delay: number }) {
  return (
    <motion.span
      className="mx-[3px] flex items-center"
      animate={active ? { color: ['#3d4763', '#d9b869', '#3d4763'] } : { color: '#3d4763' }}
      transition={active ? { duration: 0.7, repeat: Infinity, delay } : undefined}
    >
      <Icon name="arrow" size={13} strokeWidth={2.4} />
    </motion.span>
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

  const isMobile = useIsMobile();
  const logRef = useRef<HTMLDivElement>(null);
  const hasCards = pipeline.some((c) => c !== null);

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
      <div className="panel relative px-5 pt-2.5 pb-2">
        {/* 导轨装饰：槽位行上下各一条鎏金细轨 */}
        <div className="absolute left-6 right-6 top-[7px] h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(200,162,78,0.35), transparent)' }} />
        <div className="absolute left-6 right-6 bottom-[7px] h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(200,162,78,0.35), transparent)' }} />

        {/* ===== 槽位行 ===== */}
        <div className="relative flex flex-wrap items-center justify-center gap-1 sm:gap-1">
          {Array.from({ length: pipelineSlots }).map((_, i) => (
            <div key={i} className="flex items-center">
              <PipelineSlot index={i} compact={isMobile} selectedUuid={selectedUuid} onSlotClick={onSlotClick} />
              {i < pipelineSlots - 1 && (
                <span className="hidden sm:flex items-center">
                  <FlowChevron active={phase === 'EXECUTE_PHASE1'} delay={i * 0.14} />
                </span>
              )}
            </div>
          ))}

          {/* 执行按钮：导轨末端的鎏金扳机 */}
          {phase === 'PLAY' && (
            <motion.button
              onClick={onExecute}
              disabled={!hasCards}
              className={`btn w-full sm:w-auto sm:ml-4 mt-2 sm:mt-0 ${hasCards ? 'btn-danger' : 'btn-secondary'}`}
              style={{ height: isMobile ? 42 : 52, letterSpacing: '0.28em', textIndent: '0.28em', fontSize: isMobile ? 14 : 16 }}
              whileHover={hasCards ? { scale: 1.03 } : undefined}
              whileTap={hasCards ? { scale: 0.97 } : undefined}
            >
              <Icon name="bolt" size={17} strokeWidth={2.2} />
              执行结算
            </motion.button>
          )}
        </div>

        {/* 链能连线 */}
        {phase === 'PLAY' && slotLinks.length > 0 && (
          <div className="absolute inset-x-5 top-3 h-40 pointer-events-none">
            <LightningLinkLayer links={slotLinks} />
          </div>
        )}

        {/* ===== 日志井 / 结算区 ===== */}
        <div className="mt-2 pt-1.5" style={{ borderTop: '1px solid rgba(168,182,214,0.1)' }}>
          <div ref={logRef} className="h-[44px] overflow-y-auto pr-1 flex flex-col gap-[2px]">
            {executionLog.length === 0 && !isExecuting && !showSummary && (
              <div className="text-[12px] tracking-[0.1em] py-1" style={{ color: 'var(--text-muted)' }}>
                {phase === 'PLAY'
                  ? selectedUuid
                    ? '点击发光的空槽位，放置选中的卡牌'
                    : '将卡牌拖入序列槽 · 修饰牌置左可强化右侧 · 血铜描边的槽位将受敌方攻击'
                  : ''}
              </div>
            )}
            {executionLog.map((log, i) => (
              <div key={`${i}-${log}`} className="text-[12.5px] leading-[1.5] num" style={{ color: 'var(--text-secondary)' }}>
                {log}
              </div>
            ))}
          </div>

          {/* 阶段指示 */}
          {phaseLabel && (
            <div className="flex items-center gap-2 mt-1">
              <span className="w-1.5 h-1.5 rounded-full breathe" style={{ background: '#d9b869', boxShadow: '0 0 6px rgba(217,184,105,0.8)' }} />
              <span className="text-[12px] font-bold tracking-[0.24em]" style={{ color: '#e6cc8b' }}>{phaseLabel}</span>
            </div>
          )}

          {/* 结算摘要行 */}
          <AnimatePresence>
            {showSummary && turnSummary && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-2 pt-2 flex items-center justify-between gap-4 flex-wrap"
                style={{ borderTop: '1px solid rgba(168,182,214,0.1)' }}
              >
                <div className="flex items-center gap-4 flex-wrap text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                  <span className="inline-flex items-center gap-1.5">
                    <Icon name="sword" size={13} style={{ color: '#f2a29b' }} />
                    总伤害 <span className="num text-[15px] font-black" style={{ color: '#f2a29b' }}>{turnSummary.totalDamage}</span>
                  </span>
                  {turnSummary.totalArmor > 0 && (
                    <span className="inline-flex items-center gap-1.5">
                      <Icon name="shield" size={13} style={{ color: '#a9c6e8' }} />
                      护盾 <span className="num text-[15px] font-black" style={{ color: '#a9c6e8' }}>{turnSummary.effectiveArmor}</span>
                      {turnSummary.totalArmor !== turnSummary.effectiveArmor && (
                        <span className="num text-[11px]" style={{ color: 'var(--text-muted)' }}>/{turnSummary.totalArmor}</span>
                      )}
                    </span>
                  )}
                  {turnSummary.hpLoss > 0 && (
                    <span className="inline-flex items-center gap-1.5">
                      <Icon name="heart" size={13} style={{ color: '#e5736b' }} />
                      受创 <span className="num text-[15px] font-black" style={{ color: '#e5736b' }}>{turnSummary.hpLoss}</span>
                    </span>
                  )}
                  {turnSummary.riposteDamage > 0 && (
                    <span className="inline-flex items-center gap-1.5">
                      <Icon name="riposte" size={13} style={{ color: '#f0b46a' }} />
                      反击 <span className="num text-[15px] font-black" style={{ color: '#f0b46a' }}>+{turnSummary.riposteDamage}</span>
                    </span>
                  )}
                  {turnSummary.overdrive && (
                    <span className="inline-flex items-center gap-1.5 text-[12px] font-black tracking-[0.22em] breathe" style={{ color: '#e6cc8b' }}>
                      <Icon name="bolt" size={13} />OVERDRIVE 过载
                    </span>
                  )}
                </div>
                <button onClick={onNextTurn} className="btn btn-primary shrink-0" style={{ height: 34, fontSize: 13 }}>
                  下一回合
                  <Icon name="arrow" size={14} strokeWidth={2.4} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
