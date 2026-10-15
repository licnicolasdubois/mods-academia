import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

const isOn = atom({ plugin: 'grabando', key: 'isOn' } as const, false)

// Without this note the model reads "recording mode on" and starts withholding the data itself,
// so nothing gets masked on screen and the answer leaves out what the person asked for.
const NOTA_AL_MODELO =
  'Recording mode only masks what the screen shows; you still read the real values. ' +
  'Answer as usual and write emails, phone numbers and amounts in full: the screen hides them.'

const MAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g
const MONTO = /(?:US\$|U\$S|USD|UYU|\$U|ARS|EUR|€|\$)\s?\d+(?:[.,]\d+)*|\b\d+(?:[.,]\d+)*\s?(?:USD|dólares|pesos|euros)\b/gi
// 9 to 13 digits with optional + and separators; a date (2026-10-14, 14/10/2026) is left alone.
const TELEFONO = /(?<![\w./-])(?!\d{4}-\d{2}-\d{2})(?:\+\d{1,3}[\s-]?)?(?:\d[\s-]?){8,12}\d(?![\w/-])/g

// What the screen shows; the model keeps reading the real text.
function tapar(text: string): string {
  return text
    .replace(MAIL, '[mail oculto]')
    .replace(MONTO, '[monto oculto]')
    .replace(TELEFONO, '[teléfono oculto]')
}

// A tool's output keeps its shape: only its texts change.
function taparTodo(value: unknown): unknown {
  if (typeof value === 'string') return tapar(value)
  if (Array.isArray(value)) return value.map(taparTodo)
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, taparTodo(v)]))
  }
  return value
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'grabando',
      description: 'Prende o apaga el modo grabación: tapa en pantalla mails, teléfonos y montos',
      argumentHint: '[on|off]',
    })
    // It remembers across sessions: the worst case is starting to record with it off.
    const stored = (await $.store.get('isOn')) === true
    await update($, isOn, () => stored)
    $.ui.status(stored ? 'modo grabación prendido' : undefined)
    return next(e)
  })

  on('command.run', { command: 'grabando' }, async ($, e) => {
    const arg = (e.args ?? '').trim().toLowerCase()
    const now = arg === 'on' ? true : arg === 'off' ? false : !(await read($, isOn))
    await update($, isOn, () => now)
    await $.store.set('isOn', now)
    $.ui.status(now ? 'modo grabación prendido' : undefined)
    return now
      ? { text: 'Modo grabación prendido: en pantalla se tapan mails, teléfonos y montos.', context: [NOTA_AL_MODELO] }
      : { text: 'Modo grabación apagado.' }
  })

  on('ui.render', { component: 'AssistantMessage' }, async ($, e, next) =>
    (await read($, isOn)) ? next({ ...e, props: { ...e.props, text: tapar(e.props.text) } }) : next(e),
  )

  on('ui.render', { component: 'UserMessage' }, async ($, e, next) =>
    (await read($, isOn)) ? next({ ...e, props: { ...e.props, text: tapar(e.props.text) } }) : next(e),
  )

  on('ui.render', { component: 'ToolResult' }, async ($, e, next) =>
    (await read($, isOn)) && !e.props.isErrored
      ? next({ ...e, props: { ...e.props, output: taparTodo(e.props.output) } })
      : next(e),
  )
}
