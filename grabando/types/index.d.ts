export type Grabando = { isOn: boolean }

declare module 'claude-code' {
  interface PluginState {
    'grabando': { isOn: boolean }
  }
}
