# 《链式反应 Chain Reaction》全面代码审查报告

> 审查日期：2026-09-09 · 审查基线：`main@83e2b98`（5 个提交，最后提交于 2026-06-24）
> 审查范围：全部 19 个组件、2 个 store、战斗引擎、数据层、构建配置、静态资源

---

## 一、项目概况

- **技术栈**：Vite 8 + React 19 + TypeScript 6 + Tailwind CSS 4 + Zustand 5(Immer) + @dnd-kit/core + Framer Motion 12
- **游戏类型**：管道序列（Pipeline）卡牌 Roguelike，灵感来自《杀戮尖塔》
- **核心玩法**：拖拽手牌进入 5 个管道槽位 → 结算阶段一（卡牌按序执行）→ 阶段二（敌人按公示意图攻击特定槽位）→ 阶段三（总伤害扣敌人血）
- **代码规模**：src/ 约 5300 行，public/ 图片 30MB

## 二、严重 Bug（A 级，影响数值正确性与核心体验）

| # | 问题 | 位置 |
|---|------|------|
| A1 | **globalDamageBonus 双重计算**：`DEAL_DAMAGE` 每张攻击卡已加 `globalDamageBonus`，结算时 `totalDmg` 又整体加一次；全防御回合也白得平加伤害 | gameStore.ts:594 / effectRegistry.ts:33 |
| A2 | **共鸣增幅 effectId 新旧不一致**：卡牌数据是 `RESONANCE_AMP_V2`，但 Card.tsx / computeSlotLinks / 动画跳过逻辑仍判断旧版 `RESONANCE_AMP`，共鸣特效与链接从未生效 | cardData.ts:141 / Card.tsx:17,27 / gameStore.ts:59,465 |
| A3 | **跨局状态残留**：`startNewRun` 未重置 `relics`、`gameStats`、`pendingEventRewards`、`eventRewardCollected`，上一局遗物直接带入新局且真实生效 | runStore.ts:144-183 |
| A4 | **mirrorReflectBonus 恒为 0**：`resolveSlotCombat` 中从未赋值，"镜面反射→下回合攻击+X" 永不触发，是死字段 | effectRegistry.ts:325,496 / gameStore.ts:582-585 |
| A5 | **结算阶段卡牌快照失效**：EXECUTE_PHASE3 与"pipeline 清空进弃牌堆"在同一 `set` 中，`keepVisible` 永远为假 | gameStore.ts:629-643 / PipelineBoard.tsx:355 |
| A6 | **管道内拖拽换位不可达**：槽内卡牌从未注册 draggable，`reorderPipeline` 在 UI 上无法触发；规则弹窗却宣称"可随时调整位置" | GameArena.tsx:113 / PipelineBoard.tsx:224 |
| A7 | **商店可把卡组删空导致死局**：`removeCard` 无最小卡组校验，0 张卡进战斗后无法推进回合 | runStore.ts:401-411 |
| A8 | **禁忌卡无限复制**：吉祥物隐藏对话可反复获得 999 伤害禁忌卡，无去重检查 | MapScreen.tsx:124-139 |
| A9 | **胜利领奖无防重复守卫**：快速双击"领取奖励"会重复生成奖励并重复累计击败统计 | GameArena.tsx:124 / runStore.ts:280 |
| A10 | **变量遮蔽**：useEffect 内 `enemy` 遮蔽外层 gameStore 的 `enemy` | GameArena.tsx:65,83 |
| A11 | **背水一战扣血显示失真**：实际扣血 clamp 到 1，`turnSummary.hpLoss` 却记录未 clamp 值 | gameStore.ts:553-559,624 |
| A12 | **胜利判定靠 ref 启发式**：`lastSceneRef.current !== 'BATTLE'` 推断胜负，脆弱 | App.tsx:81-90,219 |

## 三、边界与空指针风险（B 级）

| # | 问题 | 位置 |
|---|------|------|
| B1 | `gold < shopItems.find(...)?.cost!` 对 undefined 非空断言 | runStore.ts:403 |
| B2 | 商店移卡按 templateId 只删第一张同名牌 | ShopScreen.tsx:68 / runStore.ts:404 |
| B3 | 槽位已达上限 8 时 `collectBonusSlot` 不置 false，按钮无限点击无反馈 | runStore.ts:341-349 |
| B4 | gameStore 初始 playerHp 硬编码 120，首帧闪现错误血量 | gameStore.ts:216 |
| B5 | `sort(() => Math.random() - 0.5)` 偏置洗牌（已在清理阶段修复） | NpcHelpScreen.tsx（已修） |
| B6 | MapScreen currentNode 双层遍历取"最后一个 visited"，逻辑脆弱 | MapScreen.tsx:160-167 |
| B7 | Boss 判定用 `maxHp >= 100` 魔法阈值，新增 100+ HP 普通怪即误判 | EnemyArea.tsx:22-23 |
| B8 | 禁忌卡首回合手牌 9 张 > 抽牌数 8，规则描述被打破 | gameStore.ts:296-301 |

## 四、冗余与死代码（已在清理阶段处理 ✅ 或待修复阶段处理）

- ✅ 已删除：PlayerPanel.tsx（死组件）、P4.jpg / J1.png / icons.svg / src/assets/（未引用图片）、card_config.xlsx（二进制重复）、旧版 executePipeline、generateEventRewards 重复定义、healPlayer、CLASS_SKILL_COST、@dnd-kit/sortable+utilities、xlsx 依赖
- 待处理：mirrorReflectBonus 死字段、artPath 死配置字段（18 张卡全部指向不存在的 /assets/cards/*.png）、PipelineBoard 注释代码块、GameArena characterRef、MapScreen setIsEnhancedMode

## 五、UI/UX 问题

1. VICTORY 时"领取奖励"与"下一回合"按钮同时出现，结算区仍提示"点击查看下回合"
2. 技能按钮 canUseSkill 判断不完整（缺 skillUsedThisBattle / 牧师满血），失败无提示
3. 技能浮层 fixed inset-0 遮罩挡住战场，首次点击不穿透
4. Card.tsx 特殊图标角标与伤害加成角标同在右上角互相覆盖
5. 小屏适配缺失：敌人血条定宽 864px、地图 SVG 固定 600px 宽、吉祥物对话框溢出、EventReward 固定三列
6. MapScreen 弹窗 / PipelineBoard DamageEffects 带 exit 属性但无 AnimatePresence，退场动画从不播放
7. 遗物/增益 tooltip 仅 hover，触屏不可用
8. 文案不一致："总护甲/生成护盾"、"空/牌库为空"、两份规则弹窗内容不同步
9. 休息处 HP 满时回血按钮仍可点，白白消耗节点
10. index.html `lang="en"`，标题非中文

## 六、硬编码魔法数字（应集中到配置）

执行动画 500/600/400/400ms；奖励金币 15+rand16、bonusSlot 10%、槽位上限 8；休息回血 30%、事件回血 20%、冥想 +2MP、牧师治疗 20；Boss 阈值 100、血条 864/432px；LightningLink slotWidth/gap 且未算箭头宽度（反向链接宽度公式有误）；地图布局间距；破绽 +15%、燃烧减半、duration=2；商店价格 30+rand50；'forbidden_001'/'skill_001' 字面量散落 4 处；初始金币 100 重复硬编码两处。

## 七、性能问题

1. EventRewardScreen 无 selector 订阅整个 store
2. 执行动画 setTimeout 链不可跳过不可取消（5 槽+3 攻击固定约 4.3 秒）
3. computeSlotPreviews 每次放牌全量模拟
4. PipelineSlot 订阅粒度粗，slotPreviews 引用替换导致全槽位级联重渲
5. 手牌 layout+popLayout 布局动画在低端设备掉帧
6. 两处 setTimeout 未在卸载时清理
7. **静态资源 30MB**：每张图 1.2-2.3MB（疑为 4K 原图直出），首屏加载极重

## 八、游戏设计层面的问题（数值重构的动因）

> 这一部分是本次重构的核心动因，详细方案见 [IMPROVEMENT_PLAN.md](./IMPROVEMENT_PLAN.md)。

1. **卡池过浅**：全部 16 张卡，行动卡多为"造成 X 伤害/获得 Y 护甲"的白板，缺乏流派构建（archetype）与卡牌间协同网络
2. **无资源约束**：每回合抽 8 张放 5 槽，没有能量/费用系统，回合决策同质化（排序题而非取舍题）
3. **无卡牌成长**：没有升级/锻造，卡牌拿到手就是终点
4. **Buff 系统单薄**：只有破绽、燃烧 2 种，无中毒/虚弱/力量/易伤等构成 Build 的元素状态
5. **敌人和地图深度不足**：无精英怪、无事件节点多样性、意图类型少且无组合技（蓄力、召唤、自增益）
6. **数值无曲线**：敌人数值凭感觉拍，没有 TTK（击杀回合数）和承伤预算的数学框架
7. **奖励节奏失衡**：每战双轮三选一导致牌组膨胀（约 8 场战斗后 30+ 张），而抽 8 放 5 的结构使牌组膨胀=变弱，负反馈强烈且玩家无感知
8. **爽点不足**：连击数字、连锁特效、超杀反馈、combo 计数器等"多巴胺层"缺失或失效（A2/A5 直接导致共鸣特效从未展示）

## 九、修复优先级 Top 15

1. 修复 globalDamageBonus 双重计算（数值正确性）
2. 统一共鸣增幅 effectId，让特效真正显示（爽点）
3. startNewRun 补齐重置项（跨局残留）
4. 实现或删除 mirrorReflectBonus
5. 恢复管道内拖拽换位（承诺的功能）
6. 商店删卡保护 + 修复"总删第一张同名牌"
7. 禁忌卡去重
8. 胜利/失败按钮与文案修正
9. LightningLink 定位修复
10. 结算阶段卡牌快照（keepVisible）
11. 技能按钮状态完善 + 失败提示
12. 死代码清理（剩余部分）
13. 休息处按钮禁用态 + 响应式栅格
14. 性能优化（selector、动画跳过、预览缓存）
15. 本地化与文案统一（lang=zh-CN、标题、术语统一）
