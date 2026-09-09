import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import { useGameStore } from '../store/gameStore';
import { getCurrentMapNode, useRunStore } from '../store/runStore';
import { getEnemyForNode } from '../data/mapData';
import { EnemyArea } from './EnemyArea';
import { PipelineBoard } from './PipelineBoard';
import { HandArea } from './HandArea';
import { DeckPile, DiscardPile, ExhaustPile } from './DeckAndDiscard';
import { CardListModal } from './CardListModal';
import { RunHUD } from './RunHUD';
import { Card } from './Card';
import { RelicDisplay } from './RelicDisplay';
import { BuffDisplay } from './BuffDisplay';
import type { CardInstance, PlayerClass } from '../types';

const CLASS_NAMES: Record<PlayerClass, string> = {
  WARRIOR: '勇士',
  PRIEST: '牧师',
};

const CLASS_ICONS: Record<PlayerClass, string> = {
  WARRIOR: '⚔️',
  PRIEST: '✨',
};

const CLASS_IMAGES: Record<PlayerClass, string | undefined> = {
  WARRIOR: '/pic/pro/pro1.webp',
  PRIEST: '/pic/pro/pro2.webp',
};

export function GameArena() {
  const initBattle = useGameStore((s) => s.initBattle);
  const addToPipeline = useGameStore((s) => s.addToPipeline);
  const reorderPipeline = useGameStore((s) => s.reorderPipeline);
  const activateClassSkill = useGameStore((s) => s.activateClassSkill);
  const executePipelineAction = useGameStore((s) => s.executePipelineAction);
  const nextTurn = useGameStore((s) => s.nextTurn);
  const dismissExecutionSummary = useGameStore((s) => s.dismissExecutionSummary);
  const requestSkip = useGameStore((s) => s.requestSkip);
  const drawPile = useGameStore((s) => s.drawPile);
  const discardPile = useGameStore((s) => s.discardPile);
  const exhaustPile = useGameStore((s) => s.exhaustPile);
  const pipeline = useGameStore((s) => s.pipeline);
  const skillUsedThisBattle = useGameStore((s) => s.skillUsedThisBattle);
  const pipelineSlots = useRunStore((s) => s.pipelineSlots);
  const playerProfile = useRunStore((s) => s.playerProfile);
  const playerMp = useRunStore((s) => s.playerMp);
  const playerMaxMp = useRunStore((s) => s.playerMaxMp);
  const onBattleVictory = useRunStore((s) => s.onBattleVictory);
  const onBattleDefeat = useRunStore((s) => s.onBattleDefeat);
  // 战斗中实时HP从 gameStore 获取，才能同步显示掉血
  const playerHp = useGameStore((s) => s.playerHp);
  const playerMaxHp = useGameStore((s) => s.playerMaxHp);
  const phase = useGameStore((s) => s.phase);
  const turnNumber = useGameStore((s) => s.turnNumber);
  const showExecutionSummary = useGameStore((s) => s.showExecutionSummary);
  const enemy = useGameStore((s) => s.enemy);
  const battleStats = useGameStore((s) => s.battleStats);

  const [activeCard, setActiveCard] = useState<CardInstance | null>(null);
  const [showDeckModal, setShowDeckModal] = useState(false);
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [showExhaustModal, setShowExhaustModal] = useState(false);
  const [skillMessage, setSkillMessage] = useState<string | null>(null);
  const [skillMessageKind, setSkillMessageKind] = useState<'success' | 'error'>('success');
  const [showSkillButton, setShowSkillButton] = useState(false);
  const [selectedCardUuid, setSelectedCardUuid] = useState<string | null>(null);
  const characterRef = useRef<HTMLDivElement>(null);
  const skillTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const difficulty = useRunStore((s) => s.difficulty);
  const comboCount = useGameStore((s) => s.comboCount);
  const overdriveFlash = useGameStore((s) => s.overdriveFlash);

  // gameStore.pipeline 在 initBattle 后才有长度，用它作为战斗就绪的派生信号（避免 effect 内 setState）
  const battleReady = useGameStore((s) => s.pipeline.length > 0);

  const canUseSkill = phase === 'PLAY' && playerMp > 0 && !skillUsedThisBattle;
  const mpPercent = Math.max(0, (playerMp / playerMaxMp) * 100);
  const hpPercent = Math.max(0, (playerHp / playerMaxHp) * 100);
  const isExecuting = phase === 'EXECUTE_PHASE1' || phase === 'EXECUTE_PHASE2' || phase === 'EXECUTE_PHASE3';

  useEffect(() => {
    const node = getCurrentMapNode();
    if (node) {
      const battleEnemy = getEnemyForNode(node, pipelineSlots, difficulty);
      initBattle(battleEnemy);
    }
  }, [initBattle, pipelineSlots, difficulty]);

  // 点击角色区域以外时收起技能浮层（不阻挡战场其他操作）
  useEffect(() => {
    if (!showSkillButton) return;
    const onPointerDown = (e: PointerEvent) => {
      if (characterRef.current && !characterRef.current.contains(e.target as Node)) {
        setShowSkillButton(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [showSkillButton]);

  // 卸载时清理技能提示计时器
  useEffect(() => {
    return () => {
      if (skillTimerRef.current) clearTimeout(skillTimerRef.current);
    };
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  const handleDragStart = (event: { active: { data: { current?: { card?: CardInstance } } } }) => {
    const card = event.active.data.current?.card;
    if (card) setActiveCard(card);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveCard(null);
    const { active, over } = event;
    if (!over) return;

    const activeData = active.data.current;
    const overData = over.data.current;
    if (!activeData || !overData) return;

    if (activeData.type === 'hand-card' && overData.type === 'pipeline-slot') {
      const card = activeData.card as CardInstance;
      addToPipeline(card.uuid, overData.index as number);
      setSelectedCardUuid(null);
    }

    if (activeData.type === 'pipeline-card' && overData.type === 'pipeline-slot') {
      const from = activeData.index as number;
      const to = overData.index as number;
      if (from !== to) {
        reorderPipeline(from, to);
      }
    }
  };

  const hasCards = pipeline.some((c) => c !== null);

  const handleExecute = async () => {
    await executePipelineAction();
  };

  const handleVictory = () => {
    if (phase !== 'VICTORY') return;
    onBattleVictory(playerHp, {
      totalDamage: battleStats.totalDamage,
      totalArmor: battleStats.totalArmor,
      effectiveArmor: battleStats.effectiveArmor,
      enemyName: enemy.name,
      isElite: enemy.isElite ?? false,
    });
  };

  const handleNextTurn = () => {
    if (phase !== 'VICTORY' && phase !== 'DEFEAT') {
      nextTurn();
    }
    dismissExecutionSummary();
  };

  const showSkillFeedback = (msg: string, kind: 'success' | 'error' = 'success') => {
    setSkillMessage(msg);
    setSkillMessageKind(kind);
    if (skillTimerRef.current) clearTimeout(skillTimerRef.current);
    skillTimerRef.current = setTimeout(() => setSkillMessage(null), 1500);
  };

  const handleUseSkill = () => {
    const ok = activateClassSkill();
    if (ok) {
      showSkillFeedback('技能使用成功！');
    } else {
      const reason = skillUsedThisBattle
        ? '本场战斗技能已用过'
        : playerProfile?.class === 'PRIEST' && playerHp >= playerMaxHp
          ? '生命值已满'
          : playerMp <= 0
            ? 'MP不足'
            : '技能不可用';
      showSkillFeedback(reason, 'error');
    }
    setShowSkillButton(false);
  };

  if (!battleReady) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-950 text-white/60">
        正在进入战斗…
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div
        className="flex flex-col h-screen overflow-hidden relative"
        style={{
          backgroundImage: 'url(/pic/P4_opacity_65.webp)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        {/* 遗物显示 - 左上角 */}
        <RelicDisplay />

        {/* 进度信息条 */}
        <RunHUD />

        {/* 跳过动画按钮（结算动画期间显示） */}
        <AnimatePresence>
          {(phase === 'EXECUTE_PHASE1' || phase === 'EXECUTE_PHASE2') && (
            <motion.button
              key="skip-button"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              onClick={requestSkip}
              className="absolute top-12 right-4 z-30 btn btn-secondary" style={{ height: 30, fontSize: 12, padding: '0 16px' }}
            >
              跳过 ⏭
            </motion.button>
          )}
        </AnimatePresence>

        {/* 连击计数器（执行阶段显示） */}
        <AnimatePresence>
          {isExecuting && comboCount >= 2 && (
            <motion.div
              key={'combo-' + comboCount}
              initial={{ scale: 1.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ opacity: 0 }}
              className='absolute top-1/3 left-1/2 -translate-x-1/2 z-30 pointer-events-none bg-black/50 rounded-xl px-4 py-1'
            >
              <span
                className='font-black text-4xl'
                style={{
                  color: comboCount >= 5 ? '#fcd34d' : '#f97316',
                  textShadow: '0 0 20px currentColor, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000',
                }}
              >
                {comboCount} 连击!
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 过载特效 */}
        <AnimatePresence>
          {overdriveFlash && (
            <motion.div
              key='overdrive'
              initial={{ opacity: 0.9, scale: 0.6 }}
              animate={{ opacity: 0, scale: 1.6 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.9 }}
              className='absolute inset-0 z-40 pointer-events-none'
              style={{
                background: 'radial-gradient(circle at 50% 40%, rgba(250,204,21,0.55), transparent 55%)',
                border: '4px solid rgba(250,204,21,0.7)',
                borderRadius: '24px',
              }}
            />
          )}
        </AnimatePresence>

        {/* 敌方区域（占据剩余空间） */}
        <div className="flex-1 flex items-center justify-center min-h-0 relative">
          <EnemyArea />

          {/* 胜利/失败按钮 - 浮动在敌人区域下方 */}
          <AnimatePresence>
            {(phase === 'VICTORY' || phase === 'DEFEAT') && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20"
              >
                {phase === 'VICTORY' && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleVictory}
                    className="btn btn-primary btn-xl"
                  >
                    领取奖励
                  </motion.button>
                )}

                {phase === 'DEFEAT' && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onBattleDefeat}
                    className="btn btn-secondary btn-xl"
                  >
                    战败 - 查看结算
                  </motion.button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="border-t border-white/5" />

        {/* 执行序列区 */}
        <div className="shrink-0">
          <PipelineBoard selectedUuid={selectedCardUuid} onSlotClick={(slot) => { if (selectedCardUuid) { addToPipeline(selectedCardUuid, slot); setSelectedCardUuid(null); } }} />
        </div>

        <div className="border-t border-white/5" />

        {/* 底部区域：行动按钮 | 角色面板 | 手牌区 | 提示 */}
        <div className="shrink-0 flex flex-col relative z-20">
          {/* 行动按钮行 */}
          <div className="flex justify-center items-center pt-1.5 pb-1 min-h-[46px]">
            {phase === 'PLAY' && (
              <button
                onClick={handleExecute}
                disabled={!hasCards}
                className={`btn ${hasCards ? 'btn-danger' : 'btn-secondary'}`}
                style={{ height: 40, letterSpacing: '0.35em', textIndent: '0.35em' }}
              >
                执行结算
              </button>
            )}

            {showExecutionSummary && phase !== 'VICTORY' && phase !== 'DEFEAT' && (
              <button onClick={handleNextTurn} className="btn btn-primary" style={{ height: 40 }}>
                下一回合
              </button>
            )}
          </div>

          {/* 角色面板 + 手牌 + 牌堆 */}
          <div className="flex items-end px-4 pt-1 gap-4">
            {/* 角色面板 */}
            <div
              ref={characterRef}
              className="shrink-0 relative panel p-2 flex items-center gap-3 cursor-pointer hover:border-[var(--line-strong)] transition-colors"
              onClick={() => setShowSkillButton((v) => !v)}
              title={skillUsedThisBattle ? '职业技能已使用' : '点击使用职业技能'}
            >
              {/* 头像 */}
              <div className="w-16 h-20 rounded-md overflow-hidden border border-[var(--line-strong)] relative shrink-0">
                {playerProfile && CLASS_IMAGES[playerProfile.class] ? (
                  <img
                    src={CLASS_IMAGES[playerProfile.class]}
                    alt={playerProfile.class === 'WARRIOR' ? '勇士' : '牧师'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl bg-[var(--ink-700)]">
                    {playerProfile ? CLASS_ICONS[playerProfile.class] : '⚔'}
                  </div>
                )}
              </div>

              {/* 名字 + 条 */}
              <div className="flex flex-col gap-1.5 w-[168px]">
                {playerProfile && (
                  <div className="flex items-baseline gap-2">
                    <span className="text-[15px] font-bold text-[var(--text-primary)] leading-none">{playerProfile.name}</span>
                    <span className="text-[11px] text-[var(--text-muted)] tracking-[0.25em]">{CLASS_NAMES[playerProfile.class]}</span>
                  </div>
                )}
                {/* 生命 */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[var(--text-muted)] tracking-[0.3em] w-6">生命</span>
                  <div className="flex-1 h-[7px] rounded-sm bg-[var(--ink-900)] overflow-hidden border border-[var(--line)]">
                    <motion.div
                      className="h-full bg-gradient-to-r from-[#a83a34] to-[#d9564f]"
                      animate={{ width: `${hpPercent}%` }}
                    />
                  </div>
                  <span className="num text-[11px] font-bold text-[#e88a84] w-14 text-right">{playerHp}<span className="text-[var(--text-muted)]">/{playerMaxHp}</span></span>
                </div>
                {/* 灵力 */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[var(--text-muted)] tracking-[0.3em] w-6">灵力</span>
                  <div className="flex-1 h-[7px] rounded-sm bg-[var(--ink-900)] overflow-hidden border border-[var(--line)]">
                    <motion.div
                      className="h-full bg-gradient-to-r from-[#6f4fc0] to-[#9d7be0]"
                      animate={{ width: `${mpPercent}%` }}
                    />
                  </div>
                  <span className="num text-[11px] font-bold text-[#b79ae8] w-14 text-right">{playerMp}<span className="text-[var(--text-muted)]">/{playerMaxMp}</span></span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[var(--text-muted)] tracking-[0.2em] num">回合 {turnNumber}</span>
                  {/* 职业技能按钮 */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (showSkillButton) { handleUseSkill(); } else { setShowSkillButton(true); }
                    }}
                    disabled={!canUseSkill}
                    className={`text-[10px] px-2 py-0.5 rounded border tracking-[0.15em] transition-colors ${
                      canUseSkill
                        ? 'text-[var(--gold-300)] border-[var(--line-strong)] hover:bg-[rgba(212,169,92,0.12)] cursor-pointer'
                        : 'text-[var(--text-muted)] border-[var(--line)] cursor-not-allowed'
                    }`}
                  >
                    {playerProfile?.class === 'WARRIOR' ? '强化' : playerProfile?.class === 'PRIEST' ? '治疗' : '技能'}
                    <span className="ml-1 opacity-70">-1灵力</span>
                  </button>
                </div>
              </div>

              {/* 职业技能确认浮层 */}
              <AnimatePresence>
                {showSkillButton && playerProfile && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-30 panel p-3 w-52"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="text-xs font-bold text-[var(--gold-300)] tracking-wider mb-1">
                      {playerProfile.class === 'WARRIOR' ? '职业技能 · 强化' : '职业技能 · 治疗'}
                    </div>
                    <div className="text-[11px] text-[var(--text-secondary)] leading-relaxed mb-2">
                      {playerProfile.class === 'WARRIOR'
                        ? '将一张「强化」卡置入手牌：下一张牌效果 ×4（消耗）。'
                        : '回复 20 点生命值（消耗）。'}
                    </div>
                    <button
                      onClick={handleUseSkill}
                      disabled={!canUseSkill}
                      className={`btn w-full ${canUseSkill ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ height: 30, fontSize: 12 }}
                    >
                      确 认 使 用
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Buff 显示（角色面板右侧） */}
            <div className="pb-3">
              <BuffDisplay />
            </div>

            {/* 中间：手牌区 */}
            <div className="flex-1 min-w-0 px-2">
              <HandArea
                selectedUuid={selectedCardUuid}
                onSelectCard={(uuid) => setSelectedCardUuid((cur) => (cur === uuid ? null : uuid))}
              />
            </div>

            {/* 右侧：牌堆 */}
            <div className="shrink-0 flex items-center gap-3 pb-2">
              <DeckPile onClick={() => setShowDeckModal(true)} />
              <DiscardPile onClick={() => setShowDiscardModal(true)} />
              {exhaustPile.length > 0 && (
                <ExhaustPile onClick={() => setShowExhaustModal(true)} />
              )}
            </div>
          </div>

          {/* 提示行 */}
          <div className="flex justify-center pb-1 pt-0.5">
            {phase === 'PLAY' && !selectedCardUuid && (
              <span className="text-[11px] text-[var(--text-muted)] tracking-[0.2em]">
                拖拽或点选卡牌置入序列 · 序列从左至右结算 · 点击已放置的卡牌可取回
              </span>
            )}
            {phase === 'PLAY' && selectedCardUuid && (
              <span className="text-[11px] text-[var(--gold-300)] tracking-[0.2em] animate-pulse">
                点击上方空槽位放置卡牌
              </span>
            )}
          </div>
        </div>

        {/* 技能使用提示 */}
        <AnimatePresence>
          {skillMessage && (
            <motion.div
              key={skillMessage}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`absolute bottom-32 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg text-white text-sm font-bold z-30 ${
                skillMessageKind === 'success' ? 'bg-green-500/80' : 'bg-red-500/80'
              }`}
            >
              {skillMessage}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 拖拽覆盖层 */}
      <DragOverlay>
        {activeCard ? <div style={{ transform: 'rotate(4deg)' }}><Card card={activeCard} isDragging /></div> : null}
      </DragOverlay>

      {/* 弹窗 */}
      <CardListModal
        isOpen={showDeckModal}
        onClose={() => setShowDeckModal(false)}
        title="牌库"
        cards={drawPile}
      />
      <CardListModal
        isOpen={showDiscardModal}
        onClose={() => setShowDiscardModal(false)}
        title="弃牌堆"
        cards={discardPile}
      />
      <CardListModal
        isOpen={showExhaustModal}
        onClose={() => setShowExhaustModal(false)}
        title="消耗堆"
        cards={exhaustPile}
      />
    </DndContext>
  );
}
