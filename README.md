# 夙与愿

这套杀人推理角色扮演游戏的配置文件（`运行规则.md`、`主持人游戏.md`、`洋馆物理层.md`、`开局配置.md`、`身体结算.md`、`价目表.md`、`人物卡/`），以及根据它们制作的展示网站。

## 打开网站

双击 `index.html`，用 Chrome、Edge 或 Safari 打开即可，不需要联网，也不需要安装任何东西。点「睁开眼睛」后开始播放音乐（浏览器要求先点一下才能出声）。右上角可以关掉声音，旁边的放映按钮随时可以播放宣传片。

板块依次是：醒来、放映、洋馆、卡池、十五席、身份、受命、庭审、铜牌、愿望。

## 角色肖像

38 张肖像是用各作品的官方原图统一抠图、构图、调色做成的（暗金单色），版权属于原作，只适合本地自用。因此肖像图片（`assets/art/portraits/*.webp`）不放进公开仓库，只在本地成品包里；只有代码仓库时，网站会把每个人显示成剪影。加工流程、原图出处和重新生成的方法见 `tools/portraits/README.md`。

## 宣传片

`assets/video/promo.mp4` 是主人的宣传片，在「放映」板块和顶栏的放映按钮里播放；播放时网站配乐自动淡出。封面是 `assets/video/promo-poster.jpg`。

## 换成自己的音乐

网站的配乐是网页里实时合成的原创音乐。想换成自己的曲子：把音频文件放进 `assets/audio/`，在 `assets/audio/tracks.js` 里填上文件名。

## 改了配置之后

网站的数据从配置文件生成。改了洋馆、身份或价目表后，在仓库根目录运行：

```
node tools/build-data.mjs
```

人物卡提炼出的数据在 `assets/data/characters.js`；身份纹章在 `assets/art/sigils/`（改完运行 `node tools/build-art.mjs` 重新打包）。网站新增了不常见的字时，运行 `python3 tools/subset-fonts.py <字体源目录>` 重新裁剪字体。

## 目录

| 位置 | 内容 |
|---|---|
| `index.html` | 网站入口 |
| `assets/js/core/` | 背景、光标、滚动、遮幕、HUD、音频引擎 |
| `assets/js/sections/` | 各板块 |
| `assets/data/` | 由配置生成的数据 |
| `assets/art/` | 角色肖像（本地）与身份纹章（SVG） |
| `assets/video/` | 宣传片与封面 |
| `docs/design-system.md` | 设计与开发约定 |
| `tools/` | 数据生成、打包、肖像加工与检查脚本 |

字体为 Noto Serif SC、Noto Sans SC、Zhi Mang Xing、Cinzel、Courier Prime（均为 SIL Open Font License），动画库为 GSAP 与 Lenis。
