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
import { Icon } from './icons';
import type { CardInstance, PlayerClass } from '../types';

const CLASS_NAMES: Record<PlayerClass, string> = {
  WARRIOR: '勇士',
  PRIEST: '牧师',
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
  const turnSummary = useGameStore((s) => s.turnSummary);
  const showExecutionSummary = useGameStore((s) => s.showExecutionSummary);
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
      showSkillFeedback('技能使用成功');
    } else {
      const reason = skillUsedThisBattle
        ? '本场战斗技能已用过'
        : playerProfile?.class === 'PRIEST' && playerHp >= playerMaxHp
          ? '生命值已满'
          : playerMp <= 0
            ? '灵力不足'
            : '技能不可用';
      showSkillFeedback(reason, 'error');
    }
    setShowSkillButton(false);
  };

  if (!battleReady) {
    return (
      <div className="scene flex items-center justify-center h-screen">
        <span className="etch-label" style={{ letterSpacing: '0.4em', color: 'var(--text-muted)' }}>正 在 进 入 战 斗 …</span>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col h-screen overflow-hidden relative bg-[#07090f]">
        {/* ===== 场景底：符文地牢 + 调色 ===== */}
        <div
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: 'url(/pic/P4_opacity_65.webp)',
            backgroundSize: 'cover',
            backgroundPosition: 'center 30%',
          }}
        />
        {/* 调色层：压暗 + 玄铁蓝化 + 暗角 */}
        <div
          className="absolute inset-0 z-0"
          style={{
            background: `
              radial-gradient(90% 62% at 50% 30%, transparent 40%, rgba(6,8,14,0.55) 100%),
              linear-gradient(180deg, rgba(7,9,15,0.62) 0%, rgba(7,9,15,0.3) 30%, rgba(7,9,15,0.55) 68%, rgba(6,8,13,0.94) 100%)
            `,
          }}
        />

        {/* 遗物显示 - 左上角 */}
        <RelicDisplay />

        {/* 顶栏 */}
        <div className="relative z-30">
          <RunHUD />
        </div>

        {/* ===== 战斗飘字 ===== */}
        <AnimatePresence>
          {turnSummary && showExecutionSummary && turnSummary.totalDamage > 0 && (
            <motion.div
              key={'dmg-' + turnSummary.totalDamage}
              initial={{ opacity: 0, scale: 0.6, y: 10 }}
              animate={{ opacity: 1, scale: 1.05, y: -6 }}
              exit={{ opacity: 0, y: -18 }}
              transition={{ duration: 0.45, type: 'spring' }}
              className="absolute right-[14%] top-[22%] z-20 pointer-events-none flex flex-col items-center"
            >
              <span
                className="num font-black"
                style={{
                  fontSize: turnSummary.totalDamage >= 60 ? 46 : 34,
                  color: turnSummary.totalDamage >= 60 ? '#f0c878' : '#ede8db',
                  textShadow: '0 0 18px rgba(217,184,105,0.5), 0 2px 8px rgba(4,6,10,0.9)',
                  letterSpacing: '-0.02em',
                }}
              >
                -{turnSummary.totalDamage}
              </span>
              {turnSummary.overdrive && (
                <span className="inline-flex items-center gap-1 text-[12px] font-black tracking-[0.3em] breathe" style={{ color: '#e6cc8b' }}>
                  <Icon name="bolt" size={12} />过载
                </span>
              )}
            </motion.div>
          )}
          {turnSummary && showExecutionSummary && turnSummary.hpLoss > 0 && (
            <motion.div
              key={'hp-' + turnSummary.hpLoss}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1.05 }}
              exit={{ opacity: 0, y: 14 }}
              transition={{ duration: 0.45, type: 'spring' }}
              className="absolute left-[14%] top-[44%] z-20 pointer-events-none"
            >
              <span
                className="num font-black text-3xl"
                style={{ color: '#e5736b', textShadow: '0 0 16px rgba(209,83,75,0.55), 0 2px 8px rgba(4,6,10,0.9)' }}
              >
                -{turnSummary.hpLoss}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 跳过动画按钮 */}
        <AnimatePresence>
          {(phase === 'EXECUTE_PHASE1' || phase === 'EXECUTE_PHASE2') && (
            <motion.button
              key="skip-button"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              onClick={requestSkip}
              className="btn btn-secondary btn-sm absolute top-14 right-4 z-30"
            >
              <Icon name="skip" size={12} />
              跳过
            </motion.button>
          )}
        </AnimatePresence>

        {/* 连击计数牌 */}
        <AnimatePresence>
          {isExecuting && comboCount >= 2 && (
            <motion.div
              key={'combo-' + comboCount}
              initial={{ scale: 1.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute left-[18%] top-[16%] z-20 pointer-events-none flex items-center gap-2 rounded-xl px-4 py-2"
              style={{
                background: 'linear-gradient(180deg, rgba(20,14,6,0.88), rgba(10,8,4,0.88))',
                border: '1px solid rgba(217,184,105,0.5)',
                boxShadow: '0 4px 20px rgba(3,4,8,0.6), 0 0 20px rgba(217,184,105,0.25)',
              }}
            >
              <span style={{ color: '#e6cc8b' }}><Icon name="bolt" size={18} /></span>
              <span
                className="num font-black text-3xl"
                style={{
                  color: comboCount >= 5 ? '#f6dc9a' : '#d9b869',
                  textShadow: '0 0 16px rgba(217,184,105,0.6), 0 2px 4px rgba(0,0,0,0.8)',
                }}
              >
                {comboCount}
              </span>
              <span className="text-[13px] font-bold tracking-[0.24em]" style={{ color: '#c8a24e' }}>连击</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 过载闪光 */}
        <AnimatePresence>
          {overdriveFlash && (
            <motion.div
              key="overdrive"
              initial={{ opacity: 0.85 }}
              animate={{ opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.9 }}
              className="absolute inset-0 z-40 pointer-events-none"
              style={{
                background: 'radial-gradient(circle at 50% 38%, rgba(240,200,120,0.5), transparent 55%)',
              }}
            />
          )}
        </AnimatePresence>

        {/* ===== 敌方舞台 ===== */}
        <div className="flex-1 flex items-center justify-center min-h-0 relative z-10">
          <EnemyArea />

          {/* 胜利/失败按钮 */}
          <AnimatePresence>
            {(phase === 'VICTORY' || phase === 'DEFEAT') && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20"
              >
                {phase === 'VICTORY' && (
                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={handleVictory}
                    className="btn btn-primary btn-xl"
                  >
                    <Icon name="gift" size={18} />
                    领取奖励
                  </motion.button>
                )}

                {phase === 'DEFEAT' && (
                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={onBattleDefeat}
                    className="btn btn-secondary btn-xl"
                  >
                    战败 · 查看结算
                  </motion.button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ===== 序列导轨 ===== */}
        <div className="shrink-0 relative z-10 pb-1">
          <PipelineBoard
            selectedUuid={selectedCardUuid}
            onSlotClick={(slot) => {
              if (selectedCardUuid) {
                addToPipeline(selectedCardUuid, slot);
                setSelectedCardUuid(null);
              }
            }}
            onExecute={handleExecute}
            onNextTurn={handleNextTurn}
          />
        </div>

        {/* ===== 底部：角色牌板 | 手牌 | 牌堆 ===== */}
        <div
          className="shrink-0 relative z-20"
          style={{
            background: 'linear-gradient(180deg, transparent 0%, rgba(6,8,13,0.72) 22%, rgba(5,6,11,0.92) 100%)',
          }}
        >
          <div className="flex flex-col lg:flex-row items-center lg:items-end px-2 sm:px-4 gap-1.5 lg:gap-4">
            {/* 角色牌板 */}
            <div
              ref={characterRef}
              className="shrink-0 relative panel corner-orn p-1.5 sm:p-2.5 flex items-center gap-2 sm:gap-3 cursor-pointer transition-colors lg:mb-2 w-full lg:w-auto"
              style={{ borderColor: showSkillButton ? 'var(--line-brass)' : undefined }}
              onClick={() => setShowSkillButton((v) => !v)}
              title={skillUsedThisBattle ? '职业技能已使用' : '点击使用职业技能'}
            >
              {/* 肖像 */}
              <div
                className="w-[62px] h-[78px] rounded-lg overflow-hidden relative shrink-0"
                style={{
                  border: '1.5px solid var(--line-brass)',
                  boxShadow: '0 4px 14px rgba(3,4,8,0.55), 0 0 12px rgba(200,162,78,0.15)',
                }}
              >
                {playerProfile && CLASS_IMAGES[playerProfile.class] ? (
                  <img
                    src={CLASS_IMAGES[playerProfile.class]}
                    alt={CLASS_NAMES[playerProfile.class]}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(180deg, #232c47, #131829)', color: 'var(--brass-300)' }}>
                    <Icon name="swords" size={26} />
                  </div>
                )}
              </div>

              {/* 名字 + 蚀刻条 */}
              <div className="flex flex-col gap-[7px] w-[172px]">
                {playerProfile && (
                  <div className="flex items-baseline gap-2">
                    <span className="text-[15px] font-bold leading-none" style={{ color: 'var(--text-primary)' }}>{playerProfile.name}</span>
                    <span className="etch-label">{CLASS_NAMES[playerProfile.class]}</span>
                  </div>
                )}
                {/* 生命 */}
                <div className="flex items-center gap-1.5">
                  <span style={{ color: '#e5736b' }}><Icon name="heart" size={12} /></span>
                  <div className="etch-bar flex-1">
                    <motion.div className="fill fill-hp" animate={{ width: `${hpPercent}%` }} />
                  </div>
                  <span className="num text-[11px] font-black w-[52px] text-right" style={{ color: '#f2a29b' }}>
                    {playerHp}<span style={{ color: 'var(--text-muted)' }}>/{playerMaxHp}</span>
                  </span>
                </div>
                {/* 灵力 */}
                <div className="flex items-center gap-1.5">
                  <span style={{ color: 'var(--mana-400)' }}><Icon name="drop" size={12} /></span>
                  <div className="etch-bar flex-1">
                    <motion.div className="fill fill-mp" animate={{ width: `${mpPercent}%` }} />
                  </div>
                  <span className="num text-[11px] font-black w-[52px] text-right" style={{ color: 'var(--mana-300)' }}>
                    {playerMp}<span style={{ color: 'var(--text-muted)' }}>/{playerMaxMp}</span>
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="etch-label num">回合 {turnNumber}</span>
                  {/* 职业技能 */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (showSkillButton) { handleUseSkill(); } else { setShowSkillButton(true); }
                    }}
                    disabled={!canUseSkill}
                    className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-[3px] rounded-md tracking-[0.12em] transition-colors"
                    style={
                      canUseSkill
                        ? { color: 'var(--brass-300)', border: '1px solid var(--line-brass)', background: 'rgba(200,162,78,0.1)' }
                        : { color: 'var(--text-faint)', border: '1px solid var(--line-soft)', cursor: 'not-allowed' }
                    }
                  >
                    <Icon name="sparkle" size={10} />
                    {playerProfile?.class === 'WARRIOR' ? '强化' : playerProfile?.class === 'PRIEST' ? '治疗' : '技能'}
                    <span style={{ opacity: 0.65 }}>-1灵力</span>
                  </button>
                </div>
              </div>

              {/* 技能确认浮层 */}
              <AnimatePresence>
                {showSkillButton && playerProfile && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-30 panel panel-gold p-3.5 w-56"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold tracking-wider mb-1.5" style={{ color: 'var(--brass-300)' }}>
                      <Icon name="sparkle" size={12} />
                      {playerProfile.class === 'WARRIOR' ? '职业技能 · 强化' : '职业技能 · 治疗'}
                    </div>
                    <div className="text-[11px] leading-relaxed mb-2.5" style={{ color: 'var(--text-secondary)' }}>
                      {playerProfile.class === 'WARRIOR'
                        ? '将一张「强化」卡置入手牌：下一张牌效果 ×4（消耗）。'
                        : '回复 20 点生命值（消耗）。'}
                    </div>
                    <button
                      onClick={handleUseSkill}
                      disabled={!canUseSkill}
                      className={`btn btn-sm w-full ${canUseSkill ? 'btn-primary' : 'btn-secondary'}`}
                    >
                      确认使用
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* 状态印章 */}
            <div className="pb-3 shrink-0">
              <BuffDisplay />
            </div>

            {/* 手牌 */}
            <div className="flex-1 min-w-0">
              <HandArea
                selectedUuid={selectedCardUuid}
                onSelectCard={(uuid) => setSelectedCardUuid((cur) => (cur === uuid ? null : uuid))}
              />
            </div>

            {/* 牌堆 */}
            <div className="shrink-0 flex items-center gap-3 pb-2.5">
              <DeckPile onClick={() => setShowDeckModal(true)} />
              <DiscardPile onClick={() => setShowDiscardModal(true)} />
              {exhaustPile.length > 0 && (
                <ExhaustPile onClick={() => setShowExhaustModal(true)} />
              )}
            </div>
          </div>
        </div>

        {/* 技能提示 */}
        <AnimatePresence>
          {skillMessage && (
            <motion.div
              key={skillMessage}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute bottom-40 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold panel"
              style={{
                borderColor: skillMessageKind === 'success' ? 'rgba(143,199,122,0.5)' : 'rgba(229,115,107,0.5)',
                color: skillMessageKind === 'success' ? '#a8d697' : '#f2a29b',
              }}
            >
              <Icon name={skillMessageKind === 'success' ? 'check' : 'x'} size={14} />
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
