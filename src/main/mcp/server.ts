/**
 * 300-Agents MCP server (stdio).
 *
 * Spawned by agent CLIs through a project's `.mcp.json`. Exposes the shared
 * work surfaces of the desktop app — backlog, prompts, todos, agent mail —
 * so agents and the user operate on the same data. Data lives in JSON files
 * under AGENTS300_DATA_DIR (set by the desktop app) or ~/.300-agents.
 *
 * Minimal, dependency-free MCP implementation (JSON-RPC 2.0 over stdio).
 */
import { createInterface } from 'readline'
import { homedir } from 'os'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { Collection } from '../collection'
import type { BacklogItem, MailMessage, PromptEntry, RestoreState, TodoItem } from '../../shared/types'

const DATA_DIR = process.env.AGENTS300_DATA_DIR || join(homedir(), '.300-agents')

const backlog = new Collection<BacklogItem>(join(DATA_DIR, 'backlog.json'))
const prompts = new Collection<PromptEntry>(join(DATA_DIR, 'prompts.json'))
const todos = new Collection<TodoItem>(join(DATA_DIR, 'todos.json'))
const mail = new Collection<MailMessage>(join(DATA_DIR, 'mail.json'))

interface ToolDef {
  name: string
  description: string
  inputSchema: Record<string, unknown>
  run: (args: Record<string, unknown>) => unknown
}

const str = (v: unknown): string => (typeof v === 'string' ? v : '')

const TOOLS: ToolDef[] = [
  {
    name: 'backlog_list',
    description: 'List backlog items, optionally filtered by projectId.',
    inputSchema: { type: 'object', properties: { projectId: { type: 'string' } } },
    run: (a) => backlog.all().filter((i) => !str(a.projectId) || i.projectId === str(a.projectId))
  },
  {
    name: 'backlog_add',
    description: 'Add a backlog item for a project.',
    inputSchema: {
      type: 'object',
      required: ['projectId', 'title'],
      properties: { projectId: { type: 'string' }, title: { type: 'string' }, detail: { type: 'string' } }
    },
    run: (a) =>
      backlog.add({
        id: randomUUID(),
        projectId: str(a.projectId),
        title: str(a.title),
        detail: str(a.detail) || undefined,
        status: 'open',
        source: 'agent',
        createdAt: Date.now()
      })
  },
  {
    name: 'backlog_update',
    description: 'Update a backlog item status (open | in-progress | done) or assignee.',
    inputSchema: {
      type: 'object',
      required: ['id'],
      properties: { id: { type: 'string' }, status: { type: 'string' }, assigneeAgentId: { type: 'string' } }
    },
    run: (a) => {
      const items = backlog.all()
      const idx = items.findIndex((i) => i.id === str(a.id))
      if (idx < 0) throw new Error('backlog item not found')
      items[idx] = {
        ...items[idx],
        ...(str(a.status) ? { status: str(a.status) as BacklogItem['status'] } : {}),
        ...(str(a.assigneeAgentId) ? { assigneeAgentId: str(a.assigneeAgentId) } : {})
      }
      backlog.replace(items)
      return items[idx]
    }
  },
  {
    name: 'prompts_list',
    description: 'List saved prompts in the shared prompt library.',
    inputSchema: { type: 'object', properties: {} },
    run: () => prompts.all()
  },
  {
    name: 'prompts_add',
    description: 'Save a prompt to the shared prompt library.',
    inputSchema: {
      type: 'object',
      required: ['title', 'body'],
      properties: { title: { type: 'string' }, body: { type: 'string' }, tags: { type: 'array', items: { type: 'string' } } }
    },
    run: (a) =>
      prompts.add({
        id: randomUUID(),
        title: str(a.title),
        body: str(a.body),
        tags: Array.isArray(a.tags) ? (a.tags as string[]) : [],
        createdAt: Date.now()
      })
  },
  {
    name: 'todos_list',
    description: 'List todos, optionally filtered by projectId.',
    inputSchema: { type: 'object', properties: { projectId: { type: 'string' } } },
    run: (a) => todos.all().filter((t) => !str(a.projectId) || t.projectId === str(a.projectId))
  },
  {
    name: 'todos_add',
    description: 'Add a todo for a project.',
    inputSchema: {
      type: 'object',
      required: ['projectId', 'title'],
      properties: { projectId: { type: 'string' }, title: { type: 'string' } }
    },
    run: (a) => todos.add({ id: randomUUID(), projectId: str(a.projectId), title: str(a.title), done: false, createdAt: Date.now() })
  },
  {
    name: 'agents_list_live',
    description: 'List agent sessions currently known to the desktop app (from its restore state).',
    inputSchema: { type: 'object', properties: {} },
    run: () => {
      const fs = require('fs') as typeof import('fs')
      try {
        const parsed = JSON.parse(fs.readFileSync(join(DATA_DIR, 'restore-state.json'), 'utf-8')) as RestoreState
        return parsed.sessions ?? []
      } catch {
        return []
      }
    }
  },
  {
    name: 'ask_user',
    description: 'Ask the user a question. Delivered to the user through agent mail; the answer comes back as a mail reply.',
    inputSchema: {
      type: 'object',
      required: ['fromAgent', 'question'],
      properties: { fromAgent: { type: 'string' }, question: { type: 'string' } }
    },
    run: (a) =>
      mail.add({
        id: randomUUID(),
        fromAgent: str(a.fromAgent),
        toAgent: 'user',
        subject: `Question: ${str(a.question).slice(0, 80)}`,
        body: str(a.question),
        read: false,
        createdAt: Date.now()
      })
  },
  {
    name: 'mail_list',
    description: 'List agent mail messages, newest first.',
    inputSchema: { type: 'object', properties: {} },
    run: () => mail.all().sort((a, b) => b.createdAt - a.createdAt)
  },
  {
    name: 'mail_send',
    description: 'Send a message to another agent (or "user") through agent mail.',
    inputSchema: {
      type: 'object',
      required: ['fromAgent', 'toAgent', 'subject', 'body'],
      properties: {
        fromAgent: { type: 'string' },
        toAgent: { type: 'string' },
        subject: { type: 'string' },
        body: { type: 'string' }
      }
    },
    run: (a) =>
      mail.add({
        id: randomUUID(),
        fromAgent: str(a.fromAgent),
        toAgent: str(a.toAgent),
        subject: str(a.subject),
        body: str(a.body),
        read: false,
        createdAt: Date.now()
      })
  }
]

function send(msg: Record<string, unknown>): void {
  process.stdout.write(`${JSON.stringify(msg)}\n`)
}

function handle(msg: Record<string, unknown>): void {
  const id = msg.id as string | number | undefined
  const method = String(msg.method ?? '')
  if (method === 'initialize') {
    send({
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: '300-agents', version: '0.1.0' }
      }
    })
    return
  }
  if (method === 'ping') {
    send({ jsonrpc: '2.0', id, result: {} })
    return
  }
  if (method === 'tools/list') {
    send({
      jsonrpc: '2.0',
      id,
      result: { tools: TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })) }
    })
    return
  }
  if (method === 'tools/call') {
    const params = (msg.params ?? {}) as { name?: string; arguments?: Record<string, unknown> }
    const tool = TOOLS.find((t) => t.name === params.name)
    if (!tool) {
      send({ jsonrpc: '2.0', id, error: { code: -32602, message: `unknown tool: ${params.name}` } })
      return
    }
    try {
      const result = tool.run(params.arguments ?? {})
      send({
        jsonrpc: '2.0',
        id,
        result: { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
      })
    } catch (err) {
      send({
        jsonrpc: '2.0',
        id,
        result: { content: [{ type: 'text', text: `Error: ${(err as Error).message}` }], isError: true }
      })
    }
    return
  }
  if (id !== undefined) {
    send({ jsonrpc: '2.0', id, error: { code: -32601, message: `method not found: ${method}` } })
  }
}

const rl = createInterface({ input: process.stdin })
rl.on('line', (line) => {
  const trimmed = line.trim()
  if (!trimmed) return
  try {
    handle(JSON.parse(trimmed))
  } catch {
    /* ignore malformed frames */
  }
})
