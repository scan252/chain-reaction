import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { useRunStore } from '../store/runStore';
import { MapNodeType, type MapNode } from '../types';
import { FORBIDDEN_CARD } from '../data/cardData';
import { EASTER_EGG } from '../config/balance';

const NODE_EMOJI: Record<string, string> = {
  [MapNodeType.BATTLE]: '⚔️',
  [MapNodeType.SHOP]: '🛒',
  [MapNodeType.REST]: '🏕️',
  [MapNodeType.REWARD]: '🎁',
  [MapNodeType.ELITE]: '💀',
  [MapNodeType.BOSS]: '👑',
};

const NODE_LABEL: Record<string, string> = {
  [MapNodeType.BATTLE]: '战斗',
  [MapNodeType.SHOP]: '商店',
  [MapNodeType.REST]: '休息',
  [MapNodeType.REWARD]: '奖励',
  [MapNodeType.ELITE]: '精英',
  [MapNodeType.BOSS]: 'BOSS',
};

const NODE_COLOR: Record<string, string> = {
  [MapNodeType.BATTLE]: '#ef4444',
  [MapNodeType.SHOP]: '#eab308',
  [MapNodeType.REST]: '#22c55e',
  [MapNodeType.REWARD]: '#f97316',
  [MapNodeType.ELITE]: '#f59e0b',
  [MapNodeType.BOSS]: '#a855f7',
};

// 吉祥物首次点击对话
const FIRST_CLICK_DIALOGUE = "欢迎回来，冒险者！排好你的卡牌序列——修饰牌放左边，连锁会越滚越大。祝你好运~";

// 吉祥物常规对话列表（随机显示）
const MASCOT_DIALOGUES = [
  "你好呀，冒险者！",
  "今天也是充满挑战的一天呢~",
  "需要我给你一些建议吗？",
  "加油，我相信你能行的！",
  "记住，合理安排卡牌顺序很重要哦~",
];

// 隐藏对话
const HIDDEN_DIALOGUE = "少年，你想要变强吗？";

// 对话字号
const DIALOG_FONT = { fontSize: '24px' } as const;

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
  // 吉祥物对话框状态
  const [showDialog, setShowDialog] = useState(false);
  const [dialogueIndex, setDialogueIndex] = useState(0);
  const [isFirstClick, setIsFirstClick] = useState(true);
  const [isHiddenDialogue, setIsHiddenDialogue] = useState(false);
  // 记录当前显示的是否是首次对话（用于渲染）
  const [showingFirstDialogue, setShowingFirstDialogue] = useState(false);
  // 是否显示神秘指令选择题
  const [showSecretQuestion, setShowSecretQuestion] = useState(false);
  // 是否显示禁忌卡牌详情
  const [showForbiddenCard, setShowForbiddenCard] = useState(false);
  // 是否显示卡组构筑
  const [showDeckModal, setShowDeckModal] = useState(false);

  const mascotTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (mascotTimerRef.current) clearTimeout(mascotTimerRef.current);
    };
  }, []);

  const addCardToMasterDeck = useRunStore((s) => s.addCardToMasterDeck);

  // 处理吉祥物点击
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

  // 处理隐藏对话按钮点击
  const handleHiddenButtonClick = (accepted: boolean) => {
    if (accepted) {
      setShowSecretQuestion(true);
    } else {
      setShowDialog(false);
      setIsHiddenDialogue(false);
    }
  };

  // 处理神秘指令选择
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
        // 已拥有时给出提示而非静默
        setIsHiddenDialogue(false);
        setDialogueIndex(3);
        setShowDialog(true);
      }
    }

    setShowDialog(false);
    setIsHiddenDialogue(false);
  };

  // 关闭禁忌卡牌展示
  const handleCloseForbiddenCard = () => {
    setShowForbiddenCard(false);
  };

  // 计算节点位置
  const layerSpacing = 140;
  const startY = 100;
  const canvasWidth = 600;

  function getNodePos(layer: number, column: number, layerSize: number) {
    const spacing = canvasWidth / (layerSize + 1);
    return {
      x: spacing * (column + 1),
      y: startY + layer * layerSpacing,
    };
  }

  // 当前所在节点：直接按 currentNodeId 查找（不依赖遍历顺序）
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
  const lines: { x1: number; y1: number; x2: number; y2: number; active: boolean }[] = [];
  for (let li = 0; li < map.layers.length - 1; li++) {
    for (const node of map.layers[li]) {
      const from = getNodePos(li, node.column, map.layers[li].length);
      for (const connId of node.connections) {
        const nextLayer = map.layers[li + 1];
        const target = nextLayer.find((n) => n.id === connId);
        if (target) {
          const to = getNodePos(li + 1, target.column, nextLayer.length);
          const isActive = currentNode?.id === node.id && target.available;
          lines.push({
            x1: from.x,
            y1: from.y,
            x2: to.x,
            y2: to.y,
            active: isActive,
          });
        }
      }
    }
  }

  const svgHeight = startY + (map.layers.length - 1) * layerSpacing + 60;

  return (
    <div
      className="flex flex-col h-screen overflow-hidden"
      style={{
        backgroundImage: 'url(/pic/P3.webp)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
        {/* 顶部信息 */}
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 py-4 bg-black/40 border-b border-white/10 text-base px-2">
        <span className="text-red-400 font-bold text-lg">❤️ {playerHp}/{playerMaxHp}</span>
        <span className="text-purple-400 font-bold text-lg">🔮 {playerMp}/{playerMaxMp}</span>
        <span className="text-yellow-400 font-bold text-lg">💰 {gold}</span>
        <span
          className="text-white/60 text-base cursor-pointer hover:text-white transition-colors"
          onClick={() => setShowDeckModal(true)}
        >
          🃏 {masterDeck.length} 张
        </span>
        <span className="text-cyan-400 text-base">⚡ {pipelineSlots} 槽</span>
        <span className="text-green-400 font-bold text-lg">📍 第 {currentLayer + 1} 层</span>
      </div>

        {/* 标题 */}
        <div className="text-center py-4">
          <h1 className="text-2xl font-bold text-white tracking-wider">冒险地图</h1>
          <p className="text-sm text-white/50">选择下一个节点 <span className="text-white/30">（地图可滚动 ↓）</span></p>
        </div>

        {/* 地图容器 */}
        <div className="flex-1 flex justify-center items-start overflow-y-auto relative">
          {/* 吉祥物区域 - 放在地图左侧偏中间位置 */}
          <div className="absolute left-2 sm:left-8 md:left-16 top-1/2 -translate-y-1/2 z-10 flex flex-col items-center">
            <div
              className="relative cursor-pointer group"
              onClick={handleMascotClick}
            >
              {/* 吉祥物容器 */}
              <motion.div
                className="w-36 h-48 sm:w-56 sm:h-72 rounded-2xl flex items-center justify-center overflow-hidden"
                animate={{
                  scale: mascotClicked ? 0.95 : 1,
                  rotate: mascotClicked ? -2 : 0,
                }}
                whileHover={{
                  scale: 1.05,
                  rotate: [0, -3, 3, 0],
                }}
                transition={{
                  type: 'spring',
                  stiffness: 400,
                  damping: 17,
                }}
              >
                {/* 吉祥物图片 */}
                <img
                  src="/pic/map/220513he5vqCdOtvYxTfGW.webp"
                  alt="冒险伙伴"
                  className="w-full h-full object-contain"
                />
              </motion.div>

              {/* 点击提示 */}
              <motion.div
                className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-black/70 px-3 py-1 rounded-full text-xs text-white/90 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity"
                initial={{ y: -5 }}
                animate={{ y: 0 }}
              >
                点击互动
              </motion.div>

              {/* 装饰光效 */}
              <div className="absolute -inset-2 bg-amber-400/15 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </div>

            {/* 吉祥物名称/描述区域 */}
            <div className="mt-3 text-center">
              <p className="text-amber-300 font-bold text-sm text-shadow-sm">冒险伙伴</p>
              <p className="text-white/60 text-xs mt-1">（多聊天可能会有惊喜哦）</p>
            </div>

            {/* 对话框 - 桌面端显示在吉祥物右侧，窄屏显示在下方 */}
            <AnimatePresence>
              {showDialog && (
                <motion.div
                  initial={{ opacity: 0, x: -20, scale: 0.9 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -10, scale: 0.95 }}
                  className="absolute left-1/2 -translate-x-1/2 top-full mt-4 sm:left-full sm:translate-x-0 sm:top-1/2 sm:-translate-y-1/2 sm:mt-0 sm:ml-4 z-20"
                >
                  <div
                    className={`relative bg-white/95 backdrop-blur-sm rounded-2xl px-5 py-4 shadow-xl w-[min(85vw,340px)] sm:w-auto sm:min-w-[320px] sm:max-w-[400px] ${
                      isHiddenDialogue
                        ? 'border-4 border-yellow-400 shadow-yellow-400/50'
                        : 'border border-amber-200/50'
                    }`}
                  >
                    {/* 对话框小三角 */}
                    <div
                      className={`absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-white/95 rotate-45 hidden sm:block ${
                        isHiddenDialogue
                          ? 'border-l-4 border-b-4 border-yellow-400'
                          : 'border-l border-b border-amber-200/50'
                      }`}
                    />

                    {/* 对话内容 */}
                    <p className="text-gray-800 font-medium leading-relaxed relative z-10" style={DIALOG_FONT}>
                      {showingFirstDialogue
                        ? FIRST_CLICK_DIALOGUE
                        : isHiddenDialogue
                          ? HIDDEN_DIALOGUE
                          : MASCOT_DIALOGUES[dialogueIndex]
                      }
                    </p>

                    {/* 隐藏对话按钮 */}
                    {isHiddenDialogue && !showSecretQuestion && (
                      <div className="flex flex-wrap gap-3 mt-5 justify-center">
                        <button
                          onClick={() => handleHiddenButtonClick(true)}
                          className="px-6 py-3 bg-gradient-to-r from-yellow-400 to-amber-500 text-white font-bold rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-transform"
                          style={DIALOG_FONT}
                        >
                          又寸
                        </button>
                        <button
                          onClick={() => handleHiddenButtonClick(false)}
                          className="px-6 py-3 bg-gray-400 text-white font-bold rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-transform"
                          style={DIALOG_FONT}
                        >
                          不用了，谢谢
                        </button>
                      </div>
                    )}

                    {/* 神秘指令选择题 */}
                    {showSecretQuestion && (
                      <div className="mt-5">
                        <p className="text-gray-800 font-medium mb-4" style={DIALOG_FONT}>
                          那就请输入神秘指令吧：
                        </p>
                        <div className="flex flex-col gap-3">
                          <button
                            onClick={() => handleSecretCommand('A')}
                            className="px-4 py-3 bg-blue-500/80 text-white font-bold rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-transform text-left"
                            style={DIALOG_FONT}
                          >
                            A. 什么令？我不道啊
                          </button>
                          <button
                            onClick={() => handleSecretCommand('B')}
                            className="px-4 py-3 bg-green-500/80 text-white font-bold rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-transform text-left"
                            style={DIALOG_FONT}
                          >
                            B. 老师没教这个
                          </button>
                          <button
                            onClick={() => handleSecretCommand('C')}
                            className="px-4 py-3 bg-purple-500/80 text-white font-bold rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-transform text-left"
                            style={DIALOG_FONT}
                          >
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

          {/* 地图 SVG：viewBox 自适应缩放，窄屏完整可见 */}
          <svg
            viewBox={`0 0 ${canvasWidth} ${svgHeight}`}
            preserveAspectRatio="xMidYMin meet"
            className="w-full max-w-[600px] shrink-0 h-auto"
          >
          {/* 连线 */}
          {lines.map((line, i) => (
            <line
              key={i}
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              stroke={line.active ? '#60a5fa' : '#ffffff15'}
              strokeWidth={line.active ? 2 : 1}
              strokeDasharray={line.active ? undefined : '4 4'}
            />
          ))}

          {/* 节点 */}
          {map.layers.map((layer, li) =>
            layer.map((node) => {
              const pos = getNodePos(li, node.column, layer.length);
              const color = NODE_COLOR[node.type];
              // 检查同层是否已有节点被访问
              const hasVisitedNodeInLayer = layer.some((n) => n.visited);
              const isClickable = node.available && !node.visited && !hasVisitedNodeInLayer;

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
                  {/* 可选节点的发光效果（用 transform 缩放代替 r 动画，避免 SVG 属性动画兼容问题） */}
                  {isClickable && (
                    <motion.circle
                      cx={pos.x}
                      cy={pos.y}
                      r={34}
                      fill="none"
                      stroke={color}
                      strokeWidth={2}
                      opacity={0.4}
                      style={{ transformOrigin: `${pos.x}px ${pos.y}px` }}
                      animate={{
                        scale: [1, 1.12, 1],
                        opacity: [0.2, 0.5, 0.2],
                      }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                  )}

                  {/* 节点背景 */}
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={26}
                    fill={node.visited ? '#1e293b' : isClickable ? `${color}30` : '#1a1a2e'}
                    stroke={node.visited ? '#475569' : isClickable ? color : '#ffffff15'}
                    strokeWidth={isClickable ? 2 : 1}
                    opacity={node.visited ? 0.5 : 1}
                  />

                  {/* 节点图标 */}
                  <text
                    x={pos.x}
                    y={pos.y + 1}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={20}
                    opacity={node.visited ? 0.3 : 1}
                  >
                    {NODE_EMOJI[node.type]}
                  </text>

                  {/* 节点标签 */}
                  <text
                    x={pos.x}
                    y={pos.y + 38}
                    textAnchor="middle"
                    fontSize={11}
                    fill={node.visited ? '#8494ab' : '#c4d2e8'}
                  >
                    {NODE_LABEL[node.type]}
                  </text>
                </g>
              );
            })
          )}
          </svg>
        </div>

        {/* 禁忌卡牌展示弹窗 */}
        <AnimatePresence>
          {showForbiddenCard && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
              onClick={handleCloseForbiddenCard}
            >
              <motion.div
                initial={{ scale: 0.8, y: 50 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.8, y: 50 }}
                className="bg-gradient-to-b from-gray-900 to-black border-2 border-red-600 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl shadow-red-900/50"
                onClick={(e) => e.stopPropagation()}
              >
                {/* 警告文字 */}
                <div className="text-center mb-6">
                  <p className="text-red-400 text-lg font-bold mb-2">你已获得禁忌的力量</p>
                  <p className="text-gray-400 text-sm">但所有命运的馈赠都早已标好价格......</p>
                </div>

                {/* 禁忌卡牌展示 */}
                <div className="flex justify-center mb-6">
                  <div
                    className="w-48 h-64 rounded-xl flex flex-col items-center justify-center p-4 shadow-xl"
                    style={{
                      background: `linear-gradient(135deg, ${FORBIDDEN_CARD.color}22, ${FORBIDDEN_CARD.color}44)`,
                      border: `3px solid ${FORBIDDEN_CARD.color}`,
                      boxShadow: `0 0 30px ${FORBIDDEN_CARD.color}66`,
                    }}
                  >
                    <div className="text-4xl mb-2">💀</div>
                    <h3 className="text-white font-bold text-xl text-center mb-2" style={DIALOG_FONT}>
                      {FORBIDDEN_CARD.name}
                    </h3>
                    <p className="text-white/80 text-center text-sm">
                      {FORBIDDEN_CARD.description}
                    </p>
                    <div className="mt-4 px-3 py-1 bg-black/30 rounded-full">
                      <span className="text-red-300 text-xs">禁忌</span>
                    </div>
                  </div>
                </div>

                {/* 确认按钮 */}
                <div className="flex justify-center">
                  <button
                    onClick={handleCloseForbiddenCard}
                    className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg transition-colors"
                    style={DIALOG_FONT}
                  >
                    接受命运
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 卡组构筑弹窗 */}
        <AnimatePresence>
          {showDeckModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
              onClick={() => setShowDeckModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, y: 30 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 30 }}
                className="bg-gradient-to-b from-gray-900 to-black border-2 border-amber-500/50 rounded-2xl p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden shadow-2xl shadow-amber-900/30"
                onClick={(e) => e.stopPropagation()}
              >
                {/* 标题 */}
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-amber-300">卡组构筑</h2>
                  <span className="text-white/60">共 {masterDeck.length} 张卡牌</span>
                </div>

                {/* 卡牌列表 */}
                <div className="overflow-y-auto max-h-[60vh] pr-2">
                  {masterDeck.length === 0 ? (
                    <p className="text-white/50 text-center py-8">牌库为空</p>
                  ) : (
                    <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-3">
                      {masterDeck.map((card, index) => (
                        <div
                          key={`${card.templateId}-${index}`}
                          className="aspect-[3/4] rounded-lg p-2 flex flex-col items-center justify-center text-center cursor-default"
                          style={{
                            backgroundColor: `${card.color}33`,
                            border: `2px solid ${card.color}`,
                          }}
                        >
                          <span className="text-white font-bold text-xs mb-1 line-clamp-2">
                            {card.name}
                          </span>
                          <span className="text-white/70 text-[10px]">
                            {card.type === 'ACTION' ? '动作' : '修饰'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 关闭按钮 */}
                <div className="flex justify-center mt-6">
                  <button
                    onClick={() => setShowDeckModal(false)}
                    className="px-8 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-lg transition-colors"
                  >
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
