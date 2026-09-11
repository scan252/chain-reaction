import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { useRunStore } from '../store/runStore';
import { MapNodeType, type MapNode } from '../types';
import { FORBIDDEN_CARD } from '../data/cardData';
import { EASTER_EGG } from '../config/balance';
import { Icon, type IconName } from './icons';
import { Card } from './Card';

const NODE_ICON: Record<string, IconName> = {
  [MapNodeType.BATTLE]: 'swords',
  [MapNodeType.SHOP]: 'shop',
  [MapNodeType.REST]: 'tent',
  [MapNodeType.REWARD]: 'gift',
  [MapNodeType.ELITE]: 'skull',
  [MapNodeType.BOSS]: 'crown',
};

const NODE_LABEL: Record<string, string> = {
  [MapNodeType.BATTLE]: '战斗',
  [MapNodeType.SHOP]: '商店',
  [MapNodeType.REST]: '休息',
  [MapNodeType.REWARD]: '奖励',
  [MapNodeType.ELITE]: '精英',
  [MapNodeType.BOSS]: 'BOSS',
};

/** 节点主色（描边/图标） */
const NODE_COLOR: Record<string, string> = {
  [MapNodeType.BATTLE]: '#e5736b',
  [MapNodeType.SHOP]: '#d9b869',
  [MapNodeType.REST]: '#8fc77a',
  [MapNodeType.REWARD]: '#7decdc',
  [MapNodeType.ELITE]: '#c4a8ee',
  [MapNodeType.BOSS]: '#e5736b',
};

// 吉祥物首次点击对话
const FIRST_CLICK_DIALOGUE = '欢迎回来，冒险者！排好你的卡牌序列——修饰牌放左边，连锁会越滚越大。祝你好运~';

// 吉祥物常规对话列表（随机显示）
const MASCOT_DIALOGUES = [
  '你好呀，冒险者！',
  '今天也是充满挑战的一天呢~',
  '需要我给你一些建议吗？',
  '加油，我相信你能行的！',
  '记住，合理安排卡牌顺序很重要哦~',
];

// 隐藏对话
const HIDDEN_DIALOGUE = '少年，你想要变强吗？';

/** 背景符文巨环（装饰） */
function RuneCircle({ className, style }: { className?: string; style?: React.CSSProperties }) {
  const glyphs = 28;
  return (
    <svg viewBox="0 0 400 400" className={className} style={style}>
      <circle cx="200" cy="200" r="192" fill="none" stroke="rgba(168,182,214,0.07)" strokeWidth="1" />
      <circle cx="200" cy="200" r="168" fill="none" stroke="rgba(168,182,214,0.05)" strokeWidth="1" strokeDasharray="2 6" />
      <circle cx="200" cy="200" r="120" fill="none" stroke="rgba(168,182,214,0.06)" strokeWidth="1" />
      {Array.from({ length: glyphs }).map((_, i) => {
        const a = (i / glyphs) * Math.PI * 2;
        const x = 200 + Math.cos(a) * 180;
        const y = 200 + Math.sin(a) * 180;
        const rot = (a * 180) / Math.PI + 90;
        return (
          <g key={i} transform={`translate(${x} ${y}) rotate(${rot})`} opacity="0.16">
            <rect x="-3" y="-5" width="6" height="10" fill="none" stroke="rgba(168,182,214,0.7)" strokeWidth="0.8" />
            <line x1="-3" y1="0" x2="3" y2="0" stroke="rgba(168,182,214,0.7)" strokeWidth="0.8" />
          </g>
        );
      })}
    </svg>
  );
}

export function MapScreen() {
  const map = useRunStore((s) => s.map);
  const selectMapNode = useRunStore((s) => s.selectMapNode);
  const gold = useRunStore((s) => s.gold);
  const playerHp = useRunStore((s) => s.playerHp);
  const playerMaxHp = useRunStore((s) => s.playerMaxHp);
  const playerMp = useRunStore((s) => s.playerMp);
  const playerMaxMp = useRunStore((s) => s.playerMaxMp);
  const masterDeck = useRunStore((s) => s.masterDeck);
  const pipelineSlots = useRunStore((s) => s.pipelineSlots);
  const currentLayer = useRunStore((s) => s.currentLayer);

  // 吉祥物点击状态
  const [mascotClicked, setMascotClicked] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [dialogueIndex, setDialogueIndex] = useState(0);
  const [isFirstClick, setIsFirstClick] = useState(true);
  const [isHiddenDialogue, setIsHiddenDialogue] = useState(false);
  const [showingFirstDialogue, setShowingFirstDialogue] = useState(false);
  const [showSecretQuestion, setShowSecretQuestion] = useState(false);
  const [showForbiddenCard, setShowForbiddenCard] = useState(false);
  const [showDeckModal, setShowDeckModal] = useState(false);

  const mascotTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (mascotTimerRef.current) clearTimeout(mascotTimerRef.current);
    };
  }, []);

  const addCardToMasterDeck = useRunStore((s) => s.addCardToMasterDeck);

  const handleMascotClick = () => {
    setMascotClicked(true);
    if (mascotTimerRef.current) clearTimeout(mascotTimerRef.current);
    mascotTimerRef.current = setTimeout(() => setMascotClicked(false), 300);

    setShowDialog(true);

    if (isFirstClick) {
      setShowingFirstDialogue(true);
      setIsFirstClick(false);
      setIsHiddenDialogue(false);
    } else {
      setShowingFirstDialogue(false);
      const isHidden = Math.random() < EASTER_EGG.MASCOT_SECRET_CHANCE;
      setIsHiddenDialogue(isHidden);

      if (!isHidden) {
        const randomIndex = Math.floor(Math.random() * MASCOT_DIALOGUES.length);
        setDialogueIndex(randomIndex);
      } else {
        setDialogueIndex(-1);
      }
    }
  };

  const handleHiddenButtonClick = (accepted: boolean) => {
    if (accepted) {
      setShowSecretQuestion(true);
    } else {
      setShowDialog(false);
      setIsHiddenDialogue(false);
    }
  };

  const handleSecretCommand = (choice: 'A' | 'B' | 'C') => {
    setShowSecretQuestion(false);

    if (choice === 'C') {
      // 禁忌卡防重复：整局只能获得一次
      const alreadyOwned = useRunStore
        .getState()
        .masterDeck.some((c) => c.templateId === FORBIDDEN_CARD.templateId);
      if (!alreadyOwned) {
        setShowForbiddenCard(true);
        addCardToMasterDeck(FORBIDDEN_CARD);
      } else {
        setIsHiddenDialogue(false);
        setDialogueIndex(3);
        setShowDialog(true);
      }
    }

    setShowDialog(false);
    setIsHiddenDialogue(false);
  };

  // 计算节点位置
  const layerSpacing = 138;
  const startY = 96;
  const canvasWidth = 600;

  function getNodePos(layer: number, column: number, layerSize: number) {
    const spacing = canvasWidth / (layerSize + 1);
    return {
      x: spacing * (column + 1),
      y: startY + layer * layerSpacing,
    };
  }

  // 当前所在节点
  let currentNode: MapNode | null = null;
  if (map.currentNodeId) {
    for (const layer of map.layers) {
      const found = layer.find((n) => n.id === map.currentNodeId);
      if (found) {
        currentNode = found;
        break;
      }
    }
  }

  // 收集所有连线
  const lines: { x1: number; y1: number; x2: number; y2: number; active: boolean; traversed: boolean }[] = [];
  for (let li = 0; li < map.layers.length - 1; li++) {
    for (const node of map.layers[li]) {
      const from = getNodePos(li, node.column, map.layers[li].length);
      for (const connId of node.connections) {
        const nextLayer = map.layers[li + 1];
        const target = nextLayer.find((n) => n.id === connId);
        if (target) {
          const to = getNodePos(li + 1, target.column, nextLayer.length);
          const isActive = currentNode?.id === node.id && target.available;
          const traversed = node.visited && target.visited;
          lines.push({ x1: from.x, y1: from.y, x2: to.x, y2: to.y, active: isActive, traversed });
        }
      }
    }
  }

  const svgHeight = startY + (map.layers.length - 1) * layerSpacing + 64;

  return (
    <div className="scene scene-aurora vignette flex flex-col h-screen overflow-hidden">
      {/* 背景符文巨环 */}
      <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none overflow-hidden">
        <RuneCircle className="spin-slower w-[120vmin] h-[120vmin] opacity-70" />
      </div>

      {/* ===== 顶栏资源 ===== */}
      <div
        className="relative z-20 flex flex-wrap items-center justify-center gap-2.5 py-2.5 px-3"
        style={{
          background: 'linear-gradient(180deg, rgba(14,18,32,0.9), rgba(10,13,22,0.85))',
          borderBottom: '1px solid var(--line)',
        }}
      >
        <span className="res-chip" style={{ color: '#f2a29b' }}>
          <Icon name="heart" size={12} />
          <span className="num">{playerHp}/{playerMaxHp}</span>
        </span>
        <span className="res-chip" style={{ color: 'var(--mana-300)' }}>
          <Icon name="drop" size={12} />
          <span className="num">{playerMp}/{playerMaxMp}</span>
        </span>
        <span className="res-chip" style={{ color: 'var(--brass-300)' }}>
          <Icon name="coin" size={12} />
          <span className="num">{gold}</span>
        </span>
        <span
          className="res-chip cursor-pointer transition-colors hover:border-[var(--line-brass)]"
          style={{ color: 'var(--text-secondary)' }}
          onClick={() => setShowDeckModal(true)}
          title="查看卡组"
        >
          <span style={{ color: 'var(--arc-400)' }}><Icon name="deck" size={12} /></span>
          <span className="num">{masterDeck.length}</span>
          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>张</span>
        </span>
        <span className="res-chip" style={{ color: 'var(--text-secondary)' }}>
          <span style={{ color: 'var(--brass-400)' }}><Icon name="gem" size={12} /></span>
          <span className="num">{pipelineSlots}</span>
          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>槽</span>
        </span>
        <span className="res-chip" style={{ color: 'var(--brass-300)' }}>
          <Icon name="flag" size={12} />
          <span className="num">第 {Math.max(1, currentLayer + 1)} 层</span>
        </span>
      </div>

      {/* ===== 标题 ===== */}
      <div className="relative z-10 text-center pt-3 pb-1">
        <div className="flex items-center justify-center gap-3">
          <span className="hairline-gold w-14" />
          <h1 className="text-lg font-black tracking-[0.42em] pl-[0.42em]" style={{ color: 'var(--brass-200)' }}>冒险地图</h1>
          <span className="hairline-gold w-14" />
        </div>
        <p className="etch-label mt-1.5" style={{ letterSpacing: '0.24em' }}>选择下一个节点 · 地图可滚动</p>
      </div>

      {/* ===== 地图容器 ===== */}
      <div className="relative z-10 flex-1 flex justify-center items-start overflow-y-auto">
        {/* 星灵伙伴 - 左侧 */}
        <div className="absolute left-3 sm:left-10 md:left-20 top-1/2 -translate-y-1/2 z-10 flex flex-col items-center">
          <div className="relative cursor-pointer group" onClick={handleMascotClick}>
            {/* 徽章框 */}
            <motion.div
              className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-full overflow-visible"
              animate={{ scale: mascotClicked ? 0.94 : 1 }}
              whileHover={{ scale: 1.05 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            >
              {/* 符环 */}
              <svg viewBox="0 0 100 100" className="absolute -inset-2.5 w-[calc(100%+20px)] h-[calc(100%+20px)] spin-slow">
                <circle cx="50" cy="50" r="48" fill="none" stroke="rgba(125,236,220,0.4)" strokeWidth="0.7" strokeDasharray="3 4" />
                <circle cx="50" cy="50" r="44.5" fill="none" stroke="rgba(125,236,220,0.25)" strokeWidth="0.5" />
              </svg>
              {/* 底盘 */}
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: 'radial-gradient(circle at 50% 35%, rgba(35,44,71,0.95), rgba(10,13,22,0.98))',
                  border: '1.5px solid rgba(125,236,220,0.45)',
                  boxShadow: '0 8px 26px rgba(3,4,8,0.6), 0 0 24px rgba(43,194,174,0.18)',
                }}
              />
              {/* 星灵像 */}
              <motion.img
                src="/pic/map/220513he5vqCdOtvYxTfGW.webp"
                alt="星灵伙伴"
                className="absolute inset-[8%] w-[84%] h-[84%] object-contain drift"
                animate={{ rotate: mascotClicked ? -4 : 0 }}
              />
              {/* 悬停辉光 */}
              <div className="absolute -inset-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(43,194,174,0.16), transparent 70%)' }} />
            </motion.div>

            {/* 点击提示 */}
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-2.5 py-[3px] rounded-full text-[10px] font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: '#a7f3e8', background: 'rgba(8,20,18,0.85)', border: '1px solid rgba(43,194,174,0.4)' }}>
              点击互动
            </div>
          </div>

          {/* 名称牌 */}
          <div className="mt-4 text-center">
            <p className="text-[13px] font-bold tracking-[0.2em]" style={{ color: '#7decdc', textShadow: '0 0 10px rgba(43,194,174,0.4)' }}>星灵伙伴</p>
            <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>（多聊天可能会有惊喜哦）</p>
          </div>

          {/* 对话框 */}
          <AnimatePresence>
            {showDialog && (
              <motion.div
                initial={{ opacity: 0, x: -16, scale: 0.94 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -10, scale: 0.95 }}
                className="absolute left-1/2 -translate-x-1/2 top-full mt-4 sm:left-full sm:translate-x-0 sm:top-1/2 sm:-translate-y-1/2 sm:mt-0 sm:ml-5 z-20"
              >
                <div
                  className={`relative panel p-5 w-[min(85vw,340px)] sm:w-auto sm:min-w-[300px] sm:max-w-[380px] ${
                    isHiddenDialogue ? 'panel-gold corner-orn' : ''
                  }`}
                  style={isHiddenDialogue ? { boxShadow: '0 0 30px rgba(217,184,105,0.25), 0 12px 32px rgba(3,4,8,0.55)' } : undefined}
                >
                  <p className="text-[15px] font-medium leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                    {showingFirstDialogue
                      ? FIRST_CLICK_DIALOGUE
                      : isHiddenDialogue
                        ? HIDDEN_DIALOGUE
                        : MASCOT_DIALOGUES[dialogueIndex]}
                  </p>

                  {isHiddenDialogue && !showSecretQuestion && (
                    <div className="flex flex-wrap gap-3 mt-5 justify-center">
                      <button onClick={() => handleHiddenButtonClick(true)} className="btn btn-primary btn-sm">
                        又寸
                      </button>
                      <button onClick={() => handleHiddenButtonClick(false)} className="btn btn-secondary btn-sm">
                        不用了，谢谢
                      </button>
                    </div>
                  )}

                  {showSecretQuestion && (
                    <div className="mt-5">
                      <p className="text-[15px] font-medium mb-4" style={{ color: 'var(--text-primary)' }}>
                        那就请输入神秘指令吧：
                      </p>
                      <div className="flex flex-col gap-2.5">
                        <button onClick={() => handleSecretCommand('A')} className="btn btn-secondary !justify-start btn-sm">
                          A. 什么令？我不道啊
                        </button>
                        <button onClick={() => handleSecretCommand('B')} className="btn btn-secondary !justify-start btn-sm">
                          B. 老师没教这个
                        </button>
                        <button onClick={() => handleSecretCommand('C')} className="btn btn-secondary !justify-start btn-sm">
                          C. 上上下下左右左右BABA
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ===== 地图 SVG ===== */}
        <svg
          viewBox={`0 0 ${canvasWidth} ${svgHeight}`}
          preserveAspectRatio="xMidYMin meet"
          className="w-full max-w-[600px] shrink-0 h-auto"
        >
          <defs>
            <linearGradient id="pathGold" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#c8a24e" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#e6cc8b" stopOpacity="0.9" />
            </linearGradient>
          </defs>

          {/* 层标签 */}
          {map.layers.map((_, li) => (
            <text
              key={`layer-${li}`}
              x={20}
              y={startY + li * layerSpacing + 4}
              fontSize={10}
              fill="rgba(103,112,138,0.7)"
              letterSpacing="0.2em"
            >
              {li + 1}F
            </text>
          ))}

          {/* 连线 */}
          {lines.map((line, i) => (
            <g key={i}>
              <line
                x1={line.x1}
                y1={line.y1}
                x2={line.x2}
                y2={line.y2}
                stroke={line.active ? 'url(#pathGold)' : line.traversed ? 'rgba(168,182,214,0.3)' : 'rgba(168,182,214,0.1)'}
                strokeWidth={line.active ? 2 : 1.2}
                strokeDasharray={line.active ? '6 5' : line.traversed ? undefined : '3 5'}
                strokeLinecap="round"
              >
                {line.active && (
                  <animate attributeName="stroke-dashoffset" from="22" to="0" dur="1.1s" repeatCount="indefinite" />
                )}
              </line>
              {line.active && (
                <line
                  x1={line.x1}
                  y1={line.y1}
                  x2={line.x2}
                  y2={line.y2}
                  stroke="rgba(230,204,139,0.35)"
                  strokeWidth={5}
                  strokeLinecap="round"
                  style={{ filter: 'blur(3px)' }}
                />
              )}
            </g>
          ))}

          {/* 节点 */}
          {map.layers.map((layer, li) =>
            layer.map((node) => {
              const pos = getNodePos(li, node.column, layer.length);
              const color = NODE_COLOR[node.type];
              const hasVisitedNodeInLayer = layer.some((n) => n.visited);
              const isClickable = node.available && !node.visited && !hasVisitedNodeInLayer;
              const isCurrent = currentNode?.id === node.id;
              const isBoss = node.type === MapNodeType.BOSS;
              const r = isBoss ? 30 : 24;

              return (
                <g
                  key={node.id}
                  onClick={() => {
                    if (isClickable) {
                      selectMapNode(node.id);
                      setShowDialog(false);
                    }
                  }}
                  className={isClickable ? 'cursor-pointer' : ''}
                >
                  {/* 可选节点：鎏金信标脉冲 */}
                  {isClickable && (
                    <motion.circle
                      cx={pos.x}
                      cy={pos.y}
                      r={r + 9}
                      fill="none"
                      stroke="#d9b869"
                      strokeWidth={1.5}
                      style={{ transformOrigin: `${pos.x}px ${pos.y}px` }}
                      animate={{ scale: [1, 1.14, 1], opacity: [0.25, 0.6, 0.25] }}
                      transition={{ duration: 1.8, repeat: Infinity }}
                    />
                  )}

                  {/* 节点底盘 */}
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={r}
                    fill={node.visited ? 'rgba(19,24,41,0.85)' : isClickable ? 'rgba(26,33,54,0.95)' : 'rgba(14,18,32,0.85)'}
                    stroke={node.visited ? 'rgba(168,182,214,0.25)' : isClickable ? '#d9b869' : 'rgba(168,182,214,0.16)'}
                    strokeWidth={isClickable ? 2 : 1.2}
                    opacity={node.visited && !isCurrent ? 0.55 : 1}
                    style={isClickable ? { filter: 'drop-shadow(0 0 10px rgba(217,184,105,0.35))' } : undefined}
                  />
                  {/* 内环 */}
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={r - 4.5}
                    fill="none"
                    stroke={node.visited ? 'rgba(168,182,214,0.12)' : isClickable ? 'rgba(217,184,105,0.4)' : 'rgba(168,182,214,0.08)'}
                    strokeWidth={0.8}
                    strokeDasharray="2 3"
                  />

                  {/* 当前位置徽记 */}
                  {isCurrent && (
                    <g transform={`translate(${pos.x} ${pos.y - r - 13})`}>
                      <motion.g
                        animate={{ y: [0, -3.5, 0] }}
                        transition={{ duration: 1.6, repeat: Infinity }}
                      >
                        <path d="M0 0 L5 8 L-5 8 Z" fill="#7decdc" style={{ filter: 'drop-shadow(0 0 5px rgba(125,236,220,0.8))' }} />
                      </motion.g>
                    </g>
                  )}

                  {/* 节点图标（SVG 符文，用 foreignObject 承载 Icon） */}
                  <foreignObject x={pos.x - 12} y={pos.y - 12} width={24} height={24} style={{ pointerEvents: 'none' }}>
                    <div
                      className="flex items-center justify-center w-6 h-6"
                      style={{
                        color: node.visited && !isCurrent
                          ? 'rgba(103,112,138,0.6)'
                          : isClickable
                            ? color
                            : 'rgba(169,177,197,0.55)',
                        filter: isClickable ? `drop-shadow(0 0 6px ${color}90)` : undefined,
                      }}
                    >
                      <Icon name={NODE_ICON[node.type]} size={isBoss ? 21 : 17} strokeWidth={isClickable ? 2 : 1.7} />
                    </div>
                  </foreignObject>

                  {/* 已访问勾选 */}
                  {node.visited && !isCurrent && (
                    <foreignObject x={pos.x + r - 12} y={pos.y + r - 12} width={16} height={16} style={{ pointerEvents: 'none' }}>
                      <div className="flex items-center justify-center w-4 h-4 rounded-full" style={{ background: 'rgba(19,24,41,0.95)', border: '1px solid rgba(168,182,214,0.3)', color: 'rgba(143,199,122,0.9)' }}>
                        <Icon name="check" size={9} strokeWidth={3} />
                      </div>
                    </foreignObject>
                  )}

                  {/* 节点标签 */}
                  <text
                    x={pos.x}
                    y={pos.y + r + 18}
                    textAnchor="middle"
                    fontSize={11}
                    fontWeight={isClickable ? 700 : 400}
                    fill={node.visited ? 'rgba(103,112,138,0.75)' : isClickable ? '#e6cc8b' : 'rgba(169,177,197,0.6)'}
                    letterSpacing="0.15em"
                  >
                    {NODE_LABEL[node.type]}
                  </text>
                </g>
              );
            })
          )}
        </svg>
      </div>

      {/* ===== 禁忌卡牌弹窗 ===== */}
      <AnimatePresence>
        {showForbiddenCard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center overlay"
            onClick={() => setShowForbiddenCard(false)}
          >
            <motion.div
              initial={{ scale: 0.85, y: 40 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.85, y: 40 }}
              className="panel corner-orn p-8 max-w-md w-full mx-4"
              style={{ borderColor: 'rgba(209,83,75,0.5)', boxShadow: '0 0 40px rgba(209,83,75,0.2), 0 20px 50px rgba(3,4,8,0.7)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center mb-6">
                <div className="flex items-center justify-center gap-2 mb-2" style={{ color: '#e5736b' }}>
                  <Icon name="skull" size={20} />
                </div>
                <p className="text-lg font-black tracking-[0.2em]" style={{ color: '#f2a29b' }}>你已获得禁忌的力量</p>
                <p className="text-sm mt-1.5" style={{ color: 'var(--text-muted)' }}>但所有命运的馈赠都早已标好价格……</p>
              </div>

              <div className="flex justify-center mb-6">
                <Card card={FORBIDDEN_CARD} size="lg" />
              </div>

              <div className="flex justify-center">
                <button onClick={() => setShowForbiddenCard(false)} className="btn btn-danger btn-xl">
                  接受命运
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== 卡组弹窗 ===== */}
      <AnimatePresence>
        {showDeckModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center overlay"
            onClick={() => setShowDeckModal(false)}
          >
            <motion.div
              initial={{ scale: 0.92, y: 26 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 26 }}
              className="panel panel-gold p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  <span style={{ color: 'var(--arc-400)' }}><Icon name="deck" size={18} /></span>
                  <h2 className="text-xl font-black tracking-[0.24em]" style={{ color: 'var(--brass-200)' }}>卡组构筑</h2>
                </div>
                <span className="text-sm num" style={{ color: 'var(--text-muted)' }}>共 {masterDeck.length} 张</span>
              </div>

              <div className="overflow-y-auto pr-2">
                {masterDeck.length === 0 ? (
                  <p className="text-center py-8" style={{ color: 'var(--text-muted)' }}>牌库为空</p>
                ) : (
                  <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-3 justify-items-center">
                    {masterDeck.map((card, index) => (
                      <Card key={`${card.templateId}-${index}`} card={card} size="sm" />
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-center mt-5">
                <button onClick={() => setShowDeckModal(false)} className="btn btn-secondary">
                  关闭
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
