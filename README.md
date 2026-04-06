# H5 扫雷 (Minesweeper)

经典扫雷的 HTML5 实现：纯静态页面、无构建步骤，支持桌面鼠标与手机触屏，含本地排行榜与玩法说明。

| 项目     | 说明        |
| -------- | ----------- |
| 当前版本 | v1.0.0      |
| 类型     | 益智 / H5   |
| 许可     | [MIT](LICENSE) |

<!-- 可选：在推送 CI 后，将下方 OWNER/REPO 换成你的 GitHub 仓库以显示构建状态 -->
<!-- [![CI](https://github.com/OWNER/REPO/actions/workflows/ci.yml/badge.svg)](https://github.com/OWNER/REPO/actions) -->

## 功能概览

- **难度**：入门 5×5 / 3 雷（新手友好），初级 9×9 / 10 雷，中级 16×16 / 40 雷，高级 16×30 / 99 雷（默认选中入门）  
- **首点安全**：第一次点击后再布雷，且排除该格及周围 8 格  
- **计时与雷数**：首次翻开后计时；剩余雷数 = 总雷数 − 旗数  
- **标记**：右键或触屏模式循环「无 → 旗 → 问号」；翻开模式下长按未翻格可快速标记  
- **Chord（快捷展开）**：中键或左+右同时按在数字格上；触屏使用「展开」模式点数字格  
- **经典灰阶 UI**：浅色凸起格、标准数字配色  
- **排行榜**：`localStorage` 按难度分别保存最快用时 Top 10（仅胜利局）  
- **响应式**：根据视口自动调整格子大小  

## 快速开始

**方式一：直接打开**

用浏览器打开仓库根目录下的 `index.html` 即可。

**方式二：本地静态服务（推荐，避免部分浏览器对 `file://` 的限制）**

```bash
npm start
```

（无需安装依赖：`serve` 由 `npx` 按需拉取。）

浏览器访问：<http://localhost:8080>。

若未安装依赖，也可使用：

```bash
npx --yes serve -l 8080 .
```

## 部署到 GitHub Pages

本仓库已包含 **GitHub Actions** 工作流 [`.github/workflows/pages.yml`](.github/workflows/pages.yml)，推送至 `main` / `master` 后自动发布；根目录的 **`.nojekyll`** 用于关闭 Jekyll，避免纯静态资源被错误处理。

### 推荐：用 GitHub Actions 发布

1. 打开仓库 **Settings → Pages**。  
2. **Build and deployment** 里，**Source** 选择 **GitHub Actions**（不要选 “Deploy from a branch”，否则会与下面工作流重复或冲突）。  
3. 将代码推送到 `main`（或 `master`）。在 **Actions** 中应出现 **Deploy Pages** 并成功；首次需在 **Settings → Pages** 里确认环境 `github-pages`（按提示批准一次即可）。  
4. 部署完成后，**Settings → Pages** 顶部会显示站点地址，一般为：

   `https://<你的用户名>.github.io/<仓库名>/`

游戏内链接均为**相对路径**（`style.css`、`help.html` 等），在子路径下可正常加载。

### 备选：从分支发布（不使用 Actions）

若你更希望不用 Actions：

1. **Settings → Pages** 里 **Source** 选 **Deploy from a branch**。  
2. Branch 选 `main`，目录 **`/ (root)`**，保存。  
3. 保留仓库根目录的 **`.nojekyll`**，避免 Jekyll 干扰。

> 若已启用 Actions 部署，请勿再同时用 “branch + root” 双源发布，任选其一即可。

## 仓库结构

```
h5-minesweeper-game/
├── .github/
│   └── workflows/
│       ├── ci.yml       # 推送/PR 时校验 game.js 语法
│       └── pages.yml    # 推送 main/master 时部署 GitHub Pages
├── .nojekyll            # 关闭 Jekyll（Pages 用）
├── audio/
│   └── game_mario2.mp3  # 背景音乐（循环）
├── index.html           # 游戏主页
├── game.js              # 游戏逻辑
├── style.css            # 样式
├── help.html            # 玩法说明
├── leaderboard.html     # 排行榜
├── package.json         # 脚本与元数据（无 npm 依赖）
├── LICENSE              # MIT
├── README.md
├── CONTRIBUTING.md
├── SECURITY.md
├── CHANGELOG.md
└── .gitignore
```

## 技术栈

| 技术 | 用途 |
| ---- | ---- |
| HTML5 | 结构 |
| CSS3 | 经典扫雷风格、响应式布局 |
| 原生 JavaScript | 游戏逻辑与 DOM，无框架 |
| localStorage | 排行榜持久化 |

## 本地校验

```bash
npm run lint:js
```

等价于 `node --check game.js`，与 CI 一致。

## 浏览器支持

现代浏览器（支持 ES5+、Pointer Events、`localStorage`）。建议在 **Chrome / Firefox / Safari / Edge** 最新版本使用。

## 贡献

见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 安全

若发现安全问题，请按 [SECURITY.md](SECURITY.md) 说明反馈。

## 更新日志

见 [CHANGELOG.md](CHANGELOG.md)。

## 许可证

[MIT License](LICENSE)
