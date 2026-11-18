import { interactionGroups } from '@react-three/rapier'
import { CHARACTERS } from './characters'
import {
  AIR_ACCEL, AIR_SPEED, BLAST, COOLDOWN_SCALE, LEDGE_HANG_MS, LEDGE_REGRAB_MS, LEDGE_X, ENERGY_MAX, ENERGY_REGEN, GRAVITY, GROUND_ACCEL, HALF, JUMP_VEL,
  MAX_DAMAGE, MAX_JUMPS, DROP_THROUGH_MS, PLATFORMS, RUN_SPEED, SHIELD_MAX, SPAWN_X, STAGE_HALF,
} from './constants'
import { cpuInput, resetCpu } from './ai'
import { sfx } from './audio'
import { debugKeys, readInput, rumble, type InputFrame } from './input'
import { addFx, addProjectile, addZone, removeFx, removeProjectile, removeZone, runtime } from './runtime'
import { getSkill } from './skills'
import { useGameStore } from './store'
import type {
  ActiveSkill, FighterId, FighterState, FsmState, HitSource, HitboxDef, SkillContext, SkillDef, SkillSlot, UiFighter, Vec3,
} from './types'
import { FIGHTER_IDS } from './types'

const SLOTS: ('ult' | 'skill2' | 'skill1' | 'attack')[] = ['ult', 'skill2', 'skill1', 'attack'] // 同幀多鍵時的優先順序
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const store = () => useGameStore.getState()
const other = (id: FighterId): FighterId => (id === 'p1' ? 'p2' : 'p1')

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

/** 穿透式層板：腳在頂面之上且不在上衝時才與該層板碰撞（每片層板各一個碰撞群組） */
const lastMask = new Map<FighterId, number>()
const lastGroups = new Map<FighterId, number[]>()
function updatePlatformCollision(f: FighterState, rb: any) {
  const feet = f.pos[1] - HALF
  const prev = lastGroups.get(f.id) ?? []
  const groups = [0]
  if (f.dropMs <= 0 && f.vel[1] <= 1) {
    PLATFORMS.forEach((p, i) => {
      // 遲滯：已經在碰撞中的層板，腳在頂面下 0.5 內都維持碰撞，避免高速落下時一幀就穿過去
      const thr = prev.includes(2 + i) ? p.y - 0.5 : p.y - 0.12
      if (feet >= thr) groups.push(2 + i)
    })
  }
  lastGroups.set(f.id, groups)
  const mask = interactionGroups(1, groups)
  if (lastMask.get(f.id) !== mask) { rb.collider(0)?.setCollisionGroups(mask); lastMask.set(f.id, mask) }
}

function checkGround(f: FighterState): boolean {
  const ph = runtime.physics, rb = runtime.bodies[f.id]
  if (!ph || !rb) return false
  const t = rb.translation()
  const ray = new ph.rapier.Ray({ x: t.x, y: t.y, z: t.z }, { x: 0, y: -1, z: 0 })
  // 只與場地（group 0）相交，忽略對手
  // 射線只會打到「目前有碰撞」的場地 / 層板（穿過中的層板不算地面）
  const hit = ph.world.castRay(ray, HALF + 0.06, true, undefined, lastMask.get(f.id) ?? interactionGroups(1, [0]), undefined, rb)
  return !!hit && f.vel[1] <= 0.5
}

function facingWorld(f: FighterState, local: Vec3): Vec3 {
  // 2.5D：z 軸鎖定，局部 z=前方(±x)，局部 x(右)忽略
  return [f.facing[0] * local[2], local[1], 0]
}

// ---------------------------------------------------------------- 抓邊
const ledgeOwner: Record<string, FighterId | null> = { '-1': null, '1': null }
const hangPos = (side: number): [number, number] => [side * (LEDGE_X + 0.55), -0.5]
function releaseLedge(f: FighterState) {
  if (f.ledgeSide !== 0 && ledgeOwner[String(f.ledgeSide)] === f.id) ledgeOwner[String(f.ledgeSide)] = null
  f.ledgeSide = 0
}
function tryGrabLedge(f: FighterState, inp: InputFrame): boolean {
  if (f.grounded || f.ledgeCd > 0 || f.vel[1] > 2) return false
  for (const side of [-1, 1] as const) {
    const dx = (f.pos[0] - side * LEDGE_X) * side // >0 = 在平台外側
    if (dx < -0.4 || dx > 2.3 || f.pos[1] > 0.4 || f.pos[1] < -2.6) continue
    if (ledgeOwner[String(side)]) continue // 已被占用
    if (inp.moveY < -0.5) continue // 按住「下」= 刻意不抓邊
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
    addFx({ kind: 'ring', pos: [side * LEDGE_X, 0, 0], color: '#ffe066', ttl: 350, radius: 1.2 })
    addFx({ kind: 'burst', pos: [side * LEDGE_X, 0, 0], color: '#ffe066', ttl: 300, count: 8, speed: 3, size: 0.12 })
    rumble(f.id, 0.25, 60)
    sfx('ledge')
    return true
  }
  return false
}
function updateLedge(f: FighterState, dt: number, inp: InputFrame) {
  const rb = runtime.bodies[f.id]!
  const side = f.ledgeSide || 1
  const [hx, hy] = hangPos(side)
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
    const cx = side * (LEDGE_X - 0.6)
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
  roll: { total: 440, invuln: 320, speed: 9.5, move: 300 },
  spot: { total: 400, invuln: 280, speed: 0, move: 0 },
  air: { total: 440, invuln: 320, speed: 9, move: 260 },
} as const
function startDodge(f: FighterState, kind: 'roll' | 'spot' | 'air', dx: number, dy: number) {
  const d = DODGE[kind]
  const rb = runtime.bodies[f.id]!
  f.dodgeKind = kind
  f.dodgeMs = d.total
  f.dodgeDir = [dx, dy]
  f.invulnMs = Math.max(f.invulnMs, d.invuln)
  if (kind === 'roll' && dx) f.facing = [dx, 0]
  if (kind === 'air') { f.airDodgeUsed = true; rb.setGravityScale(0, true) }
  rb.setLinvel({ x: 0, y: 0, z: 0 }, true)
  setFsm(f, 'DODGE')
  sfx('dodge')
  addFx({ kind: 'ring', pos: [f.pos[0], f.pos[1] - (kind === 'air' ? 0 : 0.45), 0], color: '#bfe6ff', ttl: 260, radius: 1.0 })
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
  return {
    caster: f, def: sk.def, phase: sk.phase, phaseMs: sk.phaseMs, dt, chargeRatio: sk.chargeRatio,
    scratch: sk.scratch, forward: [f.facing[0], 0, 0],
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
      gravity: p.gravity, explodeRadius: p.explodeRadius,
      source: { def: sk.def, hitSet: new Set(), kbMult: sk.kbMult, dmgMult: sk.dmgMult },
    }),
    fx: (spec) => addFx(spec),
    nearestEnemy: () => {
      const e = store().fighters[other(f.id)]
      return e.alive ? e : null
    },
    isGrounded: () => f.grounded,
    strike: (override) => {
      if (sk.def.hitbox) runHitbox(f, sk, { ...sk.def.hitbox, ...override })
    },
    endActive: () => { sk.ended = true },
    shake: (a) => { runtime.shake = Math.max(runtime.shake, a) },
  }
}

function tryStartSkill(f: FighterState, slot: SkillSlot, inp: InputFrame): boolean {
  const lo = CHARACTERS[f.character].loadout
  // 方向 + 招式鍵：上 / 下變化招（沒有定義就用原本的招）
  // 上 / 下優先，其次左右（左右共用同一招，稱為 side）
  const dir = inp.moveY > 0.6 ? 'up' : inp.moveY < -0.6 ? 'down' : Math.abs(inp.moveX) > 0.6 ? 'side' : null
  const dirKey = dir ? `${slot}:${dir}` : null
  const def = (dirKey ? getSkill(lo[dirKey]) : undefined) ?? getSkill(lo[slot])
  if (!def) return false
  const isUpSpecial = slot === 'skill1' && dir === 'up' && def === getSkill(lo['skill1:up'])
  if (isUpSpecial && !f.grounded && f.upSpecialUsed) return false // 滯空時只能用一次
  if ((f.cooldowns[def.id] ?? 0) > 0 || f.energy < def.energyCost) return false
  if (def.requiresUlt && !f.ultReady) return false
  if (isUpSpecial && !f.grounded) f.upSpecialUsed = true
  startSkill(f, def, slot, inp)
  return true
}

function startSkill(f: FighterState, def: SkillDef, slot: SkillSlot, inp: InputFrame) {
  f.energy -= def.energyCost
  if (def.requiresUlt) { f.ultReady = false; sfx('ultStart') }
  else if (def.projectile) sfx('shoot')
  else sfx('swing', Math.min(1, def.damage / 25))
  if (def.cooldownMs) f.cooldowns[def.id] = def.cooldownMs * COOLDOWN_SCALE
  // 面向：有移動輸入就朝輸入方向，否則自動朝向最近的對手（輔助瞄準）
  if (Math.abs(inp.moveX) > 0.3) f.facing = [Math.sign(inp.moveX), 0]
  else {
    const e = store().fighters[other(f.id)]
    if (e.alive && Math.abs(e.pos[0] - f.pos[0]) < 6) f.facing = [e.pos[0] >= f.pos[0] ? 1 : -1, 0]
  }
  f.skill = {
    def, slot, phase: 'startup', phaseMs: 0, hitSet: new Set(), kbMult: 1, dmgMult: 1,
    chargeMs: 0, chargeRatio: 0, released: !def.charge, ended: false, scratch: {},
  }
  f.comboBufferMs = 0
  setFsm(f, 'ATTACK_STARTUP')
  def.hooks?.onStart?.(makeCtx(f, f.skill, 0))
}

function endSkill(f: FighterState) {
  const sk = f.skill
  if (!sk) return
  const rb = runtime.bodies[f.id]
  if (rb) {
    sk.def.hooks?.onEnd?.(makeCtx(f, sk, 0))
    rb.setGravityScale(1, true)
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
    sk.kbMult = lerp(ch.knockbackMult[0], ch.knockbackMult[1], sk.chargeRatio)
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
  const samples = hb.length ? Math.max(1, Math.ceil(hb.length / (hb.radius * 1.2))) : 1
  for (let i = 0; i < samples; i++) {
    const local: Vec3 = [hb.offset[0], hb.offset[1], hb.offset[2] + (hb.length ? (hb.length * i) / Math.max(1, samples - 1) : 0)]
    const w = facingWorld(f, local)
    const center: Vec3 = [f.pos[0] + w[0], f.pos[1] + w[1], 0]
    for (const id of queryBall(center, hb.radius)) {
      if (id === f.id || sk.hitSet.has(id)) continue
      const t = store().fighters[id]
      if (!t.alive) continue
      queueHit(f, t, sk, center)
    }
    hitBallIfOverlap(f, sk, center, hb.radius)
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

// ---------------------------------------------------------------- 大招球（Smash Ball）
let ballTimer = 4
function hitBallIfOverlap(att: FighterState, src: HitSource, center: Vec3, r: number): boolean {
  const b = runtime.ball
  if (!b || src.hitSet.has('ball') || b.flashMs > 0) return false
  if (Math.hypot(center[0] - b.pos[0], center[1] - b.pos[1]) > r + b.radius) return false
  src.hitSet.add('ball')
  b.hp -= 1
  b.flashMs = 450 // 被打中後短暫無法再被打
  sfx('ballHit')
  const dx = Math.sign(b.pos[0] - center[0]) || att.facing[0]
  b.vel = [dx * 5, 2.5, 0]
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
    ballTimer = 15
  }
  return true
}
function updateBall(dt: number) {
  const b = runtime.ball
  if (!b) {
    ballTimer -= dt
    if (ballTimer <= 0) {
      addFx({ kind: 'ring', pos: [0, 7, 0], color: '#ffe066', ttl: 700, radius: 3 })
      sfx('ballSpawn')
    runtime.ball = { pos: [(Math.random() - 0.5) * 12, 7, 0], vel: [0, 0, 0], hp: 7, maxHp: 7, radius: 0.6, ttlMs: 20000, turnMs: 0, flashMs: 0 }
    }
    return
  }
  const ms = dt * 1000
  b.ttlMs -= ms; b.flashMs = Math.max(0, b.flashMs - ms); b.turnMs -= ms
  if (b.turnMs <= 0) {
    b.turnMs = 1500 + Math.random() * 1500
    const a = Math.random() * Math.PI * 2
    b.vel = [Math.cos(a) * 4.2, Math.sin(a) * 2.6, 0]
  }
  b.pos = [b.pos[0] + b.vel[0] * dt, b.pos[1] + b.vel[1] * dt, 0]
  if (Math.abs(b.pos[0]) > 11) { b.pos[0] = Math.sign(b.pos[0]) * 11; b.vel[0] *= -1 }
  if (b.pos[1] < 2.5 || b.pos[1] > 9) { b.pos[1] = clamp(b.pos[1], 2.5, 9); b.vel[1] *= -1 }
  if (b.ttlMs <= 0) { addFx({ kind: 'burst', pos: [...b.pos], color: '#999999', ttl: 500, count: 20, speed: 4, size: 0.15 }); runtime.ball = null; ballTimer = 12 }
}

/** 角色互相重疊時輕微推開（角色之間沒有剛體碰撞） */
function separateFighters(dt: number) {
  const { p1: a, p2: b } = store().fighters
  const ra = runtime.bodies.p1, rb = runtime.bodies.p2
  if (!a.alive || !b.alive || !ra || !rb) return
  const free = (f: FighterState) => f.fsm !== 'HITSTUN' && f.fsm !== 'ATTACK_ACTIVE'
  if (!free(a) || !free(b)) return
  const ta = ra.translation(), tb = rb.translation()
  const dx = tb.x - ta.x
  if (Math.abs(tb.y - ta.y) >= 0.95 || Math.abs(dx) >= 0.95) return
  const push = ((0.95 - Math.abs(dx)) / 2) * Math.min(1, dt * 12)
  const dir = dx === 0 ? 1 : Math.sign(dx)
  ra.setTranslation({ x: ta.x - dir * push, y: ta.y, z: 0 }, true)
  rb.setTranslation({ x: tb.x + dir * push, y: tb.y, z: 0 }, true)
}

function updateSkill(f: FighterState, dt: number, inp: InputFrame) {
  const sk = f.skill!
  const dtMs = dt * 1000
  const rb = runtime.bodies[f.id]!
  // 施放中水平速度快速衰減（hook 可在 onTick 覆寫）
  const v = rb.linvel()
  const k = Math.pow(0.8, dt * 60)
  rb.setLinvel({ x: v.x * k, y: v.y, z: 0 }, true)

  // 連段輸入緩衝
  if (sk.def.chain && inp.pressed.attack && sk.phase !== 'recovery') f.comboBufferMs = 250

  // 同按升級：先按普攻/特招，約 0.1 秒內補按另一個 → 改成蓄力重擊（退還原招式的消耗）
  if (sk.phase === 'startup' && sk.phaseMs < 110 && (sk.slot === 'attack' || sk.slot === 'skill1')) {
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
      // 重擊（普攻+特招同按）只要任一鍵還按著就持續蓄力
      const held = sk.slot === 'smash' ? inp.held.attack || inp.held.skill1 : inp.held[sk.slot]
      if (held && sk.chargeMs < sk.def.charge.maxMs) {
        sk.chargeMs += dtMs
        sfx('charge', sk.chargeRatio)
      }
      sk.chargeRatio = clamp(sk.chargeMs / sk.def.charge.maxMs, 0, 1)
      if (!held || sk.chargeMs >= sk.def.charge.maxMs) sk.released = true
      else sk.phaseMs = 0 // 蓄力中：前搖計時暫停
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
      sk.phase = 'recovery'; sk.phaseMs = 0
      setFsm(f, 'ATTACK_RECOVERY')
    }
  } else {
    sk.phaseMs += dtMs
    sk.def.hooks?.onTick?.(makeCtx(f, sk, dt))
    const next = getSkill(sk.def.chain)
    if (next && (inp.pressed.attack || f.comboBufferMs > 0)) {
      endSkill(f)
      startSkill(f, next, 'attack', inp)
      return
    }
    if (sk.phaseMs >= sk.def.recoveryMs) endSkill(f)
  }
}

// ---------------------------------------------------------------- combat
function applyHit(att: FighterState, tgt: FighterState, src: HitSource, center: Vec3, _kind: string) {
  if (tgt.invulnMs > 0 || !tgt.alive) return
  src.hitSet.add(tgt.id)
  const def = src.def
  const dmg = def.damage * src.dmgMult
  const kb = def.knockback
  const trb = runtime.bodies[tgt.id]!

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
      sfx('perfect')
      rumble(tgt.id, 0.5, 80)
    }
    trb.setLinvel({ x: dir[0] * 4, y: 0, z: 0 }, true)
    addFx({ kind: 'ring', pos: [tgt.pos[0], tgt.pos[1], 0], color: '#8fd0ff', ttl: 220, radius: 1.1, plane: 'vertical' })
    if (tgt.shield <= 0) { tgt.shield = 0; tgt.hitstunMs = 1500; endSkill(tgt); setFsm(tgt, 'HITSTUN'); sfx('shieldBreak') }
    return
  }
  tgt.damage = Math.min(MAX_DAMAGE, tgt.damage + dmg)
  const speed = (kb.base + kb.scaling * (tgt.damage / 100)) * src.kbMult
  if (tgt.skill) endSkill(tgt) // 受擊打斷施放
  trb.setGravityScale(1, true)
  trb.setLinvel({ x: dir[0] * speed, y: dir[1] * speed, z: 0 }, true)
  tgt.hitstunMs = kb.hitstunMs ?? clamp(120 + speed * 22, 160, 2200)
  setFsm(tgt, 'HITSTUN')
  tgt.flashMs = 160
  sfx('hit', speed / 40)
  att.energy = Math.min(ENERGY_MAX, att.energy + dmg * 1.2)
  tgt.energy = Math.min(ENERGY_MAX, tgt.energy + dmg * 0.6)
  runtime.shake = Math.max(runtime.shake, Math.min(0.9, speed * 0.02))
  rumble(tgt.id, 0.3 + speed * 0.02, 100 + speed * 5)
  rumble(att.id, 0.2, 60)
  addFx({ kind: 'burst', pos: [tgt.pos[0], tgt.pos[1], 0], color: '#ffffff', ttl: 350, count: 10 + Math.min(20, Math.round(speed)), speed: 3 + speed * 0.25, size: 0.14 })
  if (att.skill && att.skill.def === def) def.hooks?.onHit?.(makeCtx(att, att.skill, 0), tgt)
}

// ---------------------------------------------------------------- lifecycle
function ko(f: FighterState) {
  const rb = runtime.bodies[f.id]!
  const p = f.pos
  addFx({ kind: 'burst', pos: [clamp(p[0], -BLAST.x + 1, BLAST.x - 1), clamp(p[1], BLAST.minY + 1, BLAST.maxY - 1), 0], color: CHARACTERS[f.character].color, ttl: 900, count: 70, speed: 14, size: 0.35 })
  runtime.shake = 1
  sfx('ko')
  rumble(f.id, 1, 400)
  if (f.skill) endSkill(f)
  releaseLedge(f)
  f.stocks -= 1
  f.ultReady = false
  f.damage = 0
  f.alive = false
  f.respawnMs = 1300
  rb.setEnabled(false)
  if (f.stocks <= 0) store().endMatch(other(f.id))
}

function respawn(f: FighterState) {
  const rb = runtime.bodies[f.id]!
  const first = f.firstSpawn
  f.firstSpawn = false
  rb.setEnabled(true)
  if (first) resetCpu(f.id)
  rb.setTranslation({ x: first ? SPAWN_X[f.id] : 0, y: first ? 1 : 9, z: 0 }, true)
  rb.setLinvel({ x: 0, y: 0, z: 0 }, true)
  rb.setGravityScale(1, true)
  f.alive = true
  f.invulnMs = first ? 300 : 2500
  f.hitstunMs = 0
  f.slowFactor = 1
  f.shield = SHIELD_MAX
  f.skill = null
  releaseLedge(f)
  f.ledgeCd = 0
  f.upSpecialUsed = false
  f.airDodgeUsed = false
  f.pos = [first ? SPAWN_X[f.id] : 0, first ? 1 : 9, 0]
  setFsm(f, 'JUMP')
  if (!first) sfx('respawn')
}

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
  if (t.x < -BLAST.x || t.x > BLAST.x || t.y < BLAST.minY || t.y > BLAST.maxY) { ko(f); return }

  f.stateMs += dtMs
  f.invulnMs = Math.max(0, f.invulnMs - dtMs)
  f.flashMs = Math.max(0, f.flashMs - dtMs)
  f.comboBufferMs = Math.max(0, f.comboBufferMs - dtMs)
  f.ledgeCd = Math.max(0, f.ledgeCd - dtMs)
  for (const k in f.cooldowns) f.cooldowns[k] = Math.max(0, f.cooldowns[k] - dtMs)
  f.energy = Math.min(ENERGY_MAX, f.energy + ENERGY_REGEN * dt)
  f.dropMs = Math.max(0, f.dropMs - dtMs)
  updatePlatformCollision(f, rb)
  const wasGrounded = f.grounded
  f.grounded = checkGround(f)
  if (f.grounded) {
    if (!wasGrounded && f.vel[1] < -1.5) sfx('land', Math.min(1, Math.abs(f.vel[1]) / 20))
    f.jumpsLeft = MAX_JUMPS; f.airDodgeUsed = false; f.upSpecialUsed = false
  }
  else if (f.jumpsLeft > 1) f.jumpsLeft = 1 // 滯空時最多只能再跳一次（走下平台、被擊飛也一樣）

  // 減速力場（只影響敵方）
  f.slowFactor = 1
  for (const z of runtime.zones) {
    if (z.owner !== f.id && Math.abs(t.x - z.pos[0]) < z.radius && Math.abs(t.y - z.pos[1]) < 3) f.slowFactor = Math.min(f.slowFactor, z.slowFactor)
  }

  const inp = store().cpu[f.id] ? cpuInput(f.id, dt) : readInput(f.id)
  if (store().phase !== 'playing') return

  if (f.fsm === 'HITSTUN') {
    f.hitstunMs -= dtMs
    const k = Math.pow(f.grounded ? 0.9 : 0.995, dt * 60)
    rb.setLinvel({ x: lv.x * k, y: lv.y, z: 0 }, true)
    if (f.hitstunMs <= 0) setFsm(f, f.grounded ? 'IDLE' : 'JUMP')
    return
  }
  if (f.fsm === 'DODGE') { updateDodge(f, dt); return }
  if (f.fsm === 'SHIELD') {
    if (inp.pressed.jump && f.jumpsLeft > 0) { // 防禦中按跳躍：直接跳出
      f.jumpsLeft--
      sfx('jump', 0)
      rb.setLinvel({ x: lv.x, y: JUMP_VEL, z: 0 }, true)
      setFsm(f, 'JUMP')
      return
    }
    if (f.grounded && f.stateMs > 60) {
      if (Math.abs(inp.moveX) > 0.7) { startDodge(f, 'roll', Math.sign(inp.moveX), 0); return }
      if (inp.moveY < -0.7) { startDodge(f, 'spot', 0, 0); return }
    }
    f.shield -= 14 * dt
    rb.setLinvel({ x: lv.x * 0.7, y: lv.y, z: 0 }, true)
    if (!inp.held.shield || !f.grounded) setFsm(f, f.grounded ? 'IDLE' : 'JUMP')
    else if (f.shield <= 0) { f.shield = 0; f.hitstunMs = 1500; setFsm(f, 'HITSTUN'); sfx('shieldBreak') }
    return
  }
  if (f.fsm === 'LEDGE') { updateLedge(f, dt, inp); return }
  if (isAttackState(f.fsm)) { updateSkill(f, dt, inp); return }

  // ---- 自由狀態 IDLE / RUN / JUMP
  f.shield = Math.min(SHIELD_MAX, f.shield + 10 * dt)
  if (inp.held.shield && f.grounded && f.shield > 5) { setFsm(f, 'SHIELD'); return }
  if (tryGrabLedge(f, inp)) return
  if (!f.grounded && inp.pressed.shield && !f.airDodgeUsed) { // 空中閃避（落地前只能一次）
    const m = Math.hypot(inp.moveX, inp.moveY > 0.5 ? inp.moveY : inp.moveY < -0.5 ? inp.moveY : 0)
    startDodge(f, 'air', m > 0.4 ? inp.moveX / Math.max(1, m) : 0, m > 0.4 ? (Math.abs(inp.moveY) > 0.5 ? Math.sign(inp.moveY) : 0) : 0)
    return
  }
  // 持有大招資格時，按「特招」直接開大招（同大亂鬥 Final Smash）
  if (inp.pressed.skill1 && f.ultReady && tryStartSkill(f, 'ult', inp)) return
  // 普攻 + 特招 同按 = 蓄力重擊
  if (((inp.pressed.attack && inp.held.skill1) || (inp.pressed.skill1 && inp.held.attack)) && tryStartSkill(f, 'smash', inp)) return
  for (const slot of SLOTS) if (inp.pressed[slot] && tryStartSkill(f, slot, inp)) return

  // 站在層板上向下推（約 0.1 秒）→ 穿下去
  f.downMs = inp.moveY < -0.7 ? f.downMs + dtMs : 0
  if (f.grounded && f.pos[1] > 0.8 && f.downMs > 90) { f.dropMs = DROP_THROUGH_MS; f.grounded = false; f.downMs = 0 }

  let vy = lv.y
  if (inp.pressed.jump && f.jumpsLeft > 0) {
    vy = JUMP_VEL; f.jumpsLeft--
    sfx('jump', f.grounded ? 0 : 1)
    addFx({ kind: 'ring', pos: [t.x, t.y - 0.45, 0], color: '#ffffff', ttl: 250, radius: 0.9 })
  }
  if (!f.grounded && inp.moveY < -0.5 && vy < 2) vy = Math.max(vy, -22) - 40 * dt // 快速下墜

  const speed = (f.grounded ? RUN_SPEED : AIR_SPEED) * f.slowFactor
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
    p.vel[1] += p.gravity * dt
    p.pos = [p.pos[0] + p.vel[0] * dt, p.pos[1] + p.vel[1] * dt, 0]
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
      if (!tgt.alive || tgt.invulnMs > 0) continue
      if (p.explodeRadius > 0) { exploded = true; consumed = true; break }
      queueHit(att, tgt, p.source, p.pos)
      if (!p.pierce) { consumed = true; break }
    }
    // 落地（碰到平台頂面）
    if (!consumed && p.gravity !== 0 && p.vel[1] < 0 && p.pos[1] <= p.radius && Math.abs(p.pos[0]) <= STAGE_HALF.x) { consumed = true; exploded = true }
    if (!consumed && p.ttlMs <= 0 && p.explodeRadius > 0) { consumed = true; exploded = true }
    if (exploded && p.explodeRadius > 0) explodeProjectile(p)
    else if (consumed) addFx({ kind: 'burst', pos: [...p.pos], color: p.color, ttl: 400, count: 16, speed: 6, size: 0.18 })
    if (consumed || p.ttlMs <= 0 || Math.abs(p.pos[0]) > BLAST.x || p.pos[1] < BLAST.minY || p.pos[1] > BLAST.maxY) removeProjectile(p.id)
  }
}

function updateZones(dt: number) {
  const fs = store().fighters
  for (const z of [...runtime.zones]) {
    z.ttlMs -= dt * 1000
    if (z.ttlMs <= 0) { removeZone(z.id); continue }
    if (!z.damagePerSec && !z.pull) continue
    for (const id of FIGHTER_IDS) {
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

let uiTimer = 0
function publishUi(dt: number, force = false) {
  uiTimer -= dt
  if (uiTimer > 0 && !force) return
  uiTimer = 0.08
  const { fighters, ui } = store()
  const next = {} as Record<FighterId, UiFighter>
  for (const id of FIGHTER_IDS) {
    const f = fighters[id]
    const c = CHARACTERS[f.character]
    next[id] = {
      name: c.name, color: c.color, damage: Math.round(f.damage), stocks: f.stocks,
      energy: Math.round(f.energy), shield: Math.round(f.shield), fsm: f.fsm,
      charge: f.skill?.chargeRatio ?? 0, ultReady: f.ultReady,
      slots: (['attack', 'skill1', 'skill2', 'ult'] as SkillSlot[]).flatMap((slot) => {
        const d = getSkill(c.loadout[slot])
        if (!d) return []
        const cd = d.cooldownMs ? (f.cooldowns[d.id] ?? 0) / (d.cooldownMs * COOLDOWN_SCALE) : 0
        return [{ slot, name: d.name, cd, cost: d.energyCost, locked: !!d.requiresUlt && !f.ultReady }]
      }),
    }
  }
  void ui
  store().publishUi(next)
}

export function stepSimulation(rawDt: number) {
  if (store().paused) return // 暫停：整個模擬凍結
  const dt = Math.min(rawDt, 1 / 30)
  if (debugKeys.toggle) { debugKeys.toggle = false; store().toggleDebug() }
  const s = store()
  if (debugKeys.giveUlt) { debugKeys.giveUlt = false; for (const id of FIGHTER_IDS) s.fighters[id].ultReady = true }
  for (const d of runtime.debugSpheres) d.ttl -= dt * 1000
  runtime.debugSpheres = runtime.debugSpheres.filter((d) => d.ttl > 0)
  runtime.shake *= Math.pow(0.001, dt) // 指數衰減
  if (s.phase !== 'playing') { ballTimer = 4; pending = []; ledgeOwner['-1'] = null; ledgeOwner['1'] = null; publishUi(dt); return }
  for (const id of FIGHTER_IDS) updateFighter(s.fighters[id], dt)
  updateProjectiles(dt)
  resolveHits()
  separateFighters(dt)
  updateBall(dt)
  updateZones(dt)
  publishUi(dt)
}

export { removeFx, GRAVITY }
