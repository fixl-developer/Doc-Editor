import type { DocEditor } from "../core/DocEditor.js"

/**
 * Basic real-time collaboration client — NOT a CRDT/OT engine. It debounces
 * local edits, broadcasts the full document HTML to a WebSocket room, and
 * applies whatever the server last relayed. Last-write-wins: two people
 * typing in the same paragraph at the same instant can clobber each other.
 * This is intentionally a v0 "shared broadcast" model, not production
 * multi-user editing — see README for what a real CRDT rewrite would need.
 *
 * Talks to the companion hand-rolled WebSocket server in server/collabServer.mjs
 * (raw RFC6455 handshake/framing over Node's http+crypto — no ws/socket.io).
 */

export interface CollabUser {
  id: string
  name: string
}

export type CollabStatus = "connecting" | "connected" | "disconnected"

export interface CollabClientOptions {
  url: string
  room: string
  user: CollabUser
  editor: DocEditor
  debounceMs?: number
  onStatusChange?: (status: CollabStatus) => void
  onPresenceChange?: (users: CollabUser[]) => void
}

type OutgoingMessage =
  | { type: "join"; room: string; user: CollabUser }
  | { type: "update"; room: string; html: string; from: string }

type IncomingMessage =
  | { type: "update"; html: string; from: string }
  | { type: "presence"; users: CollabUser[] }

export class CollabClient {
  private ws: WebSocket | null = null
  private readonly opts: CollabClientOptions
  private unsubscribeChange: (() => void) | null = null
  private sendTimer: ReturnType<typeof setTimeout> | null = null
  private applyingRemote = false
  private reconnectAttempt = 0
  private closedByUser = false

  constructor(opts: CollabClientOptions) {
    this.opts = opts
    this.connect()
  }

  private connect(): void {
    this.opts.onStatusChange?.("connecting")
    const ws = new WebSocket(this.opts.url)
    this.ws = ws

    ws.addEventListener("open", () => {
      this.reconnectAttempt = 0
      this.opts.onStatusChange?.("connected")
      this.send({ type: "join", room: this.opts.room, user: this.opts.user })
      this.unsubscribeChange?.()
      this.unsubscribeChange = this.opts.editor.onDidChange((html) => this.scheduleBroadcast(html))
    })

    ws.addEventListener("message", (event) => {
      let msg: IncomingMessage
      try {
        msg = JSON.parse(event.data)
      } catch {
        return
      }
      if (msg.type === "update" && msg.from !== this.opts.user.id) {
        this.applyingRemote = true
        this.opts.editor.applyRemoteHTML(msg.html)
        this.applyingRemote = false
      } else if (msg.type === "presence") {
        this.opts.onPresenceChange?.(msg.users)
      }
    })

    ws.addEventListener("close", () => {
      this.opts.onStatusChange?.("disconnected")
      this.unsubscribeChange?.()
      this.unsubscribeChange = null
      if (!this.closedByUser) this.scheduleReconnect()
    })

    ws.addEventListener("error", () => {
      ws.close()
    })
  }

  private scheduleReconnect(): void {
    const delay = Math.min(1000 * 2 ** this.reconnectAttempt, 15000)
    this.reconnectAttempt++
    setTimeout(() => {
      if (!this.closedByUser) this.connect()
    }, delay)
  }

  private scheduleBroadcast(html: string): void {
    if (this.applyingRemote) return
    if (this.sendTimer) clearTimeout(this.sendTimer)
    this.sendTimer = setTimeout(() => {
      this.send({ type: "update", room: this.opts.room, html, from: this.opts.user.id })
    }, this.opts.debounceMs ?? 500)
  }

  private send(msg: OutgoingMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg))
    }
  }

  destroy(): void {
    this.closedByUser = true
    if (this.sendTimer) clearTimeout(this.sendTimer)
    this.unsubscribeChange?.()
    this.ws?.close()
  }
}
