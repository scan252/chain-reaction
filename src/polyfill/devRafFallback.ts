// 开发/测试环境专用：某些嵌入式 webview（如应用内浏览器）不会触发
// requestAnimationFrame，导致 framer-motion 的场景切换动画永远无法完成，
// 界面表现为"点击无反应"。此模块必须作为 main.tsx 的第一个 import，
// 在 framer-motion 捕获 rAF 引用之前完成替换。
//
// 混合策略：原生 rAF 与 32ms 定时器赛跑，谁先到谁触发回调——
// 真实浏览器中原生帧(~16ms)总是先到，行为完全不变；
// rAF 已死的 webview 中由定时器兜底（约 30fps），保证动画能推进。
// 仅在 DEV 生效，生产构建零影响。
if (import.meta.env.DEV && typeof window !== 'undefined') {
  const nativeRaf = window.requestAnimationFrame?.bind(window);
  const nativeCancel = window.cancelAnimationFrame?.bind(window);

  if (nativeRaf && nativeCancel) {
    const handles = new Map<number, { nativeId: number; timer: ReturnType<typeof setTimeout> }>();
    let nextId = 1;

    window.requestAnimationFrame = (cb: FrameRequestCallback): number => {
      const id = nextId++;
      let done = false;
      const invoke = (t: number) => {
        if (done) return;
        done = true;
        const h = handles.get(id);
        if (h) {
          nativeCancel(h.nativeId);
          clearTimeout(h.timer);
          handles.delete(id);
        }
        cb(t);
      };
      const nativeId = nativeRaf(invoke);
      const timer = setTimeout(() => invoke(performance.now()), 32);
      handles.set(id, { nativeId, timer });
      return id;
    };

    window.cancelAnimationFrame = (id: number): void => {
      const h = handles.get(id);
      if (h) {
        nativeCancel(h.nativeId);
        clearTimeout(h.timer);
        handles.delete(id);
      } else {
        nativeCancel(id);
      }
    };
  }
}
