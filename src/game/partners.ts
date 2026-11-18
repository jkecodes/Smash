/**
 * 「每個遊戲至少兩位角色」搭檔角色資料表。
 * 純資料檔（不 import 遊戲邏輯），由 characters / skills / portrait / avatar / stages 各自讀取。
 */
export const PARTNER_IDS = [
  'mino', 'ufo', 'blackbomber', 'viper', 'ladyfrog', 'paddle', 'omnelle', 'ducky',
  'hakuri', 'descara', 'umi', 'lovi', 'sukuna', 'bakugo', 'hibari', 'rintaro', 'hajime', 'doh',
] as const
export type PartnerId = typeof PARTNER_IDS[number]

export interface KitSpec {
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

export type PartnerFlag = 'charge' | 'tpSide' | 'ranged' | 'tpUp' | 'windUp' | 'counter' | 'trap' | 'gun' | 'martial' | 'caster'

export interface PartnerPortrait {
  bg: string; hair: string; outfit: string; accent: string; eye: string
  blindfold?: boolean; ears?: boolean; horns?: boolean; shortHair?: boolean; bobHair?: boolean; scar?: boolean; twintails?: boolean; witchHat?: boolean
}
export interface PartnerPreset {
  body: string; hair: string; accent: string
  prop?: 'katana' | 'spear' | 'orb' | 'horns' | 'ears' | 'bat' | 'rifle' | 'hat' | 'mic' | 'needle' | 'book'
  style?: 'sword' | 'spear' | 'martial' | 'gun' | 'idol' | 'mage'
  shortHair?: boolean; twintails?: boolean; hornColor?: string
}

export interface PartnerSpec {
  id: PartnerId
  name: string
  short: string
  color: string
  /** 同作品的主角色（沿用其場地） */
  partnerOf: string
  scale: number; speedMult: number; damageMult: number; weightMult: number
  trait: string
  portrait: PartnerPortrait
  preset: PartnerPreset
  kit: Omit<KitSpec, 'p' | 'color'>
  flags: PartnerFlag[]
}

export const PARTNERS: PartnerSpec[] = [
  {
    id: 'mino', name: 'MINO 米諾', short: 'MINO', color: '#a855f7', partnerOf: 'tetro',
    scale: 1.0, speedMult: 1.04, damageMult: 1.02, weightMult: 1.0,
    trait: '🧩 Tetris・方塊精靈！硬降重砸、T-Spin 旋轉與四消爆發。',
    portrait: { bg: '#2e1065', hair: '#22d3ee', outfit: '#7c3aed', accent: '#fde047', eye: '#22d3ee', shortHair: true },
    preset: { body: '#7c3aed', hair: '#22d3ee', accent: '#fde047', prop: 'orb', style: 'martial', shortHair: true },
    kit: {
      a1: '方塊撞擊', a2: '消行連打', tilts: ['I 型長條掃', 'T 型旋轉挑', 'O 型方塊下壓'],
      s1: { name: 'L 型落塊飛彈', projColor: '#fb923c', explode: 2.0, speed: 16 },
      side: 'S／Z 型滑行衝', up: 'I 型直立升空', down: '硬降（Hard Drop）重砸',
      s2: { name: '消行光束環', kind: 'ring', color: '#22d3ee' },
      smashes: ['T-Spin 重擊', '四消沖天', '堆疊震地'],
      ult: { name: 'TETRIS！四行消除大爆發', kind: 'burst', color: '#22d3ee' },
    },
    flags: ['martial', 'trap'],
  },
  {
    id: 'ufo', name: 'MYSTERY UFO 神秘飛碟', short: 'UFO', color: '#ef4444', partnerOf: 'invader',
    scale: 1.1, speedMult: 0.96, damageMult: 1.1, weightMult: 1.05,
    trait: '🛸 Space Invaders・神秘母艦！牽引光束與綠色光彈齊射。',
    portrait: { bg: '#450a0a', hair: '#ef4444', outfit: '#991b1b', accent: '#fca5a5', eye: '#fde047', shortHair: true },
    preset: { body: '#dc2626', hair: '#7f1d1d', accent: '#fca5a5', prop: 'orb', style: 'gun', shortHair: true },
    kit: {
      a1: '飛碟衝撞', a2: '雙連光彈', tilts: ['雷射橫掃', '上射光柱', '下掃光波'],
      s1: { name: 'UFO 紅色光彈', projColor: '#ef4444', pierce: true, speed: 20 },
      side: '低空掃射突進', up: '垂直拉昇', down: '牽引光束壓制',
      s2: { name: '神秘獎勵砲', kind: 'proj', color: '#ef4444' },
      smashes: ['母艦重砲', '天頂光束', '隕石轟擊'],
      ult: { name: 'Mystery Ship 侵略者艦隊降臨！', kind: 'barrage', color: '#ef4444' },
    },
    flags: ['ranged', 'trap', 'caster'],
  },
  {
    id: 'blackbomber', name: 'BLACK BOMBER 黑炸彈超人', short: 'BLK BOMB', color: '#64748b', partnerOf: 'bomber',
    scale: 1.0, speedMult: 1.02, damageMult: 1.06, weightMult: 1.0,
    trait: '🖤 Bomberman・黑炸彈宿敵！連鎖黑爆與十字炸裂。',
    portrait: { bg: '#0f172a', hair: '#111827', outfit: '#1f2937', accent: '#f97316', eye: '#ef4444', shortHair: true },
    preset: { body: '#1f2937', hair: '#111827', accent: '#f97316', prop: 'orb', style: 'martial', shortHair: true },
    kit: {
      a1: '黑炸彈拳', a2: '連環引信踢', tilts: ['地雷滑踢', '炸彈上拋', '黑火下壓'],
      s1: { name: '黑色連鎖炸彈', projColor: '#475569', explode: 2.4, speed: 15 },
      side: '炸彈跳躍突進', up: '爆風反衝升空', down: '定時黑炸彈',
      s2: { name: '黑爆十字轟炸', kind: 'ring', color: '#f97316' },
      smashes: ['超黑炸彈重擊', '爆風升龍', '連環地雷震'],
      ult: { name: 'Dark Bomber 連鎖黑爆！', kind: 'burst', color: '#f97316' },
    },
    flags: ['ranged', 'trap', 'martial'],
  },
  {
    id: 'viper', name: 'VIPER 對手毒蛇', short: 'VIPER', color: '#a3e635', partnerOf: 'snake',
    scale: 0.96, speedMult: 1.1, damageMult: 1.0, weightMult: 0.94,
    trait: '🐍 Snake・劇毒競爭蛇！蛇行突進、毒牙噴射與無盡吞噬。',
    portrait: { bg: '#1a2e05', hair: '#65a30d', outfit: '#3f6212', accent: '#d9f99d', eye: '#fde047', shortHair: true },
    preset: { body: '#4d7c0f', hair: '#365314', accent: '#bef264', prop: 'needle', style: 'martial', shortHair: true },
    kit: {
      a1: '蛇信突刺', a2: '纏繞絞擊', tilts: ['蛇尾橫掃', '抬頭上咬', '貼地下絞'],
      s1: { name: '毒牙噴射', projColor: '#a3e635', pierce: true, speed: 21 },
      side: '蛇行突進', up: '蛇身彈簧升空', down: '盤繞震地',
      s2: { name: '劇毒霧領域', kind: 'zone', color: '#84cc16' },
      smashes: ['致命一咬', '蛇首沖天', '巨蛇翻滾'],
      ult: { name: 'Ouroboros 無盡蛇群吞噬！', kind: 'rush', color: '#84cc16' },
    },
    flags: ['martial'],
  },
  {
    id: 'ladyfrog', name: 'LADY FROG 青蛙小姐', short: 'LADY FROG', color: '#f472b6', partnerOf: 'frogger',
    scale: 0.84, speedMult: 1.14, damageMult: 0.92, weightMult: 0.84,
    trait: '🐸 Frogger・粉紅青蛙小姐！荷葉彈跳與水泡連射。',
    portrait: { bg: '#500724', hair: '#f472b6', outfit: '#ec4899', accent: '#fde047', eye: '#111827', shortHair: true },
    preset: { body: '#ec4899', hair: '#f9a8d4', accent: '#fde047', prop: 'orb', style: 'mage', shortHair: true },
    kit: {
      a1: '舌頭甩擊', a2: '蛙跳踢', tilts: ['荷葉橫掃', '跳躍上踢', '蛙腿下踏'],
      s1: { name: '粉紅水泡彈', projColor: '#f472b6', explode: 1.9, speed: 16 },
      side: '長舌捲擊', up: '荷葉彈跳升空', down: '濺水重壓',
      s2: { name: '荷花綻放結界', kind: 'zone', color: '#f9a8d4' },
      smashes: ['三連跳重踢', '荷塘沖天', '水花震地'],
      ult: { name: 'Lily Pad 荷塘花雨！', kind: 'rain', color: '#f472b6' },
    },
    flags: ['windUp', 'caster'],
  },
  {
    id: 'paddle', name: 'PADDLE 對戰球拍', short: 'PADDLE', color: '#e2e8f0', partnerOf: 'pong',
    scale: 1.04, speedMult: 1.0, damageMult: 1.04, weightMult: 1.04,
    trait: '🏓 Pong・對面的球拍！殺球、反彈與全場多球。',
    portrait: { bg: '#0f172a', hair: '#e2e8f0', outfit: '#334155', accent: '#38bdf8', eye: '#e2e8f0', shortHair: true },
    preset: { body: '#475569', hair: '#e2e8f0', accent: '#38bdf8', prop: 'bat', style: 'martial', shortHair: true },
    kit: {
      a1: '球拍猛擊', a2: '反彈連擊', tilts: ['橫拍扇擊', '上挑殺球', '下切削球'],
      s1: { name: 'Pong 白色光球', projColor: '#e2e8f0', pierce: true, speed: 24 },
      side: '拍面疾推', up: '拍面彈射升空', down: '網前壓制',
      s2: { name: '雙拍夾擊波', kind: 'ring', color: '#38bdf8' },
      smashes: ['殺球重扣', '垂直反拍', '落地震場'],
      ult: { name: 'Match Point 全場多球狂潮！', kind: 'barrage', color: '#e2e8f0' },
    },
    flags: ['martial', 'ranged'],
  },
  {
    id: 'omnelle', name: 'OM NELLE 奧妮兒', short: 'OM NELLE', color: '#f472b6', partnerOf: 'omnom',
    scale: 0.8, speedMult: 1.14, damageMult: 0.9, weightMult: 0.82,
    trait: '🍬 Cut the Rope・奧姆的妹妹！糖果泡泡與黏舌甩擊。',
    portrait: { bg: '#4a044e', hair: '#e879f9', outfit: '#d946ef', accent: '#fde047', eye: '#111827', shortHair: true },
    preset: { body: '#d946ef', hair: '#f0abfc', accent: '#fde047', prop: 'orb', style: 'mage', shortHair: true },
    kit: {
      a1: '舌甩', a2: '甜點彈跳', tilts: ['糖果橫掃', '氣泡上彈', '軟糖下壓'],
      s1: { name: '粉紅糖果彈', projColor: '#f472b6', explode: 2.0, speed: 16 },
      side: '黏舌甩飛', up: '氣球升空', down: '糖果地雷',
      s2: { name: '粉紅糖霧領域', kind: 'zone', color: '#f9a8d4' },
      smashes: ['超級糖球', '氣球沖天', '甜點震地'],
      ult: { name: '三星糖果雨！', kind: 'rain', color: '#f472b6' },
    },
    flags: ['caster', 'trap'],
  },
  {
    id: 'ducky', name: 'DUCKY 馬路鴨', short: 'DUCKY', color: '#fde047', partnerOf: 'crossy',
    scale: 0.82, speedMult: 1.16, damageMult: 0.9, weightMult: 0.82,
    trait: '🦆 Crossy Road・過馬路的小鴨！羽毛飛鏢與全車道衝刺。',
    portrait: { bg: '#713f12', hair: '#fde047', outfit: '#facc15', accent: '#f97316', eye: '#111827', shortHair: true },
    preset: { body: '#facc15', hair: '#fef08a', accent: '#f97316', prop: 'orb', style: 'martial', shortHair: true },
    kit: {
      a1: '鴨嘴啄擊', a2: '拍翅連打', tilts: ['車道橫掃', '跳躍上啄', '俯衝下切'],
      s1: { name: '羽毛飛鏢', projColor: '#fde047', pierce: true, speed: 22 },
      side: '過馬路衝刺', up: '飛躍跨車', down: '鴨子墜擊',
      s2: { name: '呱呱衝擊波', kind: 'ring', color: '#facc15' },
      smashes: ['車流重撞', '鴨翼沖天', '路面震地'],
      ult: { name: 'Rush Hour 全車道大暴衝！', kind: 'rush', color: '#fde047' },
    },
    flags: ['martial', 'windUp'],
  },
  {
    id: 'hakuri', name: 'HAKURI ハクリ', short: 'HAKURI', color: '#e5e7eb', partnerOf: 'chihiro',
    scale: 1.04, speedMult: 1.06, damageMult: 1.1, weightMult: 1.02,
    trait: '🗡️ 神樂鉢・敵方劍士！居合瞬步與百閃連斬。',
    portrait: { bg: '#18181b', hair: '#e5e7eb', outfit: '#27272a', accent: '#f4f4f5', eye: '#ef4444', shortHair: true },
    preset: { body: '#27272a', hair: '#e5e7eb', accent: '#e5e7eb', prop: 'katana', style: 'sword', shortHair: true },
    kit: {
      a1: '妖刀抜刀斬', a2: '鉢劍連斬', tilts: ['居合橫斬', '逆刃上挑', '踏步下斬'],
      s1: { name: '妖刀斬波', projColor: '#e5e7eb', pierce: true, speed: 24 },
      side: '瞬步居合', up: '跳躍斬', down: '反擊居合',
      s2: { name: '妖刀結界斬環', kind: 'ring', color: '#e5e7eb' },
      smashes: ['妖刀重斬', '天昇斬', '震地斬'],
      ult: { name: '妖刀「千刃」百閃連斬！', kind: 'omnislash', color: '#e5e7eb' },
    },
    flags: ['charge', 'tpSide', 'counter'],
  },
  {
    id: 'descara', name: 'DESCARA デスカラス', short: 'DESCARA', color: '#7c3aed', partnerOf: 'ichi',
    scale: 0.98, speedMult: 1.04, damageMult: 1.06, weightMult: 0.96,
    trait: '🪶 魔男のイチ・深淵的魔女！烏鴉瞬移與深淵魔法。',
    portrait: { bg: '#2e1065', hair: '#18181b', outfit: '#4c1d95', accent: '#c4b5fd', eye: '#e879f9', bobHair: true, witchHat: true },
    preset: { body: '#4c1d95', hair: '#18181b', accent: '#c4b5fd', prop: 'hat', style: 'mage' },
    kit: {
      a1: '魔女掃帚擊', a2: '深淵連咒', tilts: ['鴉羽橫掃', '魔法上挑', '影爪下掃'],
      s1: { name: '深淵魔法彈（可操控）', projColor: '#7c3aed', explode: 2.0, speed: 17, steerable: 4.0 },
      side: '烏鴉瞬移', up: '黑羽升空', down: '深淵地雷陣',
      s2: { name: '深淵魔女領域', kind: 'zone', color: '#6d28d9' },
      smashes: ['深淵重炮', '烏鴉沖天', '影之震地'],
      ult: { name: '深淵之魔法「百鴉降臨」！', kind: 'rain', color: '#7c3aed' },
    },
    flags: ['caster', 'tpUp', 'trap'],
  },
  {
    id: 'umi', name: 'UMI 青木海', short: 'UMI', color: '#fbbf24', partnerOf: 'ruri',
    scale: 1.04, speedMult: 0.98, damageMult: 1.04, weightMult: 1.04,
    trait: '🍱 RuriDragon・淡定的媽媽！便當飛彈與家庭守護。',
    portrait: { bg: '#78350f', hair: '#451a03', outfit: '#d97706', accent: '#fde68a', eye: '#78350f', bobHair: true },
    preset: { body: '#d97706', hair: '#451a03', accent: '#fde68a', prop: 'book', style: 'mage' },
    kit: {
      a1: '家常拳', a2: '母愛掃帚', tilts: ['菜刀橫揮', '平底鍋上挑', '拖鞋下掃'],
      s1: { name: '便當飛彈', projColor: '#fbbf24', explode: 1.9, speed: 15 },
      side: '買菜衝刺', up: '晾衣竿躍升', down: '平底鍋重砸',
      s2: { name: '母親溫暖結界', kind: 'zone', color: '#f9a8d4' },
      smashes: ['鍋鏟全壘打', '衣架沖天', '家庭震地'],
      ult: { name: '「媽媽生氣了」家庭大爆發！', kind: 'burst', color: '#f97316' },
    },
    flags: ['caster', 'counter'],
  },
  {
    id: 'lovi', name: 'LOVI ロヴィ', short: 'LOVI', color: '#93c5fd', partnerOf: 'nona',
    scale: 0.94, speedMult: 1.08, damageMult: 0.98, weightMult: 0.94,
    trait: '👓 WITCHRIV・諾娜的摯友！書包揮擊與修復光線。',
    portrait: { bg: '#1e3a8a', hair: '#1e293b', outfit: '#3b82f6', accent: '#e0f2fe', eye: '#38bdf8', bobHair: true },
    preset: { body: '#3b82f6', hair: '#1e293b', accent: '#e0f2fe', prop: 'book', style: 'mage' },
    kit: {
      a1: '眼鏡突刺', a2: '書包揮擊', tilts: ['書包橫掃', '眼鏡反光上挑', '課桌下掃'],
      s1: { name: '修復光線', projColor: '#93c5fd', pierce: true, speed: 19 },
      side: '奔跑告白', up: '眼鏡跳躍', down: '課桌地雷',
      s2: { name: '友情護盾環', kind: 'ring', color: '#bfdbfe' },
      smashes: ['書包全壘打', '反光沖天', '教室震地'],
      ult: { name: '「監視局的告發」審判之雨！', kind: 'rain', color: '#93c5fd' },
    },
    flags: ['caster', 'ranged'],
  },
  {
    id: 'sukuna', name: 'SUKUNA 兩面宿儺', short: 'SUKUNA', color: '#ef4444', partnerOf: 'gojo',
    scale: 1.14, speedMult: 1.0, damageMult: 1.2, weightMult: 1.12,
    trait: '👹 咒術迴戰・詛咒之王！解・捌斬擊、竈火焰箭與伏魔御廚子。',
    portrait: { bg: '#450a0a', hair: '#f9a8d4', outfit: '#1c1917', accent: '#ef4444', eye: '#ef4444', shortHair: true, scar: true },
    preset: { body: '#1c1917', hair: '#f9a8d4', accent: '#ef4444', prop: 'katana', style: 'sword', shortHair: true },
    kit: {
      a1: '詛咒之拳', a2: '「解」連斬', tilts: ['「解」橫斬', '「捌」上挑', '斬空下切'],
      s1: { name: '「解」飛斬', projColor: '#ef4444', pierce: true, speed: 25 },
      side: '瞬步斬', up: '伏魔飛躍', down: '「捌」重斬',
      s2: { name: '「竈」火焰箭', kind: 'proj', color: '#f97316' },
      smashes: ['「開」重炎', '「捌」沖天', '伏魔震地'],
      ult: { name: '領域展開「伏魔御廚子」！', kind: 'hollow', color: '#ef4444' },
    },
    flags: ['charge', 'martial', 'tpSide'],
  },
  {
    id: 'bakugo', name: 'BAKUGO 爆豪勝己', short: 'BAKUGO', color: '#fb923c', partnerOf: 'deku',
    scale: 1.02, speedMult: 1.1, damageMult: 1.1, weightMult: 1.0,
    trait: '💥 我的英雄學院・爆破天才！連續爆破加速與榴彈砲撞擊。',
    portrait: { bg: '#7c2d12', hair: '#fde047', outfit: '#1f2937', accent: '#fb923c', eye: '#ef4444', shortHair: true },
    preset: { body: '#1f2937', hair: '#fde047', accent: '#fb923c', prop: 'orb', style: 'martial', shortHair: true },
    kit: {
      a1: '爆破拳', a2: '連環小爆破', tilts: ['爆破橫掃', '爆破上推', '爆破下炸'],
      s1: { name: '手榴彈爆破', projColor: '#fb923c', explode: 2.3, speed: 17 },
      side: '爆破加速衝', up: '爆破升空', down: '爆破地雷',
      s2: { name: '手榴彈衝擊波', kind: 'ring', color: '#f97316' },
      smashes: ['榴彈砲重擊', '爆破沖天', '爆炎震地'],
      ult: { name: 'Howitzer Impact 榴彈砲撞擊！', kind: 'burst', color: '#f97316' },
    },
    flags: ['martial', 'ranged', 'trap'],
  },
  {
    id: 'hibari', name: 'HIBARI 雲雀', short: 'HIBARI', color: '#94a3b8', partnerOf: 'yodaka',
    scale: 0.94, speedMult: 1.18, damageMult: 1.0, weightMult: 0.92,
    trait: '🥷 SHINOBI GOTO・9 號部隊！忍法瞬身與猪心通合擊。',
    portrait: { bg: '#1e293b', hair: '#475569', outfit: '#0f172a', accent: '#94a3b8', eye: '#38bdf8', bobHair: true },
    preset: { body: '#0f172a', hair: '#475569', accent: '#94a3b8', prop: 'katana', style: 'sword' },
    kit: {
      a1: '忍刀連斬', a2: '雲雀雙連', tilts: ['忍術橫掃', '猪心通上踢', '影縫下掃'],
      s1: { name: '手裏劍連射', projColor: '#cbd5e1', speed: 24 },
      side: '忍法瞬身', up: '屋簷躍空', down: '空中苦無急襲',
      s2: { name: '猪心通結界', kind: 'ring', color: '#94a3b8' },
      smashes: ['一閃', '忍者沖天', '忍道震地'],
      ult: { name: '9 號部隊「合擊忍術」！', kind: 'rush', color: '#94a3b8' },
    },
    flags: ['tpSide', 'tpUp', 'martial'],
  },
  {
    id: 'rintaro', name: 'RINTARO 凜太郎', short: 'RINTARO', color: '#fda4af', partnerOf: 'kaoruko',
    scale: 1.08, speedMult: 0.98, damageMult: 1.08, weightMult: 1.06,
    trait: '🍰 薰香花朵凜然綻放・蛋糕店少年！重拳、花束與甜點守護。',
    portrait: { bg: '#4c0519', hair: '#fde68a', outfit: '#9f1239', accent: '#fda4af', eye: '#f43f5e', shortHair: true },
    preset: { body: '#9f1239', hair: '#fde68a', accent: '#fda4af', prop: 'book', style: 'martial', shortHair: true },
    kit: {
      a1: '蛋糕拳', a2: '凜然連擊', tilts: ['拳擊橫掃', '上勾拳', '低掃踢'],
      s1: { name: '凜然拳風', projColor: '#fda4af', speed: 20 },
      side: '蛋糕店衝刺', up: '花店跳躍', down: '蛋糕箱壓頂',
      s2: { name: '暖心花香領域', kind: 'zone', color: '#f9a8d4' },
      smashes: ['蛋糕全壘打', '花朵升龍', '甜點震地'],
      ult: { name: '「凜然綻放」千花櫻雨！', kind: 'rain', color: '#fda4af' },
    },
    flags: ['martial', 'counter'],
  },
  {
    id: 'hajime', name: 'HAJIME 久我山元', short: 'HAJIME', color: '#fde047', partnerOf: 'akira',
    scale: 1.04, speedMult: 1.14, damageMult: 1.04, weightMult: 1.0,
    trait: '🏃 百瀨同學的初戀破綻百出・鄉下運動少年！田徑衝刺與直球。',
    portrait: { bg: '#713f12', hair: '#1c1917', outfit: '#16a34a', accent: '#fde047', eye: '#1c1917', shortHair: true },
    preset: { body: '#16a34a', hair: '#1c1917', accent: '#fde047', prop: 'bat', style: 'martial', shortHair: true },
    kit: {
      a1: '鄉下少年拳', a2: '田徑連踢', tilts: ['橫掃踢', '上跳踢', '滑壘下掃'],
      s1: { name: '棒球直球', projColor: '#fbbf24', pierce: true, speed: 24 },
      side: '田徑衝刺', up: '跳遠升空', down: '滑壘重壓',
      s2: { name: '元氣衝擊波', kind: 'ring', color: '#fde047' },
      smashes: ['全壘打重擊', '跳高沖天', '鄉間震地'],
      ult: { name: '「遲鈍的告白」全力衝線！', kind: 'rush', color: '#fde047' },
    },
    flags: ['martial', 'windUp'],
  },
  {
    id: 'doh', name: 'DOH 多夫', short: 'DOH', color: '#a855f7', partnerOf: 'vaus',
    scale: 1.3, speedMult: 0.84, damageMult: 1.3, weightMult: 1.3,
    trait: '🗿 Arkanoid・次元王多夫！巨像重拳與全場磚塊轟炸。',
    portrait: { bg: '#2e1065', hair: '#a855f7', outfit: '#581c87', accent: '#e9d5ff', eye: '#ef4444', shortHair: true },
    preset: { body: '#581c87', hair: '#a855f7', accent: '#e9d5ff', prop: 'orb', style: 'martial', shortHair: true },
    kit: {
      a1: '石像撞擊', a2: '雙拳連擊', tilts: ['石拳橫掃', '石像上砸', '岩掌下壓'],
      s1: { name: 'Doh 彩色磚塊彈', projColor: '#a855f7', explode: 2.2, speed: 15 },
      side: '石像滑行', up: '漂浮升空', down: '巨石砸落',
      s2: { name: '磚塊落下結界', kind: 'zone', color: '#7c3aed' },
      smashes: ['巨像重拳', '磚塊沖天', '岩壁震地'],
      ult: { name: 'Dimension Controller 全場磚塊轟炸！', kind: 'rain', color: '#a855f7' },
    },
    flags: ['caster', 'trap'],
  },
]

export const PARTNER_STAGE_OF: Record<PartnerId, string> = Object.fromEntries(
  PARTNERS.map((p) => [p.id, p.partnerOf]),
) as Record<PartnerId, string>

export const partnerHas = (flag: PartnerFlag) => PARTNERS.filter((p) => p.flags.includes(flag)).map((p) => p.id as string)
