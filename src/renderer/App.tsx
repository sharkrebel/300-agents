import { useEffect } from 'react'
import { useStore, bootstrap } from './store'
import Onboarding from './components/Onboarding'
import Shell from './components/Shell'

export default function App(): React.JSX.Element {
  const ready = useStore((s) => s.ready)
  const settings = useStore((s) => s.settings)

  useEffect(() => {
    void bootstrap()
  }, [])

  if (!ready) {
    return (
      <div className="flex h-full items-center justify-center bg-ink">
        <div className="flex items-center gap-3 text-fog">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ember font-mono text-[13px] font-black text-[#1a1206]">300</span>
          <span className="text-[14px]">Starting 300-Agents…</span>
        </div>
      </div>
    )
  }
  if (!settings?.onboarded) return <Onboarding />
  return <Shell />
}
