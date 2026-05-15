import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(scriptDir, '..')

const children = []
let shuttingDown = false

const startProcess = (name, command, args) => {
  const isWindows = process.platform === 'win32'
  const spawnCommand = isWindows ? 'cmd.exe' : command
  const spawnArgs = isWindows ? ['/c', command, ...args] : args

  const child = spawn(spawnCommand, spawnArgs, {
    cwd: rootDir,
    stdio: 'inherit',
  })

  child.on('error', (error) => {
    if (shuttingDown) return
    console.error(`\nFailed to start ${name}:`, error.message)
    shutdown(1)
  })

  child.on('exit', (code, signal) => {
    if (shuttingDown) return

    if (code !== 0) {
      console.error(`\n${name} exited with code ${code ?? signal ?? 'unknown'}. Stopping the other process.`)
      shutdown(code ?? 1)
    }
  })

  children.push(child)
  return child
}

const shutdown = (code = 0) => {
  if (shuttingDown) return
  shuttingDown = true

  for (const child of children) {
    if (!child.killed) {
      child.kill('SIGTERM')
    }
  }

  process.exit(code)
}

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))

console.log('Starting backend and frontend...')
console.log('Backend: npm --prefix backend run dev')
console.log('Frontend: npm --prefix frontend run dev')

startProcess('backend', 'npm', ['--prefix', 'backend', 'run', 'dev'])
startProcess('frontend', 'npm', ['--prefix', 'frontend', 'run', 'dev'])
