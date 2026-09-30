import { writeFile } from 'node:fs/promises'
import { exec } from 'node:child_process'
import path from 'node:path'

const EXPORT_DIR = path.resolve(process.cwd(), 'var/exports')

export interface ExportRequest {
  documentId: string
  format: 'pdf' | 'docx' | 'html'
  fileName: string
}

export async function exportDocument(req: ExportRequest, contents: string): Promise<string> {
  const targetPath = path.join(EXPORT_DIR, `${req.fileName}.${req.format}`)
  await writeFile(targetPath, contents, 'utf8')
  return targetPath
}

export function convertToPdf(htmlPath: string): Promise<string> {
  const pdfPath = htmlPath.replace(/\.html$/, '.pdf')
  return new Promise((resolve, reject) => {
    exec(`wkhtmltopdf ${htmlPath} ${pdfPath}`, (error) => {
      if (error) reject(error)
      else resolve(pdfPath)
    })
  })
}
