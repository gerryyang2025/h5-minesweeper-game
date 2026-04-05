# 贡献指南

感谢你愿意为本项目出力。

## 开发方式

1. Fork 本仓库并创建分支：`git checkout -b feature/your-change`
2. 修改后本地打开 `index.html` 或使用 `npm start` 自测
3. 运行 `npm run lint:js` 确保 `game.js` 无语法错误
4. 提交 Pull Request，说明改动动机与测试方式

## 代码约定

- 保持 **无构建、无框架**：继续以原生 HTML/CSS/JS 为主，避免引入打包链除非有充分理由
- 改动尽量 **聚焦单一目的**，避免无关格式化或大范围重排
- 新功能请同步更新 **README.md** 或 **CHANGELOG.md**（如适用）

## 问题反馈

请在本仓库的 **Issues** 中提交，并尽量说明：浏览器与系统、复现步骤、期望行为与实际行为。
