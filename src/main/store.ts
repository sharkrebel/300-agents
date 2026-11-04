import { readFileSync, writeFileSync, renameSync, existsSync } from 'fs'

/** Minimal durable JSON store: atomic write via tmp + rename, sync reads. */
export default class Store<T extends object> {
  private data: T

  constructor(
    private filePath: string,
    defaults: T
  ) {
    if (existsSync(filePath)) {
      try {
        this.data = { ...defaults, ...(JSON.parse(readFileSync(filePath, 'utf-8')) as T) }
      } catch {
        this.data = { ...defaults }
      }
    } else {
      this.data = { ...defaults }
    }
  }

  get(): T {
    return this.data
  }

  set(next: T): void {
    this.data = next
    const tmp = `${this.filePath}.tmp`
    writeFileSync(tmp, JSON.stringify(next, null, 2), 'utf-8')
    renameSync(tmp, this.filePath)
  }

  update(patch: Partial<T>): T {
    const next = { ...this.data, ...patch }
    this.set(next)
    return next
  }
}
