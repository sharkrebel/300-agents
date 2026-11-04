import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../shared/types'
import type {
  AppSettings,
  BacklogItem,
  CliKind,
  DetectedCli,
  GitStatus,
  MailMessage,
  PromptEntry,
  RestoreState,
  RoleDef,
  TodoItem
} from '../shared/types'

export interface Agents300Api {
  appInfo: () => Promise<{ version: string; platform: string; dataDir: string } | null>
  pickFolder: () => Promise<string | null>
  settings: {
    get: () => Promise<AppSettings | null>
    set: (patch: Partial<AppSettings>) => Promise<AppSettings | null>
  }
  state: {
    get: () => Promise<RestoreState | null>
    set: (next: RestoreState) => Promise<boolean | null>
  }
  detectClis: () => Promise<DetectedCli[] | null>
  gitStatus: (cwd: string) => Promise<GitStatus | null>
  roles: () => Promise<RoleDef[] | null>
  pty: {
    spawn: (opts: { cli: CliKind; cwd: string; cols: number; rows: number; roleId?: string }) => Promise<string | null>
    write: (id: string, data: string) => void
    resize: (id: string, cols: number, rows: number) => void
    kill: (id: string) => Promise<boolean | null>
    onData: (cb: (payload: { id: string; data: string }) => void) => () => void
    onExit: (cb: (payload: { id: string; exitCode: number }) => void) => () => void
  }
  backlog: {
    list: (projectId?: string) => Promise<BacklogItem[] | null>
    add: (input: Omit<BacklogItem, 'id' | 'createdAt' | 'status'>) => Promise<BacklogItem | null>
    update: (id: string, patch: Partial<BacklogItem>) => Promise<BacklogItem | null>
    remove: (id: string) => Promise<boolean | null>
  }
  prompts: {
    list: () => Promise<PromptEntry[] | null>
    add: (input: Omit<PromptEntry, 'id' | 'createdAt'>) => Promise<PromptEntry | null>
    remove: (id: string) => Promise<boolean | null>
  }
  todos: {
    list: (projectId?: string) => Promise<TodoItem[] | null>
    add: (input: { projectId: string; title: string }) => Promise<TodoItem | null>
    toggle: (id: string) => Promise<boolean | null>
    remove: (id: string) => Promise<boolean | null>
  }
  mail: {
    list: () => Promise<MailMessage[] | null>
    send: (input: Omit<MailMessage, 'id' | 'createdAt' | 'read'>) => Promise<MailMessage | null>
    markRead: (id: string) => Promise<boolean | null>
  }
  mcp: {
    ensureConfig: (projectPath: string) => Promise<string | null>
  }
}

const invoke = <T>(channel: string, ...args: unknown[]): Promise<T | null> =>
  ipcRenderer.invoke(channel, ...args) as Promise<T | null>

const api: Agents300Api = {
  appInfo: () => invoke(IPC.appInfo),
  pickFolder: () => invoke(IPC.pickFolder),
  settings: {
    get: () => invoke(IPC.settingsGet),
    set: (patch) => invoke(IPC.settingsSet, patch)
  },
  state: {
    get: () => invoke(IPC.stateGet),
    set: (next) => invoke(IPC.stateSet, next)
  },
  detectClis: () => invoke(IPC.cliDetect),
  gitStatus: (cwd) => invoke(IPC.gitStatus, cwd),
  roles: () => invoke(IPC.rolesList),
  pty: {
    spawn: (opts) => invoke(IPC.ptySpawn, opts),
    write: (id, data) => ipcRenderer.send(IPC.ptyWrite, { id, data }),
    resize: (id, cols, rows) => ipcRenderer.send(IPC.ptyResize, { id, cols, rows }),
    kill: (id) => invoke(IPC.ptyKill, id),
    onData: (cb) => {
      const listener = (_: unknown, payload: { id: string; data: string }): void => cb(payload)
      ipcRenderer.on(IPC.ptyData, listener)
      return () => ipcRenderer.removeListener(IPC.ptyData, listener)
    },
    onExit: (cb) => {
      const listener = (_: unknown, payload: { id: string; exitCode: number }): void => cb(payload)
      ipcRenderer.on(IPC.ptyExit, listener)
      return () => ipcRenderer.removeListener(IPC.ptyExit, listener)
    }
  },
  backlog: {
    list: (projectId) => invoke(IPC.backlogList, projectId),
    add: (input) => invoke(IPC.backlogAdd, input),
    update: (id, patch) => invoke(IPC.backlogUpdate, id, patch),
    remove: (id) => invoke(IPC.backlogRemove, id)
  },
  prompts: {
    list: () => invoke(IPC.promptsList),
    add: (input) => invoke(IPC.promptsAdd, input),
    remove: (id) => invoke(IPC.promptsRemove, id)
  },
  todos: {
    list: (projectId) => invoke(IPC.todosList, projectId),
    add: (input) => invoke(IPC.todosAdd, input),
    toggle: (id) => invoke(IPC.todosToggle, id),
    remove: (id) => invoke(IPC.todosRemove, id)
  },
  mail: {
    list: () => invoke(IPC.mailList),
    send: (input) => invoke(IPC.mailSend, input),
    markRead: (id) => invoke(IPC.mailMarkRead, id)
  },
  mcp: {
    ensureConfig: (projectPath) => invoke(IPC.mcpEnsureConfig, projectPath)
  }
}

contextBridge.exposeInMainWorld('agents300', api)
