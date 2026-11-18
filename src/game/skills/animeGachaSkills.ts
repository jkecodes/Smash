import { registerSkill } from './registry'
import { registerSmashes, registerTilts } from './directionalSkills'
import { PARTNERS, partnerHas } from '../partners'
import { resolveStage } from '../stages'
import { useGameStore } from '../store'
import type { SkillContext, SkillDef, Vec3 } from '../types'

const reg = (d: SkillDef) => registerSkill(d)
const yawOf = (c: SkillContext) => Math.atan2(c.forward[0], c.forward[2])
const at = (c: SkillContext, y: number, fwd: number): Vec3 => {
  const w = c.toWorld([0, y, fwd])
  return [c.caster.pos[0] + w[0], c.caster.pos[1] + w[1], 0]
}
const clampStageX = (x: number) => {
  const s = useGameStore.getState()
  const hx = resolveStage(s.stageId, s.stageForm).half.x - 0.5
  return Math.max(-hx, Math.min(hx, x))
}
function trail(c: SkillContext, ms: number, color: string, ttl = 240) {
  c.scratch.tr = (c.scratch.tr ?? 0) - c.dt * 1000
  if (c.scratch.tr <= 0) {
    c.scratch.tr = ms
    c.fx({ kind: 'afterimage', pos: [...c.caster.pos], yaw: yawOf(c), color, ttl })
  }
}
const slash = (c: SkillContext, color: string, o: { d?: number; y?: number; r?: number; tilt?: number; flip?: boolean; ttl?: number } = {}) =>
  c.fx({ kind: 'slash', pos: at(c, o.y ?? 0.1, o.d ?? 0.9), yaw: yawOf(c), plane: 'horizontal', tilt: o.tilt ?? 0.25, flip: o.flip, color, ttl: o.ttl ?? 220, radius: o.r ?? 1.55 })

function dashMove(id: string, name: string, color: string, o: { speed: number; dmg: number; base: number; scaling: number; cd?: number }): SkillDef {
  return {
    id, name, energyCost: 0, cooldownMs: o.cd ?? 1700, startupMs: 110, activeMs: 260, recoveryMs: 220,
    hitbox: { offset: [0, 0.05, 0.7], radius: 1.15 }, damage: o.dmg,
    knockback: { dir: [0, 0.42, 1], base: o.base, scaling: o.scaling },
    hooks: {
      onActive(c) { c.setLocalVelocity(0, 1.8, o.speed) },
      onTick(c) { if (c.phase === 'active') trail(c, 35, color, 220) },
    },
  }
}
function upRise(id: string, name: string, color: string, o: { dmg: number; base: number; scaling: number; rise?: number }): SkillDef {
  return {
    id, name, energyCost: 0, cooldownMs: 1500, startupMs: 95, activeMs: 300, recoveryMs: 290,
    hitbox: { offset: [0, 0.35, 0.55], radius: 1.25 }, damage: o.dmg,
    knockback: { dir: [0, 0.9, 0.35], base: o.base, scaling: o.scaling },
    hooks: {
      onActive(c) {
        c.setVelocity(c.forward[0] * 4, o.rise ?? 18, 0)
        c.fx({ kind: 'pillar', pos: [...c.caster.pos], color, ttl: 320, radius: 1.25 })
      },
      onTick(c) { if (c.phase === 'active') trail(c, 38, color, 210) },
    },
  }
}
function slamMove(id: string, name: string, color: string, o: { dmg: number; base: number; scaling: number; cd?: number }): SkillDef {
  return {
    id, name, energyCost: 0, cooldownMs: o.cd ?? 1900, startupMs: 120, activeMs: 190, recoveryMs: 250,
    hitbox: { offset: [0, -0.25, 0.2], radius: 1.9 }, damage: o.dmg,
    knockback: { dir: [0, 0.72, 1], base: o.base, scaling: o.scaling, radial: true },
    hooks: {
      onStart(c) { if (!c.isGrounded()) c.setVelocity(0, -18, 0) },
      onActive(c) {
        c.fx({ kind: 'ring', pos: [...c.caster.pos], color, ttl: 340, radius: 2.1 })
        c.shake(0.35)
      },
    },
  }
}

/** 建立一套完整的「普攻連段 + 3方向強攻 + 4方向特招 + 技能2 + 3方向重擊 + 大招」套件 */
interface KitSpec {
  p: string
  color: string
  a1: string
  a2: string
  tilts: [string, string, string]
  s1: { name: string; projColor: string; pierce?: boolean; explode?: number; speed?: number; steerable?: number }
  side: string
  up: string
  down: string
  s2: { name: string; kind: 'zone' | 'proj' | 'ring'; color: string }
  smashes: [string, string, string]
  ult: {
    name: string
    kind: 'omnislash' | 'rush' | 'train' | 'hollow' | 'barrage' | 'dragonBreath' | 'timestop' | 'ghostSpin' | 'rain' | 'burst'
    color: string
  }
}

const KIT_SUMMONS: Record<string, import('../types').SummonModel> = {
  chihiro: 'goldfish',
  ichi: 'baku',
  nona: 'needle',
  gojo: 'hollow',
  stelle: 'train',
  hutao: 'ghost',
}

const CHARGE_ATTACK_CHARS = new Set(['chihiro', 'gojo', 'deku', 'miyabi', 'stelle', 'hutao', 'rover', 'youmu', 'firefly', 'ellen', 'erika', ...partnerHas('charge')])
const TELEPORT_SIDE_CHARS = new Set(['gojo', 'yodaka', 'miyabi', 'rover', 'seija', 'youmu', 'blinky', 'ellen', 'erika', ...partnerHas('tpSide')])
const RANGED_SIDE_CHARS = new Set(['rapi', 'hutao', 'nona', 'kotone', 'saki', 'anis', 'vaus', ...partnerHas('ranged')])
const TELEPORT_UP_CHARS = new Set(['gojo', 'yodaka', 'nona', 'miyabi', 'youmu', 'blinky', 'jinhsi', ...partnerHas('tpUp')])
const WIND_UP_CHARS = new Set(['lumine', 'ruri', 'ichi', 'akira', 'diddy', 'firefly', ...partnerHas('windUp')])
const COUNTER_DOWN_CHARS = new Set(['chihiro', 'gojo', 'kaoruko', 'kotone', 'luigi', 'erika', ...partnerHas('counter')])
const TRAP_DOWN_CHARS = new Set(['rapi', 'ichi', 'hutao', 'nona', 'seija', 'diddy', 'creeper', 'anis', ...partnerHas('trap')])
const GUN_CHARS = new Set(['rapi', 'anis', 'diddy', 'vaus', ...partnerHas('gun')])
const MARTIAL_CHARS = new Set(['gojo', 'deku', 'spe', 'luigi', 'creeper', 'chuck', 'suzuka', ...partnerHas('martial')])
const CASTER_CHARS = new Set(['ichi', 'ruri', 'nona', 'saki', 'kaoruko', 'akira', 'kotone', 'blinky', 'jinhsi', ...partnerHas('caster')])

function hitVfx(c: any, color: string, p: string, r: number, flip = false) {
  if (GUN_CHARS.has(p)) {
    c.fx({ kind: 'beam', pos: at(c, 0.15, 0.9), yaw: yawOf(c), length: r * 2.2, radius: 0.18, color, ttl: 150 })
    c.fx({ kind: 'burst', pos: at(c, 0.15, 0.9), color: '#fde047', ttl: 160, count: 6, speed: 5, size: 0.12 })
  } else if (MARTIAL_CHARS.has(p)) {
    c.fx({ kind: 'ring', pos: at(c, 0.12, 0.9), color, ttl: 200, radius: r * 0.95, plane: 'vertical' })
    c.fx({ kind: 'burst', pos: at(c, 0.12, 0.9), color: '#ffffff', ttl: 180, count: 8, speed: 4.5, size: 0.12 })
  } else if (CASTER_CHARS.has(p)) {
    c.fx({ kind: 'ring', pos: at(c, 0.12, 0.9), color, ttl: 220, radius: r })
    c.fx({ kind: 'burst', pos: at(c, 0.12, 0.9), color, ttl: 200, count: 8, speed: 4, size: 0.13 })
  } else {
    slash(c, color, { r, flip })
  }
}

const HEAVY_CHARS = new Set(['deku', 'bakugo', 'sukuna', 'firefly', 'ellen', 'doh', 'stelle'])
const FAST_SWORD_CHARS = new Set(['chihiro', 'youmu', 'yodaka', 'miyabi', 'erika', 'hakuri', 'hibari', 'rover'])
const TONGUE_CHARS = new Set(['ladyfrog', 'omnelle'])
const EXPLODE_CHARS = new Set(['bakugo', 'creeper', 'blackbomber'])

function registerKit(k: KitSpec) {
  const { p, color } = k
  const canCharge = CHARGE_ATTACK_CHARS.has(p)
  const isHeavy = HEAVY_CHARS.has(p)
  const isFast = FAST_SWORD_CHARS.has(p)
  const isGun = GUN_CHARS.has(p)
  const isCaster = CASTER_CHARS.has(p)
  const isMartial = MARTIAL_CHARS.has(p)
  const isTongue = TONGUE_CHARS.has(p)
  const tiltStyle = isGun ? 'gun' : isHeavy ? 'heavy' : isCaster ? 'caster' : isMartial ? 'martial' : 'sword'
  reg({
    id: `${p}.a1`, name: canCharge ? `${k.a1}（可蓄力）` : k.a1, energyCost: 0, chain: `${p}.a2`,
    startupMs: isFast || isMartial ? 45 : isHeavy ? 65 : 55, activeMs: 85, recoveryMs: isFast || isMartial ? 120 : 135,
    ...(canCharge ? { charge: { maxMs: 650, damageMult: [1, 2.3] as [number, number], knockbackMult: [1, 1.95] as [number, number] } } : {}),
    hitbox: { offset: [0, 0.12, isTongue ? 1.35 : isFast ? 1.05 : 0.95], radius: isTongue ? 1.05 : isFast ? 1.02 : 0.9 },
    damage: isHeavy ? 4.6 : 3.5,
    knockback: { dir: [0, 0.22, 1], base: isHeavy ? 6.5 : 5.5, scaling: isHeavy ? 6.5 : 5.5 },
    hooks: {
      onActive(c) {
        if (isMartial || isFast) c.setLocalVelocity(0, null, 2.4)
        if (isGun) c.spawnProjectile({ pos: at(c, 0.15, 0.85), vel: [c.forward[0] * 22, 0, 0], radius: 0.25, ttlMs: 320, color })
        else if (isCaster && !canCharge) c.spawnProjectile({ pos: at(c, 0.15, 0.85), vel: [c.forward[0] * 14, 0, 0], radius: 0.3, ttlMs: 360, color })
        hitVfx(c, c.chargeRatio > 0.35 ? color : '#ffffff', p, 1.3 + c.chargeRatio * 0.5)
        if (c.chargeRatio > 0.35) {
          c.fx({ kind: 'ring', pos: at(c, 0.12, 0.9), color, ttl: 260, radius: 1.6, plane: 'vertical' })
          c.shake(0.24)
        }
      },
    },
  })
  const hasJab3 = CHARGE_ATTACK_CHARS.has(p) || p === 'spe' || p === 'saki' || p === 'kotone' || p === 'yodaka' || EXPLODE_CHARS.has(p)
  reg({
    id: `${p}.a2`, name: k.a2, energyCost: 0, ...(hasJab3 ? { chain: `${p}.a3` } : {}),
    startupMs: isFast || isMartial ? 55 : 65, activeMs: 90, recoveryMs: isFast ? 155 : 175,
    hitbox: { offset: [0, 0.12, isTongue ? 1.45 : isFast ? 1.15 : 1.05], radius: isFast || isTongue ? 1.1 : 1.0 },
    damage: isHeavy ? 5.6 : 4.5,
    knockback: { dir: [0, isCaster ? 0.58 : 0.35, isCaster ? 0.75 : 1], base: hasJab3 ? 6.5 : 10, scaling: hasJab3 ? 6 : 10.5 },
    hooks: {
      onActive(c) {
        if (isGun) {
          c.spawnProjectile({ pos: at(c, 0.18, 0.9), vel: [c.forward[0] * 21, 1.8, 0], radius: 0.24, ttlMs: 340, color })
          c.spawnProjectile({ pos: at(c, 0.12, 0.9), vel: [c.forward[0] * 21, -1.2, 0], radius: 0.24, ttlMs: 340, color })
        }
        hitVfx(c, color, p, 1.45, true)
      },
    },
  })
  if (hasJab3) {
    reg({
      id: `${p}.a3`, name: `${k.a2}・終結連打`, energyCost: 0,
      startupMs: isFast ? 60 : 70, activeMs: 110, recoveryMs: 205,
      hitbox: { offset: [0, 0.15, 1.2], radius: isHeavy || EXPLODE_CHARS.has(p) ? 1.35 : 1.15 },
      damage: isHeavy ? 9.2 : 7.5,
      knockback: { dir: [0, 0.52, 1], base: isHeavy ? 13.5 : 11.5, scaling: isHeavy ? 13 : 11.5 },
      hooks: {
        onActive(c) {
          c.setLocalVelocity(0, null, isFast ? 5.2 : 4)
          hitVfx(c, color, p, 1.75, false)
          if (p === 'youmu' || p === 'chihiro' || p === 'sukuna') {
            hitVfx(c, '#ffffff', p, 1.9, true)
          }
          if (EXPLODE_CHARS.has(p)) {
            c.fx({ kind: 'burst', pos: at(c, 0.15, 1.1), color: '#f97316', ttl: 260, count: 14, speed: 7, size: 0.18 })
            c.shake(0.32)
          }
          c.fx({ kind: 'ring', pos: at(c, 0.15, 1.0), color, ttl: 240, radius: 1.4, plane: 'vertical' })
        },
      },
    })
  }
  registerTilts(p, { color, names: k.tilts, ranged: isGun, style: tiltStyle })
  reg({
    id: `${p}.s1`, name: k.s1.name, energyCost: 0, cooldownMs: 1200, startupMs: 135, activeMs: 50, recoveryMs: 215,
    damage: 9.5, knockback: { dir: [0, 0.45, 1], base: 11, scaling: 11.5 },
    hooks: {
      onActive(c) {
        if (p === 'ichi') {
          c.fx({ kind: 'summon', model: 'thunderFox', pos: at(c, 0.3, 0.9), color: '#facc15', ttl: 850, size: 0.95, dir: c.forward[0] })
        } else if (p === 'chihiro') {
          c.fx({ kind: 'summon', model: 'goldfish', pos: at(c, 0.25, 0.9), color: '#ef4444', ttl: 850, size: 0.9, dir: c.forward[0] })
        }
        const baseVel = p === 'paddle' ? 26 : p === 'sukuna' || p === 'jinhsi' ? 24 : (k.s1.speed ?? 19)
        const spawnMain = (vx: number, vy: number) => c.spawnProjectile({
          pos: at(c, 0.15, 0.9),
          vel: [vx, vy, 0],
          radius: p === 'doh' ? 0.65 : 0.48,
          ttlMs: 1250,
          color: k.s1.projColor,
          pierce: k.s1.pierce || p === 'sukuna' || p === 'jinhsi' || p === 'paddle',
          gravity: k.s1.explode ? -16 : 0,
          explodeRadius: k.s1.explode,
          steerable: k.s1.steerable,
        })
        if (p === 'deku') {
          c.setLocalVelocity(0, null, -3.5)
        }
        if (p === 'nona') {
          for (const vy of [-2.4, 0, 2.4]) spawnMain(c.forward[0] * baseVel, vy)
        } else if (p === 'seija') {
          spawnMain(c.forward[0] * baseVel, 0)
          spawnMain(-c.forward[0] * (baseVel * 0.8), 1.8)
        } else if (p === 'youmu') {
          spawnMain(c.forward[0] * baseVel, 0)
          spawnMain(c.forward[0] * (baseVel * 1.18), 1.2)
        } else if (p === 'deku') {
          spawnMain(c.forward[0] * baseVel, 0)
          spawnMain(c.forward[0] * (baseVel * 0.9), 2.5)
        } else {
          spawnMain(c.forward[0] * baseVel, k.s1.explode ? 3 : 0)
        }
      },
    },
  })
  if (TELEPORT_SIDE_CHARS.has(p)) {
    reg({
      id: `${p}.side`, name: k.side, energyCost: 0, cooldownMs: 1550, startupMs: 90, activeMs: 120, recoveryMs: 200,
      hitbox: { offset: [0, 0.15, 0.4], radius: 1.3 }, damage: 9,
      knockback: { dir: [0, 0.45, 1], base: 11.5, scaling: 12.5 },
      hooks: {
        onStart(c) { c.fx({ kind: 'afterimage', pos: [...c.caster.pos], color, ttl: 260, size: 0.7 }) },
        onActive(c) {
          let dest = clampStageX(c.caster.pos[0] + c.forward[0] * 5.2)
          if (p === 'seija') {
            const tgt = c.nearestEnemy()
            if (tgt) {
              dest = clampStageX(tgt.pos[0] - tgt.facing[0] * 1.5)
              c.caster.facing[0] = tgt.facing[0]
            }
          }
          c.teleport([dest, c.caster.pos[1], 0])
          c.fx({ kind: 'ring', pos: [dest, c.caster.pos[1], 0], color, ttl: 280, radius: 1.5, plane: 'vertical' })
          c.fx({ kind: 'burst', pos: [dest, c.caster.pos[1], 0], color, ttl: 260, count: 10, speed: 5, size: 0.14 })
        },
      },
    })
  } else if (RANGED_SIDE_CHARS.has(p)) {
    reg({
      id: `${p}.side`, name: k.side, energyCost: 0, cooldownMs: 1500, startupMs: 100, activeMs: 180, recoveryMs: 200,
      hitbox: { offset: [0, 0.1, 0.5], radius: 1.05 }, damage: 8.5,
      knockback: { dir: [0, 0.4, 1], base: 10.5, scaling: 11.5 },
      hooks: {
        onActive(c) {
          c.setVelocity(c.forward[0] * 17, 2.5, 0)
          c.spawnProjectile({ pos: at(c, 0.15, 0.8), vel: [c.forward[0] * 21, 0, 0], radius: 0.42, ttlMs: 950, color })
        },
        onHit(c) {
          if (p === 'hutao') c.caster.damage = Math.max(0, c.caster.damage - 3)
        },
      },
    })
  } else {
    reg(dashMove(`${p}.side`, k.side, color, { speed: 24, dmg: 9.5, base: 12, scaling: 13 }))
  }

  if (TELEPORT_UP_CHARS.has(p)) {
    reg({
      id: `${p}.up`, name: k.up, energyCost: 0, cooldownMs: 1400, startupMs: 85, activeMs: 130, recoveryMs: 240,
      hitbox: { offset: [0, 0.3, 0], radius: 1.45 }, damage: 8,
      knockback: { dir: [0, 0.85, 0.4], base: 11, scaling: 12, radial: true },
      hooks: {
        onStart(c) { c.fx({ kind: 'ring', pos: [...c.caster.pos], color, ttl: 240, radius: 1.4 }) },
        onActive(c) {
          c.teleport([c.caster.pos[0] + c.forward[0] * 1.2, c.caster.pos[1] + 5.0, 0])
          c.setVelocity(c.forward[0] * 3, 4.5, 0)
          c.fx({ kind: 'ring', pos: [...c.caster.pos], color, ttl: 320, radius: 1.8 })
        },
      },
    })
  } else if (WIND_UP_CHARS.has(p)) {
    reg({
      id: `${p}.up`, name: k.up, energyCost: 0, cooldownMs: 1350, startupMs: 80, activeMs: 320, recoveryMs: 220,
      hitbox: { offset: [0, -0.1, 0], radius: 1.55 }, damage: 7.5,
      knockback: { dir: [0, 0.9, 0.3], base: 10.5, scaling: 11.5, radial: true },
      hooks: {
        onActive(c) {
          c.setVelocity(c.forward[0] * 5, 16.5, 0)
          c.fx({ kind: 'pillar', pos: [...c.caster.pos], color, ttl: 360, radius: 1.3 })
          c.fx({ kind: 'ring', pos: [...c.caster.pos], color: '#ffffff', ttl: 320, radius: 1.8 })
        },
      },
    })
  } else {
    const customRise = p === 'ladyfrog' ? 21.5 : p === 'bakugo' ? 21 : p === 'firefly' ? 20.5 : p === 'ufo' ? 19.5 : 18.5
    reg(upRise(`${p}.up`, k.up, color, { dmg: isHeavy ? 10 : 8.5, base: 11.5, scaling: 13, rise: customRise }))
  }

  if (COUNTER_DOWN_CHARS.has(p)) {
    reg({
      id: `${p}.down`, name: k.down, energyCost: 0, cooldownMs: 1700, startupMs: 90, activeMs: 180, recoveryMs: 230,
      hitbox: { offset: [0, 0.1, 0], radius: 2.3 }, damage: 10,
      knockback: { dir: [0, 0.65, 1], base: 13, scaling: 13.5, radial: true },
      hooks: {
        onStart(c) { c.setInvulnerable(240) },
        onActive(c) {
          c.fx({ kind: 'ring', pos: [...c.caster.pos], color, ttl: 340, radius: 2.3, plane: 'vertical' })
          c.fx({ kind: 'burst', pos: [...c.caster.pos], color: '#ffffff', ttl: 280, count: 12, speed: 6, size: 0.14 })
          c.shake(0.32)
        },
      },
    })
  } else if (TRAP_DOWN_CHARS.has(p)) {
    reg({
      id: `${p}.down`, name: k.down, energyCost: 0, cooldownMs: 1800, startupMs: 100, activeMs: 80, recoveryMs: 220,
      damage: 11, knockback: { dir: [0, 0.75, 1], base: 13, scaling: 14, radial: true },
      hooks: {
        onActive(c) {
          c.setVelocity(-c.forward[0] * 4, 6.5, 0)
          c.spawnProjectile({ pos: [c.caster.pos[0], c.caster.pos[1] - 0.2, 0], vel: [0, -8, 0], radius: 0.5, ttlMs: 1500, color, gravity: -18, explodeRadius: 2.5 })
        },
        onHit(_c, tgt) {
          if (p === 'seija') tgt.facing = [tgt.facing[0] === 1 ? -1 : 1, 0]
        },
      },
    })
  } else if (p === 'mino') {
    reg({
      id: `${p}.down`, name: k.down, energyCost: 0, cooldownMs: 1700, startupMs: 90, activeMs: 360, recoveryMs: 240,
      hitbox: { offset: [0, -0.45, 0.1], radius: 2.3 }, damage: 12,
      knockback: { dir: [0, -0.5, 0.8], base: 13.5, scaling: 14, radial: true },
      hooks: {
        onStart(c) { c.setVelocity(0, -24, 0) },
        onTick(c) {
          if (c.phase === 'active' && c.isGrounded()) {
            c.fx({ kind: 'ring', pos: [...c.caster.pos], color, ttl: 380, radius: 2.5 })
            c.shake(0.42)
            c.endActive()
          }
        },
      },
    })
  } else {
    reg(slamMove(`${p}.down`, k.down, color, { dmg: isHeavy ? 11.5 : 10, base: 12.5, scaling: 13.5 }))
  }

  if (k.s2.kind === 'zone') {
    reg({
      id: `${p}.s2`, name: k.s2.name, energyCost: 20, cooldownMs: 2600, startupMs: 160, activeMs: 60, recoveryMs: 250,
      damage: 0, knockback: { dir: [0, 0, 0], base: 0, scaling: 0 },
      hooks: {
        onActive(c) {
          const model = KIT_SUMMONS[p]
          if (model) c.fx({ kind: 'summon', model, pos: at(c, 0.4, 1.0), color: k.s2.color, ttl: 950, size: 1.0, dir: c.forward[0] })
          const pos: Vec3 = [c.caster.pos[0], Math.max(0, c.caster.pos[1] - 0.35), 0]
          const isGojo = p === 'gojo'
          const isSukuna = p === 'sukuna'
          const isViper = p === 'viper'
          c.spawnZone(pos, {
            radius: isSukuna ? 3.8 : 3.1,
            durationMs: isGojo ? 3800 : 3400,
            slowFactor: isGojo ? 0.25 : p === 'ufo' ? 0.35 : 0.52,
            color: k.s2.color,
            damagePerSec: isSukuna ? 9 : isViper ? 8.5 : 6.5,
          })
          c.fx({ kind: 'ring', pos, color: k.s2.color, ttl: 420, radius: 3.1 })
          if (p === 'ruri') c.fx({ kind: 'pillar', pos, color: '#34d399', ttl: 420, radius: 1.4 })
          if (p === 'lumine') {
            for (const vx of [-7, 7]) {
              c.spawnProjectile({ pos: [pos[0], pos[1] + 0.8, 0], vel: [vx, 7, 0], radius: 0.45, ttlMs: 1100, color: '#4ade80', gravity: -18, explodeRadius: 2.0 })
            }
          }
        },
      },
    })
  } else if (k.s2.kind === 'ring') {
    reg({
      id: `${p}.s2`, name: k.s2.name, energyCost: 18, cooldownMs: 2100, startupMs: 140, activeMs: 130, recoveryMs: 240,
      hitbox: { offset: [0, 0.1, 0], radius: 3.0 }, damage: 10,
      knockback: { dir: [0, 0.65, 1], base: 14, scaling: 14, radial: true },
      hooks: {
        onActive(c) {
          const model = KIT_SUMMONS[p]
          if (model) c.fx({ kind: 'summon', model, pos: at(c, 0.4, 1.0), color: k.s2.color, ttl: 950, size: 1.0, dir: c.forward[0] })
          c.fx({ kind: 'ring', pos: [...c.caster.pos], color: k.s2.color, ttl: 380, radius: 3.0, plane: 'vertical' })
          c.fx({ kind: 'ring', pos: [...c.caster.pos], color: '#ffffff', ttl: 340, radius: 2.6 })
          c.shake(0.38)
        },
      },
    })
  } else {
    reg({
      id: `${p}.s2`, name: k.s2.name, energyCost: 20, cooldownMs: 2200, startupMs: 165, activeMs: 60, recoveryMs: 240,
      damage: 14, knockback: { dir: [0, 0.58, 1], base: 15, scaling: 15.5, radial: true },
      hooks: {
        onActive(c) {
          if (p === 'gojo') {
            c.fx({ kind: 'summon', model: 'hollow', pos: at(c, 0.2, 0.9), color: '#a855f7', ttl: 1000, size: 1.15, dir: c.forward[0] })
            c.spawnProjectile({ pos: at(c, 0.2, 0.9), vel: [c.forward[0] * 17, 0, 0], radius: 0.85, ttlMs: 1450, color: '#a855f7', pierce: true })
          } else if (p === 'rapi') {
            for (const vy of [-1.2, 2.6]) {
              c.spawnProjectile({ pos: at(c, 0.2, 0.9), vel: [c.forward[0] * 21, vy, 0], radius: 0.48, ttlMs: 1300, color: k.s2.color, explodeRadius: 2.3 })
            }
          } else {
            c.spawnProjectile({ pos: at(c, 0.2, 0.9), vel: [c.forward[0] * 20, 0, 0], radius: 0.58, ttlMs: 1350, color: k.s2.color, explodeRadius: 2.3 })
          }
        },
      },
    })
  }
  registerSmashes(p, { color, names: k.smashes })

  const isRadialUlt = k.ult.kind === 'burst' || k.ult.kind === 'ghostSpin' || k.ult.kind === 'timestop'
  reg({
    id: `${p}.ult`, name: k.ult.name, energyCost: 0, requiresUlt: true,
    startupMs: 520, activeMs: k.ult.kind === 'omnislash' || k.ult.kind === 'rush' || k.ult.kind === 'barrage' ? 1150 : 1000, recoveryMs: 400,
    hitbox: { offset: [0, 0.2, isRadialUlt ? 0 : 0.9], radius: isRadialUlt ? 4.8 : 2.3 },
    damage: k.ult.kind === 'omnislash' || k.ult.kind === 'barrage' ? 7 : 22,
    knockback: { dir: [0, 0.65, 1], base: 25, scaling: 18, radial: isRadialUlt, hitstunMs: 1350 },
    hooks: {
      onStart(c) {
        c.setGravityScale(0.12)
        c.setVelocity(0, 3.2, 0)
        if (k.ult.kind === 'hollow' || k.ult.kind === 'timestop') {
          // 領域展開／時停結界：大範圍緩速結界
          c.spawnZone([...c.caster.pos], {
            radius: 11,
            durationMs: 1500,
            slowFactor: 0.08,
            color: k.ult.kind === 'hollow' ? '#312e81' : '#eab308',
            damagePerSec: 4,
          })
          c.fx({ kind: 'ring', pos: [...c.caster.pos], color: k.ult.color, ttl: 560, radius: 9.5, plane: 'vertical' })
          c.fx({ kind: 'pillar', pos: [...c.caster.pos], color: k.ult.color, ttl: 560, radius: 7.5 })
        }
      },
      onTick(c) {
        if (c.phase === 'recovery') return
        c.setInvulnerable(140)
        if (c.phase !== 'active') return

        if (k.ult.kind === 'rain') {
          c.scratch.rn = (c.scratch.rn ?? 0) - c.dt * 1000
          if (c.scratch.rn <= 0) {
            c.scratch.rn = 175
            const tgt = c.nearestEnemy()
            const anchorX = tgt ? tgt.pos[0] : c.caster.pos[0] + c.forward[0] * 4
            const x = clampStageX(anchorX + (Math.random() - 0.5) * 10)
            c.spawnProjectile({ pos: [x, 13.5, 0], vel: [0, -20, 0], radius: 0.62, ttlMs: 1500, color: k.ult.color, gravity: -14, explodeRadius: 2.4 })
          }
        } else if (k.ult.kind === 'omnislash') {
          // 大亂鬥超究武神霸斬式：瞬移圍繞最近敵人多段斬擊＋最終擊飛
          c.scratch.sl = (c.scratch.sl ?? 0) - c.dt * 1000
          if (c.scratch.sl <= 0) {
            c.scratch.sl = 210
            c.scratch.step = (c.scratch.step ?? 0) + 1
            const tgt = c.nearestEnemy()
            if (tgt) {
              const side = c.scratch.step % 2 === 0 ? 1.5 : -1.5
              c.teleport([clampStageX(tgt.pos[0] + side), tgt.pos[1] + (c.scratch.step % 3) * 0.45, 0])
              c.caster.facing[0] = side > 0 ? -1 : 1
            } else {
              c.setLocalVelocity(0, 0.5, 16)
            }
            slash(c, k.ult.color, { r: 2.8, tilt: (Math.random() - 0.5) * 1.4, flip: c.scratch.step % 2 === 0, ttl: 260 })
            c.strike({ offset: [0, 0.2, 0.6], radius: 2.4 })
            c.shake(0.35)
          }
        } else if (k.ult.kind === 'rush') {
          // 高速衝線／神速暗殺：在場地左右來回高速突進＋殘影
          trail(c, 32, k.ult.color, 260)
          c.scratch.ru = (c.scratch.ru ?? 0) - c.dt * 1000
          if (c.scratch.ru <= 0) {
            c.scratch.ru = 240
            c.scratch.dir = -(c.scratch.dir ?? -c.forward[0])
            c.caster.facing[0] = c.scratch.dir
            c.setVelocity(c.scratch.dir * 26, 1.5, 0)
            c.fx({ kind: 'ring', pos: [...c.caster.pos], color: k.ult.color, ttl: 260, radius: 2.2, plane: 'vertical' })
            c.strike({ offset: [0, 0.2, 0.5], radius: 2.3 })
          }
        } else if (k.ult.kind === 'barrage') {
          // 全彈發射：連射扇形高爆導彈
          c.scratch.ba = (c.scratch.ba ?? 0) - c.dt * 1000
          if (c.scratch.ba <= 0) {
            c.scratch.ba = 145
            const vy = (Math.random() - 0.35) * 9
            c.spawnProjectile({ pos: at(c, 0.3, 1.0), vel: [c.forward[0] * 21, vy, 0], radius: 0.48, ttlMs: 1350, color: k.ult.color, explodeRadius: 2.5 })
          }
        } else if (k.ult.kind === 'dragonBreath') {
          // 九霄雷炎吐息：斜向火球掃射＋落雷
          c.scratch.dr = (c.scratch.dr ?? 0) - c.dt * 1000
          if (c.scratch.dr <= 0) {
            c.scratch.dr = 175
            const vx = c.forward[0] * (12 + Math.random() * 8)
            c.spawnProjectile({ pos: at(c, 0.5, 0.9), vel: [vx, -6 - Math.random() * 6, 0], radius: 0.58, ttlMs: 1300, color: '#f97316', gravity: -8, explodeRadius: 2.6 })
            const lx = clampStageX(c.caster.pos[0] + c.forward[0] * (2 + Math.random() * 8))
            c.fx({ kind: 'pillar', pos: [lx, 0, 0], color: '#34d399', ttl: 260, radius: 1.0 })
          }
        }
      },
      onActive(c) {
        if (p === 'ichi') {
          c.fx({ kind: 'summon', model: 'thunderFox', pos: at(c, 0.8, 1.2), color: '#facc15', ttl: 1200, size: 1.25, dir: c.forward[0] })
          c.fx({ kind: 'summon', model: 'iceShark', pos: at(c, -0.4, 2.2), color: '#38bdf8', ttl: 1200, size: 1.25, dir: c.forward[0] })
          c.fx({ kind: 'summon', model: 'baku', pos: at(c, 0.2, 0.6), color: '#a855f7', ttl: 1200, size: 1.25, dir: -c.forward[0] })
        } else if (k.ult.kind === 'hollow') {
          // 虛式「茈」：發射巨大貫穿紫球＋召喚3D虛式
          c.spawnProjectile({ pos: at(c, 0.3, 1.2), vel: [c.forward[0] * 20, 0, 0], radius: 1.85, ttlMs: 1600, color: '#a855f7', pierce: true, maxRange: 28 })
          c.fx({ kind: 'summon', model: 'hollow', pos: at(c, 0.3, 1.2), color: '#a855f7', ttl: 1350, size: 1.85, dir: c.forward[0] })
        } else if (k.ult.kind === 'train') {
          // 星穹列車全速撞擊：巨型貫穿列車投射物
          c.spawnProjectile({ pos: at(c, 0.5, 1.4), vel: [c.forward[0] * 24, 0, 0], radius: 1.9, ttlMs: 1600, color: '#facc15', pierce: true, maxRange: 32 })
          c.fx({ kind: 'summon', model: 'train', pos: at(c, 0.6, 1.4), color: '#facc15', ttl: 1300, size: 1.65, dir: c.forward[0] })
        } else if (k.ult.kind === 'ghostSpin') {
          // 安神秘法：大範圍橫掃＋向四面八方飛出會爆炸的 Boo Tao 鬼火
          for (const vx of [-11, -5, 5, 11]) {
            c.spawnProjectile({ pos: [c.caster.pos[0], c.caster.pos[1] + 0.5, 0], vel: [vx, 6, 0], radius: 0.65, ttlMs: 1400, color: '#f97316', gravity: -16, explodeRadius: 2.5 })
          }
          c.fx({ kind: 'summon', model: 'ghost', pos: at(c, 1.0, 0.8), color: '#ef4444', ttl: 1200, size: 1.75, dir: c.forward[0] })
        } else if (k.ult.kind === 'timestop') {
          // 時停光刃：環繞自身放射 4 把貫穿光刃
          for (const [vx, vy] of [[18, 0], [-18, 0], [14, 10], [-14, 10]]) {
            c.spawnProjectile({ pos: [...c.caster.pos], vel: [vx, vy, 0], radius: 0.65, ttlMs: 1200, color: '#fde047', pierce: true })
          }
        } else {
          const model = KIT_SUMMONS[p]
          if (model) c.fx({ kind: 'summon', model, pos: at(c, 0.8, 1.4), color: k.ult.color, ttl: 1200, size: 1.45, dir: c.forward[0] })
        }
        c.fx({ kind: 'ring', pos: [...c.caster.pos], color: k.ult.color, ttl: 480, radius: 4.6, plane: 'vertical' })
        c.fx({ kind: 'pillar', pos: [...c.caster.pos], color: k.ult.color, ttl: 520, radius: 2.4 })
        c.fx({ kind: 'burst', pos: [...c.caster.pos], color: k.ult.color, ttl: 680, count: 60, speed: 12, size: 0.24 })
        c.shake(1.2)
      },
      onEnd(c) { c.setGravityScale(1) },
    },
  })
}

const KITS: KitSpec[] = [
  {
    p: 'chihiro', color: '#ef4444', a1: '淵天抜刀斬', a2: '千紘居合斬',
    tilts: ['黑金魚橫閃', '鯉刃上挑', '水墨下切'],
    s1: { name: '妖刀「黑」金魚斬波', projColor: '#ef4444', pierce: true, speed: 22 },
    side: '妖刀「錦」極速突進', up: '涅・昇龍斬空', down: '淵天・水墨震斬',
    s2: { name: '赤金魚吸收反擊環', kind: 'ring', color: '#ef4444' },
    smashes: ['深淵黑閃重劈', '千紘破曉上斬', '金魚旋渦斬'],
    ult: { name: '妖刀「淵天」黑・錦・涅 三連奧義！', kind: 'omnislash', color: '#ef4444' },
  },
  {
    p: 'ichi', color: '#38bdf8', a1: '魔男獵刀斬', a2: '野性雙連劈',
    tilts: ['獵刀橫揮', '雷狐電弧挑擊', '冰晶下掃'],
    s1: { name: '雷狐之魔法「電光雷鳴」（可操控）', projColor: '#facc15', pierce: true, speed: 18, steerable: 4.8 },
    side: '冰鯊之魔法「冰牙突襲」', up: '蛛絲之魔法「獵場飛躍」', down: '菌菇之魔法「巨菇壓頂」',
    s2: { name: '夢貘之魔法「夢境吞噬領域」', kind: 'zone', color: '#a855f7' },
    smashes: ['魔男真紅斬', '凍結鯊牙衝', '大狩獵震地'],
    ult: { name: '全收服魔法「雷狐×冰鯊×夢貘×烏洛洛」！', kind: 'burst', color: '#60a5fa' },
  },
  {
    p: 'ruri', color: '#34d399', a1: '龍角衝撞', a2: '小龍炎爪擊',
    tilts: ['龍尾橫掃', '閃電角上頂', '噴火下壓'],
    s1: { name: '龍之火炎吐息（可操控）', projColor: '#f97316', explode: 2.0, speed: 15, steerable: 4.2 },
    side: '龍鱗暴衝', up: '龍翼雷電升空', down: '青龍落雷震地',
    s2: { name: '龍角放電＋毒霧領域', kind: 'zone', color: '#a3e635' },
    smashes: ['真龍烈焰噴射', '雷角穿雲頂', '龍吼震波'],
    ult: { name: '覺醒龍神・九霄雷炎吐息！', kind: 'dragonBreath', color: '#f97316' },
  },
  {
    p: 'nona', color: '#e879f9', a1: '魔針刺擊', a2: '銀線雙連切',
    tilts: ['魔針連刺', '絲線挑飛', '縫合下掃'],
    s1: { name: 'Altoare 魔針飛射', projColor: '#e879f9', pierce: true, speed: 22 },
    side: '魔絲牽引高速滑行', up: '魔杖絲線升空', down: '針線十字封印壓',
    s2: { name: '縫紉魔法・絲線束縛陣', kind: 'zone', color: '#e879f9' },
    smashes: ['巨型魔針穿刺', '天羅銀線陣', '縫合空間震'],
    ult: { name: '魔法「Altoare」萬針裁縫大破滅！', kind: 'rain', color: '#f0abfc' },
  },
  {
    p: 'gojo', color: '#818cf8', a1: '咒力正拳', a2: '黑閃連打',
    tilts: ['無下限推擊', '咒力升龍拳', '術式下壓'],
    s1: { name: '術式反轉「赫」（可操控）', projColor: '#ef4444', explode: 2.3, speed: 17, steerable: 4.5 },
    side: '無下限瞬間移動突襲', up: '術式順轉「蒼」浮升', down: '無下限重力壓頂',
    s2: { name: '虛式「茈」貫穿彈', kind: 'proj', color: '#a855f7' },
    smashes: ['極限黑閃重拳', '赫・蒼雙重爆', '領域壓迫衝擊'],
    ult: { name: '領域展開「無量空處」→ 虛式「茈」！', kind: 'hollow', color: '#a855f7' },
  },
  {
    p: 'deku', color: '#22c55e', a1: 'Shoot Style 踢', a2: '全覆蓋二連擊',
    tilts: ['特拉華指彈', '上升飛踢', '黑鞭下掃'],
    s1: { name: 'Air Force 空氣彈', projColor: '#4ade80', speed: 22 },
    side: '全覆蓋・黑鞭突進', up: '浮遊＋發勁升空', down: '曼徹斯特重踏！',
    s2: { name: '底特律粉碎震波', kind: 'ring', color: '#22c55e' },
    smashes: ['100% 底特律粉碎', '聖路易斯上踢', '斯麥修震地'],
    ult: { name: 'ONE FOR ALL 100%「聯合王國粉碎」！', kind: 'burst', color: '#4ade80' },
  },
  {
    p: 'yodaka', color: '#64748b', a1: '無血統體術連擊', a2: '夜鷹瞬身肘擊',
    tilts: ['手裡劍近斬', '忍刀上挑', '影縫下掃'],
    s1: { name: '高速手裡劍', projColor: '#cbd5e1', speed: 24 },
    side: '夜鷹疾影暗殺步', up: '忍法・屋簷躍空', down: '空中苦無急襲',
    s2: { name: '煙霧忍者突襲環', kind: 'ring', color: '#94a3b8' },
    smashes: ['一擊必殺拳', '夜鷹穿雲踢', '忍道重壓'],
    ult: { name: '九號通訊輔助「神速・無音全滅」！', kind: 'rush', color: '#38bdf8' },
  },
  {
    p: 'saki', color: '#f43f5e', a1: '偶像應援揮棒', a2: '咲季全力高踢',
    tilts: ['星光橫掃', '元氣上跳擊', '節奏下踏'],
    s1: { name: 'Starlight 應援星彈', projColor: '#f43f5e', speed: 19 },
    side: '初星學園全力衝刺', up: '舞台高音飛躍', down: 'Encore 安可重踏',
    s2: { name: '閃耀舞台應援區', kind: 'zone', color: '#fb7185' },
    smashes: ['王牌偶像重拍', '星光閃耀上鉤', '高潮舞台震'],
    ult: { name: '初星學園 LIVE「Fighting My Way」！', kind: 'rain', color: '#f43f5e' },
  },
  {
    p: 'spe', color: '#c084fc', a1: '特雷森疾踢', a2: '總大將雙連踏',
    tilts: ['草地衝刺撞', '凱旋躍頂', '蹄鐵下掃'],
    s1: { name: '特製紅蘿蔔飛彈', projColor: '#fb923c', explode: 1.9, speed: 18 },
    side: '終盤「末腳」超加速！', up: '天馬跨欄大跳躍', down: '重蹄踩踏衝擊',
    s2: { name: '日本總大將氣勢震波', kind: 'ring', color: '#c084fc' },
    smashes: ['有馬紀念衝刺撞', 'ダービー沖天踢', '草皮大震踏'],
    ult: { name: '固有技能「シューティングスター」衝線！', kind: 'rush', color: '#f472b6' },
  },
  {
    p: 'kaoruko', color: '#f9a8d4', a1: '甜點叉輕擊', a2: '桔梗優雅旋轉',
    tilts: ['花瓣橫拂', '提袋上揮', '裙擺下掃'],
    s1: { name: '愛心草莓蛋糕彈', projColor: '#f472b6', explode: 2.0, speed: 16 },
    side: '花朵凛然綻放衝刺', up: '花瓣舞空跳躍', down: '甜蜜禮盒壓頂',
    s2: { name: '暖心治癒花香結界', kind: 'zone', color: '#f9a8d4' },
    smashes: ['草莓蛋糕全壘打', '凛然綻放升龍', '甜點派對震'],
    ult: { name: '「薰香花朵凛然綻放」千朵櫻雨！', kind: 'rain', color: '#f9a8d4' },
  },
  {
    p: 'stelle', color: '#94a3b8', a1: '銀河球棒橫揮', a2: '規則就是用來打破的！',
    tilts: ['球棒連打', '炎槍上挑', '存護下掃'],
    s1: { name: '存護・炎槍穿刺炮', projColor: '#f97316', pierce: true, speed: 22 },
    side: '開拓者極速衝棒', up: '同諧禮帽躍升', down: '流星全壘打重砸',
    s2: { name: '炎之存護護盾爆發', kind: 'ring', color: '#f97316' },
    smashes: ['星核全壘打！', '炎槍熾熱上挑', '裂界重力砸'],
    ult: { name: '星穹列車「Star Rail 全速撞擊」！', kind: 'train', color: '#facc15' },
  },
  {
    p: 'lumine', color: '#fde047', a1: '異邦劍連斬', a2: '星辰重擊',
    tilts: ['風刃橫斬', '岩劍上挑', '雷閃下切'],
    s1: { name: '風渦劍氣彈', projColor: '#34d399', speed: 20 },
    side: '雷極瞬閃突進', up: '風場上升氣流！', down: '荒星墜落重砸',
    s2: { name: '草元素超綻放領域', kind: 'zone', color: '#4ade80' },
    smashes: ['七元素共鳴斬', '荒星沖天破', '千岩震地'],
    ult: { name: '元素爆發「星命定數・萬星墜落」！', kind: 'rain', color: '#fde047' },
  },
  {
    p: 'miyabi', color: '#22d3ee', a1: '無尾居合連斬', a2: '霜月三段拔刀',
    tilts: ['寒霜橫斬', '對空居合', '冰焰下切'],
    s1: { name: '冰焰妖狐斬波', projColor: '#22d3ee', pierce: true, speed: 24 },
    side: '六課課長・極速納刀閃', up: '霜月飛燕升空', down: '冰裂斬地',
    s2: { name: '霜落星見結界爆', kind: 'ring', color: '#22d3ee' },
    smashes: ['霜月三段蓄力斬', '狐火沖天拔刀', '絕對零度震'],
    ult: { name: '終結技「殘雪・星見流萬斬」！', kind: 'omnislash', color: '#38bdf8' },
  },
  {
    p: 'rover', color: '#facc15', a1: '衍射迅刀斬', a2: '共鳴解放連擊',
    tilts: ['長刃橫掃', '聲骸上挑', '闇滅下劈'],
    s1: { name: '衍射光刃射擊', projColor: '#facc15', pierce: true, speed: 23 },
    side: '鉤索極速突襲', up: '聲骸振翅升空', down: '時滯領域重砸',
    s2: { name: '鳴潮聲骸共鳴環', kind: 'ring', color: '#facc15' },
    smashes: ['闇滅重劍破', '光翼升天斬', '歲主共振震'],
    ult: { name: '共鳴解放「萬象歸一・時停光刃」！', kind: 'timestop', color: '#fde047' },
  },
  {
    p: 'rapi', color: '#ef4444', a1: '戰術步槍點射', a2: '強化榴彈槍托擊',
    tilts: ['穿甲三連發', '對空掃射', '戰術滑鏟射'],
    s1: { name: '妮姬戰術手榴彈', projColor: '#ef4444', explode: 2.2, speed: 17 },
    side: '反擊部隊戰術突進', up: '噴射背包戰術升空', down: '空投高爆集束雷',
    s2: { name: '高爆爆裂導彈', kind: 'proj', color: '#f97316' },
    smashes: ['Red Hood 核心穿射', '對空爆裂榴彈', '地雷陣引爆'],
    ult: { name: '爆裂階段 III「Red Hood 全彈發射」！', kind: 'barrage', color: '#ef4444' },
  },
  {
    p: 'akira', color: '#f472b6', a1: '作戰筆記輕拍', a2: '慌張書包揮擊',
    tilts: ['害羞小手推', '緊張舉手頂', '跌倒絆腳掃'],
    s1: { name: '初戀作戰筆記飛射', projColor: '#f472b6', explode: 1.9, speed: 17 },
    side: '「計畫通」全力衝刺', up: '緊張跳躍失誤升空', down: '笨拙滑倒震地',
    s2: { name: '初戀心動粉紅結界', kind: 'zone', color: '#f472b6' },
    smashes: ['超直球告白撞', '破綻百出上鉤', '書包全壘打震'],
    ult: { name: '「完璧的結婚作戰！」初戀粉紅雨！', kind: 'rain', color: '#f472b6' },
  },
  {
    p: 'kotone', color: '#facc15', a1: '麥克風元氣揮擊', a2: '世界一可愛轉身踢',
    tilts: ['金幣閃耀掃', '雙馬尾甩擊', '打工托盤下壓'],
    s1: { name: 'Yellow Big Bang! 星光彈', projColor: '#facc15', explode: 2.0, speed: 19 },
    side: '打工衝刺・全速趕場！', up: '偶像飛躍高音跳', down: '閃耀金幣墜地衝',
    s2: { name: '黃色大爆炸應援區', kind: 'zone', color: '#facc15' },
    smashes: ['世界第一可愛重擊！', '黃金麥克風上鉤', '大豐收震地拍'],
    ult: { name: '「世界第一可愛的我！」黃金星雨 LIVE！', kind: 'rain', color: '#fde047' },
  },
  {
    p: 'hutao', color: '#ef4444', a1: '往生堂秘傳槍法', a2: '蝶引來生火炎掃',
    tilts: ['護摩橫掃', '火蝶上挑', '幽靈下刺'],
    s1: { name: '胡桃鬼火彈（Boo Tao）', projColor: '#f97316', explode: 2.1, speed: 18 },
    side: '血梅香・火蝶高速突刺', up: '蝶舞幽冥升空', down: '護摩之杖重砸',
    s2: { name: '彼岸蝶舞・燃燒結界', kind: 'ring', color: '#ef4444' },
    smashes: ['護摩之杖破軍槍', '炎蝶沖天挑', '往生堂鎮魂震'],
    ult: { name: '元素爆發「安神秘法・巨型鬼火」！', kind: 'ghostSpin', color: '#ef4444' },
  },
  {
    p: 'seija', color: '#e11d48', a1: '逆轉扇擊', a2: '天邪鬼雙連踢',
    tilts: ['逆針橫掃', '天邪鬼上挑', '反轉下掃'],
    s1: { name: '逆符「鏡之國的彈幕」（可操控）', projColor: '#e11d48', pierce: true, speed: 19, steerable: 4.8 },
    side: '欺符「逆針擊」反向背刺', up: '逆弓「天壤夢弓」升空', down: '逆符「天下轉覆」反轉結界',
    s2: { name: '逆符「邪惡的結晶」反轉力場', kind: 'zone', color: '#e11d48' },
    smashes: ['天地逆轉重擊', '萬象反轉上鉤', '天下轉覆震地'],
    ult: { name: '逆符「Reverse Hierarchy・天地逆轉」！', kind: 'barrage', color: '#e11d48' },
  },
  {
    p: 'youmu', color: '#34d399', a1: '樓觀劍斬', a2: '白樓劍二刀流',
    tilts: ['樓觀橫閃', '白樓上挑', '半靈下切'],
    s1: { name: '幽鬼劍「妖童餓鬼之斷」', projColor: '#34d399', pierce: true, speed: 24 },
    side: '冥想斬「魂魄瞬閃」', up: '人界劍「悟入幻想」昇龍', down: '獄界劍「二百由旬之一閃」',
    s2: { name: '半靈守護斬環', kind: 'ring', color: '#34d399' },
    smashes: ['樓觀劍・斷鋼斬', '白樓劍沖天破', '半人半靈震地'],
    ult: { name: '人鬼「未來永劫斬」！', kind: 'omnislash', color: '#34d399' },
  },
  {
    p: 'luigi', color: '#22c55e', a1: '綠帽直拳', a2: '高跳上踢',
    tilts: ['側踢', '上鉤拳', '下蹲滑踢'],
    s1: { name: '綠色無重力火球', projColor: '#22c55e', speed: 18 },
    side: '綠箭頭槌蓄力衝！', up: '超級跳躍升空拳', down: '路易吉龍捲風',
    s2: { name: '鬼屋吸塵器「Poltergust」爆發', kind: 'ring', color: '#22c55e' },
    smashes: ['必殺綠火掌', '昇龍頭槌', '地板重踏'],
    ult: { name: '鬼屋吸塵器「大掃除暴走」！', kind: 'burst', color: '#22c55e' },
  },
  {
    p: 'blinky', color: '#ef4444', a1: '幽靈抓擊', a2: '赤影連咬',
    tilts: ['迷宮橫掃', '驚嚇上撲', '暗影下切'],
    s1: { name: '追擊紅鬼火彈', projColor: '#ef4444', explode: 2.0, speed: 17, steerable: 4.0 },
    side: '穿牆鬼步突襲', up: '幽靈飄浮傳送', down: '驚嚇反轉衝擊',
    s2: { name: '迷宮鬼影封鎖陣', kind: 'zone', color: '#ef4444' },
    smashes: ['紅幽靈狂暴咬', '天降驚嚇', '迷宮震動'],
    ult: { name: '四色幽靈「全面圍剿」大暴衝！', kind: 'rush', color: '#ef4444' },
  },
  {
    p: 'diddy', color: '#dc2626', a1: '猴爪連打', a2: '長尾鞭擊',
    tilts: ['尾鞭橫掃', '倒立上踢', '滑稽下掃'],
    s1: { name: '花生手槍（Peanut Popgun）', projColor: '#fbbf24', explode: 1.8, speed: 20 },
    side: '猴子翻滾飛撲', up: '噴射木桶背包', down: '香蕉皮爆彈陷阱',
    s2: { name: '叢林花生連發砲', kind: 'proj', color: '#f59e0b' },
    smashes: ['重拳連拍', '木桶上頂', '叢林震地'],
    ult: { name: '「Rocketbarrel Barrage」噴射木桶轟炸！', kind: 'barrage', color: '#dc2626' },
  },
  {
    p: 'creeper', color: '#4ade80', a1: '綠怪撞擊', a2: '嘶嘶前撲',
    tilts: ['方塊頭槌', '驚跳上頂', '四足下掃'],
    s1: { name: '火藥 TNT 拋射', projColor: '#ef4444', explode: 2.4, speed: 15 },
    side: '嘶嘶衝刺爆破', up: '爆炸氣浪反衝升空', down: '高壓引信定時雷',
    s2: { name: '苦力怕高壓自爆環！', kind: 'ring', color: '#4ade80' },
    smashes: ['高壓雷電炸', '沖天爆破', '地裂炸彈'],
    ult: { name: '閃電高壓苦力怕「大毀滅」！', kind: 'burst', color: '#38bdf8' },
  },
  {
    p: 'chuck', color: '#facc15', a1: '尖嘴連啄', a2: '音速回旋撞',
    tilts: ['黃風橫掃', '銳角上挑', '俯衝下切'],
    s1: { name: '三角羽毛飛鏢', projColor: '#facc15', pierce: true, speed: 26 },
    side: '音速點擊加速衝！', up: '極速斜上衝刺', down: '垂直俯衝砸擊',
    s2: { name: '黃鳥狂風衝擊波', kind: 'ring', color: '#facc15' },
    smashes: ['音速重撞', '破空升龍', '流星墜地'],
    ult: { name: '「Turbo Boost」全場音速大連撞！', kind: 'rush', color: '#facc15' },
  },
  {
    p: 'suzuka', color: '#22c55e', a1: '翡翠疾踢', a2: '領跑雙連踏',
    tilts: ['草地疾風掃', '輕盈上躍踢', '蹄鐵下踏'],
    s1: { name: '綠色疾風氣浪', projColor: '#22c55e', pierce: true, speed: 23 },
    side: '異次元「大逃げ」加速！', up: '翡翠飛躍跨欄', down: '疾風踩踏衝擊',
    s2: { name: '先頭領跑氣流環', kind: 'ring', color: '#22c55e' },
    smashes: ['天皇賞全速撞', '天馬沖天踢', '草地大震'],
    ult: { name: '固有技能「先頭的景色」大逃げ衝線！', kind: 'rush', color: '#22c55e' },
  },
  {
    p: 'firefly', color: '#f97316', a1: '薩姆炎拳', a2: '完全燃燒雙刃',
    tilts: ['焦土橫斬', '火翼上挑', '熔岩下砸'],
    s1: { name: '死星過載・炎刃波', projColor: '#f97316', pierce: true, speed: 22 },
    side: 'Ⅳ型裝甲・噴射突進', up: '火螢飛翼升空', down: '焦土作戰震地',
    s2: { name: '燃燒裝甲爆裂環', kind: 'ring', color: '#f97316' },
    smashes: ['薩姆焚天劈', '炎翼升龍', '隕石墜擊'],
    ult: { name: '「火螢Ⅳ型・完全燃燒」星海連斬！', kind: 'omnislash', color: '#f97316' },
  },
  {
    p: 'ellen', color: '#ef4444', a1: '巨剪橫切', a2: '冷酷鯊尾連擊',
    tilts: ['冰霜剪擊', '上挑剪刃', '鯊尾下掃'],
    s1: { name: '急凍寒霜斬波', projColor: '#38bdf8', pierce: true, speed: 22 },
    side: '「巡游」高速閃襲', up: '鯊魚躍浪升空', down: '冰霜巨剪重砸',
    s2: { name: '急凍鯊捲風結界', kind: 'ring', color: '#38bdf8' },
    smashes: ['冰剪斷鋼', '鯊牙沖天', '寒霜震地'],
    ult: { name: '終結技「無盡寒冬・鯊捲風」！', kind: 'omnislash', color: '#38bdf8' },
  },
  {
    p: 'jinhsi', color: '#fde047', a1: '長刃光斬', a2: '歲主共鳴連打',
    tilts: ['龍鱗橫閃', '飛龍上挑', '天光下切'],
    s1: { name: '歲主「角」龍息光彈', projColor: '#fde047', explode: 2.2, speed: 19 },
    side: '浮空龍影突襲', up: '驚蟄龍吟升空', down: '韶光天降震擊',
    s2: { name: '今州歲主結界領域', kind: 'zone', color: '#fde047' },
    smashes: ['龍神破曉斬', '飛龍沖天', '天光墜地'],
    ult: { name: '共鳴解放「移天換日・歲主降臨」！', kind: 'rain', color: '#fde047' },
  },
  {
    p: 'anis', color: '#fb923c', a1: '榴彈槍托擊', a2: '元氣高踢',
    tilts: ['散彈橫掃', '對空榴彈', '滑鏟射擊'],
    s1: { name: '蘇打高爆榴彈', projColor: '#fb923c', explode: 2.2, speed: 17 },
    side: '反擊部隊突進射擊', up: '爆風反衝躍升', down: '蘇打地雷陣',
    s2: { name: '雙發高爆榴彈齊射', kind: 'proj', color: '#f59e0b' },
    smashes: ['超重砲擊', '對空爆裂', '地雷引爆'],
    ult: { name: '爆裂階段 III「全面蘇打轟炸」！', kind: 'barrage', color: '#fb923c' },
  },
  {
    p: 'erika', color: '#818cf8', a1: '皇家迅劍斬', a2: '女僕二連刺',
    tilts: ['銀劍橫閃', '上挑劍舞', '護衛下切'],
    s1: { name: '疾馳劍氣飛刃', projColor: '#818cf8', pierce: true, speed: 23 },
    side: '潛行暗殺瞬步斬', up: '皇家飛燕升空', down: '絕對護衛反擊斬',
    s2: { name: '皇家護衛劍陣環', kind: 'ring', color: '#818cf8' },
    smashes: ['進化疾馳重斬', '銀劍沖天', '護衛震地'],
    ult: { name: '「秘密的護衛」皇家亂舞千斬！', kind: 'omnislash', color: '#818cf8' },
  },
  {
    p: 'vaus', color: '#38bdf8', a1: '磁力能量撞', a2: '雙管雷射掃',
    tilts: ['寬幅橫推', '折射上擊', '電磁下掃'],
    s1: { name: 'Energy Ball 能量球', projColor: '#38bdf8', pierce: true, speed: 22 },
    side: '戰機高速側移射擊', up: '推進器垂直升空', down: '重力磁場壓制',
    s2: { name: '雙管紅藍雷射齊射', kind: 'proj', color: '#ef4444' },
    smashes: ['破磚重砲', '雷射沖天', '空間裂隙震'],
    ult: { name: '「Breakout」全屏能量球大暴走！', kind: 'barrage', color: '#38bdf8' },
  },
]

for (const k of KITS) registerKit(k)
for (const p of PARTNERS) registerKit({ p: p.id, color: p.color, ...p.kit })
