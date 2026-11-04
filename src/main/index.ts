import { app, BrowserWindow, dialog, ipcMain, Menu, shell } from 'electron'
import { join } from 'path'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { IPC, type AppSettings, type BacklogItem, type RestoreState } from '../shared/types'
import { getStores } from './stores'
import { getServices } from './services'
import { detectClis } from './cli'
import { getGitStatus } from './git'
import { PtyManager } from './pty'
import { ROLES } from './roles'

let mainWindow: BrowserWindow | null = null

const ptys = new PtyManager({
  onData: (id, data) => mainWindow?.webContents.send(IPC.ptyData, { id, data }),
  onExit: (id, exitCode) => mainWindow?.webContents.send(IPC.ptyExit, { id, exitCode })
})

/** Only the app's own renderer may use IPC: dev server origin or bundled file. */
function isTrustedSender(event: Electron.IpcMainInvokeEvent): boolean {
  const url = event.senderFrame?.url ?? ''
  if (url.startsWith('file://')) return true
  if (!app.isPackaged && url.startsWith('http://localhost')) return true
  return false
}

function guard<T extends unknown[], R>(fn: (...args: T) => R) {
  return (event: Electron.IpcMainInvokeEvent, ...args: T): R | null => {
    if (!isTrustedSender(event)) return null
    return fn(...args)
  }
}

function registerIpc(): void {
  const stores = getStores()
  const services = getServices()

  ipcMain.handle(IPC.appInfo, guard(() => ({ version: app.getVersion(), platform: process.platform, dataDir: stores.dataDir })))
  ipcMain.handle(
    IPC.pickFolder,
    guard(async () => {
      if (!mainWindow) return null
      const res = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory', 'createDirectory'] })
      return res.canceled ? null : res.filePaths[0]
    })
  )
  ipcMain.handle(IPC.settingsGet, guard(() => stores.settings.get()))
  ipcMain.handle(IPC.settingsSet, guard((patch: Partial<AppSettings>) => stores.settings.update(patch)))
  ipcMain.handle(IPC.stateGet, guard(() => stores.state.get()))
  ipcMain.handle(IPC.stateSet, guard((next: RestoreState) => { stores.state.set(next); return true }))
  ipcMain.handle(IPC.cliDetect, guard(() => detectClis()))
  ipcMain.handle(IPC.gitStatus, guard((cwd: string) => getGitStatus(cwd)))
  ipcMain.handle(IPC.rolesList, guard(() => ROLES))

  ipcMain.handle(
    IPC.ptySpawn,
    guard((opts: { cli: Parameters<PtyManager['spawn']>[0]['cli']; cwd: string; cols: number; rows: number; roleId?: string }) => {
      const rolePrompt = opts.roleId ? ROLES.find((r) => r.id === opts.roleId)?.systemPrompt : undefined
      return ptys.spawn({ ...opts, rolePrompt })
    })
  )
  ipcMain.on(IPC.ptyWrite, (event, payload: { id: string; data: string }) => {
    if (isTrustedSender(event as unknown as Electron.IpcMainInvokeEvent)) ptys.write(payload.id, payload.data)
  })
  ipcMain.on(IPC.ptyResize, (event, payload: { id: string; cols: number; rows: number }) => {
    if (isTrustedSender(event as unknown as Electron.IpcMainInvokeEvent)) ptys.resize(payload.id, payload.cols, payload.rows)
  })
  ipcMain.handle(IPC.ptyKill, guard((id: string) => { ptys.kill(id); return true }))

  ipcMain.handle(IPC.backlogList, guard((projectId?: string) => services.backlog.list(projectId)))
  ipcMain.handle(IPC.backlogAdd, guard((input: Parameters<typeof services.backlog.add>[0]) => services.backlog.add(input)))
  ipcMain.handle(IPC.backlogUpdate, guard((id: string, patch: Partial<BacklogItem>) => services.backlog.update(id, patch)))
  ipcMain.handle(IPC.backlogRemove, guard((id: string) => { services.backlog.remove(id); return true }))
  ipcMain.handle(IPC.promptsList, guard(() => services.prompts.list()))
  ipcMain.handle(IPC.promptsAdd, guard((input: Parameters<typeof services.prompts.add>[0]) => services.prompts.add(input)))
  ipcMain.handle(IPC.promptsRemove, guard((id: string) => { services.prompts.remove(id); return true }))
  ipcMain.handle(IPC.todosList, guard((projectId?: string) => services.todos.list(projectId)))
  ipcMain.handle(IPC.todosAdd, guard((input: { projectId: string; title: string }) => services.todos.add(input)))
  ipcMain.handle(IPC.todosToggle, guard((id: string) => { services.todos.toggle(id); return true }))
  ipcMain.handle(IPC.todosRemove, guard((id: string) => { services.todos.remove(id); return true }))
  ipcMain.handle(IPC.mailList, guard(() => services.mail.list()))
  ipcMain.handle(IPC.mailSend, guard((input: Parameters<typeof services.mail.send>[0]) => services.mail.send(input)))
  ipcMain.handle(IPC.mailMarkRead, guard((id: string) => { services.mail.markRead(id); return true }))

  ipcMain.handle(
    IPC.mcpEnsureConfig,
    guard((projectPath: string) => {
      const configPath = join(projectPath, '.mcp.json')
      const serverPath = join(__dirname, 'mcp-server.js')
      let config: { mcpServers?: Record<string, unknown> } = {}
      if (existsSync(configPath)) {
        try {
          config = JSON.parse(readFileSync(configPath, 'utf-8'))
        } catch {
          config = {}
        }
      }
      config.mcpServers = {
        ...(config.mcpServers ?? {}),
        '300-agents': {
          command: process.execPath,
          args: [serverPath],
          env: { ELECTRON_RUN_AS_NODE: '1', AGENTS300_DATA_DIR: stores.dataDir }
        }
      }
      writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8')
      return configPath
    })
  )
}

function createWindow(): void {
  const saved = getStores().settings.get().windowBounds
  const iconPath = join(app.getAppPath(), 'build', 'icon.png')
  mainWindow = new BrowserWindow({
    width: saved?.width ?? 1440,
    height: saved?.height ?? 900,
    x: saved?.x,
    y: saved?.y,
    minWidth: 1024,
    minHeight: 640,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#0a0b0e',
    title: '300-Agents',
    ...(existsSync(iconPath) ? { icon: iconPath } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })
  let saveTimer: NodeJS.Timeout | null = null
  const persistBounds = (): void => {
    if (!mainWindow || mainWindow.isDestroyed() || mainWindow.isMinimized()) return
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        getStores().settings.update({ windowBounds: mainWindow.getBounds() })
      }
    }, 400)
  }
  mainWindow.on('resize', persistBounds)
  mainWindow.on('move', persistBounds)
  mainWindow.on('ready-to-show', () => mainWindow?.show())
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) shell.openExternal(url)
    return { action: 'deny' }
  })
  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null)
  registerIpc()
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  ptys.killAll()
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => ptys.killAll())
