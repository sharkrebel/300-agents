import { execFile } from 'child_process'
import { promisify } from 'util'
import type { GitStatus } from '../shared/types'

const run = promisify(execFile)

async function git(cwd: string, args: string[]): Promise<string> {
  const { stdout } = await run('git', args, { cwd, timeout: 8000 })
  return stdout.trim()
}

export async function getGitStatus(cwd: string): Promise<GitStatus> {
  const empty: GitStatus = { isRepo: false, ahead: 0, behind: 0, changedFiles: [], worktrees: [] }
  try {
    await git(cwd, ['rev-parse', '--is-inside-work-tree'])
  } catch {
    return empty
  }
  try {
    const [branch, porcelain, worktreeRaw, counts] = await Promise.all([
      git(cwd, ['branch', '--show-current']).catch(() => ''),
      git(cwd, ['status', '--porcelain']).catch(() => ''),
      git(cwd, ['worktree', 'list', '--porcelain']).catch(() => ''),
      git(cwd, ['rev-list', '--left-right', '--count', '@{upstream}...HEAD']).catch(() => '')
    ])
    const changedFiles = porcelain
      ? porcelain.split('\n').filter(Boolean).map((line) => ({ status: line.slice(0, 2).trim(), path: line.slice(3) }))
      : []
    const worktrees: GitStatus['worktrees'] = []
    let current: { path: string; branch?: string } | null = null
    for (const line of worktreeRaw.split('\n')) {
      if (line.startsWith('worktree ')) {
        if (current) worktrees.push(current)
        current = { path: line.slice('worktree '.length) }
      } else if (line.startsWith('branch ') && current) {
        current.branch = line.slice('branch refs/heads/'.length)
      }
    }
    if (current) worktrees.push(current)
    let ahead = 0
    let behind = 0
    if (counts) {
      const [b, a] = counts.split(/\s+/).map(Number)
      behind = b || 0
      ahead = a || 0
    }
    return { isRepo: true, branch: branch || undefined, ahead, behind, changedFiles, worktrees }
  } catch {
    return { ...empty, isRepo: true }
  }
}
