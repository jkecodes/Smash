import { registerSkill } from './registry'

/** 範例 1：近戰突進 —— 前搖 → 向前衝刺並持續判定 → 後搖 */
registerSkill({
  id: 'cube.dashStrike', name: '近戰突進', energyCost: 10,
  startupMs: 140, activeMs: 220, recoveryMs: 260,
  hitbox: { offset: [0, 0, 0.9], radius: 0.95 },
  damage: 8,
  knockback: { dir: [0, 0.5, 1], base: 9, scaling: 15 },
  hooks: {
    onActive(ctx) { ctx.shake(0.12) },
    onTick(ctx) {
      if (ctx.phase !== 'active') return
      ctx.setLocalVelocity(0, 0, 22)
      ctx.scratch.trail = (ctx.scratch.trail ?? 0) - ctx.dt * 1000
      if (ctx.scratch.trail <= 0) {
        ctx.scratch.trail = 45
        ctx.fx({ kind: 'afterimage', pos: [...ctx.caster.pos], yaw: Math.atan2(ctx.forward[0], ctx.forward[2]), color: '#ff7a7a', ttl: 260 })
      }
    },
    onHit(ctx) { ctx.caster.energy = Math.min(100, ctx.caster.energy + 4) }, // 自訂效果示範：命中回能
  },
})

/** 範例 2：遠程能量波 —— 判定開始時發射投射物 */
registerSkill({
  id: 'cube.energyWave', name: '能量波', energyCost: 20, cooldownMs: 600,
  startupMs: 220, activeMs: 40, recoveryMs: 300,
  damage: 6,
  knockback: { dir: [0, 0.3, 1], base: 9, scaling: 13 },
  projectile: { speed: 17, radius: 0.6, lifetimeMs: 1600, pierce: false, offset: [0, 0.1, 1.2], color: '#ffd45e' },
  hooks: {
    onActive(ctx) {
      const p = ctx.toWorld([0, 0.1, 1.2])
      ctx.fx({ kind: 'burst', pos: [ctx.caster.pos[0] + p[0], ctx.caster.pos[1] + p[1], 0], color: '#ffd45e', ttl: 350, count: 14, speed: 5, size: 0.2 })
    },
  },
})

/** 範例 3：範圍震地擊飛 —— 以腳下為中心的球形判定，徑向擊飛 */
registerSkill({
  id: 'cube.quake', name: '震地擊飛', energyCost: 30, cooldownMs: 1500,
  startupMs: 350, activeMs: 110, recoveryMs: 450,
  hitbox: { offset: [0, -0.3, 0], radius: 3.6 },
  damage: 9,
  knockback: { dir: [0, 0.9, 1], base: 12, scaling: 17, radial: true },
  hooks: {
    onActive(ctx) {
      const p: [number, number, number] = [ctx.caster.pos[0], ctx.caster.pos[1] - 0.45, 0]
      ctx.fx({ kind: 'ring', pos: p, color: '#ffb84d', ttl: 450, radius: 3.6 })
      ctx.fx({ kind: 'burst', pos: p, color: '#ffe08a', ttl: 600, count: 36, speed: 8, size: 0.22 })
      ctx.shake(0.5)
    },
  },
})

/** CUBE 大招：超新星 —— 蓄勢後大範圍徑向爆發（需先打破大招球） */
registerSkill({
  id: 'cube.supernova', name: '超新星', energyCost: 0, requiresUlt: true,
  startupMs: 650, activeMs: 140, recoveryMs: 500,
  hitbox: { offset: [0, 0, 0], radius: 6.5 },
  damage: 16,
  knockback: { dir: [0, 0.8, 1], base: 22, scaling: 18, radial: true, hitstunMs: 1200 },
  hooks: {
    onStart(ctx) { ctx.setGravityScale(0.2) },
    onTick(ctx) {
      if (ctx.phase === 'recovery') return
      ctx.setInvulnerable(120)
      if (ctx.phase === 'startup') {
        ctx.scratch.t = (ctx.scratch.t ?? 0) - ctx.dt * 1000
        if (ctx.scratch.t <= 0) {
          ctx.scratch.t = 80
          ctx.fx({ kind: 'ring', pos: [...ctx.caster.pos], color: '#ffb347', ttl: 320, radius: 1 + (ctx.phaseMs / 650) * 2.5 })
        }
      }
    },
    onActive(ctx) {
      const p: [number, number, number] = [ctx.caster.pos[0], ctx.caster.pos[1], 0]
      ctx.fx({ kind: 'ring', pos: p, color: '#ffffff', ttl: 600, radius: 6.5 })
      ctx.fx({ kind: 'ring', pos: p, color: '#ff8a3d', ttl: 800, radius: 7.5 })
      ctx.fx({ kind: 'burst', pos: p, color: '#ffd9a0', ttl: 900, count: 90, speed: 13, size: 0.28 })
      ctx.shake(1.1)
    },
    onEnd(ctx) { ctx.setGravityScale(1) },
  },
})

/** 上 + 特招：升龍拳 —— 向上攻擊，同時可用來回場 */
registerSkill({
  id: 'cube.risingStrike', name: '升龍拳', energyCost: 10, cooldownMs: 1500,
  startupMs: 100, activeMs: 300, recoveryMs: 380,
  hitbox: { offset: [0, 0.9, 0.3], radius: 1.15 },
  damage: 9,
  knockback: { dir: [0, 1, 0.2], base: 12, scaling: 16 },
  hooks: {
    onActive(ctx) { ctx.shake(0.15); ctx.setLocalVelocity(2.5, 17, 2.5) },
    onTick(ctx) {
      if (ctx.phase !== 'active') return
      ctx.scratch.trail = (ctx.scratch.trail ?? 0) - ctx.dt * 1000
      if (ctx.scratch.trail <= 0) {
        ctx.scratch.trail = 45
        ctx.fx({ kind: 'afterimage', pos: [...ctx.caster.pos], yaw: Math.atan2(ctx.forward[0], ctx.forward[2]), color: '#ff7a7a', ttl: 260 })
      }
    },
  },
})
