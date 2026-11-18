import { create } from 'zustand'
import type { InputFrame } from './input'
import { runtime } from './runtime'
import { useGameStore } from './store'
import type { StageForm, StageId } from './stages'
import { ALL_FIGHTER_IDS, type CharacterId, type FighterId } from './types'

export type NetRole = 'offline' | 'host' | 'guest'

interface NetStore {
  role: NetRole
  status: 'disconnected' | 'connecting' | 'connected'
  roomCode: string | null
  mySlot: FighterId | null
  guests: FighterId[]
  error: string | null
  setNet: (patch: Partial<NetStore>) => void
}

export const useNetStore = create<NetStore>((set) => ({
  role: 'offline',
  status: 'disconnected',
  roomCode: null,
  mySlot: null,
  guests: [],
  error: null,
  setNet: (patch) => set(patch),
}))

const emptyInput = (): InputFrame => ({
  moveX: 0,
  moveY: 0,
  held: { jump: false, attack: false, skill1: false, skill2: false, ult: false, shield: false },
  pressed: { jump: false, attack: false, skill1: false, skill2: false, ult: false, shield: false },
})

export const netRuntime = {
  ws: null as WebSocket | null,
  remoteInputs: Object.fromEntries(ALL_FIGHTER_IDS.map((id) => [id, emptyInput()])) as Record<FighterId, InputFrame>,
  lastBroadcastMs: 0,
  lastInputMs: 0,
}

function sendRaw(obj: unknown) {
  if (netRuntime.ws?.readyState === WebSocket.OPEN) {
    netRuntime.ws.send(JSON.stringify(obj))
  }
}

function connectWs(onOpen: () => void) {
  if (netRuntime.ws && netRuntime.ws.readyState <= WebSocket.OPEN) {
    onOpen()
    return
  }
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:'
  const ws = new WebSocket(`${proto}//${location.host}/ws`)
  netRuntime.ws = ws
  useNetStore.getState().setNet({ status: 'connecting', error: null })

  ws.onopen = () => {
    useNetStore.getState().setNet({ status: 'connected' })
    onOpen()
  }

  ws.onmessage = (ev) => {
    let msg: any
    try { msg = JSON.parse(ev.data) } catch { return }
    const ns = useNetStore.getState()
    const gs = useGameStore.getState()

    if (msg.type === 'hosted') {
      ns.setNet({ role: 'host', roomCode: msg.code, mySlot: 'p1', guests: [], error: null })
      return
    }
    if (msg.type === 'joined') {
      ns.setNet({ role: 'guest', roomCode: msg.code, mySlot: msg.slot, error: null })
      return
    }
    if (msg.type === 'error') {
      ns.setNet({ error: msg.message })
      return
    }
    if (msg.type === 'closed') {
      ns.setNet({ role: 'offline', roomCode: null, mySlot: null, guests: [], error: msg.reason ?? '房間已關閉' })
      return
    }
    if (msg.type === 'peerJoined') {
      const guests = (msg.guests ?? []) as FighterId[]
      ns.setNet({ guests })
      const slot = msg.slot as FighterId
      const slotNum = ALL_FIGHTER_IDS.indexOf(slot) + 1
      if (slotNum > gs.playerCount) gs.setPlayerCount(slotNum)
      gs.setCpu(slot, 0)
      broadcastLobby()
      return
    }
    if (msg.type === 'peerLeft') {
      const guests = (msg.guests ?? []) as FighterId[]
      ns.setNet({ guests })
      const slot = msg.slot as FighterId
      gs.setCpu(slot, 1)
      broadcastLobby()
      return
    }
    if (msg.type === 'pick' && ns.role === 'host') {
      const from = msg.from as FighterId
      if (from && msg.charId) {
        gs.select(from, msg.charId as CharacterId)
        broadcastLobby()
      }
      return
    }
    if (msg.type === 'lobby' && ns.role === 'guest') {
      if (msg.stageId) gs.selectStage(msg.stageId as StageId)
      if (msg.stageForm) gs.setStageForm(msg.stageForm as StageForm)
      if (msg.playerCount) gs.setPlayerCount(msg.playerCount)
      if (msg.stockCount) gs.setStockCount(msg.stockCount)
      if (msg.selection) {
        for (const id of ALL_FIGHTER_IDS) {
          if (msg.selection[id]) gs.select(id, msg.selection[id])
        }
      }
      if (msg.cpu) {
        for (const id of ALL_FIGHTER_IDS) {
          if (msg.cpu[id] !== undefined) gs.setCpu(id, msg.cpu[id])
        }
      }
      if (msg.guests) ns.setNet({ guests: msg.guests })
      return
    }
    if (msg.type === 'start' && ns.role === 'guest') {
      if (msg.stageId) gs.selectStage(msg.stageId as StageId)
      if (msg.stageForm) gs.setStageForm(msg.stageForm as StageForm)
      if (msg.playerCount) gs.setPlayerCount(msg.playerCount)
      if (msg.stockCount) gs.setStockCount(msg.stockCount)
      if (msg.selection) {
        for (const id of ALL_FIGHTER_IDS) {
          if (msg.selection[id]) gs.select(id, msg.selection[id])
        }
      }
      gs.startMatch()
      return
    }
    if (msg.type === 'input' && ns.role === 'host') {
      const from = msg.from as FighterId
      if (!from || !msg.input) return
      const cur = netRuntime.remoteInputs[from]
      const inc = msg.input as InputFrame
      // 保留還沒被模擬消耗掉的 pressed 邊緣觸發
      for (const k of Object.keys(inc.pressed) as (keyof InputFrame['pressed'])[]) {
        if (inc.pressed[k]) cur.pressed[k] = true
      }
      cur.moveX = inc.moveX
      cur.moveY = inc.moveY
      cur.held = inc.held
      return
    }
    if (msg.type === 'state' && ns.role === 'guest') {
      applySnapshot(msg)
      return
    }
    if (msg.type === 'event' && ns.role === 'guest') {
      if (msg.kind === 'ultCutin') gs.triggerUltCutin(msg.data)
      else if (msg.kind === 'fatalFlash') gs.triggerFatalFlash(msg.x, msg.y)
      return
    }
  }

  ws.onclose = () => {
    netRuntime.ws = null
    useNetStore.getState().setNet({ status: 'disconnected', role: 'offline', roomCode: null, mySlot: null, guests: [] })
  }
}

function applySnapshot(msg: any) {
  const gs = useGameStore.getState()
  if (typeof msg.stageTime === 'number') runtime.stageTime = msg.stageTime
  if (msg.fighters) {
    for (const id of ALL_FIGHTER_IDS) {
      const snap = msg.fighters[id]
      const f = gs.fighters[id]
      if (!snap || !f) continue
      f.pos = snap.pos
      f.vel = snap.vel
      f.facing = snap.facing
      f.fsm = snap.fsm
      f.damage = snap.damage
      f.stocks = snap.stocks
      f.energy = snap.energy
      f.shield = snap.shield
      f.ultReady = snap.ultReady
      f.alive = snap.alive
      f.comboCount = snap.comboCount
      f.flashMs = snap.flashMs
      f.invulnMs = snap.invulnMs
      f.stats = snap.stats
      const rb = runtime.bodies[id]
      if (rb) {
        rb.setTranslation({ x: f.pos[0], y: f.pos[1], z: f.pos[2] }, true)
        rb.setLinvel({ x: f.vel[0], y: f.vel[1], z: f.vel[2] }, true)
      }
    }
  }
  if (msg.ball !== undefined) runtime.ball = msg.ball
  if (Array.isArray(msg.projectiles)) {
    runtime.projectiles = msg.projectiles.map((p: any) => ({
      ...p,
      source: { def: { id: p.skillId ?? '' }, hitSet: new Set(), kbMult: 1, dmgMult: 1 },
      trailMs: 0,
      gravity: 0,
      explodeRadius: 0,
      pierce: false,
      ttlMs: 999,
    }))
    useGameStore.setState((s) => ({ projVersion: s.projVersion + 1 }))
  }
  if (msg.phase === 'ended' && msg.winner && gs.phase !== 'ended') {
    gs.endMatch(msg.winner)
  }
}

export function hostRoom() {
  connectWs(() => sendRaw({ type: 'host' }))
}

export function joinRoom(code: string) {
  connectWs(() => sendRaw({ type: 'join', code }))
}

export function leaveRoom() {
  sendRaw({ type: 'leave' })
  netRuntime.ws?.close()
  netRuntime.ws = null
  useNetStore.getState().setNet({ role: 'offline', status: 'disconnected', roomCode: null, mySlot: null, guests: [], error: null })
}

export function sendPick(charId: CharacterId) {
  if (useNetStore.getState().role === 'guest') {
    sendRaw({ type: 'pick', charId })
  }
}

export function broadcastLobby() {
  if (useNetStore.getState().role !== 'host') return
  const gs = useGameStore.getState()
  sendRaw({
    type: 'lobby',
    stageId: gs.stageId,
    stageForm: gs.stageForm,
    playerCount: gs.playerCount,
    stockCount: gs.stockCount,
    selection: gs.selection,
    cpu: gs.cpu,
    guests: useNetStore.getState().guests,
  })
}

export function broadcastStart() {
  if (useNetStore.getState().role !== 'host') return
  const gs = useGameStore.getState()
  sendRaw({
    type: 'start',
    stageId: gs.stageId,
    stageForm: gs.stageForm,
    playerCount: gs.playerCount,
    stockCount: gs.stockCount,
    selection: gs.selection,
    cpu: gs.cpu,
  })
}

export function sendGuestInput(inp: InputFrame) {
  if (useNetStore.getState().role !== 'guest') return
  const now = performance.now()
  const hasPress = Object.values(inp.pressed).some(Boolean)
  if (!hasPress && now - netRuntime.lastInputMs < 16) return
  netRuntime.lastInputMs = now
  sendRaw({ type: 'input', input: inp })
}

export function broadcastStateIfHost() {
  if (useNetStore.getState().role !== 'host') return
  const now = performance.now()
  if (now - netRuntime.lastBroadcastMs < 33) return
  netRuntime.lastBroadcastMs = now
  const gs = useGameStore.getState()
  const fighters: Record<string, any> = {}
  for (const id of ALL_FIGHTER_IDS.slice(0, gs.playerCount)) {
    const f = gs.fighters[id]
    fighters[id] = {
      pos: f.pos, vel: f.vel, facing: f.facing, fsm: f.fsm,
      damage: f.damage, stocks: f.stocks, energy: f.energy, shield: f.shield,
      ultReady: f.ultReady, alive: f.alive, comboCount: f.comboCount,
      flashMs: f.flashMs, invulnMs: f.invulnMs, stats: f.stats,
    }
  }
  sendRaw({
    type: 'state',
    stageTime: runtime.stageTime,
    fighters,
    ball: runtime.ball,
    projectiles: runtime.projectiles.map((p) => ({
      id: p.id, owner: p.owner, pos: p.pos, vel: p.vel, radius: p.radius, color: p.color, skillId: p.source.def.id,
    })),
    phase: gs.phase,
    winner: gs.winner,
  })
}

export function broadcastNetEvent(ev: { kind: 'ultCutin'; data: any } | { kind: 'fatalFlash'; x: number; y: number }) {
  if (useNetStore.getState().role !== 'host') return
  sendRaw({ type: 'event', ...ev })
}
