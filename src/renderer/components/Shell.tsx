import { useMemo, useState } from 'react'
import {
  Bot,
  FolderGit2,
  GitBranch,
  Inbox,
  ListTodo,
  Mail,
  PanelRight,
  Plus,
  ScrollText,
  Settings as SettingsIcon,
  TerminalSquare,
  Users,
  X
} from 'lucide-react'
import type { AgentSession, CliKind, RoleDef } from '../../shared/types'
import { useStore, persistState, newSessionTitle } from '../store'
import TerminalView, { killSessionPty } from './TerminalView'
import { BacklogPanel, GitPanel, MailPanel, PromptsPanel, RolesPanel, SettingsPanel, TodosPanel } from './panels'

const CLI_OPTIONS: Array<{ kind: CliKind; label: string }> = [
  { kind: 'claude', label: 'Claude Code' },
  { kind: 'codex', label: 'Codex' },
  { kind: 'antigravity', label: 'Antigravity' },
  { kind: 'opencode', label: 'OpenCode' },
  { kind: 'shell', label: 'Plain shell' }
]

const TABS = [
  { id: 'backlog', label: 'Backlog', icon: Inbox },
  { id: 'prompts', label: 'Prompts', icon: ScrollText },
  { id: 'todos', label: 'Todos', icon: ListTodo },
  { id: 'mail', label: 'Mail', icon: Mail },
  { id: 'git', label: 'Git', icon: GitBranch },
  { id: 'roles', label: 'Roles', icon: Users },
  { id: 'settings', label: 'Settings', icon: SettingsIcon }
] as const

export default function Shell(): React.JSX.Element {
  const projects = useStore((s) => s.projects)
  const sessions = useStore((s) => s.sessions)
  const activeProjectId = useStore((s) => s.activeProjectId)
  const activeSessionId = useStore((s) => s.activeSessionId)
  const rightTab = useStore((s) => s.rightTab)
  const setRightTab = useStore((s) => s.setRightTab)
  const setProjects = useStore((s) => s.setProjects)
  const setActiveProject = useStore((s) => s.setActiveProject)
  const setActiveSession = useStore((s) => s.setActiveSession)
  const upsertSession = useStore((s) => s.upsertSession)
  const removeSession = useStore((s) => s.removeSession)
  const settings = useStore((s) => s.settings)
  const [showCliMenu, setShowCliMenu] = useState(false)
  const [showRight, setShowRight] = useState(true)

  const activeProject = projects.find((p) => p.id === activeProjectId) ?? null
  const projectSessions = useMemo(() => sessions.filter((s) => s.projectId === activeProjectId), [sessions, activeProjectId])
  const runningCount = sessions.filter((s) => s.status === 'running').length

  const addProject = async (): Promise<void> => {
    const path = await window.agents300.pickFolder()
    if (!path) return
    const name = path.split('/').filter(Boolean).pop() ?? 'Project'
    const project = { id: crypto.randomUUID(), name, path, createdAt: Date.now() }
    setProjects([...projects, project])
    setActiveProject(project.id)
    await window.agents300.mcp.ensureConfig(path)
    await persistState()
  }

  const startSession = async (cli: CliKind, role?: RoleDef): Promise<void> => {
    if (!activeProject) return
    const session: AgentSession = {
      id: crypto.randomUUID(),
      projectId: activeProject.id,
      title: role ? role.name : newSessionTitle(cli, projectSessions.length),
      cli,
      roleId: role?.id,
      cwd: activeProject.path,
      status: 'starting',
      createdAt: Date.now()
    }
    upsertSession(session)
    setActiveSession(session.id)
    setShowCliMenu(false)
    await persistState()
  }

  const closeSession = async (session: AgentSession): Promise<void> => {
    killSessionPty(session.id)
    removeSession(session.id)
    if (activeSessionId === session.id) setActiveSession(null)
    await persistState()
  }

  return (
    <div className="flex h-full flex-col bg-ink">
      {/* Top bar */}
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-line bg-panel px-4">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-ember font-mono text-[11px] font-black text-[#1a1206]">300</span>
          <span className="text-[14px] font-bold tracking-tight text-paper">300-Agents</span>
        </div>
        <div className="mx-auto flex items-center gap-2 rounded-full border border-line bg-panel2 py-1 pl-3 pr-2">
          <span className={`h-2 w-2 rounded-full ${runningCount > 0 ? 'bg-moss pulse-dot' : 'bg-fog/50'}`} />
          <span className="text-[12px] text-mist">
            {runningCount > 0 ? `${runningCount} agent${runningCount > 1 ? 's' : ''} running` : 'No agents running'}
          </span>
          {activeProject && <span className="rounded-full bg-panel3 px-2 py-0.5 font-mono text-[11px] text-fog">{activeProject.name}</span>}
        </div>
        <button
          onClick={() => setShowRight((v) => !v)}
          className={`rounded-lg p-2 transition ${showRight ? 'text-ember' : 'text-fog hover:text-paper'}`}
          title="Toggle side panel"
        >
          <PanelRight size={17} />
        </button>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Sidebar */}
        <aside className="flex w-[264px] shrink-0 flex-col border-r border-line bg-panel">
          <div className="flex items-center justify-between px-4 pb-1.5 pt-4">
            <span className="text-[10.5px] font-bold tracking-[0.18em] text-fog">PROJECTS · {projects.length}</span>
            <button onClick={() => void addProject()} className="rounded-md p-1 text-fog transition hover:bg-panel3 hover:text-paper" title="Add project folder">
              <Plus size={15} />
            </button>
          </div>
          <div className="scroll-thin space-y-1 overflow-y-auto px-2">
            {projects.length === 0 && <p className="px-2 py-3 text-[12.5px] leading-relaxed text-fog">No projects yet. Add a folder — unlimited projects, no paywall.</p>}
            {projects.map((p) => (
              <button
                key={p.id}
                onClick={() => { setActiveProject(p.id); setActiveSession(null); void persistState() }}
                className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left transition ${p.id === activeProjectId ? 'bg-panel3 text-paper' : 'text-mist hover:bg-panel2'}`}
              >
                <FolderGit2 size={15} className={p.id === activeProjectId ? 'text-ember' : 'text-fog'} />
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-medium">{p.name}</span>
                  <span className="block truncate font-mono text-[10.5px] text-fog">{p.path}</span>
                </span>
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between px-4 pb-1.5 pt-4">
            <span className="text-[10.5px] font-bold tracking-[0.18em] text-fog">AGENTS · {projectSessions.length}</span>
            <div className="relative">
              <button
                onClick={() => setShowCliMenu((v) => !v)}
                disabled={!activeProject}
                className="rounded-md p-1 text-fog transition enabled:hover:bg-panel3 enabled:hover:text-paper disabled:opacity-40"
                title="Start agent session"
              >
                <Plus size={15} />
              </button>
              {showCliMenu && (
                <div className="absolute right-0 top-7 z-20 w-44 overflow-hidden rounded-xl border border-line bg-panel2 shadow-xl shadow-black/50">
                  {CLI_OPTIONS.map((o) => (
                    <button
                      key={o.kind}
                      onClick={() => void startSession(o.kind)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12.5px] text-mist transition hover:bg-panel3 hover:text-paper"
                    >
                      <Bot size={13} className="text-ember" /> {o.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="scroll-thin min-h-0 flex-1 space-y-1 overflow-y-auto px-2 pb-3">
            {activeProject && projectSessions.length === 0 && (
              <p className="px-2 py-2 text-[12.5px] leading-relaxed text-fog">No agents in this project yet. Start one with +, or launch a role from the Roles tab.</p>
            )}
            {projectSessions.map((s) => (
              <div
                key={s.id}
                className={`group flex w-full items-center gap-2 rounded-lg px-2.5 py-2 transition ${s.id === activeSessionId ? 'bg-panel3 text-paper' : 'text-mist hover:bg-panel2'}`}
              >
                <button className="flex min-w-0 flex-1 items-center gap-2 text-left" onClick={() => setActiveSession(s.id)}>
                  <span className={`h-2 w-2 shrink-0 rounded-full ${s.status === 'running' ? 'bg-moss pulse-dot' : s.status === 'starting' ? 'bg-ember pulse-dot' : s.status === 'error' ? 'bg-rust' : 'bg-fog/40'}`} />
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-medium">{s.title}</span>
                    <span className="block font-mono text-[10.5px] uppercase tracking-wide text-fog">{s.cli}{s.roleId ? ` · ${s.roleId}` : ''}</span>
                  </span>
                </button>
                <button onClick={() => void closeSession(s)} className="shrink-0 text-fog opacity-0 transition hover:text-rust group-hover:opacity-100" title="Close session">
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
          <div className="border-t border-line px-4 py-3 text-[11px] leading-relaxed text-fog">
            Mode: {settings?.mode === 'nondev' ? 'Non-dev' : 'Developer'} · Default CLI: <span className="font-mono text-mist">{settings?.defaultCli ?? 'shell'}</span>
          </div>
        </aside>

        {/* Stage */}
        <main className="relative min-w-0 flex-1 bg-ink">
          {!activeProject && (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
              <TerminalSquare size={34} className="text-ember" />
              <h2 className="font-serif text-[26px] text-paper">Every agent you run, in one window.</h2>
              <p className="max-w-md text-[13.5px] leading-relaxed text-fog">
                Add a project folder on the left, then start an agent. Claude Code, Codex, Antigravity, OpenCode or a plain shell — as many in parallel as your machine handles.
              </p>
              <button onClick={() => void addProject()} className="mt-1 rounded-full bg-ember px-5 py-2.5 text-[13px] font-bold text-[#1a1206] transition hover:bg-ember-deep">
                Add your first project
              </button>
            </div>
          )}
          {activeProject && projectSessions.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
              <Bot size={34} className="text-ember" />
              <h2 className="font-serif text-[26px] text-paper">{activeProject.name} is ready.</h2>
              <p className="max-w-md text-[13.5px] leading-relaxed text-fog">Start an agent session with the + next to AGENTS, or launch a specialist from the Roles tab.</p>
              <button onClick={() => void startSession(settings?.defaultCli ?? 'shell')} className="mt-1 rounded-full bg-ember px-5 py-2.5 text-[13px] font-bold text-[#1a1206] transition hover:bg-ember-deep">
                Start {settings?.defaultCli ?? 'shell'} session
              </button>
            </div>
          )}
          {projectSessions.map((s) => (
            <div key={s.id} className="absolute inset-0" style={{ visibility: s.id === activeSessionId ? 'visible' : 'hidden' }}>
              <TerminalView session={s} visible={s.id === activeSessionId} />
            </div>
          ))}
        </main>

        {/* Right panel */}
        {showRight && (
          <aside className="flex w-[336px] shrink-0 flex-col border-l border-line bg-panel">
            <nav className="no-scrollbar flex gap-1 overflow-x-auto border-b border-line px-3 py-2.5">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setRightTab(id)}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium transition ${rightTab === id ? 'bg-panel3 text-paper' : 'text-fog hover:text-mist'}`}
                >
                  <Icon size={13} className={rightTab === id ? 'text-ember' : ''} /> {label}
                </button>
              ))}
            </nav>
            <div className="scroll-thin min-h-0 flex-1 overflow-y-auto p-3.5">
              {rightTab === 'backlog' && <BacklogPanel />}
              {rightTab === 'prompts' && <PromptsPanel />}
              {rightTab === 'todos' && <TodosPanel />}
              {rightTab === 'mail' && <MailPanel />}
              {rightTab === 'git' && <GitPanel />}
              {rightTab === 'roles' && <RolesPanel onLaunch={(role) => void startSession(settings?.defaultCli ?? 'shell', role)} />}
              {rightTab === 'settings' && <SettingsPanel />}
            </div>
          </aside>
        )}
      </div>
    </div>
  )
}
