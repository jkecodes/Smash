import { useEffect, useState } from 'react'
import { pollPause, captureAxis, captureBase, captureButton, clearMap, connectedPadCount, describePad, getPad, loadMap, readMenuPad, saveMap, type PadMap } from '../game/input'
import { CHARACTERS, CHARACTER_IDS } from '../game/characters'
import { clearEntities } from '../game/runtime'
import { resetSimStage } from '../game/sim'
import { getSkill } from '../game/skills'
import { TETROMINOES, getReadyLines, getTetroBoard } from '../game/skills/tetroSkills'
import { STAGES, STAGE_IDS, type StageForm, type StageId } from '../game/stages'
import { useGameStore } from '../game/store'
import { ALL_FIGHTER_IDS, PLAYER_COLORS, type Btn, type CharacterId, type FighterId, type UiFighter } from '../game/types'
import { sfx, useAudioStore } from '../game/audio'
import { CharacterPortrait, SHORT_NAMES } from './CharacterPortrait'
import { StagePreview } from './StagePreview'

const damageColor = (d: number) => {
  const t = Math.min(1, d / 200)
  return `rgb(255, ${Math.round(255 - t * 200)}, ${Math.round(255 - t * 230)})`
}
const SLOT_KEYS: Partial<Record<FighterId, Record<string, string>>> = {
  p1: { attack: 'J', skill1: 'K', skill2: 'L', ult: 'I' },
  p2: { attack: '.', skill1: '/', skill2: "'", ult: ';' },
}

function Card({ id, u, compact = false }: { id: FighterId; u: UiFighter; compact?: boolean }) {
  const charId = useGameStore((s) => s.selection[id])
  if (!u) return null
  const isTetro = charId === 'tetro'
  const tb = isTetro ? getTetroBoard(id) : null
  const readyLines = isTetro ? getReadyLines(id) : 0
  const clearBanner = tb?.lastClear && performance.now() < tb.lastClear.until ? tb.lastClear : null
  const pColor = PLAYER_COLORS[id]

  return (
    <div className={`relative rounded-xl bg-black/60 text-white backdrop-blur border border-white/10 ${compact ? 'w-44 p-2' : 'w-72 p-3'}`}>
      {u.combo >= 2 && (
        <div
          className="-top-7 left-2 absolute animate-bounce rounded-full px-2.5 py-0.5 text-[11px] font-black text-black shadow-lg"
          style={{ backgroundColor: u.color }}
        >
          🔥 {u.combo} HIT!
        </div>
      )}
      {clearBanner && (
        <div
          className="-top-7 right-2 absolute animate-pulse rounded-full px-2.5 py-0.5 text-[11px] font-black text-black shadow-lg"
          style={{ backgroundColor: clearBanner.color }}
        >
          {clearBanner.text}
        </div>
      )}
      <div className="flex items-baseline justify-between gap-1">
        <span className={`font-bold tracking-wide truncate ${compact ? 'text-[11px]' : 'text-sm'}`} style={{ color: pColor }}>
          {id.toUpperCase()} · {u.name}
        </span>
        {!compact && <span className="font-mono text-[10px] text-white/60 shrink-0">{u.fsm}</span>}
      </div>
      <div className="mt-1 flex items-end justify-between gap-2">
        <div className="flex items-end gap-2">
          <div className={`${compact ? 'h-9 w-9' : 'h-12 w-12'} shrink-0 overflow-hidden rounded-lg border border-white/25 bg-black/50 shadow-inner`}>
            <CharacterPortrait id={charId} className="h-full w-full" />
          </div>
          <span className={`${compact ? 'text-3xl' : 'text-5xl'} font-black leading-none tabular-nums`} style={{ color: damageColor(u.damage), textShadow: '0 2px 0 #000' }}>
            {u.damage}<span className={compact ? 'text-lg' : 'text-2xl'}>%</span>
          </span>
        </div>
        <span className="flex gap-1 pb-1.5">
          {Array.from({ length: Math.max(0, u.stocks) }, (_, i) => (
            <span key={i} className={`inline-block rounded-sm ${compact ? 'h-2.5 w-2.5' : 'h-3.5 w-3.5'}`} style={{ background: pColor }} />
          ))}
        </span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded bg-white/10" title="能量">
        <div className="h-full" style={{ width: `${u.energy}%`, background: u.energy >= 100 ? '#ffd24d' : '#4dd2ff' }} />
      </div>
      <div className="mt-0.5 h-1 overflow-hidden rounded bg-white/10" title="護盾">
        <div className="h-full bg-sky-300/80" style={{ width: `${u.shield}%` }} />
      </div>
      {tb && (
        <div className="mt-1 flex items-center justify-between rounded bg-white/10 px-1.5 py-0.5 text-[10px]">
          <div className="flex items-center gap-1">
            <span className="font-bold text-cyan-300">🧩</span>
            <span className="flex gap-0.5">
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className={`inline-block h-2 w-2 rounded-[2px] ${i < readyLines ? (readyLines >= 4 ? 'bg-yellow-300 animate-pulse' : 'bg-cyan-400') : 'bg-white/15'}`}
                />
              ))}
            </span>
            {readyLines >= 4 && !compact && <span className="font-black text-yellow-300">⚡TETRIS!</span>}
          </div>
          <div className="flex items-center gap-1 font-mono text-white/70">
            <span className="font-black" style={{ color: TETROMINOES[tb.current].color }}>{tb.current}</span>
            <span className="text-white/40">→</span>
            <span className="font-bold" style={{ color: TETROMINOES[tb.next].color }}>{tb.next}</span>
          </div>
        </div>
      )}
      {!compact && (
        <div className="mt-2 flex gap-1.5">
          {u.slots.map((s) => {
            const noEnergy = u.energy < s.cost
            const k = SLOT_KEYS[id]?.[s.slot]
            return (
              <div key={s.slot} className={`relative flex-1 overflow-hidden rounded px-1 py-1 text-center ${s.slot === 'ult' && !s.locked ? 'bg-yellow-400/40 ring-1 ring-yellow-300' : 'bg-white/10'} ${noEnergy || s.locked ? 'opacity-40' : ''}`}>
                <div className="text-[10px] leading-tight">{s.name}</div>
                <div className="font-mono text-[10px] text-white/60">{k ? `[${k}]` : ''}{s.cost ? ` ${s.cost}` : ''}{s.locked ? ' 需大招球' : ''}</div>
                <div className="absolute inset-x-0 bottom-0 bg-black/60" style={{ height: `${s.cd * 100}%` }} />
              </div>
            )
          })}
        </div>
      )}
      {u.charge > 0 && (
        <div className="mt-1 h-1.5 overflow-hidden rounded bg-white/10">
          <div className="h-full bg-white" style={{ width: `${u.charge * 100}%` }} />
        </div>
      )}
    </div>
  )
}

/** 在多欄網格中依方向移動：左右循環、上下換列（超出範圍時夾在最後一格） */
function stepListGrid<T extends string>(list: readonly T[], cur: T, dx: number, dy: number, cols: number): T {
  const n = list.length
  let i = Math.max(0, list.indexOf(cur))
  if (dx) i = (i + dx + n) % n
  if (dy) {
    const j = i + dy * cols
    if (j >= 0 && j < n) i = j
    else if (dy > 0 && Math.floor(i / cols) < Math.floor((n - 1) / cols)) i = n - 1
  }
  return list[i]
}

/** 鍵盤選單：P1 用 WASD、P2 用方向鍵，上下左右移動 */
const MENU_KEYS: Partial<Record<FighterId, Record<string, [number, number]>>> = {
  p1: { KeyA: [-1, 0], KeyD: [1, 0], KeyW: [0, -1], KeyS: [0, 1] },
  p2: { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] },
}

/** 手把／鍵盤操作選單：上下左右移動、A/B/Start 確認；結算畫面按確認再來一場 */
function usePadMenu(
  active: boolean,
  onConfirm: () => void,
  onMove?: (id: FighterId, dx: number, dy: number) => void,
) {
  useEffect(() => {
    if (!active) return
    let raf = 0
    const loop = () => {
      const count = useGameStore.getState().playerCount
      for (const id of ALL_FIGHTER_IDS.slice(0, count)) {
        const { dx, dy, confirm } = readMenuPad(id)
        if ((dx || dy) && onMove) {
          onMove(id, dx, dy)
          sfx('ui')
        }
        if (confirm) { onConfirm(); return }
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    const onKey = (e: KeyboardEvent) => {
      if (!onMove || e.repeat) return
      for (const id of ['p1', 'p2'] as FighterId[]) {
        const d = MENU_KEYS[id]?.[e.code]
        if (!d) continue
        e.preventDefault()
        onMove(id, d[0], d[1])
        sfx('ui')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('keydown', onKey) }
  }, [active, onConfirm, onMove])
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
  xbox: 'B 普攻・A 特招・X/Y 跳・LT/RT 防禦',
  ps: '○ 普攻・✕ 特招・□/△ 跳・L2/R2 防禦',
  nintendo: 'A 普攻・B 特招・X/Y 跳・ZL/ZR 防禦',
  generic: '右鍵 攻擊・下鍵 技能1・左/上鍵 跳・LT/RT 防禦',
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
  }, [id, onClose])
  const pad = getPad(id)
  return (
    <div className="pointer-events-auto absolute inset-0 z-40 flex flex-col items-center justify-center gap-4 bg-black/85 text-white">
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
function ModelDrop({ id, compact = false }: { id: FighterId; compact?: boolean }) {
  const m = useGameStore((s) => s.playerModel[id])
  const set = useGameStore((s) => s.setPlayerModel)
  const [over, setOver] = useState(false)
  const accept = (f?: File) => { if (f && /\.(glb|gltf)$/i.test(f.name)) set(id, f) }
  return (
    <label
      onDragOver={(e) => { e.preventDefault(); setOver(true) }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); accept(e.dataTransfer.files[0]) }}
      onClick={(e) => e.stopPropagation()}
      className={`mt-1.5 block cursor-pointer rounded border border-dashed px-2 ${compact ? 'py-1 text-[10px]' : 'py-1.5 text-[11px]'} text-center ${over ? 'border-yellow-300 bg-yellow-300/20' : 'border-white/25'}`}
    >
      <input type="file" accept=".glb,.gltf" className="hidden" onChange={(e) => accept(e.target.files?.[0])} />
      {m ? <>🧊 {m.name} <button type="button" className="ml-1 underline" onClick={(e) => { e.preventDefault(); set(id, null) }}>移除</button></> : (compact ? '拖入 .glb 自訂外觀' : '拖曳 .glb 模型到這裡（或點擊選檔）')}
    </label>
  )
}

function PadInfo({ id, onSetup, compact = false }: { id: FighterId; onSetup: () => void; compact?: boolean }) {
  const [, tick] = useState(0)
  useEffect(() => { const t = setInterval(() => tick((n) => n + 1), 700); return () => clearInterval(t) }, [])
  const d = describePad(id)
  return (
    <div className={`mt-1.5 leading-snug text-white/70 ${compact ? 'text-[10px]' : 'text-[11px]'}`} onClick={(e) => e.stopPropagation()}>
      {d ? (
        <>
          <div className="text-emerald-300 truncate">🎮 {d.name}（{KIND_LABEL[d.kind]}）</div>
          {!compact && <div>{d.custom ? '已使用自訂綁定' : d.standard ? KIND_KEYS[d.kind] : '⚠ 非標準映射，建議先「設定手把」'}</div>}
          <button onClick={onSetup} className="mt-1 rounded bg-white/15 px-2 py-0.5 hover:bg-white/25">設定手把</button>
        </>
      ) : <div>{id === 'p1' || id === 'p2' ? '未連接手把（鍵盤可用）' : '未連接手把'}</div>}
    </div>
  )
}

const CPU_LABEL = ['玩家', 'CPU 1', 'CPU 2', 'CPU 3'] as const
function CpuPicker({ id }: { id: FighterId }) {
  const lv = useGameStore((s) => s.cpu[id])
  const setCpu = useGameStore((s) => s.setCpu)
  return (
    <div className="mt-1.5 flex gap-1" onClick={(e) => e.stopPropagation()}>
      {CPU_LABEL.map((l, i) => (
        <button key={l} onClick={() => setCpu(id, i as 0 | 1 | 2 | 3)}
          className={`flex-1 rounded px-1 py-1 text-[10px] font-bold ${lv === i ? 'bg-yellow-300 text-black' : 'bg-white/15 text-white/70 hover:bg-white/25'}`}>{l}</button>
      ))}
    </div>
  )
}

const FORM_OPTIONS: { id: StageForm; label: string; hint: string }[] = [
  { id: 'normal', label: '一般型態', hint: '原版專屬地形' },
  { id: 'battlefield', label: '戰場化', hint: '標準 3 層板' },
  { id: 'omega', label: '終點化 Ω', hint: '純平面無層板' },
]

function StagePicker({ onNext }: { onNext?: () => void }) {
  const stageId = useGameStore((s) => s.stageId)
  const selectStage = useGameStore((s) => s.selectStage)
  const stageForm = useGameStore((s) => s.stageForm)
  const setStageForm = useGameStore((s) => s.setStageForm)
  const activeStage = STAGES[stageId] ?? STAGES.reimu

  const pickRandomStage = () => {
    const pool = STAGE_IDS.filter((id) => id !== stageId)
    const next = pool[Math.floor(Math.random() * pool.length)] ?? STAGE_IDS[0]
    selectStage(next)
    sfx('ui')
  }

  const stageCards: (StageId | 'random')[] = ['random', ...STAGE_IDS]

  return (
    <div className="flex flex-col lg:flex-row items-stretch justify-center gap-4 max-w-6xl w-full px-3">
      {/* 左側：Smash Ultimate 風格當前地圖焦點預覽卡 ＋ 型態切換 */}
      <div className="w-full lg:w-80 shrink-0 rounded-2xl border-2 border-yellow-300/70 bg-black/65 p-3.5 backdrop-blur-md shadow-2xl flex flex-col justify-between gap-2.5">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[10px] font-black tracking-widest text-yellow-300 uppercase">
            <span>STAGE PREVIEW</span>
            <span className="rounded bg-white/10 px-2 py-0.5 text-white/80">{activeStage.theme.subtitle}</span>
          </div>
          <div className="overflow-hidden rounded-xl border-2 border-white/25 bg-black shadow-lg">
            <StagePreview id={stageId} form={stageForm} className="w-full aspect-[2/1]" />
          </div>
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xl font-black text-white truncate">{activeStage.theme.name}</h2>
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-bold shrink-0"
              style={{ backgroundColor: activeStage.theme.accentColor + '33', color: activeStage.theme.accentColor }}
            >
              {activeStage.theme.tag}
            </span>
          </div>
          <p className="text-xs text-white/75 leading-relaxed">{activeStage.theme.desc}</p>
          {activeStage.gimmick ? (
            <div className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-[11px] font-bold text-white/90">
              <span>⚡</span>
              <span className="text-white/60">專屬機關：</span>
              <span style={{ color: activeStage.gimmick.color }}>{activeStage.gimmick.name}</span>
            </div>
          ) : (
            <div className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold text-white/45">
              ⚡ 戰場化／終點化已關閉場地機關
            </div>
          )}
        </div>

        {/* 場地型態切換：一般 / 戰場化 / 終點化 Ω */}
        <div className="space-y-1.5 border-t border-white/10 pt-2.5">
          <div className="text-[10px] font-bold text-white/55 tracking-wider">場地型態（保留美術外觀與背景）</div>
          <div className="grid grid-cols-3 gap-1.5">
            {FORM_OPTIONS.map((f) => {
              const on = stageForm === f.id
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => { setStageForm(f.id); sfx('ui') }}
                  title={f.hint}
                  className={`rounded-lg px-1.5 py-1.5 text-center transition border ${on
                    ? 'border-yellow-300 bg-yellow-300 text-black font-black shadow'
                    : 'border-white/15 bg-white/10 text-white/80 hover:bg-white/20 font-bold'
                    }`}
                >
                  <div className="text-[11px] leading-tight">{f.label}</div>
                  <div className={`text-[9px] leading-tight mt-0.5 ${on ? 'text-black/70' : 'text-white/45'}`}>{f.hint}</div>
                </button>
              )
            })}
          </div>
        </div>

        <button
          type="button"
          onClick={() => { sfx('ui'); onNext?.() }}
          className="w-full rounded-xl bg-yellow-300 py-2.5 text-base font-black text-black hover:bg-yellow-200 active:scale-[0.98] transition-all shadow-lg shadow-yellow-500/20"
        >
          確定地圖 → 選擇角色
        </button>
      </div>

      {/* 右側：Smash Ultimate 風格高密度場地選擇矩陣（左上角為隨機） */}
      <div className="flex-1 rounded-2xl border-2 border-white/20 bg-black/70 p-2 shadow-2xl max-h-[54vh] overflow-y-auto">
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1">
          {stageCards.map((item) => {
            if (item === 'random') {
              return (
                <button
                  key="random"
                  type="button"
                  onClick={pickRandomStage}
                  className="relative overflow-hidden border-[1.5px] border-black bg-slate-900 group cursor-pointer focus:outline-none hover:ring-2 hover:ring-yellow-300/70"
                >
                  <StagePreview id="random" className="w-full aspect-[2/1] object-cover transition-transform duration-150 group-hover:scale-105" />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent px-1.5 pb-1 pt-2 text-center">
                    <div className="text-xs font-black text-yellow-300 leading-none" style={NAME_STROKE}>RANDOM 隨機</div>
                  </div>
                </button>
              )
            }
            const st = STAGES[item]
            const active = stageId === item
            return (
              <button
                key={item}
                type="button"
                onClick={() => {
                  if (active && onNext) onNext()
                  else selectStage(item)
                  sfx('ui')
                }}
                onDoubleClick={() => onNext?.()}
                className={`relative overflow-hidden border-[1.5px] border-black bg-black group cursor-pointer focus:outline-none transition-transform ${active
                  ? 'ring-2 ring-inset ring-yellow-300 z-10 scale-[1.03]'
                  : 'opacity-85 hover:opacity-100 hover:ring-1 hover:ring-white/50'
                  }`}
              >
                <StagePreview id={item} form={stageForm} className="w-full aspect-[2/1] object-cover transition-transform duration-150 group-hover:scale-105" />
                <span
                  className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full border border-black/60 shadow"
                  style={{ backgroundColor: CHARACTERS[item].color }}
                />
                {active && (
                  <span className="absolute top-1 left-1 rounded bg-yellow-300 px-1 py-0 text-[9px] font-black text-black shadow">
                    OK
                  </span>
                )}
                <div
                  className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent px-1 pb-1 pt-3 text-center"
                  style={NAME_STROKE}
                >
                  <div className="text-[11px] sm:text-xs font-black text-white leading-none truncate">
                    {st.theme.name}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function HelpModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.code === 'Escape') onClose() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div
      className="pointer-events-auto absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
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
          <button onClick={onClose} className="rounded-lg bg-white/10 px-3 py-1 text-xs hover:bg-white/20 transition-colors">
            ✕ 關閉 (Esc)
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3.5 text-xs">
          <div className="rounded-xl bg-white/5 p-3.5 space-y-2 border border-white/5">
            <div className="font-bold text-yellow-300 flex items-center gap-1.5">
              <span>⌨️</span> 鍵盤按鍵配置
            </div>
            <div className="space-y-2 text-white/85 text-[11px] leading-relaxed">
              <div>
                <span className="text-red-400 font-bold">P1：</span>
                WASD 移動 / 跳躍 (亦可 Space)<br />
                <span className="text-white/60">J</span> 攻擊 · <span className="text-white/60">K</span> 特招 · <span className="text-white/60">L</span> 技能2 · <span className="text-white/60">I</span> 大招<br />
                <span className="text-yellow-300 font-bold">O 或 Shift</span> 防禦/閃避 · <span className="text-white/60">S</span> 快速下墜 / 穿層板
              </div>
              <div className="pt-1.5 border-t border-white/10">
                <span className="text-blue-400 font-bold">P2：</span>
                方向鍵 移動 / 跳躍 (亦可 Enter)<br />
                <span className="text-white/60">.</span> 攻擊 · <span className="text-white/60">/</span> 特招 · <span className="text-white/60">'</span> 技能2 · <span className="text-white/60">;</span> 大招<br />
                <span className="text-yellow-300 font-bold">, 或 右Shift</span> 防禦/閃避 · <span className="text-white/60">↓</span> 快速下墜 / 穿層板
              </div>
            </div>
          </div>

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
              <div><strong className="text-emerald-300">LT / RT / LB / RB：</strong>防禦（左或右扳機皆可）</div>
              <div><strong className="text-white/60">L3 / R3：</strong>大招 · <strong className="text-white/60">Start：</strong>暫停</div>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-white/5 p-3 space-y-1.5 text-[11px] border border-white/5 text-white/85">
          <div className="font-bold text-amber-300 flex items-center gap-1.5">
            <span>⚡</span> 進階戰鬥機制
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-white/75 text-[11px]">
            <div>• <strong className="text-white">方向招式：</strong>方向（左右/上/下）＋普攻或特招</div>
            <div>• <strong className="text-white">蓄力重擊：</strong><span className="text-yellow-300">僅限地面</span>普攻＋特招同按，蓄滿後按住不放可等待放開再出招！</div>
            <div>• <strong className="text-white">地面閃避：</strong>防禦中按左右＝翻滾，按下＝原地閃避</div>
            <div>• <strong className="text-white">空中閃避：</strong>空中按防禦（落地前限一次）</div>
            <div>• <strong className="text-white">邊緣抓邊：</strong>落出場外靠近邊緣自動抓邊（按住下不抓）</div>
            <div>• <strong className="text-white">大招球：</strong>打破 <span className="text-yellow-300">5 下</span>大招球即獲全屏大招資格</div>
          </div>
        </div>

        <div className="flex justify-between items-center text-[11px] text-white/50 pt-1">
          <span>快捷鍵：<strong className="text-white/80">Esc/P</strong> 暫停 · <strong className="text-white/80">M</strong> 靜音 · <strong className="text-white/80">B</strong> 切換 BGM · <strong className="text-white/80">H</strong> 判定框 · <strong className="text-white/80">U</strong> 測試大招</span>
          <button onClick={onClose} className="rounded-lg bg-yellow-300 px-5 py-1.5 font-bold text-black hover:bg-yellow-200 transition-colors">
            我知道了
          </button>
        </div>
      </div>
    </div>
  )
}

const MOVE_ROWS: [string, string][] = [
  ['attack', '普攻 / 連段'],
  ['attack:side', '橫強攻 (左右+普攻)'],
  ['attack:up', '上強攻 (上+普攻)'],
  ['attack:down', '下強攻 (下+普攻)'],
  ['skill1', '特招 (K)'],
  ['skill1:side', '橫特招 (左右+特招)'],
  ['skill1:up', '上回場特招 (上+特招)'],
  ['skill1:down', '下特招 (下+特招)'],
  ['skill2', '技能2 (L / 右搖桿)'],
  ['smash', '地面橫重擊 (地面 普攻+特招)'],
  ['smash:up', '地面上重擊 (地面 上+普攻+特招)'],
  ['smash:down', '地面下重擊 (地面 下+普攻+特招)'],
  ['ult', '最終大招 (打破5下大招球後按特招)'],
]

function CharGuideModal({ initialChar, onClose }: { initialChar: CharacterId; onClose: () => void }) {
  const [cid, setCid] = useState<CharacterId>(initialChar)
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.code === 'Escape') onClose() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  const c = CHARACTERS[cid]
  const g = c.guide

  return (
    <div
      className="pointer-events-auto absolute inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative max-w-4xl w-full max-h-[90vh] flex flex-col rounded-2xl bg-[#111726] border border-white/20 p-5 text-white shadow-2xl gap-3.5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
          <div className="text-base font-black tracking-wider flex items-center gap-2">
            <span>🎓 角色專屬遊玩教學</span>
            <span className="text-xs font-normal text-white/55">點擊下方頭像切換所有角色</span>
          </div>
          <button onClick={onClose} className="rounded-lg bg-white/10 px-3 py-1 text-xs hover:bg-white/20">
            ✕ 關閉 (Esc)
          </button>
        </div>

        {/* 11 角色切換列 */}
        <div className="flex flex-wrap gap-1.5">
          {CHARACTER_IDS.map((id) => {
            const active = id === cid
            return (
              <button
                key={id}
                type="button"
                onClick={() => { setCid(id); sfx('ui') }}
                className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-bold border transition ${active ? 'border-yellow-300 bg-white/20 text-white' : 'border-white/10 bg-white/5 text-white/65 hover:bg-white/15'
                  }`}
              >
                <div className="h-6 w-6 overflow-hidden rounded border border-white/20 bg-black">
                  <CharacterPortrait id={id} className="h-full w-full" />
                </div>
                <span>{SHORT_NAMES[id]}</span>
              </button>
            )
          })}
        </div>

        <div className="overflow-y-auto pr-1 space-y-3.5 flex-1">
          {/* 角色概述與必學技巧 */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-3.5 flex flex-col sm:flex-row gap-3.5 items-start">
            <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl border-2 border-white/25 bg-black shadow-lg">
              <CharacterPortrait id={cid} className="h-full w-full" />
            </div>
            <div className="flex-1 space-y-1.5">
              <div className="flex flex-wrap items-baseline gap-2.5">
                <span className="text-xl font-black" style={{ color: c.color }}>{c.name}</span>
                <span className="rounded bg-white/10 px-2 py-0.5 text-[11px] text-amber-200">
                  主場地圖：{STAGES[cid].theme.name}
                </span>
              </div>
              {c.trait && <div className="text-xs font-bold text-yellow-300">{c.trait}</div>}
              {g && (
                <>
                  <p className="text-xs text-white/85 leading-relaxed">{g.summary}</p>
                  <div className="pt-1 space-y-1">
                    {g.steps.map((s, i) => (
                      <div key={i} className="text-[11px] text-white/80 flex gap-1.5">
                        <span className="font-black text-cyan-300 shrink-0">{i + 1}.</span>
                        <span>{s}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-1.5 rounded-lg bg-amber-400/15 border border-amber-300/30 px-2.5 py-1.5 text-[11px] text-amber-200 font-bold">
                    ⚡ 推薦連段：{g.combo}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* 完整招式表 */}
          <div className="space-y-1.5">
            <div className="text-xs font-black text-white/75 tracking-wider">📋 完整招式列表</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {MOVE_ROWS.map(([key, inputLabel]) => {
                const sk = getSkill(c.loadout[key])
                if (!sk) return null
                return (
                  <div key={key} className="rounded-lg border border-white/10 bg-black/35 px-2.5 py-1.5 text-[11px]">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-black text-white">{sk.name}</span>
                      <span className="text-[10px] font-mono text-cyan-300">{inputLabel}</span>
                    </div>
                    <div className="mt-0.5 flex flex-wrap gap-1.5 text-[10px] text-white/60">
                      <span>傷害 {Math.round(sk.damage * 10) / 10}%</span>
                      <span>· 擊飛 {sk.knockback.base}+{sk.knockback.scaling}×</span>
                      {sk.energyCost > 0 && <span>· 耗能 {sk.energyCost}</span>}
                      {sk.cooldownMs ? <span>· CD {(sk.cooldownMs * 0.5 / 1000).toFixed(1)}s</span> : null}
                      {sk.charge && <span className="text-yellow-300">· 按住蓄力</span>}
                      {sk.requiresUlt && <span className="text-amber-300">· 需大招球(5下)</span>}
                    </div>
                    <div className="mt-0.5 text-[10px] text-white/50">
                      {sk.projectile
                        ? sk.projectile.explodeRadius
                          ? '💥 爆裂彈道'
                          : sk.projectile.pierce
                            ? '⚡ 貫穿光束'
                            : '🎯 遠程彈幕'
                        : sk.hitbox
                          ? '⚔️ 近身打擊'
                          : '✨ 特殊技 / 位移'}
                      {sk.chain ? ' · 連按可續接連段' : ''}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const NAME_STROKE = {
  textShadow: '-1.5px -1.5px 0 #000, 1.5px -1.5px 0 #000, -1.5px 1.5px 0 #000, 1.5px 1.5px 0 #000, 0 2px 4px #000',
}

function Menu({ onGuide, guideOpen }: { onGuide: (c: CharacterId) => void; guideOpen: boolean }) {
  const [step, setStep] = useState<'stage' | 'char'>('stage')
  const [wizard, setWizard] = useState<FighterId | null>(null)
  const [showHelp, setShowHelp] = useState(false)
  const [activePicker, setActivePicker] = useState<FighterId>('p1')
  const playerCount = useGameStore((s) => s.playerCount)
  const setPlayerCount = useGameStore((s) => s.setPlayerCount)
  const selection = useGameStore((s) => s.selection)
  const select = useGameStore((s) => s.select)
  const stageId = useGameStore((s) => s.stageId)
  const selectStage = useGameStore((s) => s.selectStage)
  const start = useGameStore((s) => s.startMatch)

  const activeIds = ALL_FIGHTER_IDS.slice(0, playerCount)
  const safePicker = activeIds.includes(activePicker) ? activePicker : 'p1'
  const currentStage = STAGES[stageId] ?? STAGES.reimu

  usePadMenu(
    wizard === null && !showHelp && !guideOpen,
    () => {
      if (step === 'stage') { sfx('ui'); setStep('char') }
      else { clearEntities(); resetSimStage(); useGameStore.getState().startMatch() }
    },
    (id, dx, dy) => {
      if (step === 'stage') {
        const cur = useGameStore.getState().stageId
        selectStage(stepListGrid(STAGE_IDS, cur, dx, dy, 6))
      } else {
        const cur = useGameStore.getState().selection[id]
        select(id, stepListGrid(CHARACTER_IDS, cur, dx, dy, 10))
      }
    },
  )

  const pickChar = (target: FighterId, item: CharacterId | 'random') => {
    let chosen: CharacterId
    if (item === 'random') {
      const pool = CHARACTER_IDS.filter((c) => c !== selection[target])
      chosen = pool[Math.floor(Math.random() * pool.length)] ?? CHARACTER_IDS[0]
    } else {
      chosen = item
    }
    select(target, chosen)
    sfx('ui')
  }

  // 隨機在左上角第 1 格 ＋ 37 角色 = 38 格 -> 10 欄緊湊格陣
  const rosterGrid: (CharacterId | 'random')[] = ['random', ...CHARACTER_IDS]
  const rosterRows = [
    rosterGrid.slice(0, 10),
    rosterGrid.slice(10, 20),
    rosterGrid.slice(20, 30),
    rosterGrid.slice(30),
  ]

  const renderCell = (item: CharacterId | 'random') => {
    const isRand = item === 'random'
    const owners = isRand ? [] : activeIds.filter((pid) => selection[pid] === item)
    const firstOwner = owners[0]
    const zhSub = isRand ? '隨機' : CHARACTERS[item].name.replace(/^[A-Z0-9-]+\s*/, '')

    return (
      <button
        key={item}
        type="button"
        onClick={() => pickChar(safePicker, item)}
        onContextMenu={(e) => { e.preventDefault(); pickChar('p2', item) }}
        title={isRand ? '點擊隨機選擇角色' : `${CHARACTERS[item].name}（左鍵指派給 ${safePicker.toUpperCase()}／右鍵直選 P2）`}
        style={firstOwner ? { boxShadow: `inset 0 0 0 2.5px ${PLAYER_COLORS[firstOwner]}` } : undefined}
        className="relative w-14 h-14 sm:w-[4.6rem] sm:h-[4.3rem] overflow-hidden bg-black border border-black group cursor-pointer focus:outline-none"
      >
        <CharacterPortrait id={item} className="w-full h-full object-cover transition-transform duration-150 group-hover:scale-110" />
        {owners.length > 0 && (
          <div className="absolute top-0.5 left-0.5 z-10 flex flex-wrap gap-0.5 max-w-full pr-0.5">
            {owners.map((pid) => (
              <span
                key={pid}
                className="rounded px-1 py-0 text-[9px] font-black text-black shadow"
                style={{ backgroundColor: PLAYER_COLORS[pid] }}
              >
                {pid.toUpperCase()}
              </span>
            ))}
          </div>
        )}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/80 via-black/30 to-transparent px-1 pb-0.5 pt-2 text-center"
          style={NAME_STROKE}
        >
          <div className="text-[11px] sm:text-xs font-black tracking-tight text-white leading-none">
            {isRand ? 'RANDOM' : SHORT_NAMES[item]}
          </div>
          {zhSub && (
            <div className="mt-0.5 text-[8px] sm:text-[9px] font-bold text-white/90 leading-none truncate">
              {zhSub}
            </div>
          )}
        </div>
      </button>
    )
  }

  return (
    <div className={`pointer-events-auto absolute inset-0 flex flex-col items-center justify-center gap-3 text-white select-none overflow-y-auto py-3 px-2 ${step === 'stage' ? 'bg-black/55' : 'bg-black/75'}`}>
      {/* 標題與流程步驟指示（① 選擇地圖 → ② 選擇角色） */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <h1 className="text-3xl sm:text-5xl font-black italic tracking-tight">smash<span className="text-yellow-300">!!!</span></h1>
        <div className="flex items-center gap-1.5 rounded-full border border-white/20 bg-black/50 p-1 text-xs font-black">
          <button
            type="button"
            onClick={() => { sfx('ui'); setStep('stage') }}
            className={`rounded-full px-3 py-1 transition ${step === 'stage' ? 'bg-yellow-300 text-black' : 'text-white/70 hover:text-white'}`}
          >
            ① 選擇地圖
          </button>
          <span className="text-white/35">→</span>
          <button
            type="button"
            onClick={() => { sfx('ui'); setStep('char') }}
            className={`rounded-full px-3 py-1 transition ${step === 'char' ? 'bg-yellow-300 text-black' : 'text-white/70 hover:text-white'}`}
          >
            ② 選擇角色
          </button>
        </div>

        {step === 'char' && (
          <>
            <div className="flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 shadow">
              <button
                type="button"
                disabled={playerCount <= 2}
                onClick={() => { sfx('ui'); setPlayerCount(playerCount - 1) }}
                title="減少玩家人數（最少 2 人）"
                className="h-7 w-7 rounded-full bg-white/15 text-base font-black hover:bg-white/25 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                －
              </button>
              <span className="min-w-[5.5rem] text-center text-xs font-black text-yellow-300">
                👥 {playerCount} 人戰鬥
              </span>
              <button
                type="button"
                disabled={playerCount >= 8}
                onClick={() => { sfx('ui'); setPlayerCount(playerCount + 1) }}
                title="增加玩家人數（最多 8 人）"
                className="h-7 w-7 rounded-full bg-white/15 text-base font-black hover:bg-white/25 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                ＋
              </button>
            </div>
            <button
              type="button"
              onClick={() => { sfx('ui'); setStep('stage') }}
              className="rounded-full border border-amber-300/40 bg-amber-400/15 px-3 py-1 text-xs font-bold text-amber-200 hover:bg-amber-400/25 transition"
              title="點擊返回更換對戰地圖"
            >
              🏟️ {currentStage.theme.name}（更換地圖）
            </button>
          </>
        )}
      </div>

      {step === 'stage' ? (
        <>
          <StagePicker onNext={() => setStep('char')} />
          <div className="flex items-center gap-2.5 text-xs text-white/60">
            <button
              type="button"
              onClick={() => setShowHelp(true)}
              className="flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1 text-white/80 hover:bg-white/20 hover:text-white transition-all border border-white/10"
            >
              <span>📖</span>
              <span>操作指南 & 按鍵說明</span>
            </button>
            <span className="text-white/20">|</span>
            <PadStatus />
          </div>
        </>
      ) : (
        <>
          <span className="text-[11px] text-white/60">
            左鍵指派給 <strong style={{ color: PLAYER_COLORS[safePicker] }}>{safePicker.toUpperCase()}</strong>・右鍵直選 P2（亦可用 WASD / 方向鍵或手把上下左右切換）
          </span>

          {/* 10 欄大亂鬥角色選擇盤 */}
          <div className="rounded-lg border-2 border-white/20 bg-black p-1 shadow-2xl max-h-[38vh] overflow-y-auto">
            {rosterRows.map((row, ri) => (
              <div key={ri} className="flex justify-center">{row.map(renderCell)}</div>
            ))}
          </div>

          {/* 2~8 人角色展示與控制面板 */}
          <div className={playerCount <= 2
            ? 'flex flex-wrap justify-center gap-3.5'
            : 'grid grid-cols-2 md:grid-cols-4 gap-2 max-w-5xl w-full px-2'
          }>
            {activeIds.map((id) => {
              const c = CHARACTERS[selection[id]]
              const isActive = safePicker === id
              const pCol = PLAYER_COLORS[id]
              const compact = playerCount > 2
              return (
                <div
                  key={id}
                  onClick={() => setActivePicker(id)}
                  style={isActive ? { borderColor: pCol, boxShadow: `0 0 0 1px ${pCol}66` } : undefined}
                  className={`${compact ? 'w-full p-2' : 'w-[21rem] p-2.5'} rounded-xl border backdrop-blur-sm transition-all cursor-pointer ${isActive ? 'bg-white/15' : 'border-white/15 bg-white/10 hover:border-white/30 opacity-90'
                    }`}
                >
                  <div className="mb-1 flex items-center justify-between gap-1">
                    <span className="text-xs font-black tracking-wider" style={{ color: pCol }}>
                      {id.toUpperCase()}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); sfx('ui'); onGuide(selection[id]) }}
                        className="rounded-full bg-cyan-400/20 border border-cyan-300/35 px-2 py-0.5 text-[10px] font-bold text-cyan-200 hover:bg-cyan-400/35"
                      >
                        🎓 教學
                      </button>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${isActive ? 'bg-yellow-300 text-black' : 'bg-white/10 text-white/60'}`}>
                        {isActive ? '🎯 選角中' : '選我'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className={`${compact ? 'h-11 w-11' : 'h-14 w-14'} shrink-0 overflow-hidden rounded-lg border border-white/25 bg-black shadow-md`}>
                      <CharacterPortrait id={selection[id]} className="h-full w-full" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className={`${compact ? 'text-xs' : 'text-sm'} font-black tracking-wide truncate`} style={{ color: c.color }}>
                        {c.name}
                      </div>
                      {c.trait && (
                        <div className={`mt-0.5 text-yellow-200/90 leading-snug ${compact ? 'text-[10px] line-clamp-1' : 'text-[11px] line-clamp-2'}`}>
                          {c.trait}
                        </div>
                      )}
                    </div>
                  </div>

                  <CpuPicker id={id} />
                  <ModelDrop id={id} compact={compact} />
                  <PadInfo id={id} onSetup={() => setWizard(id)} compact={compact} />
                </div>
              )
            })}
          </div>

          <div className="flex flex-col items-center gap-1.5">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => { sfx('ui'); setStep('stage') }}
                className="rounded-xl bg-white/15 border border-white/25 px-5 py-2 text-sm font-bold text-white hover:bg-white/25 transition-all"
              >
                ← 重選地圖
              </button>
              <button
                onClick={() => { clearEntities(); resetSimStage(); start() }}
                className="rounded-xl bg-yellow-300 px-12 py-2 text-xl font-black text-black hover:bg-yellow-200 active:scale-95 transition-all shadow-lg shadow-yellow-500/20"
              >
                START
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2.5 text-xs text-white/60">
              <button
                type="button"
                onClick={() => { sfx('ui'); onGuide(selection[safePicker]) }}
                className="flex items-center gap-1.5 rounded-full bg-cyan-500/20 px-3.5 py-1 text-cyan-200 hover:bg-cyan-500/35 hover:text-white transition-all border border-cyan-400/35"
              >
                <span>🎓</span>
                <span>角色遊玩教學</span>
              </button>
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
        </>
      )}

      {wizard && <PadWizard id={wizard} onClose={() => setWizard(null)} />}
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
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

function PauseOverlay({ onGuide }: { onGuide: () => void }) {
  const setPaused = useGameStore((s) => s.setPaused)
  const start = useGameStore((s) => s.startMatch)
  const toMenu = useGameStore((s) => s.toMenu)
  const stageId = useGameStore((s) => s.stageId)
  const currentStage = STAGES[stageId] ?? STAGES.reimu
  return (
    <div className="pointer-events-auto absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-black/70 text-white">
      <div className="text-5xl font-black tracking-widest">暫停</div>
      <div className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-1 text-xs text-white/80">
        <span>🏟️ {currentStage.theme.name}</span>
        <span className="text-yellow-300">· {currentStage.theme.tag}</span>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <button onClick={() => setPaused(false)} className="rounded bg-yellow-300 px-6 py-2 font-bold text-black">繼續</button>
        <button onClick={onGuide} className="rounded bg-cyan-400/25 border border-cyan-300/40 px-5 py-2 font-bold text-cyan-200 hover:bg-cyan-400/35">🎓 角色教學</button>
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
  const [guideChar, setGuideChar] = useState<CharacterId | null>(null)
  const paused = useGameStore((s) => s.paused)
  const ui = useGameStore((s) => s.ui)
  const phase = useGameStore((s) => s.phase)
  const winner = useGameStore((s) => s.winner)
  const playerCount = useGameStore((s) => s.playerCount)
  const selection = useGameStore((s) => s.selection)
  const start = useGameStore((s) => s.startMatch)
  const toMenu = useGameStore((s) => s.toMenu)
  const activeIds = ALL_FIGHTER_IDS.slice(0, playerCount)
  const rankedIds = [...activeIds].sort((a, b) => {
    if (a === winner) return -1
    if (b === winner) return 1
    return (ui[b]?.stats.kos ?? 0) - (ui[a]?.stats.kos ?? 0)
  })

  usePadMenu(phase === 'ended' && !guideChar, () => { clearEntities(); resetSimStage(); start() })

  return (
    <div className="pointer-events-none absolute inset-0">
      <div className="pointer-events-auto absolute top-4 right-4 z-30">
        <AudioControl />
      </div>
      {phase !== 'menu' && (
        <div className={`absolute inset-x-0 bottom-3 flex flex-wrap gap-2 px-4 ${playerCount <= 2 ? 'justify-between px-6' : 'justify-center'}`}>
          {activeIds.map((id) => (
            <Card key={id} id={id} u={ui[id]} compact={playerCount > 2} />
          ))}
        </div>
      )}
      {phase === 'menu' && <Menu onGuide={setGuideChar} guideOpen={guideChar !== null} />}
      {phase === 'playing' && paused && <PauseOverlay onGuide={() => setGuideChar(selection.p1)} />}
      {guideChar && <CharGuideModal initialChar={guideChar} onClose={() => setGuideChar(null)} />}
      {phase === 'ended' && winner && (
        <div className="pointer-events-auto absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/75 backdrop-blur-sm text-white p-4">
          <div className="text-center">
            <div className="text-xs font-bold tracking-[0.3em] text-yellow-300/80 uppercase">GAME SET</div>
            <div className="text-5xl sm:text-6xl font-black italic" style={{ color: PLAYER_COLORS[winner] }}>
              {winner.toUpperCase()} · {ui[winner].name} WINS!
            </div>
          </div>

          {/* 2~8 人賽後戰報統計表 */}
          <div className="w-full max-w-2xl rounded-2xl bg-white/10 border border-white/15 p-4 text-xs shadow-xl">
            <div className="grid grid-cols-6 border-b border-white/10 pb-2 font-black text-white/60 text-center">
              <span className="col-span-2 text-left">選手 / 角色</span>
              <span>剩餘命</span>
              <span>擊墜數</span>
              <span>輸出%</span>
              <span>最高連段</span>
            </div>
            <div className="divide-y divide-white/10">
              {rankedIds.map((id) => {
                const u = ui[id]
                const isWin = id === winner
                return (
                  <div key={id} className={`grid grid-cols-6 items-center py-1.5 text-center font-mono ${isWin ? 'bg-yellow-400/10 font-bold' : ''}`}>
                    <div className="col-span-2 flex items-center gap-2 text-left font-sans">
                      <span className="rounded px-1.5 py-0.5 text-[10px] font-black text-black" style={{ backgroundColor: PLAYER_COLORS[id] }}>
                        {id.toUpperCase()}
                      </span>
                      <span className="truncate font-bold">{u.name}</span>
                      {isWin && <span className="text-yellow-300">👑</span>}
                    </div>
                    <span>{u.stocks}</span>
                    <span className="text-yellow-300 font-bold">{u.stats.kos}</span>
                    <span>{u.stats.damageDealt}%</span>
                    <span>{u.stats.maxCombo}</span>
                  </div>
                )
              })}
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
