import { sfx } from '../audio'
import { addFx } from '../runtime'
import { ALL_FIGHTER_IDS, type FighterId, type Vec3 } from '../types'

export type BlockTier = 'dirt' | 'wood' | 'stone' | 'iron' | 'diamond'

export interface SteveBlock {
  id: number
  owner: FighterId
  x: number
  y: number
  ttlMs: number
  maxTtlMs: number
  tier: BlockTier
}

export const TIER_COLORS: Record<BlockTier, { top: string; side: string; label: string }> = {
  dirt: { top: '#4ade80', side: '#78350f', label: '泥土' },
  wood: { top: '#d97706', side: '#92400e', label: '木頭' },
  stone: { top: '#94a3b8', side: '#475569', label: '石頭' },
  iron: { top: '#e2e8f0', side: '#94a3b8', label: '鐵礦' },
  diamond: { top: '#22d3ee', side: '#0891b2', label: '鑽石' },
}

export const SWORD_TIERS = [
  { label: '木劍', color: '#d97706', dmgMult: 1.0, kbMult: 1.0 },
  { label: '石劍', color: '#94a3b8', dmgMult: 1.12, kbMult: 1.08 },
  { label: '鐵劍', color: '#e2e8f0', dmgMult: 1.24, kbMult: 1.16 },
  { label: '金劍', color: '#facc15', dmgMult: 1.36, kbMult: 1.24 },
  { label: '鑽石劍', color: '#22d3ee', dmgMult: 1.5, kbMult: 1.35 },
] as const

const TIER_ORDER: BlockTier[] = ['dirt', 'wood', 'stone', 'iron', 'diamond']
const MAX_MATERIALS = 16
const MAX_BLOCKS_PER_PLAYER = 8
const BLOCK_TTL_MS = 6500

let nextId = 1
let blocks: SteveBlock[] = []
const inv: Record<FighterId, { count: number; tierIdx: number; mineMs: number; swordTier: number; minesForSword: number }> = Object.fromEntries(
  ALL_FIGHTER_IDS.map((id) => [id, { count: 6, tierIdx: 1, mineMs: 0, swordTier: 0, minesForSword: 0 }])
) as any

export function resetSteveBlocks() {
  blocks = []
  for (const id of ALL_FIGHTER_IDS) {
    inv[id] = { count: 6, tierIdx: 1, mineMs: 0, swordTier: 0, minesForSword: 0 }
  }
}

export function getSteveBlocks(): readonly SteveBlock[] {
  return blocks
}

export function getSteveInv(id: FighterId): { count: number; tier: BlockTier; sword: (typeof SWORD_TIERS)[number] } {
  const st = inv[id]
  return { count: st.count, tier: TIER_ORDER[st.tierIdx % TIER_ORDER.length], sword: SWORD_TIERS[st.swordTier] }
}

export function getSteveSwordMult(id: FighterId) {
  return SWORD_TIERS[inv[id]?.swordTier ?? 0]
}

export function mineSteveStep(id: FighterId, dtMs: number, pos: Vec3) {
  const st = inv[id]
  st.mineMs += dtMs
  if (st.mineMs < 420) return
  st.mineMs -= 420
  st.count = Math.min(MAX_MATERIALS, st.count + 1)
  st.tierIdx = Math.min(TIER_ORDER.length - 1, st.tierIdx + 1)
  st.minesForSword += 1
  if (st.minesForSword >= 2 && st.swordTier < SWORD_TIERS.length - 1) {
    st.minesForSword = 0
    st.swordTier += 1
    const sw = SWORD_TIERS[st.swordTier]
    sfx('perfect')
    addFx({ kind: 'ring', pos: [pos[0], pos[1] + 0.2, 0], color: sw.color, ttl: 360, radius: 1.8, plane: 'vertical' })
  }
  const tier = TIER_ORDER[st.tierIdx]
  sfx('block')
  addFx({ kind: 'burst', pos: [pos[0], Math.max(0, pos[1] - 0.3), 0], color: TIER_COLORS[tier].top, ttl: 260, count: 8, speed: 4.5, size: 0.14 })
}

export function tryPlaceSteveBlock(owner: FighterId, rawX: number, rawY: number, stageHalfX: number): boolean {
  const st = inv[owner]
  if (st.count <= 0) return false
  const x = Math.round(rawX)
  const y = Math.round((rawY - 0.95) * 2) / 2

  // 不能放太遠、太高或太低
  if (Math.abs(x) > stageHalfX + 3.2) return false
  if (y < -2.5 || y > 8.5) return false
  if (blocks.some((b) => Math.abs(b.x - x) < 0.85 && Math.abs(b.y - y) < 0.85)) return false

  st.count -= 1
  const tier = TIER_ORDER[st.tierIdx % TIER_ORDER.length]
  const owned = blocks.filter((b) => b.owner === owner)
  if (owned.length >= MAX_BLOCKS_PER_PLAYER) {
    const oldest = owned[0]
    blocks = blocks.filter((b) => b.id !== oldest.id)
    addFx({ kind: 'burst', pos: [oldest.x, oldest.y, 0], color: TIER_COLORS[oldest.tier].side, ttl: 220, count: 6, speed: 3, size: 0.12 })
  }

  blocks.push({ id: nextId++, owner, x, y, ttlMs: BLOCK_TTL_MS, maxTtlMs: BLOCK_TTL_MS, tier })
  sfx('block')
  addFx({ kind: 'burst', pos: [x, y, 0], color: TIER_COLORS[tier].top, ttl: 240, count: 7, speed: 3.5, size: 0.13 })
  return true
}

export function stepSteveBlocks(dt: number) {
  if (!blocks.length) return
  const dtMs = dt * 1000
  const alive: SteveBlock[] = []
  for (const b of blocks) {
    b.ttlMs -= dtMs
    if (b.ttlMs > 0) alive.push(b)
    else addFx({ kind: 'burst', pos: [b.x, b.y, 0], color: TIER_COLORS[b.tier].side, ttl: 240, count: 8, speed: 3.5, size: 0.14 })
  }
  blocks = alive
}
