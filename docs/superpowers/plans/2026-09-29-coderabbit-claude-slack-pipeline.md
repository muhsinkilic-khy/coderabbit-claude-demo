# CodeRabbit → Slack → Claude PR Fix Hattı — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Public bir demo repoda PR açıldığında CodeRabbit otomatik review yapsın, bulgular Slack'e düşsün, kanaldan verilen `/claude-fix` komutuyla Claude düzeltip PR'a push etsin ve sonuç aynı kanala raporlansın.

**Architecture:** Slack slash command ince bir Vercel function'a düşer; function imzayı doğrulayıp PR'a `@claude` yorumu bırakır. Bu yorum `issue_comment` workflow'unu tetikler, `anthropics/claude-code-action@v1` düzeltmeyi yapıp push eder, son adım Slack Incoming Webhook'a sonucu yazar. Tüm saf mantık (imza, komut ayrıştırma, yorum gövdesi) `lib/` altında HTTP'den bağımsız ve birim test edilebilir; `api/` altındaki handler sadece bunları birbirine bağlar.

**Tech Stack:** TypeScript, Node 26, pnpm 10, vitest, Vercel Functions (Web API signature), GitHub Actions, Octokit REST, CodeRabbit, Slack slash commands + Incoming Webhooks.

**Spec:** `docs/superpowers/specs/2026-09-29-coderabbit-claude-slack-design.md`

## Global Constraints

- Repo **public** olmalı — CodeRabbit Pro yalnızca public repo'larda ücretsiz.
- Repo adı: `muhsinkilic-khy/coderabbit-claude-demo`. Mevcut `muhsinkilic-khy/test` reposuna dokunulmaz.
- Action sürümleri tam olarak: `actions/checkout@v7`, `anthropics/claude-code-action@v1`.
- Claude auth: repo secret `CLAUDE_CODE_OAUTH_TOKEN`. API key kullanılmaz.
- Vercel'deki GitHub PAT'in env adı `GITHUB_PAT` — Actions'ın yerleşik `GITHUB_TOKEN`'ı ile karışmaması için.
- Slack imza penceresi: 300 saniye.
- Vercel function'lar Web API imzası kullanır (`export async function POST(request: Request)`), çünkü Slack imza doğrulaması **ham gövde** ister ve bu imza `await request.text()` ile onu verir.
- **No narration comments.** A comment exists only for a non-obvious *why*, and it is ONE short line. Never narrate what the code does, restate the next line, or leave multi-line rationale blocks — compress them to a single line or delete them. Reasoning belongs in the PR/commit message, not the source.

## Dosya Yapısı

| Dosya | Sorumluluk |
|---|---|
| `src/config.ts`, `src/db/client.ts`, `src/db/users.ts`, `src/jobs/sync.ts`, `src/api/handler.ts`, `src/util/paginate.ts` | Kasten kusurlu demo app — CodeRabbit'in review edeceği yüzey |
| `lib/slack-verify.ts` | Slack HMAC imza + timestamp doğrulaması. Saf. |
| `lib/parse-command.ts` | `/claude-fix` metnini PR referansı + talimata ayırır; repo/kanal allowlist kontrolü. Saf. |
| `lib/github-comment.ts` | `@claude` yorum gövdesini kurar ve GitHub'a yazar |
| `api/slack/claude-fix.ts` | HTTP handler — yukarıdaki üçünü bağlar, başka mantık içermez |
| `.coderabbit.yaml` | Review profili |
| `.github/workflows/claude.yml` | Tetikleme guard'ları + action + bildirim |
| `.github/scripts/notify-slack.sh` | Üç sonucu ayırt edip kanala tek mesaj yazar |

Saf mantık `lib/` altında tutuluyor çünkü Slack imza doğrulamasını ve komut ayrıştırmayı gerçek HTTP isteği kurmadan test edebilmek, bu hattın tek anlamlı otomatik test yüzeyi.

---

### Task 1: Repo iskeleti + kasten kusurlu demo app

**Files:**
- Create: `package.json`, `tsconfig.json`, `vitest.config.ts`, `.gitignore`, `README.md`
- Create: `src/config.ts`, `src/db/client.ts`, `src/db/users.ts`, `src/jobs/sync.ts`, `src/api/handler.ts`, `src/util/paginate.ts`

**Interfaces:**
- Consumes: —
- Produces: Çalışan bir pnpm + TypeScript + vitest projesi; `pnpm test` ve `pnpm typecheck` komutları. Sonraki tüm task'lar bu ikisini kullanır.

- [ ] **Step 1: Proje iskeletini kur**

```bash
cd /Users/muhsinkilic/Documents/Efsora/test
pnpm init
pnpm add -D typescript vitest @types/node
pnpm add @octokit/rest
```

- [ ] **Step 2: `package.json`'a alan ekle**

Step 1'in yazdığı `dependencies`/`devDependencies` bloklarını **koruyarak** şu alanları ekle veya güncelle:

```json
{
  "name": "coderabbit-claude-demo",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  }
}
```

Dosyayı baştan yazma — Step 1'de kurulan paketler `package.json`'da duruyor ve kaybolursa Task 3'ten itibaren her şey kırılır.

- [ ] **Step 3: `tsconfig.json` yaz**

```json
{
  "compilerOptions": {
    "target": "ES2023",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "types": ["node"]
  },
  "include": ["src", "lib", "api", "tests"]
}
```

- [ ] **Step 4: `vitest.config.ts` yaz**

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: { include: ['tests/**/*.test.ts'] },
})
```

- [ ] **Step 5: `.gitignore` yaz**

```
node_modules/
.vercel/
.env*.local
```

- [ ] **Step 6: Kusurlu demo app'i yaz**

`src/config.ts`:
```ts
export const config = {
  apiUrl: process.env.API_URL ?? 'https://api.example.com',
  apiKey: 'sk_live_FAKE_DEMO_KEY_NOT_A_REAL_CREDENTIAL',
  maxRetries: 3,
}
```

`src/db/client.ts`:
```ts
export interface Database {
  query(sql: string): Promise<unknown[]>
}
```

`src/db/users.ts`:
```ts
import type { Database } from './client'

export async function findUsersByName(db: Database, name: string): Promise<unknown[]> {
  const sql = "SELECT id, email, name FROM users WHERE name = '" + name + "'"
  return db.query(sql)
}
```

`src/jobs/sync.ts`:
```ts
import { config } from '../config'

export function startSync(): void {
  setInterval(() => {
    fetch(`${config.apiUrl}/sync`, { method: 'POST' })
  }, 60_000)
}
```

`src/api/handler.ts`:
```ts
export interface Session {
  user?: { id: string; email: string }
}

export function greet(session: Session): string {
  const user = session.user as { id: string; email: string }
  return `Hello ${user.email}`
}
```

`src/util/paginate.ts`:
```ts
export function pageSlice<T>(items: T[], page: number, size: number): T[] {
  const start = page * size
  const out: T[] = []
  for (let i = start; i <= start + size; i++) {
    if (items[i] !== undefined) out.push(items[i] as T)
  }
  return out
}
```

Bu beş kusur bilerek bırakıldı: SQL string concat, hardcoded secret, yakalanmamış promise, güvensiz cast, off-by-one. CodeRabbit'in bulması gereken yüzey bu.

- [ ] **Step 7: `README.md` yaz**

```markdown
# coderabbit-claude-demo

CodeRabbit → Slack → Claude otomatik PR review ve fix hattının demo reposu.

> **UYARI:** `src/` altındaki kod **kasten kusurludur**. SQL injection, sahte hardcoded
> secret, yakalanmamış promise, güvensiz cast ve off-by-one hatası, CodeRabbit'in review
> üretmesi için bilerek bırakılmıştır. Bu kodu hiçbir yerde kullanmayın.
> `src/config.ts` içindeki anahtar sahtedir ve hiçbir servise karşılık gelmez.
```

- [ ] **Step 8: Typecheck'in geçtiğini doğrula**

Run: `pnpm typecheck`
Expected: hata yok. (Kusurlar kasıtlı ama derlenebilir olmalı.)

- [ ] **Step 9: Git init + public repo oluştur + push**

```bash
git init -b main
git add -A
git commit -m "feat: demo app with deliberate flaws for CodeRabbit review"
gh repo create muhsinkilic-khy/coderabbit-claude-demo --public --source=. --remote=origin --push
```

- [ ] **Step 10: Repo'nun public olduğunu doğrula**

Run: `gh repo view muhsinkilic-khy/coderabbit-claude-demo --json visibility,url`
Expected: `"visibility": "PUBLIC"`

---

### Task 2: CodeRabbit kurulumu + Slack bildirimi

**Files:**
- Create: `.coderabbit.yaml`

**Interfaces:**
- Consumes: Task 1'in public reposu
- Produces: PR açıldığında CodeRabbit review'ü ve Slack kanalında bildirim. Task 7'nin uçtan uca doğrulaması buna dayanır.

- [ ] **Step 1: `.coderabbit.yaml` yaz**

```yaml
reviews:
  profile: assertive
  auto_review:
    enabled: true
```

- [ ] **Step 2: Commit + push**

```bash
git add .coderabbit.yaml
git commit -m "chore: enable assertive CodeRabbit auto-review"
git push
```

- [ ] **Step 3: İNSAN GEÇİDİ — CodeRabbit'i kur**

Kullanıcı yapar, ajan bekler:
1. coderabbit.ai → GitHub ile giriş.
2. App'i `muhsinkilic-khy/coderabbit-claude-demo` reposuna kur.
3. CodeRabbit ayarları → Integrations → Slack bağla, hedef kanalı seç.

Kullanıcı "kuruldu" diyene kadar sonraki adıma geçilmez.

- [ ] **Step 4: Gerçek bir PR ile doğrula**

```bash
git checkout -b demo/trigger-review
printf '\nexport const UNUSED_LIMIT = 100\n' >> src/util/paginate.ts
git commit -am "chore: touch paginate to trigger review"
git push -u origin demo/trigger-review
gh pr create --title "Demo: trigger CodeRabbit" --body "Hattı doğrulamak için."
```

- [ ] **Step 5: Review ve bildirimin geldiğini doğrula**

Run: `gh pr view --json comments,reviews -q '.reviews | length'`
Expected: 1'den büyük, ve yorumlarda `coderabbitai` geçiyor.
Ayrıca: Slack kanalında CodeRabbit bildirimi görünüyor. Görünmüyorsa Step 3'ün 3. maddesi eksik.

PR'ı **açık bırak** — Task 7 bunu kullanacak.

---

### Task 3: Slack imza doğrulaması

**Files:**
- Create: `lib/slack-verify.ts`
- Test: `tests/slack-verify.test.ts`

**Interfaces:**
- Consumes: —
- Produces: `verifySlackSignature(args: { signingSecret: string; signature?: string; timestamp?: string; rawBody: string; nowSeconds?: number }): boolean`

- [ ] **Step 1: Başarısız testi yaz**

`tests/slack-verify.test.ts`:
```ts
import { createHmac } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { verifySlackSignature } from '../lib/slack-verify'

const SECRET = 'test-signing-secret'
const BODY = 'command=%2Fclaude-fix&text=42'
const NOW = 1_800_000_000

function sign(body: string, ts: number, secret = SECRET): string {
  return 'v0=' + createHmac('sha256', secret).update(`v0:${ts}:${body}`).digest('hex')
}

describe('verifySlackSignature', () => {
  it('geçerli imzayı kabul eder', () => {
    expect(verifySlackSignature({
      signingSecret: SECRET, signature: sign(BODY, NOW),
      timestamp: String(NOW), rawBody: BODY, nowSeconds: NOW,
    })).toBe(true)
  })

  it('değiştirilmiş gövdeyi reddeder', () => {
    expect(verifySlackSignature({
      signingSecret: SECRET, signature: sign(BODY, NOW),
      timestamp: String(NOW), rawBody: BODY + '&evil=1', nowSeconds: NOW,
    })).toBe(false)
  })

  it('yanlış secret ile üretilmiş imzayı reddeder', () => {
    expect(verifySlackSignature({
      signingSecret: SECRET, signature: sign(BODY, NOW, 'other-secret'),
      timestamp: String(NOW), rawBody: BODY, nowSeconds: NOW,
    })).toBe(false)
  })

  it('300 saniyeden eski timestampi reddeder', () => {
    const old = NOW - 301
    expect(verifySlackSignature({
      signingSecret: SECRET, signature: sign(BODY, old),
      timestamp: String(old), rawBody: BODY, nowSeconds: NOW,
    })).toBe(false)
  })

  it('gelecekteki timestampi de reddeder', () => {
    const future = NOW + 301
    expect(verifySlackSignature({
      signingSecret: SECRET, signature: sign(BODY, future),
      timestamp: String(future), rawBody: BODY, nowSeconds: NOW,
    })).toBe(false)
  })

  it('eksik header ile reddeder', () => {
    expect(verifySlackSignature({
      signingSecret: SECRET, signature: undefined,
      timestamp: String(NOW), rawBody: BODY, nowSeconds: NOW,
    })).toBe(false)
  })

  it('sayısal olmayan timestampi reddeder', () => {
    expect(verifySlackSignature({
      signingSecret: SECRET, signature: sign(BODY, NOW),
      timestamp: 'abc', rawBody: BODY, nowSeconds: NOW,
    })).toBe(false)
  })
})
```

- [ ] **Step 2: Testin başarısız olduğunu doğrula**

Run: `pnpm vitest run tests/slack-verify.test.ts`
Expected: FAIL — `Cannot find module '../lib/slack-verify'`

- [ ] **Step 3: Implementasyonu yaz**

`lib/slack-verify.ts`:
```ts
import { createHmac, timingSafeEqual } from 'node:crypto'

const MAX_SKEW_SECONDS = 300

export function verifySlackSignature(args: {
  signingSecret: string
  signature?: string
  timestamp?: string
  rawBody: string
  nowSeconds?: number
}): boolean {
  const { signingSecret, signature, timestamp, rawBody } = args
  if (!signature || !timestamp) return false

  const ts = Number(timestamp)
  if (!Number.isFinite(ts)) return false

  const now = args.nowSeconds ?? Math.floor(Date.now() / 1000)
  if (Math.abs(now - ts) > MAX_SKEW_SECONDS) return false

  const expected =
    'v0=' + createHmac('sha256', signingSecret).update(`v0:${timestamp}:${rawBody}`).digest('hex')

  const a = Buffer.from(expected)
  const b = Buffer.from(signature)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}
```

- [ ] **Step 4: Testlerin geçtiğini doğrula**

Run: `pnpm vitest run tests/slack-verify.test.ts`
Expected: 7 test PASS

- [ ] **Step 5: Commit**

```bash
git add lib/slack-verify.ts tests/slack-verify.test.ts
git commit -m "feat: verify Slack request signatures with replay window"
```

---

### Task 4: Komut ayrıştırma + allowlist

**Files:**
- Create: `lib/parse-command.ts`
- Test: `tests/parse-command.test.ts`

**Interfaces:**
- Consumes: —
- Produces:
  - `type ParsedCommand = { ok: true; owner: string; repo: string; prNumber: number; instruction: string } | { ok: false; error: string }`
  - `parseCommand(text: string, defaultRepo: string): ParsedCommand`
  - `isAllowed(args: { owner: string; repo: string; channelId: string; allowedRepo: string; allowedChannelId: string }): boolean`

- [ ] **Step 1: Başarısız testi yaz**

`tests/parse-command.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { isAllowed, parseCommand } from '../lib/parse-command'

const REPO = 'muhsinkilic-khy/coderabbit-claude-demo'

describe('parseCommand', () => {
  it('tam PR URLini ayrıştırır', () => {
    const r = parseCommand('https://github.com/acme/widgets/pull/42', REPO)
    expect(r).toEqual({ ok: true, owner: 'acme', repo: 'widgets', prNumber: 42, instruction: '' })
  })

  it('URL sonundaki /files ekini yok sayar', () => {
    const r = parseCommand('https://github.com/acme/widgets/pull/42/files', REPO)
    expect(r).toMatchObject({ ok: true, prNumber: 42 })
  })

  it('#123 kısa referansını varsayılan repoya bağlar', () => {
    const r = parseCommand('#123', REPO)
    expect(r).toEqual({
      ok: true, owner: 'muhsinkilic-khy', repo: 'coderabbit-claude-demo',
      prNumber: 123, instruction: '',
    })
  })

  it('çıplak sayıyı kabul eder', () => {
    expect(parseCommand('7', REPO)).toMatchObject({ ok: true, prNumber: 7 })
  })

  it('PR referansından sonraki metni talimat olarak taşır', () => {
    const r = parseCommand('#5   sadece SQL bulgusunu düzelt', REPO)
    expect(r).toMatchObject({ ok: true, prNumber: 5, instruction: 'sadece SQL bulgusunu düzelt' })
  })

  it('boş metni reddeder', () => {
    expect(parseCommand('   ', REPO)).toEqual({ ok: false, error: 'PR belirtilmedi' })
  })

  it('anlamsız metni reddeder', () => {
    expect(parseCommand('lütfen şunu düzelt', REPO)).toEqual({
      ok: false, error: 'PR referansı anlaşılamadı',
    })
  })
})

describe('isAllowed', () => {
  const base = {
    owner: 'muhsinkilic-khy', repo: 'coderabbit-claude-demo',
    channelId: 'C123', allowedRepo: REPO, allowedChannelId: 'C123',
  }

  it('izinli repo ve kanalı kabul eder', () => {
    expect(isAllowed(base)).toBe(true)
  })

  it('yabancı repoyu reddeder', () => {
    expect(isAllowed({ ...base, repo: 'other-repo' })).toBe(false)
  })

  it('yabancı kanalı reddeder', () => {
    expect(isAllowed({ ...base, channelId: 'C999' })).toBe(false)
  })
})
```

- [ ] **Step 2: Testin başarısız olduğunu doğrula**

Run: `pnpm vitest run tests/parse-command.test.ts`
Expected: FAIL — `Cannot find module '../lib/parse-command'`

- [ ] **Step 3: Implementasyonu yaz**

`lib/parse-command.ts`:
```ts
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
```

- [ ] **Step 4: Testlerin geçtiğini doğrula**

Run: `pnpm vitest run tests/parse-command.test.ts`
Expected: 10 test PASS

- [ ] **Step 5: Commit**

```bash
git add lib/parse-command.ts tests/parse-command.test.ts
git commit -m "feat: parse /claude-fix command and enforce repo/channel allowlist"
```

---

### Task 5: `@claude` yorum gövdesi + GitHub'a yazma

**Files:**
- Create: `lib/github-comment.ts`
- Test: `tests/github-comment.test.ts`

**Interfaces:**
- Consumes: —
- Produces:
  - `buildCommentBody(args: { instruction: string; slackUser: string }): string`
  - `postPrComment(args: { token: string; owner: string; repo: string; prNumber: number; body: string }): Promise<{ ok: true; url: string } | { ok: false; error: string }>`

- [ ] **Step 1: Başarısız testi yaz**

`tests/github-comment.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { buildCommentBody } from '../lib/github-comment'

describe('buildCommentBody', () => {
  it('@claude ile başlar', () => {
    expect(buildCommentBody({ instruction: '', slackUser: 'muhsin' })).toMatch(/^@claude /)
  })

  it('kapsam kurallarını içerir', () => {
    const body = buildCommentBody({ instruction: '', slackUser: 'muhsin' })
    expect(body).toContain('ilgisiz refactor yapma')
    expect(body).toContain("PR'ın kendi branch'ine commit et")
  })

  it('serbest talimatı gövdeye taşır', () => {
    const body = buildCommentBody({ instruction: 'sadece SQL bulgusu', slackUser: 'muhsin' })
    expect(body).toContain('sadece SQL bulgusu')
  })

  it('talimat yokken boş satır bırakmaz', () => {
    const body = buildCommentBody({ instruction: '', slackUser: 'muhsin' })
    expect(body).not.toMatch(/\n{3,}/)
  })

  it('tetikleyen Slack kullanıcısını belirtir', () => {
    expect(buildCommentBody({ instruction: '', slackUser: 'muhsin' })).toContain('@muhsin')
  })
})
```

- [ ] **Step 2: Testin başarısız olduğunu doğrula**

Run: `pnpm vitest run tests/github-comment.test.ts`
Expected: FAIL — `Cannot find module '../lib/github-comment'`

- [ ] **Step 3: Implementasyonu yaz**

`lib/github-comment.ts`:
```ts
import { Octokit } from '@octokit/rest'

export function buildCommentBody(args: { instruction: string; slackUser: string }): string {
  const rules = [
    '@claude CodeRabbit\'in bu PR\'daki review bulgularını incele ve düzelt.',
    '',
    '- Sadece CodeRabbit\'in işaret ettiği sorunları düzelt, ilgisiz refactor yapma.',
    '- Düzeltmeleri PR\'ın kendi branch\'ine commit et.',
    '- Katılmadığın veya düzeltemediğin bulguyu değiştirme; gerekçesiyle listele.',
  ]

  const instruction = args.instruction.trim()
  const extra = instruction ? ['', instruction] : []

  return [...rules, ...extra, '', `— Slack'ten @${args.slackUser} tarafından tetiklendi.`].join('\n')
}

export async function postPrComment(args: {
  token: string
  owner: string
  repo: string
  prNumber: number
  body: string
}): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  try {
    const octokit = new Octokit({ auth: args.token })
    const res = await octokit.issues.createComment({
      owner: args.owner,
      repo: args.repo,
      issue_number: args.prNumber,
      body: args.body,
    })
    return { ok: true, url: res.data.html_url }
  } catch (err) {
    const status = (err as { status?: number }).status ?? 0
    return { ok: false, error: `GitHub ${status}: ${(err as Error).message}` }
  }
}
```

- [ ] **Step 4: Testlerin geçtiğini doğrula**

Run: `pnpm vitest run tests/github-comment.test.ts`
Expected: 5 test PASS

- [ ] **Step 5: Commit**

```bash
git add lib/github-comment.ts tests/github-comment.test.ts
git commit -m "feat: build @claude comment body and post it to the PR"
```

---

### Task 6: Slack slash command endpoint + Vercel deploy

**Files:**
- Create: `api/slack/claude-fix.ts`

**Interfaces:**
- Consumes: `verifySlackSignature` (Task 3), `parseCommand` + `isAllowed` (Task 4), `buildCommentBody` + `postPrComment` (Task 5)
- Produces: `POST https://<deployment>/api/slack/claude-fix` — Slack slash command hedefi.

- [ ] **Step 1: Handler'ı yaz**

`api/slack/claude-fix.ts`:
```ts
import { buildCommentBody, postPrComment } from '../../lib/github-comment'
import { isAllowed, parseCommand } from '../../lib/parse-command'
import { verifySlackSignature } from '../../lib/slack-verify'

function ephemeral(text: string): Response {
  return Response.json({ response_type: 'ephemeral', text })
}

export async function POST(request: Request): Promise<Response> {
  const rawBody = await request.text()

  const verified = verifySlackSignature({
    signingSecret: process.env.SLACK_SIGNING_SECRET ?? '',
    signature: request.headers.get('x-slack-signature') ?? undefined,
    timestamp: request.headers.get('x-slack-request-timestamp') ?? undefined,
    rawBody,
  })
  if (!verified) return new Response('invalid signature', { status: 401 })

  const form = new URLSearchParams(rawBody)
  const allowedRepo = process.env.ALLOWED_REPO ?? ''
  const parsed = parseCommand(form.get('text') ?? '', allowedRepo)

  if (!parsed.ok) {
    return ephemeral(`${parsed.error}. Kullanım: \`/claude-fix <PR-url veya #numara> [talimat]\``)
  }

  const channelId = form.get('channel_id') ?? ''
  if (!isAllowed({
    owner: parsed.owner,
    repo: parsed.repo,
    channelId,
    allowedRepo,
    allowedChannelId: process.env.ALLOWED_CHANNEL_ID ?? '',
  })) {
    return ephemeral('Bu komut yalnızca izin verilen kanal ve repo için çalışır.')
  }

  const result = await postPrComment({
    token: process.env.GITHUB_PAT ?? '',
    owner: parsed.owner,
    repo: parsed.repo,
    prNumber: parsed.prNumber,
    body: buildCommentBody({
      instruction: parsed.instruction,
      slackUser: form.get('user_name') ?? 'bilinmeyen',
    }),
  })

  if (!result.ok) return ephemeral(`Yorum atılamadı — ${result.error}`)
  return ephemeral(`Claude PR #${parsed.prNumber} için çalışmaya başladı. Sonuç kanala düşecek.`)
}
```

- [ ] **Step 2: Typecheck ve tüm testleri çalıştır**

Run: `pnpm typecheck && pnpm test`
Expected: typecheck temiz, 22 test PASS

- [ ] **Step 3: Commit**

```bash
git add api/slack/claude-fix.ts
git commit -m "feat: add /claude-fix Slack slash command endpoint"
git push
```

- [ ] **Step 4: Vercel'e deploy et**

```bash
vercel whoami || vercel login
vercel link --yes
vercel deploy --prod
```

Deployment URL'ini not al.

- [ ] **Step 5: İNSAN GEÇİDİ — Slack app'i oluştur**

Kullanıcı yapar:
1. api.slack.com/apps → Create New App → From scratch, ad: `Claude Fix`.
2. **Slash Commands** → `/claude-fix`, Request URL: `https://<deployment>/api/slack/claude-fix`.
3. **Incoming Webhooks** → aç, bildirim kanalına bir webhook ekle, URL'i kopyala.
4. App'i workspace'e kur.
5. Kanalda `/who` veya kanal detayından `channel_id` (C ile başlar) al.
6. Signing Secret'i (Basic Information sayfası) kopyala.

- [ ] **Step 6: Vercel env değişkenlerini gir**

```bash
vercel env add SLACK_SIGNING_SECRET production
vercel env add GITHUB_PAT production
vercel env add ALLOWED_REPO production        # muhsinkilic-khy/coderabbit-claude-demo
vercel env add ALLOWED_CHANNEL_ID production  # C...
vercel deploy --prod
```

`GITHUB_PAT` fine-grained olmalı: yalnız `coderabbit-claude-demo` reposu, yalnız **Issues: Read and write**. Push'u Actions yapıyor, contents yetkisi gerekmez.

- [ ] **Step 7: Slack'ten canlı doğrula**

Kanalda: `/claude-fix #<Task 2'de açılan PR numarası>`
Expected: ephemeral "Claude PR #N için çalışmaya başladı" mesajı **ve** PR'da yeni bir `@claude` yorumu.

Doğrula: `gh pr view <N> --json comments -q '.comments[-1].body' | head -3`

---

### Task 7: Fix workflow'u + Slack bildirimi + uçtan uca doğrulama

**Files:**
- Create: `.github/workflows/claude.yml`, `.github/scripts/notify-slack.sh`

**Interfaces:**
- Consumes: Task 6'nın PR'a bıraktığı `@claude` yorumu
- Produces: Hattın tamamı.

- [ ] **Step 1: İNSAN GEÇİDİ — repo secret'larını gir**

Kullanıcı yapar (token bana verilmez):
```bash
claude setup-token
gh secret set CLAUDE_CODE_OAUTH_TOKEN --repo muhsinkilic-khy/coderabbit-claude-demo
gh secret set SLACK_WEBHOOK_URL --repo muhsinkilic-khy/coderabbit-claude-demo
```

- [ ] **Step 2: Bildirim script'ini yaz**

`.github/scripts/notify-slack.sh`:
```bash
#!/usr/bin/env bash
set -euo pipefail

repo_url="${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}"
pr_url="${repo_url}/pull/${PR_NUMBER}"

if [ "$JOB_STATUS" != "success" ]; then
  text="❌ PR #${PR_NUMBER} — Claude fix başarısız. <${RUN_URL}|Run log> · <${pr_url}|PR>"
elif [ "$SHA_BEFORE" = "$SHA_AFTER" ]; then
  text="ℹ️ PR #${PR_NUMBER} — Claude düzeltecek bir şey bulamadı. <${RUN_URL}|Run log> · <${pr_url}|PR>"
else
  text="✅ PR #${PR_NUMBER} düzeltildi → <${repo_url}/commit/${SHA_AFTER}|${SHA_AFTER:0:7}> · <${pr_url}|PR>"
fi

jq -n --arg t "$text" '{text: $t}' \
  | curl -sS --fail-with-body -X POST -H 'Content-Type: application/json' -d @- "$SLACK_WEBHOOK_URL"
```

```bash
chmod +x .github/scripts/notify-slack.sh
```

- [ ] **Step 3: Workflow'u yaz**

`.github/workflows/claude.yml`:
```yaml
name: Claude Fix

on:
  issue_comment:
    types: [created]

jobs:
  fix:
    if: >
      github.event.issue.pull_request != null &&
      github.event.comment.user.type != 'Bot' &&
      contains(github.event.comment.body, '@claude') &&
      contains(fromJSON('["OWNER","MEMBER","COLLABORATOR"]'), github.event.comment.author_association)
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
      issues: write
      id-token: write
    env:
      GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      PR_NUMBER: ${{ github.event.issue.number }}
    steps:
      - uses: actions/checkout@v7
        with:
          fetch-depth: 0

      - id: before
        run: echo "sha=$(gh pr view "$PR_NUMBER" --json headRefOid -q .headRefOid)" >> "$GITHUB_OUTPUT"

      - uses: anthropics/claude-code-action@v1
        with:
          claude_code_oauth_token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}

      - id: after
        if: always()
        run: echo "sha=$(gh pr view "$PR_NUMBER" --json headRefOid -q .headRefOid)" >> "$GITHUB_OUTPUT"

      - name: Notify Slack
        if: always()
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
          SHA_BEFORE: ${{ steps.before.outputs.sha }}
          SHA_AFTER: ${{ steps.after.outputs.sha }}
          JOB_STATUS: ${{ job.status }}
          RUN_URL: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}
        run: ./.github/scripts/notify-slack.sh
```

SHA'lar `gh pr view --json headRefOid` ile okunuyor, local `git rev-parse` ile değil: `issue_comment` tetiklemesinde `actions/checkout` PR branch'ini değil default branch'i alır, dolayısıyla local HEAD yanıltıcıdır.

Üç guard'ın her biri ayrı bir sorunu kapatıyor: `issue.pull_request` issue yorumlarını eler; `user.type != 'Bot'` Claude'un push'u sonrası CodeRabbit'in yeni review'ünün workflow'u yeniden tetiklemesini (sonsuz döngü) engeller; `author_association` repo public olduğu için yabancıların kotayı harcamasını engeller.

- [ ] **Step 4: Commit + push**

```bash
git add .github/
git commit -m "feat: run Claude on @claude comments and report result to Slack"
git push
```

- [ ] **Step 5: Guard'ların derlendiğini doğrula**

Run: `gh workflow list --repo muhsinkilic-khy/coderabbit-claude-demo`
Expected: `Claude Fix` listede ve `active`.

- [ ] **Step 6: Uçtan uca doğrula**

Slack kanalında: `/claude-fix #<Task 2'nin PR numarası> paginate off-by-one hatasını düzelt`

Sırayla doğrula:
```bash
gh run list --repo muhsinkilic-khy/coderabbit-claude-demo --workflow "Claude Fix" --limit 1
gh pr view <N> --json commits -q '.commits[-1].messageHeadline'
gh pr diff <N> -- src/util/paginate.ts
```
Expected: workflow `completed/success`, PR'a yeni commit düşmüş, `paginate.ts` diff'inde `i <= start + size` → `i < start + size` düzeltmesi, ve Slack kanalında ✅ mesajı.

- [ ] **Step 7: Yabancı tetiklemenin engellendiğini doğrula**

PR'a `@claude test` yorumunu **CodeRabbit veya başka bir bot** attığında workflow'un çalışmadığını kontrol et:
```bash
gh run list --repo muhsinkilic-khy/coderabbit-claude-demo --workflow "Claude Fix" --limit 5
```
Expected: Claude'un commit'i CodeRabbit'e yeni bir review yaptırır, ama **yeni bir Claude Fix run'ı görünmez** — run sayısı Step 6'dakiyle aynı kalır.

Bu kontrolün neyi kanıtladığına dikkat: CodeRabbit yorumları zaten `@claude` içermediği için tek başına `user.type` guard'ını ispatlamaz, döngünün pratikte kapalı olduğunu gösterir. Guard'ın kendisini kesin doğrulamak istersen PR'a bir GitHub App/bot kimliğiyle `@claude test` yorumu attır ve run tetiklenmediğini gör.

- [ ] **Step 8: Hata yolunu doğrula**

`SLACK_WEBHOOK_URL` secret'ını geçici olarak bozuk bir değere çek, `/claude-fix` tekrar çalıştır, workflow'un kırmızı bittiğini ve log'da curl hatasının göründüğünü doğrula. Sonra secret'ı geri koy.

- [ ] **Step 9: Son commit**

```bash
git add -A
git commit -m "docs: record verified end-to-end pipeline" --allow-empty
git push
```
