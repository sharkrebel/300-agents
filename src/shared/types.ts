export type UserMode = 'dev' | 'nondev'

export interface Project {
  id: string
  name: string
  path: string
  createdAt: number
}

export type CliKind = 'claude' | 'codex' | 'antigravity' | 'opencode' | 'shell'

export interface DetectedCli {
  kind: CliKind
  label: string
  command: string
  found: boolean
  version?: string
}

export interface AgentSession {
  id: string
  projectId: string
  title: string
  cli: CliKind
  roleId?: string
  cwd: string
  status: 'starting' | 'running' | 'exited' | 'error'
  createdAt: number
}

export interface AppSettings {
  mode: UserMode | null
  onboarded: boolean
  defaultCli: CliKind
  byoKeys: {
    openai?: string
    anthropic?: string
  }
  windowBounds?: { width: number; height: number; x?: number; y?: number }
}

export interface RestoreState {
  projects: Project[]
  sessions: Array<Pick<AgentSession, 'id' | 'projectId' | 'title' | 'cli' | 'roleId' | 'cwd'>>
  activeSessionId: string | null
  activeProjectId: string | null
}

export interface BacklogItem {
  id: string
  projectId: string
  title: string
  detail?: string
  status: 'open' | 'in-progress' | 'done'
  source: 'user' | 'agent' | 'extension'
  createdAt: number
  assigneeAgentId?: string
}

export interface PromptEntry {
  id: string
  title: string
  body: string
  tags: string[]
  createdAt: number
}

export interface TodoItem {
  id: string
  projectId: string
  title: string
  done: boolean
  createdAt: number
}

export interface MailMessage {
  id: string
  fromAgent: string
  toAgent: string
  subject: string
  body: string
  read: boolean
  createdAt: number
}

export interface RoleDef {
  id: string
  name: string
  summary: string
  systemPrompt: string
  tags: string[]
}

export interface GitStatus {
  isRepo: boolean
  branch?: string
  ahead: number
  behind: number
  changedFiles: Array<{ path: string; status: string }>
  worktrees: Array<{ path: string; branch?: string }>
}

export const IPC = {
  appInfo: 'app:info',
  pickFolder: 'dialog:pick-folder',
  settingsGet: 'settings:get',
  settingsSet: 'settings:set',
  stateGet: 'state:get',
  stateSet: 'state:set',
  cliDetect: 'cli:detect',
  projectScan: 'project:scan',
  ptySpawn: 'pty:spawn',
  ptyWrite: 'pty:write',
  ptyResize: 'pty:resize',
  ptyKill: 'pty:kill',
  ptyData: 'pty:data',
  ptyExit: 'pty:exit',
  backlogList: 'backlog:list',
  backlogAdd: 'backlog:add',
  backlogUpdate: 'backlog:update',
  backlogRemove: 'backlog:remove',
  promptsList: 'prompts:list',
  promptsAdd: 'prompts:add',
  promptsRemove: 'prompts:remove',
  todosList: 'todos:list',
  todosAdd: 'todos:add',
  todosToggle: 'todos:toggle',
  todosRemove: 'todos:remove',
  mailList: 'mail:list',
  mailSend: 'mail:send',
  mailMarkRead: 'mail:mark-read',
  rolesList: 'roles:list',
  gitStatus: 'git:status',
  mcpEnsureConfig: 'mcp:ensure-config'
} as const
