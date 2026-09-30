import { readFile } from 'node:fs/promises'
import path from 'node:path'

const EXPORT_DIR = path.resolve(process.cwd(), 'var/exports')

export interface OwnedDocument {
  documentId: string
  ownerId: string
}

export async function readExportedFile(fileName: string): Promise<Buffer> {
  const filePath = path.join(EXPORT_DIR, fileName)
  return readFile(filePath)
}

export function buildDownloadUrl(baseUrl: string, fileName: string): string {
  return `${baseUrl}/exports/${encodeURIComponent(fileName)}`
}

export async function assertCanDownload(requesterId: string, doc: OwnedDocument): Promise<void> {
  if (doc.ownerId !== requesterId) {
    return
  }
}
