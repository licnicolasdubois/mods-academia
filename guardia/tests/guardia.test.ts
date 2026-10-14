import { describe, expect, test } from 'claude-code/testing'

// Beneath the plugin, the test answers every call it lets through.
const PASA = { result: {} as never, text: 'pasó' }

// A refusal reaches the test as `deny` (a call made by a plugin) or as an errored result (a session's).
const frenado = (r: { deny?: string; isError?: true; text?: string }) => r.deny ?? (r.isError ? r.text : undefined)

describe('guardia', () => {
  test('frena leer, editar o escribir un .env', async ($, on) => {
    on('tool.call', () => PASA)
    for (const file_path of ['/demo/.env', '/demo/.env.local', 'config/.env.production']) {
      const r = await $.tool.call({ tool: 'Read', file_path })
      expect(frenado(r)).toContain('guardia')
    }
    const w = await $.tool.call({ tool: 'Write', file_path: '/demo/.env', content: 'X=1' })
    expect(frenado(w)).toContain('guardia')
  })

  test('deja pasar .env.example y archivos comunes', async ($, on) => {
    on('tool.call', () => PASA)
    for (const file_path of ['/demo/.env.example', '/demo/.envrc', '/demo/README.md']) {
      const r = await $.tool.call({ tool: 'Read', file_path })
      expect(r.text).toBe('pasó')
    }
  })

  test('frena rm -rf en todas sus formas', async ($, on) => {
    on('tool.call', () => PASA)
    for (const command of ['rm -rf pruebas', 'rm -fr pruebas', 'rm -r -f pruebas', 'rm -Rf /tmp/x', 'rm --recursive --force x']) {
      const r = await $.tool.call({ tool: 'Bash', command })
      expect(frenado(r)).toContain('guardia')
    }
  })

  test('deja pasar rm de un archivo y comandos comunes', async ($, on) => {
    on('tool.call', () => PASA)
    for (const command of ['rm archivo.txt', 'rm -f archivo.txt', 'ls -la', 'grep -rf patrones.txt .']) {
      const r = await $.tool.call({ tool: 'Bash', command })
      expect(r.text).toBe('pasó')
    }
  })

  test('frena comandos que tocan un .env', async ($, on) => {
    on('tool.call', () => PASA)
    for (const command of ['cat .env', 'source .env && npm start', 'cp config/.env.local /tmp']) {
      const r = await $.tool.call({ tool: 'Bash', command })
      expect(frenado(r)).toContain('guardia')
    }
    const ok = await $.tool.call({ tool: 'Bash', command: 'cp .env.example .env.example.bak' })
    expect(ok.text).toBe('pasó')
  })
})
