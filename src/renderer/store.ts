import { create } from 'zustand'
import type { AgentSession, AppSettings, CliKind, Project } from '../shared/types'

interface UiState {
  ready: boolean
  settings: AppSettings | null
  projects: Project[]
  sessions: AgentSession[]
  activeProjectId: string | null
  activeSessionId: string | null
  rightTab: 'backlog' | 'prompts' | 'todos' | 'mail' | 'git' | 'roles' | 'settings'
  setReady: (v: boolean) => void
  setSettings: (s: AppSettings | null) => void
  setProjects: (p: Project[]) => void
  setSessions: (s: AgentSession[]) => void
  setActiveProject: (id: string | null) => void
  setActiveSession: (id: string | null) => void
  setRightTab: (t: UiState['rightTab']) => void
  upsertSession: (s: AgentSession) => void
  patchSession: (id: string, patch: Partial<AgentSession>) => void
  removeSession: (id: string) => void
}

export const useStore = create<UiState>((set) => ({
  ready: false,
  settings: null,
  projects: [],
  sessions: [],
  activeProjectId: null,
  activeSessionId: null,
  rightTab: 'backlog',
  setReady: (v) => set({ ready: v }),
  setSettings: (s) => set({ settings: s }),
  setProjects: (p) => set({ projects: p }),
  setSessions: (s) => set({ sessions: s }),
  setActiveProject: (id) => set({ activeProjectId: id }),
  setActiveSession: (id) => set({ activeSessionId: id }),
  setRightTab: (t) => set({ rightTab: t }),
  upsertSession: (s) =>
    set((st) => {
      const idx = st.sessions.findIndex((x) => x.id === s.id)
      if (idx < 0) return { sessions: [...st.sessions, s] }
      const next = [...st.sessions]
      next[idx] = s
      return { sessions: next }
    }),
  patchSession: (id, patch) =>
    set((st) => ({ sessions: st.sessions.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
  removeSession: (id) => set((st) => ({ sessions: st.sessions.filter((x) => x.id !== id) }))
}))

export async function persistState(): Promise<void> {
  const st = useStore.getState()
  await window.agents300.state.set({
    projects: st.projects,
    sessions: st.sessions.map(({ id, projectId, title, cli, roleId, cwd }) => ({ id, projectId, title, cli, roleId, cwd })),
    activeSessionId: st.activeSessionId,
    activeProjectId: st.activeProjectId
  })
}

export async function bootstrap(): Promise<void> {
  const api = window.agents300
  const [settings, saved] = await Promise.all([api.settings.get(), api.state.get()])
  const st = useStore.getState()
  st.setSettings(settings)
  if (saved) {
    st.setProjects(saved.projects)
    st.setSessions(
      saved.sessions.map((s) => ({ ...s, status: 'exited' as const, createdAt: Date.now() }))
    )
    st.setActiveProject(saved.activeProjectId)
    st.setActiveSession(saved.activeSessionId)
  }
  st.setReady(true)
}

export function newSessionTitle(cli: CliKind, count: number): string {
  const label = cli === 'shell' ? 'Shell' : cli === 'claude' ? 'Claude' : cli === 'codex' ? 'Codex' : cli === 'antigravity' ? 'Antigravity' : 'OpenCode'
  return `${label} ${count + 1}`
}
