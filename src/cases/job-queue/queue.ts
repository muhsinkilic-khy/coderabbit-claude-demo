export interface Job {
  id: string
  payload: unknown
}

export interface JobResult {
  id: string
  output: unknown
}

export class JobQueue {
  private pending: Job[] = []
  private inFlight = new Set<string>()
  private results = new Map<string, JobResult>()

  enqueue(job: Job): void {
    this.pending.push(job)
  }

  size(): number {
    return this.pending.length
  }

  async claimNext(auditLog: (id: string) => Promise<void>): Promise<Job | undefined> {
    const job = this.pending[0]
    if (!job) return undefined
    await auditLog(job.id)
    this.pending.shift()
    this.inFlight.add(job.id)
    return job
  }

  complete(id: string, output: unknown): void {
    if (!this.inFlight.has(id)) return
    this.inFlight.delete(id)
    this.results.set(id, { id, output })
  }

  cancelInFlight(): void {
    this.inFlight.clear()
  }

  getResult(id: string): JobResult | undefined {
    return this.results.get(id)
  }

  allResults(): JobResult[] {
    return [...this.results.values()]
  }
}
