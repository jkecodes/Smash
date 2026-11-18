import { addFx } from './runtime'
import { useGameStore } from './store'
import { ALL_FIGHTER_IDS, type CharacterId, type FighterId, type FighterState } from './types'

export type MechanicKind = 'limit' | 'awaken' | 'aura' | 'ko' | 'mana'

export interface MechanicState {
  kind: MechanicKind
  label: string
  color: string
  /** 0..100 */
  gauge: number
  /** 覺醒剩餘秒數（僅 awaken 使用） */
  activeMs: number
}

const CHAR_MECHANIC: Partial<Record<CharacterId, { kind: MechanicKind; label: string; color: string }>> = {
  chihiro: { kind: 'limit', label: '⚡ 淵天極限', color: '#ef4444' },
  deku: { kind: 'limit', label: '⚡ OFA 100%', color: '#22c55e' },
  gojo: { kind: 'awaken', label: '👁️ 六眼覺醒', color: '#a855f7' },
  miyabi: { kind: 'awaken', label: '❄️ 霜月覺醒', color: '#22d3ee' },
  ryu: { kind: 'aura', label: '🔥 波導背水', color: '#38bdf8' },
  rover: { kind: 'aura', label: '✨ 共鳴波導', color: '#facc15' },
  kong: { kind: 'ko', label: '💥 K.O. 重拳', color: '#f97316' },
  spe: { kind: 'ko', label: '🐎 末腳爆衝', color: '#c084fc' },
  ichi: { kind: 'mana', label: '🔮 魔力共鳴', color: '#38bdf8' },
  nona: { kind: 'mana', label: '🪡 魔絲充盈', color: '#e879f9' },
  marisa: { kind: 'mana', label: '⭐ 八卦爐魔力', color: '#fde047' },
}

const states: Record<FighterId, MechanicState | null> = Object.fromEntries(
  ALL_FIGHTER_IDS.map((id) => [id, null])
) as any

export function resetMechanics() {
  const sel = useGameStore.getState().selection
  for (const id of ALL_FIGHTER_IDS) {
    const def = CHAR_MECHANIC[sel[id]]
    states[id] = def ? { kind: def.kind, label: def.label, color: def.color, gauge: 0, activeMs: 0 } : null
  }
}

export function getMechanic(id: FighterId): MechanicState | null {
  return states[id]
}

export function stepMechanics(dt: number, fighters: Record<FighterId, FighterState>) {
  const dtMs = dt * 1000
  for (const id of ALL_FIGHTER_IDS) {
    const m = states[id]
    const f = fighters[id]
    if (!m || !f) continue
    if (m.kind === 'aura') {
      m.gauge = Math.min(100, Math.round((f.damage / 150) * 100))
    } else if (m.kind === 'mana') {
      m.gauge = Math.min(100, m.gauge + dt * 5)
    } else if (m.kind === 'awaken' && m.activeMs > 0) {
      m.activeMs = Math.max(0, m.activeMs - dtMs)
      m.gauge = Math.round((m.activeMs / 6500) * 100)
    }
  }
}

export function onMechanicHit(att: FighterState, tgt: FighterState, dmg: number) {
  const ma = states[att.id]
  if (ma) {
    if (ma.kind === 'limit' || ma.kind === 'ko') {
      ma.gauge = Math.min(100, ma.gauge + dmg * 2.2)
    } else if (ma.kind === 'awaken' && ma.activeMs <= 0) {
      ma.gauge = Math.min(100, ma.gauge + dmg * 2.0)
      if (ma.gauge >= 100) {
        ma.activeMs = 6500
        addFx({ kind: 'ring', pos: [...att.pos], color: ma.color, ttl: 420, radius: 2.2, plane: 'vertical' })
      }
    } else if (ma.kind === 'mana') {
      ma.gauge = Math.min(100, ma.gauge + dmg * 2.0 + 8)
    }
  }
  const mt = states[tgt.id]
  if (mt) {
    if (mt.kind === 'limit' || mt.kind === 'ko') {
      mt.gauge = Math.min(100, mt.gauge + dmg * 2.6)
    } else if (mt.kind === 'awaken' && mt.activeMs <= 0) {
      mt.gauge = Math.min(100, mt.gauge + dmg * 2.8)
      if (mt.gauge >= 100) {
        mt.activeMs = 6500
        addFx({ kind: 'ring', pos: [...tgt.pos], color: mt.color, ttl: 420, radius: 2.2, plane: 'vertical' })
      }
    }
  }
}

/** 計算角色專屬機制帶來的傷害／擊飛倍率，並在觸發消耗型極限技時歸零 */
export function consumeSkillMechanic(f: FighterState, slot: string): { dmgMult: number; kbMult: number } {
  const m = states[f.id]
  if (!m) return { dmgMult: 1, kbMult: 1 }

  if (m.kind === 'aura') {
    const bonus = Math.min(0.55, (f.damage / 150) * 0.55)
    return { dmgMult: 1 + bonus, kbMult: 1 + bonus * 0.85 }
  }
  if (m.kind === 'awaken' && m.activeMs > 0) {
    return { dmgMult: 1.32, kbMult: 1.25 }
  }
  if (m.kind === 'mana' && m.gauge >= 75 && (slot === 'skill1' || slot === 'skill2')) {
    m.gauge = Math.max(0, m.gauge - 50)
    addFx({ kind: 'ring', pos: [...f.pos], color: m.color, ttl: 320, radius: 1.9, plane: 'vertical' })
    return { dmgMult: 1.28, kbMult: 1.2 }
  }
  if (m.kind === 'limit' && m.gauge >= 100 && (slot === 'skill1' || slot === 'skill2')) {
    m.gauge = 0
    addFx({ kind: 'ring', pos: [...f.pos], color: m.color, ttl: 380, radius: 2.2, plane: 'vertical' })
    return { dmgMult: 1.55, kbMult: 1.45 }
  }
  if (m.kind === 'ko' && m.gauge >= 100 && (slot === 'attack' || slot === 'skill1')) {
    m.gauge = 0
    addFx({ kind: 'burst', pos: [...f.pos], color: m.color, ttl: 340, count: 16, speed: 7, size: 0.18 })
    return { dmgMult: 1.5, kbMult: 1.75 }
  }
  return { dmgMult: 1, kbMult: 1 }
}
