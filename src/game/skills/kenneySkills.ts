import { registerSkill } from './registry'
import type { SkillContext, SkillDef } from '../types'

type P3 = [number, number, number]
const yawOf = (c: SkillContext) => Math.atan2(c.forward[0], c.forward[2])
/** 局部座標 → 世界座標（2.5D，z 恆為 0） */
const at = (c: SkillContext, y: number, fwd: number): P3 => {
  const w = c.toWorld([0, y, fwd])
  return [c.caster.pos[0] + w[0], c.caster.pos[1] + w[1], 0]
}
/** 每 ms 毫秒留一個殘影 */
function trail(c: SkillContext, ms: number, color: string, ttl = 260) {
  c.scratch.tr = (c.scratch.tr ?? 0) - c.dt * 1000
  if (c.scratch.tr <= 0) {
    c.scratch.tr = ms
    c.fx({ kind: 'afterimage', pos: [...c.caster.pos], yaw: yawOf(c), color, ttl })
  }
}
const slash = (c: SkillContext, color: string, o: { d?: number; r?: number; tilt?: number; flip?: boolean; ttl?: number } = {}) =>
  c.fx({ kind: 'slash', pos: at(c, 0.1, o.d ?? 0.9), yaw: yawOf(c), plane: 'horizontal', tilt: o.tilt ?? 0.25, flip: o.flip, color, ttl: o.ttl ?? 220, radius: o.r ?? 1.5 })
const noKb = { dir: [0, 0, 0] as P3, base: 0, scaling: 0 }
const reg = (d: SkillDef) => registerSkill(d)

/** 「上 + 特招」通用升空攻擊：頭頂判定 + 向上位移 */
const upAttack = (id: string, name: string, color: string, o: { dmg: number; base: number; scaling: number; rise: number; vx?: number; cd?: number }): SkillDef => ({
  id, name, energyCost: 0, cooldownMs: o.cd ?? 1500, startupMs: 100, activeMs: 300, recoveryMs: 360,
  hitbox: { offset: [0, 0.95, 0.35], radius: 1.2 }, damage: o.dmg,
  knockback: { dir: [0, 1, 0.2], base: o.base, scaling: o.scaling },
  hooks: {
    onActive(c) {
      c.setLocalVelocity(0, o.rise, o.vx ?? 2.5)
      c.shake(0.15)
      c.fx({ kind: 'slash', pos: at(c, 0.9, 0.5), yaw: yawOf(c), plane: 'horizontal', tilt: Math.PI / 4, color, ttl: 260, radius: 1.9 })
      c.fx({ kind: 'burst', pos: [...c.caster.pos], color, ttl: 350, count: 12, speed: 5, size: 0.14 })
    },
    onTick(c) { if (c.phase === 'active') trail(c, 45, color, 280) },
  },
})

// =====================================================================
//  KNIGHT 騎士：重型近戰。慢、重、擊飛強
// =====================================================================
const K = '#d7e0ee'
reg({
  id: 'knight.a1', name: '斬', energyCost: 0, startupMs: 130, activeMs: 100, recoveryMs: 190,
  hitbox: { offset: [0, 0.1, 1.15], radius: 1.05 }, damage: 5,
  knockback: { dir: [0, 0.2, 1], base: 5, scaling: 6, hitstunMs: 280 }, chain: 'knight.a2',
  hooks: { onActive(c) { c.setLocalVelocity(0, null, 4); slash(c, K, { r: 1.7 }) } },
})
reg({
  id: 'knight.a2', name: '重劈', energyCost: 0, startupMs: 150, activeMs: 120, recoveryMs: 400,
  hitbox: { offset: [0, 0.2, 1.25], radius: 1.2 }, damage: 8,
  knockback: { dir: [0, 0.35, 1], base: 9, scaling: 11 },
  hooks: { onActive(c) { c.setLocalVelocity(0, null, 6); c.shake(0.2); slash(c, '#ffffff', { r: 2, tilt: -0.5, flip: true, ttl: 280 }) } },
})
reg({
  id: 'knight.shieldBash', name: '盾衝', energyCost: 0, cooldownMs: 3000, startupMs: 160, activeMs: 260, recoveryMs: 300,
  hitbox: { offset: [0, 0, 0.9], radius: 1.0 }, damage: 6,
  knockback: { dir: [0, 0.3, 1], base: 12, scaling: 10 },
  hooks: {
    onActive(c) { c.shake(0.15) },
    onTick(c) { if (c.phase === 'active') { c.setLocalVelocity(0, null, 15); trail(c, 50, K) } },
  },
})
reg(upAttack('knight.risingSlash', '升龍斬', K, { dmg: 9, base: 13, scaling: 15, rise: 16 }))
reg({
  id: 'knight.chargeSlash', name: '蓄力重斬', energyCost: 0, cooldownMs: 1500, startupMs: 100, activeMs: 130, recoveryMs: 450,
  hitbox: { offset: [0, 0.2, 1.3], radius: 1.4 }, damage: 9,
  knockback: { dir: [0, 0.4, 1], base: 11, scaling: 13 },
  charge: { maxMs: 1200, knockbackMult: [1, 2.6], damageMult: [1, 2] },
  hooks: {
    onTick(c) {
      if (c.phase !== 'startup') return
      c.scratch.t = (c.scratch.t ?? 0) - c.dt * 1000
      if (c.scratch.t <= 0) { c.scratch.t = 120; c.fx({ kind: 'burst', pos: at(c, 0.6, 0.4), color: '#ffd76a', ttl: 260, count: 4 + Math.round(c.chargeRatio * 8), speed: 2.5, size: 0.12 }) }
    },
    onActive(c) {
      c.setLocalVelocity(0, null, 5)
      c.shake(0.2 + c.chargeRatio * 0.6)
      slash(c, c.chargeRatio > 0.95 ? '#ffe9a0' : '#ffffff', { r: 1.8 + c.chargeRatio * 1.2, tilt: 0.7, ttl: 320 })
      c.fx({ kind: 'burst', pos: at(c, 0.2, 1.5), color: '#ffd76a', ttl: 450, count: 14 + Math.round(c.chargeRatio * 24), speed: 7, size: 0.18 })
    },
  },
})
reg({
  id: 'knight.judgment', name: '聖光審判', energyCost: 0, requiresUlt: true, startupMs: 700, activeMs: 200, recoveryMs: 500,
  hitbox: { offset: [0, 0, 0], radius: 3.2, manual: true }, damage: 15,
  knockback: { dir: [0, 1, 0], base: 25, scaling: 14, hitstunMs: 1300 },
  hooks: {
    onStart(c) { c.setGravityScale(0.2); c.setVelocity(0, 6, 0) },
    onTick(c) {
      if (c.phase === 'recovery') return
      c.setInvulnerable(120)
      const t = c.nearestEnemy()
      if (t && c.phase === 'startup') { // 預警圈鎖定在敵人腳下
        c.scratch.w = (c.scratch.w ?? 0) - c.dt * 1000
        if (c.scratch.w <= 0) { c.scratch.w = 90; c.fx({ kind: 'ring', pos: [t.pos[0], 0.05, 0], color: '#ffe48a', ttl: 200, radius: 1.6 }) }
        c.scratch.tx = t.pos[0]
      }
    },
    onActive(c) {
      const tx: number = c.scratch.tx ?? c.caster.pos[0]
      // 光柱落在鎖定位置：以局部座標換算判定中心
      c.strike({ offset: [0, -c.caster.pos[1] + 0.5, (tx - c.caster.pos[0]) * c.forward[0]] })
      const g: P3 = [tx, 0.05, 0]
      c.fx({ kind: 'pillar', pos: g, color: '#ffe48a', ttl: 700, radius: 2.2 })
      c.fx({ kind: 'ring', pos: g, color: '#ffffff', ttl: 600, radius: 3.4 })
      c.fx({ kind: 'burst', pos: g, color: '#fff1b8', ttl: 900, count: 70, speed: 10, size: 0.25 })
      c.shake(1)
    },
    onEnd(c) { c.setGravityScale(1) },
  },
})

// =====================================================================
//  ROBOT 機器人：遠程火力 + 控場
// =====================================================================
const R = '#ffb04d'
reg({
  id: 'robot.shot', name: '速射', energyCost: 0, startupMs: 90, activeMs: 40, recoveryMs: 160, damage: 3,
  knockback: { dir: [0, 0.1, 1], base: 3, scaling: 3, hitstunMs: 200 },
  projectile: { speed: 24, radius: 0.28, lifetimeMs: 900, pierce: false, offset: [0, 0.15, 0.9], color: '#ffd24d' },
  hooks: { onActive(c) { c.fx({ kind: 'burst', pos: at(c, 0.15, 0.9), color: '#ffd24d', ttl: 180, count: 5, speed: 3, size: 0.1 }) } },
})
reg({
  id: 'robot.rocket', name: '爆裂飛彈', energyCost: 0, cooldownMs: 2500, startupMs: 220, activeMs: 40, recoveryMs: 350, damage: 9,
  knockback: { dir: [0, 0.7, 1], base: 11, scaling: 14, radial: true },
  projectile: { speed: 12, radius: 0.5, lifetimeMs: 1800, pierce: false, offset: [0, 0.2, 1.0], color: R, explodeRadius: 2.3 },
  hooks: { onActive(c) { c.shake(0.15); c.setLocalVelocity(-3, null, -3) } },
})
reg(upAttack('robot.thruster', '噴射升空', R, { dmg: 8, base: 12, scaling: 14, rise: 17 }))
reg({
  id: 'robot.emp', name: '電磁脈衝', energyCost: 0, cooldownMs: 4000, startupMs: 300, activeMs: 100, recoveryMs: 400,
  hitbox: { offset: [0, 0, 0], radius: 3.2 }, damage: 5,
  knockback: { dir: [0, 0.5, 1], base: 6, scaling: 6, radial: true, hitstunMs: 550 },
  hooks: {
    onActive(c) {
      const p: P3 = [c.caster.pos[0], c.caster.pos[1] - 0.45, 0]
      c.spawnZone(p, { radius: 3.2, durationMs: 2500, slowFactor: 0.6, color: '#59c8ff' })
      c.fx({ kind: 'ring', pos: p, color: '#59c8ff', ttl: 500, radius: 3.2 })
      c.fx({ kind: 'burst', pos: [...c.caster.pos], color: '#bfeaff', ttl: 500, count: 30, speed: 7, size: 0.16 })
      c.shake(0.3)
    },
  },
})
reg({
  id: 'robot.orbital', name: '軌道砲', energyCost: 0, requiresUlt: true, startupMs: 800, activeMs: 300, recoveryMs: 550,
  hitbox: { offset: [0, 0.1, 0.8], radius: 1.4, length: 24 }, damage: 18,
  knockback: { dir: [0, 0.4, 1], base: 28, scaling: 16, hitstunMs: 1200 },
  hooks: {
    onStart(c) { c.setGravityScale(0.3) },
    onTick(c) {
      if (c.phase === 'recovery') return
      c.setInvulnerable(120)
      if (c.phase === 'startup') {
        c.scratch.t = (c.scratch.t ?? 0) - c.dt * 1000
        if (c.scratch.t <= 0) { c.scratch.t = 70; c.fx({ kind: 'burst', pos: at(c, 0.1, 0.9), color: R, ttl: 260, count: 6, speed: 3, size: 0.14 + (c.phaseMs / 800) * 0.2 }) }
      }
    },
    onActive(c) {
      c.fx({ kind: 'beam', pos: at(c, 0.1, 0.8), yaw: yawOf(c), length: 24, radius: 1.2, color: R, ttl: 500 })
      c.fx({ kind: 'burst', pos: at(c, 0.1, 1), color: '#ffffff', ttl: 700, count: 60, speed: 12, size: 0.25 })
      c.shake(1.2)
    },
    onEnd(c) { c.setGravityScale(1) },
  },
})

// =====================================================================
//  ALIEN 外星人：瞬移突襲 + 重力控場
// =====================================================================
const A = '#8aff7a'
reg({
  id: 'alien.zap', name: '電擊', energyCost: 0, startupMs: 90, activeMs: 90, recoveryMs: 180,
  hitbox: { offset: [0, 0.1, 1.0], radius: 0.95 }, damage: 4,
  knockback: { dir: [0, 0.2, 1], base: 5, scaling: 6, hitstunMs: 240 },
  hooks: {
    onActive(c) {
      c.setLocalVelocity(0, null, 4)
      slash(c, A, { r: 1.4, tilt: 0.3 })
      c.fx({ kind: 'burst', pos: at(c, 0.1, 1.1), color: '#d6ffcf', ttl: 250, count: 8, speed: 5, size: 0.12 })
    },
  },
})
reg({
  id: 'alien.warp', name: '瞬移突襲', energyCost: 0, cooldownMs: 3500, startupMs: 100, activeMs: 160, recoveryMs: 260,
  hitbox: { offset: [0, 0, 0.9], radius: 1.0 }, damage: 6,
  knockback: { dir: [0, 0.3, 1], base: 8, scaling: 10 },
  hooks: {
    onStart(c) { c.fx({ kind: 'burst', pos: [...c.caster.pos], color: A, ttl: 300, count: 12, speed: 4, size: 0.14 }) },
    onActive(c) {
      const me = c.caster, t = c.nearestEnemy()
      for (let i = 0; i < 4; i++) c.fx({ kind: 'afterimage', pos: [me.pos[0], me.pos[1], 0], yaw: yawOf(c), color: A, ttl: 300 + i * 50 })
      let x: number, y: number
      if (t) { // 傳到敵人背後並轉身面對
        const dir = Math.sign(t.pos[0] - me.pos[0]) || me.facing[0]
        x = t.pos[0] + dir * 1.3; y = t.pos[1]
        me.facing = [-dir, 0]
      } else { x = me.pos[0] + me.facing[0] * 4; y = me.pos[1] }
      x = Math.max(-8.6, Math.min(8.6, x)); y = Math.max(0.5, y)
      c.teleport([x, y, 0])
      c.setVelocity(0, 0, 0)
      c.fx({ kind: 'ring', pos: [x, y - 0.45, 0], color: A, ttl: 350, radius: 1.5 })
      c.fx({ kind: 'burst', pos: [x, y, 0], color: '#d6ffcf', ttl: 400, count: 16, speed: 5, size: 0.15 })
    },
  },
})
reg({
  ...upAttack('alien.antigrav', '反重力升空', A, { dmg: 7, base: 10, scaling: 12, rise: 14 }),
  hooks: {
    onActive(c) { c.setGravityScale(0.35); c.setLocalVelocity(0, 14, 2); c.shake(0.12); c.fx({ kind: 'ring', pos: [...c.caster.pos], color: A, ttl: 400, radius: 1.6 }) },
    onTick(c) { if (c.phase === 'active') trail(c, 50, A, 300) },
    onEnd(c) { c.setGravityScale(1) },
  },
})
reg({
  id: 'alien.gravityWell', name: '重力井', energyCost: 0, cooldownMs: 5000, startupMs: 250, activeMs: 60, recoveryMs: 300, damage: 0, knockback: noKb,
  hooks: {
    onActive(c) {
      const p = at(c, -0.45, 3.5); p[1] = Math.max(0, p[1])
      c.spawnZone(p, { radius: 2.8, durationMs: 2800, slowFactor: 0.6, color: '#b46bff', pull: 16, damagePerSec: 3 })
      c.fx({ kind: 'ring', pos: p, color: '#b46bff', ttl: 500, radius: 2.8 })
      c.fx({ kind: 'burst', pos: p, color: '#dcb8ff', ttl: 500, count: 20, speed: 4, size: 0.15 })
    },
  },
})
reg({
  id: 'alien.meteor', name: '隕石雨', energyCost: 0, requiresUlt: true, startupMs: 600, activeMs: 1700, recoveryMs: 450,
  damage: 7, knockback: { dir: [0, 0.9, 1], base: 14, scaling: 14, radial: true },
  hooks: {
    onStart(c) { c.setGravityScale(0.1); c.setVelocity(0, 9, 0) },
    onTick(c) {
      if (c.phase === 'recovery') return
      c.setInvulnerable(120)
      if (c.phase !== 'active') return
      c.scratch.m = (c.scratch.m ?? 0) - c.dt * 1000
      if (c.scratch.m <= 0) {
        c.scratch.m = 150
        const t = c.nearestEnemy()
        const cx = t ? t.pos[0] : c.caster.pos[0]
        const x = Math.max(-9, Math.min(9, cx + (Math.random() - 0.5) * 10))
        c.spawnProjectile({ pos: [x, 15, 0], vel: [(Math.random() - 0.5) * 2, -16, 0], radius: 0.6, ttlMs: 2200, color: '#ff8a4d', gravity: -14, explodeRadius: 1.9 })
      }
    },
    onEnd(c) { c.setGravityScale(1) },
  },
})

// =====================================================================
//  SOLDIER 士兵：槍械 + 爆破
// =====================================================================
const S = '#a8d672'
reg({
  id: 'soldier.burst', name: '三連射', energyCost: 0, startupMs: 100, activeMs: 260, recoveryMs: 220, damage: 2,
  knockback: { dir: [0, 0.1, 1], base: 2.5, scaling: 3, hitstunMs: 180 },
  hooks: {
    onTick(c) {
      if (c.phase !== 'active') return
      const shots = (c.phaseMs / 110) | 0 // 0,110,220ms 各一發
      if ((c.scratch.shots ?? -1) < Math.min(2, shots)) {
        c.scratch.shots = Math.min(2, shots)
        const p = at(c, 0.15, 0.9)
        c.spawnProjectile({ pos: p, vel: [c.forward[0] * 26, 0, 0], radius: 0.22, ttlMs: 800, color: '#ffe27a' })
        c.fx({ kind: 'burst', pos: p, color: '#ffe27a', ttl: 160, count: 4, speed: 3, size: 0.09 })
      }
    },
  },
})
reg({
  id: 'soldier.grenade', name: '手榴彈', energyCost: 0, cooldownMs: 3000, startupMs: 180, activeMs: 40, recoveryMs: 300, damage: 10,
  knockback: { dir: [0, 0.8, 1], base: 13, scaling: 15, radial: true },
  hooks: {
    onActive(c) {
      c.spawnProjectile({ pos: at(c, 0.4, 0.7), vel: [c.forward[0] * 7, 6, 0], radius: 0.35, ttlMs: 1500, color: '#c7ff7a', gravity: -26, explodeRadius: 2.4 })
    },
  },
})
reg(upAttack('soldier.kick', '升空踢', S, { dmg: 8, base: 12, scaling: 14, rise: 16 }))
reg({
  id: 'soldier.snipe', name: '蓄力狙擊', energyCost: 0, cooldownMs: 2500, startupMs: 100, activeMs: 60, recoveryMs: 450, damage: 6,
  knockback: { dir: [0, 0.1, 1], base: 9, scaling: 12 },
  charge: { maxMs: 1300, knockbackMult: [1, 2.6], damageMult: [1, 2.2] },
  hooks: {
    onTick(c) {
      if (c.phase !== 'startup') return
      c.scratch.t = (c.scratch.t ?? 0) - c.dt * 1000
      if (c.scratch.t <= 0) { c.scratch.t = 120; c.fx({ kind: 'burst', pos: at(c, 0.15, 0.9), color: '#ff6a6a', ttl: 240, count: 3 + Math.round(c.chargeRatio * 6), speed: 2, size: 0.1 }) }
    },
    onActive(c) {
      const p = at(c, 0.15, 0.9)
      c.spawnProjectile({ pos: p, vel: [c.forward[0] * 46, 0, 0], radius: 0.32, ttlMs: 800, color: '#ff6a6a', pierce: true })
      c.fx({ kind: 'beam', pos: p, yaw: yawOf(c), length: 14, radius: 0.12 + c.chargeRatio * 0.18, color: '#ff9a9a', ttl: 140 })
      c.setLocalVelocity(-4 - c.chargeRatio * 4, null, -4 - c.chargeRatio * 4) // 後座力
      c.shake(0.2 + c.chargeRatio * 0.5)
    },
  },
})
reg({
  id: 'soldier.airstrike', name: '空襲', energyCost: 0, requiresUlt: true, startupMs: 500, activeMs: 1500, recoveryMs: 450,
  damage: 8, knockback: { dir: [0, 0.9, 1], base: 15, scaling: 14, radial: true },
  hooks: {
    onTick(c) {
      if (c.phase === 'recovery') return
      c.setInvulnerable(120)
      if (c.phase !== 'active') return
      c.scratch.b = (c.scratch.b ?? 0) - c.dt * 1000
      if (c.scratch.b <= 0) { // 炸彈沿面向方向由近到遠依序落下
        c.scratch.b = 110
        c.scratch.i = (c.scratch.i ?? 0) + 1
        const x = c.caster.pos[0] + c.forward[0] * (1 + c.scratch.i * 1.1)
        if (Math.abs(x) <= 10) c.spawnProjectile({ pos: [x, 15, 0], vel: [0, -18, 0], radius: 0.4, ttlMs: 1800, color: '#ff9a4d', gravity: -12, explodeRadius: 2.0 })
      }
    },
  },
})

// =====================================================================
//  ZOMBIE 殭屍：撲咬回血 + 毒霧
// =====================================================================
const Z = '#7fd67f'
reg({
  id: 'zombie.claw1', name: '抓擊', energyCost: 0, startupMs: 110, activeMs: 90, recoveryMs: 180,
  hitbox: { offset: [0, 0.1, 1.0], radius: 0.95 }, damage: 4,
  knockback: { dir: [0, 0.15, 1], base: 4, scaling: 5, hitstunMs: 250 }, chain: 'zombie.claw2',
  hooks: { onActive(c) { c.setLocalVelocity(0, null, 4); slash(c, Z, { r: 1.4 }) } },
})
reg({
  id: 'zombie.claw2', name: '撕咬', energyCost: 0, startupMs: 110, activeMs: 100, recoveryMs: 320,
  hitbox: { offset: [0, 0.1, 1.05], radius: 1.0 }, damage: 6,
  knockback: { dir: [0, 0.3, 1], base: 9, scaling: 11 },
  hooks: { onActive(c) { c.setLocalVelocity(0, null, 6); c.shake(0.15); slash(c, '#c8ffc8', { r: 1.7, tilt: -0.4, flip: true }) } },
})
reg({
  id: 'zombie.pounce', name: '撲咬', energyCost: 0, cooldownMs: 3000, startupMs: 220, activeMs: 320, recoveryMs: 380,
  hitbox: { offset: [0, 0.1, 0.9], radius: 1.0 }, damage: 9,
  knockback: { dir: [0, 0.4, 1], base: 10, scaling: 14 },
  hooks: {
    onActive(c) { c.setLocalVelocity(0, 9, 13); c.shake(0.15) },
    onTick(c) { if (c.phase === 'active') trail(c, 55, Z) },
    onHit(c) { c.caster.damage = Math.max(0, c.caster.damage - 3) }, // 吸血：命中回復損傷%
  },
})
reg(upAttack('zombie.leap', '屍躍', Z, { dmg: 8, base: 11, scaling: 14, rise: 15 }))
reg({
  id: 'zombie.toxic', name: '毒霧', energyCost: 0, cooldownMs: 6000, startupMs: 260, activeMs: 60, recoveryMs: 350, damage: 0, knockback: noKb,
  hooks: {
    onActive(c) {
      const p: P3 = [c.caster.pos[0], Math.max(0, c.caster.pos[1] - 0.45), 0]
      c.spawnZone(p, { radius: 3.2, durationMs: 3500, slowFactor: 0.75, color: '#7bd66a', damagePerSec: 6 })
      c.fx({ kind: 'ring', pos: p, color: '#7bd66a', ttl: 500, radius: 3.2 })
      c.fx({ kind: 'burst', pos: p, color: '#b6ff9a', ttl: 700, count: 30, speed: 3, size: 0.2 })
    },
  },
})
reg({
  id: 'zombie.horde', name: '屍潮', energyCost: 0, requiresUlt: true, startupMs: 600, activeMs: 1800, recoveryMs: 450,
  damage: 7, knockback: { dir: [0, 0.9, 0.4], base: 9, scaling: 10 },
  hooks: {
    onTick(c) {
      if (c.phase === 'recovery') return
      c.setInvulnerable(120)
      if (c.phase !== 'active') return
      c.scratch.h = (c.scratch.h ?? 0) - c.dt * 1000
      if (c.scratch.h <= 0) { // 向兩側持續湧出貫穿的殭屍手
        c.scratch.h = 230
        const [x, y] = c.caster.pos
        for (const d of [-1, 1]) c.spawnProjectile({ pos: [x + d * 0.8, Math.max(0.5, y - 0.1), 0], vel: [d * 9, 0, 0], radius: 0.55, ttlMs: 1500, color: '#6fd66f', pierce: true })
        c.fx({ kind: 'burst', pos: [x, 0.1, 0], color: '#6fd66f', ttl: 300, count: 8, speed: 4, size: 0.16 })
      }
    },
  },
})
