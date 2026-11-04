import { readFileSync, writeFileSync, renameSync, existsSync, mkdirSync } from 'fs'
import { dirname } from 'path'

/** Tiny JSON-array collection persisted to a file. Shared by the main
 *  process services and the standalone MCP server process. */
export class Collection<T> {
  private items: T[]

  constructor(private filePath: string) {
    mkdirSync(dirname(filePath), { recursive: true })
    if (existsSync(filePath)) {
      try {
        const parsed = JSON.parse(readFileSync(filePath, 'utf-8'))
        this.items = Array.isArray(parsed) ? parsed : []
      } catch {
        this.items = []
      }
    } else {
      this.items = []
    }
  }

  all(): T[] {
    return [...this.items]
  }

  replace(items: T[]): void {
    this.items = items
    const tmp = `${this.filePath}.tmp`
    writeFileSync(tmp, JSON.stringify(items, null, 2), 'utf-8')
    renameSync(tmp, this.filePath)
  }

  add(item: T): T {
    this.replace([...this.items, item])
    return item
  }
}
