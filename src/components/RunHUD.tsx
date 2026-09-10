import { useRunStore } from '../store/runStore';
import { Icon } from './icons';

/** 战斗顶栏：玄铁蚀刻板 · 左 = 关卡进度，中 = 序列槽，右 = 资源 */
export function RunHUD() {
  const gold = useRunStore((s) => s.gold);
  const masterDeck = useRunStore((s) => s.masterDeck);
  const currentLayer = useRunStore((s) => s.currentLayer);
  const pipelineSlots = useRunStore((s) => s.pipelineSlots);
  const map = useRunStore((s) => s.map);

  const totalLayers = map.layers.length;
  const layer = Math.max(1, currentLayer + 1);

  return (
    <div
      className="relative flex items-center justify-between px-4 h-10 text-[13px] z-30"
      style={{
        background: 'linear-gradient(180deg, rgba(14,18,32,0.92), rgba(10,13,22,0.88))',
        borderBottom: '1px solid var(--line)',
        boxShadow: '0 2px 12px rgba(3,4,8,0.4), inset 0 -1px 0 rgba(0,0,0,0.4)',
      }}
    >
      {/* 左：关卡进度 */}
      <div className="flex items-center gap-2.5">
        <span style={{ color: 'var(--brass-400)' }}><Icon name="flag" size={14} /></span>
        <span className="num font-black tracking-[0.14em]" style={{ color: 'var(--brass-300)' }}>
          第 {layer} 层<span className="font-semibold" style={{ color: 'var(--text-muted)' }}> / {totalLayers}</span>
        </span>
        <span className="etch-label hidden sm:inline">远征</span>
      </div>

      {/* 中：序列槽（战斗核心资源） */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
        <div className="flex items-center gap-[5px]">
          {Array.from({ length: pipelineSlots }).map((_, i) => (
            <svg key={i} width="11" height="11" viewBox="0 0 24 24" style={{ filter: 'drop-shadow(0 0 4px rgba(200,162,78,0.6))' }}>
              <path d="M12 3l7 9-7 9-7-9z" fill="rgba(200,162,78,0.28)" stroke="#c8a24e" strokeWidth="2" />
            </svg>
          ))}
        </div>
        <span className="etch-label">序列槽</span>
      </div>

      {/* 右：资源 */}
      <div className="flex items-center gap-2">
        <span className="res-chip" style={{ color: 'var(--brass-300)' }}>
          <span style={{ color: 'var(--brass-400)' }}><Icon name="coin" size={13} /></span>
          <span className="num">{gold}</span>
        </span>
        <span className="res-chip" style={{ color: 'var(--text-secondary)' }}>
          <span style={{ color: 'var(--arc-400)' }}><Icon name="deck" size={13} /></span>
          <span className="num">{masterDeck.length}</span>
          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>卡组</span>
        </span>
      </div>
    </div>
  );
}
