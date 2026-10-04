# Cassola Suite · Project Handoff

> 给下一次维护这个项目的 Piccola / 开发者看的交接文档。  
> **先读本文件，再读 `CHANGELOG.md`，最后核对 `main` 当前代码。仓库代码优先于聊天记忆。**

## 1. 项目身份

- Repository: `Gewuerzei/-Piccola`
- Default branch: `main`
- GitHub Pages: `https://gewuerzei.github.io/-Piccola/`
- 当前 Suite 结构: **主菜单 → Inventory / Staff**
- Inventory: **v0.5.1 · iOS Decimal Input**
- Staff: **v0.3.3 · Swap Lifecycle**
- 当前实现基线: **以 `main` HEAD 为准**（不在 handoff 硬编码 commit，避免文档漂移）
- iPhone 优先 PWA，offline-first
- 无 Supabase / Firebase / 自建后端
- 多设备协作目前使用 **群聊 JSON 数据包交接**

仓库是公开仓库。**不要提交员工头像、真实员工名单、账号密码、API secret、工资或其他敏感经营数据。**

---

## 2. 顶层架构

同一个网址承载多个独立模块：

```text
Cassola Hub
├─ 📦 Inventory
└─ 👥 Staff
```

Hub 文件：
- `hub.js`
- `hub.css`

首次打开默认进入主菜单。Inventory 和 Staff 各自管理自己的本地数据，避免互相污染。


## 2.1 维护理论（2026-10-03 刷新）

现在的维护思路不再只是“加功能 + 修 UI”，而是围绕**数据契约、状态机、可追溯性和非破坏升级**来维护。

### A. 代码 / 文档 / 运行现场三层真相
1. `main` 当前代码 = 实现真相。
2. `PROJECT_HANDOFF.md` = 架构与维护规则。
3. `CHANGELOG.md` = 版本演化记录。
4. iPhone 实机结果 = 运行时最终真相。静态语法通过不等于浏览器行为已验证。

维护顺序仍是：先读 handoff → changelog → 当前源码；不能反过来根据聊天记忆猜代码。

### B. 先保护“数据不变量”，再改界面
任何改动前先确认哪些东西绝不能被破坏，例如：
- Inventory localStorage key `cassola_inventory_v01`
- Staff localStorage key `cassola_staff_v01`
- Staff 头像 IndexedDB
- 已确认库存数量
- 已发布周表版本
- 已经入库的收货批次
- JSON revision / hash 语义

UI 可以重做，数据契约不能悄悄变。

### C. 新字段必须可向后迁移
新增字段采用“旧数据无此字段也能跑”的方式：
- SKU 无 `area` → 默认 `sushi`
- 旧订单无 `creditedQty` / `lineStatus` → 按旧状态推断
- Staff 旧 attendance 无 `portion` → 默认全天
- Staff 旧 swap 无生命周期 → 根据当前 swapId 链接迁移为 active / superseded
- 新事件数组不存在 → 初始化为空数组

原则：**normalize / migrate，不清库重建。**

### D. 业务流程尽量做成状态机，不做一次性布尔开关
例如收货不再只有“未收 / 已收”，而是：
`pending → later / other → received / short / over / out`

Staff 也区分：
- 原始休息
- 个人调休事件
- 双人换休事件
- 周表发布版本

这样状态变化能解释“发生了什么”，而不是只留下结果。

### E. 主数据、事务、视图分开
- SKU / 人员 = 主数据
- 收货批次 / 换休 / 发布 = 事务
- 库存警报 / 月度统计 / 待办铃铛 = 从事务和主数据推导的视图

不要为了某个页面方便，把派生结果直接塞回主数据污染历史。

### F. 多维分类不复制数据库
Inventory 的“区域”和“供应商”是两个不同维度：
- 库存 / 盘货按 area 看
- 下单 / 收货按 supplier 组织
- 一张供应商单内部再按 area 分区

不要为 Sushi / Cucina / Bar 各建一套孤立 Inventory。

### G. 自动化只负责建议，关键动作必须人工确认
- 自动订货只能进入草稿，不能自动下单
- PDF 报价识别以后必须人工核对 SKU / 规格 / 单位
- 收货必须明确每行结果
- 未确认 supplier / spec 的 SKU 不参与自动建议

宁可显示“待确认”，不要编一个看起来很完整但错误的值。

### H. 事务必须幂等
已经入库的数据不能因为重开页面、导入 JSON、第二次收货而重复计入。
Inventory 用：
- `creditedQty`
- `receiptBatches[].id`
- receipt history

以后新增类似事务，也优先设计唯一 event id / batch id，而不是靠“应该不会点两次”。

### I. 修改后固定走一遍发布闭环
1. 改源码
2. 静态检查 JS / DOM
3. 更新 handoff + changelog（架构或业务规则变化时）
4. 涉及 PWA 资源时 bump Service Worker cache
5. 检查 GitHub Pages Actions
6. iPhone 实机验证
7. 若实机结果与静态判断冲突，以实机为准继续修

---

# Inventory

## 3. Inventory 本地兼容

历史 localStorage key：

```text
cassola_inventory_v01
```

**不要轻易更换。** 升级必须兼容现有库存数据。

主要文件：
- `index.html`
- `styles.css`
- `app.js`
- `v03-core.js`
- `v03-orders.js`
- `v03-ui.js`
- `v03.css`
- `v031-handoff.js`
- `inventory-prices.js`

### 核心流程

```text
系统建议
→ 订货草稿
→ 人工确认已下单
→ 供应商订单
→ 可多次保存收货
→ 每次只把新增实到数量入库
→ 未结束行继续挂起
→ 全部行结案后订单关闭
```

**计划订单绝不能直接算作实际到货。**

### Inventory 区域

SKU 新增 `area`：
- `sushi` = 🍣 Sushi
- `cucina` = 🔪 Cucina
- `bar` = 🍸 Bar / Sala
- `common` = 📦 Comune / 共用

旧 SKU 没有 area 时默认迁移为 `sushi`，不更换历史 localStorage key。

库存 / 盘货按区域切换；订货和收货仍以供应商订单为主，但订单内部按区域分小节。

### Bar / Sala 初始 SKU

2026-10-03 已根据 Pietro 提供的 Sala 清单加入 **69 个 Bar / Sala 初始 SKU**：
- 甜点 31
- 酒水 15
- 糖浆 6
- 饮料 11
- Sala 调味 6

这些 SKU 当前：
- `area = "bar"`
- 供应商先写 `待确认`
- 未提供的规格保持空白
- 单位只按明显商品形态给了临时计数单位
- `待确认` 供应商默认不参与自动订货建议

后续拿到真实供应商报价单 / 规格后，逐项修正 supplier、spec、unit；不要把当前临时值当成供应商正式规格。

### 收货的重要产品决定

没有“一键全部到货”。

一张供应商订单允许多次保存收货。每个订单行必须明确业务结果：
- ✅ 收齐：结案
- 🕒 晚到 / 待补：保持开放并挂 🔔
- 👥 待他人核对：保持开放并挂 🔔
- ❌ 缺货：结案，不再挂
- ⬇️ 少到：按实际数量入库后结案
- ⬆️ 多到：按实际数量入库后结案

`creditedQty` 表示已经真正计入库存的累计数量；再次收货只入库 `actualQty - creditedQty`，禁止重复加库存。

每次“保存本次收货”会产生独立 `receiptBatches[]` 批次，并带唯一 receipt id。只要还有 pending / later / other 行，供应商订单继续显示 🔔 未结束。

### 库存预警 / 自动订货

SKU 可使用手动阈值或历史周耗。

自动模式大致：
- ≤ 0.25 周：🔴
- ≤ 0.75 周：🟡
- ≤ 1.2 周：🔵
- 更高：正常

自动订货只是**建议**，生成后进入草稿，不自动下单。

历史周耗必须区分：
- 实际到货
- 正常消耗
- 报损
- 内部转换

报损不是正常消耗，内部转换不能伪装成消耗。

### Supplier outbound order text

PWA 内部订单和发给供应商的文本是同一份数据的两个视图：
- 内部：保留 SKU、area、supplier、收货状态等结构化数据
- 外发：只生成供应商需要看的“商品 + 规格（有则显示） + 数量 + 单位”纯文本

规则：
- 草稿页按钮叫“📋 复制订货单”
- 若“全部供应商”下同时存在多家供应商草稿，必须先点具体 supplier tag，禁止把多家订单混在一份文本里
- 已下单卡片也提供“📋 复制订单”，可随时重新发给供应商
- 新建 placed order 时把 `spec` 快照写进 order item；旧订单没有 spec 时回退到当前 SKU spec

### iPhone / locale 小数输入

Inventory 的可编辑数字框必须兼容意大利语 iPhone 的逗号小数键盘：
- 用户输入 `1,8` 或 `1.8` 都应得到数值 `1.8`
- UI 数字输入使用 `type="text" + inputmode="decimal"`，避免 iOS / locale 对 `type="number"` 的字符限制
- 保存或计算前统一走 locale decimal parser
- 内部数据继续保存为 JS number，不把逗号字符串写进 localStorage
- 不改变 `cassola_inventory_v01`

### Price Layer

价格不是 SKU 上的单一可覆盖字段，而是独立事务历史：

```js
priceRecords[] = {
  id,
  skuId,
  skuName,
  supplier,
  recordDate,
  createdAt,
  source,        // manual | quote | actual
  currency,      // 当前固定 EUR
  amount,        // 用户看到 / 输入的报价
  priceUnit,     // 箱 / 盒 / kg / 包 ...
  quoteSpec,     // 本次报价写的规格
  vatMode,       // unknown | excluded | included
  vatRate,
  netAmount,
  grossAmount,
  specMismatch,
  note
}
```

当前 v0.5：
- SKU 编辑页新增胖胖的“💶 价格”卡片
- 支持手动新增价格记录
- 来源可选：手动 / 报价单 / 实际采购
- IVA 是**每一条价格记录自己的属性**，不能只做成 SKU 固定值
- IVA 模式：
  - unknown = 未确认
  - excluded = 报价未含 IVA
  - included = 报价已含 IVA
- 有税率时自动换算未税 / 含税价格
- excluded 即使暂时不知道税率，也能确认输入价本身是未税价
- included 若税率未知，则保留含税输入价但不伪造未税价
- 最新价格可显示在库存 / 订货草稿 SKU tag
- 价格历史按日期保留，不覆盖旧记录
- 涨跌比较优先使用未税价；仅在 supplier + priceUnit + quoteSpec 可比时比较
- 若本次 quoteSpec 与 SKU 标准 spec 不同，显示 ⚠️ 规格异常，只保存为本次价格记录，不自动修改 SKU 主档
- 新 SKU 尚未保存时不能先挂价格记录，避免孤儿 price event

后续 PDF 报价导入也必须写入同一个 `priceRecords[]` 数据模型，不另造第二套价格系统。电子 PDF 可本地解析；图片 / 扫描 PDF 可由 Piccola 辅助结构化后导入。

### Inventory JSON handoff

`v031-handoff.js` 提供：
- `revision`
- `contentHash`
- `deviceName`
- 导入预览
- 旧版本拦截
- 同 revision 不同 hash 的 fork 检测
- 强制采用需再次确认
- SKU area 会进入 JSON
- 已存在订单的收货进度变化会在导入预览中计为“订单 / 收货变化”
- 每张供应商订单可单独导出 `cassola-order-handoff-v1` JSON 快照
- `priceRecords[]` 进入 Inventory JSON fingerprint / handoff；导入预览显示“价格记录变化”

---

# Staff

## 4. Staff v0.3.3 · Swap Lifecycle

主要文件：
- `staff.js`
- `staff.css`

Staff 和 Inventory 数据完全分开。

localStorage key：

```text
cassola_staff_v01
```

头像不放 localStorage，使用 IndexedDB：

```text
DB: cassola_staff_assets_v01
Store: avatars
```

### Staff 当前主功能

Staff 的主轴现在是 **周休息 / 请假 / 缺勤管理**，岗位排班降为可选二级功能。

- 默认首页：周休息表
- 每人每周 7 天状态：
  - 空白 / · = 上班（默认，不需要逐日录入）
  - 💤 休息
  - 📝 请假
  - 🔁 调休
  - ❌ 缺勤
- 点日期格即可编辑状态和备注
- 所有异常状态都支持次级时段：全天 / 上午 / 下午
- 适用于休息、请假、调休、缺勤
- “上班”仍是默认空白状态；若只上半天，应把另一半记录为相应异常状态
- 周表只显示异常类型，不在小格子里挤半天细节
- 月度统计中：全天=1天，上午/下午=0.5天，适用于休息/请假/调休/缺勤
- 人员页可打开个人记录，查看具体日期、状态、时段与备注
- 支持连续日期一次录入，例如 3 天请假
- 月度汇总：按员工统计休息 / 请假 / 调休 / 缺勤天数
- 有缺勤的人在月度页突出显示
- 周休息表支持“发布版本”：
  - 第一次发布 = v1
  - 发布后有修改时显示“未发布修改”
  - 再发布 = v2 / v3 …
  - 每次发布保留时间、设备名、修改数量和该周快照
- 可查看某周的发布版本历史
- 周表 PDF 文件名优先使用周表发布版本；有未发布修改时标记 draft
- 原来的“🔁 调休”不再作为新的手工独立状态创建；它现在主要表示“个人休息日移动后的目标日”，旧数据仍兼容
- 支持“↪️ 移动自己的休息日”：
  - 从已有休息/调休日发起
  - 选择新的休息日期
  - 原休息日恢复为默认上班
  - 新日期自动生成 🔁 调休
  - 可跨周，跨周时明确提示“原周少 1 休 / 新周多 1 休”
  - 事件记录在 `restMoves[]`，保留原日期、新日期、时段、备注和发布版本
- 支持真正的双人“换休”：
  - 从一个人的休息格进入“与他人换休”
  - 选择对方及对方本周休息日
  - 选择谁发起这次换休
  - 两人的休息日期成对交换
  - 记录发起人、双方、交换前后日期、备注和当时已发布周表版本
  - 新换休事件写入 `status: "active"`
  - 每个换休格只能属于一笔 active 换休，禁止在未处理旧换休时继续叠加新换休 / 个人调休
- 换休增加生命周期：
  - `active` = 当前有效
  - `revoked` = 手滑撤销
  - `superseded` = 临时反悔 / 请求未通过 / 后续重新安排
- active 换休格点开后出现“↩️ 处理这次换休”
  - “撤销（手滑）”和“后续修改”都会恢复换休前休息日
  - 两者区别只在审计语义
  - 非 active 事件仍保留在人物历史，不删除
- 月度页新增“换休发起”和“个人调休”次数；“换休发起”只统计 active 换休
- 人物记录页显示双人换休与个人调休事件，并分别统计次数
- 人物记录顶部明确区分：
  - 🔄 发起换休
  - 🤝 参与换休
  - ↪️ 个人调休
- 人物记录支持筛选：全部 / 换休与调休 / 请假 / 缺勤
- 换休事件卡强调“与谁换”和“原休 → 改休”，所有历史事件都会保留并按时间倒序显示
- 周休息表可生成 A4 横向 PDF
- 月度汇总 PDF 也包含“换休发起”
- 人员新增 / 编辑 / 删除
- 人员头像导入
- 头像自动方形裁切并压缩为约 256×256 WebP
- Staff 历史记录
- Staff JSON 版本交接

### 可选岗位排班

原来的岗位排班保留在“排岗”页，不再是 Staff 默认首页：

- 岗位新增 / 编辑 / 删除
- 每天午班 / 晚班独立排班
- 岗位卡槽
- 待安排 / 休息 / 请假调休
- 人员头像轻点选择岗位
- 长按头像拖拽排岗
- 桌面原生 drag/drop
- 复制昨日同班次

### Staff 数据模型

核心 state：

```js
{
  version,
  people: [],
  roles: [],
  schedules: {},
  attendance: {},
  swaps: [],
  restMoves: [],
  weekPublications: {},
  history: [],
  syncMeta: {
    revision,
    updatedAt,
    contentHash,
    deviceName
  }
}
```

人员：

```js
{
  id,
  name,
  nickname,
  primaryRole,
  note,
  active,
  avatarStamp
}
```

排班：

```js
schedules[YYYY-MM-DD][lunch|dinner] = {
  assignments: {
    roleId: [personId],
    "__off": [personId],
    "__leave": [personId]
  }
}
```

未出现在任何 assignment 中的 active 人员 = “待安排”。

周休/出勤状态：

```js
attendance[YYYY-MM-DD][personId] = {
  status: "rest" | "leave" | "swap" | "absent",
  portion: "full" | "am" | "pm",
  note,
  updatedAt
}
```

没有 attendance 记录的日期默认视为正常上班。这样日常只记录“例外”，月底统计更干净。

换休事件单独保存在 `swaps[]`，不是简单把两个格子改成“调休”。一笔事件会绑定两个人、两个原休息日、交换后的日期、发起人和备注，因此可以统计谁经常主动换休。

v0.3.3 起，swap 还保存生命周期与换休前原始 attendance 快照。旧 swap 没有 status 时会在 normalize 阶段检查双方当前 `swapId`：
- 两边仍完整关联 → 迁移为 active
- 已经被手工改散 / 不再完整关联 → 迁移为 superseded，并从当前格子清除残留 ↔ 标记

因此旧的“幽灵换休计数”不会继续进入月度 active 统计。

个人休息日移动保存在 `restMoves[]`。此时原休息日会恢复为默认上班，目标日自动写成 `status: "swap"`。因此“调休”现在是一个**有来源的结果状态**，而不是新的随手标签。

周表发布记录保存在：

```js
weekPublications[weekStart] = [
  {
    version,
    publishedAt,
    publishedBy,
    changes,
    note,
    snapshot
  }
]
```

发布版本号和 Staff JSON 的 `syncMeta.revision` 是两套概念：
- 周表 v1/v2/v3 = 给群里看的某一周排休版本
- JSON revision = 本地数据交接版本

### Staff JSON handoff

普通“导出 Staff JSON”包含业务数据：
- 人员 / 岗位
- 排班
- attendance 周休 / 请假 / 缺勤
- swaps / restMoves
- weekPublications
- 历史
- revision/hash/deviceName

**普通交接 JSON 不包含头像图片。** 日常发群用这一份，体积更小。

“完整备份（含头像）”会在以上数据之外加入压缩后的头像 Data URL，用于换手机、灾备或完整迁移。导入器同时兼容普通 JSON 和完整备份。

导入保护逻辑与 Inventory 相同：
- 新版本：允许导入
- 旧版本：默认拦截
- 同版本同 hash：无需导入
- 同版本不同 hash：fork 冲突
- legacy：默认拦截
- 强制采用：二次确认并产生更高 revision

当前**不做自动冲突合并**。

### PDF

Staff PDF 完全在浏览器本地生成，不上传服务器。

实现方式：
1. Canvas 绘制 A4 横向排班表。
2. 画入岗位、人员、头像、休息/请假。
3. Canvas 生成 JPEG。
4. 前端包装成单页 PDF。
5. iOS 支持时调用 Share Sheet，否则下载文件。

---

## 5. UI 方向

整体：
- 深色
- 软圆
- iPhone 优先
- 不做传统企业 ERP 的密集表格感
- Emoji / 图片承担快速识别
- 手机上必须保留“点选操作”，不能只依赖拖拽

Hub 只负责模块入口，不堆业务按钮。

---

## 6. PWA / Service Worker

当前 cache：

```text
cassola-suite-v051
```

当前 CORE 必须包含：
- Hub CSS/JS
- Inventory CSS/JS
- Staff CSS/JS
- manifest
- icons

每次新增或修改资源时：
1. 检查 `sw.js` CORE。
2. 递增 cache 名。
3. 推到 `main`。
4. 检查 GitHub Pages Actions。
5. iPhone 端联网打开一次，彻底关闭 PWA，再重开。\n6. app.js 注册 Service Worker 时使用 `updateViaCache:'none'`，并在页面重新回到前台时主动 `reg.update()`，减少主屏 PWA 长时间卡旧版本。

---

## 7. 当前已知局限 / 后续方向

Inventory：
- 自动订货还没有真正按“下次供应商可到货日期”计算。
- JSON fork 只检测，不自动合并。
- v0.5 先实现手动价格 + IVA + 历史；PDF 报价自动解析 / SKU 映射尚未实现。
- 暂未做采购订单预计总额、实际采购总额和库存估值。

Staff：
- v0.3 的周休息表是真正主功能，需要在 iPhone 实机测试横向周表滚动、连续异常录入、周表发布和双人换休流程。
- 原岗位拖拽板保留为可选功能，仍需要真实 iPhone 触摸测试。
- 周表 / 月报 PDF 当前都是单页 A4 横向，人员非常多时会压缩布局。
- 请假 / 调休是记录功能，不是完整 HR 审批系统。
- 暂无工时统计、工资、打卡。
- 暂无权限系统。
- 暂无云同步。

如果未来多人同时高频编辑才考虑共享后端。不要为了两三个人的排班过早引入复杂云系统。

---

## 8. 新聊天窗口维护 SOP

Pietro 可以说：

> “Piccola，去翻 Pietro 的 -Piccola 仓库，先看项目交接和版本历史，继续维护 Cassola。”

接手步骤：

1. 打开 `Gewuerzei/-Piccola`。
2. 读 `PROJECT_HANDOFF.md`。
3. 读 `CHANGELOG.md`。
4. 查看 `main` 最新 commit。
5. 查看本次相关源码。
6. 不根据聊天记忆猜当前实现。
7. 维护 Inventory 时保护 `cassola_inventory_v01`。
8. 维护 Staff 时保护 `cassola_staff_v01` 与头像 IndexedDB。
9. 功能/架构变化时更新 handoff + changelog。
10. 更新 Service Worker cache 并检查 Pages 部署。

🗿 GitHub 是现场，handoff 是施工图，changelog 是工地日志。
