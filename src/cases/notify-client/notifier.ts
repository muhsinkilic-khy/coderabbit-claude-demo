export type AlertChannel = 'email' | 'sms' | 'push'

export interface AlertOptions {
  channel?: AlertChannel
  priority?: 'normal' | 'urgent'
}

export interface AlertResult {
  delivered: boolean
  channel: AlertChannel
}

export interface PushTokenStore {
  hasToken(userId: string): boolean
}

const DEFAULT_CHANNEL: AlertChannel = 'push'

const inMemoryPushTokens: PushTokenStore = {
  hasToken: () => false,
}

export async function sendAlert(
  userId: string,
  message: string,
  options: AlertOptions = {},
  pushTokens: PushTokenStore = inMemoryPushTokens,
): Promise<AlertResult> {
  const channel = options.channel ?? DEFAULT_CHANNEL
  const delivered = await deliver(userId, message, channel, pushTokens)
  return { delivered, channel }
}

async function deliver(
  userId: string,
  message: string,
  channel: AlertChannel,
  pushTokens: PushTokenStore,
): Promise<boolean> {
  if (channel === 'push') {
    return pushTokens.hasToken(userId)
  }
  return true
}

export function formatAlertMessage(message: string, priority: AlertOptions['priority']): string {
  return priority === 'urgent' ? `[URGENT] ${message}` : message
}
