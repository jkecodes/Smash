import { registerSkill } from './registry'
import type { SkillContext } from '../types'

const C = '#5dc8ff'
type P3 = [number, number, number]
const yawOf = (ctx: SkillContext) => Math.atan2(ctx.forward[0], ctx.forward[2])
const frontPos = (ctx: SkillContext, d: number): P3 => {
  const w = ctx.toWorld([0, 0.1, d])
  return [ctx.caster.pos[0] + w[0], ctx.caster.pos[1] + w[1], 0]
}

/** ---------- 普通攻擊：3 段連擊（前搖皆 80ms） ---------- */
registerSkill({
  id: 'nova.a1', name: '斬擊·壹', energyCost: 0, startupMs: 80, activeMs: 90, recoveryMs: 170,
  hitbox: { offset: [0, 0.1, 1.05], radius: 0.95 }, damage: 3,
  knockback: { dir: [0, 0.15, 1], base: 3.5, scaling: 4, hitstunMs: 260 }, chain: 'nova.a2',
  hooks: {
    onActive(ctx) {
      ctx.setLocalVelocity(0, null, 5)
      ctx.fx({ kind: 'slash', pos: frontPos(ctx, 0.9), yaw: yawOf(ctx), plane: 'horizontal', tilt: 0.25, color: C, ttl: 200, radius: 1.5 })
      ctx.fx({ kind: 'afterimage', pos: [...ctx.caster.pos], yaw: yawOf(ctx), color: C, ttl: 220 })
    },
  },
})
registerSkill({
  id: 'nova.a2', name: '斬擊·貳', energyCost: 0, startupMs: 80, activeMs: 90, recoveryMs: 170,
  hitbox: { offset: [0, 0.1, 1.05], radius: 0.95 }, damage: 3,
  knockback: { dir: [0, 0.15, 1], base: 3.5, scaling: 4, hitstunMs: 260 }, chain: 'nova.a3',
  hooks: {
    onActive(ctx) {
      ctx.setLocalVelocity(0, null, 5)
      ctx.fx({ kind: 'slash', pos: frontPos(ctx, 0.9), yaw: yawOf(ctx), plane: 'horizontal', tilt: -0.25, flip: true, color: '#9ae3ff', ttl: 200, radius: 1.5 })
      ctx.fx({ kind: 'afterimage', pos: [...ctx.caster.pos], yaw: yawOf(ctx), color: C, ttl: 220 })
    },
  },
})
registerSkill({
  id: 'nova.a3', name: '斬擊·終', energyCost: 0, startupMs: 80, activeMs: 110, recoveryMs: 330,
  hitbox: { offset: [0, 0.1, 1.2], radius: 1.1 }, damage: 6,
  knockback: { dir: [0, 0.3, 1], base: 10, scaling: 12 }, // 輕微向前擊飛
  hooks: {
    onActive(ctx) {
      ctx.setLocalVelocity(0, null, 8)
      ctx.shake(0.2)
      ctx.fx({ kind: 'slash', pos: frontPos(ctx, 1.1), yaw: yawOf(ctx), plane: 'vertical', color: '#ffffff', ttl: 260, radius: 1.9 })
      ctx.fx({ kind: 'burst', pos: frontPos(ctx, 1.4), color: C, ttl: 400, count: 18, speed: 6, size: 0.16 })
      for (let i = 0; i < 3; i++) {
        const p: P3 = [ctx.caster.pos[0] - ctx.forward[0] * i * 0.45, ctx.caster.pos[1], 0]
        ctx.fx({ kind: 'afterimage', pos: p, yaw: yawOf(ctx), color: C, ttl: 300 + i * 60 })
      }
    },
  },
})

/** ---------- 技能 1：瞬移 3m + 起點減速力場（CD 4s） ---------- */
registerSkill({
  id: 'nova.blink', name: '殘影瞬步', energyCost: 0, cooldownMs: 4000,
  startupMs: 80, activeMs: 60, recoveryMs: 130, damage: 0,
  knockback: { dir: [0, 0, 0], base: 0, scaling: 0 },
  hooks: {
    onStart(ctx) { ctx.fx({ kind: 'burst', pos: [...ctx.caster.pos], color: C, ttl: 300, count: 10, speed: 3, size: 0.14 }) },
    onActive(ctx) {
      const s: P3 = [ctx.caster.pos[0], ctx.caster.pos[1], 0]
      const f = ctx.forward
      ctx.spawnZone([s[0], s[1] - 0.45, 0], { radius: 2.6, durationMs: 2000, slowFactor: 0.5, color: '#7a5cff' })
      for (let i = 0; i < 5; i++) // 沿路徑留下殘影
        ctx.fx({ kind: 'afterimage', pos: [s[0] + f[0] * 0.6 * i, s[1], 0], yaw: yawOf(ctx), color: '#9a8cff', ttl: 350 + i * 50 })
      ctx.teleport([s[0] + f[0] * 3, s[1], 0])
      ctx.setVelocity(0, 0, 0)
      ctx.fx({ kind: 'ring', pos: [s[0] + f[0] * 3, s[1] - 0.45, 0], color: C, ttl: 350, radius: 1.4 })
      ctx.fx({ kind: 'burst', pos: [s[0] + f[0] * 3, s[1], 0], color: C, ttl: 400, count: 16, speed: 5, size: 0.15 })
    },
  },
})

/** ---------- 技能 2：蓄力貫穿雷射（按住蓄力最多 1.5s） ---------- */
registerSkill({
  id: 'nova.beam', name: '稜鏡雷射', energyCost: 0, cooldownMs: 1500,
  startupMs: 120, activeMs: 160, recoveryMs: 420,
  hitbox: { offset: [0, 0.1, 0.6], radius: 0.55, length: 18 }, // 貫穿：hitSet 讓每個目標僅命中一次，且不會被擋下
  damage: 7,
  knockback: { dir: [0, 0.25, 1], base: 8, scaling: 11 },
  charge: { maxMs: 1500, knockbackMult: [1, 2.8], damageMult: [1, 2] },
  hooks: {
    onTick(ctx) {
      if (ctx.phase !== 'startup') return
      ctx.scratch.t = (ctx.scratch.t ?? 0) - ctx.dt * 1000
      if (ctx.scratch.t <= 0) {
        ctx.scratch.t = 110
        ctx.fx({ kind: 'burst', pos: frontPos(ctx, 0.9), color: C, ttl: 260, count: 4 + Math.round(ctx.chargeRatio * 8), speed: 2.5, size: 0.1 + ctx.chargeRatio * 0.1 })
      }
    },
    onActive(ctx) {
      const r = ctx.chargeRatio
      ctx.fx({ kind: 'beam', pos: frontPos(ctx, 0.6), yaw: yawOf(ctx), length: 18, radius: 0.35 + r * 0.55, color: r > 0.95 ? '#ffffff' : C, ttl: 320 })
      ctx.fx({ kind: 'burst', pos: frontPos(ctx, 0.8), color: '#ffffff', ttl: 400, count: 16 + Math.round(r * 24), speed: 7, size: 0.16 })
      ctx.shake(0.15 + r * 0.6)
    },
  },
})

/** ---------- 終極大招：升空 → 鎖定俯衝 → 半徑 5m 衝擊波垂直擊飛 ---------- */
registerSkill({
  id: 'nova.cataclysm', name: '終焉墜擊', energyCost: 0, requiresUlt: true,
  startupMs: 550, activeMs: 2200, recoveryMs: 520,
  hitbox: { offset: [0, -0.45, 0], radius: 5, manual: true },
  damage: 14,
  knockback: { dir: [0, 1, 0], base: 24, scaling: 14, hitstunMs: 1400 }, // 垂直向上
  hooks: {
    onStart(ctx) {
      ctx.setGravityScale(0.15)
      ctx.setVelocity(0, 16, 0)
      ctx.fx({ kind: 'ring', pos: [ctx.caster.pos[0], ctx.caster.pos[1] - 0.45, 0], color: C, ttl: 500, radius: 2.5 })
    },
    onTick(ctx) {
      if (ctx.phase === 'recovery') return
      ctx.setInvulnerable(120) // 施放期間霸體無敵，避免被打斷
      ctx.scratch.trail = (ctx.scratch.trail ?? 0) - ctx.dt * 1000
      if (ctx.scratch.trail <= 0) {
        ctx.scratch.trail = 35
        ctx.fx({ kind: 'afterimage', pos: [...ctx.caster.pos], yaw: yawOf(ctx), color: ctx.phase === 'active' ? '#ffffff' : C, ttl: 320 })
      }
      if (ctx.phase !== 'active') return
      const t = ctx.nearestEnemy()
      const px = ctx.caster.pos[0]
      const py = ctx.caster.pos[1]
      let vx = 0
      if (t) {
        vx = Math.max(-26, Math.min(26, (t.pos[0] - px) * 7))
        ctx.scratch.lockT = (ctx.scratch.lockT ?? 0) - ctx.dt * 1000
        if (ctx.scratch.lockT <= 0) { // 鎖定標記
          ctx.scratch.lockT = 90
          ctx.fx({ kind: 'ring', pos: [t.pos[0], 0.05, 0], color: '#ff4d6d', ttl: 160, radius: 1.2 })
        }
      }
      ctx.setVelocity(vx, -42, 0)
      if (ctx.isGrounded() || py < 0.6) {
        ctx.strike()
        const g: P3 = [px, 0.05, 0]
        ctx.fx({ kind: 'ring', pos: g, color: '#ffffff', ttl: 600, radius: 5 })
        ctx.fx({ kind: 'ring', pos: g, color: C, ttl: 800, radius: 5.5 })
        ctx.fx({ kind: 'pillar', pos: g, color: C, ttl: 600, radius: 2 })
        ctx.fx({ kind: 'burst', pos: g, color: '#ffffff', ttl: 900, count: 80, speed: 12, size: 0.25 })
        ctx.shake(1.2)
        ctx.endActive()
      } else if (py < -6) ctx.endActive()
    },
    onEnd(ctx) { ctx.setGravityScale(1) },
  },
})

/** 上 + 特招：升空斬 —— 向上斬擊，同時可用來回場 */
registerSkill({
  id: 'nova.skyBlade', name: '升空斬', energyCost: 0, cooldownMs: 1200,
  startupMs: 90, activeMs: 300, recoveryMs: 340,
  hitbox: { offset: [0, 1.0, 0.5], radius: 1.25 },
  damage: 8,
  knockback: { dir: [0, 1, 0.25], base: 11, scaling: 14 },
  hooks: {
    onActive(ctx) {
      ctx.setLocalVelocity(0, 18, 3)
      ctx.shake(0.15)
      const p: P3 = [ctx.caster.pos[0] + ctx.forward[0] * 0.5, ctx.caster.pos[1] + 0.9, 0]
      ctx.fx({ kind: 'slash', pos: p, yaw: yawOf(ctx), plane: 'horizontal', tilt: Math.PI / 4, color: '#ffffff', ttl: 280, radius: 2 })
      ctx.fx({ kind: 'burst', pos: p, color: C, ttl: 400, count: 16, speed: 6, size: 0.15 })
    },
    onTick(ctx) {
      if (ctx.phase !== 'active') return
      ctx.scratch.trail = (ctx.scratch.trail ?? 0) - ctx.dt * 1000
      if (ctx.scratch.trail <= 0) {
        ctx.scratch.trail = 40
        ctx.fx({ kind: 'afterimage', pos: [...ctx.caster.pos], yaw: yawOf(ctx), color: C, ttl: 300 })
      }
    },
  },
})
