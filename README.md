# 乾隆以降中国顶级家族与佛道儒政权明暗双线考据图谱

> **时间跨度**：1736（乾隆元年）— 至今 ｜ **空间轴线**：关外东北 → 华北京津晋鲁 → 江淮华中及江西 → 长三角 → 西南腹地 → 闽粤桂与港澳台海外 ｜ **状态**：`draft`（学术考据与交互可视化原型）

本项目以“实践唯实、去伪存真”为原则，剥离野史玄学与阴谋论附会，按照 **【档案确证】 / 【谱牒/口述线索】 / 【民间传闻/辨伪】** 三层证据体系，系统梳理自乾隆年间中国与欧美资本、传教士及全球贸易深度接触以来，全国 **34 个代表性家族与宗教/学术世家群落**、**12 件关键器物信物（“物”）**、**4 张时空交织关系网** 在清末、民国、抗战及 1949 年前后的**明暗双线演化脉络**。

---

## 目录结构

```text
historical traces/
├── index.html                           # 单页五视图交互式考据门户（零外部 CDN，兼容 file:// 与 Pages）
├── GEMINI.md                            # 项目规约与学术证据铁律
├── README.md                            # 本说明文档
├── .gitignore
├── .github/
│   └── workflows/
│       └── pages.yml                    # GitHub Pages 自动校验与发布工作流
├── assets/
│   ├── styles.css                       # 宣纸典藏亮色 / 墨玉夜间双模式样式表
│   └── app.js                           # 五视图交互逻辑、SVG 舆图与拓扑高亮引擎
├── data/
│   └── families.js                      # 34家族 × 4分期 × 12关键器物 × 4关系网 × 5专题 × 10档案库 × 7辨伪卡
├── docs/
│   ├── master-outline.md                # 总纲：方法论、四阶段宏观轴、北→南六大板块与档案指南
│   ├── topic-1-kinship-capital-net.md   # 专题一：清末民初“顶级姻亲＋资本互保网”全图
│   ├── topic-2-medical-lineages.md      # 专题二：京城、江南与江西樟树名医国药百年传承与政商暗线
│   ├── topic-3-1949-four-branches.md    # 专题三：1949年前后豪门与儒释道三统“四向分流”实录
│   ├── topic-4-offshore-capital.md      # 专题四：乾隆十三行至近代买办的欧美离岸资本暗线
│   └── topic-5-jiangxi-and-four-pillars.md # 专题五：江西枢纽与佛·道·儒·政权及“人—事—物”交织考
└── scripts/
    ├── verify.mjs                       # 零依赖 Node 校验脚本（数据一致性、坐标防碰撞、零外链检查）
    └── serve.mjs                        # 零依赖 Node 本地静态预览服务器（默认 127.0.0.1:4173）
```

---

## 快速本地预览与校验

1. **运行自动化自检**：
   ```powershell
   node scripts/verify.mjs
   ```
2. **启动本地 HTTP 预览（推荐）**：
   ```powershell
   node scripts/serve.mjs --port 4173
   ```
   浏览器打开 `http://127.0.0.1:4173/`。
3. **离线直接打开**：亦可直接双击根目录 `index.html`（采用纯局部脚本，无跨域阻塞）。

---

## GitHub Pages 上线指引

1. 在 GitHub 账号 `wole278` 下新建空仓库（建议命名为 `historical-traces`，可见性设为 `Public` 以启用免费 GitHub Pages）。
2. 关联远程仓库并推送 `main` 分支：
   ```powershell
   git remote add origin https://github.com/wole278/historical-traces.git
   git push -u origin main
   ```
3. 在仓库 `Settings → Pages → Source` 选择 **GitHub Actions**，`.github/workflows/pages.yml` 将自动运行 `node scripts/verify.mjs` 并发布至 `https://wole278.github.io/historical-traces/`。
