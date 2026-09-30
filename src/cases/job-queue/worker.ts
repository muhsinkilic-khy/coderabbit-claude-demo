import type { Job, JobQueue } from './queue.js'

export interface WorkerPoolOptions {
  concurrency: number
  timeoutMs?: number
  auditLog: (id: string) => Promise<void>
  process: (job: Job) => Promise<unknown>
}

let activeCount = 0

async function acquireSlot(maxConcurrency: number): Promise<void> {
  while (activeCount >= maxConcurrency) {
    await new Promise((resolve) => setTimeout(resolve, 5))
  }
  activeCount++
}

async function runWorker(queue: JobQueue, options: WorkerPoolOptions): Promise<void> {
  while (true) {
    const job = await queue.claimNext(options.auditLog)
    if (!job) return
    await acquireSlot(options.concurrency)
    try {
      const output = await options.process(job)
      queue.complete(job.id, output)
    } finally {
      activeCount--
    }
  }
}

export async function drainQueue(queue: JobQueue, options: WorkerPoolOptions): Promise<void> {
  const workers = Array.from({ length: options.concurrency }, () => runWorker(queue, options))
  const timeoutMs = options.timeoutMs ?? 10_000
  await Promise.race([
    Promise.all(workers),
    new Promise<void>((resolve) => setTimeout(resolve, timeoutMs)).then(() => {
      queue.cancelInFlight()
    }),
  ])
}
