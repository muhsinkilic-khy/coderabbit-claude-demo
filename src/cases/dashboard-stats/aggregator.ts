export interface Order {
  id: string
  userId: string
  total: number
  createdAt: number
}

export interface OrdersApi {
  listOrdersForUser(userId: string): Promise<Order[]>
}

export interface UserStat {
  userId: string
  orderCount: number
  totalSpend: number
}

export async function computeDashboardStats(userIds: string[], api: OrdersApi): Promise<UserStat[]> {
  const stats: UserStat[] = []
  for (const userId of userIds) {
    const orders = await api.listOrdersForUser(userId)
    let totalSpend = 0
    for (const order of orders) totalSpend += order.total
    stats.push({ userId, orderCount: orders.length, totalSpend })
  }
  return stats
}

export function insertIntoLeaderboard(leaderboard: UserStat[], stat: UserStat): UserStat[] {
  const existingIndex = leaderboard.findIndex((entry) => entry.userId === stat.userId)
  if (existingIndex !== -1) {
    leaderboard.splice(existingIndex, 1)
  }

  let insertAt = leaderboard.length
  for (let i = 0; i < leaderboard.length; i++) {
    if (stat.totalSpend > leaderboard[i].totalSpend) {
      insertAt = i
      break
    }
  }
  leaderboard.splice(insertAt, 0, stat)
  return leaderboard
}

export function buildLeaderboard(stats: UserStat[]): UserStat[] {
  let leaderboard: UserStat[] = []
  for (const stat of stats) {
    leaderboard = insertIntoLeaderboard(leaderboard, stat)
  }
  return leaderboard
}
