# Cassola Suite · Project Handoff

> 给下一次维护这个项目的 Piccola / 开发者看的交接文档。  
> **先读本文件，再读 `CHANGELOG.md`，最后核对 `main` 当前代码。仓库代码优先于聊天记忆。**

## 1. 项目身份

- Repository: `Gewuerzei/-Piccola`
- Default branch: `main`
- GitHub Pages: `https://gewuerzei.github.io/-Piccola/`
- 当前 Suite 结构: **主菜单 → Inventory / Staff**
- Inventory: **v0.7 · Product Families + Week / Quarter / Year Archive**
- Staff: **v0.4.4 · Staff Cloud + Shared Role Tasks**
- Access: **v0.12 · Shared Role Tasks + Packaging Reports + Employee SKU Proposal Center**
- 当前实现基线: **以 `main` HEAD 为准**（不在 handoff 硬编码 commit，避免文档漂移）
- iPhone 优先 PWA，offline-first
- Backend: **Supabase · Cassola Piccola Cloud**（project ref `ktdgxaxkuqwrdqttcajt`，Zurich / eu-central-2）
- 架构：**local-first + manual cloud sync**；JSON 保留为独立冷备份 / fallback
- Staff 已加入 Cloud：人员表 / attendance / swaps / restMoves / schedules / weekPublications / history 进入独立 `staff` scope；头像仍只在本机 IndexedDB / 完整备份

仓库是公开仓库。**不要提交员工头像、真实员工名单、账号密码、API secret、工资或其他敏感经营数据。**

---

## 1.1 Access / Role Layer

Cassola 从 Pietro 单人工具扩展为 **Supervisor 总账 + Staff 人员 + 员工任务入口**。Supervisor / legacy credential 仍可预登记；Staff 人员现在可由 Supervisor 在运行时开通随机 Employee PIN，不需要每次改公开仓库。

当前规则：
- PWA 打开后先进入 **Access Gate**
- `access-registry.js` 只保留公开仓库可接受的 legacy / bootstrap credential 元数据；只允许匿名 credential id / role / scope / salt / hash。
- **绝不能把真实员工姓名或运行时生成的员工 PIN 提交到 GitHub。**
- Staff 管理页可为某个 `personId` 开通 managed Employee Access：Cloud 生成随机 6 位 PIN、PBKDF2 verifier 与匿名 credential id。
- 因 Supervisor 明确要求以后能再次查看员工 PIN，managed employee PIN 的可恢复副本只保存在私有 Supabase `access_credentials.managed_pin_plaintext`；该表对 anon / authenticated 无直连权限，只能由 authenticated Supervisor session 经 Edge Function 读取。PIN 不进入 Inventory / Staff JSON、公开 GitHub 或 audit payload。
- 登录验证仍使用 `salt + PBKDF2-SHA256 hash`；明文副本不是登录验证来源。
- 当前 credential：
  - `supervisor` → 完整 Hub / Inventory / Staff
  - `produce_a` → employee，scope = `category: 蔬果`
  - `produce_b` → employee，scope = `category: 蔬果`
- 同一责任区可以有多个员工 credential；身份槽位不同，但 scope 相同
- Access Code 使用随机 salt + PBKDF2-SHA256 派生值校验。
- managed employee 第一次在某台设备成功联网登录后，该设备只缓存**这个成功使用过的 credential** 的 verifier 到 `cassola_access_offline_v01`，以后可离线登录；不再把所有未来员工 verifier 预编译进公开 PWA。
- 在线时 Cloud 对 PIN 的判断优先于本机旧 verifier；PIN 已被重置 / 停用时，联网设备不能拿旧缓存绕过。完全离线设备无法知道 Cloud 刚刚撤销了旧 PIN，这是 offline-first 的已知物理边界。
- 角色会话只存在当前页面运行时；重新加载 PWA 重新要求输入 Access Code
- 连续输错 5 次，当前会话冷却 30 秒
- 静态 PWA 没有服务器，因此此机制是内部权限隔离 / casual access gate，不是高安全账户认证；短数字 code 理论上可离线穷举

Employee Mode 当前：
- 只显示 scope 允许的 SKU，不能进入 Inventory / Staff 管理界面
- 当前 `produce` scope 依据 `category = 蔬果`
- 员工界面有三个页签：`📋 盘货` / `🚚 收货` / `📦 SKU`
- 盘货继续填写完整责任区 / published task 现场数量；收货页只有在 Supervisor 明确授权后才显示任务，否则固定显示“无任务”
- `📦 SKU` 是额外功能口，不替代 Supervisor Inventory 的 SKU Manager。员工可以提议新 SKU、新分类、重新归类和规格 / 包装异常；全部必须 Supervisor 审核后才进入 canonical Inventory。盘货 SKU 与已授权收货 SKU 都可以直接打开“🧪 现场规格 / 包装不一致”。
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
- Supervisor 已授权的员工收货任务会缓存到 `cassola_employee_receipt_tasks_v01`；员工曾联网取得任务后，在短暂离线场景仍能继续填写这份任务。
- Employee 盘货页操作区规则：使用 viewport `position: fixed` 的**四格胖胖 Dock**，从左到右为“清空 / 新 SKU / 上传 / JSON”；不得退回会在列表中途卡住的 sticky。Dock 必须 `bottom: 0`，由 Dock 自己用 `env(safe-area-inset-bottom)` 吃掉 iPhone Home Indicator 安全区，不能同时在外层容器重复计算安全区。若 Outbox 有待发送项，在“上传”格右上角显示独立 `待N` badge，员工点击 badge 才调用手动 Outbox flush，不能静默发送。员工 shell 只保留与 Dock 实际高度匹配的 bottom padding，保证最后一个 SKU 可完整滚到 Dock 上方。
- 离线员工提交使用 `cassola_cloud_outbox_v01`。当前支持：
  - `employee_submission`
  - `sku_proposal`
  - `employee_receipt`
- 恢复网络后 Cloud session 可自动重连，但**Outbox 不静默自动提交**；员工必须自己点击“上传待发送”。
- 员工可对 scope 内 SKU 提交：
  - `sku_change`：库存规格 / 品牌 / 库存单位 / 订货单位 / 包装倍率提议
  - `sku_issue`：只报告问题
  - `new_sku`：现场发现新 SKU，可带商品卡 / 商品族、品牌、库存规格、单位、区域和现场数量
- 员工提议永远不能直接修改 canonical Inventory。Supabase 表：`employee_sku_proposals`。
- Supervisor 在本地明确“采用到本机”后才修改 Inventory；采用后仍需 Supervisor 自己上传 Cloud。
- 新 SKU 由员工提议采用后默认 `supplier = 待确认`、`autoOrder = false`，避免未经核对就进入自动订货。
- 单位输入提供常用建议，但允许自定义文本；所有自定义值都必须经过 Supervisor proposal review 才能进入正式 SKU。Supervisor 审核 `sku_change` 时有两条明确路径：**更新当前 SKU**，或 **＋ 新建规格 SKU**。后者保留原 SKU 不动，新 SKU 继承同一 `familyId / familyName`，初始库存为 0。

### Employee loss / conversion facts
- 员工 SKU “查看详情”可记录两类**今日库存事实**：
  - `loss`：🗑️ 报损，必须填写数量与原因
  - `transfer`：🔄 内部转化 / 熟化，只允许已配置的 SKU 对
- 当前内置转化关系：
  - `avocado_hard → avocado_half / avocado_soft`
  - `avocado_half → avocado_soft`
  - `mango_hard → mango_soft`
  - SKU 若未来存在 `conversionTargets[]`，优先使用该配置。
- 员工事件保存在自己的 `cassola_employee_count_v01` 当日草稿 `events[]`，与完整责任区 count snapshot 一起上传 / JSON 备用；**事件本身不会直接修改 Supervisor Inventory**。
- Supervisor 采用员工 submission 时：
  1. 先把 loss / transfer 写入标准 Inventory `history`
  2. 再以员工完整 count snapshot 作为最终现场库存
  3. 因此不会出现“盘货数字已经包含报损，又额外再减一次库存”的双扣问题。
- 周耗算法继续使用原公式区分 arrival / loss / transfer；员工报损不是正常消耗，员工内部转化也不是正常消耗。
- 同责任区同一天的新 submission supersede 旧 active submission 时，旧 submission 对应的 history 保留审计但标记 `employeeSuperseded=true`；`v3WeeklyUse` 必须忽略这些旧记录，避免重复计算事件。
- Cloud Edge 会再次验证事件 source / target scope、数量、库存单位与允许的 conversion pair；浏览器提交不能绕过责任区。

### Employee authorized receiving
- 员工**不能自己领取收货任务**。只有 Supervisor 在某张未结案 placed order 上点击“👷 授权员工收货”，员工的 `🚚 收货`页才会出现任务；没有授权时显示“无任务”。
- 授权以 **order + SKU lines** 为单位，并再次按目标 employee credential 的 scope 过滤。Cloud Edge 会重新核对 canonical SKU 是否属于员工 scope。
- 同一订单同一 SKU 在 `authorized / submitted` 状态下不能同时分配给多个员工；Edge 会拒绝重叠授权，防止重复现场收货。
- Supervisor 可在授权 Dialog 看到本单当前 `authorized / submitted` 任务；`authorized` 尚未提交的任务可以撤销。
- 员工收货填写的是**本次到货量（order unit）**，不是累计库存。每行必须明确：
  - `received` 收齐
  - `later` 晚到 / 待补
  - `other` 待他人核对
  - `out` 缺货结案
  - `short` 少到结案
  - `over` 多到结案
- 员工提交格式：`cassola-employee-receipt-v1`。提交后 Cloud task 从 `authorized → submitted`，员工任务立即消失；**仍然不会直接修改 Supervisor Inventory / placedOrders**。
- 收货现场每个 SKU 行都有 **🧪 现场规格 / 包装不一致**。它复用 SKU proposal 流程，只提交事实，不会修改本次收货换算或 canonical SKU；若包装倍率与授权快照不一致，Supervisor 必须先核对，不能拿新包装偷偷套旧倍率入库。
- Supervisor 在 `☁️ Cloud → 🚚 收货审核`里明确“✓ 确认入账”后，才会：
  1. 把 employee reported quantity 按授权时冻结的 `unitsPerOrder` 换回 stock unit
  2. 增加 SKU qty
  3. 写标准 `arrival` history
  4. 生成正式 `receiptBatches[]`
  5. 更新 `creditedQty / lineStatus / order status`
- 正式 receipt batch 写入 `employeeReceiptTaskId / employeeReceiptSubmissionId / employeeCredentialId`，保证本机重复审核时可检测“本机已入账”，Cloud 标记失败时只补记 review，不能二次加库存。**不要把私有 display_name 写入 Inventory history / receiptBatches**；正式账只保存匿名 credential id，Supervisor review UI 运行时再从私有 Cloud directory 显示真实负责人名。
- 如果授权以后 Supervisor 本机又发生其他收货，审核时必须显示 drift 警告；员工 report 仍按“本次新增”追加，Supervisor 必须人工确认不是同一批货重复记录。
- 如果授权后订单包装换算发生变化，员工提交不得直接应用，必须拒绝并重新授权。
- 收货授权 / submission 使用 Supabase `employee_receipt_tasks` 表；生命周期：
  `authorized → submitted → accepted / rejected`，另有 `revoked`。
- 收货任务不是 canonical Inventory Head；它属于 Cloud 协作 / inbox 层。Supervisor 确认到本机后，仍需按原规则由 Supervisor 自己上传 Inventory Cloud。
- 离线 receipt submission 进入 `cassola_cloud_outbox_v01`，恢复网络后仍然必须员工主动点“上传待发送”，禁止静默提交。若任务在离线期间被 Supervisor 撤销，员工下一次**手动** flush 时该 receipt outbox 行会标记为失效并移除，不会偷偷入库。

### Employee SKU proposal center
- Employee `📦 SKU` 页是 **Inventory SKU Manager 的额外入口**，不是迁移 / 剪切。Supervisor 原有 Inventory → 新建 / 编辑 / 删除 SKU 功能继续是 canonical 管理入口。
- 员工当前可提交：
  - `new_sku`：新 SKU，包含名称 / 规格 / 单位 / 分类 / 供应商 / 区域 / 可选现场数量
  - `new_category`：独立新分类提议
  - `sku_reclassify`：把已有 SKU 建议改到已有或新分类
  - `sku_change`：规格 / 单位 / 订货包装异常
  - `sku_issue`：只报告问题
- proposal 只是事实 / 建议。Edge Function 只做结构、scope、数值合法性验证；**业务上是否采用由 Supervisor 决定**。例如员工把 SKU 名写成胡话，Cloud 可以接收为待审核文本，但不会自动创建 canonical SKU。
- 新分类批准后进入 Inventory `state.customCategories[]`；Inventory 分类筛选和 SKU Manager datalist 会动态显示它。自定义分类随普通 Inventory JSON 保存，并通过 `common` Cloud scope 同步 standalone category registry。
- `sku_reclassify` 批准后才改 `sku.category`，并写标准 adjust history。
- 新 SKU 批准后才创建本机 SKU；employee-provided category / supplier 会进入本机记录，仍由 Supervisor 在采用前负责核对。
- 动态 Staff employee 的 proposal 可来自其当前 active task scope。新 SKU / 新分类允许提出“现场发现”；已有 SKU 的 reclassify / sku_change 仍必须是该 credential 当前 scope 内可见 SKU。
- migration `cassola_cloud_v05_employee_sku_proposal_types` 将 proposal type check 扩展为 `new_category / sku_reclassify`。

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
- **Staff 独立 scope**：Staff Working Head 使用 `staff` scope；下载仍手动，上传仍遵守 parent lineage / branch 规则。人员、岗位、attendance、换休、个人调休、排岗、周表发布版本与 history 会同步；头像不会进入 Staff Cloud。
- **Staff 周表发布是显式 Cloud 动作**：本地生成 v1/v2/v3 后，如果 Supervisor Cloud 已连接，会同时尝试上传 Staff Working Head。遇到 lineage 分叉只生成 branch，不抢 canonical Staff Head。
- **Staff 任务发布与 Staff Head 分开**：给员工发布盘货 SKU 使用 `employee_inventory_tasks` 事务表，不把“今天谁盘什么”硬塞进 Staff 主数据。

### Cloud scope

固定 Cloud scope：
- `sushi` = 🍣 Sushi
- `cucina` = 🔪 Cucina
- `bar` = 🍸 Bar / Sala
- `common` = 📦 Comune
- `staff` = 👥 Staff

Inventory 的“上传全店”仍只指前四个 Inventory scope；Staff 用自己的上传 / 下载入口。整个 Suite 不使用一个越来越大的全局 revision number。

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
- `employee_receipt_tasks`
- `employee_inventory_tasks`
- `staff_role_inventory_task_rules`

关键 RPC：
- `cassola_apply_upload_batch`
- `cassola_materialize_version`
- `cassola_create_checkpoint`
- `cassola_version_relation`
- `cassola_employee_submit`
- `cassola_employee_review`

Edge Function：
- `cassola-cloud`（当前生产 v17；支持 Inventory/Staff lineage、managed Staff Access、personal + shared first-wins role task basket、employee count / packaging + brand SKU proposal / Supervisor-authorized receiving，并由 Edge 再验证 credential / task / scope）
- 自定义 Access Code → 短期 Cloud session
- 浏览器只持有临时 session token；数据库 secret 只存在 Edge 环境
- public / anon / authenticated 对 Cloud 表没有直接访问权限
- 所有 Cloud 表启用 RLS；没有开放 RLS policy 是刻意的 deny-by-default 设计

### Cloud 本地元数据

- `cassola_cloud_meta_v01`：Inventory 四区与 `staff` scope 都记录本机基于哪个 cloud version、local fingerprint、lastSyncAt 等
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

### Inventory Cloud iOS / PWA download rollback
- Inventory Cloud 下载与 Staff Cloud 一样，**不再在下载前强制触发 Blob / JSON 文件导出**。iOS PWA 对 programmatic download 可能弹 `Load Failed`，这不是 Cloud Head 损坏。
- Inventory 下载流程：
  1. 先读取所选 Cloud Head
  2. 确认存在正式数据后，把当前完整 Inventory + `cassola_cloud_meta_v01` 存为 `cassola_inventory_cloud_rollback_v01`
  3. 再应用所选 scope
- Cloud 设置卡新增 `↩️ 恢复下载前 Inventory`。这是整套 Inventory 的本机回滚点，适合下载后立刻发现不对时恢复。
- 原手工 JSON 导出能力不删除，只是不再作为 Cloud 下载前置步骤。

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

### Product Family / SKU Card Layer

Inventory v0.7 把“商品卡”和“具体库存 SKU”分开，但**没有合并或改写任何 SKU 库存账**：

```js
sku.familyId      // 同商品卡的稳定分组 key
sku.familyName    // 卡面名称，例如 Ikura / Burro / Surimi
sku.brand         // 可选品牌，例如 恒丰 / Kikkoman
sku.spec          // 库存规格，例如 500g / 1kg / 20张
sku.unit          // 库存单位，例如 盒 / 包 / 瓶
```

规则：
- **卡 = 商品族，展开行 = 具体 SKU**。同一 `familyId` 的不同规格 / 品牌 SKU 在库存首页折叠进同一张卡；展开后每个 SKU 仍有自己独立的库存、订货、价格、预警、历史与收货。
- 旧数据不清库迁移：`v3NormalizeSku()` 为没有 family 字段的 SKU 自动补 `familyName = name`、`familyId = v6FamilyKey(familyName)`；因此原本同名的 Burro、Panna、Ikura 等不同规格会自然归到同卡。
- 名字不同但业务上属于同商品的现有 SKU 有显式 family defaults，例如 Gamberi rossi 大 / 小、Scampi 大 / 小、Surimi / Surimi恒丰、白 M / L 手套；Surimi恒丰的“恒丰”进入 `brand`。
- **不要**把状态转换 SKU 折叠成一个库存实体。Avocado 硬 / 半硬 / 软、芒果 硬 / 软继续保持独立，因为它们参与内部转化 / 熟化语义。
- `v3Skus()` 只改变显示排序，不改变 `state.skus` 本体顺序 / id；同分类内按商品卡、品牌、规格邻近显示。
- 多规格卡面优先显示可可靠换算的**标准化总量**，例如 `1kg/包 × 4 + 500g/包 × 3 → 5.5 kg`；同时保留实际包装数量摘要。
- 标准化总量只是展示层计算，不写回库存。只有 kg/g/L/ml/颗/张/片/个 等能明确解析且同维度时才求和；范围规格或无法确认的规格宁可显示混合规格 / 包装数，不能猜。
- Supervisor SKU Manager 可手动编辑“商品卡 / 商品族”和“品牌”。把两个 SKU 填成同一个商品卡名，会得到同一个 family key 并折叠显示。
- 员工现场规格提议若代表真正的新包装，Supervisor 可选择 **＋ 新建规格 SKU**。新 SKU 继承原商品卡，原 SKU / 历史不变。
- family / brand 字段随普通 Inventory scope Cloud snapshot / JSON 同步，不另建独立 Cloud Head。
- `state.version = 7`；仍使用原 `cassola_inventory_v01`，禁止为这个功能清库重建。
### Purchase Unit Layer

库存单位和采购单位是两个不同维度，不能再共用一个 `unit`：

```js
sku.spec           // 库存规格，例如 500g / 1kg / 20张
sku.unit           // 库存单位，例如 包、盒、瓶
sku.orderUnit      // 订货单位，例如 箱、件
sku.unitsPerOrder  // 1 个订货单位 = 几个库存单位
```

规则：
- UI 术语固定为 **库存规格 / 库存单位 / 订货单位 / 1订货单位=N库存单位**。不要再写“最小包装 / 大包装”。例如 `unit = "包"`、`orderUnit = "箱"`、`unitsPerOrder = 10` → 1箱 = 10包
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

## 4. Staff v0.4 · Staff Cloud + Managed Employee Tasks

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

### Staff Cloud iOS / PWA download rollback
- **不要在 Staff Cloud 下载前强制触发浏览器文件下载。** iOS PWA 对 programmatic Blob download 可能直接弹 `Load Failed`，这不是 Cloud 数据坏了。
- Staff Cloud 下载现在先向 Cloud 读取 Head，确认存在后，把当前 `cassola_staff_v01` 保存为本机 `cassola_staff_cloud_rollback_v01`，然后才应用 Cloud Staff。
- 这个 rollback 是**本机快照**，不包含头像 blob；头像本来就在 Staff IndexedDB，Cloud 下载也不会删除它们。
- Staff 设置 → Staff Cloud 提供 `↩️ 恢复下载前版本`。恢复时会保留当前设备名并提升本机 revision。
- 手工“导出 Staff JSON / 完整备份”按钮仍然保留，只有用户主动点击时才触发文件导出。

### Employee 收货提交按钮 / toast 层级
- 2026-10-06 实机出现“员工收货点提交没反应”。Cloud 日志显示该时段没有 `receipt_submit` POST，任务仍为 `authorized`，说明请求在浏览器端校验阶段就停了。
- 根因之一是 `.toast z-index:50`，而 Employee 全屏 shell 是 `z-index:250`；缺少收货状态 / 数量不合法时，校验 toast 实际弹了但被 Employee shell 完全盖住，看起来像按钮没反应。
- toast 已提升到 `z-index:500`；收货提交按钮现在在网络请求期间显示 `⏳ 正在提交…` 并禁用，异常 / 失效会明确 alert。
- 不要把“没看到提示”误判为 Cloud 没收到；先看 Edge 日志是否真的出现 `receipt_submit` 请求。

### Staff Cloud / Managed Employee Access / 盘货任务

Staff v0.4 把原来的本地人员表提升为多 Supervisor 共用的 Staff 主数据层，但仍保持 local-first：

- Staff Cloud scope snapshot 包含：`people / roles / schedules / attendance / swaps / restMoves / weekPublications / history`。
- `syncMeta.deviceName / revision` 继续是本机信息，不作为共享业务主数据。
- **头像不进入 Cloud**。Cloud capture 会剥离 `people[].avatarStamp`；下载 Staff 时按 `personId` 保留当前设备已有的本地 avatarStamp / IndexedDB blob。
- Staff 设置页提供：`☁️ 上传 Staff / ⬇️ 下载 Staff / 🕘 云端历史`。下载前自动导出一份普通 Staff JSON。
- 其他 Supervisor 必须明确下载 Cloud Head 才覆盖本机 Staff；不会后台静默合并。
- 周表 `📣 发布 vN` 保留原本 immutable snapshot 语义，并在 Cloud 已连接时同时尝试上传 Staff Head。PDF 继续只是打印 / 微信 / 外发出口，不再承担数据同步职责。

Staff 人员与 Access 分层：

- `people[].id` = “这个人是谁”的稳定 Staff person id。
- `access_credentials.staff_person_id` = 这个 Staff person 绑定的登录 credential。
- Supervisor 在“编辑人员 → Employee Access”可生成、查看、复制、重新生成、停用员工 PIN。
- managed PIN 随机生成；重新生成会撤销当前 Cloud sessions。完全离线旧设备仍可能使用旧 verifier，直到下次联网。
- 删除 Staff 人员时，若 Cloud 可用，会先停用其 managed credential；停用 managed credential 也会 revoke 其 active inventory tasks。
- legacy `produce_a / produce_b` 继续兼容，不强制迁移。

Staff 人员页可直接 **📋 发布盘货任务**。v0.4.1 起不再把“供应商 / 分类 / 区域 / 单独 SKU”当成互斥发布方式，而是一个 **SKU 任务篮子**：

1. 可连续加入一个或多个 `supplier`，例如“大兴 + 米兰”
2. 可加入一个或多个 `category`
3. 可加入 `area`
4. 可补充任意单独 `sku`
5. 最终 SKU 集合自动去重，一次发布成为一张 task

因此单次 task 可以跨供应商，也可以“供应商整组 + 几个单独 SKU”。任务发布后仍冻结 `resolved_sku_ids + sku_snapshot`。之后新增同分类 / 同供应商 SKU **不会自动加入旧任务**；员工做到一半时也不会被偷偷塞 SKU。临时补充 SKU 应发布第二张补充任务。一个员工的 active count tasks 仍禁止 SKU 重叠，避免同一实体出现在两张同时有效的盘货快照中。

Employee 端盘货页会显示 Staff 发布的任务卡。存在多个任务时可切换；每个任务有独立当日 draft / `effectiveKey = task:<taskId>:<date>`。managed employee 没有任何 active count task 时，盘货页明确显示 **“无任务”**。

员工提交 Staff task count 后仍走原 Supervisor 审核：
- Cloud Edge 验证 task 属于当前 credential、状态 active、count SKU 集合与冻结 snapshot 完全一致。
- submission 继续落入 `employee_submissions / employee_submission_items`，并带 `inventory_task_id`。
- Supervisor 采用后才修改 canonical Inventory。
- JSON 手工导入仍只信任公开 registry；动态 Staff credential 的 JSON 只有从 Cloud inbox 进入时才可按 Cloud 已验证 task scope 导入，避免任意本地 JSON 冒充动态员工。

### Staff 岗位共享盘货任务
- 除了“给某个人发布任务”，Staff 还可以在 **设置 → 岗位 → 📋** 给整个岗位发布一份 SKU task basket。
- 例如：`Maki = 大兴 + 蔬果 + 单独 Wakame`。发布时冻结最终 `resolved_sku_ids + sku_snapshot`。
- **v0.4.4 起岗位任务是真正的一张共享任务，不再给岗位里的每个人复制一张 task。**
- 同一岗位所有 active managed employees 都能看到同一个 `rule_id` / task id；本机 draft 仍按 credential 分开，所以两个人可以各自盘，但 Cloud 只接受第一个完整提交。
- **first-wins 语义**：第一个员工提交成功后，`staff_role_inventory_task_rules.status = completed`，记录 `completed_by_credential_id / completed_at / winning_submission_id`。其他岗位成员下一次刷新时任务消失；若他们同时或离线稍后提交，Cloud 返回 `inventory_task_not_active`，Outbox 把它标为失效，不会生成第二份有效 submission。
- first-wins 由数据库事务函数 `cassola_submit_shared_role_count` + row lock 保证，不依赖前端“谁快一点”的猜测。
- 岗位任务绑定人员档案的 **`primaryRole`（主要岗位）**，不是某一天排岗板上的临时 lane。临时去别的岗位帮忙不会改变长期盘货责任。
- managed credential 的 `staff_role_id` 只表示岗位成员关系：
  - Cloud 已连接：保存人员时立即同步 role
  - Staff canonical upload：再次 batch 对齐 roster，补偿离线修改
  - Staff branch upload 不改变员工岗位
- 新加入某岗位的人，只要有 active Employee Access，就立刻能看到该岗位当前 active shared rule；先入岗位、后生成 PIN 也一样。
- 离开岗位后不再看到该岗位共享任务；进入新岗位后看到新岗位当前 active rule。
- credential scope = **个人 active tasks + 当前岗位 active shared rule** 的 SKU 并集。岗位任务完成 / 撤销后会刷新成员 scope。
- 一个岗位当前只允许一份 active shared rule。要改岗位责任，先撤销旧 rule，再发布新版本；禁止原地修改冻结任务。
- 岗位共享任务与个人补充任务可以并存，但 SKU 不得重叠。若岗位 rule 与成员现有个人 task 重叠，岗位发布 / 岗位变更会被阻止。
- Supabase：`staff_role_inventory_task_rules` 是共享岗位任务本体；个人任务仍在 `employee_inventory_tasks`。共享岗位 submission 通过 `employee_submissions.role_task_rule_id` 回指岗位 rule。
- migrations：
  - `cassola_cloud_v06_staff_role_inventory_tasks`：岗位绑定 / role rule 基础
  - `cassola_cloud_v07_shared_role_tasks`：first-wins shared rule / atomic submission

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
- v0.4 的周休息表仍是真正主功能，需要在 iPhone 实机测试横向周表滚动、连续异常录入、周表发布、双人换休、Staff Cloud 上传/下载、人员 PIN 管理和任务发布流程。
- 原岗位拖拽板保留为可选功能，仍需要真实 iPhone 触摸测试。
- 周表 / 月报 PDF 当前都是单页 A4 横向，人员非常多时会压缩布局。
- 请假 / 调休是记录功能，不是完整 HR 审批系统。
- 暂无工时统计、工资、打卡。
- Staff Cloud 当前仍是**手动 Working Head 同步**，不是多人实时协同编辑器；同时编辑会按 lineage 进入 branch / diverged，而不是 last-write-wins。
- managed employee PIN 是店内分流权限，不按国防级凭证设计；6 位 PIN + verifier 缓存的离线暴力破解风险属于已接受的内部工具威胁模型。
- Staff task basket 当前是“多个 selector 的并集 + 去重”，不支持 NOT / AND 交集等任意布尔表达式。
- 已发布任务不可原地追加 SKU；这是保护员工半成品 draft / Offline Outbox / complete snapshot 语义的刻意不变量。

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
