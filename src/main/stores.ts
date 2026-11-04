import Store from './store'
import { app } from 'electron'
import { join } from 'path'
import { mkdirSync } from 'fs'
import type { AppSettings, RestoreState } from '../shared/types'

export interface AppStores {
  settings: Store<AppSettings>
  state: Store<RestoreState>
  dataDir: string
}

const DEFAULT_SETTINGS: AppSettings = {
  mode: null,
  onboarded: false,
  defaultCli: 'claude',
  byoKeys: {}
}

const DEFAULT_STATE: RestoreState = {
  projects: [],
  sessions: [],
  activeSessionId: null,
  activeProjectId: null
}

let cached: AppStores | null = null

export function getStores(): AppStores {
  if (cached) return cached
  const dataDir = join(app.getPath('userData'), '300-agents')
  mkdirSync(dataDir, { recursive: true })
  cached = {
    dataDir,
    settings: new Store<AppSettings>(join(dataDir, 'settings.json'), DEFAULT_SETTINGS),
    state: new Store<RestoreState>(join(dataDir, 'restore-state.json'), DEFAULT_STATE)
  }
  return cached
}
