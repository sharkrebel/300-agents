import { useEffect } from 'react'
import { useStore, bootstrap } from './store'
import Onboarding from './components/Onboarding'
import Shell from './components/Shell'
import logoUrl from './assets/logo.svg'

export default function App(): React.JSX.Element {
  const ready = useStore((s) => s.ready)
  const settings = useStore((s) => s.settings)

  useEffect(() => {
    void bootstrap()
  }, [])

  if (!ready) {
    return (
      <div className="stage-glow flex h-full flex-col items-center justify-center gap-4">
        <img src={logoUrl} alt="300-Agents" className="h-16 w-16 rounded-2xl shadow-2xl shadow-black/60" />
        <div className="text-center">
          <p className="text-[17px] font-bold tracking-tight text-paper">300-Agents</p>
          <p className="mt-0.5 text-[12.5px] text-fog">Warming up your command center…</p>
        </div>
        <div className="shimmer-bar h-1 w-44 rounded-full bg-panel3" />
      </div>
    )
  }
  if (!settings?.onboarded) return <Onboarding />
  return <Shell />
}
