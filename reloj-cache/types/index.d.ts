export type Lectura = {
  // When the last answer ended, in $.clock.now() milliseconds.
  at: number
  // Input tokens of that answer: what the cache now holds.
  tokens: number
  isWarned: boolean
}

declare module 'claude-code' {
  interface PluginState {
    'reloj-cache': { ultima: Lectura | null; ahora: number }
  }
}
