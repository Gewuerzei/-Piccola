# Changelog

All notable changes to the Cassola PWA suite are recorded here.

## Inventory v0.6.1 · Order Inbox & Archive
**2026-10-05**

- “已下单”不再把所有历史订单整页全量渲染。
- 新增“🔔 未结束工作区”：
  - 未结案订单永远置顶
  - 一张未结案订单里，只默认展开仍需处理 / 待保存的 SKU
  - 已处理 SKU 折叠为“查看已处理 N 项”，需要时再展开
- 顶部未结束铃铛新增“🎯 定位未处理”：
  - 点击跳到一个未处理 SKU
  - 连续点击按当前页面顺序继续定位下一项
- 已结案订单进入“🗄️ 历史归档”：
  - 以半月为周期分组：1–15 日 / 16–月底
  - 默认只渲染轻量周期入口
  - 点开某个周期时，才渲染该半月的完整订单卡片
- 订单与收货历史数据结构不变，只修改视图和按需渲染；`cassola_inventory_v01` 不变。
- Service Worker cache 更新为 `cassola-suite-v054`。

---

## Inventory v0.6 · Purchase Unit Layer
**2026-10-04**

- SKU 新增采购包装字段：
  - `unit` = 库存 / 最小包装单位
  - `orderUnit` = 订货 / 大包装单位
  - `unitsPerOrder` = 1 个大包装包含多少最小包装
- 旧 SKU 自动兼容为 `orderUnit = unit`、`unitsPerOrder = 1`，不清库、不改 `cassola_inventory_v01`。
- `state.order` 继续内部保存“库存单位数量”，避免已有草稿在新增箱规后被错误重解释；UI 输入 / 显示按订货单位换算。
- 自动订货先按库存需求计算，再在存在大包装换算时向上取整到完整订货包装。
- 新 placed order 快照保存 `orderQty / orderUnit / unitsPerOrder`；旧订单按原单位、倍率 1 保持历史语义。
- 收货界面按订货大包装输入，真正入库时换算回最小包装；`creditedQty` 继续以库存单位保存，幂等逻辑不变。
- 外发供应商订货文本简化为“商品名 + 数量 + 订货单位”，不再附带 SKU 的 g/kg/L 规格。
- 已下单卡片补回“📋 复制订单”按钮。
- Price Layer 新价格记录默认优先使用订货单位，仍可手动修改。
- Service Worker cache 更新为 `cassola-suite-v053`。

---

## Inventory v0.5.1 · iOS Decimal Input
**2026-10-04**

- 修复意大利语 iPhone 数字键盘使用逗号小数时，无法可靠输入 `1,8` / `0,5` 的问题。
- Inventory 可编辑数字框改为 iPhone 友好的 `type="text" + inputmode="decimal"`。
- 新增统一小数解析：`1,8` 与 `1.8` 都接受，保存 / 计算前统一转成标准数字。
- 覆盖快速盘货、手动到货 / 报损 / 调整、订货数量、分批收货数量、SKU 库存与预警参数、价格与 IVA 税率。
- 不改变 `cassola_inventory_v01`，不迁库，不修改已有数字数据结构。
- Service Worker cache 更新为 `cassola-suite-v052`。

---

## Staff v0.3.3 · Swap Lifecycle
**2026-10-03**

- 双人换休新增生命周期：
  - active = 当前有效
  - revoked = 手滑撤销
  - superseded = 临时反悔 / 请求未通过 / 后续重新安排
- active 换休格新增 **↩️ 处理这次换休**。
- “撤销（手滑）”与“后续修改”都会恢复双方换休前的原休息日，但历史语义不同。
- 新换休会保存双方换休前 attendance 快照，便于安全恢复。
- 有 active 换休的格子禁止直接叠加第二笔换休 / 个人调休，也禁止普通状态编辑绕过事务。
- 月度“换休发起”与人物顶部换休统计只计算 active 事件。
- 已撤销 / 后续修改的换休仍保留在人物历史，并显示对应状态徽标。
- 旧版没有 lifecycle 的 swap 自动迁移：
  - 双方 swapId 仍完整 → active
  - 链接已经被后续手工修改打散 → superseded
- 这会修复“周表里已经没有换休，但月度还多算一次”的幽灵记录。
- Staff JSON 导入预览从“新增换休”改成“换休变化”，能看到同一 swap 的生命周期修改。
- Service Worker cache 更新为 `cassola-suite-v051`。

---

## Inventory v0.5 · Price Layer
**2026-10-03**

### Manual price records
- SKU 编辑页新增胖胖的 **💶 价格** 卡片。
- 支持“＋ 记录价格”和“价格历史”。
- 价格不覆盖旧值，每次新增为独立 `priceRecords[]` 事务。
- 来源支持：
  - ✍️ 手动录入
  - 📄 报价单
  - 🧾 实际采购

### IVA
- 每条价格记录都有独立 IVA 状态：
  - IVA 未确认
  - 报价未含 IVA
  - 报价已含 IVA
- 可填写 IVA 税率。
- 自动显示未税价 / 含税价；缺少必要税率时不伪造换算结果。
- 涨跌比较优先采用可比的未税价格，避免“上月不含 IVA、本月含 IVA”造成假涨价。

### Specification safety
- 每条价格保存自己的 `quoteSpec` 和 `priceUnit`。
- 本次报价规格与 SKU 主档规格不同时显示 ⚠️。
- 规格异常只记录本次事实，不自动修改 SKU 主档。
- 只有 supplier + priceUnit + quoteSpec 足够可比时才显示价格涨跌。

### UI / handoff
- 最新价格以小型 💶 tag 显示在库存与订货草稿 SKU 上。
- 价格历史进入 Inventory JSON handoff / fingerprint。
- JSON 导入预览新增“价格记录变化”。
- 新增文件：`inventory-prices.js`。
- 保持深色、软圆、胖胖 iPhone UI。

### Not yet
- PDF 报价自动解析 / SKU 自动映射尚未接入。
- 采购订单预计总额、实际总额与库存估值尚未实现。

### PWA
- Service Worker cache 更新为 `cassola-suite-v05`。

---

## Inventory v0.4.2 · Supplier Order Text
**2026-10-03**

- “复制草稿”改名为 **📋 复制订货单**。
- 供应商外发文本不再带内部标题和 ERP 信息，只保留：
  - 商品名
  - 规格（有则显示）
  - 数量
  - 单位
- 如果“全部供应商”下同时有多家供应商的草稿，系统要求先点具体 supplier tag，避免把不同供应商订单混发。
- 已下单卡片新增 **📋 复制订单**，供应商要求重发时无需回聊天记录考古。
- 新订单会把 SKU spec 快照进 order item，保证后续 SKU 资料修改后仍尽量保留当时的订货表达。
- Service Worker cache 更新为 `cassola-suite-v0443`。

---

## Maintenance Theory Refresh
**2026-10-03**

- 维护方式从“功能补丁式”升级为以数据不变量、状态机、幂等事务和非破坏迁移为核心。
- 明确三层真相：
  - main 代码 = 实现真相
  - handoff = 架构与维护规则
  - iPhone 实机 = 运行时最终真相
- 明确主数据 / 事务 / 派生视图分离。
- 新字段必须向后兼容，优先 normalize / migrate，禁止为了升级清空现有数据。
- 自动化只负责建议，订货、收货、报价映射等关键业务动作继续要求人工确认。
- Inventory 收货等事务要求幂等，优先使用唯一 event / batch id 防止重复入账。
- 固化维护闭环：源码 → 静态检查 → 文档 → cache → Actions → iPhone 实机。

---

## Inventory v0.4.1 · Sala Starter Catalog
**2026-10-03**

- 根据 Sala / Bar 清单新增 69 个初始 SKU。
- 全部归入 🍸 Bar / Sala 区域。
- 分类：
  - 甜点 31
  - 酒水 15
  - 糖浆 6
  - 饮料 11
  - Sala 调味 6
- 供应商尚未确认的项目统一标记为 `待确认`。
- 未提供的正式包装规格保持空白。
- `待确认` SKU 默认不参与自动订货建议，避免临时资料触发错误建议。
- SKU 编辑器补充 Sala 分类与“待确认”供应商选项。
- Service Worker cache 更新为 `cassola-suite-v0442`。

---

## Inventory v0.4 · Areas & Open Receiving
**2026-10-03**

### Areas
- SKU 新增区域字段：
  - 🍣 Sushi
  - 🔪 Cucina
  - 🍸 Bar / Sala
  - 📦 Comune
- 旧 SKU 自动归入 Sushi，保留 `cassola_inventory_v01`。
- 库存页和盘货页新增胖胖区域切换。
- 订货草稿与供应商收货单内部按区域分小节。

### Open / partial receiving
- 供应商订单不再要求所有行一次性结束。
- 一张订单可以多次“保存本次收货”。
- 每行新增明确状态：
  - ✅ 收齐
  - 🕒 晚到 / 待补
  - 👥 待他人核对
  - ❌ 缺货
  - ⬇️ 少到
  - ⬆️ 多到
- 晚到、待他人、待核对继续挂 🔔。
- 缺货、少到、多到属于“有差异但已结案”，不会继续占待办。
- 使用 `creditedQty` 记录已经入库的累计数量，后续批次只把新增差额入库，避免重复加库存。
- 每次保存生成独立 `receiptBatches[]` 收货批次和 receipt id。
- 收货页顶部新增总铃铛，汇总待核对 / 晚到 / 待他人的未结束数量。
- 每张供应商订单可单独导出 JSON 快照。
- Inventory JSON 导入预览现在会显示已存在订单的收货进度变化，而不只统计新增订单。

### UI
- 保持深色、软圆、iPhone 优先的“胖胖 UI”。
- 收货按钮做成 3×2 大触控块，避免手机端密集小按钮。

### PWA
- Service Worker cache 更新为 `cassola-suite-v0441`。

---

## Staff v0.3.2 · Clearer Person Swap History
**2026-10-03**

- 人员记录顶部新增 3 个独立统计：
  - 🔄 发起换休
  - 🤝 参与换休
  - ↪️ 个人调休
- “参与换休”不再藏在普通记录里。
- 换休事件卡强化显示：
  - 发起 / 参与
  - 与谁换
  - 原休日期
  - 改休日期
  - 记录时间
  - 备注
- 新增人员记录筛选：
  - 全部
  - 换休 / 调休
  - 请假
  - 缺勤
- 人员记录仍显示全部历史，不只显示最新一条；列表按时间从新到旧排列。
- Service Worker cache 更新为 `cassola-suite-v0432`。

---

## Staff v0.3.1 · Personal Rest Moves
**2026-10-03**

- 明确“调休”的语义：
  - 旧版中它只是一个泛用标签
  - 新版不再让用户新建孤立的“调休”
  - 现在主要由“移动自己的休息日”自动生成
- 新增 **↪️ 移动自己的休息日**：
  - 从已有休息 / 调休日发起
  - 选择新日期
  - 原日期恢复默认上班
  - 新日期自动变成 🔁 调休
- 支持跨周移动；跨周时提示原周会少 1 个休息日、新周会多 1 个休息日。
- 新增 `restMoves[]` 审计记录：
  - 人员
  - 原休息日
  - 新休息日
  - 时段
  - 备注
  - 是否跨周
  - 操作前周表发布版本
- 月度页新增“个人调休”次数。
- 人员记录页新增个人调休事件。
- 月报 PDF 新增“个人调休”列。
- Staff JSON 导入预览新增“新增个人调休”。
- Service Worker cache 更新为 `cassola-suite-v0431`。

---

## Staff v0.3 · Published Weekly Rest & Paired Swaps
**2026-10-03**

### Weekly publishing
- 周休表新增正式发布版本。
- 第一次发布为 v1。
- 发布后继续修改，会显示“未发布修改”数量。
- 再次发布生成 v2 / v3 等修改版。
- 每次发布保留：
  - 发布时间
  - 发布设备
  - 修改数量
  - 当时的周表快照
- 新增周表版本历史。
- 周表 PDF 使用发布版本号；当前有未发布修改时标记为 draft。

### Paired rest swaps
- 正常“调休”状态继续保留。
- 新增真正的双人“换休”事务：
  - 从已存在的休息格进入
  - 选择另一名员工
  - 选择对方本周的休息日
  - 指定谁主动发起
  - 系统成对交换双方休息日期
- 换休事件独立保存在 `swaps[]`。
- 事件记录双方、换前/换后日期、发起人、备注和当时的周表发布版本。
- 周表换休格显示小型 ↔ 标记。

### Audit
- 月度汇总新增“换休发起”次数。
- 只给主动提出交换的人计数，避免把帮别人配合换休的人也算成“麻烦精”。
- 人员记录页显示每次换休是“发起”还是“参与”。
- 月报 PDF 加入“换休发起”列。

### JSON
- Staff JSON 自动包含 `swaps` 和 `weekPublications`。
- 导入预览新增：
  - 新增换休
  - 新增周表版本
- Inventory JSON 仍完全独立。

### PWA
- Service Worker cache 更新为 `cassola-suite-v043`。

---

## PWA Update Reliability
**2026-10-03**

- Service Worker 注册改为 `updateViaCache:'none'`。
- 每次 PWA 启动会主动检查 `sw.js` 更新。
- PWA 从后台回到前台时也会主动检查更新。
- Service Worker cache 更新为 `cassola-suite-v0423`。
- 目的：减少 Safari 网页已更新、主屏 PWA 仍停留旧版本的情况。

---

## Staff v0.2.2 · Generic Half-Day Periods
**2026-10-03**

- 全天 / 上午 / 下午不再只属于“请假”。
- 休息、请假、调休、缺勤都可以记录时段。
- 月度统计统一按时长计算：
  - 全天 = 1 天
  - 上午 = 0.5 天
  - 下午 = 0.5 天
- 周表继续只显示异常类型，保持简洁。
- 人员记录显示具体状态 + 时段 + 备注。
- “上班”仍是默认空白状态，不单独保存半天上班；半天上班应记录另一半的异常状态。
- Service Worker cache 更新为 `cassola-suite-v0422`。

---

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
