import { useEffect, useState } from 'react'
import { pollPause, captureAxis, captureBase, captureButton, clearMap, connectedPadCount, describePad, getPad, loadMap, readMenuPad, saveMap, type PadMap } from '../game/input'
import { CHARACTERS, CHARACTER_IDS } from '../game/characters'
import { clearEntities } from '../game/runtime'
import { resetSimStage } from '../game/sim'
import { STAGES, STAGE_IDS } from '../game/stages'
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
    <div className="relative w-72 rounded-xl bg-black/55 p-3 text-white backdrop-blur">
      {u.combo >= 2 && (
        <div
          className=" -top-8 left-3 absolute animate-bounce rounded-full px-3 py-0.5 text-xs font-black text-black shadow-lg"
          style={{ backgroundColor: u.color }}
        >
          🔥 {u.combo} HIT COMBO!
        </div>
      )}
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
  return (
    <span className={`text-xs ${n > 0 ? 'text-emerald-300 font-medium' : 'text-white/40'}`}>
      {n > 0 ? `🎮 已連接 ${n} 支手把` : '🎮 未連接手把'}
    </span>
  )
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

function StagePicker() {
  const stageId = useGameStore((s) => s.stageId)
  const selectStage = useGameStore((s) => s.selectStage)

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="text-xs font-bold tracking-wider text-white/80">
        🏟️ 選擇對戰場地
      </div>
      <div className="grid grid-cols-4 gap-3">
        {STAGE_IDS.map((id) => {
          const st = STAGES[id]
          const active = stageId === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => selectStage(id)}
              className={`flex flex-col items-start rounded-xl p-2.5 transition-all w-44 text-left border ${active
                  ? 'border-yellow-300 bg-white/20 shadow-lg shadow-yellow-500/10 scale-105 ring-1 ring-yellow-300'
                  : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/30 opacity-75 hover:opacity-100'
                }`}
            >
              <div className="flex w-full items-center justify-between">
                <span className="text-xs font-black text-white">{st.theme.name}</span>
                <span
                  className="rounded px-1.5 py-0.5 text-[9px] font-bold"
                  style={{ backgroundColor: st.theme.accentColor + '33', color: st.theme.accentColor }}
                >
                  {st.theme.tag}
                </span>
              </div>
              <div className="mt-1 text-[10px] text-white/50 leading-tight">
                {st.theme.subtitle}
              </div>
            </button>
          )
        })}
      </div>
      <div className="text-[11px] text-yellow-200/80 text-center max-w-xl">
        {STAGES[stageId].theme.desc}
      </div>
    </div>
  )
}

function HelpModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div
      className="pointer-events-auto absolute inset-0 z-40 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative max-w-2xl w-full rounded-2xl bg-[#141929] border border-white/20 p-6 text-white shadow-2xl space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="text-base font-black tracking-wider flex items-center gap-2">
            <span>📖 操作指南與戰鬥技巧</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg bg-white/10 px-3 py-1 text-xs hover:bg-white/20 transition-colors"
          >
            ✕ 關閉 (Esc)
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3.5 text-xs">
          {/* 鍵盤配置 */}
          <div className="rounded-xl bg-white/5 p-3.5 space-y-2 border border-white/5">
            <div className="font-bold text-yellow-300 flex items-center gap-1.5">
              <span>⌨️</span> 鍵盤按鍵配置
            </div>
            <div className="space-y-2 text-white/85 text-[11px] leading-relaxed">
              <div>
                <span className="text-red-400 font-bold">P1：</span>
                WASD 移動 / 跳躍 (亦可 Space)<br />
                <span className="text-white/60">J</span> 攻擊 · <span className="text-white/60">K</span> 特招 · <span className="text-white/60">L</span> 技能2 · <span className="text-white/60">I</span> 大招<br />
                <span className="text-white/60">LShift</span> 防禦 · <span className="text-white/60">S</span> 快速下墜 / 穿層板
              </div>
              <div className="pt-1.5 border-t border-white/10">
                <span className="text-blue-400 font-bold">P2：</span>
                方向鍵 移動 / 跳躍 (亦可 Enter)<br />
                <span className="text-white/60">.</span> 攻擊 · <span className="text-white/60">/</span> 特招 · <span className="text-white/60">'</span> 技能2 · <span className="text-white/60">;</span> 大招<br />
                <span className="text-white/60">RShift</span> 防禦 · <span className="text-white/60">↓</span> 快速下墜 / 穿層板
              </div>
            </div>
          </div>

          {/* 手把配置 */}
          <div className="rounded-xl bg-white/5 p-3.5 space-y-2 border border-white/5">
            <div className="font-bold text-emerald-300 flex items-center gap-1.5">
              <span>🎮</span> 手把配置（大亂鬥佈局）
            </div>
            <div className="space-y-1 text-white/85 text-[11px] leading-relaxed">
              <div><strong className="text-white/60">左搖桿：</strong>移動 / 上推跳躍 / 下推穿板</div>
              <div><strong className="text-white/60">右側鍵 (Xbox B / PS ○)：</strong>普攻</div>
              <div><strong className="text-white/60">下側鍵 (Xbox A / PS ✕)：</strong>特招（持有大招時為大招）</div>
              <div><strong className="text-white/60">右搖桿：</strong>技能2（支援推住蓄力）</div>
              <div><strong className="text-white/60">X / Y：</strong>跳躍</div>
              <div><strong className="text-white/60">LB / RB / LT：</strong>防禦</div>
              <div><strong className="text-white/60">Start：</strong>暫停</div>
              <div className="text-[10px] text-white/50 pt-0.5">※ 如非標準手把，可在選單點擊「設定手把」精靈綁定。</div>
            </div>
          </div>
        </div>

        {/* 戰鬥技巧 */}
        <div className="rounded-xl bg-white/5 p-3 space-y-1.5 text-[11px] border border-white/5 text-white/85">
          <div className="font-bold text-amber-300 flex items-center gap-1.5">
            <span>⚡</span> 進階戰鬥機制
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-white/75 text-[11px]">
            <div>• <strong className="text-white">方向招式：</strong>方向（左右/上/下）＋普攻或特招</div>
            <div>• <strong className="text-white">蓄力重擊：</strong>普攻＋特招同按並按住蓄力</div>
            <div>• <strong className="text-white">地面閃避：</strong>防禦中按左右＝翻滾，拿下＝原地閃避</div>
            <div>• <strong className="text-white">空中閃避：</strong>空中按防禦（落地前限一次）</div>
            <div>• <strong className="text-white">邊緣抓邊：</strong>落出場外靠近邊緣自動抓邊（按住下不抓）</div>
            <div>• <strong className="text-white">大招球：</strong>打破場上浮動大招球即獲全屏大招資格</div>
          </div>
        </div>

        {/* 快捷鍵 */}
        <div className="flex justify-between items-center text-[11px] text-white/50 pt-1">
          <span>快捷鍵：<strong className="text-white/80">Esc/P</strong> 暫停 · <strong className="text-white/80">M</strong> 靜音 · <strong className="text-white/80">H</strong> 判定框除錯 · <strong className="text-white/80">U</strong> 測試給予大招</span>
          <button
            onClick={onClose}
            className="rounded-lg bg-yellow-300 px-5 py-1.5 font-bold text-black hover:bg-yellow-200 transition-colors"
          >
            我知道了
          </button>
        </div>
      </div>
    </div>
  )
}

function Menu() {
  const [wizard, setWizard] = useState<FighterId | null>(null)
  const [showHelp, setShowHelp] = useState(false)
  usePadMenu(wizard === null && !showHelp, () => { clearEntities(); resetSimStage(); useGameStore.getState().startMatch() })
  const selection = useGameStore((s) => s.selection)
  const select = useGameStore((s) => s.select)
  const start = useGameStore((s) => s.startMatch)

  return (
    <div className="pointer-events-auto absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/70 text-white select-none">
      <h1 className="text-6xl font-black italic tracking-tight">smash<span className="text-yellow-300">!!!</span></h1>
      <div className="flex gap-8">
        {FIGHTER_IDS.map((id) => (
          <div key={id} className="w-72 rounded-xl bg-white/10 p-3.5 backdrop-blur-sm border border-white/10">
            <div className="mb-2 text-sm font-bold">{id.toUpperCase()}</div>
            <div className="flex flex-wrap gap-1.5">
              {CHARACTER_IDS.map((c) => (
                <button key={c} onClick={() => select(id, c)}
                  className={`rounded px-2 py-1.5 text-xs font-bold transition-all ${selection[id] === c ? 'ring-2 ring-white scale-105' : 'opacity-60 hover:opacity-90'}`}
                  style={{ background: CHARACTERS[c].color, color: '#001' }}>{CHARACTERS[c].name}</button>
              ))}
            </div>
            <CpuPicker id={id} />
            <ModelDrop id={id} />
            <PadInfo id={id} onSetup={() => setWizard(id)} />
          </div>
        ))}
      </div>

      <StagePicker />

      {wizard && <PadWizard id={wizard} onClose={() => setWizard(null)} />}
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}

      <div className="flex flex-col items-center gap-2 mt-1">
        <button
          onClick={() => { clearEntities(); resetSimStage(); start() }}
          className="rounded-xl bg-yellow-300 px-12 py-3 text-xl font-black text-black hover:bg-yellow-200 active:scale-95 transition-all shadow-lg shadow-yellow-500/20"
        >
          START
        </button>

        <div className="flex items-center gap-3 text-xs text-white/60">
          <button
            type="button"
            onClick={() => setShowHelp(true)}
            className="flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1 text-white/80 hover:bg-white/20 hover:text-white transition-all border border-white/10 hover:border-white/25"
          >
            <span>📖</span>
            <span>操作指南 & 按鍵說明</span>
          </button>
          <span className="text-white/20">|</span>
          <PadStatus />
        </div>
      </div>
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
  const stageId = useGameStore((s) => s.stageId)
  const currentStage = STAGES[stageId] ?? STAGES.battlefield
  return (
    <div className="pointer-events-auto absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-black/70 text-white">
      <div className="text-5xl font-black tracking-widest">暫停</div>
      <div className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-1 text-xs text-white/80">
        <span>🏟️ {currentStage.theme.name}</span>
        <span className="text-yellow-300">· {currentStage.theme.tag}</span>
      </div>
      <div className="flex gap-3">
        <button onClick={() => setPaused(false)} className="rounded bg-yellow-300 px-6 py-2 font-bold text-black">繼續</button>
        <button onClick={() => { clearEntities(); resetSimStage(); start() }} className="rounded bg-white/20 px-6 py-2 font-bold">重新開始</button>
        <button onClick={toMenu} className="rounded bg-white/20 px-6 py-2 font-bold">回選單</button>
      </div>
      <div className="text-xs text-white/60">按 Esc / P / 手把 Start 或 A、B 繼續</div>
    </div>
  )
}

function AudioControl() {
  const muted = useAudioStore((s) => s.muted)
  const bgmMuted = useAudioStore((s) => s.bgmMuted)
  const volume = useAudioStore((s) => s.volume)
  const setMuted = useAudioStore((s) => s.setMuted)
  const setBgmMuted = useAudioStore((s) => s.setBgmMuted)
  const setVolume = useAudioStore((s) => s.setVolume)

  return (
    <div className="flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 text-xs text-white/90 backdrop-blur shadow-md ring-1 ring-white/10 select-none">
      <button
        type="button"
        onClick={() => setBgmMuted(!bgmMuted)}
        className={`text-sm hover:scale-110 active:scale-95 transition-all ${bgmMuted || muted ? 'opacity-40 line-through' : ''}`}
        title="切換背景音樂 BGM（亦可按鍵盤 B）"
      >
        🎵
      </button>
      <button
        type="button"
        onClick={() => setMuted(!muted)}
        className="text-sm hover:scale-110 active:scale-95 transition-transform"
        title="切換總靜音（亦可按鍵盤 M）"
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
  usePadMenu(phase === 'ended', () => { clearEntities(); resetSimStage(); start() })
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
        <div className="pointer-events-auto absolute inset-0 flex flex-col items-center justify-center gap-5 bg-black/75 backdrop-blur-sm text-white">
          <div className="text-center">
            <div className="text-xs font-bold tracking-[0.3em] text-yellow-300/80 uppercase">GAME SET</div>
            <div className="text-6xl font-black italic" style={{ color: ui[winner].color }}>
              {winner.toUpperCase()} · {ui[winner].name} WINS!
            </div>
          </div>

          {/* 賽後戰報數據 */}
          <div className="w-full max-w-md rounded-2xl bg-white/10 border border-white/15 p-4 text-xs shadow-xl">
            <div className="mb-2.5 flex justify-between border-b border-white/10 pb-2 font-black text-sm">
              <span style={{ color: ui.p1.color }}>P1 · {ui.p1.name}</span>
              <span className="text-white/50 text-xs">對戰統計</span>
              <span style={{ color: ui.p2.color }}>P2 · {ui.p2.name}</span>
            </div>
            <div className="space-y-2 text-center font-mono">
              <div className="grid grid-cols-3 items-center">
                <span className="text-left text-sm font-bold">{ui.p1.stats.kos}</span>
                <span className="text-white/60 font-sans text-[11px]">擊墜數 (KOs)</span>
                <span className="text-right text-sm font-bold">{ui.p2.stats.kos}</span>
              </div>
              <div className="grid grid-cols-3 items-center">
                <span className="text-left text-sm font-bold">{ui.p1.stats.damageDealt}%</span>
                <span className="text-white/60 font-sans text-[11px]">輸出傷害</span>
                <span className="text-right text-sm font-bold">{ui.p2.stats.damageDealt}%</span>
              </div>
              <div className="grid grid-cols-3 items-center">
                <span className="text-left text-sm font-bold">{ui.p1.stats.maxCombo}</span>
                <span className="text-white/60 font-sans text-[11px]">最高連段</span>
                <span className="text-right text-sm font-bold">{ui.p2.stats.maxCombo}</span>
              </div>
              <div className="grid grid-cols-3 items-center">
                <span className="text-left text-sm font-bold">{ui.p1.stats.perfectShields}</span>
                <span className="text-white/60 font-sans text-[11px]">完美防禦</span>
                <span className="text-right text-sm font-bold">{ui.p2.stats.perfectShields}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => { clearEntities(); resetSimStage(); start() }} className="rounded-xl bg-yellow-300 px-8 py-2.5 font-black text-black hover:bg-yellow-200 transition-colors">再來一場</button>
            <button onClick={toMenu} className="rounded-xl bg-white/20 px-8 py-2.5 font-bold hover:bg-white/30 transition-colors">回選單</button>
          </div>
        </div>
      )}
    </div>
  )
}
