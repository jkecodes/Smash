import { createHash } from 'node:crypto'
import type { IncomingMessage } from 'node:http'
import type { Duplex } from 'node:stream'
import type { Plugin } from 'vite'

interface Client {
  socket: Duplex
  roomCode: string | null
  slot: string | null
  isHost: boolean
  buf: Buffer
}

interface Room {
  code: string
  host: Client
  guests: Map<string, Client>
}

const SLOTS = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8']

function encodeFrame(text: string): Buffer {
  const payload = Buffer.from(text, 'utf8')
  const len = payload.length
  if (len < 126) {
    const out = Buffer.allocUnsafe(2 + len)
    out[0] = 0x81
    out[1] = len
    payload.copy(out, 2)
    return out
  }
  if (len < 65536) {
    const out = Buffer.allocUnsafe(4 + len)
    out[0] = 0x81
    out[1] = 126
    out.writeUInt16BE(len, 2)
    payload.copy(out, 4)
    return out
  }
  const out = Buffer.allocUnsafe(10 + len)
  out[0] = 0x81
  out[1] = 127
  out.writeBigUInt64BE(BigInt(len), 2)
  payload.copy(out, 10)
  return out
}

function sendJson(c: Client, obj: unknown) {
  if (c.socket.destroyed) return
  try {
    c.socket.write(encodeFrame(JSON.stringify(obj)))
  } catch { /* ignore */ }
}

function decodeFrames(c: Client, onText: (txt: string) => void) {
  while (c.buf.length >= 2) {
    const b0 = c.buf[0]
    const b1 = c.buf[1]
    const opcode = b0 & 0x0f
    const masked = (b1 & 0x80) !== 0
    let len = b1 & 0x7f
    let off = 2
    if (len === 126) {
      if (c.buf.length < 4) return
      len = c.buf.readUInt16BE(2)
      off = 4
    } else if (len === 127) {
      if (c.buf.length < 10) return
      len = Number(c.buf.readBigUInt64BE(2))
      off = 10
    }
    const maskLen = masked ? 4 : 0
    if (c.buf.length < off + maskLen + len) return
    const payload = Buffer.allocUnsafe(len)
    if (masked) {
      const mask = c.buf.subarray(off, off + 4)
      const data = c.buf.subarray(off + 4, off + 4 + len)
      for (let i = 0; i < len; i++) payload[i] = data[i] ^ mask[i & 3]
    } else {
      c.buf.subarray(off, off + len).copy(payload)
    }
    c.buf = c.buf.subarray(off + maskLen + len)
    if (opcode === 0x8) {
      c.socket.end()
      return
    }
    if (opcode === 0x9) {
      // Pong
      const pong = Buffer.allocUnsafe(2 + payload.length)
      pong[0] = 0x8a
      pong[1] = payload.length
      payload.copy(pong, 2)
      c.socket.write(pong)
      continue
    }
    if (opcode === 0x1) onText(payload.toString('utf8'))
  }
}

function attachWsServer(httpServer: any) {
  if (!httpServer || httpServer.__smashWsAttached) return
  httpServer.__smashWsAttached = true
  const rooms = new Map<string, Room>()

  const genCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let code = ''
    do {
      code = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
    } while (rooms.has(code))
    return code
  }

  const cleanup = (c: Client) => {
    if (!c.roomCode) return
    const room = rooms.get(c.roomCode)
    if (!room) return
    if (c.isHost) {
      for (const g of room.guests.values()) {
        sendJson(g, { type: 'closed', reason: '房主已離開房間' })
        g.roomCode = null
        g.slot = null
      }
      rooms.delete(room.code)
    } else if (c.slot) {
      room.guests.delete(c.slot)
      sendJson(room.host, { type: 'peerLeft', slot: c.slot, guests: [...room.guests.keys()] })
    }
    c.roomCode = null
    c.slot = null
  }

  httpServer.on('upgrade', (req: IncomingMessage, socket: Duplex) => {
    if (!req.url?.startsWith('/ws')) return
    const key = req.headers['sec-websocket-key']
    if (!key) { socket.destroy(); return }
    const accept = createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64')
    socket.write(
      'HTTP/1.1 101 Switching Protocols\r\n' +
      'Upgrade: websocket\r\n' +
      'Connection: Upgrade\r\n' +
      `Sec-WebSocket-Accept: ${accept}\r\n\r\n`
    )
    const client: Client = { socket, roomCode: null, slot: null, isHost: false, buf: Buffer.alloc(0) }

    socket.on('data', (chunk: Buffer) => {
      client.buf = Buffer.concat([client.buf, chunk])
      decodeFrames(client, (txt) => {
        let msg: any
        try { msg = JSON.parse(txt) } catch { return }
        if (msg.type === 'host') {
          cleanup(client)
          const code = genCode()
          client.roomCode = code
          client.slot = 'p1'
          client.isHost = true
          rooms.set(code, { code, host: client, guests: new Map() })
          sendJson(client, { type: 'hosted', code, slot: 'p1' })
          return
        }
        if (msg.type === 'join') {
          cleanup(client)
          const code = String(msg.code ?? '').trim().toUpperCase()
          const room = rooms.get(code)
          if (!room) { sendJson(client, { type: 'error', message: `找不到房間 ${code}` }); return }
          const free = SLOTS.slice(1).find((s) => !room.guests.has(s))
          if (!free) { sendJson(client, { type: 'error', message: '房間已滿（最多 8 人）' }); return }
          client.roomCode = code
          client.slot = free
          client.isHost = false
          room.guests.set(free, client)
          sendJson(client, { type: 'joined', code, slot: free })
          sendJson(room.host, { type: 'peerJoined', slot: free, guests: [...room.guests.keys()] })
          return
        }
        if (msg.type === 'leave') { cleanup(client); return }
        if (!client.roomCode) return
        const room = rooms.get(client.roomCode)
        if (!room) return
        if (client.isHost) {
          for (const g of room.guests.values()) sendJson(g, msg)
        } else {
          sendJson(room.host, { ...msg, from: client.slot })
        }
      })
    })
    socket.on('close', () => cleanup(client))
    socket.on('error', () => cleanup(client))
  })
}

export function smashRelayPlugin(): Plugin {
  return {
    name: 'smash-ws-relay',
    configureServer(server) { attachWsServer(server.httpServer) },
    configurePreviewServer(server) { attachWsServer(server.httpServer) },
  }
}
