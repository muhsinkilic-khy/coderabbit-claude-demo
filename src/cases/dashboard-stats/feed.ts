export interface ActivityEvent {
  id: string
  userId: string
  kind: 'order' | 'login' | 'refund'
  at: number
}

const activityHistory: ActivityEvent[] = []

export function recordEvents(newEvents: ActivityEvent[]): ActivityEvent[] {
  for (const event of newEvents) {
    const alreadySeen = activityHistory.some((existing) => existing.id === event.id)
    if (!alreadySeen) {
      activityHistory.push(event)
    }
  }
  return activityHistory
}

export function recentActivityForUser(userId: string, limit: number): ActivityEvent[] {
  const matches: ActivityEvent[] = []
  for (const event of activityHistory) {
    if (event.userId === userId) matches.push(event)
  }
  const normalizedLimit = Math.floor(limit)
  if (!(normalizedLimit > 0)) return []
  return matches.slice(-normalizedLimit)
}

export function activityHistorySize(): number {
  return activityHistory.length
}
