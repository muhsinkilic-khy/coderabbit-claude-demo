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
