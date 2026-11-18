import type { CharacterDef, CharacterId } from './types'

/**
 * loadout 鍵：
 *   attack / skill1 / skill2 / ult / smash            原地（無方向）
 *   'attack:side' 'attack:up' 'attack:down'            搖桿 左右(共用) / 上 / 下 + 該鍵
 *   'skill1:side' 'skill1:up' 'skill1:down' ...        同理
 *   smash = 普攻 + 特招 同按（蓄力重擊）；沒有定義的方向會退回原地版本
 * 持有大招資格時，按「特招」會直接施放 ult。
 */
const tilts = (p: string) => ({
  'attack:side': `${p}.fTilt`, 'attack:up': `${p}.uTilt`, 'attack:down': `${p}.dTilt`,
})
const smashes = (p: string) => ({
  smash: `${p}.fSmash`, 'smash:side': `${p}.fSmash`, 'smash:up': `${p}.uSmash`, 'smash:down': `${p}.dSmash`,
})

export const CHARACTERS: Record<CharacterId, CharacterDef> = {
  cube: {
    id: 'cube', name: 'CUBE 格鬥家', color: '#ff5d5d',
    trait: '🥊 三連拳法命中快速回能・全能近戰爆發',
    loadout: {
      attack: 'cube.jab', ...tilts('cube'),
      skill1: 'cube.energyWave', 'skill1:side': 'cube.slideKick', 'skill1:up': 'cube.risingStrike', 'skill1:down': 'cube.drillDive',
      skill2: 'cube.quake', 'skill2:side': 'cube.dashStrike',
      ...smashes('cube'), ult: 'cube.supernova',
    },
  },
  // 原創角色（名稱可在此一處修改）
  nova: {
    id: 'nova', name: 'NOVA 星刃', color: '#5dc8ff',
    trait: '⚡ 閃現留減速力場・可蓄力超遠距貫穿雷射',
    loadout: {
      attack: 'nova.a1', ...tilts('nova'),
      skill1: 'nova.blink', 'skill1:side': 'nova.dashSlice', 'skill1:up': 'nova.skyBlade', 'skill1:down': 'nova.rift',
      skill2: 'nova.beam', ...smashes('nova'), ult: 'nova.cataclysm',
    },
  },
  knight: {
    id: 'knight', name: 'KNIGHT 騎士', color: '#c9d3e0',
    trait: '🛡️ 特招「聖盾防反」自帶霸體無敵・高擊飛重斬',
    loadout: {
      attack: 'knight.a1', ...tilts('knight'),
      skill1: 'knight.shieldSmash', 'skill1:side': 'knight.shieldBash', 'skill1:up': 'knight.risingSlash', 'skill1:down': 'knight.groundSlam',
      skill2: 'knight.chargeSlash', ...smashes('knight'), ult: 'knight.judgment',
    },
  },
  robot: {
    id: 'robot', name: 'ROBOT 機器人', color: '#ffb04d',
    trait: '🚀 重火器飛彈空投＋EMP 電磁緩速力場',
    loadout: {
      attack: 'robot.shot', ...tilts('robot'),
      skill1: 'robot.rocket', 'skill1:side': 'robot.boost', 'skill1:up': 'robot.thruster', 'skill1:down': 'robot.mineDrop',
      skill2: 'robot.emp', ...smashes('robot'), ult: 'robot.orbital',
    },
    clips: { ATTACK_ACTIVE: 'holding-right-shoot' },
  },
  alien: {
    id: 'alien', name: 'ALIEN 外星人', color: '#8aff7a',
    trait: '🌀 瞬移敵後背刺＋黑洞引力井持續吸敵',
    loadout: {
      attack: 'alien.zap', ...tilts('alien'),
      skill1: 'alien.warp', 'skill1:side': 'alien.blinkSlash', 'skill1:up': 'alien.antigrav', 'skill1:down': 'alien.gravStomp',
      skill2: 'alien.gravityWell', ...smashes('alien'), ult: 'alien.meteor',
    },
  },
  soldier: {
    id: 'soldier', name: 'SOLDIER 士兵', color: '#a8d672',
    trait: '🎯 三連點射・霰彈退避・拋物線榴彈與蓄力狙擊',
    loadout: {
      attack: 'soldier.burst', ...tilts('soldier'),
      skill1: 'soldier.grenade', 'skill1:side': 'soldier.shotgun', 'skill1:up': 'soldier.kick', 'skill1:down': 'soldier.satchel',
      skill2: 'soldier.snipe', ...smashes('soldier'), ult: 'soldier.airstrike',
    },
    clips: { ATTACK_ACTIVE: 'holding-right-shoot' },
  },
  zombie: {
    id: 'zombie', name: 'ZOMBIE 殭屍', color: '#7fd67f',
    trait: '🩸 撕咬與飛撲命中「吸血回復損傷%」＋劇毒沼澤',
    loadout: {
      attack: 'zombie.claw1', ...tilts('zombie'),
      skill1: 'zombie.pounce', 'skill1:side': 'zombie.lunge', 'skill1:up': 'zombie.leap', 'skill1:down': 'zombie.groundHand',
      skill2: 'zombie.toxic', ...smashes('zombie'), ult: 'zombie.horde',
    },
  },
  tetro: {
    id: 'tetro', name: 'TETRO 方塊使', color: '#00f0f0',
    trait: '🧩 出招自動堆疊方塊・按特招觸發 1~4 行 TETRIS 雷射轟炸！',
    loadout: {
      attack: 'tetro.jab1', ...tilts('tetro'),
      skill1: 'tetro.hardDrop', 'skill1:side': 'tetro.sideSpin', 'skill1:up': 'tetro.upI', 'skill1:down': 'tetro.downDrop',
      skill2: 'tetro.matrixBurst',
      ...smashes('tetro'), ult: 'tetro.grandMaster',
    },
  },
}
export const CHARACTER_IDS = Object.keys(CHARACTERS) as CharacterId[]
