/* ==========================================================
   LORE：从配置文件（v7.11）提炼的氛围与机制素材（手写；改配置后照原文核对）
   rooms          以「楼层/房名」为键（如 "1F/穹顶议事厅"），与 WORLD.rooms 一一对应（124 条：房间表 58 行 + 廊、楼梯、电梯、平台、回廊、上空）：
                  {floor, name, mood 氛围短句（≤14 字）, objects 陈设, windows 有窗（物理层 3.1 的「有窗」）,
                  crimeScene 适合作案发现场（表里的矩形房间与套房；议事厅是圆厅、廊与上空不算）, weapons 可作凶器之物,
                  floorSurface 地面（物理层 4.2：石材、橡木地板、羊毛地毯、湿区防滑石、枫木、弹性木地板、橡胶垫、石路与花床土；
                  「·」后是铺在上面的毯或池水；「未注明」= 电梯轿厢与上空）, src 陈设出处（各室/*.md、洋馆物理层）}
   atmosphere     洋馆里的短句（均有原文依据，≤14 字）
   clocks         钟与报时（物理层 3.3）        entrance  正门、屋外与透明的墙（物理层 1.4、2.1、3.2）
   clueTemplates  线索模板：{id, name, text, attribute, glyph, visible, predicate, variants[{text, predicate}], source}
                  glyph 证物卡角上的维度图标：height 身高、gender 性别、physique 体格、medical 医护、observation 现场观察、
                  era 年代与器械、items 随身物；visible 这一维度别人看不看得见（身高、性别、体格、随身物看得见）
                  predicate 是对角色 c（CHARACTERS 的一项）的 JS 表达式字符串，如 "c.heightCm >= 178"
   bodyStages     尸体随死后分钟数的变化（物理层 7.4）
   bodyReadings   验尸的三格读数（7.4 表的三列：体温、僵硬、尸斑）：{key, name, steps[{to 死后不足多少分钟（null 为此后）, text 原文}]}
                  庭审引擎据此画出每一格读数对应的死亡时段，玩家在时间刻度上自己框出死亡时间窗
   clueTemplates 的 shift  让死亡时间窗偏移的处理（7.4 环境干扰：冷池、蚕丝被、热池、冷冻柜）：[{vi 变体, dir −1 看上去死得更早 / +1 更晚,
                  reads 被干扰的读数}]；这几条不再筛人，凶手借它让自己的不在场证明落进假的时间窗（模板的 predicate 只是「想得到这样做」的条件）
   causes         死因：{id, name, sign 体表特征, needs 对凶手的要求（predicate 或空）, glyph/visible 同上（needs 不空时）,
                  where 可能的场所（溺水、坠落）, kind/points/source（兑换来的毒：价目表 10.6、第 9 节）}
   phases         一局游戏的循环阶段：{key, title, line, broadcast}（broadcast 是 WORLD.broadcasts 里的原句）
   coins          金币规则摘要      startState  开局初态摘要（物理层 9；开局流程 2）
   广播句式原文见 WORLD.broadcasts；开局播报见 WORLD.opening。
   ========================================================== */
window.LORE = {
 "rooms": {
  "B1/西电梯": {
   "floor": "B1",
   "name": "西电梯",
   "mood": "每过一层六秒",
   "objects": [
    "轿厢",
    "楼层表"
   ],
   "windows": false,
   "crimeScene": false,
   "weapons": [],
   "floorSurface": "未注明",
   "src": "洋馆物理层 1.2"
  },
  "B1/东电梯": {
   "floor": "B1",
   "name": "东电梯",
   "mood": "没有应急钥匙",
   "objects": [
    "轿厢",
    "楼层表"
   ],
   "windows": false,
   "crimeScene": false,
   "weapons": [],
   "floorSurface": "未注明",
   "src": "洋馆物理层 1.2"
  },
  "B1/西电梯厅": {
   "floor": "B1",
   "name": "西电梯厅",
   "mood": "铃声只在本层响",
   "objects": [
    "电梯门",
    "楼层表",
    "方位牌"
   ],
   "windows": false,
   "crimeScene": false,
   "weapons": [],
   "floorSurface": "石材",
   "src": "洋馆物理层 1.2、2.5"
  },
  "B1/东电梯厅": {
   "floor": "B1",
   "name": "东电梯厅",
   "mood": "楼层表显示轿厢在哪层",
   "objects": [
    "电梯门",
    "楼层表",
    "方位牌"
   ],
   "windows": false,
   "crimeScene": false,
   "weapons": [],
   "floorSurface": "石材",
   "src": "洋馆物理层 1.2、2.5"
  },
  "B1/西地廊": {
   "floor": "B1",
   "name": "西地廊",
   "mood": "青玉鳞鲸伏于柜中",
   "objects": [
    "青玉鳞鲸",
    "青玉九腕蛸",
    "青玉长须海马",
    "青玉双首海蛇",
    "玻璃门展柜"
   ],
   "windows": false,
   "crimeScene": false,
   "weapons": [
    "青玉整雕"
   ],
   "floorSurface": "石材",
   "src": "各室/B1_廊与楼梯.md"
  },
  "B1/东地廊": {
   "floor": "B1",
   "name": "东地廊",
   "mood": "廊上没有门",
   "objects": [],
   "windows": false,
   "crimeScene": false,
   "weapons": [],
   "floorSurface": "石材",
   "src": "洋馆物理层 1.2"
  },
  "B1/南廊西段": {
   "floor": "B1",
   "name": "南廊西段",
   "mood": "泳池厅隔开南廊两段",
   "objects": [],
   "windows": false,
   "crimeScene": false,
   "weapons": [],
   "floorSurface": "石材",
   "src": "洋馆物理层 1.2"
  },
  "B1/南廊东段": {
   "floor": "B1",
   "name": "南廊东段",
   "mood": "地下没有大楼梯",
   "objects": [],
   "windows": false,
   "crimeScene": false,
   "weapons": [],
   "floorSurface": "石材",
   "src": "洋馆物理层 1.2"
  },
  "B1/北廊西段": {
   "floor": "B1",
   "name": "北廊西段",
   "mood": "后楼梯门朝梯间里开",
   "objects": [],
   "windows": false,
   "crimeScene": false,
   "weapons": [],
   "floorSurface": "石材",
   "src": "洋馆物理层 1.2"
  },
  "B1/北地廊": {
   "floor": "B1",
   "name": "北地廊",
   "mood": "地下听不见钟声",
   "objects": [],
   "windows": false,
   "crimeScene": false,
   "weapons": [],
   "floorSurface": "石材",
   "src": "洋馆物理层 3.3"
  },
  "B1/北廊东段": {
   "floor": "B1",
   "name": "北廊东段",
   "mood": "机组的声响从门后来",
   "objects": [],
   "windows": false,
   "crimeScene": false,
   "weapons": [],
   "floorSurface": "石材",
   "src": "各室/B1_机房.md"
  },
  "B1/西北后楼梯": {
   "floor": "B1",
   "name": "西北后楼梯",
   "mood": "后楼梯听不见钟声",
   "objects": [
    "方位牌",
    "置瓶机检修盖",
    "干粉灭火器"
   ],
   "windows": false,
   "crimeScene": false,
   "weapons": [
    "干粉灭火器"
   ],
   "floorSurface": "石材",
   "src": "洋馆物理层 1.2、3.3、6.1；各室/B1_廊与楼梯.md"
  },
  "B1/东北后楼梯": {
   "floor": "B1",
   "name": "东北后楼梯",
   "mood": "梯板隔开上下层视线",
   "objects": [
    "方位牌",
    "干粉灭火器"
   ],
   "windows": false,
   "crimeScene": false,
   "weapons": [
    "干粉灭火器"
   ],
   "floorSurface": "石材",
   "src": "洋馆物理层 1.2、6.1"
  },
  "B1/更衣室": {
   "floor": "B1",
   "name": "更衣室",
   "mood": "磨砂隔板后只见人影",
   "objects": [
    "更衣柜",
    "淋浴隔间",
    "双盆洗手台",
    "白玉浴女像",
    "青玉立鹤"
   ],
   "windows": false,
   "crimeScene": true,
   "weapons": [
    "浴巾",
    "漱口杯"
   ],
   "floorSurface": "湿区防滑石",
   "src": "各室/B1_更衣室.md"
  },
  "B1/泳池厅": {
   "floor": "B1",
   "name": "泳池厅",
   "mood": "北端水深一米六",
   "objects": [
    "泳池",
    "躺椅",
    "白纱帐凉榻",
    "白玉鲸群浮雕",
    "救生杆"
   ],
   "windows": false,
   "crimeScene": true,
   "weapons": [
    "救生杆",
    "池水"
   ],
   "floorSurface": "防滑石池岸·池水",
   "src": "各室/B1_泳池厅.md"
  },
  "B1/浴疗室": {
   "floor": "B1",
   "name": "浴疗室",
   "mood": "冷热两池会搅乱死亡时间",
   "objects": [
    "冷浴池",
    "热浴池",
    "按摩床",
    "洗手盆"
   ],
   "windows": false,
   "crimeScene": true,
   "weapons": [
    "浴池水",
    "水杯"
   ],
   "floorSurface": "湿区防滑石",
   "src": "各室/B1_浴疗室.md；洋馆物理层 7.4"
  },
  "B1/泳池机房": {
   "floor": "B1",
   "name": "泳池机房",
   "mood": "池水六小时循环一遍",
   "objects": [
    "过滤罐",
    "循环泵",
    "平衡水箱",
    "吸水软管",
    "伸缩池刷杆"
   ],
   "windows": false,
   "crimeScene": true,
   "weapons": [
    "吸水软管",
    "伸缩池刷杆",
    "干粉灭火器"
   ],
   "floorSurface": "石材",
   "src": "各室/B1_泳池机房.md"
  },
  "B1/健身房": {
   "floor": "B1",
   "name": "健身房",
   "mood": "计时钟只数经过的时间",
   "objects": [
    "机械计时钟",
    "哑铃架",
    "力量架",
    "乒乓球台",
    "镜墙"
   ],
   "windows": false,
   "crimeScene": true,
   "weapons": [
    "二十公斤哑铃",
    "拉伸带",
    "弹力绳",
    "跳绳",
    "举重腰带"
   ],
   "floorSurface": "橡胶垫",
   "src": "各室/B1_健身房.md；洋馆物理层 3.3"
  },
  "B1/工具间": {
   "floor": "B1",
   "name": "工具间",
   "mood": "总控柜切不断灯",
   "objects": [
    "总控柜",
    "钢制台钳",
    "工具墙",
    "工作台",
    "转臂工作灯"
   ],
   "windows": false,
   "crimeScene": true,
   "weapons": [
    "钢制羊角锤",
    "木工凿",
    "裁切刀",
    "钢锯",
    "铜丝"
   ],
   "floorSurface": "石材",
   "src": "各室/B1_工具间.md；洋馆物理层 3.1"
  },
  "B1/洗衣房": {
   "floor": "B1",
   "name": "洗衣房",
   "mood": "洗一轮要四十五分钟",
   "objects": [
    "滚筒洗衣机",
    "烘干机",
    "手摇缝纫机",
    "双辊熨平机",
    "脏衣篮"
   ],
   "windows": false,
   "crimeScene": true,
   "weapons": [
    "蒸汽熨斗",
    "裁缝剪",
    "干粉灭火器"
   ],
   "floorSurface": "湿区防滑石",
   "src": "各室/B1_洗衣房.md"
  },
  "B1/物资库": {
   "floor": "B1",
   "name": "物资库",
   "mood": "油布与棉绳静候",
   "objects": [
    "货架",
    "平板推车",
    "防水油布",
    "棉绳",
    "布基胶带"
   ],
   "windows": false,
   "crimeScene": true,
   "weapons": [
    "棉绳",
    "布基胶带",
    "棉织搬运带"
   ],
   "floorSurface": "石材",
   "src": "各室/B1_物资库.md"
  },
  "B1/品酒室": {
   "floor": "B1",
   "name": "品酒室",
   "mood": "古酒器罩在玻璃里",
   "objects": [
    "品酒桌",
    "杯具柜",
    "双槽洗杯台",
    "吐酒盂",
    "商代青铜爵"
   ],
   "windows": false,
   "crimeScene": true,
   "weapons": [
    "开瓶器",
    "醒酒器",
    "冰桶"
   ],
   "floorSurface": "橡木地板",
   "src": "各室/B1_酒窖与品酒室.md"
  },
  "B1/酒窖": {
   "floor": "B1",
   "name": "酒窖",
   "mood": "十四度，尸体凉得快",
   "objects": [
    "双面酒架",
    "烈酒玻璃门柜",
    "酒款签"
   ],
   "windows": false,
   "crimeScene": true,
   "weapons": [
    "酒瓶"
   ],
   "floorSurface": "石材",
   "src": "各室/B1_酒窖与品酒室.md；洋馆物理层 7.4"
  },
  "B1/保龄球馆": {
   "floor": "B1",
   "name": "保龄球馆",
   "mood": "撞瓶声盖住脚步",
   "objects": [
    "球道",
    "置瓶机",
    "计分屏",
    "保龄球",
    "沙壶球桌"
   ],
   "windows": false,
   "crimeScene": true,
   "weapons": [
    "七公斤保龄球",
    "球瓶",
    "沙壶"
   ],
   "floorSurface": "枫木助走区与球道",
   "src": "各室/B1_保龄球馆.md；洋馆物理层 4.3"
  },
  "B1/机房": {
   "floor": "B1",
   "name": "机房",
   "mood": "三台机组一直在响",
   "objects": [
    "新风机组",
    "恒温机组",
    "除湿机",
    "配电柜"
   ],
   "windows": false,
   "crimeScene": true,
   "weapons": [
    "干粉灭火器"
   ],
   "floorSurface": "石材",
   "src": "各室/B1_机房.md"
  },
  "B1/家具储藏室": {
   "floor": "B1",
   "name": "家具储藏室",
   "mood": "家具都罩着亚麻布",
   "objects": [
    "亚麻罩布",
    "三人沙发",
    "折叠屏风",
    "衣柜",
    "穿衣镜"
   ],
   "windows": false,
   "crimeScene": true,
   "weapons": [
    "亚麻罩布"
   ],
   "floorSurface": "石材",
   "src": "各室/B1_储藏室.md"
  },
  "B1/箱笼储藏室": {
   "floor": "B1",
   "name": "箱笼储藏室",
   "mood": "樟木箱的盖都打得开",
   "objects": [
    "钢木搁架",
    "旅行箱",
    "樟木箱",
    "空帽盒"
   ],
   "windows": false,
   "crimeScene": true,
   "weapons": [],
   "floorSurface": "石材",
   "src": "各室/B1_储藏室.md"
  },
  "B1/地毯储藏室": {
   "floor": "B1",
   "name": "地毯储藏室",
   "mood": "十四卷地毯捆着布带",
   "objects": [
    "地毯卷架",
    "摊毯台",
    "羊毛地毯卷",
    "窗帘与床帘"
   ],
   "windows": false,
   "crimeScene": true,
   "weapons": [
    "布带"
   ],
   "floorSurface": "石材",
   "src": "各室/B1_储藏室.md"
  },
  "B1/杂物储藏室": {
   "floor": "B1",
   "name": "杂物储藏室",
   "mood": "两架木梯靠着东墙",
   "objects": [
    "木梯",
    "铝制人字梯",
    "脚手板",
    "空展柜",
    "空台座"
   ],
   "windows": false,
   "crimeScene": true,
   "weapons": [
    "木梯",
    "脚手板"
   ],
   "floorSurface": "石材",
   "src": "各室/B1_储藏室.md"
  },
  "1F/西电梯": {
   "floor": "1F",
   "name": "西电梯",
   "mood": "轿厢净一米四乘二米",
   "objects": [
    "轿厢",
    "楼层表"
   ],
   "windows": false,
   "crimeScene": false,
   "weapons": [],
   "floorSurface": "未注明",
   "src": "洋馆物理层 1.2"
  },
  "1F/东电梯": {
   "floor": "1F",
   "name": "东电梯",
   "mood": "按关门钮省五秒",
   "objects": [
    "轿厢",
    "楼层表"
   ],
   "windows": false,
   "crimeScene": false,
   "weapons": [],
   "floorSurface": "未注明",
   "src": "洋馆物理层 1.2"
  },
  "1F/西电梯厅": {
   "floor": "1F",
   "name": "西电梯厅",
   "mood": "两部电梯停在一层",
   "objects": [
    "电梯门",
    "楼层表",
    "方位牌"
   ],
   "windows": false,
   "crimeScene": false,
   "weapons": [],
   "floorSurface": "石材",
   "src": "洋馆物理层 1.2、9"
  },
  "1F/东电梯厅": {
   "floor": "1F",
   "name": "东电梯厅",
   "mood": "到站开门时响一声",
   "objects": [
    "电梯门",
    "楼层表",
    "方位牌"
   ],
   "windows": false,
   "crimeScene": false,
   "weapons": [],
   "floorSurface": "石材",
   "src": "洋馆物理层 1.2"
  },
  "1F/西藏珍廊": {
   "floor": "1F",
   "name": "西藏珍廊",
   "mood": "沁褐玉戈卧于柜中",
   "objects": [
    "红山玉猪龙",
    "商代沁褐玉戈",
    "透雕玉凤",
    "谷纹玉璧",
    "玻璃门展柜"
   ],
   "windows": false,
   "crimeScene": false,
   "weapons": [
    "商代玉戈"
   ],
   "floorSurface": "石材",
   "src": "各室/1F_门厅与廊.md"
  },
  "1F/东织锦廊": {
   "floor": "1F",
   "name": "东织锦廊",
   "mood": "六时花候织到星沉",
   "objects": [
    "六时花候织锦",
    "银鎏金有盖杯",
    "水晶雕杯",
    "掐丝珐琅大瓶",
    "玻璃门展柜"
   ],
   "windows": false,
   "crimeScene": false,
   "weapons": [
    "银鎏金有盖杯",
    "掐丝珐琅大瓶"
   ],
   "floorSurface": "石材",
   "src": "各室/1F_门厅与廊.md"
  },
  "1F/南廊西段": {
   "floor": "1F",
   "name": "南廊西段",
   "mood": "白玉人像守在门边",
   "objects": [
    "白玉人物圆雕"
   ],
   "windows": false,
   "crimeScene": false,
   "weapons": [],
   "floorSurface": "石材",
   "src": "各室/1F_门厅与廊.md"
  },
  "1F/南廊东段": {
   "floor": "1F",
   "name": "南廊东段",
   "mood": "青玉狮象分立门旁",
   "objects": [
    "青玉瑞兽"
   ],
   "windows": false,
   "crimeScene": false,
   "weapons": [],
   "floorSurface": "石材",
   "src": "各室/1F_门厅与廊.md"
  },
  "1F/北廊西段": {
   "floor": "1F",
   "name": "北廊西段",
   "mood": "廊端是一扇窗",
   "objects": [],
   "windows": false,
   "crimeScene": false,
   "weapons": [],
   "floorSurface": "石材",
   "src": "洋馆物理层 1.2、3.2"
  },
  "1F/北过厅": {
   "floor": "1F",
   "name": "北过厅",
   "mood": "侧案上三件白玉礼器",
   "objects": [
    "侧案",
    "白玉礼器",
    "缂丝山水",
    "银丝织锦"
   ],
   "windows": false,
   "crimeScene": false,
   "weapons": [
    "白玉礼器"
   ],
   "floorSurface": "石材",
   "src": "各室/1F_门厅与廊.md"
  },
  "1F/北廊东段": {
   "floor": "1F",
   "name": "北廊东段",
   "mood": "廊端窗外是林子",
   "objects": [],
   "windows": false,
   "crimeScene": false,
   "weapons": [],
   "floorSurface": "石材",
   "src": "洋馆物理层 1.4、3.2"
  },
  "1F/西北后楼梯": {
   "floor": "1F",
   "name": "西北后楼梯",
   "mood": "北窗在中间平台上方",
   "objects": [
    "方位牌",
    "干粉灭火器"
   ],
   "windows": false,
   "crimeScene": false,
   "weapons": [
    "干粉灭火器"
   ],
   "floorSurface": "石材",
   "src": "洋馆物理层 1.2、3.2、6.1"
  },
  "1F/东北后楼梯": {
   "floor": "1F",
   "name": "东北后楼梯",
   "mood": "每跑十五级",
   "objects": [
    "方位牌",
    "干粉灭火器"
   ],
   "windows": false,
   "crimeScene": false,
   "weapons": [
    "干粉灭火器"
   ],
   "floorSurface": "石材",
   "src": "洋馆物理层 1.2、6.1"
  },
  "1F/门厅": {
   "floor": "1F",
   "name": "门厅",
   "mood": "正门没有锁",
   "objects": [
    "罗盘花",
    "落地钟",
    "大楼梯",
    "正门",
    "长凳"
   ],
   "windows": true,
   "crimeScene": true,
   "weapons": [
    "干粉灭火器"
   ],
   "floorSurface": "石材·罗盘花",
   "src": "各室/1F_门厅与廊.md；洋馆物理层 1.2、2.1、2.5、3.3"
  },
  "1F/穹顶议事厅": {
   "floor": "1F",
   "name": "穹顶议事厅",
   "mood": "十三把钥匙按号悬挂",
   "objects": [
    "石面圆桌",
    "钥匙收纳台",
    "价目铜牌",
    "神圣罗马帝国皇冠",
    "良渚玉琮王"
   ],
   "windows": false,
   "crimeScene": false,
   "weapons": [
    "良渚玉琮王",
    "帝国皇冠"
   ],
   "floorSurface": "石材·墨玉圆盘",
   "src": "各室/1F_穹顶议事厅.md"
  },
  "1F/花园": {
   "floor": "1F",
   "name": "花园",
   "mood": "幽灵兰附在古木上",
   "objects": [
    "十六座种植床",
    "白玉泉盘喷泉",
    "翡翠葛拱架",
    "幽灵兰",
    "金花茶"
   ],
   "windows": true,
   "crimeScene": true,
   "weapons": [],
   "floorSurface": "石路·花床土",
   "src": "各室/1F_花园与园艺间.md"
  },
  "1F/自然史大厅": {
   "floor": "1F",
   "name": "自然史大厅",
   "mood": "暮王的头与二层齐高",
   "objects": [
    "霸王龙暮王",
    "双胸六足兽骨架",
    "烟晶展台",
    "长凳"
   ],
   "windows": true,
   "crimeScene": true,
   "weapons": [],
   "floorSurface": "石材",
   "src": "各室/1F_自然史大厅与古兽厅.md"
  },
  "1F/衣帽间": {
   "floor": "1F",
   "name": "衣帽间",
   "mood": "衣柜里三十只衣架",
   "objects": [
    "衣柜",
    "换鞋凳",
    "穿衣镜",
    "伞架",
    "立式衣帽架"
   ],
   "windows": true,
   "crimeScene": true,
   "weapons": [
    "衣架"
   ],
   "floorSurface": "橡木地板",
   "src": "各室/1F_衣帽间与盥洗室.md"
  },
  "1F/盥洗室": {
   "floor": "1F",
   "name": "盥洗室",
   "mood": "药柜里二十片止痛片",
   "objects": [
    "公共药柜",
    "双盆洗手台",
    "磨砂玻璃厕位",
    "皂盒"
   ],
   "windows": true,
   "crimeScene": true,
   "weapons": [
    "医用酒精",
    "擦手巾"
   ],
   "floorSurface": "湿区防滑石",
   "src": "各室/1F_衣帽间与盥洗室.md"
  },
  "1F/音乐沙龙": {
   "floor": "1F",
   "name": "音乐沙龙",
   "mood": "四十张黑胶竖在柜里",
   "objects": [
    "三角钢琴",
    "踏板竖琴",
    "斯特拉迪瓦里四重奏",
    "唐琴九霄环佩",
    "定音鼓"
   ],
   "windows": true,
   "crimeScene": true,
   "weapons": [
    "鼓槌",
    "谱架",
    "琴弦"
   ],
   "floorSurface": "橡木地板",
   "src": "各室/1F_音乐沙龙.md"
  },
  "1F/晨间厅": {
   "floor": "1F",
   "name": "晨间厅",
   "mood": "银茶具罩在柜里",
   "objects": [
    "早餐圆桌",
    "贵妃榻",
    "银茶具罩柜",
    "羊毛地毯",
    "银壳咖啡机"
   ],
   "windows": true,
   "crimeScene": true,
   "weapons": [
    "端砚",
    "水晶咖啡壶"
   ],
   "floorSurface": "橡木地板·羊毛地毯",
   "src": "各室/1F_晨间厅.md"
  },
  "1F/园艺间": {
   "floor": "1F",
   "name": "园艺间",
   "mood": "轮阀管着花园的水",
   "objects": [
    "水槽台",
    "盆栽台",
    "理花台",
    "工具架",
    "滴灌轮阀"
   ],
   "windows": true,
   "crimeScene": true,
   "weapons": [
    "铁锹",
    "银柄花剪",
    "园艺剪",
    "手铲"
   ],
   "floorSurface": "湿区防滑石",
   "src": "各室/1F_花园与园艺间.md"
  },
  "1F/古兽厅": {
   "floor": "1F",
   "name": "古兽厅",
   "mood": "长臂攀着一段铜树",
   "objects": [
    "猛犸象骨架霜原",
    "大地懒骨架长臂",
    "化石展柜",
    "恐龙蛋化石",
    "象牙雕花器"
   ],
   "windows": true,
   "crimeScene": true,
   "weapons": [
    "陨铁切片",
    "菊石化石"
   ],
   "floorSurface": "橡木地板",
   "src": "各室/1F_自然史大厅与古兽厅.md"
  },
  "1F/起居厅": {
   "floor": "1F",
   "name": "起居厅",
   "mood": "三件青白玉山子",
   "objects": [
    "三人沙发",
    "博古架",
    "青白玉山子",
    "羊毛地毯",
    "低柜"
   ],
   "windows": true,
   "crimeScene": true,
   "weapons": [
    "青白玉山子",
    "玉石圆盘"
   ],
   "floorSurface": "橡木地板·羊毛地毯",
   "src": "各室/1F_起居厅.md"
  },
  "1F/宴饮厅": {
   "floor": "1F",
   "name": "宴饮厅",
   "mood": "十六人长桌空着",
   "objects": [
    "十六人长桌",
    "高背椅",
    "餐边柜",
    "银烛台",
    "青白玉果盘"
   ],
   "windows": true,
   "crimeScene": true,
   "weapons": [
    "银烛台",
    "水晶杯"
   ],
   "floorSurface": "橡木地板",
   "src": "各室/1F_宴饮厅.md"
  },
  "1F/厨房": {
   "floor": "1F",
   "name": "厨房",
   "mood": "冷冻柜零下十八度，空着",
   "objects": [
    "冷冻柜",
    "保鲜柜",
    "岛台",
    "电磁灶",
    "干货架"
   ],
   "windows": true,
   "crimeScene": true,
   "weapons": [
    "厨刀",
    "剔骨刀",
    "面杖",
    "冷冻柜"
   ],
   "floorSurface": "湿区防滑石",
   "src": "各室/1F_厨房.md；洋馆物理层 9"
  },
  "1F/1号套房": {
   "floor": "1F",
   "name": "1号套房",
   "mood": "插销只能从里插上",
   "objects": [
    "四柱床",
    "横插销",
    "书桌",
    "浴缸"
   ],
   "windows": true,
   "crimeScene": true,
   "weapons": [
    "水晶牙杯",
    "羽绒枕",
    "浴缸"
   ],
   "floorSurface": "羊毛地毯·卫浴防滑石",
   "src": "各室/套房.md；洋馆物理层 2.3、2.4、3.2"
  },
  "1F/2号套房": {
   "floor": "1F",
   "name": "2号套房",
   "mood": "窗外是北面的林子",
   "objects": [
    "窗（4.8 m）",
    "四柱床",
    "床帘",
    "水晶牙杯"
   ],
   "windows": true,
   "crimeScene": true,
   "weapons": [
    "水晶牙杯",
    "羽绒枕",
    "浴缸"
   ],
   "floorSurface": "羊毛地毯·卫浴防滑石",
   "src": "各室/套房.md；洋馆物理层 2.3、2.4、3.2"
  },
  "1F/3号套房": {
   "floor": "1F",
   "name": "3号套房",
   "mood": "门铃只在门内响起",
   "objects": [
    "门铃",
    "四柱床",
    "书桌",
    "墨绿地毯"
   ],
   "windows": true,
   "crimeScene": true,
   "weapons": [
    "水晶牙杯",
    "羽绒枕",
    "浴缸"
   ],
   "floorSurface": "羊毛地毯·卫浴防滑石",
   "src": "各室/套房.md；洋馆物理层 2.3、2.4、3.2"
  },
  "1F/4号套房": {
   "floor": "1F",
   "name": "4号套房",
   "mood": "南窗外是沙滩和海",
   "objects": [
    "窗（4.8 m）",
    "四柱床",
    "阅读灯",
    "浴缸"
   ],
   "windows": true,
   "crimeScene": true,
   "weapons": [
    "水晶牙杯",
    "羽绒枕",
    "浴缸"
   ],
   "floorSurface": "羊毛地毯·卫浴防滑石",
   "src": "各室/套房.md；洋馆物理层 2.3、2.4、3.2"
  },
  "2F/西电梯": {
   "floor": "2F",
   "name": "西电梯",
   "mood": "只停在楼层上",
   "objects": [
    "轿厢",
    "楼层表"
   ],
   "windows": false,
   "crimeScene": false,
   "weapons": [],
   "floorSurface": "未注明",
   "src": "洋馆物理层 1.2"
  },
  "2F/东电梯": {
   "floor": "2F",
   "name": "东电梯",
   "mood": "井道和轿厢顶进不去",
   "objects": [
    "轿厢",
    "楼层表"
   ],
   "windows": false,
   "crimeScene": false,
   "weapons": [],
   "floorSurface": "未注明",
   "src": "洋馆物理层 1.2"
  },
  "2F/西电梯厅": {
   "floor": "2F",
   "name": "西电梯厅",
   "mood": "电梯门朝北开",
   "objects": [
    "电梯门",
    "楼层表",
    "方位牌"
   ],
   "windows": false,
   "crimeScene": false,
   "weapons": [],
   "floorSurface": "石材",
   "src": "洋馆物理层 1.2"
  },
  "2F/东电梯厅": {
   "floor": "2F",
   "name": "东电梯厅",
   "mood": "按钮各管各的电梯",
   "objects": [
    "电梯门",
    "楼层表",
    "方位牌"
   ],
   "windows": false,
   "crimeScene": false,
   "weapons": [],
   "floorSurface": "石材",
   "src": "洋馆物理层 1.2"
  },
  "2F/西画廊": {
   "floor": "2F",
   "name": "西画廊",
   "mood": "大使脚下斜着骷髅",
   "objects": [
    "《大使》",
    "《阿尔诺芬尼夫妇像》",
    "《雪中猎人》",
    "《以马忤斯的晚餐》"
   ],
   "windows": false,
   "crimeScene": false,
   "weapons": [],
   "floorSurface": "石材",
   "src": "各室/2F_廊与回廊.md"
  },
  "2F/东肖像廊": {
   "floor": "2F",
   "name": "东肖像廊",
   "mood": "八位无名观测者",
   "objects": [
    "《八位无名观测者》",
    "银錾双耳杯",
    "烟晶高足杯",
    "玻璃门展柜"
   ],
   "windows": false,
   "crimeScene": false,
   "weapons": [
    "银錾双耳杯"
   ],
   "floorSurface": "石材",
   "src": "各室/2F_廊与回廊.md"
  },
  "2F/南廊西段": {
   "floor": "2F",
   "name": "南廊西段",
   "mood": "解剖课挂在廊端北墙",
   "objects": [
    "《杜尔普博士的解剖课》",
    "《戴珍珠耳环的少女》",
    "《维纳斯的诞生》",
    "《日本桥》"
   ],
   "windows": false,
   "crimeScene": false,
   "weapons": [],
   "floorSurface": "石材",
   "src": "各室/2F_廊与回廊.md"
  },
  "2F/南廊东段": {
   "floor": "2F",
   "name": "南廊东段",
   "mood": "廊端窗外是林子",
   "objects": [],
   "windows": false,
   "crimeScene": false,
   "weapons": [],
   "floorSurface": "石材",
   "src": "洋馆物理层 1.4、3.2"
  },
  "2F/北廊西段": {
   "floor": "2F",
   "name": "北廊西段",
   "mood": "星月夜挂在北墙",
   "objects": [
    "《吻》",
    "《星月夜》"
   ],
   "windows": false,
   "crimeScene": false,
   "weapons": [],
   "floorSurface": "石材",
   "src": "各室/2F_廊与回廊.md"
  },
  "2F/北过厅": {
   "floor": "2F",
   "name": "北过厅",
   "mood": "穹顶回廊北接这里",
   "objects": [],
   "windows": false,
   "crimeScene": false,
   "weapons": [],
   "floorSurface": "石材",
   "src": "洋馆物理层 1.2"
  },
  "2F/北廊东段": {
   "floor": "2F",
   "name": "北廊东段",
   "mood": "廊上没有门",
   "objects": [],
   "windows": false,
   "crimeScene": false,
   "weapons": [],
   "floorSurface": "石材",
   "src": "洋馆物理层 1.2"
  },
  "2F/西北后楼梯": {
   "floor": "2F",
   "name": "西北后楼梯",
   "mood": "梯间封闭，门朝里开",
   "objects": [
    "方位牌",
    "干粉灭火器"
   ],
   "windows": false,
   "crimeScene": false,
   "weapons": [
    "干粉灭火器"
   ],
   "floorSurface": "石材",
   "src": "洋馆物理层 1.2、6.1"
  },
  "2F/东北后楼梯": {
   "floor": "2F",
   "name": "东北后楼梯",
   "mood": "后楼梯听不见钟声",
   "objects": [
    "方位牌",
    "干粉灭火器"
   ],
   "windows": false,
   "crimeScene": false,
   "weapons": [
    "干粉灭火器"
   ],
   "floorSurface": "石材",
   "src": "洋馆物理层 3.3、6.1"
  },
  "2F/楼梯平台": {
   "floor": "2F",
   "name": "楼梯平台",
   "mood": "钟声在平台数得清",
   "objects": [
    "栏杆",
    "干粉灭火器"
   ],
   "windows": false,
   "crimeScene": false,
   "weapons": [
    "干粉灭火器"
   ],
   "floorSurface": "石材",
   "src": "洋馆物理层 1.2、3.3、6.1"
  },
  "2F/门厅上空": {
   "floor": "2F",
   "name": "门厅上空",
   "mood": "大窗占二、三层的高",
   "objects": [],
   "windows": true,
   "crimeScene": false,
   "weapons": [],
   "floorSurface": "未注明",
   "src": "洋馆物理层 3.2"
  },
  "2F/西内廊": {
   "floor": "2F",
   "name": "西内廊",
   "mood": "一边是院子上空",
   "objects": [],
   "windows": false,
   "crimeScene": false,
   "weapons": [],
   "floorSurface": "石材",
   "src": "洋馆物理层 1.2"
  },
  "2F/东内廊": {
   "floor": "2F",
   "name": "东内廊",
   "mood": "玻璃外是暮王的头",
   "objects": [],
   "windows": false,
   "crimeScene": false,
   "weapons": [],
   "floorSurface": "石材",
   "src": "洋馆物理层 1.2；各室/1F_自然史大厅与古兽厅.md"
  },
  "2F/西院上空": {
   "floor": "2F",
   "name": "西院上空",
   "mood": "直通屋面下的天顶",
   "objects": [],
   "windows": true,
   "crimeScene": false,
   "weapons": [],
   "floorSurface": "未注明",
   "src": "洋馆物理层 1.1"
  },
  "2F/东院上空": {
   "floor": "2F",
   "name": "东院上空",
   "mood": "暮王立在院子中间",
   "objects": [],
   "windows": true,
   "crimeScene": false,
   "weapons": [],
   "floorSurface": "未注明",
   "src": "各室/1F_自然史大厅与古兽厅.md"
  },
  "2F/穹顶回廊": {
   "floor": "2F",
   "name": "穹顶回廊",
   "mood": "九幅挂毯绕着鼓座",
   "objects": [
    "月潮织坊挂毯",
    "昼夜十二庭罩柜",
    "白玉人物半身像"
   ],
   "windows": false,
   "crimeScene": false,
   "weapons": [],
   "floorSurface": "石材",
   "src": "各室/2F_廊与回廊.md"
  },
  "2F/放映厅": {
   "floor": "2F",
   "name": "放映厅",
   "mood": "十六席面朝空银幕",
   "objects": [
    "银幕",
    "十六张座椅",
    "放映机台",
    "器材柜"
   ],
   "windows": false,
   "crimeScene": true,
   "weapons": [],
   "floorSurface": "羊毛地毯",
   "src": "各室/2F_放映厅.md"
  },
  "2F/游戏室": {
   "floor": "2F",
   "name": "游戏室",
   "mood": "麻将一百四十四张",
   "objects": [
    "台球桌",
    "牌桌",
    "麻将玄白四时",
    "扑克牌蔷薇六席",
    "吧台"
   ],
   "windows": true,
   "crimeScene": true,
   "weapons": [
    "球杆",
    "台球",
    "酒瓶"
   ],
   "floorSurface": "橡木地板",
   "src": "各室/2F_游戏室.md"
  },
  "2F/地图室": {
   "floor": "2F",
   "name": "地图室",
   "mood": "大地球仪径一米四",
   "objects": [
    "大地球仪",
    "布劳地球仪",
    "平抽地图柜",
    "阅图桌",
    "黄铜六分仪"
   ],
   "windows": true,
   "crimeScene": true,
   "weapons": [
    "银分规",
    "黄铜六分仪"
   ],
   "floorSurface": "橡木地板",
   "src": "各室/2F_地图室.md"
  },
  "2F/棋艺室": {
   "floor": "2F",
   "name": "棋艺室",
   "mood": "三只棋钟都停着",
   "objects": [
    "棋桌",
    "棋柜",
    "机械棋钟",
    "国际象棋鸢尾王庭",
    "围棋十九道山海"
   ],
   "windows": true,
   "crimeScene": true,
   "weapons": [
    "榧木棋盘",
    "沉香棋匣"
   ],
   "floorSurface": "橡木地板",
   "src": "各室/2F_棋艺室.md；洋馆物理层 3.3"
  },
  "2F/标本陈列室": {
   "floor": "2F",
   "name": "标本陈列室",
   "mood": "象鸟卵长三十厘米",
   "objects": [
    "标本柜",
    "昆虫罩柜",
    "独角鲸牙",
    "渡渡鸟骨架",
    "海兽颅骨"
   ],
   "windows": true,
   "crimeScene": true,
   "weapons": [
    "独角鲸牙",
    "海兽颅骨"
   ],
   "floorSurface": "橡木地板",
   "src": "各室/2F_标本陈列室.md"
  },
  "2F/阅览室": {
   "floor": "2F",
   "name": "阅览室",
   "mood": "三扇窗下各一把椅",
   "objects": [
    "长桌",
    "阅读灯",
    "阅读椅",
    "书柜",
    "旋转画报架"
   ],
   "windows": true,
   "crimeScene": true,
   "weapons": [],
   "floorSurface": "橡木地板",
   "src": "各室/2F_阅览室.md"
  },
  "2F/大图书室": {
   "floor": "2F",
   "name": "大图书室",
   "mood": "六千册，两部书梯",
   "objects": [
    "通高书柜",
    "带轮书梯",
    "珍本柜",
    "夜空志罩柜",
    "阅读桌"
   ],
   "windows": true,
   "crimeScene": true,
   "weapons": [
    "带轮书梯"
   ],
   "floorSurface": "橡木地板",
   "src": "各室/2F_大图书室.md"
  },
  "2F/二层起居室": {
   "floor": "2F",
   "name": "二层起居室",
   "mood": "两组坐席朝北",
   "objects": [
    "三人沙发",
    "扶手椅",
    "矮几",
    "羊毛地毯",
    "写字台"
   ],
   "windows": true,
   "crimeScene": true,
   "weapons": [],
   "floorSurface": "橡木地板·羊毛地毯",
   "src": "各室/2F_二层起居室.md"
  },
  "2F/5号套房": {
   "floor": "2F",
   "name": "5号套房",
   "mood": "钥匙穿不过门缝",
   "objects": [
    "号码门牌",
    "四柱床",
    "衣柜",
    "水晶牙杯"
   ],
   "windows": true,
   "crimeScene": true,
   "weapons": [
    "水晶牙杯",
    "羽绒枕",
    "浴缸"
   ],
   "floorSurface": "羊毛地毯·卫浴防滑石",
   "src": "各室/套房.md；洋馆物理层 2.3、2.4、3.2"
  },
  "2F/6号套房": {
   "floor": "2F",
   "name": "6号套房",
   "mood": "墨绿地毯吸走脚步",
   "objects": [
    "墨绿地毯",
    "四柱床",
    "扶手椅",
    "小圆桌"
   ],
   "windows": true,
   "crimeScene": true,
   "weapons": [
    "水晶牙杯",
    "羽绒枕",
    "浴缸"
   ],
   "floorSurface": "羊毛地毯·卫浴防滑石",
   "src": "各室/套房.md；洋馆物理层 2.3、2.4、3.2"
  },
  "2F/7号套房": {
   "floor": "2F",
   "name": "7号套房",
   "mood": "窗前是厚重窗帘",
   "objects": [
    "厚重窗帘",
    "四柱床",
    "书桌",
    "浴缸"
   ],
   "windows": true,
   "crimeScene": true,
   "weapons": [
    "水晶牙杯",
    "羽绒枕",
    "浴缸"
   ],
   "floorSurface": "羊毛地毯·卫浴防滑石",
   "src": "各室/套房.md；洋馆物理层 2.3、2.4、3.2"
  },
  "2F/8号套房": {
   "floor": "2F",
   "name": "8号套房",
   "mood": "门缝只容一线穿过",
   "objects": [
    "横插销",
    "四柱床",
    "衣柜",
    "水晶牙杯"
   ],
   "windows": true,
   "crimeScene": true,
   "weapons": [
    "水晶牙杯",
    "羽绒枕",
    "浴缸"
   ],
   "floorSurface": "羊毛地毯·卫浴防滑石",
   "src": "各室/套房.md；洋馆物理层 2.3、2.4、3.2"
  },
  "3F/西电梯": {
   "floor": "3F",
   "name": "西电梯",
   "mood": "门开足后停五秒",
   "objects": [
    "轿厢",
    "楼层表"
   ],
   "windows": false,
   "crimeScene": false,
   "weapons": [],
   "floorSurface": "未注明",
   "src": "洋馆物理层 1.2"
  },
  "3F/东电梯": {
   "floor": "3F",
   "name": "东电梯",
   "mood": "断不了电",
   "objects": [
    "轿厢",
    "楼层表"
   ],
   "windows": false,
   "crimeScene": false,
   "weapons": [],
   "floorSurface": "未注明",
   "src": "洋馆物理层 1.2"
  },
  "3F/西电梯厅": {
   "floor": "3F",
   "name": "西电梯厅",
   "mood": "没有陈设",
   "objects": [
    "电梯门",
    "楼层表",
    "方位牌"
   ],
   "windows": false,
   "crimeScene": false,
   "weapons": [],
   "floorSurface": "石材",
   "src": "各室/3F_廊与回廊.md"
  },
  "3F/东电梯厅": {
   "floor": "3F",
   "name": "东电梯厅",
   "mood": "一趟只去一个楼层",
   "objects": [
    "电梯门",
    "楼层表",
    "方位牌"
   ],
   "windows": false,
   "crimeScene": false,
   "weapons": [],
   "floorSurface": "石材",
   "src": "洋馆物理层 1.2"
  },
  "3F/西园廊": {
   "floor": "3F",
   "name": "西园廊",
   "mood": "幽兰八相挂在廊上",
   "objects": [
    "《幽兰八相》",
    "青玉如意",
    "白玉透雕花薰",
    "玻璃门展柜"
   ],
   "windows": false,
   "crimeScene": false,
   "weapons": [
    "青玉如意"
   ],
   "floorSurface": "石材",
   "src": "各室/3F_廊与回廊.md"
  },
  "3F/东陶瓷廊": {
   "floor": "3F",
   "name": "东陶瓷廊",
   "mood": "郎窑红在南边两柜",
   "objects": [
    "豇豆红柳叶瓶",
    "郎窑红观音尊",
    "斗彩团花罐",
    "玻璃门展柜"
   ],
   "windows": false,
   "crimeScene": false,
   "weapons": [],
   "floorSurface": "石材",
   "src": "各室/3F_廊与回廊.md"
  },
  "3F/南廊西段": {
   "floor": "3F",
   "name": "南廊西段",
   "mood": "长案上十二方供石",
   "objects": [
    "长案",
    "灵璧石",
    "英石",
    "太湖石"
   ],
   "windows": false,
   "crimeScene": false,
   "weapons": [
    "灵璧石"
   ],
   "floorSurface": "石材",
   "src": "各室/3F_廊与回廊.md"
  },
  "3F/南廊东段": {
   "floor": "3F",
   "name": "南廊东段",
   "mood": "廊端窗外是林子",
   "objects": [],
   "windows": false,
   "crimeScene": false,
   "weapons": [],
   "floorSurface": "石材",
   "src": "洋馆物理层 1.4、3.2"
  },
  "3F/北廊西段": {
   "floor": "3F",
   "name": "北廊西段",
   "mood": "廊端是一扇窗",
   "objects": [],
   "windows": false,
   "crimeScene": false,
   "weapons": [],
   "floorSurface": "石材",
   "src": "洋馆物理层 3.2"
  },
  "3F/北过厅": {
   "floor": "3F",
   "name": "北过厅",
   "mood": "北过厅在穹顶背后",
   "objects": [],
   "windows": false,
   "crimeScene": false,
   "weapons": [],
   "floorSurface": "石材",
   "src": "洋馆物理层 1.2"
  },
  "3F/北廊东段": {
   "floor": "3F",
   "name": "北廊东段",
   "mood": "廊上没有门",
   "objects": [],
   "windows": false,
   "crimeScene": false,
   "weapons": [],
   "floorSurface": "石材",
   "src": "洋馆物理层 1.2"
  },
  "3F/西北后楼梯": {
   "floor": "3F",
   "name": "西北后楼梯",
   "mood": "北墙一扇窗",
   "objects": [
    "方位牌",
    "干粉灭火器"
   ],
   "windows": false,
   "crimeScene": false,
   "weapons": [
    "干粉灭火器"
   ],
   "floorSurface": "石材",
   "src": "洋馆物理层 3.2、6.1"
  },
  "3F/东北后楼梯": {
   "floor": "3F",
   "name": "东北后楼梯",
   "mood": "后楼梯听不见钟声",
   "objects": [
    "方位牌",
    "干粉灭火器"
   ],
   "windows": false,
   "crimeScene": false,
   "weapons": [
    "干粉灭火器"
   ],
   "floorSurface": "石材",
   "src": "洋馆物理层 3.3、6.1"
  },
  "3F/楼梯平台": {
   "floor": "3F",
   "name": "楼梯平台",
   "mood": "栏杆外是门厅上空",
   "objects": [
    "栏杆",
    "干粉灭火器"
   ],
   "windows": false,
   "crimeScene": false,
   "weapons": [
    "干粉灭火器"
   ],
   "floorSurface": "石材",
   "src": "洋馆物理层 1.2、6.1"
  },
  "3F/门厅上空": {
   "floor": "3F",
   "name": "门厅上空",
   "mood": "天顶在十四米六",
   "objects": [],
   "windows": true,
   "crimeScene": false,
   "weapons": [],
   "floorSurface": "未注明",
   "src": "洋馆物理层 3.2"
  },
  "3F/西内廊": {
   "floor": "3F",
   "name": "西内廊",
   "mood": "十三座方座立着水晶",
   "objects": [
    "天然水晶花器",
    "方座"
   ],
   "windows": false,
   "crimeScene": false,
   "weapons": [
    "水晶花器"
   ],
   "floorSurface": "石材",
   "src": "各室/3F_廊与回廊.md"
  },
  "3F/东内廊": {
   "floor": "3F",
   "name": "东内廊",
   "mood": "玻璃外是院子上空",
   "objects": [],
   "windows": false,
   "crimeScene": false,
   "weapons": [],
   "floorSurface": "石材",
   "src": "洋馆物理层 1.2"
  },
  "3F/西院上空": {
   "floor": "3F",
   "name": "西院上空",
   "mood": "花园在十米之下",
   "objects": [],
   "windows": true,
   "crimeScene": false,
   "weapons": [],
   "floorSurface": "未注明",
   "src": "洋馆物理层 1.1"
  },
  "3F/东院上空": {
   "floor": "3F",
   "name": "东院上空",
   "mood": "玻璃天顶下就是院子",
   "objects": [],
   "windows": true,
   "crimeScene": false,
   "weapons": [],
   "floorSurface": "未注明",
   "src": "洋馆物理层 1.1、3.2"
  },
  "3F/穹顶回廊": {
   "floor": "3F",
   "name": "穹顶回廊",
   "mood": "鼓座外只剩零点六米",
   "objects": [],
   "windows": false,
   "crimeScene": false,
   "weapons": [],
   "floorSurface": "石材",
   "src": "洋馆物理层 1.2"
  },
  "3F/舞蹈室": {
   "floor": "3F",
   "name": "舞蹈室",
   "mood": "镜墙长七米二",
   "objects": [
    "镜墙",
    "把杆",
    "音乐柜",
    "丝绸舞姿织画",
    "长椅"
   ],
   "windows": true,
   "crimeScene": true,
   "weapons": [
    "擦汗巾"
   ],
   "floorSurface": "弹性木地板",
   "src": "各室/3F_舞蹈室.md"
  },
  "3F/茶室": {
   "floor": "3F",
   "name": "茶室",
   "mood": "茶罐的银盖都盖着",
   "objects": [
    "圆茶桌",
    "夜汀茶具",
    "榻榻米",
    "茶柜",
    "紫砂名壶"
   ],
   "windows": true,
   "crimeScene": true,
   "weapons": [
    "银壶",
    "紫砂壶"
   ],
   "floorSurface": "橡木地板·榻榻米",
   "src": "各室/3F_茶室.md；洋馆物理层 9"
  },
  "3F/瓷器室": {
   "floor": "3F",
   "name": "瓷器室",
   "mood": "鸡缸杯高三点四厘米",
   "objects": [
    "玻璃门瓷柜",
    "汝窑天青釉盘",
    "成化斗彩鸡缸杯",
    "看瓷桌"
   ],
   "windows": true,
   "crimeScene": true,
   "weapons": [],
   "floorSurface": "橡木地板",
   "src": "各室/3F_瓷器室.md"
  },
  "3F/修复室": {
   "floor": "3F",
   "name": "修复室",
   "mood": "六件古物修到一半",
   "objects": [
    "工作台",
    "玻璃立柜",
    "工具柜",
    "放大镜",
    "急救箱"
   ],
   "windows": true,
   "crimeScene": true,
   "weapons": [
    "刻刀",
    "小钳",
    "木锉"
   ],
   "floorSurface": "橡木地板",
   "src": "各室/3F_修复室.md"
  },
  "3F/天象室": {
   "floor": "3F",
   "name": "天象室",
   "mood": "八颗行星停在臂上",
   "objects": [
    "手摇太阳系仪",
    "水晶天球仪",
    "青铜浑仪",
    "黄铜折射望远镜",
    "银星盘"
   ],
   "windows": true,
   "crimeScene": true,
   "weapons": [
    "黄铜望远镜",
    "银星盘"
   ],
   "floorSurface": "橡木地板",
   "src": "各室/3F_天象室.md"
  },
  "3F/三层起居室": {
   "floor": "3F",
   "name": "三层起居室",
   "mood": "挂钟在北墙上走",
   "objects": [
    "三人沙发",
    "天然水晶瓶",
    "歙砚",
    "羊毛地毯",
    "挂钟"
   ],
   "windows": true,
   "crimeScene": true,
   "weapons": [
    "歙砚",
    "天然水晶瓶"
   ],
   "floorSurface": "橡木地板·羊毛地毯",
   "src": "各室/3F_三层起居室.md；洋馆物理层 3.3"
  },
  "3F/画室": {
   "floor": "3F",
   "name": "画室",
   "mood": "玉柄裁纸刀两把",
   "objects": [
    "裱画案",
    "画架",
    "画材柜",
    "洗笔台",
    "脚踏缝纫机"
   ],
   "windows": true,
   "crimeScene": true,
   "weapons": [
    "玉柄裁纸刀",
    "剪刀",
    "白玉镇纸"
   ],
   "floorSurface": "橡木地板",
   "src": "各室/3F_画室.md"
  },
  "3F/猎藏厅": {
   "floor": "3F",
   "name": "猎藏厅",
   "mood": "黑豹蹲在铜岩座上",
   "objects": [
    "棕熊标本",
    "北极熊标本",
    "雄狮标本",
    "雪豹标本",
    "巨角鹿头"
   ],
   "windows": true,
   "crimeScene": true,
   "weapons": [],
   "floorSurface": "橡木地板",
   "src": "各室/3F_猎藏厅.md"
  },
  "3F/9号套房": {
   "floor": "3F",
   "name": "9号套房",
   "mood": "床下净高三十厘米",
   "objects": [
    "四柱床",
    "床头柜",
    "书桌",
    "浴缸"
   ],
   "windows": true,
   "crimeScene": true,
   "weapons": [
    "水晶牙杯",
    "羽绒枕",
    "浴缸"
   ],
   "floorSurface": "羊毛地毯·卫浴防滑石",
   "src": "各室/套房.md；洋馆物理层 2.3、2.4、3.2"
  },
  "3F/10号套房": {
   "floor": "3F",
   "name": "10号套房",
   "mood": "衣帽间没有门扇",
   "objects": [
    "衣帽间",
    "衣柜",
    "四柱床",
    "矮柜"
   ],
   "windows": true,
   "crimeScene": true,
   "weapons": [
    "水晶牙杯",
    "羽绒枕",
    "浴缸"
   ],
   "floorSurface": "羊毛地毯·卫浴防滑石",
   "src": "各室/套房.md；洋馆物理层 2.3、2.4、3.2"
  },
  "3F/11号套房": {
   "floor": "3F",
   "name": "11号套房",
   "mood": "浴缸带手持花洒",
   "objects": [
    "浴缸",
    "手持花洒",
    "四柱床",
    "洗手台"
   ],
   "windows": true,
   "crimeScene": true,
   "weapons": [
    "水晶牙杯",
    "羽绒枕",
    "浴缸"
   ],
   "floorSurface": "羊毛地毯·卫浴防滑石",
   "src": "各室/套房.md；洋馆物理层 2.3、2.4、3.2"
  },
  "3F/12号套房": {
   "floor": "3F",
   "name": "12号套房",
   "mood": "药盒每天五点补足",
   "objects": [
    "日常药品盒",
    "书桌",
    "四柱床",
    "水晶牙杯"
   ],
   "windows": true,
   "crimeScene": true,
   "weapons": [
    "水晶牙杯",
    "羽绒枕",
    "浴缸"
   ],
   "floorSurface": "羊毛地毯·卫浴防滑石",
   "src": "各室/套房.md；洋馆物理层 2.3、2.4、3.2"
  },
  "3F/13号套房": {
   "floor": "3F",
   "name": "13号套房",
   "mood": "十三号在北排正中",
   "objects": [
    "窗（4.8 m）",
    "四柱床",
    "书桌",
    "墨绿地毯"
   ],
   "windows": true,
   "crimeScene": true,
   "weapons": [
    "水晶牙杯",
    "羽绒枕",
    "浴缸"
   ],
   "floorSurface": "羊毛地毯·卫浴防滑石",
   "src": "各室/套房.md；洋馆物理层 2.3、2.4、3.2"
  }
 },
 "atmosphere": [
  "窗后没有太阳",
  "日影从不移动",
  "五点窗光由无渐亮",
  "十九点窗光尽灭",
  "二十三点灯转低亮",
  "全馆没有一个灯开关",
  "看不见的基准钟",
  "入夜后窗面映出倒影",
  "外墙的窗往里开",
  "正门没有锁，也没有插销",
  "墙里屋外只有林子、沙滩和海",
  "三百米外有一道看不见的墙",
  "海水不涨不落",
  "林子里没有一只鸟",
  "五只钟各走各的",
  "落地钟几点敲几声",
  "错过的整点不补报",
  "七天须提一次重锤",
  "地下听不见钟声",
  "议事厅三门合拢，里外无声",
  "十三把钥匙按号悬挂",
  "没有备用钥匙",
  "一百三十枚金币",
  "金币两面都是一百",
  "十枚一摞，落在各人面前",
  "门缝只有五毫米",
  "锁孔里穿不过一根线",
  "廊上没有门",
  "两部电梯停在一层",
  "喷泉在白玉盘里循环",
  "五点半滴灌三分钟",
  "十六床花木同时开着",
  "冷池十六度，热池三十九",
  "冷冻柜零下十八度，空着",
  "馆内没有一粒食物",
  "五点无声补足药盒"
 ],
 "clocks": "仅五只时刻钟：1F门厅北墙、议事厅南门西侧那只高2.2 m的重锤机械落地钟（钟门是玻璃）是唯一整点报时者，几点敲几声、每声约五秒，不报半点，错过不补，约七天提一次重锤；原位时门厅、大楼梯、二三层楼梯平台和各层南廊靠门厅的一段都能数声，地下和两座后楼梯里听不见。1F议事厅北墙（两座罩柜中间上方）、1F宴饮厅南墙、2F阅览室北墙、3F三层起居室北墙各一只AA电池石英挂钟，只走不报。初始与基准钟一致，此后各走各的。",
 "entrance": "1F门厅南墙正门，中心x=34.8、净宽3.6 m、高3.6 m，熏橡木双扇大门，没有锁，也没有插销；门上方一面宽9.6 m、高9.6 m的大窗。门外三级石阶，下面是宽20 m、深12 m的铺石前庭，屋外地面比一层楼面低0.45 m。房子四周一圈15 m宽的草地，往北、往东、往西是林子，往南是沙滩和海；以议事厅圆心为圆心、半径300 m有一道透明的墙，谁也出不去。到屋外只走正门和能开的窗。",
 "clueTemplates": [
  {
   "id": "handprint",
   "name": "手印",
   "attribute": "heightCm",
   "glyph": "height",
   "visible": true,
   "text": "侧光下，镜墙高处有一枚裸手印，离地约{v}厘米",
   "predicate": "c.heightCm >= 178",
   "variants": [
    {
     "text": "玻璃罩柜面低处有一枚裸手印",
     "predicate": "c.heightCm < 165"
    },
    {
     "text": "打蜡门框齐肩高处留着裸手印",
     "predicate": "c.heightCm >= 165 && c.heightCm < 178"
    }
   ],
   "source": "洋馆物理层 7.2（打蜡橡木、玻璃柜门与罩、镜面被裸手摸过可留手印，要侧光近看；馆内无指纹比对）"
  },
  {
   "id": "woodprint",
   "name": "鞋印",
   "attribute": "heightCm",
   "glyph": "height",
   "visible": true,
   "text": "橡木地板侧光下有湿鞋印淡渍，鞋码偏大",
   "predicate": "c.heightCm >= 178",
   "variants": [
    {
     "text": "花床湿土里一枚鞋印，鞋码偏小",
     "predicate": "c.heightCm < 165"
    },
    {
     "text": "花园石路上由浓到淡的泥印，鞋码中等",
     "predicate": "c.heightCm >= 165 && c.heightCm < 178"
    }
   ],
   "source": "洋馆物理层 7.1（橡木地板：湿鞋印干后侧光下留几小时淡渍；花床湿土留鞋印；沾泥的鞋走上石路或廊留由浓到淡的泥印）"
  },
  {
   "id": "spareclothes",
   "name": "换洗衣物",
   "attribute": "heightCm",
   "glyph": "height",
   "visible": true,
   "text": "洗衣房里一套换洗衣物，尺码偏大",
   "predicate": "c.heightCm >= 178",
   "variants": [
    {
     "text": "洗衣房里一套换洗衣物，尺码偏小",
     "predicate": "c.heightCm < 165"
    }
   ],
   "source": "各室/套房.md「每间分配套房的物品」（换洗衣物三套，与住客入场时的款式、尺码相同）"
  },
  {
   "id": "bloodshirt",
   "name": "冷水血衣",
   "attribute": "gender",
   "glyph": "gender",
   "visible": true,
   "text": "冷水洗过仍留淡痕的{v}衣物，塞在套房衣柜下部",
   "predicate": "c.gender === \"男\"",
   "variants": [
    {
     "text": "冷水洗过仍留淡痕的女式衣裙，塞在衣柜下部",
     "predicate": "c.gender === \"女\""
    }
   ],
   "source": "洋馆物理层 7.3（冷水洗血去掉大半，仍留淡痕）；各室/套房.md（换洗衣物与本人款式相同）"
  },
  {
   "id": "lipstick",
   "name": "杯沿唇印",
   "attribute": "gender",
   "glyph": "gender",
   "visible": true,
   "text": "酒杯沿留着一抹口红印，杯身有裸手印",
   "predicate": "c.gender === \"女\"",
   "variants": [
    {
     "text": "现场遗落一片独立包装卫生巾的包装纸",
     "predicate": "c.gender === \"女\""
    },
    {
     "text": "洗手台面上一道卸妆油的油渍",
     "predicate": "c.gender === \"女\""
    }
   ],
   "source": "各室/套房.md「女性住客房间的额外物品」（口红、卸妆油、独立包装卫生巾）；洋馆物理层 7.2（酒杯可留手印）"
  },
  {
   "id": "defense",
   "name": "防御伤",
   "attribute": "physique",
   "glyph": "physique",
   "visible": true,
   "text": "死者手臂有防御伤，颈部瘀痕很深",
   "predicate": "c.stats.physique === \"受训\"",
   "variants": [
    {
     "text": "橡木地板上一片新刮痕，像有过一阵扭打",
     "predicate": "c.stats.physique === \"受训\""
    },
    {
     "text": "死者毫无防御伤，颈侧有一个针眼",
     "predicate": "c.stats.physique === \"普通\""
    }
   ],
   "source": "身体结算 7（前二十秒能挣扎，体格差距决定有没有用）、9（受训者扭打持续×2）；洋馆物理层 7.4 防御伤、7.1 刮痕；价目表 10.3（镇静剂一针：注射后几分钟内睡着）"
  },
  {
   "id": "freezer",
   "name": "冷冻柜结冻",
   "attribute": "knowsModernDevices",
   "glyph": "era",
   "visible": false,
   "text": "尸体冻硬了，和尸僵的硬不一样：进过−18 ℃的冷冻柜",
   "predicate": "c.knowsModernDevices === true",
   "variants": [
    {
     "text": "保龄球道被保养机重新抹过油，印迹被覆盖",
     "predicate": "c.knowsModernDevices === true"
    },
    {
     "text": "血衣是在浴缸里手搓的，洗衣房的洗衣机没动过",
     "predicate": "c.knowsModernDevices === false"
    }
   ],
   "source": "洋馆物理层 7.4（−18 ℃冷冻柜在厨房，结冻干扰读尸）、7.1（保养机重新分布球道油）；各室/B1_洗衣房.md；卡司总则 4（馆里多半没见过的器物）",
   "shift": [
    {
     "vi": 0,
     "dir": -1,
     "reads": [
      "temp",
      "rigor"
     ]
    }
   ]
  },
  {
   "id": "coldpool",
   "name": "冷池浸泡",
   "attribute": "medical",
   "glyph": "medical",
   "visible": false,
   "text": "尸体湿冷，僵硬与体温对不上：泡过16 ℃的冷池",
   "predicate": "c.stats.medical !== \"无\"",
   "variants": [
    {
     "text": "尸体裹着两层蚕丝被，散热被刻意放慢",
     "predicate": "c.stats.medical !== \"无\""
    },
    {
     "text": "尸体在39 ℃的热池里泡过，摸着像刚死",
     "predicate": "c.stats.medical !== \"无\""
    }
   ],
   "source": "洋馆物理层 7.4 环境干扰（16 ℃冷池在 B1 浴疗室；蚕丝被每间套房一床，洗衣房另有十三床；39 ℃热池）、7.5（医护者才能综合读出死亡时间段）",
   "shift": [
    {
     "vi": 0,
     "dir": -1,
     "reads": [
      "temp"
     ]
    },
    {
     "vi": 1,
     "dir": 1,
     "reads": [
      "temp"
     ]
    },
    {
     "vi": 2,
     "dir": 1,
     "reads": [
      "temp"
     ]
    }
   ]
  },
  {
   "id": "vessel",
   "name": "大血管一刀",
   "attribute": "medical",
   "glyph": "medical",
   "visible": false,
   "text": "只有一刀，切在大腿内侧的大血管上",
   "predicate": "c.stats.medical === \"有\" || c.stats.medical === \"战场急救\"",
   "variants": [
    {
     "text": "颈侧一刀，数分钟内失血毙命",
     "predicate": "c.stats.medical === \"有\" || c.stats.medical === \"战场急救\""
    },
    {
     "text": "伤口多而凌乱，几刀都避开了要害",
     "predicate": "c.stats.medical === \"无\""
    }
   ],
   "source": "身体结算 6（大血管——颈、腋、大腿内侧——不处理数分钟内死亡）"
  },
  {
   "id": "furniture",
   "name": "家具归位",
   "attribute": "observation",
   "glyph": "observation",
   "visible": false,
   "text": "椅子挪走又搬回，地毯压痕严丝合缝",
   "predicate": "c.stats.observation === \"擅长\"",
   "variants": [
    {
     "text": "椅子搬回时错了位，蜡面色差露出一条边",
     "predicate": "c.stats.observation === \"一般\""
    }
   ],
   "source": "洋馆物理层 7.2（家具原位可有地毯压痕、蜡面色差；挪走再搬回，对不齐处细查可见）、7.5 现场观察"
  },
  {
   "id": "scrub",
   "name": "擦洗边界",
   "attribute": "observation",
   "glyph": "observation",
   "visible": false,
   "text": "石地血迹擦得极净，连拼缝与防滑纹都清过",
   "predicate": "c.stats.observation === \"擅长\"",
   "variants": [
    {
     "text": "表面擦净，拼缝与防滑纹里残血未动",
     "predicate": "c.stats.observation === \"一般\""
    }
   ],
   "source": "洋馆物理层 7.1（石材的拼缝、墙脚和排水口，湿区的防滑纹、排水沟和地漏滤网可留残血；擦洗留湿区）、8.3 擦血耗时"
  },
  {
   "id": "gloves",
   "name": "手套污印",
   "attribute": "items",
   "glyph": "items",
   "visible": true,
   "text": "只有带污的手套印；馆里的手套一样没少",
   "predicate": "c.carried.some(i => i.includes(\"手套\"))",
   "variants": [
    {
     "text": "工具间的牛皮手套少了一双",
     "predicate": "!c.carried.some(i => i.includes(\"手套\"))"
    }
   ],
   "source": "洋馆物理层 7.2（手套不留裸指纹，带污留污印；按库存消耗）、6.1（六只急救箱各一次性手套五副）；各室/1F_花园与园艺间.md（园艺手套六双）、各室/B1_工具间.md（牛皮工作手套六双）"
  },
  {
   "id": "pipe",
   "name": "烟味与烟灰",
   "attribute": "items",
   "glyph": "items",
   "visible": true,
   "text": "关门的房里烟味未散，桌上一撮烟斗烟丝灰",
   "predicate": "c.carried.some(i => /烟斗|烟管/.test(i))",
   "variants": [
    {
     "text": "垃圾桶里有卷烟的烟蒂与烟灰",
     "predicate": "!c.carried.some(i => /烟斗|烟管/.test(i))"
    }
   ],
   "source": "洋馆物理层 7.2（烟味在关门房间留一两个小时）、8.3（一支烟燃尽约5—7分钟）；价目表 1（一包香烟）、10.1（雪茄一支，或烟斗烟丝一包，不在铜牌上）；卡司总则 2（烟谁都不带）"
  }
 ],
 "bodyStages": [
  {
   "minutes": 0,
   "text": "仍温，四肢柔软，尚无尸斑"
  },
  {
   "minutes": 30,
   "text": "低处浮出暗紫尸斑，按压褪色"
  },
  {
   "minutes": 60,
   "text": "下颌与颈部开始发紧"
  },
  {
   "minutes": 120,
   "text": "四肢先凉，躯干仍有余温"
  },
  {
   "minutes": 240,
   "text": "僵硬扩向上肢与躯干，翻身尸斑会移"
  },
  {
   "minutes": 360,
   "text": "已冷，渐近室温，全身僵硬"
  },
  {
   "minutes": 480,
   "text": "尸斑开始固定，按压不再褪色"
  },
  {
   "minutes": 720,
   "text": "体温与室温相近，搬动不抹尸斑"
  },
  {
   "minutes": 1440,
   "text": "僵硬开始缓解"
  }
 ],
 "bodyReadings": [
  {
   "key": "temp",
   "name": "体温",
   "steps": [
    {
     "to": 120,
     "text": "仍温"
    },
    {
     "to": 360,
     "text": "四肢先凉，躯干仍有余温"
    },
    {
     "to": 720,
     "text": "已冷，逐渐接近环境温度"
    },
    {
     "to": null,
     "text": "通常与环境接近"
    }
   ]
  },
  {
   "key": "rigor",
   "name": "僵硬",
   "steps": [
    {
     "to": 60,
     "text": "起初无"
    },
    {
     "to": 120,
     "text": "下颌与颈部开始发紧"
    },
    {
     "to": 360,
     "text": "向上肢、躯干扩展"
    },
    {
     "to": 1440,
     "text": "全身僵硬"
    },
    {
     "to": null,
     "text": "开始缓解"
    }
   ]
  },
  {
   "key": "livor",
   "name": "尸斑",
   "steps": [
    {
     "to": 30,
     "text": "尚无"
    },
    {
     "to": 120,
     "text": "出现，按压褪色"
    },
    {
     "to": 480,
     "text": "逐渐明显，按压仍可褪色"
    },
    {
     "to": null,
     "text": "固定，按压不再明显褪色"
    }
   ]
  }
 ],
 "causes": [
  {
   "id": "stab",
   "name": "利器伤",
   "sign": "出血多，伤口整齐，手臂或有防御伤",
   "needs": ""
  },
  {
   "id": "blunt",
   "name": "重钝器击打",
   "sign": "头部重创，旁有喷点，肋骨或四肢骨折",
   "needs": ""
  },
  {
   "id": "strangle",
   "name": "扼颈或勒颈",
   "sign": "颈部瘀痕，眼睑针尖状出血点",
   "needs": "c.stats.physique === \"受训\"",
   "glyph": "physique",
   "visible": true
  },
  {
   "id": "smother",
   "name": "闷压口鼻",
   "sign": "口鼻周围局部压痕",
   "needs": ""
  },
  {
   "id": "poison",
   "name": "兑换来的毒",
   "sign": "口唇发绀，皮肤与尸斑偏鲜红，口边有苦杏仁气味；服下几分钟内死去",
   "needs": "",
   "kind": "氰化物",
   "points": 8000,
   "source": "价目表 10.6（致死的毒一剂，可指定是哪一种 8,000，不在铜牌上）、第 9 节（买的人说要哪一种真实存在的毒就交付那一种；起效、症状照这种毒的常识）。kind 是本站替凶手选的一种"
  },
  {
   "id": "drown",
   "name": "溺水",
   "sign": "口鼻细泡沫，衣物湿透",
   "needs": "",
   "where": "泳池厅泳池、浴疗室冷热池、套房浴缸、花园喷泉、屋外的海（洋馆物理层 1.4、各室）"
  },
  {
   "id": "fall",
   "name": "坠落",
   "sign": "骨折，头先着地则颅脑重伤",
   "needs": "",
   "where": "大楼梯与楼梯平台的栏杆（二层平台离一层地面 5 m，三层 10 m）、二三层能开的外窗、大图书室书梯、杂物储藏室木梯与人字梯（洋馆物理层 1.2、3.2、4.4；各室）"
  },
  {
   "id": "alcohol",
   "name": "醉酒后呕吐物呛死",
   "sign": "浓重酒气，仰躺，口鼻呕吐物",
   "needs": ""
  }
 ],
 "phases": [
  {
   "key": "wake",
   "title": "苏醒",
   "line": "十七点零五分前，一个个醒来。",
   "broadcast": ""
  },
  {
   "key": "keys",
   "title": "领钥",
   "line": "人手一把钥匙，房号就此绑定。",
   "broadcast": ""
  },
  {
   "key": "rules",
   "title": "宣告",
   "line": "主持人开口，暗线开始走。",
   "broadcast": ""
  },
  {
   "key": "mandate",
   "title": "受命",
   "line": "私人通知，只送达一人。",
   "broadcast": ""
  },
  {
   "key": "daily",
   "title": "暗线",
   "line": "吃、住、交往，图谋在底下走。",
   "broadcast": ""
  },
  {
   "key": "overdue",
   "title": "逾期",
   "line": "二十四小时，到点即处死。",
   "broadcast": "〈某某〉是受命者，未在期限内完成任务。"
  },
  {
   "key": "murder",
   "title": "行凶",
   "line": "不可回头的那一步。",
   "broadcast": ""
  },
  {
   "key": "discovery",
   "title": "发现",
   "line": "看见了，并确认他已死去。",
   "broadcast": "发现尸体。〈开庭时刻〉开庭。"
  },
  {
   "key": "investigate",
   "title": "调查",
   "line": "一百二十分钟，谁找到算谁的。",
   "broadcast": "又发现一具尸体。"
  },
  {
   "key": "court",
   "title": "开庭",
   "line": "尸体移走，只剩衣物塌落。",
   "broadcast": ""
  },
  {
   "key": "debate",
   "title": "辩论",
   "line": "自一号席起，各说一次。",
   "broadcast": "辩论结束，开始投票。"
  },
  {
   "key": "vote",
   "title": "投票",
   "line": "记名，依次，公开。",
   "broadcast": "未产生唯一结果，重新投票。／连续两次未产生唯一结果，本场审判结束。"
  },
  {
   "key": "verdict",
   "title": "判定",
   "line": "选中真凶，他当场被处死。",
   "broadcast": "判定正确。〈某某〉是〈死者〉一案的凶手。"
  },
  {
   "key": "misjudge",
   "title": "误判",
   "line": "错指的人先死，再公布。",
   "broadcast": "判定错误。〈某某〉不是〈死者〉一案的凶手。本场第〈一／二〉次误判。"
  },
  {
   "key": "execution",
   "title": "处刑",
   "line": "尸体消失，衣服与金币留在原地。",
   "broadcast": ""
  },
  {
   "key": "payout",
   "title": "发放",
   "line": "金币无声出现在各人手边。",
   "broadcast": ""
  },
  {
   "key": "aftermath",
   "title": "重新起算",
   "line": "受命者重获二十四小时。",
   "broadcast": ""
  },
  {
   "key": "wish",
   "title": "愿望",
   "line": "只剩一人，愿望成真。",
   "broadcast": ""
  }
 ],
 "coins": "金币共130枚：第二条播报第一句说出的同时，每人十枚出现在各人面前的桌上，码成一摞（不在席位上的，出现在他伸手可及的平面上）；没有理币盘。1枚=100分，一次兑换的总价须正好整百，不足整枚的添东西凑满，或者不成交；不找零，只能用身上带着的金币付；没有账本，也没有余额播报。金币可自由交易、赠与，抢夺不受惩罚；人死后金币留在尸体处，被处刑的人衣服、金币和身上的东西留在原地。每批审判结束时，存活在馆者各得5枚；凶手全部查明，每人再得5枚（共10枚），出现在各人伸手可及的平面上；未能查明时，凶手另得10枚，出现在凶手套房书桌上，不广播。D01 20:00 存活在馆者每人再得5枚。违反主持人的指令罚5枚，不够扣的处死。死者与离馆者不发。退出券500枚。",
 "startState": "第一日17:00，全员闭眼昏睡，坐在穹顶议事厅圆桌旁的十三把高背扶手椅上，编号几号坐几号席，与房号、庭审座次无关；17:05之前陆续自然醒来，先后开局时抽一次。议事厅南、西、东三扇门合拢，第六条播报以前谁也打不开，三门都合拢时厅里厅外互相听不见。桌沿十三枚号牌牌面空白，钥匙分配完成的那一刻同时现出号码，1号正北、顺时针。十三把套房钥匙按号悬于东墙边收纳台的钥匙龛（上排1—7，下排8—13），无人持有；价目铜牌在东门南侧的弧墙上。规则卡在第四条播报说完的那一刻、身份卡在第五条播报说到它的那一刻，出现在各人席位前的桌沿内侧，平放；身份卡两面空白，主人碰到才现字。十三间套房门锁着，其余有门扇的通行口合拢未锁；外窗关着、扣着；两部电梯停在一层，门关着。落地钟17:00敲响五声。屋外沙滩平整，草地上没有踩过的痕迹。"
};
