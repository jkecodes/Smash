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
  seija: { kind: 'limit', label: '🔄 逆轉極限', color: '#e11d48' },
  youmu: { kind: 'awaken', label: '👻 半靈人鬼覺醒', color: '#34d399' },
  firefly: { kind: 'awaken', label: '🔥 燃燒裝甲覺醒', color: '#f97316' },
  ellen: { kind: 'limit', label: '🦈 急凍剪刃充能', color: '#38bdf8' },
  jinhsi: { kind: 'limit', label: '🐉 韶光歲主共鳴', color: '#fde047' },
  suzuka: { kind: 'ko', label: '💨 異次元大逃げ', color: '#22c55e' },
  creeper: { kind: 'ko', label: '💥 高壓苦力怕', color: '#4ade80' },
  josuke: { kind: 'awaken', label: '💢 髮型暴怒覺醒', color: '#ec4899' },
  samura: { kind: 'awaken', label: '🪶 飛宗「雀」覺醒', color: '#f59e0b' },
  reimu: { kind: 'mana', label: '☯️ 靈力夢想封印', color: '#ef4444' },
  hakuri: { kind: 'limit', label: '🌀 威葬・藏極限', color: '#38bdf8' },
  sukuna: { kind: 'awaken', label: '👹 伏魔御廚子覺醒', color: '#ef4444' },
  bakugo: { kind: 'ko', label: '💥 爆破汗液臨界', color: '#fb923c' },
  descara: { kind: 'mana', label: '🪶 深淵魔女魔力', color: '#a855f7' },
}

export function getMechanicDef(charId: CharacterId) {
  return CHAR_MECHANIC[charId] ?? null
}

const states: Record<FighterId, MechanicState | null> = Object.fromEntries(
  ALL_FIGHTER_IDS.map((id) => [id, null])
) as any

export function resetMechanics() {
  const sel = useGameStore.getState().selection
  for (const id of ALL_FIGHTER_IDS) {
    const def = getMechanicDef(sel[id])
    states[id] = def ? { kind: def.kind, label: def.label, color: def.color, gauge: 0, activeMs: 0 } : null
  }
}

export const MECHANIC_GUIDE: Record<MechanicKind, { title: string; desc: string }> = {
  limit: {
    title: '極限充能條（Limit）',
    desc: '攻擊命中或受到傷害時累積充能；集滿 100% 後，下一次施放「特招」將消耗極限條，大幅提升該招式的傷害與擊飛力！',
  },
  awaken: {
    title: '覺醒充能條（Awaken）',
    desc: '輸出或受擊累積覺醒值，超過 50% 即自動進入覺醒狀態：全身燃起氣場、判定範圍擴大 1.35 倍、特招追加貫穿覺醒波（座村更會長出烏鴉翅膀自由飛行＋回血）。',
  },
  ko: {
    title: 'K.O. 必殺拳充能條（K.O.）',
    desc: '承受或造成傷害時累積，滿 100% 進入一擊必殺準備狀態，下一次攻擊或特招會附加超高擊飛力將對手轟出場外！',
  },
  aura: {
    title: '波導背水條（Aura）',
    desc: '隨自身累積 % 傷害同步提升！自身受傷 % 越高、波導條越滿，全招式傷害與擊飛力越強（絕地反殺機制）。',
  },
  mana: {
    title: '魔力充能條（Mana）',
    desc: '隨時間自動恢復魔力；當魔力高於 75% 時施放特招會消耗魔力並獲得額外傷害與擊飛加成。',
  },
}

export function getMechanic(id: FighterId): MechanicState | null {
  return states[id]
}

let auraFxTimer = 0
export function stepMechanics(dt: number, fighters: Record<FighterId, FighterState>) {
  const dtMs = dt * 1000
  auraFxTimer -= dtMs
  const emitSpark = auraFxTimer <= 0
  if (emitSpark) auraFxTimer = 420
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
    const ready =
      f.alive &&
      ((m.kind === 'awaken' && m.activeMs > 0) ||
        (m.kind === 'mana' && m.gauge >= 75) ||
        ((m.kind === 'limit' || m.kind === 'ko' || m.kind === 'aura') && m.gauge >= 100))
    if (emitSpark && ready) {
      addFx({ kind: 'burst', pos: [f.pos[0], f.pos[1], 0], color: m.color, ttl: 260, count: 4, speed: 2.8, size: 0.1 })
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
      if (ma.gauge >= 50) {
        ma.gauge = 100
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
      if (mt.gauge >= 50) {
        mt.gauge = 100
        mt.activeMs = 6500
        addFx({ kind: 'ring', pos: [...tgt.pos], color: mt.color, ttl: 420, radius: 2.2, plane: 'vertical' })
      }
    }
  }
}

/** 計算角色專屬機制帶來的傷害／擊飛倍率，並在觸發消耗型極限技時歸零 */
export function consumeSkillMechanic(f: FighterState, slot: string): { dmgMult: number; kbMult: number } {
  const m = states[f.id]
  if (!m) return { dmgMult: 1.2, kbMult: 1.15 }

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
