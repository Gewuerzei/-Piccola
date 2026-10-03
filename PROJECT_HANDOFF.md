# Cassola Suite · Project Handoff

> 给下一次维护这个项目的 Piccola / 开发者看的交接文档。  
> **先读本文件，再读 `CHANGELOG.md`，最后核对 `main` 当前代码。仓库代码优先于聊天记忆。**

## 1. 项目身份

- Repository: `Gewuerzei/-Piccola`
- Default branch: `main`
- GitHub Pages: `https://gewuerzei.github.io/-Piccola/`
- 当前 Suite 结构: **主菜单 → Inventory / Staff**
- Inventory: **v0.3.1 · JSON Handoff**
- Staff: **v0.3 · Published Weekly Rest**
- 当前实现基线 commit（文档更新前）: `609f61456a4bdb3f7f1bd63460aa3a95374efca1`
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

### 核心流程

```text
系统建议
→ 订货草稿
→ 人工确认已下单
→ 已下单
→ 收货逐项核对
→ 实际到货
→ 库存增加
```

**计划订单绝不能直接算作实际到货。**

### 收货的重要产品决定

没有“一键全部到货”。

每一行必须明确：
- 修改实际数量，或
- “✕ 未到”，或
- “✓ 核对”

所有行审核完毕后才能完成收货。原因是避免漏送商品被偷懒式整单确认。

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

### Inventory JSON handoff

`v031-handoff.js` 提供：
- `revision`
- `contentHash`
- `deviceName`
- 导入预览
- 旧版本拦截
- 同 revision 不同 hash 的 fork 检测
- 强制采用需再次确认

---

# Staff

## 4. Staff v0.3 · Published Weekly Rest

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
- 支持真正的双人“换休”：
  - 从一个人的休息格进入“与他人换休”
  - 选择对方及对方本周休息日
  - 选择谁发起这次换休
  - 两人的休息日期成对交换
  - 记录发起人、双方、交换前后日期、备注和当时已发布周表版本
- 月度页新增“换休发起”次数，区分主动提出者和被动配合者
- 人物记录页显示换休事件，并统计累计主动发起次数
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

普通“导出 Staff JSON”只包含：
- 人员
- 岗位
- 排班
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
cassola-suite-v043
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
