# 角色肖像的制作流程

肖像不是画的：每个角色用一张官方原图（动画截图、设定稿、游戏立绘、原作彩页或画集），经过同一套处理变成「暗金单色」的胸像，挂在网站的肖像长廊里。
这些图的版权属于各自的原作，只适合本地自用。成品图（`assets/art/portraits/*.webp`）因此不进公开仓库，只随本地成品包交付；仓库里缺图时网站会自动显示剪影占位。

## 流程

1. 找图：`collect_z.py`（Zerochan）、`fandom.py`（各作品的 Fandom wiki，走 api.php）、`collect.py`（Danbooru）生成带编号的候选对照表，人工挑选。
2. 读双眼坐标：`grid.py` 在原图上画坐标网格。
3. 加工：`pipe.py SRC --id ID --out DIR --eyes lx,ly,rx,ry [--scale k] [--keep-alpha]`
   - 动漫专用抠图模型（rembg isnet-anime）去掉背景；写实画风先用通用模型（isnet-general-use）抠好再带 `--keep-alpha`。
   - 按双眼位置统一构图：双眼落在画面 41% 高度、按眼距统一头的大小，底部与两侧溶进黑暗。
   - 暗金单色调色：墨黑到黄铜的渐变映射、同一盏右上方的灯、细黄铜轮廓光、胶片颗粒；只把虹膜染成血粉。
4. 导出：`python3 tools/portraits/export.py <加工目录>` → `assets/art/portraits/<id>.webp`（900×1200）与 `assets/data/portrait-images.js`。

依赖：`pip install "rembg[cpu]" "opencv-python-headless<5" scipy pillow`。`params/` 里是部分角色的原图出处与加工参数。

## 原图出处

| 角色 | 作品 | 原图 |
|---|---|---|
| L | 《死亡笔记》 | 官方图（加工时未留下出处记录） |
| 夜神月 | 《死亡笔记》 | 《DEATH NOTE》小畑健画集《Blanc et Noir》彩页扫描（Zerochan 1422629，Official Art / Scan）：穿白衬衫的夜神月，双眼藏在刘海… |
| 江之岛盾子 | 《弹丸论破 希望的学园与绝望的高中生》 | 《新弹丸论破V3》附赠模式（才能开花学园模式）江之岛盾子官方立绘 Sprite (19)，透明底，840×950。弹丸论破 Wiki File:Danganronpa V3 Bon… |
| 牧濑红莉栖 | 《命运石之门》 | 剧场版《命运石之门 负荷领域的既视感》限定版特典小册子①插画（原画：坂井久太，WHITE FOX；Zerochan 1677036，Official Art / Scan），325… |
| 工藤新一 | 《名侦探柯南》 | 青山刚昌《名侦探柯南》官方指南书「工藤新一」人物介绍页的彩色插画扫描（Zerochan 1666325，Official Art / Scan，作者 Aoyama Goushou）… |
| 夏洛克·福尔摩斯 | 《福尔摩斯探案集》 | 西德尼·佩吉特（Sidney Paget）1904 年所绘福尔摩斯肖像，墨水淡彩原稿（6×8 英寸），公有领域。Wikimedia Commons File:Portrait of… |
| 成步堂龙一 | 《逆转裁判》 | Capcom《逆转裁判123 成步堂精选》（Phoenix Wright: Ace Attorney Trilogy）官方插画，透明底，1467×4831。逆转裁判 Wiki Fi… |
| 贝阿朵莉切 | 《海猫鸣泣之时》 | 官方图（加工时未留下出处记录） |
| 右代宫战人 | 《海猫鸣泣之时》 | 官方图（加工时未留下出处记录） |
| 房石阳明 | 《人狼村之谜》 | 官方图（加工时未留下出处记录） |
| 蛇喰梦子 | 《狂赌之渊》 | 官方图（加工时未留下出处记录） |
| 斑目貘 | 《噬谎者》 | 官方图（加工时未留下出处记录） |
| 赤木茂 | 《斗牌传说》 | 官方图（加工时未留下出处记录） |
| 伊藤开司 | 《赌博默示录》 | 官方图（加工时未留下出处记录） |
| 玛奇玛 | 《电锯人》 | 官方图（加工时未留下出处记录） |
| 鬼舞辻无惨 | 《鬼灭之刃》 | 官方图（加工时未留下出处记录） |
| 蝴蝶忍 | 《鬼灭之刃》 | 官方图（加工时未留下出处记录） |
| 两面宿傩 | 《咒术回战》 | 官方图（加工时未留下出处记录） |
| 日车宽见 | 《咒术回战》 | 官方图（加工时未留下出处记录） |
| 宇智波斑 | 《火影忍者》 | 《火影忍者疾风传》动画第369集截图（Narutopedia File:Madara.png，1440×1080）。壮年的斑，胸像，高领，前发遮住右眼，左眼是普通黑眼（非写轮眼），… |
| 宇智波鼬 | 《火影忍者》 | 官方图（加工时未留下出处记录） |
| 宇智波佐助 | 《火影忍者》 | 《火影忍者疾风传》动画第142集截图（Narutopedia File:Sasuke Part 2.png，2700×2000）。鹰小队时期的佐助，正面胸像，冷眼正视。 |
| 宇智波带土 | 《火影忍者》 | 游戏《火影忍者疾风传 究极忍者风暴 世代》官方立绘（Narutopedia File:Obito Unmasked full.png，2894×4093，透明底），第四次忍界大战中… |
| 蓝染惣右介 | 《BLEACH》 | 《BLEACH》动画第293集截图（Bleach Wiki File:Aizen sousuke.png，1440×1080）。叛离后的蓝染：头发向后拢起、额前垂一绺，不戴眼镜，白… |
| 香克斯 | 《ONE PIECE》（海贼王） | 《ONE PIECE》东映动画官方插画（ONE PIECE.com 官方 X 账号 @opcom_info 发布，https://x.com/opcom_info/status/1… |
| 艾伦·耶格尔 | 《进击的巨人》 | 官方图（加工时未留下出处记录） |
| 三笠·阿克曼 | 《进击的巨人》 | 官方图（加工时未留下出处记录） |
| 阿尔敏·阿诺德 | 《进击的巨人》 | 官方图（加工时未留下出处记录） |
| 格斯 | 《剑风传奇》 | 官方图（加工时未留下出处记录） |
| 格里菲斯 | 《剑风传奇》 | 三浦建太郎《剑风传奇》漫画第 62 话（单行本第 11 卷）的一格：从再生之塔救出后的格里菲斯，罩着鹰喙形的铁面盔，肩上披一块粗布毯子，靠坐着正面看向读者，两只眼睛从面盔眼孔里露出… |
| 崔格 | 《无敌少侠》 | 亚马逊动画《无敌少侠》（Invincible）第四季截图（Amazon Invincible Wiki File:Thragg Eulogy.png，2560×1440，2026 … |
| Saber | 《Fate/Zero》 | 官方图（加工时未留下出处记录） |
| 吉尔伽美什 | 《Fate/Zero》 | 官方图（加工时未留下出处记录） |
| 卫宫切嗣 | 《Fate/Zero》 | ufotable《Fate/Zero》动画设定稿：卫宫切嗣表情集（TYPE-MOON Wiki File:Kiritsugu ufotable Fate Zero Characte… |
| 芙莉莲 | 《葬送的芙莉莲》 | TV 动画《葬送的芙莉莲》第8话截图（Frieren Wiki File:Frieren descends upon Aura's army EP8.png，1920×1080）：… |
| 迪奥·布兰度 | 《JOJO的奇妙冒险 星尘斗士》 | TV 动画《JOJO的奇妙冒险 星尘斗士》DIO 官方插画（JoJo Wiki File:DIO Normal SC Infobox Anime.png，1108×1691，wik… |
| 乔尼·乔斯达 | 《JOJO的奇妙冒险 飙马野郎》 | TV 动画《JOJO的奇妙冒险 飙马野郎》（2026）乔尼·乔斯达官方角色视觉图（JoJo Wiki File:Johnny Joestar Infobox Anime.png，7… |
| 法尼·瓦伦泰 | 《JOJO的奇妙冒险 飙马野郎》 | 《JOJO的奇妙冒险 飙马野郎》第89话原作彩页（JOJO-D 官方数码上色版，JoJo Wiki File:Valentine heart and actions speech.… |
| 乔瑟夫·乔斯达（第二部） | 《JOJO的奇妙冒险 战斗潮流》 | TV 动画《JOJO的奇妙冒险》（2012）第21集截图（战斗潮流·瑞士圣莫里茨一段，JoJo Wiki File:BTep21-4.png，1920×1431）：到了瑞士以后的那… |
| 乔瑟夫·乔斯达（第三部） | 《JOJO的奇妙冒险 星尘斗士》 | TV 动画《JOJO的奇妙冒险 星尘斗士》乔瑟夫官方插画（JoJo Wiki File:Joseph SC Infobox Anime.png，915×1594，wiki 去底的透… |
| 空条承太郎（第三部） | 《JOJO的奇妙冒险 星尘斗士》 | TV 动画《JOJO的奇妙冒险 星尘斗士》官方设定稿：承太郎彩色头像集（JoJo Wiki File:JotaroP3FaceColor-MS.png，3489×2416，白底），… |
| 空条承太郎（第六部） | 《JOJO的奇妙冒险 石之海》 | 《JOJO的奇妙冒险 石之海》原作彩色图（JoJo Wiki File:Jotaro SO Infobox Manga.png，1399×2145，wiki 去底的透明图）：第六部… |
| 恩里克·普奇 | 《JOJO的奇妙冒险 石之海》 | 《JOJO的奇妙冒险 石之海》原作彩色图（JoJo Wiki File:Pucci New Moon Infobox Manga.png，1000×1544，透明底，wiki 注明… |
| 迪亚哥·布兰度 | 《JOJO的奇妙冒险 飙马野郎》 | TV 动画《JOJO的奇妙冒险 飙马野郎》（2026）迪亚哥·布兰度官方角色视觉图（JoJo Wiki「Diego Brando」词条——即原本世界的迪亚哥——的信息栏图 File… |
| 苗木诚 | 《弹丸论破 希望的学园与绝望的高中生》 | 《弹丸论破》官方设定集《Dangan Ronpa Visual Fan Book》扫描页（小松崎类绘，Zerochan 1624027，1567×2306，Official Art… |
| 雾切响子 | 《弹丸论破 希望的学园与绝望的高中生》 | 《新弹丸论破V3》附赠模式（才能开花学园模式）雾切响子官方立绘 Sprite (1)，透明底，859×896（弹丸论破 Wiki File:Danganronpa V3 Bonus… |
| 言峰绮礼 | 《Fate/Zero》 | ufotable《Fate/Zero》动画设定稿：言峰绮礼表情集（TYPE-MOON Wiki File:Ufotable Fate Zero Kirei Character Sh… |
| 漩涡长门 | 《火影忍者》 | 《火影忍者疾风传》动画第174集截图（Narutopedia File:Nagato.png，1376×872，Nagato 词条信息栏图）：佩恩来袭一段，坐在机关里的长门，红发垂… |
| 坂田银时 | 《银魂》 | 《银魂》官方插画（银魂 Wiki File:Gin Gintoki.png，1800×4154，白底，收在 Gintoki Sakata/Gallery）：坂田银时的常服——黑色立… |
| 托尼·斯塔克 | 《复仇者联盟4：终局之战》（漫威电影宇宙） | 电影《复仇者联盟4：终局之战》（2019）截图（漫威电影宇宙 Wiki File:Tony Home Endgame 02.png，3840×1608）：湖边木屋里的夜，画面左边亮… |
| 汉尼拔·莱克特 | 《沉默的羔羊》（1991 年电影） | 电影《沉默的羔羊》（1991）剧照（TMDB 该片背景图 aBuaXxmyD92wXbHOF16IXTc4R0J，3072×1729）：安东尼·霍普金斯饰演的汉尼拔·莱克特站在囚室… |
| 祖国人 | 《黑袍纠察队》（剧集） | 剧集《黑袍纠察队》第五季剧照（The Boys Wiki File:Homelander-scowling-at-edgar-in-the-boys-season-5.png，30… |
| 约翰·李贝尔特 | 《MONSTER》 | TV 动画《MONSTER》截图（Monster Wiki〔obluda.fandom.com〕File:Johan .png，1434×1079，未注明集数）：成年的约翰，金发、… |
