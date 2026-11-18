import { registerSkill } from './registry'
import { registerSmashes, registerTilts } from './directionalSkills'
import { STAGES } from '../stages'
import { useGameStore } from '../store'
import type { SkillContext, SkillDef, Vec3 } from '../types'

const reg = (d: SkillDef) => registerSkill(d)
const yawOf = (c: SkillContext) => Math.atan2(c.forward[0], c.forward[2])
const at = (c: SkillContext, y: number, fwd: number): Vec3 => {
  const w = c.toWorld([0, y, fwd])
  return [c.caster.pos[0] + w[0], c.caster.pos[1] + w[1], 0]
}
const clampStageX = (x: number) => {
  const hx = (STAGES[useGameStore.getState().stageId] ?? STAGES.reimu).half.x - 0.5
  return Math.max(-hx, Math.min(hx, x))
}
function trail(c: SkillContext, ms: number, color: string, ttl = 250) {
  c.scratch.tr = (c.scratch.tr ?? 0) - c.dt * 1000
  if (c.scratch.tr <= 0) {
    c.scratch.tr = ms
    c.fx({ kind: 'afterimage', pos: [...c.caster.pos], yaw: yawOf(c), color, ttl })
  }
}
const slash = (c: SkillContext, color: string, o: { d?: number; y?: number; r?: number; tilt?: number; flip?: boolean; ttl?: number } = {}) =>
  c.fx({ kind: 'slash', pos: at(c, o.y ?? 0.1, o.d ?? 0.9), yaw: yawOf(c), plane: 'horizontal', tilt: o.tilt ?? 0.25, flip: o.flip, color, ttl: o.ttl ?? 220, radius: o.r ?? 1.55 })

const upRise = (id: string, name: string, color: string, o: { dmg: number; base: number; scaling: number; rise: number; vx?: number; cd?: number }): SkillDef => ({
  id, name, energyCost: 0, cooldownMs: o.cd ?? 1500, startupMs: 95, activeMs: 300, recoveryMs: 340,
  hitbox: { offset: [0, 0.95, 0.3], radius: 1.2 }, damage: o.dmg,
  knockback: { dir: [0, 1, 0.2], base: o.base, scaling: o.scaling },
  hooks: {
    onActive(c) {
      c.setLocalVelocity(0, o.rise, o.vx ?? 2.5)
      c.shake(0.16)
      c.fx({ kind: 'slash', pos: at(c, 0.9, 0.4), yaw: yawOf(c), plane: 'horizontal', tilt: Math.PI / 4, color, ttl: 260, radius: 1.8 })
      c.fx({ kind: 'burst', pos: [...c.caster.pos], color, ttl: 320, count: 12, speed: 5, size: 0.14 })
    },
    onTick(c) { if (c.phase === 'active') trail(c, 45, color) },
  },
})

const dashMove = (id: string, name: string, color: string, o: { speed: number; dmg: number; base: number; scaling: number; cd: number; lift?: number; invuln?: number }): SkillDef => ({
  id, name, energyCost: 0, cooldownMs: o.cd, startupMs: 110, activeMs: 260, recoveryMs: 280,
  hitbox: { offset: [0, 0.05, 0.9], radius: 1.05 }, damage: o.dmg,
  knockback: { dir: [0, o.lift ?? 0.35, 1], base: o.base, scaling: o.scaling },
  hooks: {
    onActive(c) {
      c.shake(0.16)
      if (o.invuln) c.setInvulnerable(o.invuln)
    },
    onTick(c) {
      if (c.phase !== 'active') return
      c.setLocalVelocity(0, 0, o.speed)
      trail(c, 40, color)
    },
  },
})

const slamMove = (id: string, name: string, color: string, o: { dmg: number; base: number; scaling: number; cd: number; radius?: number }): SkillDef => ({
  id, name, energyCost: 0, cooldownMs: o.cd, startupMs: 120, activeMs: 420, recoveryMs: 320,
  hitbox: { offset: [0, -0.55, 0.15], radius: o.radius ?? 1.25 }, damage: o.dmg,
  knockback: { dir: [0, -0.45, 0.8], base: o.base, scaling: o.scaling },
  hooks: {
    onStart(c) { c.setVelocity(0, c.caster.grounded ? 5.5 : 0, 0) },
    onTick(c) {
      if (c.phase !== 'active') return
      c.setLocalVelocity(0, -27, 1.8)
      trail(c, 40, color)
      if (c.isGrounded() && c.phaseMs > 50) {
        c.fx({ kind: 'ring', pos: [c.caster.pos[0], 0.05, 0], color, ttl: 360, radius: 2.1 })
        c.fx({ kind: 'burst', pos: [c.caster.pos[0], 0.1, 0], color, ttl: 400, count: 18, speed: 6.5, size: 0.18 })
        c.shake(0.38)
        c.endActive()
      }
    },
  },
})

// =====================================================================
//  1. PAC-MAN 吃豆人 (PAC-CHOMP)
// =====================================================================
const PAC = '#ffe033'
const GHOST_COLORS = ['#ff3b3b', '#ff80d5', '#00f0ff', '#ff9933']
reg({
  id: 'pacman.waka', name: '吞噬咬擊', energyCost: 0, startupMs: 80, activeMs: 100, recoveryMs: 160,
  hitbox: { offset: [0, 0.05, 1.0], radius: 0.95 }, damage: 4.5,
  knockback: { dir: [0, 0.25, 1], base: 5, scaling: 6, hitstunMs: 250 },
  hooks: {
    onActive(c) { c.setLocalVelocity(0, null, 5); slash(c, PAC, { r: 1.45 }) },
    onHit(c) { c.caster.energy = Math.min(100, c.caster.energy + 6) },
  },
})
registerTilts('pacman', { color: PAC, names: ['能量豆拳', '上頂咬', '滑行啃咬'] })
reg({
  id: 'pacman.ghost', name: '召喚幽靈', energyCost: 0, cooldownMs: 1600, startupMs: 150, activeMs: 40, recoveryMs: 260,
  damage: 7, knockback: { dir: [0, 0.35, 1], base: 9, scaling: 11 },
  hooks: {
    onActive(c) {
      const idx = Math.floor(Math.random() * GHOST_COLORS.length)
      const col = GHOST_COLORS[idx]
      c.spawnProjectile({ pos: at(c, 0.15, 0.9), vel: [c.forward[0] * 16, 1.2, 0], radius: 0.48, ttlMs: 1600, color: col })
      c.fx({ kind: 'ring', pos: at(c, 0.15, 0.9), color: col, ttl: 260, radius: 1.1, plane: 'vertical' })
    },
  },
})
reg(dashMove('pacman.pelletDash', '能量豆衝刺', PAC, { speed: 20, dmg: 7.5, base: 10, scaling: 12, cd: 1800 }))
reg(upRise('pacman.trampoline', '彈簧墊升空', '#38bdf8', { dmg: 8, base: 11, scaling: 13, rise: 18 }))
reg({
  id: 'pacman.hydrant', name: '消防栓噴射', energyCost: 0, cooldownMs: 2200, startupMs: 180, activeMs: 140, recoveryMs: 320,
  hitbox: { offset: [0, -0.2, 0], radius: 2.6 }, damage: 9,
  knockback: { dir: [0, 0.85, 1], base: 12, scaling: 15, radial: true },
  hooks: {
    onStart(c) { c.setVelocity(0, c.caster.grounded ? 4 : -10, 0) },
    onActive(c) {
      const p: Vec3 = [c.caster.pos[0], Math.max(0, c.caster.pos[1] - 0.35), 0]
      c.fx({ kind: 'pillar', pos: p, color: '#38bdf8', ttl: 420, radius: 1.3 })
      c.fx({ kind: 'ring', pos: p, color: '#ef4444', ttl: 400, radius: 2.6 })
      c.fx({ kind: 'burst', pos: p, color: '#bae6fd', ttl: 450, count: 24, speed: 8, size: 0.18 })
      c.shake(0.42)
    },
  },
})
reg({
  id: 'pacman.fruit', name: '加分水果炸彈', energyCost: 15, cooldownMs: 2200, startupMs: 160, activeMs: 40, recoveryMs: 280,
  damage: 10, knockback: { dir: [0, 0.7, 1], base: 12, scaling: 14, radial: true },
  hooks: {
    onActive(c) {
      const cols = ['#ef4444', '#fb923c', '#fde047', '#4ade80']
      const col = cols[Math.floor(Math.random() * cols.length)]
      c.spawnProjectile({ pos: at(c, 0.35, 0.8), vel: [c.forward[0] * 13, 6.5, 0], radius: 0.45, ttlMs: 1500, color: col, gravity: -24, explodeRadius: 2.2 })
    },
  },
})
registerSmashes('pacman', { color: PAC, names: ['幽靈咬碎', '上衝大口', '雙向夾擊'] })
reg({
  id: 'pacman.superPac', name: '無敵超級吃豆人', energyCost: 0, requiresUlt: true,
  startupMs: 400, activeMs: 1500, recoveryMs: 360,
  hitbox: { offset: [0, 0.1, 0.2], radius: 2.2 }, damage: 13,
  knockback: { dir: [0, 0.65, 1], base: 20, scaling: 16, radial: true, hitstunMs: 1100 },
  hooks: {
    onStart(c) { c.setGravityScale(0.25) },
    onTick(c) {
      if (c.phase === 'recovery') return
      c.setInvulnerable(140)
      if (c.phase !== 'active') return
      const e = c.nearestEnemy()
      const dx = e ? Math.sign(e.pos[0] - c.caster.pos[0]) || c.forward[0] : c.forward[0]
      const dy = e ? Math.sign(e.pos[1] - c.caster.pos[1]) * 10 : 0
      c.caster.facing = [dx, 0]
      c.setVelocity(dx * 22, dy, 0)
      trail(c, 45, PAC, 280)
      c.scratch.p = (c.scratch.p ?? 0) - c.dt * 1000
      if (c.scratch.p <= 0) {
        c.scratch.p = 140
        c.fx({ kind: 'ring', pos: [...c.caster.pos], color: PAC, ttl: 260, radius: 2.2 })
      }
    },
    onEnd(c) { c.setGravityScale(1) },
  },
})

// =====================================================================
//  2. MARIO 水管工 (JUMPMAN)
// =====================================================================
const MAR = '#ef4444'
reg({
  id: 'mario.jab1', name: '拳擊', energyCost: 0, startupMs: 75, activeMs: 80, recoveryMs: 150,
  hitbox: { offset: [0, 0.05, 0.95], radius: 0.9 }, damage: 3.5,
  knockback: { dir: [0, 0.2, 1], base: 4, scaling: 5, hitstunMs: 240 }, chain: 'mario.jab2',
  hooks: { onActive(c) { c.setLocalVelocity(0, null, 3.5); slash(c, MAR, { r: 1.3 }) } },
})
reg({
  id: 'mario.jab2', name: '飛踢', energyCost: 0, startupMs: 90, activeMs: 100, recoveryMs: 260,
  hitbox: { offset: [0, 0.15, 1.1], radius: 1.05 }, damage: 6,
  knockback: { dir: [0, 0.35, 1], base: 8.5, scaling: 11 },
  hooks: { onActive(c) { c.setLocalVelocity(0, null, 5.5); c.shake(0.14); slash(c, '#fbbf24', { r: 1.65, flip: true }) } },
})
registerTilts('mario', { color: MAR, names: ['衝拳', '上勾頂塊', '掃堂腿'] })
reg({
  id: 'mario.fireball', name: '火球彈跳', energyCost: 0, cooldownMs: 1100, startupMs: 130, activeMs: 40, recoveryMs: 240,
  damage: 5.5, knockback: { dir: [0, 0.35, 1], base: 7.5, scaling: 9 },
  hooks: {
    onActive(c) {
      c.spawnProjectile({ pos: at(c, 0.15, 0.85), vel: [c.forward[0] * 14, 4, 0], radius: 0.38, ttlMs: 1600, color: '#fb923c', gravity: -22, explodeRadius: 1.5 })
      c.fx({ kind: 'burst', pos: at(c, 0.15, 0.85), color: '#fb923c', ttl: 200, count: 8, speed: 4, size: 0.12 })
    },
  },
})
reg({
  id: 'mario.cape', name: '黃金披風旋斬', energyCost: 0, cooldownMs: 1700, startupMs: 100, activeMs: 160, recoveryMs: 260,
  hitbox: { offset: [0, 0.1, 1.0], radius: 1.35 }, damage: 7,
  knockback: { dir: [0, 0.55, 1], base: 10, scaling: 11 },
  hooks: {
    onActive(c) {
      c.setLocalVelocity(0, 3, 12)
      c.fx({ kind: 'ring', pos: [...c.caster.pos], color: '#fbbf24', ttl: 320, radius: 1.6 })
      slash(c, '#fde047', { r: 1.9, tilt: 0.1 })
    },
  },
})
reg({
  id: 'mario.coinPunch', name: '金幣昇龍拳', energyCost: 0, cooldownMs: 1450, startupMs: 85, activeMs: 300, recoveryMs: 340,
  hitbox: { offset: [0, 1.0, 0.3], radius: 1.2 }, damage: 9.5,
  knockback: { dir: [0, 1, 0.2], base: 13, scaling: 15 },
  hooks: {
    onActive(c) {
      c.setLocalVelocity(0, 17.5, 3)
      c.shake(0.22)
      c.fx({ kind: 'burst', pos: at(c, 1.0, 0.3), color: '#fde047', ttl: 450, count: 22, speed: 7, size: 0.18 })
      c.fx({ kind: 'ring', pos: at(c, 1.0, 0.3), color: '#fde047', ttl: 320, radius: 1.5 })
    },
    onTick(c) { if (c.phase === 'active') trail(c, 45, '#fde047') },
  },
})
reg(slamMove('mario.groundPound', '重磅臀擊', '#3b82f6', { dmg: 10.5, base: 13, scaling: 15, cd: 2000 }))
reg({
  id: 'mario.warpPipe', name: '綠水管奇襲', energyCost: 20, cooldownMs: 2800, startupMs: 180, activeMs: 180, recoveryMs: 320,
  hitbox: { offset: [0, 0.4, 0], radius: 1.65 }, damage: 10,
  knockback: { dir: [0, 1, 0.15], base: 13, scaling: 15 },
  hooks: {
    onStart(c) { c.fx({ kind: 'pillar', pos: [...c.caster.pos], color: '#22c55e', ttl: 300, radius: 0.9 }) },
    onActive(c) {
      const e = c.nearestEnemy()
      const tx = clampStageX(e ? e.pos[0] : c.caster.pos[0] + c.forward[0] * 3.5)
      const ty = e ? Math.max(0.5, e.pos[1] - 0.5) : 0.6
      c.teleport([tx, ty, 0])
      c.setVelocity(0, 13, 0)
      c.fx({ kind: 'pillar', pos: [tx, 0, 0], color: '#22c55e', ttl: 450, radius: 1.2 })
      c.fx({ kind: 'burst', pos: [tx, ty, 0], color: '#86efac', ttl: 400, count: 20, speed: 7, size: 0.16 })
      c.shake(0.35)
    },
  },
})
registerSmashes('mario', { color: '#fb923c', names: ['火焰重拳', '頂磚重擊', '迴旋踢'] })
reg({
  id: 'mario.starman', name: '無敵彩虹星彈幕', energyCost: 0, requiresUlt: true,
  startupMs: 450, activeMs: 1600, recoveryMs: 400,
  damage: 8, knockback: { dir: [0, 0.55, 1], base: 14, scaling: 14, radial: true },
  hooks: {
    onStart(c) { c.setGravityScale(0.25); c.setVelocity(0, 6, 0) },
    onTick(c) {
      if (c.phase === 'recovery') return
      c.setInvulnerable(140)
      if (c.phase !== 'active') return
      c.scratch.s = (c.scratch.s ?? 0) - c.dt * 1000
      if (c.scratch.s <= 0) {
        c.scratch.s = 120
        const cols = ['#ef4444', '#fbbf24', '#4ade80', '#38bdf8', '#c084fc']
        const col = cols[Math.floor(Math.random() * cols.length)]
        const vy = (Math.random() - 0.3) * 10
        c.spawnProjectile({ pos: at(c, 0.2, 0.8), vel: [c.forward[0] * 24, vy, 0], radius: 0.52, ttlMs: 1200, color: col, explodeRadius: 1.9 })
        c.fx({ kind: 'ring', pos: [...c.caster.pos], color: col, ttl: 240, radius: 1.6 })
      }
    },
    onEnd(c) { c.setGravityScale(1) },
  },
})

// =====================================================================
//  3. SPACE INVADER 太空侵略者
// =====================================================================
const INV = '#4ade80'
reg({
  id: 'invader.laser', name: '8-Bit 雷射', energyCost: 0, startupMs: 90, activeMs: 40, recoveryMs: 170,
  damage: 4, knockback: { dir: [0, 0.15, 1], base: 4.5, scaling: 5, hitstunMs: 220 },
  projectile: { speed: 24, radius: 0.3, lifetimeMs: 900, pierce: false, offset: [0, 0.1, 0.9], color: INV },
})
registerTilts('invader', { color: INV, names: ['高能電漿', '對空光線', '掃地雷射'], ranged: true })
reg({
  id: 'invader.ufoBeam', name: 'UFO 牽引光束', energyCost: 0, cooldownMs: 2400, startupMs: 180, activeMs: 120, recoveryMs: 300,
  hitbox: { offset: [0, 0.2, 2.8], radius: 1.4 }, damage: 7.5,
  knockback: { dir: [0, 0.9, 0.2], base: 11, scaling: 12 },
  hooks: {
    onActive(c) {
      const p = at(c, -0.3, 2.8); p[1] = Math.max(0, p[1])
      c.spawnZone(p, { radius: 2.5, durationMs: 2200, slowFactor: 0.65, color: '#ef4444', pull: 18, damagePerSec: 3 })
      c.fx({ kind: 'pillar', pos: p, color: '#ef4444', ttl: 420, radius: 1.3 })
      c.fx({ kind: 'ring', pos: p, color: INV, ttl: 400, radius: 2.5 })
    },
  },
})
reg(dashMove('invader.galagaDive', '編隊俯衝', INV, { speed: 21, dmg: 7.5, base: 10, scaling: 12, cd: 1700 }))
reg({
  id: 'invader.warpAscend', name: '像素傳送升空', energyCost: 0, cooldownMs: 1500, startupMs: 100, activeMs: 220, recoveryMs: 300,
  hitbox: { offset: [0, 0.8, 0.2], radius: 1.25 }, damage: 8,
  knockback: { dir: [0, 1, 0.2], base: 11, scaling: 14 },
  hooks: {
    onActive(c) {
      const ny = c.caster.pos[1] + 4.2
      c.teleport([c.caster.pos[0], ny, 0])
      c.setVelocity(c.forward[0] * 3, 10, 0)
      c.fx({ kind: 'ring', pos: [c.caster.pos[0], ny, 0], color: INV, ttl: 340, radius: 1.7 })
      c.fx({ kind: 'burst', pos: [c.caster.pos[0], ny, 0], color: '#bef264', ttl: 340, count: 16, speed: 6, size: 0.16 })
    },
  },
})
reg(slamMove('invader.torpedo', '等離子墜落', '#a855f7', { dmg: 9.5, base: 12, scaling: 14, cd: 2000 }))
reg({
  id: 'invader.bunker', name: '像素掩體砲台', energyCost: 20, cooldownMs: 2800, startupMs: 160, activeMs: 60, recoveryMs: 260,
  damage: 8, knockback: { dir: [0, 0.5, 1], base: 10, scaling: 11 },
  hooks: {
    onActive(c) {
      const p: Vec3 = [c.caster.pos[0], Math.max(0, c.caster.pos[1] - 0.4), 0]
      c.spawnZone(p, { radius: 2.2, durationMs: 3200, slowFactor: 0.55, color: INV, damagePerSec: 4 })
      c.spawnProjectile({ pos: at(c, 0.2, 0.9), vel: [c.forward[0] * 24, 0, 0], radius: 0.42, ttlMs: 1200, color: '#22d3ee', pierce: true })
      c.fx({ kind: 'ring', pos: p, color: INV, ttl: 400, radius: 2.2 })
    },
  },
})
registerSmashes('invader', { color: INV, names: ['母艦重砲', '宇宙天衝', '軌道衝擊'] })
reg({
  id: 'invader.armada', name: '大軍壓境齊射', energyCost: 0, requiresUlt: true,
  startupMs: 550, activeMs: 1700, recoveryMs: 420,
  damage: 8.5, knockback: { dir: [0, 0.9, 1], base: 15, scaling: 15, radial: true },
  hooks: {
    onStart(c) { c.setGravityScale(0.15); c.setVelocity(0, 8, 0) },
    onTick(c) {
      if (c.phase === 'recovery') return
      c.setInvulnerable(140)
      if (c.phase !== 'active') return
      c.scratch.a = (c.scratch.a ?? 0) - c.dt * 1000
      if (c.scratch.a <= 0) {
        c.scratch.a = 125
        const t = c.nearestEnemy()
        const cx = t ? t.pos[0] : c.caster.pos[0]
        const x = clampStageX(cx + (Math.random() - 0.5) * 10)
        const col = Math.random() < 0.5 ? INV : '#ef4444'
        c.spawnProjectile({ pos: [x, 14.5, 0], vel: [0, -22, 0], radius: 0.55, ttlMs: 1600, color: col, gravity: -12, explodeRadius: 2.1 })
        c.fx({ kind: 'beam', pos: [x, 14.5, 0], yaw: 0, length: 4, radius: 0.25, color: col, ttl: 180 })
      }
    },
    onEnd(c) { c.setGravityScale(1) },
  },
})

// =====================================================================
//  4. BOMBERMAN 炸彈超人
// =====================================================================
const BMB = '#38bdf8'
reg({
  id: 'bomber.jab', name: '引信拳', energyCost: 0, startupMs: 80, activeMs: 90, recoveryMs: 160,
  hitbox: { offset: [0, 0.05, 0.95], radius: 0.9 }, damage: 4,
  knockback: { dir: [0, 0.25, 1], base: 4.5, scaling: 5, hitstunMs: 240 },
  hooks: { onActive(c) { c.setLocalVelocity(0, null, 3); slash(c, BMB, { r: 1.35 }) } },
})
registerTilts('bomber', { color: '#fb923c', names: ['爆竹拳', '高拋引信', '低掃雷'] })
reg({
  id: 'bomber.crossBomb', name: '十字爆裂炸彈', energyCost: 0, cooldownMs: 1600, startupMs: 160, activeMs: 40, recoveryMs: 280,
  damage: 10.5, knockback: { dir: [0, 0.85, 1], base: 13, scaling: 15, radial: true },
  hooks: {
    onActive(c) {
      const p = at(c, 0.15, 0.9)
      c.spawnProjectile({ pos: p, vel: [c.forward[0] * 7.5, 4.5, 0], radius: 0.5, ttlMs: 950, color: '#fb923c', gravity: -24, explodeRadius: 2.8 })
      c.fx({ kind: 'beam', pos: p, yaw: yawOf(c), length: 4.5, radius: 0.22, color: '#fde047', ttl: 180 })
    },
  },
})
reg({
  id: 'bomber.kickBomb', name: '踢擊滑行炸彈', energyCost: 0, cooldownMs: 1700, startupMs: 120, activeMs: 120, recoveryMs: 260,
  hitbox: { offset: [0, 0, 1.0], radius: 0.95 }, damage: 8.5,
  knockback: { dir: [0, 0.65, 1], base: 12, scaling: 14, radial: true },
  hooks: {
    onActive(c) {
      c.spawnProjectile({ pos: at(c, -0.1, 0.9), vel: [c.forward[0] * 21, -0.5, 0], radius: 0.48, ttlMs: 1200, color: '#ef4444', explodeRadius: 2.3 })
      c.setLocalVelocity(0, null, 6)
      slash(c, '#fb923c', { r: 1.5 })
    },
  },
})
reg(upRise('bomber.blastJump', '爆風火箭跳', '#fb923c', { dmg: 9, base: 12, scaling: 14, rise: 17.5 }))
reg(slamMove('bomber.dropBomb', '空投連爆彈', '#ef4444', { dmg: 10, base: 13, scaling: 15, cd: 2000 }))
reg({
  id: 'bomber.tripleMine', name: '三連高爆地雷陣', energyCost: 20, cooldownMs: 2400, startupMs: 180, activeMs: 40, recoveryMs: 300,
  damage: 8.5, knockback: { dir: [0, 0.8, 1], base: 11, scaling: 14, radial: true },
  hooks: {
    onActive(c) {
      for (const vx of [5, 11, 17]) {
        c.spawnProjectile({ pos: at(c, 0.3, 0.7), vel: [c.forward[0] * vx, 5.5, 0], radius: 0.4, ttlMs: 1400, color: '#fde047', gravity: -25, explodeRadius: 2.1 })
      }
      c.shake(0.25)
    },
  },
})
registerSmashes('bomber', { color: '#fb923c', names: ['爆彈重槌', '天女散爆', '十字爆震'], dmg: 12 })
reg({
  id: 'bomber.megaBomb', name: '危險紅炸彈十字大爆發', energyCost: 0, requiresUlt: true,
  startupMs: 650, activeMs: 220, recoveryMs: 480,
  hitbox: { offset: [0, 0.1, 0], radius: 6.2 }, damage: 18,
  knockback: { dir: [0, 0.85, 1], base: 24, scaling: 18, radial: true, hitstunMs: 1250 },
  hooks: {
    onStart(c) { c.setGravityScale(0.2) },
    onTick(c) {
      if (c.phase === 'recovery') return
      c.setInvulnerable(140)
      if (c.phase === 'startup') {
        c.scratch.b = (c.scratch.b ?? 0) - c.dt * 1000
        if (c.scratch.b <= 0) { c.scratch.b = 85; c.fx({ kind: 'ring', pos: [...c.caster.pos], color: '#ef4444', ttl: 260, radius: 1.5 + (c.phaseMs / 650) * 4 }) }
      }
    },
    onActive(c) {
      const p: Vec3 = [...c.caster.pos]
      c.fx({ kind: 'pillar', pos: [p[0], p[1] - 8, 0], color: '#fb923c', ttl: 700, radius: 2.8 })
      c.fx({ kind: 'beam', pos: p, yaw: Math.PI / 2, length: 16, radius: 1.4, color: '#fde047', ttl: 550 })
      c.fx({ kind: 'beam', pos: p, yaw: -Math.PI / 2, length: 16, radius: 1.4, color: '#fde047', ttl: 550 })
      c.fx({ kind: 'ring', pos: p, color: '#ef4444', ttl: 650, radius: 6.2 })
      c.fx({ kind: 'burst', pos: p, color: '#ffffff', ttl: 800, count: 70, speed: 13, size: 0.26 })
      c.shake(1.2)
    },
    onEnd(c) { c.setGravityScale(1) },
  },
})

// =====================================================================
//  5. SNAKE 貪食蛇
// =====================================================================
const SNK = '#22c55e'
reg({
  id: 'snake.bite', name: '毒牙咬蘋果', energyCost: 0, startupMs: 75, activeMs: 90, recoveryMs: 155,
  hitbox: { offset: [0, 0.05, 1.1], radius: 0.95 }, damage: 4,
  knockback: { dir: [0, 0.2, 1], base: 4.5, scaling: 5.5, hitstunMs: 250 },
  hooks: {
    onActive(c) { c.setLocalVelocity(0, null, 4.5); slash(c, SNK, { r: 1.45 }) },
    onHit(c) {
      c.caster.energy = Math.min(100, c.caster.energy + 8)
      c.caster.damage = Math.max(0, c.caster.damage - 1.5)
      c.fx({ kind: 'ring', pos: [...c.caster.pos], color: '#ef4444', ttl: 240, radius: 1.0 })
    },
  },
})
registerTilts('snake', { color: SNK, names: ['蛇首突刺', '昂首咬擊', '蛇尾橫掃'] })
reg({
  id: 'snake.appleBomb', name: '紅蘋果爆彈', energyCost: 0, cooldownMs: 1500, startupMs: 140, activeMs: 40, recoveryMs: 250,
  damage: 8, knockback: { dir: [0, 0.65, 1], base: 10, scaling: 12, radial: true },
  hooks: {
    onActive(c) {
      c.spawnProjectile({ pos: at(c, 0.25, 0.8), vel: [c.forward[0] * 14, 5, 0], radius: 0.42, ttlMs: 1500, color: '#ef4444', gravity: -22, explodeRadius: 2.0 })
    },
  },
})
reg(dashMove('snake.slitherDash', 'Z字蛇行突襲', SNK, { speed: 22, dmg: 7.5, base: 9.5, scaling: 12, cd: 1650 }))
reg(upRise('snake.coilSpring', '盤蛇彈射', SNK, { dmg: 8, base: 11, scaling: 13, rise: 17.5 }))
reg(slamMove('snake.tailSlam', '巨尾砸地', '#16a34a', { dmg: 9.5, base: 12, scaling: 14, cd: 1950 }))
reg({
  id: 'snake.mazeZone', name: '貪食蛇方格迷陣', energyCost: 20, cooldownMs: 2800, startupMs: 180, activeMs: 60, recoveryMs: 280,
  damage: 0, knockback: { dir: [0, 0, 0], base: 0, scaling: 0 },
  hooks: {
    onActive(c) {
      const p = at(c, -0.4, 2.2); p[1] = Math.max(0, p[1])
      c.spawnZone(p, { radius: 3.1, durationMs: 3200, slowFactor: 0.55, color: SNK, damagePerSec: 5 })
      c.fx({ kind: 'ring', pos: p, color: SNK, ttl: 450, radius: 3.1 })
    },
  },
})
registerSmashes('snake', { color: SNK, names: ['毒蛇穿刺', '騰蛇噬天', '盤繞掃尾'] })
reg({
  id: 'snake.ouroboros', name: '無限長蛇衝擊', energyCost: 0, requiresUlt: true,
  startupMs: 500, activeMs: 1700, recoveryMs: 400,
  damage: 7, knockback: { dir: [0, 0.5, 1], base: 14, scaling: 13 },
  hooks: {
    onTick(c) {
      if (c.phase === 'recovery') return
      c.setInvulnerable(140)
      if (c.phase !== 'active') return
      c.scratch.sn = (c.scratch.sn ?? 0) - c.dt * 1000
      if (c.scratch.sn <= 0) {
        c.scratch.sn = 90
        const wave = Math.sin(c.phaseMs / 160) * 5
        c.spawnProjectile({ pos: at(c, 0.15, 0.8), vel: [c.forward[0] * 26, wave, 0], radius: 0.55, ttlMs: 1200, color: SNK, pierce: true })
      }
    },
  },
})

// =====================================================================
//  6. FROGGER 青蛙過河 (HOPPER)
// =====================================================================
const FRG = '#84cc16'
reg({
  id: 'frogger.tongue', name: '長舌遠距鞭擊', energyCost: 0, startupMs: 90, activeMs: 100, recoveryMs: 190,
  hitbox: { offset: [0, 0.1, 1.75], radius: 1.05 }, damage: 5.5,
  knockback: { dir: [0, 0.35, 1], base: 7, scaling: 8, hitstunMs: 280 },
  hooks: {
    onActive(c) {
      c.fx({ kind: 'beam', pos: at(c, 0.1, 0.5), yaw: yawOf(c), length: 2.6, radius: 0.16, color: '#f472b6', ttl: 160 })
      c.fx({ kind: 'burst', pos: at(c, 0.1, 2.4), color: '#f472b6', ttl: 220, count: 8, speed: 4, size: 0.12 })
    },
  },
})
registerTilts('frogger', { color: FRG, names: ['長舌前抽', '青蛙蹬空', '荷葉掃擊'] })
reg({
  id: 'frogger.logRoll', name: '浮木滾衝', energyCost: 0, cooldownMs: 1500, startupMs: 150, activeMs: 40, recoveryMs: 260,
  damage: 8, knockback: { dir: [0, 0.45, 1], base: 10, scaling: 12 },
  hooks: {
    onActive(c) {
      c.spawnProjectile({ pos: at(c, -0.05, 0.9), vel: [c.forward[0] * 14, 0, 0], radius: 0.55, ttlMs: 1500, color: '#92400e', pierce: true })
    },
  },
})
reg({
  id: 'frogger.highwayTruck', name: '高速公路貨車召喚', energyCost: 0, cooldownMs: 2000, startupMs: 160, activeMs: 180, recoveryMs: 280,
  hitbox: { offset: [0, 0.1, 1.0], radius: 1.1 }, damage: 9,
  knockback: { dir: [0, 0.4, 1], base: 12, scaling: 14 },
  hooks: {
    onActive(c) {
      c.spawnProjectile({ pos: at(c, 0.15, 0.8), vel: [c.forward[0] * 25, 0, 0], radius: 0.65, ttlMs: 950, color: '#ef4444', explodeRadius: 2.0 })
      c.setLocalVelocity(0, 3, 14)
      c.shake(0.22)
    },
  },
})
reg(upRise('frogger.superLeap', '青蛙大跳躍', FRG, { dmg: 8, base: 11, scaling: 13, rise: 19.5 }))
reg(slamMove('frogger.bellyFlop', '荷葉肚皮壓', '#38bdf8', { dmg: 10, base: 13, scaling: 14, cd: 2000 }))
reg({
  id: 'frogger.lilypad', name: '蓮葉激流陷阱', energyCost: 18, cooldownMs: 2600, startupMs: 150, activeMs: 60, recoveryMs: 260,
  damage: 0, knockback: { dir: [0, 0, 0], base: 0, scaling: 0 },
  hooks: {
    onActive(c) {
      const p: Vec3 = [c.caster.pos[0], Math.max(0, c.caster.pos[1] - 0.4), 0]
      c.spawnZone(p, { radius: 2.8, durationMs: 3200, slowFactor: 0.5, color: '#38bdf8', damagePerSec: 4.5 })
      c.fx({ kind: 'ring', pos: p, color: FRG, ttl: 450, radius: 2.8 })
    },
  },
})
registerSmashes('frogger', { color: FRG, names: ['高速撞擊', '蛙躍衝頂', '水花重壓'] })
reg({
  id: 'frogger.rushHour', name: '尖峰時刻大塞車', energyCost: 0, requiresUlt: true,
  startupMs: 500, activeMs: 1750, recoveryMs: 400,
  damage: 9, knockback: { dir: [0, 0.65, 1], base: 16, scaling: 15 },
  hooks: {
    onStart(c) { c.setGravityScale(0.2); c.setVelocity(0, 7, 0) },
    onTick(c) {
      if (c.phase === 'recovery') return
      c.setInvulnerable(140)
      if (c.phase !== 'active') return
      c.scratch.rh = (c.scratch.rh ?? 0) - c.dt * 1000
      if (c.scratch.rh <= 0) {
        c.scratch.rh = 180
        const side = Math.random() < 0.5 ? -1 : 1
        const y = 0.6 + Math.floor(Math.random() * 3) * 2.1
        const cols = ['#ef4444', '#fbbf24', '#38bdf8', '#f97316']
        const col = cols[Math.floor(Math.random() * cols.length)]
        c.spawnProjectile({ pos: [-side * 12, y, 0], vel: [side * 24, 0, 0], radius: 0.65, ttlMs: 1400, color: col, pierce: true })
      }
    },
    onEnd(c) { c.setGravityScale(1) },
  },
})

// =====================================================================
//  7. DONKEY KONG 大金剛 (KONG)
// =====================================================================
const KNG = '#a16207'
reg({
  id: 'kong.slap', name: '重拳連拍', energyCost: 0, startupMs: 110, activeMs: 110, recoveryMs: 210,
  hitbox: { offset: [0, 0.1, 1.15], radius: 1.15 }, damage: 6.5,
  knockback: { dir: [0, 0.3, 1], base: 7, scaling: 9 },
  hooks: { onActive(c) { c.setLocalVelocity(0, null, 4.5); c.shake(0.18); slash(c, '#fb923c', { r: 1.75 }) } },
})
registerTilts('kong', { color: KNG, names: ['巨臂揮擊', '拍擊對空', '重掌拍地'], dmg: 7.5 })
reg({
  id: 'kong.barrel', name: '滾動木桶投擲', energyCost: 0, cooldownMs: 1600, startupMs: 180, activeMs: 40, recoveryMs: 280,
  damage: 9.5, knockback: { dir: [0, 0.65, 1], base: 11, scaling: 14, radial: true },
  hooks: {
    onActive(c) {
      c.spawnProjectile({ pos: at(c, 0.3, 0.9), vel: [c.forward[0] * 12, 3, 0], radius: 0.6, ttlMs: 1700, color: '#b45309', gravity: -24, explodeRadius: 2.2 })
      c.shake(0.2)
    },
  },
})
reg(dashMove('kong.headbutt', '霸體鐵頭功', '#ef4444', { speed: 18, dmg: 10, base: 12, scaling: 15, cd: 2000, invuln: 260 }))
reg(upRise('kong.spinningKong', '旋轉金剛升空', KNG, { dmg: 10, base: 13, scaling: 15, rise: 15.5 }))
reg(slamMove('kong.earthSlap', '震地雙掌拍', '#fb923c', { dmg: 11.5, base: 14, scaling: 16, cd: 2200, radius: 1.6 }))
reg({
  id: 'kong.giantPunch', name: '蓄力巨猩重拳', energyCost: 15, cooldownMs: 2400, startupMs: 110, activeMs: 140, recoveryMs: 420,
  hitbox: { offset: [0, 0.15, 1.4], radius: 1.45 }, damage: 12,
  knockback: { dir: [0, 0.4, 1], base: 14, scaling: 17 },
  charge: { maxMs: 1300, knockbackMult: [1, 2.5], damageMult: [1, 2.1] },
  hooks: {
    onTick(c) {
      if (c.phase !== 'startup') return
      c.scratch.k = (c.scratch.k ?? 0) - c.dt * 1000
      if (c.scratch.k <= 0) { c.scratch.k = 110; c.fx({ kind: 'burst', pos: at(c, 0.2, 0.5), color: '#fbbf24', ttl: 240, count: 5, speed: 3, size: 0.14 }) }
    },
    onActive(c) {
      c.setLocalVelocity(0, null, 7)
      c.shake(0.35 + c.chargeRatio * 0.6)
      slash(c, '#fde047', { r: 2.1 + c.chargeRatio * 1.1, ttl: 320 })
      c.fx({ kind: 'burst', pos: at(c, 0.2, 1.4), color: '#fb923c', ttl: 450, count: 22, speed: 8, size: 0.2 })
    },
  },
})
registerSmashes('kong', { color: '#fb923c', names: ['毀滅雙拍', '泰山壓頂', '震裂大地'], dmg: 13 })
reg({
  id: 'kong.avalanche', name: '天降木桶雪崩', energyCost: 0, requiresUlt: true,
  startupMs: 500, activeMs: 1750, recoveryMs: 450,
  damage: 10, knockback: { dir: [0, 0.85, 1], base: 16, scaling: 16, radial: true },
  hooks: {
    onStart(c) { c.setGravityScale(0.15); c.setVelocity(0, 8, 0) },
    onTick(c) {
      if (c.phase === 'recovery') return
      c.setInvulnerable(140)
      if (c.phase !== 'active') return
      c.scratch.av = (c.scratch.av ?? 0) - c.dt * 1000
      if (c.scratch.av <= 0) {
        c.scratch.av = 155
        const t = c.nearestEnemy()
        const cx = t ? t.pos[0] : c.caster.pos[0]
        const x = clampStageX(cx + (Math.random() - 0.5) * 11)
        c.spawnProjectile({ pos: [x, 14.5, 0], vel: [(Math.random() - 0.5) * 3, -18, 0], radius: 0.72, ttlMs: 2000, color: '#b45309', gravity: -16, explodeRadius: 2.4 })
      }
    },
    onEnd(c) { c.setGravityScale(1) },
  },
})

// =====================================================================
//  8. PONG / ARKANOID 打磚塊 (PADDLE)
// =====================================================================
const PNG = '#e2e8f0'
reg({
  id: 'pong.serve', name: '彈板發球', energyCost: 0, startupMs: 85, activeMs: 40, recoveryMs: 170,
  damage: 4, knockback: { dir: [0, 0.2, 1], base: 5, scaling: 6, hitstunMs: 220 },
  projectile: { speed: 25, radius: 0.32, lifetimeMs: 1100, pierce: false, offset: [0, 0.1, 0.9], color: '#ffffff' },
})
registerTilts('pong', { color: PNG, names: ['高速抽球', '挑高發球', '切球下射'], ranged: true })
reg({
  id: 'pong.ricochet', name: '打磚塊彈跳球', energyCost: 0, cooldownMs: 1300, startupMs: 120, activeMs: 40, recoveryMs: 240,
  damage: 7.5, knockback: { dir: [0, 0.55, 1], base: 10, scaling: 12, radial: true },
  hooks: {
    onActive(c) {
      c.spawnProjectile({ pos: at(c, 0.25, 0.9), vel: [c.forward[0] * 19, 6, 0], radius: 0.45, ttlMs: 1800, color: '#38bdf8', gravity: -20, explodeRadius: 2.0 })
    },
  },
})
reg(dashMove('pong.paddleDash', '霓虹擋板衝撞', '#22d3ee', { speed: 22, dmg: 7.5, base: 10, scaling: 12, cd: 1600 }))
reg(upRise('pong.laserLaunch', '雙管雷射升空', '#f43f5e', { dmg: 8.5, base: 11, scaling: 13, rise: 17.5 }))
reg(slamMove('pong.brickDrop', '彩磚壓頂', '#fbbf24', { dmg: 10, base: 12, scaling: 14, cd: 1950 }))
reg({
  id: 'pong.brickWall', name: '七彩磚塊爆碎陣', energyCost: 18, cooldownMs: 2300, startupMs: 150, activeMs: 40, recoveryMs: 280,
  damage: 5.5, knockback: { dir: [0, 0.4, 1], base: 8, scaling: 10 },
  hooks: {
    onActive(c) {
      const cols = ['#ef4444', '#fb923c', '#fde047', '#4ade80', '#38bdf8']
      for (let i = 0; i < 5; i++) {
        c.spawnProjectile({ pos: at(c, 0.1 + (i - 2) * 0.2, 0.9), vel: [c.forward[0] * 21, (i - 2) * 2.6, 0], radius: 0.36, ttlMs: 1000, color: cols[i] })
      }
      c.shake(0.22)
    },
  },
})
registerSmashes('pong', { color: '#38bdf8', names: ['重扣殺球', '上旋扣殺', '電漿擋板'] })
reg({
  id: 'pong.multiball', name: '全屏多球狂潮', energyCost: 0, requiresUlt: true,
  startupMs: 450, activeMs: 1650, recoveryMs: 400,
  damage: 7, knockback: { dir: [0, 0.6, 1], base: 15, scaling: 14, radial: true },
  hooks: {
    onStart(c) { c.setGravityScale(0.2); c.setVelocity(0, 6, 0) },
    onTick(c) {
      if (c.phase === 'recovery') return
      c.setInvulnerable(140)
      if (c.phase !== 'active') return
      c.scratch.mb = (c.scratch.mb ?? 0) - c.dt * 1000
      if (c.scratch.mb <= 0) {
        c.scratch.mb = 115
        const cols = ['#ffffff', '#38bdf8', '#fde047', '#f472b6']
        const angle = (Math.random() - 0.5) * Math.PI
        const dir = Math.random() < 0.5 ? 1 : -1
        c.spawnProjectile({
          pos: [...c.caster.pos],
          vel: [dir * Math.cos(angle) * 24, Math.sin(angle) * 16, 0],
          radius: 0.48, ttlMs: 1400, color: cols[Math.floor(Math.random() * cols.length)],
          pierce: true,
        })
      }
    },
    onEnd(c) { c.setGravityScale(1) },
  },
})

// =====================================================================
//  9. 東方 Project：博麗靈夢 (REIMU HAKUREI)
// =====================================================================
const RM = '#f43f5e'
reg({
  id: 'reimu.gohei', name: '御幣連拂・靈符', energyCost: 0, startupMs: 85, activeMs: 95, recoveryMs: 170,
  hitbox: { offset: [0, 0.1, 1.15], radius: 1.0 }, damage: 4.5,
  knockback: { dir: [0, 0.25, 1], base: 5, scaling: 6, hitstunMs: 250 },
  hooks: {
    onActive(c) {
      c.setLocalVelocity(0, null, 3.5)
      slash(c, RM, { r: 1.65 })
      c.spawnProjectile({ pos: at(c, 0.15, 0.9), vel: [c.forward[0] * 22, 0, 0], radius: 0.26, ttlMs: 650, color: '#fecdd3' })
    },
  },
})
registerTilts('reimu', { color: RM, names: ['御幣橫掃', '驅魔昇擊', '結界掃足'] })
reg({
  id: 'reimu.amulet', name: '博麗靈符三連彈幕', energyCost: 0, cooldownMs: 1300, startupMs: 130, activeMs: 40, recoveryMs: 240,
  damage: 4.2, knockback: { dir: [0, 0.3, 1], base: 6.5, scaling: 8 },
  hooks: {
    onActive(c) {
      for (const vy of [-3.2, 0, 3.2]) {
        c.spawnProjectile({ pos: at(c, 0.2, 0.85), vel: [c.forward[0] * 20, vy, 0], radius: 0.34, ttlMs: 1200, color: '#fb7185' })
      }
      c.fx({ kind: 'ring', pos: at(c, 0.2, 0.85), color: '#ffffff', ttl: 240, radius: 1.1, plane: 'vertical' })
    },
  },
})
reg({
  id: 'reimu.yinyangOrb', name: '陰陽寶玉', energyCost: 0, cooldownMs: 1800, startupMs: 160, activeMs: 40, recoveryMs: 280,
  damage: 9.5, knockback: { dir: [0, 0.65, 1], base: 11.5, scaling: 14, radial: true },
  hooks: {
    onActive(c) {
      c.spawnProjectile({ pos: at(c, 0.3, 0.9), vel: [c.forward[0] * 14, 5, 0], radius: 0.65, ttlMs: 1700, color: '#f43f5e', gravity: -20, explodeRadius: 2.3 })
      c.fx({ kind: 'ring', pos: at(c, 0.3, 0.9), color: '#ffffff', ttl: 300, radius: 1.5, plane: 'vertical' })
    },
  },
})
reg({
  id: 'reimu.skyFloat', name: '亞空穴・空中浮游', energyCost: 0, cooldownMs: 1500, startupMs: 90, activeMs: 240, recoveryMs: 280,
  hitbox: { offset: [0, 0.6, 0.2], radius: 1.3 }, damage: 8,
  knockback: { dir: [0, 1, 0.15], base: 11, scaling: 13 },
  hooks: {
    onActive(c) {
      const ny = c.caster.pos[1] + 4.4
      c.teleport([c.caster.pos[0], ny, 0])
      c.setVelocity(c.forward[0] * 4, 11, 0)
      c.fx({ kind: 'ring', pos: [c.caster.pos[0], ny, 0], color: RM, ttl: 360, radius: 1.8 })
      c.fx({ kind: 'burst', pos: [c.caster.pos[0], ny, 0], color: '#ffffff', ttl: 360, count: 16, speed: 6, size: 0.16 })
    },
  },
})
reg({
  id: 'reimu.sealCircle', name: '退魔八方結界', energyCost: 0, cooldownMs: 2100, startupMs: 170, activeMs: 140, recoveryMs: 300,
  hitbox: { offset: [0, 0, 0], radius: 2.8 }, damage: 9,
  knockback: { dir: [0, 0.75, 1], base: 12, scaling: 14, radial: true },
  hooks: {
    onActive(c) {
      const p: Vec3 = [...c.caster.pos]
      c.fx({ kind: 'ring', pos: p, color: RM, ttl: 420, radius: 2.8 })
      c.fx({ kind: 'ring', pos: p, color: '#ffffff', ttl: 360, radius: 2.2, plane: 'vertical' })
      c.fx({ kind: 'burst', pos: p, color: '#fecdd3', ttl: 450, count: 24, speed: 7, size: 0.16 })
      c.shake(0.35)
    },
  },
})
reg({
  id: 'reimu.barrier', name: '博麗大結界', energyCost: 20, cooldownMs: 2800, startupMs: 160, activeMs: 60, recoveryMs: 260,
  damage: 0, knockback: { dir: [0, 0, 0], base: 0, scaling: 0 },
  hooks: {
    onActive(c) {
      const p: Vec3 = [c.caster.pos[0], Math.max(0, c.caster.pos[1] - 0.4), 0]
      c.spawnZone(p, { radius: 3.2, durationMs: 3400, slowFactor: 0.55, color: RM, damagePerSec: 5.5 })
      c.fx({ kind: 'ring', pos: p, color: RM, ttl: 480, radius: 3.2 })
      c.fx({ kind: 'burst', pos: p, color: '#ffffff', ttl: 450, count: 20, speed: 4, size: 0.15 })
    },
  },
})
registerSmashes('reimu', { color: RM, names: ['重御幣破邪', '昇天陰陽彈', '雙重封印'] })
reg({
  id: 'reimu.fantasySeal', name: '靈符「夢想封印」', energyCost: 0, requiresUlt: true,
  startupMs: 550, activeMs: 1850, recoveryMs: 420,
  damage: 9.5, knockback: { dir: [0, 0.85, 1], base: 17, scaling: 16, radial: true },
  hooks: {
    onStart(c) { c.setGravityScale(0.15); c.setVelocity(0, 7, 0) },
    onTick(c) {
      if (c.phase === 'recovery') return
      c.setInvulnerable(140)
      if (c.phase !== 'active') return
      c.scratch.fs = (c.scratch.fs ?? 0) - c.dt * 1000
      if (c.scratch.fs <= 0) {
        c.scratch.fs = 150
        const cols = ['#f43f5e', '#fbbf24', '#4ade80', '#38bdf8', '#c084fc', '#fb923c', '#ffffff']
        const idx = (c.scratch.fsi ?? 0) as number
        c.scratch.fsi = idx + 1
        const col = cols[idx % cols.length]
        const t = c.nearestEnemy()
        const angle = (idx / 7) * Math.PI * 2
        const ox = Math.cos(angle) * 1.4, oy = Math.sin(angle) * 1.4
        const tx = t ? t.pos[0] : c.caster.pos[0] + c.forward[0] * 4
        const ty = t ? t.pos[1] : c.caster.pos[1]
        const dx = tx - (c.caster.pos[0] + ox), dy = ty - (c.caster.pos[1] + oy)
        const len = Math.hypot(dx, dy) || 1
        c.spawnProjectile({
          pos: [c.caster.pos[0] + ox, c.caster.pos[1] + oy, 0],
          vel: [(dx / len) * 23, (dy / len) * 23, 0],
          radius: 0.72, ttlMs: 1600, color: col, explodeRadius: 2.4,
        })
        c.fx({ kind: 'ring', pos: [...c.caster.pos], color: col, ttl: 260, radius: 1.9 })
      }
    },
    onEnd(c) { c.setGravityScale(1) },
  },
})

// =====================================================================
//  10. 東方 Project：霧雨魔理沙 (MARISA KIRISAME)
// =====================================================================
const MRS = '#facc15'
reg({
  id: 'marisa.broomSweep', name: '掃帚星塵揮擊', energyCost: 0, startupMs: 80, activeMs: 95, recoveryMs: 165,
  hitbox: { offset: [0, 0.1, 1.15], radius: 1.0 }, damage: 4.5,
  knockback: { dir: [0, 0.25, 1], base: 5, scaling: 6, hitstunMs: 240 },
  hooks: {
    onActive(c) {
      c.setLocalVelocity(0, null, 4.5)
      slash(c, MRS, { r: 1.6 })
      c.spawnProjectile({ pos: at(c, 0.15, 0.9), vel: [c.forward[0] * 21, 0, 0], radius: 0.28, ttlMs: 650, color: '#fef08a' })
    },
  },
})
registerTilts('marisa', { color: MRS, names: ['掃帚突刺', '星屑挑擊', '星塵掃地'] })
reg({
  id: 'marisa.magicMissile', name: '魔導星塵飛彈', energyCost: 0, cooldownMs: 1300, startupMs: 130, activeMs: 40, recoveryMs: 250,
  damage: 5, knockback: { dir: [0, 0.4, 1], base: 8, scaling: 9, radial: true },
  hooks: {
    onActive(c) {
      const cols = ['#fde047', '#38bdf8', '#f472b6']
      cols.forEach((col, i) => {
        c.spawnProjectile({ pos: at(c, 0.15 + (i - 1) * 0.25, 0.85), vel: [c.forward[0] * (19 + i * 2), (i - 1) * 2.5, 0], radius: 0.36, ttlMs: 1100, color: col, explodeRadius: 1.5 })
      })
    },
  },
})
reg({
  id: 'marisa.blazingStar', name: '彗星「Blazing Star」', energyCost: 0, cooldownMs: 1900, startupMs: 120, activeMs: 280, recoveryMs: 300,
  hitbox: { offset: [0, 0.05, 0.9], radius: 1.15 }, damage: 9.5,
  knockback: { dir: [0, 0.4, 1], base: 12, scaling: 14 },
  hooks: {
    onActive(c) { c.shake(0.28); c.fx({ kind: 'ring', pos: [...c.caster.pos], color: MRS, ttl: 320, radius: 1.8 }) },
    onTick(c) {
      if (c.phase !== 'active') return
      c.setLocalVelocity(0, 0, 25)
      trail(c, 35, MRS, 260)
    },
  },
})
reg(upRise('marisa.starRise', '掃帚螺旋升空', MRS, { dmg: 8.5, base: 11.5, scaling: 13.5, rise: 17.8 }))
reg({
  id: 'marisa.potionDrop', name: '爆炸魔藥瓶', energyCost: 0, cooldownMs: 1950, startupMs: 130, activeMs: 40, recoveryMs: 260,
  damage: 10, knockback: { dir: [0, 0.85, 1], base: 12, scaling: 15, radial: true },
  hooks: {
    onActive(c) {
      c.spawnProjectile({ pos: at(c, -0.1, 0.6), vel: [c.forward[0] * 5, -10, 0], radius: 0.44, ttlMs: 1200, color: '#a855f7', gravity: -26, explodeRadius: 2.4 })
      c.setLocalVelocity(0, 7.5, -2)
    },
  },
})
reg({
  id: 'marisa.miniSpark', name: '八卦爐蓄力魔砲', energyCost: 15, cooldownMs: 2200, startupMs: 110, activeMs: 180, recoveryMs: 360,
  hitbox: { offset: [0, 0.15, 0.8], radius: 0.9, length: 14 }, damage: 9,
  knockback: { dir: [0, 0.35, 1], base: 11, scaling: 14 },
  charge: { maxMs: 1200, knockbackMult: [1, 2.3], damageMult: [1, 1.9] },
  hooks: {
    onTick(c) {
      if (c.phase !== 'startup') return
      c.scratch.m = (c.scratch.m ?? 0) - c.dt * 1000
      if (c.scratch.m <= 0) { c.scratch.m = 100; c.fx({ kind: 'burst', pos: at(c, 0.15, 0.8), color: MRS, ttl: 240, count: 5, speed: 3, size: 0.14 }) }
    },
    onActive(c) {
      c.fx({ kind: 'beam', pos: at(c, 0.15, 0.8), yaw: yawOf(c), length: 14, radius: 0.65 + c.chargeRatio * 0.6, color: MRS, ttl: 340 })
      c.setLocalVelocity(-4, null, -4)
      c.shake(0.35 + c.chargeRatio * 0.45)
    },
  },
})
registerSmashes('marisa', { color: MRS, names: ['掃帚星爆', '星塵噴發', '魔力大爆發'] })
reg({
  id: 'marisa.masterSpark', name: '戀符「Master Spark 極限火花」', energyCost: 0, requiresUlt: true,
  startupMs: 700, activeMs: 550, recoveryMs: 520,
  hitbox: { offset: [0, 0.15, 0.8], radius: 2.1, length: 28 }, damage: 20,
  knockback: { dir: [0, 0.45, 1], base: 28, scaling: 18, hitstunMs: 1300 },
  hooks: {
    onStart(c) { c.setGravityScale(0.2); c.setVelocity(0, 3, 0) },
    onTick(c) {
      if (c.phase === 'recovery') return
      c.setInvulnerable(140)
      if (c.phase === 'startup') {
        c.scratch.ms = (c.scratch.ms ?? 0) - c.dt * 1000
        if (c.scratch.ms <= 0) {
          c.scratch.ms = 75
          c.fx({ kind: 'ring', pos: at(c, 0.15, 0.9), color: MRS, ttl: 220, radius: 0.8 + (c.phaseMs / 700) * 2.2, plane: 'vertical' })
        }
      } else {
        c.scratch.mb = (c.scratch.mb ?? 0) - c.dt * 1000
        if (c.scratch.mb <= 0) {
          c.scratch.mb = 110
          const cols = ['#fde047', '#38bdf8', '#f472b6', '#4ade80']
          const col = cols[Math.floor(Math.random() * cols.length)]
          c.fx({ kind: 'beam', pos: at(c, 0.15, 0.8), yaw: yawOf(c), length: 28, radius: 1.9, color: col, ttl: 260 })
        }
      }
    },
    onActive(c) {
      c.fx({ kind: 'beam', pos: at(c, 0.15, 0.8), yaw: yawOf(c), length: 28, radius: 2.2, color: '#ffffff', ttl: 550 })
      c.fx({ kind: 'burst', pos: at(c, 0.15, 1.0), color: MRS, ttl: 750, count: 65, speed: 12, size: 0.25 })
      c.shake(1.35)
    },
    onEnd(c) { c.setGravityScale(1) },
  },
})
