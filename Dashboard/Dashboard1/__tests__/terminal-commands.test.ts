import { describe, it, expect, beforeEach } from 'vitest'
import {
  processCommand,
  resolveDir,
  FILESYSTEM,
  FILE_CONTENTS,
  DOCKER_PS,
  DOCKER_IMAGES,
  DOCKER_STATS,
  type ShellState,
} from '@/lib/terminal-engine'

function makeState(overrides?: Partial<ShellState>): ShellState {
  return {
    cwd: '/home/user',
    env: {
      HOME: '/home/user',
      USER: 'root',
      SHELL: '/bin/bash',
      PATH: '/usr/local/bin:/usr/bin:/bin',
    },
    history: [],
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// processCommand tests
// ---------------------------------------------------------------------------
describe('processCommand', () => {
  let state: ShellState

  beforeEach(() => {
    state = makeState()
  })

  // -- pwd --
  it('pwd returns current directory', () => {
    const { output, newCwd } = processCommand('pwd', state)
    expect(output).toBe('/home/user')
    expect(newCwd).toBe('/home/user')
  })

  it('pwd reflects changed directory', () => {
    state.cwd = '/etc'
    const { output } = processCommand('pwd', state)
    expect(output).toBe('/etc')
  })

  // -- cd --
  it('cd ~ goes to /home/user', () => {
    state.cwd = '/etc'
    const { output, newCwd } = processCommand('cd ~', state)
    expect(output).toBe('')
    expect(newCwd).toBe('/home/user')
  })

  it('cd with no args goes to /home/user', () => {
    state.cwd = '/var'
    const { newCwd } = processCommand('cd', state)
    expect(newCwd).toBe('/home/user')
  })

  it('cd .. goes up one directory', () => {
    state.cwd = '/home/user/projects'
    const { newCwd } = processCommand('cd ..', state)
    expect(newCwd).toBe('/home/user')
  })

  it('cd .. from /home goes to /', () => {
    state.cwd = '/home'
    const { newCwd } = processCommand('cd ..', state)
    expect(newCwd).toBe('/')
  })

  it('cd to non-existent directory returns error', () => {
    const { output, newCwd } = processCommand('cd nonexistent', state)
    expect(output).toContain('No such file or directory')
    expect(newCwd).toBe('/home/user') // unchanged
  })

  it('cd to valid subdirectory works', () => {
    const { newCwd } = processCommand('cd projects', state)
    expect(newCwd).toBe('/home/user/projects')
  })

  // -- ls --
  it('ls lists directory contents', () => {
    const { output } = processCommand('ls', state)
    expect(output).toContain('documents')
    expect(output).toContain('projects')
  })

  it('ls -la includes hidden entries (. and ..)', () => {
    const { output } = processCommand('ls -la', state)
    expect(output).toContain('.')
    expect(output).toContain('..')
    expect(output).toContain('.config')
    expect(output).toContain('.bashrc')
  })

  it('ls on non-existent directory returns error', () => {
    const { output } = processCommand('ls /fake', state)
    expect(output).toContain('No such file or directory')
  })

  // -- cat --
  it('cat on a file returns content', () => {
    state.cwd = '/home/user/documents'
    const { output } = processCommand('cat notes.txt', state)
    expect(output).toContain('Project S Development Notes')
  })

  it('cat with absolute path returns content', () => {
    const { output } = processCommand('cat /etc/hosts', state)
    expect(output).toContain('127.0.0.1')
  })

  it('cat on a directory returns error', () => {
    const { output } = processCommand('cat /home', state)
    expect(output).toContain('Is a directory')
  })

  it('cat on missing file returns error', () => {
    const { output } = processCommand('cat nope.txt', state)
    expect(output).toContain('No such file or directory')
  })

  it('cat with no argument returns missing operand error', () => {
    const { output } = processCommand('cat', state)
    expect(output).toBe('cat: missing file operand')
  })

  // -- whoami --
  it('whoami returns root', () => {
    const { output } = processCommand('whoami', state)
    expect(output).toBe('root')
  })

  // -- hostname --
  it('hostname returns project-s-server', () => {
    const { output } = processCommand('hostname', state)
    expect(output).toBe('project-s-server')
  })

  // -- echo --
  it('echo hello world returns hello world', () => {
    const { output } = processCommand('echo hello world', state)
    expect(output).toBe('hello world')
  })

  it('echo strips quotes', () => {
    const { output } = processCommand('echo "hello"', state)
    expect(output).toBe('hello')
  })

  // -- docker --
  it('docker ps returns DOCKER_PS output', () => {
    const { output } = processCommand('docker ps', state)
    expect(output).toBe(DOCKER_PS)
  })

  it('docker images returns DOCKER_IMAGES output', () => {
    const { output } = processCommand('docker images', state)
    expect(output).toBe(DOCKER_IMAGES)
  })

  it('docker stats returns DOCKER_STATS output', () => {
    const { output } = processCommand('docker stats', state)
    expect(output).toBe(DOCKER_STATS)
  })

  it('docker with unknown subcommand returns usage', () => {
    const { output } = processCommand('docker foo', state)
    expect(output).toContain('Usage')
  })

  // -- help --
  it('help returns help text', () => {
    const { output } = processCommand('help', state)
    expect(output).toContain('Available commands')
    expect(output).toContain('ls')
    expect(output).toContain('cd')
    expect(output).toContain('pwd')
    expect(output).toContain('docker')
  })

  // -- empty command --
  it('empty command returns empty output', () => {
    const { output } = processCommand('', state)
    expect(output).toBe('')
  })

  it('whitespace-only command returns empty output', () => {
    const { output } = processCommand('   ', state)
    expect(output).toBe('')
  })

  // -- unknown command --
  it('unknown command returns command not found', () => {
    const { output } = processCommand('foobar', state)
    expect(output).toContain('command not found')
  })

  // -- additional commands --
  it('uname returns Linux', () => {
    const { output } = processCommand('uname', state)
    expect(output).toBe('Linux')
  })

  it('uname -a returns full system info', () => {
    const { output } = processCommand('uname -a', state)
    expect(output).toContain('Linux project-s-server')
    expect(output).toContain('aarch64')
  })

  it('clear returns __CLEAR__ sentinel', () => {
    const { output } = processCommand('clear', state)
    expect(output).toBe('__CLEAR__')
  })

  it('history tracks executed commands', () => {
    processCommand('pwd', state)
    processCommand('ls', state)
    const { output } = processCommand('history', state)
    expect(output).toContain('pwd')
    expect(output).toContain('ls')
  })

  it('export sets env variable', () => {
    processCommand('export FOO=bar', state)
    expect(state.env.FOO).toBe('bar')
  })

  it('env lists environment variables', () => {
    const { output } = processCommand('env', state)
    expect(output).toContain('HOME=/home/user')
    expect(output).toContain('USER=root')
  })
})

// ---------------------------------------------------------------------------
// resolveDir tests
// ---------------------------------------------------------------------------
describe('resolveDir', () => {
  it('resolves ~ to /home/user', () => {
    expect(resolveDir('/etc', '~')).toBe('/home/user')
  })

  it('resolves .. from /home/user to /home', () => {
    expect(resolveDir('/home/user', '..')).toBe('/home')
  })

  it('resolves .. from /home to /', () => {
    expect(resolveDir('/home', '..')).toBe('/')
  })

  it('resolves . to cwd', () => {
    expect(resolveDir('/var', '.')).toBe('/var')
  })

  it('resolves absolute path that exists', () => {
    expect(resolveDir('/home/user', '/etc')).toBe('/etc')
  })

  it('returns null for non-existent absolute path', () => {
    expect(resolveDir('/home/user', '/nonexistent')).toBeNull()
  })

  it('resolves relative path from cwd', () => {
    expect(resolveDir('/home/user', 'projects')).toBe('/home/user/projects')
  })

  it('returns null for non-existent relative path', () => {
    expect(resolveDir('/home/user', 'doesnotexist')).toBeNull()
  })

  it('resolves ~/ paths', () => {
    expect(resolveDir('/etc', '~/projects')).toBe('/home/user/projects')
  })

  it('returns null for non-existent ~/ path', () => {
    expect(resolveDir('/etc', '~/nope')).toBeNull()
  })
})
