import { registerSkill } from './registry'
import { registerSmashes, registerTilts } from './directionalSkills'
import { sfx } from '../audio'
import { ALL_FIGHTER_IDS, type FighterId, type SkillContext, type Vec3 } from '../types'

export type TetroKind = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L'

export interface TetroDef {
  kind: TetroKind
  color: string
  /** 4 顆方塊在局部 (x, y) 的格點偏移 */
  blocks: [number, number][]
}

export const TETROMINOES: Record<TetroKind, TetroDef> = {
  I: { kind: 'I', color: '#00f0f0', blocks: [[0, -1.5], [0, -0.5], [0, 0.5], [0, 1.5]] },
  O: { kind: 'O', color: '#f0f000', blocks: [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]] },
  T: { kind: 'T', color: '#b84dff', blocks: [[-1, -0.5], [0, -0.5], [1, -0.5], [0, 0.5]] },
  S: { kind: 'S', color: '#00e850', blocks: [[-1, -0.5], [0, -0.5], [0, 0.5], [1, 0.5]] },
  Z: { kind: 'Z', color: '#ff3040', blocks: [[-1, 0.5], [0, 0.5], [0, -0.5], [1, -0.5]] },
  J: { kind: 'J', color: '#3080ff', blocks: [[-1, 0.5], [-1, -0.5], [0, -0.5], [1, -0.5]] },
  L: { kind: 'L', color: '#ff9000', blocks: [[-1, -0.5], [0, -0.5], [1, -0.5], [1, 0.5]] },
}

const KINDS: TetroKind[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L']

function makeBag(): TetroKind[] {
  const b = [...KINDS]
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[b[i], b[j]] = [b[j], b[i]]
  }
  return b
}

export interface TetroBoard {
  /** 6 列 (0=底, 5=頂) × 4 欄 (0..2=堆疊區, 3=消行井道) */
  grid: (string | null)[][]
  bag: TetroKind[]
  current: TetroKind
  next: TetroKind
  lastClear: { lines: number; text: string; color: string; until: number } | null
}

function createBoard(): TetroBoard {
  const bag = makeBag()
  const current = bag.pop()!
  const next = bag.pop()!
  return {
    grid: Array.from({ length: 6 }, () => [null, null, null, null]),
    bag,
    current,
    next,
    lastClear: null,
  }
}

const boards = Object.fromEntries(ALL_FIGHTER_IDS.map((id) => [id, createBoard()])) as Record<FighterId, TetroBoard>

export function getTetroBoard(id: FighterId): TetroBoard {
  return boards[id]
}

export function resetTetroBoards() {
  for (const id of ALL_FIGHTER_IDS) boards[id] = createBoard()
}

function advancePiece(b: TetroBoard): TetroDef {
  const used = TETROMINOES[b.current]
  b.current = b.next
  if (b.bag.length === 0) b.bag = makeBag()
  b.next = b.bag.pop()!
  return used
}

export function getReadyLines(id: FighterId): number {
  const b = boards[id]
  let n = 0
  for (let r = 0; r < 6; r++) {
    if (b.grid[r][0] && b.grid[r][1] && b.grid[r][2]) n++
  }
  return n
}

/**
 * 邊移動邊堆疊：將目前手中的真實俄羅斯方塊形狀（I/O/T/S/Z/J/L）
 * 從上方落入 4×6 迷你棋盤並貼合底部/既有方塊。
 */
function stackBlocks(c: SkillContext, _count: number) {
  const b = boards[c.caster.id]
  const piece = advancePiece(b)

  // 將 piece.blocks 正規化為整數局部座標 (dx >= 0, dy >= 0)
  const minX = Math.min(...piece.blocks.map(([x]) => x))
  const minY = Math.min(...piece.blocks.map(([, y]) => y))
  const cells = piece.blocks.map(([x, y]) => [Math.round(x - minX), Math.round(y - minY)] as [number, number])
  const width = Math.max(...cells.map(([x]) => x)) + 1

  // 簡化上手：優先把方塊落在左 3 欄（0..2），並自動修補底層空洞，確保每次出招都能穩定累積「待消行」！
  let bestOx = 0
  let bestRow = 99
  for (let ox = 0; ox <= Math.max(0, 3 - width); ox++) {
    let row = 5
    while (row >= 0) {
      const collides = cells.some(([dx, dy]) => {
        const r = row + dy
        const col = ox + dx
        if (r < 0 || col < 0 || col >= 3) return true
        return r < 6 && b.grid[r][col] !== null
      })
      if (collides) break
      row--
    }
    const landRow = row + 1
    if (landRow < bestRow) {
      bestRow = landRow
      bestOx = ox
    }
  }

  let placed = false
  if (bestRow < 6) {
    for (const [dx, dy] of cells) {
      const r = bestRow + dy
      const col = bestOx + dx
      if (r >= 0 && r < 6 && col >= 0 && col < 3 && !b.grid[r][col]) {
        b.grid[r][col] = piece.color
        placed = true
      }
    }
  }
  // 確保每次出招至少穩定補齊最底層未滿列中的 1 個完整待消行（不會因形狀卡洞）
  for (let r = 0; r < 6; r++) {
    if (!(b.grid[r][0] && b.grid[r][1] && b.grid[r][2])) {
      b.grid[r][0] = b.grid[r][0] ?? piece.color
      b.grid[r][1] = b.grid[r][1] ?? piece.color
      b.grid[r][2] = b.grid[r][2] ?? piece.color
      placed = true
      break
    }
  }
  void placed

  c.fx({
    kind: 'burst',
    pos: [c.caster.pos[0], c.caster.pos[1] + 1.1, 0],
    color: piece.color,
    ttl: 260,
    count: 6,
    speed: 3.5,
    size: 0.16,
  })
  // 若堆滿 4 列準備完成，發出提示音與金光環
  if (getReadyLines(c.caster.id) >= 4) {
    sfx('charge', 0.95)
    c.fx({ kind: 'ring', pos: [...c.caster.pos], color: '#ffe066', ttl: 300, radius: 1.5 })
  }
}

/**
 * 落塊並執行消行爆發（SINGLE / DOUBLE / TRIPLE / TETRIS!）：
 * 自動填滿第 4 欄井道，根據一次消除的行數觸發不同規模的追加轟炸！
 */
function dropAndClear(c: SkillContext) {
  const b = boards[c.caster.id]
  const piece = advancePiece(b)

  // 把所有左 3 欄已滿的列，在第 4 欄補齊
  let completed = 0
  for (let r = 0; r < 6; r++) {
    if (b.grid[r][0] && b.grid[r][1] && b.grid[r][2]) {
      b.grid[r][3] = piece.color
      completed++
    }
  }
  // 若尚未堆滿任何一整列，保底直接填滿最底下一列觸發 1 行消除 (SINGLE)
  if (completed === 0) {
    for (let col = 0; col < 4; col++) b.grid[0][col] = piece.color
  }

  // 檢查並移除所有 4 欄全滿的列
  let cleared = 0
  const nextGrid: (string | null)[][] = []
  for (let r = 0; r < 6; r++) {
    if (b.grid[r][0] && b.grid[r][1] && b.grid[r][2] && b.grid[r][3]) {
      cleared++
    } else {
      nextGrid.push(b.grid[r])
    }
  }
  while (nextGrid.length < 6) nextGrid.push([null, null, null, null])
  b.grid = nextGrid

  const lines = Math.min(4, Math.max(1, cleared))
  triggerLineClearAttack(c, b, lines, piece.color)
}

function triggerLineClearAttack(c: SkillContext, b: TetroBoard, lines: number, pieceColor: string) {
  const me = c.caster
  const enemy = c.nearestEnemy()
  const dirX = enemy ? Math.sign(enemy.pos[0] - me.pos[0]) || me.facing[0] : me.facing[0]
  const labels = ['', 'SINGLE!', 'DOUBLE!!', 'TRIPLE!!!', '⚡TETRIS!!']
  const colors = ['', '#00f0f0', '#00e850', '#ff9000', '#ffe066']
  const label = labels[lines] ?? 'TETRIS!!'
  const col = colors[lines] ?? pieceColor

  b.lastClear = { lines, text: label, color: col, until: performance.now() + 1500 }

  if (lines === 1) {
    // 1 行 (SINGLE)：發射一顆高速方塊飛彈
    sfx('shoot')
    c.spawnProjectile({
      pos: [me.pos[0] + dirX * 0.9, me.pos[1] + 0.3, 0],
      vel: [dirX * 21, 1.5, 0],
      radius: 0.45,
      ttlMs: 1300,
      color: '#00f0f0',
    })
    c.fx({ kind: 'ring', pos: [...me.pos], color: '#00f0f0', ttl: 300, radius: 1.8 })
  } else if (lines === 2) {
    // 2 行 (DOUBLE)：上下雙連發爆破方塊彈 + 回復能量
    sfx('shoot')
    me.energy = Math.min(100, me.energy + 15)
    for (const vy of [-2, 4.5]) {
      c.spawnProjectile({
        pos: [me.pos[0] + dirX * 0.9, me.pos[1] + 0.3, 0],
        vel: [dirX * 22, vy, 0],
        radius: 0.52,
        ttlMs: 1400,
        color: '#00e850',
        explodeRadius: 1.8,
      })
    }
    c.fx({ kind: 'ring', pos: [...me.pos], color: '#00e850', ttl: 400, radius: 2.5 })
    c.shake(0.35)
  } else if (lines === 3) {
    // 3 行 (TRIPLE)：朝前方連續轟出三顆重型拋物線爆裂巨塊 + 鎖定雷柱
    sfx('boom')
    me.energy = Math.min(100, me.energy + 25)
    for (let i = 0; i < 3; i++) {
      c.spawnProjectile({
        pos: [me.pos[0] + dirX * (1.2 + i * 1.6), me.pos[1] + 4.5 + i * 0.8, 0],
        vel: [dirX * 4, -22, 0],
        radius: 0.65,
        ttlMs: 1400,
        color: TETROMINOES[KINDS[i * 2] ?? 'L'].color,
        gravity: -20,
        explodeRadius: 2.3,
      })
    }
    c.fx({ kind: 'ring', pos: [...me.pos], color: '#ff9000', ttl: 500, radius: 3.4 })
    c.shake(0.6)
  } else {
    // 4 行 (⚡ TETRIS!! 大滿貫)：全場震動 + 超巨型貫穿毀滅光束 + 3 連發彩色穿甲塊！
    sfx('ultReady')
    sfx('boom')
    me.energy = 100
    const beamPos: Vec3 = [me.pos[0] + dirX * 0.8, me.pos[1] + 0.2, 0]
    const yaw = dirX >= 0 ? Math.PI / 2 : -Math.PI / 2
    c.fx({ kind: 'beam', pos: beamPos, yaw, length: 22, radius: 1.25, color: '#00f0f0', ttl: 550 })
    c.fx({ kind: 'ring', pos: [...me.pos], color: '#ffe066', ttl: 650, radius: 5.0 })
    c.fx({ kind: 'burst', pos: beamPos, color: '#ffffff', ttl: 700, count: 60, speed: 12, size: 0.26 })
    for (const vy of [-3, 0, 3]) {
      c.spawnProjectile({
        pos: beamPos,
        vel: [dirX * 34, vy, 0],
        radius: 0.75,
        ttlMs: 900,
        pierce: true,
        color: '#ffe066',
        explodeRadius: 2.5,
      })
    }
    c.shake(1.1)
  }
}

// =====================================================================
//  TETRO 招式註冊
// =====================================================================

/** 普攻 1：方塊連擊（每次出招自動在矩陣堆疊 2 格！） */
registerSkill({
  id: 'tetro.jab1', name: '轉塊擊', energyCost: 0,
  startupMs: 80, activeMs: 90, recoveryMs: 160,
  hitbox: { offset: [0, 0.1, 1.05], radius: 0.95 },
  damage: 4,
  knockback: { dir: [0, 0.2, 1], base: 4, scaling: 5, hitstunMs: 250 },
  chain: 'tetro.jab2',
  hooks: {
    onActive(c) {
      c.setLocalVelocity(0, null, 4)
      stackBlocks(c, 2)
      const col = TETROMINOES[getTetroBoard(c.caster.id).current].color
      c.fx({ kind: 'slash', pos: [c.caster.pos[0] + c.forward[0] * 0.9, c.caster.pos[1] + 0.1, 0], yaw: Math.atan2(c.forward[0], 0), plane: 'horizontal', tilt: 0.2, color: col, ttl: 210, radius: 1.45 })
    },
  },
})

registerSkill({
  id: 'tetro.jab2', name: 'L型重叩', energyCost: 0,
  startupMs: 95, activeMs: 110, recoveryMs: 260,
  hitbox: { offset: [0, 0.15, 1.2], radius: 1.1 },
  damage: 6,
  knockback: { dir: [0, 0.35, 1], base: 8, scaling: 10 },
  hooks: {
    onActive(c) {
      c.setLocalVelocity(0, null, 5.5)
      stackBlocks(c, 2)
      c.shake(0.15)
      c.fx({ kind: 'slash', pos: [c.caster.pos[0] + c.forward[0] * 1.0, c.caster.pos[1] + 0.15, 0], yaw: Math.atan2(c.forward[0], 0), plane: 'horizontal', tilt: -0.35, flip: true, color: '#ff9000', ttl: 240, radius: 1.7 })
    },
  },
})

// 方向普攻（前 / 上 / 下 tilt）：出招同時也會自動堆疊 2 格方塊！
registerSkill({
  id: 'tetro.fTilt', name: 'Z型橫斬', energyCost: 0,
  startupMs: 110, activeMs: 110, recoveryMs: 250,
  hitbox: { offset: [0, 0.1, 1.45], radius: 1.15 },
  damage: 7.5,
  knockback: { dir: [0, 0.25, 1], base: 8, scaling: 11 },
  hooks: {
    onActive(c) {
      c.setLocalVelocity(0, null, 6.5)
      stackBlocks(c, 2)
      c.shake(0.14)
      c.fx({ kind: 'slash', pos: [c.caster.pos[0] + c.forward[0] * 1.2, c.caster.pos[1] + 0.1, 0], yaw: Math.atan2(c.forward[0], 0), plane: 'horizontal', tilt: 0.1, color: '#ff3040', ttl: 240, radius: 1.85 })
    },
  },
})

registerSkill({
  id: 'tetro.uTilt', name: 'T轉對空', energyCost: 0,
  startupMs: 85, activeMs: 120, recoveryMs: 240,
  hitbox: { offset: [0, 1.2, 0.2], radius: 1.25 },
  damage: 6.5,
  knockback: { dir: [0, 1, 0.1], base: 9, scaling: 11 },
  hooks: {
    onActive(c) {
      stackBlocks(c, 2)
      c.shake(0.12)
      c.fx({ kind: 'ring', pos: [c.caster.pos[0], c.caster.pos[1] + 1.1, 0], color: '#b84dff', ttl: 250, radius: 1.4 })
    },
  },
})

registerSkill({
  id: 'tetro.dTilt', name: 'O塊貼地掃', energyCost: 0,
  startupMs: 80, activeMs: 100, recoveryMs: 220,
  hitbox: { offset: [0, -0.35, 1.25], radius: 1.0 },
  damage: 5.5,
  knockback: { dir: [0, 0.75, 0.5], base: 6, scaling: 8, hitstunMs: 320 },
  hooks: {
    onActive(c) {
      stackBlocks(c, 2)
      c.fx({ kind: 'ring', pos: [c.caster.pos[0] + c.forward[0] * 1.0, c.caster.pos[1] - 0.35, 0], color: '#f0f000', ttl: 230, radius: 1.2 })
    },
  },
})

/** 原地特招 (Skill 1)：硬降消行（Hard Drop & Line Clear） */
registerSkill({
  id: 'tetro.hardDrop', name: '硬降消行', energyCost: 0, cooldownMs: 1300,
  startupMs: 130, activeMs: 150, recoveryMs: 290,
  hitbox: { offset: [0, 0.1, 1.2], radius: 1.35 },
  damage: 9,
  knockback: { dir: [0, 0.45, 1], base: 11, scaling: 14 },
  hooks: {
    onActive(c) {
      const ready = getReadyLines(c.caster.id)
      // 根據準備好的消行數強化本體重擊傷害與擊飛
      if (ready >= 4) {
        c.caster.skill!.dmgMult *= 1.8
        c.caster.skill!.kbMult *= 1.55
      } else if (ready >= 2) {
        c.caster.skill!.dmgMult *= 1.35
        c.caster.skill!.kbMult *= 1.25
      }
      dropAndClear(c)
    },
  },
})

/** 左右 + 特招：S/Z 飛旋塊突進（快速位移 + 堆疊 3 格方塊） */
registerSkill({
  id: 'tetro.sideSpin', name: '飛旋塊突進', energyCost: 0, cooldownMs: 1700,
  startupMs: 110, activeMs: 260, recoveryMs: 280,
  hitbox: { offset: [0, 0, 0.95], radius: 1.05 },
  damage: 7.5,
  knockback: { dir: [0, 0.35, 1], base: 9, scaling: 12 },
  hooks: {
    onActive(c) {
      stackBlocks(c, 3)
      c.shake(0.15)
    },
    onTick(c) {
      if (c.phase !== 'active') return
      c.setLocalVelocity(0, 0, 19.5)
      c.scratch.tr = (c.scratch.tr ?? 0) - c.dt * 1000
      if (c.scratch.tr <= 0) {
        c.scratch.tr = 45
        const col = TETROMINOES[getTetroBoard(c.caster.id).current].color
        c.fx({ kind: 'afterimage', pos: [...c.caster.pos], color: col, ttl: 240 })
      }
    },
  },
})

/** 上 + 特招：I-Spin 沖天長條（高速垂直回場 + 堆疊 3 格方塊） */
registerSkill({
  id: 'tetro.upI', name: 'I型沖天', energyCost: 0, cooldownMs: 1400,
  startupMs: 90, activeMs: 300, recoveryMs: 340,
  hitbox: { offset: [0, 1.0, 0.25], radius: 1.2 },
  damage: 8.5,
  knockback: { dir: [0, 1, 0.15], base: 12, scaling: 15 },
  hooks: {
    onActive(c) {
      stackBlocks(c, 3)
      c.setLocalVelocity(0, 17.5, 2.5)
      c.shake(0.18)
      c.fx({ kind: 'pillar', pos: [...c.caster.pos], color: '#00f0f0', ttl: 380, radius: 0.9 })
    },
    onTick(c) {
      if (c.phase !== 'active') return
      c.scratch.tr = (c.scratch.tr ?? 0) - c.dt * 1000
      if (c.scratch.tr <= 0) {
        c.scratch.tr = 45
        c.fx({ kind: 'afterimage', pos: [...c.caster.pos], color: '#00f0f0', ttl: 260 })
      }
    },
  },
})

/** 下 + 特招：天降硬降重砸（從空中筆直砸落地面並觸發消行！） */
registerSkill({
  id: 'tetro.downDrop', name: '天降硬降', energyCost: 0, cooldownMs: 2000,
  startupMs: 110, activeMs: 420, recoveryMs: 320,
  hitbox: { offset: [0, -0.6, 0.2], radius: 1.25 },
  damage: 10,
  knockback: { dir: [0, -0.5, 0.8], base: 12, scaling: 15 },
  hooks: {
    onStart(c) {
      c.setVelocity(0, c.caster.grounded ? 6 : 0, 0)
    },
    onTick(c) {
      if (c.phase !== 'active') return
      c.setLocalVelocity(0, -28, 1.5)
      c.scratch.tr = (c.scratch.tr ?? 0) - c.dt * 1000
      if (c.scratch.tr <= 0) {
        c.scratch.tr = 40
        c.fx({ kind: 'afterimage', pos: [...c.caster.pos], color: '#b84dff', ttl: 240 })
      }
      if (c.isGrounded() && c.phaseMs > 50) {
        dropAndClear(c)
        c.endActive()
      }
    },
  },
})

/** 技能 2 (Skill 2)：矩陣全彈傾瀉（將矩陣中已累積的所有方塊化為散射彈跳炸彈！） */
registerSkill({
  id: 'tetro.matrixBurst', name: '矩陣全彈傾瀉', energyCost: 15, cooldownMs: 2600,
  startupMs: 180, activeMs: 120, recoveryMs: 320,
  hitbox: { offset: [0, 0.2, 0], radius: 2.2 },
  damage: 6,
  knockback: { dir: [0, 0.6, 1], base: 9, scaling: 12, radial: true },
  hooks: {
    onActive(c) {
      const b = getTetroBoard(c.caster.id)
      const colors: string[] = []
      for (let r = 0; r < 6; r++) {
        for (let col = 0; col < 4; col++) {
          if (b.grid[r][col]) {
            colors.push(b.grid[r][col]!)
            b.grid[r][col] = null
          }
        }
      }
      // 至少保底發射 3 顆，每多堆 2 格多射 1 顆（最多 8 顆）
      const shots = Math.min(8, Math.max(3, 2 + Math.ceil(colors.length / 2)))
      const dirX = c.forward[0]
      for (let i = 0; i < shots; i++) {
        const col = colors[i % colors.length] ?? TETROMINOES[KINDS[i % KINDS.length]].color
        const vx = dirX * (7 + i * 2.4)
        const vy = 6 + (i % 3) * 3.2
        c.spawnProjectile({
          pos: [c.caster.pos[0] + dirX * 0.6, c.caster.pos[1] + 0.6, 0],
          vel: [vx, vy, 0],
          radius: 0.42,
          ttlMs: 1500,
          color: col,
          gravity: -26,
          explodeRadius: 1.75,
        })
      }
      b.lastClear = { lines: shots, text: `${shots}x BURST!`, color: '#b84dff', until: performance.now() + 1200 }
      c.fx({ kind: 'ring', pos: [...c.caster.pos], color: '#b84dff', ttl: 400, radius: 2.6 })
      c.shake(0.45)
    },
  },
})

/** 蓄力重擊（前 / 上 / 下） */
registerSmashes('tetro', { color: '#00f0f0', names: ['T-Spin 重擊', 'I型升天砲', '方塊崩塌'] })

/** 大招 (Ult)：TETRIS 99 終極方塊風暴 */
registerSkill({
  id: 'tetro.grandMaster', name: '終極俄羅斯方塊', energyCost: 0, requiresUlt: true,
  startupMs: 550, activeMs: 1750, recoveryMs: 450,
  damage: 9,
  knockback: { dir: [0, 0.9, 1], base: 16, scaling: 15, radial: true },
  hooks: {
    onStart(c) {
      c.setGravityScale(0.1)
      c.setVelocity(0, 8, 0)
    },
    onTick(c) {
      if (c.phase === 'recovery') return
      c.setInvulnerable(120)
      if (c.phase !== 'active') return
      c.scratch.rain = (c.scratch.rain ?? 0) - c.dt * 1000
      if (c.scratch.rain <= 0) {
        c.scratch.rain = 120
        const idx = (c.scratch.idx ?? 0) as number
        c.scratch.idx = idx + 1
        const kind = KINDS[idx % KINDS.length]
        const col = TETROMINOES[kind].color
        const t = c.nearestEnemy()
        const cx = t ? t.pos[0] : c.caster.pos[0]
        const x = Math.max(-9.5, Math.min(9.5, cx + (Math.random() - 0.5) * 11))
        c.spawnProjectile({
          pos: [x, 14.5, 0],
          vel: [0, -20, 0],
          radius: 0.7,
          ttlMs: 1800,
          color: col,
          gravity: -14,
          explodeRadius: 2.2,
        })
      }
    },
    onEnd(c) {
      c.setGravityScale(1)
      // 結尾自動觸發一次 4 行 TETRIS 全屏雷射！
      triggerLineClearAttack(c, getTetroBoard(c.caster.id), 4, '#ffe066')
    },
  },
})

void registerTilts
