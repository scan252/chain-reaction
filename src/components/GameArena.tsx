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
  const characterRef = useRef<HTMLDivElement>(null);
  const skillTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // gameStore.pipeline 在 initBattle 后才有长度，用它作为战斗就绪的派生信号（避免 effect 内 setState）
  const battleReady = useGameStore((s) => s.pipeline.length > 0);

  const canUseSkill = phase === 'PLAY' && playerMp > 0 && !skillUsedThisBattle;
  const mpPercent = Math.max(0, (playerMp / playerMaxMp) * 100);
  const hpPercent = Math.max(0, (playerHp / playerMaxHp) * 100);
  const isExecuting = phase === 'EXECUTE_PHASE1' || phase === 'EXECUTE_PHASE2' || phase === 'EXECUTE_PHASE3';

  useEffect(() => {
    const node = getCurrentMapNode();
    if (node) {
      const battleEnemy = getEnemyForNode(node, pipelineSlots);
      initBattle(battleEnemy);
    }
  }, [initBattle, pipelineSlots]);

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
              className="absolute top-4 right-4 z-30 px-4 py-2 rounded-lg text-sm font-bold bg-black/40 hover:bg-black/60 text-white/80 border border-white/10 cursor-pointer backdrop-blur-sm transition-colors"
            >
              跳过 ⏭
            </motion.button>
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
                    className="px-12 py-4 rounded-xl font-bold text-xl tracking-wider bg-gradient-to-r from-yellow-500 to-amber-500 text-white shadow-lg shadow-yellow-500/30 cursor-pointer"
                  >
                    领取奖励
                  </motion.button>
                )}

                {phase === 'DEFEAT' && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onBattleDefeat}
                    className="px-12 py-4 rounded-xl font-bold text-xl tracking-wider bg-gradient-to-r from-gray-600 to-gray-700 text-white shadow-lg shadow-gray-500/30 cursor-pointer"
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
          <PipelineBoard />
        </div>

        <div className="border-t border-white/5" />

        {/* 底部区域：上横条 - 执行结算按钮 | 中横条 - 角色占位+HP/MP | 下横条 - 手牌区+牌堆 | 底横条 - 提示文字 */}
        <div className="shrink-0 flex flex-col relative z-20">
          {/* 上横条：执行结算 / 下一回合 按钮 */}
          <div className="flex justify-center pt-8 pb-2">
            {phase === 'PLAY' && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleExecute}
                disabled={!hasCards}
                className={`px-12 py-4 rounded-xl font-bold text-xl tracking-wider transition-all ${
                  hasCards
                    ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/30 cursor-pointer'
                    : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                }`}
              >
                执行结算
              </motion.button>
            )}

            {showExecutionSummary && phase !== 'VICTORY' && phase !== 'DEFEAT' && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleNextTurn}
                className="px-12 py-4 rounded-xl font-bold text-xl tracking-wider bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/30 cursor-pointer"
              >
                下一回合
              </motion.button>
            )}
          </div>

          {/* 中横条：角色占位 + HP/MP（紧贴角色右侧） */}
          <div className="flex items-center px-4 py-2 gap-4">
            {/* 左侧：角色占位区 */}
            <div
              ref={characterRef}
              className="flex flex-col items-center justify-center shrink-0 w-[160px] relative"
              onClick={() => setShowSkillButton((v) => !v)}
            >
              {/* 角色大占位区 */}
              <div className="w-36 h-44 rounded-2xl bg-gradient-to-br from-indigo-600/20 to-purple-800/20 border-2 border-dashed border-white/20 flex flex-col items-center justify-center relative cursor-pointer hover:border-white/40 transition-colors overflow-hidden">
                {playerProfile && CLASS_IMAGES[playerProfile.class] ? (
                  <img
                    src={CLASS_IMAGES[playerProfile.class]}
                    alt={playerProfile.class === 'WARRIOR' ? '勇士' : '牧师'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-5xl">{playerProfile ? CLASS_ICONS[playerProfile.class] : '⚔️'}</span>
                )}
              </div>
              {/* 提示文字 - 放在头像下方 */}
              <span className="mt-2 text-xs text-white/50 text-shadow-sm whitespace-nowrap">
                {skillUsedThisBattle ? '技能已使用' : '点击上方头像使用技能'}
              </span>

              {/* 职业技能按钮 - 点击角色后浮现 */}
              <AnimatePresence>
                {showSkillButton && playerProfile && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.9 }}
                    animate={{ opacity: 1, y: -50, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.9 }}
                    className="absolute bottom-16 left-1/2 -translate-x-1/2 z-30"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <motion.button
                      whileHover={canUseSkill ? { scale: 1.05 } : {}}
                      whileTap={canUseSkill ? { scale: 0.95 } : {}}
                      onClick={handleUseSkill}
                      disabled={!canUseSkill}
                      className={`py-2 px-3 rounded-lg font-bold text-xs transition-all whitespace-nowrap ${
                        canUseSkill
                          ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/30 cursor-pointer'
                          : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      <span>
                        {playerProfile.class === 'WARRIOR'
                          ? '强化 (-1MP)'
                          : playerProfile.class === 'PRIEST'
                            ? '治疗 (-1MP)'
                            : '技能'}
                      </span>
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* 角色右侧：HP/MP条（放大，紧贴） */}
            <div className="flex flex-col justify-center gap-3 w-48">
              {/* 玩家名称 */}
              {playerProfile && (
                <div className="text-center mb-1">
                  <div className="text-white font-bold text-lg text-shadow">{playerProfile.name}</div>
                  <div className="text-white/50 text-sm text-shadow-sm">{CLASS_NAMES[playerProfile.class]}</div>
                </div>
              )}
              {/* HP - 放大 */}
              <div className="flex items-center gap-2">
                <span className="text-red-400 text-lg text-shadow">❤️</span>
                <div className="flex-1 h-4 rounded-full bg-gray-800 overflow-hidden border border-white/10">
                  <motion.div
                    className="h-full bg-gradient-to-r from-red-600 to-red-400"
                    animate={{ width: `${hpPercent}%` }}
                  />
                </div>
                <span className="text-sm text-red-400 font-bold w-16 text-right text-shadow">{playerHp}/{playerMaxHp}</span>
              </div>
              {/* MP - 放大，在HP下方 */}
              <div className="flex items-center gap-2">
                <span className="text-purple-400 text-lg text-shadow">🔮</span>
                <div className="flex-1 h-4 rounded-full bg-gray-800 overflow-hidden border border-white/10">
                  <motion.div
                    className="h-full bg-gradient-to-r from-purple-600 to-pink-400"
                    animate={{ width: `${mpPercent}%` }}
                  />
                </div>
                <span className="text-sm text-purple-400 font-bold w-16 text-right text-shadow">{playerMp}/{playerMaxMp}</span>
              </div>
              {/* 回合 */}
              <div className="text-center text-xs text-white/40 mt-1 text-shadow-sm">回合 {turnNumber} · {isExecuting ? '结算中' : '行动阶段'}</div>

              {/* Buff 显示 */}
              <BuffDisplay />
            </div>
          </div>

          {/* 中横条：牌库(左) + 手牌区(中) + 弃牌堆(右) + 消耗堆(最右，可选) */}
          <div className="flex items-center px-4 py-2">
            <div className="flex items-center w-full">
              {/* 左侧：牌库 */}
              <div className="shrink-0 w-[100px] flex justify-center">
                <DeckPile onClick={() => setShowDeckModal(true)} />
              </div>

              {/* 中间：手牌区 */}
              <div className="flex-1 min-w-0 px-4">
                <HandArea />
              </div>

              {/* 右侧：弃牌堆 + 消耗堆 */}
              <div className="shrink-0 flex items-center gap-4">
                <DiscardPile onClick={() => setShowDiscardModal(true)} />
                {exhaustPile.length > 0 && (
                  <ExhaustPile onClick={() => setShowExhaustModal(true)} />
                )}
              </div>
            </div>
          </div>

          {/* 下横条：操作按钮 + 提示文字 */}
          <div className="flex flex-col items-center justify-center py-2 gap-3">
            {/* 提示文字 - 只在非结算/胜利/失败状态显示 */}
            {phase === 'PLAY' && (
              <div className="flex items-center gap-2 text-sm text-white/50">
                <span className="text-cyan-400/60 text-shadow">⚡</span>
                <span className="text-shadow-sm">执行序列 - 从左到右触发连锁反应</span>
                <span className="text-cyan-400/60 text-shadow">⚡</span>
              </div>
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
        {activeCard ? <Card card={activeCard} isDragging /> : null}
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
