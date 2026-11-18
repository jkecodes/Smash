import { MAX_DAMAGE } from './constants'
import { addFx, runtime } from './runtime'
import { resolveStage, type StageGimmickDef } from './stages'
import { getActiveFighterIds, useGameStore } from './store'
import type { FighterId } from './types'

export interface GimmickRuntimeState {
  t: number
  cooldowns: Record<string, number>
  pickupReady: boolean
  pickupTimer: number
  hazardPos: [number, number]
  hazardState: 'idle' | 'warn' | 'active'
  hazardTimer: number
  windDir: number
}

export const gimmickRuntime: GimmickRuntimeState = {
  t: 0,
  cooldowns: {},
  pickupReady: true,
  pickupTimer: 2,
  hazardPos: [0, 0.8],
  hazardState: 'idle',
  hazardTimer: 3,
  windDir: 1,
}

export function resetGimmicks() {
  gimmickRuntime.t = 0
  gimmickRuntime.cooldowns = {}
  gimmickRuntime.pickupReady = true
  gimmickRuntime.pickupTimer = 2
  gimmickRuntime.hazardPos = [0, 0.8]
  gimmickRuntime.hazardState = 'idle'
  gimmickRuntime.hazardTimer = 3
  gimmickRuntime.windDir = 1
}

function stepBumper(g: StageGimmickDef) {
  const fs = useGameStore.getState().fighters
  for (const id of getActiveFighterIds()) {
    const f = fs[id]
    if (!f?.alive || f.fsm === 'LEDGE') continue
    if ((gimmickRuntime.cooldowns[id] ?? 0) > 0) continue
    const dx = f.pos[0] - g.pos[0]
    const dy = f.pos[1] - g.pos[1]
    if (Math.hypot(dx, dy) > g.radius + 0.55) continue
    const rb = runtime.bodies[id]
    if (!rb) continue
    const v = rb.linvel()
    const vx = g.mode === 'radial' ? Math.sign(dx || 1) * g.power * 0.65 : v.x
    rb.setLinvel({ x: vx, y: g.power, z: 0 }, true)
    f.jumpsLeft = Math.max(1, f.jumpsLeft)
    gimmickRuntime.cooldowns[id] = 0.65
    addFx({ kind: 'ring', pos: [g.pos[0], g.pos[1], 0], color: g.color, ttl: 320, radius: g.radius * 1.9 })
    addFx({ kind: 'burst', pos: [f.pos[0], f.pos[1], 0], color: g.color, ttl: 280, count: 10, speed: 5, size: 0.14 })
  }
}

function stepWind(g: StageGimmickDef, dt: number) {
  const interval = g.interval ?? 5
  gimmickRuntime.windDir = g.mode === 'up' ? 1 : (Math.sin((gimmickRuntime.t * Math.PI) / interval) >= 0 ? 1 : -1)
  const fs = useGameStore.getState().fighters
  for (const id of getActiveFighterIds()) {
    const f = fs[id]
    if (!f?.alive || f.fsm === 'LEDGE') continue
    if (Math.abs(f.pos[0] - g.pos[0]) > g.radius || Math.abs(f.pos[1] - g.pos[1]) > 5.0) continue
    const rb = runtime.bodies[id]
    const v = rb?.linvel()
    if (!rb || !v) continue
    if (g.mode === 'up') {
      rb.setLinvel({ x: v.x, y: Math.min(9.5, v.y + g.power * dt), z: 0 }, true)
    } else {
      rb.setLinvel({ x: v.x + gimmickRuntime.windDir * g.power * dt, y: v.y, z: 0 }, true)
    }
  }
}

function stepPortal(g: StageGimmickDef) {
  const posA = g.pos
  const posB = g.pos2 ?? [-g.pos[0], g.pos[1]]
  const fs = useGameStore.getState().fighters
  for (const id of getActiveFighterIds()) {
    const f = fs[id]
    if (!f?.alive || f.fsm === 'LEDGE') continue
    if ((gimmickRuntime.cooldowns[id] ?? 0) > 0) continue
    const rb = runtime.bodies[id]
    if (!rb) continue
    const dA = Math.hypot(f.pos[0] - posA[0], f.pos[1] - posA[1])
    const dB = Math.hypot(f.pos[0] - posB[0], f.pos[1] - posB[1])
    let dest: [number, number] | null = null
    let src: [number, number] | null = null
    if (dA <= g.radius + 0.4) { src = posA; dest = posB }
    else if (dB <= g.radius + 0.4) { src = posB; dest = posA }
    if (!dest || !src) continue
    rb.setTranslation({ x: dest[0], y: dest[1] + 0.25, z: 0 }, true)
    f.pos = [dest[0], dest[1] + 0.25, 0]
    gimmickRuntime.cooldowns[id] = 1.8
    addFx({ kind: 'ring', pos: [src[0], src[1], 0], color: g.color, ttl: 320, radius: g.radius * 1.6 })
    addFx({ kind: 'ring', pos: [dest[0], dest[1] + 0.25, 0], color: g.color, ttl: 360, radius: g.radius * 1.8 })
  }
}

function stepPickup(g: StageGimmickDef, dt: number) {
  if (!gimmickRuntime.pickupReady) {
    gimmickRuntime.pickupTimer -= dt
    if (gimmickRuntime.pickupTimer <= 0) {
      gimmickRuntime.pickupReady = true
      addFx({ kind: 'ring', pos: [g.pos[0], g.pos[1], 0], color: g.color, ttl: 320, radius: g.radius * 1.5 })
    }
    return
  }
  const fs = useGameStore.getState().fighters
  for (const id of getActiveFighterIds()) {
    const f = fs[id]
    if (!f?.alive || f.fsm === 'LEDGE') continue
    if (Math.hypot(f.pos[0] - g.pos[0], f.pos[1] - g.pos[1]) > g.radius + 0.45) continue
    gimmickRuntime.pickupReady = false
    gimmickRuntime.pickupTimer = g.interval ?? 9
    if (g.mode === 'heal') {
      f.damage = Math.max(0, f.damage - g.power)
    } else {
      f.energy = Math.min(100, f.energy + g.power)
    }
    addFx({ kind: 'burst', pos: [g.pos[0], g.pos[1], 0], color: g.color, ttl: 380, count: 14, speed: 5.5, size: 0.16 })
    break
  }
}

function hitFighter(id: FighterId, dmg: number, srcX: number, color: string) {
  const f = useGameStore.getState().fighters[id]
  if (!f?.alive || f.fsm === 'LEDGE' || f.invulnMs > 0) return
  if ((gimmickRuntime.cooldowns[id] ?? 0) > 0) return
  const rb = runtime.bodies[id]
  if (!rb) return
  f.damage = Math.min(MAX_DAMAGE, f.damage + dmg)
  f.hitstunMs = 260
  f.invulnMs = 450
  f.flashMs = 140
  const dir = Math.sign(f.pos[0] - srcX || 1)
  rb.setLinvel({ x: dir * (6 + f.damage * 0.05), y: 8.0 + f.damage * 0.04, z: 0 }, true)
  gimmickRuntime.cooldowns[id] = 1.0
  addFx({ kind: 'burst', pos: [f.pos[0], f.pos[1], 0], color, ttl: 300, count: 10, speed: 5, size: 0.14 })
}

function stepHazard(g: StageGimmickDef, halfX: number, dt: number) {
  const fs = useGameStore.getState().fighters
  if (g.mode === 'patrol') {
    const ampX = g.pos2?.[0] ?? 6
    const ampY = g.pos2?.[1] ?? 0
    const spd = g.interval ? (Math.PI * 2) / g.interval : 1.35
    const hx = g.pos[0] + Math.sin(gimmickRuntime.t * spd) * ampX
    const hy = g.pos[1] + Math.cos(gimmickRuntime.t * spd * 1.15) * ampY
    gimmickRuntime.hazardPos = [hx, hy]
    gimmickRuntime.hazardState = 'active'
    for (const id of getActiveFighterIds()) {
      const f = fs[id]
      if (!f?.alive) continue
      if (Math.hypot(f.pos[0] - hx, f.pos[1] - hy) <= g.radius + 0.4) {
        hitFighter(id, g.power, hx, g.color)
      }
    }
    return
  }

  if (g.mode === 'pull') {
    gimmickRuntime.hazardTimer -= dt
    if (gimmickRuntime.hazardState === 'idle') {
      gimmickRuntime.hazardPos = [...g.pos]
      if (gimmickRuntime.hazardTimer <= 0) {
        gimmickRuntime.hazardState = 'active'
        gimmickRuntime.hazardTimer = 3.2
        addFx({ kind: 'ring', pos: [g.pos[0], g.pos[1], 0], color: g.color, ttl: 400, radius: g.radius })
      }
    } else {
      for (const id of getActiveFighterIds()) {
        const f = fs[id]
        if (!f?.alive || f.fsm === 'LEDGE') continue
        const dx = g.pos[0] - f.pos[0]
        const dy = g.pos[1] - f.pos[1]
        const dist = Math.hypot(dx, dy)
        if (dist > g.radius) continue
        const rb = runtime.bodies[id]
        const v = rb?.linvel()
        if (rb && v && dist > 0.4) {
          rb.setLinvel({ x: v.x + (dx / dist) * g.power * dt, y: v.y + (dy / dist) * g.power * 0.45 * dt, z: 0 }, true)
        }
        if (dist < 1.3 && f.invulnMs <= 0) {
          f.damage = Math.min(MAX_DAMAGE, f.damage + 4 * dt)
          f.flashMs = Math.max(f.flashMs, 50)
        }
      }
      if (gimmickRuntime.hazardTimer <= 0) {
        gimmickRuntime.hazardState = 'idle'
        gimmickRuntime.hazardTimer = g.interval ?? 5
      }
    }
    return
  }

  // mode === 'bomb'
  gimmickRuntime.hazardTimer -= dt
  if (gimmickRuntime.hazardState === 'idle') {
    if (gimmickRuntime.hazardTimer <= 0) {
      const rx = (Math.sin(gimmickRuntime.t * 3.7) * 0.72) * halfX
      gimmickRuntime.hazardPos = [rx, g.pos[1]]
      gimmickRuntime.hazardState = 'warn'
      gimmickRuntime.hazardTimer = 1.55
    }
  } else if (gimmickRuntime.hazardState === 'warn') {
    if (gimmickRuntime.hazardTimer <= 0) {
      gimmickRuntime.hazardState = 'active'
      gimmickRuntime.hazardTimer = 0.25
      const [hx, hy] = gimmickRuntime.hazardPos
      runtime.shake = Math.max(runtime.shake, 0.25)
      addFx({ kind: 'ring', pos: [hx, hy, 0], color: g.color, ttl: 380, radius: g.radius * 1.4 })
      addFx({ kind: 'burst', pos: [hx, hy, 0], color: g.color, ttl: 420, count: 18, speed: 7, size: 0.2 })
      for (const id of getActiveFighterIds()) {
        const f = fs[id]
        if (!f?.alive) continue
        if (Math.hypot(f.pos[0] - hx, f.pos[1] - hy) <= g.radius + 0.5) {
          hitFighter(id, g.power, hx, g.color)
        }
      }
    }
  } else if (gimmickRuntime.hazardTimer <= 0) {
    gimmickRuntime.hazardState = 'idle'
    gimmickRuntime.hazardTimer = g.interval ?? 4.2
  }
}

export function stepGimmicks(dt: number) {
  const s = useGameStore.getState()
  const stage = resolveStage(s.stageId, s.stageForm)
  const g = stage.gimmick
  if (!g) return

  gimmickRuntime.t += dt
  for (const k of Object.keys(gimmickRuntime.cooldowns)) {
    gimmickRuntime.cooldowns[k] = Math.max(0, gimmickRuntime.cooldowns[k] - dt)
  }

  switch (g.kind) {
    case 'bumper': stepBumper(g); break
    case 'wind': stepWind(g, dt); break
    case 'portal': stepPortal(g); break
    case 'pickup': stepPickup(g, dt); break
    case 'hazard': stepHazard(g, stage.half.x, dt); break
  }
}
