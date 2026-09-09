import { useRunStore } from '../store/runStore';

/** 战斗顶栏：左 = 关卡进度，右 = 资源状态 */
export function RunHUD() {
  const gold = useRunStore((s) => s.gold);
  const masterDeck = useRunStore((s) => s.masterDeck);
  const currentLayer = useRunStore((s) => s.currentLayer);
  const pipelineSlots = useRunStore((s) => s.pipelineSlots);
  const map = useRunStore((s) => s.map);

  const totalLayers = map.layers.length;
  const layer = Math.max(1, currentLayer + 1);

  return (
    <div className="relative flex items-center justify-between px-4 h-9 bg-[#0a0d15]/78 border-b border-[var(--line)] text-[13px]">
      {/* 左：关卡进度 */}
      <div className="flex items-center gap-3">
        <span className="text-[var(--gold-400)] font-semibold tracking-[0.18em] num">
          {layer}<span className="text-[var(--text-muted)]"> / {totalLayers}</span>
        </span>
        <span className="text-[var(--text-muted)] text-xs tracking-[0.3em]">远征</span>
      </div>

      {/* 中：槽位（战斗核心资源，居中强调） */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1.5">
        {Array.from({ length: pipelineSlots }).map((_, i) => (
          <span key={i} className="w-2 h-2 rotate-45 bg-[var(--gold-500)]/80 shadow-[0_0_5px_rgba(212,169,92,0.5)]" />
        ))}
        <span className="ml-2 text-xs text-[var(--text-muted)] tracking-widest">序列槽</span>
      </div>

      {/* 右：资源 */}
      <div className="flex items-center gap-2">
        <span className="res-chip text-[var(--gold-300)]">
          <span className="text-[10px] text-[var(--gold-500)]">◆</span>
          <span className="num">{gold}</span>
        </span>
        <span className="res-chip text-[var(--text-secondary)]">
          <span className="text-[10px] text-[var(--accent-teal)]">❖</span>
          <span className="num">{masterDeck.length}</span>
          <span className="text-[10px] text-[var(--text-muted)]">卡组</span>
        </span>
      </div>
    </div>
  );
}
