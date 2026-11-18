import { create } from 'zustand'
import { CHARACTERS } from './characters'
import { ENERGY_MAX, SHIELD_MAX, SPAWN_X, START_STOCKS } from './constants'
import type { StageId } from './stages'
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

const DEFAULT_CPU: Record<FighterId, 0 | 1 | 2 | 3> = {
  p1: 0, p2: 2, p3: 2, p4: 2, p5: 2, p6: 2, p7: 2, p8: 2,
}

export function createFighter(id: FighterId, character: CharacterId): FighterState {
  const sx = (SPAWN_X as Record<string, number>)[id] ?? 0
  const faceRight = id === 'p1' || id === 'p3' || id === 'p5' || id === 'p7'
  return {
    id, character, damage: 0, stocks: START_STOCKS, energy: ENERGY_MAX, shield: SHIELD_MAX,
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

function buildFighters(sel: Record<FighterId, CharacterId>): Record<FighterId, FighterState> {
  const out = {} as Record<FighterId, FighterState>
  for (const id of ALL_FIGHTER_IDS) out[id] = createFighter(id, sel[id])
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
  selection: Record<FighterId, CharacterId>
  stageId: StageId
  selectStage(id: StageId): void
  /** 核心戰鬥狀態：由模擬迴圈直接 mutate，React 不訂閱。 */
  fighters: Record<FighterId, FighterState>
  /** 低頻（~12Hz）發布給 React UI 的快照。 */
  ui: Record<FighterId, UiFighter>
  showDebug: boolean
  paused: boolean
  setPaused(p: boolean): void
  /** 電腦玩家難度：0=真人，1~3=CPU 等級 */
  cpu: Record<FighterId, 0 | 1 | 2 | 3>
  setCpu(id: FighterId, lv: 0 | 1 | 2 | 3): void
  /** 玩家拖曳匯入的自訂模型（blob URL） */
  playerModel: Record<FighterId, { url: string; name: string } | null>
  setPlayerModel(id: FighterId, file: File | null): void
  projVersion: number
  zoneVersion: number
  fxVersion: number
  select(id: FighterId, c: CharacterId): void
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
  stageId: 'reimu',
  selectStage: (stageId) => set({ stageId }),
  selection: { ...DEFAULT_SELECTION },
  fighters: buildFighters(DEFAULT_SELECTION),
  ui: buildUi(DEFAULT_SELECTION),
  showDebug: true,
  paused: false,
  setPaused: (p) => set({ paused: p }),
  cpu: { ...DEFAULT_CPU },
  setCpu: (id, lv) => set((s) => ({ cpu: { ...s.cpu, [id]: lv } })),
  playerModel: { p1: null, p2: null, p3: null, p4: null, p5: null, p6: null, p7: null, p8: null },
  setPlayerModel: (id, file) => {
    const old = get().playerModel[id]
    if (old) URL.revokeObjectURL(old.url)
    set((s) => ({ playerModel: { ...s.playerModel, [id]: file ? { url: URL.createObjectURL(file), name: file.name } : null } }))
  },
  projVersion: 0, zoneVersion: 0, fxVersion: 0,
  select: (id, c) => set((s) => ({
    selection: { ...s.selection, [id]: c },
    stageId: id === 'p1' ? c : s.stageId,
  })),
  startMatch: () => {
    const { selection } = get()
    set({
      phase: 'playing', winner: null, paused: false,
      fighters: buildFighters(selection),
      ui: buildUi(selection),
    })
  },
  endMatch: (w) => set({ phase: 'ended', winner: w, paused: false }),
  toMenu: () => set({ phase: 'menu', winner: null, paused: false }),
  publishUi: (ui) => set({ ui }),
  toggleDebug: () => set((s) => ({ showDebug: !s.showDebug })),
}))

export function getActiveFighterIds(): FighterId[] {
  return ALL_FIGHTER_IDS.slice(0, useGameStore.getState().playerCount)
}
