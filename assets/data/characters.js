/* ==========================================================
   CHARACTERS：卡池的 30 人，人物卡的提炼数据。数组的顺序就是卡池长廊的顺序（同一部作品的人挨着）。
   来源：v7.11 的 人物卡/<卡名>.md（一人一个文件；v4.71 的卡背 人物卡/背景/ 已并回卡面，目录不再有）。
   新卡池里另有 103 张卡，网站没有收；原先网站上的 53 人里，按肖像画风统一留下这 30 人
   （去掉的 23 人和他们的肖像不再随网站）。
   字段：
   id            英文短名（肖像文件名 assets/art/portraits/<id>.webp）
   name          卡名（档案、卡池用）    epithet  称号（网站用的极短头衔，卡上没有）   work  原作
   callName      在馆里自我介绍时报的名字（卡面「名字」一条；没写就是卡名去掉括号）；不报名为 null（吉尔伽美什）。
                 广播与台词的 {X}/{V} 代入它；重名（同局两人报同一个名字）或 null 时，界面改说「N 号」
   gender/age/heightCm/heightNote/era   age 取外貌首句、era 取「年代」一条；卡上没写年龄的留空；
                 卡上没写身高数字的按外貌估计，见 heightNote
   knowsModernDevices  卡上「馆里多半没见过的」为「—」即 true；unknownDevices 为原文
   canWalk       false：卡上写明保留的残疾使他不能行走（这 30 人里没有）
   stats         判定七项：physique 体能与格斗(普通/受训) physiqueNote 括号说明、disguise 伪装(高/中/低)、
                 readsPeople 善于读人(是/一般)、medical 医护、observation 现场观察(一般/擅长)、
                 killThreshold 杀人门槛(无/低/中/高)、suspicion 疑心(重/中/轻)
   carried       随身物（衣着写在外貌里的不列；手套照外貌记下，庭审的手套污印用它）
   quote         {zh} 卡上「声线」一节原作台词里的一句（v7.11 起卡上只有中文，原文与「别人眼里」一条都删了，网站也不再存）
   dream         梦想（梦想一节的粗体首句，去掉「目的：」）
   lines         人物卡上的八句台词（新写，贴合各卡声线）：wake/discover/statement/accuse/defend/vote/executed/wish，
                 {X} 代入对方的 callName；wish 是终章用的那一句，其余是庭审台词池（lines/a–f.js，22 个场合）缺句时的回落
   art           立绘说明与签名色 accent
   ========================================================== */
window.CHARACTERS = [
 {
  "id": "l",
  "name": "L",
  "callName": "龙崎",
  "epithet": "世界第一侦探",
  "work": "《死亡笔记》",
  "gender": "男",
  "age": "二十五岁",
  "heightCm": 179,
  "heightNote": "卡面写的是'一米七九上下'；他驼背，站着显不出这个个子",
  "era": "二〇〇四年，东京",
  "knowsModernDevices": true,
  "unknownDevices": "—",
  "stats": {
   "physique": "普通",
   "physiqueNote": "瘦，反应快；打起来用腿",
   "disguise": "高",
   "readsPeople": "是",
   "medical": "无",
   "observation": "一般",
   "killThreshold": "中",
   "suspicion": "重"
  },
  "carried": [
   "宽松的白色长袖衫",
   "蓝色牛仔裤",
   "光着脚，没穿鞋"
  ],
  "quote": {
   "zh": "我是L。"
  },
  "dream": "抓住基拉，证明自己从头到尾是对的",
  "lines": {
   "wake": "这里有摄像头的概率，百分之九十九。",
   "discover": "死亡时刻……请先别碰任何东西。",
   "statement": "请按时刻顺序再说一遍。说得太顺的人，我会多看几眼。",
   "accuse": "我怀疑您，{X}。百分之……八十七。",
   "defend": "怀疑我很合理。不过，您漏看了一个时刻。",
   "vote": "我投{X}。百分之九十。",
   "executed": "这一次是我输了……请记住那个时刻。",
   "wish": "让基拉上死刑台。还有……证明我是对的。"
  },
  "art": {
   "silhouetteKeys": [
    "wild, uncombed shaggy black mop of hair with ragged spikes sticking out on all sides",
    "deeply hunched shoulders and a curved, slumped back",
    "thumb raised and pressed against the lower lip",
    "oversized, loose plain white long-sleeve shirt with a wide sagging neckline",
    "knees pulled up to the chest in a crouch if any lower body shows"
   ],
   "hair": "Messy jet-black hair, never combed: ragged locks fall over the eyebrows in front and hang down to the nape at the back, with spiky strands jutting out at the sides",
   "hairColor": "#111111",
   "eyes": "Very large, round, wide-open black eyes that barely blink, with very dark, heavy rings underneath",
   "eyeColor": "#0D0D0D",
   "skin": "#F0E7E0",
   "face": "Gaunt, very pale face, deep grey-violet shadows under the eyes, thin flat mouth; no scars or marks",
   "outfit": "Baggy plain white long-sleeved cotton shirt, sleeves loose, neckline stretched wide; faded blue jeans; barefoot",
   "outfitColors": [
    "#F5F5F2",
    "#5B7BA6"
   ],
   "accessories": "None: no phone, no sweets, no shoes. Hands empty, fingers held in his habit of pinching things between thumb and forefinger",
   "expression": "A blank, wide-eyed, unblinking stare fixed on the viewer, thumb on lip, mouth perfectly flat, as if quietly working out the percentage chance that you are the killer",
   "accent": "#CFD8DC"
  },
  "canWalk": true
 },
 {
  "id": "light",
  "name": "夜神月",
  "callName": "夜神月",
  "epithet": "新世界之神",
  "work": "《死亡笔记》",
  "gender": "男",
  "age": "十八岁",
  "heightCm": 179,
  "heightNote": "",
  "era": "二〇〇四年，东京",
  "knowsModernDevices": true,
  "unknownDevices": "—",
  "stats": {
   "physique": "普通",
   "physiqueNote": "反应快；初中两度全国网球冠军，没有格斗训练",
   "disguise": "高",
   "readsPeople": "是",
   "medical": "无",
   "observation": "一般",
   "killThreshold": "低",
   "suspicion": "重"
  },
  "carried": [
   "黑色封面笔记本一册（DEATH NOTE，从火口手里缴获的那一本）",
   "左腕腕表一只（表底夹层藏笔记纸片与针）"
  ],
  "quote": {
   "zh": "我要成为新世界的神。"
  },
  "dream": "无罪恶的新世界，由他为神",
  "lines": {
   "wake": "没有人在看……好。先读规则。",
   "discover": "请大家冷静，先别碰任何东西。",
   "statement": "我把大家的话整理一下。当然，这只是一种可能。",
   "accuse": "{X}，我不愿这么想……可只有您对不上。",
   "defend": "怀疑我很正常。如果方便的话，请听我说完。",
   "vote": "我投{X}……这是必要的。",
   "executed": "不对……我是正义……我不能错！",
   "wish": "把该死的人都清除掉。新世界，由我裁决。"
  },
  "art": {
   "silhouetteKeys": [
    "neat, medium-length brown hair with long side-swept bangs falling across the forehead and over the ears",
    "upright posture with squared, level shoulders",
    "crisp shirt collar under jacket lapels",
    "a black rectangular notebook raised beside the face",
    "wristwatch on the left wrist"
   ],
   "hair": "Tidy, well-cut medium-length hair, smooth and glossy, with bangs parted and swept to one side across the forehead, the sides covering the tops of the ears",
   "hairColor": "#8B5A2B",
   "eyes": "Sharp, almond-shaped eyes, calm and intelligent; in shadow they catch a faint red glint",
   "eyeColor": "#8B4A2B",
   "skin": "#F2D9C4",
   "face": "Clean, symmetrical, handsome face, straight nose, smooth skin, no marks; the face of a model student",
   "outfit": "Neat university student clothes: crisp white collared shirt under a fitted tan jacket, dark tailored trousers; everything spotless",
   "outfitColors": [
    "#F7F5F0",
    "#B8946A",
    "#3A3A44"
   ],
   "accessories": "Black notebook with 'DEATH NOTE' in white gothic lettering on the cover, held against the chest or beside the face; silver wristwatch on the left wrist",
   "expression": "A warm, polite, trustworthy smile on the lower half of the face while the half-shadowed eyes glint red with private triumph: the hidden 'just as planned' grin",
   "accent": "#B3122E"
  },
  "canWalk": true
 },
 {
  "id": "junko",
  "name": "江之岛盾子",
  "callName": "江之岛盾子",
  "epithet": "超高校级的绝望",
  "work": "《弹丸论破 希望的学园与绝望的高中生》",
  "gender": "女",
  "age": "按十八岁计",
  "heightCm": 169,
  "heightNote": "",
  "era": "二〇一〇年代的日本",
  "knowsModernDevices": true,
  "unknownDevices": "—",
  "stats": {
   "physique": "普通",
   "physiqueNote": "运动神经好",
   "disguise": "高",
   "readsPeople": "是",
   "medical": "无",
   "observation": "一般",
   "killThreshold": "无",
   "suspicion": "中"
  },
  "carried": [
   "黑白熊发饰一对（戴在头上）",
   "折叠小镜一面"
  ],
  "quote": {
   "zh": "绝望地容易腻。"
  },
  "dream": "让所有人失去希望，最后轮到自己",
  "lines": {
   "wake": "哈啊……这椅子绝望地硬耶，超讨厌～",
   "discover": "呀啊！真的假的……唔噗噗。",
   "statement": "人家超害怕的啦！……不过呢，凶手现在一定很开心哦。",
   "accuse": "{X}，你的绝望……全都写在脸上了哦？",
   "defend": "诶诶？人家？讨厌啦，绝对不是我嘛～",
   "vote": "投{X}～绝望地确定！",
   "executed": "唔噗噗……原来输掉是这种滋味啊！",
   "wish": "那就让外面的人，看着希望一个个死掉吧。"
  },
  "art": {
   "silhouetteKeys": [
    "two huge, long twin tails tied very high on the head, flaring outward",
    "a round bear-head ornament with two little ears on top of each twin tail",
    "loose cardigan slipping off the shoulders, sleeves rolled up",
    "head tilted, one hand posed at the cheek or making a peace sign"
   ],
   "hair": "Very long, voluminous hair gathered into two high twin tails that flare out and curl slightly at the ends; short bangs swept to one side",
   "hairColor": "#F3C4A2",
   "eyes": "Large, bright, magazine-model eyes with heavy black eyeliner and long lashes",
   "eyeColor": "#7BB8E8",
   "skin": "#F9E3D6",
   "face": "Flawless model makeup, glossy lips, long painted red nails visible when the hand is near the face; no scars",
   "outfit": "Loose black cardigan worn open with sleeves rolled up and slipping off the shoulders, white shirt with an open collar, a loosely knotted red tie hanging low, red short skirt, long boots below",
   "outfitColors": [
    "#1A1A1A",
    "#FFFFFF",
    "#D7263D"
   ],
   "accessories": "A pair of bear-shaped hair ornaments in black and white, one on each twin tail (Monokuma motif); a small folding compact mirror",
   "expression": "A dazzling gyaru model smile that stops below the eyes: one side of the face is bubbly and flushed, the other side has gone flat, bored and dead-eyed, with the tip of the tongue just showing",
   "accent": "#FF3E9A"
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
  "quote": {
   "zh": "我也是人……喜怒哀乐，我和别人一样有……只是不让它露在脸上而已。"
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
   "physiqueNote": "运动平平，没学过格斗",
   "disguise": "低",
   "readsPeople": "一般",
   "medical": "无",
   "observation": "一般",
   "killThreshold": "高",
   "suspicion": "轻"
  },
  "carried": [],
  "quote": {
   "zh": "那是不对的！"
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
  "id": "kurisu",
  "name": "牧濑红莉栖",
  "callName": "牧濑红莉栖",
  "epithet": "天才脑科学家",
  "work": "《命运石之门》",
  "gender": "女",
  "age": "十八岁",
  "heightCm": 160,
  "heightNote": "",
  "era": "二〇一〇年，东京秋叶原",
  "knowsModernDevices": true,
  "unknownDevices": "—",
  "stats": {
   "physique": "普通",
   "physiqueNote": "不爱运动，没受过格斗训练",
   "disguise": "低",
   "readsPeople": "一般",
   "medical": "基本常识",
   "observation": "擅长",
   "killThreshold": "高",
   "suspicion": "中"
  },
  "carried": [],
  "quote": {
   "zh": "都说了别加'蒂娜'！"
  },
  "dream": "弄清记忆是什么，被父亲承认",
  "lines": {
   "wake": "……冷静。先找能测量的东西。",
   "discover": "别碰！……先记录现场状态。",
   "statement": "与其争论，不如做个实验。变量我来控制。",
   "accuse": "{X}，您的证词和物理事实对不上。请解释。",
   "defend": "我、我才没有！……证据呢？拿出来。",
   "vote": "我投{X}。数据不会说谎。",
   "executed": "……这个结果，没法重复验证了呢。",
   "wish": "把记忆的真相弄清楚……然后给爸爸看。"
  },
  "art": {
   "silhouetteKeys": [
    "long, straight hair flowing well past the shoulders",
    "wide, stiff lab-coat collar and lapels over everything",
    "jacket sleeves with open cutouts at the shoulders",
    "arms folded across the chest",
    "loose necktie hanging down the center of the chest"
   ],
   "hair": "Long, straight, sleek hair reaching well past the shoulders, side-parted full bangs, two longer strands framing the face",
   "hairColor": "#A34E33",
   "eyes": "Sharp, slightly narrowed, skeptical eyes: an intelligent, appraising look",
   "eyeColor": "#6E78B8",
   "skin": "#F7E2D4",
   "face": "Slim young face, small nose, a faint stubborn pink flush on the cheeks; no marks",
   "outfit": "Oversized white lab coat draped over a modified girls' school uniform: beige jacket with sleeves open at the shoulders, white button-up shirt, loosely knotted red necktie; black shorts and black tights below",
   "outfitColors": [
    "#FFFFFF",
    "#D8C3A0",
    "#C0392B",
    "#1C1C1C"
   ],
   "accessories": "None. Everything else was left in the lab; hands empty",
   "expression": "A cold, appraising stare, as if looking at a dataset that does not add up: one eyebrow raised, lips pressed into a skeptical half-frown, a faint defensive blush",
   "accent": "#FF8A3D"
  },
  "canWalk": true
 },
 {
  "id": "shinichi",
  "name": "工藤新一",
  "callName": "工藤新一",
  "epithet": "高中生名侦探",
  "work": "《名侦探柯南》",
  "gender": "男",
  "age": "看上去十八岁上下",
  "heightCm": 174,
  "heightNote": "",
  "era": "二〇二〇年代，东京米花町",
  "knowsModernDevices": true,
  "unknownDevices": "—",
  "stats": {
   "physique": "普通",
   "physiqueNote": "运动神经好，足球练出来的脚法，踢东西又准又狠；没学过格斗",
   "disguise": "中",
   "readsPeople": "是",
   "medical": "基本常识",
   "observation": "擅长",
   "killThreshold": "高",
   "suspicion": "中"
  },
  "carried": [],
  "quote": {
   "zh": "笨蛋……推理哪有什么输赢，哪有什么高下……真相永远……只有一个啊……"
  },
  "dream": "揪出组织，以新一的样子回到兰身边",
  "lines": {
   "wake": "这是哪……又被人从背后放倒了吗？",
   "discover": "谁都别动！……这里，没有警察。",
   "statement": "刚才有人说漏了一句——只有凶手才知道的话。",
   "accuse": "能做到的只有一个人……{X}，就是你！",
   "defend": "笨蛋，不是我！……证据我自己来找。",
   "vote": "我投{X}。证据都齐了。",
   "executed": "兰……对不起，我回不去了。",
   "wish": "把组织一网打尽……然后，回到兰身边。"
  },
  "art": {
   "silhouetteKeys": [
    "one sharp cowlick tuft curling upward at the front of the hair",
    "a second small spiky tuft sticking up at the crown",
    "blazer with notched lapels and a straight necktie",
    "arm extended, index finger pointing straight at the viewer"
   ],
   "hair": "Short, neat dark hair with tidy sides; one prominent tuft springs up and curls at the front hairline, another small tuft sticks up at the back of the head",
   "hairColor": "#2A211C",
   "eyes": "Bright, sharp eyes that narrow when he is reasoning",
   "eyeColor": "#2F6FC2",
   "skin": "#F5DDC9",
   "face": "Clean-cut, handsome teenage face, straight brows, confident corner-of-mouth smirk; no marks",
   "outfit": "Teitan High boys' uniform: blue blazer with notched lapels, matching blue trousers, white shirt, green necktie neatly knotted",
   "outfitColors": [
    "#2D4F9E",
    "#FFFFFF",
    "#2E7D4F"
   ],
   "accessories": "None: no glasses, no bow tie, no watch, no gadgets; bare hands",
   "expression": "A cool, knowing smirk with narrowed eyes and a pointing finger, half the face in shadow, as if he already knows which one of you did it",
   "accent": "#2F6FD6"
  },
  "canWalk": true
 },
 {
  "id": "naruhodo",
  "name": "成步堂龙一",
  "callName": "成步堂龙一",
  "epithet": "逆转律师",
  "work": "《逆转裁判》",
  "gender": "男",
  "age": "二十六岁",
  "heightCm": 176,
  "heightNote": "",
  "era": "二〇一九年（原作里的近未来日本）",
  "knowsModernDevices": true,
  "unknownDevices": "—",
  "stats": {
   "physique": "普通",
   "physiqueNote": "不擅长运动，不会打架",
   "disguise": "低",
   "readsPeople": "一般",
   "medical": "无",
   "observation": "擅长",
   "killThreshold": "高",
   "suspicion": "轻"
  },
  "carried": [
   "律师徽章一枚（别在左领）",
   "勾玉一枚（只是一块玉石）"
  ],
  "quote": {
   "zh": "异议！"
  },
  "dream": "让每个被指控的人都有人替他说话",
  "lines": {
   "wake": "……醒来就在法庭上？不，这不是法庭。",
   "discover": "等等！……谁都不许动证物。",
   "statement": "把想法倒过来——如果凶手做到了，什么必须是真的？",
   "accuse": "异议！{X}，您的证言和这件证物矛盾！",
   "defend": "我、我没有！……总之，先看证物再说！",
   "vote": "我投{X}。但愿我错了。",
   "executed": "……没有证物了。真相，拜托你们了。",
   "wish": "让被指着的人，身边永远有人说“等等”。"
  },
  "art": {
   "silhouetteKeys": [
    "huge spiky hair swept straight back, the spikes jutting out behind the head like a hedgehog",
    "arm thrust straight forward with an accusing index finger",
    "broad, squared suit shoulders",
    "small round badge on the left lapel"
   ],
   "hair": "Jet-black hair slicked entirely backward into large, stiff, pointed spikes that jut out behind and above the head; jagged, zigzag eyebrows",
   "hairColor": "#15161C",
   "eyes": "Dark eyes, wide and locked on target, with nervous intensity",
   "eyeColor": "#34405E",
   "skin": "#F2D8C2",
   "face": "Slightly older-looking face for 26, strong jaw, jagged eyebrows, a bead of cold sweat at the temple; no scars",
   "outfit": "Bright blue two-piece suit, white shirt, pink necktie",
   "outfitColors": [
    "#2350B0",
    "#FFFFFF",
    "#E8738F"
   ],
   "accessories": "Gold attorney's badge pinned on the left lapel; a small green comma-shaped jade magatama (just a stone), held in the hand or peeking from a pocket",
   "expression": "Frozen at the moment of 'Objection!': eyes locked, cold sweat on the temple, a cornered grin that is half panic and half certainty, finger aimed straight at the viewer",
   "accent": "#F2C230"
  },
  "canWalk": true
 },
 {
  "id": "beatrice",
  "name": "贝阿朵莉切",
  "callName": "贝阿朵莉切",
  "epithet": "黄金魔女",
  "work": "《海猫鸣泣之时》",
  "gender": "女",
  "age": "看上去二十岁上下",
  "heightCm": 166,
  "heightNote": "卡上未写身高，按外貌估计",
  "era": "一九八六年的六轩岛",
  "knowsModernDevices": true,
  "unknownDevices": "—",
  "stats": {
   "physique": "普通",
   "physiqueNote": "没有练过什么",
   "disguise": "高",
   "readsPeople": "是",
   "medical": "无",
   "observation": "擅长",
   "killThreshold": "无",
   "suspicion": "中"
  },
  "carried": [
   "金色长烟管一支（日式细杆烟管，烟锅是空的）"
  ],
  "quote": {
   "zh": "妾身用红字说的，全是真实！"
  },
  "dream": "让战人屈服，亲口承认魔女",
  "lines": {
   "wake": "哼……这寒酸的地方，也配开茶会？",
   "discover": "咯咯……死得真漂亮，像魔法一样。",
   "statement": "汝等争吧，吵吧。真相只有妾身看得透，咯咯。",
   "accuse": "{X}，汝的软处，妾身早就摸到了。",
   "defend": "妾身？杀人这种俗事，何须妾身亲自动手。",
   "vote": "妾身选{X}。退场吧，棋子。",
   "executed": "妾、妾身没有输……游戏还没完……永远……",
   "wish": "让战人跪在妾身脚下，亲口认妾身为魔女。"
  },
  "art": {
   "silhouetteKeys": [
    "tall swept-up blonde updo piled high at the back of the head, two curled locks hanging at the temples",
    "oversized ribbon bow studded with red roses sitting behind the bun",
    "long, very thin golden kiseru pipe held up at shoulder height like a conductor's baton",
    "tight choker collar at the throat",
    "puffed gown shoulders over a corseted bodice that flares into a bell skirt"
   ],
   "hair": "Long golden hair with a reddish tint, swept back from the face and pinned high at the back of the head into a large, voluminous coiled bun; short fringe parted to the sides; two springy curled side locks framing the cheeks",
   "hairColor": "#E2AE4C",
   "eyes": "Large almond eyes with heavy upper lashes and lifted outer corners; lids half-lowered, looking down her nose at the viewer",
   "eyeColor": "#3C6FD1",
   "skin": "#F7E4D6",
   "face": "Elegant oval face, thin sharply arched brows, painted red lips. When she laughs the whole face contorts: mouth stretched wide showing teeth, brows pinched, eyes squeezed to slits. No scars.",
   "outfit": "Victorian-style ball gown: fitted corseted bodice with puffed shoulders, white lace frills at the neckline, layered ruffles; dark wine-crimson and black layers edged in gold trim; full bell skirt below the frame",
   "outfitColors": [
    "#7A1426",
    "#16100F",
    "#C9A227",
    "#F0DDE3"
   ],
   "accessories": "Golden kiseru (long slender Japanese pipe) with an empty bowl; black choker collar; large pink ribbon bow decorated with red roses in her hair. Golden butterflies may appear only as a faint background motif (her magic is gone).",
   "expression": "Head thrown back mid-laugh, eyes narrowed and sliding down toward the viewer, mouth split into a wide, twisted, gleeful grin; theatrical cruelty, the pipe stem pointed at the viewer as if saying 'go on, explain it'",
   "accent": "#D4A72C"
  },
  "canWalk": true
 },
 {
  "id": "battler",
  "name": "右代宫战人",
  "callName": "右代宫战人",
  "epithet": "魔女否定者",
  "work": "《海猫鸣泣之时》",
  "gender": "男",
  "age": "十八岁",
  "heightCm": 180,
  "heightNote": "卡上写'一米八以上'，取下限180",
  "era": "一九八六年的日本",
  "knowsModernDevices": true,
  "unknownDevices": "—",
  "stats": {
   "physique": "普通",
   "physiqueNote": "高大，打过架，没有练过格斗",
   "disguise": "低",
   "readsPeople": "一般",
   "medical": "无",
   "observation": "一般",
   "killThreshold": "高",
   "suspicion": "轻"
  },
  "carried": [],
  "quote": {
   "zh": "无论如何我都要否定你！！不管多不可思议，我全都用'人'来解释给你看！！！"
  },
  "dream": "否定魔女，找出六轩岛的真相",
  "lines": {
   "wake": "喂……这是哪？又是魔女的把戏吧？",
   "discover": "混账……这是人干的，不是魔法！",
   "statement": "不行，完全不行。把棋盘翻过来想：凶手最怕的是哪一步？",
   "accuse": "{X}，你这家伙！你刚才的话，前后对不上啊！",
   "defend": "你们要我证明我没做？这是恶魔的证明！",
   "vote": "……我投{X}。对不住了。",
   "executed": "……我不认输。只要我不认，就不算输！",
   "wish": "老爸、雾江姐、大家……都给我活着回来！"
  },
  "art": {
   "silhouetteKeys": [
    "voluminous spiky red hair that flares outward and flips up at the ends, fuller on top",
    "tall, broad shoulders in a cream suit jacket with wide notched lapels",
    "narrow black tie over a red shirt, black waistcoat showing in the V",
    "small gold one-winged eagle crest pinned on the right lapel",
    "huge open toothy grin"
   ],
   "hair": "Messy, layered short-to-medium hair, spiky and voluminous, the tips at the sides and nape flicking outward; loose bangs falling over the forehead",
   "hairColor": "#C7352B",
   "eyes": "Wide, expressive eyes under straight, mobile brows; quick to flash panic, anger or mischief",
   "eyeColor": "#3E73C2",
   "skin": "#F2D4BE",
   "face": "Youthful face with a strong jaw, broad grin showing teeth, brows that knot together when angry; a bead of sweat at the temple when cornered. No scars.",
   "outfit": "Off-white cream suit jacket worn open, matching trousers, buttoned black waistcoat, red dress shirt, slim black tie; family crest pin on the right lapel",
   "outfitColors": [
    "#EAE2CF",
    "#B4232C",
    "#18181C",
    "#C9A227"
   ],
   "accessories": "Gold pin of the Ushiromiya family crest, a one-winged eagle, on the right lapel. Nothing in his hands.",
   "expression": "Cornered but defiant: a wide grin with clenched teeth while sweat runs down his temple, eyes glaring straight at the viewer, a man refusing to lose as the walls close in",
   "accent": "#E0592A"
  },
  "canWalk": true
 },
 {
  "id": "haruaki",
  "name": "房石阳明",
  "callName": "房石阳明",
  "epithet": "说谎的旅人",
  "work": "《人狼村之谜》",
  "gender": "男",
  "age": "二十多岁",
  "heightCm": 175,
  "heightNote": "卡上未写身高，按外貌估计",
  "era": "二〇一〇年代的东京",
  "knowsModernDevices": true,
  "unknownDevices": "—",
  "stats": {
   "physique": "普通",
   "physiqueNote": "不会打，遇事靠嘴，动手靠别人",
   "disguise": "高",
   "readsPeople": "是",
   "medical": "无",
   "observation": "一般",
   "killThreshold": "无",
   "suspicion": "重"
  },
  "carried": [
   "指针腕表一只（戴在手腕上）"
  ],
  "quote": {
   "zh": "我生来就没有对错的感觉，我能做的，顶多是照着别人的'正确'去模仿。"
  },
  "dream": "真相——弄明白说不通的事",
  "lines": {
   "wake": "……又是起点吗？不对，这里不是休水。",
   "discover": "哈，后颈发麻……这下有意思了。",
   "statement": "诶多——我就是个路过的。不过刚才，有人改口了吧？",
   "accuse": "{X}，你提到昨晚时慢了半拍。为什么？",
   "defend": "行，那句是我撒的谎。可你们漏了更要紧的。",
   "vote": "诶多——那我就投{X}吧。",
   "executed": "……这次，还能回到摩托车上吗？",
   "wish": "告诉我，这座馆的规矩到底是谁定的。"
  },
  "art": {
   "silhouetteKeys": [
    "tousled medium-short hair with a loose side-swept fringe",
    "biker leather jacket with a wide collar, worn open",
    "relaxed slouch with one hand in a pocket",
    "a wolf mask raised beside or half over his face",
    "analog wristwatch on the wrist holding the mask"
   ],
   "hair": "Medium-short dyed-brown hair, soft and slightly messy, wind-tousled from riding; side-swept fringe falling over one brow",
   "hairColor": "#8B5A33",
   "eyes": "Ordinary, friendly-looking eyes, slightly narrowed; the smile never quite reaches them, giving a watchful, detached look, as if listening for a wrong word",
   "eyeColor": "#6A4328",
   "skin": "#F0D3BC",
   "face": "Pleasant, approachable young-man face, easy lopsided smile, relaxed brows; no marks or scars",
   "outfit": "Black leather rider's jacket over a T-shirt with horizontal stripes fading from white to grey, jeans; a motorcycle-touring look",
   "outfitColors": [
    "#211D1B",
    "#E3E3E1",
    "#8C8C8C",
    "#3E5878"
   ],
   "accessories": "Analog wristwatch; a wolf-god mask (just a plain carved wolf-face mask with no powers), held in one hand or pushed halfway over his face",
   "expression": "A genial, harmless smile on the mouth while the eyes stay flat and appraising; head tilted as if politely listening, half his face slipping behind the wolf mask",
   "accent": "#B86B3A"
  },
  "canWalk": true
 },
 {
  "id": "yumeko",
  "name": "蛇喰梦子",
  "callName": "蛇喰梦子",
  "epithet": "赌狂",
  "work": "《狂赌之渊》",
  "gender": "女",
  "age": "按十八岁计（高二转学生）",
  "heightCm": 165,
  "heightNote": "卡上只写'个子偏高'，没有数字；按同龄女性偏高估算",
  "era": "二〇一〇年代的日本",
  "knowsModernDevices": true,
  "unknownDevices": "—",
  "stats": {
   "physique": "普通",
   "physiqueNote": "体力差，爬几层楼就喘",
   "disguise": "高",
   "readsPeople": "是",
   "medical": "无",
   "observation": "擅长",
   "killThreshold": "低",
   "suspicion": "轻"
  },
  "carried": [
   "扑克牌一副（未拆封）",
   "口红一支",
   "银戒指（左手拇指，父母的婚戒之一）"
  ],
  "quote": {
   "zh": "来狂赌一场吧！"
  },
  "dream": "一场押上一切、谁也不知结果的赌",
  "lines": {
   "wake": "哎呀，这是哪里呢？好像会很有趣呢。",
   "discover": "哎呀……这一局，是谁赢了呢？",
   "statement": "这场审判也是一场赌呢。各位，都押上自己的命了吧？",
   "accuse": "{X}，您出千了呢。手法让我来讲给您听吧。",
   "defend": "是我又如何呢？那么，我们就赌一赌真相吧？",
   "vote": "我押在{X}身上哦。",
   "executed": "输了呢……多么美妙的一局，谢谢各位。",
   "wish": "请再给我一张赌桌，和一位肯押上一切的人。"
  },
  "art": {
   "silhouetteKeys": [
    "very long, perfectly straight black hair in a blunt hime cut: straight-across bangs plus cheek-length side locks",
    "red school blazer shoulders over a white collar with a black cross-shaped bow",
    "a fan of playing cards held up near her face",
    "one fingertip pressed to her lower lip"
   ],
   "hair": "Jet-black, glossy, perfectly straight hair reaching her hips; heavy blunt bangs cut straight at brow level; side locks cut straight at cheek/chin length (classic hime cut)",
   "hairColor": "#0F0C12",
   "eyes": "Large, round, long-lashed eyes; sweet and calm normally, but when gambling the wine-red irises glow bright red, the eyes open wide and intense",
   "eyeColor": "#A0182F",
   "skin": "#F8E7DE",
   "face": "Beautiful soft features, light pink lip gloss, red-painted nails; when excited a deep blush spreads across her cheeks and her lips part in a breathless smile",
   "outfit": "Hyakkaou Private Academy girls' uniform: red blazer, white shirt, black cross-shaped bow tie at the collar, black-and-grey plaid short skirt, black tights, brown loafers",
   "outfitColors": [
    "#B11E2E",
    "#F4F1EC",
    "#141214",
    "#55545C"
   ],
   "accessories": "Silver ring on her left thumb; a deck of playing cards, fanned out; red nail polish",
   "expression": "Gambling ecstasy: cheeks flushed crimson, glowing red eyes wide open, lips parted in an enraptured smile with a fingertip at her lip; polite and sweet, yet frighteningly eager",
   "accent": "#C8102E"
  },
  "canWalk": true
 },
 {
  "id": "baku",
  "name": "斑目貘",
  "callName": "斑目貘",
  "epithet": "噬谎者",
  "work": "《噬谎者》",
  "gender": "男",
  "age": "二十多岁",
  "heightCm": 173,
  "heightNote": "卡上未写身高，按外貌估计",
  "era": "二〇〇〇年代的日本",
  "knowsModernDevices": true,
  "unknownDevices": "—",
  "stats": {
   "physique": "普通",
   "physiqueNote": "瘦，没练过，体弱，跑两步就喘",
   "disguise": "高",
   "readsPeople": "是",
   "medical": "无",
   "observation": "擅长",
   "killThreshold": "低",
   "suspicion": "重"
  },
  "carried": [],
  "quote": {
   "zh": "你是个骗子呢。"
  },
  "dream": "赢下屋形越え，坐上赌郎顶点",
  "lines": {
   "wake": "嗯——新的赌场？那，庄家是谁呢。",
   "discover": "哦——有人已经收取了啊。",
   "statement": "大家多说点嘛。说得越多，谎就越藏不住哦。",
   "accuse": "{X}，你第二次说的，和第一次不一样呢。",
   "defend": "我？跑两步就喘的人，杀得了谁啊。",
   "vote": "我押{X}。赌约，要兑现哦。",
   "executed": "嗯，输了就给。……哈尔，下次再赌。",
   "wish": "让我回到那座塔前，和哈尔赌完这一局。"
  },
  "art": {
   "silhouetteKeys": [
    "big cloud of fluffy, curly silver hair, wider than his head",
    "slender, narrow-shouldered frame in a loose suit jacket",
    "long thin neck rising from an open shirt collar, no tie",
    "a fingertip raised lazily to his lips",
    "both eyes uncovered: no eyepatch"
   ],
   "hair": "Voluminous, fluffy, wavy-curly silver-white hair of medium length, falling loosely over the forehead and ears in soft clumps",
   "hairColor": "#D7DBE2",
   "eyes": "Large, clear eyes with a lazy, half-lidded look and an unnervingly sharp focus underneath; jet-black eyebrows that contrast with the silver hair",
   "eyeColor": "#4C8FD6",
   "skin": "#F4E5DA",
   "face": "Delicate, handsome, slightly boyish face; thin, a little gaunt and pale; black brows. Both eyes are intact: draw NO eyepatch.",
   "outfit": "Dark suit worn casually: jacket hanging open, white shirt with the top button undone, no tie",
   "outfitColors": [
    "#262A33",
    "#F1F1EE",
    "#4A5160"
   ],
   "accessories": "None: he carries nothing in this game (no eyepatch, no snacks, no cards)",
   "expression": "A lazy, playful half-smile with the head slightly tilted: the look of someone who has just caught you in a lie and is enjoying letting you keep talking",
   "accent": "#8EC5F0"
  },
  "canWalk": true
 },
 {
  "id": "kaiji",
  "name": "伊藤开司",
  "callName": "伊藤开司",
  "epithet": "绝境赌徒",
  "work": "《赌博默示录》",
  "gender": "男",
  "age": "二十多岁",
  "heightCm": 178,
  "heightNote": "卡上写的是“一米七八上下”",
  "era": "二〇〇〇年前后的东京",
  "knowsModernDevices": true,
  "unknownDevices": "—",
  "stats": {
   "physique": "普通",
   "physiqueNote": "体格不差，手巧",
   "disguise": "低",
   "readsPeople": "一般",
   "medical": "无",
   "observation": "一般",
   "killThreshold": "高",
   "suspicion": "中"
  },
  "carried": [],
  "quote": {
   "zh": "不为了赢活着，还活着干什么……！"
  },
  "dream": "还清债务，带同伴一起上岸",
  "lines": {
   "wake": "又、又是谁设的局……可恶……",
   "discover": "开、开什么玩笑……真的死了……",
   "statement": "等等……这条规矩是谁提的？从那里往回推……！",
   "accuse": "是你……{X}！从头到尾都是你在出千！",
   "defend": "不、不是我……！我是信你们才……混账！",
   "vote": "我押{X}……全部押上！",
   "executed": "可恶……还没上岸啊……对不住了……",
   "wish": "带大家一起上岸……再来罐冰啤酒……！"
  },
  "art": {
   "silhouetteKeys": [
    "ragged shoulder-length black hair hanging in jagged, uncombed clumps around the face",
    "extremely long, sharply pointed chin and a long blade-like nose (Fukumoto manga style), very readable in profile",
    "hunched, rounded shoulders inside an open, sagging jacket collar",
    "a stitched ring-shaped scar around the base of the left ear",
    "beads of sweat flicking off the face"
   ],
   "hair": "Thick, straight but never-combed black hair falling to the shoulders, split into jagged pointed clumps; heavy, uneven bangs hanging into the eyes; strands stuck to the sweaty forehead and cheeks",
   "hairColor": "#17171c",
   "eyes": "Narrow, sharp, slightly slanted eyes with small dark irises and a lot of white showing; heavy brow line; capable of both cowering and ferocity — draw them in the instant they turn fierce, with tears brimming at the lower lids",
   "eyeColor": "#2a1d16",
   "skin": "#e6c39f",
   "face": "Gaunt young man of 23-24. Fukumoto-style exaggerated geometry: a very long, pointed chin and a long angular nose; hollow cheeks; a short old scar on the left cheek; a visible ring of stitch-scar where the left ear was cut off and sewn back; face glistening with sweat",
   "outfit": "Worn-out, faded dark jacket hanging open over a rumpled, slightly yellowed light collared shirt; poor, unkempt look; posture slouched",
   "outfitColors": [
    "#2b2b30",
    "#d9d4c7",
    "#3d4a5c"
   ],
   "accessories": "None at all — no props, no jewelry. If a hand enters the frame, the left hand shows ring-shaped scars at the base of four fingers. A brand scar on the left shoulder is hidden under the clothes",
   "expression": "Drenched in sweat, teeth clenched, tears welling — yet the eyes have suddenly gone still, low and sharp: the exact moment his panic flips into cold calculation",
   "accent": "#C9A227"
  },
  "canWalk": true
 },
 {
  "id": "makima",
  "name": "玛奇玛",
  "callName": "玛奇玛",
  "epithet": "支配的恶魔",
  "work": "《电锯人》",
  "gender": "女",
  "age": "二十多岁模样",
  "heightCm": 173,
  "heightNote": "卡上未写身高，按外貌估计",
  "era": "一九九七年，另一个日本",
  "knowsModernDevices": true,
  "unknownDevices": "—",
  "stats": {
   "physique": "普通",
   "physiqueNote": "没练过拳脚；她的强从来不在身上",
   "disguise": "高",
   "readsPeople": "是",
   "medical": "无",
   "observation": "一般",
   "killThreshold": "无",
   "suspicion": "中"
  },
  "carried": [
   "公安的证件一本"
  ],
  "quote": {
   "zh": "你有两个选择。作为恶魔被我杀掉，或者作为人被我养着。"
  },
  "dream": "更好的世界，和并肩的存在",
  "lines": {
   "wake": "嗯……这里的人，都缺些什么呢。",
   "discover": "死掉了呢。大家，不用怕。",
   "statement": "不用急。谁在说谎，等一等，自己就会露出来的。",
   "accuse": "{X}君，你做得很好。可惜，到此为止了。",
   "defend": "怀疑我也没关系。只是，你确定吗？",
   "vote": "我投{X}君。大家也一样吧？",
   "executed": "……原来，这次醒不过来了呢。",
   "wish": "请让恐惧消失。这样，就有人肯抱我了吧。"
  },
  "art": {
   "silhouetteKeys": [
    "one long, thick single braid hanging down the back (swing it over one shoulder so it reads in silhouette)",
    "straight bangs lightly parted at the center, with two long side locks framing the face down to the jaw",
    "crisp pointed shirt collar with a narrow necktie",
    "long coat with broad lapels draped over the shoulders",
    "perfectly upright, still posture; head very slightly tilted"
   ],
   "hair": "Long reddish hair (muted coral / copper red) woven into a single thick braid that hangs down her back; smooth straight bangs parted slightly in the middle; two long side locks falling past the cheeks to the chin",
   "hairColor": "#c9614e",
   "eyes": "Large, calm, slightly half-lidded eyes that never blink; golden-yellow irises patterned with two or three concentric darker rings around the pupil, like ripples or a target",
   "eyeColor": "#e2b13c",
   "skin": "#f6e3d6",
   "face": "Soft oval face, refined and pretty, completely flawless — no scars or marks; small closed-lip smile; the ringed eyes are the only unsettling feature",
   "outfit": "Office-worker / government-agent look: crisp white collared dress shirt, slim black necktie, black trousers, and a long dark overcoat worn open or draped over the shoulders",
   "outfitColors": [
    "#f5f3ee",
    "#141418",
    "#2c2c33"
   ],
   "accessories": "No jewelry; the black necktie is her only ornament. Optionally a small black Public Safety ID booklet held in one hand",
   "expression": "A gentle, motherly closed-mouth smile while the ringed golden eyes stare straight through the viewer, unblinking — kindness with zero warmth behind it, like someone looking at a well-trained dog",
   "accent": "#D4A017"
  },
  "canWalk": true
 },
 {
  "id": "muzan",
  "name": "鬼舞辻无惨",
  "callName": "东云",
  "epithet": "鬼之始祖",
  "work": "《鬼灭之刃》",
  "gender": "男",
  "age": "看上去二十五到三十岁",
  "heightCm": 179,
  "heightNote": "",
  "era": "大正初年（一九一〇年代中期）的日本",
  "knowsModernDevices": false,
  "unknownDevices": "冰箱冷柜、洗衣机、烘干机、洗碗机、跑步机、泳池的水下灯、有声的彩色影片与放映机、播放器与扬声器、保龄球馆的自动设备与计分屏、电磁灶、塑料。电灯、电话、汽车、火车他都熟。",
  "stats": {
   "physique": "普通",
   "physiqueNote": "高大，没学过武艺",
   "disguise": "高",
   "readsPeople": "一般",
   "medical": "基本常识",
   "observation": "一般",
   "killThreshold": "无",
   "suspicion": "重"
  },
  "carried": [],
  "quote": {
   "zh": "不对，不对，不对，不对。我是无限接近完美的生物。"
  },
  "dream": "不死，以完美之姿永远不变",
  "lines": {
   "wake": "……日光。这里照得进日光吗。",
   "discover": "死了。别吵，与我无关。",
   "statement": "我不会有差错。我说是谁，就是谁。",
   "accuse": "{X}。你的话里有一个字不对。说说看？",
   "defend": "怀疑我？放肆。你凭什么审我？",
   "vote": "{X}。该死的是你。",
   "executed": "不对，不对，不对……我不可能死。",
   "wish": "站在日光下，永远不老、不死、不变。"
  },
  "art": {
   "silhouetteKeys": [
    "medium-short black hair in loose glossy waves, curling outward at the ears and nape",
    "Inverness cape coat: a short shoulder cape layered over a long coat, giving a wide, sloping shoulder line",
    "tall stiff white shirt collar and tie",
    "chin raised, aristocratic upright posture, looking down",
    "long, narrow face"
   ],
   "hair": "Glossy black hair of medium-short length in soft loose waves, swept back off the forehead; wavy ends curl outward around the ears and at the nape; one or two wavy strands fall onto the forehead",
   "hairColor": "#121015",
   "eyes": "Long, narrow, sharply upturned almond eyes under thin straight brows; plum-blossom pinkish-red irises (a red rarely seen in a living face) with ROUND normal pupils — do NOT draw demon slit pupils",
   "eyeColor": "#d6476b",
   "skin": "#e9e4ea",
   "face": "Narrow, elegant, refined Taisho-era gentleman's face; skin so pale it looks faintly bluish; faint grey-blue shadows under the eyes that make him look slightly sickly; thin lips; no scars",
   "outfit": "Immaculate black Western three-piece suit, white high stiff-collared shirt, dark tie; over it a dark charcoal Inverness cape coat. Not a speck of dirt anywhere",
   "outfitColors": [
    "#1c1c22",
    "#f2f0ea",
    "#2e2a33",
    "#5a1a28"
   ],
   "accessories": "None — he carries nothing; the perfection of the tailoring is the ornament",
   "expression": "A courteous, faint gentleman's smile that never reaches the eyes; eyes looking down at the viewer from slightly above, cold and contemptuous, with the barest twitch of irritation held in check — as if the viewer just said he looks ill",
   "accent": "#C2304F"
  },
  "canWalk": true
 },
 {
  "id": "shinobu",
  "name": "蝴蝶忍",
  "callName": "蝴蝶忍",
  "epithet": "虫柱",
  "work": "《鬼灭之刃》",
  "gender": "女",
  "age": "十八岁",
  "heightCm": 151,
  "heightNote": "",
  "era": "大正初年（一九一〇年代中期）的日本",
  "knowsModernDevices": false,
  "unknownDevices": "冰箱冷柜、洗衣机、烘干机、洗碗机、跑步机、泳池的水下灯、有声的彩色影片与放映机、播放器与扬声器、保龄球馆的自动设备与计分屏、电磁灶、塑料；抽水马桶和淋浴少见。电灯、火车、自来水她见过。",
  "stats": {
   "physique": "受训",
   "physiqueNote": "力气小",
   "disguise": "高",
   "readsPeople": "是",
   "medical": "有",
   "observation": "擅长",
   "killThreshold": "中",
   "suspicion": "中"
  },
  "carried": [
   "蝶翅纹样的羽织（姐姐的遗物）"
  ],
  "quote": {
   "zh": "要是人和鬼大家都能好好相处就好了呢。"
  },
  "dream": "不再有人一夜之间失去家人",
  "lines": {
   "wake": "哎呀，这是哪里呢？……先找找药吧。",
   "discover": "哎呀，已经凉了呢。让我验一验哦。",
   "statement": "尸体是不会说谎的哦。说谎的，是活着的人呢。",
   "accuse": "{X}先生，您说的话和您身上，对不上呢。",
   "defend": "哎呀，怀疑我呀？我这么小个子，搬得动尸体吗？",
   "vote": "投{X}先生哦。别怪我呀。",
   "executed": "姐姐……抱歉，我没能做到最后呢。",
   "wish": "再也没有人失去家人……这样就好了呢。"
  },
  "art": {
   "silhouetteKeys": [
    "very petite, narrow-shouldered small frame (151 cm, 37 kg)",
    "short hair pinned up into a rounded updo at the back of the head",
    "a large butterfly hair ornament with spread wings at the back/side of the updo",
    "straight fringe plus two chin-length side locks",
    "wide haori sleeves whose hem carries butterfly-wing veining"
   ],
   "hair": "Short black hair pinned up at the back into a neat rounded updo, held by a butterfly ornament; straight fringe across the forehead and two chin-length side locks; the hair ends fade into purple",
   "hairColor": "#151219",
   "eyes": "Large, round eyes that curve into upturned crescents when she smiles; when open, pale violet irises with a glassy, almost pupil-less look",
   "eyeColor": "#a58ad8",
   "skin": "#f8e8dc",
   "face": "Small, delicate, young face with a soft rounded chin; no scars; lips set in a constant sweet smile",
   "outfit": "Black Demon Slayer Corps uniform with a tall stand-up collar; over it her late sister's haori: white at the shoulders, its lower part fading into teal-green and pink, printed with black-veined butterfly-wing patterns",
   "outfitColors": [
    "#14141c",
    "#f7f5f2",
    "#5cc4b2",
    "#e797b5"
   ],
   "accessories": "Butterfly-shaped hair ornament (violet-pink wings outlined in black) pinned to the updo. No sword — her Nichirin blade is not with her",
   "expression": "A sweet closed-eye smile with the head slightly tilted, voice almost audible as soft politeness — but a tiny throbbing vein at the temple and the faintest tightness at the corner of the mouth betray the fury she has been holding down for years",
   "accent": "#8F6AD6"
  },
  "canWalk": true
 },
 {
  "id": "higuruma",
  "name": "日车宽见",
  "callName": "日车宽见",
  "epithet": "堕落的律师",
  "work": "《咒术回战》",
  "gender": "男",
  "age": "三十六岁",
  "heightCm": 170,
  "heightNote": "卡上只写“中等个子”，按日本成年男性的中等身高约一米七推定",
  "era": "二〇一八年十一月的东京",
  "knowsModernDevices": true,
  "unknownDevices": "—",
  "stats": {
   "physique": "普通",
   "physiqueNote": "十几天的实战经验，身体没练过",
   "disguise": "中",
   "readsPeople": "是",
   "medical": "无",
   "observation": "擅长",
   "killThreshold": "高",
   "suspicion": "中"
  },
  "carried": [
   "律师徽章一枚（金色向日葵，花心一架天平）"
  ],
  "quote": {
   "zh": "为了不把抓住我的手甩开，至少我自己，想睁着眼睛。"
  },
  "dream": "一种不闭眼的正义",
  "lines": {
   "wake": "……这里的规则，写在哪儿？",
   "discover": "别碰现场。谁最先看见的？",
   "statement": "证据只有这些，定不了罪。投票的时候，请睁着眼睛。",
   "accuse": "{X}，你的证词和时间线对不上。解释。",
   "defend": "要定我的罪，请拿证据来。印象不算数。",
   "vote": "{X}。……证据指向你。",
   "executed": "闭着眼的判决……这次轮到我了。",
   "wish": "把那桩案子……重审一次。这次，睁着眼。"
  },
  "art": {
   "silhouetteKeys": [
    "short hair slicked straight back that breaks into a few separate clumped strands falling over the forehead",
    "narrow, tired face with heavy drooping eyelids",
    "black suit lapels with a small round gold badge on the left lapel",
    "neat tie knot at a white collar",
    "loose, slightly slouched shoulders"
   ],
   "hair": "Short dark-brown hair combed back from the forehead, but not sleek: it separates into distinct clumped strands, a few of which drop forward over the brow",
   "hairColor": "#4a3426",
   "eyes": "Small dark irises floating in a lot of white (sanpaku), under heavy half-lowered lids with deep tired bags beneath — a man who hasn't slept properly in weeks",
   "eyeColor": "#2b211c",
   "skin": "#c9a07e",
   "face": "36-year-old man, lean face with slightly sunken cheeks and faintly tanned skin; deep under-eye bags; flat, unsmiling mouth; no scars",
   "outfit": "Black business suit, white dress shirt, dark necktie neatly knotted — a working defense attorney's suit, slightly rumpled",
   "outfitColors": [
    "#16161a",
    "#f2f2ee",
    "#2a2d36",
    "#d4a72c"
   ],
   "accessories": "Japanese lawyer's badge on the left lapel: a small gold sunflower with a tiny balance scale in its center",
   "expression": "Deadpan, exhausted half-lidded stare with tiny pupils, mouth flat — someone who has given up expecting justice from anyone, yet is still quietly cross-examining everything in front of him",
   "accent": "#D9A521"
  },
  "canWalk": true
 },
 {
  "id": "itachi",
  "name": "宇智波鼬",
  "callName": "宇智波鼬",
  "epithet": "灭族的兄长",
  "work": "《火影忍者》",
  "gender": "男",
  "age": "二十一岁",
  "heightCm": 178,
  "heightNote": "",
  "era": "忍界·第四次忍界大战之前",
  "knowsModernDevices": false,
  "unknownDevices": "电梯，有声的影片和放映机，放音乐的机器，洗衣、烘干、洗碗的机器，泳池的水下灯，保龄球馆和它的机器，跑步机，电磁灶，充电电钻，电子秤和电子屏，投影机。",
  "stats": {
   "physique": "受训",
   "physiqueNote": "顶尖，手里剑与体术；身形瘦，靠速度、准头和判断",
   "disguise": "高",
   "readsPeople": "是",
   "medical": "战场急救",
   "observation": "擅长",
   "killThreshold": "中",
   "suspicion": "重"
  },
  "carried": [
   "刻着“朱”字的“晓”戒指（右手无名指）"
  ],
  "quote": {
   "zh": "愚蠢的弟弟啊，想杀我的话，就怨恨我吧！憎恨我吧！"
  },
  "dream": "不再打仗的世界；佐助活下去",
  "lines": {
   "wake": "……眼睛，看得清了。这不对。",
   "discover": "……别乱动。先看清楚，再说。",
   "statement": "你们看见的，未必是发生过的。凶手要的，正是这个。",
   "accuse": "{X}，布置得很好。可惜替身留了脚印。",
   "defend": "随你们怎么想。罪名，我背惯了。",
   "vote": "{X}。这笔账，记在我身上。",
   "executed": "这样也好……只是，佐助还在等我。",
   "wish": "让佐助亲手了结我，从此不必再恨。"
  },
  "art": {
   "silhouetteKeys": [
    "Very tall stiff cloak collar standing up to the chin",
    "Center-parted bangs hanging as two long straight locks on either side of the face",
    "Low ponytail tied at the nape",
    "Forehead protector plate with a long horizontal slash through the symbol",
    "Narrow sloping shoulders, thin tall frame"
   ],
   "hair": "Straight black hair pulled into a low ponytail at the nape; bangs parted in the middle, falling as two long straight locks past the cheeks to the chin, framing the face",
   "hairColor": "#111113",
   "eyes": "Narrow, calm, heavy-lidded eyes, looking slightly past the viewer; ordinary dark irises in-game",
   "eyeColor": "#1A1414",
   "skin": "#EFDCC9",
   "face": "A long, deep line running down from the inner corner of each eye onto the cheek, making him look older and worn out; slim oval face, straight nose; mouth and jaw partly hidden behind the high collar",
   "outfit": "Akatsuki cloak: black, covered with red cloud motifs outlined in white, with an extremely high stiff collar rising to the chin; a metal forehead protector on a dark cloth band, its leaf symbol scratched through with one horizontal line",
   "outfitColors": [
    "#111111",
    "#C8102E",
    "#FFFFFF",
    "#8A96A3"
   ],
   "accessories": "Ring on the right ring finger engraved with the kanji 朱; slashed Konoha forehead protector",
   "expression": "Quiet, exhausted calm; half-lidded eyes that look through you; no smile; an unreadable, sad gentleness that feels like it could be a lie",
   "accent": "#D21F3C"
  },
  "canWalk": true
 },
 {
  "id": "madara",
  "name": "宇智波斑",
  "callName": "宇智波斑",
  "epithet": "战国修罗",
  "work": "《火影忍者》",
  "gender": "男",
  "age": "壮年模样",
  "heightCm": 179,
  "heightNote": "",
  "era": "忍界·第四次忍界大战",
  "knowsModernDevices": false,
  "unknownDevices": "电梯，有声的影片和放映机，放音乐的机器，洗衣、烘干、洗碗的机器，泳池的水下灯，保龄球馆和它的机器，跑步机，电磁灶，充电电钻，电子秤和电子屏，投影机。",
  "stats": {
   "physique": "受训",
   "physiqueNote": "顶尖；几十年战场练出的体术、忍具与兵器，近身搏杀的好手",
   "disguise": "中",
   "readsPeople": "一般",
   "medical": "战场急救",
   "observation": "擅长",
   "killThreshold": "无",
   "suspicion": "中"
  },
  "carried": [
   "手套"
  ],
  "quote": {
   "zh": "看来你已经跳不动了，大野木。"
  },
  "dream": "真正的和平：再没有人失去亲人",
  "lines": {
   "wake": "哼。又是哪个小鬼把我唤醒的？",
   "discover": "让我看看伤口。是哪一路的手法。",
   "statement": "小鬼们，把手伸出来。茧不会说谎。",
   "accuse": "{X}，这支舞跳得不坏，可惜脚步露了底。",
   "defend": "我斑若要动手，你们连尸体都找不到。",
   "vote": "我投{X}。这支舞，你跳完了。",
   "executed": "死在小鬼们的举手里……柱间，你会笑我吧。",
   "wish": "那就让所有人睡去，梦里不再有败者。"
  },
  "art": {
   "silhouetteKeys": [
    "Enormous wild mane of black hair flaring out and down to the waist, ends stiff and jagged like a spiked fan",
    "Long uneven bangs sweeping down over the right eye",
    "A dark high-collared long robe, no armour",
    "High stiff collar rising to the jaw",
    "Arms folded across the chest, chin raised"
   ],
   "hair": "Very thick, voluminous straight-to-spiky black hair falling to the waist, the whole mass bristling outward with hard jagged tips; long ragged bangs hang down and fully cover the right eye; a few strands frame the left cheek",
   "hairColor": "#121214",
   "eyes": "Sharp, narrow almond eyes with heavy upper lids, gaze tilted down at the viewer; only the left eye visible; ordinary black iris (no sharingan in-game); faint creases beneath the eye",
   "eyeColor": "#1A1717",
   "skin": "#EAD7C3",
   "face": "Pale, lean, sharp-jawed face with high cheekbones; no scars; mouth thin and set; the right half of the face shadowed by hair",
   "outfit": "Dark navy high-collared long robe, collar standing up to the jaw; no armour; dark gloves",
   "outfitColors": [
    "#1B1E2B",
    "#2A2626",
    "#7A1F1F"
   ],
   "accessories": "Dark gloves; no war-fan (gunbai), no weapon",
   "expression": "A slow, contemptuous half-smile, one visible eye looking down at the viewer like an elder appraising a child who wants to fight; utterly at ease, faintly bored, as if waiting for you to make it interesting",
   "accent": "#9B1C1C"
  },
  "canWalk": true
 },
 {
  "id": "sasuke",
  "name": "宇智波佐助",
  "callName": "宇智波佐助",
  "epithet": "最后的宇智波",
  "work": "《火影忍者》",
  "gender": "男",
  "age": "看上去十八岁",
  "heightCm": 168,
  "heightNote": "",
  "era": "忍界·第四次忍界大战结束后不久",
  "knowsModernDevices": false,
  "unknownDevices": "电梯，有声的影片和放映机，放音乐的机器，洗衣、烘干、洗碗的机器，泳池的水下灯，保龄球馆和它的机器，跑步机，电磁灶，充电电钻，电子秤和电子屏，投影机。",
  "stats": {
   "physique": "受训",
   "physiqueNote": "顶尖，剑术、体术与手里剑；只剩右臂，抓、挡、攀爬都比从前难",
   "disguise": "中",
   "readsPeople": "一般",
   "medical": "战场急救",
   "observation": "一般",
   "killThreshold": "中",
   "suspicion": "中"
  },
  "carried": [
   "深色高领长斗篷",
   "斗篷底下一身深色衣裤",
   "划了一道的旧木叶护额（收在斗篷底下）"
  ],
  "quote": {
   "zh": "正因为有羁绊才痛苦！失去它是什么滋味，你这种人怎么会懂！"
  },
  "dream": "亲眼看清世界，赎罪，与鸣人一战",
  "lines": {
   "wake": "哼……我明明还在路上。这是哪？",
   "discover": "……退后。打斗的痕迹，我来看。",
   "statement": "我不信你们的话。我只看谁做了什么，做到哪一步。",
   "accuse": "{X}，拿“真相”牵人走的把戏，我见过。",
   "defend": "哼。我欠的账够多了，这笔不是我的。",
   "vote": "我投{X}。我亲眼看过了。",
   "executed": "……对不起，鸣人。那一场，打不成了。",
   "wish": "放我回去。赎罪的路，我自己走完。"
  },
  "art": {
   "silhouetteKeys": [
    "Spiky hair flaring up and backward at the back of the head",
    "Long bangs falling down over the left half of the face",
    "Tall stiff cloak collar up to the jaw",
    "Asymmetric shoulders: the cloak hangs flat and empty on the left where the arm is missing",
    "Slim, very upright posture"
   ],
   "hair": "Black hair with a blue-black sheen; short at the back where it sticks out in stiff backward spikes; long straight bangs hang down in front, covering the left eye and most of the left half of the face",
   "hairColor": "#1A1C2E",
   "eyes": "Sharp, narrow, cool eyes; only the right eye clearly visible; ordinary black iris (no sharingan or rinnegan in-game)",
   "eyeColor": "#16161C",
   "skin": "#F0DFCF",
   "face": "Handsome, slender youthful face, pale, no marks; thin, unsmiling mouth",
   "outfit": "A long dark charcoal travel cloak with a high stiff collar, wrapping him from neck to calves; dark clothes beneath; the left side of the cloak drapes straight down with no arm under it",
   "outfitColors": [
    "#2B2B33",
    "#3D3A44",
    "#5E6B7A"
   ],
   "accessories": "Old Konoha forehead protector with a scratch through it, tucked away under the cloak rather than worn; no sword",
   "expression": "A cold, flat stare from the one visible eye, mouth a thin line; a faint shadow of guilt under the coldness, as if he is judging you and himself at the same time",
   "accent": "#4A4E9C"
  },
  "canWalk": true
 },
 {
  "id": "aizen",
  "name": "蓝染惣右介",
  "callName": "蓝染惣右介",
  "epithet": "天之僭主",
  "work": "《BLEACH》",
  "gender": "男",
  "age": "外表三十岁上下",
  "heightCm": 186,
  "heightNote": "",
  "era": "尸魂界（与现世二〇〇〇年代同时）",
  "knowsModernDevices": true,
  "unknownDevices": "—",
  "stats": {
   "physique": "受训",
   "physiqueNote": "顶尖：剑术和体术；近身，出手少",
   "disguise": "高",
   "readsPeople": "是",
   "medical": "无",
   "observation": "一般",
   "killThreshold": "无",
   "suspicion": "中"
  },
  "carried": [
   "白色长衣与腰间束带（穿在身上），此外别无一物"
  ],
  "quote": {
   "zh": "今后由我立于天上。"
  },
  "dream": "立于天上，推翻灵王",
  "lines": {
   "wake": "有意思。这一步，不在我的预料之中。",
   "discover": "可惜。这个人本可以走得更远的。",
   "statement": "诸位相信的“事实”，是谁先说出口的？请想一想。",
   "accuse": "{X}君，你每一步都太合理，像排练过。",
   "defend": "我理解你的愤怒。只是，你被引到这里来了。",
   "vote": "我投{X}君。辛苦你了。",
   "executed": "有趣……我竟会死在一个“事实”里。",
   "wish": "带我去灵王宫。那个位置，空得太久了。"
  },
  "art": {
   "silhouetteKeys": [
    "Hair combed straight back with a single loose lock curling down over the forehead",
    "Broad high wrap collar of a long white robe",
    "Tall, perfectly upright posture with hands hidden in wide sleeves",
    "Head tilted very slightly, looking down"
   ],
   "hair": "Wavy brown hair swept straight back off the forehead and over the head, with one single loose lock falling down and curling between the eyes",
   "hairColor": "#6E4B2E",
   "eyes": "Calm, narrow, gently smiling eyes with slightly lowered lids; warm brown irises; no glasses",
   "eyeColor": "#6A4429",
   "skin": "#EED6BE",
   "face": "Handsome, mature, smooth face with refined features; no marks; the corners of the mouth lifted in a faint courteous smile",
   "outfit": "A long pure-white robe with a broad, high wrapped collar and wide sleeves, tied at the waist with a dark sash; clean, unadorned",
   "outfitColors": [
    "#F5F2EA",
    "#2A2A2E",
    "#CFC8BA"
   ],
   "accessories": "None: no sword, and no longer the black-framed glasses of his old 'gentle captain' persona",
   "expression": "A gentle, faint smile, eyes slightly narrowed and looking down at the viewer; perfectly calm and courteous yet utterly cold, as if whatever you are about to do was his idea all along",
   "accent": "#C9A86A"
  },
  "canWalk": true
 },
 {
  "id": "eren",
  "name": "艾伦·耶格尔",
  "callName": "艾伦·耶格尔",
  "epithet": "生而自由",
  "work": "《进击的巨人》",
  "gender": "男",
  "age": "十九岁",
  "heightCm": 183,
  "heightNote": "",
  "era": "帕拉迪岛·854年（虚构世界）",
  "knowsModernDevices": false,
  "unknownDevices": "冰箱冷柜、洗衣机、烘干机、洗碗机、跑步机、泳池的水下灯、有声的彩色影片与放映机、播放器与扬声器、保龄球馆的自动设备与计分屏、电磁灶、塑料。火车、轮船、飞艇、步枪和照片他见过。",
  "stats": {
   "physique": "受训",
   "physiqueNote": "高大，徒手格斗是强项：拳、摔、擒拿",
   "disguise": "高",
   "readsPeople": "是",
   "medical": "战场急救",
   "observation": "一般",
   "killThreshold": "低",
   "suspicion": "中"
  },
  "carried": [
   "无（身上只有一身便服）"
  ],
  "quote": {
   "zh": "我要把它们驱逐干净！！从这个世界上……一只……不剩！！"
  },
  "dream": "自由：岛上的人自由地活下去",
  "lines": {
   "wake": "……门关着。又被关起来了。",
   "discover": "……哈。又死了一个。",
   "statement": "凶手也有他的来由，我懂。我照样会投。",
   "accuse": "坐下，{X}。你的来由，我听完了。是你。",
   "defend": "认错？……你倒是给我指一条别的路！",
   "vote": "{X}。没有别的路。",
   "executed": "……这样啊。将来，改不了。",
   "wish": "让他们活得长。海那边的，全踏平。"
  },
  "art": {
   "silhouetteKeys": [
    "small messy hair bun tied at the back/top of the head",
    "shoulder-length loose strands hanging down both sides of the face",
    "broad, heavy shoulders and thick neck of a tall man",
    "open shirt collar forming a V at the throat",
    "head level, chin slightly lowered, eyes locked straight forward"
   ],
   "hair": "dark brown, shoulder-length, straight with a slight wave; pulled back into a small loose bun at the back of the head, with several long strands escaping and hanging past the cheekbones on both sides; roughly centre-parted",
   "hairColor": "#3a2a1e",
   "eyes": "narrow, heavy-lidded, intense; irises small in the whites; a long unblinking stare straight at the viewer; faint dark shadows beneath",
   "eyeColor": "#3f8c7c",
   "skin": "#e6c4a3",
   "face": "lean 19-year-old face, hollow cheeks, sharp jaw and cheekbones, straight nose, freshly clean-shaven; thick dark straight brows sitting low over the eyes; no scars; mouth a flat line",
   "outfit": "plain civilian clothes: off-white collared cotton shirt with the top buttons undone and sleeves rolled, dark charcoal trousers; optionally a long open dark coat over it (his Marley-period civilian look). No military harness, no scarf, no uniform.",
   "outfitColors": [
    "#e9e3d6",
    "#2f3136",
    "#4b3b2e"
   ],
   "accessories": "none: no weapon, no key, no scarf; only a plain hair tie in the bun",
   "expression": "completely blank face holding a long, unblinking stare at the viewer, while one corner of the mouth is just starting to twitch into an involuntary laugh the eyes do not share",
   "accent": "#2F8A78"
  },
  "canWalk": true
 },
 {
  "id": "mikasa",
  "name": "三笠·阿克曼",
  "callName": "三笠·阿克曼",
  "epithet": "训练兵团首席",
  "work": "《进击的巨人》",
  "gender": "女",
  "age": "十九岁",
  "heightCm": 176,
  "heightNote": "",
  "era": "帕拉迪岛·854年（虚构世界）",
  "knowsModernDevices": false,
  "unknownDevices": "冰箱冷柜、洗衣机、烘干机、洗碗机、跑步机、泳池的水下灯、有声的彩色影片与放映机、播放器与扬声器、保龄球馆的自动设备与计分屏、电磁灶、塑料。火车、轮船、飞艇、步枪和照片她见过。",
  "stats": {
   "physique": "受训",
   "physiqueNote": "顶尖，刀术与徒手格斗",
   "disguise": "中",
   "readsPeople": "一般",
   "medical": "战场急救",
   "observation": "一般",
   "killThreshold": "低",
   "suspicion": "中"
  },
  "carried": [
   "黑色旧围巾（围在脖子上）",
   "调查兵团的军装"
  ],
  "quote": {
   "zh": "这个世界是残酷的……而且……很美。"
  },
  "dream": "回家：和艾伦、阿尔敏平安过日子",
  "lines": {
   "wake": "先找艾伦。……然后找门。",
   "discover": "不是艾伦。……那就好。",
   "statement": "我不猜人心。我只看谁做了什么。我都看见了。",
   "accuse": "{X}。是你。请您站着别动。",
   "defend": "不是我。要是我，不会留下痕迹。",
   "vote": "我投{X}。不改。",
   "executed": "……艾伦。对不起，回不了家了。",
   "wish": "让艾伦变回我认得的那个艾伦。"
  },
  "art": {
   "silhouetteKeys": [
    "very short black hair cropped at the nape, close to the head",
    "long side-swept fringe falling across the forehead toward one eye",
    "thick black scarf wrapped high around the neck up to the chin",
    "squared cropped military-jacket shoulders with harness straps crossing the chest"
   ],
   "hair": "jet black, straight, cut very short: ends at the nape and around the ears, with a longer fringe swept to one side across the forehead, the tips reaching the cheek",
   "hairColor": "#121214",
   "eyes": "almond-shaped East Asian eyes, slightly narrow, steady and cool; level, unreadable gaze",
   "eyeColor": "#3b3f46",
   "skin": "#f1ddc9",
   "face": "pale, oval, fine-boned East Asian features; a small thin scar just below the right eye; small closed mouth; a family-crest tattoo on the outer right wrist (show it if a hand is raised to the scarf)",
   "outfit": "Survey Corps uniform: short cropped tan-brown military jacket with the blue-and-white overlapping 'Wings of Freedom' emblem on the chest and shoulders, white shirt, dark leather harness straps crossing the chest; an old black scarf wrapped twice around the neck (black, not red)",
   "outfitColors": [
    "#8a6a48",
    "#f1efe8",
    "#2a2422",
    "#141414"
   ],
   "accessories": "the worn black scarf with frayed edges (her one essential item); family-crest tattoo on the right wrist; no blades, no ODM gear",
   "expression": "lower face sunk into the scarf so the mouth is hidden; flat, motionless eyes watching just past the viewer as if guarding someone behind her: perfectly polite, perfectly still, a quiet promise of violence",
   "accent": "#9AA3AD"
  },
  "canWalk": true
 },
 {
  "id": "saber",
  "name": "Saber",
  "callName": "Saber",
  "epithet": "骑士王",
  "work": "《Fate/Zero》",
  "gender": "女",
  "age": "身体按十八岁计，看上去更小",
  "heightCm": 154,
  "heightNote": "",
  "era": "一九九四年的冬木；生前是五、六世纪的不列颠",
  "knowsModernDevices": true,
  "unknownDevices": "—（圣杯给了她这个时代的常识）",
  "stats": {
   "physique": "受训",
   "physiqueNote": "剑术顶尖；个子小，力气有限",
   "disguise": "中",
   "readsPeople": "一般",
   "medical": "战场急救",
   "observation": "一般",
   "killThreshold": "中",
   "suspicion": "轻"
  },
  "carried": [],
  "quote": {
   "zh": "这双手没能护住的不列颠，我无论如何都要救。"
  },
  "dream": "救回不列颠",
  "lines": {
   "wake": "剑不在手里……这是何人的城？",
   "discover": "对无力还手之人下手，不可饶恕。",
   "statement": "以暗算取人性命者，若还有半分廉耻，便报上名号。",
   "accuse": "{X}阁下，你不敢正面作答，便是答案。",
   "defend": "我若要杀人，必当面报上名号，不会在暗处。",
   "vote": "我投{X}。此事不可再拖。",
   "executed": "不列颠……我终究还是没能救下。",
   "wish": "不列颠……这一次，不会再亡了。"
  },
  "art": {
   "silhouetteKeys": [
    "a single stiff 'ahoge' strand curving up from the crown",
    "hair pulled into a compact braided bun at the back of the head, with two long side locks framing the cheeks",
    "small, slender frame inside a sharp-shouldered men's suit jacket with notched lapels",
    "a neat necktie knot at the throat",
    "rigidly upright posture, chin level"
   ],
   "hair": "Golden blonde, fine and straight. Bangs fall in pointed strands between the eyes; two long locks frame the face down to the jaw; everything else is gathered into a tight braided bun at the back of the head. One springy strand sticks straight up on top.",
   "hairColor": "#E9C86A",
   "eyes": "Large almond-shaped eyes, clear and steady, slightly narrowed; straight brows angled down in seriousness.",
   "eyeColor": "#3E9C72",
   "skin": "#F7EBE1",
   "face": "Small oval face, delicate and androgynous at first glance (reads as a handsome boy until you look closely); fine nose, small closed mouth; no scars.",
   "outfit": "A tailored black men's suit cut for a petite frame (single-breasted jacket, notched lapels), a dark navy-blue dress shirt buttoned to the collar, a slim black necktie. Looks like a young bodyguard. No armor, no gloves.",
   "outfitColors": [
    "#1A1C22",
    "#22325A",
    "#0F1014"
   ],
   "accessories": "None. No sword, no armor, no hair ribbon: only the suit and tie. Her hands are noticeably empty.",
   "expression": "Perfectly composed and too still: green eyes locked straight on the viewer without blinking, lips pressed flat. A knight handing down a cold verdict, with a trace of old grief underneath.",
   "accent": "#2B4C9B"
  },
  "canWalk": true
 },
 {
  "id": "gilgamesh",
  "name": "吉尔伽美什",
  "callName": null,
  "epithet": "英雄王",
  "work": "《Fate/Zero》",
  "gender": "男",
  "age": "看上去二十多岁",
  "heightCm": 182,
  "heightNote": "",
  "era": "一九九四年的冬木；生前是公元前三千纪的乌鲁克",
  "knowsModernDevices": true,
  "unknownDevices": "—（圣杯给了他这个时代的常识：电灯、汽车、酒店、便服，他都认得，用惯了，只是嫌丑）",
  "stats": {
   "physique": "受训",
   "physiqueNote": "上古的战士之王",
   "disguise": "低",
   "readsPeople": "是",
   "medical": "无",
   "observation": "一般",
   "killThreshold": "无",
   "suspicion": "轻"
  },
  "carried": [],
  "quote": {
   "zh": "蠢货。天上地下，配称王的英雄只有本王一个；其余的，不过是一群杂种。"
  },
  "dream": "看这世界值不值得他宠爱",
  "lines": {
   "wake": "谁准许杂种把本王搬到这种地方？",
   "discover": "哼，死得倒还有几分看头。",
   "statement": "谁心里压着什么，本王看得一清二楚。接着演。",
   "accuse": "{X}，你心里压着的东西，脸上早写着了。",
   "defend": "杂种也敢审判本王？蒙昧得不配活着。",
   "vote": "{X}。本王赏你这一票。",
   "executed": "杂种举手定王的生死……真是天大的僭越。",
   "wish": "愿望？天下本就是本王的，何须你来赏。"
  },
  "art": {
   "silhouetteKeys": [
    "short blond hair worn down, with jagged spiky bangs over the forehead",
    "chin raised high, looking down his nose at the viewer",
    "thick white fur trim around the collar of a black leather jacket",
    "tall, lean, long-necked frame with broad straight shoulders",
    "narrow, sharp-cornered eyes"
   ],
   "hair": "Short golden-blond hair, worn down for a night out: sharp, jagged, slightly messy bangs over the brow and spiky locks at the sides. (In battle it sweeps straight up like flames. Here it is down.)",
   "hairColor": "#EBC537",
   "eyes": "Sharp, slightly upturned eyes, half-lidded with boredom; vivid crimson irises that seem to glow.",
   "eyeColor": "#C3141F",
   "skin": "#F4E3D3",
   "face": "Strikingly handsome, fine-boned face with a sharp jaw and thin brows; one corner of the mouth permanently lifted in a sneer.",
   "outfit": "Modern clothes for an evening stroll: a black leather jacket worn open, with plush white fur lining the collar and cuffs, over a white V-neck top; fashionable snakeskin-pattern trousers (pale tan with dark scales) below the frame.",
   "outfitColors": [
    "#121212",
    "#F3F0E8",
    "#9C8660"
   ],
   "accessories": "No weapons, no armor, no jewels: his treasury is sealed. Optionally an empty dark void behind his shoulders where golden ripples would normally open.",
   "expression": "Languid, bored contempt: half-lidded red eyes looking down at the viewer as if at an insect, a thin smirk at one corner of the mouth. Amused, and already passing judgment.",
   "accent": "#D4AF37"
  },
  "canWalk": true
 },
 {
  "id": "frieren",
  "name": "芙莉莲",
  "callName": "芙莉莲",
  "epithet": "葬送的魔法使",
  "work": "《葬送的芙莉莲》",
  "gender": "女",
  "age": "少女模样，活了一千多年",
  "heightCm": 150,
  "heightNote": "卡上未写身高，按外貌估计",
  "era": "剑与魔法的世界，勇者辛美尔死后二十多年",
  "knowsModernDevices": false,
  "unknownDevices": "电和一切用电的东西（电灯、冰箱冷柜、洗衣机、烘干机、洗碗机、跑步机、泳池的水下灯、有声的彩色影片与放映机、播放器与扬声器、保龄球馆的自动设备与计分屏、电磁灶）；塑料；拧开就有冷热水的龙头、抽水马桶和淋浴多半也没见过。",
  "stats": {
   "physique": "普通",
   "physiqueNote": "矮小，力气小，没学过拳脚",
   "disguise": "高",
   "readsPeople": "一般",
   "medical": "基本常识",
   "observation": "一般",
   "killThreshold": "中",
   "suspicion": "轻"
  },
  "carried": [
   "身上那身衣服与镶金边的白色短披肩",
   "金耳饰一对，垂着水滴形红宝石"
  ],
  "quote": {
   "zh": "……明明知道人类的寿命很短……为什么我没想过要多了解他一些呢。"
  },
  "dream": "再和辛美尔说一次话",
  "lines": {
   "wake": "……还没睡够。这是哪里的遗迹？",
   "discover": "死了。是人干的，不是魔物。",
   "statement": "说得可怜的话，我不往心里去。我看你们做了什么。",
   "accuse": "{X}，你说话的样子，很像我杀过的魔族。",
   "defend": "不是我。我要是动手，不会留这么多破绽。",
   "vote": "{X}吧。辛美尔也会这样选。",
   "executed": "是吗……还以为，时间还够的。",
   "wish": "辛美尔……这次，我想多了解你一些。"
  },
  "art": {
   "silhouetteKeys": [
    "two long twin tails tied high on either side of the head",
    "long, pointed elf ears jutting out sideways",
    "a short rounded white capelet with small gold shoulder ornaments",
    "teardrop red earrings hanging below the ears",
    "small, childlike shoulders and a high collar"
   ],
   "hair": "Long silvery-white hair parted in the middle with straight bangs, gathered into two high twin tails that fall past the shoulders; a few loose strands beside the ears.",
   "hairColor": "#ECEEF1",
   "eyes": "Half-lidded, droopy, sleepy eyes, as if she has just woken up; calm green irises.",
   "eyeColor": "#4E9E78",
   "skin": "#F8EFE7",
   "face": "Small, youthful girl's face with soft features and a tiny mouth; expressionless calm; long pointed elf ears.",
   "outfit": "A white capelet with gold trim over the shoulders, each shoulder set with a gold ornament holding a red gem; a high collar fastened by a ruby; a white jacket with wide gold-cuffed sleeves tucked into a skirt with a black belt; a black-and-white striped shirt showing underneath; black tights and brown boots below the frame.",
   "outfitColors": [
    "#F5F4F0",
    "#C8A24A",
    "#1C1C1C",
    "#B0232D"
   ],
   "accessories": "Gold earrings with teardrop-shaped ruby drops; a ruby clasp at the collar; ruby-set gold shoulder pieces. No staff, no grimoire.",
   "expression": "Flat, sleepy, half-lidded green eyes and an unmoving mouth: a thousand-year-old stillness. She regards the viewer as calmly as a demon she has already decided to destroy.",
   "accent": "#5DBB94"
  },
  "canWalk": true
 },
 {
  "id": "dio",
  "name": "迪奥·布兰度",
  "callName": "迪奥·布兰度",
  "epithet": "吸血鬼",
  "work": "《JoJo的奇妙冒险 星尘斗士》",
  "gender": "男",
  "age": "",
  "heightCm": 195,
  "heightNote": "",
  "era": "一九八九年的开罗；一八六〇年代生于伦敦",
  "knowsModernDevices": true,
  "unknownDevices": "—",
  "stats": {
   "physique": "受训",
   "physiqueNote": "贫民窟里的徒手打架，拳击，橄榄球",
   "disguise": "高",
   "readsPeople": "是",
   "medical": "无",
   "observation": "一般",
   "killThreshold": "无",
   "suspicion": "重"
  },
  "carried": [
   "素色手帕一方",
   "皮面小开本笔记一册（写着“到天堂去的方法”）"
  ],
  "quote": {
   "zh": "你记得自己至今吃过多少片面包吗？"
  },
  "dream": "到“天堂”去",
  "lines": {
   "wake": "哼哼……这里照得进日光吗？",
   "discover": "呵呵呵……死得真是没用。",
   "statement": "尔等争来争去，不过是想求个安心罢了。哼哼……",
   "accuse": "{X}，你从刚才起，一直不敢看我的眼睛。",
   "defend": "我DIO要杀人，还用得着这么笨的手法？",
   "vote": "{X}。没用的东西。",
   "executed": "我DIO……居然会输给尔等？！",
   "wish": "哼哼……这就是“天堂”吗？"
  },
  "art": {
   "silhouetteKeys": [
    "a heart-shaped gold ornament on a band across the forehead",
    "blond hair swept back from the brow, falling in straight locks to the nape",
    "very broad shoulders and a thick, muscular neck (a 195 cm frame)",
    "a short cropped yellow jacket with a high stiff collar",
    "head tilted back, looking down at the viewer"
   ],
   "hair": "Straight golden-blond hair pushed back off the forehead, medium length, a few strands falling forward, the ends reaching the nape.",
   "hairColor": "#F0CF4A",
   "eyes": "Sharp, heavy-lidded eyes with dark lash lines; a hypnotic gaze that pins you in place; crimson-red irises.",
   "eyeColor": "#B3262E",
   "skin": "#F0E6DD",
   "face": "Handsome, chiseled European face: strong straight nose, defined cheekbones and jaw, very pale skin. Optional: a small star-shaped birthmark at the back of the left shoulder near the neck (from the body he stole).",
   "outfit": "Final-battle outfit: a short cropped yellow jacket (open, with a high collar, ending above the waist) over a black skin-tight top that shows the musculature; matching trousers and boots with heart-shaped knee ornaments sit below the frame.",
   "outfitColors": [
    "#E8C21E",
    "#111111",
    "#C9A227"
   ],
   "accessories": "A heart-shaped gold forehead ornament on a dark headband. A plain handkerchief or a small leather-bound notebook may be held in one hand.",
   "expression": "Languid, predatory amusement: head tilted back, eyes looking down, a slow parted smile showing teeth. Calm as a nobleman, and about to burst into laughter.",
   "accent": "#6D1A36"
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
  "quote": {
   "zh": "有空把最后装点得漂漂亮亮，不如漂漂亮亮地活到最后。"
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
  "quote": {
   "zh": "我以为自己已经走到了世上最黑暗的地方……可是……在我前面……还有一片更黑的黑暗。"
  },
  "dream": "抹掉自己：让知道他的人都死去，只留下天马和妹妹，最后他自己也消失",
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
];
