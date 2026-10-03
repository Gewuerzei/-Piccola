# Changelog

All notable changes to Cassola Inventory are recorded here.

## v0.3.1 · JSON Handoff
**2026-10-03**

### Added
- 群聊 JSON 数据交接机制。
- 数据版本号 `revision`。
- 数据内容指纹 `contentHash`。
- 设备名 `deviceName`。
- 导出文件名包含版本与设备，例如：
  `cassola-v28-Pietro-2026-10-03.json`
- 设置页新增“📨 群聊数据交接”区域。
- 导入前预览：
  - 本机版本
  - 文件版本
  - 导出设备
  - 库存变化数量
  - SKU 资料变化数量
  - 新增历史数量
  - 新增订单数量

### Safety
- 阻止旧版本 JSON 静默覆盖新版本。
- 同 revision 但不同 hash 时提示“分叉冲突”。
- 无 revision 的旧数据包按 legacy 处理。
- 对旧版 / legacy / fork 保留“强制采用”，但要求再次确认。
- 强制采用后生成更高 revision。
- 导入后保留当前设备自身的 deviceName。

### PWA
- Service Worker cache 升级为：
  `cassola-inventory-v031`
- 将 `v031-handoff.js` 加入离线缓存。

### Files
- `v031-handoff.js`
- `v03.css`
- `index.html`
- `sw.js`

---

## v0.3 · Orders & SKU
**2026-10-03**

### Added: SKU 管理
- 新建 SKU。
- 编辑 SKU。
- 删除 / 隐藏 SKU。
- 自定义：
  - 名称
  - Emoji 图标
  - 规格
  - 单位
  - 分类
  - 供应商
  - 当前库存
  - 预警模式
  - 订货目标
- 自定义分类和供应商可直接输入，不局限于内置列表。

### Added: 库存预警
支持两种模式：

1. 手动阈值：
   - 🔵 blueAt
   - 🟡 yellowAt
   - 🔴 redAt

2. 自动周耗覆盖：
   - 根据历史盘货估算每周消耗。
   - 显示覆盖周数。
   - 显示库存状态颜色。

自动模式当前大致阈值：
- 0：零库存
- ≤0.25 周：🔴
- ≤0.75 周：🟡
- ≤1.2 周：🔵
- 更高：正常

### Added: 周耗估算
历史周耗公式按盘货区间计算，并区分：
- 实际到货
- 报损
- 内部转入
- 内部转出

避免把报损和内部转换当成正常消耗。

### Added: 自动订货建议
- 支持 `targetQty`。
- 支持 `targetWeeks`。
- 支持 `manualWeeklyUse`。
- “✨ 生成建议”只生成订货草稿。
- 自动建议不会直接下单。
- 最终订货数量仍可人工修改。

### Added: 已下单 / 收货
订单流程正式拆为：

```text
建议
→ 草稿
→ 已下单
→ 收货核对
→ 实际到货
→ 库存增加
```

收货页面：
- 预填订货数量。
- 每行默认“待核对”。
- Q 版 `− / +` 按钮。
- 数字可直接编辑。
- 支持小数。
- “✕ 未到”。
- “✓ 核对”。
- 显示已核对数量。
- 所有行核对后才能“完成本次收货”。
- 完成后才将实际到货加入库存。
- 如果实际数量与订货数量不同，订单会标记为部分/差异到货。

### Product decision
**没有“一键全部到货”按钮。**

原因：避免收货人偷懒，把实际未到的货错误计入库存。

### PWA
- 新增 v0.3 脚本与样式文件并加入 Service Worker。
- 保留旧 localStorage key，兼容已有数据。

### Files
- `v03-core.js`
- `v03-orders.js`
- `v03-ui.js`
- `v03.css`
- `index.html`
- `sw.js`

---

## v0.2 · Soft UI
**2026-10-02**

### Added
- 初始 GitHub Pages 部署。
- iPhone 优先 PWA。
- Service Worker 离线缓存。
- 深色软圆 UI。
- Emoji / SKU 图标。
- SKU 搜索和分类筛选。
- 快速盘货。
- 到货。
- 报损。
- 手动库存调整。
- 内部转换。
- 订货草稿。
- 供应商筛选。
- 复制订单。
- 历史记录。
- JSON 完整备份 / 恢复。
- 浏览器本地存储。

### Initial architecture
- Offline-first
- Single-user
- Local-only
- No backend

### Important limitation at v0.2
- 无法自行新建 SKU。
- 无库存预警。
- 无自动订货建议。
- 无已下单 / 收货核对页。
- 无多人数据同步。

---

## Documentation
**2026-10-03**

- 新增 `PROJECT_HANDOFF.md`。
- 约定未来新聊天窗口维护时：
  1. 先读项目交接。
  2. 再读 Changelog。
  3. 再核对 main 当前代码。
  4. 代码状态优先于聊天记忆。
