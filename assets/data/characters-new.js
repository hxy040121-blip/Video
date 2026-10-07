/* ==========================================================
   CHARACTERS（续）：v4.71 新增 15 人（字段同 characters.js，见那里的文件头注释）
   来源：人物卡/<卡名>.md（卡面）与 人物卡/背景/<卡名>.md（卡背）。
   两位乔瑟夫、两位承太郎在馆里报同一个名字（callName 相同）；同局时界面改说「N 号」。
   carried：卡上「随身物」都是「身上穿戴的之外，没有别的」；只把会影响线索判断的手套
            （手套污印，见 lore.js 的 gloves）照外貌记下。乔瑟夫（第二部）的是露指手套，不算。
   heightCm：卡上没写数字的按外貌估计，见 heightNote。
   ========================================================== */
window.CHARACTERS.push(
 {
  "id": "joseph2",
  "name": "乔瑟夫·乔斯达（第二部）",
  "callName": "乔瑟夫·乔斯达",
  "epithet": "波纹战士",
  "work": "《JOJO的奇妙冒险 战斗潮流》",
  "gender": "男",
  "age": "十八岁",
  "heightCm": 195,
  "heightNote": "",
  "era": "一九三九年二月的瑞士圣莫里茨；一九二〇年生于伦敦",
  "knowsModernDevices": false,
  "unknownDevices": "烘干机、洗碗机、跑步机、放映厅和舞蹈室里那种不用胶片和唱片的投影机与播放器、保龄球馆的自动设备与计分屏、电磁灶，大多数塑料（另见\"时代\"一条）。",
  "stats": {
   "physique": "受训",
   "physiqueNote": "力气大，打法靠骗：虚招，激将，临场抓手边的东西用",
   "disguise": "中",
   "readsPeople": "是",
   "medical": "无",
   "observation": "一般",
   "killThreshold": "中",
   "suspicion": "中"
  },
  "carried": [],
  "othersSee": "人高马大、嘴快爱耍宝、一吃惊就嚷“OH! NO!”的毛头小子",
  "quote": {
   "zh": "你的下一句台词是：'你怎么知道我戴着指虎，混蛋！'",
   "orig": "おまえの次のセリフは『なんでメリケンのことわかったんだこの野郎！』という！"
  },
  "dream": "活下去，痛痛快快地活",
  "lines": {
   "wake": "OH! NO! 一觉醒来在这种鬼地方？开什么玩笑！",
   "discover": "喂喂……开什么玩笑。谁干的？给我站出来！",
   "statement": "先别急着吵。谁的话说得太顺，谁就在设套。",
   "accuse": "{X}，你的下一句台词是：“不是我干的！”",
   "defend": "喂喂，我像是会躲在背后下黑手的人吗？",
   "vote": "{X}，就你了。这一票我认账。",
   "executed": "OH! NO!……这一仗，居然要半路丢下了吗……",
   "wish": "先把心脏边上那枚戒指解了！剩下的仗，我自己打。"
  },
  "art": {
   "silhouetteKeys": [
    "a knit cap with ear flaps over short dark-brown hair",
    "a long striped scarf wound around the neck, the ends hanging down",
    "very broad shoulders and thick, muscular arms (a 195 cm, 97 kg frame)",
    "a heavy winter coat thrown open over a cropped tank top that bares the midriff",
    "fingerless gloves and wristbands, one finger pointed at the viewer"
   ],
   "hair": "Short dark-brown hair, a little unruly, mostly tucked under an ear-flap cap.",
   "hairColor": "#4A2F1E",
   "eyes": "Lively green eyes, brows raised in mock surprise.",
   "eyeColor": "#3E9A5A",
   "skin": "#EBCDB2",
   "face": "Young, handsome 18-year-old English face with a strong jaw and a cheeky, lopsided grin. A star-shaped birthmark at the back of the left shoulder near the neck (hidden by clothes).",
   "outfit": "His outfit after arriving in Switzerland: a thick winter coat open over a short, tight tank top that shows the navel; jeans with a belt; boots with leg wraps (below frame); fingerless gloves, wristbands, an ear-flap cap and a long striped scarf.",
   "outfitColors": [
    "#5B4636",
    "#2E7F86",
    "#3B5B8C",
    "#E8E2D0"
   ],
   "accessories": "Fingerless gloves, wristbands, the ear-flap cap and the striped scarf. Hands empty: no clacker balls, no weapons.",
   "expression": "A cocky, mischievous grin, finger pointed at the viewer as if announcing, \"Your next line is...\"",
   "accent": "#8CC63F"
  },
  "canWalk": true
 },
 {
  "id": "joseph3",
  "name": "乔瑟夫·乔斯达（第三部）",
  "callName": "乔瑟夫·乔斯达",
  "epithet": "不动产大亨",
  "work": "《JOJO的奇妙冒险 星尘斗士》",
  "gender": "男",
  "age": "年近七十",
  "heightCm": 195,
  "heightNote": "",
  "era": "一九八九年的埃及开罗；一九二〇年生于伦敦",
  "knowsModernDevices": true,
  "unknownDevices": "—",
  "stats": {
   "physique": "受训",
   "physiqueNote": "年近七十；骨架、力气和打了一辈子的经验都在，耐力不如年轻时",
   "disguise": "中",
   "readsPeople": "是",
   "medical": "无",
   "observation": "一般",
   "killThreshold": "中",
   "suspicion": "中"
  },
  "carried": [
   "白手套一双（戴在手上）"
  ],
  "othersSee": "戴帽子和白手套、嗓门大爱咋呼的有钱美国老头",
  "quote": {
   "zh": "'对手得意洋洋的时候，他就已经输了。'这就是乔瑟夫·乔斯达的做法。",
   "orig": "『相手が勝ち誇ったとき そいつは すでに敗北している』 これがジョセフ・ジョースターのやり方"
  },
  "dream": "救荷莉，了结 DIO",
  "lines": {
   "wake": "OH MY GOD！又是DIO手下哪个替身使者的把戏？",
   "discover": "HOLY SHIT！……大家别慌，先别碰尸体！",
   "statement": "我老头子打了一辈子仗。对手得意的时候，就是露馅的时候。",
   "accuse": "{X}，你从刚才起就太得意了。得意的人，已经输了。",
   "defend": "我老头子要动手，会留下这么明显的破绽？",
   "vote": "这一票投{X}。我老头子不会看走眼。",
   "executed": "荷莉……对不起，爸爸赶不回去了……",
   "wish": "让荷莉好起来。然后，把DIO那家伙了结掉！"
  },
  "art": {
   "silhouetteKeys": [
    "a fedora hat",
    "a neatly trimmed grey beard along the jaw and cheeks",
    "a tall old man with broad shoulders and a ramrod-straight back",
    "a pale short-sleeved shirt",
    "white gloves on both hands"
   ],
   "hair": "Short grey-white hair under a fedora.",
   "hairColor": "#BDB8AE",
   "eyes": "Green eyes under bushy grey brows, crinkled at the corners; they can turn hard in an instant.",
   "eyeColor": "#4F8A5B",
   "skin": "#E6C7A8",
   "face": "A hale man close to seventy: strong nose, neatly trimmed grey beard and moustache, deep laugh lines. Star-shaped birthmark at the back of the left shoulder (hidden). Both hands are flesh and blood here: no prosthetic.",
   "outfit": "Travelling clothes: a fedora, a pale short-sleeved shirt, khaki trousers and leather shoes (below frame), white gloves.",
   "outfitColors": [
    "#E8E2D0",
    "#B59F73",
    "#F5F5F2",
    "#6B5A3E"
   ],
   "accessories": "White gloves and the fedora. Nothing else.",
   "expression": "Mid-shout of \"OH MY GOD!\", eyes wide and mouth open, yet with a sly glint that says the trick is already set.",
   "accent": "#B04CA8"
  },
  "canWalk": true
 },
 {
  "id": "jotaro3",
  "name": "空条承太郎（第三部）",
  "callName": "空条承太郎",
  "epithet": "不良少年",
  "work": "《JOJO的奇妙冒险 星尘斗士》",
  "gender": "男",
  "age": "十七岁（身体按十八岁计）",
  "heightCm": 195,
  "heightNote": "",
  "era": "一九八九年的埃及开罗；家在日本",
  "knowsModernDevices": true,
  "unknownDevices": "—",
  "stats": {
   "physique": "受训",
   "physiqueNote": "个子大，出拳重，街头打出来的；没学过正经的格斗",
   "disguise": "高",
   "readsPeople": "是",
   "medical": "无",
   "observation": "一般",
   "killThreshold": "中",
   "suspicion": "中"
  },
  "carried": [],
  "othersSee": "穿长长的学生服、脸冷话少、张口就是“吵死了”的不良少年",
  "quote": {
   "zh": "真是够了。",
   "orig": "やれやれだぜ"
  },
  "dream": "母亲活下来",
  "lines": {
   "wake": "……这是哪里。替身的把戏吗。",
   "discover": "……谁都别过来。",
   "statement": "我话不多。耍阴招的家伙，我一个一个揪出来。",
   "accuse": "{X}，你这家伙……是你干的吧。",
   "defend": "随你们怎么想。没干就是没干。",
   "vote": "{X}。……不用多说了。",
   "executed": "……真是够了。到最后，还是没能赶回去。",
   "wish": "让我妈活下来。别的，不用你管。"
  },
  "art": {
   "silhouetteKeys": [
    "a black school cap whose torn back edge merges into the hair",
    "a long, coat-like black school uniform with a tall stiff collar",
    "a gold chain through the left side of the collar",
    "very broad shoulders on a 195 cm frame",
    "the cap brim low over a cold stare"
   ],
   "hair": "Black hair that blends into the torn back edge of the cap.",
   "hairColor": "#141414",
   "eyes": "Narrow, cold eyes under thick dark brows; a flat, hard stare.",
   "eyeColor": "#3A5F6F",
   "skin": "#E8CDB3",
   "face": "Angular, handsome face of a seventeen-year-old: strong jaw, thick brows, an unsmiling mouth. Star-shaped birthmark at the back of the left shoulder near the neck (hidden).",
   "outfit": "A long black school uniform tailored like a coat, high stiff collar with a gold chain through the left side; a sleeveless top underneath; two belts at the waist; narrow, slightly flared trousers and leather shoes (below frame). The cap has a gold button above the brim and, on the left, a rectangular metal plate bearing a flattened hand.",
   "outfitColors": [
    "#151515",
    "#C9A227",
    "#2B2B2B"
   ],
   "accessories": "The gold collar chain, the cap plate and button. No cigarettes.",
   "expression": "Cold, unimpressed glare from under the cap brim, mouth set, about to mutter \"good grief\".",
   "accent": "#137C8F"
  },
  "canWalk": true
 },
 {
  "id": "jotaro6",
  "name": "空条承太郎（第六部）",
  "callName": "空条承太郎",
  "epithet": "海洋学者",
  "work": "《JOJO的奇妙冒险 石之海》",
  "gender": "男",
  "age": "四十岁上下",
  "heightCm": 195,
  "heightNote": "",
  "era": "二〇一一年的美国佛罗里达州；生在日本",
  "knowsModernDevices": true,
  "unknownDevices": "—",
  "stats": {
   "physique": "受训",
   "physiqueNote": "四十岁上下，体格和底子都在，几场生死战里打出来的",
   "disguise": "高",
   "readsPeople": "是",
   "medical": "基本常识",
   "observation": "擅长",
   "killThreshold": "中",
   "suspicion": "中"
  },
  "carried": [],
  "othersSee": "一身扎眼的大衣、话少得像在省着用的高大中年人",
  "quote": {
   "zh": "叫你观察……不是随便看看，是仔细地看……不是随便听听，是用心地听……",
   "orig": "観察しろというのは…見るんじゃあなくて観ることだ…聞くんじゃあなく聴くことだ…"
  },
  "dream": "女儿平平安安地从监狱里出去，过她自己的日子",
  "lines": {
   "wake": "真是的……先看清楚，再动。",
   "discover": "别动。东西的位置，先记下来。",
   "statement": "说法可以编，痕迹编不了。我只看痕迹。",
   "accuse": "{X}。你说的，和我看到的不一样。",
   "defend": "我没什么要辩解的。查下去就知道了。",
   "vote": "{X}。……真是的。",
   "executed": "徐伦……这一次，又没赶上。",
   "wish": "让徐伦从那里出去，过她自己的日子。"
  },
  "art": {
   "silhouetteKeys": [
    "a square-brimmed cap with a star on top and a gold plate bearing a hand on the front",
    "a long deep-purple overcoat with two star badges at the collar",
    "big stars on both shoulders and \"JOJO\" lettering running down the sleeves",
    "very broad shoulders on a tall 195 cm frame",
    "a fine chain through the left lapel"
   ],
   "hair": "Short dark hair, mostly under the cap.",
   "hairColor": "#1A1A1A",
   "eyes": "Deep-set, steady, heavy-lidded eyes; unreadable.",
   "eyeColor": "#3A5F6F",
   "skin": "#E3C6AC",
   "face": "A man around forty: the same angular face as in his youth, with deeper lines, a heavy brow and a closed, stern mouth. Star-shaped birthmark at the back of the left shoulder (hidden).",
   "outfit": "A long deep-purple overcoat with two zips down the front, two star-shaped badges at the collar, big stars on the shoulders and \"JOJO\" printed down the sleeves to the cuffs; a pale top printed with a large star; snakeskin-pattern trousers and shoes (below frame).",
   "outfitColors": [
    "#3B2558",
    "#E8E2D6",
    "#C9A227"
   ],
   "accessories": "Star badges, the lapel chain and the cap plate. Nothing in hand.",
   "expression": "Quiet, watchful, a little weary: a man who is not just looking but observing.",
   "accent": "#45286B"
  },
  "canWalk": true
 },
 {
  "id": "pucci",
  "name": "恩里克·普奇",
  "callName": "恩里克·普奇",
  "epithet": "神父",
  "work": "《JOJO的奇妙冒险 石之海》",
  "gender": "男",
  "age": "三十九岁",
  "heightCm": 180,
  "heightNote": "卡上写的是“一米八上下”",
  "era": "二〇一二年的美国佛罗里达州",
  "knowsModernDevices": true,
  "unknownDevices": "—",
  "stats": {
   "physique": "普通",
   "physiqueNote": "身板结实，没学过格斗",
   "disguise": "高",
   "readsPeople": "是",
   "medical": "无",
   "observation": "一般",
   "killThreshold": "无",
   "suspicion": "重"
  },
  "carried": [],
  "othersSee": "安静端正、说话温和、愿意听人把话说完的神父，白发剃着花纹",
  "quote": {
   "zh": "数'素数'让自己冷静下来……'素数'是只能被1和它自己整除的、孤独的数字……",
   "orig": "『素数』を数えて落ちつくんだ…『素数』は1と自分の数でしか割ることのできない孤独な数字…"
  },
  "dream": "到达“天国”：让所有的人事先知道自己的命运",
  "lines": {
   "wake": "主啊……这也是命运安排的一次相遇吗。",
   "discover": "愿主怜悯这个人。……请大家冷静，先祈祷吧。",
   "statement": "不知道命运的人才会绝望。有“觉悟”的人，不怕真相。",
   "accuse": "{X}，向我告解吧。你的眼睛已经承认了。",
   "defend": "我是神父。若要疑我，请拿出证据来。",
   "vote": "{X}。这是你的命运，请带着觉悟去吧。",
   "executed": "2、3、5、7、11……天国，明明只差一步……",
   "wish": "让所有人事先知道自己的命运。那就是“天国”。"
  },
  "art": {
   "silhouetteKeys": [
    "short white hair with lines shaved into the sides of the head",
    "the hair over the forehead grown into the shape of a star",
    "a black priest's cassock buttoned to the very top, with crosses on it",
    "hands clasped in front of the body",
    "a sturdy, upright frame"
   ],
   "hair": "Short white hair with patterned lines shaved into the temples and sides; the front grows into a star shape over the forehead.",
   "hairColor": "#F2F0EA",
   "eyes": "Calm, slightly lowered eyes with a steady, patient gaze.",
   "eyeColor": "#3B2E2A",
   "skin": "#7A5440",
   "face": "A 39-year-old man with dark skin, a broad, composed face, gentle closed mouth. A star-shaped birthmark on the left shoulder (hidden).",
   "outfit": "A black priest's cassock decorated with crosses, buttoned to the top button.",
   "outfitColors": [
    "#151515",
    "#E8E2D0",
    "#4A4A4A"
   ],
   "accessories": "None: no bone, no discs, no notebook. Hands clasped.",
   "expression": "The serene, compassionate half-smile of a confessor, eyes lowered; underneath it, absolute certainty.",
   "accent": "#24402F"
  },
  "canWalk": true
 },
 {
  "id": "diego",
  "name": "迪亚哥·布兰度",
  "callName": "迪亚哥·布兰度",
  "epithet": "天才骑手",
  "work": "《JOJO的奇妙冒险 飙马野郎》",
  "gender": "男",
  "age": "二十岁",
  "heightCm": 180,
  "heightNote": "卡上写的是“一米八上下”",
  "era": "一八九〇至九一年之交的冬天，美国费城；一八七〇年前后生于英国",
  "knowsModernDevices": false,
  "unknownDevices": "电灯见得少；冰箱冷柜、洗衣机、烘干机、洗碗机、跑步机、泳池的水下灯、放映机与影片、播放器与扬声器、保龄球馆的自动设备与计分屏、电磁灶、充电电钻、塑料（另见\"时代\"一条）。",
  "stats": {
   "physique": "普通",
   "physiqueNote": "骑手：身子轻、反应快、耐力好，没学过打架",
   "disguise": "高",
   "readsPeople": "是",
   "medical": "无",
   "observation": "一般",
   "killThreshold": "低",
   "suspicion": "重"
  },
  "carried": [
   "骑手手套一双（戴到小臂）"
  ],
  "othersSee": "英俊讲究的英国骑手，带着上流腔调，笑里瞧不起人",
  "quote": {
   "zh": "把曼哈顿岛给我！！",
   "orig": "オレにマンハッタン島をくれッ！！"
  },
  "dream": "站到社会的顶上，让人群照他的意思走",
  "lines": {
   "wake": "哼……把我弄到这种地方来。想要什么，开个价吧。",
   "discover": "啧……死人对谁都没用了。先看谁得了好处。",
   "statement": "你们都在跟着第一个开口的人跑。真像一群鸽子。",
   "accuse": "{X}，你图的是什么，我早就看出来了。",
   "defend": "这个Dio要动手，会让你们抓到尾巴？别说笑了。",
   "vote": "{X}。挡我路的人，就该趴在地上。",
   "executed": "开什么玩笑……我还没站到顶上！",
   "wish": "把顶上的位子给我。再也没人能让我低头。"
  },
  "art": {
   "silhouetteKeys": [
    "pale-blond hair with black eyebrows",
    "a high-collared, close-fitting riding top",
    "riding gloves reaching up the forearms",
    "a lean, light, wiry jockey's build",
    "chin raised, lips curled in a contemptuous half-smile"
   ],
   "hair": "Pale-blond hair, neat, falling just past the ears.",
   "hairColor": "#EAD9A0",
   "eyes": "Pale, sharp eyes under black eyebrows.",
   "eyeColor": "#9FB6C8",
   "skin": "#F1DCC8",
   "face": "A handsome 20-year-old Englishman with fine features; black brows that contrast with the pale-blond hair; a smile with scorn in it.",
   "outfit": "Jockey's attire: a high-collared fitted top, gloves up to the forearm, riding breeches and tall riding boots (below frame).",
   "outfitColors": [
    "#E8E2D0",
    "#2F3D2A",
    "#7A8B2E"
   ],
   "accessories": "Riding gloves. No horse, no whip.",
   "expression": "A polished public smile that turns into contempt at the corners: the look of someone working out what you are worth.",
   "accent": "#7A8B2E"
  },
  "canWalk": true
 },
 {
  "id": "naegi",
  "name": "苗木诚",
  "callName": "苗木诚",
  "epithet": "超高校级的幸运",
  "work": "《弹丸论破 希望的学园与绝望的高中生》",
  "gender": "男",
  "age": "按十八岁计",
  "heightCm": 160,
  "heightNote": "卡上写的是“一米六上下”",
  "era": "二〇一〇年代的日本",
  "knowsModernDevices": true,
  "unknownDevices": "—",
  "stats": {
   "physique": "普通",
   "physiqueNote": "成绩和运动都平平，没学过格斗",
   "disguise": "低",
   "readsPeople": "一般",
   "medical": "无",
   "observation": "一般",
   "killThreshold": "高",
   "suspicion": "轻"
  },
  "carried": [],
  "othersSee": "个子小、客气腼腆、心里想什么全写在脸上的高中男生",
  "quote": {
   "zh": "那是不对的！",
   "orig": "それは違うよ！"
  },
  "dream": "和活下来的人一起走出这所学园，回家",
  "lines": {
   "wake": "这里是……又被关起来了吗？",
   "discover": "怎么会……又有人……！",
   "statement": "大家冷静一点。把证据一件一件对过，真相会出来的。",
   "accuse": "对不起，{X}……可证据都指向你。",
   "defend": "等一下！那是不对的……请再听我说一次！",
   "vote": "……我投{X}。我不会逃避这个结果。",
   "executed": "我不后悔……大家，一定要往前走……",
   "wish": "让大家一起出去，回家……家里的人都好好的。"
  },
  "art": {
   "silhouetteKeys": [
    "a single tuft of hair sticking straight up from the top of light-brown hair",
    "a small, slight build",
    "an open black jacket with gold buttons over a dark-green hoodie",
    "the hood bunched at the back of the neck",
    "a round, boyish face"
   ],
   "hair": "Light-brown hair, soft and a little spiky, with one prominent tuft (ahoge) sticking up on top.",
   "hairColor": "#9C7450",
   "eyes": "Large, earnest eyes that show every feeling.",
   "eyeColor": "#6E7A4A",
   "skin": "#F2DCC6",
   "face": "A baby-faced, ordinary high-school boy who looks younger than he is; open, honest features.",
   "outfit": "An open black jacket with gold buttons over a dark-green hoodie; dark trousers and red sneakers (below frame).",
   "outfitColors": [
    "#1C1C1C",
    "#4E6B3A",
    "#C9A227",
    "#C0392B"
   ],
   "accessories": "None: no electronic student handbook.",
   "expression": "Frightened but determined: brows knitted, mouth open mid-shout, as if catching a contradiction: \"That's wrong!\"",
   "accent": "#4E7D3A"
  },
  "canWalk": true
 },
 {
  "id": "kirigiri",
  "name": "雾切响子",
  "callName": "雾切响子",
  "epithet": "超高校级的侦探",
  "work": "《弹丸论破 希望的学园与绝望的高中生》",
  "gender": "女",
  "age": "按十八岁计",
  "heightCm": 167,
  "heightNote": "",
  "era": "二〇一〇年代的日本",
  "knowsModernDevices": true,
  "unknownDevices": "—",
  "stats": {
   "physique": "普通",
   "physiqueNote": "没练过格斗",
   "disguise": "高",
   "readsPeople": "是",
   "medical": "基本常识",
   "observation": "擅长",
   "killThreshold": "高",
   "suspicion": "中"
  },
  "carried": [
   "黑色皮手套一双（戴在手上，人前不摘）"
  ],
  "othersSee": "长发黑手套、话少冷淡，见了尸体蹲下就查的女生",
  "quote": {
   "zh": "我也是人……喜怒哀乐，我和别人一样有……只是不让它露在脸上而已。",
   "orig": "私だって人間よ…喜怒哀楽は人並みにあるわ…ただ、それを表に出さないようにしているだけ。"
  },
  "dream": "找到父亲，问清楚，然后和他一刀两断",
  "lines": {
   "wake": "陌生的房间。先确认门和出口。",
   "discover": "别碰。尸体能告诉我们的，比任何人都多。",
   "statement": "结论不急。矛盾在哪里，我们一样一样来。",
   "accuse": "{X}，这个矛盾，你能解释吗？",
   "defend": "怀疑我是对的。但请拿证据来，不是印象。",
   "vote": "{X}。这是我能得出的结论。",
   "executed": "……我还有一件事没问清楚。剩下的，替我查下去。",
   "wish": "找到我的父亲。问清楚……然后，结束这一切。"
  },
  "art": {
   "silhouetteKeys": [
    "long, straight lavender-grey hair with blunt bangs",
    "a thin braid at the left temple tied with a black ribbon",
    "black leather gloves with metal studs on the backs of the hands",
    "a dark short jacket over a white shirt and tie",
    "a slender, very upright posture"
   ],
   "hair": "Long, straight, pale lavender-grey hair with blunt bangs; a thin braid at the left temple tied with a black ribbon.",
   "hairColor": "#C9BFD6",
   "eyes": "Cool violet eyes, level and calm.",
   "eyeColor": "#7E5FA6",
   "skin": "#F3E1D6",
   "face": "A composed, delicate face with almost no expression; mouth in a neutral line.",
   "outfit": "A dark short jacket, white shirt and tie, black short skirt and black long boots (below frame); black leather gloves studded with metal on the backs of the hands.",
   "outfitColors": [
    "#3A2E46",
    "#F2F0EA",
    "#7E5FA6",
    "#111111"
   ],
   "accessories": "Studded black leather gloves, never taken off in front of others (they hide burn scars). No master key.",
   "expression": "Cool, appraising, unreadable; one gloved hand near the chin as if weighing a contradiction.",
   "accent": "#8A7E96"
  },
  "canWalk": true
 },
 {
  "id": "kirei",
  "name": "言峰绮礼",
  "callName": "言峰绮礼",
  "epithet": "代行者",
  "work": "《Fate/Zero》",
  "gender": "男",
  "age": "二十八岁",
  "heightCm": 185,
  "heightNote": "",
  "era": "一九九四年的冬木",
  "knowsModernDevices": true,
  "unknownDevices": "—",
  "stats": {
   "physique": "受训",
   "physiqueNote": "顶尖：八极拳；代行者出身，近身搏杀是本行",
   "disguise": "高",
   "readsPeople": "是",
   "medical": "战场急救",
   "observation": "擅长",
   "killThreshold": "低",
   "suspicion": "中"
  },
  "carried": [],
  "othersSee": "端正克己、彬彬有礼的魁梧神父，眼睛像一口深井",
  "quote": {
   "zh": "那就非问不可了。他为了追求什么而战，到头来……又得到了什么。",
   "orig": "ならば問わねばなるまい。何を求めて戦い、その果てに…何を得たのかを"
  },
  "dream": "找到答案：他这样的人，为什么而生，什么能让他快乐",
  "lines": {
   "wake": "主的试炼吗……也罢。这里的人，各自背着什么？",
   "discover": "愿主赐这个人安息。……下手干脆，是个熟手。",
   "statement": "不必急着辩解。请诸位各自说说，为何想活下去。",
   "accuse": "{X}，你在隐瞒什么？那份苦，已经写在脸上了。",
   "defend": "我无意辩解。若有证据，请当面拿出来。",
   "vote": "{X}。愿主宽恕你。",
   "executed": "原来如此……到最后，我仍没有找到答案。",
   "wish": "我没有愿望。只想知道……我究竟为何而生。"
  },
  "art": {
   "silhouetteKeys": [
    "short, neatly cut dark hair",
    "a square, solemn, nearly expressionless face",
    "a long black priest's cassock over a thick, muscular frame",
    "a cross hanging on the chest",
    "broad, heavy shoulders and a martial artist's stance"
   ],
   "hair": "Short dark-brown hair, neatly cut.",
   "hairColor": "#3A2A22",
   "eyes": "Dark, steady eyes, calm to the point of emptiness.",
   "eyeColor": "#3B2A24",
   "skin": "#E9D2BE",
   "face": "A 28-year-old man with a square jaw and a solemn, almost blank face.",
   "outfit": "A long black priest's cassock with a cross on the chest.",
   "outfitColors": [
    "#1A1A1A",
    "#4A3A30",
    "#C9A86A"
   ],
   "accessories": "The cross on his chest. The command-seal pattern still marks the back of one hand, powerless. No Black Keys.",
   "expression": "Polite, grave and hollow, like looking down a deep well; the faintest stir of interest, quickly suppressed.",
   "accent": "#7B5B3A"
  },
  "canWalk": true
 },
 {
  "id": "nagato",
  "name": "漩涡长门",
  "callName": "佩恩",
  "epithet": "“晓”的首领",
  "work": "《火影忍者》",
  "gender": "男",
  "age": "三十多岁",
  "heightCm": 180,
  "heightNote": "卡上只写“个子偏高”，没有数字；按外貌估计",
  "era": "忍界·第四次忍界大战之前",
  "knowsModernDevices": true,
  "unknownDevices": "—",
  "stats": {
   "physique": "受训",
   "physiqueNote": "忍者出身；多年来靠六道作战，本人的体术平平",
   "disguise": "中",
   "readsPeople": "一般",
   "medical": "战场急救",
   "observation": "一般",
   "killThreshold": "低",
   "suspicion": "中"
  },
  "carried": [],
  "othersSee": "眼里一圈圈波纹、红发遮着半边脸、说什么都像宣判的男人",
  "quote": {
   "zh": "感受痛苦吧，思考痛苦吧，接受痛苦吧，了解痛苦吧。不知道痛的人，不懂真正的和平。",
   "orig": "痛みを感じろ　痛みを考えろ　痛みを受け取れ　痛みを知れ　痛みを知らぬ者に　本当の平和は分からん"
  },
  "dream": "和平：一个不再有孩子在战争里失去一切的世界",
  "lines": {
   "wake": "腿……能站。……这里是什么地方。",
   "discover": "又一个人死了。痛，会传下去。",
   "statement": "争吵生出仇恨，仇恨生出下一具尸体。我见得太多了。",
   "accuse": "{X}，你背着什么痛？是它让你动的手。",
   "defend": "要杀，我不会用这种方法。……不是我。",
   "vote": "{X}。这是判决。",
   "executed": "这就是……我的痛吗。小南……",
   "wish": "一个不再有孩子失去一切的世界。那就是和平。"
  },
  "art": {
   "silhouetteKeys": [
    "long, straight red hair falling over half of the face",
    "ringed, ripple-patterned pale purple eyes (the Rinnegan)",
    "a black high-collared cloak with red clouds outlined in white",
    "a tall, thin frame",
    "pale, gaunt cheeks"
   ],
   "hair": "Long, straight red hair; the front falls down and hides half the face.",
   "hairColor": "#B5283A",
   "eyes": "The Rinnegan: pale lavender eyes with concentric ripples spreading out from the pupil and no ordinary iris; they do not look human.",
   "eyeColor": "#B3A6E0",
   "skin": "#EFE2D8",
   "face": "A pale, thin man in his thirties; calm, heavy with exhaustion.",
   "outfit": "The Akatsuki cloak: black, high-collared, with red clouds outlined in white.",
   "outfitColors": [
    "#151515",
    "#B3121F",
    "#F2F0EA"
   ],
   "accessories": "None. No black rods, no walking machine: here he stands on his own legs.",
   "expression": "Grave, tired, utterly calm; the gaze of someone looking at something very far away.",
   "accent": "#B3A6E0"
  },
  "canWalk": true
 },
 {
  "id": "gintoki",
  "name": "坂田银时",
  "callName": "坂田银时",
  "epithet": "白夜叉",
  "work": "《银魂》",
  "gender": "男",
  "age": "二十多岁，快三十",
  "heightCm": 177,
  "heightNote": "",
  "era": "天人来航二十年后的江户",
  "knowsModernDevices": true,
  "unknownDevices": "—",
  "stats": {
   "physique": "受训",
   "physiqueNote": "顶尖：剑术；攘夷战争里人称“白夜叉”；徒手也强",
   "disguise": "中",
   "readsPeople": "是",
   "medical": "战场急救",
   "observation": "一般",
   "killThreshold": "高",
   "suspicion": "轻"
  },
  "carried": [],
  "othersSee": "银色天然卷、死鱼眼、懒散邋遢、张嘴就损的男人",
  "quote": {
   "zh": "有空把最后装点得漂漂亮亮，不如漂漂亮亮地活到最后。",
   "orig": "美しく最後を飾りつける暇があるなら 最後まで美しく生きようじゃねーか"
  },
  "dream": "护住身边这几个人，让日子平平淡淡地过下去",
  "lines": {
   "wake": "哈啊……这是哪儿？有草莓牛奶吗？",
   "discover": "喂……这可不是闹着玩的。去叫人，快！",
   "statement": "银桑我懒得动脑子。不过谁在撒谎，我闻得出来。",
   "accuse": "{X}，你那张脸上写着“是我干的”啊，喂。",
   "defend": "哈？银桑我连房租都懒得挣，会费这劲杀人？",
   "vote": "抱歉啦，{X}。这一票银桑投了。",
   "executed": "真是的……到最后，连一口甜的都没吃上。",
   "wish": "什么都不用。让那几个家伙平平安安的……再来份芭菲。"
  },
  "art": {
   "silhouetteKeys": [
    "messy, fluffy silver-white natural curls",
    "half-lidded \"dead fish\" eyes",
    "a white kimono worn with only one arm in its sleeve, the other side hanging loose",
    "a blue flowing-water pattern on the hem and cuffs of the kimono",
    "a black high-collared outfit under the kimono"
   ],
   "hair": "Silver-white naturally curly hair, messy and fluffy; it never lies flat.",
   "hairColor": "#E4E6EA",
   "eyes": "Listless, half-closed \"dead fish\" eyes that can suddenly sharpen.",
   "eyeColor": "#8C2F39",
   "skin": "#F1DCC8",
   "face": "A man nearly thirty with a bored, lazy face, mouth a little open as if about to yawn.",
   "outfit": "Black high-collared top and trousers; over them a loose white kimono with blue flowing-water patterns at the hem and cuffs, one arm out of its sleeve; long boots (below frame).",
   "outfitColors": [
    "#F4F4F0",
    "#3F6FB0",
    "#1A1A1A"
   ],
   "accessories": "None: no wooden sword \"Lake Toya\".",
   "expression": "A bored, half-lidded, faintly scornful slouch, with a hidden glint that could switch on in an instant.",
   "accent": "#F4A6C0"
  },
  "canWalk": true
 },
 {
  "id": "tony",
  "name": "托尼·斯塔克",
  "callName": "托尼·斯塔克",
  "epithet": "钢铁侠",
  "work": "《复仇者联盟4：终局之战》",
  "gender": "男",
  "age": "五十出头",
  "heightCm": 172,
  "heightNote": "卡上只写“个子不高”，没有数字；按外貌估计",
  "era": "二〇二三年的美国",
  "knowsModernDevices": true,
  "unknownDevices": "—",
  "stats": {
   "physique": "普通",
   "physiqueNote": "练过拳击；没有盔甲时不惯打架",
   "disguise": "中",
   "readsPeople": "一般",
   "medical": "基本常识",
   "observation": "擅长",
   "killThreshold": "高",
   "suspicion": "中"
  },
  "carried": [],
  "othersSee": "话多语速快、玩笑一个接一个、什么都想拿起来翻看的男人",
  "quote": {
   "zh": "我就是钢铁侠。",
   "orig": "I am Iron Man."
  },
  "dream": "把消失的人带回来，同时留住他已经有的",
  "lines": {
   "wake": "好吧。没有盔甲，没有星期五。这下有意思了。",
   "discover": "哦，不……谁来告诉我，这是怎么回事。",
   "statement": "我习惯先想最坏的结局。好消息是，最坏的我见过了。",
   "accuse": "{X}，你在虚张声势。谈判桌上我见多了。",
   "defend": "等等，我？我连这房子的电路都还没摸清呢。",
   "vote": "{X}。不是针对你……好吧，就是针对你。",
   "executed": "莫甘……爸爸爱你，三千遍。",
   "wish": "把消失的人带回来。然后回湖边，陪女儿长大。"
  },
  "art": {
   "silhouetteKeys": [
    "a distinctive, sharply sculpted goatee",
    "dark-brown hair greying at the temples",
    "a compact, well-proportioned build",
    "casual at-home clothes",
    "a hand raised mid-gesture, as if about to take something apart"
   ],
   "hair": "Dark-brown hair, neatly styled, greying at the temples.",
   "hairColor": "#3B2A20",
   "eyes": "Quick, restless dark-brown eyes that never stop scanning the room.",
   "eyeColor": "#4A3020",
   "skin": "#E6C7AC",
   "face": "A man in his early fifties with a carefully trimmed, uniquely shaped goatee and tired lines around the eyes. An old scar on the chest where the arc reactor used to be (hidden).",
   "outfit": "Casual clothes from the lake house, worn at home.",
   "outfitColors": [
    "#2F3A44",
    "#7A6A5A",
    "#E8E2D0"
   ],
   "accessories": "None: no armor, no glasses, no AI.",
   "expression": "A cocky half-smirk over tired eyes: already cracking a joke, already running the worst case.",
   "accent": "#4FE0F0"
  },
  "canWalk": true
 },
 {
  "id": "hannibal",
  "name": "汉尼拔·莱克特",
  "callName": "汉尼拔·莱克特",
  "epithet": "食人魔",
  "work": "《沉默的羔羊》",
  "gender": "男",
  "age": "五十多岁",
  "heightCm": 175,
  "heightNote": "卡上只写“中等个子”，没有数字；按外貌估计",
  "era": "一九九〇年代初，巴哈马的北比米尼岛",
  "knowsModernDevices": true,
  "unknownDevices": "—",
  "stats": {
   "physique": "普通",
   "physiqueNote": "出手快、狠，下得去手；没学过格斗",
   "disguise": "高",
   "readsPeople": "是",
   "medical": "有",
   "observation": "擅长",
   "killThreshold": "无",
   "suspicion": "中"
  },
  "carried": [],
  "othersSee": "斯文讲究、说话轻、看人一眨不眨的绅士",
  "quote": {
   "zh": "真希望我们能多聊一会儿，不过……我约了一位老朋友吃晚饭。",
   "orig": "I do wish we could chat longer, but… I'm having an old friend for dinner."
  },
  "dream": "自由地活：去他想去的地方，吃他想吃的东西",
  "lines": {
   "wake": "刚打扫过的房子。可惜，清洁剂的品味不太好。",
   "discover": "啊。请诸位退后，让我先闻一闻。",
   "statement": "无礼的人总会先暴露自己。我只需要听，然后等。",
   "accuse": "{X}，你身上有一丝不该有的气味。",
   "defend": "请别失礼。若真是我，诸位找不到这么多破绽。",
   "vote": "{X}。很遗憾，你太无礼了。",
   "executed": "真可惜……比米尼岛的阳光那么好。",
   "wish": "一扇窗，一顿好饭，一个有意思的人。足够了。"
  },
  "art": {
   "silhouetteKeys": [
    "dark hair slicked straight back from a high forehead",
    "a sun hat",
    "light-colored tropical clothes",
    "a lean, very upright frame",
    "pale, unblinking eyes fixed on the viewer"
   ],
   "hair": "Dark hair combed straight back from a high forehead.",
   "hairColor": "#3A3530",
   "eyes": "Pale eyes that barely blink and hold your gaze far too long.",
   "eyeColor": "#8FA6B4",
   "skin": "#EAD5C2",
   "face": "A man in his fifties with a high forehead and very pale skin, only lately touched by the sun; thin lips, composed features.",
   "outfit": "Light-colored tropical clothes and a sun hat, like a gentleman on holiday.",
   "outfitColors": [
    "#EDE6D6",
    "#C9B48A",
    "#8A7A5E"
   ],
   "accessories": "None.",
   "expression": "Perfectly still and courteous, with a faint smile that makes the stomach tighten.",
   "accent": "#C08A7A"
  },
  "canWalk": true
 },
 {
  "id": "homelander",
  "name": "祖国人",
  "callName": "祖国人",
  "epithet": "七人队队长",
  "work": "《黑袍纠察队》",
  "gender": "男",
  "age": "四十多岁",
  "heightCm": 190,
  "heightNote": "卡上只写“个子很高”，没有数字；按外貌估计",
  "era": "二〇二〇年代的美国华盛顿",
  "knowsModernDevices": true,
  "unknownDevices": "—",
  "stats": {
   "physique": "普通",
   "physiqueNote": "高大结实；从没学过不靠超能力的打法",
   "disguise": "中",
   "readsPeople": "一般",
   "medical": "无",
   "observation": "一般",
   "killThreshold": "无",
   "suspicion": "重"
  },
  "carried": [],
  "othersSee": "高大英俊、笑容标准、说话像对着镜头的大明星",
  "quote": {
   "zh": "我是祖国人。",
   "orig": "I am the Homelander."
  },
  "dream": "被所有人爱，永远不死",
  "lines": {
   "wake": "好了，大家别慌。我在这儿，你们安全了。",
   "discover": "哇哦。……好吧，谁干的？我保证，不生气。",
   "statement": "大家看着我就好。我说谁是凶手，谁就是凶手。",
   "accuse": "{X}，你在笑我吗？……是你干的，对吧？",
   "defend": "我？我是祖国人！我救过的人，比你们见过的还多！",
   "vote": "{X}。抱歉，这是大家的意思。",
   "executed": "不，不不不……我是祖国人！你们不能这样对我！",
   "wish": "让所有人都爱我。永远……不会死。"
  },
  "art": {
   "silhouetteKeys": [
    "blond hair slicked back without a strand out of place",
    "a square jaw and a poster-perfect hero's smile",
    "very broad shoulders and a big, muscular frame",
    "clothes rumpled and torn from a fight",
    "head held high, chest out, as if posing for a camera"
   ],
   "hair": "Blond hair slicked back perfectly.",
   "hairColor": "#E4C77A",
   "eyes": "Blue eyes that do not join in the smile.",
   "eyeColor": "#4F86C6",
   "skin": "#F0D6C0",
   "face": "A square-jawed, all-American handsome man in his forties; the smile held a beat too long, a twitch at the corner of the mouth.",
   "outfit": "Whatever he wore for the live broadcast from the Oval Office, rumpled and torn from a fight. (His famous look is a dark-blue suit with gold eagle emblems on the chest and shoulders and a stars-and-stripes cape.)",
   "outfitColors": [
    "#1B2A5A",
    "#C9A227",
    "#B22234",
    "#F2F0EA"
   ],
   "accessories": "None.",
   "expression": "A wide, practised hero's smile over dead eyes; underneath, a child about to throw a tantrum.",
   "accent": "#1B2A5A"
  },
  "canWalk": true
 },
 {
  "id": "johan",
  "name": "约翰·李贝尔特",
  "callName": "约翰·李贝尔特",
  "epithet": "怪物",
  "work": "《MONSTER》",
  "gender": "男",
  "age": "二十出头",
  "heightCm": 178,
  "heightNote": "卡上只写“个子中等偏高”，没有数字；按外貌估计",
  "era": "一九九〇年代后期的德国",
  "knowsModernDevices": true,
  "unknownDevices": "—",
  "stats": {
   "physique": "普通",
   "physiqueNote": "清瘦，不惯动手；会用枪",
   "disguise": "高",
   "readsPeople": "是",
   "medical": "无",
   "observation": "一般",
   "killThreshold": "无",
   "suspicion": "轻"
  },
  "carried": [],
  "othersSee": "文雅亲切的金发青年，说话轻，记得别人说过的每一句话",
  "quote": {
   "zh": "对谁都平等的……只有死。",
   "orig": "誰にも平等なのは……死だけだ。"
  },
  "dream": "抹掉自己：让知道他的人都死去，最后他自己也消失",
  "lines": {
   "wake": "很安静的房子。这里的每个人，都很孤独吧。",
   "discover": "可怜的人……最后看到的，是谁的脸呢。",
   "statement": "大家都很害怕吧。说出来就好，我在听。",
   "accuse": "{X}，你已经累了吧。说出来，会轻松一点。",
   "defend": "我？……如果你愿意这样相信，也没关系。",
   "vote": "{X}。……晚安。",
   "executed": "这样就好……没有名字，就不会有人记得。",
   "wish": "让我消失吧。连名字也不留下。"
  },
  "art": {
   "silhouetteKeys": [
    "soft, neatly kept blond hair",
    "a slim, slightly tall build",
    "clean, well-fitted clothes",
    "head tilted gently to one side",
    "a faint, kind smile"
   ],
   "hair": "Blond hair, neat, falling softly over the forehead; it hides an old bullet scar on the head.",
   "hairColor": "#E6D08A",
   "eyes": "Beautiful blue eyes that do not move when he smiles.",
   "eyeColor": "#5C8FC4",
   "skin": "#F3E1D3",
   "face": "A young man in his early twenties, beautiful almost to the point of unreality, with refined features and a gentle expression.",
   "outfit": "Clean, tidy, well-cut clothes, like a well-brought-up young man.",
   "outfitColors": [
    "#2E3440",
    "#F2F0EA",
    "#8A8F98"
   ],
   "accessories": "None.",
   "expression": "A soft, kind smile and calm blue eyes with nothing in them at all.",
   "accent": "#E6D79A"
  },
  "canWalk": true
 }
)
