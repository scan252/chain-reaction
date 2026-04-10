import { useRunStore } from '../store/runStore';

export function RunHUD() {
  const gold = useRunStore((s) => s.gold);
  const masterDeck = useRunStore((s) => s.masterDeck);
  const currentLayer = useRunStore((s) => s.currentLayer);
  const pipelineSlots = useRunStore((s) => s.pipelineSlots);
  const map = useRunStore((s) => s.map);

  const totalLayers = map.layers.length;

  return (
    <div className="flex items-center justify-center gap-6 text-sm text-white/60 py-2 bg-black/40 border-b border-white/10">
      <span className="font-medium text-shadow-sm">第 {currentLayer + 1}/{totalLayers} 层</span>
      <span className="text-yellow-400 font-medium text-shadow-sm">💰 {gold}</span>
      <span className="text-shadow-sm">牌组: {masterDeck.length} 张</span>
      <span className="text-shadow-sm">槽位: {pipelineSlots}</span>
    </div>
  );
}
