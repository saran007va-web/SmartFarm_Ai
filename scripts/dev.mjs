import { spawn, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(scriptDir, '..')
const composeFile = path.join(rootDir, 'agriassist-backend', 'docker-compose.yml')

const children = []
let shuttingDown = false

console.log('Resetting backend stack to avoid stale Postgres credentials...')
const cleanup = spawnSync('docker', ['compose', '-f', composeFile, 'down', '-v', '--remove-orphans'], {
  cwd: rootDir,
  stdio: 'inherit',
})

if (cleanup.status && cleanup.status !== 0) {
  process.exit(cleanup.status)
}

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
console.log(`Backend compose file: ${composeFile}`)
console.log('Frontend: npm --prefix frontend run dev')

startProcess('backend', 'docker', ['compose', '-f', composeFile, 'up', '--build', 'db', 'backend'])
startProcess('frontend', 'npm', ['--prefix', 'frontend', 'run', 'dev'])
