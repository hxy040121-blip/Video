# 夙与愿 · 设计系统与开发约定

这份文档是网站所有板块共同遵守的约定。网站是把仓库里这套角色扮演游戏（洋馆、十五席圆桌、十五组身份、受命与庭审）做成一件可交互的艺术作品：展示的是"游戏"本身，不是配置文件。

## 0. 硬性要求（主人的原话提炼）

- 设计感强，动效多，板块清晰、齐全。风格诡异、悬疑，参照《弹丸论破》《人狼村之谜》。
- **几乎不要文字和解释性说明。** 不写"本板块介绍……""点击这里可以……"这类话。能用画面、动效、声音表达的，不用文字。允许出现的文字：名字、时刻、编号、馆内广播原句、身份卡卡面原文、铜牌原文、人物台词、极短的氛围句（≤ 14 字）。操作提示只能是图形化的（光标形态、微动的箭头、呼吸的高光），最多两三个字（如「拖入席位」「翻面」）。
- 有音乐；鼠标移动要驱动动效变化。
- 角色画风统一。
- 是完整成品，不是 demo：每个交互都要做完整、做细，有过渡、有声音、有边界状态。
- 本地版本：双击 `index.html` 直接打开（`file://`），不需要服务器。

## 1. 技术约束（file:// 能跑）

- **不能用** ES module（`type="module"`）、`fetch`/XHR 读本地文件、`import`。所有脚本是普通 `<script>`，通过全局 `window.App` 协作。数据文件写成 `window.XXX = {...}`。
- 第三方库只用 `assets/vendor/` 里已有的：`gsap.min.js`、`ScrollTrigger`、`SplitText`、`Draggable`、`InertiaPlugin`、`CustomEase`、`ScrambleTextPlugin`、`Flip`、`Observer`、`lenis.min.js`。不得引用任何 CDN 或网络资源。
- 允许 Canvas 2D、WebGL1、Web Audio、CSS 3D、SVG 滤镜。不要依赖 WebGL2 专有特性。
- 目标：桌面 Chrome / Edge / Safari 最新版 1440×900 与 1920×1080 为主；手机（390×844）能正常浏览、不横向溢出，复杂交互可降级为点击。
- 性能：60fps 为目标。离开视口的板块必须暂停自己的 requestAnimationFrame/canvas 循环（用 `App.onVisible(el, fn)` 或 ScrollTrigger 的 onToggle）。
  - 每帧变化的值只改合成层的 `transform` / `opacity`（元素加 `will-change`）；不要每帧改 `clip-path`、`filter`、渐变位置、阴影或大面积元素的 CSS 变量——它们会让整块图层每帧重画。
  - 不要每帧在根元素或大容器上写 CSS 变量（会让上万个节点重算样式）。要光标坐标的元素用 `App.trackMouseVars(el)` 单独登记 `--mx/--my`。
  - 数值没变就不写；先集中读布局（getBoundingClientRect），再集中写。
  - 画质自适应：`App.quality.level`（2 全效果 / 1 / 0 最省）按真实帧时间自动下调，变化时广播 `App.bus` 的 `'quality'` 事件；画布分辨率、粒子数等按它取值。网址加 `?q=0/1/2` 可固定画质。
  - 高刷新率屏幕上动画循环跑在 刷新率÷n（约 80 帧起步，跟不上再降一档，见 `app.js`）。
- `prefers-reduced-motion` 时降低强度（不必完全关闭）。

## 2. 文件结构与分工

```
index.html                 页面骨架（所有板块容器与脚本顺序都已写好，板块开发者不改它）
assets/css/base.css        设计令牌、字体、通用组件（核心，板块开发者不改）
assets/css/<板块>.css      各板块样式，类名一律以板块前缀开头，如 .mansion-xxx
assets/js/core/*.js        核心：app / bg / cursor / scroll / hud / gate / audio
assets/js/sections/<板块>.js
assets/data/world.js       由 tools/build-data.mjs 生成：rooms / identities / prices / broadcasts
assets/data/characters.js  window.CHARACTERS：最早的 38 人
assets/data/characters-new.js  v4.71 新增的 15 人（push 进同一个 window.CHARACTERS，共 53 人）
assets/data/lines/a–f.js   window.TRIAL_LINES：模拟庭审台词池（每人 21 个场合、79 句；占位符 {X}{CLUE}{ROOM}{TIME}{V}）
assets/data/lore.js        window.LORE：房间氛围、线索模板、尸体变化、循环阶段、广播句式
assets/data/portrait-images.js   由 tools/portraits/export.py 生成（肖像位图清单）
assets/data/sigils.js      由 tools/build-art.mjs 打包 assets/art/sigils/*.svg 生成
```

板块与文件：

| 顺序 | id | 内容 | 文件 |
|---|---|---|---|
| — | gate | 遮幕/载入/「睁开眼睛」 | core/gate.js |
| 1 | prologue | 醒来：穹顶下的圆桌、十五把椅子、17:00 | sections/prologue.js |
| 2 | screening | 放映：宣传片（幕布预览 + 全屏放映，`App.screening.open()`） | sections/screening.js |
| 3 | mansion | 洋馆：四层平面、房间、光的时段 | sections/mansion.js |
| 4 | cast | 卡池：53 人的肖像长廊与档案 | sections/cast.js |
| 5 | table | 十五席：把人拖进席位 | sections/table.js |
| 6 | identities | 十五组身份牌，正位/逆位 | sections/identities.js |
| 7 | cycle | 受命 → 行凶 → 发现 → 调查 → 庭审 → 处刑 | sections/cycle.js |
| 8 | trial | 可玩的模拟庭审 | sections/trial.js |
| 9 | plaque | 价目铜牌与 150 枚金币 | sections/plaque.js |
| 10 | wish | 终章：只剩一人时的愿望 | sections/wish.js |

## 3. 视觉语言

**一句话：** 哥特洋馆的墨黑与暗金为底，弹丸论破式的荧光血粉做点缀；镜头感、硬切、斜切、墨迹晕开、红线相连。

### 3.1 颜色（`base.css` 的 CSS 变量，JS 里用 `App.color.xxx`）

| 变量 | 值 | 用途 |
|---|---|---|
| `--ink` | `#0a0809` | 底色 |
| `--ink-2` | `#120e10` | 次底色、卡片底 |
| `--ink-3` | `#1d1719` | 边框、分隔 |
| `--bone` | `#ebe3d6` | 主文字、骨白 |
| `--bone-dim` | `#a0968a` | 次文字 |
| `--ash` | `#5b534d` | 弱化 |
| `--brass` | `#c29a5b` | 洋馆、钥匙、铜牌、金币、编号 |
| `--brass-dim` | `#6f5532` | 暗金线条 |
| `--blood` | `#ff2e7e` | 荧光血粉：唯一的强调色，克制使用 |
| `--blood-deep` | `#a3104a` | 深血粉 |
| `--rust` | `#7d1616` | 干涸的血、逆位 |

规则：一屏里血粉的面积不超过 5%；它出现的地方就是视线焦点。逆位/受命/死亡相关用 `--rust` 与 `--blood`；洋馆与秩序相关用 `--brass`。

### 3.2 字体（已裁剪进 `assets/fonts/`）

| 变量 | 字体 | 用途 |
|---|---|---|
| `--f-display` | Noto Serif SC 900 | 巨大标题、名字。可竖排 `writing-mode: vertical-rl` |
| `--f-serif` | Noto Serif SC 400 | 正文、台词 |
| `--f-sans` | Noto Sans SC 500 | 小标签、数字说明 |
| `--f-brush` | Zhi Mang Xing | 血字、手写，偶尔用 |
| `--f-latin` | Cinzel | 拉丁装饰字，罗马数字、ROOM 07 之类 |
| `--f-mono` | Courier Prime + Noto Sans SC | 时刻、广播、打字机 |

字号用 `clamp()`。大标题字距收紧（`letter-spacing: -0.02em`），小标签拉开（`0.3em`，全大写拉丁）。

### 3.3 质感与通用效果（核心已提供）

- 全屏 WebGL 背景：墨色烟雾，被光标照亮、搅动；每个板块可设定自己的色调（见 §5 `palette`）。
- 胶片颗粒 + 暗角叠层；`App.glitch(el)` 色差抖动；`App.flash(color)` 全屏闪。
- 自定义光标：`[data-cursor="label"]` 让光标变大并显示 label；`data-cursor="drag"`、`"view"`、`"flip"` 等。所有可点元素都要设 `data-cursor`。
- 字体动效：`App.text.reveal(el)`（逐字从墨里浮出）、`App.text.scramble(el, text)`、`App.text.type(el, text, {speed})`（打字机，带音效）。

### 3.4 动效原则

- 进入视口的元素一律有入场动画（ScrollTrigger）。缓动以 `power3.out`、`expo.out` 为主，惊吓时刻用硬切（`steps(1)` 或 0 时长）+ 闪白/闪粉。
- 鼠标驱动：每个板块至少有一种跟随光标的变化（视差、光源、视线、倾斜、烟雾、声音滤波）。
- 板块之间要有连续感：上一板块的元素可以"带入"下一板块（如钥匙、椅子、红线）。

## 4. 角色肖像（53 张统一画风）

- 肖像是位图：每个角色一张官方原图，经同一套处理（动漫抠图、按双眼统一构图、暗金单色调色、只把虹膜染成血粉）做成 900×1200 的 WebP，透明背景，双眼约在画面 41% 高处、水平居中。流程与原图出处见 `tools/portraits/README.md`。
- 文件：`assets/art/portraits/<id>.webp`，清单 `assets/data/portrait-images.js`（`window.PORTRAIT_IMAGES`）。图片版权属于原作，不进公开仓库，只随本地成品包交付。
- 使用：`App.portrait(id, { mono, dead, silhouette, className, track, eyeRange })` 返回 `div.portrait.is-photo > img`。画像随光标微微偏转（`App.trackEyes` 写入 CSS 变量 `--pvx/--pvy`，-1..1）。`is-mono` 压暗、`is-dead` 灰暗、`is-silhouette` 纯黑剪影。缺图或图片加载失败时自动回落到统一的矢量剪影占位（带 `.p-eye/.p-iris`，眼珠追随光标）。
- 板块代码不能依赖 `.p-eye/.p-iris` 一定存在。

## 5. 板块开发约定（`App.section`）

```js
App.section('mansion', {
  palette: { a: '#1a1410', b: '#c29a5b', glow: 0.35 },   // 背景烟雾色调：a 底色、b 光色、glow 光强 0–1
  track: 'dread',                                         // 进入时切换的音乐：dread / gallery / investigation / trial / wish / silence
  mount(el) { /* 在 el（<section id="mansion">）里建 DOM，挂 ScrollTrigger */ },
  enter() {}, leave() {},                                  // 可选：进入/离开视口
})
```

- 只能在自己的 `<section>` 内写 DOM；需要全屏浮层时用 `App.overlay.open(node, {onClose})`。
- 只用 `App.bus` 事件和 `App.state` 与其他板块交流。约定的事件：
  - `cast:change`（table 发出，`App.state.seats` 为长度 15 的数组，元素是角色 id 或 null）
  - `section:enter` / `section:leave`（核心发出，参数为 id）
  - `time:set`（hud 发出，参数为馆内分钟数）
- 读写本地存储一律用 `App.store.get/set`（已包 try/catch）。
- 所有音效通过 `App.audio.sfx(name, opts)`；名称表见 §6。
- 肖像：`App.portrait(id, {mono, dead, silhouette, className, track})` 返回 `div.portrait`（位图肖像为 `.is-photo > img`），并自动注册随光标偏转。肖像缺失时自动返回统一的剪影占位。见 §4。
- 纹章：`App.sigil(name)` 返回身份纹章 SVG 元素（name 用身份中文名，如 `'法官'`）。

## 6. 音频接口（`App.audio`，由 core/audio.js 实现；放映宣传片时用 `App.audio.hush(true/false)` 让出声音）

- `App.audio.start()`：用户在遮幕上点击后调用（核心已做）。
- `App.audio.track(name)`：切换音乐，交叉淡化。`dread` 洋馆的日常（音乐盒 + 低频嗡鸣 + 钟摆），`gallery` 肖像长廊（缓慢的小调圆舞曲），`investigation` 调查（脉冲、钟表、紧张），`trial` 庭审（推进的节奏，弹丸论破式的紧迫感），`wish` 终章（破碎、变慢的音乐盒），`silence`。
- `App.audio.sfx(name, opts)`：`hover`、`click`、`tick`、`chime`（落地钟一声）、`chimes5`（17:00 五声）、`discover`（发现尸体的警示）、`flip`（翻牌）、`card`（发牌）、`coin`、`coins`、`stamp`（投票落定）、`vote`、`slash`（斜切转场）、`glitch`、`heartbeat`、`door`（门强行闭合）、`execute`（处刑）、`wrong`（误判）、`correct`、`type`（打字一下）、`whoosh`、`drop`（物件落在席位）、`bell`（敲钟人）、`dark`（盲视者黑暗）、`wind`。
- `App.audio.setMood({tension})`：0–1，影响滤波与节奏密度。
- 光标速度会自动调制音乐（核心已接好）。

## 7. 数据

配置文件是 v4.71（章节编号写作「## 5.」「### 5.1」）。`world.js` 只能由 `node tools/build-data.mjs` 重新生成，不手改；哪一处的标题或格式对不上，脚本直接报错。

- `WORLD.rooms[]`：`{floor, name, x0,x1,y0,y1, area, doors[], parent}`，单位米，原点在西南角，x 向东、y 向北，平面 52×36。共 106 间：物理层 1.3 的房间表，加上 1.2 末尾条目里写的楼梯厅与北前室（每层主楼梯厅、西北/东北楼梯厅、西北/东北前室，脚本按条目逐层展开，插在各层走廊之后）。`parent`（小室所属的大间）在 v4.71 的表里已删，脚本按坐标包含关系推出。`doors[]`：`{raw, open, axis, at, width, dir, to}`。
- `WORLD.identities[]`：`{no, front, back, state, noReverse, frontText, backText, notes}`。`frontText/backText` 是卡面原文，可以直接印在牌上（段落之间空一行）；`notes` 是主持人要点，不上牌。
- `WORLD.prices`：
  - `how[]`、`chapters[{title, items[{item, points} | {sub}]}]`：刻在铜牌上的「兑换方式」与第 1–6 节原文（章名写成「一、食物」……「六、离场」）。
  - `offPlaque`：第 10 节牌外价目，**不刻在铜牌上**，人物问了才知道。`{note, chapters[{no, title, items[{item, points}], note?, tiers?}]}`；火器一节（10.7）另有 `note`（每升一级乘 2）与 `tiers[{level, item, points 一把, round 弹药一发}]`，消音器在 `items` 里。
  - `void`：会让一次兑换「不成立」的条件。`{text 价目表 8.2 原段, kinds[{key, text}], result, other[{key, text}]}`；`kinds` 的 key：`power` 买回被封的本事、`super` 买带超常本事的东西、`ask` 打听受命者/身份/来历、`kill` 请主持人代杀、`bypass` 绕过门锁墙出口或联络馆外、`outsider` 买馆外的人进来；`other` 的 key：`round` 总价不是整百又不添东西凑满、`purse` 身上的金币不够、`repair` 修复身体残疾时请求的是治伤或对象没有卡上写明的残疾。结果一律是：不收金币，本人只得知不成立。
- `WORLD.broadcasts`：`{fixed[{when, text}], abilities[{kind, ability, text}]}`，`主持人游戏.md` 第 7 节机制广播的固定句式原文（〈〉里是要代入的内容；〈某某〉〈死者〉用此人自我介绍时报的名字，重名或没报名字的说「几号」）。
- `CHARACTERS[]`：见 `assets/data/characters.js` 顶部注释。名字有两个字段：`name` 是卡名（档案、卡池用）；`callName` 是此人在馆里自我介绍时报的名字（卡面「名字」一条，没写就是卡名去掉括号；L 是「龙崎」，鬼舞辻无惨是「东云」，漩涡长门是「佩恩」，宇智波带土不报名为 `null`）。广播与台词里的 {X}/{V} 代入 `callName`；同局两人报同一个名字（两位乔瑟夫、两位承太郎）或 `null` 时，改说「N 号」。
- `LORE`：见 `assets/data/lore.js` 顶部注释。线索模板的 `name` 会代入台词池的 {CLUE}，要读得通（「防御伤」「冷冻柜结冻」），证物卡上的短名另见庭审引擎。

## 8. 质量清单（每个板块交付前自检）

1. 在 1440×900、1920×1080、390×844 截图检查；无错位、无溢出、无控制台报错。
2. 文字少：删掉所有解释性句子。
3. 每个可交互元素：hover、按下、完成三种状态都有反馈（视觉 + 声音）。
4. 光标驱动的效果存在且顺滑。
5. 离开视口时动画循环暂停。
6. 与相邻板块的衔接自然。

## 9. 本局钱袋（`App.state.econ` · `App.econ`，core/app.js）

依据：价目表 8.1–8.2、第 9 节；开局流程 2.2；主持人游戏 8。规则里没有「钱袋」这件东西——它只是界面上「你身上带着的金币」。

- **一局一个。** 铜牌（plaque）与模拟庭审（trial）读写同一份；开新局整个换掉，**不跨局累积**，也不写进本地存储（刷新即无）。还没开过局时 `App.state.econ` 为 `null`：铜牌上第一次取币 / 兑换 / 问价时自动开一局「铜牌上的试玩」（盘里十五摞都在，你身上 0 枚）。
- **变化就广播** `App.bus` 的 `'econ:change'`（参数是钱袋本身）；`econ.last` 说明这一次是什么变化，监听者据此决定怎么演。`App.state.coins` 同步为 `econ.coins`（旧代码兼容）。

结构：

| 字段 | 含义 |
|---|---|
| `game` | 局号，每开一局 +1 |
| `source` | `'plaque'` 铜牌上的试玩 / `'trial'` 模拟庭审开的局 |
| `me`, `seat` | 「你」的角色 id 与席位号 1–15（号牌 = 套房号，服务在这间套房兑现）；未定为 `null` / `0` |
| `coins` | 你身上带着的枚数——只有这些能付账；没有账本、没有余额播报 |
| `spent` | 这一局你付出去的枚数 |
| `tray[15]` | 理币盘一列十五摞：`{ n 剩几枚, owner }`，owner：`null` 没人动过 / `'me'` 你的一摞 / `'other'` 别人的（你从中拿过）/ 角色 id（庭审开局各取一摞） |
| `grabbed` | 你从别人的那一摞里拿的枚数（抢夺不受惩罚，只是看得见） |
| `items[]` | 交付到你手边、还留着的东西：`{ name, pts 单价（分）, qty, kind: 'item' / 'service' / 'ticket', off 牌外? }` |
| `repaired` | `{ 角色 id: true }`：修复过身体残疾的人（卡上写明的残疾全部修好） |
| `asked` | `{ 牌外物品名: 分 }`：问过价的第 10 节物品（问了才知道，此后照这个价） |
| `exited` | `null` / `{ at 局内分钟, seat }`：持退出券离馆——**不是死亡**；离馆者退出游戏和愿望争夺 |
| `last` | `{ type, … }`，type：`new` / `take` / `gain` / `lose` / `pay` / `ask` / `me` / `exit` |

接口（除 `settle` 外都会改钱袋并广播）：

- `App.econ.newGame({ me, seats, source, taken, coins })`：开新局。庭审在 `startGame` 里调用 `App.econ.newGame({ me: S.me, seats: S.seats })`：`source` 默认 `'trial'`，模拟从规则宣告之后开始，有人坐的席位那一摞已被取走、你身上 10 枚，空席的那一摞还在盘里。
- `App.econ.ensure()`：当前这一局；没有就开一局铜牌试玩。`App.econ.get()`：当前这一局或 `null`。
- `App.econ.settle(list, econ?)`：**纯函数**，只检查不改。`list` 是名字或 `{ name, pts?, qty?, void?, repair? }` 的数组（名字查得到价时 `pts` 可省；`void` 是不成立类别的 key；`repair` 是修复的对象，省略时按名字「修复身体残疾」识别、修的是 `econ.me`）。返回 `{ ok, total 总价（分）, coins 要付几枚, reason, key, text, result, … }`，`reason`：`null` 成立 / `'empty'` / `'exited'` 已离馆 / `'void'` 不成立的请求 / `'repair'` 对象没有卡上写明的残疾（或已修过；`who` 为 `null` 表示还不知道「你」是谁）/ `'round'` 总价不是整百（`short` 还差几分）/ `'purse'` 身上的不够（`need` 还差几枚）。`text` 是 `WORLD.prices.void` 里对应的原文，`result` 是「不收金币……他只得知不成立」原句。检查顺序：离馆 → 不成立的请求 → 修复对象 → 整百 → 身上够不够（价目表 8.2：报价时就告知不成立的，不必凑整、不收钱）。
- `App.econ.pay(list)`：结算并付款、交付。成立时扣金币、记进 `items`（修复记进 `repaired`），返回值多一个 `items`（这一次交付的）；不成立时什么都不改，返回 `settle` 的结果。
- `App.econ.take(i)`：从理币盘第 i 摞取一枚，返回 `{ grab 是否别人的那一摞, left }`；第一次碰的那一摞是你的。
- `App.econ.gain(n, why)` / `lose(n, why)`：你身上多了 / 少了几枚（余波发放、拾取死者的金币、交易、被抢）。
- `App.econ.ask(name)`：问一件第 10 节物品的价（只对你报），记进 `asked`，返回分数；表上没有返回 `null`。
- `App.econ.exit({ at })`：持退出券要求离馆（手边须有一张退出券），成功返回 `true` 并设 `exited`。
- `App.econ.setMe(id)`：设定「你」是谁（铜牌上修复残疾时选人用；庭审开局由 `newGame` 带入）。
- 查询：`disability(id)` 卡上写明保留的残疾原文（乔尼、格里菲斯、格斯、宇智波佐助、香克斯、斑目貘；其余 `null`）；`canWalk(id)` 卡上的 canWalk，修复过的按能走算；`price(name)` → `{ pts, off }`；`plaqueList()` / `offList()` 铜牌条目与牌外条目（火器拆成「…，一把」「…，弹药一发」两条）；`trayLeft()` 盘里还剩几枚；`stacksLeft()` 还剩几摞；`hasTicket()`。
- 常量：`TOTAL` 150（开局全馆）、`TICKET` 500（一张退出券）、`BATCH` `[5, 10]`（每审结一批每人得 5–10 枚）、`VOID_ASKS` 几条典型的不成立请求 `{ label, key }`（谁是受命者 / 能打开正门的钥匙 / 能打出去的电话 / 买回被封住的本事）。

谁在用：铜牌（取币、兑换、便笺凑整、默念问价、修复、退出券）；终章（`wish.js` 理币盘按 `stacksLeft()` 画摞数，还没有钱袋就是空盘）；庭审（开局 `newGame`、余波 `gain`、局内兑换 `pay`、离馆读 `exited`）。旧的 `'trial:coins'` 事件：庭审还没用钱袋时由铜牌代为记进钱袋；`econ.source` 是 `'trial'` 之后铜牌不再重复记。
