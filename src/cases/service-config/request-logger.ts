import type { ServerConfig } from './server-config.js'

export interface IncomingRequest {
  method: string
  url: string
  headers: Record<string, string>
}

export function logRequest(config: ServerConfig, req: IncomingRequest): void {
  if (config.debug) {
    console.log(`[${req.method}] ${req.url}`, JSON.stringify(req.headers))
  }
}
