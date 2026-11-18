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
}
export const CHARACTER_IDS = Object.keys(CHARACTERS) as CharacterId[]
