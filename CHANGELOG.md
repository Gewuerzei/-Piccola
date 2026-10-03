# Changelog

All notable changes to the Cassola PWA suite are recorded here.

## Staff v0.2.1 · Leave Detail
**2026-10-03**

- 请假新增次级选项：全天 / 上午 / 下午。
- 周休表保持简洁，只显示“请假”异常，不显示半天细节。
- 月度汇总按真实请假时长统计：
  - 全天 = 1 天
  - 上午 = 0.5 天
  - 下午 = 0.5 天
- 人员页新增“个人记录”入口，可查看每条异常的日期、状态、请假时段与备注。
- 旧数据没有 portion 时按全天处理。
- Service Worker cache 更新为 `cassola-suite-v0421`。

---

## Staff v0.2 · Weekly Rest
**2026-10-03**

### Main workflow
- Staff 默认首页从“岗位排班”改为 **周休息表**。
- 空白日期默认视为正常上班，不需要每天逐个确认。
- 每个人每天可记录：
  - 💤 休息
  - 📝 请假
  - 🔁 调休
  - ❌ 缺勤
- 点周表格子即可编辑。
- 支持连续日期一次录入，例如连续 3 天请假。
- 可写备注，例如“已批准”“与 Luca 对调”。

### Monthly summary
- 新增月度汇总页。
- 按人员统计：
  - 休息天数
  - 请假天数
  - 调休天数
  - 缺勤天数
- 有缺勤的人员高亮。
- 适合月底快速查看“谁缺勤”。

### PDF
- 新增周休息表 PDF。
- 新增月度汇总 PDF。
- 两种 PDF 都在浏览器本地生成并可通过 iOS 分享。

### Existing board
- 原来的头像拖拽岗位排班保留。
- 现在位于“排岗”页，作为二级可选功能。

### Data
- Staff state 新增 `attendance`。
- attendance 会进入 Staff JSON，所以请假/休息数据可通过群聊 JSON 直接交接。
- Inventory JSON 与 Staff JSON 继续完全独立。

### PWA
- Service Worker cache 更新为 `cassola-suite-v042`。

---

## Staff Board v0.1.1 · Split JSON Backup
**2026-10-03**

- 日常“导出 Staff JSON”不再携带头像图片。
- 新增“完整备份（含头像）”。
- 普通 Staff JSON 适合群聊日常交接。
- 完整备份用于换手机、灾备和头像迁移。
- 导入器同时兼容普通 Staff JSON 与完整备份。
- Service Worker cache 更新为 `cassola-suite-v041`。

---

## Cassola Hub + Staff Board v0.1
**2026-10-03**

### Added: Cassola Hub
- 同一个网址现在先进入主菜单。
- 两个模块：
  - 📦 Inventory
  - 👥 Staff
- Inventory 保持原有数据和流程，不迁移、不清空。
- 新增 Inventory 顶部“返回主菜单”按钮。
- PWA 名称从 Cassola Inventory 调整为 Cassola。

### Added: Staff Board
- 新 Staff 模块，使用独立 localStorage：
  `cassola_staff_v01`
- 默认不内置真实员工名单，避免把人员信息写进公开 GitHub。
- 人员新增 / 编辑 / 删除。
- 姓名、昵称、主要岗位、备注。
- 微信头像等本地图片可导入。
- 头像自动方形裁切并压缩为约 256×256 WebP。
- 头像存入 IndexedDB：
  - DB: `cassola_staff_assets_v01`
  - Store: `avatars`

### Scheduling
- 每天独立排班。
- 午班 / 晚班。
- 默认岗位：
  - Nigiri / Sashimi
  - Maki
  - Cucina
  - Sala
  - Lavaggio
  - Cassa
- 岗位可新增、改名、换 Emoji、删除。
- 特殊状态：
  - 🧩 待安排
  - 💤 休息
  - 📝 请假 / 调休
- 人员头像轻点后可选择岗位。
- 长按头像可拖拽排岗。
- 桌面支持普通 drag/drop。
- 可复制昨日同班次排班。

### History
- 记录人员、岗位、排班、复制等操作。
- 保留最近历史，可人工清理旧记录。

### Staff JSON Handoff
- 独立 revision / contentHash / deviceName。
- 新版本允许导入。
- 旧版本默认拦截。
- 同版本不同 hash 提示分叉冲突。
- legacy 数据包默认拦截。
- 强制采用需二次确认并产生更高 revision。
- Staff JSON 会带上压缩头像，方便完整迁移到另一台手机。

### Local PDF
- 当前排班可生成 A4 横向单页 PDF。
- PDF 在浏览器本地生成，不上传服务器。
- 包含：
  - 日期
  - 午/晚班
  - 排班版本
  - 岗位
  - 人员姓名
  - 头像
  - 休息 / 请假 / 待安排
- iOS 支持文件分享时直接调用系统分享；否则下载 PDF。

### PWA
- 新增：
  - `hub.js`
  - `hub.css`
  - `staff.js`
  - `staff.css`
- Service Worker cache 更新为：
  `cassola-suite-v04`

---

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
