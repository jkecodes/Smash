import { create } from 'zustand'
import { CHARACTERS } from './characters'
import { ENERGY_MAX, SHIELD_MAX, SPAWN_X, START_STOCKS } from './constants'
import type { StageId } from './stages'
import type { CharacterId, FighterId, FighterState, UiFighter } from './types'

export type Phase = 'menu' | 'playing' | 'ended'

export function createFighter(id: FighterId, character: CharacterId): FighterState {
  return {
    id, character, damage: 0, stocks: START_STOCKS, energy: ENERGY_MAX, shield: SHIELD_MAX,
    fsm: 'IDLE', stateMs: 0, pos: [SPAWN_X[id], 1, 0], vel: [0, 0, 0],
    facing: [id === 'p1' ? 1 : -1, 0], grounded: false, jumpsLeft: 2, skill: null, cooldowns: {},
    comboBufferMs: 0, hitstunMs: 0, invulnMs: 0, respawnMs: 0, slowFactor: 1, flashMs: 0,
    alive: false, firstSpawn: true, ultReady: false, dodgeMs: 0, dodgeKind: null, dodgeDir: [0, 0], airDodgeUsed: false, upSpecialUsed: false, dropMs: 0, downMs: 0, ledgeSide: 0, ledgeMs: 0, ledgeCd: 0,
    comboCount: 0, comboTimerMs: 0,
    stats: { kos: 0, damageDealt: 0, damageTaken: 0, maxCombo: 0, perfectShields: 0 },
  }
}
const emptyUi = (c: CharacterId): UiFighter => ({
  name: CHARACTERS[c].name, color: CHARACTERS[c].color, damage: 0, stocks: START_STOCKS,
  energy: ENERGY_MAX, shield: SHIELD_MAX, fsm: 'IDLE', charge: 0, ultReady: false,
  combo: 0, stats: { kos: 0, damageDealt: 0, damageTaken: 0, maxCombo: 0, perfectShields: 0 },
  slots: [],
})

interface GameStore {
  phase: Phase
  winner: FighterId | null
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
  stageId: 'battlefield',
  selectStage: (stageId) => set({ stageId }),
  selection: { p1: 'knight', p2: 'robot' },
  fighters: { p1: createFighter('p1', 'knight'), p2: createFighter('p2', 'robot') },
  ui: { p1: emptyUi('knight'), p2: emptyUi('robot') },
  showDebug: true,
  paused: false,
  setPaused: (p) => set({ paused: p }),
  cpu: { p1: 0, p2: 2 },
  setCpu: (id, lv) => set((s) => ({ cpu: { ...s.cpu, [id]: lv } })),
  playerModel: { p1: null, p2: null },
  setPlayerModel: (id, file) => {
    const old = get().playerModel[id]
    if (old) URL.revokeObjectURL(old.url)
    set((s) => ({ playerModel: { ...s.playerModel, [id]: file ? { url: URL.createObjectURL(file), name: file.name } : null } }))
  },
  projVersion: 0, zoneVersion: 0, fxVersion: 0,
  select: (id, c) => set((s) => ({ selection: { ...s.selection, [id]: c } })),
  startMatch: () => {
    const { selection } = get()
    set({
      phase: 'playing', winner: null, paused: false,
      fighters: { p1: createFighter('p1', selection.p1), p2: createFighter('p2', selection.p2) },
      ui: { p1: emptyUi(selection.p1), p2: emptyUi(selection.p2) },
    })
  },
  endMatch: (w) => set({ phase: 'ended', winner: w, paused: false }),
  toMenu: () => set({ phase: 'menu', winner: null, paused: false }),
  publishUi: (ui) => set({ ui }),
  toggleDebug: () => set((s) => ({ showDebug: !s.showDebug })),
}))
