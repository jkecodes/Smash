import type { RapierRigidBody } from '@react-three/rapier'

export type FighterId = 'p1' | 'p2' | 'p3' | 'p4' | 'p5' | 'p6' | 'p7' | 'p8'
export const ALL_FIGHTER_IDS: FighterId[] = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8']
export const FIGHTER_IDS: FighterId[] = ALL_FIGHTER_IDS
export const PLAYER_COLORS: Record<FighterId, string> = {
  p1: '#ff4d4d',
  p2: '#3d9bff',
  p3: '#ffd24d',
  p4: '#4ade80',
  p5: '#fb923c',
  p6: '#22d3ee',
  p7: '#c084fc',
  p8: '#f472b6',
}
export type CharacterId =
  | 'tetro'
  | 'pacman' | 'mario' | 'invader' | 'bomber'
  | 'snake' | 'frogger' | 'kong' | 'pong'
  | 'reimu' | 'marisa'
  | 'ryu' | 'chunli' | 'yugi' | 'kaiba'
  | 'omnom' | 'tom' | 'ben' | 'crossy' | 'red' | 'steve' | 'arisa'
  | 'chihiro' | 'ichi' | 'ruri' | 'nona' | 'gojo' | 'deku' | 'yodaka' | 'saki' | 'spe' | 'kaoruko'
  | 'stelle' | 'lumine' | 'miyabi' | 'rover' | 'rapi' | 'akira'
export type FsmState =
  | 'IDLE' | 'RUN' | 'JUMP'
  | 'ATTACK_STARTUP' | 'ATTACK_ACTIVE' | 'ATTACK_RECOVERY'
  | 'HITSTUN' | 'SHIELD' | 'LEDGE' | 'DODGE'
export type SkillSlot = 'attack' | 'skill1' | 'skill2' | 'ult' | 'smash'
export type Vec3 = [number, number, number]
export type Btn = 'jump' | 'attack' | 'skill1' | 'skill2' | 'ult' | 'shield'

/** 局部座標：x=角色右側(2.5D 中不用)、y=上、z=面向前方 */
export interface HitboxDef {
  offset: Vec3
  radius: number
  /** 光束：沿面向方向掃出的長度（以多顆球取樣） */
  length?: number
  /** true：不會自動每幀判定，只在 hook 呼叫 ctx.strike() 時判定 */
  manual?: boolean
}
export interface KnockbackDef {
  /** 局部座標方向（z=前方）。radial=true 時 z 代表「由判定中心向外」的分量 */
  dir: Vec3
  /** 擊飛初速度 = (base + scaling * 損傷%/100) * 倍率 */
  base: number
  scaling: number
  radial?: boolean
  hitstunMs?: number
}
export interface ProjectileDef {
  speed: number
  radius: number
  lifetimeMs: number
  pierce: boolean
  offset: Vec3
  color: string
  gravity?: number
  explodeRadius?: number
}
export interface ChargeDef {
  maxMs: number
  knockbackMult: [number, number]
  damageMult: [number, number]
}
export interface ZoneDef {
  radius: number
  durationMs: number
  slowFactor: number
  color: string
  /** 敵人在範圍內每秒受到的損傷%（不造成擊飛） */
  damagePerSec?: number
  /** 把範圍內敵人往中心拉的加速度 */
  pull?: number
}

export type SkillPhase = 'startup' | 'active' | 'recovery'

export interface SkillHooks {
  onStart?(ctx: SkillContext): void
  onActive?(ctx: SkillContext): void
  /** 每幀（三個階段皆會呼叫，用 ctx.phase 區分） */
  onTick?(ctx: SkillContext): void
  onHit?(ctx: SkillContext, target: FighterState): void
  onEnd?(ctx: SkillContext): void
}

export interface SkillDef {
  id: string
  name: string
  energyCost: number
  cooldownMs?: number
  startupMs: number
  activeMs: number
  recoveryMs: number
  hitbox?: HitboxDef
  damage: number
  knockback: KnockbackDef
  projectile?: ProjectileDef
  charge?: ChargeDef
  /** 連段：恢復期間再按攻擊鍵接續的下一招 */
  chain?: string
  /** 需要先打破大招球取得大招資格（施放時消耗） */
  requiresUlt?: boolean
  hooks?: SkillHooks
}

export interface CharacterDef {
  id: CharacterId
  name: string
  color: string
  /** 角色專屬戰鬥特色說明 */
  trait?: string
  /** 角色詳細遊玩教學 */
  guide?: { summary: string; steps: string[]; combo: string }
  /** 鍵為 'skill1'，或帶方向的 'skill1:up' / 'skill1:down'（按住搖桿方向 + 該鍵時優先使用） */
  loadout: Partial<Record<string, string>>
  /** 模型動畫片段名稱覆寫（狀態 → clip 名稱） */
  clips?: Partial<Record<string, string>>
}

export interface HitSource {
  def: SkillDef
  hitSet: Set<string>
  kbMult: number
  dmgMult: number
}

export interface ActiveSkill extends HitSource {
  slot: SkillSlot
  phase: SkillPhase
  phaseMs: number
  chargeMs: number
  chargeRatio: number
  released: boolean
  ended: boolean
  scratch: Record<string, any>
}

export interface FighterStats {
  kos: number
  damageDealt: number
  damageTaken: number
  maxCombo: number
  perfectShields: number
}

export interface FighterState {
  id: FighterId
  character: CharacterId
  damage: number
  stocks: number
  energy: number
  shield: number
  fsm: FsmState
  stateMs: number
  pos: Vec3
  vel: Vec3
  facing: [number, number] // 2.5D：永遠是 [±1, 0]
  grounded: boolean
  jumpsLeft: number
  skill: ActiveSkill | null
  cooldowns: Record<string, number>
  comboBufferMs: number
  hitstunMs: number
  invulnMs: number
  respawnMs: number
  slowFactor: number
  flashMs: number
  alive: boolean
  firstSpawn: boolean
  ultReady: boolean
  dodgeMs: number
  dodgeKind: 'roll' | 'spot' | 'air' | null
  dodgeDir: [number, number]
  airDodgeUsed: boolean
  upSpecialUsed: boolean // 滯空時「上+特招」只能用一次
  scratchTrail?: number
  dropMs: number // >0：暫時穿過層板
  downMs: number // 連續向下推的時間
  ledgeSide: -1 | 1 | 0
  ledgeMs: number
  ledgeCd: number
  comboCount: number
  comboTimerMs: number
  lastHitBy?: FighterId | null
  jumpBufferMs?: number
  coyoteMs?: number
  stats: FighterStats
}

export interface SkillContext {
  caster: FighterState
  def: SkillDef
  phase: SkillPhase
  phaseMs: number
  dt: number // 秒
  chargeRatio: number
  scratch: Record<string, any>
  forward: Vec3
  toWorld(local: Vec3): Vec3
  /** y 傳 null 代表保留目前垂直速度 */
  setVelocity(x: number, y: number | null, z: number): void
  setLocalVelocity(x: number, y: number | null, z: number): void
  setGravityScale(s: number): void
  setInvulnerable(ms: number): void
  teleport(pos: Vec3): void
  spawnZone(pos: Vec3, def: ZoneDef): void
  /** 發射自訂投射物（可指定速度向量 / 重力 / 爆炸半徑），傷害與擊飛取自目前招式 */
  spawnProjectile(p: { pos: Vec3; vel: Vec3; radius: number; ttlMs: number; pierce?: boolean; color: string; gravity?: number; explodeRadius?: number }): void
  fx(item: FxSpec): void
  nearestEnemy(): FighterState | null
  isGrounded(): boolean
  strike(override?: Partial<HitboxDef>): void
  endActive(): void
  shake(amount: number): void
}

export type FxKind = 'slash' | 'ring' | 'burst' | 'afterimage' | 'beam' | 'pillar'
export interface FxSpec {
  kind: FxKind
  pos: Vec3
  color: string
  ttl: number
  yaw?: number
  radius?: number
  length?: number
  count?: number
  speed?: number
  size?: number
  plane?: 'horizontal' | 'vertical'
  tilt?: number
  flip?: boolean
  shape?: 'box' | 'sphere'
}
export interface FxItem extends FxSpec { id: number; createdAt: number }

export interface Projectile {
  id: number
  owner: FighterId
  pos: Vec3
  vel: Vec3
  radius: number
  ttlMs: number
  pierce: boolean
  color: string
  source: HitSource
  trailMs: number
  gravity: number
  explodeRadius: number
}
export interface Zone {
  id: number
  owner: FighterId
  pos: Vec3
  radius: number
  ttlMs: number
  durationMs: number
  slowFactor: number
  color: string
  damagePerSec: number
  pull: number
}

export interface UiFighter {
  name: string
  color: string
  damage: number
  stocks: number
  energy: number
  shield: number
  fsm: FsmState
  charge: number
  ultReady: boolean
  combo: number
  stats: FighterStats
  slots: { slot: SkillSlot; name: string; cd: number; cost: number; locked: boolean }[]
}

export interface SmashBall {
  pos: Vec3
  vel: Vec3
  hp: number
  maxHp: number
  radius: number
  ttlMs: number
  turnMs: number
  flashMs: number
}

export interface Runtime {
  ball: SmashBall | null
  bodies: Record<FighterId, RapierRigidBody | null>
  platformBodies: (RapierRigidBody | null)[]
  handles: Map<number, FighterId>
  physics: { world: any; rapier: any } | null
  projectiles: Projectile[]
  zones: Zone[]
  fx: FxItem[]
  debugSpheres: { pos: Vec3; r: number; ttl: number }[]
  shake: number
  stageTime: number
  hitstopMs: number
}
