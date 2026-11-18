import { create } from 'zustand'
import { sfx } from './audio'
import { CHARACTERS, CHARACTER_IDS } from './characters'
import { ENERGY_MAX, SHIELD_MAX, SPAWN_X, START_STOCKS } from './constants'
import type { StageForm, StageId } from './stages'
import { ALL_FIGHTER_IDS, type CharacterId, type FighterId, type FighterState, type UiFighter } from './types'

export type Phase = 'menu' | 'playing' | 'ended'

const DEFAULT_SELECTION: Record<FighterId, CharacterId> = {
  p1: 'reimu',
  p2: 'marisa',
  p3: 'mario',
  p4: 'pacman',
  p5: 'tetro',
  p6: 'bomber',
  p7: 'invader',
  p8: 'kong',
}

const DEFAULT_CPU: Record<FighterId, number> = {
  p1: 0, p2: 5, p3: 5, p4: 5, p5: 5, p6: 5, p7: 5, p8: 5,
}

export function createFighter(id: FighterId, character: CharacterId, stocks = START_STOCKS): FighterState {
  const sx = (SPAWN_X as Record<string, number>)[id] ?? 0
  const faceRight = id === 'p1' || id === 'p3' || id === 'p5' || id === 'p7'
  return {
    id, character, damage: 0, stocks, energy: ENERGY_MAX, shield: SHIELD_MAX,
    fsm: 'IDLE', stateMs: 0, pos: [sx, 1, 0], vel: [0, 0, 0],
    facing: [faceRight ? 1 : -1, 0], grounded: false, jumpsLeft: 2, skill: null, cooldowns: {},
    comboBufferMs: 0, hitstunMs: 0, invulnMs: 0, respawnMs: 0, slowFactor: 1, flashMs: 0,
    alive: false, firstSpawn: true, ultReady: false, dodgeMs: 0, dodgeKind: null, dodgeDir: [0, 0], airDodgeUsed: false, upSpecialUsed: false, dropMs: 0, downMs: 0, ledgeSide: 0, ledgeMs: 0, ledgeCd: 0,
    comboCount: 0, comboTimerMs: 0, lastHitBy: null, jumpBufferMs: 0, coyoteMs: 0,
    stats: { kos: 0, damageDealt: 0, damageTaken: 0, maxCombo: 0, perfectShields: 0 },
  }
}

const emptyUi = (c: CharacterId): UiFighter => ({
  name: CHARACTERS[c].name, color: CHARACTERS[c].color, damage: 0, stocks: START_STOCKS,
  energy: ENERGY_MAX, shield: SHIELD_MAX, fsm: 'IDLE', charge: 0, ultReady: false,
  combo: 0, stats: { kos: 0, damageDealt: 0, damageTaken: 0, maxCombo: 0, perfectShields: 0 },
  slots: [],
})

function buildFighters(sel: Record<FighterId, CharacterId>, stocks = START_STOCKS): Record<FighterId, FighterState> {
  const out = {} as Record<FighterId, FighterState>
  for (const id of ALL_FIGHTER_IDS) out[id] = createFighter(id, sel[id], stocks)
  return out
}

function buildUi(sel: Record<FighterId, CharacterId>): Record<FighterId, UiFighter> {
  const out = {} as Record<FighterId, UiFighter>
  for (const id of ALL_FIGHTER_IDS) out[id] = emptyUi(sel[id])
  return out
}

interface GameStore {
  phase: Phase
  winner: FighterId | null
  playerCount: number
  setPlayerCount(n: number): void
  stockCount: number
  setStockCount(n: number): void
  selection: Record<FighterId, CharacterId>
  randomSlots: Record<FighterId, boolean>
  stageId: StageId
  selectStage(id: StageId): void
  stageForm: StageForm
  setStageForm(f: StageForm): void
  /** 核心戰鬥狀態：由模擬迴圈直接 mutate，React 不訂閱。 */
  fighters: Record<FighterId, FighterState>
  /** 低頻（~12Hz）發布給 React UI 的快照。 */
  ui: Record<FighterId, UiFighter>
  showDebug: boolean
  paused: boolean
  setPaused(p: boolean): void
  /** 電腦玩家難度：0=真人，1~9=CPU 等級 */
  cpu: Record<FighterId, number>
  setCpu(id: FighterId, lv: number): void
  /** 玩家拖曳匯入的自訂模型（blob URL） */
  playerModel: Record<FighterId, { url: string; name: string } | null>
  setPlayerModel(id: FighterId, file: File | null): void
  projVersion: number
  zoneVersion: number
  fxVersion: number
  ultCutin: { charId: CharacterId; name: string; skillName: string; color: string; until: number } | null
  fatalFlash: { until: number; x: number; y: number } | null
  countdown: '3' | '2' | '1' | 'SMASH!!!' | null
  triggerUltCutin(data: { charId: CharacterId; name: string; skillName: string; color: string }): void
  triggerFatalFlash(x: number, y: number): void
  select(id: FighterId, c: CharacterId, isRandom?: boolean): void
  startMatch(): void
  endMatch(w: FighterId): void
  toMenu(): void
  publishUi(ui: Record<FighterId, UiFighter>): void
  toggleDebug(): void
}

export const useGameStore = create<GameStore>((set, get) => ({
  phase: 'menu',
  winner: null,
  playerCount: 2,
  setPlayerCount: (n) => set({ playerCount: Math.max(2, Math.min(8, Math.round(n))) }),
  stockCount: START_STOCKS,
  setStockCount: (n) => set({ stockCount: Math.max(1, Math.min(9, Math.round(n))) }),
  stageId: 'reimu',
  selectStage: (stageId) => set({ stageId }),
  stageForm: 'normal',
  setStageForm: (stageForm) => set({ stageForm }),
  selection: { ...DEFAULT_SELECTION },
  randomSlots: { p1: false, p2: false, p3: false, p4: false, p5: false, p6: false, p7: false, p8: false },
  fighters: buildFighters(DEFAULT_SELECTION),
  ui: buildUi(DEFAULT_SELECTION),
  showDebug: true,
  paused: false,
  setPaused: (p) => set({ paused: p }),
  cpu: { ...DEFAULT_CPU },
  setCpu: (id, lv) => set((s) => ({ cpu: { ...s.cpu, [id]: Math.max(0, Math.min(9, Math.round(lv))) } })),
  playerModel: { p1: null, p2: null, p3: null, p4: null, p5: null, p6: null, p7: null, p8: null },
  setPlayerModel: (id, file) => {
    const old = get().playerModel[id]
    if (old) URL.revokeObjectURL(old.url)
    set((s) => ({ playerModel: { ...s.playerModel, [id]: file ? { url: URL.createObjectURL(file), name: file.name } : null } }))
  },
  projVersion: 0, zoneVersion: 0, fxVersion: 0,
  ultCutin: null,
  fatalFlash: null,
  countdown: null,
  triggerUltCutin: (data) => {
    const until = performance.now() + 950
    set({ ultCutin: { ...data, until } })
    setTimeout(() => {
      if ((get().ultCutin?.until ?? 0) <= performance.now()) set({ ultCutin: null })
    }, 980)
  },
  triggerFatalFlash: (x, y) => {
    const until = performance.now() + 420
    set({ fatalFlash: { until, x, y } })
    setTimeout(() => {
      if ((get().fatalFlash?.until ?? 0) <= performance.now()) set({ fatalFlash: null })
    }, 440)
  },
  select: (id, c, isRandom = false) => set((s) => ({
    selection: { ...s.selection, [id]: c },
    randomSlots: { ...s.randomSlots, [id]: isRandom },
  })),
  startMatch: () => {
    const { selection, randomSlots, stockCount } = get()
    const nextSel = { ...selection }
    for (const id of ALL_FIGHTER_IDS) {
      if (randomSlots[id]) {
        nextSel[id] = CHARACTER_IDS[Math.floor(Math.random() * CHARACTER_IDS.length)] ?? CHARACTER_IDS[0]
      }
    }
    const matchSeq = Date.now()
    ;(useGameStore as any)._matchSeq = matchSeq
    set({
      phase: 'playing', winner: null, paused: false,
      ultCutin: null, fatalFlash: null, countdown: '3',
      selection: nextSel,
      fighters: buildFighters(nextSel, stockCount),
      ui: buildUi(nextSel),
    })
    sfx('ui')
    setTimeout(() => { if ((useGameStore as any)._matchSeq === matchSeq && get().phase === 'playing') { set({ countdown: '2' }); sfx('ui') } }, 700)
    setTimeout(() => { if ((useGameStore as any)._matchSeq === matchSeq && get().phase === 'playing') { set({ countdown: '1' }); sfx('ui') } }, 1400)
    setTimeout(() => { if ((useGameStore as any)._matchSeq === matchSeq && get().phase === 'playing') { set({ countdown: 'SMASH!!!' }); sfx('perfect') } }, 2100)
    setTimeout(() => { if ((useGameStore as any)._matchSeq === matchSeq && get().phase === 'playing') { set({ countdown: null }) } }, 2750)
  },
  endMatch: (w) => set({ phase: 'ended', winner: w, paused: false, ultCutin: null, fatalFlash: null, countdown: null }),
  toMenu: () => set({ phase: 'menu', winner: null, paused: false, ultCutin: null, fatalFlash: null, countdown: null }),
  publishUi: (ui) => set({ ui }),
  toggleDebug: () => set((s) => ({ showDebug: !s.showDebug })),
}))

export function getActiveFighterIds(): FighterId[] {
  return ALL_FIGHTER_IDS.slice(0, useGameStore.getState().playerCount)
}
