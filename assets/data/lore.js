/* ==========================================================
   LORE：从配置文件提炼的氛围与机制素材
   rooms          以「楼层/房名」为键（如 "1F/穹顶议事厅"）：{floor, name, mood 氛围短句, objects 陈设, windows 有窗,
                  crimeScene 适合作案发现场, weapons 可作凶器之物, floorSurface 地面材质}（洋馆物理层 §1.3 §3 §6）
   atmosphere     洋馆里的短句（均有原文依据）
   clocks         钟与报时（§3.3）        entrance  正门与黑钻石封墙
   clueTemplates  线索模板：{id, name, text, attribute, predicate, variants[{text, predicate}], source}
                  predicate 是对角色 c（CHARACTERS 的一项）的 JS 表达式字符串，如 "c.heightCm >= 178"
   bodyStages     尸体随死后分钟数的变化（§7.4）
   causes         死因：{id, name, sign 体表特征, needs 对凶手的要求（predicate 或空）}
   phases         一局游戏的循环阶段：{key, title, line, broadcast}
   coins          金币规则摘要      startState  开局初态摘要
   广播句式原文见 WORLD.broadcasts。
   ========================================================== */
window.LORE = {
 "rooms": {
  "B1/西浴场廊": {
   "floor": "B1",
   "name": "西浴场廊",
   "mood": "青玉鳞鲸伏于长廊",
   "objects": [
    "青玉鳞鲸",
    "青玉环鳍",
    "水晶门展柜",
    "双扇廊门"
   ],
   "windows": false,
   "crimeScene": false,
   "weapons": [
    "青玉整雕"
   ],
   "floorSurface": "细凿浅玉"
  },
  "B1/南侧库廊": {
   "floor": "B1",
   "name": "南侧库廊",
   "mood": "玉海马独守灰廊",
   "objects": [
    "青玉长须海马",
    "水晶门展柜"
   ],
   "windows": false,
   "crimeScene": false,
   "weapons": [
    "青玉长须海马"
   ],
   "floorSurface": "哑光烟灰玉"
  },
  "B1/东服务廊": {
   "floor": "B1",
   "name": "东服务廊",
   "mood": "双首海蛇伏于柜中",
   "objects": [
    "青玉双首海蛇",
    "水晶门展柜",
    "双扇廊门"
   ],
   "windows": false,
   "crimeScene": false,
   "weapons": [
    "青玉双首海蛇"
   ],
   "floorSurface": "哑光烟灰玉"
  },
  "B1/主楼梯厅": {
   "floor": "B1",
   "name": "主楼梯厅",
   "mood": "梯毯吞没下行足音",
   "objects": [
    "羊脂玉踏步",
    "银狐皮梯毯",
    "古沉香歇脚凳",
    "青铜方位牌",
    "干粉灭火器"
   ],
   "windows": false,
   "crimeScene": false,
   "weapons": [
    "干粉灭火器"
   ],
   "floorSurface": "羊脂玉踏步·银狐皮梯毯"
  },
  "B1/西北楼梯厅": {
   "floor": "B1",
   "name": "西北楼梯厅",
   "mood": "浅青玉阶没入地底",
   "objects": [
    "浅青玉踏步",
    "古柚木扶手",
    "青铜方位牌",
    "银边检修盖",
    "干粉灭火器"
   ],
   "windows": false,
   "crimeScene": false,
   "weapons": [
    "干粉灭火器"
   ],
   "floorSurface": "浅青玉踏步"
  },
  "B1/东北楼梯厅": {
   "floor": "B1",
   "name": "东北楼梯厅",
   "mood": "深灰玉阶沉向地下",
   "objects": [
    "深灰玉踏步",
    "古柚木扶手",
    "青铜方位牌",
    "银边检修盖",
    "干粉灭火器"
   ],
   "windows": false,
   "crimeScene": false,
   "weapons": [
    "干粉灭火器"
   ],
   "floorSurface": "深灰玉踏步"
  },
  "B1/西北前室": {
   "floor": "B1",
   "name": "西北前室",
   "mood": "池泵声从门后渗出",
   "objects": [
    "银线花纹玉板",
    "泳池机房门"
   ],
   "windows": false,
   "crimeScene": false,
   "weapons": [],
   "floorSurface": "未注明"
  },
  "B1/东北前室": {
   "floor": "B1",
   "name": "东北前室",
   "mood": "洗衣布草室的门就在旁边",
   "objects": [
    "银线花纹玉板",
    "洗衣布草室门"
   ],
   "windows": false,
   "crimeScene": false,
   "weapons": [],
   "floorSurface": "未注明"
  },
  "B1/浴更前厅": {
   "floor": "B1",
   "name": "浴更前厅",
   "mood": "浴女像望着镜中人",
   "objects": [
    "白玉浴女像",
    "银框穿衣镜",
    "海獭皮软垫",
    "浴用拖鞋格柜"
   ],
   "windows": false,
   "crimeScene": true,
   "weapons": [],
   "floorSurface": "青白玉"
  },
  "B1/甲更衣室": {
   "floor": "B1",
   "name": "甲更衣室",
   "mood": "烟晶隔板后只见轮廓",
   "objects": [
    "无锁古柚木衣柜",
    "烟晶淋浴隔间",
    "青玉双盆盥洗台",
    "桑蚕丝浴袍"
   ],
   "windows": false,
   "crimeScene": true,
   "weapons": [
    "海岛棉浴巾",
    "水晶漱口杯"
   ],
   "floorSurface": "防滑纹白玉"
  },
  "B1/乙更衣室": {
   "floor": "B1",
   "name": "乙更衣室",
   "mood": "八扇柜门无一上锁",
   "objects": [
    "无锁古柚木衣柜",
    "银制号码牌",
    "柚木更衣凳",
    "水晶漱口杯"
   ],
   "windows": false,
   "crimeScene": true,
   "weapons": [
    "海岛棉浴巾",
    "水晶漱口杯"
   ],
   "floorSurface": "防滑纹白玉"
  },
  "B1/玉石泳池厅": {
   "floor": "B1",
   "name": "玉石泳池厅",
   "mood": "池灯照不见的水角",
   "objects": [
    "翡翠整凿泳池",
    "古柚木躺椅",
    "青玉海兽浮雕",
    "玻璃纤维救生杆",
    "水晶罩温湿度表"
   ],
   "windows": false,
   "crimeScene": true,
   "weapons": [
    "玻璃纤维救生杆",
    "水晶浅盘",
    "池水"
   ],
   "floorSurface": "羊脂白玉池岸·池水"
  },
  "B1/冷热浴疗室": {
   "floor": "B1",
   "name": "冷热浴疗室",
   "mood": "冷热两池会搅乱死亡时间",
   "objects": [
    "墨玉冷浴池",
    "墨玉热浴池",
    "古沉香坐凳",
    "银框圆镜"
   ],
   "windows": false,
   "crimeScene": true,
   "weapons": [
    "浴池水",
    "水晶杯"
   ],
   "floorSurface": "横槽整材白玉"
  },
  "B1/泳池机房": {
   "floor": "B1",
   "name": "泳池机房",
   "mood": "池水六小时循环一遍",
   "objects": [
    "青铜泵壳循环泵",
    "不锈钢过滤罐",
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
   "floorSurface": "浅灰石英岩"
  },
  "B1/地下会客前厅": {
   "floor": "B1",
   "name": "地下会客前厅",
   "mood": "琥珀里封着白玉",
   "objects": [
    "银丝织锦",
    "海蓝宝石低桌",
    "银狐皮毯",
    "银制垂叶棕榈灯",
    "水晶水壶"
   ],
   "windows": false,
   "crimeScene": true,
   "weapons": [
    "银制棕榈灯",
    "水晶水壶"
   ],
   "floorSurface": "琥珀包白玉·银狐皮毯"
  },
  "B1/物资库": {
   "floor": "B1",
   "name": "物资库",
   "mood": "油布与棉绳静候",
   "objects": [
    "古楠木货架",
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
   "floorSurface": "未注明"
  },
  "B1/工具修理室": {
   "floor": "B1",
   "name": "工具修理室",
   "mood": "总控柜切不断灯",
   "objects": [
    "总控柜",
    "钢制台钳",
    "乌木工具板",
    "水晶工作灯",
    "可移动装配台"
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
   "floorSurface": "未注明"
  },
  "B1/南勤廊": {
   "floor": "B1",
   "name": "南勤廊",
   "mood": "浅青玉长板通向库房",
   "objects": [
    "浅青玉长板",
    "古柚木护壁",
    "乳白水晶灯片"
   ],
   "windows": false,
   "crimeScene": false,
   "weapons": [],
   "floorSurface": "浅青玉长板"
  },
  "B1/器械后廊": {
   "floor": "B1",
   "name": "器械后廊",
   "mood": "检修盖后置瓶机静伏",
   "objects": [
    "置瓶机检修盖",
    "乌木护壁"
   ],
   "windows": false,
   "crimeScene": false,
   "weapons": [],
   "floorSurface": "烟灰玉"
  },
  "B1/酒窖前廊": {
   "floor": "B1",
   "name": "酒窖前廊",
   "mood": "墙板嵌着六幅银葡萄藤",
   "objects": [
    "银质葡萄藤浮雕",
    "古沉香墙板"
   ],
   "windows": false,
   "crimeScene": false,
   "weapons": [],
   "floorSurface": "深紫翡翠"
  },
  "B1/双道保龄球馆": {
   "floor": "B1",
   "name": "双道保龄球馆",
   "mood": "撞瓶声盖住脚步",
   "objects": [
    "糖枫木球道",
    "置瓶机",
    "树脂保龄球",
    "糖枫木球瓶",
    "银边计分屏"
   ],
   "windows": false,
   "crimeScene": true,
   "weapons": [
    "七公斤保龄球",
    "球瓶"
   ],
   "floorSurface": "糖枫木助走与球道"
  },
  "B1/运动休息厅": {
   "floor": "B1",
   "name": "运动休息厅",
   "mood": "青金石线划开白玉",
   "objects": [
    "海豹皮坐榻",
    "白玉饮水台",
    "乌木运动用品柜",
    "烟晶边几"
   ],
   "windows": false,
   "crimeScene": true,
   "weapons": [],
   "floorSurface": "白玉嵌青金石线"
  },
  "B1/乒乓体育室": {
   "floor": "B1",
   "name": "乒乓体育室",
   "mood": "孔雀蓝墙吸尽回声",
   "objects": [
    "深蓝桦木球台",
    "桧木球拍",
    "乒乓球",
    "手翻计分牌"
   ],
   "windows": false,
   "crimeScene": true,
   "weapons": [],
   "floorSurface": "糖枫木弹性地板"
  },
  "B1/体能训练室": {
   "floor": "B1",
   "name": "体能训练室",
   "mood": "计时钟只数经过的时间",
   "objects": [
    "机械计时钟",
    "哑铃架",
    "水阻划船机",
    "综合力量架",
    "银框长镜"
   ],
   "windows": false,
   "crimeScene": true,
   "weapons": [
    "二十公斤哑铃",
    "拉伸带",
    "举重腰带",
    "弹力绳"
   ],
   "floorSurface": "糖枫木·橡胶垫"
  },
  "B1/伸展室": {
   "floor": "B1",
   "name": "伸展室",
   "mood": "整墙水晶镜看着你",
   "objects": [
    "银背水晶镜",
    "乌木扶杆",
    "橡胶练习垫",
    "羊绒面长枕"
   ],
   "windows": false,
   "crimeScene": true,
   "weapons": [
    "棉质伸展带",
    "羊绒面长枕"
   ],
   "floorSurface": "细纹古柚木"
  },
  "B1/运动器材库": {
   "floor": "B1",
   "name": "运动器材库",
   "mood": "备用钢索静卧柜中",
   "objects": [
    "通顶古柚木格柜",
    "乌木打理台",
    "四轮器材车",
    "折叠搬运架"
   ],
   "windows": false,
   "crimeScene": true,
   "weapons": [
    "备用钢索",
    "跳绳"
   ],
   "floorSurface": "未注明"
  },
  "B1/珍酿酒窖": {
   "floor": "B1",
   "name": "珍酿酒窖",
   "mood": "十四度，尸体凉得快",
   "objects": [
    "古橡木酒架",
    "烈酒门柜",
    "黄花梨酒车",
    "银制酒款签"
   ],
   "windows": false,
   "crimeScene": true,
   "weapons": [
    "酒瓶"
   ],
   "floorSurface": "深褐老橡木"
  },
  "B1/品酒室": {
   "floor": "B1",
   "name": "品酒室",
   "mood": "紫貂皮毯洗不净血",
   "objects": [
    "沉香品酒桌",
    "紫貂皮毯",
    "银制吐酒盂",
    "水晶醒酒器",
    "银柄开瓶器"
   ],
   "windows": false,
   "crimeScene": true,
   "weapons": [
    "银柄开瓶器",
    "水晶醒酒器"
   ],
   "floorSurface": "浅灰玉·紫貂皮毯"
  },
  "B1/酒器洗藏间": {
   "floor": "B1",
   "name": "酒器洗藏间",
   "mood": "四十八只高脚杯屏息",
   "objects": [
    "双槽银内衬盆",
    "沉香格柜",
    "银冰桶",
    "金丝楠沥水架"
   ],
   "windows": false,
   "crimeScene": true,
   "weapons": [
    "银冰桶",
    "水晶醒酒器"
   ],
   "floorSurface": "未注明"
  },
  "B1/洗衣布草室": {
   "floor": "B1",
   "name": "洗衣布草室",
   "mood": "洗一轮要四十五分钟",
   "objects": [
    "滚筒洗衣机",
    "烘干机",
    "手摇缝纫机",
    "藤编脏衣篮",
    "蒸汽熨斗"
   ],
   "windows": false,
   "crimeScene": true,
   "weapons": [
    "蒸汽熨斗",
    "银柄裁缝剪",
    "干粉灭火器"
   ],
   "floorSurface": "未注明"
  },
  "1F/西藏珍廊": {
   "floor": "1F",
   "name": "西藏珍廊",
   "mood": "沁褐玉戈卧于柜中",
   "objects": [
    "商代沁褐玉戈",
    "透雕玉凤",
    "谷纹玉璧",
    "双龙首玉璜"
   ],
   "windows": false,
   "crimeScene": false,
   "weapons": [
    "商代玉戈"
   ],
   "floorSurface": "墨翡翠"
  },
  "1F/东织锦廊": {
   "floor": "1F",
   "name": "东织锦廊",
   "mood": "六时花候织到星沉",
   "objects": [
    "六时花候织锦",
    "银鎏金有盖杯",
    "水晶雕杯"
   ],
   "windows": false,
   "crimeScene": false,
   "weapons": [
    "银鎏金有盖杯"
   ],
   "floorSurface": "深色金丝楠"
  },
  "1F/主楼梯厅": {
   "floor": "1F",
   "name": "主楼梯厅",
   "mood": "钟声在平台数得清",
   "objects": [
    "羊脂玉踏步",
    "银狐皮梯毯",
    "古沉香歇脚凳",
    "青铜方位牌",
    "干粉灭火器"
   ],
   "windows": false,
   "crimeScene": false,
   "weapons": [
    "干粉灭火器"
   ],
   "floorSurface": "羊脂玉踏步·银狐皮梯毯"
  },
  "1F/西北楼梯厅": {
   "floor": "1F",
   "name": "西北楼梯厅",
   "mood": "后梯听不见钟声",
   "objects": [
    "浅青玉踏步",
    "古柚木扶手",
    "青铜方位牌",
    "银边检修盖",
    "干粉灭火器"
   ],
   "windows": false,
   "crimeScene": false,
   "weapons": [
    "干粉灭火器"
   ],
   "floorSurface": "浅青玉踏步"
  },
  "1F/东北楼梯厅": {
   "floor": "1F",
   "name": "东北楼梯厅",
   "mood": "栏板后可藏倒地者",
   "objects": [
    "深灰玉踏步",
    "古柚木扶手",
    "青铜方位牌",
    "银边检修盖",
    "干粉灭火器"
   ],
   "windows": false,
   "crimeScene": false,
   "weapons": [
    "干粉灭火器"
   ],
   "floorSurface": "深灰玉踏步"
  },
  "1F/西北前室": {
   "floor": "1F",
   "name": "西北前室",
   "mood": "门后暮王头朝北",
   "objects": [
    "银线花纹玉板",
    "2号套房门",
    "自然史大厅北门"
   ],
   "windows": false,
   "crimeScene": false,
   "weapons": [],
   "floorSurface": "未注明"
  },
  "1F/东北前室": {
   "floor": "1F",
   "name": "东北前室",
   "mood": "银钮门铃按住才响",
   "objects": [
    "银线花纹玉板",
    "5号套房门铃",
    "宴饮厅北门"
   ],
   "windows": false,
   "crimeScene": false,
   "weapons": [],
   "floorSurface": "未注明"
  },
  "1F/1号套房": {
   "floor": "1F",
   "name": "1号套房",
   "mood": "插销只能从里插上",
   "objects": [
    "古沉香四柱床",
    "黄铜横插销",
    "雪狐皮毯",
    "羊脂白玉浴缸"
   ],
   "windows": true,
   "crimeScene": true,
   "weapons": [
    "水晶牙杯",
    "羽绒枕",
    "羊脂白玉浴缸"
   ],
   "floorSurface": "月白玉·雪狐皮毯"
  },
  "1F/2号套房": {
   "floor": "1F",
   "name": "2号套房",
   "mood": "门铃只在门内响起",
   "objects": [
    "银钮门铃",
    "古沉香四柱床",
    "桑蚕丝床帘",
    "水晶牙杯"
   ],
   "windows": true,
   "crimeScene": true,
   "weapons": [
    "水晶牙杯",
    "羽绒枕",
    "羊脂白玉浴缸"
   ],
   "floorSurface": "月白玉·雪狐皮毯"
  },
  "1F/3号套房": {
   "floor": "1F",
   "name": "3号套房",
   "mood": "墙里封着背光窗",
   "objects": [
    "墙内封闭背光窗",
    "古沉香四柱床",
    "金丝楠木书桌",
    "雪狐皮毯"
   ],
   "windows": true,
   "crimeScene": true,
   "weapons": [
    "水晶牙杯",
    "羽绒枕",
    "羊脂白玉浴缸"
   ],
   "floorSurface": "月白玉·雪狐皮毯"
  },
  "1F/4号套房": {
   "floor": "1F",
   "name": "4号套房",
   "mood": "门缝只容一线穿过",
   "objects": [
    "黄铜横插销",
    "古沉香四柱床",
    "水晶阅读灯",
    "羊脂白玉浴缸"
   ],
   "windows": true,
   "crimeScene": true,
   "weapons": [
    "水晶牙杯",
    "羽绒枕",
    "羊脂白玉浴缸"
   ],
   "floorSurface": "月白玉·雪狐皮毯"
  },
  "1F/5号套房": {
   "floor": "1F",
   "name": "5号套房",
   "mood": "钥匙穿不过门缝",
   "objects": [
    "白玉号码牌",
    "古沉香四柱床",
    "古沉香衣柜",
    "水晶牙杯"
   ],
   "windows": true,
   "crimeScene": true,
   "weapons": [
    "水晶牙杯",
    "羽绒枕",
    "羊脂白玉浴缸"
   ],
   "floorSurface": "月白玉·雪狐皮毯"
  },
  "1F/列柱序廊": {
   "floor": "1F",
   "name": "列柱序廊",
   "mood": "墨玉带指向议事厅",
   "objects": [
    "十根白玉细柱",
    "蓝灰钻石柱顶",
    "中央墨玉带"
   ],
   "windows": false,
   "crimeScene": false,
   "weapons": [],
   "floorSurface": "中央墨玉带"
  },
  "1F/西南起居厅": {
   "floor": "1F",
   "name": "西南起居厅",
   "mood": "三件青白玉山子",
   "objects": [
    "老紫檀沙发",
    "羊脂白玉茶几",
    "青白玉山子",
    "银狐皮毯",
    "水晶壁灯"
   ],
   "windows": false,
   "crimeScene": true,
   "weapons": [
    "青白玉山子"
   ],
   "floorSurface": "烟青玉·银狐皮毯"
  },
  "1F/晨间厅": {
   "floor": "1F",
   "name": "晨间厅",
   "mood": "晨间厅从无晨光",
   "objects": [
    "黄花梨圆桌",
    "金丝楠贵妃榻",
    "蜜蜡玉几",
    "白貂皮毯"
   ],
   "windows": false,
   "crimeScene": true,
   "weapons": [],
   "floorSurface": "淡金黄玉·白貂皮毯"
  },
  "1F/自然史大厅": {
   "floor": "1F",
   "name": "自然史大厅",
   "mood": "暮王脚下没有日影",
   "objects": [
    "霸王龙暮王",
    "双胸六足兽骨架",
    "菊石化石",
    "陨铁切片",
    "猛犸象牙花器"
   ],
   "windows": true,
   "crimeScene": true,
   "weapons": [
    "陨铁切片",
    "菊石化石"
   ],
   "floorSurface": "墨绿翡翠"
  },
  "1F/迎宾前厅": {
   "floor": "1F",
   "name": "迎宾前厅",
   "mood": "门外紧贴黑钻石",
   "objects": [
    "罗盘花",
    "古沉香落地钟",
    "水晶吊灯",
    "白玉人物圆雕",
    "天然水晶花器"
   ],
   "windows": false,
   "crimeScene": true,
   "weapons": [],
   "floorSurface": "冰青翡翠·罗盘花"
  },
  "1F/音乐沙龙": {
   "floor": "1F",
   "name": "音乐沙龙",
   "mood": "琴盖合拢无人弹奏",
   "objects": [
    "紫檀三角钢琴",
    "玫瑰木踏板竖琴",
    "斯特拉迪瓦里四琴",
    "乌木谱架"
   ],
   "windows": false,
   "crimeScene": true,
   "weapons": [
    "竖琴琴弦",
    "乌木谱架"
   ],
   "floorSurface": "黄花梨人字纹板·银狐皮毯"
  },
  "1F/典礼前厅": {
   "floor": "1F",
   "name": "典礼前厅",
   "mood": "落地钟声在此可数",
   "objects": [
    "乌木真丝长椅",
    "沉香侧案",
    "白玉礼器"
   ],
   "windows": false,
   "crimeScene": true,
   "weapons": [
    "白玉礼器"
   ],
   "floorSurface": "玉石硬地"
  },
  "1F/穹顶议事厅": {
   "floor": "1F",
   "name": "穹顶议事厅",
   "mood": "十五把钥匙静悬龛中",
   "objects": [
    "青白玉圆桌",
    "套房钥匙龛",
    "理币盘",
    "神圣罗马帝国皇冠",
    "良渚玉琮王"
   ],
   "windows": false,
   "crimeScene": true,
   "weapons": [
    "良渚玉琮王",
    "帝国皇冠"
   ],
   "floorSurface": "月白翡翠·墨玉圆盘"
  },
  "1F/厨房套区": {
   "floor": "1F",
   "name": "厨房套区",
   "mood": "锅具齐全却无食材",
   "objects": [
    "白玉操作台",
    "中央操作岛",
    "六区电磁灶",
    "刀具抽屉",
    "黄花梨餐车"
   ],
   "windows": false,
   "crimeScene": true,
   "weapons": [
    "厨刀",
    "剔骨刀",
    "面杖",
    "铜身煎锅",
    "厨房剪"
   ],
   "floorSurface": "灰白玉石地砖"
  },
  "1F/宴饮厅": {
   "floor": "1F",
   "name": "宴饮厅",
   "mood": "十六席长桌无一道菜",
   "objects": [
    "老紫檀长桌",
    "石榴红高背椅",
    "银烛台",
    "深褐貂皮毯",
    "水晶吊灯"
   ],
   "windows": true,
   "crimeScene": true,
   "weapons": [
    "银烛台",
    "青白玉果盘"
   ],
   "floorSurface": "深蜜黄花梨·貂皮毯"
  },
  "1F/衣帽间": {
   "floor": "1F",
   "name": "衣帽间",
   "mood": "三十枚银钩候人",
   "objects": [
    "金丝楠木衣柜",
    "银钩",
    "乌木换鞋凳",
    "白玉框银背镜"
   ],
   "windows": false,
   "crimeScene": true,
   "weapons": [],
   "floorSurface": "未注明"
  },
  "1F/公共盥洗室": {
   "floor": "1F",
   "name": "公共盥洗室",
   "mood": "小插销只能从里面插上",
   "objects": [
    "白玉双盆洗手台",
    "烟晶磨砂隔板",
    "白玉坐便器",
    "水晶皂盒"
   ],
   "windows": false,
   "crimeScene": true,
   "weapons": [],
   "floorSurface": "浅青玉"
  },
  "1F/食品储藏间": {
   "floor": "1F",
   "name": "食品储藏间",
   "mood": "零下十八度的空柜",
   "objects": [
    "800L保鲜柜",
    "卧式冷冻柜",
    "银面电子秤",
    "水晶密封罐"
   ],
   "windows": false,
   "crimeScene": true,
   "weapons": [],
   "floorSurface": "未注明"
  },
  "1F/洗消间": {
   "floor": "1F",
   "name": "洗消间",
   "mood": "柜藏二十四把银刀",
   "objects": [
    "不锈钢洗涤台",
    "洗碗机",
    "金丝楠餐具柜",
    "银托盘"
   ],
   "windows": false,
   "crimeScene": true,
   "weapons": [
    "银餐刀",
    "银叉"
   ],
   "floorSurface": "未注明"
  },
  "2F/西藏书廊": {
   "floor": "2F",
   "name": "西藏书廊",
   "mood": "兰与蔷薇压进铜版",
   "objects": [
    "手工着色植物画册",
    "水晶门展柜",
    "黄花梨护壁"
   ],
   "windows": false,
   "crimeScene": false,
   "weapons": [],
   "floorSurface": "浅青玉"
  },
  "2F/东肖像廊": {
   "floor": "2F",
   "name": "东肖像廊",
   "mood": "八位无名者凝视来人",
   "objects": [
    "八位无名观测者",
    "银錾海神纹双耳杯",
    "烟晶航海高足杯"
   ],
   "windows": false,
   "crimeScene": false,
   "weapons": [
    "银錾双耳杯"
   ],
   "floorSurface": "深褐古木"
  },
  "2F/主楼梯厅": {
   "floor": "2F",
   "name": "主楼梯厅",
   "mood": "钟声自楼下隐约",
   "objects": [
    "羊脂玉踏步",
    "银狐皮梯毯",
    "古沉香歇脚凳",
    "青铜方位牌",
    "干粉灭火器"
   ],
   "windows": false,
   "crimeScene": false,
   "weapons": [
    "干粉灭火器"
   ],
   "floorSurface": "羊脂玉踏步·银狐皮梯毯"
  },
  "2F/西北楼梯厅": {
   "floor": "2F",
   "name": "西北楼梯厅",
   "mood": "折返平台遮断视线",
   "objects": [
    "浅青玉踏步",
    "古柚木扶手",
    "青铜方位牌",
    "银边检修盖",
    "干粉灭火器"
   ],
   "windows": false,
   "crimeScene": false,
   "weapons": [
    "干粉灭火器"
   ],
   "floorSurface": "浅青玉踏步"
  },
  "2F/东北楼梯厅": {
   "floor": "2F",
   "name": "东北楼梯厅",
   "mood": "越过折返只闻足音",
   "objects": [
    "深灰玉踏步",
    "古柚木扶手",
    "青铜方位牌",
    "银边检修盖",
    "干粉灭火器"
   ],
   "windows": false,
   "crimeScene": false,
   "weapons": [
    "干粉灭火器"
   ],
   "floorSurface": "深灰玉踏步"
  },
  "2F/西北前室": {
   "floor": "2F",
   "name": "西北前室",
   "mood": "七号门缝透出散光",
   "objects": [
    "银线花纹玉板",
    "7号套房门"
   ],
   "windows": false,
   "crimeScene": false,
   "weapons": [],
   "floorSurface": "未注明"
  },
  "2F/东北前室": {
   "floor": "2F",
   "name": "东北前室",
   "mood": "玉板下刻着楼层名",
   "objects": [
    "银线花纹玉板",
    "10号套房门"
   ],
   "windows": false,
   "crimeScene": false,
   "weapons": [],
   "floorSurface": "未注明"
  },
  "2F/6号套房": {
   "floor": "2F",
   "name": "6号套房",
   "mood": "床下三十厘米幽暗",
   "objects": [
    "古沉香四柱床",
    "黄花梨床头柜",
    "雪狐皮毯",
    "银背镜"
   ],
   "windows": true,
   "crimeScene": true,
   "weapons": [
    "水晶牙杯",
    "羽绒枕",
    "羊脂白玉浴缸"
   ],
   "floorSurface": "淡紫翡翠·雪狐皮毯"
  },
  "2F/7号套房": {
   "floor": "2F",
   "name": "7号套房",
   "mood": "丝帘合拢遮住床内",
   "objects": [
    "桑蚕丝床帘",
    "古沉香四柱床",
    "黄花梨坐榻",
    "白玉矮几"
   ],
   "windows": true,
   "crimeScene": true,
   "weapons": [
    "水晶牙杯",
    "羽绒枕",
    "羊脂白玉浴缸"
   ],
   "floorSurface": "淡紫翡翠·雪狐皮毯"
  },
  "2F/8号套房": {
   "floor": "2F",
   "name": "8号套房",
   "mood": "窗后只有背光层",
   "objects": [
    "墙内封闭背光窗",
    "古沉香四柱床",
    "水晶阅读灯",
    "羊脂白玉浴缸"
   ],
   "windows": true,
   "crimeScene": true,
   "weapons": [
    "水晶牙杯",
    "羽绒枕",
    "羊脂白玉浴缸"
   ],
   "floorSurface": "淡紫翡翠·雪狐皮毯"
  },
  "2F/9号套房": {
   "floor": "2F",
   "name": "9号套房",
   "mood": "磨砂窗上一团人影",
   "objects": [
    "磨砂水晶窗",
    "桑蚕丝窗帘",
    "古沉香四柱床",
    "水晶牙杯"
   ],
   "windows": true,
   "crimeScene": true,
   "weapons": [
    "水晶牙杯",
    "羽绒枕",
    "羊脂白玉浴缸"
   ],
   "floorSurface": "淡紫翡翠·雪狐皮毯"
  },
  "2F/10号套房": {
   "floor": "2F",
   "name": "10号套房",
   "mood": "八十页绢本空白",
   "objects": [
    "空白绢面本",
    "沉香笔匣",
    "金丝楠木书桌",
    "古沉香四柱床"
   ],
   "windows": true,
   "crimeScene": true,
   "weapons": [
    "水晶牙杯",
    "羽绒枕",
    "羊脂白玉浴缸"
   ],
   "floorSurface": "淡紫翡翠·雪狐皮毯"
  },
  "2F/手稿书廊": {
   "floor": "2F",
   "name": "手稿书廊",
   "mood": "十册异星夜空志",
   "objects": [
    "伊里昂观测院夜空志",
    "烟晶罩",
    "齐墙玉台"
   ],
   "windows": false,
   "crimeScene": false,
   "weapons": [],
   "floorSurface": "未注明"
  },
  "2F/西南阅览厅": {
   "floor": "2F",
   "name": "西南阅览厅",
   "mood": "药柜里有十二片安眠药",
   "objects": [
    "公共药柜",
    "石英挂钟",
    "黄花梨书柜",
    "水晶阅读灯",
    "急救箱"
   ],
   "windows": false,
   "crimeScene": true,
   "weapons": [
    "水晶阅读灯"
   ],
   "floorSurface": "黄花梨·雪狐皮毯"
  },
  "2F/东南起居厅": {
   "floor": "2F",
   "name": "东南起居厅",
   "mood": "柜顶陈着三件玉盘",
   "objects": [
    "紫檀真丝沙发",
    "墨玉茶几",
    "玉石圆盘",
    "银灰貂皮毯"
   ],
   "windows": false,
   "crimeScene": true,
   "weapons": [
    "玉石圆盘"
   ],
   "floorSurface": "青白玉·银灰貂皮毯"
  },
  "2F/大图书室": {
   "floor": "2F",
   "name": "大图书室",
   "mood": "六千册书页未翻尽",
   "objects": [
    "金丝楠木书柜",
    "古腾堡圣经",
    "莱斯特手稿",
    "黄花梨梯架",
    "水晶放大镜"
   ],
   "windows": true,
   "crimeScene": true,
   "weapons": [
    "银座水晶放大镜",
    "黄花梨梯架"
   ],
   "floorSurface": "浅烟青玉·雪狐皮毯"
  },
  "2F/中央藏画厅": {
   "floor": "2F",
   "name": "中央藏画厅",
   "mood": "南墙上的解剖课",
   "objects": [
    "杜尔普博士的解剖课",
    "星月夜",
    "昼夜十二庭",
    "白玉半身像"
   ],
   "windows": false,
   "crimeScene": true,
   "weapons": [],
   "floorSurface": "淡紫翡翠"
  },
  "2F/地图与地球仪室": {
   "floor": "2F",
   "name": "地图与地球仪室",
   "mood": "七十二幅古图平躺",
   "objects": [
    "白玉陆地地球仪",
    "深蓝玉星球仪",
    "黄铜六分仪",
    "银制分规",
    "铂饰望远镜"
   ],
   "windows": false,
   "crimeScene": true,
   "weapons": [
    "银制分规",
    "黄铜六分仪",
    "铂饰望远镜"
   ],
   "floorSurface": "烟灰玉"
  },
  "2F/藏书前厅": {
   "floor": "2F",
   "name": "藏书前厅",
   "mood": "八册画报静躺案头",
   "objects": [
    "黄花梨阅读长椅",
    "书刊案",
    "八册画报"
   ],
   "windows": false,
   "crimeScene": true,
   "weapons": [],
   "floorSurface": "玉石硬地"
  },
  "2F/书画工作室": {
   "floor": "2F",
   "name": "书画工作室",
   "mood": "六锭松烟墨未研",
   "objects": [
    "紫檀画材柜",
    "端砚",
    "白玉镇纸",
    "玉柄裁纸刀",
    "老柚木画架"
   ],
   "windows": false,
   "crimeScene": true,
   "weapons": [
    "端砚",
    "白玉镇纸",
    "玉柄裁纸刀"
   ],
   "floorSurface": "暖白玉"
  },
  "2F/棋艺室": {
   "floor": "2F",
   "name": "棋艺室",
   "mood": "三只棋钟归零未走",
   "objects": [
    "鸢尾王庭国际象棋",
    "十九道山海围棋",
    "九州弈图象棋",
    "机械棋钟"
   ],
   "windows": false,
   "crimeScene": true,
   "weapons": [
    "榧木围棋盘",
    "紫檀象棋盘"
   ],
   "floorSurface": "金丝楠木·银狐皮毯"
  },
  "2F/挂毯长厅": {
   "floor": "2F",
   "name": "挂毯长厅",
   "mood": "蓝月沉落织在南墙",
   "objects": [
    "三夜花园挂毯",
    "双月星宫挂毯",
    "雪狐皮长毯",
    "水晶圆雕花器"
   ],
   "windows": false,
   "crimeScene": true,
   "weapons": [],
   "floorSurface": "青灰玉·雪狐皮长毯"
  },
  "2F/游戏酒廊": {
   "floor": "2F",
   "name": "游戏酒廊",
   "mood": "六支球杆按号悬挂",
   "objects": [
    "美式台球桌",
    "象牙台球",
    "玄白四时麻将",
    "深红玛瑙吧台",
    "蔷薇六席扑克"
   ],
   "windows": false,
   "crimeScene": true,
   "weapons": [
    "台球杆",
    "象牙母球",
    "酒瓶",
    "紫檀架杆"
   ],
   "floorSurface": "墨玉·银狐皮毯"
  },
  "2F/私人放映厅": {
   "floor": "2F",
   "name": "私人放映厅",
   "mood": "十五席面朝空银幕",
   "objects": [
    "银幕",
    "黄花梨真丝座椅",
    "投影机",
    "紫檀器材柜"
   ],
   "windows": false,
   "crimeScene": true,
   "weapons": [],
   "floorSurface": "深灰貂皮毯"
  },
  "3F/西园廊": {
   "floor": "3F",
   "name": "西园廊",
   "mood": "细线描出兰的根须",
   "objects": [
    "幽兰八相水彩",
    "青玉如意",
    "白玉透雕花薰"
   ],
   "windows": false,
   "crimeScene": false,
   "weapons": [
    "青玉如意"
   ],
   "floorSurface": "月白玉"
  },
  "3F/东陶瓷廊": {
   "floor": "3F",
   "name": "东陶瓷廊",
   "mood": "豇豆红瓶静立柜中",
   "objects": [
    "豇豆红柳叶瓶",
    "天青釉弦纹瓶",
    "霁蓝描金小瓶"
   ],
   "windows": false,
   "crimeScene": false,
   "weapons": [],
   "floorSurface": "浅青翡翠"
  },
  "3F/主楼梯厅": {
   "floor": "3F",
   "name": "主楼梯厅",
   "mood": "银狐梯毯最后一段",
   "objects": [
    "羊脂玉踏步",
    "银狐皮梯毯",
    "古沉香歇脚凳",
    "青铜方位牌",
    "干粉灭火器"
   ],
   "windows": false,
   "crimeScene": false,
   "weapons": [
    "干粉灭火器"
   ],
   "floorSurface": "羊脂玉踏步·银狐皮梯毯"
  },
  "3F/西北楼梯厅": {
   "floor": "3F",
   "name": "西北楼梯厅",
   "mood": "最高一跑止于此",
   "objects": [
    "浅青玉踏步",
    "古柚木扶手",
    "青铜方位牌",
    "银边检修盖",
    "干粉灭火器"
   ],
   "windows": false,
   "crimeScene": false,
   "weapons": [
    "干粉灭火器"
   ],
   "floorSurface": "浅青玉踏步"
  },
  "3F/东北楼梯厅": {
   "floor": "3F",
   "name": "东北楼梯厅",
   "mood": "深灰阶梯的尽头",
   "objects": [
    "深灰玉踏步",
    "古柚木扶手",
    "青铜方位牌",
    "银边检修盖",
    "干粉灭火器"
   ],
   "windows": false,
   "crimeScene": false,
   "weapons": [
    "干粉灭火器"
   ],
   "floorSurface": "深灰玉踏步"
  },
  "3F/西北前室": {
   "floor": "3F",
   "name": "西北前室",
   "mood": "门牌凹字嵌铂金",
   "objects": [
    "银线花纹玉板",
    "12号套房门"
   ],
   "windows": false,
   "crimeScene": false,
   "weapons": [],
   "floorSurface": "未注明"
  },
  "3F/东北前室": {
   "floor": "3F",
   "name": "东北前室",
   "mood": "钟声从未到过此处",
   "objects": [
    "银线花纹玉板",
    "15号套房门"
   ],
   "windows": false,
   "crimeScene": false,
   "weapons": [],
   "floorSurface": "未注明"
  },
  "3F/11号套房": {
   "floor": "3F",
   "name": "11号套房",
   "mood": "从里面开了再关上，照旧锁着",
   "objects": [
    "编号锁",
    "黄铜横插销",
    "古沉香四柱床",
    "雪狐皮毯"
   ],
   "windows": true,
   "crimeScene": true,
   "weapons": [
    "水晶牙杯",
    "羽绒枕",
    "羊脂白玉浴缸"
   ],
   "floorSurface": "青白玉·雪狐皮毯"
  },
  "3F/12号套房": {
   "floor": "3F",
   "name": "12号套房",
   "mood": "七百克的水晶牙杯",
   "objects": [
    "水晶牙杯",
    "羊脂白玉浴缸",
    "古沉香四柱床",
    "银背镜"
   ],
   "windows": true,
   "crimeScene": true,
   "weapons": [
    "水晶牙杯",
    "羽绒枕",
    "羊脂白玉浴缸"
   ],
   "floorSurface": "青白玉·雪狐皮毯"
  },
  "3F/13号套房": {
   "floor": "3F",
   "name": "13号套房",
   "mood": "背光窗嵌在墙心",
   "objects": [
    "墙内封闭背光窗",
    "古沉香四柱床",
    "黄花梨坐榻",
    "水晶阅读灯"
   ],
   "windows": true,
   "crimeScene": true,
   "weapons": [
    "水晶牙杯",
    "羽绒枕",
    "羊脂白玉浴缸"
   ],
   "floorSurface": "青白玉·雪狐皮毯"
  },
  "3F/14号套房": {
   "floor": "3F",
   "name": "14号套房",
   "mood": "夜灯低亮难辨面孔",
   "objects": [
    "雪狐皮毯",
    "白玉矮几",
    "古沉香四柱床",
    "古沉香衣柜"
   ],
   "windows": true,
   "crimeScene": true,
   "weapons": [
    "水晶牙杯",
    "羽绒枕",
    "羊脂白玉浴缸"
   ],
   "floorSurface": "青白玉·雪狐皮毯"
  },
  "3F/15号套房": {
   "floor": "3F",
   "name": "15号套房",
   "mood": "梯井尽头一扇门",
   "objects": [
    "银钮门铃",
    "古沉香四柱床",
    "桑蚕丝床帘",
    "水晶牙杯"
   ],
   "windows": true,
   "crimeScene": true,
   "weapons": [
    "水晶牙杯",
    "羽绒枕",
    "羊脂白玉浴缸"
   ],
   "floorSurface": "青白玉·雪狐皮毯"
  },
  "3F/香木廊": {
   "floor": "3F",
   "name": "香木廊",
   "mood": "沉香浮雕夹着十龛",
   "objects": [
    "古沉香浅浮雕",
    "天然水晶花器",
    "窄龛"
   ],
   "windows": false,
   "crimeScene": false,
   "weapons": [
    "天然水晶花器"
   ],
   "floorSurface": "未注明"
  },
  "3F/兰香小厅": {
   "floor": "3F",
   "name": "兰香小厅",
   "mood": "屏风之上挂钟独走",
   "objects": [
    "三折白玉屏风",
    "石英挂钟",
    "天然水晶瓶",
    "白貂皮毯"
   ],
   "windows": false,
   "crimeScene": true,
   "weapons": [
    "天然水晶瓶"
   ],
   "floorSurface": "青白玉·白貂皮毯"
  },
  "3F/瓷器茶室": {
   "floor": "3F",
   "name": "瓷器茶室",
   "mood": "壶底篆书题夜汀",
   "objects": [
    "粉彩玉兰瓷壶",
    "汝窑天青釉盘",
    "甜白釉高足杯",
    "银壶电热座"
   ],
   "windows": false,
   "crimeScene": true,
   "weapons": [
    "银壶"
   ],
   "floorSurface": "金丝楠木·雪狐皮毯"
  },
  "3F/珍稀花园": {
   "floor": "3F",
   "name": "珍稀花园",
   "mood": "幽灵兰攀着古木",
   "objects": [
    "幽灵兰",
    "白玉泉盘喷泉",
    "翡翠葛拱架",
    "水晶天窗",
    "金花茶"
   ],
   "windows": true,
   "crimeScene": true,
   "weapons": [],
   "floorSurface": "淡青翡翠·花床泥土"
  },
  "3F/晨间餐室": {
   "floor": "3F",
   "name": "晨间餐室",
   "mood": "咖啡机里空无一豆",
   "objects": [
    "三色玉面圆桌",
    "沉香餐边台",
    "银制有盖器皿",
    "银壳咖啡机"
   ],
   "windows": false,
   "crimeScene": true,
   "weapons": [
    "银制有盖器皿"
   ],
   "floorSurface": "浅蜜黄玉"
  },
  "3F/手工与修复室": {
   "floor": "3F",
   "name": "手工与修复室",
   "mood": "六把银柄刻刀收在柜里",
   "objects": [
    "紫檀工具柜",
    "老柚木工作台",
    "脚踏缝纫机",
    "紫檀裁料桌"
   ],
   "windows": false,
   "crimeScene": true,
   "weapons": [
    "银柄刻刀",
    "玉柄剪刀",
    "小钳"
   ],
   "floorSurface": "浅灰玉"
  },
  "3F/花艺前厅": {
   "floor": "3F",
   "name": "花艺前厅",
   "mood": "理花台上两把花剪",
   "objects": [
    "白玉理花台",
    "水晶花瓶",
    "银柄花剪",
    "金丝楠坐榻"
   ],
   "windows": false,
   "crimeScene": true,
   "weapons": [
    "银柄花剪"
   ],
   "floorSurface": "玉石硬地"
  },
  "3F/观花茶厅": {
   "floor": "3F",
   "name": "观花茶厅",
   "mood": "茶案下白狐皮静卧",
   "objects": [
    "整块沉香茶案",
    "水晶茶罐",
    "薄胎瓷茶壶",
    "白玉水台"
   ],
   "windows": false,
   "crimeScene": true,
   "weapons": [
    "银壶"
   ],
   "floorSurface": "浅青翡翠·白狐皮毯"
  },
  "3F/天象室": {
   "floor": "3F",
   "name": "天象室",
   "mood": "八条银臂托起行星",
   "objects": [
    "手摇太阳系仪",
    "水晶天球仪",
    "银制星盘",
    "黄铜天文量角仪"
   ],
   "windows": false,
   "crimeScene": true,
   "weapons": [
    "黄铜天文量角仪",
    "银制星盘"
   ],
   "floorSurface": "乌木地板·黑翡翠圆盘"
  },
  "3F/北端景廊": {
   "floor": "3F",
   "name": "北端景廊",
   "mood": "长案沿边浅刻兰叶山茶",
   "objects": [
    "古沉香长案",
    "黄花梨坐榻",
    "浅青翡翠矮几"
   ],
   "windows": false,
   "crimeScene": false,
   "weapons": [],
   "floorSurface": "浅烟灰玉"
  },
  "3F/舞蹈排练室": {
   "floor": "3F",
   "name": "舞蹈排练室",
   "mood": "镜前地板受力回弹",
   "objects": [
    "银背镜",
    "黄花梨把杆",
    "紫檀音乐柜",
    "丝绸舞姿织画"
   ],
   "windows": false,
   "crimeScene": true,
   "weapons": [],
   "floorSurface": "弹性缅甸柚木"
  },
  "3F/猎藏厅": {
   "floor": "3F",
   "name": "猎藏厅",
   "mood": "墨玉台上棕熊直立",
   "objects": [
    "棕熊站立标本",
    "白虎头肩标本",
    "巨角鹿头肩标本",
    "雪豹伏卧标本"
   ],
   "windows": false,
   "crimeScene": true,
   "weapons": [],
   "floorSurface": "黄花梨·熊皮毯"
  },
  "3F/标本陈列室": {
   "floor": "3F",
   "name": "标本陈列室",
   "mood": "三十六蝶固定于丝",
   "objects": [
    "独角鲸牙",
    "海兽颅骨",
    "天堂凤蝶",
    "极乐鸟",
    "鹦鹉螺壳"
   ],
   "windows": true,
   "crimeScene": true,
   "weapons": [
    "独角鲸牙",
    "海兽颅骨",
    "矿物晶簇"
   ],
   "floorSurface": "浅灰玉"
  },
  "3F/园艺间": {
   "floor": "3F",
   "name": "园艺间",
   "mood": "天窗下唯一的实顶",
   "objects": [
    "白玉水槽台",
    "金丝楠工具架",
    "供水轮阀",
    "柚木手推车"
   ],
   "windows": false,
   "crimeScene": true,
   "weapons": [
    "铁锹",
    "园艺剪",
    "绑枝软线",
    "手铲"
   ],
   "floorSurface": "未注明"
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
  "正门外紧贴黑钻石墙",
  "没有通向室外的路",
  "五只钟各走各的",
  "落地钟几点敲几声",
  "错过的整点不补报",
  "七天须提一次重锤",
  "三楼听不见钟声",
  "十五把钥匙按号悬挂",
  "没有备用钥匙",
  "一百五十枚金币",
  "金币两面都是一百",
  "十五摞，每摞十枚",
  "门缝只有五毫米",
  "锁孔里穿不过一根线",
  "喷泉在白玉盘里循环",
  "五点半滴灌三分钟",
  "八床花木同时开着",
  "冷池十六度，热池三十九",
  "冷冻柜零下十八度，空着",
  "馆内没有一粒食物",
  "廊门松手两三秒合拢",
  "五点无声补足药盒"
 ],
 "clocks": "仅五只时刻钟：1F迎宾前厅古沉香重锤落地钟是唯一整点报时者，几点敲几声、每声约五秒，不报半点，错过不补，约七天提一次重锤，3F与两座后梯听不见；议事厅、宴饮厅、2F西南阅览厅、3F兰香小厅各一只AA电池石英挂钟，只走不报。初始与基准钟一致，此后各走各的。",
 "entrance": "1F迎宾前厅南墙正门，中心x=26、净宽2.4 m；门扇外侧紧贴连续黑钻石封墙，馆内无通向室外、屋面或其他建筑的通道。",
 "clueTemplates": [
  {
   "id": "handprint",
   "name": "手印",
   "attribute": "heightCm",
   "text": "侧光下，银背镜高处有一枚裸手印，离地约{v}厘米",
   "predicate": "c.heightCm >= 178",
   "variants": [
    {
     "text": "水晶罩柜面低处有一枚裸手印",
     "predicate": "c.heightCm < 165"
    },
    {
     "text": "打蜡门框齐肩高处留着裸手印",
     "predicate": "c.heightCm >= 165 && c.heightCm < 178"
    }
   ],
   "source": "洋馆物理层 7.2（裸手摸过留手印，可见大致大小与接触位置；馆内无指纹比对）"
  },
  {
   "id": "woodprint",
   "name": "鞋印",
   "attribute": "heightCm",
   "text": "古木地板侧光下有湿鞋印淡渍，鞋码偏大",
   "predicate": "c.heightCm >= 178",
   "variants": [
    {
     "text": "花床湿土里一枚鞋印，鞋码偏小",
     "predicate": "c.heightCm < 165"
    },
    {
     "text": "翡翠园路上由浓到淡的泥印，鞋码中等",
     "predicate": "c.heightCm >= 165 && c.heightCm < 178"
    }
   ],
   "source": "洋馆物理层 7.1（湿鞋印干后侧光下留几小时淡渍；花床湿土留鞋印，沾泥鞋走上园路留泥印）"
  },
  {
   "id": "spareclothes",
   "name": "换洗衣物",
   "attribute": "heightCm",
   "text": "洗衣布草室里一套换洗衣物，尺码偏大",
   "predicate": "c.heightCm >= 178",
   "variants": [
    {
     "text": "洗衣布草室里一套换洗衣物，尺码偏小",
     "predicate": "c.heightCm < 165"
    }
   ],
   "source": "洋馆物理层 10.1（新增衣物与住客入场时的款式、尺码相同）"
  },
  {
   "id": "bloodshirt",
   "name": "冷水血衣",
   "attribute": "gender",
   "text": "冷水洗过仍留淡痕的{v}衣物，塞在套房衣柜下部",
   "predicate": "c.gender === \"男\"",
   "variants": [
    {
     "text": "冷水洗过仍留淡痕的女式衣裙，塞在衣柜下部",
     "predicate": "c.gender === \"女\""
    }
   ],
   "source": "洋馆物理层 7.3（冷水洗血去掉大半，仍留淡痕）、10.1（换洗衣物与本人款式相同）"
  },
  {
   "id": "lipstick",
   "name": "杯沿唇印",
   "attribute": "gender",
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
   "source": "洋馆物理层 10.2（女性住客房间投放口红、卸妆油与卫生巾）、7.2（酒杯可留手印）"
  },
  {
   "id": "defense",
   "name": "防御伤",
   "attribute": "physique",
   "text": "死者手臂有防御伤，颈部瘀痕很深",
   "predicate": "c.stats.physique === \"受训\"",
   "variants": [
    {
     "text": "古木地板上一片新刮痕，像有过一阵扭打",
     "predicate": "c.stats.physique === \"受训\""
    },
    {
     "text": "死者毫无防御伤，杯底残留碾碎的白色药粉",
     "predicate": "c.stats.physique === \"普通\""
    }
   ],
   "source": "身体结算 7（前二十秒能挣扎，体格差距决定有没有用）、9（受训者扭打持续×2）；洋馆物理层 7.4 防御伤、7.1 刮痕、6.3 安眠药"
  },
  {
   "id": "freezer",
   "name": "冷冻柜结冻",
   "attribute": "knowsModernDevices",
   "text": "尸体冻硬了，和尸僵的硬不一样：进过−18 ℃的冷冻柜",
   "predicate": "c.knowsModernDevices === true",
   "variants": [
    {
     "text": "保龄球道被保养机重新抹过油，印迹被覆盖",
     "predicate": "c.knowsModernDevices === true"
    },
    {
     "text": "血衣是在浴缸里手搓的，洗衣布草室的洗衣机没动过",
     "predicate": "c.knowsModernDevices === false"
    }
   ],
   "source": "洋馆物理层 7.4（冷冻柜结冻干扰读尸）、7.1（保养机重新分布球道油）；卡司总则 4（馆里多半没见过的器物）"
  },
  {
   "id": "coldpool",
   "name": "冷池浸泡",
   "attribute": "medical",
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
   "source": "洋馆物理层 7.4 环境干扰、7.5（医护者才能综合读出死亡时间段）"
  },
  {
   "id": "vessel",
   "name": "大血管一刀",
   "attribute": "medical",
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
   "text": "椅子挪走又搬回，皮毯压痕严丝合缝",
   "predicate": "c.stats.observation === \"擅长\"",
   "variants": [
    {
     "text": "椅子搬回时错了位，蜡面色差露出一条边",
     "predicate": "c.stats.observation === \"一般\""
    }
   ],
   "source": "洋馆物理层 7.2（挪走再搬回，对不齐处细查可见）、7.5 现场观察"
  },
  {
   "id": "scrub",
   "name": "擦洗边界",
   "attribute": "observation",
   "text": "玉地血迹擦得极净，连凿纹与拼缝都清过",
   "predicate": "c.stats.observation === \"擅长\"",
   "variants": [
    {
     "text": "表面擦净，拼缝与防滑凿纹里残血未动",
     "predicate": "c.stats.observation === \"一般\""
    }
   ],
   "source": "洋馆物理层 7.1（凿纹、拼缝内可留残血；擦洗留湿区）、8.3 擦血耗时"
  },
  {
   "id": "gloves",
   "name": "手套污印",
   "attribute": "items",
   "text": "只有带污的手套印；馆里的手套一样没少",
   "predicate": "c.carried.some(i => i.includes(\"手套\"))",
   "variants": [
    {
     "text": "工具修理室的牛皮手套少了一双",
     "predicate": "!c.carried.some(i => i.includes(\"手套\"))"
    }
   ],
   "source": "洋馆物理层 7.2（手套不留裸指纹，带污留污印；三十副一次性、六双园艺、六双牛皮手套按库存消耗）"
  },
  {
   "id": "pipe",
   "name": "烟味与烟灰",
   "attribute": "items",
   "text": "关门的房里烟味未散，桌上一撮烟斗烟丝灰",
   "predicate": "c.carried.some(i => /烟斗|烟管/.test(i))",
   "variants": [
    {
     "text": "垃圾桶里有卷烟的烟蒂与烟灰",
     "predicate": "!c.carried.some(i => /烟斗|烟管/.test(i))"
    }
   ],
   "source": "洋馆物理层 7.2（烟味在关门房间留一两个小时）、8.3（一支烟燃尽约5—7分钟）；价目表 1（香烟）、10.1（烟斗烟丝，不在铜牌上）；卡司总则 2（烟谁都不带）"
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
   "needs": "c.stats.physique === \"受训\""
  },
  {
   "id": "smother",
   "name": "闷压口鼻",
   "sign": "口鼻周围局部压痕",
   "needs": ""
  },
  {
   "id": "poison",
   "name": "女巫的毒药",
   "sign": "口唇和指甲发紫，嘴边少量白沫，没有气味；饮下后前二十五分钟毫无感觉，三十分钟整死去",
   "needs": ""
  },
  {
   "id": "drown",
   "name": "溺水",
   "sign": "口鼻细泡沫，衣物湿透",
   "needs": ""
  },
  {
   "id": "fall",
   "name": "坠落",
   "sign": "骨折，头先着地则颅脑重伤",
   "needs": ""
  },
  {
   "id": "door",
   "name": "门扇夹压",
   "sign": "身上有被门扇推挤、夹压的伤，身旁那扇门锁死一小时",
   "needs": ""
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
   "line": "人手一把钥匙，身份就此绑定。",
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
   "broadcast": "发现尸体。调查时间一百二十分钟，于〈开庭时刻〉在穹顶议事厅开庭。"
  },
  {
   "key": "investigate",
   "title": "调查",
   "line": "一百二十分钟，谁找到算谁的。",
   "broadcast": "又发现一具尸体。并入本批，庭期不变。"
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
   "key": "payout",
   "title": "发放",
   "line": "金币无声出现在圆桌上。",
   "broadcast": ""
  },
  {
   "key": "aftermath",
   "title": "余波",
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
 "coins": "金币共150枚，开局在议事厅东侧收纳台的白玉理币盘里，十五摞、每摞十枚沿盘的长轴排成一列；主持人第一条播报让拿到钥匙的人各取一摞（10枚，1000分）。1枚=100分，一次兑换的总价须正好整百，不找零，只能用身上带着的金币付；没有账本，也没有余额播报。金币可自由交易、赠与，抢夺不受惩罚；人死后金币留在尸体处。每批审判结束时，存活在馆者各得5枚；凶手全部查明，每人再得5枚（共10枚），出现在各人伸手可及的平面上。未能查明时，凶手另得10枚，出现在凶手套房书桌上，不广播。死者与离馆者不发。",
 "startState": "第一日17:00，全员闭眼昏睡，坐在穹顶议事厅圆桌旁的乌木扶手椅上，编号几号坐几号席；17:05之前陆续自然醒来，先后不定。桌沿十五枚银号牌牌面空白，钥匙分配完成、人人手里正好一把钥匙的那一刻，十五枚同时无声地现出号码。十五把钥匙按号悬于东侧收纳台的钥匙龛，无人持有；150枚金币在白玉理币盘里排成一列十五摞。每间套房书桌中央平放一张63×88 mm身份卡，正面朝上，字尚未确定。落地钟17:00敲响五声。"
};
