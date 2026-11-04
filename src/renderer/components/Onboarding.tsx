import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, Code2, FolderOpen, Sparkles, TerminalSquare } from 'lucide-react'
import type { CliKind, DetectedCli, UserMode } from '../../shared/types'
import { useStore, persistState } from '../store'

const DEV_TAGS = ['Web developer', 'Mobile developer', 'Data / ML', 'DevOps', 'Indie hacker']
const NONDEV_TAGS = ['Marketing', 'Sales', 'Founder', 'Student', 'Writer', 'Admin / HR']

export default function Onboarding(): React.JSX.Element {
  const [step, setStep] = useState(0)
  const [mode, setMode] = useState<UserMode>('dev')
  const [tag, setTag] = useState<string>('Web developer')
  const [projectPath, setProjectPath] = useState<string | null>(null)
  const [clis, setClis] = useState<DetectedCli[]>([])
  const [defaultCli, setDefaultCli] = useState<CliKind>('shell')
  const [finishing, setFinishing] = useState(false)
  const setSettings = useStore((s) => s.setSettings)
  const setProjects = useStore((s) => s.setProjects)
  const setActiveProject = useStore((s) => s.setActiveProject)

  useEffect(() => {
    void window.agents300.detectClis().then((list) => {
      if (!list) return
      setClis(list)
      const firstAgent = list.find((c) => c.found && c.kind !== 'shell')
      if (firstAgent) setDefaultCli(firstAgent.kind)
    })
  }, [])

  const pickFolder = async (): Promise<void> => {
    const p = await window.agents300.pickFolder()
    if (p) setProjectPath(p)
  }

  const finish = async (): Promise<void> => {
    setFinishing(true)
    const settings = await window.agents300.settings.set({ mode, onboarded: true, defaultCli })
    setSettings(settings)
    if (projectPath) {
      const name = projectPath.split('/').filter(Boolean).pop() ?? 'Project'
      const project = { id: crypto.randomUUID(), name, path: projectPath, createdAt: Date.now() }
      setProjects([project])
      setActiveProject(project.id)
      await window.agents300.mcp.ensureConfig(projectPath)
    }
    await persistState()
    setFinishing(false)
  }

  return (
    <div className="flex h-full items-center justify-center bg-ink px-6">
      <div className="rise-in w-full max-w-3xl">
        <div className="mb-3 flex items-center justify-center gap-2 text-[11px] font-semibold tracking-[0.22em] text-ember">
          <Sparkles size={13} />
          STEP {step + 1} OF 4 · 300-AGENTS
        </div>

        {step === 0 && (
          <>
            <h1 className="text-center font-serif text-[44px] leading-tight text-paper">Who are you?</h1>
            <p className="mt-2 text-center text-[15px] text-fog">We set up the interface for you. You can change it later.</p>
            <div className="mt-8 grid grid-cols-2 gap-4">
              <button
                onClick={() => { setMode('dev'); setTag(DEV_TAGS[0]) }}
                className={`rounded-2xl border p-6 text-left transition ${mode === 'dev' ? 'border-ember bg-panel2' : 'border-line bg-panel hover:border-fog/50'}`}
              >
                <Code2 className="text-ember" size={22} />
                <div className="mt-4 text-[10px] font-bold tracking-[0.2em] text-fog">DEV MODE</div>
                <div className="mt-1 text-[19px] font-semibold text-paper">I&apos;m a developer</div>
                <p className="mt-2 text-[13.5px] leading-relaxed text-fog">
                  Agents that work in your projects and repositories, with code review, terminal and dev commands.
                </p>
                <ul className="mt-3 space-y-1.5 text-[13px] text-mist">
                  <li>✓ Your projects and code repositories</li>
                  <li>✓ Several projects side by side</li>
                  <li>✓ No limits on projects or parallel agents</li>
                </ul>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {DEV_TAGS.map((t) => (
                    <span key={t} onClick={(e) => { e.stopPropagation(); setMode('dev'); setTag(t) }} className={`cursor-pointer rounded-full border px-2.5 py-1 text-[11.5px] ${tag === t && mode === 'dev' ? 'border-ember text-ember' : 'border-line text-fog'}`}>
                      {t}
                    </span>
                  ))}
                </div>
              </button>
              <button
                onClick={() => { setMode('nondev'); setTag(NONDEV_TAGS[0]) }}
                className={`rounded-2xl border p-6 text-left transition ${mode === 'nondev' ? 'border-ember bg-panel2' : 'border-line bg-panel hover:border-fog/50'}`}
              >
                <Sparkles className="text-ember" size={22} />
                <div className="mt-4 text-[10px] font-bold tracking-[0.2em] text-fog">NON-DEV MODE</div>
                <div className="mt-1 text-[19px] font-semibold text-paper">I&apos;m not a developer</div>
                <p className="mt-2 text-[13.5px] leading-relaxed text-fog">
                  AI assistants that take care of your tasks. No projects, no code.
                </p>
                <ul className="mt-3 space-y-1.5 text-[13px] text-mist">
                  <li>✓ One room, no projects, no code</li>
                  <li>✓ Assistants for your everyday tasks</li>
                  <li>✓ Prompt library, triggers and memory</li>
                </ul>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {NONDEV_TAGS.map((t) => (
                    <span key={t} onClick={(e) => { e.stopPropagation(); setMode('nondev'); setTag(t) }} className={`cursor-pointer rounded-full border px-2.5 py-1 text-[11.5px] ${tag === t && mode === 'nondev' ? 'border-ember text-ember' : 'border-line text-fog'}`}>
                      {t}
                    </span>
                  ))}
                </div>
              </button>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <h1 className="text-center font-serif text-[40px] leading-tight text-paper">Your first project</h1>
            <p className="mt-2 text-center text-[15px] text-fog">A project is a folder on this computer. Agents work inside it.</p>
            <div className="mx-auto mt-8 max-w-xl rounded-2xl border border-line bg-panel p-6">
              <button onClick={() => void pickFolder()} className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-fog/40 px-4 py-5 text-[14px] text-mist transition hover:border-ember hover:text-paper">
                <FolderOpen size={17} className="text-ember" />
                {projectPath ?? 'Choose a folder…'}
              </button>
              <p className="mt-3 text-center text-[12.5px] text-fog">
                300-Agents adds a shared MCP config (<span className="font-mono text-mist">.mcp.json</span>) so your agent CLIs can use the backlog, prompts and mail in this app. You can skip and add projects later — there is no project limit.
              </p>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="text-center font-serif text-[40px] leading-tight text-paper">Your agents</h1>
            <p className="mt-2 text-center text-[15px] text-fog">Bring your own AI coding CLIs — 300-Agents is the command center that runs them.</p>
            <div className="mx-auto mt-8 max-w-xl space-y-2.5">
              {clis.map((c) => (
                <button
                  key={c.kind}
                  onClick={() => c.found && setDefaultCli(c.kind)}
                  className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3.5 text-left transition ${defaultCli === c.kind ? 'border-ember bg-panel2' : 'border-line bg-panel'} ${c.found ? '' : 'opacity-50'}`}
                >
                  <TerminalSquare size={18} className="text-ember" />
                  <span className="flex-1">
                    <span className="block text-[14.5px] font-medium text-paper">{c.label}</span>
                    <span className="block font-mono text-[11.5px] text-fog">{c.command}{c.version ? ` · ${c.version}` : ''}</span>
                  </span>
                  {c.found ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-moss/15 px-2.5 py-1 text-[11px] font-semibold text-moss"><Check size={12} /> Detected</span>
                  ) : (
                    <span className="rounded-full bg-panel3 px-2.5 py-1 text-[11px] font-semibold text-fog">Not installed</span>
                  )}
                  {defaultCli === c.kind && c.found && <span className="text-[11px] font-bold tracking-wide text-ember">DEFAULT</span>}
                </button>
              ))}
              <p className="pt-1 text-center text-[12.5px] text-fog">Add as many CLI accounts as you like later in Settings — no account limits, ever.</p>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h1 className="text-center font-serif text-[40px] leading-tight text-paper">Ready when you are</h1>
            <div className="mx-auto mt-8 max-w-xl space-y-2.5">
              {[
                ['Mode', mode === 'dev' ? `Developer · ${tag}` : `Non-dev · ${tag}`],
                ['First project', projectPath ?? 'Add later from the sidebar'],
                ['Default agent CLI', clis.find((c) => c.kind === defaultCli)?.label ?? 'Shell'],
                ['Limits', 'None. Unlimited projects, agents and accounts.']
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between rounded-xl border border-line bg-panel px-4 py-3.5">
                  <span className="text-[12px] font-semibold tracking-[0.14em] text-fog">{k.toUpperCase()}</span>
                  <span className="text-[14px] text-paper">{v}</span>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="mt-9 flex items-center justify-between">
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 text-[13.5px] text-fog transition enabled:hover:text-paper disabled:opacity-0"
          >
            <ArrowLeft size={15} /> Back
          </button>
          <div className="flex gap-1.5">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className={`h-1.5 rounded-full transition-all ${i === step ? 'w-7 bg-ember' : 'w-2.5 bg-line'}`} />
            ))}
          </div>
          {step < 3 ? (
            <button onClick={() => setStep((s) => Math.min(3, s + 1))} className="inline-flex items-center gap-1.5 rounded-full bg-ember px-6 py-2.5 text-[13.5px] font-bold text-[#1a1206] transition hover:bg-ember-deep">
              Next <ArrowRight size={15} />
            </button>
          ) : (
            <button onClick={() => void finish()} disabled={finishing} className="inline-flex items-center gap-1.5 rounded-full bg-ember px-6 py-2.5 text-[13.5px] font-bold text-[#1a1206] transition hover:bg-ember-deep disabled:opacity-60">
              {finishing ? 'Setting up…' : 'Open 300-Agents'} <ArrowRight size={15} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
