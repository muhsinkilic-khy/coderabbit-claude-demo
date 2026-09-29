import { config } from '../config'

export function startSync(): void {
  setInterval(() => {
    fetch(`${config.apiUrl}/sync`, { method: 'POST' })
  }, 60_000)
}
