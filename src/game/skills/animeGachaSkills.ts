import { registerSkill } from './registry'
import { registerSmashes, registerTilts } from './directionalSkills'
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
  s1: { name: string; projColor: string; pierce?: boolean; explode?: number; speed?: number }
  side: string
  up: string
  down: string
  s2: { name: string; kind: 'zone' | 'proj' | 'ring'; color: string }
  smashes: [string, string, string]
  ult: { name: string; kind: 'beam' | 'rain' | 'burst'; color: string }
}

const KIT_SUMMONS: Record<string, import('../types').SummonModel> = {
  chihiro: 'goldfish',
  ichi: 'baku',
  nona: 'needle',
  gojo: 'hollow',
  stelle: 'train',
  hutao: 'ghost',
}

function registerKit(k: KitSpec) {
  const { p, color } = k
  reg({
    id: `${p}.a1`, name: k.a1, energyCost: 0, chain: `${p}.a2`,
    startupMs: 55, activeMs: 85, recoveryMs: 135,
    hitbox: { offset: [0, 0.12, 0.95], radius: 0.9 }, damage: 3.5,
    knockback: { dir: [0, 0.22, 1], base: 5.5, scaling: 5.5 },
    hooks: { onActive(c) { slash(c, '#ffffff', { r: 1.3 }) } },
  })
  reg({
    id: `${p}.a2`, name: k.a2, energyCost: 0,
    startupMs: 75, activeMs: 100, recoveryMs: 195,
    hitbox: { offset: [0, 0.12, 1.1], radius: 1.05 }, damage: 6.5,
    knockback: { dir: [0, 0.45, 1], base: 10, scaling: 10.5 },
    hooks: { onActive(c) { slash(c, color, { r: 1.6, flip: true }) } },
  })
  registerTilts(p, { color, names: k.tilts })
  reg({
    id: `${p}.s1`, name: k.s1.name, energyCost: 0, cooldownMs: 1200, startupMs: 135, activeMs: 50, recoveryMs: 215,
    damage: 9.5, knockback: { dir: [0, 0.45, 1], base: 11, scaling: 11.5 },
    hooks: {
      onActive(c) {
        if (p === 'ichi') {
          c.fx({ kind: 'summon', model: 'thunderFox', pos: at(c, 0.3, 0.9), color: '#facc15', ttl: 850, size: 0.95, dir: c.forward[0] })
        }
        c.spawnProjectile({
          pos: at(c, 0.15, 0.9),
          vel: [c.forward[0] * (k.s1.speed ?? 19), k.s1.explode ? 3 : 0, 0],
          radius: 0.48,
          ttlMs: 1250,
          color: k.s1.projColor,
          pierce: k.s1.pierce,
          gravity: k.s1.explode ? -16 : 0,
          explodeRadius: k.s1.explode,
        })
      },
    },
  })
  reg(dashMove(`${p}.side`, k.side, color, { speed: 23, dmg: 8.5, base: 11.5, scaling: 12.5 }))
  reg(upRise(`${p}.up`, k.up, color, { dmg: 8, base: 11, scaling: 13, rise: 18.2 }))
  reg(slamMove(`${p}.down`, k.down, color, { dmg: 10, base: 12.5, scaling: 13.5 }))

  if (k.s2.kind === 'zone') {
    reg({
      id: `${p}.s2`, name: k.s2.name, energyCost: 20, cooldownMs: 2600, startupMs: 160, activeMs: 60, recoveryMs: 250,
      damage: 0, knockback: { dir: [0, 0, 0], base: 0, scaling: 0 },
      hooks: {
        onActive(c) {
          const model = KIT_SUMMONS[p]
          if (model) c.fx({ kind: 'summon', model, pos: at(c, 0.4, 1.0), color: k.s2.color, ttl: 950, size: 1.0, dir: c.forward[0] })
          const pos: Vec3 = [c.caster.pos[0], Math.max(0, c.caster.pos[1] - 0.35), 0]
          c.spawnZone(pos, { radius: 3.1, durationMs: 3400, slowFactor: 0.52, color: k.s2.color, damagePerSec: 6.5 })
          c.fx({ kind: 'ring', pos, color: k.s2.color, ttl: 420, radius: 3.1 })
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
          c.spawnProjectile({ pos: at(c, 0.2, 0.9), vel: [c.forward[0] * 20, 0, 0], radius: 0.58, ttlMs: 1350, color: k.s2.color, explodeRadius: 2.3 })
        },
      },
    })
  }
  registerSmashes(p, { color, names: k.smashes })

  reg({
    id: `${p}.ult`, name: k.ult.name, energyCost: 0, requiresUlt: true,
    startupMs: 560, activeMs: 1050, recoveryMs: 420,
    hitbox: { offset: [0, 0.2, k.ult.kind === 'burst' ? 0 : 0.8], radius: k.ult.kind === 'burst' ? 4.6 : 2.3, length: k.ult.kind === 'beam' ? 27 : undefined },
    damage: 22,
    knockback: { dir: [0, 0.6, 1], base: 26, scaling: 18, radial: k.ult.kind === 'burst', hitstunMs: 1350 },
    hooks: {
      onStart(c) { c.setGravityScale(0.15); c.setVelocity(0, 3.5, 0) },
      onTick(c) {
        if (c.phase === 'recovery') return
        c.setInvulnerable(140)
        if (c.phase === 'active' && k.ult.kind === 'rain') {
          c.scratch.rn = (c.scratch.rn ?? 0) - c.dt * 1000
          if (c.scratch.rn <= 0) {
            c.scratch.rn = 175
            const x = clampStageX((Math.random() - 0.5) * 14)
            c.spawnProjectile({ pos: [x, 13.5, 0], vel: [0, -20, 0], radius: 0.62, ttlMs: 1500, color: k.ult.color, gravity: -14, explodeRadius: 2.4 })
          }
        }
      },
      onActive(c) {
        if (p === 'ichi') {
          c.fx({ kind: 'summon', model: 'thunderFox', pos: at(c, 0.8, 1.2), color: '#facc15', ttl: 1200, size: 1.25, dir: c.forward[0] })
          c.fx({ kind: 'summon', model: 'iceShark', pos: at(c, -0.4, 2.2), color: '#38bdf8', ttl: 1200, size: 1.25, dir: c.forward[0] })
          c.fx({ kind: 'summon', model: 'baku', pos: at(c, 0.2, 0.6), color: '#a855f7', ttl: 1200, size: 1.25, dir: -c.forward[0] })
        } else {
          const model = KIT_SUMMONS[p]
          if (model) c.fx({ kind: 'summon', model, pos: at(c, 0.8, 1.4), color: k.ult.color, ttl: 1200, size: 1.45, dir: c.forward[0] })
        }
        if (k.ult.kind === 'beam') {
          c.fx({ kind: 'beam', pos: at(c, 0.2, 0.8), yaw: yawOf(c), length: 27, radius: 2.2, color: k.ult.color, ttl: 550 })
        } else {
          c.fx({ kind: 'ring', pos: [...c.caster.pos], color: k.ult.color, ttl: 480, radius: 4.6, plane: 'vertical' })
          c.fx({ kind: 'pillar', pos: [...c.caster.pos], color: k.ult.color, ttl: 560, radius: 2.6 })
        }
        c.fx({ kind: 'burst', pos: [...c.caster.pos], color: k.ult.color, ttl: 680, count: 60, speed: 12, size: 0.24 })
        c.shake(1.3)
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
    ult: { name: '妖刀「淵天」黑・錦・涅 三連奧義！', kind: 'beam', color: '#ef4444' },
  },
  {
    p: 'ichi', color: '#38bdf8', a1: '魔男獵刀斬', a2: '野性雙連劈',
    tilts: ['獵刀橫揮', '雷狐電弧挑擊', '冰晶下掃'],
    s1: { name: '雷狐之魔法「電光雷鳴」', projColor: '#facc15', pierce: true, speed: 23 },
    side: '冰鯊之魔法「冰牙突襲」', up: '蛛絲之魔法「獵場飛躍」', down: '菌菇之魔法「巨菇壓頂」',
    s2: { name: '夢貘之魔法「夢境吞噬領域」', kind: 'zone', color: '#a855f7' },
    smashes: ['魔男真紅斬', '凍結鯊牙衝', '大狩獵震地'],
    ult: { name: '全收服魔法「雷狐×冰鯊×夢貘×ウロロ」！', kind: 'burst', color: '#60a5fa' },
  },
  {
    p: 'ruri', color: '#34d399', a1: '龍角衝撞', a2: '小龍炎爪擊',
    tilts: ['龍尾橫掃', '閃電角上頂', '噴火下壓'],
    s1: { name: '龍之火炎吐息', projColor: '#f97316', explode: 2.0, speed: 17 },
    side: '龍鱗暴衝', up: '龍翼雷電升空', down: '青龍落雷震地',
    s2: { name: '龍角放電＋毒霧領域', kind: 'zone', color: '#a3e635' },
    smashes: ['真龍烈焰噴射', '雷角穿雲頂', '龍吼震波'],
    ult: { name: '覺醒龍神・九霄雷炎吐息！', kind: 'beam', color: '#f97316' },
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
    s1: { name: '術式反轉「赫」', projColor: '#ef4444', explode: 2.3, speed: 20 },
    side: '無下限瞬間移動突襲', up: '術式順轉「蒼」浮升', down: '無下限重力壓頂',
    s2: { name: '虛式「茈」貫穿彈', kind: 'proj', color: '#a855f7' },
    smashes: ['極限黑閃重拳', '赫・蒼雙重爆', '領域壓迫衝擊'],
    ult: { name: '領域展開「無量空處」→ 虛式「茈」！', kind: 'beam', color: '#a855f7' },
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
    ult: { name: '九號通訊輔助「神速・無音全滅」！', kind: 'beam', color: '#38bdf8' },
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
    ult: { name: '固有技能「シューティングスター」衝線！', kind: 'beam', color: '#f472b6' },
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
    ult: { name: '星穹列車「Star Rail 全速撞擊」！', kind: 'beam', color: '#facc15' },
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
    ult: { name: '終結技「殘雪・星見流萬斬」！', kind: 'beam', color: '#38bdf8' },
  },
  {
    p: 'rover', color: '#facc15', a1: '衍射迅刀斬', a2: '共鳴解放連擊',
    tilts: ['長刃橫掃', '聲骸上挑', '闇滅下劈'],
    s1: { name: '衍射光刃射擊', projColor: '#facc15', pierce: true, speed: 23 },
    side: '鉤索極速突襲', up: '聲骸振翅升空', down: '時滯領域重砸',
    s2: { name: '鳴潮聲骸共鳴環', kind: 'ring', color: '#facc15' },
    smashes: ['闇滅重劍破', '光翼升天斬', '歲主共振震'],
    ult: { name: '共鳴解放「萬象歸一・時停光刃」！', kind: 'beam', color: '#fde047' },
  },
  {
    p: 'rapi', color: '#ef4444', a1: '戰術步槍點射', a2: '強化榴彈槍托擊',
    tilts: ['穿甲三連發', '對空掃射', '戰術滑鏟射'],
    s1: { name: '妮姬重裝穿甲彈', projColor: '#ef4444', speed: 24 },
    side: '反擊部隊戰術突進', up: '噴射背包戰術升空', down: '空投高爆集束雷',
    s2: { name: '高爆爆裂導彈', kind: 'proj', color: '#f97316' },
    smashes: ['Red Hood 核心穿射', '對空爆裂榴彈', '地雷陣引爆'],
    ult: { name: '爆裂階段 III「Red Hood 全彈發射」！', kind: 'beam', color: '#ef4444' },
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
    smashes: ['世界一可愛い重擊！', '黃金麥克風上鉤', '大豐收震地拍'],
    ult: { name: '「世界一可愛い私！」黃金星雨 LIVE！', kind: 'rain', color: '#fde047' },
  },
  {
    p: 'hutao', color: '#ef4444', a1: '往生堂秘傳槍法', a2: '蝶引來生火炎掃',
    tilts: ['護摩橫掃', '火蝶上挑', '幽靈下刺'],
    s1: { name: '胡桃鬼火彈（Boo Tao）', projColor: '#f97316', explode: 2.1, speed: 18 },
    side: '血梅香・火蝶高速突刺', up: '蝶舞幽冥升空', down: '護摩之杖重砸',
    s2: { name: '彼岸蝶舞・燃燒結界', kind: 'ring', color: '#ef4444' },
    smashes: ['護摩之杖破軍槍', '炎蝶沖天挑', '往生堂鎮魂震'],
    ult: { name: '元素爆發「安神秘法・巨型鬼火」！', kind: 'beam', color: '#ef4444' },
  },
]

for (const k of KITS) registerKit(k)
