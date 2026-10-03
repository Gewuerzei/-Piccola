# Cassola Suite · Project Handoff

> 给下一次维护这个项目的 Piccola / 开发者看的交接文档。  
> **先读本文件，再读 `CHANGELOG.md`，最后核对 `main` 当前代码。仓库代码优先于聊天记忆。**

## 1. 项目身份

- Repository: `Gewuerzei/-Piccola`
- Default branch: `main`
- GitHub Pages: `https://gewuerzei.github.io/-Piccola/`
- 当前 Suite 结构: **主菜单 → Inventory / Staff**
- Inventory: **v0.3.1 · JSON Handoff**
- Staff: **v0.1 · Staff Board**
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

## 4. Staff Board v0.1

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

### Staff 当前功能

- 主菜单进入 Staff
- 人员新增 / 编辑 / 删除
- 人员头像导入
- 头像自动方形裁切并压缩为约 256×256 WebP
- 岗位新增 / 编辑 / 删除
- 每天午班 / 晚班独立排班
- 岗位卡槽
- “待安排”
- “休息”
- “请假 / 调休”
- 人员头像轻点后选择岗位
- 长按头像拖拽排岗
- 桌面原生 drag/drop
- 复制昨日同班次
- Staff 历史记录
- Staff JSON 版本交接
- 一键生成 / 分享单页 A4 横向 PDF

### Staff 数据模型

核心 state：

```js
{
  version,
  people: [],
  roles: [],
  schedules: {},
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

### Staff JSON handoff

Staff JSON 会同时包含：
- 人员
- 岗位
- 排班
- 历史
- revision/hash/deviceName
- 压缩后的头像 Data URL

因此 Staff JSON 比 Inventory JSON 大一些，但几十名员工仍适合群聊交接。

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
cassola-suite-v04
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
5. iPhone 端联网打开一次，彻底关闭 PWA，再重开。

---

## 7. 当前已知局限 / 后续方向

Inventory：
- 自动订货还没有真正按“下次供应商可到货日期”计算。
- JSON fork 只检测，不自动合并。

Staff：
- Staff v0.1 需要真实 iPhone 触摸测试，尤其是长按拖拽。
- PDF 当前是单页 A4 横向，人员/岗位非常多时会压缩布局。
- “请假 / 调休”当前作为排班状态和历史记录，不是完整 HR 请假审批系统。
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
