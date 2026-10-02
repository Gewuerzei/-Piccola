Cassola Inventory v0.2 · Soft UI
======================

用途：Pietro 自用、离线优先、单机本地库存管理。

已包含：
- SKU 图标与软圆卡片 UI
- Cassola 常用 SKU 分类清单
- 当前库存查看/搜索
- 快速整轮盘货
- 到货 / 报损 / 手动调整
- 通用“内部转换”（例如 Avocado硬 → Avocado半硬 → Avocado软）
- 订货草稿（与实际库存完全分开）
- 按供应商查看和复制订单
- 历史记录
- JSON 完整备份 / 恢复
- Service Worker 离线缓存

重要：
PWA 的离线缓存第一次需要通过 HTTPS 网站打开一次。
不能直接从 iPhone“文件”App用 file:// 打开后期待 Service Worker 生效。

安装到 iPhone：
1. 把本文件夹内容上传到任意静态 HTTPS 托管。
2. 用 Safari 打开网址。
3. 分享 → 添加到主屏幕 → 作为 Web App 打开。
4. 首次打开并加载完成后，可断网继续使用。

数据：
- 库存、历史、订单草稿保存在该 Web App 的浏览器本地存储中。
- 没有服务器账号，也不会自动同步。
- 建议定期：设置 → 导出完整备份 → 保存到 iPhone“文件”。

版本：v0.2 · Soft UI
