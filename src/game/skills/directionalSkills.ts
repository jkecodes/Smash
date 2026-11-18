import { registerSkill } from './registry'
import type { SkillContext, SkillDef } from '../types'

/**
 * 方向招式：普攻 / 特招(skill1) 各有 原地(n)、左右(side，左右共用)、上(up)、下(down) 四種。
 * 載入方式見 characters.ts：  'attack:side' / 'attack:up' / 'attack:down' / 'skill1:side' / 'skill1:up' / 'skill1:down'
 */
type P3 = [number, number, number]
const yawOf = (c: SkillContext) => Math.atan2(c.forward[0], c.forward[2])
const at = (c: SkillContext, y: number, fwd: number): P3 => {
  const w = c.toWorld([0, y, fwd])
  return [c.caster.pos[0] + w[0], c.caster.pos[1] + w[1], 0]
}
function trail(c: SkillContext, ms: number, color: string, ttl = 260) {
  c.scratch.tr = (c.scratch.tr ?? 0) - c.dt * 1000
  if (c.scratch.tr <= 0) { c.scratch.tr = ms; c.fx({ kind: 'afterimage', pos: [...c.caster.pos], yaw: yawOf(c), color, ttl }) }
}
const slash = (c: SkillContext, color: string, o: { d?: number; y?: number; r?: number; tilt?: number; flip?: boolean; ttl?: number } = {}) =>
  c.fx({ kind: 'slash', pos: at(c, o.y ?? 0.1, o.d ?? 0.9), yaw: yawOf(c), plane: 'horizontal', tilt: o.tilt ?? 0.25, flip: o.flip, color, ttl: o.ttl ?? 230, radius: o.r ?? 1.6 })
const reg = (d: SkillDef) => registerSkill(d)

// ---------------------------------------------------------------------
//  普攻方向招（前 / 上 / 下 tilt）：近戰型與遠程型兩種模板
// ---------------------------------------------------------------------
interface TiltOpts {
  color: string
  names: [string, string, string] // 前 / 上 / 下
  dmg?: number
  /** 遠程型：改以投射物攻擊 */
  ranged?: boolean
}
export function registerTilts(p: string, o: TiltOpts) {
  const dmg = o.dmg ?? 6
  const [nf, nu, nd] = o.names
  if (!o.ranged) {
    reg({ // 前：突進斬，距離長（地面可長按蓄力）
      id: `${p}.fTilt`, name: nf, energyCost: 0, startupMs: 120, activeMs: 110, recoveryMs: 270,
      charge: { maxMs: 700, damageMult: [1, 2.1], knockbackMult: [1, 1.85] },
      hitbox: { offset: [0, 0.1, 1.4], radius: 1.1 }, damage: dmg * 1.3,
      knockback: { dir: [0, 0.25, 1], base: 8, scaling: 10 },
      hooks: {
        onStart(c) { if (!c.caster.grounded && c.caster.skill) c.caster.skill.released = true },
        onActive(c) {
          c.setLocalVelocity(0, null, 7 + c.chargeRatio * 5)
          c.shake(0.12 + c.chargeRatio * 0.22)
          slash(c, o.color, { d: 1.2, r: 1.9 + c.chargeRatio * 0.45, tilt: 0.15 })
          if (c.chargeRatio > 0.35) c.fx({ kind: 'ring', pos: at(c, 0.1, 1.0), color: o.color, ttl: 260, radius: 1.6, plane: 'vertical' })
        },
        onTick(c) { if (c.phase === 'active') trail(c, 50, o.color) },
      },
    })
    reg({ // 上：對空揮擊（地面可長按蓄力）
      id: `${p}.uTilt`, name: nu, energyCost: 0, startupMs: 90, activeMs: 120, recoveryMs: 260,
      charge: { maxMs: 700, damageMult: [1, 2.1], knockbackMult: [1, 1.85] },
      hitbox: { offset: [0, 1.15, 0.2], radius: 1.2 }, damage: dmg,
      knockback: { dir: [0, 1, 0.1], base: 9, scaling: 11 },
      hooks: {
        onStart(c) { if (!c.caster.grounded && c.caster.skill) c.caster.skill.released = true },
        onActive(c) {
          c.shake(0.1 + c.chargeRatio * 0.22)
          slash(c, o.color, { y: 1.0, d: 0.3, r: 1.7 + c.chargeRatio * 0.45, tilt: Math.PI / 4 })
          if (c.chargeRatio > 0.35) c.fx({ kind: 'ring', pos: at(c, 1.0, 0.2), color: o.color, ttl: 260, radius: 1.6 })
        },
      },
    })
    reg({ // 下：貼地掃踢，絆倒向上彈
      id: `${p}.dTilt`, name: nd, energyCost: 0, startupMs: 80, activeMs: 100, recoveryMs: 230,
      hitbox: { offset: [0, -0.35, 1.25], radius: 0.95 }, damage: dmg * 0.85,
      knockback: { dir: [0, 0.7, 0.6], base: 6, scaling: 8, hitstunMs: 320 },
      hooks: { onActive(c) { slash(c, o.color, { y: -0.4, d: 1.0, r: 1.5, tilt: -0.1, flip: true }) } },
    })
  } else {
    const shoot = (c: SkillContext, vx: number, vy: number, r: number, color: string, y = 0.15) =>
      c.spawnProjectile({ pos: at(c, y, 0.9), vel: [c.forward[0] * vx, vy, 0], radius: r, ttlMs: 900, color })
    reg({ // 前：重型單發（地面可長按蓄力）
      id: `${p}.fTilt`, name: nf, energyCost: 0, startupMs: 150, activeMs: 40, recoveryMs: 300, damage: dmg * 1.2,
      charge: { maxMs: 700, damageMult: [1, 2.0], knockbackMult: [1, 1.8] },
      knockback: { dir: [0, 0.2, 1], base: 8, scaling: 10 },
      hooks: {
        onStart(c) { if (!c.caster.grounded && c.caster.skill) c.caster.skill.released = true },
        onActive(c) { shoot(c, 22 + c.chargeRatio * 6, 0, 0.5 + c.chargeRatio * 0.25, o.color); c.shake(0.12 + c.chargeRatio * 0.2); c.setLocalVelocity(-2.5, null, -2.5) },
      },
    })
    reg({ // 上：朝斜上方射擊（地面可長按蓄力）
      id: `${p}.uTilt`, name: nu, energyCost: 0, startupMs: 100, activeMs: 40, recoveryMs: 260, damage: dmg,
      charge: { maxMs: 700, damageMult: [1, 2.0], knockbackMult: [1, 1.8] },
      knockback: { dir: [0, 1, 0.2], base: 8, scaling: 10 },
      hooks: {
        onStart(c) { if (!c.caster.grounded && c.caster.skill) c.caster.skill.released = true },
        onActive(c) { shoot(c, 8, 20 + c.chargeRatio * 5, 0.35 + c.chargeRatio * 0.2, o.color, 0.6) },
      },
    })
    reg({ // 下：貼地低射
      id: `${p}.dTilt`, name: nd, energyCost: 0, startupMs: 90, activeMs: 40, recoveryMs: 230, damage: dmg * 0.8,
      knockback: { dir: [0, 0.7, 0.6], base: 6, scaling: 8, hitstunMs: 300 },
      hooks: { onActive(c) { shoot(c, 20, -3, 0.3, o.color, -0.3) } },
    })
  }
}

// ---------------------------------------------------------------------
//  特招：左右（衝刺系）模板
// ---------------------------------------------------------------------
function dashSide(id: string, name: string, color: string, o: { speed: number; dmg: number; base: number; scaling: number; cd: number; lift?: number }): SkillDef {
  return {
    id, name, energyCost: 0, cooldownMs: o.cd, startupMs: 130, activeMs: 280, recoveryMs: 320,
    hitbox: { offset: [0, 0, 0.95], radius: 1.0 }, damage: o.dmg,
    knockback: { dir: [0, o.lift ?? 0.4, 1], base: o.base, scaling: o.scaling },
    hooks: { onActive(c) { c.shake(0.15) }, onTick(c) { if (c.phase === 'active') { c.setLocalVelocity(0, 0, o.speed); trail(c, 45, color) } } },
  }
}
/** 特招：下（俯衝砸地系）模板——空中時急速下砸，擊飛方向朝外下（可當 spike） */
function slamDown(id: string, name: string, color: string, o: { dmg: number; base: number; scaling: number; cd: number }): SkillDef {
  return {
    id, name, energyCost: 0, cooldownMs: o.cd, startupMs: 120, activeMs: 420, recoveryMs: 340,
    hitbox: { offset: [0, -0.65, 0.25], radius: 1.15 }, damage: o.dmg,
    knockback: { dir: [0, -0.5, 0.8], base: o.base, scaling: o.scaling },
    hooks: {
      onStart(c) { c.setVelocity(0, c.caster.grounded ? 5 : 0, 0) },
      onTick(c) {
        if (c.phase !== 'active') return
        c.setLocalVelocity(0, -26, 2)
        trail(c, 40, color)
        if (c.isGrounded() && c.phaseMs > 60) { // 落地：小衝擊波後結束判定
          c.fx({ kind: 'ring', pos: [c.caster.pos[0], 0.05, 0], color, ttl: 350, radius: 1.8 })
          c.fx({ kind: 'burst', pos: [c.caster.pos[0], 0.1, 0], color, ttl: 400, count: 16, speed: 6, size: 0.18 })
          c.shake(0.35)
          c.endActive()
        }
      },
    },
  }
}

// =====================================================================
//  CUBE
// =====================================================================
reg({
  id: 'cube.jab', name: '直拳', energyCost: 0, startupMs: 75, activeMs: 80, recoveryMs: 150,
  hitbox: { offset: [0, 0, 0.95], radius: 0.85 }, damage: 3,
  knockback: { dir: [0, 0.15, 1], base: 3.5, scaling: 4, hitstunMs: 260 },
  chain: 'cube.jab2',
  hooks: {
    onActive(c) { c.setLocalVelocity(0, null, 3); slash(c, '#ff9a9a', { r: 1.2 }) },
    onHit(c) { c.caster.energy = Math.min(100, c.caster.energy + 5) },
  },
})
reg({
  id: 'cube.jab2', name: '勾拳', energyCost: 0, startupMs: 80, activeMs: 85, recoveryMs: 170,
  hitbox: { offset: [0, 0.1, 1.0], radius: 0.9 }, damage: 4,
  knockback: { dir: [0, 0.25, 1], base: 4, scaling: 5, hitstunMs: 280 },
  chain: 'cube.jab3',
  hooks: {
    onActive(c) { c.setLocalVelocity(0, null, 4); slash(c, '#ffb84d', { r: 1.4, flip: true }) },
    onHit(c) { c.caster.energy = Math.min(100, c.caster.energy + 6) },
  },
})
reg({
  id: 'cube.jab3', name: '爆裂旋風踢', energyCost: 0, startupMs: 95, activeMs: 110, recoveryMs: 280,
  hitbox: { offset: [0, 0.15, 1.15], radius: 1.15 }, damage: 7,
  knockback: { dir: [0, 0.4, 1], base: 10, scaling: 13 },
  hooks: {
    onActive(c) {
      c.setLocalVelocity(0, null, 6)
      c.shake(0.22)
      slash(c, '#ff5d5d', { r: 1.85, tilt: 0.35 })
      c.fx({ kind: 'ring', pos: at(c, 0.1, 1.0), color: '#ffb84d', ttl: 260, radius: 1.4, plane: 'vertical' })
    },
    onHit(c) { c.caster.energy = Math.min(100, c.caster.energy + 10) },
  },
})
registerTilts('cube', { color: '#ff7a7a', names: ['衝拳', '上勾拳', '下掃腿'] })
reg(dashSide('cube.slideKick', '滑鏟踢', '#ff7a7a', { speed: 18, dmg: 7, base: 9, scaling: 13, cd: 1800, lift: 0.5 }))
reg(slamDown('cube.drillDive', '鑽地砸', '#ff9a4d', { dmg: 10, base: 12, scaling: 14, cd: 2200 }))

// =====================================================================
//  NOVA
// =====================================================================
registerTilts('nova', { color: '#5dc8ff', names: ['疾風斬', '升空劈', '下段掃'] })
reg(dashSide('nova.dashSlice', '穿影斬', '#5dc8ff', { speed: 20, dmg: 7, base: 9, scaling: 13, cd: 1800 }))
reg({ // 下：腳下裂隙，從地面向上轟出
  id: 'nova.rift', name: '稜鏡裂隙', energyCost: 0, cooldownMs: 2200, startupMs: 220, activeMs: 140, recoveryMs: 340,
  hitbox: { offset: [0, -0.2, 1.9], radius: 1.5 }, damage: 8,
  knockback: { dir: [0, 1, 0.1], base: 13, scaling: 14 },
  hooks: {
    onActive(c) {
      const p = at(c, -0.45, 1.9); p[1] = Math.max(0, p[1])
      c.fx({ kind: 'ring', pos: p, color: '#5dc8ff', ttl: 400, radius: 1.8 })
      c.fx({ kind: 'pillar', pos: p, color: '#5dc8ff', ttl: 450, radius: 1.1 })
      c.fx({ kind: 'burst', pos: p, color: '#ffffff', ttl: 500, count: 24, speed: 8, size: 0.18 })
      c.shake(0.3)
    },
  },
})

// =====================================================================
//  KNIGHT
// =====================================================================
registerTilts('knight', { color: '#d7e0ee', names: ['橫掃', '挑劍', '下刺'], dmg: 7 })
reg({ // 原地特招「聖盾防反」：舉盾期間具備無敵霸體，並以聖光重盾猛擊震飛敵人
  id: 'knight.shieldSmash', name: '聖盾防反', energyCost: 0, cooldownMs: 1800, startupMs: 140, activeMs: 130, recoveryMs: 320,
  hitbox: { offset: [0, 0, 1.05], radius: 1.2 }, damage: 8.5,
  knockback: { dir: [0, 0.25, 1], base: 15, scaling: 13 },
  hooks: {
    onStart(c) {
      c.setInvulnerable(240)
      c.fx({ kind: 'ring', pos: [...c.caster.pos], color: '#ffe48a', ttl: 260, radius: 1.2, plane: 'vertical' })
    },
    onActive(c) {
      c.shake(0.35)
      c.setLocalVelocity(0, null, 5)
      c.fx({ kind: 'ring', pos: at(c, 0, 1.0), color: '#ffe48a', ttl: 320, radius: 1.5, plane: 'vertical' })
      c.fx({ kind: 'burst', pos: at(c, 0, 1.0), color: '#ffffff', ttl: 300, count: 14, speed: 6, size: 0.16 })
    },
  },
})
reg({ // 下：劍插地，周身震波
  id: 'knight.groundSlam', name: '劍插震地', energyCost: 0, cooldownMs: 2600, startupMs: 280, activeMs: 120, recoveryMs: 420,
  hitbox: { offset: [0, -0.2, 0], radius: 2.7 }, damage: 9,
  knockback: { dir: [0, 0.8, 1], base: 12, scaling: 14, radial: true },
  hooks: {
    onActive(c) {
      const p: P3 = [c.caster.pos[0], Math.max(0, c.caster.pos[1] - 0.45), 0]
      c.fx({ kind: 'ring', pos: p, color: '#ffe48a', ttl: 450, radius: 2.7 })
      c.fx({ kind: 'burst', pos: p, color: '#ffe9a0', ttl: 500, count: 28, speed: 7, size: 0.2 })
      c.shake(0.55)
    },
  },
})

// =====================================================================
//  ROBOT（遠程）
// =====================================================================
registerTilts('robot', { color: '#ffd24d', names: ['重砲', '對空射擊', '低射'], ranged: true })
reg(dashSide('robot.boost', '噴射衝撞', '#ffb04d', { speed: 21, dmg: 8, base: 10, scaling: 13, cd: 2200 }))
reg({ // 下：丟下炸彈，落地即爆
  id: 'robot.mineDrop', name: '落地炸彈', energyCost: 0, cooldownMs: 2200, startupMs: 160, activeMs: 40, recoveryMs: 300, damage: 9,
  knockback: { dir: [0, 0.8, 1], base: 12, scaling: 14, radial: true },
  hooks: { onActive(c) { c.spawnProjectile({ pos: at(c, -0.1, 0.8), vel: [c.forward[0] * 3, 1, 0], radius: 0.35, ttlMs: 1500, color: '#ffb04d', gravity: -30, explodeRadius: 2.1 }) } },
})

// =====================================================================
//  ALIEN
// =====================================================================
registerTilts('alien', { color: '#8aff7a', names: ['電光爪', '升空爪', '低掃爪'] })
reg({ // 左右：短距離閃現斬（朝面向瞬移 3.5m 後出招）
  id: 'alien.blinkSlash', name: '閃現斬', energyCost: 0, cooldownMs: 2200, startupMs: 90, activeMs: 150, recoveryMs: 280,
  hitbox: { offset: [0, 0, 0.9], radius: 1.0 }, damage: 7,
  knockback: { dir: [0, 0.3, 1], base: 9, scaling: 11 },
  hooks: {
    onActive(c) {
      const me = c.caster
      for (let i = 0; i < 3; i++) c.fx({ kind: 'afterimage', pos: [me.pos[0] + c.forward[0] * i * 0.9, me.pos[1], 0], yaw: yawOf(c), color: '#8aff7a', ttl: 300 + i * 60 })
      const x = Math.max(-8.8, Math.min(8.8, me.pos[0] + c.forward[0] * 3.5))
      c.teleport([x, me.pos[1], 0]); c.setVelocity(0, 0, 0)
      slash(c, '#d6ffcf', { r: 1.6 })
    },
  },
})
reg(slamDown('alien.gravStomp', '重力下砸', '#b46bff', { dmg: 10, base: 12, scaling: 14, cd: 2200 }))

// =====================================================================
//  SOLDIER（遠程）
// =====================================================================
registerTilts('soldier', { color: '#ffe27a', names: ['重擊槍', '對空槍', '低姿射擊'], ranged: true })
reg({ // 左右：霰彈槍（近距離三發散射）
  id: 'soldier.shotgun', name: '霰彈槍', energyCost: 0, cooldownMs: 2200, startupMs: 170, activeMs: 40, recoveryMs: 380, damage: 4,
  knockback: { dir: [0, 0.3, 1], base: 6, scaling: 8, hitstunMs: 260 },
  hooks: {
    onActive(c) {
      for (const vy of [-4, 0, 4]) c.spawnProjectile({ pos: at(c, 0.1, 0.9), vel: [c.forward[0] * 22, vy, 0], radius: 0.3, ttlMs: 320, color: '#ffd27a' })
      c.fx({ kind: 'burst', pos: at(c, 0.1, 1.0), color: '#ffd27a', ttl: 250, count: 12, speed: 6, size: 0.12 })
      c.setLocalVelocity(-5, null, -5); c.shake(0.2)
    },
  },
})
reg({ // 下：斜下方炸藥包
  id: 'soldier.satchel', name: '炸藥包', energyCost: 0, cooldownMs: 2400, startupMs: 170, activeMs: 40, recoveryMs: 320, damage: 9,
  knockback: { dir: [0, 0.8, 1], base: 12, scaling: 14, radial: true },
  hooks: { onActive(c) { c.spawnProjectile({ pos: at(c, 0, 0.7), vel: [c.forward[0] * 12, -4, 0], radius: 0.35, ttlMs: 1200, color: '#ff9a4d', gravity: -28, explodeRadius: 1.9 }) } },
})

// =====================================================================
//  ZOMBIE
// =====================================================================
registerTilts('zombie', { color: '#7fd67f', names: ['撕扯', '抓臉', '絆腿'] })
reg({ ...dashSide('zombie.lunge', '飛撲', '#7fd67f', { speed: 17, dmg: 8, base: 9, scaling: 13, cd: 2000 }),
  hooks: {
    onTick(c) { if (c.phase === 'active') { c.setLocalVelocity(0, null, 17); trail(c, 55, '#7fd67f') } },
    onHit(c) { c.caster.damage = Math.max(0, c.caster.damage - 2) }, // 吸血
  },
})
reg({ // 下：地底伸手，延遲後從地面抓起
  id: 'zombie.groundHand', name: '地底之手', energyCost: 0, cooldownMs: 2600, startupMs: 380, activeMs: 140, recoveryMs: 320,
  hitbox: { offset: [0, -0.1, 1.8], radius: 1.1 }, damage: 8,
  knockback: { dir: [0, 1, 0.1], base: 12, scaling: 14 },
  hooks: {
    onTick(c) {
      if (c.phase !== 'startup') return
      c.scratch.w = (c.scratch.w ?? 0) - c.dt * 1000
      if (c.scratch.w <= 0) { c.scratch.w = 100; const p = at(c, -0.45, 1.8); p[1] = Math.max(0, p[1]); c.fx({ kind: 'burst', pos: p, color: '#5c8f4a', ttl: 250, count: 6, speed: 2, size: 0.14 }) }
    },
    onActive(c) {
      const p = at(c, -0.45, 1.8); p[1] = Math.max(0, p[1])
      c.fx({ kind: 'pillar', pos: p, color: '#7fd67f', ttl: 400, radius: 0.9 })
      c.fx({ kind: 'burst', pos: p, color: '#b6ff9a', ttl: 500, count: 22, speed: 7, size: 0.18 })
      c.shake(0.25)
    },
  },
})

// ---------------------------------------------------------------------
//  蓄力重擊（普攻 + 特招 同按，按住蓄力、放開出招）：前 / 上 / 下
// ---------------------------------------------------------------------
/** 蓄力重擊一律是近戰招式（含遠程角色，改成近身重擊） */
export function registerSmashes(p: string, o: { color: string; names: [string, string, string]; dmg?: number }) {
  const dmg = o.dmg ?? 11
  const charge = { maxMs: 1000, knockbackMult: [1, 2.1] as [number, number], damageMult: [1, 1.8] as [number, number] }
  const chargeFx = (c: SkillContext) => {
    if (c.phase !== 'startup') return
    c.scratch.cf = (c.scratch.cf ?? 0) - c.dt * 1000
    if (c.scratch.cf <= 0) {
      c.scratch.cf = 110
      c.fx({ kind: 'burst', pos: at(c, 0.3, 0.3), color: o.color, ttl: 260, count: 4 + Math.round(c.chargeRatio * 8), speed: 2.5, size: 0.12 })
    }
  }
  const [nf, nu, nd] = o.names
  {
    reg({
      id: `${p}.fSmash`, name: nf, energyCost: 0, startupMs: 120, activeMs: 140, recoveryMs: 480, charge,
      hitbox: { offset: [0, 0.15, 1.6], radius: 1.35 }, damage: dmg,
      knockback: { dir: [0, 0.35, 1], base: 9, scaling: 13 },
      hooks: {
        onTick: chargeFx,
        onActive(c) { c.setLocalVelocity(0, null, 6); c.shake(0.3 + c.chargeRatio * 0.5); slash(c, c.chargeRatio > 0.9 ? '#ffffff' : o.color, { d: 1.3, r: 2 + c.chargeRatio * 1.0, tilt: 0.4, ttl: 320 }); c.fx({ kind: 'burst', pos: at(c, 0.2, 1.8), color: o.color, ttl: 450, count: 14 + Math.round(c.chargeRatio * 20), speed: 7, size: 0.18 }) },
      },
    })
    reg({
      id: `${p}.uSmash`, name: nu, energyCost: 0, startupMs: 120, activeMs: 150, recoveryMs: 480, charge,
      hitbox: { offset: [0, 1.3, 0.2], radius: 1.5 }, damage: dmg,
      knockback: { dir: [0, 1, 0.1], base: 10, scaling: 13 },
      hooks: {
        onTick: chargeFx,
        onActive(c) { c.shake(0.3 + c.chargeRatio * 0.5); slash(c, c.chargeRatio > 0.9 ? '#ffffff' : o.color, { y: 1.1, d: 0.3, r: 2 + c.chargeRatio * 0.8, tilt: Math.PI / 4, ttl: 320 }); c.fx({ kind: 'burst', pos: at(c, 1.4, 0.2), color: o.color, ttl: 450, count: 18, speed: 7, size: 0.18 }) },
      },
    })
    reg({
      id: `${p}.dSmash`, name: nd, energyCost: 0, startupMs: 120, activeMs: 150, recoveryMs: 480, charge,
      hitbox: { offset: [0, -0.2, 0], radius: 2.3 }, damage: dmg * 0.95,
      knockback: { dir: [0, 0.6, 1], base: 8.5, scaling: 12, radial: true },
      hooks: {
        onTick: chargeFx,
        onActive(c) { const g: P3 = [c.caster.pos[0], Math.max(0, c.caster.pos[1] - 0.45), 0]; c.shake(0.3 + c.chargeRatio * 0.5); c.fx({ kind: 'ring', pos: g, color: o.color, ttl: 400, radius: 2.3 + c.chargeRatio }); c.fx({ kind: 'burst', pos: g, color: o.color, ttl: 450, count: 22, speed: 7, size: 0.18 }) },
      },
    })
  }
}
registerSmashes('cube', { color: '#ff7a7a', names: ['重拳', '升天拳', '震地拳'] })
registerSmashes('nova', { color: '#5dc8ff', names: ['稜鏡重斬', '沖天斬', '環形斬'] })
registerSmashes('knight', { color: '#ffd76a', names: ['裂地重劈', '昇天劍', '旋風斬'], dmg: 13 })
registerSmashes('robot', { color: '#ffb04d', names: ['電磁重拳', '衝天拳', '震地踏'] })
registerSmashes('alien', { color: '#8aff7a', names: ['能量爪', '昇天爪', '重力波'] })
registerSmashes('soldier', { color: '#ffe27a', names: ['槍托重擊', '升空踢擊', '踩踏震擊'] })
registerSmashes('zombie', { color: '#7fd67f', names: ['重撕', '撲天抓', '屍氣爆'] })
