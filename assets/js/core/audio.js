/* ==========================================================
   十五席 · 音频引擎（core/audio.js）
   全部配乐与音效用 Web Audio API 实时合成：原创、无版权、离线可用（file:// 直接跑）。

   公开接口（替换 app.js 里的 App.audio 占位）
     App.audio.start()                 用户第一次点击后创建 AudioContext；之前的 track() 会排队，sfx() 忽略
     App.audio.track(name)             'dread' | 'gallery' | 'investigation' | 'trial' | 'wish' | 'silence'
                                       约 2.6 秒交叉淡化；同名重复调用无操作
     App.audio.sfx(name, opts)         opts: { volume 0–2, pitch 频率倍数 0.25–4, pan -1–1, delay 秒 }
     App.audio.setMood({ tension })    0–1：调查/庭审的节奏密度、滤波亮度、颤音
     App.audio.setMuted(bool)          App.audio.muted 为布尔属性；初值读 App.store.get('muted')
     App.audio.hush(bool)              放映宣传片时让出声音：淡出整站音乐与音效（不改动静音设置）
     App.audio.level()                 当前总输出电平 0–1（AnalyserNode）
   换成自己的音乐：在 assets/audio/tracks.js 的 TRACK_FILES 填文件名，即以 <audio loop> 经
   MediaElementSource 接入同一总线（若 file:// 下浏览器把它静音，会自动改为直接播放）。

   信号流
     音符 → 乐器通道(滤波/声像/音量) ─┬→ 音轨淡化增益 ─→ 音乐总线 → 光标低通 → 闪避 ─┐
                                      ├→ 混响发送 → 音轨湿声 ──→ 卷积混响(厅/深渊) ────┤
                                      └→ 乒乓延迟 → 音轨淡化增益                       │
     音效 → 音效总线 ───────────────────────────────────────────────────────────────┤
                                                                                      ↓
                    混合 → 总低通(「黑暗」用) → 压缩限幅 → 软削波 → 主增益 → 静音 → 隐藏 → 电平表 → 输出
     · 混响：两个卷积器，脉冲响应由程序生成（衰减噪声，高频比低频衰减得快，加早期反射）。
       hall 约 3 秒（洋馆的大厅），abyss 约 7.5 秒（终章、钟声、处刑的余响）。
     · 调度：前瞻调度器——setInterval 25 ms，每次排好未来 0.1 s 内的全部音符；
       每段音乐是一个步进音序器，每小节开始时「作曲」出这一小节的事件表（种子随机），
       事件函数在被调度的那一刻才读张力，所以 setMood 半小节内就听得出来。
     · 采样：音乐盒、羽管键琴、钢琴、低音提琴、筝、钟、鼓、金属、硬币……都在启动时用 DSP 渲染成
       AudioBuffer（加法合成 / Karplus–Strong 拨弦 / 噪声整形）。17:00 的钟声与音乐盒同步渲染，
       其余交给 Blob Worker 在后台渲染（失败则主线程空闲时分片渲染），不卡开场动画。
     · 节点：一次性节点在 onended 时断开；同时发声数有上限（MAX_VOICES）；hover/type 节流。
     · 页面隐藏：0.3 s 淡出后挂起 AudioContext，回来时恢复并淡入。静音同理。
     · 光标：鼠标越高，音乐低通越亮（约 4 kHz → 18 kHz）；移动越快，弦乐垫音越响、颤音越深越快。
     · 电平（离线实测，tools/test-audio.mjs + ebur128）：各段音乐约 −19.5～−22.5 LUFS，张力满时再响 1～3 LU；
       重大音效（发现尸体、处刑、关门、报时）瞬时最大约 −11～−13 LUFS，并让音乐闪避；hover/type 远低于音乐。
   ========================================================== */
(function () {
  'use strict'
  const App = (window.App = window.App || {})
  const AC = window.AudioContext || window.webkitAudioContext
  const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext

  const LOOKAHEAD = 0.1      // 秒：调度窗口
  const TICK_MS = 25         // 调度器间隔
  const MAX_VOICES = 150     // 同时存在的发声源上限

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12)

  /* ======================================================
     §1 DSP：纯函数采样渲染器
     这个工厂函数会被 toString() 塞进 Worker，所以不能引用外部任何变量。
     ====================================================== */
  function DSPFactory() {
    'use strict'
    const TAU = Math.PI * 2
    const mtof = m => 440 * Math.pow(2, (m - 69) / 12)
    const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
    function rng(seed) {
      let s = (seed >>> 0) || 1
      return function () {
        s = (s + 0x6d2b79f5) >>> 0
        let t = s
        t = Math.imul(t ^ (t >>> 15), t | 1)
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
      }
    }
    const buf = (sr, sec) => new Float32Array(Math.max(32, Math.ceil(sr * sec)))

    // 一个指数衰减的正弦分音（递推振荡器：每样本两次乘加，比 Math.sin 快得多）
    // tau 为时间常数（振幅降到 1/e 的秒数；T60 ≈ 6.9·tau）
    function partial(out, sr, f, amp, tau, phase, att, start) {
      if (!(f > 0) || f >= sr * 0.46 || !amp) return
      phase = phase || 0
      start = start || 0
      const w = TAU * f / sr
      const c2 = 2 * Math.cos(w)
      let y1 = Math.sin(phase - w), y0 = Math.sin(phase)
      const k = Math.exp(-1 / (tau * sr))
      let env = amp
      const end = Math.min(out.length, start + Math.ceil(tau * sr * 10))
      const na = Math.min(end, start + Math.max(1, Math.round((att || 0.001) * sr)))
      let i = start
      const an = na - start
      for (; i < na; i++) {
        out[i] += y0 * env * ((i - start) / an)
        const y = c2 * y0 - y1; y1 = y0; y0 = y
        env *= k
      }
      for (; i < end; i++) {
        out[i] += y0 * env
        const y = c2 * y0 - y1; y1 = y0; y0 = y
        env *= k
      }
    }

    // 衰减噪声（可选一阶低通 / 差分高通）
    function burst(out, sr, r, amp, tau, o) {
      o = o || {}
      const start = o.start || 0
      const n = Math.min(out.length, start + Math.ceil(tau * sr * 9))
      const k = Math.exp(-1 / (tau * sr))
      const a = o.lp ? 1 - Math.exp(-TAU * o.lp / sr) : 1
      const att = Math.max(1, Math.round((o.att || 0.0004) * sr))
      let env = amp, lp = 0, prev = 0
      for (let i = start; i < n; i++) {
        let x = r() * 2 - 1
        lp += a * (x - lp); x = lp
        if (o.hp) { const y = x - prev; prev = x; x = y }
        const j = i - start
        out[i] += x * env * (j < att ? j / att : 1)
        env *= k
      }
    }

    // RBJ 双二阶滤波
    function coeffs(type, f, q, sr) {
      const w = TAU * Math.min(f, sr * 0.45) / sr, cs = Math.cos(w), sn = Math.sin(w), al = sn / (2 * q)
      let b0, b1, b2
      const a0 = 1 + al, a1 = -2 * cs, a2 = 1 - al
      if (type === 'bp') { b0 = al; b1 = 0; b2 = -al }
      else if (type === 'lp') { b0 = (1 - cs) / 2; b1 = 1 - cs; b2 = b0 }
      else { b0 = (1 + cs) / 2; b1 = -(1 + cs); b2 = b0 }
      return [b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0]
    }
    function biq(arr, c) {
      let x1 = 0, x2 = 0, y1 = 0, y2 = 0
      for (let i = 0; i < arr.length; i++) {
        const x = arr[i]
        const y = c[0] * x + c[1] * x1 + c[2] * x2 - c[3] * y1 - c[4] * y2
        x2 = x1; x1 = x; y2 = y1; y1 = y
        arr[i] = y
      }
    }
    function normalize(chs, peak) {
      let m = 0
      for (const a of chs) for (let i = 0; i < a.length; i++) { const v = a[i] < 0 ? -a[i] : a[i]; if (v > m) m = v }
      if (m > 0) { const g = peak / m; for (const a of chs) for (let i = 0; i < a.length; i++) a[i] *= g }
      return chs
    }
    function fadeTail(a, sec, sr) {
      const n = Math.min(a.length, Math.round(sec * sr))
      for (let i = 0; i < n; i++) a[a.length - 1 - i] *= i / n
    }
    function dcBlock(a) {
      let x1 = 0, y1 = 0
      for (let i = 0; i < a.length; i++) { const y = a[i] - x1 + 0.995 * y1; x1 = a[i]; y1 = y; a[i] = y }
    }

    // Karplus–Strong 拨弦：延迟线 + 环内一阶低通(rho) + 全通分数延迟（保证音准）
    // rho 越小越亮；t60 为整体衰减；pick 为拨弦位置（梳状滤波）；excLP 激励的暗度
    function ks(out, sr, f, o) {
      const r = rng(o.seed || 1)
      const rho = o.rho == null ? 0.5 : o.rho
      const P = sr / f
      const N = Math.floor(P - rho - 0.1)
      if (N < 2) return
      const d = P - rho - N
      const C = (1 - d) / (1 + d)
      const g = Math.pow(0.001, 1 / (f * (o.t60 || 3)))
      const L = Math.max(2, Math.round(P))
      const exc = new Float32Array(L)
      const ea = o.excLP ? 1 - o.excLP : 1
      let lp = 0, mean = 0
      for (let i = 0; i < L; i++) { lp += ea * ((r() * 2 - 1) - lp); exc[i] = lp; mean += lp }
      mean /= L
      for (let i = 0; i < L; i++) exc[i] -= mean
      if (o.pick) {
        const D = Math.max(1, Math.round(o.pick * L))
        for (let i = L - 1; i >= D; i--) exc[i] -= exc[i - D]
      }
      const gain = o.gain == null ? 1 : o.gain
      const line = new Float32Array(N)
      let idx = 0, lpPrev = 0, apx = 0, apy = 0
      for (let i = 0; i < out.length; i++) {
        const dl = line[idx]
        const v = (1 - rho) * dl + rho * lpPrev; lpPrev = dl
        const a = C * v + apx - C * apy; apx = v; apy = a
        const y = (i < L ? exc[i] : 0) + g * a
        line[idx] = y
        idx = idx + 1 === N ? 0 : idx + 1
        out[i] += y * gain
      }
    }

    // 落地钟的钟簧 / 钟楼的大钟：加法合成，成对略失谐的分音制造「嗡——」的拍频
    function bellish(sr, f, parts, dur, strike, seed) {
      const r = rng(seed)
      const out = buf(sr, dur)
      for (const p of parts) partial(out, sr, f * p[0], p[1], p[2] / 6.9, r() * TAU, 0.0015)
      if (strike) {
        const ex = buf(sr, 0.08)
        burst(ex, sr, r, 1, strike.tau || 0.006)
        biq(ex, coeffs('bp', strike.f || 2500, strike.q || 1.4, sr))
        for (let i = 0; i < ex.length; i++) out[i] += ex[i] * (strike.amp || 0.3)
        if (strike.thud) partial(out, sr, strike.thud, strike.thudAmp || 0.2, 0.03, 0, 0.001)
      }
      fadeTail(out, 0.6, sr)
      return normalize([out], 0.9)
    }

    function drum(sr, o, seed) {
      const r = rng(seed)
      const out = buf(sr, o.dur)
      let ph = 0, ph2 = 0
      for (let i = 0; i < out.length; i++) {
        const t = i / sr
        const f = o.f1 + (o.f0 - o.f1) * Math.exp(-t / o.ptau)
        ph += TAU * f / sr
        ph2 += TAU * f * 1.593 / sr
        const env = Math.exp(-t / o.tau) * Math.min(1, t / 0.002)
        out[i] = Math.sin(ph) * env + Math.sin(ph2) * env * (o.mode2 || 0) * Math.exp(-t / (o.tau * 0.3))
      }
      burst(out, sr, r, o.skin || 0.2, 0.025, { lp: o.skinLP || 1800 })
      if (o.slap) {
        const ex = buf(sr, 0.1)
        burst(ex, sr, r, 1, 0.01)
        biq(ex, coeffs('bp', 650, 1.2, sr))
        for (let i = 0; i < ex.length; i++) out[i] += ex[i] * o.slap
      }
      for (let i = 0; i < out.length; i++) out[i] = Math.tanh(out[i] * 1.3)
      fadeTail(out, 0.1, sr)
      return normalize([out], 0.9)
    }

    function clockTick(sr, f, kf, seed, len) {
      const r = rng(seed)
      const out = buf(sr, len || 0.16)
      const ex = buf(sr, len || 0.16)
      burst(ex, sr, r, 1, 0.0007)
      biq(ex, coeffs('bp', f, 9, sr))
      for (let i = 0; i < out.length; i++) out[i] = ex[i] * 3
      partial(out, sr, f * 0.79, 0.25, 0.01, 0, 0.0003)
      partial(out, sr, kf, 0.3, 0.018, 0, 0.0005)
      burst(out, sr, r, 0.15, 0.0015, { hp: true })
      fadeTail(out, 0.02, sr)
      return normalize([out], 0.8)
    }

    const R = {
      /* 音乐盒：音梳的金属簧片。基音长衰减；第二振动模态约 5.93 倍、迅速消失，给出「叮」的亮头；
         再叠一条相差 0.1% 的基音做缓慢拍频——旧机芯的那种不稳。拨针的瞬态是一小撮高通噪声。 */
      mbox(p, sr) {
        const f = mtof(p.midi), r = rng(p.midi * 977 + 13)
        const tau = clamp(0.95 * Math.pow(880 / f, 0.45), 0.35, 2.4)
        const out = buf(sr, Math.min(tau * 5.2 + 0.05, 3.4))
        partial(out, sr, f, 1, tau, 0, 0.0007)
        partial(out, sr, f * 1.0011, 0.13, tau * 1.15, 1.7, 0.0007)
        partial(out, sr, f * 2, 0.05, tau * 0.35, 0.4)
        partial(out, sr, f * 3.01, 0.02, tau * 0.2, 1.1)
        partial(out, sr, f * 5.93, 0.2, Math.min(0.22, tau * 0.18), 0.3, 0.0004)
        partial(out, sr, f * 13.2, 0.06, 0.03, 2.2, 0.0003)
        burst(out, sr, r, 0.05, 0.0012, { hp: true })
        fadeTail(out, 0.05, sr)
        return normalize([out], 0.8)
      },
      /* 羽管键琴：8' 两根略失谐的弦 + 4' 高八度弦，KS 拨弦，拨点靠近琴码（明亮、带鼻音） */
      harpsi(p, sr) {
        const f = mtof(p.midi)
        const t60 = clamp(9 * Math.pow(110 / f, 0.4), 2.5, 9)
        const out = buf(sr, Math.min(t60 * 0.6 + 0.3, 2.8))
        ks(out, sr, f, { seed: p.midi * 7 + 1, rho: 0.1, t60, pick: 0.09, excLP: 0.2 })
        ks(out, sr, f * 1.0016, { seed: p.midi * 7 + 2, rho: 0.14, t60: t60 * 0.85, pick: 0.13, excLP: 0.2, gain: 0.55 })
        if (f * 2 < sr / 6) ks(out, sr, f * 2, { seed: p.midi * 7 + 3, rho: 0.18, t60: t60 * 0.55, pick: 0.1, gain: 0.28 })
        dcBlock(out)
        // 拨弦的第一个周期是原始噪声，峰值远高于持续部分：用 tanh 轻压，降低峰值因数
        normalize([out], 1)
        for (let i = 0; i < out.length; i++) out[i] = Math.tanh(out[i] * 2.6)
        fadeTail(out, 0.25, sr)
        return normalize([out], 0.8)
      },
      /* 柔音钢琴：非谐分音（刚性弦），击弦点约在 1/8 处削弱对应泛音；
         双段衰减（敲击后的快衰减 + 长余音），前几个分音由两根弦略失谐地合成，余音里有轻微的拍。 */
      piano(p, sr) {
        const f = mtof(p.midi), r = rng(p.midi * 13 + 1)
        const t1 = clamp(2.6 * Math.pow(261.6 / f, 0.55), 0.6, 6.5)
        const out = buf(sr, Math.min(t1 * 2 + 0.2, 3.4))
        const B = 0.00008 * Math.pow(2, (p.midi - 21) / 18)
        const K = Math.min(18, Math.floor(sr * 0.42 / f))
        for (let n = 1; n <= K; n++) {
          const fn = n * f * Math.sqrt(1 + B * n * n)
          const strike = Math.abs(Math.sin(Math.PI * n * 0.12))
          const amp = Math.pow(n, -1.1) * Math.exp(-(n - 1) * (0.12 + f / 3000)) * (0.35 + strike)
          const tau = t1 / (1 + 0.32 * (n - 1))
          const ph = r() * TAU
          partial(out, sr, fn, amp * 0.6, tau * 0.2, ph, 0.002)
          partial(out, sr, fn * (n < 6 ? 1.0004 : 1), amp * 0.4, tau, ph + 0.5, 0.002)
        }
        burst(out, sr, r, 0.04, 0.004, { lp: 2200 })
        fadeTail(out, 0.3, sr)
        return normalize([out], 0.8)
      },
      /* 低音提琴（拨奏）：暗的 KS + 指腹的基音 + 一点拨弦的肉声 */
      ubass(p, sr) {
        const f = mtof(p.midi), r = rng(p.midi * 11 + 5)
        const out = buf(sr, 1.7)
        ks(out, sr, f, { seed: p.midi * 3 + 9, rho: 0.42, t60: 2.4, pick: 0.21, excLP: 0.75 })
        partial(out, sr, f, 0.35, 0.45, 0, 0.004)
        partial(out, sr, f * 2, 0.12, 0.2, 0, 0.003)
        burst(out, sr, r, 0.15, 0.008, { lp: 900 })
        dcBlock(out); fadeTail(out, 0.3, sr)
        return normalize([out], 0.85)
      },
      /* 筝：义甲在近琴码处拨弦，亮而短；推弦在播放时用 playbackRate 完成 */
      koto(p, sr) {
        const f = mtof(p.midi), r = rng(p.midi * 5 + 3)
        const out = buf(sr, 2.8)
        ks(out, sr, f, { seed: p.midi + 77, rho: 0.2, t60: 4, pick: 0.07 })
        ks(out, sr, f * 1.0025, { seed: p.midi + 78, rho: 0.28, t60: 3.2, pick: 0.11, gain: 0.35 })
        burst(out, sr, r, 0.25, 0.002, { hp: true })
        dcBlock(out); fadeTail(out, 0.3, sr)
        return normalize([out], 0.8)
      },
      /* 落地钟的钟簧（D3）：自由–固定杆的非谐分音 1 : 2.756 : 5.404 : 8.933，加一个低八度的嗡声。 */
      gong(p, sr) {
        return bellish(sr, 146.83, [
          [0.5, 0.3, 9.5], [1, 1, 9], [1.0019, 0.45, 8], [2, 0.16, 4.5],
          [2.756, 0.5, 4], [2.763, 0.28, 3.4], [4.07, 0.08, 1.8], [5.404, 0.26, 1.9], [5.42, 0.1, 1.4],
          [8.933, 0.12, 0.8], [13.34, 0.05, 0.4],
        ], 9, { f: 2800, q: 1.5, amp: 0.25, tau: 0.006, thud: 70, thudAmp: 0.2 }, 811)
      },
      /* 钟楼的大钟（A2，小三度钟）：hum 0.5、prime 1、tierce 1.19、quint 1.5、nominal 2…… */
      tbell(p, sr) {
        return bellish(sr, 110, [
          [0.5, 0.5, 11], [0.5012, 0.3, 10], [1, 0.6, 7], [1.0023, 0.3, 6.5], [1.19, 0.45, 5],
          [1.5, 0.25, 3.5], [2, 0.5, 4], [2.004, 0.2, 3.6], [2.51, 0.2, 2.2], [2.66, 0.14, 2],
          [3.01, 0.16, 1.6], [4.17, 0.1, 1.1], [5.43, 0.06, 0.7], [6.8, 0.04, 0.45],
        ], 10, { f: 1500, q: 0.8, amp: 0.35, tau: 0.01, thud: 90, thudAmp: 0.15 }, 733)
      },
      kick(p, sr) {
        const r = rng(91), out = buf(sr, 0.6)
        let ph = 0
        for (let i = 0; i < out.length; i++) {
          const t = i / sr
          ph += TAU * (46 + 110 * Math.exp(-t / 0.032)) / sr
          out[i] = Math.tanh(Math.sin(ph) * Math.exp(-t / 0.24) * Math.min(1, t / 0.0015) * 1.6)
        }
        burst(out, sr, r, 0.25, 0.0025, { hp: true })
        fadeTail(out, 0.05, sr)
        return normalize([out], 0.9)
      },
      // 军鼓（刷子击打）：宽带噪声 + 鼓身 190 Hz
      snare(p, sr) {
        const r = rng(17), out = buf(sr, 0.6), tmp = buf(sr, 0.6)
        burst(tmp, sr, r, 0.9, 0.1, { att: 0.002 })
        burst(tmp, sr, r, 0.25, 0.26, { att: 0.01 })
        biq(tmp, coeffs('bp', 3400, 0.55, sr))
        for (let i = 0; i < out.length; i++) out[i] = tmp[i]
        partial(out, sr, 190, 0.35, 0.05, 0, 0.001)
        partial(out, sr, 330, 0.12, 0.03)
        fadeTail(out, 0.05, sr)
        return normalize([out], 0.85)
      },
      // 刷子扫过鼓皮：慢起的高频噪声
      brush(p, sr) {
        const r = rng(23), out = buf(sr, 0.36)
        for (let i = 0; i < out.length; i++) {
          const t = i / sr
          const env = t < 0.05 ? Math.pow(t / 0.05, 1.5) : Math.exp(-(t - 0.05) / 0.07)
          out[i] = (r() * 2 - 1) * env
        }
        biq(out, coeffs('bp', 4800, 0.8, sr))
        fadeTail(out, 0.05, sr)
        return normalize([out], 0.6)
      },
      // 踩镲：六个方波的金属簇 + 噪声，高通
      hat(p, sr) {
        const r = rng(p.open ? 41 : 43), dur = p.open ? 0.7 : 0.14, tau = p.open ? 0.2 : 0.028
        const out = buf(sr, dur)
        const fr = [205.3, 304.4, 369.6, 522.7, 540, 800]
        const ph = fr.map(() => r())
        for (let i = 0; i < out.length; i++) {
          const t = i / sr
          let s = 0
          for (let k = 0; k < 6; k++) s += ((t * fr[k] + ph[k]) % 1) < 0.5 ? 1 : -1
          out[i] = (s / 6 * 0.6 + (r() * 2 - 1) * 0.5) * Math.exp(-t / tau) * Math.min(1, t / 0.0005)
        }
        biq(out, coeffs('hp', 7000, 0.7, sr))
        biq(out, coeffs('bp', 10000, 0.9, sr))
        fadeTail(out, 0.02, sr)
        return normalize([out], 0.7)
      },
      tom(p, sr) { return drum(sr, { f0: 165, f1: 105, ptau: 0.06, tau: 0.3, dur: 0.9, skin: 0.25, mode2: 0.2 }, 51) },
      // 太鼓：低沉的「咚」，第二膜振动模态 1.593 倍，加鼓面中央的拍击声
      taiko(p, sr) { return drum(sr, { f0: 92, f1: 56, ptau: 0.05, tau: 0.55, dur: 1.5, skin: 0.4, skinLP: 900, mode2: 0.35, slap: 0.25 }, 52) },
      // 金属敲击：四种非谐结构（杆 / 板 / 管 / 小铃）
      metal(p, sr) {
        const S = [
          [523.3, [1, 2.756, 5.404, 8.933], [1, 0.6, 0.35, 0.2], [0.5, 0.3, 0.18, 0.1]],
          [698.5, [1, 1.58, 2.14, 2.92, 3.6], [1, 0.7, 0.5, 0.35, 0.2], [0.4, 0.28, 0.2, 0.14, 0.09]],
          [329.6, [1, 2.32, 4.25, 6.63, 9.38], [1, 0.5, 0.4, 0.25, 0.15], [0.7, 0.35, 0.2, 0.12, 0.07]],
          [987.8, [1, 1.41, 2.24, 2.83, 3.61], [0.9, 0.8, 0.5, 0.4, 0.3], [0.3, 0.22, 0.16, 0.11, 0.08]],
        ][p.v % 4]
        const r = rng(300 + p.v), out = buf(sr, 2.6)
        for (let k = 0; k < S[1].length; k++) {
          const fk = S[0] * S[1][k]
          partial(out, sr, fk, S[2][k], S[3][k], r() * TAU, 0.0004)
          partial(out, sr, fk * 1.003, S[2][k] * 0.4, S[3][k] * 0.8, r() * TAU, 0.0004)
        }
        burst(out, sr, r, 0.4, 0.002, { hp: true })
        fadeTail(out, 0.2, sr)
        return normalize([out], 0.85)
      },
      // 硬币：圆片的非谐模态 + 落桌后弹起的第二次轻碰
      coin(p, sr) {
        const f0 = [2637, 3136, 2349][p.v % 3], r = rng(500 + p.v), out = buf(sr, 1.3)
        const rs = [1, 1.505, 2.31, 2.62, 3.84], as = [1, 0.6, 0.5, 0.33, 0.2], ts = [0.32, 0.22, 0.16, 0.12, 0.07]
        for (let k = 0; k < 5; k++) {
          const fk = f0 * rs[k] * (1 + (r() - 0.5) * 0.01)
          partial(out, sr, fk, as[k], ts[k], r() * TAU, 0.0003)
          partial(out, sr, fk * 1.0035, as[k] * 0.5, ts[k] * 0.8, r() * TAU, 0.0003)
        }
        burst(out, sr, r, 0.4, 0.0012, { hp: true })
        const s2 = Math.round(sr * (0.05 + r() * 0.03))
        for (let k = 0; k < 3; k++) partial(out, sr, f0 * rs[k], as[k] * 0.3, ts[k] * 0.6, r() * TAU, 0.0003, s2)
        burst(out, sr, r, 0.12, 0.001, { hp: true, start: s2 })
        fadeTail(out, 0.1, sr)
        return normalize([out], 0.8)
      },
      // 怀表般的机械「咔哒」（UI 点击、打字、发条）
      click(p, sr) {
        const r = rng(61), out = buf(sr, 0.06), ex = buf(sr, 0.06)
        burst(ex, sr, r, 1, 0.0005)
        burst(ex, sr, r, 0.6, 0.0004, { start: Math.round(sr * 0.007) })
        biq(ex, coeffs('bp', 3400, 3, sr))
        for (let i = 0; i < out.length; i++) out[i] = ex[i] * 2.5
        partial(out, sr, 240, 0.35, 0.012, 0, 0.0005)
        fadeTail(out, 0.01, sr)
        return normalize([out], 0.8)
      },
      // 木头的闷响
      knock(p, sr) {
        const r = rng(71), out = buf(sr, 0.4), ex = buf(sr, 0.4)
        burst(ex, sr, r, 1, 0.004)
        biq(ex, coeffs('bp', 190, 4, sr))
        for (let i = 0; i < out.length; i++) out[i] = ex[i] * 4
        partial(out, sr, 190, 0.5, 0.07, 0, 0.001)
        partial(out, sr, 415, 0.25, 0.035)
        partial(out, sr, 830, 0.1, 0.015)
        burst(out, sr, r, 0.2, 0.002, { lp: 3000 })
        fadeTail(out, 0.05, sr)
        return normalize([out], 0.85)
      },
      noise(p, sr) {
        const r = rng(1234), out = buf(sr, 3)
        for (let i = 0; i < out.length; i++) out[i] = (r() * 2 - 1) * 0.5
        return [out]
      },
      // 粉红噪声（Paul Kellet 的近似）
      pink(p, sr) {
        const r = rng(4321), out = buf(sr, 3)
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
        for (let i = 0; i < out.length; i++) {
          const w = r() * 2 - 1
          b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852
          b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898
          out[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11
          b6 = w * 0.115926
        }
        return normalize([out], 0.6)
      },
      /* 混响脉冲响应：立体声独立噪声；900 Hz 以下与以上分别指数衰减（高频更快 → 越来越暗），
         预延迟后加十个早期反射。ConvolverNode.normalize 会统一能量。 */
      ir(p, sr) {
        const P = p.name === 'abyss'
          ? { rt: 7.5, pre: 0.035, dark: 0.7, hi: 0.32, er: 0.35, seed: 9 }
          : { rt: 3.0, pre: 0.018, dark: 0.4, hi: 0.5, er: 0.7, seed: 0 }
        const len = Math.ceil(sr * (P.rt * 1.02 + P.pre))
        const chs = []
        for (let c = 0; c < 2; c++) {
          const r = rng(4000 + c * 77 + P.seed)
          const out = new Float32Array(len)
          const pre = Math.round(P.pre * sr)
          const kLo = Math.exp(-6.9 / (P.rt * sr))
          const kHi = Math.exp(-6.9 / (P.rt * P.hi * sr))
          const a = 1 - Math.exp(-TAU * 900 / sr)
          const build = 0.03 * sr
          let lp = 0, eLo = 1, eHi = 1
          for (let i = pre; i < len; i++) {
            const x = r() * 2 - 1
            lp += a * (x - lp)
            const j = i - pre
            out[i] = (lp * eLo * 1.6 + (x - lp) * eHi * (1 - P.dark)) * (j < build ? j / build : 1)
            eLo *= kLo; eHi *= kHi
          }
          for (let k = 0; k < 10; k++) {
            const dd = pre + Math.round((0.003 + r() * 0.07) * sr)
            out[dd] += (r() < 0.5 ? -1 : 1) * P.er * (1 - k / 12)
          }
          fadeTail(out, 0.25, sr)
          chs.push(out)
        }
        return chs
      },
    }

    function renderKey(key, sr) {
      const i = key.indexOf(':')
      const kind = i < 0 ? key : key.slice(0, i)
      const arg = i < 0 ? '' : key.slice(i + 1)
      const n = +arg || 0
      switch (kind) {
        case 'mbox': case 'harpsi': case 'piano': case 'ubass': case 'koto': return R[kind]({ midi: n }, sr)
        case 'metal': case 'coin': return R[kind]({ v: n }, sr)
        case 'hatC': return R.hat({ open: false }, sr)
        case 'hatO': return R.hat({ open: true }, sr)
        case 'tick': return clockTick(sr, 2300, 520, 1)
        case 'tock': return clockTick(sr, 1850, 430, 2)
        case 'wtick': return clockTick(sr, 4200, 1250, 3, 0.08)
        case 'ir': return R.ir({ name: arg }, sr)
        default:
          if (R[kind]) return R[kind]({}, sr)
          throw new Error('unknown sample ' + key)
      }
    }
    return { renderKey, mtof }
  }
  const DSP = DSPFactory()

  /* ======================================================
     §2 采样库：主线程同步渲染（急需的）+ Worker 后台渲染（其余）
     ====================================================== */
  // 有音高的采样每隔 5–6 个半音渲染一个根音，播放时用 playbackRate 移调（最多 ±3 半音）
  const ROOTS = {
    mbox: [50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100],
    harpsi: [38, 44, 50, 56, 62, 68, 74, 80, 86, 92],
    piano: [31, 37, 43, 49, 55, 61, 67, 73, 79, 85, 91, 97],
    ubass: [26, 31, 36, 41, 46, 51],
    koto: [46, 52, 58, 64],
  }
  const keysOf = inst => ROOTS[inst].map(m => inst + ':' + m)
  const URGENT = keysOf('mbox').concat(['tick', 'tock', 'pink', 'noise', 'click'])
  const LATER = ['knock', 'coin:0', 'coin:1', 'coin:2', 'wtick', 'metal:0', 'metal:1', 'metal:2', 'metal:3']
    .concat(keysOf('harpsi'), keysOf('piano'), ['kick', 'snare', 'brush', 'hatC', 'hatO', 'tom', 'taiko'], keysOf('ubass'), keysOf('koto'), ['tbell', 'gong'])

  const SAMPLE_CACHE = {}
  function Bank(E, useWorker) {
    this.E = E
    this.sr = E.sr
    this.cache = SAMPLE_CACHE[this.sr] || (SAMPLE_CACHE[this.sr] = {})
    this.bufs = {}
    this.waiting = {}
    this.idle = []
    this.syncCount = 0
    this.cbs = {}
    this.keep = E.offline // 离线测试会建很多引擎，共享原始数据；在线只留 AudioBuffer，省一半内存
    this.worker = null
    if (useWorker && window.Worker && window.Blob && window.URL) {
      try {
        const src = '"use strict";var DSP=(' + DSPFactory.toString() + ')();' +
          'onmessage=function(e){var d=e.data;try{var ch=DSP.renderKey(d.key,d.sr);' +
          'postMessage({key:d.key,chans:ch},ch.map(function(a){return a.buffer}))}' +
          'catch(err){postMessage({key:d.key,error:String(err)})}}'
        const url = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }))
        const w = new Worker(url)
        w.onmessage = e => {
          const d = e.data
          delete this.waiting[d.key]
          if (d.chans && !this.cache[d.key] && !this.bufs[d.key]) this.cache[d.key] = d.chans
          this.fire(d.key)
        }
        w.onerror = ev => {
          if (ev && ev.preventDefault) ev.preventDefault()
          this.worker = null
          for (const k in this.waiting) this.idle.push(k)
          this.waiting = {}
          this.flushIdle()
        }
        this.worker = w
      } catch (e) { this.worker = null }
    }
  }
  Bank.prototype.get = function (key) {
    const b = this.bufs[key]
    if (b) return b
    let data = this.cache[key]
    if (!data) {
      try { data = DSP.renderKey(key, this.sr) } catch (e) { console.error('[audio] sample', key, e); return null }
      this.cache[key] = data
      this.syncCount++
    }
    const ab = this.E.ctx.createBuffer(data.length, data[0].length, this.sr)
    for (let c = 0; c < data.length; c++) ab.getChannelData(c).set(data[c])
    if (!this.keep) delete this.cache[key]
    return (this.bufs[key] = ab)
  }
  Bank.prototype.ready = function (key) { return !!(this.bufs[key] || this.cache[key]) }
  // 采样就绪时回调（就绪则立即回调）
  Bank.prototype.when = function (key, fn) {
    if (this.ready(key)) { fn(this.get(key)); return }
    ;(this.cbs[key] = this.cbs[key] || []).push(fn)
    this.prefetch([key])
  }
  Bank.prototype.fire = function (key) {
    const list = this.cbs[key]
    if (!list) return
    delete this.cbs[key]
    const b = this.get(key)
    for (const fn of list) try { fn(b) } catch (e) { console.error('[audio]', e) }
  }
  Bank.prototype.prefetch = function (keys) {
    for (const k of keys) {
      if (this.ready(k) || this.waiting[k]) continue
      if (this.worker) { this.waiting[k] = 1; this.worker.postMessage({ key: k, sr: this.sr }) }
      else this.idle.push(k)
    }
    this.flushIdle()
  }
  Bank.prototype.flushIdle = function () {
    if (this.idleOn || !this.idle.length) return
    this.idleOn = true
    const step = () => {
      const t0 = performance.now()
      while (this.idle.length && performance.now() - t0 < 8) {
        const k = this.idle.shift()
        if (!this.cache[k]) try { this.cache[k] = DSP.renderKey(k, this.sr) } catch (e) { /* 跳过 */ }
      }
      for (const k in this.cbs) if (this.cache[k]) this.fire(k)
      if (this.idle.length) setTimeout(step, 40)
      else this.idleOn = false
    }
    setTimeout(step, 60)
  }

  /* ======================================================
     §3 乐理小工具
     ====================================================== */
  const PCN = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }
  const acc = s => (s === '#' ? 1 : s === 'b' ? -1 : 0)
  const pcOf = m => ((m % 12) + 12) % 12
  function nn(s) {
    const m = /^([A-G])(#|b)?(\d)$/.exec(s)
    if (!m) throw new Error('[audio] bad note ' + s)
    return 12 * (+m[3] + 1) + PCN[m[1]] + acc(m[2])
  }
  // 旋律记谱：'A5:4 G#5:4 A5:4 | F5:12 | …'，数字是时值（步数），r 为休止；返回每小节 [[步, midi, 时值]…]
  function mel(str) {
    return str.split('|').map(bar => {
      const out = []
      let s = 0
      for (const tok of bar.trim().split(/\s+/)) {
        if (!tok) continue
        const [n, d] = tok.split(':')
        const dur = +d
        if (n !== 'r') out.push([s, nn(n), dur])
        s += dur
      }
      return out
    })
  }
  const QUAL = {
    '': [0, 4, 7], m: [0, 3, 7], 7: [0, 4, 7, 10], maj7: [0, 4, 7, 11], m7: [0, 3, 7, 10],
    dim: [0, 3, 6], dim7: [0, 3, 6, 9], m7b5: [0, 3, 6, 10], 6: [0, 4, 7, 9], m6: [0, 3, 7, 9],
    sus4: [0, 5, 7], '7sus4': [0, 5, 7, 10], '7b9': [0, 4, 7, 10, 13], add9: [0, 4, 7, 14], aug: [0, 4, 8],
  }
  function chord(sym) {
    if (sym === 'NC') return { nc: true, sym, pcs: [], root: 0, bass: 2 }
    const m = /^([A-G])(#|b)?([a-z0-9]*)(?:\/([A-G])(#|b)?)?$/.exec(sym)
    if (!m || !QUAL[m[3]]) throw new Error('[audio] bad chord ' + sym)
    const root = (PCN[m[1]] + acc(m[2]) + 12) % 12
    const ivs = QUAL[m[3]]
    return {
      sym, root, ivs,
      pcs: ivs.map(i => (root + i) % 12),
      bass: m[4] ? (PCN[m[4]] + acc(m[5]) + 12) % 12 : root,
    }
  }
  const form = str => str.trim().split(/\s+/).map(chord)
  function tonesIn(c, lo, hi) {
    const out = []
    for (let m = lo; m <= hi; m++) if (c.pcs.indexOf(pcOf(m)) >= 0) out.push(m)
    return out
  }
  const voice = (c, lo, n) => tonesIn(c, lo, lo + 30).slice(0, n)
  function bassOf(c, lo) { for (let m = lo; m < lo + 12; m++) if (pcOf(m) === c.bass) return m; return lo }
  function fold(m, lo, hi) { while (m < lo) m += 12; while (m > hi) m -= 12; return m }
  function scaleUp(m, sc) { let x = m + 1; while (sc.indexOf(pcOf(x)) < 0) x++; return x }
  function scaleDown(m, sc, k) {
    let x = m
    for (let i = 0; i < (k || 1); i++) { x--; while (sc.indexOf(pcOf(x)) < 0) x-- }
    return x
  }
  function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) } return h >>> 0 }
  function rngf(seed) {
    let s = (seed >>> 0) || 1
    return () => {
      s = (s + 0x6d2b79f5) >>> 0
      let t = s
      t = Math.imul(t ^ (t >>> 15), t | 1)
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
  }
  // 旋律变奏：断齿漏音、八度移位、波音/倚音、颤音（全部取自调内音）
  function vary(notes, r, o) {
    const out = []
    for (let k = 0; k < notes.length; k++) {
      const s = notes[k][0], d = notes[k][2]
      let m = notes[k][1]
      if (o.drop && k > 0 && r() < o.drop) continue
      if (o.oct && r() < o.oct) m += 12
      if (d >= 4 && o.trill && r() < o.trill) {
        const up = scaleUp(m, o.scale), n = Math.min(d - 1, 4)
        for (let j = 0; j < n; j++) out.push([s + j * 0.5, j % 2 ? up : m, 0.5])
        out.push([s + n * 0.5, m, d - n * 0.5])
        continue
      }
      if (d >= 4 && o.orn && r() < o.orn) {
        const up = scaleUp(m, o.scale)
        if (r() < 0.5) out.push([s, m, 1], [s + 1, up, 1], [s + 2, m, d - 2])
        else out.push([s, up, 1], [s + 1, m, d - 1])
        continue
      }
      out.push([s, m, d])
    }
    return out
  }

  /* ======================================================
     §4 引擎
     ====================================================== */
  const WAVE_DEFS = {
    // 嗡鸣：前七个谐波缓降，像低音风琴管 / 远处的机械
    hum: [0, 1, 0.55, 0.3, 0.18, 0.1, 0.06, 0.03],
    // 弦乐：锯齿谱，3–5 次谐波略抬（琴身共鸣）
    string: (() => { const a = [0]; for (let n = 1; n <= 28; n++) a.push((1 / n) * (1 + 0.35 * Math.exp(-((n - 4) * (n - 4)) / 4))); return a })(),
    // 簧片：奇次谐波为主
    reed: [0, 1, 0.08, 0.5, 0.06, 0.3, 0.04, 0.18, 0.03, 0.1, 0.02, 0.06],
  }
  function softClipCurve() {
    const n = 2048, c = new Float32Array(n)
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * 2 - 1, ax = Math.abs(x)
      c[i] = ax < 0.8 ? x : Math.sign(x) * (0.8 + 0.2 * Math.tanh((ax - 0.8) / 0.2))
    }
    return c
  }
  function driveCurve(k) {
    const n = 1024, c = new Float32Array(n), d = Math.tanh(k)
    for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; c[i] = Math.tanh(k * x) / d }
    return c
  }
  function crushCurve(levels) {
    const n = 1024, c = new Float32Array(n)
    for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; c[i] = Math.round(x * levels) / levels }
    return c
  }
  // 旧版 WebKit 的 suspend/resume 不返回 Promise
  function quiet(p) { if (p && p.catch) p.catch(() => {}) }
  // 自动化：在 t 处冻结当前值（Firefox 没有 cancelAndHoldAtTime）
  function holdAt(p, t) {
    if (p.cancelAndHoldAtTime) p.cancelAndHoldAtTime(t)
    else { const v = p.value; p.cancelScheduledValues(t); p.setValueAtTime(v, t) }
  }

  function Engine(ctx, opt) {
    opt = opt || {}
    this.ctx = ctx
    this.sr = ctx.sampleRate
    this.offline = !!opt.offline
    this.seedBase = opt.seed != null ? opt.seed >>> 0 : (Math.random() * 4294967295) >>> 0
    this.tension = this.tensionTarget = opt.tension || 0
    this.voices = 0
    this.tracks = {}
    this.current = null
    this.sfxLast = {}
    this.sfxBusy = {}
    this.uneaseNodes = new Set()
    this.waves = {}
    this.curves = {}
    this.outV = 1
    this.bank = new Bank(this, !this.offline && opt.worker !== false)
    this._graph()
  }
  const P = Engine.prototype

  P.G = function (v) { const g = this.ctx.createGain(); g.gain.value = v == null ? 1 : v; return g }
  P.flt = function (type, f, q) {
    const n = this.ctx.createBiquadFilter()
    n.type = type
    n.frequency.value = f
    if (q != null) n.Q.value = q
    return n
  }
  P.pan = function (v) {
    if (!this.ctx.createStereoPanner) return this.G(1)
    const p = this.ctx.createStereoPanner()
    p.pan.value = clamp(v || 0, -1, 1)
    return p
  }
  P.wave = function (name) {
    if (!this.waves[name]) {
      const a = WAVE_DEFS[name]
      const real = new Float32Array(a.length), imag = new Float32Array(a)
      this.waves[name] = this.ctx.createPeriodicWave(real, imag)
    }
    return this.waves[name]
  }
  P.shaper = function (kind) {
    const ws = this.ctx.createWaveShaper()
    const key = String(kind)
    if (!this.curves[key]) this.curves[key] = kind === 'crush' ? crushCurve(5) : driveCurve(+kind || 2)
    ws.curve = this.curves[key]
    return ws
  }
  P.buf = function (key) { return this.bank.get(key) }
  P.later = function (time, fn) {
    if (this.offline) return
    setTimeout(fn, Math.max(0, (time - this.ctx.currentTime) * 1000) + 120)
  }

  P._graph = function () {
    const c = this.ctx
    // 输出端
    this.analyser = c.createAnalyser()
    this.analyser.fftSize = 1024
    this.vis = this.G(1)
    this.mute = this.G(1)
    this.master = this.G(0.92)
    const lim = (this.limiter = c.createDynamicsCompressor())
    // 只做安全限幅：阈值 −6 dB（Chrome 的自动补偿约 +3 dB），平时的音乐都在阈值之下
    lim.threshold.value = -6; lim.knee.value = 5; lim.ratio.value = 12; lim.attack.value = 0.003; lim.release.value = 0.25
    const clip = c.createWaveShaper()
    clip.curve = softClipCurve()
    this.masterLP = this.flt('lowpass', 20000, 0.5)
    this.mix = this.G(1)
    this.mix.connect(this.masterLP); this.masterLP.connect(lim); lim.connect(clip); clip.connect(this.master)
    this.master.connect(this.mute); this.mute.connect(this.vis); this.vis.connect(this.analyser); this.analyser.connect(c.destination)
    // 音乐总线
    this.musicIn = this.G(1)
    this.musicLP = this.flt('lowpass', 8600, 0.4)
    this.musicDuck = this.G(1)
    this.musicIn.connect(this.musicLP); this.musicLP.connect(this.musicDuck); this.musicDuck.connect(this.mix)
    // 音效总线
    this.sfxBus = this.G(1)
    this.sfxBus.connect(this.mix)
    // 混响
    this.hallIn = this.G(1); this.abyssIn = this.G(1)
    this.hall = c.createConvolver(); this.abyss = c.createConvolver()
    // 混响脉冲响应：在线时交给 Worker（约 60 ms 的计算不放在点击的那一帧），离线时同步
    if (this.offline || !this.bank.worker) {
      this.hall.buffer = this.bank.get('ir:hall')
      this.abyss.buffer = this.bank.get('ir:abyss')
    } else {
      this.bank.when('ir:hall', b => { this.hall.buffer = b })
      this.bank.when('ir:abyss', b => { this.abyss.buffer = b })
    }
    const hr = this.G(0.6), ar = this.G(0.55)
    this.hallIn.connect(this.hall); this.hall.connect(hr); hr.connect(this.mix)
    this.abyssIn.connect(this.abyss); this.abyss.connect(ar); ar.connect(this.mix)
    this.wetHall = this.G(1); this.wetHall.connect(this.hallIn)
    this.wetAbyss = this.G(1); this.wetAbyss.connect(this.abyssIn)
    // 颤音 LFO（弦乐、玻璃音共用；光标速度调制它的深度与速率）
    this.lfo = c.createOscillator()
    this.lfo.frequency.value = 4.8
    this.vib = this.G(3)
    this.lfo.connect(this.vib)
    this.lfo.start()
  }

  /* ---------- 发声 ---------- */
  P._own = function (src, extra, vib) {
    this.voices++
    src.onended = () => {
      this.voices--
      try { src.disconnect() } catch (e) { /* */ }
      if (extra) for (const n of extra) try { n.disconnect() } catch (e) { /* */ }
      if (vib) try { this.vib.disconnect(src.detune) } catch (e) { /* */ }
    }
  }
  // 播放一个采样：ch 可为通道对象或节点
  P.play = function (ch, buf, t, o) {
    if (!buf) return null
    o = o || {}
    if (this.voices >= MAX_VOICES && !o.force) return null
    const c = this.ctx
    const dest = ch && ch.in ? ch.in : ch
    const src = c.createBufferSource()
    src.buffer = buf
    const rate = o.rate || 1
    src.playbackRate.value = rate
    let minRate = rate
    if (o.bend) {
      const mul = o.bend[0], at = o.bend[1], len = o.bend[2]
      src.playbackRate.setValueAtTime(rate, t + at)
      src.playbackRate.linearRampToValueAtTime(rate * mul, t + at + len)
      minRate = Math.min(rate, rate * mul)
    }
    const g = c.createGain()
    const amp = o.gain == null ? 1 : o.gain
    let end = t + (buf.duration - (o.offset || 0)) / minRate
    if (o.attack) { g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(amp, t + o.attack) }
    else g.gain.setValueAtTime(amp, t)
    if (o.dur != null) {
      const rel = o.rel || 0.08
      const off = t + Math.max(o.dur, o.attack || 0)
      g.gain.setValueAtTime(amp, off)
      g.gain.setTargetAtTime(0, off, rel / 4)
      end = Math.min(end, off + rel * 1.6)
    }
    src.connect(g)
    let last = g
    if (o.pan) { const p = this.pan(o.pan); g.connect(p); last = p }
    last.connect(dest)
    src.start(t, o.offset || 0)
    src.stop(end + 0.02)
    this._own(src, last === g ? [g] : [g, last])
    return src
  }
  // 有音高的采样乐器
  P.note = function (ch, inst, midi, t, vel, o) {
    o = o || {}
    const roots = ROOTS[inst]
    let root = roots[0], bd = 999
    for (const x of roots) { const d = Math.abs(midi - x); if (d < bd) { bd = d; root = x } }
    const rate = Math.pow(2, (midi - root + (o.cents || 0) / 100) / 12)
    return this.play(ch, this.bank.get(inst + ':' + root), t, {
      rate, gain: vel, pan: o.pan, dur: o.dur, rel: o.rel, bend: o.bend, attack: o.attack, force: o.force,
    })
  }
  P.osc = function (type, f, t, stop, dest, extra) {
    const o = this.ctx.createOscillator()
    if (WAVE_DEFS[type]) o.setPeriodicWave(this.wave(type))
    else o.type = type
    o.frequency.setValueAtTime(f, t)
    o.connect(dest)
    o.start(t)
    o.stop(stop)
    this._own(o, extra)
    return o
  }
  // 噪声源（循环、随机起点）或任意采样
  P.src = function (key, t, stop, dest, o, extra) {
    o = o || {}
    const buf = this.bank.get(key)
    if (!buf) return null
    const s = this.ctx.createBufferSource()
    s.buffer = buf
    const isNoise = key === 'noise' || key === 'pink'
    if (isNoise || o.loop) s.loop = true
    if (o.rate) s.playbackRate.value = o.rate
    let node = s
    if (o.gain != null) { const g = this.G(o.gain); s.connect(g); node = g; extra = (extra || []).concat(g) }
    node.connect(dest)
    s.start(t, isNoise ? Math.random() * (buf.duration - 0.6) : 0)
    s.stop(stop != null ? stop : t + buf.duration / (o.rate || 1) + 0.05)
    this._own(s, extra)
    return s
  }
  // 包络：pts = [[dt, 值, 方式]…]，方式 'e' 指数、's' 跳变、数字=setTarget 时间常数，默认线性
  P.env = function (param, t, pts) {
    param.setValueAtTime(pts[0][1], t + pts[0][0])
    for (let i = 1; i < pts.length; i++) {
      const dt = pts[i][0], v = pts[i][1], m = pts[i][2]
      if (m === 'e') param.exponentialRampToValueAtTime(Math.max(v, 1e-4), t + dt)
      else if (m === 's') param.setValueAtTime(v, t + dt)
      else if (typeof m === 'number') param.setTargetAtTime(v, t + dt, m)
      else param.linearRampToValueAtTime(v, t + dt)
    }
  }

  /* ---------- 合成乐器 ---------- */
  // 弦乐垫音：两支（或多支）失谐锯齿，共享颤音 LFO
  P.pad = function (ch, midi, t, dur, vel, o) {
    o = o || {}
    const f = mtof(midi), att = o.attack || 0.5, rel = o.release || 1.2
    const g = this.G(0)
    const hold = t + Math.max(att, dur)
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(vel, t + att)
    g.gain.setValueAtTime(vel, hold)
    g.gain.setTargetAtTime(0, hold, rel / 3.5)
    g.connect(ch.in || ch)
    const end = hold + rel * 1.3
    const dets = o.voices || [-7, 7]
    let n = dets.length
    for (const d of dets) {
      const os = this.ctx.createOscillator()
      if (o.wave) os.setPeriodicWave(this.wave(o.wave)); else os.type = o.type || 'sawtooth'
      os.frequency.value = f
      os.detune.value = d + (o.cents || 0)
      if (o.vib !== false) this.vib.connect(os.detune)
      os.connect(g)
      os.start(t + Math.random() / f)
      os.stop(end)
      this._own(os, --n === 0 ? [g] : null, o.vib !== false)
    }
  }
  // 断奏弦乐：快起快收
  P.stab = function (ch, notes, t, dur, vel) {
    for (const m of notes) {
      const f = mtof(m), g = this.G(0)
      // 弓压：8 ms 起音 → 迅速落到 55% 的「弓身」→ 收弓，峰值因数比纯指数衰减低约 4 dB
      const d = Math.max(0.05, dur)
      this.env(g.gain, t, [[0, 0], [0.008, vel], [0.035, vel * 0.55], [d, vel * 0.3], [d + 0.04, 0.0001, 'e']])
      g.connect(ch.in || ch)
      // 错开起振时刻（相当于随机初相），避免几支锯齿在起音处同相叠出尖峰
      this.osc('string', f, t + Math.random() / f, t + Math.max(0.05, dur) + 0.06, g, [g]).detune.value = -9
      this.osc('string', f, t + Math.random() / f, t + Math.max(0.05, dur) + 0.06, g).detune.value = 9
    }
  }
  // 模拟低音：锯齿 + 低八度方波 → 带包络的共振低通
  P.synthBass = function (ch, midi, t, dur, vel, o) {
    o = o || {}
    const f = mtof(midi)
    const lp = this.flt('lowpass', 200, o.q || 5)
    lp.frequency.setValueAtTime(170 + (o.env || 1400) * vel, t)
    lp.frequency.setTargetAtTime(150, t + 0.004, o.decay || 0.07)
    const g = this.G(0)
    this.env(g.gain, t, [[0, 0], [0.004, vel], [dur, vel * 0.55], [dur + 0.05, 0]])
    lp.connect(g)
    g.connect(ch.in || ch)
    const sq = this.G(0.5)
    sq.connect(lp)
    this.osc('sawtooth', f, t, t + dur + 0.08, lp, [lp, g])
    this.osc('square', f / 2, t, t + dur + 0.08, sq, [sq])
  }
  // 玻璃般的高音（带颤音）
  P.glass = function (ch, midi, t, vel, dur) {
    dur = dur || 4
    const f = mtof(midi), g = this.G(0)
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(vel, t + 0.07)
    g.gain.setTargetAtTime(0, t + 0.09, dur / 5)
    g.connect(ch.in || ch)
    const parts = [[1, 1], [2, 0.12], [3.01, 0.05]]
    parts.forEach((p, i) => {
      const pg = this.G(p[1])
      pg.connect(g)
      const os = this.ctx.createOscillator()
      os.frequency.value = f * p[0]
      this.vib.connect(os.detune)
      os.connect(pg)
      os.start(t)
      os.stop(t + dur + 0.2)
      this._own(os, i === 0 ? [pg, g] : [pg], true)
    })
  }
  // 方波短音（电子琶音）
  P.blip = function (ch, midi, t, vel, len) {
    const g = this.G(0)
    this.env(g.gain, t, [[0, 0], [0.003, vel], [len || 0.11, 0.0001, 'e']])
    g.connect(ch.in || ch)
    this.osc('square', mtof(midi), t, t + (len || 0.11) + 0.02, g, [g])
  }
  // 低频闷击（心跳、远处的鼓）
  P.thump = function (ch, t, vel, f0, f1, dec) {
    dec = dec || 0.22
    const g = this.G(0)
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(vel, t + 0.006)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dec)
    g.connect(ch.in || ch)
    const os = this.osc('sine', f0 || 62, t, t + dec + 0.05, g, [g])
    os.frequency.exponentialRampToValueAtTime(f1 || 40, t + 0.12)
  }
  // 噪声上扬（反向镲）
  P.riser = function (ch, t, dur, vel) {
    const bp = this.flt('bandpass', 400, 1.2), g = this.G(0)
    bp.frequency.setValueAtTime(350, t)
    bp.frequency.exponentialRampToValueAtTime(6000, t + dur)
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(vel, t + dur * 0.97)
    g.gain.linearRampToValueAtTime(0, t + dur)
    bp.connect(g)
    g.connect(ch.in || ch)
    this.src('noise', t, t + dur + 0.02, bp, null, [bp, g])
  }
  // 一阵远处的风：粉红噪声经带通，中心频率缓慢游走，音量鼓起又落下
  P.gust = function (ch, t, dur, vel) {
    const bp = this.flt('bandpass', 500, 0.9), g = this.G(0)
    bp.frequency.setValueAtTime(320 + Math.random() * 120, t)
    bp.frequency.linearRampToValueAtTime(700 + Math.random() * 400, t + dur * 0.45)
    bp.frequency.linearRampToValueAtTime(380, t + dur)
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(vel, t + dur * 0.4)
    g.gain.linearRampToValueAtTime(0, t + dur)
    bp.connect(g)
    g.connect(ch.in || ch)
    this.src('pink', t, t + dur + 0.05, bp, null, [bp, g])
  }
  // 常驻的嗡鸣：若干振荡器 → 呼吸（LFO 调幅）→ 淡入淡出 → 低通（LFO 调频）
  P.drone = function (ch, t, parts, o) {
    const c = this.ctx
    const breath = this.G(1), fade = this.G(0), lp = this.flt('lowpass', o.lp || 300, 0.7)
    breath.connect(fade); fade.connect(lp); lp.connect(ch.in || ch)
    fade.gain.setValueAtTime(0, t)
    fade.gain.linearRampToValueAtTime(1, t + (o.attack || 4))
    const nodes = [breath, fade, lp]
    const srcs = []
    for (const p of parts) {
      const os = c.createOscillator()
      if (p.wave) os.setPeriodicWave(this.wave(p.wave)); else os.type = p.type || 'sine'
      os.frequency.value = p.f
      if (p.detune) os.detune.value = p.detune
      const pg = this.G(p.gain)
      os.connect(pg); pg.connect(breath)
      os.start(t)
      srcs.push(os); nodes.push(pg)
    }
    const lfo = c.createOscillator()
    lfo.frequency.value = o.rate || 0.07
    const la = this.G(o.depth == null ? 0.3 : o.depth), lf = this.G((o.lp || 300) * 0.35)
    lfo.connect(la); la.connect(breath.gain)
    lfo.connect(lf); lf.connect(lp.frequency)
    lfo.start(t)
    srcs.push(lfo); nodes.push(la, lf)
    if (o.noise) {
      const bp = this.flt('bandpass', o.noise.f, o.noise.q || 0.8), ng = this.G(o.noise.gain)
      bp.connect(ng); ng.connect(fade)
      const ns = this.ctx.createBufferSource()
      ns.buffer = this.bank.get('pink'); ns.loop = true
      ns.connect(bp); ns.start(t)
      srcs.push(ns); nodes.push(bp, ng)
    }
    this.voices += srcs.length
    const E = this
    return {
      lp, fade,
      stop(at) {
        holdAt(fade.gain, at)
        fade.gain.linearRampToValueAtTime(0, at + 0.6)
        for (const s of srcs) s.stop(at + 0.7)
        E.voices -= srcs.length
        E.later(at + 0.8, () => { for (const n of nodes.concat(srcs)) try { n.disconnect() } catch (e) { /* */ } })
      },
    }
  }

  /* ---------- 总线效果 ---------- */
  P.duck = function (depth, t, hold, rel) {
    for (const g of [this.musicDuck, this.wetHall, this.wetAbyss]) {
      const p = g.gain
      p.cancelScheduledValues(t)
      p.setTargetAtTime(1 - depth, t, 0.03)
      p.setTargetAtTime(1, t + hold, rel / 3)
    }
  }
  P.darken = function (t, hold, rel) {
    const f = this.masterLP.frequency
    f.cancelScheduledValues(t)
    f.setValueAtTime(20000, t)
    f.exponentialRampToValueAtTime(150, t + 0.14)
    f.setValueAtTime(150, t + hold)
    f.exponentialRampToValueAtTime(20000, t + hold + rel)
    this.duck(0.75, t, hold, rel)
  }
  // 音效输出套件：返回的 o 节点接到音效总线与混响；life 秒后整组断开
  P.kit = function (t, life, oo) {
    const E = this, nodes = []
    const reg = n => { nodes.push(n); return n }
    const o = reg(E.G(oo.gain == null ? 1 : oo.gain))
    let last = o
    if (oo.pan) { const pn = reg(E.pan(oo.pan)); o.connect(pn); last = pn }
    last.connect(E.sfxBus)
    if (oo.hall) { const s = reg(E.G(oo.hall)); last.connect(s); s.connect(E.hallIn) }
    if (oo.abyss) { const s = reg(E.G(oo.abyss)); last.connect(s); s.connect(E.abyssIn) }
    E.later(t + life, () => { for (const n of nodes) try { n.disconnect() } catch (e) { /* */ } })
    return {
      o,
      G: v => reg(E.G(v)),
      flt: (ty, f, q) => reg(E.flt(ty, f, q)),
      pan: v => reg(E.pan(v)),
      shaper: k => reg(E.shaper(k)),
      osc: (ty, f, a, b, dest) => E.osc(ty, f, a, b, dest),
      src: (key, a, b, dest, op) => E.src(key, a, b, dest, op),
      env: (param, at, pts) => E.env(param, at, pts),
    }
  }

  /* ---------- 情绪、音轨、调度 ---------- */
  P.setMood = function (v) {
    this.tensionTarget = clamp(+v || 0, 0, 1)
    if (this.offline) this.tension = this.tensionTarget
  }
  P.makeTrack = function (name) {
    const file = !this.offline && window.TRACK_FILES && window.TRACK_FILES[name]
    if (file && name !== 'silence') {
      try { return new FileTrack(this, name, String(file)) } catch (e) { console.warn('[audio] track file', name, e) }
    }
    return new Track(this, name, TRACKS[name])
  }
  P.track = function (name, o) {
    o = o || {}
    if (!TRACKS[name] || name === this.current) return
    const now = this.ctx.currentTime
    const dur = o.fade == null ? 2.6 : o.fade
    for (const k in this.tracks) {
      const tr = this.tracks[k]
      if (k !== name && tr.level > 0) tr.fadeTo(0, now, dur * 0.9)
    }
    this.current = name
    let tr = this.tracks[name]
    if (!tr) tr = this.tracks[name] = this.makeTrack(name)
    const t = now + 0.03 + (o.delay || 0)
    if (!tr.active) tr.begin(t)
    tr.fadeTo(TRACKS[name].gain || 1, t, dur)
  }
  P.replaceTrack = function (name) {
    const old = this.tracks[name]
    if (old && old.active) old.end()
    const tr = (this.tracks[name] = new Track(this, name, TRACKS[name]))
    if (this.current === name) {
      const now = this.ctx.currentTime
      tr.begin(now + 0.05)
      tr.fadeTo(TRACKS[name].gain || 1, now + 0.05, 2)
    }
  }
  P.pump = function (until) {
    const now = this.ctx.currentTime
    this.smoothTension(now)
    for (const k in this.tracks) {
      const tr = this.tracks[k]
      if (!tr.active) continue
      if (tr.endAt && now > tr.endAt) { tr.end(); continue }
      tr.pump(until, now)
    }
  }
  P.level = function () {
    const now = performance.now()
    if (this._lvT && now - this._lvT < 30) return this._lv
    this._lvT = now
    const a = this.analyser
    let s = 0
    if (a.getFloatTimeDomainData) {
      const d = this._lvBuf || (this._lvBuf = new Float32Array(a.fftSize))
      a.getFloatTimeDomainData(d)
      for (let i = 0; i < d.length; i++) s += d[i] * d[i]
    } else {
      const d = this._lvBuf || (this._lvBuf = new Uint8Array(a.fftSize))
      a.getByteTimeDomainData(d)
      for (let i = 0; i < d.length; i++) { const v = (d[i] - 128) / 128; s += v * v }
    }
    let lv = Math.min(1, Math.pow(Math.sqrt(s / a.fftSize) * 5, 0.75))
    for (const k in this.tracks) { const tr = this.tracks[k]; if (tr.directLevel) lv = Math.max(lv, tr.directLevel()) }
    this._lv = this._lv == null ? lv : this._lv * 0.5 + lv * 0.5
    return this._lv
  }
  // 张力平滑：按音频时钟、时间常数约 0.6 秒，与帧率无关（调度器与每帧都会调用）
  P.smoothTension = function (now) {
    if (this.offline) return
    const dt = clamp(now - (this._tT == null ? now : this._tT), 0, 0.25)
    this._tT = now
    this.tension += (this.tensionTarget - this.tension) * (1 - Math.exp(-dt / 0.6))
    if (Math.abs(this.tensionTarget - this.tension) < 1e-3) this.tension = this.tensionTarget
  }
  // 每帧：光标调制、文件音轨的音量
  P.frame = function () {
    const now = this.ctx.currentTime
    this.smoothTension(now)
    for (const k in this.tracks) { const tr = this.tracks[k]; if (tr.frame) tr.frame(now) }
    this._fc = (this._fc || 0) + 1
    if (this._fc % 3) return
    const m = App.mouse
    const ny = m && m.active ? clamp(m.ny, 0, 1) : 0.5
    const sp = m ? clamp((m.speed || 0) / 36, 0, 1) : 0
    this._sp = this._sp == null ? sp : this._sp + (sp - this._sp) * 0.3
    const cut = Math.min(18500, 4200 * Math.pow(2, (1 - ny) * 2.1) * (1 + 0.3 * this.tension))
    this.musicLP.frequency.setTargetAtTime(cut, now, 0.2)
    this.vib.gain.setTargetAtTime(2.5 + 15 * this._sp + 5 * this.tension, now, 0.15)
    this.lfo.frequency.setTargetAtTime(4.8 + 2.2 * this._sp, now, 0.3)
    for (const g of this.uneaseNodes) g.gain.setTargetAtTime(g._base * (1 + 0.35 * this._sp), now, 0.25)
  }
  P.run = function () {
    this.timer = setInterval(() => {
      if (this.ctx.state === 'running') this.pump(this.ctx.currentTime + LOOKAHEAD)
    }, TICK_MS)
    if (App.tick) this.untick = App.tick(() => this.frame())
    // 后台渲染：先是可能马上要用的，再是其余
    this.bank.prefetch(URGENT.concat(LATER))
  }

  /* ---------- 音轨 ---------- */
  function Track(E, name, def) {
    this.E = E
    this.name = name
    this.def = def
    this.ch = {}
    this.persist = []
    this.fade = E.G(0)
    this.fade.connect(E.musicIn)
    this.wet = E.G(0)
    this.wet.connect(def.space === 'abyss' ? E.wetAbyss : E.wetHall)
    this.dlyIn = E.G(1)
    if (def.delay) {
      // 乒乓延迟：左 → 右 → 左……环内低通、输入高通，回声越来越暗
      const c = E.ctx, dt = Math.min(1.9, def.delay.beats * 60 / def.bpm)
      const dl = c.createDelay(2), dr = c.createDelay(2)
      dl.delayTime.value = dt; dr.delayTime.value = dt
      const fb = E.G(def.delay.fb), lp = E.flt('lowpass', def.delay.lp || 2500, 0.5), hp = E.flt('highpass', 240, 0.5)
      const pl = E.pan(-0.55), pr = E.pan(0.55), dw = E.G(0.4)
      this.dlyIn.connect(hp); hp.connect(dl); dl.connect(lp); lp.connect(pl); pl.connect(this.fade)
      lp.connect(dr); dr.connect(pr); pr.connect(this.fade); dr.connect(fb); fb.connect(dl)
      pl.connect(dw); pr.connect(dw); dw.connect(this.wet)
    }
    this.level = 0
    this.active = false
    this.endAt = 0
    this.seed = (Math.imul(E.seedBase, 2654435761) ^ hashStr(name)) >>> 0
    this.spBar = (def.beats || 4) * (def.spb || 4)
    this.base = def.bpm ? 60 / def.bpm / (def.spb || 4) : 0.25
    if (def.init) def.init(this)
  }
  const TP = Track.prototype
  TP.rng = function (b, salt) {
    return rngf((this.seed ^ Math.imul(b + 1, 0x9e3779b1) ^ Math.imul((salt || 0) + 7, 0x85ebca77)) >>> 0)
  }
  TP.channel = function (name, o) {
    const E = this.E, c = E.ctx
    const ch = { in: E.G(1) }
    let node = ch.in
    if (o.hp) { const f = E.flt('highpass', o.hp, 0.6); node.connect(f); node = f }
    if (o.lp) { const f = E.flt('lowpass', o.lp, o.q || 0.6); node.connect(f); node = f; ch.lp = f }
    if (o.trem) {
      // 颤幅（调查里的弦乐）：增益在 1−trem 与 1 之间摆动
      const tg = E.G(1 - o.trem / 2), lfo = c.createOscillator(), dep = E.G(o.trem / 2)
      lfo.frequency.value = o.tremRate || 6
      lfo.connect(dep); dep.connect(tg.gain); lfo.start()
      node.connect(tg); node = tg
      ch.trem = lfo
    }
    const vol = E.G(o.gain == null ? 1 : o.gain)
    node.connect(vol); node = vol; ch.vol = vol
    if (o.pan) { const p = E.pan(o.pan); node.connect(p); node = p }
    node.connect(this.fade)
    if (o.wet) { const w = E.G(o.wet); node.connect(w); w.connect(this.wet) }
    if (o.delay) { const d = E.G(o.delay); node.connect(d); d.connect(this.dlyIn) }
    if (o.unease) { vol._base = vol.gain.value; E.uneaseNodes.add(vol) }
    this.ch[name] = ch
    return ch
  }
  TP.begin = function (t) {
    this.active = true
    this.endAt = 0
    this.t = t
    this.si = 0
    this.bar = 0
    this.events = null
    this.ei = 0
    this.hiccup = null
    this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0 // 每次重新开始都是新的变奏
    if (this.def.begin) this.def.begin(this, t)
  }
  TP.fadeTo = function (v, t, dur) {
    for (const g of [this.fade, this.wet]) {
      const p = g.gain
      holdAt(p, t)
      if (v > 0) p.setTargetAtTime(v, t, Math.max(0.01, dur / 3.2))
      else p.linearRampToValueAtTime(0, t + dur)
    }
    this.level = v
    this.endAt = v > 0 ? 0 : t + dur + 0.25
  }
  TP.end = function () {
    this.active = false
    this.endAt = 0
    const now = this.E.ctx.currentTime
    for (const h of this.persist) try { h.stop(now) } catch (e) { /* */ }
    this.persist = []
    if (this.def.end) this.def.end(this)
  }
  TP.stepDur = function () {
    let sd = this.base
    if (this.def.tempo) sd /= this.def.tempo(this)
    if (this.hiccup && this.hiccup.at === this.si) sd += this.hiccup.extra * this.base
    return sd
  }
  TP.pump = function (until, now) {
    const def = this.def
    if (def.free) def.free(this, until)
    if (!def.bar) return
    // 主线程卡顿导致落后太多时，快进而不补播（避免一堆音符挤在一起）
    const behind = this.t < now - 0.12
    while (this.t < until) {
      if (this.si === 0) {
        this.events = (def.bar(this, this.bar) || []).sort((a, b) => a[0] - b[0])
        this.ei = 0
      }
      const sd = this.stepDur()
      const evs = this.events
      while (this.ei < evs.length && evs[this.ei][0] < this.si + 1) {
        const ev = evs[this.ei++]
        if (behind && this.t < now) continue
        const et = this.t + (ev[0] - this.si) * sd
        try { ev[1](et, sd) } catch (err) { console.error('[audio]', this.name, err) }
      }
      this.t += sd
      if (++this.si >= this.spBar) { this.si = 0; this.bar++ }
    }
  }

  /* ---------- 文件音轨（TRACK_FILES） ---------- */
  function FileTrack(E, name, file) {
    this.E = E
    this.name = name
    this.isFile = true
    this.fade = E.G(0)
    this.fade.connect(E.musicIn)
    this.level = 0
    this.active = false
    this.endAt = 0
    this.mode = 'graph'
    this.zero = 0
    this.ramp = { from: 0, to: 0, t0: 0, t1: 0 }
    const el = (this.el = new Audio())
    el.loop = true
    el.preload = 'auto'
    el.src = 'assets/audio/' + encodeURI(file)
    el.addEventListener('error', () => this.fail())
    try {
      this.node = E.ctx.createMediaElementSource(el)
      this.node.connect(this.fade)
      this.probe = E.ctx.createAnalyser()
      this.probe.fftSize = 512
      this.node.connect(this.probe)
    } catch (e) { this.mode = 'direct' }
  }
  const FP = FileTrack.prototype
  FP.media = function () { return this.mode === 'direct' ? this.el2 || this.el : this.el }
  FP.begin = function () {
    this.active = true
    this.endAt = 0
    const p = this.media().play()
    if (p && p.catch) p.catch(() => {})
  }
  FP.fadeTo = function (v, t, dur) {
    const now = this.E.ctx.currentTime
    this.ramp = { from: this.cur(now), to: v, t0: t, t1: t + dur }
    holdAt(this.fade.gain, t)
    this.fade.gain.linearRampToValueAtTime(v, t + dur)
    this.level = v
    this.endAt = v > 0 ? 0 : t + dur + 0.25
  }
  FP.cur = function (now) {
    const r = this.ramp
    if (now <= r.t0) return r.from
    if (now >= r.t1) return r.to
    return r.from + (r.to - r.from) * ((now - r.t0) / (r.t1 - r.t0))
  }
  FP.end = function () {
    this.active = false
    this.endAt = 0
    this.el.pause()
    if (this.el2) this.el2.pause()
  }
  FP.pump = function () {}
  FP.frame = function (now) {
    if (!this.active) return
    // file:// 下 Chrome 会让 MediaElementSource 输出全零：探测到就改为直接播放
    if (this.mode === 'graph' && !this.checked && !this.el.paused && this.el.currentTime > 0.8 && this.probe) {
      const d = this._pb || (this._pb = new Float32Array(this.probe.fftSize))
      this.probe.getFloatTimeDomainData(d)
      let mx = 0
      for (let i = 0; i < d.length; i++) mx = Math.max(mx, Math.abs(d[i]))
      if (mx > 0) this.checked = true
      else if (++this.zero > 24) this.toDirect()
    }
    if (this.mode === 'direct') this.media().volume = clamp(this.cur(now) * this.E.outV * 0.9, 0, 1)
  }
  FP.toDirect = function () {
    this.mode = 'direct'
    this.checked = true
    const el2 = (this.el2 = new Audio(this.el.src))
    el2.loop = true
    el2.volume = 0
    el2.addEventListener('error', () => this.fail())
    try { el2.currentTime = this.el.currentTime } catch (e) { /* */ }
    this.el.pause()
    if (this.active) { const p = el2.play(); if (p && p.catch) p.catch(() => {}) }
  }
  FP.directLevel = function () {
    if (this.mode !== 'direct' || !this.active) return 0
    const el = this.media()
    return el.paused ? 0 : el.volume * (0.45 + 0.15 * Math.sin(performance.now() / 170))
  }
  FP.fail = function () {
    if (this.failed) return
    this.failed = true
    console.warn('[audio] 无法播放 assets/audio/' + this.name + ' 的文件，改用合成配乐')
    this.E.replaceTrack(this.name)
  }

  /* ======================================================
     §5 配乐
     每段音乐都是一个 def：bpm、每小节拍数、每拍步数（spb），form 为 32 小节左右的和声进行，
     bar(T, b) 返回这一小节的事件 [[步, fn(t, 步长秒)]…]。
     变化来源：每次进入时换种子；每 32 小节为一轮，轮数越多装饰越多；每小节的种子随机决定
     漏音、装饰音、伴奏型、打击乐的加花。所以同一段旋律反复出现，但从不以同一面目出现。
     共同的动机（主导动机）：5 – #4 – 5 – 3 的「叹息」——在洋馆是 A–G#–A–F（D 小调），
     在调查里由钢琴在当前和弦上轻声复述，在终章是 C–B–C–Ab（F 小调）。
     ====================================================== */
  const TRACKS = {}

  /* ---------- dread：洋馆的日常 ----------
     D 小调（和声小调的 C# 用在属和弦上），3/4 拍，♩=70，每拍 4 步（十六分音符网格）。
     和声（32 小节）：
       A  Dm Dm A/C# Dm | Bb Gm A7 Dm
       B  Bb F/A Gm Dm | Eb(那不勒斯 bII，与 D 持续音形成小二度摩擦) A7 Dm Dm
       A' 同 A，旋律高八度、两针齐拨（下方加三度）
       C  Dm Dm/C Bbmaj7 A7 | Gm/Bb Eb/G A7b9 —（第 32 小节机芯停住，只剩 D 与钟摆）
     旋律：音乐盒（见 DSP.mbox）。主导动机 A–G#–A | F——下邻音的颤抖。
     节奏：不完整的圆舞曲——第一拍低音 85% 出现，第二、三拍的和弦各只有 30%，偶尔晚半拍；
       每小节有 10% 的概率「卡住」：机芯在某一步多停两个十六分音符（跳拍）。
     走调：每个音簧有固定的 ±8 音分误差（每次进入重新生成），另有 7% 的音严重走调 ±26–50 音分。
     底层：D1/D2 的嗡鸣（两条相差 9 音分 → 缓慢拍频）+ A2 + 呼吸般的空气声，低通 260 Hz、LFO 0.05 Hz；
       远处的钟摆：独立于音乐的 1.05 秒周期，嘀–嗒交替——和 ♩=70 永远对不齐。
     和风：第 13 小节（Eb）与第 31 小节（A7b9）各有一声筝，后者推弦从 Bb 落到 A。
     张力 > 0.35：每两小节一记极低的心跳。 */
  TRACKS.dread = {
    bpm: 70, beats: 3, spb: 4, space: 'hall', gain: 0.95,
    delay: { beats: 1.5, fb: 0.26, lp: 2200 },
    scale: [2, 4, 5, 7, 9, 10, 0],
    form: form(`Dm Dm A/C# Dm Bb Gm A7 Dm   Bb F/A Gm Dm Eb A7 Dm Dm
                Dm Dm A/C# Dm Bb Gm A7 Dm   Dm Dm/C Bbmaj7 A7 Gm/Bb Eb/G A7b9 NC`),
    mel: mel(`A5:4 G#5:4 A5:4 | F5:12 | E5:4 D#5:4 E5:4 | D5:8 r:4 | Bb5:4 A5:4 Bb5:4 | G5:12 | E5:4 G5:4 C#6:4 | D6:8 A5:2 r:2 |
              D6:4 F6:4 D6:2 C6:2 | C6:8 A5:4 | Bb5:4 D6:4 G6:4 | F6:6 E6:2 D6:4 | Eb6:8 Bb5:4 | C#6:4 E6:4 G6:4 | F6:4 E6:2 D6:2 A5:4 | D6:12 |
              A6:4 G#6:4 A6:4 | F6:12 | E6:4 D#6:4 E6:4 | D6:8 r:4 | Bb5:4 A5:4 Bb5:4 | G5:6 A5:2 Bb5:4 | E5:4 G5:4 C#6:4 | D6:8 r:4 |
              A5:4 A5:4 A5:4 | F5:6 E5:6 | D6:4 A5:4 F5:4 | E5:12 | D5:4 G5:4 Bb5:4 | Eb6:8 D6:4 | Bb5:4 A5:4 G5:4 | C#5:12`),
    init(T) {
      T.channel('box', { gain: 0.34, wet: 0.5, delay: 0.14, lp: 7500 })
      T.channel('low', { gain: 0.15, wet: 0.55, lp: 2600 })
      T.channel('koto', { gain: 0.6, wet: 0.55, pan: -0.3, delay: 0.2 })
      T.channel('drone', { gain: 0.08, wet: 0.25 })
      T.channel('clock', { gain: 0.25, wet: 0.9, lp: 2800, pan: 0.35 })
      T.channel('pulse', { gain: 0.35, wet: 0.15 })
    },
    begin(T, t) {
      const r = T.rng(0, 99), map = {}
      T.comb = m => (map[m] == null ? (map[m] = (r() - 0.5) * 16) : map[m])
      T.pt = t + 0.6
      T.pk = 0
      T.persist.push(T.E.drone(T.ch.drone, t, [
        { f: 73.42, wave: 'hum', gain: 0.45 },
        { f: 73.42, wave: 'hum', gain: 0.3, detune: 9 },
        { f: 36.71, gain: 0.3 },
        { f: 110, gain: 0.07 },
      ], { lp: 260, attack: 5, rate: 0.05, depth: 0.25, noise: { f: 420, q: 0.7, gain: 0.35 } }))
    },
    free(T, until) {
      const E = T.E
      while (T.pt < until) {
        const k = T.pk++
        E.play(T.ch.clock, E.buf(k % 2 ? 'tock' : 'tick'), T.pt, { gain: 0.85 + (k % 3) * 0.05, pan: k % 2 ? 0.12 : -0.12 })
        T.pt += 1.05
      }
    },
    bar(T, b) {
      const E = T.E, d = T.def, n = d.form.length, i = b % n, cyc = Math.floor(b / n)
      const r = T.rng(b), ch = d.form[i], ev = []
      // 旋律
      let notes = d.mel[i]
      if (cyc > 0 || i >= 16) notes = vary(notes, r, { scale: d.scale, orn: 0.08 + 0.05 * Math.min(cyc, 3), drop: i >= 24 ? 0.14 : 0.04 })
      const twoPin = i >= 16 && i < 20
      for (const nt of notes) {
        const s = nt[0], m = nt[1]
        const cents = T.comb(m) + (r() < 0.07 ? (r() < 0.5 ? -1 : 1) * (26 + r() * 24) : 0)
        const v = (s === 0 ? 0.6 : 0.48) * (0.85 + r() * 0.3)
        const at = s + r() * 0.05
        ev.push([at, t => E.note(T.ch.box, 'mbox', m, t, v, { cents, pan: (m - 81) / 26 })])
        if (twoPin) {
          const h = scaleDown(m, d.scale, 2)
          ev.push([at + 0.03, t => E.note(T.ch.box, 'mbox', h, t, v * 0.5, { cents: T.comb(h), pan: (h - 81) / 26 })])
        }
      }
      // 不完整的圆舞曲伴奏
      if (!ch.nc) {
        if (r() < 0.85) {
          const bn = bassOf(ch, 50)
          ev.push([0.02, t => E.note(T.ch.low, 'mbox', bn, t, 0.55, { cents: T.comb(bn) })])
        }
        const dy = voice(ch, 62, 2)
        for (const beat of [1, 2]) {
          if (r() < 0.3) {
            const s = beat * 4 + (r() < 0.18 ? 2 : 0)
            for (const m of dy) ev.push([s + 0.03, t => E.note(T.ch.low, 'mbox', m, t, 0.3, { cents: T.comb(m) })])
          }
        }
      } else {
        ev.push([0, t => E.note(T.ch.low, 'mbox', 50, t, 0.45, { cents: -12 })])
      }
      // 和风的冷
      if (i === 12 && r() < 0.85) {
        ev.push([0, t => E.note(T.ch.koto, 'koto', 51, t, 0.55)])
        ev.push([6, t => E.note(T.ch.koto, 'koto', 58, t, 0.4, { bend: [1.0595, 0.3, 0.35] })])
      }
      if (i === 30 && r() < 0.85) ev.push([0, t => E.note(T.ch.koto, 'koto', 58, t, 0.55, { bend: [0.9439, 0.45, 0.5] })])
      // 心跳
      if (i % 2 === 0) ev.push([0, t => { const x = E.tension; if (x > 0.35) E.thump(T.ch.pulse, t, 0.3 + 0.5 * x, 58, 38, 0.3) }])
      // 跳拍
      T.hiccup = i % 8 !== 0 && i !== 31 && r() < 0.1 ? { at: 2 + ((r() * 8) | 0), extra: 2 } : null
      return ev
    },
  }

  /* ---------- gallery：肖像长廊 ----------
     G 小调，3/4 拍，♩=104 的慢圆舞曲。
     和声（32 小节）：
       A  Gm Eb Cm D7 | Gm Bb/F Ebmaj7 D
       B  Bb F/A Gm D/F# | Eb Cm6 Am7b5 D7
       A' Gm Eb Cm D7 | Gm/Bb Eb Am7b5 D7      （旋律加回音音型，第一轮由音乐盒高八度叠奏）
       C  Ebmaj7 Abmaj7(bII) Gm/D C#dim7 | Cm/Eb D7b9 Gm D7
     旋律：羽管键琴，长音在第一拍，二三拍走向下一小节；之后各轮加波音、倚音、颤音、八度移位。
     左手：钢琴「嘭–嚓–嚓」——低音在第一拍，三音和弦在二、三拍；16% 的小节改为八分音符分解，
       20% 的第三拍改为走向下一和弦低音的经过音。
     弦乐：每小节一组四声部长音，起音 0.35 s，与下一小节重叠交接，受光标速度调制（颤音、音量）。
     不和谐的高音：每 8 小节的第 4 小节（75%）以及偶然（4%），一个玻璃般的高音，
       落在和弦最高音的小二度上方（或三全音），极弱、长混响，像画里有人睁了一下眼。 */
  TRACKS.gallery = {
    bpm: 104, beats: 3, spb: 4, space: 'hall', gain: 0.85,
    delay: { beats: 0.75, fb: 0.2, lp: 3000 },
    scale: [7, 9, 10, 0, 2, 3, 5],
    form: form(`Gm Eb Cm D7 Gm Bb/F Ebmaj7 D   Bb F/A Gm D/F# Eb Cm6 Am7b5 D7
                Gm Eb Cm D7 Gm/Bb Eb Am7b5 D7   Ebmaj7 Abmaj7 Gm/D C#dim7 Cm/Eb D7b9 Gm D7`),
    mel: mel(`G5:6 A5:2 Bb5:4 | Eb6:8 D6:4 | C6:4 Bb5:4 G5:4 | A5:8 F#5:4 | G5:6 A5:2 Bb5:4 | D6:6 C6:2 Bb5:4 | G5:4 Bb5:4 D6:4 | C6:4 A5:8 |
              F6:6 Eb6:2 D6:4 | C6:8 A5:4 | Bb5:6 A5:2 G5:4 | F#5:4 A5:4 D6:4 | G6:6 F6:2 Eb6:4 | Eb6:4 D6:4 A5:4 | C6:6 Bb5:2 A5:4 | F#5:8 r:2 D5:2 |
              G5:4 A5:1 G5:1 F#5:1 G5:1 Bb5:4 | Eb6:6 D6:1 Eb6:1 D6:4 | C6:2 Eb6:2 Bb5:4 G5:2 Eb5:2 | F#5:4 A5:4 C6:4 | Bb5:6 D6:2 G6:4 | G6:4 F6:2 Eb6:2 D6:4 | C6:4 Eb6:4 A5:4 | F#5:6 G5:2 A5:4 |
              G5:6 Bb5:2 D6:4 | C6:6 Eb6:2 G6:4 | Bb5:8 G5:4 | E6:4 C#6:4 Bb5:4 | C6:6 Bb5:2 G5:4 | Eb6:4 C6:4 F#5:4 | G5:12 | D5:4 F#5:4 A5:4`),
    init(T) {
      T.channel('harp', { gain: 0.72, wet: 0.35, delay: 0.1, pan: 0.12 })
      T.channel('piano', { gain: 0.42, wet: 0.32, pan: -0.15 })
      T.channel('str', { gain: 0.031, wet: 0.55, lp: 2200, unease: true })
      T.channel('glass', { gain: 0.045, wet: 0.95, delay: 0.3 })
      T.channel('box', { gain: 0.12, wet: 0.6, pan: 0.3 })
    },
    bar(T, b) {
      const E = T.E, d = T.def, n = d.form.length, i = b % n, cyc = Math.floor(b / n)
      const r = T.rng(b), ch = d.form[i], nx = d.form[(i + 1) % n], ev = []
      const inA2 = i >= 16 && i < 24
      // 旋律
      const notes = vary(d.mel[i], r, {
        scale: d.scale,
        orn: (cyc > 0 ? 0.1 + 0.06 * Math.min(cyc, 3) : 0.04) + (inA2 ? 0.06 : 0),
        trill: cyc > 0 ? 0.08 : 0.03,
        oct: cyc > 0 && i >= 24 ? 0.2 : 0,
      })
      for (const nt of notes) {
        const s = nt[0], m = nt[1], du = nt[2]
        const v = (s === 0 ? 0.62 : 0.52) * (0.9 + r() * 0.2)
        ev.push([s + r() * 0.04, (t, sd) => E.note(T.ch.harp, 'harpsi', m, t, v, { dur: du * sd + 0.12, rel: 0.3 })])
        if (inA2 && cyc % 2 === 0) ev.push([s + 0.05, (t, sd) => E.note(T.ch.box, 'mbox', m + 12, t, 0.38, {})])
      }
      // 左手：嘭–嚓–嚓
      const bn = bassOf(ch, 38)
      ev.push([0, (t, sd) => E.note(T.ch.piano, 'piano', bn, t, 0.6, { dur: sd * 4.5, rel: 0.5 })])
      const cv = voice(ch, 55, 3)
      if (r() < 0.16) {
        ;[4, 6, 8, 10].forEach((s, k) => {
          const m = k === 3 ? cv[0] + 12 : cv[k % cv.length]
          ev.push([s, (t, sd) => E.note(T.ch.piano, 'piano', m, t, 0.3, { dur: sd * 2.2, rel: 0.4 })])
        })
      } else {
        ev.push([4, (t, sd) => { for (const m of cv) E.note(T.ch.piano, 'piano', m, t, 0.27, { dur: sd * 3, rel: 0.25 }) }])
        if (r() < 0.2) {
          const target = bassOf(nx, 38), pass = target + (r() < 0.5 ? -1 : 2)
          ev.push([8, (t, sd) => E.note(T.ch.piano, 'piano', pass, t, 0.45, { dur: sd * 3.5, rel: 0.3 })])
        } else ev.push([8, (t, sd) => { for (const m of cv) E.note(T.ch.piano, 'piano', m, t, 0.24, { dur: sd * 3, rel: 0.25 }) }])
      }
      // 弦乐长音
      const pv = voice(ch, 50, 4)
      ev.push([0, (t, sd) => { for (const m of pv) E.pad(T.ch.str, m, t, sd * 12, 0.5, { attack: 0.35, release: 0.9, wave: 'string' }) }])
      // 不和谐的高音
      if ((i % 8 === 3 && r() < 0.75) || r() < 0.04) {
        const top = Math.max.apply(null, voice(ch, 72, 3))
        const m = fold(top + (r() < 0.6 ? 1 : 6), 93, 104)
        ev.push([6 + ((r() * 2) | 0) * 2, t => E.glass(T.ch.glass, m, t, 0.5, 4.5)])
      }
      return ev
    },
  }

  /* ---------- investigation：调查 ----------
     E 小调 / 弗里几亚色彩（bII = F），4/4 拍，♩=100，十六分音符网格。
     和声（32 小节）：
       Em×4 F×2 Em×2 | Cmaj7×2 Am×2 F B7 Bsus4 B7
       Em×2 G×2 F#m7b5×2 Fmaj7×2 | Em/B×2 C×2 B7×2 Bb(三全音替代) B7
     层次与张力（tension 0–1，在事件发生的那一刻读取）：
       脉冲低音（合成：锯齿+低八度方波→共振低通，包络随张力打开）
         0：四分音符 / >0.2：八分音符 / >0.45：弱拍八度跳 / >0.75：十六分音符奔马
         小节末若下一和弦换根，用半音经过音进入。
       钟表：四分音符嘀嗒；>0.45 加八分；>0.85 加十六分（极轻）。
       紧张的持续音：每两小节一个——和弦五音与其上方小二度的摩擦，高音区，颤幅 4–11 Hz 随张力加快；
         下方大提琴般的根音长音。
       金属敲击：每小节 22% + 50%×张力 的概率，落在弱位十六分音符上，随机声像，长混响+延迟。
       钢琴：每 8 小节的第 3 小节，在当前和弦上复述主导动机 5–#4–5–3；偶尔低音区半音「叮」。
       打击：>0.35 八分踩镲 / >0.7 十六分；>0.55 每小节一记心跳底鼓；>0.8 每 4 小节尾的太鼓；
         >0.4 每 8 小节尾的噪声上扬。 */
  TRACKS.investigation = {
    bpm: 100, beats: 4, spb: 4, space: 'hall', gain: 0.85,
    delay: { beats: 0.75, fb: 0.34, lp: 1800 },
    scale: [4, 5, 7, 9, 11, 0, 2],
    form: form(`Em Em Em Em F F Em Em Cmaj7 Cmaj7 Am Am F B7 Bsus4 B7
                Em Em G G F#m7b5 F#m7b5 Fmaj7 Fmaj7 Em/B Em/B C C B7 B7 Bb B7`),
    init(T) {
      T.channel('bass', { gain: 0.26, wet: 0.06 })
      T.channel('clock', { gain: 0.38, wet: 0.3, pan: 0.25, hp: 1200 })
      T.channel('pad', { gain: 0.046, wet: 0.6, lp: 3400, unease: true, trem: 0.7, tremRate: 5 })
      T.channel('cello', { gain: 0.033, wet: 0.45, lp: 1100 })
      T.channel('metal', { gain: 0.32, wet: 0.7, delay: 0.25 })
      T.channel('piano', { gain: 0.34, wet: 0.45, delay: 0.28 })
      T.channel('perc', { gain: 0.34, wet: 0.12 })
    },
    bar(T, b) {
      const E = T.E, d = T.def, n = d.form.length, i = b % n
      const r = T.rng(b), ch = d.form[i], nx = d.form[(i + 1) % n], ev = []
      const tn = () => E.tension
      const root = bassOf(ch, 28)
      // 脉冲低音
      const approach = nx.bass !== ch.bass ? bassOf(nx, 28) + (r() < 0.5 ? -1 : 1) : root
      for (let s = 0; s < 16; s++) {
        const accent = s % 4 === 0 ? 1 : s === 6 || s === 10 ? 0.85 : 0.62
        const up = s % 4 === 2 && r() < 0.5
        ev.push([s, (t, sd) => {
          const x = tn()
          const on = s % 4 === 0 || (s % 2 === 0 && x > 0.2) || (x > 0.75 && s % 4 !== 3)
          if (!on) return
          let m = root + (up && x > 0.45 ? 12 : 0)
          if (s === 14 && x > 0.3) m = approach
          E.synthBass(T.ch.bass, m, t, sd * (x > 0.75 ? 0.8 : x > 0.2 ? 1.5 : 3), (0.5 + 0.3 * x) * accent, { env: 700 + 1800 * x })
        }])
      }
      // 钟表
      for (let s = 0; s < 16; s++) {
        ev.push([s, t => {
          const x = tn()
          const q = s % 4 === 0
          if (!q && (s % 2 ? x < 0.85 : x < 0.45)) return
          E.play(T.ch.clock, E.buf('wtick'), t, { gain: q ? 0.8 : s % 2 ? 0.25 : 0.45, rate: s % 8 === 4 ? 0.9 : 1 })
        }])
      }
      // 紧张的持续音
      if (i % 2 === 0) {
        const fifth = fold(ch.pcs[2] + 72, 71, 82)
        const pv = [fifth, fifth + 1]
        const cello = bassOf(ch, 40)
        ev.push([0, (t, sd) => {
          if (T.ch.pad.trem) T.ch.pad.trem.frequency.setTargetAtTime(4 + 7 * tn(), t, 0.6)
          for (const m of pv) E.pad(T.ch.pad, m, t, sd * 32, 0.55 + 0.35 * tn(), { attack: 1.4, release: 2, wave: 'string' })
          E.pad(T.ch.cello, cello, t, sd * 32, 0.8, { attack: 1, release: 1.6, wave: 'string', voices: [-5, 5] })
        }])
      }
      // 金属
      if (r() < 0.22 + 0.5 * E.tension) {
        const s = [3, 5, 7, 11, 13][(r() * 5) | 0], v = (r() * 4) | 0
        const rate = [1, 0.749, 1.335, 0.5][(r() * 4) | 0], pan = (r() * 2 - 1) * 0.75, g = 0.6 + r() * 0.3
        ev.push([s, t => E.play(T.ch.metal, E.buf('metal:' + v), t, { gain: g, rate, pan })])
      }
      // 钢琴：主导动机
      if (i % 8 === 2) {
        const f5 = fold(ch.pcs[2] + 60, 64, 75)
        let third = f5 - 1
        while (pcOf(third) !== ch.pcs[1]) third--
        const line = [[0, f5, 4], [4, f5 - 1, 4], [8, f5, 4], [12, third, 10]]
        for (const [s, m, du] of line) ev.push([s, (t, sd) => E.note(T.ch.piano, 'piano', m, t, 0.4, { dur: du * sd, rel: 0.6 })])
      }
      if (i % 4 === 1 && r() < 0.5) {
        const m = root + 12 + (r() < 0.5 ? 1 : 0), s = r() < 0.5 ? 6 : 10
        ev.push([s, (t, sd) => E.note(T.ch.piano, 'piano', m, t, 0.35, { dur: sd * 6, rel: 0.8 })])
      }
      // 打击
      for (let s = 0; s < 16; s++) {
        ev.push([s, t => {
          const x = tn()
          if (x < 0.35 || (s % 2 && x < 0.7)) return
          E.play(T.ch.perc, E.buf('hatC'), t, { gain: (s % 4 === 2 ? 0.45 : 0.28) * (0.6 + 0.6 * x) })
        }])
      }
      ev.push([0, t => { if (tn() > 0.55) E.thump(T.ch.perc, t, 0.62, 64, 42, 0.26) }])
      ev.push([1.5, t => { if (tn() > 0.55) E.thump(T.ch.perc, t, 0.42, 60, 40, 0.22) }])
      ev.push([8, t => { if (tn() > 0.85) E.thump(T.ch.perc, t, 0.52, 64, 42, 0.26) }])
      if (i % 4 === 3) for (const s of [12, 14, 15]) ev.push([s, t => { if (tn() > 0.8) E.play(T.ch.perc, E.buf('taiko'), t, { gain: s === 12 ? 0.6 : 0.4 }) }])
      if (i % 8 === 7) ev.push([8, (t, sd) => { if (tn() > 0.4) E.riser(T.ch.perc, t, sd * 8, 0.25 + 0.25 * tn()) }])
      return ev
    },
  }

  /* ---------- trial：庭审 ----------
     C 小调，4/4 拍，♩=152，十六分音符网格。爵士刷鼓 + 拨奏低音提琴 + 钢琴 + 断奏弦乐 + 电子琶音。
     和声（32 小节）：
       A  Cm Cm/Bb Abmaj7 G7 | Cm Cm/Bb Fm7 G7b9           （低音半音下行 C–Bb–Ab–G）
       B  Ab Bb Gm7 Cm | Fm Db(bII) G7sus4 G7
       A' 同 A
       C  Eb Bb/D Db Ab/C | Bdim7 Cm Dm7b5 G7               （第 32 小节后半急停：军鼓滚奏 + 上扬）
     节奏型：
       断奏弦乐 3+3+2+3+3+2 的十六分音符切分（步 0 3 6 8 11 14），第 0、8 步重音。
       底鼓 A：0、8 + 6 或 10（随机）+ 偶尔 14；B：0、8、11；C 前四小节只有通鼓渐强。
         张力 ≥ 0.5 改为四踩（0 4 8 12）。军鼓 4、12；刷子在 2 6 10 14 扫过。
       踩镲八分，张力 ≥ 0.5 十六分；B 段 14 步开镲。
       低音：A/A' 八度跳琶音（根–高八度–五–高八度–根–高八度–七–经过音），B 段四分音符行走，
         C 段八分；张力 ≥ 0.7 每个音补一个十六分重复（嗒嗒）。
     旋律：A 段钢琴的短促问句（十六分音符，围绕 G–C–Eb–D）；A' 段后四小节升高八度并由羽管键琴叠奏；
       B 段弦乐长线条（带颤音）；C 段羽管键琴的十六分音符分解和弦。
     张力层：≥ 0.4 或 A'/C 段，方波十六分琶音；≥ 0.85 太鼓 / 通鼓十六分音型。 */
  TRACKS.trial = {
    bpm: 152, beats: 4, spb: 4, space: 'hall', gain: 0.7,
    delay: { beats: 0.75, fb: 0.22, lp: 3000 },
    scale: [0, 2, 3, 5, 7, 8, 10],
    form: form(`Cm Cm/Bb Abmaj7 G7 Cm Cm/Bb Fm7 G7b9   Ab Bb Gm7 Cm Fm Db G7sus4 G7
                Cm Cm/Bb Abmaj7 G7 Cm Cm/Bb Fm7 G7b9   Eb Bb/D Db Ab/C Bdim7 Cm Dm7b5 G7`),
    leadA: mel(`G5:2 C6:1 Eb6:1 D6:2 C6:2 G5:2 Ab5:1 G5:1 F5:2 Eb5:2 | D5:2 Eb5:2 G5:4 Bb5:2 Ab5:2 G5:4 |
                C6:2 Eb6:1 G6:1 F6:2 Eb6:2 C6:2 Ab5:2 G5:4 | B5:2 D6:2 F6:2 D6:2 B5:4 G5:2 F5:2 |
                G5:2 C6:1 Eb6:1 D6:2 C6:2 G6:4 Eb6:2 C6:2 | D6:2 C6:2 Bb5:2 G5:2 Bb5:4 G5:4 |
                Ab5:2 C6:2 Eb6:2 F6:2 Eb6:2 C6:2 Ab5:4 | B5:2 Ab5:2 F5:2 D5:2 B4:8`),
    leadB: mel(`C6:6 Eb6:6 C6:4 | D6:8 F6:4 Eb6:4 | D6:6 Bb5:6 G5:4 | C6:12 Eb6:4 |
                F6:6 Eb6:6 C6:4 | F6:8 Db6:8 | C6:8 D6:8 | B5:8 D6:4 F6:4`),
    init(T) {
      T.channel('kick', { gain: 0.22, wet: 0.04 })
      T.channel('snare', { gain: 0.38, wet: 0.16, pan: -0.06 })
      T.channel('hat', { gain: 0.34, wet: 0.05, pan: 0.25 })
      T.channel('bass', { gain: 0.3, wet: 0.05 })
      T.channel('stab', { gain: 0.075, wet: 0.25, lp: 3000, hp: 180 })
      T.channel('lead', { gain: 0.36, wet: 0.25, delay: 0.12, pan: 0.1 })
      T.channel('harp', { gain: 0.3, wet: 0.3, pan: 0.3, delay: 0.1 })
      T.channel('strl', { gain: 0.044, wet: 0.4, lp: 3200, unease: true })
      T.channel('arp', { gain: 0.05, wet: 0.2, delay: 0.25, lp: 2400, pan: -0.25 })
      T.channel('taiko', { gain: 0.085, wet: 0.2 })
    },
    bar(T, b) {
      const E = T.E, d = T.def, n = d.form.length, i = b % n
      const r = T.rng(b), ch = d.form[i], nx = d.form[(i + 1) % n], ev = []
      const sec = i < 8 ? 'A' : i < 16 ? 'B' : i < 24 ? 'A2' : 'C'
      const tn = () => E.tension
      const brk = i === 31
      const live = s => !brk || s < 8
      // —— 鼓
      let kick = sec === 'B' ? [0, 8, 11] : [0, 8, r() < 0.5 ? 6 : 10].concat(r() < 0.3 ? [14] : [])
      if (sec === 'C' && i < 28) kick = []
      if (brk) kick = [0]
      for (const s of kick) ev.push([s, t => E.play(T.ch.kick, E.buf('kick'), t, { gain: s === 0 ? 1 : 0.8 })])
      if (!(sec === 'C' && i < 28) && !brk) for (const s of [4, 12]) ev.push([s, t => { if (tn() >= 0.5 && kick.indexOf(s) < 0) E.play(T.ch.kick, E.buf('kick'), t, { gain: 0.75 }) }])
      for (const s of [4, 12]) if (live(s)) ev.push([s, t => E.play(T.ch.snare, E.buf('snare'), t, { gain: 0.85 + r() * 0.1 })])
      for (const s of [2, 6, 10, 14]) if (live(s)) ev.push([s - 0.3, t => E.play(T.ch.snare, E.buf('brush'), t, { gain: 0.55 })])
      for (let s = 0; s < 16; s++) {
        if (!live(s)) continue
        ev.push([s, t => {
          const x = tn()
          if (s % 2 && x < 0.5) return
          const open = sec === 'B' && s === 14
          E.play(T.ch.hat, E.buf(open ? 'hatO' : 'hatC'), t, { gain: open ? 0.5 : s % 4 === 2 ? 0.8 : s % 2 ? 0.35 : 0.55 })
        }])
      }
      if (sec === 'C' && i < 28) {
        const pat = i < 26 ? [0, 6, 12] : [0, 3, 6, 8, 10, 12, 14]
        for (const s of pat) ev.push([s, t => E.play(T.ch.taiko, E.buf('tom'), t, { gain: 0.45 + 0.1 * (i - 24) + (s === 0 ? 0.15 : 0), rate: s % 4 === 0 ? 0.85 : 1 })])
      }
      if (brk) {
        for (let s = 8; s < 16; s++) ev.push([s, t => E.play(T.ch.snare, E.buf('snare'), t, { gain: 0.25 + (s - 8) * 0.09 })])
        ev.push([4, (t, sd) => E.riser(T.ch.hat, t, sd * 12, 0.8)])
      }
      if (i % 8 === 0) ev.push([0, t => E.play(T.ch.hat, E.buf('hatO'), t, { gain: 1.2, rate: 0.7 })])
      // 张力满：太鼓十六分音型
      for (const s of [0, 3, 6, 8, 10, 12, 13, 14, 15]) {
        if (!live(s)) continue
        ev.push([s, t => { if (tn() >= 0.85) E.play(T.ch.taiko, E.buf(s % 4 === 0 ? 'taiko' : 'tom'), t, { gain: s % 4 === 0 ? 0.8 : 0.4, rate: s > 12 ? 1.15 : 1 }) }])
      }
      // —— 低音
      const bn = bassOf(ch, 31), up = [bn].concat(tonesIn(ch, bn + 1, bn + 24))
      const nb = bassOf(nx, 31)
      const appr = nb + (r() < 0.5 ? -1 : 1)
      let line
      if (sec === 'B') line = [[0, up[0]], [4, up[1]], [8, up[2]], [12, appr]].concat(r() < 0.5 ? [[10, up[3]]] : [])
      else if (sec === 'C') line = [[0, up[0]], [2, up[0]], [4, up[2]], [6, up[0] + 12], [8, up[0]], [10, up[1]], [12, up[2]], [14, appr]]
      else line = [[0, up[0]], [2, bn + 12], [4, up[2]], [6, bn + 12], [8, up[0]], [10, bn + 12], [12, up[3] || up[2]], [14, appr]]
      for (const [s, m] of line) {
        if (!live(s)) continue
        const v = s % 4 === 0 ? 0.85 : 0.65
        ev.push([s, (t, sd) => {
          E.note(T.ch.bass, 'ubass', m, t, v, { dur: sd * 1.8, rel: 0.12 })
          if (tn() >= 0.7) E.note(T.ch.bass, 'ubass', m, t + sd, v * 0.6, { dur: sd * 0.8, rel: 0.08 })
        }])
      }
      // —— 断奏弦乐
      const sv = voice(ch, 60, 3)
      const stabs = sec === 'B' ? [2, 6, 10, 14] : [0, 3, 6, 8, 11, 14]
      for (const s of stabs) {
        if (!live(s)) continue
        const v = s === 0 || s === 8 ? 0.95 : 0.6
        ev.push([s, (t, sd) => E.stab(T.ch.stab, sv, t, sd * 1.1, v)])
      }
      // —— 旋律
      if (sec === 'A' || sec === 'A2') {
        const k = i % 8, hi = sec === 'A2' && k >= 4
        for (const [s, m, du] of d.leadA[k]) {
          if (!live(s)) continue
          const v = (s % 4 === 0 ? 0.62 : 0.5) * (0.9 + r() * 0.2)
          ev.push([s, (t, sd) => {
            E.note(T.ch.lead, 'piano', m + (hi ? 12 : 0), t, v, { dur: du * sd, rel: 0.12 })
            if (sec === 'A2') E.note(T.ch.harp, 'harpsi', m + (hi ? 0 : 12), t, v * 0.7, { dur: du * sd, rel: 0.12 })
          }])
        }
      } else if (sec === 'B') {
        for (const [s, m, du] of d.leadB[i - 8]) {
          ev.push([s, (t, sd) => E.pad(T.ch.strl, m, t, du * sd, 0.7, { attack: 0.06, release: 0.35, wave: 'string', voices: [-6, 0, 6] })])
          ev.push([s, (t, sd) => E.note(T.ch.lead, 'piano', m - 12, t, 0.3, { dur: du * sd * 0.5, rel: 0.3 })])
        }
      } else {
        const tones = tonesIn(ch, 67, 91), seq = []
        for (let k = 0; k < 16; k++) { const p = k % 8; seq.push(tones[p < 4 ? p : 8 - p] || tones[0]) }
        seq.forEach((m, s) => { if (live(s)) ev.push([s, (t, sd) => E.note(T.ch.harp, 'harpsi', m, t, s % 4 === 0 ? 0.55 : 0.4, { dur: sd * 1.2, rel: 0.1 })]) })
      }
      // —— 电子琶音
      const at = tonesIn(ch, 72, 88)
      for (let s = 0; s < 16; s++) {
        if (!live(s)) continue
        const m = at[(s * 3 + ((s / 4) | 0)) % at.length]
        ev.push([s, t => { const x = tn(); if (x >= 0.4 || sec === 'A2' || sec === 'C') E.blip(T.ch.arp, m, t, s % 4 === 0 ? 0.8 : 0.5, 0.09) }])
      }
      return ev
    },
  }

  /* ---------- wish：终章 ----------
     F 小调，3/4 拍，♩=72 起，像发条将尽的音乐盒：
       每一「发条」长 9–16 小节；进行度 p = 0→1，速度乘以 1 − 0.5·p^1.7（越来越慢），
       音高下沉 −60·p^2.2 音分（弹簧松了，音梳转得慢），漏音概率 3% + 38%·p^2.4。
       停住后留两小节空白（只有风与极低的嗡声），然后一串上发条的棘轮声，从某个乐句的开头重新响起。
     和声（24 小节）：
       W1 Fm Fm Db Db | Bbm Fm/C C7 Fm
       W2 Db Eb Cm Fm | Bbm Eb Ab C7
       W3 Fm Db Bbm C7 | Fm Db Gb(bII) C7
     主导动机 C–B–C | Ab。混响走 7.5 秒的 abyss，附点四分乒乓延迟，弦乐只是很远的一层雾。 */
  TRACKS.wish = {
    bpm: 72, beats: 3, spb: 4, space: 'abyss', gain: 0.95,
    delay: { beats: 1.5, fb: 0.38, lp: 1800 },
    scale: [5, 7, 8, 10, 0, 1, 3],
    form: form(`Fm Fm Db Db Bbm Fm/C C7 Fm   Db Eb Cm Fm Bbm Eb Ab C7   Fm Db Bbm C7 Fm Db Gb C7`),
    mel: mel(`C6:4 B5:4 C6:4 | Ab5:12 | Ab5:4 G5:4 Ab5:4 | F5:12 | Db6:4 C6:4 Bb5:4 | Ab5:8 C6:4 | Bb5:4 G5:4 E5:4 | F5:12 |
              F6:6 Eb6:2 Db6:4 | Eb6:8 Bb5:4 | C6:6 Bb5:2 G5:4 | Ab5:12 | Bb5:4 Db6:4 F6:4 | G6:8 Eb6:4 | C6:4 Ab5:4 Eb5:4 | E5:12 |
              C6:4 B5:4 C6:4 | F6:12 | Db6:4 C6:4 Bb5:4 | G5:8 E5:4 | Ab5:4 G5:4 Ab5:4 | F5:12 | Gb5:4 Bb5:4 Db6:4 | E5:12`),
    // 一小节之内也在连续地变慢：从本小节的速度线性滑向下一小节的速度
    tempo(T) { return T.k0 + (T.k1 - T.k0) * (T.si / T.spBar) },
    init(T) {
      T.channel('box', { gain: 0.28, wet: 0.75, delay: 0.24 })
      T.channel('low', { gain: 0.135, wet: 0.8 })
      T.channel('pad', { gain: 0.018, wet: 1, lp: 1800, unease: true })
      T.channel('drone', { gain: 0.09, wet: 0.4 })
      T.channel('wind', { gain: 0.12, wet: 0.6, pan: -0.2 })
    },
    begin(T, t) {
      const r = T.rng(0, 55), map = {}
      T.comb = m => (map[m] == null ? (map[m] = (r() - 0.5) * 12) : map[m])
      T.w = { pos: 0, len: 12, mi: 0, gap: 0 }
      T.k0 = T.k1 = 1
      T.persist.push(T.E.drone(T.ch.drone, t, [
        { f: 43.65, gain: 0.3 },
        { f: 87.31, wave: 'hum', gain: 0.25 },
        { f: 87.31, wave: 'hum', gain: 0.18, detune: 7 },
      ], { lp: 220, attack: 6, rate: 0.04, depth: 0.3, noise: { f: 700, q: 0.5, gain: 0.25 } }))
    },
    bar(T, b) {
      const E = T.E, d = T.def, w = T.w, r = T.rng(b), ev = []
      if (w.gap > 0) {
        T.k0 = T.k1 = 1
        if (w.gap === 2) ev.push([1, (t, sd) => E.gust(T.ch.wind, t, sd * 20, 0.9)])
        w.gap--
        if (w.gap === 0) {
          // 上发条：棘轮一格一格地咬合
          for (let k = 0; k < 9; k++) ev.push([4 + k * 0.85, t => E.play(T.ch.low, E.buf('click'), t, { gain: 0.5 + 0.04 * k, rate: 0.6 + 0.02 * k })])
        }
        return ev
      }
      const p = w.pos / w.len
      const kOf = x => 1 - 0.5 * Math.pow(Math.min(1, x), 1.7)
      T.k0 = kOf(p)
      T.k1 = kOf((w.pos + 1) / w.len)
      const sag = -60 * Math.pow(p, 2.2)
      const skip = 0.03 + 0.38 * Math.pow(p, 2.4)
      const i = w.mi % d.form.length, ch = d.form[i]
      for (const [s, m] of d.mel[i]) {
        if (s > 0 && r() < skip) continue
        const cents = T.comb(m) + sag + (r() < 0.06 ? -30 : 0)
        const v = (s === 0 ? 0.6 : 0.5) * (1 - 0.3 * p) * (0.85 + r() * 0.3)
        ev.push([s + r() * 0.08 * (1 + p * 3), t => E.note(T.ch.box, 'mbox', m, t, v, { cents, pan: (m - 80) / 30 })])
      }
      if (r() < 0.7) { const bn = bassOf(ch, 53); ev.push([0.03, t => E.note(T.ch.low, 'mbox', bn, t, 0.55, { cents: T.comb(bn) + sag })]) }
      if (r() < 0.4) {
        const dy = voice(ch, 65, 2), s = r() < 0.5 ? 4 : 8
        for (const m of dy) ev.push([s + 0.04, t => E.note(T.ch.low, 'mbox', m, t, 0.28, { cents: T.comb(m) + sag })])
      }
      const pv = voice(ch, 65, 3)
      ev.push([0, (t, sd) => { for (const m of pv) E.pad(T.ch.pad, m, t, sd * 12 * 1.1, 0.5, { attack: 1.2, release: 2.5, wave: 'string', cents: sag }) }])
      w.pos++
      w.mi++
      if (w.pos >= w.len) {
        w.gap = 2
        w.pos = 0
        w.len = 9 + ((r() * 8) | 0)
        w.mi = [0, 8, 16, 4, 12, 20][(r() * 6) | 0]
      }
      return ev
    },
  }

  /* ---------- silence：留白 ----------
     不是数字的死寂：极低的房间底噪（粉红噪声低通 300 Hz）与一丝几乎听不见的低频。 */
  TRACKS.silence = {
    space: 'hall', gain: 1,
    init(T) { T.channel('room', { gain: 0.12, wet: 0.1 }) },
    begin(T, t) {
      T.persist.push(T.E.drone(T.ch.room, t, [{ f: 55, gain: 0.04 }], { lp: 300, attack: 3, rate: 0.03, depth: 0.4, noise: { f: 180, q: 0.5, gain: 0.6 } }))
    },
  }

  /* ======================================================
     §6 音效
     每个函数 (E, t, p) → 存活秒数；p = { vol, pitch, pan }
     ====================================================== */
  const SFX = {
    // 极短、很轻的高频：D 小调五声音阶里随机一个高音，像玻璃上的一点光
    hover(E, t, p) {
      const k = E.kit(t, 0.2, { gain: 0.05 * p.vol, pan: clamp(p.pan + (Math.random() - 0.5) * 0.5, -1, 1), hall: 0.25 })
      const f = [2349, 2794, 3136, 3520][(Math.random() * 4) | 0] * p.pitch
      const g = k.G(0); g.connect(k.o)
      k.env(g.gain, t, [[0, 0], [0.003, 1], [0.09, 0.0001, 'e']])
      k.osc('sine', f, t, t + 0.1, g)
      const g2 = k.G(0); g2.connect(k.o)
      k.env(g2.gain, t, [[0, 0], [0.002, 0.22], [0.035, 0.0001, 'e']])
      k.osc('sine', f * 2.76, t, t + 0.05, g2)
      return 0.2
    },
    // 怀表的咔哒 + 一点低频的「实」
    click(E, t, p) {
      const k = E.kit(t, 0.25, { gain: 0.3 * p.vol, pan: p.pan, hall: 0.1 })
      k.src('click', t, null, k.o, { rate: p.pitch * (0.96 + Math.random() * 0.08) })
      return 0.25
    },
    // 钟摆：嘀、嗒交替
    tick(E, t, p) {
      const k = E.kit(t, 0.6, { gain: 0.5 * p.vol, pan: p.pan, hall: 0.35 })
      E._tk = !E._tk
      k.src(E._tk ? 'tick' : 'tock', t, null, k.o, { rate: p.pitch })
      return 0.6
    },
    // 落地钟一声：D3 的钟簧，深沉、带泛音
    chime(E, t, p) {
      const k = E.kit(t, 9.5, { gain: 0.55 * p.vol, pan: p.pan, hall: 0.25, abyss: 0.2 })
      k.src('gong', t, null, k.o, { rate: p.pitch })
      return 9.5
    },
    // 17:00 五声报时，间隔 1.6 秒，最后一声余音很长（更多深渊混响 + 低频的嗡声托着）
    chimes5(E, t, p) {
      const k = E.kit(t, 16, { gain: 0.5 * p.vol, hall: 0.2 })
      const tail = E.G(0.55 * p.vol)
      tail.connect(E.abyssIn)
      for (let i = 0; i < 5; i++) {
        const last = i === 4
        const g = k.G(last ? 1.1 : 0.88 + i * 0.03); g.connect(k.o)
        if (last) g.connect(tail)
        k.src('gong', t + i * 1.6, null, g, { rate: p.pitch })
      }
      const hum = k.G(0); hum.connect(k.o)
      k.env(hum.gain, t, [[6.2, 0, 's'], [7.5, 0.12], [13, 0.0001, 'e']])
      k.osc('sine', 73.42 * p.pitch, t + 6.2, t + 13.2, hum)
      E.later(t + 16, () => tail.disconnect())
      return 16
    },
    // 发现尸体：D6 → Eb6（小二度上行）→ A5（三全音坠落）的刺耳三连，第三声带低音冲击与管弦重击
    discover(E, t, p) {
      const k = E.kit(t, 6, { gain: 0.24 * p.vol, hall: 0.25, abyss: 0.3 })
      E.duck(0.75, t, 1.8, 1.6)
      const sh = k.shaper(2.5), bp = k.flt('bandpass', 2300, 0.7), body = k.flt('lowpass', 5200, 0.7)
      sh.connect(bp); bp.connect(k.o); sh.connect(body)
      const bg = k.G(0.35); body.connect(bg); bg.connect(k.o)
      const notes = [1174.7, 1244.5, 880], times = [0, 0.14, 0.28], lens = [0.12, 0.12, 0.8]
      for (let i = 0; i < 3; i++) {
        const f = notes[i] * p.pitch, t0 = t + times[i], len = lens[i]
        const g = k.G(0); g.connect(sh)
        k.env(g.gain, t0, [[0, 0], [0.004, 0.5], [len * 0.5, 0.32], [len, 0.0001, 'e']])
        k.osc('sawtooth', f, t0, t0 + len + 0.02, g)
        k.osc('sawtooth', f * 1.006, t0, t0 + len + 0.02, g)
        k.osc('square', f / 2, t0, t0 + len + 0.02, g)
      }
      const ti = t + 0.28
      // 低音冲击
      const sg = k.G(0); sg.connect(k.o)
      k.env(sg.gain, ti, [[0, 0], [0.006, 1.1], [1.1, 0.0001, 'e']])
      k.osc('sine', 120 * p.pitch, ti, ti + 1.2, sg).frequency.exponentialRampToValueAtTime(30 * p.pitch, ti + 0.7)
      const nl = k.flt('lowpass', 1400, 0.7), ng = k.G(0); ng.connect(nl); nl.connect(k.o)
      k.env(ng.gain, ti, [[0, 0], [0.003, 1.2], [0.4, 0.0001, 'e']])
      k.src('noise', ti, ti + 0.45, ng)
      // 管弦重击：D 小调上叠一个 Eb 的不协和
      const hl = k.flt('lowpass', 2600, 0.8), hg = k.G(0); hl.connect(hg); hg.connect(k.o)
      k.env(hg.gain, ti, [[0, 0], [0.005, 0.22], [0.7, 0.0001, 'e']])
      for (const m of [38, 45, 50, 51, 57, 62]) {
        k.osc('sawtooth', mtof(m) * p.pitch, ti, ti + 0.75, hl).detune.value = (Math.random() - 0.5) * 14
      }
      // 余音：高处的一线
      const rg = k.G(0); rg.connect(k.o)
      k.env(rg.gain, ti, [[0.05, 0, 's'], [0.15, 0.08], [3.5, 0.0001, 'e']])
      const ro = k.osc('sine', 1760 * p.pitch, ti, ti + 3.6, rg)
      E.vib.connect(ro.detune)
      E.later(ti + 3.7, () => { try { E.vib.disconnect(ro.detune) } catch (e) { /* */ } })
      return 6
    },
    // 纸牌翻转：一声向上扫的「唰」+ 牌边落定的轻响
    flip(E, t, p) {
      const k = E.kit(t, 0.4, { gain: 0.5 * p.vol, pan: p.pan, hall: 0.12 })
      const bp = k.flt('bandpass', 1200, 1.6); bp.connect(k.o)
      bp.frequency.setValueAtTime(900 * p.pitch, t)
      bp.frequency.exponentialRampToValueAtTime(5200 * p.pitch, t + 0.07)
      const g = k.G(0); g.connect(bp)
      k.env(g.gain, t, [[0, 0], [0.012, 1.4], [0.09, 0.0001, 'e']])
      k.src('noise', t, t + 0.12, g)
      const hp = k.flt('highpass', 3500, 0.7), c = k.G(0); hp.connect(c); c.connect(k.o)
      k.env(c.gain, t, [[0.065, 0, 's'], [0.067, 1.2], [0.085, 0.0001, 'e']])
      k.src('noise', t + 0.06, t + 0.1, hp)
      return 0.4
    },
    // 发牌：纸张滑过呢面（带颗粒的摩擦）+ 落桌
    card(E, t, p) {
      const k = E.kit(t, 0.5, { gain: 0.45 * p.vol, pan: p.pan, hall: 0.1 })
      const bp = k.flt('bandpass', 3000, 0.9); bp.connect(k.o)
      bp.frequency.setValueAtTime(3800 * p.pitch, t)
      bp.frequency.exponentialRampToValueAtTime(1100 * p.pitch, t + 0.2)
      const g = k.G(0); g.connect(bp)
      k.env(g.gain, t, [[0, 0], [0.03, 1.1], [0.16, 0.7], [0.22, 0.0001, 'e']])
      const am = k.G(0.3); am.connect(g.gain)
      k.osc('square', 43 + Math.random() * 12, t, t + 0.24, am)
      k.src('noise', t, t + 0.25, g)
      const tg = k.G(0); tg.connect(k.o)
      k.env(tg.gain, t, [[0.19, 0, 's'], [0.193, 0.5], [0.25, 0.0001, 'e']])
      k.osc('sine', 230 * p.pitch, t + 0.19, t + 0.26, tg).frequency.exponentialRampToValueAtTime(120, t + 0.24)
      return 0.5
    },
    coin(E, t, p) {
      const k = E.kit(t, 1.4, { gain: 0.42 * p.vol, pan: clamp(p.pan + (Math.random() - 0.5) * 0.3, -1, 1), hall: 0.3 })
      k.src('coin:' + ((Math.random() * 3) | 0), t, null, k.o, { rate: p.pitch * (0.96 + Math.random() * 0.08) })
      return 1.4
    },
    // 一串金币：越落越密，最后几枚在桌上打转
    coins(E, t, p) {
      const n = 8 + ((Math.random() * 6) | 0)
      const k = E.kit(t, 3.5, { gain: 0.34 * p.vol, pan: p.pan, hall: 0.3 })
      let tt = t
      for (let i = 0; i < n; i++) {
        const pn = k.pan((Math.random() - 0.5) * 0.9); pn.connect(k.o)
        const g = k.G(0.45 + Math.random() * 0.5); g.connect(pn)
        k.src('coin:' + (i % 3), tt, null, g, { rate: p.pitch * (0.88 + Math.random() * 0.24) })
        tt += 0.035 + Math.random() * 0.09 * (1 - (i / n) * 0.6)
      }
      const bp = k.flt('bandpass', 5200, 2), cg = k.G(0); bp.connect(cg); cg.connect(k.o)
      k.env(cg.gain, tt, [[0, 0], [0.02, 0.25], [0.5, 0.0001, 'e']])
      k.src('noise', tt, tt + 0.55, bp)
      return tt - t + 1.6
    },
    // 投票落定：低频重击 + 木与纸的冲击 + 木质共鸣
    stamp(E, t, p) {
      const k = E.kit(t, 2.6, { gain: 0.7 * p.vol, pan: p.pan, hall: 0.2, abyss: 0.12 })
      E.duck(0.5, t, 0.35, 0.8)
      const g = k.G(0); g.connect(k.o)
      k.env(g.gain, t, [[0, 0], [0.004, 1], [0.5, 0.0001, 'e']])
      k.osc('sine', 95 * p.pitch, t, t + 0.6, g).frequency.exponentialRampToValueAtTime(38 * p.pitch, t + 0.25)
      const lp = k.flt('lowpass', 1600, 0.7), gn = k.G(0); gn.connect(lp); lp.connect(k.o)
      k.env(gn.gain, t, [[0, 0], [0.002, 1.4], [0.12, 0.0001, 'e']])
      k.src('noise', t, t + 0.15, gn)
      k.src('knock', t, null, k.o, { rate: 0.8 * p.pitch, gain: 0.8 })
      return 2.6
    },
    // 红线射出：带通噪声从 380 Hz 扫到 5 kHz、声像从左到右，尾部一记小击
    vote(E, t, p) {
      const k = E.kit(t, 1, { gain: 0.5 * p.vol, hall: 0.2 })
      const pn = k.pan(-0.6); pn.connect(k.o)
      if (pn.pan) { pn.pan.setValueAtTime(-0.6 + p.pan * 0.4, t); pn.pan.linearRampToValueAtTime(0.6 + p.pan * 0.4, t + 0.24) }
      const bp = k.flt('bandpass', 500, 2.2); bp.connect(pn)
      bp.frequency.setValueAtTime(380 * p.pitch, t)
      bp.frequency.exponentialRampToValueAtTime(5200 * p.pitch, t + 0.22)
      const g = k.G(0); g.connect(bp)
      k.env(g.gain, t, [[0, 0], [0.18, 2.2], [0.235, 0.0001, 'e']])
      k.src('noise', t, t + 0.26, g)
      const g2 = k.G(0); g2.connect(k.o)
      k.env(g2.gain, t, [[0.22, 0, 's'], [0.222, 0.35], [0.3, 0.0001, 'e']])
      k.osc('triangle', 2600 * p.pitch, t + 0.22, t + 0.32, g2)
      k.src('click', t + 0.22, null, k.o, { gain: 0.6 })
      return 1
    },
    // 斜切转场的刃声：气流 + 金属的「锵」+ 一点低频身体
    slash(E, t, p) {
      const k = E.kit(t, 1.6, { gain: 0.4 * p.vol, hall: 0.25 })
      const pn = k.pan(-0.7); pn.connect(k.o)
      if (pn.pan) { pn.pan.setValueAtTime(-0.7, t); pn.pan.linearRampToValueAtTime(0.7, t + 0.3) }
      const bp = k.flt('bandpass', 1800, 1.2); bp.connect(pn)
      bp.frequency.setValueAtTime(1800 * p.pitch, t)
      bp.frequency.exponentialRampToValueAtTime(7000 * p.pitch, t + 0.25)
      const g = k.G(0); g.connect(bp)
      k.env(g.gain, t, [[0, 0], [0.05, 1.6], [0.28, 0.0001, 'e']])
      k.src('noise', t, t + 0.3, g)
      const rg = k.G(0); rg.connect(pn)
      k.env(rg.gain, t, [[0.05, 0, 's'], [0.06, 0.16], [0.9, 0.0001, 'e']])
      for (const f of [3150, 4730, 6320]) {
        const o = k.osc('sine', f * p.pitch, t + 0.05, t + 0.95, rg)
        o.frequency.exponentialRampToValueAtTime(f * p.pitch * 0.97, t + 0.6)
      }
      const lp = k.flt('lowpass', 500, 0.7), lg = k.G(0); lg.connect(lp); lp.connect(k.o)
      k.env(lg.gain, t, [[0, 0], [0.04, 1], [0.2, 0.0001, 'e']])
      k.src('pink', t, t + 0.22, lg)
      return 1.6
    },
    // 数字故障：方波与降采样噪声的碎片，经过阶梯量化
    glitch(E, t, p) {
      const k = E.kit(t, 0.7, { gain: 0.2 * p.vol, pan: p.pan, hall: 0.05 })
      const cr = k.shaper('crush'); cr.connect(k.o)
      let tt = t
      const n = 7 + ((Math.random() * 5) | 0)
      for (let i = 0; i < n; i++) {
        const len = 0.018 + Math.random() * 0.035, kind = Math.random(), v = 0.5 + Math.random() * 0.5
        if (kind < 0.8) {
          const g = k.G(0); g.connect(cr)
          k.env(g.gain, tt, [[0, 0], [0.001, v], [len - 0.001, v], [len, 0]])
          if (kind < 0.45) k.osc('square', (80 + Math.random() * 1800) * p.pitch, tt, tt + len + 0.01, g)
          else k.src('noise', tt, tt + len + 0.01, g, { rate: 0.2 + Math.random() * 0.8 })
        }
        tt += len + (Math.random() < 0.3 ? 0.02 : 0)
      }
      return 0.7
    },
    // 两拍心跳：lub–dub
    heartbeat(E, t, p) {
      const k = E.kit(t, 1.2, { gain: 0.85 * p.vol, pan: p.pan, hall: 0.08 })
      for (const [dt, a] of [[0, 1], [0.24, 0.7]]) {
        const t0 = t + dt
        const g = k.G(0); g.connect(k.o)
        k.env(g.gain, t0, [[0, 0], [0.008, a], [0.2, 0.0001, 'e']])
        k.osc('sine', 62 * p.pitch, t0, t0 + 0.25, g).frequency.exponentialRampToValueAtTime(40 * p.pitch, t0 + 0.14)
        const g2 = k.G(0); g2.connect(k.o)
        k.env(g2.gain, t0, [[0, 0], [0.006, a * 0.35], [0.09, 0.0001, 'e']])
        k.osc('sine', 124 * p.pitch, t0, t0 + 0.12, g2)
        const lp = k.flt('lowpass', 180, 0.7), gn = k.G(0); gn.connect(lp); lp.connect(k.o)
        k.env(gn.gain, t0, [[0, 0], [0.005, a * 1.2], [0.08, 0.0001, 'e']])
        k.src('noise', t0, t0 + 0.1, gn)
      }
      return 1.2
    },
    // 门被强行闭合：风压 → 轰然一声（低频 + 木裂 + 宽带）→ 门框的回弹 → 门闩落下
    door(E, t, p) {
      const k = E.kit(t, 6.5, { gain: 0.75 * p.vol, pan: p.pan, hall: 0.15, abyss: 0.35 })
      E.duck(0.65, t + 0.1, 0.8, 1.6)
      const wl = k.flt('lowpass', 700, 0.7), wg = k.G(0); wg.connect(wl); wl.connect(k.o)
      k.env(wg.gain, t, [[0, 0], [0.1, 0.7], [0.14, 0.0001, 'e']])
      k.src('pink', t, t + 0.16, wg)
      const ti = t + 0.12
      const sg = k.G(0); sg.connect(k.o)
      k.env(sg.gain, ti, [[0, 0], [0.005, 1], [1.3, 0.0001, 'e']])
      k.osc('sine', 72 * p.pitch, ti, ti + 1.4, sg).frequency.exponentialRampToValueAtTime(34 * p.pitch, ti + 0.5)
      const cb = k.flt('bandpass', 900, 0.9), cg = k.G(0); cg.connect(cb); cb.connect(k.o)
      k.env(cg.gain, ti, [[0, 0], [0.002, 1.6], [0.25, 0.0001, 'e']])
      k.src('noise', ti, ti + 0.3, cg)
      const bl = k.flt('lowpass', 2500, 0.7), bg = k.G(0); bg.connect(bl); bl.connect(k.o)
      k.env(bg.gain, ti, [[0, 0], [0.003, 1.2], [0.4, 0.0001, 'e']])
      k.src('noise', ti, ti + 0.45, bg)
      for (const [dt, a] of [[0.07, 0.5], [0.13, 0.3], [0.2, 0.15]]) k.src('knock', ti + dt, null, k.o, { rate: 0.6 * p.pitch, gain: a })
      k.src('metal:0', ti + 0.16, null, k.o, { rate: 1.6 * p.pitch, gain: 0.22 })
      k.src('click', ti + 0.17, null, k.o, { rate: 0.7, gain: 0.5 })
      return 6.5
    },
    // 处刑：不协和的三支锯齿从高处滑落、越来越脏 → 重击（低频 + 宽带 + 低沉的钟簧与金属）→ 漫长的余响
    execute(E, t, p) {
      const k = E.kit(t, 10, { gain: 0.3 * p.vol, pan: p.pan, hall: 0.2, abyss: 0.4 })
      const fall = 2.2
      E.duck(0.85, t, fall + 1.5, 3)
      const sh = k.shaper(3), lp = k.flt('lowpass', 4000, 2); sh.connect(lp); lp.connect(k.o)
      lp.frequency.setValueAtTime(4200, t)
      lp.frequency.exponentialRampToValueAtTime(180, t + fall)
      const g = k.G(0); g.connect(sh)
      k.env(g.gain, t, [[0, 0], [0.4, 0.2], [fall * 0.85, 0.32], [fall, 0.05]])
      for (const f0 of [440, 466.2, 311.1]) {
        k.osc('sawtooth', f0 * p.pitch, t, t + fall + 0.05, g).frequency.exponentialRampToValueAtTime(f0 * p.pitch / 9, t + fall)
      }
      const ti = t + fall
      const sg = k.G(0); sg.connect(k.o)
      k.env(sg.gain, ti, [[0, 0], [0.004, 1.1], [1.8, 0.0001, 'e']])
      k.osc('sine', 85 * p.pitch, ti, ti + 1.9, sg).frequency.exponentialRampToValueAtTime(28 * p.pitch, ti + 0.4)
      const nl = k.flt('lowpass', 1800, 0.7), ng = k.G(0); ng.connect(nl); nl.connect(k.o)
      k.env(ng.gain, ti, [[0, 0], [0.003, 1.3], [0.6, 0.0001, 'e']])
      k.src('noise', ti, ti + 0.7, ng)
      k.src('metal:2', ti, null, k.o, { rate: 0.5 * p.pitch, gain: 0.6 })
      k.src('gong', ti, null, k.o, { rate: 0.5 * p.pitch, gain: 0.35 })
      const hg = k.G(0); hg.connect(k.o)
      k.env(hg.gain, ti, [[0, 0], [0.3, 0.22], [5.5, 0.0001, 'e']])
      k.osc('sine', 36.71 * p.pitch, ti, ti + 5.6, hg)
      return 10
    },
    // 错误：G3 与 G#3 的方波 / 锯齿打架，两下
    wrong(E, t, p) {
      const k = E.kit(t, 0.9, { gain: 0.24 * p.vol, pan: p.pan, hall: 0.1 })
      const lp = k.flt('lowpass', 1400, 1); lp.connect(k.o)
      for (const [dt, len] of [[0, 0.11], [0.15, 0.32]]) {
        const t0 = t + dt, g = k.G(0); g.connect(lp)
        k.env(g.gain, t0, [[0, 0], [0.006, 0.6], [len - 0.03, 0.5], [len, 0.0001, 'e']])
        k.osc('square', 196 * p.pitch, t0, t0 + len + 0.02, g)
        k.osc('sawtooth', 207.7 * p.pitch, t0, t0 + len + 0.02, g)
      }
      return 0.9
    },
    // 正确：音乐盒的 A5–D6–A6 上行 + 高处一线光
    correct(E, t, p) {
      const k = E.kit(t, 2.6, { gain: 0.3 * p.vol, pan: p.pan, hall: 0.35 })
      const sh = 12 * Math.log2(p.pitch)
      ;[[0, 81], [0.08, 86], [0.16, 93]].forEach(([dt, m], i) => E.note(k.o, 'mbox', m + sh, t + dt, 0.55 + i * 0.1, { force: true }))
      E.glass(k.o, 105 + sh, t + 0.16, 0.08, 1.6)
      return 2.6
    },
    // 打字机一下：极轻、可高频调用
    type(E, t, p) {
      const k = E.kit(t, 0.15, { gain: 0.16 * p.vol, pan: clamp(p.pan + (Math.random() - 0.5) * 0.3, -1, 1), hall: 0.06 })
      k.src('click', t, null, k.o, { rate: (0.75 + Math.random() * 0.5) * p.pitch, gain: 0.7 })
      const bp = k.flt('bandpass', 1800, 2), g = k.G(0); g.connect(bp); bp.connect(k.o)
      k.env(g.gain, t, [[0, 0], [0.001, 0.8], [0.03, 0.0001, 'e']])
      k.src('noise', t, t + 0.035, g)
      return 0.15
    },
    whoosh(E, t, p) {
      const k = E.kit(t, 1.2, { gain: 0.45 * p.vol, hall: 0.2 })
      const pn = k.pan(-0.5); pn.connect(k.o)
      if (pn.pan) { pn.pan.setValueAtTime(-0.5 + p.pan * 0.5, t); pn.pan.linearRampToValueAtTime(0.5 + p.pan * 0.5, t + 0.7) }
      const bp = k.flt('bandpass', 300, 1.1); bp.connect(pn)
      bp.frequency.setValueAtTime(300 * p.pitch, t)
      bp.frequency.exponentialRampToValueAtTime(2400 * p.pitch, t + 0.35)
      bp.frequency.exponentialRampToValueAtTime(600 * p.pitch, t + 0.75)
      const g = k.G(0); g.connect(bp)
      k.env(g.gain, t, [[0, 0], [0.3, 1.6], [0.75, 0.0001, 'e']])
      k.src('pink', t, t + 0.8, g)
      return 1.2
    },
    // 物件落定：一下实的木质闷响 + 一次小回弹
    drop(E, t, p) {
      const k = E.kit(t, 1, { gain: 0.55 * p.vol, pan: p.pan, hall: 0.15 })
      for (const [dt, a] of [[0, 1], [0.085, 0.35]]) {
        const t0 = t + dt, g = k.G(0); g.connect(k.o)
        k.env(g.gain, t0, [[0, 0], [0.003, a], [0.16, 0.0001, 'e']])
        k.osc('sine', 160 * p.pitch, t0, t0 + 0.18, g).frequency.exponentialRampToValueAtTime(70 * p.pitch, t0 + 0.12)
        k.src('knock', t0, null, k.o, { rate: 1.1 * p.pitch, gain: a * 0.5 })
      }
      return 1
    },
    // 敲钟人：钟楼的大钟（A2）
    bell(E, t, p) {
      const k = E.kit(t, 11, { gain: 0.55 * p.vol, pan: p.pan, hall: 0.2, abyss: 0.3 })
      k.src('tbell', t, null, k.o, { rate: p.pitch })
      return 11
    },
    // 全馆陷入黑暗：反向膨胀的噪声戛然而止，总线被拉到 150 Hz 的低通、音乐被压下，再慢慢回来
    dark(E, t, p) {
      const k = E.kit(t, 4.5, { gain: 0.5 * p.vol, pan: p.pan })
      const cut = t + 0.55
      const bp = k.flt('bandpass', 400, 0.6); bp.connect(k.o)
      bp.frequency.setValueAtTime(300, t)
      bp.frequency.exponentialRampToValueAtTime(3500, cut)
      const g = k.G(0); g.connect(bp)
      g.gain.setValueAtTime(0.0001, t)
      g.gain.exponentialRampToValueAtTime(1.4, cut - 0.01)
      g.gain.linearRampToValueAtTime(0, cut)
      k.src('pink', t, cut + 0.02, g)
      E.darken(cut, 1.6, 2.8)
      const sg = k.G(0); sg.connect(k.o)
      k.env(sg.gain, cut, [[0, 0], [0.01, 0.9], [1.5, 0.0001, 'e']])
      k.osc('sine', 55 * p.pitch, cut, cut + 1.6, sg).frequency.exponentialRampToValueAtTime(40 * p.pitch, cut + 1)
      return 4.5
    },
    // 一阵风：左右两路粉红噪声各自游走，再加一缕窄带的呼啸
    wind(E, t, p) {
      const dur = 3.6
      const k = E.kit(t, dur + 0.5, { gain: 0.4 * p.vol, hall: 0.3 })
      for (const side of [-0.7, 0.7]) {
        const pn = k.pan(clamp(side + p.pan * 0.3, -1, 1)); pn.connect(k.o)
        const bp = k.flt('bandpass', 600, 0.9); bp.connect(pn)
        bp.frequency.setValueAtTime((350 + Math.random() * 350) * p.pitch, t)
        for (let i = 1; i <= 4; i++) bp.frequency.linearRampToValueAtTime((300 + Math.random() * 1100) * p.pitch, t + (dur * i) / 4)
        const g = k.G(0); g.connect(bp)
        k.env(g.gain, t, [[0, 0], [1.2 + Math.random() * 0.4, 1.1], [2.4, 0.75], [dur, 0.0001, 'e']])
        k.src('pink', t, t + dur, g, { rate: 0.9 + Math.random() * 0.2 })
      }
      const wb = k.flt('bandpass', 900, 14), wg = k.G(0); wb.connect(wg); wg.connect(k.o)
      wb.frequency.setValueAtTime(700 * p.pitch, t)
      wb.frequency.linearRampToValueAtTime(1100 * p.pitch, t + dur * 0.5)
      wb.frequency.linearRampToValueAtTime(800 * p.pitch, t + dur)
      k.env(wg.gain, t, [[0, 0], [1.5, 0.9], [dur, 0.0001, 'e']])
      k.src('noise', t, t + dur, wb)
      return dur + 0.5
    },
  }
  // [最小间隔秒, 同时最多几个]
  const SFX_RULE = {
    hover: [0.045, 3], type: [0.022, 4], click: [0.03, 3], tick: [0.06, 3], coin: [0.03, 6], coins: [0.15, 2],
    flip: [0.05, 3], card: [0.04, 4], glitch: [0.07, 2], whoosh: [0.08, 3], slash: [0.08, 2], vote: [0.06, 3],
    chimes5: [1, 1], chime: [0.3, 3], discover: [0.5, 1], execute: [1, 1], door: [0.3, 2], dark: [0.8, 1],
    bell: [0.4, 2], heartbeat: [0.25, 2], stamp: [0.12, 2], drop: [0.05, 4], wrong: [0.15, 2], correct: [0.15, 2], wind: [0.5, 2],
  }
  P.sfx = function (name, o) {
    const f = SFX[name]
    if (!f) return
    o = o || {}
    const now = this.ctx.currentTime
    const rule = SFX_RULE[name] || [0.03, 4]
    if (this.sfxLast[name] != null && now - this.sfxLast[name] < rule[0]) return
    if ((this.sfxBusy[name] || 0) >= rule[1]) return
    if (this.voices > MAX_VOICES - 12 && (name === 'hover' || name === 'type')) return
    this.sfxLast[name] = now
    const p = {
      vol: o.volume == null ? 1 : clamp(+o.volume || 0, 0, 2),
      pitch: o.pitch == null ? 1 : clamp(+o.pitch || 1, 0.25, 4),
      pan: clamp(+o.pan || 0, -1, 1),
    }
    const t = now + 0.008 + Math.max(0, +o.delay || 0)
    const life = f(this, t, p) || 1
    if (!this.offline) {
      this.sfxBusy[name] = (this.sfxBusy[name] || 0) + 1
      setTimeout(() => { this.sfxBusy[name]-- }, Math.min(life, 3) * 1000)
    }
  }

  /* ======================================================
     §7 离线渲染（tools/test-audio.mjs 用）
     ====================================================== */
  // 与在线一样分段调度：每 0.25 s 挂起一次渲染，补排下一段，让 onended 回收发声数
  // spec: { track, sfx, opts, seconds, sr, seed, tension, solo: ['通道名'…] }
  function renderOffline(spec) {
    spec = spec || {}
    const sr = spec.sr || 44100, secs = spec.seconds || 8
    const ctx = new OAC(2, Math.ceil(sr * secs), sr)
    const E = new Engine(ctx, { offline: true, seed: spec.seed == null ? 1 : spec.seed, tension: spec.tension || 0 })
    if (spec.track) {
      E.track(spec.track, { fade: spec.fade == null ? 0.05 : spec.fade })
      const T = E.tracks[spec.track]
      if (spec.solo) for (const k in T.ch) if (spec.solo.indexOf(k) < 0) T.ch[k].vol.gain.value = 0
    }
    // 压缩器在渲染开头需要一点时间稳定，音效从 0.6 s 开始
    if (spec.sfx) E.sfx(spec.sfx, Object.assign({ delay: spec.at == null ? 0.6 : spec.at }, spec.opts))
    let maxV = 0
    const STEP = 0.25
    E.pump(STEP + LOOKAHEAD)
    for (let t = STEP; t < secs; t += STEP) {
      ctx.suspend(t).then(() => {
        E.pump(Math.min(secs, ctx.currentTime + STEP + LOOKAHEAD))
        maxV = Math.max(maxV, E.voices)
        ctx.resume()
      })
    }
    return ctx.startRendering().then(buf => ({ buffer: buf, voices: maxV }))
  }

  /* ======================================================
     §8 公开接口
     ====================================================== */
  const store = App.store || { get: (k, d) => d, set() {} }
  const S = {
    E: null,
    started: false,
    muted: !!store.get('muted', false),
    hidden: !!document.hidden,
    hushed: false, // 播放宣传片时整站静音（不改动用户的静音设置）
    pending: null,
    mood: 0,
    st: 0,
    vt: 0,
  }
  function outTarget() { return (S.muted ? 0 : 1) * (S.hidden || S.hushed ? 0 : 1) }
  function rampOut(g, v, dur) {
    const now = S.E.ctx.currentTime
    holdAt(g.gain, now)
    g.gain.linearRampToValueAtTime(v, now + dur)
  }
  function syncSuspend() {
    const E = S.E
    if (!E) return
    E.outV = outTarget()
    clearTimeout(S.st)
    if (E.outV === 0) S.st = setTimeout(() => { if (outTarget() === 0 && E.ctx.state === 'running') quiet(E.ctx.suspend()) }, 450)
    else if (E.ctx.state === 'suspended') quiet(E.ctx.resume())
  }

  const api = {
    start() {
      if (S.started) { syncSuspend(); return }
      if (!AC) return
      S.started = true
      let ctx
      try { ctx = new AC({ latencyHint: 'interactive' }) } catch (e) { try { ctx = new AC() } catch (e2) { return } }
      let E
      try { E = new Engine(ctx, {}) } catch (e) { console.error('[audio]', e); return }
      S.E = E
      E.setMood(S.mood)
      E.tension = S.mood
      if (S.muted) E.mute.gain.value = 0
      if (S.hidden || S.hushed) E.vis.gain.value = 0
      E.run()
      syncSuspend()
      // 在遮幕的五声钟响之后，音乐才缓缓进来（还没有板块点名时，默认是洋馆的日常）
      E.track(S.pending || 'dread', { delay: 2.4, fade: 6 })
      S.pending = null
      const unlock = () => { if (outTarget() && ctx.state === 'suspended') quiet(ctx.resume()) }
      for (const ev of ['pointerdown', 'keydown', 'touchend']) window.addEventListener(ev, unlock, { passive: true })
    },
    track(name) {
      if (typeof name !== 'string' || !TRACKS[name]) return
      if (!S.E) { S.pending = name; return }
      try { S.E.track(name) } catch (e) { console.error('[audio] track', name, e) }
    },
    sfx(name, opts) {
      if (!S.E || S.muted || S.hidden || S.hushed) return
      try { S.E.sfx(name, opts) } catch (e) { console.error('[audio] sfx', name, e) }
    },
    setMood(m) {
      const v = typeof m === 'number' ? m : m && m.tension
      if (v == null || isNaN(+v)) return
      S.mood = clamp(+v, 0, 1)
      if (S.E) S.E.setMood(S.mood)
    },
    setMuted(b) {
      b = !!b
      S.muted = b
      store.set('muted', b)
      if (!S.E) return
      if (!b && S.E.ctx.state === 'suspended') quiet(S.E.ctx.resume())
      rampOut(S.E.mute, b ? 0 : 1, b ? 0.25 : 0.6)
      syncSuspend()
    },
    // 让出声音：放映宣传片时淡出整站音乐与音效，结束后淡回
    hush(b) {
      b = !!b
      if (S.hushed === b) return
      S.hushed = b
      if (!S.E) return
      if (!b && !S.muted && !S.hidden && S.E.ctx.state === 'suspended') quiet(S.E.ctx.resume())
      rampOut(S.E.vis, S.hidden || S.hushed ? 0 : 1, b ? 0.6 : 2.2)
      syncSuspend()
    },
    get hushed() { return S.hushed },
    get muted() { return S.muted },
    set muted(b) { api.setMuted(b) },
    level() { return S.E && !S.muted && !S.hidden && !S.hushed ? S.E.level() : 0 },
    get current() { return S.E ? S.E.current : S.pending },
    get tension() { return S.E ? S.E.tension : S.mood },
    get ready() { return !!S.E },
    get ctx() { return S.E ? S.E.ctx : null },
    // 调试与测试
    _Engine: Engine,
    _DSP: DSP,
    _TRACKS: TRACKS,
    _SFX: SFX,
    _render: renderOffline,
    _state: S,
  }
  App.audio = api

  document.addEventListener('visibilitychange', () => {
    S.hidden = !!document.hidden
    if (!S.E) return
    if (S.hidden) rampOut(S.E.vis, 0, 0.3)
    else if (!S.hushed) {
      if (!S.muted && S.E.ctx.state === 'suspended') quiet(S.E.ctx.resume())
      rampOut(S.E.vis, 1, 0.8)
    }
    syncSuspend()
  })
})()
