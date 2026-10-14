import { describe, expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'

const NADA = { type: 'Box', props: {}, children: [] } as never
const TEXTO = 'Tu mail es nico@example.com, tu celular +598 99 000 000 y el total US$ 1.250. Hoy es 2026-10-14.'

// Beneath the plugin: records what each site was handed to draw.
function base(on: On, visto: { text?: string; output?: unknown }) {
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('command.register', () => ({ value: undefined }) as never)
  on('ui.status', () => ({ value: undefined }))
  on('ui.render', (_$, e) => {
    const props = e.props as { text?: string; output?: unknown }
    visto.text = props.text
    visto.output = props.output
    return NADA
  })
}

const MENSAJE = { component: 'AssistantMessage', props: { text: TEXTO, isFirstOfReply: true } } as const
const START = { cwd: '/demo', surface: 'terminal', isInteractive: true } as const
const COMANDO = { command: 'grabando', origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 100 } } as const

describe('grabando', () => {
  test('apagado no toca nada', async ($, on) => {
    const visto: { text?: string } = {}
    mock.store(on)
    base(on, visto)
    await $.session.start(START)
    await $.ui.mount({ plugin: 'grabando', surface: 'terminal', ...MENSAJE })
    expect(visto.text).toBe(TEXTO)
  })

  test('/grabando tapa mails, teléfonos y montos, y deja la fecha', async ($, on) => {
    const visto: { text?: string } = {}
    mock.store(on)
    base(on, visto)
    await $.session.start(START)
    const r = await $.command.run({ ...COMANDO, args: '' })
    expect(r.text).toContain('prendido')
    for (const surface of ['terminal', 'desktop'] as const) {
      await $.ui.mount({ plugin: 'grabando', surface, ...MENSAJE })
      expect(visto.text).toBe('Tu mail es [mail oculto], tu celular [teléfono oculto] y el total [monto oculto]. Hoy es 2026-10-14.')
    }
    await $.command.run({ ...COMANDO, args: 'off' })
    await $.ui.mount({ plugin: 'grabando', surface: 'terminal', ...MENSAJE })
    expect(visto.text).toBe(TEXTO)
  })

  test('se acuerda de una sesión a otra', async ($, on) => {
    const visto: { text?: string } = {}
    mock.store(on, { isOn: true })
    base(on, visto)
    await $.session.start(START)
    await $.ui.mount({ plugin: 'grabando', surface: 'terminal', ...MENSAJE })
    expect(visto.text).toContain('[mail oculto]')
  })

  test('tapa lo que devuelve una herramienta sin cambiarle la forma', async ($, on) => {
    const visto: { output?: unknown } = {}
    mock.store(on, { isOn: true })
    base(on, visto)
    await $.session.start(START)
    await $.ui.mount({
      plugin: 'grabando',
      surface: 'terminal',
      component: 'ToolResult',
      props: { tool_use_id: 't1', tool: 'Bash', isErrored: false, output: { stdout: 'user.email=nico@example.com', stderr: '', interrupted: false } },
    })
    expect(visto.output).toEqual({ stdout: 'user.email=[mail oculto]', stderr: '', interrupted: false })
  })
})
