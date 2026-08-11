#!/usr/bin/env node
/**
 * Hand-rolled WebSocket server for @fixl/doc-editor's basic real-time
 * collaboration mode. Implements the RFC 6455 handshake and frame
 * format directly on top of Node's built-in `http` and `crypto` modules
 * — no `ws`/`socket.io`/`uWebSockets.js` dependency.
 *
 * This is a v0 "shared broadcast" relay: it does not merge concurrent
 * edits (no CRDT/OT). Each client debounces its local edits and sends
 * the full document HTML; the server just rebroadcasts the latest
 * version to everyone else in the same room. Good enough for a couple
 * of people co-editing a letter without stepping on each other too
 * often — not a Google-Docs-grade engine.
 *
 * Usage:
 *   node server/collabServer.mjs [port]
 */

import { createServer } from "node:http"
import { createHash, randomUUID } from "node:crypto"

const PORT = Number(process.argv[2] ?? process.env.PORT ?? 8787)
const WS_MAGIC = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"

/** roomId -> Map<socketId, { socket, user }> */
const rooms = new Map()

function getRoom(roomId) {
  if (!rooms.has(roomId)) rooms.set(roomId, new Map())
  return rooms.get(roomId)
}

function broadcastPresence(roomId) {
  const room = getRoom(roomId)
  const users = Array.from(room.values()).map((c) => c.user)
  const payload = encodeFrame(JSON.stringify({ type: "presence", users }))
  for (const client of room.values()) client.socket.write(payload)
}

function broadcastUpdate(roomId, html, fromId, senderId) {
  const room = getRoom(roomId)
  const payload = encodeFrame(JSON.stringify({ type: "update", html, from: fromId }))
  for (const [id, client] of room.entries()) {
    if (id === senderId) continue
    client.socket.write(payload)
  }
}

function acceptKey(clientKey) {
  return createHash("sha1").update(clientKey + WS_MAGIC).digest("base64")
}

function encodeFrame(text) {
  const payload = Buffer.from(text, "utf8")
  const len = payload.length
  let header
  if (len < 126) {
    header = Buffer.from([0x81, len])
  } else if (len < 65536) {
    header = Buffer.alloc(4)
    header[0] = 0x81
    header[1] = 126
    header.writeUInt16BE(len, 2)
  } else {
    header = Buffer.alloc(10)
    header[0] = 0x81
    header[1] = 127
    header.writeBigUInt64BE(BigInt(len), 2)
  }
  return Buffer.concat([header, payload])
}

/** Minimal RFC6455 frame decoder — handles single-frame text messages (sufficient for our JSON payloads). */
function decodeFrames(buffer, onMessage) {
  let offset = 0
  while (offset + 2 <= buffer.length) {
    const first = buffer[offset]
    const second = buffer[offset + 1]
    const opcode = first & 0x0f
    const masked = (second & 0x80) !== 0
    let payloadLen = second & 0x7f
    let cursor = offset + 2

    if (payloadLen === 126) {
      if (cursor + 2 > buffer.length) break
      payloadLen = buffer.readUInt16BE(cursor)
      cursor += 2
    } else if (payloadLen === 127) {
      if (cursor + 8 > buffer.length) break
      payloadLen = Number(buffer.readBigUInt64BE(cursor))
      cursor += 8
    }

    let maskKey = null
    if (masked) {
      if (cursor + 4 > buffer.length) break
      maskKey = buffer.subarray(cursor, cursor + 4)
      cursor += 4
    }

    if (cursor + payloadLen > buffer.length) break

    let payload = buffer.subarray(cursor, cursor + payloadLen)
    if (masked && maskKey) {
      const unmasked = Buffer.alloc(payloadLen)
      for (let i = 0; i < payloadLen; i++) unmasked[i] = payload[i] ^ maskKey[i % 4]
      payload = unmasked
    }

    if (opcode === 0x8) {
      onMessage(null, true) // close frame
    } else if (opcode === 0x1) {
      onMessage(payload.toString("utf8"), false)
    }

    offset = cursor + payloadLen
  }
  return buffer.subarray(offset)
}

const server = createServer((req, res) => {
  res.writeHead(200, { "content-type": "text/plain" })
  res.end("doc-editor collab server is running\n")
})

server.on("upgrade", (req, socket) => {
  const key = req.headers["sec-websocket-key"]
  if (!key) {
    socket.destroy()
    return
  }

  const responseHeaders = [
    "HTTP/1.1 101 Switching Protocols",
    "Upgrade: websocket",
    "Connection: Upgrade",
    `Sec-WebSocket-Accept: ${acceptKey(key)}`,
    "",
    "",
  ].join("\r\n")
  socket.write(responseHeaders)

  const socketId = randomUUID()
  let currentRoom = null
  let buffer = Buffer.alloc(0)

  socket.on("data", (chunk) => {
    buffer = Buffer.concat([buffer, chunk])
    buffer = decodeFrames(buffer, (text, isClose) => {
      if (isClose) {
        socket.end()
        return
      }
      if (!text) return
      let msg
      try {
        msg = JSON.parse(text)
      } catch {
        return
      }

      if (msg.type === "join") {
        currentRoom = msg.room
        getRoom(currentRoom).set(socketId, { socket, user: msg.user })
        broadcastPresence(currentRoom)
      } else if (msg.type === "update" && currentRoom) {
        broadcastUpdate(currentRoom, msg.html, msg.from, socketId)
      }
    })
  })

  const cleanup = () => {
    if (currentRoom && rooms.has(currentRoom)) {
      rooms.get(currentRoom).delete(socketId)
      broadcastPresence(currentRoom)
      if (rooms.get(currentRoom).size === 0) rooms.delete(currentRoom)
    }
  }

  socket.on("close", cleanup)
  socket.on("error", cleanup)
})

server.listen(PORT, () => {
  console.log(`doc-editor collab server listening on ws://localhost:${PORT}`)
})
