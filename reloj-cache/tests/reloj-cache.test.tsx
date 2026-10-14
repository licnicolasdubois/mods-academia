import { describe, expect, mock, test } from 'claude-code/testing'

const BANDA = {
  plugin: 'reloj-cache',
  component: 'AbovePrompt',
  props: { hasSurvey: false, isWorking: false, maxRows: 3, bodyColumns: 100, scroll: { offset: 0, bodyRows: 3 }, view: {} },
} as const

const USO = { startedAt: 0, context: { tokens: 118_000, window: 200_000, percent: 59 }, rateLimits: [] }
// What answers each event beneath the plugin: the engine's place in a test.
const NADA = { type: 'Box', props: {}, children: [] } as never
function base(on: import('claude-code').On) {
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('session.usage', () => ({ value: USO }))
  on('turn.complete', () => ({ text: 'listo' }))
  on('ui.render', () => NADA)
}

const TURNO = { answer: 'listo', durationMs: 1000, isAborted: false, turnId: 't1', reason: 'answer' } as const

describe('reloj-cache', () => {
  test('muestra los minutos y los tokens después de una respuesta, y avisa a los 5 min', async ($, on) => {
    const clock = mock.clock(on)
    const toasts: string[] = []
    base(on)
    on('ui.toast', (_$, e) => { toasts.push(e.text); return { value: undefined } })

    await $.session.start({ cwd: '/demo', surface: 'terminal', isInteractive: true })
    await $.turn.complete(TURNO)

    for (const surface of ['terminal', 'desktop'] as const) {
      const ui = await $.ui.mount({ ...BANDA, surface })
      expect((await ui.find({ type: 'Text' }))?.text).toContain('quedan 60 min · 118 mil tokens')
      await ui.unmount()
    }

    await clock.advance(56 * 60_000)
    const ui = await $.ui.mount({ ...BANDA, surface: 'terminal' })
    expect((await ui.find({ type: 'Text' }))?.text).toContain('quedan 4 min')
    expect(toasts.length).toBe(1)
    expect(toasts[0]).toContain('vence en')

    await clock.advance(5 * 60_000)
    const vencida = await $.ui.mount({ ...BANDA, surface: 'terminal' })
    expect((await vencida.find({ type: 'Text' }))?.text).toContain('Caché vencida')
    expect(toasts.length).toBe(1)
  })

  test('no dibuja nada antes de la primera respuesta', async ($, on) => {
    mock.clock(on)
    base(on)
    const ui = await $.ui.mount({ ...BANDA, surface: 'terminal' })
    expect(await ui.find({ type: 'Text', text: /Caché/ })).toBeUndefined()
  })

  test('respeta la duración configurada', { options: { minutos: 5, aviso: 1 } }, async ($, on) => {
    mock.clock(on)
    base(on)
    await $.turn.complete(TURNO)
    const ui = await $.ui.mount({ ...BANDA, surface: 'terminal' })
    expect((await ui.find({ type: 'Text' }))?.text).toContain('quedan 5 min')
  })

  test('sigue contando después de una recarga (sin session.start)', async ($, on) => {
    const clock = mock.clock(on)
    base(on)
    on('ui.toast', () => ({ value: undefined }))
    await $.turn.complete(TURNO)
    const ui = await $.ui.mount({ ...BANDA, surface: 'terminal' })
    expect((await ui.find({ type: 'Text' }))?.text).toContain('quedan 60 min')
    await clock.advance(3 * 60_000)
    expect((await ui.find({ type: 'Text' }))?.text).toContain('quedan 57 min')
  })

  test('el botón Compactar compacta y esconde la banda hasta la próxima respuesta', async ($, on) => {
    const clock = mock.clock(on)
    base(on)
    let pedidos = 0
    on('session.compact', () => {
      pedidos += 1
      return { messages: [{ role: 'user', text: 'Resumen de la conversación', toolUses: [] }], tokensBefore: 465_000, tokensAfter: 30_000 }
    })
    on('ui.toast', () => ({ value: undefined }))
    await $.turn.complete(TURNO)
    for (const surface of ['terminal', 'desktop'] as const) {
      const ui = await $.ui.mount({ ...BANDA, surface })
      expect(await ui.find({ key: 'compactar' })).toBeDefined()
      await ui.unmount()
    }
    const ui = await $.ui.mount({ ...BANDA, surface: 'desktop' })
    await ui.press({ key: 'compactar' })
    await clock.advance(1)
    expect(pedidos).toBe(1)
    const despues = await $.ui.mount({ ...BANDA, surface: 'desktop' })
    expect(await despues.find({ type: 'Text', text: /Caché/ })).toBeUndefined()
  })
})
