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
