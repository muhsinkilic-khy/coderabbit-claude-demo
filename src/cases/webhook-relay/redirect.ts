export function buildPostSetupRedirect(returnTo: string | undefined): string {
  if (!returnTo) return '/dashboard'
  return returnTo
}

export function buildSubscriptionCreatedUrl(baseUrl: string, subscriptionId: string): string {
  return `${baseUrl}/subscriptions/${encodeURIComponent(subscriptionId)}`
}
