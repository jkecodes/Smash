import { create } from 'zustand'
import { useGameStore } from './store'

/**
 * 音效：全部用 Web Audio 即時合成（不需要任何音檔）。
 * 瀏覽器規定要有使用者操作後才能出聲，所以第一次按鍵 / 點擊 / 手把按鍵時才會啟動。
 */
interface AudioStore {
  muted: boolean
  bgmMuted: boolean
  volume: number
  setMuted(m: boolean): void
  setBgmMuted(m: boolean): void
  setVolume(v: number): void
}
const KEY = 'smash.audio'
const load = (): { muted: boolean; bgmMuted: boolean; volume: number } => {
  try { return { muted: false, bgmMuted: false, volume: 0.6, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') } } catch { return { muted: false, bgmMuted: false, volume: 0.6 } }
}
const save = (s: { muted: boolean; bgmMuted: boolean; volume: number }) => { try { localStorage.setItem(KEY, JSON.stringify(s)) } catch { /* ignore */ } }

export const useAudioStore = create<AudioStore>((set, get) => ({
  ...load(),
  setMuted: (muted) => { set({ muted }); save({ muted, bgmMuted: get().bgmMuted, volume: get().volume }); applyVolume() },
  setBgmMuted: (bgmMuted) => { set({ bgmMuted }); save({ muted: get().muted, bgmMuted, volume: get().volume }) },
  setVolume: (volume) => { set({ volume }); save({ muted: get().muted, bgmMuted: get().bgmMuted, volume }); applyVolume() },
}))

let ctx: AudioContext | null = null
let master: GainNode | null = null
let noiseBuf: AudioBuffer | null = null

function applyVolume() {
  if (!master) return
  const { muted, volume } = useAudioStore.getState()
  master.gain.value = muted ? 0 : volume * volume // 感知上較線性
}

function ensure(): AudioContext | null {
  if (typeof window === 'undefined' || !('AudioContext' in window || 'webkitAudioContext' in window)) return null
  if (!ctx) {
    try {
      const AC = (window as any).AudioContext || (window as any).webkitAudioContext
      ctx = new AC() as AudioContext
      master = ctx.createGain()
      const comp = ctx.createDynamicsCompressor() // 避免多音同時爆音
      master.connect(comp); comp.connect(ctx.destination)
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
      const d = noiseBuf.getChannelData(0)
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
      applyVolume()
    } catch { return null }
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

if (typeof window !== 'undefined') {
  const unlock = () => { ensure() }
  window.addEventListener('keydown', unlock)
  window.addEventListener('pointerdown', unlock)
  window.addEventListener('gamepadconnected', unlock)
  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyM' && !e.repeat) { const s = useAudioStore.getState(); s.setMuted(!s.muted) }
    if (e.code === 'KeyB' && !e.repeat) { const s = useAudioStore.getState(); s.setBgmMuted(!s.bgmMuted) }
  })
}

// ---------------------------------------------------------------- 合成積木
function tone(freq: number, dur: number, o: { type?: OscillatorType; gain?: number; to?: number; delay?: number; attack?: number } = {}) {
  const c = ensure(); if (!c || !master) return
  const t = c.currentTime + (o.delay ?? 0)
  const osc = c.createOscillator(); const g = c.createGain()
  osc.type = o.type ?? 'sine'
  osc.frequency.setValueAtTime(freq, t)
  if (o.to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.to), t + dur)
  const peak = o.gain ?? 0.3
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(peak, t + (o.attack ?? 0.004))
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  osc.connect(g); g.connect(master)
  osc.start(t); osc.stop(t + dur + 0.02)
}
function noise(dur: number, o: { type?: BiquadFilterType; from?: number; to?: number; gain?: number; delay?: number; q?: number } = {}) {
  const c = ensure(); if (!c || !master || !noiseBuf) return
  const t = c.currentTime + (o.delay ?? 0)
  const src = c.createBufferSource(); src.buffer = noiseBuf; src.loop = true
  const f = c.createBiquadFilter(); f.type = o.type ?? 'lowpass'
  f.frequency.setValueAtTime(o.from ?? 1200, t)
  if (o.to) f.frequency.exponentialRampToValueAtTime(Math.max(30, o.to), t + dur)
  f.Q.value = o.q ?? 1
  const g = c.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(o.gain ?? 0.3, t + 0.005)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  src.connect(f); f.connect(g); g.connect(master)
  src.start(t); src.stop(t + dur + 0.02)
}

// ---------------------------------------------------------------- 音效表
export type Sfx =
  | 'hit' | 'swing' | 'shoot' | 'boom' | 'jump' | 'land' | 'block' | 'perfect' | 'shieldBreak' | 'dodge'
  | 'ledge' | 'ko' | 'respawn' | 'warp' | 'zone' | 'charge' | 'ultStart' | 'ultReady' | 'ballHit' | 'ballBreak'
  | 'ballSpawn' | 'ui' | 'start' | 'win' | 'pause'

const lastPlayed = new Map<string, number>()
const MIN_GAP: Partial<Record<Sfx, number>> = { hit: 40, swing: 50, shoot: 40, boom: 60, jump: 60, land: 80, charge: 100, zone: 200 }

/** p：0~1 強度（依招式 / 擊飛速度），部分音效用來控制音量或音高 */
export function sfx(name: Sfx, p = 0.5) {
  const now = performance.now()
  if (now - (lastPlayed.get(name) ?? -1e9) < (MIN_GAP[name] ?? 0)) return
  lastPlayed.set(name, now)
  if (useAudioStore.getState().muted) return
  const r = 0.94 + Math.random() * 0.12 // 隨機微調音高，避免聽膩
  switch (name) {
    case 'hit': {
      const s = Math.min(1, Math.max(0.15, p))
      noise(0.08 + s * 0.12, { type: 'lowpass', from: 2400, to: 300, gain: 0.25 + s * 0.35 })
      tone(150 * r - s * 40, 0.12 + s * 0.12, { type: 'square', gain: 0.18 + s * 0.2, to: 50 })
      if (s > 0.6) { tone(70, 0.3, { type: 'sine', gain: 0.4, to: 35 }); noise(0.25, { type: 'lowpass', from: 800, to: 100, gain: 0.3 }) }
      break
    }
    case 'swing': noise(0.12 + p * 0.1, { type: 'bandpass', from: 500 + p * 300, to: 2200 + p * 1200, gain: 0.1 + p * 0.12, q: 0.8 }); break
    case 'shoot': tone(900 * r, 0.14, { type: 'sawtooth', gain: 0.12, to: 220 }); noise(0.05, { type: 'highpass', from: 3000, gain: 0.08 }); break
    case 'boom':
      noise(0.5, { type: 'lowpass', from: 1500, to: 60, gain: 0.5 })
      tone(90, 0.45, { type: 'sine', gain: 0.5, to: 30 })
      break
    case 'jump': tone((p > 0.5 ? 520 : 380) * r, 0.14, { type: 'square', gain: 0.1, to: (p > 0.5 ? 900 : 700) }); break
    case 'land': noise(0.07, { type: 'lowpass', from: 500, to: 120, gain: 0.18 }); break
    case 'block': tone(1200 * r, 0.1, { type: 'triangle', gain: 0.2, to: 700 }); noise(0.05, { type: 'highpass', from: 4000, gain: 0.12 }); break
    case 'perfect': tone(1568, 0.25, { type: 'sine', gain: 0.25 }); tone(2093, 0.3, { type: 'sine', gain: 0.2, delay: 0.05 }); break
    case 'shieldBreak': noise(0.4, { type: 'bandpass', from: 3000, to: 500, gain: 0.35 }); tone(400, 0.4, { type: 'sawtooth', gain: 0.2, to: 80 }); break
    case 'dodge': noise(0.18, { type: 'bandpass', from: 800, to: 3000, gain: 0.12, q: 1.2 }); break
    case 'ledge': tone(700, 0.05, { type: 'square', gain: 0.12 }); tone(1100, 0.07, { type: 'square', gain: 0.1, delay: 0.05 }); break
    case 'ko':
      noise(0.9, { type: 'lowpass', from: 2500, to: 80, gain: 0.5 })
      tone(220, 0.9, { type: 'sawtooth', gain: 0.25, to: 40 })
      tone(60, 0.9, { type: 'sine', gain: 0.5, to: 30 })
      break
    case 'respawn': tone(330, 0.12, { type: 'triangle', gain: 0.2 }); tone(495, 0.12, { type: 'triangle', gain: 0.2, delay: 0.1 }); tone(660, 0.2, { type: 'triangle', gain: 0.2, delay: 0.2 }); break
    case 'warp': tone(1400, 0.18, { type: 'sine', gain: 0.18, to: 200 }); noise(0.15, { type: 'highpass', from: 2500, gain: 0.1 }); break
    case 'zone': tone(180, 0.35, { type: 'sine', gain: 0.18, to: 360 }); break
    case 'charge': tone(220 + p * 700, 0.1, { type: 'sine', gain: 0.1 + p * 0.1 }); break
    case 'ultStart':
      tone(120, 0.7, { type: 'sawtooth', gain: 0.3, to: 480 }); tone(240, 0.7, { type: 'square', gain: 0.12, to: 960 })
      noise(0.7, { type: 'bandpass', from: 300, to: 3500, gain: 0.2 })
      break
    case 'ultReady': [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, { type: 'triangle', gain: 0.22, delay: i * 0.07 })); break
    case 'ballHit': tone(1318 * r, 0.12, { type: 'triangle', gain: 0.22 }); tone(1760 * r, 0.14, { type: 'triangle', gain: 0.16, delay: 0.04 }); break
    case 'ballBreak':
      noise(0.5, { type: 'lowpass', from: 3500, to: 200, gain: 0.4 })
      ;[392, 523, 659, 784, 1047].forEach((f, i) => tone(f, 0.3, { type: 'square', gain: 0.14, delay: i * 0.06 }))
      break
    case 'ballSpawn': tone(880, 0.25, { type: 'sine', gain: 0.18, to: 1760 }); break
    case 'ui': tone(660, 0.06, { type: 'square', gain: 0.1 }); break
    case 'pause': tone(440, 0.07, { type: 'triangle', gain: 0.15 }); tone(330, 0.1, { type: 'triangle', gain: 0.12, delay: 0.06 }); break
    case 'start': [392, 523, 784].forEach((f, i) => tone(f, 0.18, { type: 'square', gain: 0.13, delay: i * 0.09 })); break
    case 'win': [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, 0.25, { type: 'triangle', gain: 0.22, delay: i * 0.12 })); break
  }
}

// 流程音效：開始 / 結束 / 暫停
useGameStore.subscribe((s, prev) => {
  if (s.phase !== prev.phase) {
    if (s.phase === 'playing') sfx('start')
    else if (s.phase === 'ended') sfx('win')
  }
  if (s.paused !== prev.paused) sfx('pause')
})

// ---------------------------------------------------------------- 程序化背景音樂（Web Audio 即時合成 BGM）
const MENU_BASS = [110, 87.31, 130.81, 98] // A2, F2, C3, G2
const MENU_ARP = [220, 261.63, 329.63, 392, 329.63, 261.63, 246.94, 196]
const BATTLE_BASS = [82.41, 65.41, 73.42, 61.74] // E2, C2, D2, B1
const BATTLE_MELODY = [
  329.63, 0, 392, 440, 493.88, 0, 392, 329.63,
  293.66, 329.63, 392, 0, 440, 392, 329.63, 246.94,
]

let bgmStep = 0
if (typeof window !== 'undefined') {
  setInterval(() => {
    if (!ctx || ctx.state !== 'running') return
    const { muted, bgmMuted } = useAudioStore.getState()
    if (muted || bgmMuted) return
    const gs = useGameStore.getState()
    if (gs.paused || gs.phase === 'ended') return

    const step = bgmStep++
    if (gs.phase === 'menu') {
      if (step % 2 !== 0) return
      const s = Math.floor(step / 2)
      const root = MENU_BASS[Math.floor(s / 8) % MENU_BASS.length]
      if (s % 4 === 0) tone(root, 0.45, { type: 'triangle', gain: 0.055, attack: 0.02 })
      const arp = MENU_ARP[s % MENU_ARP.length]
      tone(arp, 0.2, { type: 'sine', gain: 0.035, attack: 0.01 })
    } else if (gs.phase === 'playing') {
      const bar = Math.floor(step / 16) % BATTLE_BASS.length
      const root = BATTLE_BASS[bar]
      const bassNote = step % 2 === 0 ? root : root * 2
      tone(bassNote, 0.11, { type: 'triangle', gain: 0.065, attack: 0.005 })

      const mel = BATTLE_MELODY[step % BATTLE_MELODY.length]
      if (mel > 0) {
        tone(mel, 0.14, { type: 'triangle', gain: 0.05, attack: 0.006 })
        const climax = gs.fighters.p1.ultReady || gs.fighters.p2.ultReady || gs.fighters.p1.stocks === 1 || gs.fighters.p2.stocks === 1
        if (climax) tone(mel * 2, 0.12, { type: 'sine', gain: 0.03, attack: 0.006 })
      }
      if (step % 4 === 2) {
        noise(0.03, { type: 'highpass', from: 6000, gain: 0.02 })
      }
    }
  }, 135)
}
