import { config } from '../config.js'

export function startSync(): void {
  setInterval(() => {
    fetch(`${config.apiUrl}/sync`, { method: 'POST' })
  }, 60_000)
}
