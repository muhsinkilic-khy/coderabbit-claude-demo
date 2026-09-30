import { EventEmitter } from 'node:events'

export interface FeedMessage {
  channel: string
  payload: unknown
}

export class FeedSocket extends EventEmitter {
  private connected = false

  connect(): void {
    this.connected = true
    queueMicrotask(() => this.emit('open'))
  }

  send(message: FeedMessage): void {
    if (!this.connected) throw new Error('socket not connected')
    queueMicrotask(() => this.emit('message', message))
  }

  close(): void {
    this.connected = false
    this.emit('close')
  }
}

export function createFeedSocket(): FeedSocket {
  return new FeedSocket()
}
