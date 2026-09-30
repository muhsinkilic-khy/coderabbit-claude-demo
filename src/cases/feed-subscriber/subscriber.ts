import type { FeedMessage, FeedSocket } from './feed-socket.js'
import { createFeedSocket } from './feed-socket.js'

export interface SubscriberOptions {
  channels: string[]
  onMessage: (message: FeedMessage) => void
  heartbeatMs?: number
}

export class FeedSubscriber {
  private socket: FeedSocket
  private heartbeatTimer: NodeJS.Timeout | undefined
  private channels: string[]

  constructor(private readonly options: SubscriberOptions) {
    this.channels = options.channels
    this.socket = createFeedSocket()
  }

  subscribe(): void {
    this.socket.on('message', this.handleMessage)
    this.socket.on('close', () => this.reconnect())
    this.socket.connect()
    this.heartbeatTimer = setInterval(() => this.sendHeartbeat(), this.options.heartbeatMs ?? 15_000)
  }

  private handleMessage = (message: FeedMessage): void => {
    if (this.channels.includes(message.channel)) {
      this.options.onMessage(message)
    }
  }

  updateChannels(channels: string[]): void {
    this.channels = channels
    this.socket.on('message', this.handleMessage)
  }

  private reconnect(): void {
    this.socket = createFeedSocket()
    this.socket.on('message', this.handleMessage)
    this.socket.on('close', () => this.reconnect())
    this.socket.connect()
  }

  private sendHeartbeat(): void {
    this.socket.send({ channel: '_heartbeat', payload: { at: Date.now() } })
  }

  unsubscribe(): void {
    this.socket.removeAllListeners('message')
  }
}
