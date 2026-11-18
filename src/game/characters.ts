import { PARTNERS } from './partners'
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
  tetro: {
    id: 'tetro', name: 'TETRO 方塊使', color: '#00f0f0',
    scale: 1.18, speedMult: 0.86, damageMult: 1.24, weightMult: 1.2,
    trait: '🧩 出招自動堆疊方塊・按特招觸發 1~4 行 TETRIS 雷射轟炸！',
    guide: {
      summary: '邊打架邊自動疊俄羅斯方塊！你完全不用停下來對位，出普攻或位移招會自動幫你填滿左3欄，按特招一鍵消行爆發。',
      steps: [
        '盡情移動並使用【普攻 J】或【左右/上+K】打人，背後 4×6 矩陣會自動幫你疊滿左 3 欄方塊。',
        '注意狀態卡「🧩 待消行」提示：疊滿 4 列發亮時，按【特招 K】或【下+K】一鍵落塊，直接觸發「⚡TETRIS!!」22m 毀滅雷射！',
        '遇到圍毆時隨時按【技能2 L】矩陣全彈傾瀉，把所有累積的方塊變成彈跳炸彈轟出去！',
      ],
      combo: 'J連打 / 左右+K (自動疊滿4列) → K (硬降觸發 4 行 TETRIS 雷射!) → L (清倉全彈轟炸)',
    },
    loadout: {
      attack: 'tetro.jab1', ...tilts('tetro'),
      skill1: 'tetro.hardDrop', 'skill1:side': 'tetro.sideSpin', 'skill1:up': 'tetro.upI', 'skill1:down': 'tetro.downDrop',
      skill2: 'tetro.matrixBurst',
      ...smashes('tetro'), ult: 'tetro.grandMaster',
    },
  },
  pacman: {
    id: 'pacman', name: 'PAC-MAN 吃豆人', color: '#ffe033',
    trait: '🟡 咬擊回能・召喚街機幽靈・消防栓噴泉與彈簧墊極限回場',
    guide: {
      summary: '靈活多變的街機傳奇！擁有多種道具牽制（幽靈、消防栓、水果炸彈），且上特招「彈簧墊」提供超強垂直回場能力。',
      steps: [
        '使用【特招 K】召喚彩色像素幽靈直線騷擾，並用【技能2 L】拋出高傷害彈跳水果炸彈。',
        '近身被圍攻時用【下+K】消防栓噴射將周圍敵人全面彈開！',
        '切入時按【左右+K】能量豆衝刺，普攻吞噬咬擊命中還能持續回復能量。',
      ],
      combo: 'L (拋出水果炸彈) → 左右+K (能量豆衝刺追擊) → 下+K (消防栓補刀)',
    },
    loadout: {
      attack: 'pacman.waka', ...tilts('pacman'),
      skill1: 'pacman.ghost', 'skill1:side': 'pacman.pelletDash', 'skill1:up': 'pacman.trampoline', 'skill1:down': 'pacman.hydrant',
      skill2: 'pacman.fruit', ...smashes('pacman'), ult: 'pacman.superPac',
    },
  },
  mario: {
    id: 'mario', name: 'MARIO 水管工', color: '#ef4444',
    trait: '🍄 彈跳火球＋黃金披風＋綠水管敵底突襲＋金幣昇龍拳',
    guide: {
      summary: '最平衡的全能主力！既可用彈跳火球遠距牽制，又能靠技能2「綠水管奇襲」瞬間從敵人腳下鑽出給予致命打擊。',
      steps: [
        '開局拋出【特招 K】火球彈跳逼迫對手跳躍，再用【左右+K】黃金披風旋斬或【普攻 J】二連踢搶攻。',
        '看到敵人在遠方發呆或落地時，按【技能2 L】綠水管奇襲直接瞬移到他腳下向上爆出！',
        '貼身斬殺請使用【上+K】金幣昇龍拳或空中【下+K】重磅臀擊壓制。',
      ],
      combo: 'K (火球牽制) → L (綠水管敵底鑽出) → 上+K (金幣昇龍拳追擊)',
    },
    loadout: {
      attack: 'mario.jab1', ...tilts('mario'),
      skill1: 'mario.fireball', 'skill1:side': 'mario.cape', 'skill1:up': 'mario.coinPunch', 'skill1:down': 'mario.groundPound',
      skill2: 'mario.warpPipe', ...smashes('mario'), ult: 'mario.starman',
    },
  },
  invader: {
    id: 'invader', name: 'INVADER 侵略者', color: '#4ade80',
    scale: 1.24, speedMult: 0.84, damageMult: 1.28, weightMult: 1.22,
    trait: '👾 8-Bit雷射牽制・UFO牽引吸敵光柱・像素傳送與掩體砲台',
    guide: {
      summary: '經典射擊遊戲 BOSS 型遠程砲台。擅長在遠處架設掩體力場並發射高穿透雷射，並用 UFO 牽引光束限制敵人逃脫。',
      steps: [
        '利用【普攻 J】與方向普攻持續射出 8-Bit 雷射封鎖敵人橫向接近。',
        '按下【技能2 L】在腳邊架設像素掩體（敵人靠近減速扣血）並同步射出貫穿青色光線！',
        '用【特招 K】UFO 牽引光束把前方敵人往上吸飛，被打出場外則按【上+K】瞬間傳送升空。',
      ],
      combo: 'L (架設掩體貫穿砲) → K (UFO 牽引光束吸住) → 普攻+特招 (蓄力重擊)',
    },
    loadout: {
      attack: 'invader.laser', ...tilts('invader', ),
      skill1: 'invader.ufoBeam', 'skill1:side': 'invader.galagaDive', 'skill1:up': 'invader.warpAscend', 'skill1:down': 'invader.torpedo',
      skill2: 'invader.bunker', ...smashes('invader'), ult: 'invader.armada',
    },
  },
  bomber: {
    id: 'bomber', name: 'BOMBER 炸彈超人', color: '#38bdf8',
    trait: '💣 十字爆裂彈・踢炸彈滑行・三連地雷陣全場大爆破',
    guide: {
      summary: '爆炸就是藝術！幾乎每一招特招都會製造大範圍的火焰爆炸判定，在多人混戰中能同時炸飛大批對手。',
      steps: [
        '中距離多用【特招 K】十字爆裂炸彈與【技能2 L】三連高爆地雷陣覆蓋整個平台。',
        '想快速打擊直線目標時用【左右+K】踢擊滑行炸彈高速滾過去引爆！',
        '利用【上+K】爆風火箭跳兼顧強大回場與炸飛頭頂敵人。',
      ],
      combo: 'L (三連地雷鋪場) → 左右+K (踢爆彈推進) → 上+K (火箭跳收頭)',
    },
    loadout: {
      attack: 'bomber.jab', ...tilts('bomber'),
      skill1: 'bomber.crossBomb', 'skill1:side': 'bomber.kickBomb', 'skill1:up': 'bomber.blastJump', 'skill1:down': 'bomber.dropBomb',
      skill2: 'bomber.tripleMine', ...smashes('bomber'), ult: 'bomber.megaBomb',
    },
  },
  snake: {
    id: 'snake', name: 'SNAKE 貪食蛇', color: '#22c55e',
    trait: '🐍 毒牙咬人「吃蘋果回能回血」・Z字蛇行突襲・貪食迷陣',
    guide: {
      summary: '高機動偷襲＋續航戰士。普攻「毒牙咬蘋果」命中可回復 8 點能量並降低自身 1.5% 損傷，搭配極速蛇行突襲穿梭戰場。',
      steps: [
        '依靠超高速移動與【左右+K】Z字蛇行突襲閃躲敵方砲火並近身貼臉。',
        '近身後連按【普攻 J】咬擊觸發「吃蘋果」回血回能效果，並按【技能2 L】放下貪食蛇方格迷陣扣血。',
        '中距離拋出【特招 K】紅蘋果爆彈，或從空中用【下+K】巨尾砸地補刀。',
      ],
      combo: 'L (方格迷陣緩速) → 左右+K (Z字蛇行突入) → J 咬擊吸血 → K (補蘋果爆彈)',
    },
    loadout: {
      attack: 'snake.bite', ...tilts('snake'),
      skill1: 'snake.appleBomb', 'skill1:side': 'snake.slitherDash', 'skill1:up': 'snake.coilSpring', 'skill1:down': 'snake.tailSlam',
      skill2: 'snake.mazeZone', ...smashes('snake'), ult: 'snake.ouroboros',
    },
  },
  frogger: {
    id: 'frogger', name: 'FROGGER 青蛙過河', color: '#84cc16',
    scale: 0.84, speedMult: 1.16, damageMult: 0.9, weightMult: 0.84,
    trait: '🐸 超長青蛙舌遠程普攻・召喚滾木與高速貨車・全場最高跳躍',
    guide: {
      summary: '手長且制空力最強的跳躍專家！普攻長舌鞭擊攻擊距離驚人，還能召喚經典的滾木與高速公路大貨車橫掃地面。',
      steps: [
        '保持比普通近戰角色稍遠一點的安全距離，用【普攻 J】長舌遠距鞭擊穩穩消耗對手。',
        '看到對手落地時發動【左右+K】高速公路貨車召喚，高速貨車＋自身衝鋒雙重撞擊！',
        '搭配【特招 K】滾木壓制地面，被打出場外只要用【上+K】青蛙大跳躍幾乎必能回到舞台。',
      ],
      combo: 'J (長舌抽打) → K (滾木推進) → 左右+K (召喚高速貨車猛撞)',
    },
    loadout: {
      attack: 'frogger.tongue', ...tilts('frogger'),
      skill1: 'frogger.logRoll', 'skill1:side': 'frogger.highwayTruck', 'skill1:up': 'frogger.superLeap', 'skill1:down': 'frogger.bellyFlop',
      skill2: 'frogger.lilypad', ...smashes('frogger'), ult: 'frogger.rushHour',
    },
  },
  kong: {
    id: 'kong', name: 'DONKEY KONG 大金剛', color: '#a16207',
    scale: 1.48, speedMult: 0.78, damageMult: 1.42, weightMult: 1.38,
    trait: '🦍 霸體鐵頭功・重磅滾動木桶・全場最強蓄力巨猩重拳',
    guide: {
      summary: '力量型重裝霸主！單發傷害與擊飛力在全角色中名列前茅，【左右+K】鐵頭功自帶無敵霸體，蓄力拳一擊即可秒殺高傷敵人。',
      steps: [
        '遠處投擲【特招 K】滾動木桶逼對手起跳，再用霸體【左右+K】鐵頭功硬撞突破防線。',
        '在敵人密集處按【下+K】震地雙掌拍打出大範圍擊飛。',
        '找機會按住【技能2 L】蓄力巨猩重拳，滿蓄力命中擁有毀天滅地的擊飛爆發！',
      ],
      combo: 'K (滾動木桶) → 左右+K (霸體鐵頭功貼近) → 長按 L (蓄力巨猩重拳)',
    },
    loadout: {
      attack: 'kong.slap', ...tilts('kong'),
      skill1: 'kong.barrel', 'skill1:side': 'kong.headbutt', 'skill1:up': 'kong.spinningKong', 'skill1:down': 'kong.earthSlap',
      skill2: 'kong.giantPunch', ...smashes('kong'), ult: 'kong.avalanche',
    },
  },
  pong: {
    id: 'pong', name: 'PONG 打磚塊', color: '#e2e8f0',
    trait: '🏓 彈跳能量球射擊・七彩磚塊五連彈幕・霓虹高速撞擊',
    guide: {
      summary: '高速幾何彈幕射手！發射高速反彈能量球與五彩扇形磚塊彈幕，能把戰場變成密集的打磚塊彈珠台。',
      steps: [
        '用【普攻 J】發球與【特招 K】打磚塊彈跳球從不同拋物線不斷彈跳襲擊敵人。',
        '按下【技能2 L】七彩磚塊爆碎陣一次噴出 5 顆扇形彩色磚塊彈，在 8 人大亂鬥極易同時命中多人！',
        '被逼近時使用【左右+K】霓虹擋板衝撞反擊，或用【上+K】雙管雷射升空拉高。',
      ],
      combo: 'K (彈跳球封位) → L (五連七彩磚塊陣) → 左右+K (擋板撞飛)',
    },
    loadout: {
      attack: 'pong.serve', ...tilts('pong'),
      skill1: 'pong.ricochet', 'skill1:side': 'pong.paddleDash', 'skill1:up': 'pong.laserLaunch', 'skill1:down': 'pong.brickDrop',
      skill2: 'pong.brickWall', ...smashes('pong'), ult: 'pong.multiball',
    },
  },
  reimu: {
    id: 'reimu', name: '博麗靈夢 REIMU', color: '#f43f5e',
    trait: '⛩️ 博麗靈符三連彈幕・高彈跳陰陽玉・退魔八方結界與夢想封印',
    guide: {
      summary: '東方 Project 主角！擅長「彈幕壓制＋結界控場」的紅白巫女。御幣揮擊帶靈符射擊，陰陽玉彈跳極強，大招夢想封印自動追蹤敵人。',
      steps: [
        '邊移動邊按【普攻 J】揮動御幣並順帶射出靈符，中遠距多按【特招 K】撒出三連發扇形靈符彈幕。',
        '在敵人落點放【技能2 L】博麗大結界造成持續扣血緩速，再用【左右+K】丟出巨大高彈跳陰陽寶玉。',
        '遭包夾按【下+K】退魔八方結界彈飛四週敵人，掉出邊緣可用【上+K】亞空穴無重力瞬移高飛回場！',
      ],
      combo: 'L (博麗大結界緩速) → 左右+K (陰陽寶玉彈壓) → K (三連靈符彈幕追擊)',
    },
    loadout: {
      attack: 'reimu.gohei', ...tilts('reimu'),
      skill1: 'reimu.amulet', 'skill1:side': 'reimu.yinyangOrb', 'skill1:up': 'reimu.skyFloat', 'skill1:down': 'reimu.sealCircle',
      skill2: 'reimu.barrier', ...smashes('reimu'), ult: 'reimu.fantasySeal',
    },
  },
  marisa: {
    id: 'marisa', name: '霧雨魔理沙 MARISA', color: '#facc15',
    trait: '⭐ 魔導星塵飛彈・彗星掃帚極速衝鋒・八卦爐蓄力魔砲＆極限火花',
    guide: {
      summary: '東方 Project 高火力魔法使！速度極快、爆發力驚人，騎掃帚 Blazing Star 高速衝貫，搭配八卦爐魔砲與全屏 Master Spark 轟碎對手。',
      steps: [
        '中距離連發【特招 K】魔導星塵三連飛彈轟炸，並用【普攻 J】掃帚星塵揮擊搶先手。',
        '抓準敵人在同一水平線時按【左右+K】彗星「Blazing Star」騎掃帚極速突貫，或按住【技能2 L】蓄力八卦爐魔砲橫掃全場！',
        '在敵人頭頂按【下+K】丟下高爆魔藥瓶同時自己會反彈上跳，安全又高傷！',
      ],
      combo: 'K (星塵飛彈牽制) → 左右+K (Blazing Star 衝鋒) → 長按 L (八卦爐蓄力魔砲)',
    },
    loadout: {
      attack: 'marisa.broomSweep', ...tilts('marisa'),
      skill1: 'marisa.magicMissile', 'skill1:side': 'marisa.blazingStar', 'skill1:up': 'marisa.starRise', 'skill1:down': 'marisa.potionDrop',
      skill2: 'marisa.miniSpark', ...smashes('marisa'), ult: 'marisa.masterSpark',
    },
  },
  ryu: {
    id: 'ryu', name: 'RYU 隆', color: '#38bdf8',
    scale: 1.08, speedMult: 0.94, damageMult: 1.12, weightMult: 1.1,
    trait: '🥋 波動拳牽制・無敵昇龍拳・龍卷旋風腳＆真空波動拳',
    guide: {
      summary: '《Street Fighter 快打旋風》經典波動格鬥家！地面波動拳壓制、龍卷旋風腳突進，加上起手自帶無敵的強對空「昇龍拳」。',
      steps: [
        '中距離以【特招 K】波動拳或【技能2 L】灼熱波動拳逼迫對手跳躍。',
        '對手跳起來進攻時，直接按【上+K】昇龍拳無敵反打並將人轟飛！',
        '地面可用【左右+K】龍卷旋風腳長距離連續踢擊，或用【下+K】氣合崩拳硬扛反擊。',
      ],
      combo: 'J → J (正拳→鳩尾碎) → 左右+K (龍卷旋風腳) / 上+K (昇龍拳收頭)',
    },
    loadout: {
      attack: 'ryu.a1', ...tilts('ryu'),
      skill1: 'ryu.hadoken', 'skill1:side': 'ryu.tatsumaki', 'skill1:up': 'ryu.shoryuken', 'skill1:down': 'ryu.focus',
      skill2: 'ryu.shakunetsu', ...smashes('ryu'), ult: 'ryu.shinku',
    },
  },
  chunli: {
    id: 'chunli', name: 'CHUN-LI 春麗', color: '#60a5fa',
    trait: '🦵 超高速百裂腳・迴旋鶴腳蹴・氣功拳與奧義氣功掌',
    guide: {
      summary: '《Street Fighter》迅捷腿技大師！高機動連踢壓制極強，百裂腳高速累積損傷%，迴旋鶴腳蹴兼具突進與回場能力。',
      steps: [
        '貼身近戰連打【普攻 J】接【特招 K】百裂腳，瞬間狂刷多段連擊！',
        '橫向追擊或懸崖回場使用【左右+K】迴旋鶴腳蹴，空中亦可長時間水平滑行。',
        '高空俯衝用【下+K】霸山蹴砸地破招，遠距離則用【技能2 L】氣功拳牽制。',
      ],
      combo: 'J → K (百裂腳連刷) → 上+K (天昇腳沖天擊墜)',
    },
    loadout: {
      attack: 'chunli.a1', ...tilts('chunli'),
      skill1: 'chunli.hyakuretsu', 'skill1:side': 'chunli.sbk', 'skill1:up': 'chunli.tensho', 'skill1:down': 'chunli.hazanshu',
      skill2: 'chunli.kikoken', ...smashes('chunli'), ult: 'chunli.kikosho',
    },
  },
  yugi: {
    id: 'yugi', name: 'YUGI 武藤遊戲', color: '#a855f7',
    trait: '🃏 黑魔導貫穿炮・神聖彗星反擊・艾克佐迪亞封印！',
    guide: {
      summary: '《遊戲王》初代決鬥王！兼具魔導遠射、防反陷阱「反射力量」與天空龍召雷轟炸，打破大招球即可召喚艾克佐迪亞毀滅全場！',
      steps: [
        '中遠距離用【特招 K】黑・魔・導貫穿光束與【技能2 L】歐西里斯召雷彈控場轟炸。',
        '對手貼身強攻時按【下+K】發動「神聖彗星－反射力量－」，無敵彈飛周遭敵人！',
        '落出場外時用【上+K】光之護封劍直接向上瞬移回場，並用【左右+K】蓋亞槍殺突襲。',
      ],
      combo: '下+K (反射力量彈開) → K (黑魔導補刀) → L (天空龍召雷爆破)',
    },
    loadout: {
      attack: 'yugi.a1', ...tilts('yugi'),
      skill1: 'yugi.darkMagic', 'skill1:side': 'yugi.gaia', 'skill1:up': 'yugi.swords', 'skill1:down': 'yugi.mirrorForce',
      skill2: 'yugi.slifer', ...smashes('yugi'), ult: 'yugi.exodia',
    },
  },
  kaiba: {
    id: 'kaiba', name: 'KAIBA 海馬瀨人', color: '#67e8f9',
    trait: '🐉 毀滅的噴射白光・死之卡組病毒區・青眼究極龍！',
    guide: {
      summary: '《遊戲王》海馬娛樂集團社長！普攻就能射出卡片飛刃，搭配青眼白龍的貫穿噴射白光與死之卡組破壞病毒領域持續消耗敵人。',
      steps: [
        '平時用【普攻 J】卡片飛刃與【特招 K】毀滅的噴射白光從遠處壓制敵人。',
        '占領場地中央時按【下+K】啟動「死之卡組破壞病毒」，留下減速兼持續扣血的暗紫力場！',
        '中距離抓住對手破綻按【技能2 L】敵人控制器造成長硬直，再用【左右+K】青眼龍翼突進撞飛！',
      ],
      combo: '下+K (破壞病毒緩速扣血) → L (敵人控制器控制) → 左右+K / K (噴射白光)',
    },
    loadout: {
      attack: 'kaiba.a1', ...tilts('kaiba'),
      skill1: 'kaiba.burstStream', 'skill1:side': 'kaiba.wingDash', 'skill1:up': 'kaiba.blueEyesJet', 'skill1:down': 'kaiba.crushCard',
      skill2: 'kaiba.enemyController', ...smashes('kaiba'), ult: 'kaiba.ultimateDragon',
    },
  },
  omnom: {
    id: 'omnom', name: 'OM NOM 奧姆', color: '#4ade80',
    scale: 0.8, speedMult: 1.16, damageMult: 0.88, weightMult: 0.82,
    trait: '🍬 Cut the Rope 吃糖果小怪獸・蜘蛛絲拉扯控場・泡泡漂浮',
    guide: {
      summary: '《Cut the Rope》可愛綠色小怪獸！擅長用蜘蛛絲把敵人拉近並減速，再拋出糖果爆彈與三星糖果雨轟炸全場。',
      steps: [
        '先按【技能2 L】放蜘蛛絲減速陣拉扯敵人，再用【普攻 J】黏舌連咬輸出。',
        '中距離拋出【特招 K】糖果爆彈牽制，或用【左右+K】切斷繩索擺盪突擊！',
        '出界時用【上+K】泡泡浮空升天，超高垂直浮力輕鬆回場。',
      ],
      combo: 'L (蜘蛛絲吸敵緩速) → J → J (黏舌大口咬) → K (糖果爆彈)',
    },
    loadout: {
      attack: 'omnom.a1', ...tilts('omnom'),
      skill1: 'omnom.candy', 'skill1:side': 'omnom.ropeSwing', 'skill1:up': 'omnom.bubbleRise', 'skill1:down': 'omnom.chompSlam',
      skill2: 'omnom.spiderTrap', ...smashes('omnom'), ult: 'omnom.superCandy',
    },
  },
  tom: {
    id: 'tom', name: 'TOM 湯姆貓', color: '#94a3b8',
    trait: '🐱 Talking Tom 迴音學舌音波・奶油派轟臉・打翻牛奶緩速',
    guide: {
      summary: '《Talking Tom》靈活近戰騷擾型！用迴音音波貫穿牽制，打翻牛奶讓敵人滑倒緩速，再用奶油派把對手砸飛。',
      steps: [
        '中距離發射【特招 K】迴音學舌音波貫穿多人，並以【左右+K】靈貓飛撲貼身。',
        '站在平台要道按【下+K】打翻牛奶留下滑溜減速區，限制對手走位。',
        '高損傷時用【技能2 L】砸奶油派收頭！',
      ],
      combo: '下+K (牛奶緩速) → 左右+K (飛撲近身) → L (奶油派擊飛)',
    },
    loadout: {
      attack: 'tom.a1', ...tilts('tom'),
      skill1: 'tom.echoMeow', 'skill1:side': 'tom.pounce', 'skill1:up': 'tom.highJump', 'skill1:down': 'tom.milkSplash',
      skill2: 'tom.pieThrow', ...smashes('tom'), ult: 'tom.megaphone',
    },
  },
  ben: {
    id: 'ben', name: 'BEN 阿班博士', color: '#b45309',
    scale: 1.2, speedMult: 0.85, damageMult: 1.25, weightMult: 1.22,
    trait: '🧪 Talking Ben 化學毒霧區・隨機爆裂試管・"Yes?"/"No."',
    guide: {
      summary: '《Talking Ben》毒霧陣地學者！拋擲雙色化學試管爆破，並以腐蝕毒氣燒瓶封鎖平台持續累積損傷%。',
      steps: [
        '在敵人必經處按【技能2 L】放下腐蝕毒氣燒瓶，持續每秒造成高額毒傷。',
        '中遠距離連丟【特招 K】混合化學試管製造範圍爆風。',
        '近身被圍時按【下+K】「No.」拒絕震地把敵人統統彈開！',
      ],
      combo: 'L (毒氣燒瓶緩速扣血) → K (化學試管爆破) → 下+K (No. 震飛)',
    },
    loadout: {
      attack: 'ben.a1', ...tilts('ben'),
      skill1: 'ben.flask', 'skill1:side': 'ben.phoneDash', 'skill1:up': 'ben.labRocket', 'skill1:down': 'ben.noSlam',
      skill2: 'ben.acidZone', ...smashes('ben'), ult: 'ben.boomLab',
    },
  },
  crossy: {
    id: 'crossy', name: 'CHICKEN 過馬路雞', color: '#f8fafc',
    scale: 0.82, speedMult: 1.18, damageMult: 0.88, weightMult: 0.82,
    trait: '🐔 天天過馬路・召喚超速賽車與火車橫掃・滾動浮木貫穿',
    guide: {
      summary: '《Crossy Road》超高機動車禍召喚師！能開超速賽車突進、丟出貫穿滾木，大招更召喚全車道尖峰時刻撞飛全場！',
      steps: [
        '遠距用【特招 K】像素雞蛋彈與【技能2 L】河道浮木滾擊貫穿壓制。',
        '抓到對手落地空檔時用【左右+K】超速賽車衝撞高速撞飛！',
        '空中按【下+K】召喚高速火車重壓，或用【上+K】老鷹抓飛回場。',
      ],
      combo: 'L (浮木貫穿) → 左右+K (賽車衝撞) → 下+K (火車壓頂)',
    },
    loadout: {
      attack: 'crossy.a1', ...tilts('crossy'),
      skill1: 'crossy.egg', 'skill1:side': 'crossy.carDash', 'skill1:up': 'crossy.eagleLift', 'skill1:down': 'crossy.trainDrop',
      skill2: 'crossy.logThrow', ...smashes('crossy'), ult: 'crossy.highwayRush',
    },
  },
  red: {
    id: 'red', name: 'RED 怒鳥紅', color: '#dc2626',
    scale: 0.86, speedMult: 1.14, damageMult: 0.92, weightMult: 0.86,
    trait: '🐦 Angry Birds 彈弓全力暴衝・炸藥蛋空襲・神鷹 Mighty Eagle',
    guide: {
      summary: '《Angry Birds》高爆發撞擊專家！彈弓高速衝鋒與戰吼震波擊飛極強，空中還能下炸藥蛋反打底下對手。',
      steps: [
        '中距離按【特招 K】彈弓小鳥飛彈炸開敵陣，或【左右+K】彈弓全力暴衝直接撞飛！',
        '跳到敵人正上方按【下+K】白鳥炸藥蛋空襲，一邊下蛋轟炸一邊彈高閃避。',
        '被圍攻時開【技能2 L】怒鳥戰吼震波大範圍彈飛所有敵人！',
      ],
      combo: '左右+K (彈弓暴衝) → 下+K (炸藥蛋空襲) → L (怒鳥戰吼收頭)',
    },
    loadout: {
      attack: 'red.a1', ...tilts('red'),
      skill1: 'red.slingshot', 'skill1:side': 'red.dash', 'skill1:up': 'red.launchUp', 'skill1:down': 'red.eggBomb',
      skill2: 'red.battleCry', ...smashes('red'), ult: 'red.mightyEagle',
    },
  },
  steve: {
    id: 'steve', name: 'STEVE 史蒂夫', color: '#38bdf8',
    scale: 1.16, speedMult: 0.88, damageMult: 1.22, weightMult: 1.18,
    trait: '⛏️ Minecraft 鑽石劍・附魔弓箭・礦車突進・鐵砧重砸與 TNT',
    guide: {
      summary: '《Minecraft》全能方塊冒險家！擁有極快的附魔弓遠射、紅石礦車突進、高傷破盾鐵砧與大範圍 TNT 爆破。',
      steps: [
        '遠距用【特招 K】附魔弓箭與【技能2 L】點燃 TNT 炸彈封鎖平台。',
        '近身打【普攻 J → J】鑽石劍連斬，或從對手上方按【下+K】鐵砧重砸瞬間打出超高傷害！',
        '回場用【上+K】鞘翅煙火火箭，擁有全遊戲頂尖的垂直飛翔高度。',
      ],
      combo: 'L (丟 TNT 逼走位) → 左右+K (礦車撞飛) → 下+K (鐵砧砸下)',
    },
    loadout: {
      attack: 'steve.a1', ...tilts('steve'),
      skill1: 'steve.bow', 'skill1:side': 'steve.minecart', 'skill1:up': 'steve.elytra', 'skill1:down': 'steve.anvil',
      skill2: 'steve.tnt', ...smashes('steve'), ult: 'steve.enderDragon',
    },
  },
  arisa: {
    id: 'arisa', name: 'ARISA 亞里莎', color: '#10b981',
    trait: '🧝 Shadowverse 妖精連矢・疾風步・破魔蟲強襲・EP進化齊射',
    guide: {
      summary: '《Shadowverse 闇影詩章》森之精靈弓手！高攻速連矢搭配疾風步穿梭，並能展開聖樹結界緩速扣血再以破魔蟲強襲收頭。',
      steps: [
        '遠距離連發【特招 K】妖精引導箭，搭配【左右+K】妖精疾風步快速調整距離。',
        '在敵陣放【技能2 L】精靈聖樹結界緩速扣血，再以【下+K】破魔蟲強襲收頭！',
        '打破大招球開啟【EP 進化】，齊射妖精火箭雨橫掃舞台！',
      ],
      combo: 'L (聖樹結界) → K (妖精箭) → 下+K (破魔蟲強襲)',
    },
    loadout: {
      attack: 'arisa.a1', ...tilts('arisa'),
      skill1: 'arisa.fairyArrow', 'skill1:side': 'arisa.windStep', 'skill1:up': 'arisa.fairyWings', 'skill1:down': 'arisa.rhinoSlam',
      skill2: 'arisa.forestSeal', ...smashes('arisa'), ult: 'arisa.evolveBurst',
    },
  },
  chihiro: {
    id: 'chihiro', name: 'CHIHIRO 六平千礦', color: '#ef4444',
    trait: '🐟 Kagurabachi 妖刀「淵天」黑・錦・涅金魚水墨斬擊！',
    guide: {
      summary: '《神樂鉢》背負妖刀「淵天」的少年！高速居合拔刀搭配水墨黑金魚斬波遠近皆強。',
      steps: [
        '中距離施放【特招 K】妖刀「黑」金魚斬波貫穿牽制，並用【左右+K】「錦」高速突進貼身。',
        '被敵人圍攻時按【技能2 L】赤金魚吸收反擊環彈開周遭對手。',
        '用【上+K】「涅」昇龍斬空回場並連擊！',
      ],
      combo: 'J → J (居合斬) → 左右+K (錦突進) → L (赤金魚反擊環)',
    },
    loadout: { attack: 'chihiro.a1', ...tilts('chihiro'), skill1: 'chihiro.s1', 'skill1:side': 'chihiro.side', 'skill1:up': 'chihiro.up', 'skill1:down': 'chihiro.down', skill2: 'chihiro.s2', ...smashes('chihiro'), ult: 'chihiro.ult' },
  },
  ichi: {
    id: 'ichi', name: 'ICHI 伊奇', color: '#38bdf8',
    trait: '🐺 魔男伊奇・雷狐・夢貘・冰鯊・烏洛洛 3D 魔法召喚！',
    guide: {
      summary: '《魔男伊奇》首位男性魔女！出招會實際召喚出他收服的 3D 雷狐、夢貘、冰鯊與烏洛洛魔法共同作戰！',
      steps: [
        '按【特招 K】召喚 3D 金黃「雷狐」衝鋒並射出高速閃電！',
        '按【技能2 L】召喚 3D 紫色「夢貘」展開夢境吞噬緩速領域。',
        '大招同時召喚「雷狐＋冰鯊＋夢貘」三隻收服魔法齊聚爆發！',
      ],
      combo: 'L (召喚夢貘領域) → K (召喚雷狐電光) → 左右+K (冰鯊冰牙突襲)',
    },
    loadout: { attack: 'ichi.a1', ...tilts('ichi'), skill1: 'ichi.s1', 'skill1:side': 'ichi.side', 'skill1:up': 'ichi.up', 'skill1:down': 'ichi.down', skill2: 'ichi.s2', ...smashes('ichi'), ult: 'ichi.ult' },
  },
  ruri: {
    id: 'ruri', name: 'RURI 青木瑠璃', color: '#34d399',
    scale: 0.92, speedMult: 1.06, damageMult: 0.98, weightMult: 0.92,
    trait: '🐉 RuriDragon 龍之火炎吐息・角閃電與毒霧領域！',
    guide: {
      summary: '《瑠璃龍》覺醒龍族血統的女子高中生！同時擁有火炎吐息、毒霧領域與龍角放電。',
      steps: [
        '在敵人活動區按【技能2 L】施放龍角放電毒霧領域持續扣血。',
        '遠距離噴射【特招 K】龍之火炎吐息製造爆破，並用【左右+K】龍鱗暴衝撞飛。',
        '被擊出場外用【上+K】龍翼雷電升空回場！',
      ],
      combo: 'L (毒霧領域) → K (火炎吐息) → 下+K (青龍落雷)',
    },
    loadout: { attack: 'ruri.a1', ...tilts('ruri'), skill1: 'ruri.s1', 'skill1:side': 'ruri.side', 'skill1:up': 'ruri.up', 'skill1:down': 'ruri.down', skill2: 'ruri.s2', ...smashes('ruri'), ult: 'ruri.ult' },
  },
  nona: {
    id: 'nona', name: 'NONA 諾娜', color: '#e879f9',
    trait: '🪡 WITCHRIV 縫紉魔法「Altoare」貫穿魔針與銀線結界！',
    guide: {
      summary: '《WITCHRIV》縫紉魔法使！貫穿魔針高速連射搭配銀線束縛陣，讓對手寸步難行。',
      steps: [
        '中距離連續發射【特招 K】Altoare 貫穿魔針壓制走位。',
        '敵人近身時按下【技能2 L】展開縫紉絲線束縛陣緩速扣血。',
        '打破大招球發動萬針裁縫大破滅從天降下魔針雨！',
      ],
      combo: 'L (絲線束縛) → K (貫穿魔針) → 左右+K (魔絲滑行)',
    },
    loadout: { attack: 'nona.a1', ...tilts('nona'), skill1: 'nona.s1', 'skill1:side': 'nona.side', 'skill1:up': 'nona.up', 'skill1:down': 'nona.down', skill2: 'nona.s2', ...smashes('nona'), ult: 'nona.ult' },
  },
  gojo: {
    id: 'gojo', name: 'GOJO 五條悟', color: '#818cf8',
    scale: 1.12, speedMult: 0.96, damageMult: 1.18, weightMult: 1.12,
    trait: '♾️ 咒術迴戰・術式反轉「赫」、順轉「蒼」與虛式「茈」！',
    guide: {
      summary: '《咒術迴戰》現代最強咒術師！兼具爆裂「赫」、瞬移突襲與超高擊飛虛式「茈」。',
      steps: [
        '遠距用【特招 K】術式反轉「赫」製造大爆炸，或按【技能2 L】發射高擊飛虛式「茈」！',
        '利用【左右+K】無下限瞬間移動突襲近身接【普攻 J → J】黑閃連打。',
        '大招展開「無量空處」接終極虛式「茈」橫掃全場！',
      ],
      combo: '左右+K (瞬移) → J → J (黑閃) → L (虛式「茈」)',
    },
    loadout: { attack: 'gojo.a1', ...tilts('gojo'), skill1: 'gojo.s1', 'skill1:side': 'gojo.side', 'skill1:up': 'gojo.up', 'skill1:down': 'gojo.down', skill2: 'gojo.s2', ...smashes('gojo'), ult: 'gojo.ult' },
  },
  deku: {
    id: 'deku', name: 'DEKU 綠谷出久', color: '#22c55e',
    trait: '⚡ 我的英雄學院・ONE FOR ALL・Air Force 與底特律粉碎！',
    guide: {
      summary: '《我的英雄學院》第九代繼承者！高速 Shoot Style 踢技搭配黑鞭突進與強力震波。',
      steps: [
        '用【特招 K】Air Force 空氣彈遠程牽制，再按【左右+K】全覆蓋黑鞭突進貼身。',
        '近身打完普攻接【技能2 L】底特律粉碎震波大範圍彈飛對手！',
        '高空使用【下+K】曼徹斯特重踏一舉破招。',
      ],
      combo: 'K (空氣彈) → 左右+K (黑鞭突進) → L (底特律粉碎)',
    },
    loadout: { attack: 'deku.a1', ...tilts('deku'), skill1: 'deku.s1', 'skill1:side': 'deku.side', 'skill1:up': 'deku.up', 'skill1:down': 'deku.down', skill2: 'deku.s2', ...smashes('deku'), ult: 'deku.ult' },
  },
  yodaka: {
    id: 'yodaka', name: 'YODAKA 夜鷹', color: '#64748b',
    scale: 0.95, speedMult: 1.16, damageMult: 1.0, weightMult: 0.94,
    trait: '🥷 忍事 Shinobigoto・超速手裡劍與一擊必殺體術！',
    guide: {
      summary: '《忍事》最強忍者夜鷹！無血統卻擁有全場最快的體術突進與精準手裡劍連射。',
      steps: [
        '遠距連丟【特招 K】高速手裡劍壓制，抓空檔按【左右+K】夜鷹疾影暗殺步閃入貼身。',
        '被圍攻時用【技能2 L】煙霧忍者突襲環彈開所有敵人。',
        '地面重擊一擊必殺拳擊飛力極高！',
      ],
      combo: 'K (手裡劍) → 左右+K (疾影暗殺) → J → J (體術連擊)',
    },
    loadout: { attack: 'yodaka.a1', ...tilts('yodaka'), skill1: 'yodaka.s1', 'skill1:side': 'yodaka.side', 'skill1:up': 'yodaka.up', 'skill1:down': 'yodaka.down', skill2: 'yodaka.s2', ...smashes('yodaka'), ult: 'yodaka.ult' },
  },
  saki: {
    id: 'saki', name: 'SAKI 花海咲季', color: '#f43f5e',
    trait: '🎤 學園偶像大師・初星全力衝刺與舞台閃耀應援區！',
    guide: {
      summary: '《學園偶像大師》全能王牌偶像花海咲季！速度極快，能展開應援結界再以 Starlight 擊飛對手。',
      steps: [
        '站在戰場中心開【技能2 L】閃耀舞台應援區扣血兼緩速敵人。',
        '用【左右+K】初星學園全力衝刺高速追擊，配合【特招 K】Starlight 應援星彈！',
        '大招開啟初星 LIVE 降下華麗星光爆彈雨！',
      ],
      combo: 'L (舞台應援區) → 左右+K (全力衝刺) → K (星彈補刀)',
    },
    loadout: { attack: 'saki.a1', ...tilts('saki'), skill1: 'saki.s1', 'skill1:side': 'saki.side', 'skill1:up': 'saki.up', 'skill1:down': 'saki.down', skill2: 'saki.s2', ...smashes('saki'), ult: 'saki.ult' },
  },
  spe: {
    id: 'spe', name: 'SPECIAL WEEK 特別週', color: '#c084fc',
    scale: 0.96, speedMult: 1.14, damageMult: 0.96, weightMult: 0.94,
    trait: '🐎 賽馬娘・終盤「末腳」超加速＋日本總大將氣勢！',
    guide: {
      summary: '《賽馬娘 Pretty Derby》特別週！招牌「末腳」衝刺速度驚人，搭配特製紅蘿蔔爆彈橫掃跑道。',
      steps: [
        '中距離拋出【特招 K】特製紅蘿蔔飛彈炸出破綻。',
        '立刻接【左右+K】終盤「末腳」超加速貫穿並撞飛對手！',
        '貼身被抓時按【技能2 L】日本總大將氣勢震波震開敵軍。',
      ],
      combo: 'K (紅蘿蔔飛彈) → 左右+K (末腳加速撞飛) → L (總大將震波)',
    },
    loadout: { attack: 'spe.a1', ...tilts('spe'), skill1: 'spe.s1', 'skill1:side': 'spe.side', 'skill1:up': 'spe.up', 'skill1:down': 'spe.down', skill2: 'spe.s2', ...smashes('spe'), ult: 'spe.ult' },
  },
  kaoruko: {
    id: 'kaoruko', name: 'KAORUKO 和栗薰子', color: '#f9a8d4',
    trait: '🍰 薰香花朵凛然綻放・愛心草莓蛋糕彈與花香結界！',
    guide: {
      summary: '《薰香花朵凛然綻放》和栗薰子！用甜甜的草莓蛋糕爆彈與凛然花香領域掌控節奏。',
      steps: [
        '先開【技能2 L】暖心治癒花香結界緩速敵人，再用【特招 K】愛心草莓蛋糕彈轟炸。',
        '中距離按【左右+K】花朵凛然綻放衝刺近身打【普攻 J → J】連段。',
        '大招綻放「千朵櫻雨」漫天掉落草莓甜點炸彈！',
      ],
      combo: 'L (花香結界) → K (草莓蛋糕彈) → 左右+K (綻放衝刺)',
    },
    loadout: { attack: 'kaoruko.a1', ...tilts('kaoruko'), skill1: 'kaoruko.s1', 'skill1:side': 'kaoruko.side', 'skill1:up': 'kaoruko.up', 'skill1:down': 'kaoruko.down', skill2: 'kaoruko.s2', ...smashes('kaoruko'), ult: 'kaoruko.ult' },
  },
  stelle: {
    id: 'stelle', name: 'STELLE 星', color: '#94a3b8',
    trait: '🏏 崩壞：星穹鐵道・銀河球棒俠・炎槍穿刺與星穹列車！',
    guide: {
      summary: '《崩壞：星穹鐵道》開拓者星！毀滅球棒近戰極猛，切換存護炎槍可射出貫穿火柱與全場大招。',
      steps: [
        '近身用【普攻 J → J】銀河球棒打出「規則就是用來打破的！」。',
        '中距離按【特招 K】存護炎槍穿刺炮貫穿多人，被包夾按【技能2 L】炎之存護護盾爆發彈飛！',
        '大招召喚星穹列車全力衝撞全場！',
      ],
      combo: 'J → J (球棒連擊) → K (炎槍穿刺) → L (存護護盾爆)',
    },
    loadout: { attack: 'stelle.a1', ...tilts('stelle'), skill1: 'stelle.s1', 'skill1:side': 'stelle.side', 'skill1:up': 'stelle.up', 'skill1:down': 'stelle.down', skill2: 'stelle.s2', ...smashes('stelle'), ult: 'stelle.ult' },
  },
  lumine: {
    id: 'lumine', name: 'LUMINE 熒', color: '#fde047',
    trait: '✨ 原神・風渦劍氣・草超綻放領域與荒星墜落！',
    guide: {
      summary: '《原神》旅行者熒！自由切換風、岩、雷、草七元素力，領域控制與空中回場皆極強。',
      steps: [
        '施放【技能2 L】草元素超綻放領域持續傷害敵人。',
        '用【特招 K】風渦劍氣彈遠攻，再按【左右+K】雷極瞬閃突進接【下+K】荒星墜落！',
        '回場用【上+K】風場上升氣流穩穩飛回平台。',
      ],
      combo: 'L (超綻放領域) → 左右+K (雷極瞬閃) → 下+K (荒星墜落)',
    },
    loadout: { attack: 'lumine.a1', ...tilts('lumine'), skill1: 'lumine.s1', 'skill1:side': 'lumine.side', 'skill1:up': 'lumine.up', 'skill1:down': 'lumine.down', skill2: 'lumine.s2', ...smashes('lumine'), ult: 'lumine.ult' },
  },
  miyabi: {
    id: 'miyabi', name: 'MIYABI 星見雅', color: '#22d3ee',
    scale: 0.96, speedMult: 1.15, damageMult: 1.02, weightMult: 0.95,
    trait: '🦊 絕區零・妖刀「無尾」・冰焰妖狐斬波與霜月拔刀！',
    guide: {
      summary: '《絕區零》對空六課課長星見雅！極致迅捷的冰焰居合斬與貫穿妖狐斬波。',
      steps: [
        '中距離發射【特招 K】冰焰妖狐斬波貫穿敵陣。',
        '瞬間接【左右+K】六課極速納刀閃穿過敵人，再接【技能2 L】霜落星見結界爆！',
        '蓄滿地面重擊「霜月三段」一刀將對手轟出爆區！',
      ],
      combo: 'K (妖狐斬波) → 左右+K (納刀閃) → L (霜落結界爆)',
    },
    loadout: { attack: 'miyabi.a1', ...tilts('miyabi'), skill1: 'miyabi.s1', 'skill1:side': 'miyabi.side', 'skill1:up': 'miyabi.up', 'skill1:down': 'miyabi.down', skill2: 'miyabi.s2', ...smashes('miyabi'), ult: 'miyabi.ult' },
  },
  rover: {
    id: 'rover', name: 'ROVER 漂泊者', color: '#facc15',
    trait: '🌊 鳴潮・衍射光刃・鉤索突襲與聲骸共鳴爆發！',
    guide: {
      summary: '《鳴潮》失憶共鳴者漂泊者！衍射光刃高速貫穿，搭配鉤索突進與時滯重砸節奏極佳。',
      steps: [
        '用【特招 K】衍射光刃射擊遠距離消血，並按【左右+K】鉤索極速突襲！',
        '空中用【下+K】時滯領域重砸壓制下方敵人，或【技能2 L】聲骸共鳴環彈飛對手。',
        '大招解放「萬象歸一・時停光刃」瞬間清場！',
      ],
      combo: 'K (衍射光刃) → 左右+K (鉤索突襲) → L (聲骸共鳴環)',
    },
    loadout: { attack: 'rover.a1', ...tilts('rover'), skill1: 'rover.s1', 'skill1:side': 'rover.side', 'skill1:up': 'rover.up', 'skill1:down': 'rover.down', skill2: 'rover.s2', ...smashes('rover'), ult: 'rover.ult' },
  },
  rapi: {
    id: 'rapi', name: 'RAPI 拉毗', color: '#ef4444',
    scale: 1.04, speedMult: 0.95, damageMult: 1.12, weightMult: 1.06,
    trait: '🔫 NIKKE 勝利女神・戰術穿甲彈・空投集束雷與 Red Hood！',
    guide: {
      summary: '《NIKKE 勝利女神》反擊部隊隊長拉毗！強大中遠程槍火壓制搭配高爆導彈與 Red Hood 核心爆裂！',
      steps: [
        '持續用【特招 K】妮姬重裝穿甲彈與【普攻 J】戰術步槍遠程消耗。',
        '敵人躲在平台時用【技能2 L】高爆爆裂導彈炸飛掩體上的對手！',
        '近身用【左右+K】戰術突進或【下+K】空投高爆集束雷反擊。',
      ],
      combo: 'K (穿甲彈) → L (爆裂導彈) → 左右+K (戰術突進)',
    },
    loadout: { attack: 'rapi.a1', ...tilts('rapi'), skill1: 'rapi.s1', 'skill1:side': 'rapi.side', 'skill1:up': 'rapi.up', 'skill1:down': 'rapi.down', skill2: 'rapi.s2', ...smashes('rapi'), ult: 'rapi.ult' },
  },
  akira: {
    id: 'akira', name: 'AKIRA 百瀨晶', color: '#f472b6',
    trait: '💌 百瀨同學的初戀破綻百出・作戰筆記飛射與笨拙心動結界！',
    guide: {
      summary: '《百瀨同學的初戀破綻百出。》純情不器用女主角百瀨晶！看似冷靜卻總是狀況百出，用滿天飛舞的作戰筆記與心動結界贏得勝利。',
      steps: [
        '中距離拋出【特招 K】初戀作戰筆記飛射製造粉紅心動爆風！',
        '站穩場地中央按【技能2 L】展開初戀心動粉紅結界緩速並持續消耗對手。',
        '看準破綻使用【左右+K】「計畫通」全力衝刺撞飛，或大招降下「完璧的結婚作戰！」粉紅筆記雨！',
      ],
      combo: 'L (心動結界緩速) → K (作戰筆記爆彈) → 左右+K (計畫通衝刺)',
    },
    loadout: { attack: 'akira.a1', ...tilts('akira'), skill1: 'akira.s1', 'skill1:side': 'akira.side', 'skill1:up': 'akira.up', 'skill1:down': 'akira.down', skill2: 'akira.s2', ...smashes('akira'), ult: 'akira.ult' },
  },
  kotone: {
    id: 'kotone', name: 'KOTONE 藤田琴音', color: '#facc15',
    trait: '💛 學園偶像大師・世界第一可愛！黃金星光彈與大爆炸應援區！',
    guide: {
      summary: '《學園偶像大師》元氣打工偶像藤田琴音！機動性極高，用「Yellow Big Bang!」星光爆彈與應援結界閃耀全場。',
      steps: [
        '在戰場中央施放【技能2 L】黃色大爆炸應援區持續扣血兼緩速敵人。',
        '中距離連發【特招 K】Yellow Big Bang! 星光彈製造大範圍黃金爆風！',
        '抓準空檔用【左右+K】打工全速趕場衝刺突襲，大招降下「世界第一可愛的我！」黃金星雨！',
      ],
      combo: 'L (應援區) → K (Yellow Big Bang!) → 左右+K (全速趕場衝刺)',
    },
    loadout: { attack: 'kotone.a1', ...tilts('kotone'), skill1: 'kotone.s1', 'skill1:side': 'kotone.side', 'skill1:up': 'kotone.up', 'skill1:down': 'kotone.down', skill2: 'kotone.s2', ...smashes('kotone'), ult: 'kotone.ult' },
  },
  hutao: {
    id: 'hutao', name: 'HU TAO 胡桃', color: '#ef4444',
    scale: 0.9, speedMult: 1.12, damageMult: 0.96, weightMult: 0.9,
    trait: '🔥 原神・往生堂堂主・護摩之杖、血梅香突刺與安神秘法！',
    guide: {
      summary: '《原神》璃月往生堂第77代堂主胡桃！極具爆發力的火系長柄武器突刺與鬼火爆炸連段。',
      steps: [
        '中距離放出【特招 K】胡桃鬼火彈炸出破綻，再按【左右+K】血梅香火蝶突刺高速穿過對手！',
        '貼身時施放【技能2 L】彼岸蝶舞燃燒結界震飛周圍敵人！',
        '集滿大招施放元素爆發「安神秘法」，召喚巨型鬼火橫掃全場！',
      ],
      combo: 'K (鬼火彈) → 左右+K (血梅香突刺) → L (彼岸蝶舞爆發)',
    },
    loadout: { attack: 'hutao.a1', ...tilts('hutao'), skill1: 'hutao.s1', 'skill1:side': 'hutao.side', 'skill1:up': 'hutao.up', 'skill1:down': 'hutao.down', skill2: 'hutao.s2', ...smashes('hutao'), ult: 'hutao.ult' },
  },
  seija: {
    id: 'seija', name: 'SEIJA 鬼人正邪', color: '#e11d48',
    scale: 0.94, speedMult: 1.08, damageMult: 1.02, weightMult: 0.94,
    trait: '🔄 東方輝針城・天邪鬼逆轉彈幕！反轉箭矢、瞬移背刺與逆轉結界！',
    guide: {
      summary: '《東方輝針城》的反叛天邪鬼！擅長用可操控的逆轉箭矢與背刺突襲打亂對手節奏。',
      steps: [
        '使用【特招 K】逆符「Reverse Hierarchy」發射可上下操控的赤藍逆轉箭矢！',
        '被逼近時按【左右+K】瞬移到對手背後奇襲，或用【技能2 L】展開反轉力場減速敵人！',
        '集滿大招施放「Reverse Ideology」，從四面八方連射逆轉彈幕轟飛對手！',
      ],
      combo: 'K (逆轉箭矢) → 左右+K (逆針背刺) → L (反轉力場)',
    },
    loadout: { attack: 'seija.a1', ...tilts('seija'), skill1: 'seija.s1', 'skill1:side': 'seija.side', 'skill1:up': 'seija.up', 'skill1:down': 'seija.down', skill2: 'seija.s2', ...smashes('seija'), ult: 'seija.ult' },
  },
  youmu: {
    id: 'youmu', name: 'YOUMU 魂魄妖夢', color: '#34d399',
    scale: 0.96, speedMult: 1.16, damageMult: 1.04, weightMult: 0.94, extraJumps: 2,
    trait: '⚔️ 東方妖妖夢・樓觀劍×白樓劍二刀流！超高速居合與人鬼未來永劫斬！',
    guide: {
      summary: '《東方妖妖夢》白玉樓的半人半靈庭師！擁有極快跑速與樓觀劍蓄力斬擊。',
      steps: [
        '長按【普攻 J】蓄力樓觀劍居合斬，或連按打出二刀流三段連擊！',
        '按【特招 K】放出貫穿劍氣波，【左右+K】施展魂魄瞬閃貼臉斬擊！',
        '集滿大招施放「人鬼未來永劫斬」，瞬移圍繞對手連續斬擊並終結擊飛！',
      ],
      combo: 'J-J-J (二刀流連斬) → 左右+K (魂魄瞬閃) → 上+K (悟入幻想昇龍)',
    },
    loadout: { attack: 'youmu.a1', ...tilts('youmu'), skill1: 'youmu.s1', 'skill1:side': 'youmu.side', 'skill1:up': 'youmu.up', 'skill1:down': 'youmu.down', skill2: 'youmu.s2', ...smashes('youmu'), ult: 'youmu.ult' },
  },
  luigi: {
    id: 'luigi', name: 'LUIGI 路易吉', color: '#22c55e',
    scale: 1.02, speedMult: 1.0, damageMult: 1.02, weightMult: 0.98,
    trait: '👻 Super Mario・高跳躍、綠色火箭頭槌與鬼屋吸塵器「Poltergust」！',
    loadout: { attack: 'luigi.a1', ...tilts('luigi'), skill1: 'luigi.s1', 'skill1:side': 'luigi.side', 'skill1:up': 'luigi.up', 'skill1:down': 'luigi.down', skill2: 'luigi.s2', ...smashes('luigi'), ult: 'luigi.ult' },
  },
  blinky: {
    id: 'blinky', name: 'BLINKY 紅幽靈', color: '#ef4444',
    scale: 0.94, speedMult: 1.12, damageMult: 0.98, weightMult: 0.92,
    trait: '👻 Pac-Man・紅幽靈追擊瞬移與四色幽靈圍剿大陣！',
    loadout: { attack: 'blinky.a1', ...tilts('blinky'), skill1: 'blinky.s1', 'skill1:side': 'blinky.side', 'skill1:up': 'blinky.up', 'skill1:down': 'blinky.down', skill2: 'blinky.s2', ...smashes('blinky'), ult: 'blinky.ult' },
  },
  diddy: {
    id: 'diddy', name: 'DIDDY KONG 狄狄剛', color: '#dc2626',
    scale: 0.88, speedMult: 1.15, damageMult: 0.95, weightMult: 0.88,
    trait: '🥜 Donkey Kong・花生手槍、香蕉皮陷阱與噴射木桶背包！',
    loadout: { attack: 'diddy.a1', ...tilts('diddy'), skill1: 'diddy.s1', 'skill1:side': 'diddy.side', 'skill1:up': 'diddy.up', 'skill1:down': 'diddy.down', skill2: 'diddy.s2', ...smashes('diddy'), ult: 'diddy.ult' },
  },
  creeper: {
    id: 'creeper', name: 'CREEPER 苦力怕', color: '#4ade80',
    scale: 1.0, speedMult: 0.94, damageMult: 1.18, weightMult: 1.04,
    trait: '💣 Minecraft・嘶嘶蓄力自爆衝擊波與高壓雷電苦力怕！',
    loadout: { attack: 'creeper.a1', ...tilts('creeper'), skill1: 'creeper.s1', 'skill1:side': 'creeper.side', 'skill1:up': 'creeper.up', 'skill1:down': 'creeper.down', skill2: 'creeper.s2', ...smashes('creeper'), ult: 'creeper.ult' },
  },
  chuck: {
    id: 'chuck', name: 'CHUCK 飛鏢黃', color: '#facc15',
    scale: 0.86, speedMult: 1.24, damageMult: 0.92, weightMult: 0.84, extraJumps: 3,
    trait: '⚡ Angry Birds・全場最速三角加速鳥！點擊即達音速貫穿！',
    loadout: { attack: 'chuck.a1', ...tilts('chuck'), skill1: 'chuck.s1', 'skill1:side': 'chuck.side', 'skill1:up': 'chuck.up', 'skill1:down': 'chuck.down', skill2: 'chuck.s2', ...smashes('chuck'), ult: 'chuck.ult' },
  },
  suzuka: {
    id: 'suzuka', name: 'SUZUKA 無聲鈴鹿', color: '#22c55e',
    scale: 0.96, speedMult: 1.22, damageMult: 0.96, weightMult: 0.9,
    trait: '🐎 賽馬娘・異次元「大逃げ」極速領跑，讓對手連車尾燈都看不到！',
    loadout: { attack: 'suzuka.a1', ...tilts('suzuka'), skill1: 'suzuka.s1', 'skill1:side': 'suzuka.side', 'skill1:up': 'suzuka.up', 'skill1:down': 'suzuka.down', skill2: 'suzuka.s2', ...smashes('suzuka'), ult: 'suzuka.ult' },
  },
  firefly: {
    id: 'firefly', name: 'FIREFLY 流螢・薩姆', color: '#f97316',
    scale: 1.08, speedMult: 1.04, damageMult: 1.12, weightMult: 1.08, extraJumps: 2,
    trait: '🔥 星穹鐵道・裝甲「薩姆」焦土作戰與完全燃燒二刀流！',
    loadout: { attack: 'firefly.a1', ...tilts('firefly'), skill1: 'firefly.s1', 'skill1:side': 'firefly.side', 'skill1:up': 'firefly.up', 'skill1:down': 'firefly.down', skill2: 'firefly.s2', ...smashes('firefly'), ult: 'firefly.ult' },
  },
  ellen: {
    id: 'ellen', name: 'ELLEN 艾蓮・喬', color: '#ef4444',
    scale: 0.96, speedMult: 1.12, damageMult: 1.04, weightMult: 0.95,
    trait: '🦈 絕區零・維多利亞家政鯊魚妹！巡游急凍大剪刀與鯊捲風！',
    loadout: { attack: 'ellen.a1', ...tilts('ellen'), skill1: 'ellen.s1', 'skill1:side': 'ellen.side', 'skill1:up': 'ellen.up', 'skill1:down': 'ellen.down', skill2: 'ellen.s2', ...smashes('ellen'), ult: 'ellen.ult' },
  },
  jinhsi: {
    id: 'jinhsi', name: 'JINHSI 今汐', color: '#fde047',
    scale: 0.96, speedMult: 1.04, damageMult: 1.1, weightMult: 0.96, extraJumps: 2,
    trait: '🐉 鳴潮・今州令尹與歲主「角」共鳴！浮空龍息與韶光天降！',
    loadout: { attack: 'jinhsi.a1', ...tilts('jinhsi'), skill1: 'jinhsi.s1', 'skill1:side': 'jinhsi.side', 'skill1:up': 'jinhsi.up', 'skill1:down': 'jinhsi.down', skill2: 'jinhsi.s2', ...smashes('jinhsi'), ult: 'jinhsi.ult' },
  },
  anis: {
    id: 'anis', name: 'ANIS 阿妮絲', color: '#fb923c',
    scale: 0.98, speedMult: 0.96, damageMult: 1.1, weightMult: 1.02,
    trait: '💥 NIKKE・反擊部隊榴彈砲手！連發高爆蘇打榴彈與全場轟炸！',
    loadout: { attack: 'anis.a1', ...tilts('anis'), skill1: 'anis.s1', 'skill1:side': 'anis.side', 'skill1:up': 'anis.up', 'skill1:down': 'anis.down', skill2: 'anis.s2', ...smashes('anis'), ult: 'anis.ult' },
  },
  erika: {
    id: 'erika', name: 'ERIKA 艾莉卡', color: '#818cf8',
    scale: 0.94, speedMult: 1.14, damageMult: 1.02, weightMult: 0.94,
    trait: '⚔️ Shadowverse・皇家護衛疾馳劍士！潛行突刺與疾馳連擊！',
    loadout: { attack: 'erika.a1', ...tilts('erika'), skill1: 'erika.s1', 'skill1:side': 'erika.side', 'skill1:up': 'erika.up', 'skill1:down': 'erika.down', skill2: 'erika.s2', ...smashes('erika'), ult: 'erika.ult' },
  },
  vaus: {
    id: 'vaus', name: 'VAUS 打磚塊戰機', color: '#38bdf8',
    scale: 1.06, speedMult: 1.02, damageMult: 1.06, weightMult: 1.08,
    trait: '🧱 Atari Arkanoid・能量球反彈與雙管雷射！',
    loadout: { attack: 'vaus.a1', ...tilts('vaus'), skill1: 'vaus.s1', 'skill1:side': 'vaus.side', 'skill1:up': 'vaus.up', 'skill1:down': 'vaus.down', skill2: 'vaus.s2', ...smashes('vaus'), ult: 'vaus.ult' },
  },
  ...(Object.fromEntries(PARTNERS.map((p) => [p.id, {
    id: p.id, name: p.name, color: p.color,
    scale: p.scale, speedMult: p.speedMult, damageMult: p.damageMult, weightMult: p.weightMult,
    ...(p.extraJumps ? { extraJumps: p.extraJumps } : {}),
    trait: p.trait,
    loadout: { attack: `${p.id}.a1`, ...tilts(p.id), skill1: `${p.id}.s1`, 'skill1:side': `${p.id}.side`, 'skill1:up': `${p.id}.up`, 'skill1:down': `${p.id}.down`, skill2: `${p.id}.s2`, ...smashes(p.id), ult: `${p.id}.ult` },
  }])) as unknown as Record<(typeof PARTNERS)[number]['id'], CharacterDef>),
}
export const CHARACTER_IDS = Object.keys(CHARACTERS) as CharacterId[]
