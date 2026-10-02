# 音频引擎与原创配乐（core/audio.js）

你的文件：`assets/js/core/audio.js`（整个文件归你；它会替换 `app.js` 里的 `App.audio` 占位），以及可选的 `assets/audio/` 下的说明（不要放任何下载来的音频文件）。读 `assets/audio/tracks.js`：用户可以在那里填入自己的 mp3 文件名替换某段配乐。

## 目标

用 **Web Audio API 实时合成**全部配乐与音效，原创、无版权问题、离线可用。品质要像一款认真做的悬疑游戏的配乐，而不是「哔哔声」：音乐盒、钢琴/羽管键琴、弦乐垫、低频嗡鸣、钟摆、心跳、铃，配合混响（用卷积混响：程序生成的衰减噪声脉冲响应）和延迟，做出空间感。风格：弹丸论破的「诡异的可爱 + 紧迫的电子节奏」与人狼村之谜的「和风的阴冷、留白」之间。

## API（必须完全实现，名字不能改）

- `App.audio.start()`：在用户第一次点击后创建 AudioContext 并开始（遮幕的「睁开眼睛」按钮会调用）。之前调用其他方法要安全地忽略或排队。
- `App.audio.track(name)`：`'dread' | 'gallery' | 'investigation' | 'trial' | 'wish' | 'silence'`，2–3 秒交叉淡化。同名重复调用无操作。
  - `dread`：洋馆的日常。缓慢的小调音乐盒旋律（可以是 3/4 拍的不完整圆舞曲，音符偶尔走调/跳拍），底下是持续的低频嗡鸣与远处的钟摆滴答。
  - `gallery`：肖像长廊。更有旋律性的羽管键琴/钢琴小调圆舞曲，弦乐垫，偶尔一个不和谐的高音。
  - `investigation`：调查。脉冲式低音（八分音符）、钟表滴答、紧张的持续音、零星的金属敲击；`setMood({tension})` 增加密度。
  - `trial`：庭审。推进的节奏（底鼓、军鼓刷、贝斯琶音、断奏弦乐），弹丸论破式的紧迫——但用你自己的原创旋律与和声进行。tension=1 时加入更急促的打击层。
  - `wish`：终章。破碎、逐渐变慢的音乐盒，残响很长。
  - 每段至少 16–32 小节不重复的材料，用种子随机做变奏，听十分钟也不会觉得在死循环。
  - 若 `window.TRACK_FILES[name]` 填了文件名，用 `<audio src="assets/audio/<文件名>" loop>` 经 MediaElementSource 接入同一个总线播放，替代合成版本（file:// 下 `<audio>` 可用）。
- `App.audio.sfx(name, opts)`：名称表——`hover`（极短、很轻的高频）、`click`、`tick`（钟摆）、`chime`（落地钟一声，深沉、带泛音）、`chimes5`（17:00 五声报时，间隔约 1.6 秒，最后一声余音很长）、`discover`（发现尸体的警示：一段刺耳但有旋律的三音警示 + 低音冲击，弹丸论破式，原创）、`flip`（纸牌翻转）、`card`（发牌，纸张滑动）、`coin`（一枚金币叮当）、`coins`（一串）、`stamp`（投票落定的重击）、`vote`（红线射出的「嗖」+ 小击）、`slash`（斜切转场的刃声）、`glitch`（数字故障）、`heartbeat`（两拍心跳）、`door`（门被强行闭合的巨响）、`execute`（处刑：下坠的嗡鸣 + 重击 + 余响）、`wrong`（错误）、`correct`（正确）、`type`（打字机一下，极轻，可高频调用）、`whoosh`、`drop`（物件落定）、`bell`（敲钟人）、`dark`（全馆陷入黑暗：所有声音被吸走的感觉）、`wind`。`opts` 可含 `{volume, pitch}`。高频调用（hover/type）要节流，不能爆音。
- `App.audio.setMood({tension})`：0–1。
- `App.audio.setMuted(bool)` 与 `App.audio.muted`（布尔属性）。初始值读 `App.store.get('muted', false)`。
- `App.audio.level()`：返回当前总输出电平 0–1（用 AnalyserNode），HUD 的声音按钮会随它跳动。
- **光标调制**：在 `App.tick` 里读 `App.mouse.speed` 与 `App.mouse.ny`，轻微调制音乐的低通滤波截止频率（光标越高越亮）和某个垫音的音量/颤音（移动越快越不安）。要细微，不能干扰听感。

## 工程要求

- 一个总线：各音轨 → 音轨增益 → 音乐总线 → 压缩器 → 主增益 → 输出；音效走单独的总线，同样经过混响发送。主音量适中，避免削波（用 DynamicsCompressor 做限幅）。
- 调度用前瞻调度器（lookahead scheduler，setInterval 25ms + 提前 0.1s 调度），不要每个音符一个 setTimeout。
- 页面隐藏（`visibilitychange`）时降低音量或暂停调度。
- 性能：同时活跃的节点数有上限；音符结束后断开节点。
- 自检：写一个小的离线测试——用 `OfflineAudioContext` 在 Playwright 里渲染每段音乐 8 秒、每个音效一次，检查没有异常、峰值不过载（打印峰值与 RMS）。可以写在 `tools/test-audio.mjs`（这个文件也归你）。你听不见声音，所以要靠波形统计和对作曲结构的严格推敲来保证质量：调式、和声进行、节奏型、音色包络都要明确设计，写在代码注释里。
