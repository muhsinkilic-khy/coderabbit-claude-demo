# CodeRabbit → Slack → Claude otomatik PR review & fix hattı

**Tarih:** 2026-09-29
**Durum:** Tasarım onaylandı, implementation plan bekliyor

## Amaç

Bir test GitHub reposunda PR açıldığında CodeRabbit otomatik review yapsın, bulgular bir
Slack kanalına düşsün, o kanaldan verilen tek bir komutla Claude bulguları düzeltip PR'a
push etsin ve sonuç aynı kanala raporlansın.

## Kapsam dışı

- Private repo desteği. CodeRabbit Pro yalnızca public repo'larda ücretsiz; hat public bir
  demo repo üzerine kuruluyor.
- Bulgu bazında seçmeli düzeltme ("şu üçünü düzelt, diğerlerini bırak"). Komut PR
  seviyesinde çalışır; daraltma serbest metin talimatıyla yapılır.
- Bildirim ile fix sonucunun aynı Slack thread'inde birleşmesi. CodeRabbit'in hazır Slack
  app'i kendi mesajını atar, biz onun thread'ine yazamayız. Bilinçli kabul edilen bedel.
- Otomatik fix. Claude yalnızca açık komutla tetiklenir, review'den sonra kendiliğinden
  çalışmaz.

## Mimari

```
PR açılır
 └─ CodeRabbit GitHub App → PR'a inline review yorumları
     └─ CodeRabbit Slack app → #code-review kanalına bildirim          [kod yazılmıyor]

Slack:  /claude-fix <PR> [talimat]
 └─ Vercel function
     ├─ Slack imzasını doğrula
     ├─ repo + channel allowlist kontrolü
     ├─ GitHub API: PR'a "@claude ..." yorumu
     └─ 3 sn içinde ephemeral ack
         └─ issue_comment:created
             └─ .github/workflows/claude.yml
                 ├─ guard: PR mi, bot mu, yetkili mi
                 ├─ anthropics/claude-code-action@v1 → düzelt, PR branch'ine push
                 └─ Slack Incoming Webhook → aynı kanala sonuç
```

## Bileşenler

### 1. Demo repo — `muhsinkilic-khy/coderabbit-claude-demo`

Public. Mevcut `muhsinkilic-khy/test` reposuna dokunulmaz.

Küçük bir Node/TypeScript uygulaması; CodeRabbit'in güvenilir biçimde yakalayacağı
kusurlarla tohumlanır:

| Kusur | Nerede |
|---|---|
| String concat ile SQL sorgusu | `src/db/users.ts` |
| Hardcoded API secret | `src/config.ts` |
| Yakalanmamış promise rejection | `src/jobs/sync.ts` |
| Null check eksikliği | `src/api/handler.ts` |
| Döngüde off-by-one | `src/util/paginate.ts` |

Kusurlar `main`'de durur; her demo, bunlara dokunan bir PR açılarak yapılır.

### 2. `.coderabbit.yaml`

```yaml
reviews:
  profile: assertive
  auto_review:
    enabled: true
```

`assertive` seçildi çünkü demo'nun bulgu üretmesi gerekiyor; `chill` profili küçük bir
repoda sessiz kalabilir.

### 3. Slack app — "Claude Fix"

İki yetenek:

- **Slash command** `/claude-fix` → `https://<deployment>/api/slack/claude-fix`
- **Incoming Webhook** → bildirim kanalına bağlı, workflow sonucu için

Scope'lar: `commands`, `incoming-webhook`.

### 4. Vercel function — `api/slack/claude-fix.ts`

**Ne yapar:** Slack slash command'ini doğrulayıp PR'a bir `@claude` yorumu bırakır.
**Neye bağlı:** `SLACK_SIGNING_SECRET`, `GITHUB_PAT`, `ALLOWED_REPO`, `ALLOWED_CHANNEL_ID`.
**Girdi:** Slack'in `application/x-www-form-urlencoded` payload'ı (`text`, `channel_id`,
`user_name`, `response_url`).
**Çıktı:** Slack'e ephemeral JSON yanıt; yan etki olarak bir GitHub issue comment.

Adımlar:

1. `X-Slack-Request-Timestamp` 300 saniyeden eskiyse reddet.
2. `v0:{timestamp}:{raw body}` üzerinden HMAC-SHA256 hesapla, `X-Slack-Signature` ile
   `timingSafeEqual` karşılaştır. Ham gövde gerekli — Vercel'in body parser'ı kapatılır.
3. `channel_id` allowlist'te değilse ephemeral ret, GitHub'a hiç gidilmez.
4. `text`'i ayrıştır: PR referansı `https://github.com/{owner}/{repo}/pull/{n}`, `#{n}` veya
   çıplak `{n}` biçimlerinden biri. Kalan metin serbest talimat.
5. Çözülen repo allowlist'te değilse ephemeral ret.
6. `POST /repos/{owner}/{repo}/issues/{n}/comments`.

Yorum gövdesi:

```
@claude CodeRabbit'in bu PR'daki review bulgularını incele ve düzelt.

- Sadece CodeRabbit'in işaret ettiği sorunları düzelt, ilgisiz refactor yapma.
- Düzeltmeleri PR'ın kendi branch'ine commit et.
- Katılmadığın veya düzeltemediğin bulguyu değiştirme; gerekçesiyle listele.

{kullanıcının serbest talimatı, varsa}

— Slack'ten @{user_name} tarafından tetiklendi.
```

7. Slack'e 3 saniye dolmadan `{"response_type": "ephemeral", "text": "..."}` dön.

### 5. `.github/workflows/claude.yml`

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
    env:
      GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      PR_NUMBER: ${{ github.event.issue.number }}
    permissions:
      contents: write
      pull-requests: write
      issues: write
      id-token: write
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
          PR_NUMBER: ${{ github.event.issue.number }}
          RUN_URL: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}
        run: ./.github/scripts/notify-slack.sh
```

Üç guard'ın her biri ayrı bir sorunu kapatıyor:

- `issue.pull_request != null` — issue yorumlarını eler.
- `comment.user.type != 'Bot'` — Claude push edince CodeRabbit yeniden review yapar; o
  yorumlar workflow'u tekrar tetiklemesin. Sonsuz döngü koruması.
- `author_association` — repo public. Bu guard olmadan yabancı biri PR'a `@claude` yazıp
  abonelik kotasını harcayabilir.

Değişiklik olup olmadığı, PR'ın head SHA'sı `gh pr view --json headRefOid` ile önce ve sonra
okunarak belirlenir. Local `git rev-parse HEAD` kullanılmaz: `issue_comment` tetiklemesinde
`actions/checkout` PR branch'ini değil default branch'i alır, dolayısıyla local HEAD yanıltıcı
olur. Bu yöntem ayrıca action'ın output isimlerine de bağımlılık kurmaz.

### 6. `.github/scripts/notify-slack.sh`

Üç sonuç ayırt edilir ve kanala tek mesaj olarak yazılır:

| Durum | Mesaj |
|---|---|
| SHA değişti | ✅ PR #n düzeltildi → commit linki, PR linki |
| SHA aynı, job başarılı | ℹ️ Claude değişiklik yapmadı → run linki |
| Job başarısız | ❌ Fix başarısız → run linki |

## Güvenlik

- **GitHub PAT** (Vercel'de): fine-grained, yalnız demo repo, yalnız `issues: write`. Push'u
  Actions yapıyor, bu token'ın contents yetkisine ihtiyacı yok.
- **Slack imza doğrulaması** zorunlu; endpoint aksi halde herkese açık bir "PR'a yorum at"
  servisi olur.
- **Repo public → Actions log'ları public.** GitHub secret'ları maskeler, ama Claude'un
  çıktısı log'a düşer. Demo repo'da gerçek secret bulunmayacak; tohumlanan "hardcoded
  secret" kusuru sahte bir değer olacak.
- **`CLAUDE_CODE_OAUTH_TOKEN`** repo secret'ı olarak yalnız repo sahibi tarafından girilir.

## Hata durumları

| Durum | Davranış |
|---|---|
| Slack imzası geçersiz / timestamp eski | 401, gövde yok |
| PR referansı ayrıştırılamadı | Ephemeral: kullanım örneği |
| Kanal veya repo allowlist dışı | Ephemeral ret, GitHub'a istek gitmez |
| GitHub API hatası | Ephemeral: status kodu + kısa mesaj |
| Workflow patladı | Slack'e ❌ + run URL'i (`if: always()`) |
| Claude düzeltecek şey bulamadı | Slack'e ℹ️ — sessiz geçilmez |

## Test

**Birim (vitest, Vercel function):**

- Geçerli imza kabul edilir; bozuk imza ve 300 sn'den eski timestamp reddedilir.
- PR ayrıştırma: tam URL, `#123`, çıplak `123`, ayrıştırılamayan metin.
- Allowlist: yabancı `channel_id` ve yabancı repo reddedilir.
- Yorum gövdesine serbest talimatın geçtiği doğrulanır.

**Uçtan uca (elle, bir kez):**

Kusurlu koda dokunan bir PR aç → CodeRabbit review'ünü ve Slack bildirimini bekle →
kanaldan `/claude-fix <PR>` → PR branch'ine commit düştüğünü ve kanala ✅ mesajı geldiğini
doğrula.

## Kurulum (yalnız insan yapabilir)

1. coderabbit.ai'ye GitHub ile giriş, app'i demo repo'ya kur.
2. CodeRabbit ayarlarından Slack'i bağla, hedef kanalı seç.
3. Slack'te "Claude Fix" app'ini oluştur; slash command URL'ini ve incoming webhook'u al.
4. `claude setup-token` çalıştır, çıktıyı repo secret'ı `CLAUDE_CODE_OAUTH_TOKEN` olarak
   gir. Token paylaşılmaz.
5. `SLACK_WEBHOOK_URL` repo secret'ı olarak girilir.
6. Fine-grained PAT üret, Vercel env'e `GITHUB_PAT` olarak gir (Actions'ın yerleşik `GITHUB_TOKEN`'ı ile karışmasın).
7. `vercel login`.

## Bilinen riskler

- **OAuth token ömrü.** Abonelik token'ı süresiz değil; dolduğunda workflow 401 verir ve
  Slack'e ❌ düşer. Yenileme elle yapılır. API key'e geçmek bunu ortadan kaldırır.
- **Kota tüketimi.** Her `/claude-fix` aboneliğin kullanım limitinden yer.
- **CodeRabbit bulgu üretmezse** demo boş çalışır. Tohumlanan kusurlar bu riski azaltmak
  için seçildi, ama review profili yine de tek bulgu döndürebilir.
