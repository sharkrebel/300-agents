/**
 * Smoke test for the built 300-Agents MCP server (out/main/mcp-server.js).
 * Exercises the JSON-RPC stdio protocol end to end against a temp data dir.
 * Run after `npm run build`:  npm run test:mcp
 */
import { spawn } from 'child_process'
import { mkdtempSync, readFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

const dataDir = mkdtempSync(join(tmpdir(), 'agents300-mcp-test-'))
const proc = spawn('node', ['out/main/mcp-server.js'], {
  env: { ...process.env, AGENTS300_DATA_DIR: dataDir },
  stdio: ['pipe', 'pipe', 'inherit']
})

let buffer = ''
const pending = new Map()
proc.stdout.on('data', (chunk) => {
  buffer += chunk.toString()
  let idx
  while ((idx = buffer.indexOf('\n')) >= 0) {
    const line = buffer.slice(0, idx).trim()
    buffer = buffer.slice(idx + 1)
    if (!line) continue
    const msg = JSON.parse(line)
    if (msg.id !== undefined && pending.has(msg.id)) {
      pending.get(msg.id)(msg)
      pending.delete(msg.id)
    }
  }
})

let nextId = 1
function rpc(method, params) {
  const id = nextId++
  return new Promise((resolve, reject) => {
    pending.set(id, resolve)
    proc.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n')
    setTimeout(() => reject(new Error(`timeout waiting for ${method}`)), 8000)
  })
}

function assert(cond, label) {
  if (!cond) {
    console.error(`FAIL: ${label}`)
    process.exit(1)
  }
  console.log(`ok: ${label}`)
}

const init = await rpc('initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'test', version: '0' } })
assert(init.result?.serverInfo?.name === '300-agents', 'initialize returns serverInfo 300-agents')

const list = await rpc('tools/list')
const names = list.result.tools.map((t) => t.name)
for (const expected of ['backlog_list', 'backlog_add', 'backlog_update', 'prompts_list', 'prompts_add', 'todos_list', 'todos_add', 'agents_list_live', 'mail_list', 'mail_send']) {
  assert(names.includes(expected), `tool present: ${expected}`)
}

const added = await rpc('tools/call', { name: 'backlog_add', arguments: { projectId: 'p-test', title: 'Ship the thing' } })
const item = JSON.parse(added.result.content[0].text)
assert(item.title === 'Ship the thing' && item.status === 'open', 'backlog_add creates open item')

const listed = await rpc('tools/call', { name: 'backlog_list', arguments: { projectId: 'p-test' } })
const items = JSON.parse(listed.result.content[0].text)
assert(items.length === 1 && items[0].id === item.id, 'backlog_list returns the item')

const updated = await rpc('tools/call', { name: 'backlog_update', arguments: { id: item.id, status: 'done' } })
assert(JSON.parse(updated.result.content[0].text).status === 'done', 'backlog_update flips status')

const sent = await rpc('tools/call', { name: 'mail_send', arguments: { fromAgent: 'tester', toAgent: 'user', subject: 'Hi', body: 'It works' } })
assert(JSON.parse(sent.result.content[0].text).subject === 'Hi', 'mail_send stores message')

const mailList = await rpc('tools/call', { name: 'mail_list', arguments: {} })
assert(JSON.parse(mailList.result.content[0].text).length === 1, 'mail_list returns the message')

const onDisk = JSON.parse(readFileSync(join(dataDir, 'backlog.json'), 'utf-8'))
assert(onDisk.length === 1, 'data persisted to backlog.json in AGENTS300_DATA_DIR')

proc.kill()
console.log('\nMCP smoke test: ALL PASS')
