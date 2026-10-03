# Cassola Inventory · Project Handoff

> 给下一次维护这个项目的 Piccola / 开发者看的交接文档。  
> **仓库中的当前代码永远比聊天记忆优先。先读本文件，再读 `CHANGELOG.md`，最后核对 `main` 当前代码。**

## 1. 项目身份

- Repository: `Gewuerzei/-Piccola`
- Default branch: `main`
- GitHub Pages: `https://gewuerzei.github.io/-Piccola/`
- 当前应用版本: **v0.3.1 · JSON Handoff**
- 当前实现基线 commit（文档加入前）: `e29fa76791acee04198cb5965b415d73ce2e720d`
- 形态: iPhone 优先 PWA，offline-first
- 当前协作方式: **群聊 JSON 数据包交接**
- 当前没有 Supabase / Firebase / 自建后端，也没有账号系统。

仓库是公开仓库。**不要写入账号密码、API secret、员工隐私、工资、真实敏感经营数据。**

---

## 2. 现在的产品目标

Cassola Inventory 是一个轻量、圆润、适合餐馆现场操作的库存工具，不追求传统 ERP 的厚重感。

当前重点：

1. 快速盘货。
2. SKU 自主管理。
3. 库存预警与订货建议。
4. 订货草稿与“已下单”分离。
5. 收货必须逐项核对实际到货量。
6. 保留历史记录，避免“计划到货 = 实际到货”。
7. 多设备暂时通过群聊传 JSON，不做自动云同步。

UI 偏好：深色、软圆、iPhone 感、Emoji/SKU 图标、Q 版大按钮。

---

## 3. 重要设计决定，不能随便破坏

### 3.1 本地数据兼容

历史 localStorage key 是：

```text
cassola_inventory_v01
```

**不要轻易更换。** 已有用户数据依赖这个 key。升级版本必须迁移旧 state，而不是让库存“消失”。

### 3.2 订单与库存必须分层

逻辑必须保持：

```text
系统建议
→ 订货草稿
→ Pietro/负责人确认
→ 已下单
→ 收货逐项核对
→ 实际到货
→ 库存增加
```

**订货数量绝不能自动算成实际到货。**

### 3.3 禁止“一键全部到货”

这是明确的产品决定。

原因：收货人可能为了省事直接点整单完成，造成供应商漏送的 SKU 被错误入库。

当前收货交互：

- 每个订单项预填“订货数量”。
- 默认状态仍是“待核对”。
- 有 Q 版 `− / +` 按钮。
- 中间数量可以直接编辑，支持小数。
- 可点“✕ 未到”变成实际 0。
- 可点“✓ 核对”确认当前实际数量。
- **所有行都明确核对后**，“完成本次收货”才可用。
- 完成后才把实际数量写入库存。

### 3.4 自动订货只是建议

自动算法只负责：

```text
显示建议 → 生成草稿
```

负责人仍可以人工修改最终订货数量。

---

## 4. 当前主要文件

基础 v0.2：

- `index.html`：页面骨架。
- `styles.css`：基础 Soft UI。
- `app.js`：基础 SKU、库存、盘货、历史、JSON 导入导出、localStorage。
- `manifest.webmanifest`：PWA manifest。
- `sw.js`：Service Worker / 离线缓存。

v0.3 增量：

- `v03-core.js`：SKU 扩展字段、周耗、库存预警、订货建议算法。
- `v03-orders.js`：订货草稿、已下单、收货核对。
- `v03-ui.js`：SKU 新建/编辑/删除、v0.3 UI 行为。
- `v03.css`：v0.3 / v0.3.1 样式。

v0.3.1：

- `v031-handoff.js`：群聊 JSON 版本号、导入预览、旧版本拦截、分叉检测。

目前代码是“基础 app + 增量脚本”的结构。后续如果重构成单一模块，必须先保证旧数据迁移和功能一致。

---

## 5. 当前 state 结构

核心字段大致为：

```js
state = {
  version,
  skus: [],
  history: [],
  order: {},
  placedOrders: [],
  hiddenSkuIds: [],
  syncMeta: {
    revision,
    updatedAt,
    contentHash,
    deviceName
  }
}
```

### SKU

v0.3 SKU 可能含：

```js
{
  id,
  name,
  spec,
  unit,
  category,
  supplier,
  qty,
  icon,
  warningMode,      // "auto" | "manual"
  blueAt,
  yellowAt,
  redAt,
  manualWeeklyUse,
  targetWeeks,
  targetQty,
  autoOrder
}
```

### 已下单

```js
{
  id,
  supplier,
  createdAt,
  status,           // "placed" | "received"
  partial,
  receivedAt,
  items: [{
    skuId,
    skuName,
    unit,
    orderedQty,
    actualQty,
    reviewed
  }]
}
```

---

## 6. 库存预警 / 周耗逻辑

### 手动阈值

SKU 可设置：

- 🔵 blueAt
- 🟡 yellowAt
- 🔴 redAt

### 自动模式

如果有可靠周耗：

```text
coverageWeeks = 当前库存 / 每周消耗
```

当前大致颜色阈值：

- 0 库存：zero
- ≤ 0.25 周：🔴
- ≤ 0.75 周：🟡
- ≤ 1.2 周：🔵
- 更高：正常

### 周耗来源

优先使用 `manualWeeklyUse`。

否则根据两个盘货点之间：

```text
消耗 = 旧盘点库存
     + 期间实际到货
     + 期间内部转入
     - 报损
     - 内部转出
     - 新盘点库存
```

然后按间隔天数折算成周耗。

**报损不是正常消耗。内部转换也不能伪装成消耗。**

至少需要两个有效盘货点，才可能从历史自动估算；否则可以人工填周耗或目标库存。

### 当前局限

目前算法**还没有真正根据“下次供应商可到货日期”计算覆盖风险**。这是未来可改进项。

---

## 7. 自动订货建议

当前：

1. 如果 SKU `autoOrder=false`，不自动建议。
2. 如果设了 `targetQty`，优先补到目标库存。
3. 否则用：
   ```text
   target = 周耗 × targetWeeks
   建议 = max(0, target - 当前库存)
   ```
4. 点击“生成建议”只把数量放进订货草稿。

当前默认 targetWeeks 大致：

- 蔬果：0.6 周
- 冷藏：1 周
- 处理库存：0
- 其他：2 周

这些只是当前程序默认值，不是不可更改的业务真理。

---

## 8. 群聊 JSON 交接规则（v0.3.1）

这是当前选定的多设备方案。

操作流程：

```text
Pietro 操作
→ 导出 JSON
→ 发内部群
→ 下一位下载最新 JSON
→ 导入
→ 操作
→ 再导出新版 JSON
→ 发回群
```

### syncMeta

JSON 包含：

- `revision`
- `updatedAt`
- `contentHash`
- `deviceName`

导出文件名类似：

```text
cassola-v28-Pietro-2026-10-03.json
```

### 导入保护

- 文件版本 > 本机：正常导入。
- 文件版本 < 本机：标记旧版本，默认不允许直接覆盖。
- 文件版本 = 本机 且 hash 一样：已经是同一份数据。
- 文件版本 = 本机 但 hash 不同：**分叉冲突**。
- 没有 revision 的旧 JSON：视为 legacy，默认不直接覆盖。
- 对旧版本 / legacy / fork 保留“强制采用”，但必须再次确认。
- 强制采用后会生成更高的新 revision。

### 当前局限

这不是事件级 CRDT / 自动合并系统。

如果两台设备同时从同一版本开始各自大量编辑，v0.3.1 只负责**检测冲突，不负责智能合并**。

---

## 9. 历史记录的重要语义

目前常见 history type：

- `count`：盘货
- `arrival`：实际到货
- `loss`：报损
- `transfer`：内部转换
- `adjust`：手动调整
- `order`：已下单记录

“计划订单”不能参与真实消耗公式，只有实际 arrival 才能参与。

---

## 10. PWA / Service Worker 维护注意

每次增加或修改前端资源时：

1. 检查 `sw.js` 的 `CORE` 是否包含新文件。
2. **递增 cache 名**，否则 iPhone 可能长期看到旧版本。
3. 推到 `main` 后检查 GitHub Pages Actions 是否成功。
4. iPhone 端可能需要联网打开一次，再彻底关闭 PWA 后重开，才能拿到新 Service Worker。

当前 cache 名：

```text
cassola-inventory-v031
```

---

## 11. 当前已知方向 / 待办

优先级可以随 Pietro 需求调整：

- 用一段时间测试 v0.3.1 JSON 交接是否顺手。
- 改善分叉冲突时的“差异查看”，目前只显示统计摘要。
- 自动订货加入“下次可到货日期 / 供应商周期”的计算。
- 用更多真实盘货历史校准周耗算法。
- 必要时加入部门字段，让寿司 / 厨房 / 酒吧 / 耗材共用一个 SKU 系统。
- 只有当多人高频同时编辑真的成为问题时，再考虑 Supabase 等共享后端。
- 未来可以重构脚本结构，但不能牺牲旧 localStorage 数据兼容。

---

## 12. 新聊天窗口维护 SOP

当 Pietro 在新聊天说类似：

> “Piccola，去翻 Pietro 的 -Piccola 仓库，先看项目交接和版本历史，再继续维护 Cassola Inventory。”

执行顺序应当是：

1. 打开 `Gewuerzei/-Piccola`。
2. 先读 `PROJECT_HANDOFF.md`。
3. 再读 `CHANGELOG.md`。
4. 获取 `main` 最新 commit 和相关源码。
5. 不根据旧聊天记忆猜当前实现。
6. 修改前确认旧数据兼容。
7. 修改后更新 Service Worker cache。
8. 有重要功能/架构变化时，同时更新本文件和 `CHANGELOG.md`。
9. 检查 Pages 部署状态。

🗿 代码是现场，handoff 是施工图，聊天记忆只能算工头脑内便签。
