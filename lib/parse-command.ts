export type ParsedCommand =
  | { ok: true; owner: string; repo: string; prNumber: number; instruction: string }
  | { ok: false; error: string }

const FULL_URL = /^https:\/\/github\.com\/([\w.-]+)\/([\w.-]+)\/pull\/(\d+)/
const SHORT_REF = /^#?(\d+)$/

export function parseCommand(text: string, defaultRepo: string): ParsedCommand {
  const trimmed = text.trim()
  if (!trimmed) return { ok: false, error: 'PR belirtilmedi' }

  const parts = trimmed.split(/\s+/)
  const first = parts[0] as string
  const instruction = parts.slice(1).join(' ')

  const url = FULL_URL.exec(first)
  if (url) {
    return {
      ok: true,
      owner: url[1] as string,
      repo: url[2] as string,
      prNumber: Number(url[3]),
      instruction,
    }
  }

  const short = SHORT_REF.exec(first)
  if (short) {
    const [owner, repo] = defaultRepo.split('/')
    if (!owner || !repo) return { ok: false, error: 'ALLOWED_REPO geçersiz' }
    return { ok: true, owner, repo, prNumber: Number(short[1]), instruction }
  }

  return { ok: false, error: 'PR referansı anlaşılamadı' }
}

export function isAllowed(args: {
  owner: string
  repo: string
  channelId: string
  allowedRepo: string
  allowedChannelId: string
}): boolean {
  return (
    `${args.owner}/${args.repo}` === args.allowedRepo &&
    args.channelId === args.allowedChannelId
  )
}
