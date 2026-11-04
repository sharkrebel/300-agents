import { join } from 'path'
import { randomUUID } from 'crypto'
import { Collection } from './collection'
import { getStores } from './stores'
import type { BacklogItem, MailMessage, PromptEntry, TodoItem } from '../shared/types'

export class Services {
  private backlogCol: Collection<BacklogItem>
  private promptsCol: Collection<PromptEntry>
  private todosCol: Collection<TodoItem>
  private mailCol: Collection<MailMessage>

  constructor() {
    const { dataDir } = getStores()
    this.backlogCol = new Collection<BacklogItem>(join(dataDir, 'backlog.json'))
    this.promptsCol = new Collection<PromptEntry>(join(dataDir, 'prompts.json'))
    this.todosCol = new Collection<TodoItem>(join(dataDir, 'todos.json'))
    this.mailCol = new Collection<MailMessage>(join(dataDir, 'mail.json'))
  }

  backlog = {
    list: (projectId?: string): BacklogItem[] =>
      this.backlogCol.all().filter((i) => !projectId || i.projectId === projectId),
    add: (input: Omit<BacklogItem, 'id' | 'createdAt' | 'status'> & { status?: BacklogItem['status'] }): BacklogItem =>
      this.backlogCol.add({
        ...input,
        id: randomUUID(),
        status: input.status ?? 'open',
        createdAt: Date.now()
      }),
    update: (id: string, patch: Partial<BacklogItem>): BacklogItem | null => {
      const items = this.backlogCol.all()
      const idx = items.findIndex((i) => i.id === id)
      if (idx < 0) return null
      items[idx] = { ...items[idx], ...patch }
      this.backlogCol.replace(items)
      return items[idx]
    },
    remove: (id: string): void => this.backlogCol.replace(this.backlogCol.all().filter((i) => i.id !== id))
  }

  prompts = {
    list: (): PromptEntry[] => this.promptsCol.all(),
    add: (input: Omit<PromptEntry, 'id' | 'createdAt'>): PromptEntry =>
      this.promptsCol.add({ ...input, id: randomUUID(), createdAt: Date.now() }),
    remove: (id: string): void => this.promptsCol.replace(this.promptsCol.all().filter((p) => p.id !== id))
  }

  todos = {
    list: (projectId?: string): TodoItem[] =>
      this.todosCol.all().filter((t) => !projectId || t.projectId === projectId),
    add: (input: { projectId: string; title: string }): TodoItem =>
      this.todosCol.add({ id: randomUUID(), done: false, createdAt: Date.now(), ...input }),
    toggle: (id: string): void => {
      const items = this.todosCol.all().map((t) => (t.id === id ? { ...t, done: !t.done } : t))
      this.todosCol.replace(items)
    },
    remove: (id: string): void => this.todosCol.replace(this.todosCol.all().filter((t) => t.id !== id))
  }

  mail = {
    list: (): MailMessage[] => this.mailCol.all().sort((a, b) => b.createdAt - a.createdAt),
    send: (input: Omit<MailMessage, 'id' | 'createdAt' | 'read'>): MailMessage =>
      this.mailCol.add({ ...input, id: randomUUID(), read: false, createdAt: Date.now() }),
    markRead: (id: string): void => {
      const items = this.mailCol.all().map((m) => (m.id === id ? { ...m, read: true } : m))
      this.mailCol.replace(items)
    }
  }
}

let instance: Services | null = null
export function getServices(): Services {
  if (!instance) instance = new Services()
  return instance
}
