# Cassola Suite · Project Handoff

> 给下一次维护这个项目的 Piccola / 开发者看的交接文档。  
> **先读本文件，再读 `CHANGELOG.md`，最后核对 `main` 当前代码。仓库代码优先于聊天记忆。**

## 1. 项目身份

- Repository: `Gewuerzei/-Piccola`
- Default branch: `main`
- GitHub Pages: `https://gewuerzei.github.io/-Piccola/`
- 当前 Suite 结构: **主菜单 → Inventory / Staff**
- Inventory: **v0.6.2 · Week / Quarter / Year Archive**
- Staff: **v0.3.3 · Swap Lifecycle**
- Access: **v0.5 · Named Employee UI + Offline Outbox + SKU Proposals**
- 当前实现基线: **以 `main` HEAD 为准**（不在 handoff 硬编码 commit，避免文档漂移）
- iPhone 优先 PWA，offline-first
- Backend: **Supabase · Cassola Piccola Cloud**（project ref `ktdgxaxkuqwrdqttcajt`，Zurich / eu-central-2）
- 架构：**local-first + manual cloud sync**；JSON 保留为独立冷备份 / fallback
- Staff 当前仍为本地模块，不参与 Cloud v0.1 同步

仓库是公开仓库。**不要提交员工头像、真实员工名单、账号密码、API secret、工资或其他敏感经营数据。**

---

## 1.1 Access / Role Layer

Cassola 从 Pietro 单人工具扩展为 **Supervisor 总账 + 员工责任区盘货**。Access Code 必须在发布版本里预先登记，设备端不能自己创建管理员权限。

当前规则：
- PWA 打开后先进入 **Access Gate**
- `access-registry.js` 是角色登记表，只允许放匿名 credential id / role / scope / salt / hash
- **绝不能提交明文 Access Code，也不要提交真实员工姓名**
- 当前 credential：
  - `supervisor` → 完整 Hub / Inventory / Staff
  - `produce_a` → employee，scope = `category: 蔬果`
  - `produce_b` → employee，scope = `category: 蔬果`
- 同一责任区可以有多个员工 credential；身份槽位不同，但 scope 相同
- Access Code 使用随机 salt + PBKDF2-SHA256 派生值校验
- 角色会话只存在当前页面运行时；重新加载 PWA 重新要求输入 Access Code
- 连续输错 5 次，当前会话冷却 30 秒
- 静态 PWA 没有服务器，因此此机制是内部权限隔离 / casual access gate，不是高安全账户认证；短数字 code 理论上可离线穷举

Employee Mode 当前：
- 只显示 scope 允许的 SKU，不能进入 Inventory / Staff 管理界面
- 当前 `produce` scope 依据 `category = 蔬果`
- 员工只填写现场盘货数量
- 员工草稿使用独立 localStorage 前缀 `cassola_employee_count_v01`，**不得写入 `cassola_inventory_v01`**
- 导出格式：`cassola-employee-count-v1`
- scoped JSON 只包含该责任区已填写 SKU，不得夹带其他 scope SKU
- 包内使用匿名 `credentialId` 记录提交槽位，不暴露员工姓名
- 同责任区同一天共享 `effectiveKey = scopeId:date`
- 多人同日提交时，未来 Supervisor 导入器以 `submittedAt` 最新的一份作为 active；旧提交保留为 superseded 历史
- Supervisor 已支持导入 scoped JSON、差异预览和人工采用；同责任区同一天只允许一个 active submission

### Employee identity / offline / SKU proposal

- 公开仓库继续只保存匿名 credential：`produce_a / produce_b`。**真实员工显示名不得写入 GitHub。**
- 私有显示名保存在 Supabase `access_credentials.display_name`；Cloud 登录成功后只把当前 credential 的显示名返回客户端。
- 显示名会缓存到本机 `cassola_cloud_identity_v01`，因此同一设备以后离线 PIN 登录仍可显示“负责人：…”；从未联网过的新设备离线时显示通用员工名。
- Access Code 本地 PBKDF2 校验仍保留，所以**完全断网也能进入 Employee / Supervisor 本地界面**。
- Cloud SKU catalog 会缓存到 `cassola_employee_catalog_v01`；重新打开 PWA 且断网时，优先用最近一次 Cloud 正式目录，而不是退回旧 seed。
- Employee 盘货页操作区规则：使用 viewport `position: fixed` 的**四格胖胖 Dock**，从左到右为“清空 / 新 SKU / 上传 / JSON”；不得退回会在列表中途卡住的 sticky。若 Outbox 有待发送项，在“上传”格右上角显示独立 `待N` badge，员工点击 badge 才调用手动 Outbox flush，不能静默发送。员工 shell 必须保留足够 bottom padding，保证最后一个 SKU 不被 Dock 遮挡。
- 离线员工提交使用 `cassola_cloud_outbox_v01`。当前支持：
  - `employee_submission`
  - `sku_proposal`
- 恢复网络后 Cloud session 可自动重连，但**Outbox 不静默自动提交**；员工必须自己点击“上传待发送”。
- 员工可对 scope 内 SKU 提交：
  - `sku_change`：规格 / 库存单位 / 订货单位 / 包装倍率提议
  - `sku_issue`：只报告问题
  - `new_sku`：现场发现新 SKU，可带规格、单位、区域和现场数量
- 员工提议永远不能直接修改 canonical Inventory。Supabase 表：`employee_sku_proposals`。
- Supervisor 在本地明确“采用到本机”后才修改 Inventory；采用后仍需 Supervisor 自己上传 Cloud。
- 新 SKU 由员工提议采用后默认 `supplier = 待确认`、`autoOrder = false`，避免未经核对就进入自动订货。
- 单位输入提供常用建议，但允许自定义文本；所有自定义值都必须经过 Supervisor proposal review 才能进入正式 SKU。

### Employee submission import invariant

Supervisor 导入员工盘货包时必须遵守：
- 格式固定为 `cassola-employee-count-v1`
- credential 必须能在 `access-registry.js` 找到且 role = employee
- 包内 scope 必须与 registry 中该 credential 的 scope 完全一致
- 每个 counts SKU 都必须属于该 scope；出现越权 SKU 时整包拒绝，不能只忽略越权项
- 重复 `submissionId` 不能重复应用
- 员工端导出完整责任区快照，并携带 `scopeSkuIds`
- `effectiveKey = scopeId:date` 定义“同责任区同一天”
- 同一个 effectiveKey 只允许一个 `status = active`
- 新包只有 `submittedAt` 晚于当前 active 时才可覆盖
- 采用新版时旧 active 改为 `superseded`，保留历史
- 只有 Supervisor 明确点击“采用最新版”才修改正式库存
- 应用库存变化时继续写标准 `history`，并附 employee submission / scope / credential 元数据
- 审计数组：`employeeSubmissions[]`
- `employeeSubmissions[]` 必须进入 Inventory handoff snapshot / fingerprint，避免换 Supervisor 设备后丢失 active / superseded 语义

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
- `cloud-sync.js`
- `cloud.css`
- `employee-tools.js` / `employee-tools.css`
- `inventory-insights.js` / `inventory-insights.css`
- `analytics.js` / `analytics.css`
- `ui-extras.js` / `ui-extras.css`

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
- SKU 无 `orderUnit / unitsPerOrder` → 默认 `orderUnit = unit`、`unitsPerOrder = 1`
- 旧订单无采购包装快照 → 保持原 `unit`、倍率 1，不拿当前 SKU 新箱规重解释历史订单
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

### Dialog cancel / close invariant

所有位于 `<form method="dialog">` 内、语义为“取消 / 关闭”的按钮必须绕过表单校验：
- 推荐保留原生 dialog submit 关闭行为，并加 `formnovalidate`
- 不允许因为 `required` 字段为空而让 ✕ / 取消按钮失效
- 新增 dialog 时必须检查这一点

### I. 修改后固定走一遍发布闭环
1. 改源码
2. 静态检查 JS / DOM
3. 更新 handoff + changelog（架构或业务规则变化时）
4. 涉及 PWA 资源时 bump Service Worker cache
5. 检查 GitHub Pages Actions
6. iPhone 实机验证
7. 若实机结果与静态判断冲突，以实机为准继续修

---

## 2.2 Cassola Cloud v0.1

Cloud v0.1 的核心规则：

- **本地优先**：Inventory 正式本地工作副本仍是 `cassola_inventory_v01`。云端故障 / 断网不能阻止 Supervisor 进入和使用本地 Inventory。
- **下载永远手动**：PWA 只自动检查云端 Head 是否变化；不会自动把云端数据覆盖到本机。
- **上传可全店，也可单独 scope**：Supervisor 可上传全部四区，或只上传 Sushi / Cucina / Bar-Sala / Comune。
- **版本不按数字大小判断新旧**：每个 scope 使用 parent lineage。只有后代关系才叫“云端更新”；共同祖先后各自修改则为 branch / diverged。
- **分叉不会抢 Head**：基于非当前 Head 上传时，只创建 branch version，不修改 canonical `cloud_scope_heads`。
- **恢复不删历史**：从历史版本恢复会基于当前 Head 创建新的 restore version；旧错误版本继续保留审计。
- **当前状态 + patch + checkpoint**：Head 保存当前完整 scope state；普通版本只保存 patch；checkpoint 保存完整 state。
- **自动 checkpoint**：不是 cron 定时器，而是在 canonical upload 时检查。若距上次 checkpoint ≥ 14 天，则自动生成一次完整 checkpoint。
- **手动 checkpoint**：Supervisor 可随时对选定 scope 创建完整 checkpoint，并可填写备注。要保存本机尚未上传的状态，应先上传再创建 checkpoint。
- **JSON 永远保留**：下载云端前 PWA 会先自动导出一份完整本机 JSON 安全备份；设置页原有完整 JSON 导出继续存在。
- **Employee append-only**：员工联网时只上传新的 `employee_submission`，不能直接修改 canonical Inventory。JSON employee package 继续保留作离线备用。
- **Employee catalog**：员工联网登录时优先使用 Cloud canonical Head 汇总出的责任区 SKU 目录；只有 Cloud 尚未初始化或离线时，才退回员工设备自己的本机 catalog / seed。Supervisor 改 SKU 后需先上传 Cloud，员工下次联网打开即可取得新目录。
- **Staff 不同步**：Cloud v0.1 只覆盖 Inventory scope + employee submission inbox。

### Cloud scope

固定 scope：
- `sushi` = 🍣 Sushi
- `cucina` = 🔪 Cucina
- `bar` = 🍸 Bar / Sala
- `common` = 📦 Comune

全店不是一个“越来越大的 revision number”，而是四个 scope Head 的组合。Supervisor 拥有全店操作权，但 partial sync 仍是首等功能。

### Cloud service_role Data API invariant

- Supabase 创建项目时关闭了 “Automatically expose new tables”，因此新表不会自动获得 Data API CRUD grants。
- Cassola Edge Function 使用 server-side secret key / service role 通过 PostgREST 访问 Cloud 表。
- **service_role 必须拥有 Cloud 表的 SELECT / INSERT / UPDATE / DELETE 权限**；anon / authenticated 必须继续保持无直连表权限。
- 2026-10-06 曾出现实机“☁️ 未连接”：Edge Function 已收到 login，但读取 `access_credentials / access_rate_limits` 时因 service_role 只有 REFERENCES / TRIGGER / TRUNCATE 而被 PostgREST 403 拒绝。
- migration `cassola_cloud_v02_service_role_data_api_grants` 已补齐当前表与 future default privileges。
- 新建 Cloud 表后如果出现 Edge 内部 403，优先检查 `information_schema.role_table_grants`，不要误判为 PWA 网络 / PIN / RLS policy 问题。

### Supabase 数据结构

核心表：
- `cloud_scopes`
- `cloud_scope_heads`
- `cloud_versions`
- `cloud_checkpoints`
- `cloud_audit_events`
- `access_credentials`
- `access_sessions`
- `access_rate_limits`
- `employee_submissions`
- `employee_submission_items`

关键 RPC：
- `cassola_apply_upload_batch`
- `cassola_materialize_version`
- `cassola_create_checkpoint`
- `cassola_version_relation`
- `cassola_employee_submit`
- `cassola_employee_review`

Edge Function：
- `cassola-cloud`
- 自定义 Access Code → 短期 Cloud session
- 浏览器只持有临时 session token；数据库 secret 只存在 Edge 环境
- public / anon / authenticated 对 Cloud 表没有直接访问权限
- 所有 Cloud 表启用 RLS；没有开放 RLS policy 是刻意的 deny-by-default 设计

### Cloud 本地元数据

- `cassola_cloud_meta_v01`：每 scope 记录本机基于哪个 cloud version、local fingerprint、lastSyncAt 等
- `cassola_cloud_device_v01`：匿名设备 ID
- Cloud session token **不写入 localStorage**，只存在当前页面运行时

### Scope snapshot 当前包含

Inventory scope snapshot 包含：
- 当前 scope 的 SKU 主数据 / qty / 包装单位
- hidden SKU
- order draft
- history
- priceRecords
- placedOrders 中属于该 scope 的 item 与 receipt batch lines

跨区域供应商订单在 Cloud 层按 item 所属 area 拆分后，再按 order id 合并回本机。**把 SKU 从一个 area 移到另一个 area 属于跨 scope 变更，完成此类操作后优先使用“上传全店”。**

### Cloud UI / 交互

Supervisor：
- ☁️ 上传所选区域
- ⬇️ 下载所选区域
- ☁️ 上传全店
- ⬇️ 下载全店
- 📸 手动 checkpoint
- 🕰️ 版本历史 / restore
- 👷 云端员工盘货待审核
- ↻ 检查云端

自动检查时只比较 Head lineage 并提醒：
- ✅ same / 已同步
- 📱 same + local dirty / 本机有未上传修改
- ☁️ cloud descendant / 云端 Head 已变化
- ⚠️ cloud descendant + local dirty / 双方都有变化
- 🌿 diverged / 分叉

**任何状态都不会自动执行下载。**

## 2.3 UI / Intelligence Layer

新增模块：
- `employee-tools.js / .css`：员工 SKU 详情、规格/单位/新 SKU proposal、Supervisor review
- `ui-extras.js / .css`：设备本地主题 + 全局 command search
- `inventory-insights.js / .css`：盘货差异摘要 / 大幅变化复核
- `analytics.js / .css`：供应商战绩、Price Radar、Staff 检察院

### Theme
- localStorage：`cassola_ui_theme_v01`
- 外观：跟随系统 / 日间 / 夜间
- Accent：石墨 / 抹茶 / 海蓝 / 樱色
- Inventory 设置页与 Staff 设置页都提供同一套主题控件；两处入口共同读写同一个设备级 `cassola_ui_theme_v01`。
- Staff 不是独立主题。Inventory / Staff / Orders / Receiving 必须同时响应 `document.documentElement.dataset.theme / dataset.accent`。
- Access Gate / Supervisor Hub / Employee 全屏入口也必须响应设备主题；这些页面不能保留硬编码 `#101218` 石头洞背景。
- Orders / Receiving 与 Staff 的硬编码深色 surface 必须提供 light-theme override，不能出现“外层日间、收货卡仍黑色”的断层。
- Accent 按钮使用直接绑定的 click handler，并同步 `active / aria-pressed`；这是为 iPhone PWA 现场点击可靠性做的 hotfix，不要退回只靠 document delegation。
- 主题读取会校验 mode / accent 白名单；异常主题值只回退主题默认值，**不得清空任何 Inventory / Staff localStorage**。
- 主题是**设备个人偏好**，不进入 Inventory Cloud snapshot。

### Fat UI visual contract
- 2026-10-06 起 Inventory / Orders / Cloud / Employee / Staff 采用更圆润、更厚、更软的统一视觉层。
- 这是 **CSS-only visual pass**：只调整 radius / padding / control height / shadow / active state / bottom navigation，不改变 Inventory / Staff / Cloud 数据契约。
- 共享圆角变量当前提高到 `--radius-xl: 34px`、`--radius-lg: 29px`、`--radius-md: 22px`；主要触控按钮目标高度约 46–56px。
- Inventory / Staff 底部导航改为带外边距的浮动胖胶囊，并对 light theme 单独提供浅色背景。
- 维护时如果重写旧 CSS，必须保留各文件末尾的 `Cassola Fat UI v0.1` override，除非明确做完整视觉迁移。
- 不得为了视觉更新重置任何 localStorage / IndexedDB 数据。

### Global Search
Supervisor Hub / Inventory 顶部提供全局搜索。当前索引：
- SKU 名称 / 规格 / 供应商 / category / area
- Supplier
- 未处理订单
- 最近可比涨价 SKU
- Cloud 员工盘货 inbox
- Cloud SKU proposal inbox
- 供应商战绩
- Staff 检察院
- 外观设置

搜索是运行时索引，不另建重复业务数据库。

### Count difference review
批量盘货保存后：
- 继续写标准 `count` history，包括“数量未变”的盘货点，避免破坏周耗计算样本。
- UI 显示：完成项 / 有变化 / 大幅变化。
- 大幅变化只提醒，不阻止保存。
- 大幅判定目前综合绝对差值与比例阈值；可点“回盘货复核”重新定位这些 SKU。

### Stockout forecast
- `v3StockoutText(s)` 将历史周耗覆盖量转成近似天数。
- 低中期库存显示“预计约 N 天后见底 · 周X附近”；长周期改显示约 N 周。
- 这是基于历史平均周耗的**估算**，不应当成承诺日期。

### Analytics
- 供应商战绩：从 `placedOrders / lineStatus / receiptBatches` 推导订单数、结案准确率、少到/缺货率、挂起行；不另造人工评分。
- Price Radar：只比较同供应商、同规格、同报价单位且 IVA 基准可比的 priceRecords。
- Staff 检察院：只读扫描本地 `cassola_staff_v01` 的 missing person、孤立 swap/move、active swap 与当前 attendance 脱链等结构异常；**绝不自动修改 Staff 数据**。

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
- `employee-import.js`
- `inventory-prices.js`
- `access-registry.js`
- `hub.js`

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

### Order Inbox & Week / Quarter / Year Archive

“已下单”页面不再全量展开所有历史订单。视图规则：
- 未结案订单进入 **🔔 未结束工作区**，永远置顶
- 未结案订单内，只默认渲染仍需处理或待保存的 SKU
- 同单已处理 SKU 默认折叠，需要时点“查看已处理 N 项”再展开
- 顶部铃铛提供 **🎯 定位未处理**；连续点击依次定位当前工作区中的未处理 SKU
- 本周已结案订单直接显示为 **📅 本周已结案**
- 更早的已结案订单进入 **🗄️ 历史订单**
- 历史层级固定为：**年度 → 季度 → 周 → 订单**
- 周定义为周一到周日；跨年周使用周四作为年度 / 季度归属锚点，保证一整周不会被拆到两个父节点
- 年度 / 季度 / 周节点只渲染轻量计数；只有点开具体一周时才渲染该周完整订单卡片
- 这是视图 / DOM 按需加载优化，不删除、不裁剪 `placedOrders` 历史数据
- 订单与时间节点都按新到旧显示
- 不改变 `cassola_inventory_v01`

### Purchase Unit Layer

库存单位和采购单位是两个不同维度，不能再共用一个 `unit`：

```js
sku.unit           // 库存 / 最小包装，例如 包、盒、瓶
sku.orderUnit      // 采购 / 大包装，例如 箱、件
sku.unitsPerOrder  // 1 个采购包装 = 几个库存包装
```

规则：
- 例如 `unit = "包"`、`orderUnit = "箱"`、`unitsPerOrder = 10` → 1箱 = 10包
- 旧 SKU 自动兼容为 `orderUnit = unit`、`unitsPerOrder = 1`
- `state.order` 内部继续保存**库存单位数量**，避免已有草稿在后来补箱规后被错误重解释
- 草稿 UI / 手动订货输入显示采购单位；输入后先换算成库存单位再写入 `state.order`
- 自动订货先算需要补多少库存单位；有大包装时向上取整到完整采购包装
- 新 placed order 快照必须保存 `orderQty / orderUnit / unitsPerOrder`
- placed order 的 `orderedQty / actualQty / creditedQty` 继续以库存单位保存，保持收货幂等逻辑
- 收货 UI 按采购单位输入，保存时换算回库存单位入库
- 历史订单若没有采购包装快照，按倍率 1 保留当时语义，不能套用后来修改的 SKU 箱规
- 不改变 `cassola_inventory_v01`

### Supplier outbound order text

PWA 内部订单和发给供应商的文本是同一份数据的两个视图：
- 内部：保留 SKU、area、supplier、收货状态等结构化数据
- 外发：只生成供应商需要看的“商品名 + 数量 + 采购单位”纯文本；**不带 g/kg/L 等 SKU 规格**

规则：
- 草稿页按钮叫“📋 复制订货单”
- 若“全部供应商”下同时存在多家供应商草稿，必须先点具体 supplier tag，禁止把多家订单混在一份文本里
- 已下单卡片也提供“📋 复制订单”，可随时重新发给供应商
- 新建 placed order 仍保留 `spec` 作为内部快照，同时写入采购包装快照 `orderQty / orderUnit / unitsPerOrder`；外发文本不显示 spec

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
