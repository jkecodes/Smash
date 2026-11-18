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

const TIER_ORDER: BlockTier[] = ['dirt', 'wood', 'stone', 'iron', 'diamond']
const MAX_MATERIALS = 16
const MAX_BLOCKS_PER_PLAYER = 8
const BLOCK_TTL_MS = 6500

let nextId = 1
let blocks: SteveBlock[] = []
const inv: Record<FighterId, { count: number; tierIdx: number; mineMs: number }> = Object.fromEntries(
  ALL_FIGHTER_IDS.map((id) => [id, { count: 6, tierIdx: 1, mineMs: 0 }])
) as any

export function resetSteveBlocks() {
  blocks = []
  for (const id of ALL_FIGHTER_IDS) {
    inv[id] = { count: 6, tierIdx: 1, mineMs: 0 }
  }
}

export function getSteveBlocks(): readonly SteveBlock[] {
  return blocks
}

export function getSteveInv(id: FighterId): { count: number; tier: BlockTier } {
  const st = inv[id]
  return { count: st.count, tier: TIER_ORDER[st.tierIdx % TIER_ORDER.length] }
}

export function mineSteveStep(id: FighterId, dtMs: number, pos: Vec3) {
  const st = inv[id]
  st.mineMs += dtMs
  if (st.mineMs < 420) return
  st.mineMs -= 420
  st.count = Math.min(MAX_MATERIALS, st.count + 1)
  st.tierIdx = (st.tierIdx + 1) % TIER_ORDER.length
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
