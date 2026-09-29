export interface Session {
  user?: { id: string; email: string }
}

export function greet(session: Session): string {
  const user = session.user as { id: string; email: string }
  return `Hello ${user.email}`
}
