import { useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRunStore } from '../store/runStore';
import { RELICS } from '../types';
import { Icon } from './icons';

// 游戏规则弹窗（单一数据源，避免多份文案不同步）
function RulesModal({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center overlay p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 14 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0 }}
        className="panel panel-gold p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="flex items-center gap-2 text-lg font-black tracking-[0.2em]" style={{ color: 'var(--brass-200)' }}>
            <Icon name="scroll" size={17} style={{ color: 'var(--brass-400)' }} />
            游戏规则
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-md cursor-pointer transition-colors"
            style={{ color: 'var(--text-muted)', border: '1px solid var(--line-soft)' }}
            title="关闭"
          >
            <Icon name="x" size={13} />
          </button>
        </div>

        <div className="hairline-gold mb-4" />

        <div className="text-sm leading-relaxed space-y-4" style={{ color: 'var(--text-secondary)' }}>
          <section>
            <h3 className="font-bold mb-1.5 flex items-center gap-1.5" style={{ color: 'var(--arc-300)' }}>
              <Icon name="gem" size={13} />
              第一步 · 认识战场
            </h3>
            <p><span className="font-semibold" style={{ color: 'var(--brass-300)' }}>执行槽位：</span>战场中央的空位（初始 5 个，运气够好可以获得新槽位）。你打出的卡牌必须放置在这些槽位中。</p>
          </section>

          <section>
            <h3 className="font-bold mb-1.5 flex items-center gap-1.5" style={{ color: 'var(--arc-300)' }}>
              <Icon name="link" size={13} />
              第二步 · 链式传导（如何打出高伤害）
            </h3>
            <p className="mb-2">你的卡牌分为两种：</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><span style={{ color: '#f2a29b' }}>动作牌</span>（火球、冰盾等）：直接造成伤害或提供护甲。</li>
              <li><span style={{ color: 'var(--mana-300)' }}>修饰牌</span>（×2 倍率等）：强化它右侧的下一张牌！</li>
            </ul>
            <p className="mt-2 font-semibold" style={{ color: 'var(--brass-300)' }}>连招秘诀：将修饰牌放在动作牌的左侧。</p>
            <div className="well p-3 mt-2">
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                示例：【槽位1】放置「伤害×2」，【槽位2】放置「伤害×3」，【槽位3】放置「火球(6伤)」，点击结算后，火球将造成 <span className="font-black" style={{ color: '#f2a29b' }}>36 点伤害</span>！修饰牌可以连续叠加，创造毁天灭地的连锁反应！
              </p>
            </div>
          </section>

          <section>
            <h3 className="font-bold mb-1.5 flex items-center gap-1.5" style={{ color: 'var(--arc-300)' }}>
              <Icon name="shield" size={13} />
              第三步 · 精准防御（如何活下去）
            </h3>
            <p className="mb-2">敌人不会直接攻击你，而是会攻击特定的【槽位】！</p>
            <ul className="space-y-1.5 ml-2">
              <li><span className="font-semibold" style={{ color: 'var(--ward-300)' }}>观察意图：</span>敌人头顶会显示它的攻击目标（例如：顺劈槽位 2 和 3，各造成 8 点伤害）。</li>
              <li><span className="font-semibold" style={{ color: 'var(--verd-400)' }}>对位防御：</span>你必须在将受击的槽位上，放置提供护甲的卡牌来抵挡伤害。</li>
              <li><span className="font-semibold" style={{ color: '#f2a29b' }}>漏防惩罚：</span>如果受击槽位没有足够的护甲，剩余伤害将直接扣除生命值；空槽受击还会叠加「破绽」（受到伤害提高）。</li>
            </ul>
          </section>

          <section>
            <h3 className="font-bold mb-1.5 flex items-center gap-1.5" style={{ color: 'var(--arc-300)' }}>
              <Icon name="bolt" size={13} />
              第四步 · 结算与回合
            </h3>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>将卡牌拖入槽位（可随时拖拽调整位置或点掉重放，直到你满意）。</li>
              <li>确认无误后，点击 <span className="font-bold" style={{ color: '#e5736b' }}>【执行结算】</span>。</li>
              <li>卡牌将从左至右依次触发，随后敌人攻击你暴露的槽位。</li>
              <li>你和敌人同时行动（哪怕你的伤害足以击杀敌人，也会受到敌人的死前反扑）。</li>
            </ol>
          </section>
        </div>
      </motion.div>
    </motion.div>
  );
}

// 遗物符章（支持悬停与点击查看，兼容触屏）
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
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center cursor-help"
          style={{
            background: 'linear-gradient(180deg, rgba(26,33,54,0.95), rgba(14,18,32,0.95))',
            border: '1px solid var(--line-brass-soft)',
            boxShadow: '0 3px 10px rgba(3,4,8,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
          }}
        >
          <span className="text-[17px] leading-none">{relic.icon}</span>
        </div>
      )}
      <AnimatePresence>
        {showTip && (
          <motion.div
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            className="absolute left-full ml-2 top-0 w-56 p-3 panel z-50"
            style={{ borderColor: 'var(--line-brass-soft)' }}
          >
            <div className="font-bold text-sm mb-1" style={{ color: 'var(--brass-300)' }}>{relic.name}</div>
            <div className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{relic.description}</div>
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
    <div className="fixed top-14 left-3 z-40 flex flex-col gap-2">
      {/* 遗物区域（无遗物时隐藏标签） */}
      {relics.length > 0 && (
        <div>
          <div className="etch-label mb-1.5">遗物</div>
          <div className="flex flex-wrap gap-1.5 max-w-[200px]">
            {relics.map((relicId) => (
              <RelicIcon key={relicId} relicId={relicId} />
            ))}
          </div>
        </div>
      )}

      {/* 游戏规则按钮 */}
      <button
        onClick={() => setShowRulesModal(true)}
        className="res-chip cursor-pointer transition-colors hover:border-[var(--line-brass)]"
        style={{ height: 28, color: 'var(--text-secondary)' }}
      >
        <Icon name="help" size={12} style={{ color: 'var(--brass-400)' }} />
        规则
      </button>

      <AnimatePresence>
        {showRulesModal && <RulesModal onClose={() => setShowRulesModal(false)} />}
      </AnimatePresence>
    </div>
  );
}
