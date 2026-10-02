# 十五席 · 工作转交

第一个会话在 2026-10-02 07:47 UTC 应主人要求停止，全部进度已推送到分支 `claude/game-showcase-site-r1zxga`（仓库 `hxy040121-blip/Video`）。新会话从这份文件开始。

## 转交提示词（主人复制给新会话的那段话）

> 你接手一个进行中的项目：为我的角色扮演游戏做一个艺术展示网站「十五席」。
> 仓库 https://github.com/hxy040121-blip/Video ，分支 claude/game-showcase-site-r1zxga（在这个分支上继续开发和推送）。
> 开工前先读 docs/HANDOFF.md（需求原话、已定决定、各板块进度、已知问题、下一步），再读 docs/design-system.md 和 docs/handoff/briefs/。
> 第一件事是立绘：38 张初稿我不满意（效果差、画风不对），全部要重画。先按 docs/handoff/briefs/portrait-samples.md 做三种新画风的样张给我挑，我选定之前不要画全部。
> 用中文和我交流；有问题在开始工作前先问我；自己多轮审核修改，最后交付完整版本，不要 demo 或示例。

## 主人的需求（原话）

> 网站需要富有设计感，有足够多的动效，板块清晰、齐全。风格诡异、悬疑，类似弹丸论破或人狼村之谜。角色风格统一，可以去网上寻找素材或者自己重新画。我不要看到一个简陋的网站。网站中我不要见到大量文字或者解释性说明，我要一个艺术性质的网站，充分发挥你的设计能力。网站需要有音乐，要实现随鼠标指针移动的动效变化等。你自己进行多轮审核和修改，最后交付给我完整版本，我不要看到demo或者示例。先制作本地版本即可。有任何问题在开始工作前先问我

网站展示的是游戏本身，不是配置文件。配置原文在仓库根目录：`主持人游戏.md`、`洋馆物理层.md`、`开局配置.md`、`运行规则.md`、`身体结算.md`、`价目表.md`、`人物卡/`。

## 已定的设计决定（主人六问全选 A，不要再问）

1. 角色立绘由 Claude 自己重新绘制，统一画风，不用网上图片。
2. 卡池放全部 38 张人物卡，另有一张十五席圆桌，由观众挑人入座。
3. 身份牌展示逆位：默认正位朝上，点击翻面看逆位。
4. 音乐是网页实时合成的原创配乐；`assets/audio/tracks.js` 留了接口，主人可换成自己的 mp3。
5. 有一场可以玩的模拟庭审：投票、并列重投、身份能力、处刑演出。
6. 配色：哥特墨黑 + 暗金黄铜为底，弹丸论破式荧光血粉 `#ff2e7e` 点缀。

其他约定：桌面优先，手机也能看；双击 `index.html` 就能打开，不联网、不安装任何东西。

## 主人的最新反馈：立绘

38 张赛璐璐画风初稿（`assets/art/portraits/*.svg`）被否决：「初稿的效果过于差了，风格也不对，继续这样的工作是浪费」。问题在于像廉价的扁平头像生成器：模板脸、塑料感平涂、毫无诡异和张力。

当时的计划：先出三种新画风的样张（A 黑影 / B 墨影 / C 铜版，每种画 L、江之岛盾子、宇智波鼬），拼成对比图让主人挑，选定后再重画全部 38 张。三位样张画师刚开工就被停下，**没有产出任何样张**，需要从头做。方向说明和技术要求都在 `docs/handoff/briefs/portrait-samples.md`。

旧稿暂时留在目录里当占位（各板块通过 `App.portrait(id)` 读取打包后的 `assets/data/portraits.js`）。新稿只要保持同样的 SVG 结构，重跑 `node tools/build-art.mjs` 后整站自动换上。结构上必须遵守的三条见 `assets/art/portraits/_STYLE.md` 第 0 节（`.p-iris` 的裁切要挂在外包组上；`.p-eye`/`.p-iris` 不写 `transform`；画面外的形状要用 600×800 的 frame 裁掉）。

## 各部分进度

| 部分 | 文件 | 状态 |
|---|---|---|
| 核心框架 | `assets/js/core/{app,bg,cursor,scroll,hud,gate,main}.js`、`assets/css/base.css` | 完成：WebGL 烟雾背景随光标照亮、颗粒、光标、Lenis 滚动、HUD 时钟、睁眼开场 |
| 音频 | `assets/js/core/audio.js` | 完成：六首曲子（dread、gallery、investigation、trial、wish、silence）与 25 个音效；`node tools/test-audio.mjs` 通过 |
| 数据 | `assets/data/{world,characters,lore}.js` | 完成。`world.js` 由 `tools/build-data.mjs` 从配置生成 |
| 身份纹章 | `assets/art/sigils/*.svg`（29 枚）→ `assets/data/sigils.js` | 完成，质量好，保留 |
| 立绘 | `assets/art/portraits/*.svg`（38 张） | 初稿被否决，全部重画（见上） |
| 醒来 prologue | `sections/prologue.js`、`css/prologue.css` | 未完成。`prologue.js` 里是写到一半的穹顶议事厅 Canvas 渲染器 `App.domeHall`（留有 `/*__R3__*/`、`/*__RENDERER__*/` 占位标记），还没有 `App.section('prologue')` 注册；CSS 是空壳。brief：`dome.md` |
| 洋馆 mansion | `sections/mansion.js`、`css/mansion.css` | 大体完成。停下时正在修两处：打开房间时舞台消失；SVG 里极小字号的文字让 Chrome 图层膨胀到约 24000px（卡顿）。brief：`mansion.md` |
| 卡池 cast、十五席 table | `sections/{cast,table}.js` 与 css | 未开始（空壳），依赖新立绘。brief：`cast.md` |
| 身份 identities | `sections/identities.js`、`css/identities.css` | 大体完成：发牌、扇形、聚焦、翻面看逆位。待修：箔光把文字染紫；扇形后排的牌半透明，出现条纹；聚焦视图会被意外关闭（在查 `closeFocus` 的调用方）。brief：`identities.md` |
| 受命 cycle | `sections/cycle.js`、`css/cycle.css` | JS 写了一版（约 100 KB）但从未渲染检查；CSS 是空壳。brief：`cycle.md` |
| 庭审 trial | `sections/{trial-engine,trial}.js`、`css/trial.css`、`tools/test-trial.mjs` | 基本完成：从入局一直玩到终局；引擎 73 项断言全过（`node tools/test-trial.mjs`），120 局自动模拟都能结束。停下时在改：能力按钮把「取消」放第一个、能力结算时隐藏按钮、不重复提供已排队的能力。brief：`trial.md` |
| 铜牌 plaque | `sections/plaque.js`、`css/plaque.css` | JS 与 CSS 各写了一版，从未渲染检查。brief：`plaque.md` |
| 愿望 wish | `sections/wish.js`、`css/wish.css` | 未开始（空壳）。按 brief 复用 prologue 的 `App.domeHall`。brief：`dome.md` |

停下时所有 JS 文件都能通过 `node --check`，但没有做完整的整站巡检；接手后先跑一遍 `node tools/tour.mjs --out <临时目录>/tour`，看截图和 `errors.txt`。

## 下一步（建议顺序）

1. **立绘样张**：按 `portrait-samples.md` 做 A/B/C 三个方向的样张，拼成一张对比图给主人挑。等主人选定。
2. **重画 38 张立绘**：先定样板与规范，再并行画，最后统一审校（放在一起看是否像同一位画师），重跑 `node tools/build-art.mjs`。
3. **板块收尾**（可与 1、2 并行）：修洋馆与身份的已知问题；给受命写 CSS 并检查；检查铜牌；收尾庭审的能力按钮改动；完成醒来与愿望；新立绘出来后做卡池与十五席。
4. **整站多轮审查**：`tools/tour.mjs` 跑桌面 1440×900 与手机 390×844，控制台零错误；文字极少；动效、音乐、光标反馈都在。
5. **交付**：提交并推送到本分支，打包 zip 给主人，说明双击 `index.html` 即可打开。交付前可以删掉 `docs/handoff/` 与本文件。

## 技术要点与坑

- **必须能从 file:// 打开**：不能用 ES modules，不能 fetch。所有脚本是经典脚本，共享全局 `window.App`；数据文件写成 `window.X = {...}`。脚本顺序见 `index.html`（vendor → data → core → sections → main）。
- 库已放在 `assets/vendor/`：GSAP 3.13（含 ScrollTrigger、SplitText、Draggable、InertiaPlugin、CustomEase、ScrambleText、Flip、Observer）与 Lenis 1.3.4。运行时不加载任何网络资源。
- 板块写法：`App.section(id, { palette, track, mount, enter, leave })`。核心 API（`App.portrait`、`App.sigil`、`App.overlay`、`App.flash`、`App.slash`、`App.glitch`、`App.shake`、`App.text.*`、`App.bus`、`App.state.seats` 等）见 `assets/js/core/app.js` 与 `docs/design-system.md`。板块 CSS 类名用板块前缀，不写全局选择器。
- 音频只通过 `App.audio.sfx(name)`、`App.audio.track(name)`、`App.audio.setMood()` 调用。
- 字体（Noto Serif SC、Noto Sans SC、Zhi Mang Xing、Cinzel、Courier Prime，均为 OFL）用 `tools/subset-fonts.py` 裁剪成 woff2，收录 GB2312 一级字加仓库里用到的全部字。网站新增了不常见的字后要重跑（需要 Python 的 fonttools 与 brotli）。
- 改了配置文件后跑 `node tools/build-data.mjs`；改了立绘或纹章后跑 `node tools/build-art.mjs`。
- 检查工具（都要 Playwright）：
  - `tools/shot.mjs`：单个板块截图，可传 `--click`、`--eval`、手机尺寸，并打印控制台错误。用法见文件开头。
  - `tools/tour.mjs`：整站巡检。
  - `tools/render-svg.mjs`：把 SVG 渲染成 PNG 或对比图，`--look 1,0` 检查眼珠平移。
  - 这些脚本找不到 `playwright` 包时，会退回到 `/opt/node22/lib/node_modules/playwright`（第一个会话的环境）。换了环境就先 `npm i -D playwright` 或改这个路径。
- 无头浏览器用软件 WebGL 渲染，帧率大约每秒 1 帧，这是环境问题；逻辑与布局仍然必须正确。
- 并行分工的经验：每个代理只改自己的文件；辅助脚本放各自的临时目录，否则会互相覆盖。
