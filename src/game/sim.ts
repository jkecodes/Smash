import { interactionGroups } from '@react-three/rapier'
import { CHARACTERS } from './characters'
import {
  AIR_ACCEL, AIR_SPEED, BLAST, COOLDOWN_SCALE, LEDGE_HANG_MS, LEDGE_REGRAB_MS, LEDGE_X, ENERGY_MAX, ENERGY_REGEN, GRAVITY, GROUND_ACCEL, HALF, JUMP_VEL,
  MAX_DAMAGE, MAX_JUMPS, DROP_THROUGH_MS, PLATFORMS, PLATFORM_THICKNESS, RUN_SPEED, SHIELD_MAX, SPAWN_X, STAGE_HALF,
} from './constants'
import { getPlatformPos, resolveStage } from './stages'
import { resetGimmicks, stepGimmicks } from './gimmicks'
import { broadcastNetEvent, broadcastStateIfHost, netRuntime, sendGuestInput, useNetStore } from './net'
import { cpuInput, resetCpu } from './ai'
import { sfx } from './audio'
import { debugKeys, readInput, rumble, stopAllRumble, type InputFrame } from './input'
import { addFx, addProjectile, addSummon, addZone, removeFx, removeProjectile, removeSummon, removeZone, runtime } from './runtime'
import { getSkill } from './skills'
import { resetTetroBoards } from './skills/tetroSkills'
import { getSteveBlocks, resetSteveBlocks, stepSteveBlocks } from './skills/steveBlocks'
import { consumeSkillMechanic, onMechanicHit, resetMechanics, stepMechanics } from './mechanics'
import { CHAR_ELEMENT, ELEMENT_INFO, STATUS_COLOR, elementChance, statusDuration } from './elements'
import { getActiveFighterIds, useGameStore } from './store'
import type {
  ActiveSkill, FighterId, FighterState, FsmState, HitSource, HitboxDef, SkillContext, SkillDef, SkillSlot, UiFighter, Vec3,
} from './types'
import { ALL_FIGHTER_IDS, PLAYER_COLORS } from './types'

const SLOTS: ('ult' | 'skill2' | 'skill1' | 'attack')[] = ['ult', 'skill2', 'skill1', 'attack'] // 同幀多鍵時的優先順序
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const store = () => useGameStore.getState()
const getStage = () => resolveStage(store().stageId, store().stageForm)

function nearestEnemyOf(id: FighterId): FighterState | null {
  const fs = store().fighters
  const me = fs[id]
  let best: FighterState | null = null
  let bestD = Infinity
  for (const oid of getActiveFighterIds()) {
    if (oid === id) continue
    const e = fs[oid]
    if (!e?.alive) continue
    const d = Math.hypot(e.pos[0] - me.pos[0], e.pos[1] - me.pos[1])
    if (d < bestD) { bestD = d; best = e }
  }
  return best
}

// ---------------------------------------------------------------- FSM
function setFsm(f: FighterState, s: FsmState) {
  if (f.fsm !== s) { f.fsm = s; f.stateMs = 0 }
}
const isAttackState = (s: FsmState) => s === 'ATTACK_STARTUP' || s === 'ATTACK_ACTIVE' || s === 'ATTACK_RECOVERY'

// ---------------------------------------------------------------- physics helpers
const ballCache = new Map<number, any>()
function queryBall(center: Vec3, r: number): FighterId[] {
  const ph = runtime.physics
  if (!ph) return []
  let shape = ballCache.get(r)
  if (!shape) { shape = new ph.rapier.Ball(r); ballCache.set(r, shape) }
  const out: FighterId[] = []
  ph.world.intersectionsWithShape(
    { x: center[0], y: center[1], z: center[2] }, { x: 0, y: 0, z: 0, w: 1 }, shape,
    (col: any) => {
      const h = col.parent()?.handle
      const id = h !== undefined ? runtime.handles.get(h) : undefined
      if (id && !out.includes(id)) out.push(id)
      return true
    },
  )
  if (store().showDebug) runtime.debugSpheres.push({ pos: center, r, ttl: 120 })
  return out
}

/** 推進動態移動層板的剛體位置 */
function stepPlatforms(dt: number) {
  if (useNetStore.getState().role !== 'guest') runtime.stageTime += dt
  getStage().platforms.forEach((p, i) => {
    if (!p.move) return
    const pb = runtime.platformBodies[i]
    if (!pb) return
    const pos = getPlatformPos(p, runtime.stageTime)
    pb.setNextKinematicTranslation({ x: pos.x, y: pos.y - PLATFORM_THICKNESS / 2, z: 0 })
  })
}

/** 穿透式層板：腳在頂面之上且不在上衝時才與該層板碰撞（每片層板各一個碰撞群組） */
const lastMask = new Map<FighterId, number>()
const lastGroups = new Map<FighterId, number[]>()
function updatePlatformCollision(f: FighterState, rb: any, dt: number) {
  const feet = f.pos[1] - HALF
  const prev = lastGroups.get(f.id) ?? []
  const groups = [0]
  if (f.dropMs <= 0 && f.vel[1] <= 1) {
    getStage().platforms.forEach((p, i) => {
      const pos = getPlatformPos(p, runtime.stageTime)
      // 遲滯：已經在碰撞中的層板，腳在頂面下 0.55 內都維持碰撞，避免高速落下或升降時穿過去
      const thr = prev.includes(2 + i) ? pos.y - 0.55 : pos.y - 0.14
      if (feet >= thr) {
        groups.push(2 + i)
        if (p.move && f.grounded && Math.abs(feet - pos.y) < 0.3 && Math.abs(f.pos[0] - pos.x) <= p.w / 2 + 0.4) {
          const nx = f.pos[0] + pos.vx * dt
          const ny = f.pos[1] + pos.vy * dt
          rb.setTranslation({ x: nx, y: ny, z: 0 }, true)
          f.pos = [nx, ny, 0]
        }
      }
    })
    // Steve 放置的方塊頂面碰撞（單向層板）
    const v = rb.linvel()
    if (v.y <= 0.5) {
      for (const b of getSteveBlocks()) {
        const topY = b.y + 0.5
        if (Math.abs(f.pos[0] - b.x) <= 0.68 && feet >= topY - 0.35 && feet <= topY + 0.12) {
          rb.setTranslation({ x: f.pos[0], y: topY + HALF, z: 0 }, true)
          rb.setLinvel({ x: v.x, y: 0, z: 0 }, true)
          f.pos[1] = topY + HALF
          break
        }
      }
    }
  }
  lastGroups.set(f.id, groups)
  const mask = interactionGroups(1, groups)
  if (lastMask.get(f.id) !== mask) { rb.collider(0)?.setCollisionGroups(mask); lastMask.set(f.id, mask) }
}

function checkGround(f: FighterState): boolean {
  const ph = runtime.physics, rb = runtime.bodies[f.id]
  if (!ph || !rb) return false
  if (f.vel[1] > 1.2) return false
  const t = rb.translation()
  const mask = lastMask.get(f.id) ?? interactionGroups(1, [0])
  // 三道向下射線（中、左腳緣、右腳緣）避免高速奔跑或經過層板邊緣時單點漏判
  for (const ox of [0, -0.36, 0.36]) {
    const ray = new ph.rapier.Ray({ x: t.x + ox, y: t.y, z: t.z }, { x: 0, y: -1, z: 0 })
    const hit = ph.world.castRay(ray, HALF + 0.1, true, undefined, mask, undefined, rb)
    if (hit) return true
  }
  if (f.dropMs <= 0) {
    const feet = t.y - HALF
    for (const b of getSteveBlocks()) {
      const topY = b.y + 0.5
      if (Math.abs(t.x - b.x) <= 0.68 && feet >= topY - 0.35 && feet <= topY + 0.14) return true
    }
  }
  return false
}

function facingWorld(f: FighterState, local: Vec3): Vec3 {
  // 2.5D：z 軸鎖定，局部 z=前方(±x)，局部 x(右)忽略
  return [f.facing[0] * local[2], local[1], 0]
}

// ---------------------------------------------------------------- 抓邊
const ledgeOwner: Record<string, FighterId | null> = { '-1': null, '1': null }
const hangPos = (side: number, ledgeX = getStage().ledgeX): [number, number] => [side * (ledgeX + 0.55), -0.5]
function releaseLedge(f: FighterState) {
  if (f.ledgeSide !== 0 && ledgeOwner[String(f.ledgeSide)] === f.id) ledgeOwner[String(f.ledgeSide)] = null
  f.ledgeSide = 0
}

export function resetSimStage() {
  lastMask.clear()
  lastGroups.clear()
  ledgeOwner['-1'] = null
  ledgeOwner['1'] = null
  for (const k of Object.keys(staleQueue)) delete staleQueue[k as FighterId]
  for (const k of Object.keys(grabHold)) delete grabHold[k as FighterId]
  resetTetroBoards()
  resetSteveBlocks()
  resetMechanics()
  resetGimmicks()
}

function tryGrabLedge(f: FighterState, inp: InputFrame): boolean {
  if (getStage().walkOff) return false
  if (f.grounded || f.ledgeCd > 0 || f.vel[1] > 2) return false
  const ledgeX = getStage().ledgeX
  for (const side of [-1, 1] as const) {
    const dx = (f.pos[0] - side * ledgeX) * side // >0 = 在平台外側
    if (dx < -0.4 || dx > 2.3 || f.pos[1] > 0.4 || f.pos[1] < -2.6) continue
    if (inp.moveY < -0.5) continue // 按住「下」= 刻意不抓邊
    const prevId = ledgeOwner[String(side)]
    if (prevId && prevId !== f.id) {
      // 大亂鬥搶邊機制（Ledge Trump）：後抓邊者會把原本懸掛的人擠掉彈飛
      const prev = store().fighters[prevId]
      const prevRb = runtime.bodies[prevId]
      if (prev && prevRb) {
        prev.ledgeSide = 0
        prev.ledgeCd = LEDGE_REGRAB_MS
        prev.invulnMs = 0
        prev.hitstunMs = 340
        prevRb.setGravityScale(1, true)
        prevRb.setLinvel({ x: side * 6.5, y: 5.0, z: 0 }, true)
        setFsm(prev, 'HITSTUN')
        addFx({ kind: 'burst', pos: [side * ledgeX, 0, 0], color: '#ff6b6b', ttl: 320, count: 12, speed: 5, size: 0.16 })
        sfx('hit', 0.4)
      }
    }
    ledgeOwner[String(side)] = f.id
    f.ledgeSide = side
    f.ledgeMs = 0
    f.airDodgeUsed = false
    f.upSpecialUsed = false // 抓邊後恢復
    f.jumpsLeft = 1 // 抓邊後恢復一次空中跳躍
    f.facing = [-side, 0]
    const rb = runtime.bodies[f.id]!
    rb.setGravityScale(0, true)
    rb.setLinvel({ x: 0, y: 0, z: 0 }, true)
    setFsm(f, 'LEDGE')
    addFx({ kind: 'ring', pos: [side * ledgeX, 0, 0], color: '#ffe066', ttl: 350, radius: 1.2 })
    addFx({ kind: 'burst', pos: [side * ledgeX, 0, 0], color: '#ffe066', ttl: 300, count: 8, speed: 3, size: 0.12 })
    rumble(f.id, 0.25, 60)
    sfx('ledge')
    return true
  }
  return false
}
function updateLedge(f: FighterState, dt: number, inp: InputFrame) {
  const rb = runtime.bodies[f.id]!
  const side = f.ledgeSide || 1
  const ledgeX = getStage().ledgeX
  const [hx, hy] = hangPos(side, ledgeX)
  f.ledgeMs += dt * 1000
  f.invulnMs = Math.max(f.invulnMs, 120) // 懸掛期間無敵
  f.facing = [-side, 0]
  rb.setTranslation({ x: hx, y: hy, z: 0 }, true)
  rb.setLinvel({ x: 0, y: 0, z: 0 }, true)
  const leave = (vx: number, vy: number, cd = LEDGE_REGRAB_MS) => {
    releaseLedge(f)
    rb.setGravityScale(1, true)
    rb.setLinvel({ x: vx, y: vy, z: 0 }, true)
    f.ledgeCd = cd
  }
  const toward = -side * inp.moveX // >0 = 往平台內推
  if (inp.pressed.jump) { // 爬邊跳
    leave(-side * 4, 16)
    f.invulnMs = Math.max(f.invulnMs, 200)
    setFsm(f, 'JUMP')
    addFx({ kind: 'ring', pos: [hx, hy, 0], color: '#ffffff', ttl: 250, radius: 0.9 })
  } else if (toward > 0.5 || inp.pressed.attack) { // 爬上平台（按攻擊則起身攻擊）
    const wantAttack = inp.pressed.attack
    leave(0, 0, 400)
    const cx = side * (ledgeX - 0.6)
    rb.setTranslation({ x: cx, y: 0.55, z: 0 }, true)
    f.pos = [cx, 0.55, 0]
    f.grounded = true
    f.invulnMs = Math.max(f.invulnMs, 450)
    setFsm(f, 'IDLE')
    addFx({ kind: 'burst', pos: [cx, 0.1, 0], color: '#ffffff', ttl: 300, count: 8, speed: 3, size: 0.12 })
    if (wantAttack) tryStartSkill(f, 'attack', inp)
  } else if (inp.moveY < -0.5 || inp.moveX * side > 0.5 || f.ledgeMs >= LEDGE_HANG_MS) { // 鬆手
    leave(side * 1.5, 0)
    setFsm(f, 'JUMP')
  }
}

// ---------------------------------------------------------------- 閃避（翻滾 / 原地 / 空中）
const DODGE = {
  roll: { total: 420, invuln: 330, speed: 12.5, move: 290 },
  spot: { total: 380, invuln: 300, speed: 0, move: 0 },
  air: { total: 440, invuln: 330, speed: 10.5, move: 260 },
} as const
function startDodge(f: FighterState, kind: 'roll' | 'spot' | 'air', dx: number, dy: number) {
  const d = DODGE[kind]
  const rb = runtime.bodies[f.id]!
  f.dodgeKind = kind
  f.dodgeMs = d.total
  f.dodgeDir = [dx, dy]
  f.invulnMs = Math.max(f.invulnMs, d.invuln)
  if (kind === 'roll' && dx) f.facing = [-dx as -1 | 1, 0] // 翻滾後轉身面向原本對手方向
  if (kind === 'air') { f.airDodgeUsed = true; rb.setGravityScale(0, true) }
  rb.setLinvel({ x: 0, y: 0, z: 0 }, true)
  setFsm(f, 'DODGE')
  sfx('dodge')
  addFx({ kind: 'ring', pos: [f.pos[0], f.pos[1] - (kind === 'air' ? 0 : 0.45), 0], color: '#6cc8ff', ttl: 280, radius: 1.25 })
  addFx({ kind: 'afterimage', pos: [f.pos[0], f.pos[1], 0], yaw: f.facing[0] >= 0 ? Math.PI / 2 : -Math.PI / 2, color: '#bfe6ff', ttl: 260 })
}
function updateDodge(f: FighterState, dt: number) {
  const rb = runtime.bodies[f.id]!
  const kind = f.dodgeKind ?? 'spot'
  const d = DODGE[kind]
  const elapsed = d.total - f.dodgeMs
  f.dodgeMs -= dt * 1000
  const [dx, dy] = f.dodgeDir
  if (kind !== 'spot') {
    if (elapsed < d.move) {
      rb.setLinvel({ x: dx * d.speed, y: kind === 'air' ? dy * d.speed : rb.linvel().y, z: 0 }, true)
      f.scratchTrail = (f.scratchTrail ?? 0) - dt * 1000
      if (f.scratchTrail <= 0) {
        f.scratchTrail = 50
        addFx({ kind: 'afterimage', pos: [f.pos[0], f.pos[1], 0], yaw: f.facing[0] >= 0 ? Math.PI / 2 : -Math.PI / 2, color: '#bfe6ff', ttl: 240 })
      }
    } else {
      const v = rb.linvel()
      rb.setLinvel({ x: v.x * Math.pow(0.8, dt * 60), y: v.y, z: 0 }, true)
      if (kind === 'air') rb.setGravityScale(1, true)
    }
  } else {
    const v = rb.linvel()
    rb.setLinvel({ x: v.x * 0.7, y: v.y, z: 0 }, true)
  }
  if (f.dodgeMs <= 0) {
    rb.setGravityScale(1, true)
    f.dodgeKind = null
    setFsm(f, f.grounded ? 'IDLE' : 'JUMP')
  }
}

// ---------------------------------------------------------------- skills
function makeCtx(f: FighterState, sk: ActiveSkill, dt: number): SkillContext {
  const rb = runtime.bodies[f.id]!
  const inp = store().cpu[f.id] ? null : readInput(f.id)
  return {
    caster: f, def: sk.def, phase: sk.phase, phaseMs: sk.phaseMs, dt, chargeRatio: sk.chargeRatio,
    scratch: sk.scratch, forward: [f.facing[0], 0, 0],
    aimX: inp?.moveX ?? f.facing[0], aimY: inp?.moveY ?? 0,
    toWorld: (l) => facingWorld(f, l),
    setVelocity: (x, y, z) => { rb.setLinvel({ x, y: y ?? rb.linvel().y, z: 0 }, true); void z },
    setLocalVelocity: (x, y, z) => {
      const w = facingWorld(f, [x, 0, z])
      rb.setLinvel({ x: w[0], y: y ?? rb.linvel().y, z: 0 }, true)
    },
    setGravityScale: (s) => rb.setGravityScale(s, true),
    setInvulnerable: (ms) => { f.invulnMs = Math.max(f.invulnMs, ms) },
    teleport: (p) => { rb.setTranslation({ x: p[0], y: p[1], z: 0 }, true); f.pos = [p[0], p[1], 0]; sfx('warp') },
    spawnZone: (p, d) => { addZone(f.id, p, d); sfx('zone') },
    spawnProjectile: (p) => addProjectile({
      owner: f.id, pos: [...p.pos], vel: [...p.vel], radius: p.radius, ttlMs: p.ttlMs, pierce: !!p.pierce, color: p.color,
      gravity: p.gravity, explodeRadius: p.explodeRadius, steerable: p.steerable, maxRange: p.maxRange,
      source: { def: sk.def, hitSet: new Set(), kbMult: sk.kbMult, dmgMult: sk.dmgMult },
    }),
    spawnSummon: (opts = {}) => {
      const kind = opts.kind ?? 'spirit'
      const behavior = opts.behavior ?? (kind === 'drone' || kind === 'loong' ? 'shoot' : kind === 'puppet' ? 'chase' : 'orbit')
      const durationMs = opts.durationMs ?? 7000
      const damage = opts.damage ?? 5
      const kbBase = opts.kbBase ?? 6.5
      const kbScaling = opts.kbScaling ?? 7.5
      const color = opts.color ?? CHARACTERS[f.character].color
      const offset = opts.offset ?? [f.facing[0] * 0.9, 1.35, 0]
      const summonDef: SkillDef = {
        ...sk.def,
        name: `${CHARACTERS[f.character].name}・召喚物`,
        damage,
        knockback: { dir: [0.6, 0.55, 0], base: kbBase, scaling: kbScaling },
      }
      const pos: Vec3 = [f.pos[0] + offset[0], f.pos[1] + offset[1], 0]
      addSummon({
        owner: f.id,
        kind,
        behavior,
        pos,
        vel: [0, 0, 0],
        color,
        radius: opts.radius ?? 0.52,
        ttlMs: durationMs,
        durationMs,
        fireCdMs: 350,
        fireIntervalMs: opts.fireIntervalMs ?? (behavior === 'shoot' ? 950 : 650),
        damage,
        kbBase,
        kbScaling,
        speed: opts.speed ?? (behavior === 'chase' ? 8.2 : 11),
        explodeOnHit: opts.explodeOnHit ?? (kind === 'puppet'),
        source: { def: summonDef, hitSet: new Set(), kbMult: sk.kbMult, dmgMult: sk.dmgMult },
      })
      addFx({ kind: 'ring', pos, color, ttl: 280, radius: 1.1, plane: 'vertical' })
      sfx('zone')
    },
    fx: (spec) => addFx({ char: f.character, ...spec, color: spec.color ?? PLAYER_COLORS[f.id] }),
    nearestEnemy: () => nearestEnemyOf(f.id),
    isGrounded: () => f.grounded,
    strike: (override) => {
      if (sk.def.hitbox) runHitbox(f, sk, { ...sk.def.hitbox, ...override })
    },
    endActive: () => { sk.ended = true },
    shake: (a) => { runtime.shake = Math.max(runtime.shake, a) },
  }
}

function tryStartSkill(f: FighterState, slot: SkillSlot, inp: InputFrame): boolean {
  if (slot === 'smash' && !f.grounded) return false // 重擊只能在站在地上時使用
  const lo = CHARACTERS[f.character].loadout
  // 方向 + 招式鍵：上 / 下變化招（沒有定義就用原本的招）
  // 上 / 下優先，其次左右（左右共用同一招，稱為 side）
  const dir = inp.moveY > 0.6 ? 'up' : inp.moveY < -0.6 ? 'down' : Math.abs(inp.moveX) > 0.6 ? 'side' : null
  const dirKey = dir ? `${slot}:${dir}` : null
  const def = (dirKey ? getSkill(lo[dirKey]) : undefined) ?? getSkill(lo[slot])
  if (!def) return false
  const isUpSpecial = slot === 'skill1' && dir === 'up' && def === getSkill(lo['skill1:up'])
  if (isUpSpecial && !f.grounded && f.upSpecialUsed) return false // 滯空時只能用一次
  if ((f.cooldowns[def.id] ?? 0) > 0) return false
  if (def.requiresUlt && !f.ultReady) return false
  if (isUpSpecial && !f.grounded) f.upSpecialUsed = true
  startSkill(f, def, slot, inp)
  return true
}

function startSkill(f: FighterState, def: SkillDef, slot: SkillSlot, inp: InputFrame) {
  // 能量條機制已移除，改為純冷卻制
  if (def.requiresUlt) {
    f.ultReady = false
    f.invulnMs = Math.max(f.invulnMs, def.startupMs + def.activeMs + 150)
    sfx('ultStart')
    const ch = CHARACTERS[f.character]
    runtime.hitstopMs = Math.max(runtime.hitstopMs, 420)
    const cutin = { charId: f.character, name: ch.name, skillName: def.name, color: ch.color }
    store().triggerUltCutin(cutin)
    broadcastNetEvent({ kind: 'ultCutin', data: cutin })
    addFx({ kind: 'ring', pos: [...f.pos], color: ch.color, ttl: 480, radius: 3.2, plane: 'vertical' })
  }
  else if (def.projectile) sfx('shoot')
  else sfx('swing', Math.min(1, def.damage / 25))
  if (def.cooldownMs) f.cooldowns[def.id] = def.cooldownMs * COOLDOWN_SCALE
  // 面向：有移動輸入就朝輸入方向，否則自動朝向最近的對手（輔助瞄準）
  if (Math.abs(inp.moveX) > 0.3) f.facing = [Math.sign(inp.moveX), 0]
  else {
    const e = nearestEnemyOf(f.id)
    if (e && Math.abs(e.pos[0] - f.pos[0]) < 6) f.facing = [e.pos[0] >= f.pos[0] ? 1 : -1, 0]
  }
  let activeDef = def
  if (!f.grounded && slot === 'attack') {
    if (inp.moveY < -0.5) {
      activeDef = {
        ...def,
        name: '空中下擊・隕石扣殺',
        startupMs: 110,
        activeMs: 140,
        recoveryMs: 210,
        damage: Math.max(def.damage, 10),
        hitbox: { offset: [0, -0.75, 0], radius: 1.45 },
        knockback: { dir: [0, -1, 0.15], base: 10, scaling: 12 },
        hooks: {
          ...def.hooks,
          onActive(c) {
            def.hooks?.onActive?.(c)
            c.fx({ kind: 'slash', pos: [c.caster.pos[0], c.caster.pos[1] - 0.6, 0], dir: -Math.PI / 2, color: '#f97316', ttl: 240, radius: 1.5 })
            c.fx({ kind: 'ring', pos: [c.caster.pos[0], c.caster.pos[1] - 0.7, 0], color: '#fbbf24', ttl: 260, radius: 1.4, plane: 'horizontal' })
          },
        },
      }
    } else if (Math.abs(inp.moveX) < 0.35 && Math.abs(inp.moveY) < 0.35) {
      activeDef = {
        ...def,
        name: '空中旋轉迴踢',
        startupMs: 70,
        activeMs: 190,
        recoveryMs: 160,
        damage: Math.max(def.damage, 8),
        hitbox: { offset: [0, 0.1, 0], radius: 1.55 },
        knockback: { dir: [0, 0.45, 0.85], base: 7, scaling: 8, radial: true },
        hooks: {
          ...def.hooks,
          onActive(c) {
            def.hooks?.onActive?.(c)
            c.fx({ kind: 'ring', pos: [c.caster.pos[0], c.caster.pos[1] + 0.1, 0], color: '#38bdf8', ttl: 220, radius: 1.55, plane: 'vertical' })
          },
        },
      }
    }
  }
  const mech = consumeSkillMechanic(f, slot)
  f.skill = {
    def: activeDef, slot, phase: 'startup', phaseMs: 0, hitSet: new Set(), kbMult: mech.kbMult, dmgMult: mech.dmgMult,
    chargeMs: 0, chargeRatio: 0, released: !activeDef.charge, ended: false, scratch: {},
  }
  f.comboBufferMs = 0
  setFsm(f, 'ATTACK_STARTUP')
  activeDef.hooks?.onStart?.(makeCtx(f, f.skill, 0))
}

function guardUltBounds(f: FighterState, rb: NonNullable<typeof runtime.bodies['p1']>, onEnd = false) {
  const stage = getStage()
  const blast = stage.blast ?? BLAST
  const p = rb.translation()
  const v = rb.linvel()
  let nx = p.x
  let ny = p.y
  let vx = v.x
  let vy = v.y
  let changed = false

  if (Math.abs(nx) > blast.x - 1.5) {
    nx = clamp(nx, -(blast.x - 1.5), blast.x - 1.5)
    vx = -Math.sign(p.x) * Math.min(Math.abs(vx), 4)
    changed = true
  }
  if (ny < blast.minY + 2.5) {
    ny = blast.minY + 2.5
    vy = Math.max(vy, 2)
    changed = true
  }
  if (!onEnd && vy < -1.5) {
    vy = -1.5
    changed = true
  }
  if (changed) {
    rb.setTranslation({ x: nx, y: ny, z: 0 }, true)
    rb.setLinvel({ x: vx, y: vy, z: 0 }, true)
    f.pos = [nx, ny, 0]
  }
}

function endSkill(f: FighterState) {
  const sk = f.skill
  if (!sk) return
  const rb = runtime.bodies[f.id]
  if (rb) {
    sk.def.hooks?.onEnd?.(makeCtx(f, sk, 0))
    rb.setGravityScale(1, true)
    if (sk.def.requiresUlt) guardUltBounds(f, rb, true)
  }
  f.skill = null
  setFsm(f, f.grounded ? 'IDLE' : 'JUMP')
}

function enterActive(f: FighterState, sk: ActiveSkill, dt: number) {
  sk.phase = 'active'; sk.phaseMs = 0
  setFsm(f, 'ATTACK_ACTIVE')
  sk.hitSet.clear()
  const ch = sk.def.charge
  if (ch) {
    // 擊退倍率採非線性曲線：輕微蓄力幾乎不加擊退，需接近蓄滿才有大幅提升
    sk.kbMult = lerp(ch.knockbackMult[0], ch.knockbackMult[1], Math.pow(sk.chargeRatio, 2.2))
    sk.dmgMult = lerp(ch.damageMult[0], ch.damageMult[1], sk.chargeRatio)
  }
  const ctx = makeCtx(f, sk, dt)
  sk.def.hooks?.onActive?.(ctx)
  const p = sk.def.projectile
  if (p) {
    const w = facingWorld(f, p.offset)
    addProjectile({
      owner: f.id, pos: [f.pos[0] + w[0], f.pos[1] + w[1], 0], vel: [f.facing[0] * p.speed, 0, 0],
      radius: p.radius, ttlMs: p.lifetimeMs, pierce: p.pierce, color: p.color, gravity: p.gravity, explodeRadius: p.explodeRadius,
      source: { def: sk.def, hitSet: new Set(), kbMult: sk.kbMult, dmgMult: sk.dmgMult },
    })
  }
}

function runHitbox(f: FighterState, sk: HitSource, hb: HitboxDef) {
  const fScale = CHARACTERS[f.character]?.scale ?? 1
  const scaledR = Math.round(hb.radius * clamp(fScale, 0.85, 1.35) * 20) / 20
  const samples = hb.length ? Math.max(1, Math.ceil(hb.length / (scaledR * 1.2))) : 1
  for (let i = 0; i < samples; i++) {
    const local: Vec3 = [hb.offset[0] * fScale, hb.offset[1] * fScale, hb.offset[2] * fScale + (hb.length ? (hb.length * i) / Math.max(1, samples - 1) : 0)]
    const w = facingWorld(f, local)
    const center: Vec3 = [f.pos[0] + w[0], f.pos[1] + w[1], 0]
    for (const id of queryBall(center, scaledR)) {
      if (id === f.id || sk.hitSet.has(id)) continue
      const t = store().fighters[id]
      if (!t.alive) continue
      queueHit(f, t, sk, center)
    }
    hitBallIfOverlap(f, sk, center, scaledR)
  }
}

// ---------------------------------------------------------------- 同幀判定結算（避免 P1/P2 先後順序造成的不公平）
interface PendingHit { att: FighterState; tgt: FighterState; src: HitSource; center: Vec3 }
let pending: PendingHit[] = []
function queueHit(att: FighterState, tgt: FighterState, src: HitSource, center: Vec3) {
  src.hitSet.add(tgt.id)
  pending.push({ att, tgt, src, center })
}
const CLASH_PRIORITY = 9 // 傷害差 >= 9% 時，強者壓過弱者（和大亂鬥相同概念）
function resolveHits() {
  const list = pending
  pending = []
  for (const h of list) {
    const rev = list.find((o) => o !== h && o.att === h.tgt && o.tgt === h.att)
    if (rev) {
      const mine = h.src.def.damage * h.src.dmgMult
      const theirs = rev.src.def.damage * rev.src.dmgMult
      if (theirs - mine >= CLASH_PRIORITY) continue // 我方判定被壓過
      // 其餘情況：雙方同時命中（互相抵銷/對撞）
    }
    applyHit(h.att, h.tgt, h.src, h.center, 'hit')
  }
}

// ---------------------------------------------------------------- 大招球（Smash Ball，參照《大亂鬥 特別版》機制）
let ballTimer = 0
let ballCooldown = 0
function hitBallIfOverlap(att: FighterState, src: HitSource, center: Vec3, r: number): boolean {
  const b = runtime.ball
  if (!b || src.hitSet.has('ball')) return false
  if (Math.hypot(center[0] - b.pos[0], center[1] - b.pos[1]) > r + b.radius) return false
  src.hitSet.add('ball')
  const dmg = Math.max(2, src.def.damage * src.dmgMult * (CHARACTERS[att.character]?.damageMult ?? 1))
  b.hp -= dmg
  b.flashMs = 150
  sfx('ballHit')
  const dx = Math.sign(b.pos[0] - center[0]) || att.facing[0]
  b.vel = [dx * 5.5, 2.5, 0]
  addFx({ kind: 'burst', pos: [...b.pos], color: '#ffe066', ttl: 400, count: 16, speed: 6, size: 0.2 })
  rumble(att.id, 0.4, 90)
  if (b.hp <= 0) {
    addFx({ kind: 'ring', pos: [...b.pos], color: '#ffffff', ttl: 700, radius: 4 })
    addFx({ kind: 'burst', pos: [...b.pos], color: '#ffd24d', ttl: 900, count: 70, speed: 11, size: 0.28 })
    runtime.shake = Math.max(runtime.shake, 0.8)
    att.ultReady = true
    sfx('ballBreak'); setTimeout(() => sfx('ultReady'), 450)
    rumble(att.id, 1, 350)
    runtime.ball = null
    ballCooldown = 80
    ballTimer = 6 + Math.random() * 4
  }
  return true
}
function updateBall(dt: number) {
  const b = runtime.ball
  const stage = getStage()
  if (!b) {
    // 1. 開局前 15 秒（900 幀）絕對不會出現大招球
    if (runtime.stageTime < 15) return
    // 2. 場上出現過大招球後進入 80 秒冷卻鎖定期；若已有玩家持有大招資格也不重複生成
    if (ballCooldown > 0) { ballCooldown = Math.max(0, ballCooldown - dt); return }
    const ids = getActiveFighterIds()
    const fs = store().fighters
    if (ids.some((id) => fs[id]?.ultReady)) return
    ballTimer -= dt
    if (ballTimer <= 0) {
      // 3. 抽籤間隔（5.0～8.3 秒）
      ballTimer = 5 + Math.random() * 3.3
      // 4. 開局漸進機率：15s 後從 0% 於 111 秒內線性升至基礎上限 10%
      const ramp = Math.min(1, Math.max(0, (runtime.stageTime - 15) / 111))
      // 5. 戰況差距補償：命數落後 3 條以上時倍率最高達 2.55 倍
      const aliveStocks = ids.map((id) => fs[id]?.stocks ?? 0).filter((s) => s > 0)
      const stockGap = aliveStocks.length >= 2 ? Math.max(...aliveStocks) - Math.min(...aliveStocks) : 0
      const underdogMult = 1 + Math.min(3, stockGap) * (1.55 / 3)
      const chance = Math.min(0.45, 0.1 * ramp * underdogMult)
      if (Math.random() >= chance) return
      const side = Math.random() < 0.5 ? -1 : 1
      const spawnX = side * (Math.min(stage.half.x, 14) + 8)
      addFx({ kind: 'ring', pos: [spawnX, 6.5, 0], color: '#ffe066', ttl: 700, radius: 3 })
      sfx('ballSpawn')
      runtime.ball = { pos: [spawnX, 6.5, 0], vel: [-side * 5.2, 0, 0], hp: 40, maxHp: 40, radius: 0.6, ttlMs: 20000, turnMs: 1400, flashMs: 0 }
      ballCooldown = 80
    }
    return
  }
  const ms = dt * 1000
  b.ttlMs -= ms; b.flashMs = Math.max(0, b.flashMs - ms); b.turnMs -= ms
  if (b.ttlMs > 0) {
    const maxBallX = Math.min(stage.half.x, 14) + 2
    const inside = Math.abs(b.pos[0]) <= maxBallX
    if (b.turnMs <= 0 && inside) {
      b.turnMs = 1500 + Math.random() * 1500
      const a = Math.random() * Math.PI * 2
      b.vel = [Math.cos(a) * 4.2, Math.sin(a) * 2.6, 0]
    } else if (!inside) {
      b.vel[0] = -Math.sign(b.pos[0]) * 5.2
    }
    b.pos = [b.pos[0] + b.vel[0] * dt, b.pos[1] + b.vel[1] * dt, 0]
    if (inside && Math.abs(b.pos[0]) > maxBallX) { b.pos[0] = Math.sign(b.pos[0]) * maxBallX; b.vel[0] *= -1 }
    if (b.pos[1] < 2.5 || b.pos[1] > 9) { b.pos[1] = clamp(b.pos[1], 2.5, 9); b.vel[1] *= -1 }
  } else {
    // 太久沒人打破時不再折返，而是斜上方緩緩飄出畫面外
    const exitDir = b.pos[0] >= 0 ? 1 : -1
    b.vel = [exitDir * 9.5, 5.5, 0]
    b.pos = [b.pos[0] + b.vel[0] * dt, b.pos[1] + b.vel[1] * dt, 0]
    const blast = stage.blast ?? BLAST
    if (Math.abs(b.pos[0]) > blast.x + 2 || b.pos[1] > blast.maxY + 2) {
      runtime.ball = null
      ballCooldown = 80
      ballTimer = 6 + Math.random() * 4
    }
  }
}

/** 角色互相重疊時輕微推開（角色之間沒有剛體碰撞，支援最多 8 人兩兩分離） */
function separateFighters(dt: number) {
  const fs = store().fighters
  const ids = getActiveFighterIds()
  const free = (f: FighterState) => f.alive && f.fsm !== 'HITSTUN' && f.fsm !== 'ATTACK_ACTIVE'
  for (let i = 0; i < ids.length; i++) {
    const a = fs[ids[i]], ra = runtime.bodies[ids[i]]
    if (!a || !ra || !free(a)) continue
    for (let j = i + 1; j < ids.length; j++) {
      const b = fs[ids[j]], rb = runtime.bodies[ids[j]]
      if (!b || !rb || !free(b)) continue
      const ta = ra.translation(), tb = rb.translation()
      const dx = tb.x - ta.x
      if (Math.abs(tb.y - ta.y) >= 0.95 || Math.abs(dx) >= 0.95) continue
      const push = ((0.95 - Math.abs(dx)) / 2) * Math.min(1, dt * 12)
      const dir = dx === 0 ? 1 : Math.sign(dx)
      ra.setTranslation({ x: ta.x - dir * push, y: ta.y, z: 0 }, true)
      rb.setTranslation({ x: tb.x + dir * push, y: tb.y, z: 0 }, true)
    }
  }
}

function updateSkill(f: FighterState, dt: number, inp: InputFrame) {
  const sk = f.skill!
  if (sk.def.requiresUlt && sk.phase !== 'recovery') {
    f.invulnMs = Math.max(f.invulnMs, 120)
  }
  const dtMs = dt * 1000
  const rb = runtime.bodies[f.id]!
  // 施放中水平速度快速衰減（hook 可在 onTick 覆寫）
  const v = rb.linvel()
  const k = Math.pow(0.8, dt * 60)
  rb.setLinvel({ x: v.x * k, y: v.y, z: 0 }, true)
  if (sk.def.requiresUlt) guardUltBounds(f, rb, false)

  // 連段輸入緩衝（連按或長按普攻皆可順暢接續下一段）
  const atkHoldReady = inp.held.attack && (!sk.def.charge || sk.released)
  if (sk.def.chain && (inp.pressed.attack || atkHoldReady) && sk.phase !== 'recovery') f.comboBufferMs = 280

  // 同按升級：先按普攻/特招，約 0.1 秒內補按另一個 → 改成蓄力重擊（僅限地面，退還原招式的消耗）
  if (f.grounded && sk.phase === 'startup' && sk.phaseMs < 110 && (sk.slot === 'attack' || sk.slot === 'skill1')) {
    const other = sk.slot === 'attack' ? inp.pressed.skill1 : inp.pressed.attack
    if (other && getSkill(CHARACTERS[f.character].loadout.smash)) {
      if (sk.def.cooldownMs) f.cooldowns[sk.def.id] = 0
      f.energy = Math.min(ENERGY_MAX, f.energy + sk.def.energyCost)
      endSkill(f)
      tryStartSkill(f, 'smash', inp)
      return
    }
  }

  if (sk.phase === 'startup') {
    if (sk.def.charge && !sk.released) {
      // 重擊（普攻+特招同按）只要任一鍵還按著就持續保持蓄力狀態，直到放開才打下去
      const held = sk.slot === 'smash' ? inp.held.attack || inp.held.skill1 : inp.held[sk.slot]
      if (held) {
        if (sk.chargeMs < sk.def.charge.maxMs) {
          sk.chargeMs = Math.min(sk.def.charge.maxMs, sk.chargeMs + dtMs)
          sfx('charge', sk.chargeRatio)
        }
        sk.chargeRatio = clamp(sk.chargeMs / sk.def.charge.maxMs, 0, 1)
        sk.phaseMs = 0 // 蓄力中（含蓄滿未放開）：前搖計時暫停
      } else {
        sk.chargeRatio = clamp(sk.chargeMs / sk.def.charge.maxMs, 0, 1)
        sk.released = true
      }
    }
    sk.phaseMs += dtMs
    sk.def.hooks?.onTick?.(makeCtx(f, sk, dt))
    if (sk.released && sk.phaseMs >= sk.def.startupMs) enterActive(f, sk, dt)
  } else if (sk.phase === 'active') {
    sk.phaseMs += dtMs
    const ctx = makeCtx(f, sk, dt)
    sk.def.hooks?.onTick?.(ctx)
    if (sk.def.hitbox && !sk.def.hitbox.manual) runHitbox(f, sk, sk.def.hitbox)
    if (sk.ended || sk.phaseMs >= sk.def.activeMs) {
      if (sk.slot === 'attack') {
        if (sk.hitSet.size > 0) delete f.cooldowns[sk.def.id]
        else f.cooldowns[sk.def.id] = Math.max(f.cooldowns[sk.def.id] ?? 0, 420)
      }
      sk.phase = 'recovery'; sk.phaseMs = 0
      setFsm(f, 'ATTACK_RECOVERY')
    }
  } else {
    sk.phaseMs += dtMs
    sk.def.hooks?.onTick?.(makeCtx(f, sk, dt))
    const hitLanded = sk.hitSet.size > 0
    const next = getSkill(sk.def.chain)
    if (next && hitLanded && (inp.pressed.attack || f.comboBufferMs > 0 || atkHoldReady)) {
      endSkill(f)
      startSkill(f, next, 'attack', inp)
      return
    }
    // 普攻接招延伸：只有打到敵人時才能無冷卻立即再打普攻／銜接方向攻擊；沒打到則需走完收招並進入冷卻
    if (sk.slot === 'attack' && hitLanded) {
      const hasDir = Math.abs(inp.moveX) > 0.6 || Math.abs(inp.moveY) > 0.6
      if ((hasDir && inp.pressed.attack) || inp.pressed.attack || (atkHoldReady && sk.phaseMs >= sk.def.recoveryMs * 0.45)) {
        endSkill(f)
        tryStartSkill(f, 'attack', inp)
        return
      }
      if (inp.pressed.jump && f.jumpsLeft > 0) {
        endSkill(f)
        f.jumpsLeft--
        f.jumpBufferMs = 0
        sfx('jump', 0)
        rb.setLinvel({ x: v.x, y: JUMP_VEL * 0.85, z: 0 }, true)
        setFsm(f, 'JUMP')
        return
      }
    }
    if (sk.phaseMs >= sk.def.recoveryMs) endSkill(f)
  }
}

// ---------------------------------------------------------------- combat
/** 抓取狀態表：抓取者 ID → { 被抓目標 ID, 剩餘抓持時間 ms, 防誤觸寬限 graceMs } */
const grabHold: Partial<Record<FighterId, { target: FighterId; ms: number; graceMs: number }>> = {}

function executeThrow(att: FighterState, tgt: FighterState, dirX: number, dirY: number) {
  const trb = runtime.bodies[tgt.id]
  if (!trb) return
  const throwDmg = 7.5
  tgt.damage = Math.min(MAX_DAMAGE, tgt.damage + throwDmg)
  tgt.lastHitBy = att.id
  att.stats.damageDealt += throwDmg
  tgt.stats.damageTaken += throwDmg
  let tx = att.facing[0], ty = 0.5, base = 15, scaling = 14
  if (dirY > 0.45) { tx = 0; ty = 1; base = 14; scaling = 13.5 } // 上投
  else if (dirY < -0.45) { tx = att.facing[0] * 0.35; ty = 0.92; base = 12.5; scaling = 12 } // 下投（地面彈起）
  else if (dirX * att.facing[0] < -0.45) { tx = -att.facing[0]; ty = 0.55; base = 16.5; scaling = 15.5; att.facing = [-att.facing[0] as 1 | -1, 0] } // 後投（轉身甩出）
  const len = Math.hypot(tx, ty) || 1
  const p = tgt.damage
  const weightFactor = 1 / (CHARACTERS[tgt.character]?.weightMult ?? 1)
  const spd = (base + ((p / 10 + (p * throwDmg) / 20) * 0.095) * (scaling / 10)) * weightFactor
  if (tgt.skill) endSkill(tgt)
  trb.setGravityScale(1, true)
  trb.setLinvel({ x: (tx / len) * spd, y: (ty / len) * spd, z: 0 }, true)
  tgt.hitstunMs = clamp(180 + spd * 22, 240, 1800)
  setFsm(tgt, 'HITSTUN')
  tgt.flashMs = 150
  sfx('hit', spd / 35)
  addFx({ kind: 'burst', pos: [tgt.pos[0], tgt.pos[1], 0], color: PLAYER_COLORS[att.id], ttl: 340, count: 16, speed: 6.5, size: 0.16 })
}

/** 招式衰減佇列（記錄每位玩家最近命中的 9 次招式 ID） */
const staleQueue: Partial<Record<FighterId, string[]>> = {}

function applyHit(att: FighterState, tgt: FighterState, src: HitSource, center: Vec3, _kind: string) {
  if (tgt.invulnMs > 0 || !tgt.alive) return
  src.hitSet.add(tgt.id)
  const def = src.def
  const attChar = CHARACTERS[att.character]
  const tgtChar = CHARACTERS[tgt.character]
  const rawDmg = def.damage * src.dmgMult * (attChar?.damageMult ?? 1)
  const kb = def.knockback
  const trb = runtime.bodies[tgt.id]!

  // 招式衰減（Stale-Move Negation）：最近 9 次命中重複同一招會遞減威力（最低 0.55 倍）
  const q = staleQueue[att.id] ?? (staleQueue[att.id] = [])
  const staleHits = q.filter((id) => id === def.id).length
  const staleMult = Math.max(0.55, 1 - staleHits * 0.08)
  const dmg = rawDmg * staleMult

  // 世界方向
  let dir: Vec3
  if (kb.radial) {
    const out = tgt.pos[0] === center[0] ? att.facing[0] : Math.sign(tgt.pos[0] - center[0])
    dir = [out * kb.dir[2], kb.dir[1], 0]
  } else dir = facingWorld(att, kb.dir)
  const len = Math.hypot(dir[0], dir[1]) || 1
  dir = [dir[0] / len, dir[1] / len, 0]

  if (tgt.fsm === 'SHIELD' && tgt.shield > 0) {
    const perfect = tgt.stateMs < 140 // 完美防禦：剛按下防禦就擋住，不扣護盾
    if (!perfect) { tgt.shield -= dmg * 2 + 4; sfx('block') }
    else {
      addFx({ kind: 'ring', pos: [tgt.pos[0], tgt.pos[1], 0], color: '#ffe066', ttl: 350, radius: 1.8 })
      addFx({ kind: 'burst', pos: [tgt.pos[0], tgt.pos[1], 0], color: '#ffe066', ttl: 300, count: 14, speed: 6, size: 0.14 })
      tgt.energy = Math.min(ENERGY_MAX, tgt.energy + 8)
      tgt.stats.perfectShields += 1
      sfx('perfect')
      rumble(tgt.id, 0.5, 80)
    }
    trb.setLinvel({ x: dir[0] * 4, y: 0, z: 0 }, true)
    addFx({ kind: 'ring', pos: [tgt.pos[0], tgt.pos[1], 0], color: '#8fd0ff', ttl: 220, radius: 1.1, plane: 'vertical' })
    if (tgt.shield <= 0) { tgt.shield = 0; tgt.lastHitBy = att.id; tgt.coyoteMs = 0; tgt.hitstunMs = 1500; endSkill(tgt); setFsm(tgt, 'HITSTUN'); sfx('shieldBreak') }
    return
  }
  const wasInHitstun = tgt.fsm === 'HITSTUN'
  q.push(def.id)
  if (q.length > 9) q.shift()
  tgt.lastHitBy = att.id
  tgt.coyoteMs = 0
  tgt.damage = Math.min(MAX_DAMAGE, tgt.damage + dmg)
  att.stats.damageDealt += dmg
  tgt.stats.damageTaken += dmg
  onMechanicHit(att, tgt, dmg)
  att.comboCount = wasInHitstun || att.comboTimerMs > 0 ? att.comboCount + 1 : 1
  att.comboTimerMs = 1600
  att.stats.maxCombo = Math.max(att.stats.maxCombo, att.comboCount)
  tgt.comboCount = 0
  tgt.comboTimerMs = 0

  // 1. 官方大亂鬥雪球擊飛公式：(p/10 + p*d/20) * 體重係數 * 招式成長率 + 基礎擊飛
  const p = tgt.damage
  const weightFactor = 1 / (tgtChar?.weightMult ?? 1)
  const snowball = (p / 10 + (p * dmg) / 20) * 0.095
  // 2. 復仇補正（Rage）：自身 >= 35% 時提升擊飛力，150% 達上限 1.12 倍
  const rageT = att.damage >= 35 ? Math.min(1, (att.damage - 35) / 115) : 0
  const rageMult = 1 + rageT * 0.12
  let speed = (kb.base + snowball * (kb.scaling / 10)) * src.kbMult * staleMult * rageMult * weightFactor

  // 3. 方向影響（DI）：受擊者推搖桿可微調最多 ±18° 擊飛角度
  if (!store().cpu[tgt.id]) {
    const di = readInput(tgt.id)
    const diX = di.moveX
    const diY = di.moveY
    if (diX !== 0 || diY !== 0) {
      const perp = -dir[1] * diX + dir[0] * diY
      const angle = Math.atan2(dir[1], dir[0]) + clamp(perp, -1, 1) * 0.314
      dir = [Math.cos(angle), Math.sin(angle), 0]
    }
  }
  if (tgt.statusKind === 'freeze') {
    tgt.statusKind = null
    tgt.statusMs = 0
    speed *= 1.22 // 破冰追加擊飛！
    addFx({ kind: 'burst', pos: [tgt.pos[0], tgt.pos[1], 0], color: '#bae6fd', ttl: 320, count: 14, speed: 7, size: 0.16 })
  }
  if (tgt.skill) endSkill(tgt) // 受擊打斷施放
  trb.setGravityScale(1, true)
  trb.setLinvel({ x: dir[0] * speed, y: dir[1] * speed, z: 0 }, true)
  let hitstun = kb.hitstunMs ?? clamp(120 + speed * 22, 160, 2200)
  // 屬性傷害異常狀態判定
  const elem = CHAR_ELEMENT[att.character]
  if (elem && Math.random() < elementChance(dmg, !!def.requiresUlt)) {
    const info = ELEMENT_INFO[elem]
    tgt.statusKind = info.status
    tgt.statusMs = statusDuration(info.status, dmg, !!def.requiresUlt)
    tgt.statusBy = att.id
    if (info.status === 'shock') hitstun += 140
    addFx({ kind: 'ring', pos: [tgt.pos[0], tgt.pos[1], 0], color: info.color, ttl: 340, radius: 1.5, plane: 'vertical' })
  }
  // 持有大招球資格被打重擊時有機會掉出大招球
  if (tgt.ultReady && !runtime.ball && (speed >= 14 || dmg >= 10) && Math.random() < (speed >= 20 ? 0.55 : 0.3)) {
    tgt.ultReady = false
    runtime.ball = {
      pos: [tgt.pos[0], tgt.pos[1] + 0.9, 0],
      vel: [-dir[0] * 6, 5.5, 0],
      hp: 25,
      maxHp: 25,
      radius: 0.6,
      ttlMs: 14000,
      turnMs: 900,
      flashMs: 250,
    }
    sfx('ballSpawn')
    addFx({ kind: 'ring', pos: [tgt.pos[0], tgt.pos[1] + 0.9, 0], color: '#fde047', ttl: 420, radius: 2.2 })
  }
  tgt.hitstunMs = hitstun
  setFsm(tgt, 'HITSTUN')
  tgt.flashMs = 160
  sfx('hit', speed / 40)
  att.energy = Math.min(ENERGY_MAX, att.energy + dmg * 1.2)
  tgt.energy = Math.min(ENERGY_MAX, tgt.energy + dmg * 0.6)
  runtime.shake = Math.max(runtime.shake, Math.min(0.9, speed * 0.02))
  if (speed >= 26 || (speed >= 21 && tgt.damage >= 95)) {
    runtime.hitstopMs = Math.max(runtime.hitstopMs, 260)
    runtime.shake = Math.max(runtime.shake, 1.1)
    store().triggerFatalFlash(tgt.pos[0], tgt.pos[1])
    broadcastNetEvent({ kind: 'fatalFlash', x: tgt.pos[0], y: tgt.pos[1] })
    addFx({ kind: 'fatal', pos: [tgt.pos[0], tgt.pos[1], 0], color: '#ef4444', ttl: 480, radius: 4.5 })
  } else if (speed >= 18) {
    runtime.hitstopMs = Math.max(runtime.hitstopMs, clamp((speed - 14) * 3.5, 45, 120))
    addFx({ kind: 'ring', pos: [tgt.pos[0], tgt.pos[1], 0], color: speed >= 26 ? '#ff3366' : '#ffe066', ttl: 280, radius: 1.4 + speed * 0.04, plane: 'vertical' })
  }
  rumble(tgt.id, 0.3 + speed * 0.02, 100 + speed * 5)
  rumble(att.id, 0.2, 60)
  addFx({ kind: 'burst', char: att.character, pos: [tgt.pos[0], tgt.pos[1], 0], color: PLAYER_COLORS[att.id], ttl: 350, count: 10 + Math.min(20, Math.round(speed)), speed: 3 + speed * 0.25, size: 0.14 })
  if (att.skill && att.skill.def === def) def.hooks?.onHit?.(makeCtx(att, att.skill, 0), tgt)
}

// ---------------------------------------------------------------- lifecycle
function ko(f: FighterState) {
  const rb = runtime.bodies[f.id]!
  const p = f.pos
  const blast = getStage().blast ?? BLAST
  const ex = clamp(p[0], -blast.x + 1, blast.x - 1)
  const ey = clamp(p[1], blast.minY + 1, blast.maxY - 1)
  const col = CHARACTERS[f.character].color
  addFx({ kind: 'burst', pos: [ex, ey, 0], color: col, ttl: 900, count: 70, speed: 14, size: 0.35 })
  addFx({ kind: 'ring', pos: [ex, ey, 0], color: col, ttl: 650, radius: 5.5, plane: 'vertical' })
  addFx({ kind: 'pillar', pos: [ex, ey - 10, 0], color: col, ttl: 750, radius: 2.2 })
  runtime.shake = 1.2
  sfx('ko')
  rumble(f.id, 1, 400)
  if (f.skill) endSkill(f)
  releaseLedge(f)
  const fs = store().fighters
  const killerId = f.lastHitBy && f.lastHitBy !== f.id ? f.lastHitBy : nearestEnemyOf(f.id)?.id
  if (killerId && fs[killerId]) fs[killerId].stats.kos += 1
  f.lastHitBy = null
  f.comboCount = 0
  f.comboTimerMs = 0
  f.stocks -= 1
  f.ultReady = false
  f.damage = 0
  f.alive = false
  f.respawnMs = 1300
  rb.setEnabled(false)
  const aliveIds = getActiveFighterIds().filter((id) => fs[id].stocks > 0)
  if (aliveIds.length <= 1 && !store().gameFinish) {
    const winId = aliveIds[0] ?? killerId ?? f.id
    publishUi(0, true)
    store().triggerGameFinish(winId, ex, ey)
    broadcastNetEvent({ kind: 'gameFinish', winner: winId, x: ex, y: ey })
    sfx('perfect')
    runtime.shake = 1.4
  }
}

function respawn(f: FighterState) {
  const rb = runtime.bodies[f.id]!
  const first = f.firstSpawn
  const stage = getStage()
  const active = getActiveFighterIds()
  const idx = Math.max(0, active.indexOf(f.id))
  const span = stage.half.x * 0.78
  const sx = active.length <= 2
    ? ((stage.spawnX as Partial<Record<FighterId, number>>)[f.id] ?? (SPAWN_X as Partial<Record<FighterId, number>>)[f.id] ?? (idx === 0 ? -span * 0.5 : span * 0.5))
    : -span + (2 * span * idx) / Math.max(1, active.length - 1)
  const rx = first ? sx : 0
  const ry = first ? 1 : 6.2
  f.firstSpawn = false
  rb.setEnabled(true)
  if (first) resetCpu(f.id)
  rb.setTranslation({ x: rx, y: ry, z: 0 }, true)
  rb.setLinvel({ x: 0, y: 0, z: 0 }, true)
  rb.setGravityScale(1, true)
  f.alive = true
  f.revivalMs = first ? 0 : 3000
  f.statusKind = null
  f.statusMs = 0
  f.statusBy = null
  f.invulnMs = first ? 300 : 2500
  f.hitstunMs = 0
  f.lastHitBy = null
  f.jumpBufferMs = 0
  f.coyoteMs = 0
  f.slowFactor = 1
  f.shield = SHIELD_MAX
  f.skill = null
  releaseLedge(f)
  f.ledgeCd = 0
  f.upSpecialUsed = false
  f.airDodgeUsed = false
  f.pos = [rx, ry, 0]
  setFsm(f, 'JUMP')
  if (!first) sfx('respawn')
}

const latestInputs: Partial<Record<FighterId, InputFrame>> = {}

function updateFighter(f: FighterState, dt: number) {
  const rb = runtime.bodies[f.id]
  if (!rb) return
  const dtMs = dt * 1000
  if (!f.alive) {
    f.respawnMs -= dtMs
    if (f.respawnMs <= 0 && f.stocks > 0) respawn(f)
    return
  }
  const t = rb.translation(), lv = rb.linvel()
  f.pos = [t.x, t.y, 0]
  f.vel = [lv.x, lv.y, 0]
  const blast = getStage().blast ?? BLAST
  if (t.x < -blast.x || t.x > blast.x || t.y < blast.minY || t.y > blast.maxY) { ko(f); return }

  f.stateMs += dtMs
  f.invulnMs = Math.max(0, f.invulnMs - dtMs)
  f.reflectMs = Math.max(0, (f.reflectMs ?? 0) - dtMs)
  f.flashMs = Math.max(0, f.flashMs - dtMs)
  f.comboBufferMs = Math.max(0, f.comboBufferMs - dtMs)
  f.comboTimerMs = Math.max(0, f.comboTimerMs - dtMs)
  if (f.comboTimerMs <= 0) f.comboCount = 0
  f.ledgeCd = Math.max(0, f.ledgeCd - dtMs)
  for (const k in f.cooldowns) f.cooldowns[k] = Math.max(0, f.cooldowns[k] - dtMs)
  f.energy = Math.min(ENERGY_MAX, f.energy + ENERGY_REGEN * dt)
  f.dropMs = Math.max(0, f.dropMs - dtMs)
  updatePlatformCollision(f, rb, dt)
  const wasGrounded = f.grounded
  f.grounded = checkGround(f)
  const maxJumps = MAX_JUMPS + (CHARACTERS[f.character]?.extraJumps ?? 0)
  if (f.grounded) {
    if (!wasGrounded && f.vel[1] < -1.5) sfx('land', Math.min(1, Math.abs(f.vel[1]) / 20))
    f.jumpsLeft = maxJumps; f.airDodgeUsed = false; f.upSpecialUsed = false
    f.coyoteMs = 110 // 土狼時間：剛離開平台邊緣的一瞬間仍視為接地起跳
  } else {
    f.coyoteMs = Math.max(0, (f.coyoteMs ?? 0) - dtMs)
    const maxAir = 1 + (CHARACTERS[f.character]?.extraJumps ?? 0)
    if (f.coyoteMs <= 0 && f.jumpsLeft > maxAir) f.jumpsLeft = maxAir
  }

  // 減速力場（只影響敵方）
  f.slowFactor = 1
  for (const z of runtime.zones) {
    if (z.owner !== f.id && Math.abs(t.x - z.pos[0]) < z.radius && Math.abs(t.y - z.pos[1]) < 3) f.slowFactor = Math.min(f.slowFactor, z.slowFactor)
  }

  const ns = useNetStore.getState()
  let inp: InputFrame
  if (ns.role === 'host' && ns.guests.includes(f.id)) {
    const ri = netRuntime.remoteInputs[f.id]
    inp = { moveX: ri.moveX, moveY: ri.moveY, held: { ...ri.held }, pressed: { ...ri.pressed } }
    for (const k of Object.keys(ri.pressed) as (keyof InputFrame['pressed'])[]) ri.pressed[k] = false
  } else {
    inp = store().cpu[f.id] ? cpuInput(f.id, dt) : readInput(f.id)
  }
  latestInputs[f.id] = inp
  if (store().phase !== 'playing') return

  // 復活暫時懸浮小平台：開始移動／跳躍／出招就立刻消失，否則最多停留 3 秒
  if ((f.revivalMs ?? 0) > 0) {
    const moved = Math.abs(inp.moveX) > 0.25 || inp.moveY < -0.5 || inp.pressed.jump || inp.pressed.attack || inp.pressed.skill1 || inp.pressed.skill2 || inp.pressed.grab
    if (moved) {
      f.revivalMs = 0
    } else {
      f.revivalMs = Math.max(0, (f.revivalMs ?? 0) - dtMs)
      rb.setTranslation({ x: t.x, y: 6.2, z: 0 }, true)
      rb.setLinvel({ x: 0, y: 0, z: 0 }, true)
      f.pos = [t.x, 6.2, 0]
      f.grounded = true
      f.jumpsLeft = maxJumps
      return
    }
  }

  // 屬性異常狀態推進（冰凍定身 / 燃燒・中毒持續扣血）
  if (f.statusKind && (f.statusMs ?? 0) > 0) {
    f.statusMs = Math.max(0, (f.statusMs ?? 0) - dtMs)
    if (f.statusKind === 'burn' || f.statusKind === 'poison') {
      const rate = f.statusKind === 'burn' ? 2.2 : 2.6
      f.damage = Math.min(MAX_DAMAGE, f.damage + rate * dt)
      if (Math.random() < dt * 4) {
        addFx({ kind: 'burst', pos: [t.x, t.y, 0], color: STATUS_COLOR[f.statusKind], ttl: 240, count: 3, speed: 2.2, size: 0.1 })
      }
    } else if (f.statusKind === 'freeze') {
      rb.setLinvel({ x: lv.x * 0.86, y: Math.min(0, lv.y), z: 0 }, true)
      if (f.statusMs <= 0) f.statusKind = null
      return
    }
    if (f.statusMs <= 0) f.statusKind = null
  }

  // 跳躍輸入緩衝（150ms）：避免跑步換手、剛結束硬直或起跳前一刻按跳沒反應
  f.jumpBufferMs = Math.max(0, (f.jumpBufferMs ?? 0) - dtMs)
  if (inp.pressed.jump) f.jumpBufferMs = 150

  if (f.fsm === 'HITSTUN') {
    f.hitstunMs -= dtMs
    const k = Math.pow(f.grounded ? 0.9 : 0.995, dt * 60)
    rb.setLinvel({ x: lv.x * k, y: lv.y, z: 0 }, true)
    if (Math.hypot(lv.x, lv.y) > 15) {
      f.scratchTrail = (f.scratchTrail ?? 0) - dtMs
      if (f.scratchTrail <= 0) {
        f.scratchTrail = 45
        addFx({ kind: 'afterimage', pos: [t.x, t.y, 0], color: CHARACTERS[f.character].color, ttl: 240, shape: 'sphere', size: 0.45 })
      }
    }
    if (f.hitstunMs <= 0) setFsm(f, f.grounded ? 'IDLE' : 'JUMP')
    return
  }
  if (f.fsm === 'DODGE') { updateDodge(f, dt); return }
  if (f.fsm === 'SHIELD') {
    if ((inp.pressed.jump || (f.jumpBufferMs ?? 0) > 0) && f.jumpsLeft > 0) { // 防禦中按跳躍：直接跳出
      f.jumpsLeft--
      f.jumpBufferMs = 0
      f.coyoteMs = 0
      sfx('jump', 0)
      rb.setLinvel({ x: lv.x, y: JUMP_VEL, z: 0 }, true)
      setFsm(f, 'JUMP')
      return
    }
    if (f.grounded) {
      if (Math.abs(inp.moveX) > 0.5) { startDodge(f, 'roll', Math.sign(inp.moveX), 0); return }
      if (inp.moveY < -0.5) { startDodge(f, 'spot', 0, 0); return }
    }
    f.shield -= 14 * dt
    rb.setLinvel({ x: lv.x * 0.7, y: lv.y, z: 0 }, true)
    if (!inp.held.shield || !f.grounded) setFsm(f, f.grounded ? 'IDLE' : 'JUMP')
    else if (f.shield <= 0) { f.shield = 0; f.hitstunMs = 1500; setFsm(f, 'HITSTUN'); sfx('shieldBreak') }
    return
  }
  // 若正在被別人抓住，維持被抓定身狀態
  for (const [holderId, h] of Object.entries(grabHold)) {
    if (h && h.target === f.id) {
      const holder = store().fighters[holderId as FighterId]
      if (holder?.alive) {
        rb.setGravityScale(0, true)
        rb.setLinvel({ x: 0, y: 0, z: 0 }, true)
        return
      }
      delete grabHold[holderId as FighterId]
    }
  }
  const hold = grabHold[f.id]
  if (hold) {
    const tgt = store().fighters[hold.target]
    const trb = tgt ? runtime.bodies[tgt.id] : null
    if (!tgt || !tgt.alive || !trb) {
      if (trb) trb.setGravityScale(1, true)
      delete grabHold[f.id]
    } else {
      hold.ms -= dt * 1000
      hold.graceMs = Math.max(0, hold.graceMs - dt * 1000)
      rb.setLinvel({ x: 0, y: Math.min(0, rb.linvel().y), z: 0 }, true)
      const pinX = t.x + f.facing[0] * 1.05
      const pinY = t.y + 0.15
      trb.setGravityScale(0, true)
      trb.setTranslation({ x: pinX, y: pinY, z: 0 }, true)
      trb.setLinvel({ x: 0, y: 0, z: 0 }, true)
      tgt.pos = [pinX, pinY, 0]
      if (inp.pressed.attack) {
        tgt.damage = Math.min(MAX_DAMAGE, tgt.damage + 2.5)
        f.stats.damageDealt += 2.5
        tgt.stats.damageTaken += 2.5
        tgt.flashMs = 100
        sfx('hit', 0.45)
        addFx({ kind: 'burst', pos: [pinX, pinY + 0.2, 0], color: '#fde047', ttl: 180, count: 6, speed: 4, size: 0.12 })
      }
      if (hold.graceMs <= 0 && (Math.abs(inp.moveX) > 0.45 || Math.abs(inp.moveY) > 0.45 || inp.pressed.grab)) {
        delete grabHold[f.id]
        executeThrow(f, tgt, inp.moveX, inp.moveY)
      } else if (hold.ms <= 0) {
        delete grabHold[f.id]
        trb.setGravityScale(1, true)
        trb.setLinvel({ x: f.facing[0] * 6, y: 4, z: 0 }, true)
        addFx({ kind: 'ring', pos: [pinX, pinY, 0], color: '#ffffff', ttl: 200, radius: 1.1 })
      }
      return
    }
  }
  if (f.fsm === 'LEDGE') { updateLedge(f, dt, inp); return }
  if (isAttackState(f.fsm)) { updateSkill(f, dt, inp); return }

  // ---- 自由狀態 IDLE / RUN / JUMP
  f.shield = Math.min(SHIELD_MAX, f.shield + 10 * dt)
  if (f.grounded && inp.pressed.shield) {
    if (Math.abs(inp.moveX) > 0.5) { startDodge(f, 'roll', Math.sign(inp.moveX), 0); return }
    if (inp.moveY < -0.5) { startDodge(f, 'spot', 0, 0); return }
  }
  if (inp.held.shield && f.grounded && f.shield > 5) {
    setFsm(f, 'SHIELD')
    rb.setLinvel({ x: lv.x * 0.5, y: lv.y, z: 0 }, true)
    return
  }
  if (tryGrabLedge(f, inp)) return
  if (!f.grounded && inp.pressed.shield && !f.airDodgeUsed) { // 空中閃避（落地前只能一次）
    const m = Math.hypot(inp.moveX, inp.moveY > 0.5 ? inp.moveY : inp.moveY < -0.5 ? inp.moveY : 0)
    startDodge(f, 'air', m > 0.4 ? inp.moveX / Math.max(1, m) : 0, m > 0.4 ? (Math.abs(inp.moveY) > 0.5 ? Math.sign(inp.moveY) : 0) : 0)
    return
  }
  // 抓取與投擲（Grab 鍵，或防禦中按普攻：先抓住對手定身，過 220ms 寬限後推方向鍵投擲或按普攻膝擊！）
  if (inp.pressed.grab || (inp.held.shield && inp.pressed.attack)) {
    const grabCenter: Vec3 = [t.x + f.facing[0] * 1.15, t.y + 0.1, 0]
    addFx({ kind: 'ring', pos: grabCenter, color: PLAYER_COLORS[f.id], ttl: 180, radius: 0.95, plane: 'vertical' })
    const hitIds = queryBall(grabCenter, 1.35).filter((id) => id !== f.id && store().fighters[id]?.alive)
    if (hitIds.length > 0) {
      const tgt = store().fighters[hitIds[0]]
      if (tgt.skill) endSkill(tgt)
      setFsm(tgt, 'HITSTUN')
      tgt.hitstunMs = 1200
      grabHold[f.id] = { target: tgt.id, ms: 1200, graceMs: 220 }
      sfx('block')
      addFx({ kind: 'ring', pos: [tgt.pos[0], tgt.pos[1] + 0.2, 0], color: '#fde047', ttl: 260, radius: 1.3 })
      return
    }
  }
  // 持有大招資格時，按「特招」且不推方向（Neutral B）直接開大招（同大亂鬥 Final Smash）
  const neutralDir = Math.abs(inp.moveX) < 0.35 && Math.abs(inp.moveY) < 0.35
  if (inp.pressed.skill1 && f.ultReady && neutralDir && tryStartSkill(f, 'ult', inp)) return
  // 普攻 + 特招 同按 = 蓄力重擊
  if (((inp.pressed.attack && inp.held.skill1) || (inp.pressed.skill1 && inp.held.attack)) && tryStartSkill(f, 'smash', inp)) return
  // 小跳攻擊（同大亂鬥 跳躍 + 普攻 同時按）：立即以 72% 跳躍高度起跳並接空中普攻
  const speedMult = CHARACTERS[f.character]?.speedMult ?? 1
  const jumpMult = 0.9 + 0.1 * speedMult
  const coyotePre = !f.grounded && (f.coyoteMs ?? 0) > 0
  if ((f.grounded || coyotePre) && (inp.pressed.jump || (f.jumpBufferMs ?? 0) > 0) && inp.pressed.attack) {
    rb.setLinvel({ x: lv.x, y: JUMP_VEL * 0.72 * jumpMult, z: 0 }, true)
    f.grounded = false
    f.jumpsLeft = MAX_JUMPS - 1
    f.jumpBufferMs = 0
    f.coyoteMs = 0
    sfx('jump', 0)
    addFx({ kind: 'ring', pos: [t.x, t.y - 0.45, 0], color: '#ffffff', ttl: 220, radius: 0.75 })
    if (tryStartSkill(f, 'attack', inp)) return
  }
  for (const slot of SLOTS) if (inp.pressed[slot] && tryStartSkill(f, slot, inp)) return

  // 站在層板上向下推（約 0.1 秒）→ 穿下去
  f.downMs = inp.moveY < -0.7 ? f.downMs + dtMs : 0
  if (f.grounded && f.pos[1] > 0.8 && f.downMs > 90) { f.dropMs = DROP_THROUGH_MS; f.grounded = false; f.downMs = 0; f.coyoteMs = 0 }

  let vy = lv.y
  const wantJump = inp.pressed.jump || (f.jumpBufferMs ?? 0) > 0
  const coyote = !f.grounded && (f.coyoteMs ?? 0) > 0
  if (wantJump && (f.jumpsLeft > 0 || coyote)) {
    const groundJump = f.grounded || coyote
    vy = JUMP_VEL * jumpMult
    f.jumpsLeft = groundJump ? MAX_JUMPS - 1 : Math.max(0, f.jumpsLeft - 1)
    f.jumpBufferMs = 0
    f.coyoteMs = 0
    sfx('jump', groundJump ? 0 : 1)
    addFx({ kind: 'ring', pos: [t.x, t.y - 0.45, 0], color: '#ffffff', ttl: 250, radius: 0.9 })
  }
  if (!f.grounded && inp.moveY < -0.5 && vy < 2) vy = Math.max(vy, -22) - 40 * dt // 快速下墜

  const speed = (f.grounded ? RUN_SPEED : AIR_SPEED) * f.slowFactor * speedMult
  const target = inp.moveX * speed
  const accel = f.grounded ? GROUND_ACCEL : inp.moveX !== 0 ? AIR_ACCEL : 4
  const vx = lv.x + clamp(target - lv.x, -accel * dt, accel * dt)
  rb.setLinvel({ x: vx, y: vy, z: 0 }, true)
  if (Math.abs(inp.moveX) > 0.2) f.facing = [Math.sign(inp.moveX), 0]
  setFsm(f, !f.grounded ? 'JUMP' : Math.abs(inp.moveX) > 0.1 ? 'RUN' : 'IDLE')
}

function explodeProjectile(p: import('./types').Projectile) {
  sfx('boom')
  const att = store().fighters[p.owner]
  for (const id of queryBall(p.pos, p.explodeRadius)) {
    if (id === p.owner || p.source.hitSet.has(id)) continue
    const tgt = store().fighters[id]
    if (!tgt.alive || tgt.invulnMs > 0) continue
    queueHit(att, tgt, p.source, p.pos)
  }
  hitBallIfOverlap(att, p.source, p.pos, p.explodeRadius)
  addFx({ kind: 'ring', pos: [...p.pos], color: p.color, ttl: 380, radius: p.explodeRadius })
  addFx({ kind: 'burst', pos: [...p.pos], color: p.color, ttl: 500, count: 26, speed: 8, size: 0.22 })
  runtime.shake = Math.max(runtime.shake, 0.25)
}

function updateProjectiles(dt: number) {
  const dtMs = dt * 1000
  for (const p of [...runtime.projectiles]) {
    p.ttlMs -= dtMs
    if (p.steerable && p.steerable > 0) {
      const inp = latestInputs[p.owner]
      if (inp && Math.hypot(inp.moveX, inp.moveY) > 0.2) {
        const targetAng = Math.atan2(inp.moveY, inp.moveX)
        const curAng = Math.atan2(p.vel[1], p.vel[0])
        const spd = Math.hypot(p.vel[0], p.vel[1]) || 12
        const diff = Math.atan2(Math.sin(targetAng - curAng), Math.cos(targetAng - curAng))
        const step = clamp(diff, -p.steerable * dt, p.steerable * dt)
        const nextAng = curAng + step
        p.vel[0] = Math.cos(nextAng) * spd
        p.vel[1] = Math.sin(nextAng) * spd
      }
    }
    p.vel[1] += p.gravity * dt
    const prevX = p.pos[0]
    const prevY = p.pos[1]
    const dx = p.vel[0] * dt
    const dy = p.vel[1] * dt
    p.pos = [prevX + dx, prevY + dy, 0]
    p.traveled = (p.traveled ?? 0) + Math.hypot(dx, dy)
    const outOfRange = p.traveled >= (p.maxRange ?? 11) && !(Math.abs(p.vel[0]) < 0.5 && p.vel[1] < 0)
    p.trailMs -= dtMs
    if (p.trailMs <= 0 && p.radius >= 0.4) {
      p.trailMs = 50
      addFx({ kind: 'afterimage', pos: [...p.pos], color: p.color, ttl: 260, shape: 'sphere', size: p.radius * 1.6 })
    }
    let consumed = false
    let exploded = false
    if (hitBallIfOverlap(store().fighters[p.owner], p.source, p.pos, p.radius) && !p.pierce) consumed = true
    for (const id of consumed ? [] : queryBall(p.pos, p.radius)) {
      if (id === p.owner || p.source.hitSet.has(id)) continue
      const tgt = store().fighters[id]
      const att = store().fighters[p.owner]
      if (tgt.alive && (tgt.reflectMs ?? 0) > 0) {
        p.owner = tgt.id
        p.vel[0] *= -1.4
        p.vel[1] *= -1.1
        p.source.hitSet.clear()
        p.source.dmgMult *= 1.4
        p.color = '#38bdf8'
        sfx('perfect')
        addFx({ kind: 'ring', pos: [...tgt.pos], color: '#38bdf8', ttl: 260, radius: 1.7, plane: 'vertical' })
        break
      }
      if (!tgt.alive || tgt.invulnMs > 0) continue
      if (p.explodeRadius > 0) { exploded = true; consumed = true; break }
      queueHit(att, tgt, p.source, p.pos)
      if (!p.pierce) { consumed = true; break }
    }
    // 碰撞場地主體與立體建築牆面（solids），含子步進檢測避免高速穿透（僅大招貫穿奧義不擋牆）
    const stage = getStage()
    if (!consumed && !p.source.def.requiresUlt) {
      let hitWall = false
      for (let step = 1; step <= 3 && !hitWall; step++) {
        const t = step / 3
        const cx = prevX + dx * t
        const cy = prevY + dy * t
        if (stage.solids?.some((s) => Math.abs(cx - s.x) <= s.w / 2 + p.radius * 0.55 && Math.abs(cy - s.y) <= s.h / 2 + p.radius * 0.55)) {
          p.pos = [cx, cy, 0]
          hitWall = true
        } else if (Math.abs(cx) <= stage.half.x + p.radius * 0.35 && cy <= 0.05 && cy >= -stage.half.y * 2 - 0.8) {
          p.pos = [cx, cy, 0]
          hitWall = true
        }
      }
      if (hitWall) {
        consumed = true
        if (p.explodeRadius > 0) exploded = true
      }
    }
    if (!consumed && p.gravity !== 0 && p.vel[1] < 0 && p.pos[1] <= p.radius && Math.abs(p.pos[0]) <= stage.half.x) { consumed = true; exploded = true }
    if (!consumed && outOfRange) { consumed = true; if (p.explodeRadius > 0) exploded = true }
    if (!consumed && p.ttlMs <= 0 && p.explodeRadius > 0) { consumed = true; exploded = true }
    if (exploded && p.explodeRadius > 0) explodeProjectile(p)
    else if (consumed) addFx({ kind: 'burst', pos: [...p.pos], color: p.color, ttl: 400, count: 16, speed: 6, size: 0.18 })
    const blast = stage.blast ?? BLAST
    if (consumed || p.ttlMs <= 0 || Math.abs(p.pos[0]) > blast.x || p.pos[1] < blast.minY || p.pos[1] > blast.maxY) removeProjectile(p.id)
  }
}

function updateZones(dt: number) {
  const fs = store().fighters
  for (const z of [...runtime.zones]) {
    z.ttlMs -= dt * 1000
    if (z.ttlMs <= 0) { removeZone(z.id); continue }
    if (!z.damagePerSec && !z.pull) continue
    for (const id of getActiveFighterIds()) {
      const f = fs[id]
      if (id === z.owner || !f.alive || f.fsm === 'LEDGE') continue
      if (Math.abs(f.pos[0] - z.pos[0]) >= z.radius || Math.abs(f.pos[1] - z.pos[1]) >= 3) continue
      if (z.damagePerSec && f.invulnMs <= 0) {
        f.damage = Math.min(MAX_DAMAGE, f.damage + z.damagePerSec * dt)
        f.flashMs = Math.max(f.flashMs, 40)
      }
      if (z.pull) {
        const rb = runtime.bodies[id]
        const v = rb?.linvel()
        if (rb && v) rb.setLinvel({ x: v.x + Math.sign(z.pos[0] - f.pos[0]) * z.pull * dt, y: v.y, z: 0 }, true)
      }
    }
  }
}

function updateSummons(dt: number) {
  const fs = store().fighters
  const dtMs = dt * 1000
  for (const s of [...runtime.summons]) {
    const owner = fs[s.owner]
    s.ttlMs -= dtMs
    if (!owner?.alive || s.ttlMs <= 0) {
      addFx({ kind: 'burst', pos: [...s.pos], color: s.color, ttl: 260, count: 10, speed: 4.5, size: 0.14 })
      removeSummon(s.id)
      continue
    }

    const target = nearestEnemyOf(s.owner)
    const bob = Math.sin(runtime.stageTime * 4 + s.id) * 0.22
    let goalX = owner.pos[0] - owner.facing[0] * 1.15
    let goalY = owner.pos[1] + 1.4 + bob

    if (s.behavior === 'shoot') {
      goalX = owner.pos[0] + owner.facing[0] * 0.9
      goalY = owner.pos[1] + 1.55 + bob
    } else if (s.behavior === 'chase' && target) {
      goalX = target.pos[0]
      goalY = target.pos[1] + 0.35 + bob * 0.6
    } else if (s.behavior === 'orbit' && target) {
      const dxT = target.pos[0] - owner.pos[0]
      const dyT = target.pos[1] - owner.pos[1]
      if (Math.hypot(dxT, dyT) < 3.4) {
        goalX = target.pos[0]
        goalY = target.pos[1] + 0.3
      }
    }

    const dx = goalX - s.pos[0]
    const dy = goalY - s.pos[1]
    const distGoal = Math.hypot(dx, dy) || 1
    const moveSpd = Math.min(s.speed, distGoal * 8)
    s.vel[0] = (dx / distGoal) * moveSpd
    s.vel[1] = (dy / distGoal) * moveSpd
    s.pos[0] += s.vel[0] * dt
    s.pos[1] += s.vel[1] * dt

    s.fireCdMs -= dtMs
    if (s.fireCdMs > 0 || !target || !target.alive || target.invulnMs > 0) continue

    const tx = target.pos[0] - s.pos[0]
    const ty = target.pos[1] - s.pos[1]
    const distTarget = Math.hypot(tx, ty)

    if (s.behavior === 'shoot') {
      if (distTarget <= 13 && distTarget > 0.1) {
        const pSpd = 18
        addProjectile({
          owner: s.owner,
          pos: [...s.pos],
          vel: [(tx / distTarget) * pSpd, (ty / distTarget) * pSpd, 0],
          radius: 0.28,
          ttlMs: 950,
          pierce: false,
          color: s.color,
          maxRange: 13.5,
          source: { def: s.source.def, hitSet: new Set(), kbMult: s.source.kbMult, dmgMult: s.source.dmgMult },
        })
        addFx({ kind: 'ring', pos: [...s.pos], color: s.color, ttl: 180, radius: 0.75, plane: 'vertical' })
        s.fireCdMs = s.fireIntervalMs
      }
    } else if (distTarget <= s.radius + 0.9) {
      s.source.hitSet.clear()
      queueHit(owner, target, s.source, s.pos)
      addFx({ kind: 'burst', pos: [...s.pos], color: s.color, ttl: 260, count: 12, speed: 5.5, size: 0.16 })
      if (s.explodeOnHit) {
        addFx({ kind: 'ring', pos: [...s.pos], color: s.color, ttl: 320, radius: 1.9, plane: 'vertical' })
        sfx('boom')
        removeSummon(s.id)
      } else {
        s.fireCdMs = s.fireIntervalMs
      }
    }
  }
}

let uiTimer = 0
function publishUi(dt: number, force = false) {
  uiTimer -= dt
  if (uiTimer > 0 && !force) return
  uiTimer = 0.08
  const { fighters, ui } = store()
  const next = {} as Record<FighterId, UiFighter>
  for (const id of ALL_FIGHTER_IDS) {
    const f = fighters[id]
    const c = CHARACTERS[f.character]
    next[id] = {
      name: c.name, color: c.color, damage: Math.round(f.damage), stocks: f.stocks,
      energy: Math.round(f.energy), shield: Math.round(f.shield), fsm: f.fsm,
      charge: f.skill?.chargeRatio ?? 0, ultReady: f.ultReady,
      combo: f.comboCount, stats: { ...f.stats, damageDealt: Math.round(f.stats.damageDealt), damageTaken: Math.round(f.stats.damageTaken) },
      slots: (['attack', 'skill1', 'skill2', 'ult'] as SkillSlot[]).flatMap((slot) => {
        const d = getSkill(c.loadout[slot])
        if (!d) return []
        const cd = d.cooldownMs ? (f.cooldowns[d.id] ?? 0) / (d.cooldownMs * COOLDOWN_SCALE) : 0
        return [{ slot, name: d.name, cd, cost: 0, locked: !!d.requiresUlt && !f.ultReady }]
      }),
    }
  }
  void ui
  store().publishUi(next)
}

export function stepSimulation(rawDt: number) {
  const s = store()
  if (s.paused || s.phase !== 'playing') stopAllRumble()
  if (s.paused) return // 暫停：整個模擬凍結
  if (s.ultCutin && performance.now() < s.ultCutin.until) return // 大招特寫動畫期間凍結全場動作
  let dt = Math.min(rawDt, 1 / 30)
  if (s.gameFinish) {
    if (useNetStore.getState().role !== 'guest' && performance.now() >= s.gameFinish.until) {
      s.endMatch(s.gameFinish.winner)
      broadcastStateIfHost(true)
      return
    }
    dt *= 0.22 // 結束瞬間慢動作演出
  }
  runtime.hitstopMs = Math.max(0, runtime.hitstopMs - dt * 1000)
  stepPlatforms(dt)
  if (debugKeys.toggle) { debugKeys.toggle = false; store().toggleDebug() }
  if (debugKeys.giveUlt) { debugKeys.giveUlt = false; for (const id of getActiveFighterIds()) s.fighters[id].ultReady = true }
  for (const d of runtime.debugSpheres) d.ttl -= dt * 1000
  runtime.debugSpheres = runtime.debugSpheres.filter((d) => d.ttl > 0)
  runtime.shake *= Math.pow(0.001, dt) // 指數衰減
  if (s.phase !== 'playing') { ballTimer = 0; ballCooldown = 0; pending = []; ledgeOwner['-1'] = null; ledgeOwner['1'] = null; publishUi(dt); return }
  if (s.countdown === '3' || s.countdown === '2' || s.countdown === '1') {
    for (const id of getActiveFighterIds()) {
      const f = s.fighters[id]
      if (!f.alive && f.firstSpawn) respawn(f)
    }
    publishUi(dt)
    return
  }
  if (useNetStore.getState().role === 'guest') {
    sendGuestInput(readInput('p1'))
    publishUi(dt)
    return
  }
  for (const id of getActiveFighterIds()) updateFighter(s.fighters[id], dt)
  updateProjectiles(dt)
  resolveHits()
  separateFighters(dt)
  updateBall(dt)
  updateZones(dt)
  updateSummons(dt)
  stepGimmicks(dt)
  stepSteveBlocks(dt)
  stepMechanics(dt, s.fighters)
  publishUi(dt)
  broadcastStateIfHost()
}

export { removeFx, GRAVITY }
