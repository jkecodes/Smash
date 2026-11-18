import { useGameStore } from './store'
import type { FxSpec, Runtime, Projectile, Zone, ZoneDef, Summon, FighterId, Vec3, HitSource } from './types'

/** 60FPS 會變動、但 React 不需要訂閱的資料（剛體參考、投射物、特效清單）。 */
export const runtime: Runtime = {
  bodies: { p1: null, p2: null, p3: null, p4: null, p5: null, p6: null, p7: null, p8: null },
  platformBodies: [],
  handles: new Map(),
  physics: null,
  projectiles: [],
  zones: [],
  summons: [],
  fx: [],
  ball: null,
  debugSpheres: [],
  shake: 0,
  stageTime: 0,
  hitstopMs: 0,
}

let uid = 1
export const pendingNetFx: FxSpec[] = []
const bump = (k: 'projVersion' | 'zoneVersion' | 'summonVersion' | 'fxVersion') =>
  useGameStore.setState((s) => ({ [k]: s[k] + 1 }) as any)

export function addFx(spec: FxSpec, queueForNet = true) {
  runtime.fx.push({ ...spec, id: uid++, createdAt: performance.now() })
  if (queueForNet && pendingNetFx.length < 40) pendingNetFx.push(spec)
  bump('fxVersion')
}
export function removeFx(id: number) {
  const i = runtime.fx.findIndex((f) => f.id === id)
  if (i >= 0) { runtime.fx.splice(i, 1); bump('fxVersion') }
}
export function addProjectile(p: Omit<Projectile, 'id' | 'trailMs' | 'gravity' | 'explodeRadius'> & { gravity?: number; explodeRadius?: number; maxRange?: number; steerable?: number }) {
  const gravity = p.gravity ?? 0
  const maxRange = p.maxRange ?? (p.source.def.requiresUlt ? 999 : p.steerable ? 22 : gravity !== 0 ? 14 : p.pierce ? 12.5 : 11)
  runtime.projectiles.push({ ...p, gravity, explodeRadius: p.explodeRadius ?? 0, traveled: 0, maxRange, steerable: p.steerable ?? 0, id: uid++, trailMs: 0 })
  bump('projVersion')
}
export function removeProjectile(id: number) {
  const i = runtime.projectiles.findIndex((p) => p.id === id)
  if (i >= 0) { runtime.projectiles.splice(i, 1); bump('projVersion') }
}
export function addZone(owner: FighterId, pos: Vec3, d: ZoneDef) {
  const z: Zone = { id: uid++, owner, pos, radius: d.radius, ttlMs: d.durationMs, durationMs: d.durationMs, slowFactor: d.slowFactor, color: d.color, damagePerSec: d.damagePerSec ?? 0, pull: d.pull ?? 0 }
  runtime.zones.push(z)
  bump('zoneVersion')
}
export function removeZone(id: number) {
  const i = runtime.zones.findIndex((z) => z.id === id)
  if (i >= 0) { runtime.zones.splice(i, 1); bump('zoneVersion') }
}
export function addSummon(s: Omit<Summon, 'id'>) {
  const owned = runtime.summons.filter((x) => x.owner === s.owner)
  if (owned.length >= 2) {
    const oldestIdx = runtime.summons.findIndex((x) => x.owner === s.owner)
    if (oldestIdx >= 0) runtime.summons.splice(oldestIdx, 1)
  }
  runtime.summons.push({ ...s, id: uid++ })
  bump('summonVersion')
}
export function removeSummon(id: number) {
  const i = runtime.summons.findIndex((s) => s.id === id)
  if (i >= 0) { runtime.summons.splice(i, 1); bump('summonVersion') }
}
export function clearEntities() {
  runtime.projectiles.length = 0
  runtime.zones.length = 0
  runtime.summons.length = 0
  runtime.fx.length = 0
  pendingNetFx.length = 0
  runtime.ball = null
  runtime.stageTime = 0
  runtime.hitstopMs = 0
  bump('projVersion'); bump('zoneVersion'); bump('summonVersion'); bump('fxVersion')
}
export type { HitSource }
