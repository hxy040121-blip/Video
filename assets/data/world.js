/* 由 tools/build-data.mjs 从配置文件（v7.11）生成，请勿手改 */
window.WORLD = {
 "version": "v7.11",
 "generatedFrom": [
  "洋馆物理层.md §1.1 §1.2 §1.3 §1.4 §2.1 §2.2 §2.5 §3.1–3.5",
  "各室/1F_穹顶议事厅.md",
  "主持人游戏.md §5 §7 §8",
  "价目表.md 兑换方式–§6（铜牌）、§7.4 §8.2 §9（不成立）、§8.1（金币）、§10（牌外价目）",
  "开局流程.md §2 §3 §4"
 ],
 "outline": {
  "x0": 0,
  "x1": 69.6,
  "y0": 0,
  "y1": 40.8,
  "extWall": 0.6,
  "intWall": 0.24,
  "glassWall": 0.1,
  "suiteLining": 0.12,
  "suiteNet": 8.16,
  "roof": 15
 },
 "floors": [
  {
   "id": "B1",
   "level": -4.8,
   "height": 4.8,
   "clear": 4.4,
   "suites": []
  },
  {
   "id": "1F",
   "level": 0,
   "height": 5,
   "clear": 4.6,
   "suites": [
    1,
    2,
    3,
    4
   ]
  },
  {
   "id": "2F",
   "level": 5,
   "height": 5,
   "clear": 4.6,
   "suites": [
    5,
    6,
    7,
    8
   ]
  },
  {
   "id": "3F",
   "level": 10,
   "height": 5,
   "clear": 4.6,
   "suites": [
    9,
    10,
    11,
    12,
    13
   ]
  }
 ],
 "rooms": [
  {
   "floor": "B1",
   "name": "西电梯",
   "kind": "elevator",
   "shape": "rect",
   "x0": 9,
   "x1": 11.4,
   "y0": 0,
   "y1": 2.8,
   "area": 6.72,
   "doors": [
    {
     "raw": "电梯门",
     "open": false,
     "axis": "x",
     "at": 10.2,
     "width": 1.1,
     "dir": "北",
     "to": "西电梯厅",
     "main": false,
     "glass": false
    }
   ],
   "parent": null,
   "win": 0
  },
  {
   "floor": "B1",
   "name": "东电梯",
   "kind": "elevator",
   "shape": "rect",
   "x0": 58.2,
   "x1": 60.6,
   "y0": 0,
   "y1": 2.8,
   "area": 6.72,
   "doors": [
    {
     "raw": "电梯门",
     "open": false,
     "axis": "x",
     "at": 59.4,
     "width": 1.1,
     "dir": "北",
     "to": "东电梯厅",
     "main": false,
     "glass": false
    }
   ],
   "parent": null,
   "win": 0
  },
  {
   "floor": "B1",
   "name": "西电梯厅",
   "kind": "corridor",
   "shape": "rect",
   "x0": 8.4,
   "x1": 12,
   "y0": 2.8,
   "y1": 8.4,
   "area": 20.16,
   "doors": [
    {
     "raw": "西电梯门",
     "ref": true,
     "open": false,
     "axis": "x",
     "at": 10.2,
     "width": 1.1,
     "dir": "南",
     "to": "西电梯",
     "owner": "西电梯",
     "main": false,
     "glass": false,
     "refDir": null
    },
    {
     "raw": "箱笼储藏室门",
     "ref": true,
     "open": false,
     "axis": "y",
     "at": 5.6,
     "width": 1.4,
     "dir": "西",
     "to": "箱笼储藏室",
     "owner": "箱笼储藏室",
     "main": false,
     "glass": false,
     "refDir": null
    }
   ],
   "parent": null,
   "adj": [
    {
     "to": "南廊西段",
     "side": "北",
     "a": 8.4,
     "b": 12
    }
   ],
   "glass": [],
   "win": 0
  },
  {
   "floor": "B1",
   "name": "东电梯厅",
   "kind": "corridor",
   "shape": "rect",
   "x0": 57.6,
   "x1": 61.2,
   "y0": 2.8,
   "y1": 8.4,
   "area": 20.16,
   "doors": [
    {
     "raw": "东电梯门",
     "ref": true,
     "open": false,
     "axis": "x",
     "at": 59.4,
     "width": 1.1,
     "dir": "南",
     "to": "东电梯",
     "owner": "东电梯",
     "main": false,
     "glass": false,
     "refDir": null
    },
    {
     "raw": "地毯储藏室门",
     "ref": true,
     "open": false,
     "axis": "y",
     "at": 5.6,
     "width": 1.4,
     "dir": "东",
     "to": "地毯储藏室",
     "owner": "地毯储藏室",
     "main": false,
     "glass": false,
     "refDir": null
    }
   ],
   "parent": null,
   "adj": [
    {
     "to": "南廊东段",
     "side": "北",
     "a": 57.6,
     "b": 61.2
    }
   ],
   "glass": [],
   "win": 0
  },
  {
   "floor": "B1",
   "name": "西地廊",
   "kind": "corridor",
   "shape": "rect",
   "x0": 8.4,
   "x1": 12,
   "y0": 12,
   "y1": 28.8,
   "area": 60.48,
   "doors": [
    {
     "raw": "健身房门",
     "ref": true,
     "open": false,
     "axis": "y",
     "at": 20.4,
     "width": 1.6,
     "dir": "东",
     "to": "健身房",
     "owner": "健身房",
     "main": false,
     "glass": false,
     "refDir": null
    },
    {
     "raw": "工具间门",
     "ref": true,
     "open": false,
     "axis": "y",
     "at": 16.2,
     "width": 1,
     "dir": "西",
     "to": "工具间",
     "owner": "工具间",
     "main": false,
     "glass": false,
     "refDir": null
    }
   ],
   "parent": null,
   "adj": [
    {
     "to": "南廊西段",
     "side": "南",
     "a": 8.4,
     "b": 12
    },
    {
     "to": "北廊西段",
     "side": "北",
     "a": 8.4,
     "b": 12
    }
   ],
   "glass": [],
   "win": 0
  },
  {
   "floor": "B1",
   "name": "东地廊",
   "kind": "corridor",
   "shape": "rect",
   "x0": 57.6,
   "x1": 61.2,
   "y0": 12,
   "y1": 28.8,
   "area": 60.48,
   "doors": [
    {
     "raw": "洗衣房门",
     "ref": true,
     "open": false,
     "axis": "y",
     "at": 16.2,
     "width": 1.2,
     "dir": "西",
     "to": "洗衣房",
     "owner": "洗衣房",
     "main": false,
     "glass": false,
     "refDir": null
    },
    {
     "raw": "物资库门",
     "ref": true,
     "open": false,
     "axis": "y",
     "at": 24.6,
     "width": 1.2,
     "dir": "西",
     "to": "物资库",
     "owner": "物资库",
     "main": false,
     "glass": false,
     "refDir": null
    },
    {
     "raw": "品酒室门",
     "ref": true,
     "open": false,
     "axis": "y",
     "at": 16.2,
     "width": 1.2,
     "dir": "东",
     "to": "品酒室",
     "owner": "品酒室",
     "main": false,
     "glass": false,
     "refDir": null
    },
    {
     "raw": "酒窖门",
     "ref": true,
     "open": false,
     "axis": "y",
     "at": 24.6,
     "width": 1,
     "dir": "东",
     "to": "酒窖",
     "owner": "酒窖",
     "main": false,
     "glass": false,
     "refDir": null
    }
   ],
   "parent": null,
   "adj": [
    {
     "to": "南廊东段",
     "side": "南",
     "a": 57.6,
     "b": 61.2
    },
    {
     "to": "北廊东段",
     "side": "北",
     "a": 57.6,
     "b": 61.2
    }
   ],
   "glass": [],
   "win": 0
  },
  {
   "floor": "B1",
   "name": "南廊西段",
   "kind": "corridor",
   "shape": "rect",
   "x0": 8.4,
   "x1": 26.4,
   "y0": 8.4,
   "y1": 12,
   "area": 64.8,
   "doors": [
    {
     "raw": "更衣室门",
     "ref": true,
     "open": false,
     "axis": "x",
     "at": 19.2,
     "width": 1.2,
     "dir": "南",
     "to": "更衣室",
     "owner": "更衣室",
     "main": false,
     "glass": false,
     "refDir": null
    },
    {
     "raw": "泳池厅门",
     "ref": true,
     "open": false,
     "axis": "y",
     "at": 10.2,
     "width": 1.8,
     "dir": "东",
     "to": "泳池厅",
     "owner": "泳池厅",
     "main": false,
     "glass": false,
     "refDir": null
    },
    {
     "raw": "健身房门",
     "ref": true,
     "open": false,
     "axis": "x",
     "at": 19.2,
     "width": 1.2,
     "dir": "北",
     "to": "健身房",
     "owner": "健身房",
     "main": false,
     "glass": false,
     "refDir": null
    }
   ],
   "parent": null,
   "adj": [
    {
     "to": "西电梯厅",
     "side": "南",
     "a": 8.4,
     "b": 12
    },
    {
     "to": "西地廊",
     "side": "北",
     "a": 8.4,
     "b": 12
    }
   ],
   "glass": [],
   "win": 0
  },
  {
   "floor": "B1",
   "name": "南廊东段",
   "kind": "corridor",
   "shape": "rect",
   "x0": 43.2,
   "x1": 61.2,
   "y0": 8.4,
   "y1": 12,
   "area": 64.8,
   "doors": [
    {
     "raw": "泳池厅门",
     "ref": true,
     "open": false,
     "axis": "y",
     "at": 10.2,
     "width": 1.8,
     "dir": "西",
     "to": "泳池厅",
     "owner": "泳池厅",
     "main": false,
     "glass": false,
     "refDir": null
    },
    {
     "raw": "泳池机房门",
     "ref": true,
     "open": false,
     "axis": "x",
     "at": 50.4,
     "width": 1.2,
     "dir": "南",
     "to": "泳池机房",
     "owner": "泳池机房",
     "main": false,
     "glass": false,
     "refDir": null
    }
   ],
   "parent": null,
   "adj": [
    {
     "to": "东电梯厅",
     "side": "南",
     "a": 57.6,
     "b": 61.2
    },
    {
     "to": "东地廊",
     "side": "北",
     "a": 57.6,
     "b": 61.2
    }
   ],
   "glass": [],
   "win": 0
  },
  {
   "floor": "B1",
   "name": "北廊西段",
   "kind": "corridor",
   "shape": "rect",
   "x0": 8.4,
   "x1": 26.4,
   "y0": 28.8,
   "y1": 32.4,
   "area": 64.8,
   "doors": [
    {
     "raw": "西北后楼梯门",
     "ref": true,
     "open": false,
     "axis": "x",
     "at": 10.2,
     "width": 1.4,
     "dir": "北",
     "to": "西北后楼梯",
     "owner": "西北后楼梯",
     "main": false,
     "glass": false,
     "refDir": null
    },
    {
     "raw": "保龄球馆门",
     "ref": true,
     "open": false,
     "axis": "x",
     "at": 14.4,
     "width": 1,
     "dir": "北",
     "to": "保龄球馆",
     "owner": "保龄球馆",
     "main": false,
     "glass": false,
     "refDir": null
    },
    {
     "raw": "家具储藏室门",
     "ref": true,
     "open": false,
     "axis": "y",
     "at": 30.6,
     "width": 1.4,
     "dir": "西",
     "to": "家具储藏室",
     "owner": "家具储藏室",
     "main": false,
     "glass": false,
     "refDir": null
    }
   ],
   "parent": null,
   "adj": [
    {
     "to": "西地廊",
     "side": "南",
     "a": 8.4,
     "b": 12
    },
    {
     "to": "北地廊",
     "side": "东",
     "a": 28.8,
     "b": 32.4
    }
   ],
   "glass": [],
   "win": 0
  },
  {
   "floor": "B1",
   "name": "北地廊",
   "kind": "corridor",
   "shape": "rect",
   "x0": 26.4,
   "x1": 43.2,
   "y0": 28.8,
   "y1": 32.4,
   "area": 60.48,
   "doors": [
    {
     "raw": "浴疗室门",
     "ref": true,
     "open": false,
     "axis": "x",
     "at": 34.8,
     "width": 1.4,
     "dir": "南",
     "to": "浴疗室",
     "owner": "浴疗室",
     "main": false,
     "glass": false,
     "refDir": null
    },
    {
     "raw": "保龄球馆门",
     "ref": true,
     "open": false,
     "axis": "x",
     "at": 40.2,
     "width": 1.6,
     "dir": "北",
     "to": "保龄球馆",
     "owner": "保龄球馆",
     "main": false,
     "glass": false,
     "refDir": null
    }
   ],
   "parent": null,
   "adj": [
    {
     "to": "北廊西段",
     "side": "西",
     "a": 28.8,
     "b": 32.4
    },
    {
     "to": "北廊东段",
     "side": "东",
     "a": 28.8,
     "b": 32.4
    }
   ],
   "glass": [],
   "win": 0
  },
  {
   "floor": "B1",
   "name": "北廊东段",
   "kind": "corridor",
   "shape": "rect",
   "x0": 43.2,
   "x1": 61.2,
   "y0": 28.8,
   "y1": 32.4,
   "area": 64.8,
   "doors": [
    {
     "raw": "东北后楼梯门",
     "ref": true,
     "open": false,
     "axis": "x",
     "at": 59.4,
     "width": 1.4,
     "dir": "北",
     "to": "东北后楼梯",
     "owner": "东北后楼梯",
     "main": false,
     "glass": false,
     "refDir": null
    },
    {
     "raw": "机房门",
     "ref": true,
     "open": false,
     "axis": "x",
     "at": 55.2,
     "width": 1.2,
     "dir": "北",
     "to": "机房",
     "owner": "机房",
     "main": false,
     "glass": false,
     "refDir": null
    },
    {
     "raw": "杂物储藏室门",
     "ref": true,
     "open": false,
     "axis": "y",
     "at": 30.6,
     "width": 1.4,
     "dir": "东",
     "to": "杂物储藏室",
     "owner": "杂物储藏室",
     "main": false,
     "glass": false,
     "refDir": null
    }
   ],
   "parent": null,
   "adj": [
    {
     "to": "东地廊",
     "side": "南",
     "a": 57.6,
     "b": 61.2
    },
    {
     "to": "北地廊",
     "side": "西",
     "a": 28.8,
     "b": 32.4
    }
   ],
   "glass": [],
   "win": 0
  },
  {
   "floor": "B1",
   "name": "西北后楼梯",
   "kind": "stair",
   "shape": "rect",
   "x0": 8.4,
   "x1": 12,
   "y0": 32.4,
   "y1": 40.8,
   "area": 30.24,
   "doors": [
    {
     "raw": "后楼梯门",
     "open": false,
     "axis": "x",
     "at": 10.2,
     "width": 1.4,
     "dir": "南",
     "to": "北廊西段",
     "main": false,
     "glass": false
    }
   ],
   "parent": null,
   "win": 0
  },
  {
   "floor": "B1",
   "name": "东北后楼梯",
   "kind": "stair",
   "shape": "rect",
   "x0": 57.6,
   "x1": 61.2,
   "y0": 32.4,
   "y1": 40.8,
   "area": 30.24,
   "doors": [
    {
     "raw": "后楼梯门",
     "open": false,
     "axis": "x",
     "at": 59.4,
     "width": 1.4,
     "dir": "南",
     "to": "北廊东段",
     "main": false,
     "glass": false
    }
   ],
   "parent": null,
   "win": 0
  },
  {
   "floor": "B1",
   "name": "更衣室",
   "kind": "room",
   "x0": 12,
   "x1": 26.4,
   "y0": 0,
   "y1": 8.4,
   "shape": "rect",
   "area": 121,
   "areaNet": false,
   "netW": 14.16,
   "netH": 8.28,
   "doors": [
    {
     "raw": "北门 x=19.2，宽1.2，通南廊西段",
     "open": false,
     "axis": "x",
     "at": 19.2,
     "width": 1.2,
     "dir": "北",
     "to": "南廊西段",
     "main": false,
     "glass": false
    },
    {
     "raw": "东门 y=6.3，宽1.2，通泳池厅",
     "open": false,
     "axis": "y",
     "at": 6.3,
     "width": 1.2,
     "dir": "东",
     "to": "泳池厅",
     "main": false,
     "glass": false
    }
   ],
   "parent": null,
   "win": 0
  },
  {
   "floor": "B1",
   "name": "泳池厅",
   "kind": "room",
   "x0": 26.4,
   "x1": 43.2,
   "y0": 0,
   "y1": 24.6,
   "shape": "rect",
   "area": 413.3,
   "areaNet": false,
   "netW": 16.56,
   "netH": 24.48,
   "doors": [
    {
     "raw": "东门 y=10.2，宽1.8，通南廊东段",
     "open": false,
     "axis": "y",
     "at": 10.2,
     "width": 1.8,
     "dir": "东",
     "to": "南廊东段",
     "main": false,
     "glass": false
    },
    {
     "raw": "西门 y=10.2，宽1.8，通南廊西段",
     "open": false,
     "axis": "y",
     "at": 10.2,
     "width": 1.8,
     "dir": "西",
     "to": "南廊西段",
     "main": false,
     "glass": false
    },
    {
     "raw": "更衣室门",
     "ref": true,
     "open": false,
     "axis": "y",
     "at": 6.3,
     "width": 1.2,
     "dir": "西",
     "refDir": null,
     "to": "更衣室",
     "glass": false,
     "owner": "更衣室"
    },
    {
     "raw": "浴疗室门",
     "ref": true,
     "open": false,
     "axis": "x",
     "at": 34.8,
     "width": 1.2,
     "dir": "北",
     "refDir": null,
     "to": "浴疗室",
     "glass": false,
     "owner": "浴疗室"
    }
   ],
   "parent": null,
   "win": 0
  },
  {
   "floor": "B1",
   "name": "浴疗室",
   "kind": "room",
   "x0": 26.4,
   "x1": 43.2,
   "y0": 24.6,
   "y1": 28.8,
   "shape": "rect",
   "area": 70.6,
   "areaNet": false,
   "netW": 16.56,
   "netH": 3.96,
   "doors": [
    {
     "raw": "北门 x=34.8，宽1.4，通北地廊",
     "open": false,
     "axis": "x",
     "at": 34.8,
     "width": 1.4,
     "dir": "北",
     "to": "北地廊",
     "main": false,
     "glass": false
    },
    {
     "raw": "南门 x=34.8，宽1.2，通泳池厅",
     "open": false,
     "axis": "x",
     "at": 34.8,
     "width": 1.2,
     "dir": "南",
     "to": "泳池厅",
     "main": false,
     "glass": false
    }
   ],
   "parent": null,
   "win": 0
  },
  {
   "floor": "B1",
   "name": "泳池机房",
   "kind": "room",
   "x0": 43.2,
   "x1": 57.6,
   "y0": 0,
   "y1": 8.4,
   "shape": "rect",
   "area": 121,
   "areaNet": false,
   "netW": 14.16,
   "netH": 8.28,
   "doors": [
    {
     "raw": "北门 x=50.4，宽1.2，通南廊东段",
     "open": false,
     "axis": "x",
     "at": 50.4,
     "width": 1.2,
     "dir": "北",
     "to": "南廊东段",
     "main": false,
     "glass": false
    }
   ],
   "parent": null,
   "win": 0
  },
  {
   "floor": "B1",
   "name": "健身房",
   "kind": "room",
   "x0": 12,
   "x1": 26.4,
   "y0": 12,
   "y1": 28.8,
   "shape": "rect",
   "area": 241.9,
   "areaNet": false,
   "netW": 14.16,
   "netH": 16.56,
   "doors": [
    {
     "raw": "南门 x=19.2，宽1.2，通南廊西段",
     "open": false,
     "axis": "x",
     "at": 19.2,
     "width": 1.2,
     "dir": "南",
     "to": "南廊西段",
     "main": false,
     "glass": false
    },
    {
     "raw": "西门 y=20.4，宽1.6，通西地廊",
     "open": false,
     "axis": "y",
     "at": 20.4,
     "width": 1.6,
     "dir": "西",
     "to": "西地廊",
     "main": false,
     "glass": false
    }
   ],
   "parent": null,
   "win": 0
  },
  {
   "floor": "B1",
   "name": "工具间",
   "kind": "room",
   "x0": 0,
   "x1": 8.4,
   "y0": 12,
   "y1": 20.4,
   "shape": "rect",
   "area": 70.6,
   "areaNet": false,
   "netW": 8.28,
   "netH": 8.16,
   "doors": [
    {
     "raw": "东门 y=16.2，宽1，通西地廊",
     "open": false,
     "axis": "y",
     "at": 16.2,
     "width": 1,
     "dir": "东",
     "to": "西地廊",
     "main": false,
     "glass": false
    }
   ],
   "parent": null,
   "win": 0
  },
  {
   "floor": "B1",
   "name": "洗衣房",
   "kind": "room",
   "x0": 43.2,
   "x1": 57.6,
   "y0": 12,
   "y1": 20.4,
   "shape": "rect",
   "area": 121,
   "areaNet": false,
   "netW": 14.16,
   "netH": 8.16,
   "doors": [
    {
     "raw": "东门 y=16.2，宽1.2，通东地廊",
     "open": false,
     "axis": "y",
     "at": 16.2,
     "width": 1.2,
     "dir": "东",
     "to": "东地廊",
     "main": false,
     "glass": false
    }
   ],
   "parent": null,
   "win": 0
  },
  {
   "floor": "B1",
   "name": "物资库",
   "kind": "room",
   "x0": 43.2,
   "x1": 57.6,
   "y0": 20.4,
   "y1": 28.8,
   "shape": "rect",
   "area": 121,
   "areaNet": false,
   "netW": 14.16,
   "netH": 8.16,
   "doors": [
    {
     "raw": "东门 y=24.6，宽1.2，通东地廊",
     "open": false,
     "axis": "y",
     "at": 24.6,
     "width": 1.2,
     "dir": "东",
     "to": "东地廊",
     "main": false,
     "glass": false
    }
   ],
   "parent": null,
   "win": 0
  },
  {
   "floor": "B1",
   "name": "品酒室",
   "kind": "room",
   "x0": 61.2,
   "x1": 69.6,
   "y0": 12,
   "y1": 20.4,
   "shape": "rect",
   "area": 70.6,
   "areaNet": false,
   "netW": 8.28,
   "netH": 8.16,
   "doors": [
    {
     "raw": "西门 y=16.2，宽1.2，通东地廊",
     "open": false,
     "axis": "y",
     "at": 16.2,
     "width": 1.2,
     "dir": "西",
     "to": "东地廊",
     "main": false,
     "glass": false
    },
    {
     "raw": "酒窖门",
     "ref": true,
     "open": false,
     "axis": "x",
     "at": 66,
     "width": 1,
     "dir": "北",
     "refDir": null,
     "to": "酒窖",
     "glass": false,
     "owner": "酒窖"
    }
   ],
   "parent": null,
   "win": 0
  },
  {
   "floor": "B1",
   "name": "酒窖",
   "kind": "room",
   "x0": 61.2,
   "x1": 69.6,
   "y0": 20.4,
   "y1": 28.8,
   "shape": "rect",
   "area": 70.6,
   "areaNet": false,
   "netW": 8.28,
   "netH": 8.16,
   "doors": [
    {
     "raw": "南门 x=66，宽1，通品酒室",
     "open": false,
     "axis": "x",
     "at": 66,
     "width": 1,
     "dir": "南",
     "to": "品酒室",
     "main": false,
     "glass": false
    },
    {
     "raw": "西门 y=24.6，宽1，通东地廊",
     "open": false,
     "axis": "y",
     "at": 24.6,
     "width": 1,
     "dir": "西",
     "to": "东地廊",
     "main": false,
     "glass": false
    }
   ],
   "parent": null,
   "win": 0
  },
  {
   "floor": "B1",
   "name": "保龄球馆",
   "kind": "room",
   "x0": 12,
   "x1": 43.2,
   "y0": 32.4,
   "y1": 40.8,
   "shape": "rect",
   "area": 262.1,
   "areaNet": false,
   "netW": 30.96,
   "netH": 8.28,
   "doors": [
    {
     "raw": "南门 x=14.4，宽1，通北廊西段",
     "open": false,
     "axis": "x",
     "at": 14.4,
     "width": 1,
     "dir": "南",
     "to": "北廊西段",
     "main": false,
     "glass": false
    },
    {
     "raw": "南门 x=40.2，宽1.6，通北地廊",
     "open": false,
     "axis": "x",
     "at": 40.2,
     "width": 1.6,
     "dir": "南",
     "to": "北地廊",
     "main": false,
     "glass": false
    }
   ],
   "parent": null,
   "win": 0
  },
  {
   "floor": "B1",
   "name": "机房",
   "kind": "room",
   "x0": 43.2,
   "x1": 57.6,
   "y0": 32.4,
   "y1": 40.8,
   "shape": "rect",
   "area": 121,
   "areaNet": false,
   "netW": 14.16,
   "netH": 8.28,
   "doors": [
    {
     "raw": "南门 x=55.2，宽1.2，通北廊东段",
     "open": false,
     "axis": "x",
     "at": 55.2,
     "width": 1.2,
     "dir": "南",
     "to": "北廊东段",
     "main": false,
     "glass": false
    }
   ],
   "parent": null,
   "win": 0
  },
  {
   "floor": "B1",
   "name": "家具储藏室",
   "kind": "room",
   "x0": 0,
   "x1": 8.4,
   "y0": 20.4,
   "y1": 40.8,
   "shape": "rect",
   "area": 171.4,
   "areaNet": false,
   "netW": 8.28,
   "netH": 20.28,
   "doors": [
    {
     "raw": "东门 y=30.6，宽1.4，通北廊西段",
     "open": false,
     "axis": "y",
     "at": 30.6,
     "width": 1.4,
     "dir": "东",
     "to": "北廊西段",
     "main": false,
     "glass": false
    }
   ],
   "parent": null,
   "win": 0
  },
  {
   "floor": "B1",
   "name": "箱笼储藏室",
   "kind": "room",
   "x0": 0,
   "x1": 8.4,
   "y0": 0,
   "y1": 12,
   "shape": "rect",
   "area": 100.8,
   "areaNet": false,
   "netW": 8.28,
   "netH": 11.88,
   "doors": [
    {
     "raw": "东门 y=5.6，宽1.4，通西电梯厅",
     "open": false,
     "axis": "y",
     "at": 5.6,
     "width": 1.4,
     "dir": "东",
     "to": "西电梯厅",
     "main": false,
     "glass": false
    }
   ],
   "parent": null,
   "win": 0
  },
  {
   "floor": "B1",
   "name": "地毯储藏室",
   "kind": "room",
   "x0": 61.2,
   "x1": 69.6,
   "y0": 0,
   "y1": 12,
   "shape": "rect",
   "area": 100.8,
   "areaNet": false,
   "netW": 8.28,
   "netH": 11.88,
   "doors": [
    {
     "raw": "西门 y=5.6，宽1.4，通东电梯厅",
     "open": false,
     "axis": "y",
     "at": 5.6,
     "width": 1.4,
     "dir": "西",
     "to": "东电梯厅",
     "main": false,
     "glass": false
    }
   ],
   "parent": null,
   "win": 0
  },
  {
   "floor": "B1",
   "name": "杂物储藏室",
   "kind": "room",
   "x0": 61.2,
   "x1": 69.6,
   "y0": 28.8,
   "y1": 40.8,
   "shape": "rect",
   "area": 100.8,
   "areaNet": false,
   "netW": 8.28,
   "netH": 11.88,
   "doors": [
    {
     "raw": "西门 y=30.6，宽1.4，通北廊东段",
     "open": false,
     "axis": "y",
     "at": 30.6,
     "width": 1.4,
     "dir": "西",
     "to": "北廊东段",
     "main": false,
     "glass": false
    }
   ],
   "parent": null,
   "win": 0
  },
  {
   "floor": "1F",
   "name": "西电梯",
   "kind": "elevator",
   "shape": "rect",
   "x0": 9,
   "x1": 11.4,
   "y0": 0,
   "y1": 2.8,
   "area": 6.72,
   "doors": [
    {
     "raw": "电梯门",
     "open": false,
     "axis": "x",
     "at": 10.2,
     "width": 1.1,
     "dir": "北",
     "to": "西电梯厅",
     "main": false,
     "glass": false
    }
   ],
   "parent": null,
   "win": 0
  },
  {
   "floor": "1F",
   "name": "东电梯",
   "kind": "elevator",
   "shape": "rect",
   "x0": 58.2,
   "x1": 60.6,
   "y0": 0,
   "y1": 2.8,
   "area": 6.72,
   "doors": [
    {
     "raw": "电梯门",
     "open": false,
     "axis": "x",
     "at": 59.4,
     "width": 1.1,
     "dir": "北",
     "to": "东电梯厅",
     "main": false,
     "glass": false
    }
   ],
   "parent": null,
   "win": 0
  },
  {
   "floor": "1F",
   "name": "西电梯厅",
   "kind": "corridor",
   "shape": "rect",
   "x0": 8.4,
   "x1": 12,
   "y0": 2.8,
   "y1": 8.4,
   "area": 20.16,
   "doors": [
    {
     "raw": "西电梯门",
     "ref": true,
     "open": false,
     "axis": "x",
     "at": 10.2,
     "width": 1.1,
     "dir": "南",
     "to": "西电梯",
     "owner": "西电梯",
     "main": false,
     "glass": false,
     "refDir": null
    }
   ],
   "parent": null,
   "adj": [
    {
     "to": "南廊西段",
     "side": "北",
     "a": 8.4,
     "b": 12
    }
   ],
   "glass": [],
   "win": 0
  },
  {
   "floor": "1F",
   "name": "东电梯厅",
   "kind": "corridor",
   "shape": "rect",
   "x0": 57.6,
   "x1": 61.2,
   "y0": 2.8,
   "y1": 8.4,
   "area": 20.16,
   "doors": [
    {
     "raw": "东电梯门",
     "ref": true,
     "open": false,
     "axis": "x",
     "at": 59.4,
     "width": 1.1,
     "dir": "南",
     "to": "东电梯",
     "owner": "东电梯",
     "main": false,
     "glass": false,
     "refDir": null
    }
   ],
   "parent": null,
   "adj": [
    {
     "to": "南廊东段",
     "side": "北",
     "a": 57.6,
     "b": 61.2
    }
   ],
   "glass": [],
   "win": 0
  },
  {
   "floor": "1F",
   "name": "西藏珍廊",
   "kind": "corridor",
   "shape": "rect",
   "x0": 8.4,
   "x1": 12,
   "y0": 12,
   "y1": 28.8,
   "area": 60.48,
   "doors": [
    {
     "raw": "花园门",
     "ref": true,
     "open": false,
     "axis": "y",
     "at": 20.4,
     "width": 1.8,
     "dir": "东",
     "to": "花园",
     "owner": "花园",
     "main": false,
     "glass": true,
     "refDir": null
    },
    {
     "raw": "晨间厅门",
     "ref": true,
     "open": false,
     "axis": "y",
     "at": 16.2,
     "width": 1.4,
     "dir": "西",
     "to": "晨间厅",
     "owner": "晨间厅",
     "main": false,
     "glass": false,
     "refDir": null
    },
    {
     "raw": "园艺间门",
     "ref": true,
     "open": false,
     "axis": "y",
     "at": 24.6,
     "width": 1,
     "dir": "西",
     "to": "园艺间",
     "owner": "园艺间",
     "main": false,
     "glass": false,
     "refDir": null
    }
   ],
   "parent": null,
   "adj": [
    {
     "to": "南廊西段",
     "side": "南",
     "a": 8.4,
     "b": 12
    },
    {
     "to": "北廊西段",
     "side": "北",
     "a": 8.4,
     "b": 12
    }
   ],
   "glass": [
    {
     "to": "花园",
     "side": "东",
     "a": 12,
     "b": 28.8
    }
   ],
   "win": 0
  },
  {
   "floor": "1F",
   "name": "东织锦廊",
   "kind": "corridor",
   "shape": "rect",
   "x0": 57.6,
   "x1": 61.2,
   "y0": 12,
   "y1": 28.8,
   "area": 60.48,
   "doors": [
    {
     "raw": "自然史大厅门",
     "ref": true,
     "open": false,
     "axis": "y",
     "at": 20.4,
     "width": 1.8,
     "dir": "西",
     "to": "自然史大厅",
     "owner": "自然史大厅",
     "main": false,
     "glass": true,
     "refDir": null
    },
    {
     "raw": "古兽厅门",
     "ref": true,
     "open": false,
     "axis": "y",
     "at": 20.4,
     "width": 1.6,
     "dir": "东",
     "to": "古兽厅",
     "owner": "古兽厅",
     "main": false,
     "glass": false,
     "refDir": null
    },
    {
     "raw": "古兽厅门",
     "ref": true,
     "open": false,
     "axis": "y",
     "at": 27,
     "width": 1,
     "dir": "东",
     "to": "古兽厅",
     "owner": "古兽厅",
     "main": false,
     "glass": false,
     "refDir": null
    }
   ],
   "parent": null,
   "adj": [
    {
     "to": "南廊东段",
     "side": "南",
     "a": 57.6,
     "b": 61.2
    },
    {
     "to": "北廊东段",
     "side": "北",
     "a": 57.6,
     "b": 61.2
    }
   ],
   "glass": [
    {
     "to": "自然史大厅",
     "side": "西",
     "a": 12,
     "b": 28.8
    }
   ],
   "win": 0
  },
  {
   "floor": "1F",
   "name": "南廊西段",
   "kind": "corridor",
   "shape": "rect",
   "x0": 0,
   "x1": 26.4,
   "y0": 8.4,
   "y1": 12,
   "area": 95.04,
   "doors": [
    {
     "raw": "门厅敞接",
     "ref": true,
     "open": true,
     "axis": "y",
     "at": 10.2,
     "width": 3.6,
     "dir": "东",
     "to": "门厅",
     "owner": "门厅",
     "main": false,
     "glass": false,
     "refDir": null
    },
    {
     "raw": "花园门",
     "ref": true,
     "open": false,
     "axis": "x",
     "at": 17.4,
     "width": 1.8,
     "dir": "北",
     "to": "花园",
     "owner": "花园",
     "main": false,
     "glass": true,
     "refDir": null
    },
    {
     "raw": "衣帽间门",
     "ref": true,
     "open": false,
     "axis": "x",
     "at": 15.6,
     "width": 1,
     "dir": "南",
     "to": "衣帽间",
     "owner": "衣帽间",
     "main": false,
     "glass": false,
     "refDir": null
    },
    {
     "raw": "盥洗室门",
     "ref": true,
     "open": false,
     "axis": "x",
     "at": 22.8,
     "width": 1,
     "dir": "南",
     "to": "盥洗室",
     "owner": "盥洗室",
     "main": false,
     "glass": false,
     "refDir": null
    },
    {
     "raw": "1号套房门",
     "ref": true,
     "open": false,
     "axis": "x",
     "at": 4.2,
     "width": 1,
     "dir": "南",
     "to": "1号套房",
     "owner": "1号套房",
     "main": false,
     "glass": false,
     "refDir": null
    }
   ],
   "parent": null,
   "adj": [
    {
     "to": "西电梯厅",
     "side": "南",
     "a": 8.4,
     "b": 12
    },
    {
     "to": "西藏珍廊",
     "side": "北",
     "a": 8.4,
     "b": 12
    }
   ],
   "glass": [
    {
     "to": "花园",
     "side": "北",
     "a": 12,
     "b": 26.4
    }
   ],
   "win": 1
  },
  {
   "floor": "1F",
   "name": "南廊东段",
   "kind": "corridor",
   "shape": "rect",
   "x0": 43.2,
   "x1": 69.6,
   "y0": 8.4,
   "y1": 12,
   "area": 95.04,
   "doors": [
    {
     "raw": "门厅敞接",
     "ref": true,
     "open": true,
     "axis": "y",
     "at": 10.2,
     "width": 3.6,
     "dir": "西",
     "to": "门厅",
     "owner": "门厅",
     "main": false,
     "glass": false,
     "refDir": null
    },
    {
     "raw": "自然史大厅门",
     "ref": true,
     "open": false,
     "axis": "x",
     "at": 52.2,
     "width": 1.8,
     "dir": "北",
     "to": "自然史大厅",
     "owner": "自然史大厅",
     "main": false,
     "glass": true,
     "refDir": null
    },
    {
     "raw": "音乐沙龙门",
     "ref": true,
     "open": false,
     "axis": "x",
     "at": 54,
     "width": 1.6,
     "dir": "南",
     "to": "音乐沙龙",
     "owner": "音乐沙龙",
     "main": false,
     "glass": false,
     "refDir": null
    },
    {
     "raw": "4号套房门",
     "ref": true,
     "open": false,
     "axis": "x",
     "at": 65.4,
     "width": 1,
     "dir": "南",
     "to": "4号套房",
     "owner": "4号套房",
     "main": false,
     "glass": false,
     "refDir": null
    }
   ],
   "parent": null,
   "adj": [
    {
     "to": "东电梯厅",
     "side": "南",
     "a": 57.6,
     "b": 61.2
    },
    {
     "to": "东织锦廊",
     "side": "北",
     "a": 57.6,
     "b": 61.2
    }
   ],
   "glass": [
    {
     "to": "自然史大厅",
     "side": "北",
     "a": 43.2,
     "b": 57.6
    }
   ],
   "win": 1
  },
  {
   "floor": "1F",
   "name": "北廊西段",
   "kind": "corridor",
   "shape": "rect",
   "x0": 0,
   "x1": 26.4,
   "y0": 28.8,
   "y1": 32.4,
   "area": 95.04,
   "doors": [
    {
     "raw": "西北后楼梯门",
     "ref": true,
     "open": false,
     "axis": "x",
     "at": 10.2,
     "width": 1.4,
     "dir": "北",
     "to": "西北后楼梯",
     "owner": "西北后楼梯",
     "main": false,
     "glass": false,
     "refDir": null
    },
    {
     "raw": "花园门",
     "ref": true,
     "open": false,
     "axis": "x",
     "at": 17.4,
     "width": 1.8,
     "dir": "南",
     "to": "花园",
     "owner": "花园",
     "main": false,
     "glass": true,
     "refDir": null
    },
    {
     "raw": "起居厅门",
     "ref": true,
     "open": false,
     "axis": "x",
     "at": 17.4,
     "width": 1.6,
     "dir": "北",
     "to": "起居厅",
     "owner": "起居厅",
     "main": false,
     "glass": false,
     "refDir": null
    },
    {
     "raw": "2号套房门",
     "ref": true,
     "open": false,
     "axis": "x",
     "at": 4.2,
     "width": 1,
     "dir": "北",
     "to": "2号套房",
     "owner": "2号套房",
     "main": false,
     "glass": false,
     "refDir": null
    }
   ],
   "parent": null,
   "adj": [
    {
     "to": "西藏珍廊",
     "side": "南",
     "a": 8.4,
     "b": 12
    },
    {
     "to": "北过厅",
     "side": "东",
     "a": 28.8,
     "b": 32.4
    }
   ],
   "glass": [
    {
     "to": "花园",
     "side": "南",
     "a": 12,
     "b": 26.4
    }
   ],
   "win": 1
  },
  {
   "floor": "1F",
   "name": "北过厅",
   "kind": "corridor",
   "shape": "rect",
   "x0": 26.4,
   "x1": 43.2,
   "y0": 28.8,
   "y1": 32.4,
   "area": 60.48,
   "doors": [
    {
     "raw": "宴饮厅门",
     "ref": true,
     "open": false,
     "axis": "x",
     "at": 34.8,
     "width": 1.6,
     "dir": "北",
     "to": "宴饮厅",
     "owner": "宴饮厅",
     "main": false,
     "glass": false,
     "refDir": null
    }
   ],
   "parent": null,
   "adj": [
    {
     "to": "北廊西段",
     "side": "西",
     "a": 28.8,
     "b": 32.4
    },
    {
     "to": "北廊东段",
     "side": "东",
     "a": 28.8,
     "b": 32.4
    }
   ],
   "glass": [],
   "win": 0
  },
  {
   "floor": "1F",
   "name": "北廊东段",
   "kind": "corridor",
   "shape": "rect",
   "x0": 43.2,
   "x1": 69.6,
   "y0": 28.8,
   "y1": 32.4,
   "area": 95.04,
   "doors": [
    {
     "raw": "东北后楼梯门",
     "ref": true,
     "open": false,
     "axis": "x",
     "at": 59.4,
     "width": 1.4,
     "dir": "北",
     "to": "东北后楼梯",
     "owner": "东北后楼梯",
     "main": false,
     "glass": false,
     "refDir": null
    },
    {
     "raw": "自然史大厅门",
     "ref": true,
     "open": false,
     "axis": "x",
     "at": 52.2,
     "width": 1.8,
     "dir": "南",
     "to": "自然史大厅",
     "owner": "自然史大厅",
     "main": false,
     "glass": true,
     "refDir": null
    },
    {
     "raw": "厨房门",
     "ref": true,
     "open": false,
     "axis": "x",
     "at": 55.2,
     "width": 1,
     "dir": "北",
     "to": "厨房",
     "owner": "厨房",
     "main": false,
     "glass": false,
     "refDir": null
    },
    {
     "raw": "3号套房门",
     "ref": true,
     "open": false,
     "axis": "x",
     "at": 65.4,
     "width": 1,
     "dir": "北",
     "to": "3号套房",
     "owner": "3号套房",
     "main": false,
     "glass": false,
     "refDir": null
    }
   ],
   "parent": null,
   "adj": [
    {
     "to": "东织锦廊",
     "side": "南",
     "a": 57.6,
     "b": 61.2
    },
    {
     "to": "北过厅",
     "side": "西",
     "a": 28.8,
     "b": 32.4
    }
   ],
   "glass": [
    {
     "to": "自然史大厅",
     "side": "南",
     "a": 43.2,
     "b": 57.6
    }
   ],
   "win": 1
  },
  {
   "floor": "1F",
   "name": "西北后楼梯",
   "kind": "stair",
   "shape": "rect",
   "x0": 8.4,
   "x1": 12,
   "y0": 32.4,
   "y1": 40.8,
   "area": 30.24,
   "doors": [
    {
     "raw": "后楼梯门",
     "open": false,
     "axis": "x",
     "at": 10.2,
     "width": 1.4,
     "dir": "南",
     "to": "北廊西段",
     "main": false,
     "glass": false
    }
   ],
   "parent": null,
   "win": 1
  },
  {
   "floor": "1F",
   "name": "东北后楼梯",
   "kind": "stair",
   "shape": "rect",
   "x0": 57.6,
   "x1": 61.2,
   "y0": 32.4,
   "y1": 40.8,
   "area": 30.24,
   "doors": [
    {
     "raw": "后楼梯门",
     "open": false,
     "axis": "x",
     "at": 59.4,
     "width": 1.4,
     "dir": "南",
     "to": "北廊东段",
     "main": false,
     "glass": false
    }
   ],
   "parent": null,
   "win": 1
  },
  {
   "floor": "1F",
   "name": "门厅",
   "kind": "room",
   "x0": 26.4,
   "x1": 43.2,
   "y0": 0,
   "y1": 12,
   "shape": "rect",
   "area": 201.6,
   "areaNet": false,
   "netW": 16.56,
   "netH": 11.88,
   "doors": [
    {
     "raw": "南墙正门 x=34.8，宽3.6，通屋外（1.4）",
     "open": false,
     "axis": "x",
     "at": 34.8,
     "width": 3.6,
     "dir": "南",
     "to": "屋外",
     "main": true,
     "glass": false,
     "outside": true
    },
    {
     "raw": "西、东两边 y=8.4—12 敞接南廊",
     "open": true,
     "axis": "y",
     "at": 10.2,
     "width": 3.6,
     "dir": "西",
     "to": "南廊西段",
     "main": false,
     "glass": false
    },
    {
     "raw": "西、东两边 y=8.4—12 敞接南廊",
     "open": true,
     "axis": "y",
     "at": 10.2,
     "width": 3.6,
     "dir": "东",
     "to": "南廊东段",
     "main": false,
     "glass": false
    },
    {
     "raw": "议事厅南门",
     "ref": true,
     "open": false,
     "axis": "x",
     "at": 34.8,
     "width": 2.4,
     "dir": "北",
     "refDir": "南",
     "to": "穹顶议事厅",
     "glass": false,
     "owner": "穹顶议事厅"
    },
    {
     "raw": "音乐沙龙门",
     "ref": true,
     "open": false,
     "axis": "y",
     "at": 1.3,
     "width": 1.8,
     "dir": "东",
     "refDir": null,
     "to": "音乐沙龙",
     "glass": false,
     "owner": "音乐沙龙"
    }
   ],
   "parent": null,
   "win": 1
  },
  {
   "floor": "1F",
   "name": "穹顶议事厅",
   "kind": "room",
   "x0": 26.4,
   "x1": 43.2,
   "y0": 12,
   "y1": 28.8,
   "shape": "circle",
   "cx": 34.8,
   "cy": 20.4,
   "r": 6.6,
   "rOuter": 7.8,
   "area": 137,
   "areaNet": true,
   "doors": [
    {
     "raw": "南门 x=34.8，宽2.4，通门厅",
     "open": false,
     "axis": "x",
     "at": 34.8,
     "width": 2.4,
     "dir": "南",
     "to": "门厅",
     "main": false,
     "glass": false
    },
    {
     "raw": "西门 y=20.4，宽2.4，通花园",
     "open": false,
     "axis": "y",
     "at": 20.4,
     "width": 2.4,
     "dir": "西",
     "to": "花园",
     "main": false,
     "glass": false
    },
    {
     "raw": "东门 y=20.4，宽2.4，通自然史大厅",
     "open": false,
     "axis": "y",
     "at": 20.4,
     "width": 2.4,
     "dir": "东",
     "to": "自然史大厅",
     "main": false,
     "glass": false
    }
   ],
   "parent": null,
   "win": 0
  },
  {
   "floor": "1F",
   "name": "花园",
   "kind": "room",
   "x0": 12,
   "x1": 26.4,
   "y0": 12,
   "y1": 28.8,
   "shape": "rect",
   "area": 241.9,
   "areaNet": false,
   "netW": 14.23,
   "netH": 16.7,
   "doors": [
    {
     "raw": "北门 x=17.4，宽1.8，通北廊西段",
     "open": false,
     "axis": "x",
     "at": 17.4,
     "width": 1.8,
     "dir": "北",
     "to": "北廊西段",
     "main": false,
     "glass": true
    },
    {
     "raw": "南门 x=17.4，宽1.8，通南廊西段",
     "open": false,
     "axis": "x",
     "at": 17.4,
     "width": 1.8,
     "dir": "南",
     "to": "南廊西段",
     "main": false,
     "glass": true
    },
    {
     "raw": "西门 y=20.4，宽1.8，通西藏珍廊",
     "open": false,
     "axis": "y",
     "at": 20.4,
     "width": 1.8,
     "dir": "西",
     "to": "西藏珍廊",
     "main": false,
     "glass": true
    },
    {
     "raw": "议事厅西门",
     "ref": true,
     "open": false,
     "axis": "y",
     "at": 20.4,
     "width": 2.4,
     "dir": "东",
     "refDir": "西",
     "to": "穹顶议事厅",
     "glass": false,
     "owner": "穹顶议事厅"
    }
   ],
   "parent": null,
   "court": true,
   "glass": [
    {
     "to": "西藏珍廊",
     "side": "西",
     "a": 12,
     "b": 28.8
    },
    {
     "to": "南廊西段",
     "side": "南",
     "a": 12,
     "b": 26.4
    },
    {
     "to": "北廊西段",
     "side": "北",
     "a": 12,
     "b": 26.4
    }
   ],
   "win": 0
  },
  {
   "floor": "1F",
   "name": "自然史大厅",
   "kind": "room",
   "x0": 43.2,
   "x1": 57.6,
   "y0": 12,
   "y1": 28.8,
   "shape": "rect",
   "area": 241.9,
   "areaNet": false,
   "netW": 14.23,
   "netH": 16.7,
   "doors": [
    {
     "raw": "北门 x=52.2，宽1.8，通北廊东段",
     "open": false,
     "axis": "x",
     "at": 52.2,
     "width": 1.8,
     "dir": "北",
     "to": "北廊东段",
     "main": false,
     "glass": true
    },
    {
     "raw": "东门 y=20.4，宽1.8，通东织锦廊",
     "open": false,
     "axis": "y",
     "at": 20.4,
     "width": 1.8,
     "dir": "东",
     "to": "东织锦廊",
     "main": false,
     "glass": true
    },
    {
     "raw": "南门 x=52.2，宽1.8，通南廊东段",
     "open": false,
     "axis": "x",
     "at": 52.2,
     "width": 1.8,
     "dir": "南",
     "to": "南廊东段",
     "main": false,
     "glass": true
    },
    {
     "raw": "议事厅东门",
     "ref": true,
     "open": false,
     "axis": "y",
     "at": 20.4,
     "width": 2.4,
     "dir": "西",
     "refDir": "东",
     "to": "穹顶议事厅",
     "glass": false,
     "owner": "穹顶议事厅"
    }
   ],
   "parent": null,
   "court": true,
   "glass": [
    {
     "to": "东织锦廊",
     "side": "东",
     "a": 12,
     "b": 28.8
    },
    {
     "to": "南廊东段",
     "side": "南",
     "a": 43.2,
     "b": 57.6
    },
    {
     "to": "北廊东段",
     "side": "北",
     "a": 43.2,
     "b": 57.6
    }
   ],
   "win": 0
  },
  {
   "floor": "1F",
   "name": "衣帽间",
   "kind": "room",
   "x0": 12,
   "x1": 19.2,
   "y0": 0,
   "y1": 8.4,
   "shape": "rect",
   "area": 60.5,
   "areaNet": false,
   "netW": 6.96,
   "netH": 8.28,
   "doors": [
    {
     "raw": "北门 x=15.6，宽1，通南廊西段",
     "open": false,
     "axis": "x",
     "at": 15.6,
     "width": 1,
     "dir": "北",
     "to": "南廊西段",
     "main": false,
     "glass": false
    }
   ],
   "parent": null,
   "win": 1
  },
  {
   "floor": "1F",
   "name": "盥洗室",
   "kind": "room",
   "x0": 19.2,
   "x1": 26.4,
   "y0": 0,
   "y1": 8.4,
   "shape": "rect",
   "area": 60.5,
   "areaNet": false,
   "netW": 6.96,
   "netH": 8.28,
   "doors": [
    {
     "raw": "北门 x=22.8，宽1，通南廊西段",
     "open": false,
     "axis": "x",
     "at": 22.8,
     "width": 1,
     "dir": "北",
     "to": "南廊西段",
     "main": false,
     "glass": false
    }
   ],
   "parent": null,
   "win": 1
  },
  {
   "floor": "1F",
   "name": "音乐沙龙",
   "kind": "room",
   "x0": 43.2,
   "x1": 57.6,
   "y0": 0,
   "y1": 8.4,
   "shape": "rect",
   "area": 121,
   "areaNet": false,
   "netW": 14.16,
   "netH": 8.28,
   "doors": [
    {
     "raw": "北门 x=54，宽1.6，通南廊东段",
     "open": false,
     "axis": "x",
     "at": 54,
     "width": 1.6,
     "dir": "北",
     "to": "南廊东段",
     "main": false,
     "glass": false
    },
    {
     "raw": "西门 y=1.3，宽1.8，通门厅",
     "open": false,
     "axis": "y",
     "at": 1.3,
     "width": 1.8,
     "dir": "西",
     "to": "门厅",
     "main": false,
     "glass": false
    }
   ],
   "parent": null,
   "win": 2
  },
  {
   "floor": "1F",
   "name": "晨间厅",
   "kind": "room",
   "x0": 0,
   "x1": 8.4,
   "y0": 12,
   "y1": 20.4,
   "shape": "rect",
   "area": 70.6,
   "areaNet": false,
   "netW": 8.28,
   "netH": 8.16,
   "doors": [
    {
     "raw": "东门 y=16.2，宽1.4，通西藏珍廊",
     "open": false,
     "axis": "y",
     "at": 16.2,
     "width": 1.4,
     "dir": "东",
     "to": "西藏珍廊",
     "main": false,
     "glass": false
    }
   ],
   "parent": null,
   "win": 1
  },
  {
   "floor": "1F",
   "name": "园艺间",
   "kind": "room",
   "x0": 0,
   "x1": 8.4,
   "y0": 20.4,
   "y1": 28.8,
   "shape": "rect",
   "area": 70.6,
   "areaNet": false,
   "netW": 8.28,
   "netH": 8.16,
   "doors": [
    {
     "raw": "东门 y=24.6，宽1，通西藏珍廊",
     "open": false,
     "axis": "y",
     "at": 24.6,
     "width": 1,
     "dir": "东",
     "to": "西藏珍廊",
     "main": false,
     "glass": false
    }
   ],
   "parent": null,
   "win": 1
  },
  {
   "floor": "1F",
   "name": "古兽厅",
   "kind": "room",
   "x0": 61.2,
   "x1": 69.6,
   "y0": 12,
   "y1": 28.8,
   "shape": "rect",
   "area": 141.1,
   "areaNet": false,
   "netW": 8.28,
   "netH": 16.56,
   "doors": [
    {
     "raw": "西门 y=20.4，宽1.6，通东织锦廊",
     "open": false,
     "axis": "y",
     "at": 20.4,
     "width": 1.6,
     "dir": "西",
     "to": "东织锦廊",
     "main": false,
     "glass": false
    },
    {
     "raw": "西门 y=27，宽1，通东织锦廊",
     "open": false,
     "axis": "y",
     "at": 27,
     "width": 1,
     "dir": "西",
     "to": "东织锦廊",
     "main": false,
     "glass": false
    }
   ],
   "parent": null,
   "win": 2
  },
  {
   "floor": "1F",
   "name": "起居厅",
   "kind": "room",
   "x0": 12,
   "x1": 26.4,
   "y0": 32.4,
   "y1": 40.8,
   "shape": "rect",
   "area": 121,
   "areaNet": false,
   "netW": 14.16,
   "netH": 8.28,
   "doors": [
    {
     "raw": "南门 x=17.4，宽1.6，通北廊西段",
     "open": false,
     "axis": "x",
     "at": 17.4,
     "width": 1.6,
     "dir": "南",
     "to": "北廊西段",
     "main": false,
     "glass": false
    },
    {
     "raw": "宴饮厅门",
     "ref": true,
     "open": false,
     "axis": "y",
     "at": 37.8,
     "width": 1.4,
     "dir": "东",
     "refDir": null,
     "to": "宴饮厅",
     "glass": false,
     "owner": "宴饮厅"
    }
   ],
   "parent": null,
   "win": 3
  },
  {
   "floor": "1F",
   "name": "宴饮厅",
   "kind": "room",
   "x0": 26.4,
   "x1": 43.2,
   "y0": 32.4,
   "y1": 40.8,
   "shape": "rect",
   "area": 141.1,
   "areaNet": false,
   "netW": 16.56,
   "netH": 8.28,
   "doors": [
    {
     "raw": "南门 x=34.8，宽1.6，通北过厅",
     "open": false,
     "axis": "x",
     "at": 34.8,
     "width": 1.6,
     "dir": "南",
     "to": "北过厅",
     "main": false,
     "glass": false
    },
    {
     "raw": "西门 y=37.8，宽1.4，通起居厅",
     "open": false,
     "axis": "y",
     "at": 37.8,
     "width": 1.4,
     "dir": "西",
     "to": "起居厅",
     "main": false,
     "glass": false
    },
    {
     "raw": "厨房门",
     "ref": true,
     "open": false,
     "axis": "y",
     "at": 38.4,
     "width": 1,
     "dir": "东",
     "refDir": null,
     "to": "厨房",
     "glass": false,
     "owner": "厨房"
    }
   ],
   "parent": null,
   "win": 3
  },
  {
   "floor": "1F",
   "name": "厨房",
   "kind": "room",
   "x0": 43.2,
   "x1": 57.6,
   "y0": 32.4,
   "y1": 40.8,
   "shape": "rect",
   "area": 121,
   "areaNet": false,
   "netW": 14.16,
   "netH": 8.28,
   "doors": [
    {
     "raw": "南门 x=55.2，宽1，通北廊东段",
     "open": false,
     "axis": "x",
     "at": 55.2,
     "width": 1,
     "dir": "南",
     "to": "北廊东段",
     "main": false,
     "glass": false
    },
    {
     "raw": "西门 y=38.4，宽1，通宴饮厅",
     "open": false,
     "axis": "y",
     "at": 38.4,
     "width": 1,
     "dir": "西",
     "to": "宴饮厅",
     "main": false,
     "glass": false
    }
   ],
   "parent": null,
   "win": 3
  },
  {
   "floor": "1F",
   "name": "1号套房",
   "kind": "suite",
   "x0": 0,
   "x1": 8.4,
   "y0": 0,
   "y1": 8.4,
   "shape": "rect",
   "area": 70.6,
   "areaNet": false,
   "netW": 8.16,
   "netH": 8.16,
   "suite": 1,
   "doors": [
    {
     "raw": "北门 x=4.2，宽1，通南廊西段",
     "open": false,
     "axis": "x",
     "at": 4.2,
     "width": 1,
     "dir": "北",
     "to": "南廊西段",
     "main": false,
     "glass": false
    }
   ],
   "parent": null,
   "win": 1
  },
  {
   "floor": "1F",
   "name": "2号套房",
   "kind": "suite",
   "x0": 0,
   "x1": 8.4,
   "y0": 32.4,
   "y1": 40.8,
   "shape": "rect",
   "area": 70.6,
   "areaNet": false,
   "netW": 8.16,
   "netH": 8.16,
   "suite": 2,
   "doors": [
    {
     "raw": "南门 x=4.2，宽1，通北廊西段",
     "open": false,
     "axis": "x",
     "at": 4.2,
     "width": 1,
     "dir": "南",
     "to": "北廊西段",
     "main": false,
     "glass": false
    }
   ],
   "parent": null,
   "win": 1
  },
  {
   "floor": "1F",
   "name": "3号套房",
   "kind": "suite",
   "x0": 61.2,
   "x1": 69.6,
   "y0": 32.4,
   "y1": 40.8,
   "shape": "rect",
   "area": 70.6,
   "areaNet": false,
   "netW": 8.16,
   "netH": 8.16,
   "suite": 3,
   "doors": [
    {
     "raw": "南门 x=65.4，宽1，通北廊东段",
     "open": false,
     "axis": "x",
     "at": 65.4,
     "width": 1,
     "dir": "南",
     "to": "北廊东段",
     "main": false,
     "glass": false
    }
   ],
   "parent": null,
   "win": 1
  },
  {
   "floor": "1F",
   "name": "4号套房",
   "kind": "suite",
   "x0": 61.2,
   "x1": 69.6,
   "y0": 0,
   "y1": 8.4,
   "shape": "rect",
   "area": 70.6,
   "areaNet": false,
   "netW": 8.16,
   "netH": 8.16,
   "suite": 4,
   "doors": [
    {
     "raw": "北门 x=65.4，宽1，通南廊东段",
     "open": false,
     "axis": "x",
     "at": 65.4,
     "width": 1,
     "dir": "北",
     "to": "南廊东段",
     "main": false,
     "glass": false
    }
   ],
   "parent": null,
   "win": 1
  },
  {
   "floor": "2F",
   "name": "西电梯",
   "kind": "elevator",
   "shape": "rect",
   "x0": 9,
   "x1": 11.4,
   "y0": 0,
   "y1": 2.8,
   "area": 6.72,
   "doors": [
    {
     "raw": "电梯门",
     "open": false,
     "axis": "x",
     "at": 10.2,
     "width": 1.1,
     "dir": "北",
     "to": "西电梯厅",
     "main": false,
     "glass": false
    }
   ],
   "parent": null,
   "win": 0
  },
  {
   "floor": "2F",
   "name": "东电梯",
   "kind": "elevator",
   "shape": "rect",
   "x0": 58.2,
   "x1": 60.6,
   "y0": 0,
   "y1": 2.8,
   "area": 6.72,
   "doors": [
    {
     "raw": "电梯门",
     "open": false,
     "axis": "x",
     "at": 59.4,
     "width": 1.1,
     "dir": "北",
     "to": "东电梯厅",
     "main": false,
     "glass": false
    }
   ],
   "parent": null,
   "win": 0
  },
  {
   "floor": "2F",
   "name": "西电梯厅",
   "kind": "corridor",
   "shape": "rect",
   "x0": 8.4,
   "x1": 12,
   "y0": 2.8,
   "y1": 8.4,
   "area": 20.16,
   "doors": [
    {
     "raw": "西电梯门",
     "ref": true,
     "open": false,
     "axis": "x",
     "at": 10.2,
     "width": 1.1,
     "dir": "南",
     "to": "西电梯",
     "owner": "西电梯",
     "main": false,
     "glass": false,
     "refDir": null
    }
   ],
   "parent": null,
   "adj": [
    {
     "to": "南廊西段",
     "side": "北",
     "a": 8.4,
     "b": 12
    }
   ],
   "glass": [],
   "win": 0
  },
  {
   "floor": "2F",
   "name": "东电梯厅",
   "kind": "corridor",
   "shape": "rect",
   "x0": 57.6,
   "x1": 61.2,
   "y0": 2.8,
   "y1": 8.4,
   "area": 20.16,
   "doors": [
    {
     "raw": "东电梯门",
     "ref": true,
     "open": false,
     "axis": "x",
     "at": 59.4,
     "width": 1.1,
     "dir": "南",
     "to": "东电梯",
     "owner": "东电梯",
     "main": false,
     "glass": false,
     "refDir": null
    }
   ],
   "parent": null,
   "adj": [
    {
     "to": "南廊东段",
     "side": "北",
     "a": 57.6,
     "b": 61.2
    }
   ],
   "glass": [],
   "win": 0
  },
  {
   "floor": "2F",
   "name": "西画廊",
   "kind": "corridor",
   "shape": "rect",
   "x0": 8.4,
   "x1": 12,
   "y0": 12,
   "y1": 28.8,
   "area": 60.48,
   "doors": [
    {
     "raw": "地图室门",
     "ref": true,
     "open": false,
     "axis": "y",
     "at": 16.2,
     "width": 1.4,
     "dir": "西",
     "to": "地图室",
     "owner": "地图室",
     "main": false,
     "glass": false,
     "refDir": null
    },
    {
     "raw": "棋艺室门",
     "ref": true,
     "open": false,
     "axis": "y",
     "at": 24.6,
     "width": 1.4,
     "dir": "西",
     "to": "棋艺室",
     "owner": "棋艺室",
     "main": false,
     "glass": false,
     "refDir": null
    }
   ],
   "parent": null,
   "adj": [
    {
     "to": "南廊西段",
     "side": "南",
     "a": 8.4,
     "b": 12
    },
    {
     "to": "北廊西段",
     "side": "北",
     "a": 8.4,
     "b": 12
    }
   ],
   "glass": [
    {
     "to": "西院上空",
     "side": "东",
     "a": 12,
     "b": 28.8
    }
   ],
   "win": 0
  },
  {
   "floor": "2F",
   "name": "东肖像廊",
   "kind": "corridor",
   "shape": "rect",
   "x0": 57.6,
   "x1": 61.2,
   "y0": 12,
   "y1": 28.8,
   "area": 60.48,
   "doors": [
    {
     "raw": "标本陈列室门",
     "ref": true,
     "open": false,
     "axis": "y",
     "at": 20.4,
     "width": 1.6,
     "dir": "东",
     "to": "标本陈列室",
     "owner": "标本陈列室",
     "main": false,
     "glass": false,
     "refDir": null
    },
    {
     "raw": "标本陈列室门",
     "ref": true,
     "open": false,
     "axis": "y",
     "at": 27,
     "width": 1,
     "dir": "东",
     "to": "标本陈列室",
     "owner": "标本陈列室",
     "main": false,
     "glass": false,
     "refDir": null
    }
   ],
   "parent": null,
   "adj": [
    {
     "to": "南廊东段",
     "side": "南",
     "a": 57.6,
     "b": 61.2
    },
    {
     "to": "北廊东段",
     "side": "北",
     "a": 57.6,
     "b": 61.2
    }
   ],
   "glass": [
    {
     "to": "东院上空",
     "side": "西",
     "a": 12,
     "b": 28.8
    }
   ],
   "win": 0
  },
  {
   "floor": "2F",
   "name": "南廊西段",
   "kind": "corridor",
   "shape": "rect",
   "x0": 0,
   "x1": 26.4,
   "y0": 8.4,
   "y1": 12,
   "area": 95.04,
   "doors": [
    {
     "raw": "放映厅门",
     "ref": true,
     "open": false,
     "axis": "x",
     "at": 22.8,
     "width": 1.4,
     "dir": "南",
     "to": "放映厅",
     "owner": "放映厅",
     "main": false,
     "glass": false,
     "refDir": null
    },
    {
     "raw": "5号套房门",
     "ref": true,
     "open": false,
     "axis": "x",
     "at": 4.2,
     "width": 1,
     "dir": "南",
     "to": "5号套房",
     "owner": "5号套房",
     "main": false,
     "glass": false,
     "refDir": null
    }
   ],
   "parent": null,
   "adj": [
    {
     "to": "西电梯厅",
     "side": "南",
     "a": 8.4,
     "b": 12
    },
    {
     "to": "西画廊",
     "side": "北",
     "a": 8.4,
     "b": 12
    },
    {
     "to": "楼梯平台",
     "side": "东",
     "a": 8.4,
     "b": 12
    },
    {
     "to": "西内廊",
     "side": "北",
     "a": 22.8,
     "b": 26.4
    }
   ],
   "glass": [
    {
     "to": "西院上空",
     "side": "北",
     "a": 12,
     "b": 22.8
    }
   ],
   "win": 1
  },
  {
   "floor": "2F",
   "name": "南廊东段",
   "kind": "corridor",
   "shape": "rect",
   "x0": 43.2,
   "x1": 69.6,
   "y0": 8.4,
   "y1": 12,
   "area": 95.04,
   "doors": [
    {
     "raw": "游戏室门",
     "ref": true,
     "open": false,
     "axis": "x",
     "at": 46.8,
     "width": 1.4,
     "dir": "南",
     "to": "游戏室",
     "owner": "游戏室",
     "main": false,
     "glass": false,
     "refDir": null
    },
    {
     "raw": "8号套房门",
     "ref": true,
     "open": false,
     "axis": "x",
     "at": 65.4,
     "width": 1,
     "dir": "南",
     "to": "8号套房",
     "owner": "8号套房",
     "main": false,
     "glass": false,
     "refDir": null
    }
   ],
   "parent": null,
   "adj": [
    {
     "to": "东电梯厅",
     "side": "南",
     "a": 57.6,
     "b": 61.2
    },
    {
     "to": "东肖像廊",
     "side": "北",
     "a": 57.6,
     "b": 61.2
    },
    {
     "to": "楼梯平台",
     "side": "西",
     "a": 8.4,
     "b": 12
    },
    {
     "to": "东内廊",
     "side": "北",
     "a": 43.2,
     "b": 46.8
    }
   ],
   "glass": [
    {
     "to": "东院上空",
     "side": "北",
     "a": 46.8,
     "b": 57.6
    }
   ],
   "win": 1
  },
  {
   "floor": "2F",
   "name": "北廊西段",
   "kind": "corridor",
   "shape": "rect",
   "x0": 0,
   "x1": 26.4,
   "y0": 28.8,
   "y1": 32.4,
   "area": 95.04,
   "doors": [
    {
     "raw": "西北后楼梯门",
     "ref": true,
     "open": false,
     "axis": "x",
     "at": 10.2,
     "width": 1.4,
     "dir": "北",
     "to": "西北后楼梯",
     "owner": "西北后楼梯",
     "main": false,
     "glass": false,
     "refDir": null
    },
    {
     "raw": "阅览室门",
     "ref": true,
     "open": false,
     "axis": "x",
     "at": 17.4,
     "width": 1,
     "dir": "北",
     "to": "阅览室",
     "owner": "阅览室",
     "main": false,
     "glass": false,
     "refDir": null
    },
    {
     "raw": "6号套房门",
     "ref": true,
     "open": false,
     "axis": "x",
     "at": 4.2,
     "width": 1,
     "dir": "北",
     "to": "6号套房",
     "owner": "6号套房",
     "main": false,
     "glass": false,
     "refDir": null
    }
   ],
   "parent": null,
   "adj": [
    {
     "to": "西画廊",
     "side": "南",
     "a": 8.4,
     "b": 12
    },
    {
     "to": "北过厅",
     "side": "东",
     "a": 28.8,
     "b": 32.4
    },
    {
     "to": "西内廊",
     "side": "南",
     "a": 22.8,
     "b": 26.4
    }
   ],
   "glass": [
    {
     "to": "西院上空",
     "side": "南",
     "a": 12,
     "b": 22.8
    }
   ],
   "win": 1
  },
  {
   "floor": "2F",
   "name": "北过厅",
   "kind": "corridor",
   "shape": "rect",
   "x0": 26.4,
   "x1": 43.2,
   "y0": 28.8,
   "y1": 32.4,
   "area": 60.48,
   "doors": [
    {
     "raw": "大图书室门",
     "ref": true,
     "open": false,
     "axis": "x",
     "at": 34.8,
     "width": 1.6,
     "dir": "北",
     "to": "大图书室",
     "owner": "大图书室",
     "main": false,
     "glass": false,
     "refDir": null
    }
   ],
   "parent": null,
   "adj": [
    {
     "to": "北廊西段",
     "side": "西",
     "a": 28.8,
     "b": 32.4
    },
    {
     "to": "北廊东段",
     "side": "东",
     "a": 28.8,
     "b": 32.4
    },
    {
     "to": "穹顶回廊",
     "side": "南",
     "a": 26.4,
     "b": 43.2
    }
   ],
   "glass": [],
   "win": 0
  },
  {
   "floor": "2F",
   "name": "北廊东段",
   "kind": "corridor",
   "shape": "rect",
   "x0": 43.2,
   "x1": 69.6,
   "y0": 28.8,
   "y1": 32.4,
   "area": 95.04,
   "doors": [
    {
     "raw": "东北后楼梯门",
     "ref": true,
     "open": false,
     "axis": "x",
     "at": 59.4,
     "width": 1.4,
     "dir": "北",
     "to": "东北后楼梯",
     "owner": "东北后楼梯",
     "main": false,
     "glass": false,
     "refDir": null
    },
    {
     "raw": "二层起居室门",
     "ref": true,
     "open": false,
     "axis": "x",
     "at": 52.2,
     "width": 1.4,
     "dir": "北",
     "to": "二层起居室",
     "owner": "二层起居室",
     "main": false,
     "glass": false,
     "refDir": null
    },
    {
     "raw": "7号套房门",
     "ref": true,
     "open": false,
     "axis": "x",
     "at": 65.4,
     "width": 1,
     "dir": "北",
     "to": "7号套房",
     "owner": "7号套房",
     "main": false,
     "glass": false,
     "refDir": null
    }
   ],
   "parent": null,
   "adj": [
    {
     "to": "东肖像廊",
     "side": "南",
     "a": 57.6,
     "b": 61.2
    },
    {
     "to": "北过厅",
     "side": "西",
     "a": 28.8,
     "b": 32.4
    },
    {
     "to": "东内廊",
     "side": "南",
     "a": 43.2,
     "b": 46.8
    }
   ],
   "glass": [
    {
     "to": "东院上空",
     "side": "南",
     "a": 46.8,
     "b": 57.6
    }
   ],
   "win": 1
  },
  {
   "floor": "2F",
   "name": "西北后楼梯",
   "kind": "stair",
   "shape": "rect",
   "x0": 8.4,
   "x1": 12,
   "y0": 32.4,
   "y1": 40.8,
   "area": 30.24,
   "doors": [
    {
     "raw": "后楼梯门",
     "open": false,
     "axis": "x",
     "at": 10.2,
     "width": 1.4,
     "dir": "南",
     "to": "北廊西段",
     "main": false,
     "glass": false
    }
   ],
   "parent": null,
   "win": 1
  },
  {
   "floor": "2F",
   "name": "东北后楼梯",
   "kind": "stair",
   "shape": "rect",
   "x0": 57.6,
   "x1": 61.2,
   "y0": 32.4,
   "y1": 40.8,
   "area": 30.24,
   "doors": [
    {
     "raw": "后楼梯门",
     "open": false,
     "axis": "x",
     "at": 59.4,
     "width": 1.4,
     "dir": "南",
     "to": "北廊东段",
     "main": false,
     "glass": false
    }
   ],
   "parent": null,
   "win": 1
  },
  {
   "floor": "2F",
   "name": "楼梯平台",
   "kind": "landing",
   "shape": "rect",
   "x0": 26.4,
   "x1": 43.2,
   "y0": 8.4,
   "y1": 12,
   "area": 60.48,
   "doors": [],
   "parent": null,
   "over": "门厅",
   "adj": [
    {
     "to": "南廊西段",
     "side": "西",
     "a": 8.4,
     "b": 12
    },
    {
     "to": "南廊东段",
     "side": "东",
     "a": 8.4,
     "b": 12
    },
    {
     "to": "穹顶回廊",
     "side": "北",
     "a": 26.4,
     "b": 43.2
    }
   ],
   "rail": [
    {
     "to": "门厅上空",
     "side": "南",
     "a": 26.4,
     "b": 43.2
    }
   ],
   "win": 0
  },
  {
   "floor": "2F",
   "name": "门厅上空",
   "kind": "void",
   "shape": "rect",
   "x0": 26.4,
   "x1": 43.2,
   "y0": 0,
   "y1": 8.4,
   "area": 141.12,
   "doors": [],
   "parent": null,
   "over": "门厅",
   "glass": [],
   "rail": [
    {
     "to": "楼梯平台",
     "side": "北",
     "a": 26.4,
     "b": 43.2
    }
   ],
   "win": 0
  },
  {
   "floor": "2F",
   "name": "西内廊",
   "kind": "corridor",
   "shape": "rect",
   "x0": 22.8,
   "x1": 26.4,
   "y0": 12,
   "y1": 28.8,
   "area": 60.48,
   "doors": [],
   "parent": null,
   "over": "花园",
   "adj": [
    {
     "to": "南廊西段",
     "side": "南",
     "a": 22.8,
     "b": 26.4
    },
    {
     "to": "北廊西段",
     "side": "北",
     "a": 22.8,
     "b": 26.4
    },
    {
     "to": "穹顶回廊",
     "side": "东",
     "a": 12,
     "b": 28.8
    }
   ],
   "glass": [
    {
     "to": "西院上空",
     "side": "西",
     "a": 12,
     "b": 28.8
    }
   ],
   "win": 0
  },
  {
   "floor": "2F",
   "name": "东内廊",
   "kind": "corridor",
   "shape": "rect",
   "x0": 43.2,
   "x1": 46.8,
   "y0": 12,
   "y1": 28.8,
   "area": 60.48,
   "doors": [],
   "parent": null,
   "over": "自然史大厅",
   "adj": [
    {
     "to": "南廊东段",
     "side": "南",
     "a": 43.2,
     "b": 46.8
    },
    {
     "to": "北廊东段",
     "side": "北",
     "a": 43.2,
     "b": 46.8
    },
    {
     "to": "穹顶回廊",
     "side": "西",
     "a": 12,
     "b": 28.8
    }
   ],
   "glass": [
    {
     "to": "东院上空",
     "side": "东",
     "a": 12,
     "b": 28.8
    }
   ],
   "win": 0
  },
  {
   "floor": "2F",
   "name": "西院上空",
   "kind": "void",
   "shape": "rect",
   "x0": 12,
   "x1": 22.8,
   "y0": 12,
   "y1": 28.8,
   "area": 181.44,
   "doors": [],
   "parent": null,
   "over": "花园",
   "glass": [
    {
     "to": "西画廊",
     "side": "西",
     "a": 12,
     "b": 28.8
    },
    {
     "to": "南廊西段",
     "side": "南",
     "a": 12,
     "b": 22.8
    },
    {
     "to": "北廊西段",
     "side": "北",
     "a": 12,
     "b": 22.8
    },
    {
     "to": "西内廊",
     "side": "东",
     "a": 12,
     "b": 28.8
    }
   ],
   "win": 0
  },
  {
   "floor": "2F",
   "name": "东院上空",
   "kind": "void",
   "shape": "rect",
   "x0": 46.8,
   "x1": 57.6,
   "y0": 12,
   "y1": 28.8,
   "area": 181.44,
   "doors": [],
   "parent": null,
   "over": "自然史大厅",
   "glass": [
    {
     "to": "东肖像廊",
     "side": "东",
     "a": 12,
     "b": 28.8
    },
    {
     "to": "南廊东段",
     "side": "南",
     "a": 46.8,
     "b": 57.6
    },
    {
     "to": "北廊东段",
     "side": "北",
     "a": 46.8,
     "b": 57.6
    },
    {
     "to": "东内廊",
     "side": "西",
     "a": 12,
     "b": 28.8
    }
   ],
   "win": 0
  },
  {
   "floor": "2F",
   "name": "穹顶回廊",
   "kind": "gallery",
   "shape": "ring",
   "x0": 26.4,
   "x1": 43.2,
   "y0": 12,
   "y1": 28.8,
   "area": 91.11,
   "doors": [],
   "parent": null,
   "cx": 34.8,
   "cy": 20.4,
   "hole": 7.8,
   "adj": [
    {
     "to": "北过厅",
     "side": "北",
     "a": 26.4,
     "b": 43.2
    },
    {
     "to": "楼梯平台",
     "side": "南",
     "a": 26.4,
     "b": 43.2
    },
    {
     "to": "西内廊",
     "side": "西",
     "a": 12,
     "b": 28.8
    },
    {
     "to": "东内廊",
     "side": "东",
     "a": 12,
     "b": 28.8
    }
   ],
   "win": 0
  },
  {
   "floor": "2F",
   "name": "放映厅",
   "kind": "room",
   "x0": 12,
   "x1": 26.4,
   "y0": 0,
   "y1": 8.4,
   "shape": "rect",
   "area": 121,
   "areaNet": false,
   "netW": 14.16,
   "netH": 8.28,
   "doors": [
    {
     "raw": "北门 x=22.8，宽1.4，通南廊西段",
     "open": false,
     "axis": "x",
     "at": 22.8,
     "width": 1.4,
     "dir": "北",
     "to": "南廊西段",
     "main": false,
     "glass": false
    }
   ],
   "parent": null,
   "win": 0
  },
  {
   "floor": "2F",
   "name": "游戏室",
   "kind": "room",
   "x0": 43.2,
   "x1": 57.6,
   "y0": 0,
   "y1": 8.4,
   "shape": "rect",
   "area": 121,
   "areaNet": false,
   "netW": 14.16,
   "netH": 8.28,
   "doors": [
    {
     "raw": "北门 x=46.8，宽1.4，通南廊东段",
     "open": false,
     "axis": "x",
     "at": 46.8,
     "width": 1.4,
     "dir": "北",
     "to": "南廊东段",
     "main": false,
     "glass": false
    }
   ],
   "parent": null,
   "win": 2
  },
  {
   "floor": "2F",
   "name": "地图室",
   "kind": "room",
   "x0": 0,
   "x1": 8.4,
   "y0": 12,
   "y1": 20.4,
   "shape": "rect",
   "area": 70.6,
   "areaNet": false,
   "netW": 8.28,
   "netH": 8.16,
   "doors": [
    {
     "raw": "东门 y=16.2，宽1.4，通西画廊",
     "open": false,
     "axis": "y",
     "at": 16.2,
     "width": 1.4,
     "dir": "东",
     "to": "西画廊",
     "main": false,
     "glass": false
    }
   ],
   "parent": null,
   "win": 1
  },
  {
   "floor": "2F",
   "name": "棋艺室",
   "kind": "room",
   "x0": 0,
   "x1": 8.4,
   "y0": 20.4,
   "y1": 28.8,
   "shape": "rect",
   "area": 70.6,
   "areaNet": false,
   "netW": 8.28,
   "netH": 8.16,
   "doors": [
    {
     "raw": "东门 y=24.6，宽1.4，通西画廊",
     "open": false,
     "axis": "y",
     "at": 24.6,
     "width": 1.4,
     "dir": "东",
     "to": "西画廊",
     "main": false,
     "glass": false
    }
   ],
   "parent": null,
   "win": 1
  },
  {
   "floor": "2F",
   "name": "标本陈列室",
   "kind": "room",
   "x0": 61.2,
   "x1": 69.6,
   "y0": 12,
   "y1": 28.8,
   "shape": "rect",
   "area": 141.1,
   "areaNet": false,
   "netW": 8.28,
   "netH": 16.56,
   "doors": [
    {
     "raw": "西门 y=20.4，宽1.6，通东肖像廊",
     "open": false,
     "axis": "y",
     "at": 20.4,
     "width": 1.6,
     "dir": "西",
     "to": "东肖像廊",
     "main": false,
     "glass": false
    },
    {
     "raw": "西门 y=27，宽1，通东肖像廊",
     "open": false,
     "axis": "y",
     "at": 27,
     "width": 1,
     "dir": "西",
     "to": "东肖像廊",
     "main": false,
     "glass": false
    }
   ],
   "parent": null,
   "win": 2
  },
  {
   "floor": "2F",
   "name": "阅览室",
   "kind": "room",
   "x0": 12,
   "x1": 26.4,
   "y0": 32.4,
   "y1": 40.8,
   "shape": "rect",
   "area": 121,
   "areaNet": false,
   "netW": 14.16,
   "netH": 8.28,
   "doors": [
    {
     "raw": "南门 x=17.4，宽1，通北廊西段",
     "open": false,
     "axis": "x",
     "at": 17.4,
     "width": 1,
     "dir": "南",
     "to": "北廊西段",
     "main": false,
     "glass": false
    },
    {
     "raw": "大图书室门",
     "ref": true,
     "open": false,
     "axis": "y",
     "at": 37.8,
     "width": 1,
     "dir": "东",
     "refDir": null,
     "to": "大图书室",
     "glass": false,
     "owner": "大图书室"
    }
   ],
   "parent": null,
   "win": 3
  },
  {
   "floor": "2F",
   "name": "大图书室",
   "kind": "room",
   "x0": 26.4,
   "x1": 43.2,
   "y0": 32.4,
   "y1": 40.8,
   "shape": "rect",
   "area": 141.1,
   "areaNet": false,
   "netW": 16.56,
   "netH": 8.28,
   "doors": [
    {
     "raw": "南门 x=34.8，宽1.6，通北过厅",
     "open": false,
     "axis": "x",
     "at": 34.8,
     "width": 1.6,
     "dir": "南",
     "to": "北过厅",
     "main": false,
     "glass": false
    },
    {
     "raw": "西门 y=37.8，宽1，通阅览室",
     "open": false,
     "axis": "y",
     "at": 37.8,
     "width": 1,
     "dir": "西",
     "to": "阅览室",
     "main": false,
     "glass": false
    },
    {
     "raw": "二层起居室门",
     "ref": true,
     "open": false,
     "axis": "y",
     "at": 37.8,
     "width": 1,
     "dir": "东",
     "refDir": null,
     "to": "二层起居室",
     "glass": false,
     "owner": "二层起居室"
    }
   ],
   "parent": null,
   "win": 3
  },
  {
   "floor": "2F",
   "name": "二层起居室",
   "kind": "room",
   "x0": 43.2,
   "x1": 57.6,
   "y0": 32.4,
   "y1": 40.8,
   "shape": "rect",
   "area": 121,
   "areaNet": false,
   "netW": 14.16,
   "netH": 8.28,
   "doors": [
    {
     "raw": "南门 x=52.2，宽1.4，通北廊东段",
     "open": false,
     "axis": "x",
     "at": 52.2,
     "width": 1.4,
     "dir": "南",
     "to": "北廊东段",
     "main": false,
     "glass": false
    },
    {
     "raw": "西门 y=37.8，宽1，通大图书室",
     "open": false,
     "axis": "y",
     "at": 37.8,
     "width": 1,
     "dir": "西",
     "to": "大图书室",
     "main": false,
     "glass": false
    }
   ],
   "parent": null,
   "win": 3
  },
  {
   "floor": "2F",
   "name": "5号套房",
   "kind": "suite",
   "x0": 0,
   "x1": 8.4,
   "y0": 0,
   "y1": 8.4,
   "shape": "rect",
   "area": 70.6,
   "areaNet": false,
   "netW": 8.16,
   "netH": 8.16,
   "suite": 5,
   "doors": [
    {
     "raw": "北门 x=4.2，宽1，通南廊西段",
     "open": false,
     "axis": "x",
     "at": 4.2,
     "width": 1,
     "dir": "北",
     "to": "南廊西段",
     "main": false,
     "glass": false
    }
   ],
   "parent": null,
   "win": 1
  },
  {
   "floor": "2F",
   "name": "6号套房",
   "kind": "suite",
   "x0": 0,
   "x1": 8.4,
   "y0": 32.4,
   "y1": 40.8,
   "shape": "rect",
   "area": 70.6,
   "areaNet": false,
   "netW": 8.16,
   "netH": 8.16,
   "suite": 6,
   "doors": [
    {
     "raw": "南门 x=4.2，宽1，通北廊西段",
     "open": false,
     "axis": "x",
     "at": 4.2,
     "width": 1,
     "dir": "南",
     "to": "北廊西段",
     "main": false,
     "glass": false
    }
   ],
   "parent": null,
   "win": 1
  },
  {
   "floor": "2F",
   "name": "7号套房",
   "kind": "suite",
   "x0": 61.2,
   "x1": 69.6,
   "y0": 32.4,
   "y1": 40.8,
   "shape": "rect",
   "area": 70.6,
   "areaNet": false,
   "netW": 8.16,
   "netH": 8.16,
   "suite": 7,
   "doors": [
    {
     "raw": "南门 x=65.4，宽1，通北廊东段",
     "open": false,
     "axis": "x",
     "at": 65.4,
     "width": 1,
     "dir": "南",
     "to": "北廊东段",
     "main": false,
     "glass": false
    }
   ],
   "parent": null,
   "win": 1
  },
  {
   "floor": "2F",
   "name": "8号套房",
   "kind": "suite",
   "x0": 61.2,
   "x1": 69.6,
   "y0": 0,
   "y1": 8.4,
   "shape": "rect",
   "area": 70.6,
   "areaNet": false,
   "netW": 8.16,
   "netH": 8.16,
   "suite": 8,
   "doors": [
    {
     "raw": "北门 x=65.4，宽1，通南廊东段",
     "open": false,
     "axis": "x",
     "at": 65.4,
     "width": 1,
     "dir": "北",
     "to": "南廊东段",
     "main": false,
     "glass": false
    }
   ],
   "parent": null,
   "win": 1
  },
  {
   "floor": "3F",
   "name": "西电梯",
   "kind": "elevator",
   "shape": "rect",
   "x0": 9,
   "x1": 11.4,
   "y0": 0,
   "y1": 2.8,
   "area": 6.72,
   "doors": [
    {
     "raw": "电梯门",
     "open": false,
     "axis": "x",
     "at": 10.2,
     "width": 1.1,
     "dir": "北",
     "to": "西电梯厅",
     "main": false,
     "glass": false
    }
   ],
   "parent": null,
   "win": 0
  },
  {
   "floor": "3F",
   "name": "东电梯",
   "kind": "elevator",
   "shape": "rect",
   "x0": 58.2,
   "x1": 60.6,
   "y0": 0,
   "y1": 2.8,
   "area": 6.72,
   "doors": [
    {
     "raw": "电梯门",
     "open": false,
     "axis": "x",
     "at": 59.4,
     "width": 1.1,
     "dir": "北",
     "to": "东电梯厅",
     "main": false,
     "glass": false
    }
   ],
   "parent": null,
   "win": 0
  },
  {
   "floor": "3F",
   "name": "西电梯厅",
   "kind": "corridor",
   "shape": "rect",
   "x0": 8.4,
   "x1": 12,
   "y0": 2.8,
   "y1": 8.4,
   "area": 20.16,
   "doors": [
    {
     "raw": "西电梯门",
     "ref": true,
     "open": false,
     "axis": "x",
     "at": 10.2,
     "width": 1.1,
     "dir": "南",
     "to": "西电梯",
     "owner": "西电梯",
     "main": false,
     "glass": false,
     "refDir": null
    }
   ],
   "parent": null,
   "adj": [
    {
     "to": "南廊西段",
     "side": "北",
     "a": 8.4,
     "b": 12
    }
   ],
   "glass": [],
   "win": 0
  },
  {
   "floor": "3F",
   "name": "东电梯厅",
   "kind": "corridor",
   "shape": "rect",
   "x0": 57.6,
   "x1": 61.2,
   "y0": 2.8,
   "y1": 8.4,
   "area": 20.16,
   "doors": [
    {
     "raw": "东电梯门",
     "ref": true,
     "open": false,
     "axis": "x",
     "at": 59.4,
     "width": 1.1,
     "dir": "南",
     "to": "东电梯",
     "owner": "东电梯",
     "main": false,
     "glass": false,
     "refDir": null
    }
   ],
   "parent": null,
   "adj": [
    {
     "to": "南廊东段",
     "side": "北",
     "a": 57.6,
     "b": 61.2
    }
   ],
   "glass": [],
   "win": 0
  },
  {
   "floor": "3F",
   "name": "西园廊",
   "kind": "corridor",
   "shape": "rect",
   "x0": 8.4,
   "x1": 12,
   "y0": 12,
   "y1": 28.8,
   "area": 60.48,
   "doors": [
    {
     "raw": "瓷器室门",
     "ref": true,
     "open": false,
     "axis": "y",
     "at": 16.2,
     "width": 1.4,
     "dir": "西",
     "to": "瓷器室",
     "owner": "瓷器室",
     "main": false,
     "glass": false,
     "refDir": null
    },
    {
     "raw": "修复室门",
     "ref": true,
     "open": false,
     "axis": "y",
     "at": 26.4,
     "width": 1,
     "dir": "西",
     "to": "修复室",
     "owner": "修复室",
     "main": false,
     "glass": false,
     "refDir": null
    }
   ],
   "parent": null,
   "adj": [
    {
     "to": "南廊西段",
     "side": "南",
     "a": 8.4,
     "b": 12
    },
    {
     "to": "北廊西段",
     "side": "北",
     "a": 8.4,
     "b": 12
    }
   ],
   "glass": [
    {
     "to": "西院上空",
     "side": "东",
     "a": 12,
     "b": 28.8
    }
   ],
   "win": 0
  },
  {
   "floor": "3F",
   "name": "东陶瓷廊",
   "kind": "corridor",
   "shape": "rect",
   "x0": 57.6,
   "x1": 61.2,
   "y0": 12,
   "y1": 28.8,
   "area": 60.48,
   "doors": [
    {
     "raw": "天象室门",
     "ref": true,
     "open": false,
     "axis": "y",
     "at": 16.2,
     "width": 1.4,
     "dir": "东",
     "to": "天象室",
     "owner": "天象室",
     "main": false,
     "glass": false,
     "refDir": null
    },
    {
     "raw": "三层起居室门",
     "ref": true,
     "open": false,
     "axis": "y",
     "at": 24.6,
     "width": 1.4,
     "dir": "东",
     "to": "三层起居室",
     "owner": "三层起居室",
     "main": false,
     "glass": false,
     "refDir": null
    }
   ],
   "parent": null,
   "adj": [
    {
     "to": "南廊东段",
     "side": "南",
     "a": 57.6,
     "b": 61.2
    },
    {
     "to": "北廊东段",
     "side": "北",
     "a": 57.6,
     "b": 61.2
    }
   ],
   "glass": [
    {
     "to": "东院上空",
     "side": "西",
     "a": 12,
     "b": 28.8
    }
   ],
   "win": 0
  },
  {
   "floor": "3F",
   "name": "南廊西段",
   "kind": "corridor",
   "shape": "rect",
   "x0": 0,
   "x1": 26.4,
   "y0": 8.4,
   "y1": 12,
   "area": 95.04,
   "doors": [
    {
     "raw": "舞蹈室门",
     "ref": true,
     "open": false,
     "axis": "x",
     "at": 22.8,
     "width": 1.4,
     "dir": "南",
     "to": "舞蹈室",
     "owner": "舞蹈室",
     "main": false,
     "glass": false,
     "refDir": null
    },
    {
     "raw": "9号套房门",
     "ref": true,
     "open": false,
     "axis": "x",
     "at": 4.2,
     "width": 1,
     "dir": "南",
     "to": "9号套房",
     "owner": "9号套房",
     "main": false,
     "glass": false,
     "refDir": null
    }
   ],
   "parent": null,
   "adj": [
    {
     "to": "西电梯厅",
     "side": "南",
     "a": 8.4,
     "b": 12
    },
    {
     "to": "西园廊",
     "side": "北",
     "a": 8.4,
     "b": 12
    },
    {
     "to": "楼梯平台",
     "side": "东",
     "a": 8.4,
     "b": 12
    },
    {
     "to": "西内廊",
     "side": "北",
     "a": 22.8,
     "b": 26.4
    }
   ],
   "glass": [
    {
     "to": "西院上空",
     "side": "北",
     "a": 12,
     "b": 22.8
    }
   ],
   "win": 1
  },
  {
   "floor": "3F",
   "name": "南廊东段",
   "kind": "corridor",
   "shape": "rect",
   "x0": 43.2,
   "x1": 69.6,
   "y0": 8.4,
   "y1": 12,
   "area": 95.04,
   "doors": [
    {
     "raw": "茶室门",
     "ref": true,
     "open": false,
     "axis": "x",
     "at": 46.8,
     "width": 1.4,
     "dir": "南",
     "to": "茶室",
     "owner": "茶室",
     "main": false,
     "glass": false,
     "refDir": null
    },
    {
     "raw": "12号套房门",
     "ref": true,
     "open": false,
     "axis": "x",
     "at": 65.4,
     "width": 1,
     "dir": "南",
     "to": "12号套房",
     "owner": "12号套房",
     "main": false,
     "glass": false,
     "refDir": null
    }
   ],
   "parent": null,
   "adj": [
    {
     "to": "东电梯厅",
     "side": "南",
     "a": 57.6,
     "b": 61.2
    },
    {
     "to": "东陶瓷廊",
     "side": "北",
     "a": 57.6,
     "b": 61.2
    },
    {
     "to": "楼梯平台",
     "side": "西",
     "a": 8.4,
     "b": 12
    },
    {
     "to": "东内廊",
     "side": "北",
     "a": 43.2,
     "b": 46.8
    }
   ],
   "glass": [
    {
     "to": "东院上空",
     "side": "北",
     "a": 46.8,
     "b": 57.6
    }
   ],
   "win": 1
  },
  {
   "floor": "3F",
   "name": "北廊西段",
   "kind": "corridor",
   "shape": "rect",
   "x0": 0,
   "x1": 26.4,
   "y0": 28.8,
   "y1": 32.4,
   "area": 95.04,
   "doors": [
    {
     "raw": "西北后楼梯门",
     "ref": true,
     "open": false,
     "axis": "x",
     "at": 10.2,
     "width": 1.4,
     "dir": "北",
     "to": "西北后楼梯",
     "owner": "西北后楼梯",
     "main": false,
     "glass": false,
     "refDir": null
    },
    {
     "raw": "画室门",
     "ref": true,
     "open": false,
     "axis": "x",
     "at": 17.4,
     "width": 1,
     "dir": "北",
     "to": "画室",
     "owner": "画室",
     "main": false,
     "glass": false,
     "refDir": null
    },
    {
     "raw": "10号套房门",
     "ref": true,
     "open": false,
     "axis": "x",
     "at": 4.2,
     "width": 1,
     "dir": "北",
     "to": "10号套房",
     "owner": "10号套房",
     "main": false,
     "glass": false,
     "refDir": null
    }
   ],
   "parent": null,
   "adj": [
    {
     "to": "西园廊",
     "side": "南",
     "a": 8.4,
     "b": 12
    },
    {
     "to": "北过厅",
     "side": "东",
     "a": 28.8,
     "b": 32.4
    },
    {
     "to": "西内廊",
     "side": "南",
     "a": 22.8,
     "b": 26.4
    }
   ],
   "glass": [
    {
     "to": "西院上空",
     "side": "南",
     "a": 12,
     "b": 22.8
    }
   ],
   "win": 1
  },
  {
   "floor": "3F",
   "name": "北过厅",
   "kind": "corridor",
   "shape": "rect",
   "x0": 26.4,
   "x1": 43.2,
   "y0": 28.8,
   "y1": 32.4,
   "area": 60.48,
   "doors": [
    {
     "raw": "画室门",
     "ref": true,
     "open": false,
     "axis": "x",
     "at": 28.5,
     "width": 1,
     "dir": "北",
     "to": "画室",
     "owner": "画室",
     "main": false,
     "glass": false,
     "refDir": null
    },
    {
     "raw": "猎藏厅门",
     "ref": true,
     "open": false,
     "axis": "x",
     "at": 41.1,
     "width": 1,
     "dir": "北",
     "to": "猎藏厅",
     "owner": "猎藏厅",
     "main": false,
     "glass": false,
     "refDir": null
    },
    {
     "raw": "13号套房门",
     "ref": true,
     "open": false,
     "axis": "x",
     "at": 34.8,
     "width": 1,
     "dir": "北",
     "to": "13号套房",
     "owner": "13号套房",
     "main": false,
     "glass": false,
     "refDir": null
    }
   ],
   "parent": null,
   "adj": [
    {
     "to": "北廊西段",
     "side": "西",
     "a": 28.8,
     "b": 32.4
    },
    {
     "to": "北廊东段",
     "side": "东",
     "a": 28.8,
     "b": 32.4
    },
    {
     "to": "穹顶回廊",
     "side": "南",
     "a": 26.4,
     "b": 43.2
    }
   ],
   "glass": [],
   "win": 0
  },
  {
   "floor": "3F",
   "name": "北廊东段",
   "kind": "corridor",
   "shape": "rect",
   "x0": 43.2,
   "x1": 69.6,
   "y0": 28.8,
   "y1": 32.4,
   "area": 95.04,
   "doors": [
    {
     "raw": "东北后楼梯门",
     "ref": true,
     "open": false,
     "axis": "x",
     "at": 59.4,
     "width": 1.4,
     "dir": "北",
     "to": "东北后楼梯",
     "owner": "东北后楼梯",
     "main": false,
     "glass": false,
     "refDir": null
    },
    {
     "raw": "猎藏厅门",
     "ref": true,
     "open": false,
     "axis": "x",
     "at": 52.2,
     "width": 1.6,
     "dir": "北",
     "to": "猎藏厅",
     "owner": "猎藏厅",
     "main": false,
     "glass": false,
     "refDir": null
    },
    {
     "raw": "11号套房门",
     "ref": true,
     "open": false,
     "axis": "x",
     "at": 65.4,
     "width": 1,
     "dir": "北",
     "to": "11号套房",
     "owner": "11号套房",
     "main": false,
     "glass": false,
     "refDir": null
    }
   ],
   "parent": null,
   "adj": [
    {
     "to": "东陶瓷廊",
     "side": "南",
     "a": 57.6,
     "b": 61.2
    },
    {
     "to": "北过厅",
     "side": "西",
     "a": 28.8,
     "b": 32.4
    },
    {
     "to": "东内廊",
     "side": "南",
     "a": 43.2,
     "b": 46.8
    }
   ],
   "glass": [
    {
     "to": "东院上空",
     "side": "南",
     "a": 46.8,
     "b": 57.6
    }
   ],
   "win": 1
  },
  {
   "floor": "3F",
   "name": "西北后楼梯",
   "kind": "stair",
   "shape": "rect",
   "x0": 8.4,
   "x1": 12,
   "y0": 32.4,
   "y1": 40.8,
   "area": 30.24,
   "doors": [
    {
     "raw": "后楼梯门",
     "open": false,
     "axis": "x",
     "at": 10.2,
     "width": 1.4,
     "dir": "南",
     "to": "北廊西段",
     "main": false,
     "glass": false
    }
   ],
   "parent": null,
   "win": 1
  },
  {
   "floor": "3F",
   "name": "东北后楼梯",
   "kind": "stair",
   "shape": "rect",
   "x0": 57.6,
   "x1": 61.2,
   "y0": 32.4,
   "y1": 40.8,
   "area": 30.24,
   "doors": [
    {
     "raw": "后楼梯门",
     "open": false,
     "axis": "x",
     "at": 59.4,
     "width": 1.4,
     "dir": "南",
     "to": "北廊东段",
     "main": false,
     "glass": false
    }
   ],
   "parent": null,
   "win": 1
  },
  {
   "floor": "3F",
   "name": "楼梯平台",
   "kind": "landing",
   "shape": "rect",
   "x0": 26.4,
   "x1": 43.2,
   "y0": 8.4,
   "y1": 12,
   "area": 60.48,
   "doors": [],
   "parent": null,
   "over": "门厅",
   "adj": [
    {
     "to": "南廊西段",
     "side": "西",
     "a": 8.4,
     "b": 12
    },
    {
     "to": "南廊东段",
     "side": "东",
     "a": 8.4,
     "b": 12
    },
    {
     "to": "穹顶回廊",
     "side": "北",
     "a": 26.4,
     "b": 43.2
    }
   ],
   "rail": [
    {
     "to": "门厅上空",
     "side": "南",
     "a": 26.4,
     "b": 43.2
    }
   ],
   "win": 0
  },
  {
   "floor": "3F",
   "name": "门厅上空",
   "kind": "void",
   "shape": "rect",
   "x0": 26.4,
   "x1": 43.2,
   "y0": 0,
   "y1": 8.4,
   "area": 141.12,
   "doors": [],
   "parent": null,
   "over": "门厅",
   "glass": [],
   "rail": [
    {
     "to": "楼梯平台",
     "side": "北",
     "a": 26.4,
     "b": 43.2
    }
   ],
   "win": 0
  },
  {
   "floor": "3F",
   "name": "西内廊",
   "kind": "corridor",
   "shape": "rect",
   "x0": 22.8,
   "x1": 26.4,
   "y0": 12,
   "y1": 28.8,
   "area": 60.48,
   "doors": [],
   "parent": null,
   "over": "花园",
   "adj": [
    {
     "to": "南廊西段",
     "side": "南",
     "a": 22.8,
     "b": 26.4
    },
    {
     "to": "北廊西段",
     "side": "北",
     "a": 22.8,
     "b": 26.4
    },
    {
     "to": "穹顶回廊",
     "side": "东",
     "a": 12,
     "b": 28.8
    }
   ],
   "glass": [
    {
     "to": "西院上空",
     "side": "西",
     "a": 12,
     "b": 28.8
    }
   ],
   "win": 0
  },
  {
   "floor": "3F",
   "name": "东内廊",
   "kind": "corridor",
   "shape": "rect",
   "x0": 43.2,
   "x1": 46.8,
   "y0": 12,
   "y1": 28.8,
   "area": 60.48,
   "doors": [],
   "parent": null,
   "over": "自然史大厅",
   "adj": [
    {
     "to": "南廊东段",
     "side": "南",
     "a": 43.2,
     "b": 46.8
    },
    {
     "to": "北廊东段",
     "side": "北",
     "a": 43.2,
     "b": 46.8
    },
    {
     "to": "穹顶回廊",
     "side": "西",
     "a": 12,
     "b": 28.8
    }
   ],
   "glass": [
    {
     "to": "东院上空",
     "side": "东",
     "a": 12,
     "b": 28.8
    }
   ],
   "win": 0
  },
  {
   "floor": "3F",
   "name": "西院上空",
   "kind": "void",
   "shape": "rect",
   "x0": 12,
   "x1": 22.8,
   "y0": 12,
   "y1": 28.8,
   "area": 181.44,
   "doors": [],
   "parent": null,
   "over": "花园",
   "glass": [
    {
     "to": "西园廊",
     "side": "西",
     "a": 12,
     "b": 28.8
    },
    {
     "to": "南廊西段",
     "side": "南",
     "a": 12,
     "b": 22.8
    },
    {
     "to": "北廊西段",
     "side": "北",
     "a": 12,
     "b": 22.8
    },
    {
     "to": "西内廊",
     "side": "东",
     "a": 12,
     "b": 28.8
    }
   ],
   "win": 0
  },
  {
   "floor": "3F",
   "name": "东院上空",
   "kind": "void",
   "shape": "rect",
   "x0": 46.8,
   "x1": 57.6,
   "y0": 12,
   "y1": 28.8,
   "area": 181.44,
   "doors": [],
   "parent": null,
   "over": "自然史大厅",
   "glass": [
    {
     "to": "东陶瓷廊",
     "side": "东",
     "a": 12,
     "b": 28.8
    },
    {
     "to": "南廊东段",
     "side": "南",
     "a": 46.8,
     "b": 57.6
    },
    {
     "to": "北廊东段",
     "side": "北",
     "a": 46.8,
     "b": 57.6
    },
    {
     "to": "东内廊",
     "side": "西",
     "a": 12,
     "b": 28.8
    }
   ],
   "win": 0
  },
  {
   "floor": "3F",
   "name": "穹顶回廊",
   "kind": "gallery",
   "shape": "ring",
   "x0": 26.4,
   "x1": 43.2,
   "y0": 12,
   "y1": 28.8,
   "area": 91.11,
   "doors": [],
   "parent": null,
   "cx": 34.8,
   "cy": 20.4,
   "hole": 7.8,
   "adj": [
    {
     "to": "北过厅",
     "side": "北",
     "a": 26.4,
     "b": 43.2
    },
    {
     "to": "楼梯平台",
     "side": "南",
     "a": 26.4,
     "b": 43.2
    },
    {
     "to": "西内廊",
     "side": "西",
     "a": 12,
     "b": 28.8
    },
    {
     "to": "东内廊",
     "side": "东",
     "a": 12,
     "b": 28.8
    }
   ],
   "win": 0
  },
  {
   "floor": "3F",
   "name": "舞蹈室",
   "kind": "room",
   "x0": 12,
   "x1": 26.4,
   "y0": 0,
   "y1": 8.4,
   "shape": "rect",
   "area": 121,
   "areaNet": false,
   "netW": 14.16,
   "netH": 8.28,
   "doors": [
    {
     "raw": "北门 x=22.8，宽1.4，通南廊西段",
     "open": false,
     "axis": "x",
     "at": 22.8,
     "width": 1.4,
     "dir": "北",
     "to": "南廊西段",
     "main": false,
     "glass": false
    }
   ],
   "parent": null,
   "win": 2
  },
  {
   "floor": "3F",
   "name": "茶室",
   "kind": "room",
   "x0": 43.2,
   "x1": 57.6,
   "y0": 0,
   "y1": 8.4,
   "shape": "rect",
   "area": 121,
   "areaNet": false,
   "netW": 14.16,
   "netH": 8.28,
   "doors": [
    {
     "raw": "北门 x=46.8，宽1.4，通南廊东段",
     "open": false,
     "axis": "x",
     "at": 46.8,
     "width": 1.4,
     "dir": "北",
     "to": "南廊东段",
     "main": false,
     "glass": false
    }
   ],
   "parent": null,
   "win": 2
  },
  {
   "floor": "3F",
   "name": "瓷器室",
   "kind": "room",
   "x0": 0,
   "x1": 8.4,
   "y0": 12,
   "y1": 20.4,
   "shape": "rect",
   "area": 70.6,
   "areaNet": false,
   "netW": 8.28,
   "netH": 8.16,
   "doors": [
    {
     "raw": "东门 y=16.2，宽1.4，通西园廊",
     "open": false,
     "axis": "y",
     "at": 16.2,
     "width": 1.4,
     "dir": "东",
     "to": "西园廊",
     "main": false,
     "glass": false
    }
   ],
   "parent": null,
   "win": 1
  },
  {
   "floor": "3F",
   "name": "修复室",
   "kind": "room",
   "x0": 0,
   "x1": 8.4,
   "y0": 20.4,
   "y1": 28.8,
   "shape": "rect",
   "area": 70.6,
   "areaNet": false,
   "netW": 8.28,
   "netH": 8.16,
   "doors": [
    {
     "raw": "东门 y=26.4，宽1，通西园廊",
     "open": false,
     "axis": "y",
     "at": 26.4,
     "width": 1,
     "dir": "东",
     "to": "西园廊",
     "main": false,
     "glass": false
    }
   ],
   "parent": null,
   "win": 1
  },
  {
   "floor": "3F",
   "name": "天象室",
   "kind": "room",
   "x0": 61.2,
   "x1": 69.6,
   "y0": 12,
   "y1": 20.4,
   "shape": "rect",
   "area": 70.6,
   "areaNet": false,
   "netW": 8.28,
   "netH": 8.16,
   "doors": [
    {
     "raw": "西门 y=16.2，宽1.4，通东陶瓷廊",
     "open": false,
     "axis": "y",
     "at": 16.2,
     "width": 1.4,
     "dir": "西",
     "to": "东陶瓷廊",
     "main": false,
     "glass": false
    }
   ],
   "parent": null,
   "win": 1
  },
  {
   "floor": "3F",
   "name": "三层起居室",
   "kind": "room",
   "x0": 61.2,
   "x1": 69.6,
   "y0": 20.4,
   "y1": 28.8,
   "shape": "rect",
   "area": 70.6,
   "areaNet": false,
   "netW": 8.28,
   "netH": 8.16,
   "doors": [
    {
     "raw": "西门 y=24.6，宽1.4，通东陶瓷廊",
     "open": false,
     "axis": "y",
     "at": 24.6,
     "width": 1.4,
     "dir": "西",
     "to": "东陶瓷廊",
     "main": false,
     "glass": false
    }
   ],
   "parent": null,
   "win": 1
  },
  {
   "floor": "3F",
   "name": "画室",
   "kind": "room",
   "x0": 12,
   "x1": 30.6,
   "y0": 32.4,
   "y1": 40.8,
   "shape": "rect",
   "area": 156.2,
   "areaNet": false,
   "netW": 18.36,
   "netH": 8.28,
   "doors": [
    {
     "raw": "南门 x=17.4，宽1，通北廊西段",
     "open": false,
     "axis": "x",
     "at": 17.4,
     "width": 1,
     "dir": "南",
     "to": "北廊西段",
     "main": false,
     "glass": false
    },
    {
     "raw": "南门 x=28.5，宽1，通北过厅",
     "open": false,
     "axis": "x",
     "at": 28.5,
     "width": 1,
     "dir": "南",
     "to": "北过厅",
     "main": false,
     "glass": false
    }
   ],
   "parent": null,
   "win": 4
  },
  {
   "floor": "3F",
   "name": "猎藏厅",
   "kind": "room",
   "x0": 39,
   "x1": 57.6,
   "y0": 32.4,
   "y1": 40.8,
   "shape": "rect",
   "area": 156.2,
   "areaNet": false,
   "netW": 18.36,
   "netH": 8.28,
   "doors": [
    {
     "raw": "南门 x=41.1，宽1，通北过厅",
     "open": false,
     "axis": "x",
     "at": 41.1,
     "width": 1,
     "dir": "南",
     "to": "北过厅",
     "main": false,
     "glass": false
    },
    {
     "raw": "南门 x=52.2，宽1.6，通北廊东段",
     "open": false,
     "axis": "x",
     "at": 52.2,
     "width": 1.6,
     "dir": "南",
     "to": "北廊东段",
     "main": false,
     "glass": false
    }
   ],
   "parent": null,
   "win": 4
  },
  {
   "floor": "3F",
   "name": "9号套房",
   "kind": "suite",
   "x0": 0,
   "x1": 8.4,
   "y0": 0,
   "y1": 8.4,
   "shape": "rect",
   "area": 70.6,
   "areaNet": false,
   "netW": 8.16,
   "netH": 8.16,
   "suite": 9,
   "doors": [
    {
     "raw": "北门 x=4.2，宽1，通南廊西段",
     "open": false,
     "axis": "x",
     "at": 4.2,
     "width": 1,
     "dir": "北",
     "to": "南廊西段",
     "main": false,
     "glass": false
    }
   ],
   "parent": null,
   "win": 1
  },
  {
   "floor": "3F",
   "name": "10号套房",
   "kind": "suite",
   "x0": 0,
   "x1": 8.4,
   "y0": 32.4,
   "y1": 40.8,
   "shape": "rect",
   "area": 70.6,
   "areaNet": false,
   "netW": 8.16,
   "netH": 8.16,
   "suite": 10,
   "doors": [
    {
     "raw": "南门 x=4.2，宽1，通北廊西段",
     "open": false,
     "axis": "x",
     "at": 4.2,
     "width": 1,
     "dir": "南",
     "to": "北廊西段",
     "main": false,
     "glass": false
    }
   ],
   "parent": null,
   "win": 1
  },
  {
   "floor": "3F",
   "name": "11号套房",
   "kind": "suite",
   "x0": 61.2,
   "x1": 69.6,
   "y0": 32.4,
   "y1": 40.8,
   "shape": "rect",
   "area": 70.6,
   "areaNet": false,
   "netW": 8.16,
   "netH": 8.16,
   "suite": 11,
   "doors": [
    {
     "raw": "南门 x=65.4，宽1，通北廊东段",
     "open": false,
     "axis": "x",
     "at": 65.4,
     "width": 1,
     "dir": "南",
     "to": "北廊东段",
     "main": false,
     "glass": false
    }
   ],
   "parent": null,
   "win": 1
  },
  {
   "floor": "3F",
   "name": "12号套房",
   "kind": "suite",
   "x0": 61.2,
   "x1": 69.6,
   "y0": 0,
   "y1": 8.4,
   "shape": "rect",
   "area": 70.6,
   "areaNet": false,
   "netW": 8.16,
   "netH": 8.16,
   "suite": 12,
   "doors": [
    {
     "raw": "北门 x=65.4，宽1，通南廊东段",
     "open": false,
     "axis": "x",
     "at": 65.4,
     "width": 1,
     "dir": "北",
     "to": "南廊东段",
     "main": false,
     "glass": false
    }
   ],
   "parent": null,
   "win": 1
  },
  {
   "floor": "3F",
   "name": "13号套房",
   "kind": "suite",
   "x0": 30.6,
   "x1": 39,
   "y0": 32.4,
   "y1": 40.8,
   "shape": "rect",
   "area": 70.6,
   "areaNet": false,
   "netW": 8.16,
   "netH": 8.16,
   "suite": 13,
   "doors": [
    {
     "raw": "南门 x=34.8，宽1，通北过厅",
     "open": false,
     "axis": "x",
     "at": 34.8,
     "width": 1,
     "dir": "南",
     "to": "北过厅",
     "main": false,
     "glass": false
    }
   ],
   "parent": null,
   "win": 1
  }
 ],
 "hall": {
  "name": "穹顶议事厅",
  "floor": "1F",
  "cx": 34.8,
  "cy": 20.4,
  "r": 6.6,
  "wall": 1.2,
  "rOuter": 7.8,
  "square": [
   26.4,
   43.2,
   12,
   28.8
  ],
  "doorDepth": 1.8,
  "springAt": 6.6,
  "apex": 13.2,
  "oculus": 2.4,
  "doorHeight": 3.6,
  "seats": 13,
  "disc": 8.4,
  "table": {
   "d": 4.8,
   "h": 0.76,
   "t": 2.6
  },
  "chairW": 0.62,
  "screens": 13,
  "lamps": 13,
  "plaque": {
   "cx": 40.7,
   "cy": 17.7,
   "w": 0.9,
   "h": 1.6,
   "z": 1.6
  },
  "counter": {
   "cx": 40,
   "cy": 23.4,
   "l": 2.4,
   "d": 0.65,
   "h": 1.8,
   "top": 1.05,
   "niche": {
    "w": 1.6,
    "h": 0.64,
    "d": 0.12,
    "z": 1.12
   },
   "rows": [
    [
     1,
     7
    ],
    [
     8,
     13
    ]
   ]
  },
  "sideboard": {
   "w": 2.4,
   "d": 0.55,
   "h": 0.95,
   "where": "西门北侧"
  },
  "cabinets": {
   "w": 2.2,
   "d": 0.55,
   "h": 1.25,
   "where": "北墙",
   "west": "神圣罗马帝国皇冠",
   "east": "良渚文化反山十二号墓玉琮王"
  },
  "floorPlan": {
   "w": 2.4,
   "h": 1,
   "z": 1.1,
   "where": "西侧侧案上方的弧墙",
   "order": [
    "B1",
    "1F",
    "2F",
    "3F"
   ]
  },
  "compass": {
   "floor": "1F",
   "room": "门厅",
   "cx": 34.8,
   "cy": 4.8,
   "d": 1.2
  }
 },
 "courts": [
  {
   "name": "花园",
   "side": "西",
   "x0": 12,
   "x1": 26.4,
   "y0": 12,
   "y1": 28.8,
   "voidX0": 12,
   "voidX1": 22.8
  },
  {
   "name": "自然史大厅",
   "side": "东",
   "x0": 43.2,
   "x1": 57.6,
   "y0": 12,
   "y1": 28.8,
   "voidX0": 46.8,
   "voidX1": 57.6
  }
 ],
 "foyer": {
  "name": "门厅",
  "floor": "1F",
  "spans": [
   "1F",
   "2F",
   "3F"
  ],
  "mainDoor": {
   "x": 34.8,
   "width": 3.6,
   "height": 3.6,
   "lock": false
  },
  "doorHeight": 2.5,
  "keys": 13
 },
 "circulation": {
  "corridorWidth": 3.6,
  "glassBase": 0.45,
  "grand": {
   "floors": [
    "1F",
    "2F",
    "3F"
   ],
   "steps": 15,
   "width": 1.6,
   "rail": 1.1,
   "fromY": 8.4,
   "mid": [
    2.6,
    4.2
   ],
   "midRise": 2.5,
   "west": {
    "outer": [
     26.4,
     28
    ],
    "inner": [
     28.2,
     29.8
    ]
   },
   "east": {
    "outer": [
     41.6,
     43.2
    ],
    "inner": [
     39.8,
     41.4
    ]
   }
  },
  "back": [
   {
    "name": "西北后楼梯",
    "floors": [
     "B1",
     "1F",
     "2F",
     "3F"
    ],
    "x0": 8.4,
    "x1": 12,
    "y0": 32.4,
    "y1": 40.8,
    "steps": 15,
    "width": 1.5,
    "runs": [
     [
      8.55,
      10.05
     ],
     [
      10.35,
      11.85
     ]
    ],
    "landing": [
     32.4,
     34.2
    ],
    "mid": [
     38.4,
     40.8
    ],
    "door": {
     "dir": "南",
     "x": 10.2,
     "y": 32.4,
     "width": 1.4,
     "to": "北廊西段"
    }
   },
   {
    "name": "东北后楼梯",
    "floors": [
     "B1",
     "1F",
     "2F",
     "3F"
    ],
    "x0": 57.6,
    "x1": 61.2,
    "y0": 32.4,
    "y1": 40.8,
    "steps": 15,
    "width": 1.5,
    "runs": [
     [
      57.75,
      59.25
     ],
     [
      59.55,
      61.05
     ]
    ],
    "landing": [
     32.4,
     34.2
    ],
    "mid": [
     38.4,
     40.8
    ],
    "door": {
     "dir": "南",
     "x": 59.4,
     "y": 32.4,
     "width": 1.4,
     "to": "北廊东段"
    }
   }
  ],
  "elevators": [
   {
    "name": "西电梯",
    "floors": [
     "B1",
     "1F",
     "2F",
     "3F"
    ],
    "x0": 9,
    "x1": 11.4,
    "y0": 0,
    "y1": 2.8,
    "car": [
     1.4,
     2
    ],
    "door": {
     "dir": "北",
     "x": 10.2,
     "y": 2.8,
     "width": 1.1
    },
    "lobby": "西电梯厅",
    "start": "1F"
   },
   {
    "name": "东电梯",
    "floors": [
     "B1",
     "1F",
     "2F",
     "3F"
    ],
    "x0": 58.2,
    "x1": 60.6,
    "y0": 0,
    "y1": 2.8,
    "car": [
     1.4,
     2
    ],
    "door": {
     "dir": "北",
     "x": 59.4,
     "y": 2.8,
     "width": 1.1
    },
    "lobby": "东电梯厅",
    "start": "1F"
   }
  ],
  "elevatorTiming": {
   "perFloor": 6,
   "open": 3,
   "dwell": 5,
   "close": 3,
   "example": 32
  }
 },
 "outside": {
  "wall": {
   "cx": 34.8,
   "cy": 20.4,
   "r": 300
  },
  "ground": -0.45,
  "lawn": 15,
  "lawnBox": {
   "x0": -15.6,
   "x1": 85.2,
   "y0": -15.6,
   "y1": 56.4
  },
  "steps": 3,
  "forecourt": {
   "w": 20,
   "d": 12,
   "x0": 24.8,
   "x1": 44.8,
   "y0": -12.6,
   "y1": -0.6,
   "approx": true
  },
  "forest": {
   "southY": -15.6,
   "trees": "松树和山毛榉",
   "sight": [
    20,
    30
   ]
  },
  "beach": {
   "y0": -80.6,
   "y1": -15.6,
   "w": 65
  },
  "sea": {
   "y1": -80.6,
   "waist": 20,
   "overhead": 50,
   "wallDepth": 15,
   "temp": 17,
   "tide": false
  },
  "climate": {
   "day": 20,
   "night": 16,
   "humidity": 80
  },
  "noLife": true,
  "noFreshWater": true
 },
 "light": {
  "rows": [
   {
    "from": "05:00",
    "to": "07:00",
    "fromMin": 300,
    "toMin": 420,
    "window": "由无渐亮",
    "lit": "亮",
    "unlit": "亮"
   },
   {
    "from": "07:00",
    "to": "17:00",
    "fromMin": 420,
    "toMin": 1020,
    "window": "恒定最亮",
    "lit": "灭",
    "unlit": "亮"
   },
   {
    "from": "17:00",
    "to": "19:00",
    "fromMin": 1020,
    "toMin": 1140,
    "window": "由亮渐无",
    "lit": "亮",
    "unlit": "亮"
   },
   {
    "from": "19:00",
    "to": "23:00",
    "fromMin": 1140,
    "toMin": 1380,
    "window": "无",
    "lit": "亮",
    "unlit": "亮"
   },
   {
    "from": "23:00",
    "to": "05:00",
    "fromMin": 1380,
    "toMin": 300,
    "window": "无",
    "lit": "低亮",
    "unlit": "低亮"
   }
  ],
  "sky": "阴着",
  "windowed": "3.2所列的房间、十三间套房、两院和门厅",
  "investigationAllLit": true,
  "mirrorWhenDark": true
 },
 "windows": [
  {
   "floor": "1F",
   "room": "1号套房",
   "side": "南",
   "kind": "suite",
   "at": 4.2,
   "a": 1.8,
   "b": 6.6,
   "width": 4.8,
   "height": 1.8,
   "sill": 1.2,
   "opens": true,
   "placed": "center"
  },
  {
   "floor": "1F",
   "room": "2号套房",
   "side": "北",
   "kind": "suite",
   "at": 4.2,
   "a": 1.8,
   "b": 6.6,
   "width": 4.8,
   "height": 1.8,
   "sill": 1.2,
   "opens": true,
   "placed": "center"
  },
  {
   "floor": "1F",
   "room": "3号套房",
   "side": "北",
   "kind": "suite",
   "at": 65.4,
   "a": 63,
   "b": 67.8,
   "width": 4.8,
   "height": 1.8,
   "sill": 1.2,
   "opens": true,
   "placed": "center"
  },
  {
   "floor": "1F",
   "room": "4号套房",
   "side": "南",
   "kind": "suite",
   "at": 65.4,
   "a": 63,
   "b": 67.8,
   "width": 4.8,
   "height": 1.8,
   "sill": 1.2,
   "opens": true,
   "placed": "center"
  },
  {
   "floor": "2F",
   "room": "5号套房",
   "side": "南",
   "kind": "suite",
   "at": 4.2,
   "a": 1.8,
   "b": 6.6,
   "width": 4.8,
   "height": 1.8,
   "sill": 1.2,
   "opens": true,
   "placed": "center"
  },
  {
   "floor": "2F",
   "room": "6号套房",
   "side": "北",
   "kind": "suite",
   "at": 4.2,
   "a": 1.8,
   "b": 6.6,
   "width": 4.8,
   "height": 1.8,
   "sill": 1.2,
   "opens": true,
   "placed": "center"
  },
  {
   "floor": "2F",
   "room": "7号套房",
   "side": "北",
   "kind": "suite",
   "at": 65.4,
   "a": 63,
   "b": 67.8,
   "width": 4.8,
   "height": 1.8,
   "sill": 1.2,
   "opens": true,
   "placed": "center"
  },
  {
   "floor": "2F",
   "room": "8号套房",
   "side": "南",
   "kind": "suite",
   "at": 65.4,
   "a": 63,
   "b": 67.8,
   "width": 4.8,
   "height": 1.8,
   "sill": 1.2,
   "opens": true,
   "placed": "center"
  },
  {
   "floor": "3F",
   "room": "9号套房",
   "side": "南",
   "kind": "suite",
   "at": 4.2,
   "a": 1.8,
   "b": 6.6,
   "width": 4.8,
   "height": 1.8,
   "sill": 1.2,
   "opens": true,
   "placed": "center"
  },
  {
   "floor": "3F",
   "room": "10号套房",
   "side": "北",
   "kind": "suite",
   "at": 4.2,
   "a": 1.8,
   "b": 6.6,
   "width": 4.8,
   "height": 1.8,
   "sill": 1.2,
   "opens": true,
   "placed": "center"
  },
  {
   "floor": "3F",
   "room": "11号套房",
   "side": "北",
   "kind": "suite",
   "at": 65.4,
   "a": 63,
   "b": 67.8,
   "width": 4.8,
   "height": 1.8,
   "sill": 1.2,
   "opens": true,
   "placed": "center"
  },
  {
   "floor": "3F",
   "room": "12号套房",
   "side": "南",
   "kind": "suite",
   "at": 65.4,
   "a": 63,
   "b": 67.8,
   "width": 4.8,
   "height": 1.8,
   "sill": 1.2,
   "opens": true,
   "placed": "center"
  },
  {
   "floor": "3F",
   "room": "13号套房",
   "side": "北",
   "kind": "suite",
   "at": 34.8,
   "a": 32.4,
   "b": 37.2,
   "width": 4.8,
   "height": 1.8,
   "sill": 1.2,
   "opens": true,
   "placed": "center"
  },
  {
   "floor": "1F",
   "room": "衣帽间",
   "side": "南",
   "kind": "room",
   "at": 15.6,
   "a": 14.4,
   "b": 16.8,
   "width": 2.4,
   "height": 2.8,
   "sill": 0.9,
   "opens": true,
   "placed": "even"
  },
  {
   "floor": "1F",
   "room": "盥洗室",
   "side": "南",
   "kind": "room",
   "at": 22.8,
   "a": 21.6,
   "b": 24,
   "width": 2.4,
   "height": 2.8,
   "sill": 0.9,
   "opens": true,
   "placed": "even"
  },
  {
   "floor": "1F",
   "room": "音乐沙龙",
   "side": "南",
   "kind": "room",
   "at": 46.8,
   "a": 45.6,
   "b": 48,
   "width": 2.4,
   "height": 2.8,
   "sill": 0.9,
   "opens": true,
   "placed": "even"
  },
  {
   "floor": "1F",
   "room": "音乐沙龙",
   "side": "南",
   "kind": "room",
   "at": 54,
   "a": 52.8,
   "b": 55.2,
   "width": 2.4,
   "height": 2.8,
   "sill": 0.9,
   "opens": true,
   "placed": "even"
  },
  {
   "floor": "2F",
   "room": "游戏室",
   "side": "南",
   "kind": "room",
   "at": 46.8,
   "a": 45.6,
   "b": 48,
   "width": 2.4,
   "height": 2.8,
   "sill": 0.9,
   "opens": true,
   "placed": "even"
  },
  {
   "floor": "2F",
   "room": "游戏室",
   "side": "南",
   "kind": "room",
   "at": 54,
   "a": 52.8,
   "b": 55.2,
   "width": 2.4,
   "height": 2.8,
   "sill": 0.9,
   "opens": true,
   "placed": "even"
  },
  {
   "floor": "3F",
   "room": "舞蹈室",
   "side": "南",
   "kind": "room",
   "at": 15.6,
   "a": 14.4,
   "b": 16.8,
   "width": 2.4,
   "height": 2.8,
   "sill": 0.9,
   "opens": true,
   "placed": "even"
  },
  {
   "floor": "3F",
   "room": "舞蹈室",
   "side": "南",
   "kind": "room",
   "at": 22.8,
   "a": 21.6,
   "b": 24,
   "width": 2.4,
   "height": 2.8,
   "sill": 0.9,
   "opens": true,
   "placed": "even"
  },
  {
   "floor": "3F",
   "room": "茶室",
   "side": "南",
   "kind": "room",
   "at": 46.8,
   "a": 45.6,
   "b": 48,
   "width": 2.4,
   "height": 2.8,
   "sill": 0.9,
   "opens": true,
   "placed": "even"
  },
  {
   "floor": "3F",
   "room": "茶室",
   "side": "南",
   "kind": "room",
   "at": 54,
   "a": 52.8,
   "b": 55.2,
   "width": 2.4,
   "height": 2.8,
   "sill": 0.9,
   "opens": true,
   "placed": "even"
  },
  {
   "floor": "1F",
   "room": "晨间厅",
   "side": "西",
   "kind": "room",
   "at": 16.2,
   "a": 14.4,
   "b": 18,
   "width": 3.6,
   "height": 2.8,
   "sill": 0.9,
   "opens": true,
   "placed": "even"
  },
  {
   "floor": "1F",
   "room": "园艺间",
   "side": "西",
   "kind": "room",
   "at": 24.6,
   "a": 22.8,
   "b": 26.4,
   "width": 3.6,
   "height": 2.8,
   "sill": 0.9,
   "opens": true,
   "placed": "even"
  },
  {
   "floor": "1F",
   "room": "古兽厅",
   "side": "东",
   "kind": "room",
   "at": 16.2,
   "a": 14.4,
   "b": 18,
   "width": 3.6,
   "height": 2.8,
   "sill": 0.9,
   "opens": true,
   "placed": "even"
  },
  {
   "floor": "1F",
   "room": "古兽厅",
   "side": "东",
   "kind": "room",
   "at": 24.6,
   "a": 22.8,
   "b": 26.4,
   "width": 3.6,
   "height": 2.8,
   "sill": 0.9,
   "opens": true,
   "placed": "even"
  },
  {
   "floor": "2F",
   "room": "地图室",
   "side": "西",
   "kind": "room",
   "at": 16.2,
   "a": 14.4,
   "b": 18,
   "width": 3.6,
   "height": 2.8,
   "sill": 0.9,
   "opens": true,
   "placed": "even"
  },
  {
   "floor": "2F",
   "room": "棋艺室",
   "side": "西",
   "kind": "room",
   "at": 24.6,
   "a": 22.8,
   "b": 26.4,
   "width": 3.6,
   "height": 2.8,
   "sill": 0.9,
   "opens": true,
   "placed": "even"
  },
  {
   "floor": "2F",
   "room": "标本陈列室",
   "side": "东",
   "kind": "room",
   "at": 16.2,
   "a": 14.4,
   "b": 18,
   "width": 3.6,
   "height": 2.8,
   "sill": 0.9,
   "opens": true,
   "placed": "even"
  },
  {
   "floor": "2F",
   "room": "标本陈列室",
   "side": "东",
   "kind": "room",
   "at": 24.6,
   "a": 22.8,
   "b": 26.4,
   "width": 3.6,
   "height": 2.8,
   "sill": 0.9,
   "opens": true,
   "placed": "even"
  },
  {
   "floor": "3F",
   "room": "瓷器室",
   "side": "西",
   "kind": "room",
   "at": 16.2,
   "a": 14.4,
   "b": 18,
   "width": 3.6,
   "height": 2.8,
   "sill": 0.9,
   "opens": true,
   "placed": "even"
  },
  {
   "floor": "3F",
   "room": "修复室",
   "side": "西",
   "kind": "room",
   "at": 24.6,
   "a": 22.8,
   "b": 26.4,
   "width": 3.6,
   "height": 2.8,
   "sill": 0.9,
   "opens": true,
   "placed": "even"
  },
  {
   "floor": "3F",
   "room": "天象室",
   "side": "东",
   "kind": "room",
   "at": 16.2,
   "a": 14.4,
   "b": 18,
   "width": 3.6,
   "height": 2.8,
   "sill": 0.9,
   "opens": true,
   "placed": "even"
  },
  {
   "floor": "3F",
   "room": "三层起居室",
   "side": "东",
   "kind": "room",
   "at": 24.6,
   "a": 22.8,
   "b": 26.4,
   "width": 3.6,
   "height": 2.8,
   "sill": 0.9,
   "opens": true,
   "placed": "even"
  },
  {
   "floor": "1F",
   "room": "起居厅",
   "side": "北",
   "kind": "room",
   "at": 14.4,
   "a": 13.2,
   "b": 15.6,
   "width": 2.4,
   "height": 2.8,
   "sill": 0.9,
   "opens": true,
   "placed": "even"
  },
  {
   "floor": "1F",
   "room": "起居厅",
   "side": "北",
   "kind": "room",
   "at": 19.2,
   "a": 18,
   "b": 20.4,
   "width": 2.4,
   "height": 2.8,
   "sill": 0.9,
   "opens": true,
   "placed": "even"
  },
  {
   "floor": "1F",
   "room": "起居厅",
   "side": "北",
   "kind": "room",
   "at": 24,
   "a": 22.8,
   "b": 25.2,
   "width": 2.4,
   "height": 2.8,
   "sill": 0.9,
   "opens": true,
   "placed": "even"
  },
  {
   "floor": "1F",
   "room": "宴饮厅",
   "side": "北",
   "kind": "room",
   "at": 29.2,
   "a": 28,
   "b": 30.4,
   "width": 2.4,
   "height": 2.8,
   "sill": 0.9,
   "opens": true,
   "placed": "even"
  },
  {
   "floor": "1F",
   "room": "宴饮厅",
   "side": "北",
   "kind": "room",
   "at": 34.8,
   "a": 33.6,
   "b": 36,
   "width": 2.4,
   "height": 2.8,
   "sill": 0.9,
   "opens": true,
   "placed": "even"
  },
  {
   "floor": "1F",
   "room": "宴饮厅",
   "side": "北",
   "kind": "room",
   "at": 40.4,
   "a": 39.2,
   "b": 41.6,
   "width": 2.4,
   "height": 2.8,
   "sill": 0.9,
   "opens": true,
   "placed": "even"
  },
  {
   "floor": "1F",
   "room": "厨房",
   "side": "北",
   "kind": "room",
   "at": 45.6,
   "a": 44.4,
   "b": 46.8,
   "width": 2.4,
   "height": 2.8,
   "sill": 0.9,
   "opens": true,
   "placed": "even"
  },
  {
   "floor": "1F",
   "room": "厨房",
   "side": "北",
   "kind": "room",
   "at": 50.4,
   "a": 49.2,
   "b": 51.6,
   "width": 2.4,
   "height": 2.8,
   "sill": 0.9,
   "opens": true,
   "placed": "even"
  },
  {
   "floor": "1F",
   "room": "厨房",
   "side": "北",
   "kind": "room",
   "at": 55.2,
   "a": 54,
   "b": 56.4,
   "width": 2.4,
   "height": 2.8,
   "sill": 0.9,
   "opens": true,
   "placed": "even"
  },
  {
   "floor": "2F",
   "room": "阅览室",
   "side": "北",
   "kind": "room",
   "at": 14.4,
   "a": 13.2,
   "b": 15.6,
   "width": 2.4,
   "height": 2.8,
   "sill": 0.9,
   "opens": true,
   "placed": "even"
  },
  {
   "floor": "2F",
   "room": "阅览室",
   "side": "北",
   "kind": "room",
   "at": 19.2,
   "a": 18,
   "b": 20.4,
   "width": 2.4,
   "height": 2.8,
   "sill": 0.9,
   "opens": true,
   "placed": "even"
  },
  {
   "floor": "2F",
   "room": "阅览室",
   "side": "北",
   "kind": "room",
   "at": 24,
   "a": 22.8,
   "b": 25.2,
   "width": 2.4,
   "height": 2.8,
   "sill": 0.9,
   "opens": true,
   "placed": "even"
  },
  {
   "floor": "2F",
   "room": "大图书室",
   "side": "北",
   "kind": "room",
   "at": 29.2,
   "a": 28,
   "b": 30.4,
   "width": 2.4,
   "height": 2.8,
   "sill": 0.9,
   "opens": true,
   "placed": "even"
  },
  {
   "floor": "2F",
   "room": "大图书室",
   "side": "北",
   "kind": "room",
   "at": 34.8,
   "a": 33.6,
   "b": 36,
   "width": 2.4,
   "height": 2.8,
   "sill": 0.9,
   "opens": true,
   "placed": "even"
  },
  {
   "floor": "2F",
   "room": "大图书室",
   "side": "北",
   "kind": "room",
   "at": 40.4,
   "a": 39.2,
   "b": 41.6,
   "width": 2.4,
   "height": 2.8,
   "sill": 0.9,
   "opens": true,
   "placed": "even"
  },
  {
   "floor": "2F",
   "room": "二层起居室",
   "side": "北",
   "kind": "room",
   "at": 45.6,
   "a": 44.4,
   "b": 46.8,
   "width": 2.4,
   "height": 2.8,
   "sill": 0.9,
   "opens": true,
   "placed": "even"
  },
  {
   "floor": "2F",
   "room": "二层起居室",
   "side": "北",
   "kind": "room",
   "at": 50.4,
   "a": 49.2,
   "b": 51.6,
   "width": 2.4,
   "height": 2.8,
   "sill": 0.9,
   "opens": true,
   "placed": "even"
  },
  {
   "floor": "2F",
   "room": "二层起居室",
   "side": "北",
   "kind": "room",
   "at": 55.2,
   "a": 54,
   "b": 56.4,
   "width": 2.4,
   "height": 2.8,
   "sill": 0.9,
   "opens": true,
   "placed": "even"
  },
  {
   "floor": "3F",
   "room": "画室",
   "side": "北",
   "kind": "room",
   "at": 14.33,
   "a": 13.13,
   "b": 15.53,
   "width": 2.4,
   "height": 2.8,
   "sill": 0.9,
   "opens": true,
   "placed": "even"
  },
  {
   "floor": "3F",
   "room": "画室",
   "side": "北",
   "kind": "room",
   "at": 18.98,
   "a": 17.78,
   "b": 20.18,
   "width": 2.4,
   "height": 2.8,
   "sill": 0.9,
   "opens": true,
   "placed": "even"
  },
  {
   "floor": "3F",
   "room": "画室",
   "side": "北",
   "kind": "room",
   "at": 23.63,
   "a": 22.43,
   "b": 24.83,
   "width": 2.4,
   "height": 2.8,
   "sill": 0.9,
   "opens": true,
   "placed": "even"
  },
  {
   "floor": "3F",
   "room": "画室",
   "side": "北",
   "kind": "room",
   "at": 28.28,
   "a": 27.08,
   "b": 29.48,
   "width": 2.4,
   "height": 2.8,
   "sill": 0.9,
   "opens": true,
   "placed": "even"
  },
  {
   "floor": "3F",
   "room": "猎藏厅",
   "side": "北",
   "kind": "room",
   "at": 41.33,
   "a": 40.13,
   "b": 42.53,
   "width": 2.4,
   "height": 2.8,
   "sill": 0.9,
   "opens": true,
   "placed": "even"
  },
  {
   "floor": "3F",
   "room": "猎藏厅",
   "side": "北",
   "kind": "room",
   "at": 45.98,
   "a": 44.78,
   "b": 47.18,
   "width": 2.4,
   "height": 2.8,
   "sill": 0.9,
   "opens": true,
   "placed": "even"
  },
  {
   "floor": "3F",
   "room": "猎藏厅",
   "side": "北",
   "kind": "room",
   "at": 50.63,
   "a": 49.43,
   "b": 51.83,
   "width": 2.4,
   "height": 2.8,
   "sill": 0.9,
   "opens": true,
   "placed": "even"
  },
  {
   "floor": "3F",
   "room": "猎藏厅",
   "side": "北",
   "kind": "room",
   "at": 55.28,
   "a": 54.08,
   "b": 56.48,
   "width": 2.4,
   "height": 2.8,
   "sill": 0.9,
   "opens": true,
   "placed": "even"
  },
  {
   "floor": "1F",
   "room": "南廊西段",
   "side": "西",
   "kind": "corridor",
   "at": 10.2,
   "a": 9,
   "b": 11.4,
   "width": 2.4,
   "height": 3.6,
   "sill": 0.6,
   "opens": true,
   "placed": "center"
  },
  {
   "floor": "1F",
   "room": "南廊东段",
   "side": "东",
   "kind": "corridor",
   "at": 10.2,
   "a": 9,
   "b": 11.4,
   "width": 2.4,
   "height": 3.6,
   "sill": 0.6,
   "opens": true,
   "placed": "center"
  },
  {
   "floor": "1F",
   "room": "北廊西段",
   "side": "西",
   "kind": "corridor",
   "at": 30.6,
   "a": 29.4,
   "b": 31.8,
   "width": 2.4,
   "height": 3.6,
   "sill": 0.6,
   "opens": true,
   "placed": "center"
  },
  {
   "floor": "1F",
   "room": "北廊东段",
   "side": "东",
   "kind": "corridor",
   "at": 30.6,
   "a": 29.4,
   "b": 31.8,
   "width": 2.4,
   "height": 3.6,
   "sill": 0.6,
   "opens": true,
   "placed": "center"
  },
  {
   "floor": "2F",
   "room": "南廊西段",
   "side": "西",
   "kind": "corridor",
   "at": 10.2,
   "a": 9,
   "b": 11.4,
   "width": 2.4,
   "height": 3.6,
   "sill": 0.6,
   "opens": true,
   "placed": "center"
  },
  {
   "floor": "2F",
   "room": "南廊东段",
   "side": "东",
   "kind": "corridor",
   "at": 10.2,
   "a": 9,
   "b": 11.4,
   "width": 2.4,
   "height": 3.6,
   "sill": 0.6,
   "opens": true,
   "placed": "center"
  },
  {
   "floor": "2F",
   "room": "北廊西段",
   "side": "西",
   "kind": "corridor",
   "at": 30.6,
   "a": 29.4,
   "b": 31.8,
   "width": 2.4,
   "height": 3.6,
   "sill": 0.6,
   "opens": true,
   "placed": "center"
  },
  {
   "floor": "2F",
   "room": "北廊东段",
   "side": "东",
   "kind": "corridor",
   "at": 30.6,
   "a": 29.4,
   "b": 31.8,
   "width": 2.4,
   "height": 3.6,
   "sill": 0.6,
   "opens": true,
   "placed": "center"
  },
  {
   "floor": "3F",
   "room": "南廊西段",
   "side": "西",
   "kind": "corridor",
   "at": 10.2,
   "a": 9,
   "b": 11.4,
   "width": 2.4,
   "height": 3.6,
   "sill": 0.6,
   "opens": true,
   "placed": "center"
  },
  {
   "floor": "3F",
   "room": "南廊东段",
   "side": "东",
   "kind": "corridor",
   "at": 10.2,
   "a": 9,
   "b": 11.4,
   "width": 2.4,
   "height": 3.6,
   "sill": 0.6,
   "opens": true,
   "placed": "center"
  },
  {
   "floor": "3F",
   "room": "北廊西段",
   "side": "西",
   "kind": "corridor",
   "at": 30.6,
   "a": 29.4,
   "b": 31.8,
   "width": 2.4,
   "height": 3.6,
   "sill": 0.6,
   "opens": true,
   "placed": "center"
  },
  {
   "floor": "3F",
   "room": "北廊东段",
   "side": "东",
   "kind": "corridor",
   "at": 30.6,
   "a": 29.4,
   "b": 31.8,
   "width": 2.4,
   "height": 3.6,
   "sill": 0.6,
   "opens": true,
   "placed": "center"
  },
  {
   "floor": "1F",
   "room": "西北后楼梯",
   "side": "北",
   "kind": "stair",
   "at": 10.2,
   "a": 9.3,
   "b": 11.1,
   "width": 1.8,
   "height": 2.8,
   "sill": 0.3,
   "opens": true,
   "placed": "center",
   "aboveMidLanding": true
  },
  {
   "floor": "2F",
   "room": "西北后楼梯",
   "side": "北",
   "kind": "stair",
   "at": 10.2,
   "a": 9.3,
   "b": 11.1,
   "width": 1.8,
   "height": 2.8,
   "sill": 0.3,
   "opens": true,
   "placed": "center",
   "aboveMidLanding": true
  },
  {
   "floor": "3F",
   "room": "西北后楼梯",
   "side": "北",
   "kind": "stair",
   "at": 10.2,
   "a": 9.3,
   "b": 11.1,
   "width": 1.8,
   "height": 2.8,
   "sill": 0.9,
   "opens": true,
   "placed": "center"
  },
  {
   "floor": "1F",
   "room": "东北后楼梯",
   "side": "北",
   "kind": "stair",
   "at": 59.4,
   "a": 58.5,
   "b": 60.3,
   "width": 1.8,
   "height": 2.8,
   "sill": 0.3,
   "opens": true,
   "placed": "center",
   "aboveMidLanding": true
  },
  {
   "floor": "2F",
   "room": "东北后楼梯",
   "side": "北",
   "kind": "stair",
   "at": 59.4,
   "a": 58.5,
   "b": 60.3,
   "width": 1.8,
   "height": 2.8,
   "sill": 0.3,
   "opens": true,
   "placed": "center",
   "aboveMidLanding": true
  },
  {
   "floor": "3F",
   "room": "东北后楼梯",
   "side": "北",
   "kind": "stair",
   "at": 59.4,
   "a": 58.5,
   "b": 60.3,
   "width": 1.8,
   "height": 2.8,
   "sill": 0.9,
   "opens": true,
   "placed": "center"
  },
  {
   "floor": "1F",
   "room": "门厅",
   "side": "南",
   "kind": "foyer",
   "at": 34.8,
   "a": 30,
   "b": 39.6,
   "width": 9.6,
   "height": 9.6,
   "sill": 4.8,
   "opens": false,
   "placed": "center"
  }
 ],
 "skylights": [
  {
   "over": "门厅",
   "x0": 26.4,
   "x1": 43.2,
   "y0": 0,
   "y1": 12,
   "z": 14.6
  },
  {
   "over": "花园",
   "x0": 12,
   "x1": 22.8,
   "y0": 12,
   "y1": 28.8,
   "z": 14.6
  },
  {
   "over": "自然史大厅",
   "x0": 46.8,
   "x1": 57.6,
   "y0": 12,
   "y1": 28.8,
   "z": 14.6
  }
 ],
 "clocks": {
  "list": [
   {
    "kind": "落地钟",
    "floor": "1F",
    "room": "门厅",
    "wall": "北",
    "x": 32.8,
    "y": 12,
    "height": 2.2,
    "chimes": true,
    "approx": true
   },
   {
    "kind": "挂钟",
    "floor": "1F",
    "room": "穹顶议事厅",
    "wall": "北",
    "x": 34.8,
    "y": 27,
    "z": 2.5,
    "chimes": false,
    "approx": true,
    "note": "两座罩柜中间上方"
   },
   {
    "kind": "挂钟",
    "floor": "1F",
    "room": "宴饮厅",
    "wall": "南",
    "x": 32.4,
    "y": 32.4,
    "z": 2.5,
    "chimes": false,
    "approx": true,
    "note": ""
   },
   {
    "kind": "挂钟",
    "floor": "2F",
    "room": "阅览室",
    "wall": "北",
    "x": 19.2,
    "y": 40.8,
    "z": 2.5,
    "chimes": false,
    "approx": true,
    "note": ""
   },
   {
    "kind": "挂钟",
    "floor": "3F",
    "room": "三层起居室",
    "wall": "北",
    "x": 65.4,
    "y": 28.8,
    "z": 2.5,
    "chimes": false,
    "approx": true,
    "note": ""
   }
  ],
  "countable": "门厅、大楼梯、二三层楼梯平台和各层南廊靠门厅的一段",
  "silent": "地下和两座后楼梯"
 },
 "timed": [
  {
   "when": "每日05:00—07:00、17:00—19:00",
   "what": "窗光渐亮、渐暗",
   "ref": "3.1",
   "times": [
    "05:00",
    "07:00",
    "17:00",
    "19:00"
   ]
  },
  {
   "when": "每日05:00、07:00、17:00、23:00",
   "what": "灯光切换",
   "ref": "3.1",
   "times": [
    "05:00",
    "07:00",
    "17:00",
    "23:00"
   ]
  },
  {
   "when": "每个整点",
   "what": "报时钟报时",
   "ref": "3.3",
   "times": []
  },
  {
   "when": "每日05:00",
   "what": "套房日用品、日常药品与女性住客用品在原位补足",
   "ref": "各室/套房.md",
   "times": [
    "05:00"
   ]
  },
  {
   "when": "每日05:30、17:30",
   "what": "花园根区滴灌各三分钟",
   "ref": "各室/1F_花园与园艺间.md",
   "times": [
    "05:30",
    "17:30"
   ]
  },
  {
   "when": "兑换来的吃喝交付满三小时；封着能存放的，开封满三小时",
   "what": "没吃完喝完的连同餐具收走",
   "ref": "价目表第 9 节",
   "times": []
  }
 ],
 "weather": {
  "default": "阴天",
  "hours": 8
 },
 "identities": [
  {
   "no": 1,
   "front": "隐者",
   "back": "暗杀者",
   "noReverse": false,
   "frontText": "每次普通投票结算时，隐者的总票数减少一票。\n\n隐者的能力不会被沉默。",
   "backText": "成为受命者时，视为同时拥有此身份。\n\n没有其他人看见暗杀者时，暗杀者本人的身体动作无声：脚步、呼吸、衣物摩擦都不出声。他使物件发出的声音不在此列。",
   "notes": "暗杀者以其他人的实际视野为条件。他使物件发出的声音照物理层第 4 节结算。"
  },
  {
   "no": 2,
   "front": "沉默者",
   "back": "盲视者",
   "noReverse": false,
   "frontText": "每次审判仅一次，沉默者可在辩论期间秘密指定一名角色，使其正位能力失效，持续至本场审判结束。期间该角色新取得的正位能力同样失效。对方不会收到被沉默的通知。",
   "backText": "成为受命者时，视为同时拥有此身份。\n\n仅一次，盲视者可随时使全馆陷入完全无法视物的黑暗，持续三分钟。期间一切人造光源与自然光均不能提供照明，包括打火机、火柴以及任何随身带入的光源，开灯无效。黑暗对盲视者本人不生效。发动时，主持人将向全馆说明这是盲视者能力造成的结果。",
   "notes": "盲视者的黑暗持续三分钟后，恢复该时刻应有的光照。"
  },
  {
   "no": 3,
   "front": "占卜家",
   "back": "梦游神",
   "noReverse": false,
   "frontText": "仅一次，占卜家可随时查验一名角色，得知其当前正位身份的名称和详细能力说明。",
   "backText": "成为受命者时，视为同时拥有此身份。\n\n仅一次，梦游神可随时查验一名角色，得知其当前逆位身份的名称和详细能力说明，并获得使用该能力一次的机会。对方没有逆位身份，或者该能力没有可以使用的一次（一直生效，或者已经用掉）时，不消耗本次机会。\n\n梦游神使用该能力时，对方收到私人通知，得知自己的逆位身份因梦游神的能力被人使用了一次。对方的能力为仅一次的，同时消耗。",
   "notes": "占卜家、梦游神查的是对方此刻记着的身份（以记录为准）。获知逆位身份不等于获知受命者资格。\n\n逆位里一直生效、没有可以使用的一次的，是暗杀者、敲钟人。\n\n借来的能力照原卡的时机和条件使用。卡上指持有者本人的地方，都指梦游神；广播里说是哪个身份的能力，照原卡。借来的是窃贼的能力时，换掉的是梦游神自己的逆位。\n\n梦游神借到的这一次，查验的那一刻就归他：此后对方用掉、换掉了那个能力，或者死去、离馆，都不收回；他使用时，对方那个能力还在、又是仅一次的，照卡同时消耗，已经用掉的不再消耗。"
  },
  {
   "no": 4,
   "front": "愚者",
   "back": "世界",
   "noReverse": false,
   "frontText": "仅一次，在投票后成为唯一待处刑者时，愚者可在处刑前公开身份发动能力。\n\n若愚者不是本批案件的实际凶手，撤销该处刑结果并重新投票；本场审判剩余期间，愚者不能投票，也不能被投票。若愚者是实际凶手，能力失败，并向全体确认其为凶手。\n\n无论成功或失败，本次机会均消耗。",
   "backText": "成为受命者时，视为同时拥有此身份。\n\n仅一次，世界可随时暂停时间三秒。暂停期间，持有者可自由活动，接触、移动他人及物件；时间恢复后，其间行动造成的变化保留。",
   "notes": "愚者优先于律师。\n\n世界暂停期间其他人停止活动；持有者的动作按物理层第 8 节的耗时结算。"
  },
  {
   "no": 5,
   "front": "执行者",
   "back": "敲钟人",
   "noReverse": false,
   "frontText": "仅一次，执行者可在辩论期间公开身份与能力，指定一名角色，立即发起针对其的特殊表决。\n\n有投票权者按座次公开票选。指定对象获得的有效基础票超过本场存活在馆玩家总数的一半，即成为待处刑者；否则恢复辩论。该表决不受加减票影响。\n\n表决通过并处刑后，若被处刑者并非本批案件的实际凶手，执行者身份永久失去投票权；指认正确或表决未通过，则保留投票权。本次能力无论通过与否均消耗。",
   "backText": "成为受命者时，视为同时拥有此身份。\n\n敲钟人行凶后，死者被有效发现时，调查时间被取消。主持人将向全馆说明这是敲钟人能力造成的结果。",
   "notes": "执行者发动即终止当前辩论。表决通过、处刑之后，正误照 3.3 的标准结算，播报照第 7 节：处死的是本批案件的实际凶手，算查明；不是，算一次误判，一同致死的案件只处死其中一人也算判定错误。此后本场继续还是结束，也照 3.3。表决仍依座次公开票选，可投其他对象、自投或弃票；只统计投给指定对象的有效基础票，无投票权者仍计入总人数。特殊表决不使用加减票；恋人同票及国王最后强制选票仍生效。愚者与律师可在通过后按条件介入；处刑结果被撤销的，不产生代价，也不退还次数。\n\n敲钟人的能力在他行凶的那一刻就落在这起死亡上：此后他死去、离馆、受命结束或者逆位被换掉，这具尸体被有效发现时照样取消调查。"
  },
  {
   "no": 6,
   "front": "丘比特",
   "back": null,
   "noReverse": true,
   "frontText": "仅一次，丘比特可在投票及审判环节之外指定两名存活在馆角色，包括本人，使其成为恋人。双方获知彼此的恋人身份及当时的正位身份与能力。\n\n双方都有投票权时，须票选同一对象，以先投票者的选择为准；一方没有投票权时，另一方正常投票。\n\n恋人中的一方成为受命者，另一方同时成为其帮凶，并收到私人通知。该受命者被主持人处刑时，帮凶一同处死。\n\n丘比特本人为受命者时，其帮凶同时获得自身对应的逆位身份。",
   "backText": "仅一次，丘比特可在投票及审判环节之外指定两名存活在馆角色，包括本人，使其成为恋人。双方获知彼此的恋人身份及当时的正位身份与能力。\n\n双方都有投票权时，须票选同一对象，以先投票者的选择为准；一方没有投票权时，另一方正常投票。\n\n恋人中的一方成为受命者，另一方同时成为其帮凶，并收到私人通知。该受命者被主持人处刑时，帮凶一同处死。\n\n丘比特本人为受命者时，其帮凶同时获得自身对应的逆位身份。",
   "notes": "弃票作为自投参与同票约束；国王最后结算时可以覆盖该约束。\n\n帮凶的连坐只由主持人处刑触发，受命者独立遭人杀害不触发。受命资格取消时，对应帮凶资格结束，恋人关系保留。\n\n丘比特本人为受命者时才有那项额外授予；仅是被他结成的一对恋人中有人受命，不产生。此资格随相应帮凶资格延续。"
  },
  {
   "no": 7,
   "front": "河豚",
   "back": "幽灵",
   "noReverse": false,
   "frontText": "河豚可在辩论期间选择一个有人的席位；除非该席位成为空席，否则不可变更。\n\n每次审判可查询一次，得知所选席位左右相邻席是否存在本批案件的实际凶手。结果只有\"有\"或\"没有\"，不说明方向、人数，也不查验中心席位；空席不跨越。",
   "backText": "成为受命者时，视为同时拥有此身份。\n\n幽灵可随时打开任意一扇门。",
   "notes": "河豚的中心不因一场审判结束而解除，仅该席位因死亡或离馆成为空席时才可另选。\n\n幽灵能开的是通行门（洋馆物理层 2.1），柜门和电梯门不算；主持人关着的门也不算：开局第六条播报以前、开庭到这一场结束的议事厅门。他开哪一扇，照普通开门，编号锁和插销都挡不住；锁和插销本身不动，门关回去以后照原样锁着、插着，不留痕迹。门后抵着的东西照常挡着。"
  },
  {
   "no": 8,
   "front": "律师",
   "back": "法官",
   "noReverse": false,
   "frontText": "仅一次，在投票产生唯一待处刑者后、处刑前，律师可公开身份与能力，撤销结果并立即重新投票。待处刑者必须为其他角色。\n\n本次重投采用普通票数规则，所有人均不能选择刚才的待处刑者；限制在本次重投结束后解除。该能力可撤销已经通过的特殊表决结果。",
   "backText": "成为受命者时，视为同时拥有此身份。\n\n每次普通投票期间，法官可秘密指定一名角色，使其本轮总票数增加一票。指定对象可以与法官本人的票选对象不同。",
   "notes": "律师造成的重投里，刚才的待处刑者弃票的，不算投自己，这一票不产生；不能选他的限制，这一次重投结束就解除。这一次重投仍属于原本的普通审判。"
  },
  {
   "no": 9,
   "front": "骑士",
   "back": "国王",
   "noReverse": false,
   "frontText": "仅一次，骑士可在辩论期间公开身份与能力，指定一名角色进行揭发。\n\n若目标为本批案件的实际凶手，主持人向全体确认揭发成功，最终处刑仍须经过投票。否则揭发失败，骑士身份永久失去投票权；此后被错指者每次将基础票投给骑士，骑士本轮总票数额外增加一票。\n\n无论成功或失败，本次机会均消耗。",
   "backText": "成为受命者时，视为同时拥有此身份。\n\n仅一次，在审判流程外，国王可将当前正位身份替换为国王，同时将自身逆位身份变为骑士。\n\n国王为正位身份时，有一次在投票期间公开国王身份并发动号令的机会。国王指定左边或右边，那一边最近的存活角色必须跟随国王票选同一对象，或弃票自投。他已经投出的票取消，重新选择。国王的能力最后结算，优先级最高。\n\n骑士为逆位身份时，有一次在本人行凶后转移死者尸体的机会。尸体可被转移至馆内任一房间，呈现形态由主持人决定。",
   "notes": "骑士揭发失败后，记录被错指者；此后该人每次把有效基础票投给骑士，骑士额外受一票。\n\n国王翻面后当前正位由国王替换，即使当前正位已经不是骑士，也按这一组合结算。翻面、国王控票及逆位骑士移尸分别计次；当前仍承担的骑士身份代价不因翻面清除。\n\n翻面以后，卡面改成下面两段（见 flip）。\n\n逆位骑士只有移尸，没有揭发。\n\n梦游神查到的逆位是国王的，借到的是翻面：他用了，自己的正位换成国王、逆位换成骑士，卡面照上面改写，号令和移尸从此是他自己身份上的机会；对方的翻面同时消耗。梦游神查到的逆位是骑士的，借到的是移尸。\n\n国王的号令沿座次，在国王指定的那一边寻找最近的存活参与者，越过空席。\n\n同一次投票里两个国王都发动号令的，只有先提出的那一个生效；后提出的不生效，这一次机会不消耗。",
   "flip": {
    "front": "国王",
    "back": "骑士",
    "frontText": "仅一次，国王可在投票期间公开国王身份并发动号令。国王指定左边或右边，那一边最近的存活角色必须跟随国王票选同一对象，或弃票自投。他已经投出的票取消，重新选择。国王的能力最后结算，优先级最高。",
    "backText": "成为受命者时，视为同时拥有此身份。\n\n仅一次，骑士可在本人行凶后转移死者尸体。尸体可被转移至馆内任一房间，呈现形态由主持人决定。"
   }
  },
  {
   "no": 10,
   "front": "魔术师",
   "back": "窃贼",
   "noReverse": false,
   "frontText": "魔术师有一次交换身份的机会。投票及审判环节之外，可选择两名角色，包括本人，交换双方当前的正位身份、能力、使用状态及身份代价。\n\n本次机会先消耗，再执行交换。双方分别获知自己的新身份及状态；逆位身份、受命任务与人物关系不随之交换。",
   "backText": "成为受命者时，视为同时拥有此身份。\n\n仅一次，窃贼可随时指定一名角色，将自身的窃贼身份替换为该角色当前的逆位身份，继承其能力与使用状态。对方的身份不变。对方没有逆位身份时，能力视为未发动。",
   "notes": "魔术师交换的两个人，不会自动知道交换的另一方是谁，也不知道是谁发动的。窃贼取的是对方此刻记着的逆位（以记录为准），不论对方受没受命；对方没有逆位时，窃贼的身份不变，机会不消耗。"
  },
  {
   "no": 11,
   "front": "变形者",
   "back": "史莱姆",
   "noReverse": false,
   "frontText": "投票及审判环节之外，变形者可指定一名角色，将自身正位身份替换为对方当前正位身份的副本，同时继承该身份的能力、使用状态与代价。对方不受影响。复制前，变形者没有其他正位能力。",
   "backText": "成为受命者时，视为同时拥有此身份。\n\n仅一次，史莱姆可随时重置一名角色当前的正位与逆位身份，使两面的能力次数、使用状态与代价分别恢复至初始状态。重置不改变当前身份名称，也不作用于史莱姆这一身份本身。",
   "notes": "史莱姆的目标收到私人通知，得知自己两面的身份状态已被重置，不知道是谁做的。"
  },
  {
   "no": 12,
   "front": "先知",
   "back": "兆示",
   "noReverse": false,
   "frontText": "每当有人在馆内死亡，先知立即收到私人通知，得知有人死亡。通知不提供死者、死因或地点。",
   "backText": "成为受命者时，视为同时拥有此身份。\n\n仅一次，兆示可随时得知馆内所有存活角色此刻的位置。",
   "notes": "先知的通知包括主持人的处刑，在死亡成立的那一刻送到。\n\n兆示得知的是发动那一刻每个活着在馆的人在哪里：按房号说，几号在哪一层、哪一处（物理层 1.2、1.3）。"
  },
  {
   "no": 13,
   "front": "平民",
   "back": null,
   "noReverse": true,
   "frontText": "平民不会被选为受命者。\n\n仅一次，平民可随时公开身份。公开以后，平民若被当时的受命者杀死，审理这起死亡的那一场审判里，那个人得到的票数以两倍计。\n\n平民不能被复制、交换或沉默。以平民为目标发动这些能力时，发动者会得知无效，能力次数不消耗。",
   "backText": "平民不会被选为受命者。\n\n仅一次，平民可随时公开身份。公开以后，平民若被当时的受命者杀死，审理这起死亡的那一场审判里，那个人得到的票数以两倍计。\n\n平民不能被复制、交换或沉默。以平民为目标发动这些能力时，发动者会得知无效，能力次数不消耗。",
   "notes": "\"当时的受命者\"指杀死平民的那一刻有受命资格的人；几个人一同致死的，其中有受命资格的那一个照此加倍。\n\n加倍的是那一场审判里他得到的票：普通投票和重投里，是第 1 到第 3 步算完以后的总票数（3.2）；执行者的特殊表决里，是投给他的有效基础票。结论和共同指认不加倍（3.2）。\n\n魔术师、变形者、沉默者以平民为目标时，发动的人收到私人通知\"无效\"，机会不消耗；魔术师选的另一方也不受影响。"
  }
 ],
 "identityNote": "主动能力须在心中向主持人明确提出发动请求及必要选择。要求公开身份的能力，须完成相应公开步骤。身份卡上写明会向全馆说明的能力，发动时全馆广播能力名称与发生了什么，不公布发动者；没有这样写的能力不广播。",
 "prices": {
  "how": [
   "说出或默念要换的东西或要办的事，报价之后同意，即成交。",
   "用身上带着的金币付：一枚一百分，按整枚付，不找零；总价不足整枚的，添东西凑满，或者不成交。",
   "东西出现在身边，事照说定的办。",
   "未列的，问价即答。"
  ],
  "chapters": [
   {
    "title": "一、食物",
    "items": [
     {
      "item": "一餐，一人份，菜式任点",
      "points": 100
     },
     {
      "item": "十三人份的同一餐",
      "points": 870
     },
     {
      "item": "一人一餐份的生食材",
      "points": 70
     },
     {
      "item": "一壶热咖啡或茶，含杯具",
      "points": 60
     },
     {
      "item": "一瓶果汁、汽水或牛奶",
      "points": 20
     },
     {
      "item": "零食一包（薯片、饼干、糖）",
      "points": 30
     },
     {
      "item": "巧克力一板",
      "points": 40
     },
     {
      "item": "一瓶好酒",
      "points": 150
     },
     {
      "item": "一包香烟",
      "points": 40
     }
    ]
   },
   {
    "title": "二、日用与舒适",
    "items": [
     {
      "item": "换洗衣物一套，可指定样式",
      "points": 150
     },
     {
      "item": "毛毯、枕头、睡袋",
      "points": 80
     },
     {
      "item": "手电筒含电池",
      "points": 200
     },
     {
      "item": "空白笔记本一册与两支笔",
      "points": 50
     },
     {
      "item": "腕表一只",
      "points": 400
     },
     {
      "item": "一件乐器",
      "points": 400
     },
     {
      "item": "一本任意的书",
      "points": 100
     },
     {
      "item": "一副新扑克或麻将，可指定样式",
      "points": 80
     },
     {
      "item": "随身听一台，存着指定的音乐",
      "points": 200
     },
     {
      "item": "热水浴、按摩、一夜安眠的服务",
      "points": 200
     },
     {
      "item": "活的猫或狗一只",
      "points": 2000
     }
    ]
   },
   {
    "title": "三、药与医疗",
    "items": [
     {
      "item": "绷带、纱布、消毒一大包",
      "points": 120
     },
     {
      "item": "抗生素一疗程",
      "points": 500
     },
     {
      "item": "强效止痛药十片",
      "points": 400
     },
     {
      "item": "广谱解毒剂",
      "points": 1500
     },
     {
      "item": "输血一袋，含器材",
      "points": 2000
     },
     {
      "item": "修复身体残疾",
      "points": 500
     }
    ]
   },
   {
    "title": "四、工具与器械",
    "items": [
     {
      "item": "撬棍、锤子、钳子一套",
      "points": 300
     },
     {
      "item": "尼龙绳 20 m",
      "points": 100
     },
     {
      "item": "门楔、挡门器",
      "points": 120
     },
     {
      "item": "门用报警器一只，门一开就响",
      "points": 1000
     },
     {
      "item": "铁链与挂锁一套",
      "points": 400
     },
     {
      "item": "便携电锯或角磨机",
      "points": 1200
     },
     {
      "item": "拍立得相机一台，含相纸二十张",
      "points": 800
     },
     {
      "item": "录音笔一支",
      "points": 1000
     },
     {
      "item": "对讲机一对，只在馆内通话",
      "points": 1000
     },
     {
      "item": "鲁米诺试剂一瓶",
      "points": 1500
     },
     {
      "item": "监控摄像头两只与显示器一台，可录像",
      "points": 3000
     }
    ]
   },
   {
    "title": "五、防护",
    "items": [
     {
      "item": "防刺背心一件",
      "points": 1500
     },
     {
      "item": "防毒面具",
      "points": 800
     },
     {
      "item": "手铐一副含钥匙",
      "points": 600
     },
     {
      "item": "带锁的钢制小箱一只，钥匙两把",
      "points": 500
     }
    ]
   },
   {
    "title": "六、离场",
    "items": [
     {
      "item": "退出券一张",
      "points": 50000
     }
    ]
   }
  ],
  "offPlaque": {
   "note": "这些价不刻在铜牌上，人物不知道（8.2）。有人问到或要买，照这里报价；这里也没有的，按第 7 节定价。",
   "chapters": [
    {
     "no": "10.1",
     "title": "食物",
     "items": [
      {
       "item": "咖啡豆 500 g",
       "points": 80
      },
      {
       "item": "雪茄一支，或烟斗烟丝一包",
       "points": 60
      },
      {
       "item": "压缩饼干一块",
       "points": 30
      },
      {
       "item": "能量棒三条",
       "points": 50
      },
      {
       "item": "新鲜水果一份",
       "points": 30
      },
      {
       "item": "一份甜点",
       "points": 50
      },
      {
       "item": "调味品一套（盐、糖、酱油、醋、香料）",
       "points": 30
      },
      {
       "item": "一壶热可可或热牛奶，含杯具",
       "points": 60
      },
      {
       "item": "一瓶矿泉水",
       "points": 10
      },
      {
       "item": "啤酒六罐",
       "points": 60
      }
     ]
    },
    {
     "no": "10.2",
     "title": "日用与舒适",
     "items": [
      {
       "item": "电池或蜡烛一包",
       "points": 100
      },
      {
       "item": "火柴一盒或打火机一只",
       "points": 50
      },
      {
       "item": "闹钟一只",
       "points": 250
      },
      {
       "item": "镜子、梳子、剃刀",
       "points": 60
      },
      {
       "item": "香水",
       "points": 200
      },
      {
       "item": "化妆品一套",
       "points": 150
      },
      {
       "item": "鞋一双，可指定样式",
       "points": 100
      },
      {
       "item": "眼镜或墨镜一副，可指定样式",
       "points": 150
      },
      {
       "item": "首饰一件，可指定样式",
       "points": 300
      },
      {
       "item": "耳塞一副",
       "points": 20
      },
      {
       "item": "文具一套（剪刀、尺、胶水、彩笔、便签）",
       "points": 60
      },
      {
       "item": "针线包",
       "points": 50
      },
      {
       "item": "背包一只",
       "points": 150
      },
      {
       "item": "行李箱一只",
       "points": 300
      },
      {
       "item": "垃圾袋一卷",
       "points": 20
      },
      {
       "item": "清洁剂、漂白剂与刷子一套",
       "points": 100
      },
      {
       "item": "其他棋牌、桌游一套，可指定",
       "points": 120
      }
     ]
    },
    {
     "no": "10.3",
     "title": "药与医疗",
     "items": [
      {
       "item": "听诊器、血压计与体温计一套",
       "points": 200
      },
      {
       "item": "止血带、缝合包、夹板",
       "points": 300
      },
      {
       "item": "急救箱一只",
       "points": 300
      },
      {
       "item": "手术器械一套（手术刀、止血钳、缝合针线）",
       "points": 800
      },
      {
       "item": "注射器十支",
       "points": 50
      },
      {
       "item": "拐杖一副",
       "points": 100
      },
      {
       "item": "轮椅一辆",
       "points": 600
      },
      {
       "item": "肾上腺素一支",
       "points": 800
      },
      {
       "item": "镇静剂一针：注射后几分钟内睡着，睡两到三小时",
       "points": 2000
      },
      {
       "item": "速效麻醉剂一剂：捂住口鼻或注射，一两分钟内失去知觉，约一小时后醒",
       "points": 3000
      }
     ]
    },
    {
     "no": "10.4",
     "title": "工具与器械",
     "items": [
      {
       "item": "钓鱼线一卷，50 m",
       "points": 60
      },
      {
       "item": "胶带、塑料布、手套",
       "points": 80
      },
      {
       "item": "折叠梯一架",
       "points": 150
      },
      {
       "item": "哨子一只",
       "points": 30
      },
      {
       "item": "强磁铁一块",
       "points": 50
      },
      {
       "item": "机关零件一包（滑轮、弹簧、钩子、细线、钢丝）",
       "points": 200
      },
      {
       "item": "定时器一只",
       "points": 50
      },
      {
       "item": "干冰 5 kg",
       "points": 150
      },
      {
       "item": "放大镜",
       "points": 50
      },
      {
       "item": "显微镜一台",
       "points": 1000
      },
      {
       "item": "化学试剂一套（常见酸碱、试纸、指示剂、量具）",
       "points": 800
      },
      {
       "item": "指纹粉、刷子与胶纸一套",
       "points": 1500
      },
      {
       "item": "摄像机一台",
       "points": 1500
      },
      {
       "item": "手机一部：能拍照、录音、录像，联络不到馆外",
       "points": 2000
      },
      {
       "item": "笔记本电脑一台，不联网",
       "points": 2000
      }
     ]
    },
    {
     "no": "10.5",
     "title": "防护",
     "items": [
      {
       "item": "防割手套一副",
       "points": 200
      },
      {
       "item": "头盔",
       "points": 500
      },
      {
       "item": "护目镜一副",
       "points": 100
      },
      {
       "item": "辣椒喷雾一罐",
       "points": 500
      },
      {
       "item": "防弹背心一件，挡得住一级火器的子弹",
       "points": 5000
      }
     ]
    },
    {
     "no": "10.6",
     "title": "武器",
     "items": [
      {
       "item": "匕首或厨刀级的利刃一把",
       "points": 80
      },
      {
       "item": "棍棒、球棒或甩棍一根",
       "points": 60
      },
      {
       "item": "砍刀或斧头一把",
       "points": 200
      },
      {
       "item": "长刀或剑一把，可指定样式",
       "points": 500
      },
      {
       "item": "电击器一只",
       "points": 2000
      },
      {
       "item": "弓或弩一把",
       "points": 5000
      },
      {
       "item": "箭或弩箭一支",
       "points": 8000
      },
      {
       "item": "致死的毒一剂，可指定是哪一种",
       "points": 8000
      },
      {
       "item": "手榴弹一枚",
       "points": 16000
      },
      {
       "item": "炸药一份，带引信",
       "points": 32000
      }
     ]
    },
    {
     "no": "10.7",
     "title": "火器",
     "items": [
      {
       "item": "消音器一只，装在一级、二级火器上",
       "points": 5000
      }
     ],
     "note": "每升一级，火器和弹药的价都乘 2。",
     "tiers": [
      {
       "level": "一级",
       "item": "手枪、左轮",
       "points": 5000,
       "round": 8000
      },
      {
       "level": "二级",
       "item": "步枪、霰弹枪、冲锋枪、狙击步枪",
       "points": 10000,
       "round": 16000
      },
      {
       "level": "三级",
       "item": "机枪、榴弹发射器、火箭炮",
       "points": 20000,
       "round": 32000
      }
     ]
    }
   ]
  },
  "void": {
   "text": "会直接破坏游戏本身的兑换，不成立：比如买回自己被封住的本事，买带超常本事的东西，打听谁是受命者、谁拿着什么身份、馆里别人的来历和行踪，请主持人替他杀人，买能绕过洋馆的门、锁、墙、出口、透明的墙或者联络馆外的东西，买一个馆外的人进来。不收金币，不停笔，他只得知不成立。",
   "kinds": [
    {
     "key": "power",
     "text": "买回自己被封住的本事"
    },
    {
     "key": "super",
     "text": "买带超常本事的东西"
    },
    {
     "key": "ask",
     "text": "打听谁是受命者、谁拿着什么身份、馆里别人的来历和行踪"
    },
    {
     "key": "kill",
     "text": "请主持人替他杀人"
    },
    {
     "key": "bypass",
     "text": "买能绕过洋馆的门、锁、墙、出口、透明的墙或者联络馆外的东西"
    },
    {
     "key": "outsider",
     "text": "买一个馆外的人进来"
    }
   ],
   "result": "不收金币，不停笔，他只得知不成立。",
   "other": [
    {
     "key": "round",
     "text": "一次兑换的总价必须正好是 100 的整数倍，付出相应枚数的金币。不足整枚的，添东西凑满，或者这一次兑换不成立。没有零钱，没有余额，主持人不找零。"
    },
    {
     "key": "purse",
     "text": "藏在别处的不参与结算，想用就得先去拿。身上的枚数不够，兑换不成立，他只得知不成立。"
    },
    {
     "key": "repair",
     "text": "在馆里受的伤，不论多重，都是伤势，不在此列；伤口、出血、骨折、中毒、烧伤、失温、疼痛，一概不管。疾病本身也不修。请求的是治伤、治病，或者对象身上没有卡上写明的残疾，报价时就告知不成立，不收金币。"
    },
    {
     "key": "service",
     "text": "别人的身体（修复身体残疾照第 9 节）、别人的套房和别人带着的东西、尸体、没审结的命案现场，都不成立（8.2）。"
    }
   ]
  }
 },
 "coins": {
  "points": 100,
  "startEach": 10,
  "seats": 13,
  "startTotal": 130,
  "d01": 5,
  "batch": 5,
  "solvedBonus": 5,
  "unsolvedKiller": 10,
  "ticket": 500,
  "repair": 5,
  "fine": 5,
  "size": {
   "d": 26.5,
   "t": 1.8,
   "g": 19,
   "stack10mm": 18,
   "stack10g": 190
  }
 },
 "broadcasts": {
  "fixed": [
   {
    "when": "尸体被有效发现",
    "text": "发现尸体。〈开庭时刻〉开庭。"
   },
   {
    "when": "同上，敲钟人生效",
    "text": "发现尸体。由于敲钟人的能力，现在开庭。"
   },
   {
    "when": "调查期内又发现尸体，庭期未变",
    "text": "又发现一具尸体。"
   },
   {
    "when": "调查期内又发现尸体，敲钟人生效",
    "text": "又发现一具尸体。由于敲钟人的能力，现在开庭。"
   },
   {
    "when": "辩论结束，主持人没有亲自开口",
    "text": "辩论结束，开始投票。"
   },
   {
    "when": "能力造成异变",
    "text": "由于〈身份名〉的能力，〈对异变的客观描述〉。"
   },
   {
    "when": "判定正确",
    "text": "判定正确。〈某某〉是〈死者〉一案的凶手。"
   },
   {
    "when": "误判",
    "text": "判定错误。〈某某〉不是〈死者〉一案的凶手。本场第〈一／二〉次误判。"
   },
   {
    "when": "共同指认正确",
    "text": "判定正确。〈某某〉和〈某某〉都是〈死者〉一案的凶手。"
   },
   {
    "when": "共同指认错误",
    "text": "判定错误。〈某某〉和〈某某〉不是〈死者〉一案的共同凶手。本场第〈一／二〉次误判。"
   },
   {
    "when": "只选中共同凶手中的一人",
    "text": "判定错误。〈死者〉一案的凶手不止〈某某〉一人。本场第〈一／二〉次误判。"
   },
   {
    "when": "自杀或事故判断正确",
    "text": "判定正确。〈死者〉死于〈自杀／事故〉。"
   },
   {
    "when": "自杀或事故判断错误",
    "text": "判定错误。〈死者〉不是死于〈自杀／事故〉。本场第〈一／二〉次误判。"
   },
   {
    "when": "未产生唯一结果",
    "text": "未产生唯一结果，重新投票。／连续两次未产生唯一结果，本场审判结束。"
   },
   {
    "when": "骑士揭发",
    "text": "揭发成功，〈某某〉是本批案件的凶手。／揭发失败。"
   },
   {
    "when": "愚者发动",
    "text": "〈某某〉不是凶手，处刑撤销，重新投票。／〈某某〉是凶手，能力无效。"
   },
   {
    "when": "受命者逾期",
    "text": "〈某某〉是受命者，未在期限内完成任务。"
   },
   {
    "when": "违反主持人的指令",
    "text": "〈某某〉违反了指令。罚款五百积分。"
   },
   {
    "when": "同上，积分不够扣",
    "text": "〈某某〉违反了指令，积分不足。处死。"
   }
  ],
  "abilities": [
   {
    "kind": "发动时全馆广播",
    "ability": "盲视者",
    "text": "由于盲视者的能力，全馆陷入黑暗。"
   },
   {
    "kind": "发动时全馆广播",
    "ability": "敲钟人",
    "text": "随尸体发现广播，见上表"
   },
   {
    "kind": "本人公开发动，不另广播",
    "ability": "执行者、骑士、愚者、律师、正位国王、平民",
    "text": "由持有者本人的公开言行为众人所知"
   },
   {
    "kind": "不广播",
    "ability": "世界、幽灵、暗杀者、逆位骑士的移尸、逆位国王的翻面",
    "text": "无。只留下实际的物理后果"
   },
   {
    "kind": "不广播",
    "ability": "隐者、沉默者、占卜家、丘比特、河豚、梦游神、法官、魔术师、窃贼、变形者、史莱姆、先知、兆示",
    "text": "无。条文规定的私人通知照常送达当事人"
   }
  ]
 },
 "opening": [
  {
   "no": 1,
   "title": "第一条播报",
   "when": "所有人都醒了以后",
   "text": "大家好，都醒了吧，欢迎来到这座馆，各位可以称呼我为主持人。\n\n我将大家请来这里，是为了参加一场游戏，而我会实现获胜者的一个愿望。一个不管内容是什么都可以实现的愿望。\n\n在说明游戏的具体规则之前，请各位先分配收纳台上的十三把钥匙，一人一把，号码自选。钥匙的编号，就是各位今后居住的房号，请保管好，遗失不补。我现在可以透露的是：编号会影响各位的命运。请慎重选择。\n\n钥匙分配完毕后，请按自己所选的编号重新入座。",
   "lines": [
    "大家好，都醒了吧，欢迎来到这座馆，各位可以称呼我为主持人。",
    "我将大家请来这里，是为了参加一场游戏，而我会实现获胜者的一个愿望。一个不管内容是什么都可以实现的愿望。",
    "在说明游戏的具体规则之前，请各位先分配收纳台上的十三把钥匙，一人一把，号码自选。钥匙的编号，就是各位今后居住的房号，请保管好，遗失不补。我现在可以透露的是：编号会影响各位的命运。请慎重选择。",
    "钥匙分配完毕后，请按自己所选的编号重新入座。"
   ],
   "effect": {}
  },
  {
   "no": 2,
   "title": "第二条播报",
   "when": "所有人都坐好以后",
   "text": "现在为大家发放的是每个人的初始积分，一枚金币代表一百分。\n\n金币可以自由交易、赠与；抢夺他人的金币在本馆内视为许可的行为。\n\n积分可以向我兑换物品。兑换方法和价目，刻在收纳台旁边的铜牌上。为了使游戏更加公平，修复身体残疾只要500积分。\n\n积分有额外的获取方式，时机到来时自会知晓。\n\n接下来，请各位从一号开始，按顺序进行自我介绍。\n\n自我介绍有着严格的格式要求，分别说出自己的名称，愿望，以及如果一定要有一个人先死，希望是在座的几号？\n\n想要在自我介绍撒谎也是诸位的自由，只是必须符合格式。",
   "lines": [
    "现在为大家发放的是每个人的初始积分，一枚金币代表一百分。",
    "金币可以自由交易、赠与；抢夺他人的金币在本馆内视为许可的行为。",
    "积分可以向我兑换物品。兑换方法和价目，刻在收纳台旁边的铜牌上。为了使游戏更加公平，修复身体残疾只要500积分。",
    "积分有额外的获取方式，时机到来时自会知晓。",
    "接下来，请各位从一号开始，按顺序进行自我介绍。",
    "自我介绍有着严格的格式要求，分别说出自己的名称，愿望，以及如果一定要有一个人先死，希望是在座的几号？",
    "想要在自我介绍撒谎也是诸位的自由，只是必须符合格式。"
   ],
   "effect": {
    "coins": 10,
    "coinsAt": "first"
   }
  },
  {
   "no": 3,
   "title": "第三条播报",
   "when": "所有人介绍完以后",
   "text": "接下来，进行第二次表决，同意立即处死刚才获票最多者的，请举手，我会根据举手人数考虑是否执行。",
   "lines": [
    "接下来，进行第二次表决，同意立即处死刚才获票最多者的，请举手，我会根据举手人数考虑是否执行。"
   ],
   "effect": {
    "hostDecides": true
   }
  },
  {
   "no": 4,
   "title": "第四条播报",
   "when": "所有人都表过态以后",
   "text": "现在说明规则。\n\n一：我不说谎。\n\n二：除了问价，我不回答问题。\n\n三：除了处刑和惩罚外，我不会主动杀死你们。\n\n四：会有人秘密成为受命者，受命者必须在二十四小时内杀死一个人。\n\n五：逾期的受命者，会被公开处死。\n\n六：受命者死去或离开后，会有新的受命者。\n\n七：任何人都可以杀人。\n\n八：馆内有人死亡，受命者的期限暂停。\n\n九：当馆内的尸体被发现后，启动为期一百二十分钟的调查，期满后开庭审判。\n\n十：凶手本人看见尸体不算发现，除非他在心里向我提出播报要求。\n\n十一：没有可能被发现的尸体，我会直接播报。\n\n十二：审判时，所有人先按席位号依次发言，再公开讨论，最后投票。\n\n十三：投票从一号席起依次进行，每人一票，可以投给自己，可以投给一同杀人的几个人，也可以对某一次死亡投自杀或意外；弃票算投给自己。\n\n十四：已经死去或离开的凶手，也可以被投。\n\n十五：得票唯一最高的人如果还活在馆内，就会被处死，不论他是不是凶手。\n\n十六：同一场审判投错两次，审判即结束。\n\n十七：最高票出现并列时，投票重新进行一次，并列的人这一次不能投票，但可以被投；连续两次投票都没有产生唯一的最高票，审判结束，不处刑。\n\n十八：审判全部结束后，受命者重新获得完整的二十四小时期限。\n\n十九：馆内最后活着的一个人，就是获胜者。",
   "lines": [
    "现在说明规则。",
    "一：我不说谎。",
    "二：除了问价，我不回答问题。",
    "三：除了处刑和惩罚外，我不会主动杀死你们。",
    "四：会有人秘密成为受命者，受命者必须在二十四小时内杀死一个人。",
    "五：逾期的受命者，会被公开处死。",
    "六：受命者死去或离开后，会有新的受命者。",
    "七：任何人都可以杀人。",
    "八：馆内有人死亡，受命者的期限暂停。",
    "九：当馆内的尸体被发现后，启动为期一百二十分钟的调查，期满后开庭审判。",
    "十：凶手本人看见尸体不算发现，除非他在心里向我提出播报要求。",
    "十一：没有可能被发现的尸体，我会直接播报。",
    "十二：审判时，所有人先按席位号依次发言，再公开讨论，最后投票。",
    "十三：投票从一号席起依次进行，每人一票，可以投给自己，可以投给一同杀人的几个人，也可以对某一次死亡投自杀或意外；弃票算投给自己。",
    "十四：已经死去或离开的凶手，也可以被投。",
    "十五：得票唯一最高的人如果还活在馆内，就会被处死，不论他是不是凶手。",
    "十六：同一场审判投错两次，审判即结束。",
    "十七：最高票出现并列时，投票重新进行一次，并列的人这一次不能投票，但可以被投；连续两次投票都没有产生唯一的最高票，审判结束，不处刑。",
    "十八：审判全部结束后，受命者重新获得完整的二十四小时期限。",
    "十九：馆内最后活着的一个人，就是获胜者。"
   ],
   "effect": {
    "ruleCard": true
   }
  },
  {
   "no": 5,
   "title": "第五条播报",
   "when": "第四条播报说完三分钟以后",
   "text": "现在，为所有人发放身份卡，那是决定各位命运的另一项道具，身份无法转让、拒绝。",
   "lines": [
    "现在，为所有人发放身份卡，那是决定各位命运的另一项道具，身份无法转让、拒绝。"
   ],
   "effect": {
    "after": 4,
    "afterMin": 3,
    "identityCard": true
   }
  },
  {
   "no": 6,
   "title": "第六条播报",
   "when": "第五条播报说完三分钟以后",
   "text": "现在，发布仅限今天二十四点之前完成的任务，只要去过馆内除套房外的每个房间，并在房间内待满至少五分钟，便可获得500积分的奖励，每人只能完成一次。",
   "lines": [
    "现在，发布仅限今天二十四点之前完成的任务，只要去过馆内除套房外的每个房间，并在房间内待满至少五分钟，便可获得500积分的奖励，每人只能完成一次。"
   ],
   "effect": {
    "after": 5,
    "afterMin": 3,
    "hallDoorsOpen": "start"
   }
  },
  {
   "no": 7,
   "title": "第七条播报",
   "when": "紧接着第六条播报",
   "text": "我会不定期和大家进行一些小游戏，胜利会有奖励，失败则会有惩罚。\n\n现在进行第一次小游戏。",
   "lines": [
    "我会不定期和大家进行一些小游戏，胜利会有奖励，失败则会有惩罚。",
    "现在进行第一次小游戏。"
   ],
   "effect": {
    "after": 6,
    "afterMin": 0,
    "hostDecides": true
   }
  },
  {
   "no": 8,
   "title": "第一天晚上八点",
   "when": "D01 20:00",
   "day": 1,
   "minute": 1200,
   "text": "现在为所有还存活的玩家发放500积分的奖励。\n\n希望大家在馆内生活愉快。",
   "lines": [
    "现在为所有还存活的玩家发放500积分的奖励。",
    "希望大家在馆内生活愉快。"
   ],
   "effect": {
    "coins": 5
   }
  }
 ],
 "ruleCard": [
  {
   "n": 1,
   "no": "一",
   "text": "我不说谎。"
  },
  {
   "n": 2,
   "no": "二",
   "text": "除了问价，我不回答问题。"
  },
  {
   "n": 3,
   "no": "三",
   "text": "除了处刑和惩罚外，我不会主动杀死你们。"
  },
  {
   "n": 4,
   "no": "四",
   "text": "会有人秘密成为受命者，受命者必须在二十四小时内杀死一个人。"
  },
  {
   "n": 5,
   "no": "五",
   "text": "逾期的受命者，会被公开处死。"
  },
  {
   "n": 6,
   "no": "六",
   "text": "受命者死去或离开后，会有新的受命者。"
  },
  {
   "n": 7,
   "no": "七",
   "text": "任何人都可以杀人。"
  },
  {
   "n": 8,
   "no": "八",
   "text": "馆内有人死亡，受命者的期限暂停。"
  },
  {
   "n": 9,
   "no": "九",
   "text": "当馆内的尸体被发现后，启动为期一百二十分钟的调查，期满后开庭审判。"
  },
  {
   "n": 10,
   "no": "十",
   "text": "凶手本人看见尸体不算发现，除非他在心里向我提出播报要求。"
  },
  {
   "n": 11,
   "no": "十一",
   "text": "没有可能被发现的尸体，我会直接播报。"
  },
  {
   "n": 12,
   "no": "十二",
   "text": "审判时，所有人先按席位号依次发言，再公开讨论，最后投票。"
  },
  {
   "n": 13,
   "no": "十三",
   "text": "投票从一号席起依次进行，每人一票，可以投给自己，可以投给一同杀人的几个人，也可以对某一次死亡投自杀或意外；弃票算投给自己。"
  },
  {
   "n": 14,
   "no": "十四",
   "text": "已经死去或离开的凶手，也可以被投。"
  },
  {
   "n": 15,
   "no": "十五",
   "text": "得票唯一最高的人如果还活在馆内，就会被处死，不论他是不是凶手。"
  },
  {
   "n": 16,
   "no": "十六",
   "text": "同一场审判投错两次，审判即结束。"
  },
  {
   "n": 17,
   "no": "十七",
   "text": "最高票出现并列时，投票重新进行一次，并列的人这一次不能投票，但可以被投；连续两次投票都没有产生唯一的最高票，审判结束，不处刑。"
  },
  {
   "n": 18,
   "no": "十八",
   "text": "审判全部结束后，受命者重新获得完整的二十四小时期限。"
  },
  {
   "n": 19,
   "no": "十九",
   "text": "馆内最后活着的一个人，就是获胜者。"
  }
 ],
 "openingTask": {
  "rooms": {
   "B1": [
    "更衣室",
    "泳池厅",
    "浴疗室",
    "泳池机房",
    "健身房",
    "保龄球馆",
    "洗衣房",
    "物资库",
    "工具间",
    "酒窖",
    "品酒室",
    "机房",
    "家具储藏室",
    "箱笼储藏室",
    "地毯储藏室",
    "杂物储藏室"
   ],
   "1F": [
    "穹顶议事厅",
    "花园",
    "自然史大厅",
    "古兽厅",
    "起居厅",
    "晨间厅",
    "园艺间",
    "衣帽间",
    "盥洗室",
    "音乐沙龙",
    "宴饮厅",
    "厨房"
   ],
   "2F": [
    "大图书室",
    "阅览室",
    "地图室",
    "放映厅",
    "游戏室",
    "棋艺室",
    "二层起居室",
    "标本陈列室"
   ],
   "3F": [
    "画室",
    "修复室",
    "瓷器室",
    "茶室",
    "天象室",
    "三层起居室",
    "舞蹈室",
    "猎藏厅"
   ]
  },
  "minutes": 5,
  "points": 500,
  "until": "D01 24:00"
 }
};
