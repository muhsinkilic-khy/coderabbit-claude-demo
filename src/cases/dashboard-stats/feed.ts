export interface ActivityEvent {
  id: string
  userId: string
  kind: 'order' | 'login' | 'refund'
  at: number
}

const activityHistory: ActivityEvent[] = []

function cloneEvent(event: ActivityEvent): ActivityEvent {
  return { ...event }
}

export function recordEvents(newEvents: ActivityEvent[]): ActivityEvent[] {
  for (const event of newEvents) {
    const alreadySeen = activityHistory.some((existing) => existing.id === event.id)
    if (!alreadySeen) {
      activityHistory.push(cloneEvent(event))
    }
  }
  return activityHistory.map(cloneEvent)
}

export function recentActivityForUser(userId: string, limit: number): ActivityEvent[] {
  const matches: ActivityEvent[] = []
  for (const event of activityHistory) {
    if (event.userId === userId) matches.push(event)
  }
  const normalizedLimit = Math.floor(limit)
  if (!(normalizedLimit > 0)) return []
  return matches.slice(-normalizedLimit).map(cloneEvent)
}

export function activityHistorySize(): number {
  return activityHistory.length
}
