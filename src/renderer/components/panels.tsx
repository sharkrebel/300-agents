import { useCallback, useEffect, useState } from 'react'
import { Check, GitBranch, Inbox, KeyRound, ListTodo, Mail, Plus, ScrollText, Sparkles, Trash2, Users } from 'lucide-react'
import type { BacklogItem, GitStatus, MailMessage, PromptEntry, RoleDef, TodoItem } from '../../shared/types'
import { useStore } from '../store'

function Empty({ icon, text }: { icon: React.ReactNode; text: string }): React.JSX.Element {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
      <div className="text-fog">{icon}</div>
      <p className="text-[12.5px] leading-relaxed text-fog">{text}</p>
    </div>
  )
}

function AddRow({ placeholder, onAdd }: { placeholder: string; onAdd: (v: string) => void }): React.JSX.Element {
  const [v, setV] = useState('')
  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        if (v.trim()) {
          onAdd(v.trim())
          setV('')
        }
      }}
    >
      <input
        value={v}
        onChange={(e) => setV(e.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-1 rounded-lg border border-line bg-panel2 px-3 py-2 text-[13px] text-paper outline-none placeholder:text-fog/70 focus:border-ember/60"
      />
      <button className="inline-flex items-center gap-1 rounded-lg bg-panel3 px-3 py-2 text-[12.5px] font-semibold text-mist transition hover:text-paper">
        <Plus size={14} /> Add
      </button>
    </form>
  )
}

export function BacklogPanel(): React.JSX.Element {
  const activeProjectId = useStore((s) => s.activeProjectId)
  const [items, setItems] = useState<BacklogItem[]>([])
  const load = useCallback(async () => {
    if (!activeProjectId) return
    const list = await window.agents300.backlog.list(activeProjectId)
    if (list) setItems(list)
  }, [activeProjectId])
  useEffect(() => { void load() }, [load])
  if (!activeProjectId) return <Empty icon={<Inbox size={22} />} text="Pick a project to see its backlog. Agents add items here too, through MCP." />
  const cycle = async (item: BacklogItem): Promise<void> => {
    const next = item.status === 'open' ? 'in-progress' : item.status === 'in-progress' ? 'done' : 'open'
    await window.agents300.backlog.update(item.id, { status: next })
    void load()
  }
  return (
    <div className="space-y-3">
      <AddRow
        placeholder="New backlog item…"
        onAdd={async (title) => {
          await window.agents300.backlog.add({ projectId: activeProjectId, title, source: 'user' })
          void load()
        }}
      />
      {items.length === 0 && <Empty icon={<Inbox size={22} />} text="No backlog items yet. Add one above, or let an agent add it with the backlog_add tool." />}
      {items.map((i) => (
        <div key={i.id} className="group rounded-xl border border-line bg-panel2 p-3">
          <div className="flex items-start gap-2">
            <button
              onClick={() => void cycle(i)}
              title="Cycle status"
              className={`mt-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide ${i.status === 'done' ? 'bg-moss/15 text-moss' : i.status === 'in-progress' ? 'bg-sky2/15 text-sky2' : 'bg-panel3 text-fog'}`}
            >
              {i.status.toUpperCase()}
            </button>
            <p className={`flex-1 text-[13px] leading-snug ${i.status === 'done' ? 'text-fog line-through' : 'text-paper'}`}>{i.title}</p>
            <button onClick={async () => { await window.agents300.backlog.remove(i.id); void load() }} className="text-fog opacity-0 transition hover:text-rust group-hover:opacity-100">
              <Trash2 size={14} />
            </button>
          </div>
          <div className="mt-1.5 pl-1 text-[11px] text-fog">
            {i.source === 'agent' ? 'Added by an agent' : i.source === 'extension' ? 'From browser extension' : 'Added by you'}
            {i.assigneeAgentId ? ` · assigned` : ''}
          </div>
        </div>
      ))}
    </div>
  )
}

export function PromptsPanel(): React.JSX.Element {
  const [items, setItems] = useState<PromptEntry[]>([])
  const [body, setBody] = useState('')
  const [title, setTitle] = useState('')
  const load = useCallback(async () => {
    const list = await window.agents300.prompts.list()
    if (list) setItems(list)
  }, [])
  useEffect(() => { void load() }, [load])
  return (
    <div className="space-y-3">
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Prompt title…" className="w-full rounded-lg border border-line bg-panel2 px-3 py-2 text-[13px] text-paper outline-none placeholder:text-fog/70 focus:border-ember/60" />
      <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Prompt body…" rows={3} className="w-full resize-none rounded-lg border border-line bg-panel2 px-3 py-2 text-[13px] text-paper outline-none placeholder:text-fog/70 focus:border-ember/60" />
      <button
        onClick={async () => {
          if (!title.trim() || !body.trim()) return
          await window.agents300.prompts.add({ title: title.trim(), body: body.trim(), tags: [] })
          setTitle(''); setBody(''); void load()
        }}
        className="inline-flex items-center gap-1.5 rounded-lg bg-ember px-3.5 py-2 text-[12.5px] font-bold text-[#1a1206] transition hover:bg-ember-deep"
      >
        <Plus size={14} /> Save prompt
      </button>
      {items.length === 0 && <Empty icon={<ScrollText size={22} />} text="Your prompt library is empty. Prompts saved here are shared with your agents via MCP." />}
      {items.map((p) => (
        <div key={p.id} className="group rounded-xl border border-line bg-panel2 p-3">
          <div className="flex items-center gap-2">
            <p className="flex-1 text-[13px] font-semibold text-paper">{p.title}</p>
            <button onClick={async () => { await window.agents300.prompts.remove(p.id); void load() }} className="text-fog opacity-0 transition hover:text-rust group-hover:opacity-100">
              <Trash2 size={14} />
            </button>
          </div>
          <p className="mt-1 line-clamp-3 text-[12.5px] leading-relaxed text-fog">{p.body}</p>
        </div>
      ))}
    </div>
  )
}

export function TodosPanel(): React.JSX.Element {
  const activeProjectId = useStore((s) => s.activeProjectId)
  const [items, setItems] = useState<TodoItem[]>([])
  const load = useCallback(async () => {
    if (!activeProjectId) return
    const list = await window.agents300.todos.list(activeProjectId)
    if (list) setItems(list)
  }, [activeProjectId])
  useEffect(() => { void load() }, [load])
  if (!activeProjectId) return <Empty icon={<ListTodo size={22} />} text="Pick a project to see its todos." />
  return (
    <div className="space-y-2">
      <AddRow
        placeholder="New todo…"
        onAdd={async (title) => { await window.agents300.todos.add({ projectId: activeProjectId, title }); void load() }}
      />
      {items.length === 0 && <Empty icon={<ListTodo size={22} />} text="Nothing to do. Enjoy the quiet, or add the next thing above." />}
      {items.map((t) => (
        <div key={t.id} className="group flex items-center gap-2.5 rounded-lg border border-line bg-panel2 px-3 py-2.5">
          <button
            onClick={async () => { await window.agents300.todos.toggle(t.id); void load() }}
            className={`flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded border ${t.done ? 'border-moss bg-moss text-white' : 'border-fog/50'}`}
            style={{ height: 18, width: 18 }}
          >
            {t.done && <Check size={12} />}
          </button>
          <span className={`flex-1 text-[13px] ${t.done ? 'text-fog line-through' : 'text-paper'}`}>{t.title}</span>
          <button onClick={async () => { await window.agents300.todos.remove(t.id); void load() }} className="text-fog opacity-0 transition hover:text-rust group-hover:opacity-100">
            <Trash2 size={13} />
          </button>
        </div>
      ))}
    </div>
  )
}

export function MailPanel(): React.JSX.Element {
  const sessions = useStore((s) => s.sessions)
  const [items, setItems] = useState<MailMessage[]>([])
  const [to, setTo] = useState('')
  const [subject, setSubject] = useState('')
  const [bodyText, setBodyText] = useState('')
  const load = useCallback(async () => {
    const list = await window.agents300.mail.list()
    if (list) setItems(list)
  }, [])
  useEffect(() => { void load() }, [load])
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-line bg-panel2 p-3">
        <p className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-bold tracking-[0.14em] text-fog"><Mail size={12} /> NEW MESSAGE</p>
        <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="To (agent title or id)" className="mb-2 w-full rounded-lg border border-line bg-panel px-3 py-2 text-[13px] text-paper outline-none placeholder:text-fog/70 focus:border-ember/60" />
        <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" className="mb-2 w-full rounded-lg border border-line bg-panel px-3 py-2 text-[13px] text-paper outline-none placeholder:text-fog/70 focus:border-ember/60" />
        <textarea value={bodyText} onChange={(e) => setBodyText(e.target.value)} placeholder="Message…" rows={3} className="w-full resize-none rounded-lg border border-line bg-panel px-3 py-2 text-[13px] text-paper outline-none placeholder:text-fog/70 focus:border-ember/60" />
        <button
          onClick={async () => {
            if (!to.trim() || !subject.trim()) return
            await window.agents300.mail.send({ fromAgent: 'user', toAgent: to.trim(), subject: subject.trim(), body: bodyText.trim() })
            setTo(''); setSubject(''); setBodyText(''); void load()
          }}
          className="mt-2 rounded-lg bg-ember px-3.5 py-2 text-[12.5px] font-bold text-[#1a1206] transition hover:bg-ember-deep"
        >
          Send to agent
        </button>
        <p className="mt-2 text-[11.5px] text-fog">Live sessions: {sessions.filter((s) => s.status === 'running').length} running · agents also read and reply via the mail MCP tools.</p>
      </div>
      {items.length === 0 && <Empty icon={<Mail size={22} />} text="Agent mail is empty. Agents use it to hand work to each other — and to you." />}
      {items.map((m) => (
        <button
          key={m.id}
          onClick={async () => { await window.agents300.mail.markRead(m.id); void load() }}
          className={`block w-full rounded-xl border p-3 text-left ${m.read ? 'border-line bg-panel2' : 'border-ember/40 bg-panel2'}`}
        >
          <div className="flex items-center gap-2 text-[11px] text-fog">
            <span className="font-semibold text-mist">{m.fromAgent}</span> → <span>{m.toAgent}</span>
            <span className="ml-auto">{new Date(m.createdAt).toLocaleTimeString()}</span>
          </div>
          <p className="mt-1 text-[13px] font-semibold text-paper">{m.subject}</p>
          <p className="mt-0.5 line-clamp-2 text-[12.5px] text-fog">{m.body}</p>
        </button>
      ))}
    </div>
  )
}

export function RolesPanel({ onLaunch }: { onLaunch: (role: RoleDef) => void }): React.JSX.Element {
  const [roles, setRoles] = useState<RoleDef[]>([])
  useEffect(() => { void window.agents300.roles().then((r) => r && setRoles(r)) }, [])
  return (
    <div className="space-y-2.5">
      <p className="inline-flex items-center gap-1.5 text-[12px] text-fog"><Users size={13} /> {roles.length} built-in roles. Launch one into the active project.</p>
      {roles.map((r) => (
        <div key={r.id} className="rounded-xl border border-line bg-panel2 p-3">
          <div className="flex items-center gap-2">
            <p className="flex-1 text-[13.5px] font-semibold text-paper">{r.name}</p>
            <button onClick={() => onLaunch(r)} className="rounded-full bg-panel3 px-3 py-1 text-[11.5px] font-semibold text-ember transition hover:bg-ember hover:text-[#1a1206]">
              Launch
            </button>
          </div>
          <p className="mt-1 text-[12.5px] leading-relaxed text-fog">{r.summary}</p>
          <div className="mt-2 flex flex-wrap gap-1">
            {r.tags.map((t) => <span key={t} className="rounded-full border border-line px-2 py-0.5 text-[10.5px] text-fog">{t}</span>)}
          </div>
        </div>
      ))}
    </div>
  )
}

export function GitPanel(): React.JSX.Element {
  const projects = useStore((s) => s.projects)
  const activeProjectId = useStore((s) => s.activeProjectId)
  const project = projects.find((p) => p.id === activeProjectId)
  const [status, setStatus] = useState<GitStatus | null>(null)
  const load = useCallback(async () => {
    if (!project) return
    setStatus(await window.agents300.gitStatus(project.path))
  }, [project])
  useEffect(() => { void load() }, [load])
  if (!project) return <Empty icon={<GitBranch size={22} />} text="Pick a project to see its git state." />
  if (!status) return <p className="py-8 text-center text-[12.5px] text-fog">Reading git state…</p>
  if (!status.isRepo) return <Empty icon={<GitBranch size={22} />} text="This folder is not a git repository yet." />
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-xl border border-line bg-panel2 px-3 py-2.5">
        <GitBranch size={15} className="text-ember" />
        <span className="font-mono text-[13px] text-paper">{status.branch ?? '(detached)'}</span>
        <span className="ml-auto text-[11.5px] text-fog">↑{status.ahead} ↓{status.behind}</span>
      </div>
      <div>
        <p className="mb-1.5 text-[11px] font-bold tracking-[0.14em] text-fog">WORKTREES · {status.worktrees.length}</p>
        {status.worktrees.map((w) => (
          <div key={w.path} className="mb-1 truncate rounded-lg bg-panel2 px-3 py-2 font-mono text-[11.5px] text-mist" title={w.path}>
            {w.path} {w.branch ? <span className="text-ember">@{w.branch}</span> : null}
          </div>
        ))}
      </div>
      <div>
        <p className="mb-1.5 text-[11px] font-bold tracking-[0.14em] text-fog">CHANGES · {status.changedFiles.length}</p>
        {status.changedFiles.length === 0 && <p className="text-[12.5px] text-fog">Clean working tree.</p>}
        {status.changedFiles.slice(0, 40).map((f) => (
          <div key={f.path} className="flex gap-2 truncate px-1 py-0.5 font-mono text-[11.5px]">
            <span className="w-6 shrink-0 text-ember">{f.status || '··'}</span>
            <span className="truncate text-mist">{f.path}</span>
          </div>
        ))}
      </div>
      <button onClick={() => void load()} className="text-[12px] font-semibold text-ember hover:underline">Refresh</button>
    </div>
  )
}

export function SettingsPanel(): React.JSX.Element {
  const settings = useStore((s) => s.settings)
  const setSettings = useStore((s) => s.setSettings)
  const projectsCount = useStore((s) => s.projects.length)
  const sessionsCount = useStore((s) => s.sessions.length)
  const [counts, setCounts] = useState<{ backlog: number; mail: number; prompts: number }>({ backlog: 0, mail: 0, prompts: 0 })
  useEffect(() => {
    void (async () => {
      const [b, m, p] = await Promise.all([
        window.agents300.backlog.list(),
        window.agents300.mail.list(),
        window.agents300.prompts.list()
      ])
      setCounts({ backlog: b?.length ?? 0, mail: m?.length ?? 0, prompts: p?.length ?? 0 })
    })()
  }, [])
  const [openai, setOpenai] = useState('')
  const [anthropic, setAnthropic] = useState('')
  const [info, setInfo] = useState<{ version: string; dataDir: string } | null>(null)
  useEffect(() => { void window.agents300.appInfo().then((i) => i && setInfo(i)) }, [])
  const save = async (key: 'openai' | 'anthropic', value: string): Promise<void> => {
    const next = await window.agents300.settings.set({ byoKeys: { ...(settings?.byoKeys ?? {}), [key]: value || undefined } })
    setSettings(next)
  }
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-line bg-panel2 p-3.5">
        <p className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-[0.14em] text-fog"><KeyRound size={12} /> YOUR API KEYS (BYO)</p>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-fog">
          300-Agents has no usage quotas. AI-powered extras run on your own keys and your own CLI subscriptions — providers bill you directly.
        </p>
        {([['openai', 'OpenAI API key', openai, setOpenai], ['anthropic', 'Anthropic API key', anthropic, setAnthropic]] as const).map(([key, label, val, setter]) => (
          <div key={key} className="mt-3">
            <label className="mb-1 block text-[12px] text-mist">{label} {settings?.byoKeys?.[key] ? <span className="text-moss">· saved</span> : null}</label>
            <div className="flex gap-2">
              <input type="password" value={val} onChange={(e) => setter(e.target.value)} placeholder="sk-…" className="min-w-0 flex-1 rounded-lg border border-line bg-panel px-3 py-2 font-mono text-[12px] text-paper outline-none placeholder:text-fog/60 focus:border-ember/60" />
              <button onClick={() => void save(key, val)} className="rounded-lg bg-panel3 px-3 py-2 text-[12.5px] font-semibold text-mist hover:text-paper">Save</button>
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-line bg-panel2 p-3.5">
        <p className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-[0.14em] text-fog"><Sparkles size={12} /> USAGE SO FAR — INFORMATION ONLY</p>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-fog">Counts are shown for your information. Nothing here is capped, throttled or billed by 300-Agents.</p>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          {[
            ['Projects', projectsCount],
            ['Sessions', sessionsCount],
            ['Backlog', counts.backlog],
            ['Prompts', counts.prompts],
            ['Mail', counts.mail],
            ['Limit', '∞']
          ].map(([k, v]) => (
            <div key={k} className="rounded-lg bg-panel px-2 py-2.5">
              <div className="font-mono text-[17px] font-bold text-paper">{v}</div>
              <div className="text-[10.5px] uppercase tracking-wide text-fog">{k}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-xl border border-line bg-panel2 p-3.5">
        <p className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-[0.14em] text-fog"><Sparkles size={12} /> ABOUT</p>
        <dl className="mt-2 space-y-1.5 text-[12.5px]">
          <div className="flex justify-between"><dt className="text-fog">Version</dt><dd className="font-mono text-mist">{info?.version ?? '…'}</dd></div>
          <div className="flex justify-between gap-3"><dt className="shrink-0 text-fog">Data folder</dt><dd className="truncate font-mono text-[11px] text-mist" title={info?.dataDir}>{info?.dataDir ?? '…'}</dd></div>
          <div className="flex justify-between"><dt className="text-fog">Mode</dt><dd className="text-mist">{settings?.mode === 'nondev' ? 'Non-dev' : 'Developer'}</dd></div>
          <div className="flex justify-between"><dt className="text-fog">Limits</dt><dd className="font-semibold text-ember">None — unlimited everything</dd></div>
        </dl>
      </div>
    </div>
  )
}
