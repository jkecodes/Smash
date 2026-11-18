import { CHARACTERS } from './characters'
import { STAGES } from './stages'
import type { InputFrame } from './input'
import { runtime } from './runtime'
import { getSkill } from './skills'
import { useGameStore } from './store'
import type { Btn, FighterId, FighterState, SkillDef, SkillSlot } from './types'

/**
 * 電腦玩家：每幀產生一份和真人手把/鍵盤完全相同格式的 InputFrame，
 * 所以招式、狀態機、冷卻、能量等規則和真人一模一樣，沒有任何作弊。
 *
 * 難度 1~3：反應時間、防禦機率、回場技巧不同。
 */
const BTNS: Btn[] = ['jump', 'attack', 'skill1', 'skill2', 'ult', 'shield']
const noBtns = (): Record<Btn, boolean> => ({ jump: false, attack: false, skill1: false, skill2: false, ult: false, shield: false })
const rnd = (a: number, b: number) => a + Math.random() * (b - a)
const sign = (n: number) => (n > 0 ? 1 : n < 0 ? -1 : 0)

interface Act { btn: Btn; taps: number; holdMs: number; x: number; y: number; t: number; smash?: boolean }
interface Mem {
  prev: Record<Btn, boolean>
  think: number
  act: Act | null
  shield: number
  jumpCd: number
  ledgeT: number
  ledgeWait: number
  ledgeChoice: number
  enemyAtkSeen: boolean
  idle: number
  strafe: number
  ballT: number
  ballIgnore: number
  shieldTotal: number
  dodge: 'none' | 'roll' | 'spot'
  rollDir: number
  dropT: number
}
const fresh = (): Mem => ({ prev: noBtns(), think: 400, act: null, shield: 0, jumpCd: 0, ledgeT: 0, ledgeWait: 500, ledgeChoice: 0, enemyAtkSeen: false, idle: 0, strafe: 0, ballT: 0, ballIgnore: 0, shieldTotal: 0, dodge: 'none', rollDir: 0, dropT: 0 })
const mem: Record<FighterId, Mem> = { p1: fresh(), p2: fresh() }
export function resetCpu(id: FighterId) { mem[id] = fresh() }

const LEVEL = {
  // [思考間隔最小, 最大(ms)]、防禦機率、是否會用上+特招回場
  1: { think: [480, 900], block: 0.15, recover: 0.5, idle: 0.35 },
  2: { think: [260, 480], block: 0.4, recover: 0.85, idle: 0.15 },
  3: { think: [110, 240], block: 0.7, recover: 1, idle: 0.04 },
} as const

type Dir = 'n' | 'side' | 'up' | 'down'
const lo = (f: FighterState) => CHARACTERS[f.character].loadout
const defFor = (f: FighterState, slot: SkillSlot, dir: Dir): SkillDef | undefined =>
  getSkill(lo(f)[dir === 'n' ? slot : `${slot}:${dir}`])
const usable = (f: FighterState, d: SkillDef) =>
  !(d === getSkill(lo(f)['skill1:up']) && !f.grounded && f.upSpecialUsed) && // 滯空時上+特招只能用一次
  (f.cooldowns[d.id] ?? 0) <= 0 && f.energy >= d.energyCost && (!d.requiresUlt || f.ultReady)
/** 招式大致的有效距離（無判定框者視為遠程投射物） */
const reachOf = (d: SkillDef) => {
  const hb = d.hitbox
  if (!hb) return 7
  return Math.hypot(hb.offset[0], hb.offset[2]) + hb.radius + (hb.length ?? 0)
}

function pickAttack(f: FighterState, e: FighterState): Act | null {
  const dx = e.pos[0] - f.pos[0], adx = Math.abs(dx), dy = e.pos[1] - f.pos[1]
  const toward = sign(dx) || f.facing[0]
  const cands: { slot: SkillSlot; dir: Dir; def: SkillDef; w: number }[] = []
  for (const slot of ['attack', 'skill1', 'skill2'] as SkillSlot[]) {
    for (const dir of ['n', 'side', 'up', 'down'] as Dir[]) {
      const def = defFor(f, slot, dir)
      if (!def || !usable(f, def)) continue
      const reach = reachOf(def)
      let ok = false
      let w = slot === 'attack' ? 3 : slot === 'skill1' ? 1.6 : 1.2
      if (dir === 'n') ok = adx < reach + 0.3 && Math.abs(dy) < 1.4
      else if (dir === 'side') ok = adx > 0.9 && adx < reach + 2.2 && Math.abs(dy) < 1.6
      else if (dir === 'up') { ok = adx < 1.8 && dy > 0.2 && dy < 3.2; w *= 2.5 }
      else { ok = adx < 2.2 && dy < 0.9 && dy > -2.5; w *= 0.8 }
      if (def.charge && adx > 7) ok = false
      if (ok) cands.push({ slot, dir, def, w })
    }
  }
  // 蓄力重擊（普攻+特招同按）：敵人較近時偶爾使用
  if (adx < 2.4 && Math.abs(dy) < 1.4 && Math.random() < 0.12) {
    const d = defFor(f, 'smash', 'side')
    if (d) return { btn: 'attack', taps: 1, holdMs: rnd(150, 900), x: toward, y: 0, t: 0, smash: true }
  }
  if (!cands.length) return null
  let r = Math.random() * cands.reduce((s, c) => s + c.w, 0)
  let pick = cands[0]
  for (const c of cands) { r -= c.w; if (r <= 0) { pick = c; break } }
  const chain = pick.def.chain
  return {
    btn: pick.slot as Btn,
    taps: pick.slot === 'attack' && pick.dir === 'n' && chain ? 3 : 1,
    holdMs: pick.def.charge ? pick.def.charge.maxMs * rnd(0.25, 1) : 0,
    x: pick.dir === 'side' ? toward : pick.dir === 'n' ? 0 : toward * 0.01,
    y: pick.dir === 'up' ? 1 : pick.dir === 'down' ? -1 : 0,
    t: 0,
  }
}

export function cpuInput(id: FighterId, dt: number): InputFrame {
  const S = useGameStore.getState()
  const f = S.fighters[id]
  const e = S.fighters[id === 'p1' ? 'p2' : 'p1']
  const m = mem[id]
  const lv = LEVEL[(S.cpu[id] || 2) as 1 | 2 | 3]
  const dtMs = dt * 1000
  const held = noBtns()
  let mx = 0, my = 0

  const finish = (): InputFrame => {
    const pressed = noBtns()
    for (const b of BTNS) { pressed[b] = held[b] && !m.prev[b]; m.prev[b] = held[b] }
    return { moveX: mx, moveY: my, held, pressed }
  }
  if (!f.alive || S.phase !== 'playing') return finish()

  m.think -= dtMs; m.jumpCd -= dtMs; m.shield -= dtMs; m.ballIgnore -= dtMs
  const x = f.pos[0], y = f.pos[1]
  const busy = f.fsm === 'HITSTUN' || f.fsm === 'DODGE' || f.fsm.startsWith('ATTACK')
  const grounded = f.grounded
  const dx = e.pos[0] - x, adx = Math.abs(dx), dy = e.pos[1] - y
  const ranged = !getSkill(lo(f).attack)?.hitbox
  const homeDir = -sign(x) // 朝平台中央

  // ---- 1. 抓邊：停一下再選擇動作
  if (f.fsm === 'LEDGE') {
    if (m.ledgeT === 0) { m.ledgeWait = rnd(350, 1100); m.ledgeChoice = Math.random() }
    m.ledgeT += dtMs
    if (m.ledgeT > m.ledgeWait) {
      if (m.ledgeChoice < 0.4) held.jump = true
      else if (m.ledgeChoice < 0.75) mx = homeDir
      else held.attack = true
    }
    return finish()
  }
  m.ledgeT = 0

  // ---- 2. 執行中的出招（含蓄力長按、連點）
  if (m.act) {
    const a = m.act
    a.t += dtMs
    const period = 170
    if (a.smash) { // 同按普攻+特招（按住蓄力）
      const dur = 120 + a.holdMs
      held.attack = a.t < dur; held.skill1 = a.t < dur
      mx = a.x
      if (a.t >= dur + 80) { m.act = null; m.think = rnd(...(lv.think as unknown as [number, number])) }
    } else {
      held[a.btn] = a.holdMs ? a.t < a.holdMs : Math.floor(a.t / period) < a.taps && a.t % period < 70
      mx = a.x; my = a.y
      const total = (a.holdMs || a.taps * period) + 90
      if (a.t >= total) { m.act = null; m.think = rnd(...(lv.think as unknown as [number, number])) }
    }
    return finish()
  }
  if (f.fsm === 'HITSTUN') { mx = homeDir * (Math.abs(x) > 6 ? 1 : 0); return finish() } // 受擊時往場內修正方向

  const start = (a: Act | null) => { if (a) m.act = a; return !!a }

  // ---- 3. 場外回場
  const stage = STAGES[useGameStore.getState().stageId] ?? STAGES.battlefield
  const offstage = Math.abs(x) > (stage.half.x - 0.4) || y < -0.4
  if (offstage && !busy) {
    mx = homeDir
    const falling = f.vel[1] < 0
    if (falling && f.jumpsLeft > 0 && y < -0.6 && m.jumpCd <= 0) { held.jump = true; m.jumpCd = 450 }
    // 只有掉到平台高度以下才需要用上特招回場；在平台上方只要往內飄、自然落下即可
    else if (y < -1.0 && (f.jumpsLeft === 0 || y < -2.2) && Math.random() < lv.recover) {
      const up = defFor(f, 'skill1', 'up')
      if (up && usable(f, up)) start({ btn: 'skill1', taps: 1, holdMs: 0, x: homeDir * 0.01, y: 1, t: 0 })
    }
    if (m.act) mx = homeDir
    return finish()
  }

  // ---- 4. 站穩時的行動
  // 大招：持有資格且敵人在附近 → 按特招直接開
  if (f.ultReady && !busy && adx < 6 && Math.abs(dy) < 3 && m.think <= 0) {
    held.skill1 = true
    m.think = rnd(200, 400)
    return finish()
  }
  // 大招球：只追「構得到」的球（二段跳 + 上攻擊約可到 y≈7.5），單次最多追 4 秒，放棄後 8 秒內不再追
  const ball = runtime.ball
  const chaseBall = !!ball && m.ballIgnore <= 0 && ball.pos[1] < 7.5 && (adx > 3.5 || !e.alive)
  if (chaseBall && ball && !busy) {
    m.ballT += dtMs
    if (m.ballT > 4000) { m.ballIgnore = 8000; m.ballT = 0; return finish() }
    const bdx = ball.pos[0] - x, bdy = ball.pos[1] - y
    mx = Math.abs(bdx) > 1.2 ? sign(bdx) : 0
    if (m.jumpCd <= 0 && Math.abs(bdx) < 2.5) {
      if (grounded && bdy > 1.2) { held.jump = true; m.jumpCd = 600 }
      else if (!grounded && f.jumpsLeft > 0 && bdy > 2.0 && f.vel[1] < 1) { held.jump = true; m.jumpCd = 400 }
    }
    if (m.think <= 0 && Math.abs(bdx) < 2.4 && Math.abs(bdy) < 3.0) {
      if (bdy > 0.8 && Math.abs(bdx) < 1.6) start({ btn: 'attack', taps: 1, holdMs: 0, x: 0.01, y: 1, t: 0 })
      else start({ btn: 'attack', taps: 1, holdMs: 0, x: sign(bdx), y: 0, t: 0 })
      m.think = 150
    }
    return finish()
  }
  if (!chaseBall) m.ballT = 0
  if (!e.alive) return finish()

  // 防禦：看到對手出招時一次性擲骰
  const eAtk = e.fsm === 'ATTACK_STARTUP' || e.fsm === 'ATTACK_ACTIVE'
  if (eAtk && !m.enemyAtkSeen) {
    m.enemyAtkSeen = true
    if (grounded && !busy && adx < 2.6 && Math.random() < lv.block) {
      m.shield = m.shieldTotal = rnd(280, 520)
      const r = Math.random() // 一半防禦、一半閃避（翻滾 / 原地）
      m.dodge = r < 0.5 ? 'none' : r < 0.8 ? 'roll' : 'spot'
      m.rollDir = Math.random() < 0.7 ? -sign(dx) : sign(dx) // 多數往後滾，偶爾穿過對手
    } else if (!grounded && !busy && !f.airDodgeUsed && adx < 3 && Math.random() < lv.block * 0.5) {
      held.shield = true // 空中閃避
      mx = Math.abs(x) > 6 ? homeDir : 0
      return finish()
    }
  }
  if (!eAtk) m.enemyAtkSeen = false
  if (m.shield > 0 && grounded && !busy) {
    held.shield = true
    if (m.shieldTotal - m.shield > 110) { // 先舉盾再推方向 → 翻滾 / 原地閃避
      if (m.dodge === 'roll') mx = m.rollDir
      else if (m.dodge === 'spot') my = -1
    }
    return finish()
  }

  // 決定出招
  if (!busy && m.think <= 0) {
    if (start(pickAttack(f, e))) {
      const a = m.act!
      mx = a.x; my = a.y
    } else m.think = rnd(...(lv.think as unknown as [number, number]))
    if (m.act) return finish()
    if (Math.random() < lv.idle) m.idle = rnd(300, 800)
  }
  m.idle -= dtMs

  // 移動：近戰貼近、遠程保持距離
  const want = ranged ? 4.5 : 1.3
  if (m.idle > 0) mx = 0
  else if (adx > want + 0.6) mx = sign(dx)
  else if (ranged && adx < want - 1.6) mx = -sign(dx)
  else mx = 0
  // 不要自己走下平台
  if (grounded && ((x > 8.2 && mx > 0) || (x < -8.2 && mx < 0))) mx = 0
  // 站在層板上、敵人在下方 → 偶爾向下穿過去
  if (grounded && y > 0.9 && e.alive && dy < -1.6 && adx < 3.5 && m.dropT <= 0 && Math.random() < 0.02) m.dropT = 220
  if (m.dropT > 0) { my = -1; m.dropT -= dtMs }
  // 跳躍：敵人在上方 / 遠距離偶爾跳
  if (grounded && m.jumpCd <= 0 && !busy) {
    if ((dy > 1.6 && adx < 2.8 && Math.random() < 0.012) || (adx > 5 && Math.random() < 0.002)) { held.jump = true; m.jumpCd = 1100 }
  }
  // 空中：敵人在下方且接近時用下攻擊的機會由 pickAttack 處理
  return finish()
}
