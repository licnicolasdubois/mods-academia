import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, Timer } from 'claude-code'

import type { Lectura } from '../types'

const ultima = atom({ plugin: 'reloj-cache', key: 'ultima' } as const, null)
// Rewritten on every tick so the band redraws on its own.
const ahora = atom({ plugin: 'reloj-cache', key: 'ahora' } as const, 0)

const TICK_MS = 30_000
// A hot reload (an option changed in /config, a saved file) drops the timers. Every event checks
// the clock is running, so the band never depends on one event to restart it. The variable resets
// with the timers.
let tictac: Timer | null = null

const miles = (tokens: number) =>
  tokens >= 1000 ? `${Math.round(tokens / 1000)} mil` : String(tokens)

// Moves the band's clock and raises the warning once, when the cache is about to lapse.
async function tick($: EngineInterface, ttlMs: number, avisoMs: number) {
  const now = await $.clock.now()
  await update($, ahora, () => now)
  const last = await read($, ultima)
  if (last === null || last.isWarned) return
  const left = ttlMs - (now - last.at)
  if (left > 0 && left <= avisoMs) {
    $.ui.toast(`La caché vence en ${Math.ceil(left / 60_000)} min. Mandá lo que tenías pendiente o compactá.`)
    await update($, ultima, l => (l === null ? l : { ...l, isWarned: true }))
  }
}

function asegurarTictac($: EngineInterface, ttlMs: number, avisoMs: number) {
  if (tictac === null) tictac = $.clock.every(TICK_MS, () => void tick($, ttlMs, avisoMs))
}

// The band's button: the same compaction /compact runs. The band is hidden while a turn runs,
// so it is never pressed mid-turn (when the engine would refuse it). The press only schedules it:
// a compaction outlasts the press's 10 s budget, and work that outlives a dispatch goes on $.clock.
async function compactar($: EngineInterface) {
  $.ui.toast('Compactando la conversación…')
  try {
    const r = await $.session.compact({})
    if (r.skip !== undefined) {
      $.ui.toast(`No se compactó: ${r.skip}`)
      return
    }
    // Until the next answer there is no reading of the new, smaller context.
    await update($, ultima, () => null)
    const antes = r.tokensBefore === undefined ? '' : ` (${miles(r.tokensBefore)} → ${miles(r.tokensAfter ?? 0)} tokens)`
    $.ui.toast(`Conversación compactada${antes}.`)
  } catch {
    $.ui.toast('No se pudo compactar ahora. Probá con /compact.')
  }
}

export const register: Register = (on, options) => {
  const ttlMs = Number(options.minutos ?? 60) * 60_000
  const avisoMs = Number(options.aviso ?? 5) * 60_000

  on('session.start', async ($, e, next) => {
    asegurarTictac($, ttlMs, avisoMs)
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    asegurarTictac($, ttlMs, avisoMs)
    const done = await next(e)
    // A subagent's turn does not touch the main conversation's cache.
    if (e.agentId !== undefined || e.reason === 'error') return done
    const { context } = await $.session.usage()
    const lectura: Lectura = { at: await $.clock.now(), tokens: context.tokens ?? 0, isWarned: false }
    await update($, ultima, () => lectura)
    await update($, ahora, () => lectura.at)
    return done
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    asegurarTictac($, ttlMs, avisoMs)
    const last = await read($, ultima)
    if (e.props.hasSurvey || e.props.isWorking || last === null) return next(e)

    const now = Math.max(await read($, ahora), last.at)
    const left = ttlMs - (now - last.at)
    const { Box, Button, Text } = $.ui.resolve(e)

    if (left <= 0) {
      return (
        <Box key="reloj">
          <Text color="red">Caché vencida: el próximo mensaje vuelve a procesar {miles(last.tokens)} tokens.</Text>
        </Box>
      )
    }
    return (
      <Box key="reloj" flexDirection="row" justifyContent="space-between">
        <Text color={left <= avisoMs ? 'yellow' : undefined} dimColor={left > avisoMs}>
          Caché: quedan {Math.ceil(left / 60_000)} min · {miles(last.tokens)} tokens
        </Text>
        <Button key="compactar" label="Compactar" variant={left <= avisoMs ? 'primary' : 'secondary'} onPress={() => void $.clock.after(0, () => void compactar($))} />
      </Box>
    )
  })
}
