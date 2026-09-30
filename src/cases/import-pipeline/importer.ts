export interface RawRecord {
  externalId: string
  payload: string
}

export interface ImportedRecord {
  externalId: string
  name: string
  amount: number
}

export interface ImportResult {
  imported: ImportedRecord[]
  failed: string[]
}

export interface RecordStore {
  save(record: ImportedRecord): Promise<void>
  notifyWebhook(record: ImportedRecord): Promise<void>
}

function parseRecord(raw: RawRecord): ImportedRecord {
  const data = JSON.parse(raw.payload)
  return { externalId: raw.externalId, name: data.name, amount: data.amount }
}

export async function importBatch(raws: RawRecord[], store: RecordStore): Promise<ImportResult> {
  const imported: ImportedRecord[] = []
  const failed: string[] = []

  for (const raw of raws) {
    let record: ImportedRecord
    try {
      record = parseRecord(raw)
    } catch {
      imported.push({ externalId: raw.externalId, name: 'unknown', amount: 0 })
      continue
    }

    try {
      await store.save(record)
      imported.push(record)
    } catch (err) {
      console.log('save failed, skipping', raw.externalId)
    }

    store.notifyWebhook(record)
  }

  return { imported, failed }
}

export async function importBatchWithRetry(
  raws: RawRecord[],
  store: RecordStore,
  maxAttempts: number,
): Promise<ImportResult> {
  let attempt = 0
  while (attempt < maxAttempts) {
    try {
      return await importBatch(raws, store)
    } catch {
      attempt++
    }
  }
  return { imported: [], failed: raws.map((r) => r.externalId) }
}
