import { useEffect, useRef, useState } from 'react'
import { pollPause, captureAxis, captureBase, captureButton, clearMap, connectedPadCount, describePad, getPad, loadMap, readMenuPad, saveMap, type PadMap } from '../game/input'
import { CHARACTERS, CHARACTER_IDS } from '../game/characters'
import { clearEntities } from '../game/runtime'
import { resetSimStage } from '../game/sim'
import { getSkill } from '../game/skills'
import { TETROMINOES, getReadyLines, getTetroBoard } from '../game/skills/tetroSkills'
import { TIER_COLORS, getSteveInv } from '../game/skills/steveBlocks'
import { getMechanic } from '../game/mechanics'
import { STAGES, STAGE_IDS, resolveStage, type StageForm, type StageId } from '../game/stages'
import { useGameStore } from '../game/store'
import { ALL_FIGHTER_IDS, PLAYER_COLORS, type Btn, type CharacterId, type FighterId, type UiFighter } from '../game/types'
import { sfx, useAudioStore } from '../game/audio'
import { CharacterPortrait, SHORT_NAMES } from './CharacterPortrait'
import { StagePreview } from './StagePreview'
import { TouchControls } from './TouchControls'
import { broadcastLobby, broadcastStart, hostRoom, joinRoom, leaveRoom, sendPick, useNetStore } from '../game/net'
import { resizeAvatarFile, useProfileStore } from '../game/profile'

const damageColor = (d: number) => {
  const t = Math.min(1, d / 200)
  return `rgb(255, ${Math.round(255 - t * 200)}, ${Math.round(255 - t * 230)})`
}
const zhNameOf = (full: string) =>
  full.replace(/^(?:[A-Za-z0-9.'&!\- ]+\s+)+/, '').replace(/\s+[A-Za-z0-9.'&!\- ]+$/, '').trim() || full
const SLOT_KEYS: Partial<Record<FighterId, Record<string, string>>> = {
  p1: { attack: 'J', skill1: 'K', skill2: 'L', ult: 'I' },
  p2: { attack: '.', skill1: '/', skill2: "'", ult: ';' },
}

function PadSlotIcon({ kind, slot }: { kind: 'xbox' | 'ps' | 'nintendo' | 'generic'; slot: string }) {
  if (slot === 'skill2') {
    return (
      <span className="inline-flex items-center gap-0.5 rounded-full bg-blue-500/25 border border-blue-400/70 px-1.5 py-0 text-[9px] font-black text-blue-200" title="推右搖桿">
        🕹️R
      </span>
    )
  }
  if (slot === 'ult') {
    return (
      <span className="inline-flex items-center justify-center rounded-full bg-purple-500/30 border border-purple-300/70 px-1.5 py-0 text-[9px] font-black text-purple-200" title="按下 L3/R3（或持有大招球時按特招）">
        R3
      </span>
    )
  }
  if (slot === 'attack') {
    const label = kind === 'ps' ? '○' : kind === 'nintendo' ? 'A' : 'B'
    return (
      <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-600/80 border border-red-300 text-[9px] font-black text-white shadow-sm">
        {label}
      </span>
    )
  }
  // skill1
  const label = kind === 'ps' ? '✕' : kind === 'nintendo' ? 'B' : 'A'
  return (
    <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-amber-500/85 border border-yellow-200 text-[9px] font-black text-black shadow-sm">
      {label}
    </span>
  )
}

function Card({ id, u, compact = false }: { id: FighterId; u: UiFighter; compact?: boolean }) {
  const charId = useGameStore((s) => s.selection[id])
  if (!u) return null
  const fullCharName = CHARACTERS[charId]?.name ?? charId.toUpperCase()
  const charName = (fullCharName.match(/^[A-Za-z0-9.'&!\- ]+/)?.[0] ?? fullCharName).trim()
  const isTetro = charId === 'tetro'
  const tb = isTetro ? getTetroBoard(id) : null
  const steveInv = charId === 'steve' ? getSteveInv(id) : null
  const mech = getMechanic(id)
  const readyLines = isTetro ? getReadyLines(id) : 0
  const clearBanner = tb?.lastClear && performance.now() < tb.lastClear.until ? tb.lastClear : null
  const pColor = PLAYER_COLORS[id]
  const eliminated = u.stocks <= 0

  return (
    <div className={`relative rounded-xl bg-black/60 text-white backdrop-blur border border-white/10 transition-all duration-500 ${eliminated ? 'opacity-30 grayscale' : ''} ${compact ? 'w-44 p-2' : 'w-72 p-3'}`}>
      {clearBanner && (
        <div
          className="-top-7 right-2 absolute animate-pulse rounded-full px-2.5 py-0.5 text-[11px] font-black text-black shadow-lg"
          style={{ backgroundColor: clearBanner.color }}
        >
          {clearBanner.text}
        </div>
      )}
      <div className="flex items-baseline justify-between gap-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          {useGameStore.getState().cpu[id] === 0 && id === (useNetStore.getState().mySlot ?? 'p1') && useProfileStore.getState().avatarDataUrl && (
            <img src={useProfileStore.getState().avatarDataUrl!} alt="" className="h-4 w-4 rounded-full object-cover border border-white/40 shrink-0" />
          )}
          <span className={`font-bold tracking-wide truncate ${compact ? 'text-[11px]' : 'text-sm'}`} style={{ color: pColor }}>
            {id.toUpperCase()} · {useGameStore.getState().cpu[id] > 0 ? '電腦' : id === (useNetStore.getState().mySlot ?? 'p1') ? useProfileStore.getState().nickname : u.name}
          </span>
        </div>
        <span className={`shrink-0 truncate font-bold text-white/75 ${compact ? 'max-w-[74px] text-[9px]' : 'max-w-[115px] text-[11px]'}`} title={charName}>
          {charName}
        </span>
      </div>
      <div className="mt-1 flex items-end justify-between gap-2">
        <div className="flex items-end gap-2">
          <div className={`${compact ? 'h-9 w-9' : 'h-12 w-12'} shrink-0 overflow-hidden rounded-lg border border-white/25 bg-black/50 shadow-inner`}>
            <CharacterPortrait id={charId} className="h-full w-full" />
          </div>
          <span className={`${compact ? 'text-3xl' : 'text-5xl'} font-black italic tracking-tight leading-none tabular-nums`} style={{ color: eliminated ? '#94a3b8' : damageColor(u.damage), textShadow: '0 2px 0 #000' }}>
            {eliminated ? <span className={compact ? 'text-lg' : 'text-2xl'}>OUT</span> : <>{u.damage}<span className={compact ? 'text-lg' : 'text-2xl'}>%</span></>}
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
      {steveInv && (
        <div className="mt-1 flex items-center justify-between rounded bg-white/10 px-1.5 py-0.5 text-[10px]">
          <span className="font-bold text-emerald-300">⛏️ 方塊：{steveInv.count}/16</span>
          <span className="font-bold" style={{ color: TIER_COLORS[steveInv.tier].top }}>
            {TIER_COLORS[steveInv.tier].label}
          </span>
        </div>
      )}
      {mech && (
        <div className={`mt-1.5 space-y-1 rounded-lg bg-white/10 px-2 py-1 ${compact ? 'text-[11px]' : 'text-sm'}`}>
          <div className="flex items-center justify-between font-black tracking-wide">
            <span style={{ color: mech.color }}>{mech.label}</span>
            <span className={`font-mono ${mech.gauge >= 100 || mech.activeMs > 0 ? 'text-yellow-300 animate-pulse' : 'text-white/90'}`}>
              {mech.activeMs > 0 ? `覺醒 ${(mech.activeMs / 1000).toFixed(1)}s` : mech.gauge >= 100 ? 'MAX!!' : `${Math.round(mech.gauge)}%`}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/50">
            <div className="h-full transition-all duration-100" style={{ width: `${mech.gauge}%`, backgroundColor: mech.color }} />
          </div>
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
      const target = e.target as HTMLElement | null
      const tag = target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable) return
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
  { label: '按下「抓人」鍵', kind: 'button', btn: 'grab' },
]

/** 手把按鍵綁定精靈：適用任何手把（含非標準映射的單支 Joy-Con） */
function PadWizard({ id, onClose }: { id: FighterId; onClose: () => void }) {
  const [step, setStep] = useState(0)
  const [padFound, setPadFound] = useState(() => !!getPad(id))
  useEffect(() => {
    const map: PadMap = { btn: {} }
    let i = 0
    let base: ReturnType<typeof captureBase> | null = getPad(id) ? captureBase(id) : null
    let wait = performance.now() + 350
    let raf = 0
    const loop = () => {
      const p = getPad(id)
      if (!p) {
        setPadFound(false)
        base = null
        raf = requestAnimationFrame(loop)
        return
      }
      if (!base) {
        setPadFound(true)
        base = captureBase(id)
        wait = performance.now() + 350
        raf = requestAnimationFrame(loop)
        return
      }
      const st = STEPS[i]
      if (performance.now() > wait) {
        let ok = false
        if (st.kind === 'axisX') { const r = captureAxis(id, base); if (r) { map.ax = r; ok = true } }
        else if (st.kind === 'axisY') { const r = captureAxis(id, base); if (r) { map.ay = r; ok = true } }
        else { const r = captureButton(id, base); if (r !== null) { map.btn![st.btn!] = r; ok = true } }
        if (ok) {
          i++
          if (i >= STEPS.length) { saveMap(p, map); onClose(); return }
          setStep(i); base = captureBase(id); wait = performance.now() + 400
        }
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [id, onClose])
  return (
    <div className="pointer-events-auto absolute inset-0 z-40 flex flex-col items-center justify-center gap-4 bg-black/85 text-white">
      <div className="text-lg font-bold">{id.toUpperCase()} 手把設定 {padFound ? '' : '（找不到手把，請先接上並按任一鍵）'}</div>
      <div className="text-3xl font-black text-yellow-300">{STEPS[step].label}</div>
      <div className="text-sm text-white/60">{step + 1} / {STEPS.length}</div>
      <div className="flex gap-3">
        <button className="rounded bg-white/20 px-4 py-1 text-sm" onClick={onClose}>取消</button>
        <button className="rounded bg-red-500/70 px-4 py-1 text-sm" onClick={() => { const p = getPad(id); if (p) clearMap(p); onClose() }}>還原預設配置</button>
      </div>
    </div>
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

function CpuPicker({ id }: { id: FighterId }) {
  const lv = useGameStore((s) => s.cpu[id])
  const setCpu = useGameStore((s) => s.setCpu)
  const lvColor = lv >= 7 ? 'text-rose-300' : lv >= 4 ? 'text-yellow-300' : 'text-emerald-300'
  return (
    <div className="mt-1.5 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setCpu(id, 0)}
        className={`rounded px-2 py-1 text-[10px] font-bold transition ${lv === 0 ? 'bg-yellow-300 text-black' : 'bg-white/15 text-white/70 hover:bg-white/25'}`}
      >
        玩家
      </button>
      <button
        type="button"
        onClick={() => setCpu(id, lv > 0 ? lv : 5)}
        className={`rounded px-2 py-1 text-[10px] font-bold transition ${lv > 0 ? 'bg-cyan-400 text-black' : 'bg-white/15 text-white/70 hover:bg-white/25'}`}
      >
        CPU
      </button>
      {lv > 0 && (
        <div className="ml-auto flex items-center gap-1 rounded bg-black/40 px-1 py-0.5 border border-white/15">
          <button
            type="button"
            disabled={lv <= 1}
            onClick={() => setCpu(id, lv - 1)}
            className="h-5 w-5 rounded bg-white/15 text-[11px] font-black hover:bg-white/25 disabled:opacity-30"
          >
            －
          </button>
          <span className={`min-w-[2.4rem] text-center text-[10px] font-black font-mono ${lvColor}`}>
            Lv.{lv}
          </span>
          <button
            type="button"
            disabled={lv >= 9}
            onClick={() => setCpu(id, lv + 1)}
            className="h-5 w-5 rounded bg-white/15 text-[11px] font-black hover:bg-white/25 disabled:opacity-30"
          >
            ＋
          </button>
        </div>
      )}
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
  const activeStage = resolveStage(stageId, stageForm)
  const randomStage = useGameStore((s) => s.randomStage)
  const btnRefs = useRef<Partial<Record<StageId | 'random', HTMLButtonElement>>>({})

  useEffect(() => {
    const key: StageId | 'random' = randomStage ? 'random' : stageId
    btnRefs.current[key]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [stageId, randomStage])
  const stageCards: (StageId | 'random')[] = ['random', ...STAGE_IDS]
  const pickRandomStage = () => {
    const next = STAGE_IDS[Math.floor(Math.random() * STAGE_IDS.length)] ?? STAGE_IDS[0]
    selectStage(next, true)
    sfx('ui')
  }

  return (
    <div className="flex flex-col lg:flex-row items-stretch justify-center gap-4 max-w-6xl w-full px-3">
      {/* 左側：Smash Ultimate 風格當前地圖焦點預覽卡 ＋ 型態切換 */}
      <div className="w-full lg:w-80 shrink-0 rounded-2xl border-2 border-yellow-300/70 bg-black/65 p-3.5 backdrop-blur-md shadow-2xl flex flex-col justify-between gap-2.5">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[10px] font-black tracking-widest text-yellow-300 uppercase">
            <span>STAGE PREVIEW</span>
            {!randomStage && <span className="rounded bg-white/10 px-2 py-0.5 text-white/80">{activeStage.theme.subtitle}</span>}
          </div>
          <div className="overflow-hidden rounded-xl border-2 border-white/25 bg-black shadow-lg">
            <StagePreview id={randomStage ? 'random' : stageId} form={stageForm} className="w-full aspect-[2/1]" />
          </div>
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xl font-black text-white truncate">{randomStage ? 'RANDOM 隨機地圖' : activeStage.theme.name}</h2>
          </div>
          <p className="text-xs text-white/75 leading-relaxed">{randomStage ? '🎲 每次進入戰鬥都會從全部地圖中隨機抽出一張！' : activeStage.theme.desc}</p>
          {!randomStage && (activeStage.gimmick ? (
            <div className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-[11px] font-bold text-white/90">
              <span>⚡</span>
              <span className="text-white/60">專屬機關：</span>
              <span style={{ color: activeStage.gimmick.color }}>{activeStage.gimmick.name}</span>
            </div>
          ) : (
            <div className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold text-white/45">
              ⚡ 戰場化／終點化已關閉場地機關
            </div>
          ))}
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
                  ref={(el) => { if (el) btnRefs.current['random'] = el }}
                  type="button"
                  onClick={() => {
                    if (randomStage && onNext) { onNext(); sfx('ui') }
                    else pickRandomStage()
                  }}
                  onDoubleClick={() => onNext?.()}
                  className={`relative overflow-hidden border-[1.5px] border-black bg-slate-900 group cursor-pointer focus:outline-none transition-transform ${randomStage
                    ? 'ring-2 ring-inset ring-yellow-300 z-10 scale-[1.03]'
                    : 'opacity-85 hover:opacity-100 hover:ring-1 hover:ring-white/50'
                    }`}
                >
                  <StagePreview id="random" className="w-full aspect-[2/1] object-cover transition-transform duration-150 group-hover:scale-105" />
                  {randomStage && (
                    <span className="absolute top-1 left-1 rounded bg-yellow-300 px-1 py-0 text-[9px] font-black text-black shadow">
                      OK
                    </span>
                  )}
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent px-1.5 pb-1 pt-2 text-center">
                    <div className="text-xs font-black text-yellow-300 leading-none" style={NAME_STROKE}>RANDOM 隨機</div>
                  </div>
                </button>
              )
            }
            const st = STAGES[item]!
            const active = !randomStage && stageId === item
            return (
              <button
                key={item}
                ref={(el) => { if (el) btnRefs.current[item] = el }}
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
        className="relative max-w-4xl w-full max-h-[90vh] overflow-y-auto rounded-2xl bg-[#141929] border border-white/20 p-5 text-white shadow-2xl space-y-4"
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
          <div className="rounded-xl bg-white/5 p-3.5 space-y-2.5 border border-white/5">
            <div className="font-bold text-yellow-300 flex items-center gap-1.5">
              <span>⌨️</span> 鍵盤圖解配置（P1 / P2）
            </div>
            {/* 鍵盤視覺圖解 SVG */}
            <svg viewBox="0 0 360 128" className="w-full rounded-lg bg-[#0b1020] border border-white/10 p-1">
              <text x="12" y="16" fontSize="9" fontWeight="900" fill="#f87171">P1 左側移動 / 跳躍</text>
              {/* W A S D */}
              <rect x="44" y="24" width="26" height="24" rx="4" fill="#1e293b" stroke="#f87171" strokeWidth="1.5" />
              <text x="57" y="40" textAnchor="middle" fontSize="11" fontWeight="900" fill="#fff">W</text>
              <rect x="14" y="52" width="26" height="24" rx="4" fill="#1e293b" stroke="#f87171" strokeWidth="1.5" />
              <text x="27" y="68" textAnchor="middle" fontSize="11" fontWeight="900" fill="#fff">A</text>
              <rect x="44" y="52" width="26" height="24" rx="4" fill="#1e293b" stroke="#f87171" strokeWidth="1.5" />
              <text x="57" y="68" textAnchor="middle" fontSize="11" fontWeight="900" fill="#fff">S</text>
              <rect x="74" y="52" width="26" height="24" rx="4" fill="#1e293b" stroke="#f87171" strokeWidth="1.5" />
              <text x="87" y="68" textAnchor="middle" fontSize="11" fontWeight="900" fill="#fff">D</text>
              {/* Space / Shift */}
              <rect x="14" y="84" width="86" height="22" rx="4" fill="#1e293b" stroke="#94a3b8" strokeWidth="1.2" />
              <text x="57" y="99" textAnchor="middle" fontSize="9" fontWeight="800" fill="#cbd5e1">SPACE 跳躍</text>

              <text x="135" y="16" fontSize="9" fontWeight="900" fill="#fde047">P1 右側招式區</text>
              {/* I / O */}
              <rect x="150" y="24" width="32" height="26" rx="4" fill="#4c1d95" stroke="#c084fc" strokeWidth="1.5" />
              <text x="166" y="37" textAnchor="middle" fontSize="10" fontWeight="900" fill="#fff">I</text>
              <text x="166" y="46" textAnchor="middle" fontSize="7" fontWeight="700" fill="#e9d5ff">大招</text>
              <rect x="188" y="24" width="36" height="26" rx="4" fill="#064e3b" stroke="#34d399" strokeWidth="1.5" />
              <text x="206" y="37" textAnchor="middle" fontSize="10" fontWeight="900" fill="#fff">O</text>
              <text x="206" y="46" textAnchor="middle" fontSize="7" fontWeight="700" fill="#a7f3d0">防禦</text>
              {/* J K L */}
              <rect x="134" y="56" width="32" height="28" rx="4" fill="#7f1d1d" stroke="#f87171" strokeWidth="1.5" />
              <text x="150" y="70" textAnchor="middle" fontSize="11" fontWeight="900" fill="#fff">J</text>
              <text x="150" y="80" textAnchor="middle" fontSize="7" fontWeight="700" fill="#fecaca">普攻</text>
              <rect x="170" y="56" width="32" height="28" rx="4" fill="#78350f" stroke="#fbbf24" strokeWidth="1.5" />
              <text x="186" y="70" textAnchor="middle" fontSize="11" fontWeight="900" fill="#fff">K</text>
              <text x="186" y="80" textAnchor="middle" fontSize="7" fontWeight="700" fill="#fde68a">特招</text>
              <rect x="206" y="56" width="32" height="28" rx="4" fill="#1e3a8a" stroke="#60a5fa" strokeWidth="1.5" />
              <text x="222" y="70" textAnchor="middle" fontSize="11" fontWeight="900" fill="#fff">L</text>
              <text x="222" y="80" textAnchor="middle" fontSize="7" fontWeight="700" fill="#bfdbfe">技2</text>

              <text x="256" y="16" fontSize="9" fontWeight="900" fill="#60a5fa">P2 雙人對戰</text>
              <rect x="284" y="24" width="24" height="22" rx="4" fill="#1e293b" stroke="#60a5fa" strokeWidth="1.3" />
              <text x="296" y="39" textAnchor="middle" fontSize="10" fontWeight="900" fill="#fff">↑</text>
              <rect x="256" y="50" width="24" height="22" rx="4" fill="#1e293b" stroke="#60a5fa" strokeWidth="1.3" />
              <text x="268" y="65" textAnchor="middle" fontSize="10" fontWeight="900" fill="#fff">←</text>
              <rect x="284" y="50" width="24" height="22" rx="4" fill="#1e293b" stroke="#60a5fa" strokeWidth="1.3" />
              <text x="296" y="65" textAnchor="middle" fontSize="10" fontWeight="900" fill="#fff">↓</text>
              <rect x="312" y="50" width="24" height="22" rx="4" fill="#1e293b" stroke="#60a5fa" strokeWidth="1.3" />
              <text x="324" y="65" textAnchor="middle" fontSize="10" fontWeight="900" fill="#fff">→</text>
              <text x="296" y="90" textAnchor="middle" fontSize="8" fontWeight="700" fill="#93c5fd">攻 .  特 /  技2 &apos;  大 ;</text>
              <text x="296" y="103" textAnchor="middle" fontSize="8" fontWeight="700" fill="#a7f3d0">防禦：, 或 右Shift</text>
              <text x="180" y="120" textAnchor="middle" fontSize="8" fontWeight="700" fill="#94a3b8">小技巧：地面同時按 普攻(J) + 特招(K) = 蓄力重擊！</text>
            </svg>
            <div className="space-y-1 text-white/80 text-[11px] leading-relaxed">
              <div><strong className="text-red-400">P1：</strong>WASD 移動 / 跳躍（Space 亦可）· <strong>S</strong> 穿層板 / 快墜 · <strong>Shift / O</strong> 防禦閃避</div>
              <div><strong className="text-blue-400">P2：</strong>方向鍵移動（Enter 亦可跳）· <strong>. / &apos; ;</strong> 攻擊招式 · <strong>, / 右Shift</strong> 防禦</div>
            </div>
          </div>

          <div className="rounded-xl bg-white/5 p-3.5 space-y-2.5 border border-white/5">
            <div className="font-bold text-emerald-300 flex items-center gap-1.5">
              <span>🎮</span> 手把／搖桿圖解（大亂鬥佈局）
            </div>
            {/* 手把視覺圖解 SVG */}
            <svg viewBox="0 0 360 128" className="w-full rounded-lg bg-[#0b1020] border border-white/10 p-1">
              {/* 肩鍵 LT/LB & RT/RB */}
              <rect x="78" y="16" width="52" height="14" rx="4" fill="#064e3b" stroke="#34d399" strokeWidth="1.3" />
              <text x="104" y="26" textAnchor="middle" fontSize="8" fontWeight="900" fill="#a7f3d0">LB / LT 防禦</text>
              <rect x="230" y="16" width="52" height="14" rx="4" fill="#064e3b" stroke="#34d399" strokeWidth="1.3" />
              <text x="256" y="26" textAnchor="middle" fontSize="8" fontWeight="900" fill="#a7f3d0">RB / RT 防禦</text>

              {/* 手把本體輪廓 */}
              <path d="M90,34 L270,34 C294,34 310,60 302,102 C298,116 280,118 268,104 L244,82 L116,82 L92,104 C80,118 62,116 58,102 C50,60 66,34 90,34 Z" fill="#1e293b" stroke="#64748b" strokeWidth="2" />

              {/* 左搖桿 */}
              <circle cx="108" cy="58" r="14" fill="#0f172a" stroke="#f87171" strokeWidth="2" />
              <text x="108" y="61" textAnchor="middle" fontSize="8" fontWeight="900" fill="#fca5a5">L搖桿</text>
              <text x="42" y="56" textAnchor="middle" fontSize="8" fontWeight="800" fill="#fca5a5">移動/跳</text>
              <text x="42" y="67" textAnchor="middle" fontSize="7" fontWeight="700" fill="#94a3b8">下推穿板</text>

              {/* Start */}
              <rect x="170" y="48" width="20" height="8" rx="3" fill="#475569" />
              <text x="180" y="43" textAnchor="middle" fontSize="7" fontWeight="800" fill="#cbd5e1">START 暫停</text>

              {/* 右搖桿 */}
              <circle cx="216" cy="70" r="11" fill="#0f172a" stroke="#60a5fa" strokeWidth="1.8" />
              <text x="216" y="73" textAnchor="middle" fontSize="7" fontWeight="900" fill="#93c5fd">R技2</text>

              {/* ABXY 按鍵 */}
              <circle cx="256" cy="44" r="6.5" fill="#1e293b" stroke="#cbd5e1" strokeWidth="1.2" />
              <text x="256" y="47" textAnchor="middle" fontSize="7" fontWeight="900" fill="#fff">Y</text>
              <circle cx="241" cy="56" r="6.5" fill="#1e293b" stroke="#cbd5e1" strokeWidth="1.2" />
              <text x="241" y="59" textAnchor="middle" fontSize="7" fontWeight="900" fill="#fff">X</text>
              <circle cx="271" cy="56" r="6.5" fill="#7f1d1d" stroke="#f87171" strokeWidth="1.4" />
              <text x="271" y="59" textAnchor="middle" fontSize="7" fontWeight="900" fill="#fff">B</text>
              <circle cx="256" cy="68" r="6.5" fill="#78350f" stroke="#fbbf24" strokeWidth="1.4" />
              <text x="256" y="71" textAnchor="middle" fontSize="7" fontWeight="900" fill="#fff">A</text>

              {/* 右側標籤 */}
              <text x="326" y="44" textAnchor="middle" fontSize="7.5" fontWeight="800" fill="#e2e8f0">X/Y 跳躍</text>
              <text x="326" y="58" textAnchor="middle" fontSize="7.5" fontWeight="800" fill="#fca5a5">B/○ 普攻</text>
              <text x="326" y="72" textAnchor="middle" fontSize="7.5" fontWeight="800" fill="#fde047">A/✕ 特招</text>
              <text x="180" y="120" textAnchor="middle" fontSize="8" fontWeight="700" fill="#94a3b8">L3 / R3 按下搖桿 = 大招 · 持大招球時 A/✕ 直接施放</text>
            </svg>
            <div className="space-y-1 text-white/80 text-[11px] leading-relaxed">
              <div><strong className="text-emerald-300">LT / RT / LB / RB：</strong>防禦（左或右皆可），防禦中推左搖桿＝翻滾／閃避</div>
              <div><strong className="text-blue-300">右搖桿：</strong>推向任意方向立即施放 <strong>技能 2</strong>（支援推住蓄力）</div>
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
  usePadMenu(true, onClose, (_id, dx, dy) => {
    const step = dx || dy
    if (!step) return
    setCid((cur) => {
      const idx = CHARACTER_IDS.indexOf(cur)
      return CHARACTER_IDS[(idx + step + CHARACTER_IDS.length) % CHARACTER_IDS.length]
    })
  })
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape' || e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault()
        onClose()
      }
    }
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
                  主場地圖：{resolveStage(cid).theme.name}
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
  const [joinCode, setJoinCode] = useState('')
  const netRole = useNetStore((s) => s.role)
  const roomCode = useNetStore((s) => s.roomCode)
  const mySlot = useNetStore((s) => s.mySlot)
  const guests = useNetStore((s) => s.guests)
  const netErr = useNetStore((s) => s.error)
  const playerCount = useGameStore((s) => s.playerCount)
  const setPlayerCount = useGameStore((s) => s.setPlayerCount)
  const stockCount = useGameStore((s) => s.stockCount)
  const setStockCount = useGameStore((s) => s.setStockCount)
  const selection = useGameStore((s) => s.selection)
  const randomSlots = useGameStore((s) => s.randomSlots)
  const setPaused = useGameStore((s) => s.setPaused)
  const select = useGameStore((s) => s.select)
  const stageId = useGameStore((s) => s.stageId)
  const selectStage = useGameStore((s) => s.selectStage)
  const start = useGameStore((s) => s.startMatch)

  const activeIds = ALL_FIGHTER_IDS.slice(0, playerCount)
  const canEditSlot = (id: FighterId) =>
    netRole === 'offline' ? true : netRole === 'guest' ? id === (mySlot ?? 'p2') : !guests.includes(id)
  const safePicker: FighterId =
    netRole === 'guest'
      ? (mySlot ?? 'p2')
      : activeIds.includes(activePicker) && canEditSlot(activePicker)
        ? activePicker
        : 'p1'
  const currentStage = resolveStage(stageId)
  const charBtnRefs = useRef<Partial<Record<CharacterId | 'random', HTMLButtonElement>>>({})

  useEffect(() => {
    if (step !== 'char') return
    const key: CharacterId | 'random' = randomSlots[safePicker] ? 'random' : selection[safePicker]
    charBtnRefs.current[key]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [step, safePicker, selection, randomSlots])

  usePadMenu(
    wizard === null && !showHelp && !guideOpen,
    () => {
      if (step === 'stage') { sfx('ui'); setStep('char') }
      else if (netRole !== 'guest') { clearEntities(); useGameStore.getState().startMatch(); resetSimStage(); broadcastStart() }
    },
    (id, dx, dy) => {
      if (step === 'stage') {
        if (netRole === 'guest') return
        const st = useGameStore.getState()
        const curItem: StageId | 'random' = st.randomStage ? 'random' : st.stageId
        const nextItem = stepListGrid(['random', ...STAGE_IDS] as (StageId | 'random')[], curItem, dx, dy, 6)
        if (nextItem === 'random') selectStage(STAGE_IDS[0], true)
        else selectStage(nextItem, false)
      } else {
        const target = netRole === 'guest' ? safePicker : id
        if (!canEditSlot(target)) return
        const st = useGameStore.getState()
        const curItem: CharacterId | 'random' = st.randomSlots[target] ? 'random' : st.selection[target]
        const nextItem = stepListGrid(['random', ...CHARACTER_IDS] as (CharacterId | 'random')[], curItem, dx, dy, 10)
        if (nextItem === 'random') {
          select(target, st.selection[target], true)
        } else {
          select(target, nextItem, false)
          if (netRole === 'guest') sendPick(nextItem)
          else if (netRole === 'host') setTimeout(broadcastLobby, 0)
        }
      }
    },
  )

  useEffect(() => {
    if (wizard !== null || showHelp || guideOpen) return
    const onKey = (e: KeyboardEvent) => {
      const target = (e.target as HTMLElement | null) ?? (document.activeElement as HTMLElement | null)
      const tag = target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable) return
      const code = e.code
      let dx = 0, dy = 0
      if (code === 'ArrowLeft' || code === 'KeyA') dx = -1
      else if (code === 'ArrowRight' || code === 'KeyD') dx = 1
      else if (code === 'ArrowUp' || code === 'KeyW') dy = -1
      else if (code === 'ArrowDown' || code === 'KeyS') dy = 1

      if (dx !== 0 || dy !== 0) {
        e.preventDefault()
        sfx('ui')
        if (step === 'stage') {
          if (netRole === 'guest') return
          const st = useGameStore.getState()
          const curItem: StageId | 'random' = st.randomStage ? 'random' : st.stageId
          const nextItem = stepListGrid(['random', ...STAGE_IDS] as (StageId | 'random')[], curItem, dx, dy, 6)
          if (nextItem === 'random') selectStage(STAGE_IDS[0], true)
          else selectStage(nextItem, false)
        } else {
          const st = useGameStore.getState()
          const curItem: CharacterId | 'random' = st.randomSlots[safePicker] ? 'random' : st.selection[safePicker]
          const nextItem = stepListGrid(['random', ...CHARACTER_IDS] as (CharacterId | 'random')[], curItem, dx, dy, 10)
          if (nextItem === 'random') {
            select(safePicker, st.selection[safePicker], true)
          } else {
            select(safePicker, nextItem, false)
            if (netRole === 'guest') sendPick(nextItem)
            else if (netRole === 'host') setTimeout(broadcastLobby, 0)
          }
        }
        return
      }

      if (code === 'Enter' || code === 'Space' || code === 'KeyJ') {
        e.preventDefault()
        sfx('ui')
        if (step === 'stage') setStep('char')
        else if (netRole !== 'guest') { clearEntities(); useGameStore.getState().startMatch(); resetSimStage(); broadcastStart() }
      } else if (code === 'Escape' || code === 'Backspace') {
        if (step === 'char') { e.preventDefault(); sfx('ui'); setStep('stage') }
      } else if (code === 'KeyQ' || code === 'KeyE') {
        e.preventDefault()
        sfx('ui')
        if (step === 'stage') {
          const forms: StageForm[] = ['normal', 'battlefield', 'omega']
          const curF = useGameStore.getState().stageForm
          const nextF = forms[(forms.indexOf(curF) + (code === 'KeyE' ? 1 : 2)) % forms.length]
          useGameStore.getState().setStageForm(nextF)
        } else {
          setPlayerCount(playerCount + (code === 'KeyE' ? 1 : -1))
        }
      } else if (code === 'Tab' && step === 'char') {
        e.preventDefault()
        const editable = activeIds.filter(canEditSlot)
        if (editable.length <= 1) return
        sfx('ui')
        const idx = editable.indexOf(safePicker)
        setActivePicker(editable[(idx + 1) % editable.length])
      } else if (code === 'KeyR') {
        e.preventDefault()
        sfx('ui')
        if (step === 'stage') {
          const pool = STAGE_IDS.filter((id) => id !== stageId)
          selectStage(pool[Math.floor(Math.random() * pool.length)] ?? STAGE_IDS[0])
        } else {
          select(safePicker, selection[safePicker], true)
        }
      } else if (code === 'KeyC' && step === 'char') {
        e.preventDefault()
        sfx('ui')
        const target: FighterId = safePicker === 'p1' ? 'p2' : safePicker
        const curLv = useGameStore.getState().cpu[target]
        useGameStore.getState().setCpu(target, (curLv + 1) % 10)
      } else if (code === 'KeyG' && step === 'char') {
        e.preventDefault()
        onGuide(selection[safePicker])
      } else if (code === 'KeyH') {
        e.preventDefault()
        setShowHelp(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [wizard, showHelp, guideOpen, step, safePicker, activeIds, playerCount, stageId, selection, selectStage, select, setPlayerCount, onGuide])

  const pickChar = (rawTarget: FighterId, item: CharacterId | 'random') => {
    const target = netRole === 'guest' ? safePicker : rawTarget
    if (!canEditSlot(target)) return
    const isRand = item === 'random'
    const chosen: CharacterId = isRand
      ? (CHARACTER_IDS[Math.floor(Math.random() * CHARACTER_IDS.length)] ?? CHARACTER_IDS[0])
      : item
    select(target, chosen, isRand)
    if (netRole === 'guest') sendPick(chosen)
    else if (netRole === 'host') setTimeout(broadcastLobby, 0)
    sfx('ui')
  }

  // 每 10 格自動換行
  const rosterGrid: (CharacterId | 'random')[] = ['random', ...CHARACTER_IDS]
  const rosterRows = Array.from(
    { length: Math.ceil(rosterGrid.length / 10) },
    (_, i) => rosterGrid.slice(i * 10, (i + 1) * 10),
  )

  const renderCell = (item: CharacterId | 'random') => {
    const isRand = item === 'random'
    const owners = isRand
      ? activeIds.filter((pid) => randomSlots[pid])
      : activeIds.filter((pid) => !randomSlots[pid] && selection[pid] === item)
    const firstOwner = owners[0]
    const zhSub = isRand ? '隨機' : CHARACTERS[item].name.replace(/^(?:[A-Z0-9-]+\s+)+/, '').replace(/\s+[A-Z0-9-]+$/, '')

    return (
      <button
        key={item}
        ref={(el) => { if (el) charBtnRefs.current[item] = el }}
        type="button"
        onClick={() => pickChar(safePicker, item)}
        onContextMenu={(e) => { e.preventDefault(); if (netRole === 'offline') pickChar('p2', item); else pickChar(safePicker, item) }}
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
        <h1 className="text-3xl sm:text-5xl font-black italic tracking-tight">Smash<span className="text-yellow-300">!!!</span></h1>
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
            <div className="flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 shadow">
              <button
                type="button"
                disabled={stockCount <= 1}
                onClick={() => { sfx('ui'); setStockCount(stockCount - 1) }}
                title="減少生命數（最少 1 命）"
                className="h-7 w-7 rounded-full bg-white/15 text-base font-black hover:bg-white/25 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                －
              </button>
              <span className="min-w-[4.5rem] text-center text-xs font-black text-rose-300">
                ❤️ {stockCount} 條命
              </span>
              <button
                type="button"
                disabled={stockCount >= 9}
                onClick={() => { sfx('ui'); setStockCount(stockCount + 1) }}
                title="增加生命數（最多 9 命）"
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

      <div className="flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-cyan-400/30 bg-black/55 px-3 py-1.5 text-xs">
        {netRole === 'offline' ? (
          <>
            <span className="font-black text-cyan-300">🌐 多人連線對戰</span>
            <button
              type="button"
              onClick={() => { sfx('ui'); hostRoom() }}
              className="rounded-lg bg-cyan-400 px-3 py-1 font-black text-black hover:bg-cyan-300 transition"
            >
              開房當房主 (Host)
            </button>
            <input
              type="text"
              maxLength={4}
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                e.stopPropagation()
                if (e.key === 'Enter' && joinCode.trim().length >= 4) {
                  sfx('ui')
                  joinRoom(joinCode)
                  setStep('char')
                }
              }}
              placeholder="輸入4碼房號"
              className="w-24 select-text rounded-lg border border-white/20 bg-white/10 px-2 py-1 text-center font-mono font-bold uppercase text-white placeholder:text-white/40 focus:border-cyan-300 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => { if (joinCode.trim().length >= 4) { sfx('ui'); joinRoom(joinCode); setStep('char') } }}
              className="rounded-lg bg-emerald-400 px-3 py-1 font-black text-black hover:bg-emerald-300 transition"
            >
              加入房間
            </button>
            {netErr && <span className="text-red-400 font-bold">{netErr}</span>}
          </>
        ) : netRole === 'host' ? (
          <>
            <span className="font-black text-yellow-300">🏠 房號：<span className="rounded bg-yellow-300/20 px-2 py-0.5 font-mono text-sm tracking-widest">{roomCode}</span></span>
            <span className="text-emerald-300 font-bold">
              已連線：P1(你){guests.length > 0 ? guests.map((g) => ` · ${g.toUpperCase()}`).join('') : '（等待朋友輸入房號加入...）'}
            </span>
            <button type="button" onClick={leaveRoom} className="rounded bg-white/15 px-2.5 py-0.5 text-[11px] hover:bg-red-500/40">
              關閉房間
            </button>
          </>
        ) : (
          <>
            <span className="font-black text-emerald-300">🌐 已加入房間 <span className="font-mono text-yellow-300">{roomCode}</span>｜你是 {mySlot?.toUpperCase()}（請選角，等待房主按 START）</span>
            <button type="button" onClick={leaveRoom} className="rounded bg-white/15 px-2.5 py-0.5 text-[11px] hover:bg-red-500/40">
              離開房間
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
          <div className="text-[11px] font-semibold text-yellow-200/80 bg-black/50 px-3 py-1 rounded-full border border-yellow-300/20">
            ⌨️ 純鍵盤操作：WASD/方向鍵 移動 · Q/E 切換型態 · R 隨機 · Enter/J 下一步 · H 操作指南
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
              const isRand = randomSlots[id]
              const c = CHARACTERS[selection[id]]
              const editable = canEditSlot(id)
              const isActive = safePicker === id
              const pCol = PLAYER_COLORS[id]
              const compact = playerCount > 2
              return (
                <div
                  key={id}
                  onClick={() => { if (editable) setActivePicker(id) }}
                  style={isActive ? { borderColor: pCol, boxShadow: `0 0 0 1px ${pCol}66` } : undefined}
                  className={`${compact ? 'w-full p-2' : 'w-[21rem] p-2.5'} rounded-xl border backdrop-blur-sm transition-all ${editable ? 'cursor-pointer' : 'cursor-default'} ${isActive ? 'bg-white/15' : 'border-white/15 bg-white/10 hover:border-white/30 opacity-90'
                    }`}
                >
                  <div className="mb-1 flex items-center justify-between gap-1">
                    <span className="text-xs font-black tracking-wider" style={{ color: pCol }}>
                      {id.toUpperCase()}
                    </span>
                    <div className="flex items-center gap-1">
                      {!isRand && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); sfx('ui'); onGuide(selection[id]) }}
                          className="rounded-full bg-cyan-400/20 border border-cyan-300/35 px-2 py-0.5 text-[10px] font-bold text-cyan-200 hover:bg-cyan-400/35"
                        >
                          🎓 教學
                        </button>
                      )}
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${isActive ? 'bg-yellow-300 text-black' : editable ? 'bg-white/10 text-white/60' : 'bg-cyan-500/20 text-cyan-200'}`}>
                        {isActive ? '🎯 選角中' : editable ? '選我' : '🔒 其他玩家'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className={`${compact ? 'h-11 w-11' : 'h-14 w-14'} shrink-0 overflow-hidden rounded-lg border border-white/25 bg-black shadow-md`}>
                      <CharacterPortrait id={isRand ? 'random' : selection[id]} className="h-full w-full" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className={`${compact ? 'text-xs' : 'text-sm'} font-black tracking-wide truncate`} style={{ color: isRand ? '#fde047' : c.color }}>
                        {isRand ? 'RANDOM 隨機' : c.name}
                      </div>
                      {(isRand || c.trait) && (
                        <div className={`mt-0.5 text-yellow-200/90 leading-snug ${compact ? 'text-[10px] line-clamp-1' : 'text-[11px] line-clamp-2'}`}>
                          {isRand ? '🎲 每次進入戰鬥都會隨機重抽一位角色！' : c.trait}
                        </div>
                      )}
                    </div>
                  </div>

                  <CpuPicker id={id} />
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
                disabled={netRole === 'guest'}
                onClick={() => { clearEntities(); start(); resetSimStage(); broadcastStart() }}
                className="rounded-xl bg-yellow-300 px-12 py-2 text-xl font-black text-black hover:bg-yellow-200 active:scale-95 transition-all shadow-lg shadow-yellow-500/20 disabled:opacity-45 disabled:cursor-not-allowed"
              >
                {netRole === 'guest' ? '等待房主開始...' : 'START'}
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

/** 暫停輸入輪詢（Esc / P / 手把 Start 切換暫停） */
function usePauseControl(blocked: boolean) {
  useEffect(() => {
    let raf = 0
    const loop = () => {
      const { toggle } = pollPause()
      const s = useGameStore.getState()
      if (!blocked && s.phase === 'playing' && toggle) {
        s.setPaused(!s.paused)
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [blocked])
}

function PauseOverlay({ onGuide, active }: { onGuide: () => void; active: boolean }) {
  const setPaused = useGameStore((s) => s.setPaused)
  const start = useGameStore((s) => s.startMatch)
  const toMenu = useGameStore((s) => s.toMenu)
  const stageId = useGameStore((s) => s.stageId)
  const currentStage = resolveStage(stageId)
  const [focusIdx, setFocusIdx] = useState(0)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 160)
    return () => clearTimeout(t)
  }, [])

  const netRole = useNetStore((s) => s.role)
  const actions = [
    () => setPaused(false),
    onGuide,
    () => {
      if (netRole === 'guest') return
      clearEntities(); start(); resetSimStage(); broadcastStart()
    },
    toMenu,
  ]

  usePadMenu(active && ready, () => { sfx('ui'); actions[focusIdx]?.() }, (_id, dx, dy) => {
    const step = dx || dy
    if (!step) return
    setFocusIdx((i) => (i + step + actions.length) % actions.length)
  })

  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'Space' || e.code === 'KeyJ') {
        e.preventDefault()
        sfx('ui')
        actions[focusIdx]?.()
      } else if (e.code === 'KeyR') {
        e.preventDefault(); clearEntities(); start(); resetSimStage(); broadcastStart()
      } else if (e.code === 'KeyM') {
        e.preventDefault(); toMenu()
      } else if (e.code === 'KeyG') {
        e.preventDefault(); onGuide()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, focusIdx, start, toMenu, onGuide])

  const btnRing = (idx: number) =>
    focusIdx === idx ? 'ring-4 ring-yellow-300 scale-105 shadow-lg shadow-yellow-300/25' : 'opacity-85 hover:opacity-100'

  return (
    <div className="pointer-events-auto absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-black/70 text-white">
      <div className="text-5xl font-black tracking-widest">暫停</div>
      <div className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-1 text-xs text-white/80">
        <span>🏟️ {currentStage.theme.name}</span>
        <span className="text-yellow-300">· {currentStage.theme.tag}</span>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <button onClick={actions[0]} className={`rounded bg-yellow-300 px-6 py-2 font-bold text-black transition ${btnRing(0)}`}>繼續</button>
        <button onClick={actions[1]} className={`rounded bg-cyan-400/25 border border-cyan-300/40 px-5 py-2 font-bold text-cyan-200 hover:bg-cyan-400/35 transition ${btnRing(1)}`}>🎓 角色教學</button>
        <button onClick={actions[2]} className={`rounded bg-white/20 px-6 py-2 font-bold transition ${btnRing(2)}`}>重新開始</button>
        <button onClick={actions[3]} className={`rounded bg-white/20 px-6 py-2 font-bold transition ${btnRing(3)}`}>回選單</button>
      </div>
      <div className="text-xs text-white/60">WASD / 方向鍵 / 手把選擇項目 · Enter / Space / 手把 A 確認 · Esc / P / Start 繼續</div>
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

function ProfileModal({ onClose }: { onClose: () => void }) {
  const { uid, username, nickname, avatarDataUrl, wins, losses, totalKos, register, login, logout, setNickname, setAvatar, resetStats } = useProfileStore()
  const [nameInput, setNameInput] = useState(nickname)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [authUser, setAuthUser] = useState('')
  const [authPass, setAuthPass] = useState('')
  const [authNick, setAuthNick] = useState('')
  const [authErr, setAuthErr] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const total = wins + losses
  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0

  useEffect(() => {
    setNameInput(nickname)
  }, [nickname])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape') { e.preventDefault(); onClose() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  usePadMenu(true, () => {
    const tag = document.activeElement?.tagName
    if (tag !== 'INPUT' && tag !== 'TEXTAREA') onClose()
  })

  const handleCopyUid = () => {
    navigator.clipboard?.writeText(uid).catch(() => { })
    setCopied(true)
    setTimeout(() => setCopied(false), 1400)
  }

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setAuthErr(null)
    const res = authMode === 'login'
      ? login(authUser, authPass)
      : register(authUser, authPass, authNick)
    if (!res.ok) {
      setAuthErr(res.error)
      return
    }
    sfx('ui')
    setAuthUser('')
    setAuthPass('')
    setAuthNick('')
  }

  const handleUpload = async (file: File | null) => {
    if (!file) return
    try {
      setErr(null)
      const dataUrl = await resizeAvatarFile(file)
      setAvatar(dataUrl)
      sfx('ui')
    } catch (e: any) {
      setErr(e?.message ?? '上傳失敗')
    }
  }

  return (
    <div className="pointer-events-auto absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-md max-h-[92vh] overflow-y-auto rounded-2xl border border-white/20 bg-[#141929] p-5 text-white shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <span className="text-base font-black tracking-wider">👤 玩家帳號與戰績紀錄</span>
          <button type="button" onClick={onClose} className="rounded-lg bg-white/10 px-3 py-1 text-xs hover:bg-white/20">✕ 關閉</button>
        </div>

        {/* UID 顯示列 */}
        <div className="flex items-center justify-between rounded-xl border border-cyan-400/25 bg-cyan-950/30 px-3 py-2">
          <div className="flex items-center gap-2 text-xs">
            <span className="rounded bg-cyan-400/20 px-1.5 py-0.5 font-mono font-black text-cyan-300">UID</span>
            <span className="font-mono text-sm font-black tracking-wider text-white">{uid}</span>
            {username ? (
              <span className="text-[11px] text-emerald-300">· 帳號：{username}</span>
            ) : (
              <span className="text-[11px] text-amber-300">· 訪客模式</span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleCopyUid}
              className="rounded bg-white/10 px-2 py-0.5 text-[10px] font-bold hover:bg-white/20"
            >
              {copied ? '✓ 已複製' : '複製 UID'}
            </button>
            {username && (
              <button
                type="button"
                onClick={() => { sfx('ui'); logout() }}
                className="rounded bg-rose-500/25 px-2 py-0.5 text-[10px] font-bold text-rose-200 hover:bg-rose-500/40"
              >
                登出
              </button>
            )}
          </div>
        </div>

        {/* 訪客時顯示登入 / 註冊表單 */}
        {!username && (
          <form onSubmit={handleAuthSubmit} className="rounded-xl border border-white/15 bg-white/5 p-3 space-y-2.5">
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => { setAuthMode('login'); setAuthErr(null) }}
                className={`flex-1 rounded-lg py-1 text-xs font-black transition ${authMode === 'login' ? 'bg-yellow-300 text-black' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}
              >
                登入帳號
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode('register'); setAuthErr(null) }}
                className={`flex-1 rounded-lg py-1 text-xs font-black transition ${authMode === 'register' ? 'bg-cyan-400 text-black' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}
              >
                註冊新帳號 (取得 UID)
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="帳號 (3~16位英數字)"
                value={authUser}
                onChange={(e) => setAuthUser(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                maxLength={16}
                className="select-text rounded-lg border border-white/20 bg-black/40 px-2.5 py-1.5 text-xs text-white placeholder:text-white/40 focus:border-yellow-300 focus:outline-none"
              />
              <input
                type="password"
                placeholder="密碼 (至少4位)"
                value={authPass}
                onChange={(e) => setAuthPass(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                className="select-text rounded-lg border border-white/20 bg-black/40 px-2.5 py-1.5 text-xs text-white placeholder:text-white/40 focus:border-yellow-300 focus:outline-none"
              />
            </div>
            {authMode === 'register' && (
              <input
                type="text"
                placeholder="玩家暱稱（選填，預設同帳號）"
                value={authNick}
                onChange={(e) => setAuthNick(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                maxLength={16}
                className="w-full select-text rounded-lg border border-white/20 bg-black/40 px-2.5 py-1.5 text-xs text-white placeholder:text-white/40 focus:border-cyan-300 focus:outline-none"
              />
            )}
            {authErr && <div className="text-xs font-bold text-rose-400">{authErr}</div>}
            <button
              type="submit"
              className={`w-full rounded-lg py-1.5 text-xs font-black text-black transition ${authMode === 'login' ? 'bg-yellow-300 hover:bg-yellow-200' : 'bg-cyan-400 hover:bg-cyan-300'}`}
            >
              {authMode === 'login' ? '🔐 登入帳號' : '✨ 註冊並配發專屬 8 位數 UID'}
            </button>
          </form>
        )}

        <div className="flex items-center gap-4">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-2 border-yellow-300/80 bg-slate-900 flex items-center justify-center shadow-lg">
            {avatarDataUrl ? (
              <img src={avatarDataUrl} alt="avatar" className="h-full w-full object-cover" />
            ) : (
              <span className="text-3xl">👤</span>
            )}
          </div>
          <div className="flex-1 space-y-2">
            <label className="block text-[11px] font-bold text-white/60">玩家暱稱</label>
            <div className="flex gap-1.5">
              <input
                type="text"
                maxLength={16}
                value={nameInput}
                onChange={(e) => { setNameInput(e.target.value); setNickname(e.target.value) }}
                onKeyDown={(e) => e.stopPropagation()}
                className="flex-1 select-text rounded-lg border border-white/20 bg-white/10 px-2.5 py-1 text-sm font-bold text-white focus:border-yellow-300 focus:outline-none"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <label className="cursor-pointer rounded-lg bg-cyan-400 px-3 py-1 text-xs font-black text-black hover:bg-cyan-300 transition">
                📷 上傳頭貼
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUpload(e.target.files?.[0] ?? null)} />
              </label>
              {avatarDataUrl && (
                <button type="button" onClick={() => setAvatar(null)} className="rounded-lg bg-white/15 px-2.5 py-1 text-xs font-bold hover:bg-red-500/40">
                  移除頭貼
                </button>
              )}
            </div>
            {err && <div className="text-xs text-red-400">{err}</div>}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 rounded-xl border border-white/10 bg-white/5 p-3 text-center">
          <div>
            <div className="text-[10px] text-white/55">勝場</div>
            <div className="text-xl font-black text-emerald-400 font-mono">{wins}</div>
          </div>
          <div>
            <div className="text-[10px] text-white/55">敗場</div>
            <div className="text-xl font-black text-rose-400 font-mono">{losses}</div>
          </div>
          <div>
            <div className="text-[10px] text-white/55">勝率</div>
            <div className="text-xl font-black text-yellow-300 font-mono">{winRate}%</div>
          </div>
          <div>
            <div className="text-[10px] text-white/55">總擊墜</div>
            <div className="text-xl font-black text-cyan-300 font-mono">{totalKos}</div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <button type="button" onClick={resetStats} className="rounded-lg bg-white/10 px-3 py-1.5 text-xs text-white/60 hover:bg-red-500/30 hover:text-white">
            重置勝敗紀錄
          </button>
          <button type="button" onClick={onClose} className="rounded-lg bg-yellow-300 px-5 py-1.5 text-xs font-black text-black hover:bg-yellow-200">
            完成
          </button>
        </div>
      </div>
    </div>
  )
}

export function HUD() {
  const [guideChar, setGuideChar] = useState<CharacterId | null>(null)
  const [showProfile, setShowProfile] = useState(false)
  const [resultStep, setResultStep] = useState<'podium' | 'stats'>('podium')
  const [endFocusIdx, setEndFocusIdx] = useState(1)
  usePauseControl(guideChar !== null || showProfile)
  const profile = useProfileStore()
  const recordedRef = useRef(false)
  const [showTouch, setShowTouch] = useState(() => {
    if (typeof window === 'undefined' || connectedPadCount() > 0) return false
    return window.matchMedia?.('(pointer: coarse)').matches || window.innerWidth < 768
  })

  useEffect(() => {
    const onPad = () => {
      if (connectedPadCount() > 0) setShowTouch(false)
    }
    window.addEventListener('gamepadconnected', onPad)
    return () => window.removeEventListener('gamepadconnected', onPad)
  }, [])
  const paused = useGameStore((s) => s.paused)
  const ui = useGameStore((s) => s.ui)
  const phase = useGameStore((s) => s.phase)
  const winner = useGameStore((s) => s.winner)
  const playerCount = useGameStore((s) => s.playerCount)
  const selection = useGameStore((s) => s.selection)
  const randomSlots = useGameStore((s) => s.randomSlots)
  const setPaused = useGameStore((s) => s.setPaused)
  const ultCutin = useGameStore((s) => s.ultCutin)
  const fatalFlash = useGameStore((s) => s.fatalFlash)
  const countdown = useGameStore((s) => s.countdown)
  const gameFinish = useGameStore((s) => s.gameFinish)
  const start = useGameStore((s) => s.startMatch)
  const toMenu = useGameStore((s) => s.toMenu)

  useEffect(() => {
    if (phase === 'playing') {
      recordedRef.current = false
      setResultStep('podium')
    } else if (phase === 'ended' && winner && !recordedRef.current) {
      recordedRef.current = true
      const mySlot = useNetStore.getState().mySlot ?? 'p1'
      if (useGameStore.getState().cpu[mySlot] === 0) {
        const myStats = ui[mySlot]?.stats
        profile.recordMatch(winner === mySlot, myStats?.kos ?? 0)
      }
    }
  }, [phase, winner])
  const activeIds = ALL_FIGHTER_IDS.slice(0, playerCount)
  const rankedIds = [...activeIds].sort((a, b) => {
    if (a === winner) return -1
    if (b === winner) return 1
    return (ui[b]?.stats.kos ?? 0) - (ui[a]?.stats.kos ?? 0)
  })

  const [podiumFocusIdx, setPodiumFocusIdx] = useState(1)
  const podiumActions = [
    () => { sfx('ui'); setResultStep('stats'); setEndFocusIdx(1) },
    () => { clearEntities(); start(); resetSimStage(); broadcastStart() },
    toMenu,
  ]
  const endActions = [
    () => { sfx('ui'); setResultStep('podium'); setPodiumFocusIdx(1) },
    () => { clearEntities(); start(); resetSimStage(); broadcastStart() },
    toMenu,
  ]

  usePadMenu(
    phase === 'ended' && !guideChar && !showProfile,
    () => {
      sfx('ui')
      if (resultStep === 'podium') {
        podiumActions[podiumFocusIdx]?.()
      } else {
        endActions[endFocusIdx]?.()
      }
    },
    (_id, dx, dy) => {
      const step = dx || dy
      if (!step) return
      if (resultStep === 'podium') setPodiumFocusIdx((i) => (i + step + 3) % 3)
      else setEndFocusIdx((i) => (i + step + 3) % 3)
    },
  )

  useEffect(() => {
    if (guideChar || showProfile) return
    const onKey = (e: KeyboardEvent) => {
      const target = (e.target as HTMLElement | null) ?? (document.activeElement as HTMLElement | null)
      const tag = target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable) return
      if (phase === 'ended') {
        if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
          e.preventDefault(); sfx('ui')
          if (resultStep === 'podium') setPodiumFocusIdx((i) => (i + 2) % 3)
          else setEndFocusIdx((i) => (i + 2) % 3)
        } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
          e.preventDefault(); sfx('ui')
          if (resultStep === 'podium') setPodiumFocusIdx((i) => (i + 1) % 3)
          else setEndFocusIdx((i) => (i + 1) % 3)
        } else if (e.code === 'Enter' || e.code === 'Space' || e.code === 'KeyJ') {
          e.preventDefault()
          sfx('ui')
          if (resultStep === 'podium') {
            podiumActions[podiumFocusIdx]?.()
          } else {
            endActions[endFocusIdx]?.()
          }
        } else if (e.code === 'Escape' || e.code === 'KeyM') {
          e.preventDefault()
          toMenu()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, guideChar, showProfile, resultStep, podiumFocusIdx, endFocusIdx, start, toMenu])

  return (
    <div className="pointer-events-none absolute inset-0">
      {phase !== 'playing' && (
        <button
          type="button"
          onClick={() => { sfx('ui'); setShowProfile(true) }}
          className="pointer-events-auto absolute top-3 left-3 z-30 flex items-center gap-2 rounded-full border border-white/20 bg-black/65 pl-1.5 pr-3 py-1 text-xs text-white shadow-lg backdrop-blur hover:border-yellow-300/70 transition"
          title="點擊編輯玩家頭貼與查看勝敗紀錄"
        >
          <div className="h-7 w-7 overflow-hidden rounded-full border border-yellow-300/70 bg-slate-800 flex items-center justify-center shrink-0">
            {profile.avatarDataUrl ? (
              <img src={profile.avatarDataUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-sm">👤</span>
            )}
          </div>
          <div className="text-left leading-tight">
            <div className="flex items-center gap-1.5 font-black text-white">
              <span>{profile.nickname}</span>
              <span className="rounded bg-cyan-400/20 px-1 py-0.2 font-mono text-[9px] font-bold text-cyan-300">
                UID:{profile.uid}
              </span>
            </div>
            <div className="text-[10px] font-bold text-yellow-300">
              🏆 {profile.wins}勝 {profile.losses}敗
            </div>
          </div>
        </button>
      )}
      <div className="pointer-events-auto absolute top-3 right-3 z-30 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setShowTouch((v) => !v)}
          title="開啟或關閉手機觸控搖桿"
          className={`rounded-full px-2.5 py-1.5 text-[11px] font-bold backdrop-blur shadow-md ring-1 transition ${showTouch
            ? 'bg-yellow-300 text-black ring-yellow-200'
            : 'bg-black/60 text-white/75 ring-white/10 hover:text-white'
            }`}
        >
          📱 觸控
        </button>
        <AudioControl />
      </div>
      {phase !== 'menu' && (
        <div className={`absolute inset-x-0 flex flex-wrap gap-2 px-3 ${showTouch
          ? 'top-12 justify-center'
          : `bottom-3 ${playerCount <= 2 ? 'justify-between px-6' : 'justify-center'}`
          }`}>
          {activeIds.map((id) => (
            <Card key={id} id={id} u={ui[id]} compact={playerCount > 2 || showTouch} />
          ))}
        </div>
      )}
      {phase === 'playing' && !paused && showTouch && <TouchControls />}
      {phase === 'menu' && <Menu onGuide={setGuideChar} guideOpen={guideChar !== null} />}
      {phase === 'playing' && countdown && (
        <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center">
          <div
            key={countdown}
            className={`font-black italic tracking-tight drop-shadow-[0_6px_18px_rgba(0,0,0,0.95)] animate-bounce ${countdown === 'SMASH!!!'
              ? 'text-6xl sm:text-8xl text-yellow-300'
              : 'text-7xl sm:text-9xl text-white'
              }`}
            style={{ WebkitTextStroke: '3px #000' }}
          >
            {countdown}
          </div>
        </div>
      )}
      {phase === 'playing' && gameFinish && (
        <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center bg-black/20">
          <div
            className="text-7xl sm:text-9xl font-black italic tracking-tight text-white drop-shadow-[0_10px_28px_rgba(0,0,0,0.95)] animate-pulse"
            style={{ WebkitTextStroke: '4px #000', transform: 'skewX(-10deg) scale(1.06)' }}
          >
            GAME<span className="text-yellow-300">!!!</span>
          </div>
        </div>
      )}
      {phase === 'playing' && fatalFlash && (
        <div
          className="pointer-events-none absolute inset-0 z-40"
          style={{
            background: 'radial-gradient(circle at 50% 50%, rgba(239,68,68,0.35) 0%, rgba(185,28,28,0.65) 45%, rgba(0,0,0,0.88) 100%)',
            backgroundImage:
              'repeating-conic-gradient(from 0deg at 50% 50%, rgba(255,255,255,0.22) 0deg 2deg, transparent 2deg 14deg), radial-gradient(circle at 50% 50%, rgba(239,68,68,0.28) 0%, rgba(153,27,27,0.6) 52%, rgba(0,0,0,0.88) 100%)',
          }}
        />
      )}
      {phase === 'playing' && ultCutin && (
        <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center bg-black/55 backdrop-blur-[2px]">
          <div
            className="relative flex w-full items-center justify-center gap-5 overflow-hidden border-y-4 border-white py-4 shadow-2xl"
            style={{
              background: `linear-gradient(110deg, #020617 0%, ${ultCutin.color}cc 35%, #020617 100%)`,
              transform: 'skewY(-3deg)',
            }}
          >
            <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl border-4 border-white bg-black shadow-xl">
              <CharacterPortrait id={ultCutin.charId} className="h-full w-full" />
            </div>
            <div className="flex flex-col text-white drop-shadow-[0_3px_6px_rgba(0,0,0,0.9)]">
              <span className="text-xs font-black tracking-[0.35em] text-yellow-300 uppercase">FINAL SMASH!!</span>
              <span className="text-3xl sm:text-4xl font-black italic tracking-tight">{ultCutin.name}</span>
              <span className="mt-0.5 text-sm sm:text-base font-extrabold text-white/95">{ultCutin.skillName}</span>
            </div>
          </div>
        </div>
      )}
      {phase === 'playing' && paused && <PauseOverlay active={!guideChar && !showProfile} onGuide={() => setGuideChar(selection.p1)} />}
      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
      {guideChar && <CharGuideModal initialChar={guideChar} onClose={() => setGuideChar(null)} />}
      {phase === 'ended' && winner && resultStep === 'stats' && (
        <div
          className="pointer-events-auto absolute inset-0 z-30 flex flex-col items-center justify-center gap-5 p-4 text-white select-none overflow-y-auto"
          style={{ background: 'linear-gradient(160deg, #0f172a 0%, #1e293b 50%, #312e81 100%)' }}
        >
          <div className="flex flex-wrap items-center justify-center gap-4 max-w-6xl w-full">
            {rankedIds.map((id) => {
              const u = ui[id]
              const pCol = PLAYER_COLORS[id]
              const cpuLv = useGameStore.getState().cpu[id]
              const isWin = id === winner
              const rows = [
                { label: 'KOs 擊墜數', val: `${u.stats.kos}` },
                { label: '剩餘生命', val: `${u.stocks}` },
                { label: '最高連段', val: `${u.stats.maxCombo}` },
                { label: '造成傷害', val: `${u.stats.damageDealt}%` },
                { label: '承受傷害', val: `${u.stats.damageTaken}%` },
              ]
              return (
                <div
                  key={id}
                  className="w-56 sm:w-64 overflow-hidden rounded-xl border-2 border-black/80 bg-black/75 shadow-2xl flex flex-col"
                >
                  <div className="relative bg-black px-3 pt-2.5 pb-3 border-b-2" style={{ borderColor: pCol }}>
                    <div className="flex items-center justify-between">
                      <span className="text-xl font-black italic tracking-tight text-white truncate">
                        {SHORT_NAMES[selection[id]]}
                      </span>
                      {isWin && <span className="text-lg">👑</span>}
                    </div>
                    <div
                      className="mt-1 inline-flex items-center gap-2 px-2.5 py-0.5 text-xs font-black italic text-black"
                      style={{ backgroundColor: pCol, transform: 'skewX(-12deg)' }}
                    >
                      <span>{cpuLv > 0 ? `CPU Lv.${cpuLv}` : id.toUpperCase()}</span>
                      <span className="opacity-80 font-sans not-italic">{zhNameOf(u.name)}</span>
                    </div>
                  </div>
                  <div className="relative h-32 w-full overflow-hidden bg-black/60">
                    <CharacterPortrait id={selection[id]} className="h-full w-full object-cover" />
                    <div className="pointer-events-none absolute inset-0" style={{ boxShadow: `inset 0 0 28px ${pCol}55` }} />
                  </div>
                  <div className="divide-y divide-black/40 text-xs" style={{ backgroundColor: `${pCol}cc` }}>
                    {rows.map((r, i) => (
                      <div key={r.label} className={`flex items-center justify-between px-3 py-1.5 font-bold ${i % 2 === 0 ? 'bg-black/35' : 'bg-black/55'}`}>
                        <span className="text-white/85">{r.label}</span>
                        <span className="font-mono text-sm font-black text-white">{r.val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={endActions[0]}
              className={`rounded-xl bg-white/15 border border-white/25 px-6 py-2.5 text-sm font-bold hover:bg-white/25 transition ${endFocusIdx === 0 ? 'ring-4 ring-yellow-300 scale-105' : ''}`}
            >
              ← 返回勝者頒獎台
            </button>
            <button onClick={endActions[1]} className={`rounded-xl bg-yellow-300 px-8 py-2.5 text-base font-black text-black hover:bg-yellow-200 transition shadow-xl ${endFocusIdx === 1 ? 'ring-4 ring-white scale-105' : ''}`}>
              再來一場
            </button>
            <button onClick={endActions[2]} className={`rounded-xl bg-white/20 border border-white/30 px-7 py-2.5 text-base font-bold hover:bg-white/30 transition shadow-xl ${endFocusIdx === 2 ? 'ring-4 ring-yellow-300 scale-105' : ''}`}>
              回選單
            </button>
          </div>
        </div>
      )}
      {phase === 'ended' && winner && resultStep === 'podium' && (
        <div
          className="pointer-events-auto absolute inset-0 z-20 overflow-hidden text-white select-none"
          style={{
            background: 'linear-gradient(155deg, #1e3a8a 0%, #7c3aed 38%, #db2777 68%, #f59e0b 100%)',
          }}
        >
          {/* 底部大亂鬥經典斜切黑底 */}
          <div
            className="pointer-events-none absolute -bottom-16 -left-10 -right-10 h-44 bg-black/90 border-t-4 border-white/80"
            style={{ transform: 'rotate(-3.5deg)' }}
          />

          {/* 右側：第 1 名勝者巨型角色展示 */}
          <div className="pointer-events-none absolute right-[4%] bottom-10 top-6 flex items-center justify-center">
            <div
              className="h-64 w-64 sm:h-96 sm:w-96 overflow-hidden rounded-3xl border-4 border-white/80 shadow-[0_0_80px_rgba(253,224,71,0.45)]"
              style={{ transform: 'rotate(-2deg)' }}
            >
              <CharacterPortrait id={selection[winner]} className="h-full w-full" />
            </div>
          </div>

          {/* 左上：P1 三角旗幟 ＋ 桂冠「1」＋ 大字斜體角色名 */}
          <div className="relative z-10 flex flex-col justify-between h-full p-6 sm:p-10">
            <div className="max-w-xl space-y-2" style={{ transform: 'rotate(-3deg)' }}>
              <div className="flex items-center gap-4">
                <div
                  className="px-4 py-1 text-lg sm:text-xl font-black text-white shadow-lg"
                  style={{
                    backgroundColor: PLAYER_COLORS[winner],
                    clipPath: 'polygon(0 0, 100% 35%, 0 100%)',
                    paddingRight: '2.2rem',
                  }}
                >
                  {winner.toUpperCase()}
                </div>
                <div className="relative flex items-center justify-center">
                  <span className="text-4xl sm:text-5xl">🌿</span>
                  <span
                    className="mx-1 text-5xl sm:text-6xl font-black italic text-yellow-300"
                    style={{ WebkitTextStroke: '3px #000', textShadow: '0 4px 12px rgba(0,0,0,0.9)' }}
                  >
                    1
                  </span>
                  <span className="text-4xl sm:text-5xl scale-x-[-1]">🌿</span>
                </div>
              </div>

              <div
                className="text-5xl sm:text-7xl font-black italic tracking-tight uppercase leading-none"
                style={{ WebkitTextStroke: '3px #000', textShadow: '0 6px 0 #000, 0 12px 24px rgba(0,0,0,0.85)' }}
              >
                {SHORT_NAMES[selection[winner]]}
              </div>
              <div className="text-lg sm:text-xl font-black text-yellow-200 drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]">
                {zhNameOf(ui[winner].name)} · 擊墜 {ui[winner].stats.kos} · 輸出 {ui[winner].stats.damageDealt}%
              </div>
            </div>

            {/* 左下：第 2～N 名敗者卡片列 ＋ 右下：再來一場 / 回選單 */}
            <div className="flex flex-wrap items-end justify-between gap-4 pb-2">
              <div className="flex flex-wrap items-end gap-3">
                {rankedIds.slice(1).map((id, idx) => {
                  const rank = idx + 2
                  const u = ui[id]
                  return (
                    <div
                      key={id}
                      className="relative flex items-center gap-2.5 rounded-xl border-2 border-black bg-sky-600/90 pr-3 pl-2 py-1.5 shadow-xl"
                      style={{ transform: 'rotate(-2deg)' }}
                    >
                      <span
                        className="absolute -top-4 -left-2 text-3xl font-black italic text-white"
                        style={{ WebkitTextStroke: '2.5px #000' }}
                      >
                        {rank}
                      </span>
                      <div className="h-14 w-14 overflow-hidden rounded-lg border-2 border-black bg-black shrink-0">
                        <CharacterPortrait id={selection[id]} className="h-full w-full" />
                      </div>
                      <div className="text-xs leading-tight">
                        <div className="font-black text-white drop-shadow">{u.name}</div>
                        <div className="text-[10px] font-bold text-white/85 font-mono">
                          擊墜 {u.stats.kos} · {u.stats.damageDealt}%
                        </div>
                        <span
                          className="mt-1 inline-block rounded px-1.5 py-0 text-[10px] font-black text-black"
                          style={{ backgroundColor: PLAYER_COLORS[id] }}
                        >
                          {id.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={podiumActions[0]}
                  className={`rounded-xl bg-cyan-400 px-5 py-2.5 text-base font-black text-black hover:bg-cyan-300 transition shadow-xl ${podiumFocusIdx === 0 ? 'ring-4 ring-white scale-105' : 'opacity-85'}`}
                >
                  📊 詳細戰績
                </button>
                <button onClick={podiumActions[1]} className={`rounded-xl bg-yellow-300 px-7 py-2.5 text-base font-black text-black hover:bg-yellow-200 transition shadow-xl ${podiumFocusIdx === 1 ? 'ring-4 ring-white scale-105' : 'opacity-85'}`}>
                  再來一場
                </button>
                <button onClick={podiumActions[2]} className={`rounded-xl bg-white/20 border border-white/30 px-6 py-2.5 text-base font-bold hover:bg-white/30 transition shadow-xl ${podiumFocusIdx === 2 ? 'ring-4 ring-yellow-300 scale-105' : 'opacity-85'}`}>
                  回選單
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
