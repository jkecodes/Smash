import { registerSkill } from './registry'
import { registerSmashes, registerTilts } from './directionalSkills'
import { STAGES, resolveStage } from '../stages'
import { useGameStore } from '../store'
import { mineSteveStep, tryPlaceSteveBlock } from './steveBlocks'
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
      c.fx({ kind: 'summon', model: 'ufo', pos: [p[0], p[1] + 4.2, 0], color: '#ec4899', ttl: 1500, size: 1.0, dir: c.forward[0] })
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
  id: 'kong.slap', name: '重拳連拍（可蓄力）', energyCost: 0, startupMs: 110, activeMs: 110, recoveryMs: 210,
  charge: { maxMs: 750, damageMult: [1, 2.3], knockbackMult: [1, 2.0] },
  hitbox: { offset: [0, 0.1, 1.15], radius: 1.15 }, damage: 6.5,
  knockback: { dir: [0, 0.3, 1], base: 7, scaling: 9 },
  hooks: {
    onActive(c) {
      c.setLocalVelocity(0, null, 4.5 + c.chargeRatio * 5)
      c.shake(0.18 + c.chargeRatio * 0.25)
      slash(c, '#fb923c', { r: 1.75 + c.chargeRatio * 0.5 })
      if (c.chargeRatio > 0.35) c.fx({ kind: 'ring', pos: at(c, 0.1, 0.9), color: '#fb923c', ttl: 280, radius: 1.8, plane: 'vertical' })
    },
  },
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
  projectile: { speed: 25, radius: 0.32, lifetimeMs: 1100, pierce: false, offset: [0, 0.1, 0.45], color: '#ffffff' },
  hooks: {
    onActive(c) {
      c.fx({ kind: 'ring', pos: at(c, 0.1, 0.45), color: '#38bdf8', ttl: 200, radius: 0.9, plane: 'vertical' })
    },
  },
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
  id: 'marisa.magicMissile', name: '魔導星塵飛彈（可操控）', energyCost: 0, cooldownMs: 1300, startupMs: 130, activeMs: 40, recoveryMs: 250,
  damage: 5, knockback: { dir: [0, 0.4, 1], base: 8, scaling: 9, radial: true },
  hooks: {
    onActive(c) {
      const cols = ['#fde047', '#38bdf8', '#f472b6']
      cols.forEach((col, i) => {
        c.spawnProjectile({ pos: at(c, 0.15 + (i - 1) * 0.25, 0.85), vel: [c.forward[0] * (15 + i * 1.5), (i - 1) * 2.5, 0], radius: 0.36, ttlMs: 1650, color: col, explodeRadius: 1.5, steerable: 4.6, maxRange: 20 })
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

// ================================================================ 11. RYU 隆 (Street Fighter)
const RYU = '#38bdf8'
reg({
  id: 'ryu.a1', name: '正拳直擊（可蓄力）', energyCost: 0, chain: 'ryu.a2',
  startupMs: 55, activeMs: 85, recoveryMs: 135,
  charge: { maxMs: 650, damageMult: [1, 2.2], knockbackMult: [1, 1.9] },
  hitbox: { offset: [0, 0.12, 0.9], radius: 0.88 }, damage: 3.5,
  knockback: { dir: [0, 0.2, 1], base: 5.5, scaling: 5.5 },
  hooks: {
    onActive(c) {
      slash(c, c.chargeRatio > 0.35 ? RYU : '#ffffff', { r: 1.25 + c.chargeRatio * 0.45 })
      if (c.chargeRatio > 0.35) {
        c.fx({ kind: 'ring', pos: at(c, 0.1, 0.9), color: RYU, ttl: 260, radius: 1.5, plane: 'vertical' })
        c.shake(0.22)
      }
    },
  },
})
reg({
  id: 'ryu.a2', name: '鳩尾碎重拳', energyCost: 0,
  startupMs: 75, activeMs: 110, recoveryMs: 210,
  hitbox: { offset: [0, 0.1, 1.05], radius: 1.0 }, damage: 6.5,
  knockback: { dir: [0, 0.45, 1], base: 9.5, scaling: 10 },
  hooks: {
    onActive(c) {
      c.setLocalVelocity(0, null, 3.5)
      slash(c, RYU, { r: 1.55, flip: true })
      c.fx({ kind: 'burst', pos: at(c, 0.1, 1.05), color: RYU, ttl: 260, count: 10, speed: 5, size: 0.13 })
    },
  },
})
registerTilts('ryu', { color: RYU, names: ['鎖骨割橫劈', '對空上勾拳', '下段足刀掃腿'] })
reg({
  id: 'ryu.hadoken', name: '波動拳', energyCost: 0, cooldownMs: 900, startupMs: 135, activeMs: 70, recoveryMs: 220,
  projectile: { speed: 17.5, radius: 0.48, lifetimeMs: 1250, pierce: false, offset: [0, 0.12, 0.9], color: RYU },
  damage: 9.5, knockback: { dir: [0, 0.38, 1], base: 10, scaling: 11 },
  hooks: {
    onActive(c) {
      c.fx({ kind: 'ring', pos: at(c, 0.12, 0.9), color: '#bae6fd', ttl: 240, radius: 1.2, plane: 'vertical' })
    },
  },
})
reg({
  id: 'ryu.tatsumaki', name: '龍卷旋風腳', energyCost: 0, cooldownMs: 1500, startupMs: 110, activeMs: 360, recoveryMs: 240,
  hitbox: { offset: [0, 0.08, 0.4], radius: 1.25, manual: true }, damage: 3.4,
  knockback: { dir: [0, 0.42, 1], base: 9, scaling: 9 },
  hooks: {
    onStart(c) { c.setGravityScale(0.3) },
    onTick(c) {
      if (c.phase !== 'active') return
      c.setLocalVelocity(0, 1.2, 11.5)
      trail(c, 45, RYU, 200)
      c.scratch.tk = (c.scratch.tk ?? 0) - c.dt * 1000
      if (c.scratch.tk <= 0) {
        c.scratch.tk = 115
        c.strike()
        c.fx({ kind: 'ring', pos: [...c.caster.pos], color: '#bae6fd', ttl: 200, radius: 1.45 })
      }
    },
    onEnd(c) { c.setGravityScale(1) },
  },
})
reg({
  id: 'ryu.shoryuken', name: '昇龍拳', energyCost: 0, cooldownMs: 1400, startupMs: 75, activeMs: 280, recoveryMs: 340,
  hitbox: { offset: [0, 0.45, 0.75], radius: 1.2 }, damage: 13,
  knockback: { dir: [0, 0.92, 0.4], base: 14.5, scaling: 16 },
  hooks: {
    onStart(c) { c.setInvulnerable(220) },
    onActive(c) {
      c.setVelocity(c.forward[0] * 4.5, 17.5, 0)
      c.fx({ kind: 'pillar', pos: [...c.caster.pos], color: '#f97316', ttl: 340, radius: 1.2 })
      c.fx({ kind: 'burst', pos: at(c, 0.4, 0.6), color: '#fde047', ttl: 320, count: 16, speed: 7, size: 0.16 })
      c.shake(0.3)
    },
    onTick(c) { if (c.phase === 'active') trail(c, 35, '#fb923c', 220) },
  },
})
reg({
  id: 'ryu.focus', name: '氣合崩拳', energyCost: 0, cooldownMs: 2100, startupMs: 180, activeMs: 130, recoveryMs: 290,
  hitbox: { offset: [0, 0.1, 0.95], radius: 1.4 }, damage: 11.5,
  knockback: { dir: [0, 0.25, 1], base: 11, scaling: 12, hitstunMs: 900 },
  hooks: {
    onStart(c) { c.setInvulnerable(200) },
    onActive(c) {
      const p = at(c, 0, 0.9)
      c.fx({ kind: 'ring', pos: p, color: '#111827', ttl: 360, radius: 2.0, plane: 'vertical' })
      c.fx({ kind: 'burst', pos: p, color: '#ffffff', ttl: 340, count: 18, speed: 6, size: 0.16 })
      c.shake(0.32)
    },
  },
})
reg({
  id: 'ryu.shakunetsu', name: '灼熱波動拳', energyCost: 22, cooldownMs: 2400, startupMs: 200, activeMs: 80, recoveryMs: 260,
  damage: 14, knockback: { dir: [0, 0.55, 1], base: 15, scaling: 16 },
  hooks: {
    onActive(c) {
      c.spawnProjectile({ pos: at(c, 0.12, 0.9), vel: [c.forward[0] * 18, 0, 0], radius: 0.58, ttlMs: 1400, color: '#f97316', explodeRadius: 2.1 })
      c.fx({ kind: 'ring', pos: at(c, 0.12, 0.9), color: '#ef4444', ttl: 260, radius: 1.4, plane: 'vertical' })
    },
  },
})
registerSmashes('ryu', { color: '#ef4444', names: ['殺意正拳突', '真・鐵山昇龍', '裂地破軍腳'] })
reg({
  id: 'ryu.shinku', name: '真空波動拳 → 真・昇龍', energyCost: 0, requiresUlt: true,
  startupMs: 520, activeMs: 1100, recoveryMs: 420,
  damage: 5.5, knockback: { dir: [0, 0.65, 1], base: 17, scaling: 16 },
  hooks: {
    onStart(c) { c.setGravityScale(0.2); c.setVelocity(0, 2, 0) },
    onTick(c) {
      if (c.phase === 'recovery') return
      c.setInvulnerable(140)
      if (c.phase === 'active') {
        c.scratch.shk = (c.scratch.shk ?? 0) - c.dt * 1000
        if (c.scratch.shk <= 0) {
          c.scratch.shk = 190
          c.fx({ kind: 'beam', pos: at(c, 0.15, 0.8), yaw: yawOf(c), length: 24, radius: 1.4, color: RYU, ttl: 240 })
          c.spawnProjectile({ pos: at(c, 0.15, 0.9), vel: [c.forward[0] * 26, 0, 0], radius: 0.85, ttlMs: 1000, color: '#bae6fd', pierce: true })
          c.shake(0.35)
        }
      }
    },
    onEnd(c) {
      c.setGravityScale(1)
      c.setVelocity(c.forward[0] * 4, 15, 0)
      c.fx({ kind: 'pillar', pos: [...c.caster.pos], color: '#f97316', ttl: 420, radius: 1.8 })
    },
  },
})

// ================================================================ 12. CHUN-LI 春麗 (Street Fighter)
const CHN = '#60a5fa'
reg({
  id: 'chunli.a1', name: '鶴形掌擊', energyCost: 0, chain: 'chunli.a2',
  startupMs: 50, activeMs: 80, recoveryMs: 120,
  hitbox: { offset: [0, 0.12, 0.88], radius: 0.85 }, damage: 3,
  knockback: { dir: [0, 0.2, 1], base: 5, scaling: 5 },
  hooks: { onActive(c) { slash(c, '#ffffff', { r: 1.2 }) } },
})
reg({
  id: 'chunli.a2', name: '穿雲雙踢', energyCost: 0,
  startupMs: 65, activeMs: 105, recoveryMs: 190,
  hitbox: { offset: [0, 0.15, 1.05], radius: 1.0 }, damage: 6,
  knockback: { dir: [0, 0.5, 1], base: 9, scaling: 9.5 },
  hooks: {
    onActive(c) {
      c.setLocalVelocity(0, null, 3.8)
      slash(c, CHN, { r: 1.5, flip: true })
    },
  },
})
registerTilts('chunli', { color: CHN, names: ['鳳扇華橫踢', '天龍穿弓腿', '翡翠掃堂腿'] })
reg({
  id: 'chunli.hyakuretsu', name: '百裂腳', energyCost: 0, cooldownMs: 1200, startupMs: 90, activeMs: 440, recoveryMs: 220,
  hitbox: { offset: [0, 0.12, 1.05], radius: 1.25, manual: true }, damage: 2.3,
  knockback: { dir: [0, 0.35, 1], base: 7.5, scaling: 8.5 },
  hooks: {
    onTick(c) {
      if (c.phase !== 'active') return
      c.scratch.hk = (c.scratch.hk ?? 0) - c.dt * 1000
      if (c.scratch.hk <= 0) {
        c.scratch.hk = 75
        c.strike()
        slash(c, Math.random() > 0.4 ? CHN : '#ffffff', { d: 1.05, y: -0.15 + Math.random() * 0.55, r: 1.35, tilt: (Math.random() - 0.5) * 0.8 })
      }
    },
  },
})
reg({
  id: 'chunli.sbk', name: '迴旋鶴腳蹴', energyCost: 0, cooldownMs: 1500, startupMs: 120, activeMs: 400, recoveryMs: 240,
  hitbox: { offset: [0, 0, 0.3], radius: 1.4, manual: true }, damage: 3.6,
  knockback: { dir: [0, 0.5, 1], base: 9.5, scaling: 10 },
  hooks: {
    onStart(c) { c.setGravityScale(0.22) },
    onTick(c) {
      if (c.phase !== 'active') return
      c.setLocalVelocity(0, 0.6, 12.5)
      trail(c, 45, CHN, 200)
      c.scratch.sbk = (c.scratch.sbk ?? 0) - c.dt * 1000
      if (c.scratch.sbk <= 0) {
        c.scratch.sbk = 105
        c.strike()
        c.fx({ kind: 'ring', pos: [...c.caster.pos], color: '#fef08a', ttl: 200, radius: 1.6 })
      }
    },
    onEnd(c) { c.setGravityScale(1) },
  },
})
reg({
  id: 'chunli.tensho', name: '天昇腳', energyCost: 0, cooldownMs: 1400, startupMs: 80, activeMs: 320, recoveryMs: 320,
  hitbox: { offset: [0, 0.4, 0.65], radius: 1.25 }, damage: 11,
  knockback: { dir: [0, 0.92, 0.4], base: 14, scaling: 15 },
  hooks: {
    onActive(c) {
      c.setVelocity(c.forward[0] * 3.5, 17.8, 0)
      c.fx({ kind: 'pillar', pos: [...c.caster.pos], color: CHN, ttl: 340, radius: 1.15 })
      c.fx({ kind: 'burst', pos: [...c.caster.pos], color: '#ffffff', ttl: 300, count: 14, speed: 6, size: 0.14 })
    },
  },
})
reg({
  id: 'chunli.hazanshu', name: '霸山蹴', energyCost: 0, cooldownMs: 1800, startupMs: 160, activeMs: 180, recoveryMs: 260,
  hitbox: { offset: [0, -0.1, 0.9], radius: 1.55 }, damage: 11,
  knockback: { dir: [0, 0.6, 1], base: 13, scaling: 13 },
  hooks: {
    onStart(c) { c.setVelocity(c.forward[0] * 6, 8, 0) },
    onActive(c) {
      c.setVelocity(c.forward[0] * 4, -14, 0)
      c.fx({ kind: 'ring', pos: at(c, -0.2, 0.9), color: '#fde047', ttl: 320, radius: 1.8 })
      c.shake(0.32)
    },
  },
})
reg({
  id: 'chunli.kikoken', name: '氣功拳', energyCost: 16, cooldownMs: 1800, startupMs: 140, activeMs: 70, recoveryMs: 220,
  projectile: { speed: 15.5, radius: 0.5, lifetimeMs: 1100, pierce: false, offset: [0, 0.12, 0.9], color: '#fde047' },
  damage: 11, knockback: { dir: [0, 0.45, 1], base: 12, scaling: 12 },
  hooks: { onActive(c) { c.fx({ kind: 'ring', pos: at(c, 0.12, 0.9), color: CHN, ttl: 240, radius: 1.2, plane: 'vertical' }) } },
})
registerSmashes('chunli', { color: CHN, names: ['發勁雙掌破', '天穹鶴翼腳', '雙龍旋風掃'] })
reg({
  id: 'chunli.kikosho', name: '奧義「氣功掌」', energyCost: 0, requiresUlt: true,
  startupMs: 520, activeMs: 1350, recoveryMs: 400,
  hitbox: { offset: [0, 0.15, 0.2], radius: 4.4, manual: true }, damage: 6.5,
  knockback: { dir: [0, 0.78, 1], base: 19, scaling: 17, radial: true },
  hooks: {
    onStart(c) { c.setGravityScale(0.1); c.setVelocity(0, 1.5, 0) },
    onTick(c) {
      if (c.phase === 'recovery') return
      c.setInvulnerable(140)
      if (c.phase === 'active') {
        c.scratch.kk = (c.scratch.kk ?? 0) - c.dt * 1000
        if (c.scratch.kk <= 0) {
          c.scratch.kk = 240
          c.strike()
          c.fx({ kind: 'ring', pos: [...c.caster.pos], color: CHN, ttl: 340, radius: 4.4, plane: 'vertical' })
          c.fx({ kind: 'ring', pos: [...c.caster.pos], color: '#fde047', ttl: 320, radius: 4.2 })
          c.fx({ kind: 'burst', pos: [...c.caster.pos], color: '#ffffff', ttl: 340, count: 22, speed: 9, size: 0.18 })
          c.shake(0.55)
        }
      }
    },
    onEnd(c) { c.setGravityScale(1) },
  },
})

// ================================================================ 13. YUGI 武藤遊戲 (Yu-Gi-Oh!)
const YUG = '#a855f7'
reg({
  id: 'yugi.a1', name: '決鬥盤抽卡斬', energyCost: 0, chain: 'yugi.a2',
  startupMs: 65, activeMs: 85, recoveryMs: 145,
  hitbox: { offset: [0, 0.15, 0.95], radius: 0.9 }, damage: 3.5,
  knockback: { dir: [0, 0.25, 1], base: 6, scaling: 5.5 },
  hooks: { onActive(c) { slash(c, '#fde047', { r: 1.35 }) } },
})
reg({
  id: 'yugi.a2', name: '黑魔導杖破擊', energyCost: 0,
  startupMs: 85, activeMs: 110, recoveryMs: 215,
  hitbox: { offset: [0, 0.15, 1.15], radius: 1.05 }, damage: 6.5,
  knockback: { dir: [0, 0.5, 1], base: 10.5, scaling: 11 },
  hooks: {
    onActive(c) {
      slash(c, YUG, { d: 1.0, r: 1.7, flip: true })
      c.fx({ kind: 'burst', pos: at(c, 0.15, 1.1), color: '#fde047', ttl: 280, count: 12, speed: 5, size: 0.14 })
    },
  },
})
registerTilts('yugi', { color: YUG, names: ['黑魔導女孩魔杖擊', '精靈劍士上斬', '栗子球爆雷下掃'] })
reg({
  id: 'yugi.darkMagic', name: '黑・魔・導', energyCost: 0, cooldownMs: 1150, startupMs: 165, activeMs: 70, recoveryMs: 230,
  projectile: { speed: 18.5, radius: 0.54, lifetimeMs: 1350, pierce: true, offset: [0, 0.15, 0.95], color: YUG },
  damage: 11, knockback: { dir: [0, 0.45, 1], base: 12, scaling: 12.5 },
  hooks: {
    onActive(c) {
      c.fx({ kind: 'ring', pos: at(c, 0.15, 0.95), color: '#fde047', ttl: 260, radius: 1.4, plane: 'vertical' })
    },
  },
})
reg({
  id: 'yugi.gaia', name: '暗黑騎士蓋亞・螺旋槍殺', energyCost: 0, cooldownMs: 1700, startupMs: 130, activeMs: 320, recoveryMs: 240,
  hitbox: { offset: [0, 0.1, 0.75], radius: 1.2 }, damage: 11.5,
  knockback: { dir: [0, 0.4, 1], base: 14, scaling: 13.5 },
  hooks: {
    onActive(c) { c.setLocalVelocity(0, 1.5, 15.5) },
    onTick(c) { if (c.phase === 'active') trail(c, 35, YUG, 240) },
  },
})
reg({
  id: 'yugi.swords', name: '光之護封劍・傳送', energyCost: 0, cooldownMs: 1500, startupMs: 130, activeMs: 120, recoveryMs: 280,
  hitbox: { offset: [0, 0.1, 0], radius: 1.9 }, damage: 7,
  knockback: { dir: [0, 0.85, 0.5], base: 12, scaling: 11, radial: true },
  hooks: {
    onStart(c) { c.setInvulnerable(240) },
    onActive(c) {
      const ny = c.caster.pos[1] + 4.8
      c.teleport([c.caster.pos[0], ny, 0])
      c.setVelocity(c.forward[0] * 3, 10.5, 0)
      c.fx({ kind: 'pillar', pos: [c.caster.pos[0], ny - 1, 0], color: '#fde047', ttl: 420, radius: 1.5 })
      c.fx({ kind: 'ring', pos: [c.caster.pos[0], ny, 0], color: '#ffffff', ttl: 340, radius: 1.9 })
    },
  },
})
reg({
  id: 'yugi.mirrorForce', name: '神聖彗星－反射力量－', energyCost: 0, cooldownMs: 2400, startupMs: 90, activeMs: 160, recoveryMs: 300,
  hitbox: { offset: [0, 0.1, 0], radius: 2.9 }, damage: 10.5,
  knockback: { dir: [0, 0.65, 1], base: 14.5, scaling: 15, radial: true },
  hooks: {
    onStart(c) { c.setInvulnerable(280) },
    onActive(c) {
      const p: Vec3 = [...c.caster.pos]
      c.fx({ kind: 'ring', pos: p, color: '#fde047', ttl: 420, radius: 2.9, plane: 'vertical' })
      c.fx({ kind: 'ring', pos: p, color: '#ffffff', ttl: 380, radius: 2.9 })
      for (const s of [-1, 1]) {
        c.spawnProjectile({ pos: p, vel: [s * 17, 2.5, 0], radius: 0.4, ttlMs: 950, color: '#fde047' })
      }
      c.shake(0.38)
    },
  },
})
reg({
  id: 'yugi.slifer', name: '歐西里斯天空龍・召雷彈', energyCost: 24, cooldownMs: 2600, startupMs: 210, activeMs: 80, recoveryMs: 260,
  damage: 15.5, knockback: { dir: [0, 0.62, 1], base: 16, scaling: 16.5 },
  hooks: {
    onActive(c) {
      c.spawnProjectile({ pos: at(c, 0.25, 0.9), vel: [c.forward[0] * 19, -0.5, 0], radius: 0.6, ttlMs: 1400, color: '#ef4444', explodeRadius: 2.4 })
      c.fx({ kind: 'burst', pos: at(c, 0.25, 0.9), color: '#fde047', ttl: 340, count: 16, speed: 6, size: 0.16 })
      c.shake(0.35)
    },
  },
})
registerSmashes('yugi', { color: '#fde047', names: ['混沌黑魔導斬', '超魔導劍士破', '魔法筒次元震'] })
reg({
  id: 'yugi.exodia', name: '艾克佐迪亞・黑暗大法師潰滅！', energyCost: 0, requiresUlt: true,
  startupMs: 650, activeMs: 700, recoveryMs: 480,
  hitbox: { offset: [0, 0.2, 0.8], radius: 2.4, length: 28 }, damage: 24,
  knockback: { dir: [0, 0.55, 1], base: 27, scaling: 19, hitstunMs: 1400 },
  hooks: {
    onStart(c) { c.setGravityScale(0.15); c.setVelocity(0, 3, 0) },
    onTick(c) {
      if (c.phase === 'recovery') return
      c.setInvulnerable(140)
      if (c.phase === 'startup') {
        c.scratch.ex = (c.scratch.ex ?? 0) - c.dt * 1000
        if (c.scratch.ex <= 0) {
          c.scratch.ex = 120
          c.fx({ kind: 'ring', pos: [...c.caster.pos], color: '#fde047', ttl: 260, radius: 1.0 + (c.phaseMs / 650) * 2.5, plane: 'vertical' })
        }
      }
    },
    onActive(c) {
      c.fx({ kind: 'beam', pos: at(c, 0.2, 0.8), yaw: yawOf(c), length: 28, radius: 2.3, color: '#fde047', ttl: 650 })
      c.fx({ kind: 'pillar', pos: at(c, -2, 4), color: '#facc15', ttl: 700, radius: 2.8 })
      c.fx({ kind: 'burst', pos: [...c.caster.pos], color: '#fde047', ttl: 750, count: 60, speed: 12, size: 0.24 })
      c.shake(1.35)
    },
    onEnd(c) { c.setGravityScale(1) },
  },
})

// ================================================================ 14. KAIBA 海馬瀨人 (Yu-Gi-Oh!)
const KIB = '#38bdf8'
reg({
  id: 'kaiba.a1', name: '決鬥卡片飛刃', energyCost: 0, chain: 'kaiba.a2',
  startupMs: 55, activeMs: 75, recoveryMs: 130,
  projectile: { speed: 22, radius: 0.3, lifetimeMs: 700, pierce: false, offset: [0, 0.15, 0.9], color: '#e0f2fe' },
  damage: 3.5, knockback: { dir: [0, 0.25, 1], base: 6, scaling: 5.5 },
})
reg({
  id: 'kaiba.a2', name: '青眼龍爪重劈', energyCost: 0,
  startupMs: 80, activeMs: 105, recoveryMs: 210,
  hitbox: { offset: [0, 0.15, 1.15], radius: 1.05 }, damage: 6.5,
  knockback: { dir: [0, 0.5, 1], base: 10.5, scaling: 10.5 },
  hooks: { onActive(c) { slash(c, KIB, { d: 1.0, r: 1.65, flip: true }) } },
})
registerTilts('kaiba', { color: KIB, names: ['X-加農炮橫擊', '海馬人昇龍拳', '血腥魔獸下劈'] })
reg({
  id: 'kaiba.burstStream', name: '毀滅的噴射白光', energyCost: 0, cooldownMs: 1200, startupMs: 165, activeMs: 70, recoveryMs: 230,
  projectile: { speed: 21, radius: 0.52, lifetimeMs: 1250, pierce: true, offset: [0, 0.15, 0.95], color: '#e0f2fe' },
  damage: 11.5, knockback: { dir: [0, 0.42, 1], base: 12.5, scaling: 13 },
  hooks: {
    onActive(c) {
      c.fx({ kind: 'beam', pos: at(c, 0.15, 0.95), yaw: yawOf(c), length: 12, radius: 0.5, color: KIB, ttl: 240 })
      c.shake(0.25)
    },
  },
})
reg({
  id: 'kaiba.wingDash', name: '青眼白龍・龍翼突進', energyCost: 0, cooldownMs: 1600, startupMs: 110, activeMs: 290, recoveryMs: 230,
  hitbox: { offset: [0, 0.1, 0.7], radius: 1.25 }, damage: 10.5,
  knockback: { dir: [0, 0.45, 1], base: 13.5, scaling: 13 },
  hooks: {
    onActive(c) { c.setLocalVelocity(0, 1.8, 16) },
    onTick(c) { if (c.phase === 'active') trail(c, 32, '#e0f2fe', 240) },
  },
})
reg({
  id: 'kaiba.blueEyesJet', name: '青眼噴射機・升空', energyCost: 0, cooldownMs: 1500, startupMs: 95, activeMs: 320, recoveryMs: 300,
  hitbox: { offset: [0, 0.35, 0.55], radius: 1.3 }, damage: 9.5,
  knockback: { dir: [0, 0.9, 0.4], base: 13, scaling: 14 },
  hooks: {
    onActive(c) {
      c.setVelocity(c.forward[0] * 4.5, 18.2, 0)
      c.fx({ kind: 'pillar', pos: [...c.caster.pos], color: '#e0f2fe', ttl: 340, radius: 1.3 })
      c.fx({ kind: 'burst', pos: [...c.caster.pos], color: KIB, ttl: 320, count: 16, speed: 6, size: 0.15 })
    },
  },
})
reg({
  id: 'kaiba.crushCard', name: '死之卡組破壞病毒', energyCost: 0, cooldownMs: 2600, startupMs: 160, activeMs: 100, recoveryMs: 260,
  hitbox: { offset: [0, 0, 0], radius: 2.3 }, damage: 6.5,
  knockback: { dir: [0, 0.55, 1], base: 10.5, scaling: 10, radial: true },
  hooks: {
    onActive(c) {
      const p: Vec3 = [c.caster.pos[0], Math.max(0, c.caster.pos[1] - 0.3), 0]
      c.spawnZone(p, { radius: 3.1, durationMs: 3400, slowFactor: 0.55, color: '#9333ea', damagePerSec: 7.5 })
      c.fx({ kind: 'ring', pos: p, color: '#9333ea', ttl: 460, radius: 3.1 })
    },
  },
})
reg({
  id: 'kaiba.enemyController', name: '敵人控制器 A-B-A-B', energyCost: 20, cooldownMs: 2200, startupMs: 150, activeMs: 70, recoveryMs: 240,
  damage: 11, knockback: { dir: [0, 0.72, 1], base: 13, scaling: 14, hitstunMs: 950 },
  hooks: {
    onActive(c) {
      c.spawnProjectile({ pos: at(c, 0.2, 0.9), vel: [c.forward[0] * 21, 0, 0], radius: 0.5, ttlMs: 1200, color: '#22d3ee', explodeRadius: 2.2 })
      c.fx({ kind: 'ring', pos: at(c, 0.2, 0.9), color: '#e0f2fe', ttl: 260, radius: 1.3, plane: 'vertical' })
    },
  },
})
registerSmashes('kaiba', { color: '#67e8f9', names: ['歐貝利斯克神拳', '亞白龍強襲咆哮', '粉碎卡片暴風'] })
reg({
  id: 'kaiba.ultimateDragon', name: '青眼究極龍・究極爆風彈！', energyCost: 0, requiresUlt: true,
  startupMs: 580, activeMs: 900, recoveryMs: 450,
  hitbox: { offset: [0, 0.2, 1.0], radius: 2.3, length: 26 }, damage: 22,
  knockback: { dir: [0, 0.5, 1], base: 27, scaling: 18, hitstunMs: 1350 },
  hooks: {
    onStart(c) { c.setGravityScale(0.15); c.setVelocity(0, 4, 0) },
    onTick(c) { if (c.phase !== 'recovery') c.setInvulnerable(140) },
    onActive(c) {
      for (const vy of [-3.5, 0, 3.5]) {
        c.spawnProjectile({ pos: at(c, 0.2, 0.9), vel: [c.forward[0] * 25, vy, 0], radius: 0.8, ttlMs: 1250, color: '#e0f2fe', explodeRadius: 2.5 })
      }
      c.fx({ kind: 'summon', model: 'blueEyes', pos: at(c, 1.2, 1.5), color: '#e0f2fe', ttl: 1100, size: 1.5, dir: c.forward[0] })
      c.fx({ kind: 'beam', pos: at(c, 0.2, 0.9), yaw: yawOf(c), length: 26, radius: 2.1, color: '#e0f2fe', ttl: 550 })
      c.fx({ kind: 'burst', pos: [...c.caster.pos], color: KIB, ttl: 700, count: 60, speed: 12, size: 0.24 })
      c.shake(1.3)
    },
    onEnd(c) { c.setGravityScale(1) },
  },
})

// ================================================================ 15. OM NOM 奧姆 (Cut the Rope)
const OMN = '#4ade80'
reg({
  id: 'omnom.a1', name: '黏舌甩擊', energyCost: 0, chain: 'omnom.a2',
  startupMs: 55, activeMs: 80, recoveryMs: 135,
  hitbox: { offset: [0, 0.1, 1.0], radius: 0.9 }, damage: 3.5,
  knockback: { dir: [0, 0.25, 1], base: 5.5, scaling: 5.5 },
  hooks: { onActive(c) { slash(c, '#f472b6', { r: 1.3 }) } },
})
reg({
  id: 'omnom.a2', name: '大口嚼糖咬', energyCost: 0,
  startupMs: 80, activeMs: 100, recoveryMs: 200,
  hitbox: { offset: [0, 0.1, 1.05], radius: 1.05 }, damage: 6.5,
  knockback: { dir: [0, 0.45, 1], base: 10, scaling: 10.5 },
  hooks: { onActive(c) { slash(c, OMN, { r: 1.55, flip: true }) } },
})
registerTilts('omnom', { color: OMN, names: ['彈性舌鞭', '仰頭嚼擊', '圓滾滾壓頂'] })
reg({
  id: 'omnom.candy', name: '糖果爆彈', energyCost: 0, cooldownMs: 1350, startupMs: 130, activeMs: 50, recoveryMs: 220,
  damage: 9.5, knockback: { dir: [0, 0.55, 1], base: 11.5, scaling: 12, radial: true },
  hooks: {
    onActive(c) {
      c.spawnProjectile({ pos: at(c, 0.2, 0.85), vel: [c.forward[0] * 14, 5.5, 0], radius: 0.48, ttlMs: 1450, color: '#f43f5e', gravity: -20, explodeRadius: 2.1 })
    },
  },
})
reg(dashMove('omnom.ropeSwing', '切斷繩索擺盪', OMN, { speed: 22, dmg: 8.5, base: 11, scaling: 12, cd: 1650 }))
reg(upRise('omnom.bubbleRise', '泡泡浮空升天', '#38bdf8', { dmg: 7.5, base: 11, scaling: 12.5, rise: 18 }))
reg(slamMove('omnom.chompSlam', '飢餓重壓', OMN, { dmg: 10, base: 12, scaling: 13.5, cd: 1900 }))
reg({
  id: 'omnom.spiderTrap', name: '蜘蛛絲減速陣', energyCost: 18, cooldownMs: 2600, startupMs: 160, activeMs: 60, recoveryMs: 260,
  damage: 0, knockback: { dir: [0, 0, 0], base: 0, scaling: 0 },
  hooks: {
    onActive(c) {
      const p: Vec3 = [c.caster.pos[0], Math.max(0, c.caster.pos[1] - 0.35), 0]
      c.spawnZone(p, { radius: 3.0, durationMs: 3200, slowFactor: 0.45, color: '#e2e8f0', pull: 12, damagePerSec: 3.5 })
      c.fx({ kind: 'ring', pos: p, color: '#ffffff', ttl: 400, radius: 3.0 })
    },
  },
})
registerSmashes('omnom', { color: OMN, names: ['巨口吞噬衝', '糖果跳頂撞', '貪吃重肚震'] })
reg({
  id: 'omnom.superCandy', name: '三星糖果雨！', energyCost: 0, requiresUlt: true,
  startupMs: 520, activeMs: 1300, recoveryMs: 380,
  damage: 11, knockback: { dir: [0, 0.85, 1], base: 18, scaling: 16, radial: true },
  hooks: {
    onStart(c) { c.setGravityScale(0.2); c.setVelocity(0, 4, 0) },
    onTick(c) {
      if (c.phase === 'recovery') return
      c.setInvulnerable(140)
      if (c.phase === 'active') {
        c.scratch.sc = (c.scratch.sc ?? 0) - c.dt * 1000
        if (c.scratch.sc <= 0) {
          c.scratch.sc = 175
          const x = clampStageX((Math.random() - 0.5) * 16)
          c.spawnProjectile({ pos: [x, 14, 0], vel: [0, -18, 0], radius: 0.65, ttlMs: 1600, color: '#f43f5e', gravity: -14, explodeRadius: 2.3 })
        }
      }
    },
    onEnd(c) { c.setGravityScale(1) },
  },
})

// ================================================================ 16. TOM 湯姆貓 (Talking Tom)
const TOM = '#94a3b8'
reg({
  id: 'tom.a1', name: '貓爪連抓', energyCost: 0, chain: 'tom.a2',
  startupMs: 50, activeMs: 80, recoveryMs: 130,
  hitbox: { offset: [0, 0.1, 0.9], radius: 0.85 }, damage: 3.5,
  knockback: { dir: [0, 0.22, 1], base: 5.5, scaling: 5.5 },
  hooks: { onActive(c) { slash(c, '#ffffff', { r: 1.25 }) } },
})
reg({
  id: 'tom.a2', name: '湯姆飛踢', energyCost: 0,
  startupMs: 75, activeMs: 100, recoveryMs: 200,
  hitbox: { offset: [0, 0.1, 1.05], radius: 1.0 }, damage: 6,
  knockback: { dir: [0, 0.45, 1], base: 9.5, scaling: 10 },
  hooks: { onActive(c) { slash(c, TOM, { r: 1.5, flip: true }) } },
})
registerTilts('tom', { color: TOM, names: ['喵拳橫揮', '貓耳上頂', '掃尾下踢'] })
reg({
  id: 'tom.echoMeow', name: '迴音學舌音波', energyCost: 0, cooldownMs: 1200, startupMs: 130, activeMs: 60, recoveryMs: 210,
  projectile: { speed: 17, radius: 0.52, lifetimeMs: 1150, pierce: true, offset: [0, 0.15, 0.9], color: '#38bdf8' },
  damage: 8.5, knockback: { dir: [0, 0.4, 1], base: 10, scaling: 11 },
  hooks: { onActive(c) { c.fx({ kind: 'ring', pos: at(c, 0.15, 0.9), color: '#38bdf8', ttl: 240, radius: 1.3, plane: 'vertical' }) } },
})
reg(dashMove('tom.pounce', '靈貓飛撲', TOM, { speed: 23, dmg: 8, base: 10.5, scaling: 12, cd: 1600 }))
reg(upRise('tom.highJump', '驚嚇炸毛跳', '#facc15', { dmg: 7.5, base: 11, scaling: 12, rise: 18 }))
reg({
  id: 'tom.milkSplash', name: '打翻牛奶滑倒', energyCost: 0, cooldownMs: 2000, startupMs: 140, activeMs: 120, recoveryMs: 250,
  hitbox: { offset: [0, -0.1, 0], radius: 2.2 }, damage: 7,
  knockback: { dir: [0, 0.5, 1], base: 10, scaling: 10, radial: true },
  hooks: {
    onActive(c) {
      const p: Vec3 = [c.caster.pos[0], Math.max(0, c.caster.pos[1] - 0.35), 0]
      c.spawnZone(p, { radius: 2.8, durationMs: 3000, slowFactor: 0.5, color: '#f8fafc', damagePerSec: 2 })
      c.fx({ kind: 'ring', pos: p, color: '#ffffff', ttl: 380, radius: 2.8 })
    },
  },
})
reg({
  id: 'tom.pieThrow', name: '砸奶油派', energyCost: 18, cooldownMs: 1900, startupMs: 145, activeMs: 50, recoveryMs: 230,
  damage: 11.5, knockback: { dir: [0, 0.65, 1], base: 13.5, scaling: 14, hitstunMs: 900 },
  hooks: {
    onActive(c) {
      c.spawnProjectile({ pos: at(c, 0.2, 0.9), vel: [c.forward[0] * 17, 3, 0], radius: 0.5, ttlMs: 1300, color: '#fef3c7', gravity: -16, explodeRadius: 2.0 })
    },
  },
})
registerSmashes('tom', { color: TOM, names: ['湯姆重巴掌', '貓抓板突刺', '沙發彈壓'] })
reg({
  id: 'tom.megaphone', name: '擴音器「學你講話」大暴走！', energyCost: 0, requiresUlt: true,
  startupMs: 500, activeMs: 950, recoveryMs: 400,
  hitbox: { offset: [0, 0.15, 0], radius: 5.5, manual: true }, damage: 7,
  knockback: { dir: [0, 0.72, 1], base: 20, scaling: 17, radial: true },
  hooks: {
    onStart(c) { c.setGravityScale(0.15); c.setVelocity(0, 2, 0) },
    onTick(c) {
      if (c.phase === 'recovery') return
      c.setInvulnerable(140)
      if (c.phase === 'active') {
        c.scratch.mg = (c.scratch.mg ?? 0) - c.dt * 1000
        if (c.scratch.mg <= 0) {
          c.scratch.mg = 220
          c.strike()
          c.fx({ kind: 'ring', pos: [...c.caster.pos], color: '#38bdf8', ttl: 340, radius: 5.5, plane: 'vertical' })
          c.fx({ kind: 'ring', pos: [...c.caster.pos], color: '#facc15', ttl: 320, radius: 5.0 })
          c.shake(0.55)
        }
      }
    },
    onEnd(c) { c.setGravityScale(1) },
  },
})

// ================================================================ 17. BEN 阿班博士 (Talking Ben)
const BEN = '#b45309'
reg({
  id: 'ben.a1', name: '報紙揮拍', energyCost: 0, chain: 'ben.a2',
  startupMs: 60, activeMs: 85, recoveryMs: 145,
  hitbox: { offset: [0, 0.1, 0.95], radius: 0.9 }, damage: 3.5,
  knockback: { dir: [0, 0.25, 1], base: 5.5, scaling: 5.5 },
  hooks: { onActive(c) { slash(c, '#fef3c7', { r: 1.35 }) } },
})
reg({
  id: 'ben.a2', name: '電話筒重敲', energyCost: 0,
  startupMs: 85, activeMs: 105, recoveryMs: 210,
  hitbox: { offset: [0, 0.1, 1.05], radius: 1.0 }, damage: 6.5,
  knockback: { dir: [0, 0.5, 1], base: 10, scaling: 10.5 },
  hooks: { onActive(c) { slash(c, BEN, { r: 1.55, flip: true }) } },
})
registerTilts('ben', { color: BEN, names: ['報紙橫掃', '燒杯上擊', '老狗甩尾'] })
reg({
  id: 'ben.flask', name: '混合化學試管', energyCost: 0, cooldownMs: 1400, startupMs: 140, activeMs: 50, recoveryMs: 230,
  damage: 9.5, knockback: { dir: [0, 0.55, 1], base: 11.5, scaling: 12, radial: true },
  hooks: {
    onActive(c) {
      const col = Math.random() > 0.5 ? '#22c55e' : '#a855f7'
      c.spawnProjectile({ pos: at(c, 0.25, 0.85), vel: [c.forward[0] * 14.5, 5, 0], radius: 0.46, ttlMs: 1450, color: col, gravity: -22, explodeRadius: 2.2 })
    },
  },
})
reg(dashMove('ben.phoneDash', '「Yes?」電話衝撞', BEN, { speed: 21, dmg: 8.5, base: 11, scaling: 12, cd: 1650 }))
reg(upRise('ben.labRocket', '燒瓶噴氣升空', '#22c55e', { dmg: 8, base: 11, scaling: 13, rise: 17.8 }))
reg(slamMove('ben.noSlam', '「No.」拒絕震地', '#ef4444', { dmg: 9.5, base: 12.5, scaling: 13, cd: 1900 }))
reg({
  id: 'ben.acidZone', name: '腐蝕毒氣燒瓶', energyCost: 20, cooldownMs: 2700, startupMs: 165, activeMs: 60, recoveryMs: 260,
  damage: 0, knockback: { dir: [0, 0, 0], base: 0, scaling: 0 },
  hooks: {
    onActive(c) {
      const p: Vec3 = [c.caster.pos[0], Math.max(0, c.caster.pos[1] - 0.35), 0]
      c.spawnZone(p, { radius: 3.1, durationMs: 3500, slowFactor: 0.58, color: '#a855f7', damagePerSec: 7.5 })
      c.fx({ kind: 'ring', pos: p, color: '#22c55e', ttl: 420, radius: 3.1 })
    },
  },
})
registerSmashes('ben', { color: '#22c55e', names: ['實驗大暴走', '氮氣筒沖天', '報紙拍桌震'] })
reg({
  id: 'ben.boomLab', name: '化學實驗室大爆炸！', energyCost: 0, requiresUlt: true,
  startupMs: 560, activeMs: 1200, recoveryMs: 420,
  damage: 14, knockback: { dir: [0, 0.85, 1], base: 20, scaling: 17, radial: true },
  hooks: {
    onStart(c) { c.setGravityScale(0.15); c.setVelocity(0, 3, 0) },
    onTick(c) {
      if (c.phase === 'recovery') return
      c.setInvulnerable(140)
      if (c.phase === 'active') {
        c.scratch.bl = (c.scratch.bl ?? 0) - c.dt * 1000
        if (c.scratch.bl <= 0) {
          c.scratch.bl = 200
          const x = clampStageX((Math.random() - 0.5) * 14)
          c.spawnProjectile({ pos: [x, 12, 0], vel: [0, -19, 0], radius: 0.7, ttlMs: 1500, color: '#a855f7', gravity: -12, explodeRadius: 2.8 })
          c.shake(0.5)
        }
      }
    },
    onEnd(c) { c.setGravityScale(1) },
  },
})

// ================================================================ 18. CROSSY ROAD 天天過馬路小雞
reg({
  id: 'crossy.a1', name: '方塊啄擊', energyCost: 0, chain: 'crossy.a2',
  startupMs: 50, activeMs: 75, recoveryMs: 125,
  hitbox: { offset: [0, 0.1, 0.9], radius: 0.85 }, damage: 3.5,
  knockback: { dir: [0, 0.25, 1], base: 5.5, scaling: 5.5 },
  hooks: { onActive(c) { slash(c, '#fde047', { r: 1.25 }) } },
})
reg({
  id: 'crossy.a2', name: '撲翅跳躍撞', energyCost: 0,
  startupMs: 70, activeMs: 95, recoveryMs: 190,
  hitbox: { offset: [0, 0.12, 1.0], radius: 1.0 }, damage: 6,
  knockback: { dir: [0, 0.45, 1], base: 9.5, scaling: 10 },
  hooks: { onActive(c) { slash(c, '#ef4444', { r: 1.45, flip: true }) } },
})
registerTilts('crossy', { color: '#fde047', names: ['雞冠突刺', '振翅上啄', '腳爪下踏'] })
reg({
  id: 'crossy.egg', name: '像素雞蛋彈', energyCost: 0, cooldownMs: 1100, startupMs: 110, activeMs: 40, recoveryMs: 200,
  projectile: { speed: 18, radius: 0.36, lifetimeMs: 1100, pierce: false, offset: [0, 0.15, 0.85], color: '#fef9c3' },
  damage: 8, knockback: { dir: [0, 0.4, 1], base: 9.5, scaling: 10.5 },
})
reg(dashMove('crossy.carDash', '超速賽車衝撞', '#ef4444', { speed: 25, dmg: 9, base: 11.5, scaling: 12.5, cd: 1650 }))
reg(upRise('crossy.eagleLift', '天降老鷹抓飛', '#78350f', { dmg: 7.5, base: 11, scaling: 12, rise: 18.5 }))
reg(slamMove('crossy.trainDrop', '高速火車壓頂', '#38bdf8', { dmg: 10.5, base: 12.5, scaling: 14, cd: 1950 }))
reg({
  id: 'crossy.logThrow', name: '河道浮木滾擊', energyCost: 18, cooldownMs: 2100, startupMs: 160, activeMs: 60, recoveryMs: 240,
  damage: 11, knockback: { dir: [0, 0.48, 1], base: 13.5, scaling: 13 },
  hooks: {
    onActive(c) {
      c.spawnProjectile({ pos: at(c, 0, 0.9), vel: [c.forward[0] * 16, 0, 0], radius: 0.6, ttlMs: 1500, color: '#92400e', pierce: true })
    },
  },
})
registerSmashes('crossy', { color: '#ef4444', names: ['號誌燈重擊', '跳格神雞啄', '斑馬線重踏'] })
reg({
  id: 'crossy.highwayRush', name: '尖峰時刻・全車道大暴衝！', energyCost: 0, requiresUlt: true,
  startupMs: 500, activeMs: 1250, recoveryMs: 380,
  damage: 14, knockback: { dir: [0, 0.55, 1], base: 22, scaling: 17 },
  hooks: {
    onTick(c) {
      if (c.phase === 'recovery') return
      c.setInvulnerable(140)
      if (c.phase === 'active') {
        c.scratch.cr = (c.scratch.cr ?? 0) - c.dt * 1000
        if (c.scratch.cr <= 0) {
          c.scratch.cr = 180
          const side = Math.random() > 0.5 ? 1 : -1
          const y = 0.4 + Math.random() * 4.2
          const col = ['#ef4444', '#3b82f6', '#facc15', '#22c55e'][Math.floor(Math.random() * 4)]
          c.spawnProjectile({ pos: [-side * 12, y, 0], vel: [side * 25, 0, 0], radius: 0.72, ttlMs: 1350, color: col, pierce: true })
          c.shake(0.35)
        }
      }
    },
  },
})

// ================================================================ 19. ANGRY BIRDS 怒鳥紅 RED
const RED = '#dc2626'
reg({
  id: 'red.a1', name: '憤怒頭槌', energyCost: 0, chain: 'red.a2',
  startupMs: 55, activeMs: 85, recoveryMs: 135,
  hitbox: { offset: [0, 0.1, 0.9], radius: 0.9 }, damage: 4,
  knockback: { dir: [0, 0.25, 1], base: 6, scaling: 5.5 },
  hooks: { onActive(c) { slash(c, RED, { r: 1.3 }) } },
})
reg({
  id: 'red.a2', name: '鋼鐵羽翼撞', energyCost: 0,
  startupMs: 75, activeMs: 100, recoveryMs: 205,
  hitbox: { offset: [0, 0.1, 1.05], radius: 1.0 }, damage: 6.5,
  knockback: { dir: [0, 0.5, 1], base: 10.5, scaling: 10.5 },
  hooks: { onActive(c) { slash(c, '#fde047', { r: 1.55, flip: true }) } },
})
registerTilts('red', { color: RED, names: ['怒眉橫撞', '朝天鳥喙頂', '重羽下墜擊'] })
reg({
  id: 'red.slingshot', name: '彈弓自體投射！', energyCost: 0, cooldownMs: 1450, startupMs: 220, activeMs: 280, recoveryMs: 200,
  hitbox: { offset: [0, 0.1, 0.25], radius: 0.95 },
  damage: 12, knockback: { dir: [0, 0.55, 1], base: 14, scaling: 13.5 },
  hooks: {
    onStart(c) {
      c.fx({ kind: 'slingshot', pos: [...c.caster.pos], color: '#78350f', ttl: 700, yaw: c.forward[0] > 0 ? Math.PI / 2 : -Math.PI / 2 })
      c.setVelocity(-c.forward[0] * 3.5, 1.5, 0)
    },
    onActive(c) {
      c.setVelocity(c.forward[0] * 24, 7.5, 0)
      c.fx({ kind: 'ring', pos: [...c.caster.pos], color: '#fde047', ttl: 300, radius: 1.4, plane: 'vertical' })
      c.fx({ kind: 'burst', pos: [...c.caster.pos], color: RED, ttl: 280, count: 10, speed: 5, size: 0.14 })
    },
    onTick(c) {
      if (c.phase === 'active') c.fx({ kind: 'afterimage', pos: [...c.caster.pos], color: RED, ttl: 160, size: 0.45 })
    },
  },
})
reg(dashMove('red.dash', '彈弓全力暴衝', RED, { speed: 25, dmg: 9.5, base: 12, scaling: 13.5, cd: 1650 }))
reg(upRise('red.launchUp', '彈弓朝天發射', '#f97316', { dmg: 8.5, base: 11.5, scaling: 13, rise: 18.5 }))
reg({
  id: 'red.eggBomb', name: '白鳥炸藥蛋空襲', energyCost: 0, cooldownMs: 1950, startupMs: 130, activeMs: 80, recoveryMs: 240,
  damage: 11.5, knockback: { dir: [0, 0.7, 1], base: 14, scaling: 14, radial: true },
  hooks: {
    onActive(c) {
      c.setVelocity(c.forward[0] * 4, 11, 0)
      c.spawnProjectile({ pos: at(c, -0.3, 0), vel: [0, -14, 0], radius: 0.52, ttlMs: 1100, color: '#ffffff', gravity: -20, explodeRadius: 2.5 })
    },
  },
})
reg({
  id: 'red.battleCry', name: '怒鳥戰吼震波', energyCost: 20, cooldownMs: 2200, startupMs: 140, activeMs: 120, recoveryMs: 240,
  hitbox: { offset: [0, 0.1, 0], radius: 3.1 }, damage: 9.5,
  knockback: { dir: [0, 0.65, 1], base: 14, scaling: 14, radial: true },
  hooks: {
    onActive(c) {
      c.fx({ kind: 'ring', pos: [...c.caster.pos], color: RED, ttl: 380, radius: 3.1, plane: 'vertical' })
      c.fx({ kind: 'ring', pos: [...c.caster.pos], color: '#fde047', ttl: 340, radius: 2.8 })
      c.shake(0.4)
    },
  },
})
registerSmashes('red', { color: RED, names: ['木箱粉碎撞', '石塊突破頂', '重鳥震波'] })
reg({
  id: 'red.mightyEagle', name: '神鷹降臨！Mighty Eagle', energyCost: 0, requiresUlt: true,
  startupMs: 580, activeMs: 650, recoveryMs: 440,
  hitbox: { offset: [0, 0.2, 0.8], radius: 4.5 }, damage: 23,
  knockback: { dir: [0, 0.65, 1], base: 27, scaling: 18, radial: true, hitstunMs: 1350 },
  hooks: {
    onStart(c) { c.setGravityScale(0.15); c.setVelocity(0, 6, 0) },
    onTick(c) { if (c.phase !== 'recovery') c.setInvulnerable(140) },
    onActive(c) {
      c.setVelocity(c.forward[0] * 18, -14, 0)
      c.fx({ kind: 'summon', model: 'eagle', pos: [...c.caster.pos], color: '#78350f', ttl: 1100, size: 1.4, dir: c.forward[0] })
      c.fx({ kind: 'pillar', pos: [...c.caster.pos], color: '#fde047', ttl: 550, radius: 3.0 })
      c.fx({ kind: 'ring', pos: [...c.caster.pos], color: RED, ttl: 500, radius: 4.5, plane: 'vertical' })
      c.fx({ kind: 'burst', pos: [...c.caster.pos], color: '#ffffff', ttl: 600, count: 55, speed: 12, size: 0.22 })
      c.shake(1.3)
    },
    onEnd(c) { c.setGravityScale(1) },
  },
})

// ================================================================ 20. MINECRAFT 史蒂夫 STEVE
const STV = '#38bdf8'
reg({
  id: 'steve.a1', name: '鑽石劍橫斬', energyCost: 0, chain: 'steve.a2',
  startupMs: 55, activeMs: 85, recoveryMs: 135,
  hitbox: { offset: [0, 0.1, 1.0], radius: 0.92 }, damage: 4,
  knockback: { dir: [0, 0.22, 1], base: 5.5, scaling: 5.5 },
  hooks: { onActive(c) { slash(c, STV, { r: 1.45 }) } },
})
reg({
  id: 'steve.a2', name: '鑽石劍連斬', energyCost: 0,
  startupMs: 75, activeMs: 100, recoveryMs: 195,
  hitbox: { offset: [0, 0.1, 1.15], radius: 1.05 }, damage: 6.5,
  knockback: { dir: [0, 0.45, 1], base: 10, scaling: 10.5 },
  hooks: { onActive(c) { slash(c, '#22d3ee', { r: 1.65, flip: true }) } },
})
registerTilts('steve', { color: STV, names: ['石鎬橫揮', '鑽石斧上劈', '方塊下挖掃'] })
reg({
  id: 'steve.bow', name: '採礦 / 造方塊', energyCost: 0, cooldownMs: 260, startupMs: 40, activeMs: 50, recoveryMs: 80,
  charge: { maxMs: 2600, damageMult: [1, 1], knockbackMult: [1, 1] },
  damage: 0, knockback: { dir: [0, 0, 0], base: 0, scaling: 0 },
  hooks: {
    onStart(c) {
      if (!c.caster.grounded && c.caster.skill) {
        c.caster.skill.released = true
      }
      c.scratch.mineMs = 0
    },
    onTick(c) {
      if (c.phase === 'startup' && !c.caster.skill?.released && c.caster.grounded) {
        c.scratch.mineMs = (c.scratch.mineMs ?? 0) + c.dt * 1000
        mineSteveStep(c.caster.id, c.dt * 1000, c.caster.pos)
        c.setVelocity(0, null, 0)
      }
    },
    onActive(c) {
      // 若剛才已在地面持續挖礦超過 240ms，則不額外消耗方塊放置
      if ((c.scratch.mineMs ?? 0) >= 240) return
      const s = useGameStore.getState()
      const stage = resolveStage(s.stageId, s.stageForm)
      const px = c.caster.grounded ? c.caster.pos[0] + c.forward[0] * 1.15 : c.caster.pos[0]
      const py = c.caster.grounded ? c.caster.pos[1] + 0.95 : c.caster.pos[1]
      if (tryPlaceSteveBlock(c.caster.id, px, py, stage.half.x) && !c.caster.grounded) {
        c.setVelocity(c.caster.vel[0], 4.5, 0)
      }
    },
  },
})
reg(dashMove('steve.minecart', '紅石礦車衝撞', '#94a3b8', { speed: 24, dmg: 9, base: 11.5, scaling: 12.5, cd: 1650 }))
reg(upRise('steve.elytra', '鞘翅煙火火箭！', '#f43f5e', { dmg: 8, base: 11, scaling: 12.5, rise: 19.2 }))
reg({
  id: 'steve.anvil', name: '鐵砧重砸！', energyCost: 0, cooldownMs: 1950, startupMs: 150, activeMs: 220, recoveryMs: 260,
  hitbox: { offset: [0, -0.35, 0], radius: 1.65 }, damage: 13,
  knockback: { dir: [0, 0.4, 1], base: 14.5, scaling: 14.5, radial: true },
  hooks: {
    onStart(c) { c.setVelocity(0, 5, 0) },
    onActive(c) {
      c.setVelocity(0, -24, 0)
      c.fx({ kind: 'ring', pos: at(c, -0.4, 0), color: '#64748b', ttl: 360, radius: 1.9 })
      c.shake(0.4)
    },
  },
})
reg({
  id: 'steve.tnt', name: '點燃 TNT 方塊炸彈', energyCost: 22, cooldownMs: 2300, startupMs: 160, activeMs: 60, recoveryMs: 240,
  damage: 15, knockback: { dir: [0, 0.72, 1], base: 16, scaling: 16, radial: true },
  hooks: {
    onActive(c) {
      c.spawnProjectile({ pos: at(c, 0.25, 0.85), vel: [c.forward[0] * 11, 5.5, 0], radius: 0.55, ttlMs: 1400, color: '#ef4444', gravity: -24, explodeRadius: 2.9 })
    },
  },
})
registerSmashes('steve', { color: STV, names: ['附魔鑽石重劈', '岩漿桶上潑', '苦力怕震爆'] })
reg({
  id: 'steve.enderDragon', name: '終界龍息・末影水晶大爆破！', energyCost: 0, requiresUlt: true,
  startupMs: 560, activeMs: 1150, recoveryMs: 420,
  damage: 14, knockback: { dir: [0, 0.75, 1], base: 21, scaling: 17, radial: true },
  hooks: {
    onStart(c) { c.setGravityScale(0.15); c.setVelocity(0, 4, 0) },
    onTick(c) {
      if (c.phase === 'recovery') return
      c.setInvulnerable(140)
      if (c.phase === 'active') {
        c.scratch.ed = (c.scratch.ed ?? 0) - c.dt * 1000
        if (c.scratch.ed <= 0) {
          c.scratch.ed = 190
          const x = clampStageX((Math.random() - 0.5) * 14)
          c.spawnProjectile({ pos: [x, 13, 0], vel: [0, -21, 0], radius: 0.65, ttlMs: 1500, color: '#c084fc', gravity: -12, explodeRadius: 2.7 })
          c.fx({ kind: 'beam', pos: at(c, 0.2, 0.9), yaw: yawOf(c), length: 22, radius: 1.4, color: '#c084fc', ttl: 240 })
          c.shake(0.55)
        }
      }
    },
    onEnd(c) { c.setGravityScale(1) },
  },
})

// ================================================================ 21. SHADOWVERSE 亞里莎 ARISA
const ARS = '#10b981'
reg({
  id: 'arisa.a1', name: '精靈短劍連擊', energyCost: 0, chain: 'arisa.a2',
  startupMs: 50, activeMs: 80, recoveryMs: 125,
  hitbox: { offset: [0, 0.12, 0.9], radius: 0.88 }, damage: 3.5,
  knockback: { dir: [0, 0.25, 1], base: 5.5, scaling: 5.5 },
  hooks: { onActive(c) { slash(c, '#6ee7b7', { r: 1.3 }) } },
})
reg({
  id: 'arisa.a2', name: '旋風矢斬', energyCost: 0,
  startupMs: 75, activeMs: 95, recoveryMs: 195,
  hitbox: { offset: [0, 0.12, 1.05], radius: 1.0 }, damage: 6,
  knockback: { dir: [0, 0.45, 1], base: 9.5, scaling: 10 },
  hooks: { onActive(c) { slash(c, ARS, { r: 1.55, flip: true }) } },
})
registerTilts('arisa', { color: ARS, names: ['森之連矢', '自然之導上擊', '樹藤絆腿'] })
reg({
  id: 'arisa.fairyArrow', name: '妖精引導箭', energyCost: 0, cooldownMs: 1100, startupMs: 120, activeMs: 40, recoveryMs: 200,
  projectile: { speed: 22, radius: 0.36, lifetimeMs: 1100, pierce: false, offset: [0, 0.15, 0.9], color: '#34d399' },
  damage: 8.5, knockback: { dir: [0, 0.4, 1], base: 10.5, scaling: 11 },
})
reg(dashMove('arisa.windStep', '妖精疾風步', ARS, { speed: 23, dmg: 8, base: 10.5, scaling: 12, cd: 1550 }))
reg(upRise('arisa.fairyWings', '妖精之翼飛翔', '#6ee7b7', { dmg: 7.5, base: 11, scaling: 12, rise: 18 }))
reg(slamMove('arisa.rhinoSlam', '破魔蟲強襲衝擊', '#a3e635', { dmg: 10, base: 12.5, scaling: 14, cd: 1900 }))
reg({
  id: 'arisa.forestSeal', name: '精靈聖樹結界', energyCost: 20, cooldownMs: 2600, startupMs: 160, activeMs: 60, recoveryMs: 250,
  damage: 0, knockback: { dir: [0, 0, 0], base: 0, scaling: 0 },
  hooks: {
    onActive(c) {
      const p: Vec3 = [c.caster.pos[0], Math.max(0, c.caster.pos[1] - 0.35), 0]
      c.spawnZone(p, { radius: 3.1, durationMs: 3400, slowFactor: 0.55, color: ARS, damagePerSec: 6 })
      c.fx({ kind: 'ring', pos: p, color: '#6ee7b7', ttl: 420, radius: 3.1 })
    },
  },
})
registerSmashes('arisa', { color: ARS, names: ['白狼劍閃', '荊棘森羅破', '大地精靈震'] })
reg({
  id: 'arisa.evolveBurst', name: 'EP 進化！森羅妖精齊射', energyCost: 0, requiresUlt: true,
  startupMs: 520, activeMs: 1100, recoveryMs: 420,
  damage: 11.5, knockback: { dir: [0, 0.55, 1], base: 20, scaling: 17 },
  hooks: {
    onStart(c) { c.setGravityScale(0.15); c.setVelocity(0, 4, 0) },
    onTick(c) {
      if (c.phase === 'recovery') return
      c.setInvulnerable(140)
      if (c.phase === 'active') {
        c.scratch.ar = (c.scratch.ar ?? 0) - c.dt * 1000
        if (c.scratch.ar <= 0) {
          c.scratch.ar = 160
          for (const vy of [-3, 0, 3]) {
            c.spawnProjectile({ pos: at(c, 0.2, 0.9), vel: [c.forward[0] * 24, vy, 0], radius: 0.48, ttlMs: 1150, color: '#34d399', explodeRadius: 1.8 })
          }
          c.fx({ kind: 'beam', pos: at(c, 0.2, 0.9), yaw: yawOf(c), length: 24, radius: 1.2, color: ARS, ttl: 220 })
          c.shake(0.45)
        }
      }
    },
    onEnd(c) { c.setGravityScale(1) },
  },
})
