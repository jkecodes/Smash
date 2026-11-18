import { useEffect, useState } from 'react'
import { pollPause, captureAxis, captureBase, captureButton, clearMap, connectedPadCount, describePad, getPad, loadMap, readMenuPad, saveMap, type PadMap } from '../game/input'
import { CHARACTERS, CHARACTER_IDS } from '../game/characters'
import { clearEntities } from '../game/runtime'
import { useGameStore } from '../game/store'
import { FIGHTER_IDS, type Btn, type FighterId, type UiFighter } from '../game/types'
import { useAudioStore } from '../game/audio'

const damageColor = (d: number) => {
  const t = Math.min(1, d / 200)
  return `rgb(255, ${Math.round(255 - t * 200)}, ${Math.round(255 - t * 230)})`
}
const SLOT_KEYS: Record<FighterId, Record<string, string>> = {
  p1: { attack: 'J', skill1: 'K', skill2: 'L', ult: 'I' },
  p2: { attack: '.', skill1: '/', skill2: "'", ult: ';' },
}

function Card({ id, u }: { id: FighterId; u: UiFighter }) {
  return (
    <div className="w-72 rounded-xl bg-black/55 p-3 text-white backdrop-blur">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-bold tracking-widest" style={{ color: u.color }}>{id.toUpperCase()} · {u.name}</span>
        <span className="font-mono text-[10px] text-white/60">{u.fsm}</span>
      </div>
      <div className="flex items-end justify-between">
        <span className="text-5xl font-black tabular-nums" style={{ color: damageColor(u.damage), textShadow: '0 2px 0 #000' }}>
          {u.damage}<span className="text-2xl">%</span>
        </span>
        <span className="flex gap-1 pb-2">
          {Array.from({ length: Math.max(0, u.stocks) }, (_, i) => (
            <span key={i} className="inline-block h-3.5 w-3.5 rounded-sm" style={{ background: u.color }} />
          ))}
        </span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded bg-white/10" title="能量">
        <div className="h-full" style={{ width: `${u.energy}%`, background: u.energy >= 100 ? '#ffd24d' : '#4dd2ff' }} />
      </div>
      <div className="mt-1 h-1 overflow-hidden rounded bg-white/10" title="護盾">
        <div className="h-full bg-sky-300/80" style={{ width: `${u.shield}%` }} />
      </div>
      <div className="mt-2 flex gap-1.5">
        {u.slots.map((s) => {
          const noEnergy = u.energy < s.cost
          return (
            <div key={s.slot} className={`relative flex-1 overflow-hidden rounded px-1 py-1 text-center ${s.slot === 'ult' && !s.locked ? 'bg-yellow-400/40 ring-1 ring-yellow-300' : 'bg-white/10'} ${noEnergy || s.locked ? 'opacity-40' : ''}`}>
              <div className="text-[10px] leading-tight">{s.name}</div>
              <div className="font-mono text-[10px] text-white/60">[{SLOT_KEYS[id][s.slot]}]{s.cost ? ` ${s.cost}` : ''}{s.locked ? ' 需大招球' : ''}</div>
              <div className="absolute inset-x-0 bottom-0 bg-black/60" style={{ height: `${s.cd * 100}%` }} />
            </div>
          )
        })}
      </div>
      {u.charge > 0 && (
        <div className="mt-1 h-1.5 overflow-hidden rounded bg-white/10">
          <div className="h-full bg-white" style={{ width: `${u.charge * 100}%` }} />
        </div>
      )}
    </div>
  )
}

/** 手把操作選單：左右選角色、A/B/Start 確認；結算畫面按確認再來一場 */
function usePadMenu(active: boolean, onConfirm: () => void) {
  const select = useGameStore((s) => s.select)
  useEffect(() => {
    if (!active) return
    let raf = 0
    const loop = () => {
      for (const id of FIGHTER_IDS) {
        const { dx, confirm } = readMenuPad(id)
        if (dx) {
          const cur = useGameStore.getState().selection[id]
          const i = CHARACTER_IDS.indexOf(cur)
          select(id, CHARACTER_IDS[(i + dx + CHARACTER_IDS.length) % CHARACTER_IDS.length])
        }
        if (confirm) { onConfirm(); return }
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [active])
}
function PadStatus() {
  const [n, setN] = useState(connectedPadCount())
  useEffect(() => { const t = setInterval(() => setN(connectedPadCount()), 500); return () => clearInterval(t) }, [])
  return <div className="text-xs text-emerald-300">{n > 0 ? `🎮 已偵測到 ${n} 支手把（P1=第1支、P2=第2支；按任一手把按鍵啟用）` : '🎮 未偵測到手把（接上後按任一鍵）'}</div>
}

const KIND_LABEL = { xbox: 'Xbox', ps: 'PlayStation', nintendo: 'Nintendo / Joy-Con', generic: '通用手把' } as const
const KIND_KEYS = {
  xbox: 'B 普攻・A 特招・X/Y 跳',
  ps: '○ 普攻・✕ 特招・□/△ 跳',
  nintendo: 'A 普攻・B 特招・X/Y 跳',
  generic: '右鍵 攻擊・下鍵 技能1・左/上鍵 跳',
} as const

type Step = { label: string; kind: 'axisX' | 'axisY' | 'button'; btn?: Btn }
const STEPS: Step[] = [
  { label: '把搖桿「向左」推到底', kind: 'axisX' },
  { label: '把搖桿「向上」推到底', kind: 'axisY' },
  { label: '按下「跳躍」鍵', kind: 'button', btn: 'jump' },
  { label: '按下「攻擊」鍵', kind: 'button', btn: 'attack' },
  { label: '按下「技能1」鍵', kind: 'button', btn: 'skill1' },
  { label: '按下「技能2」鍵（可按住蓄力）', kind: 'button', btn: 'skill2' },
  { label: '按下「大招」鍵', kind: 'button', btn: 'ult' },
  { label: '按下「防禦」鍵', kind: 'button', btn: 'shield' },
]

/** 手把按鍵綁定精靈：適用任何手把（含非標準映射的單支 Joy-Con） */
function PadWizard({ id, onClose }: { id: FighterId; onClose: () => void }) {
  const [step, setStep] = useState(0)
  useEffect(() => {
    if (!getPad(id)) return
    const map: PadMap = { btn: {} }
    let i = 0
    let base = captureBase(id)
    let wait = performance.now() + 400
    let raf = 0
    const loop = () => {
      const st = STEPS[i]
      if (performance.now() > wait) {
        let ok = false
        if (st.kind === 'axisX') { const r = captureAxis(id, base); if (r) { map.ax = r; ok = true } }
        else if (st.kind === 'axisY') { const r = captureAxis(id, base); if (r) { map.ay = r; ok = true } }
        else { const r = captureButton(id, base); if (r !== null) { map.btn![st.btn!] = r; ok = true } }
        if (ok) {
          i++
          if (i >= STEPS.length) { const p = getPad(id); if (p) saveMap(p, map); onClose(); return }
          setStep(i); base = captureBase(id); wait = performance.now() + 450
        }
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [id])
  const pad = getPad(id)
  return (
    <div className="pointer-events-auto absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-black/85 text-white">
      <div className="text-lg font-bold">{id.toUpperCase()} 手把設定 {pad ? '' : '（找不到手把，請先接上並按任一鍵）'}</div>
      <div className="text-3xl font-black text-yellow-300">{STEPS[step].label}</div>
      <div className="text-sm text-white/60">{step + 1} / {STEPS.length}</div>
      <div className="flex gap-3">
        <button className="rounded bg-white/20 px-4 py-1 text-sm" onClick={onClose}>取消</button>
        <button className="rounded bg-red-500/70 px-4 py-1 text-sm" onClick={() => { const p = getPad(id); if (p) clearMap(p); onClose() }}>還原預設配置</button>
      </div>
    </div>
  )
}

/** 拖曳 .glb / .gltf 到這裡即可替換該玩家的角色模型 */
function ModelDrop({ id }: { id: FighterId }) {
  const m = useGameStore((s) => s.playerModel[id])
  const set = useGameStore((s) => s.setPlayerModel)
  const [over, setOver] = useState(false)
  const accept = (f?: File) => { if (f && /\.(glb|gltf)$/i.test(f.name)) set(id, f) }
  return (
    <label
      onDragOver={(e) => { e.preventDefault(); setOver(true) }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); accept(e.dataTransfer.files[0]) }}
      className={`mt-2 block cursor-pointer rounded border border-dashed px-2 py-2 text-center text-[11px] ${over ? 'border-yellow-300 bg-yellow-300/20' : 'border-white/30'}`}
    >
      <input type="file" accept=".glb,.gltf" className="hidden" onChange={(e) => accept(e.target.files?.[0])} />
      {m ? <>🧊 {m.name} <button type="button" className="ml-1 underline" onClick={(e) => { e.preventDefault(); set(id, null) }}>移除</button></> : '拖曳 .glb 模型到這裡（或點擊選檔）'}
    </label>
  )
}

function PadInfo({ id, onSetup }: { id: FighterId; onSetup: () => void }) {
  const [, tick] = useState(0)
  useEffect(() => { const t = setInterval(() => tick((n) => n + 1), 700); return () => clearInterval(t) }, [])
  const d = describePad(id)
  return (
    <div className="mt-2 text-[11px] leading-snug text-white/70">
      {d ? (
        <>
          <div className="text-emerald-300">🎮 {d.name}（{KIND_LABEL[d.kind]}）</div>
          <div>{d.custom ? '已使用自訂綁定' : d.standard ? KIND_KEYS[d.kind] : '⚠ 非標準映射，建議先「設定手把」'}</div>
          <button onClick={onSetup} className="mt-1 rounded bg-white/15 px-2 py-0.5 hover:bg-white/25">設定手把</button>
        </>
      ) : <div>未連接手把（鍵盤可用）</div>}
    </div>
  )
}

const CPU_LABEL = ['玩家', 'CPU 1', 'CPU 2', 'CPU 3'] as const
function CpuPicker({ id }: { id: FighterId }) {
  const lv = useGameStore((s) => s.cpu[id])
  const setCpu = useGameStore((s) => s.setCpu)
  return (
    <div className="mt-2 flex gap-1">
      {CPU_LABEL.map((l, i) => (
        <button key={l} onClick={() => setCpu(id, i as 0 | 1 | 2 | 3)}
          className={`flex-1 rounded px-1 py-1 text-[11px] font-bold ${lv === i ? 'bg-yellow-300 text-black' : 'bg-white/15 text-white/70'}`}>{l}</button>
      ))}
    </div>
  )
}

function Menu() {
  const [wizard, setWizard] = useState<FighterId | null>(null)
  usePadMenu(wizard === null, () => { clearEntities(); useGameStore.getState().startMatch() })
  const selection = useGameStore((s) => s.selection)
  const select = useGameStore((s) => s.select)
  const start = useGameStore((s) => s.startMatch)
  return (
    <div className="pointer-events-auto absolute inset-0 flex flex-col items-center justify-center gap-6 bg-black/70 text-white">
      <h1 className="text-7xl font-black italic tracking-tight">smash<span className="text-yellow-300">!!!</span></h1>
      <div className="flex gap-10">
        {FIGHTER_IDS.map((id) => (
          <div key={id} className="w-72 rounded-xl bg-white/10 p-4">
            <div className="mb-2 text-sm font-bold">{id.toUpperCase()}</div>
            <div className="flex flex-wrap gap-1.5">
              {CHARACTER_IDS.map((c) => (
                <button key={c} onClick={() => select(id, c)}
                  className={`rounded px-2 py-1.5 text-xs font-bold ${selection[id] === c ? 'ring-2 ring-white' : 'opacity-60'}`}
                  style={{ background: CHARACTERS[c].color, color: '#001' }}>{CHARACTERS[c].name}</button>
              ))}
            </div>
            <CpuPicker id={id} />
            <ModelDrop id={id} />
            <PadInfo id={id} onSetup={() => setWizard(id)} />
          </div>
        ))}
      </div>
      {wizard && <PadWizard id={wizard} onClose={() => setWizard(null)} />}
      <button onClick={() => { clearEntities(); start() }} className="rounded-lg bg-yellow-300 px-10 py-3 text-xl font-black text-black hover:bg-yellow-200">START</button>
      <div className="grid grid-cols-2 gap-x-12 text-xs text-white/70">
        <div>P1　A/D 移動　W/Space 跳　S 快速下墜　Shift 防禦<br />J 攻擊　K 技能1　L 技能2　I 大招</div>
        <div>P2　←/→ 移動　↑/Enter 跳　↓ 快速下墜　右Shift 防禦<br />. 攻擊　/ 技能1　' 技能2　; 大招　（亦支援手把）</div>
      </div>
      <PadStatus />
      <div className="max-w-3xl text-center text-xs leading-relaxed text-white/60">
        手把（大亂鬥配置，以按鍵位置為準）：左搖桿移動／上推跳躍・右側鍵（Xbox B）普攻・下側鍵（Xbox A）特招・右搖桿 技能2（按住蓄力）・X/Y 跳躍・LB/RB/LT 防禦<br />搖桿方向（左右/上/下）＋普攻或特招＝不同招式；防禦＋左右＝翻滾、防禦＋下＝原地閃避、空中按防禦＝空中閃避；站在層板上向下推＝穿下去；暫停：Esc / P / 手把 Start；普攻＋特招同按並按住＝蓄力重擊；持有大招資格時按特招＝大招<br />
        選單：左右選角色・A/B/Start 開始
      </div>
      <div className="text-xs text-yellow-200/80">場上會飄出「大招球」：打破它的人獲得一次大招（被擊倒會失去）· 測試：按 U 雙方立即獲得大招 · 靠近平台邊緣自動抓邊（按住下不抓）</div>
      <div className="text-xs text-white/50">H：切換判定框顯示　·　NOVA 蓄力技（技能2）按住蓄力、放開發射</div>
    </div>
  )
}

/** 暫停輸入輪詢（Esc / P / 手把 Start；暫停中手把 A、B 繼續） */
function usePauseControl() {
  useEffect(() => {
    let raf = 0
    const loop = () => {
      const { toggle, confirm } = pollPause()
      const s = useGameStore.getState()
      if (s.phase === 'playing') {
        if (!s.paused && toggle) s.setPaused(true)
        else if (s.paused && (toggle || confirm)) s.setPaused(false)
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])
}

function PauseOverlay() {
  const setPaused = useGameStore((s) => s.setPaused)
  const start = useGameStore((s) => s.startMatch)
  const toMenu = useGameStore((s) => s.toMenu)
  return (
    <div className="pointer-events-auto absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-black/70 text-white">
      <div className="text-5xl font-black tracking-widest">暫停</div>
      <div className="flex gap-3">
        <button onClick={() => setPaused(false)} className="rounded bg-yellow-300 px-6 py-2 font-bold text-black">繼續</button>
        <button onClick={() => { clearEntities(); start() }} className="rounded bg-white/20 px-6 py-2 font-bold">重新開始</button>
        <button onClick={toMenu} className="rounded bg-white/20 px-6 py-2 font-bold">回選單</button>
      </div>
      <div className="text-xs text-white/60">按 Esc / P / 手把 Start 或 A、B 繼續</div>
    </div>
  )
}

function AudioControl() {
  const muted = useAudioStore((s) => s.muted)
  const volume = useAudioStore((s) => s.volume)
  const setMuted = useAudioStore((s) => s.setMuted)
  const setVolume = useAudioStore((s) => s.setVolume)

  return (
    <div className="flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 text-xs text-white/90 backdrop-blur shadow-md ring-1 ring-white/10 select-none">
      <button
        type="button"
        onClick={() => setMuted(!muted)}
        className="text-sm hover:scale-110 active:scale-95 transition-transform"
        title="切換靜音（亦可按鍵盤 M）"
      >
        {muted || volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊'}
      </button>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={muted ? 0 : volume}
        onChange={(e) => {
          const v = parseFloat(e.target.value)
          setVolume(v)
          if (muted && v > 0) setMuted(false)
        }}
        className="h-1.5 w-20 cursor-pointer accent-yellow-400"
        title={`音量: ${Math.round((muted ? 0 : volume) * 100)}%`}
      />
      <span className="w-8 text-right font-mono text-[11px] text-white/70">
        {muted ? '0%' : `${Math.round(volume * 100)}%`}
      </span>
    </div>
  )
}

export function HUD() {
  usePauseControl()
  const paused = useGameStore((s) => s.paused)
  const ui = useGameStore((s) => s.ui)
  const phase = useGameStore((s) => s.phase)
  const winner = useGameStore((s) => s.winner)
  const start = useGameStore((s) => s.startMatch)
  const toMenu = useGameStore((s) => s.toMenu)
  usePadMenu(phase === 'ended', () => { clearEntities(); start() })
  return (
    <div className="pointer-events-none absolute inset-0">
      <div className="pointer-events-auto absolute top-4 right-4 z-30">
        <AudioControl />
      </div>
      {phase !== 'menu' && (
        <div className="absolute inset-x-0 bottom-4 flex justify-between px-6">
          <Card id="p1" u={ui.p1} />
          <Card id="p2" u={ui.p2} />
        </div>
      )}
      {phase === 'menu' && <Menu />}
      {phase === 'playing' && paused && <PauseOverlay />}
      {phase === 'ended' && winner && (
        <div className="pointer-events-auto absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/60 text-white">
          <div className="text-6xl font-black" style={{ color: ui[winner].color }}>{winner.toUpperCase()} WINS!</div>
          <div className="flex gap-3">
            <button onClick={() => { clearEntities(); start() }} className="rounded bg-yellow-300 px-6 py-2 font-bold text-black">再來一場</button>
            <button onClick={toMenu} className="rounded bg-white/20 px-6 py-2 font-bold">回選單</button>
          </div>
        </div>
      )}
    </div>
  )
}
