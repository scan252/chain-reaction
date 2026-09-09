import { useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRunStore } from '../store/runStore';
import { RELICS } from '../types';

// 游戏规则弹窗（单一数据源，避免多份文案不同步）
function RulesModal({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-gray-900/95 border border-blue-500/30 rounded-2xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-blue-400">📖 游戏规则</h2>
          <button
            onClick={onClose}
            className="text-white/50 hover:text-white transition-colors text-2xl cursor-pointer"
          >
            ×
          </button>
        </div>
        <div className="text-white/80 text-sm leading-relaxed space-y-4">
          <section>
            <h3 className="text-cyan-400 font-bold mb-2">第一步：认识战场</h3>
            <p><span className="text-amber-400 font-semibold">执行槽位：</span>战场中央的空位（初始 5 个，运气够好可以获得新槽位）。你打出的卡牌必须放置在这些槽位中。</p>
          </section>

          <section>
            <h3 className="text-cyan-400 font-bold mb-2">第二步：链式传导（如何打出高伤害？）</h3>
            <p className="mb-2">你的卡牌分为两种：</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><span className="text-red-400">动作牌</span>（如：火球、冰盾）：直接造成伤害或提供护甲。</li>
              <li><span className="text-purple-400">修饰牌</span>（如：x2倍率）：强化它右侧的下一张牌！</li>
            </ul>
            <p className="mt-2 text-amber-300">💡 连招秘诀：将修饰牌放在动作牌的左侧。</p>
            <div className="bg-gray-800/50 p-3 rounded-lg mt-2 border border-white/10">
              <p className="text-xs text-white/70">示例：在【槽位1】放置「伤害x2」，在【槽位2】放置「伤害x3」，在【槽位3】放置「火球(6伤)」，点击结算后，火球将造成 <span className="text-red-400 font-bold">36点伤害</span>！修饰牌可以连续叠加，创造毁天灭地的连锁反应！</p>
            </div>
          </section>

          <section>
            <h3 className="text-cyan-400 font-bold mb-2">第三步：精准防御（如何活下去？）</h3>
            <p className="mb-2">敌人不会直接攻击你，而是会攻击特定的【槽位】！</p>
            <ul className="space-y-2 ml-2">
              <li><span className="text-blue-400">👁️ 观察意图：</span>敌人头顶会显示它的攻击目标（例如：顺劈槽位2和3，各造成8点伤害）。</li>
              <li><span className="text-green-400">🛡️ 对位防御：</span>你必须在将受击的槽位上，放置提供护甲的卡牌来抵挡伤害。</li>
              <li><span className="text-red-400">⚠️ 漏防惩罚：</span>如果受击槽位没有足够的护甲，剩余的伤害将直接扣除你的生命值；空槽受击还会叠加"破绽"（受到伤害提高）。</li>
            </ul>
          </section>

          <section>
            <h3 className="text-cyan-400 font-bold mb-2">第四步：结算与回合</h3>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>将卡牌拖入槽位（可随时拖拽调整位置或点掉重放，直到你满意）。</li>
              <li>确认无误后，点击 <span className="text-orange-400 font-bold">【执行结算】</span>。</li>
              <li>卡牌将从左至右依次触发，随后敌人攻击你暴露的槽位。</li>
              <li>你和敌人同时行动（哪怕你的伤害足以击杀敌人，也会受到敌人的死前反扑）。</li>
            </ol>
          </section>
        </div>
      </motion.div>
    </motion.div>
  );
}

// 遗物图标（支持悬停与点击查看，兼容触屏）
function RelicIcon({ relicId, children }: { relicId: string; children?: ReactNode }) {
  const relic = RELICS[relicId as keyof typeof RELICS];
  const [showTip, setShowTip] = useState(false);

  if (!relic) return null;

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
      {children ?? (
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-600/80 to-orange-700/80 border border-amber-400/50 flex items-center justify-center cursor-help shadow-lg shadow-amber-900/30">
          <span className="text-xl">{relic.icon}</span>
        </div>
      )}
      <AnimatePresence>
        {showTip && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="absolute left-full ml-2 top-0 w-56 p-3 bg-gray-900/95 border border-amber-500/30 rounded-lg shadow-xl z-50"
          >
            <div className="text-amber-400 font-bold text-sm mb-1">{relic.name}</div>
            <div className="text-white/70 text-xs leading-relaxed">{relic.description}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function RelicDisplay() {
  const relics = useRunStore((s) => s.relics);
  const [showRulesModal, setShowRulesModal] = useState(false);

  return (
    <div className="fixed top-4 left-4 z-40 flex flex-col gap-3">
      {/* 遗物区域（无遗物时隐藏标签） */}
      {relics.length > 0 && (
        <div>
          <div className="text-white/40 text-xs mb-1">遗物</div>
          <div className="flex flex-wrap gap-2 max-w-[200px]">
            {relics.map((relicId) => (
              <RelicIcon key={relicId} relicId={relicId} />
            ))}
          </div>
        </div>
      )}

      {/* 游戏规则按钮 */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowRulesModal(true)}
        className={`px-3 py-2 rounded-lg bg-gradient-to-r from-blue-600/80 to-cyan-600/80 border border-blue-400/50 text-white text-sm font-bold shadow-lg shadow-blue-900/30 cursor-pointer ${relics.length === 0 ? '' : 'mt-2'}`}
      >
        📖 规则
      </motion.button>

      <AnimatePresence>
        {showRulesModal && <RulesModal onClose={() => setShowRulesModal(false)} />}
      </AnimatePresence>
    </div>
  );
}
