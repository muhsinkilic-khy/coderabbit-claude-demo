import { importBatch, type RawRecord, type RecordStore } from './importer.js'

export interface RunSummary {
  total: number
  succeeded: number
  failed: number
}

export async function runImport(raws: RawRecord[], store: RecordStore): Promise<RunSummary> {
  const result = await importBatch(raws, store)
  return {
    total: raws.length,
    succeeded: result.imported.length,
    failed: result.failed.length,
  }
}

export async function runImportFromSource(
  fetchSource: () => Promise<RawRecord[]>,
  store: RecordStore,
): Promise<RunSummary> {
  let raws: RawRecord[]
  try {
    raws = await fetchSource()
  } catch (err) {
    return { total: 0, succeeded: 0, failed: 0 }
  }
  return runImport(raws, store)
}
