declare module '@strudel/core' {
  export const evalScope: (...modules: any[]) => any
  export const Pattern: any
}

declare module '@strudel/transpiler' {
  export const transpiler: (code: string, options?: Record<string, any>) => {
    output: string
    miniLocations?: any[]
    widgets?: any[]
  }
}

declare module '@strudel/webaudio' {
  export const getAudioContext: () => AudioContext
  export const aliasBank: (...args: any[]) => Promise<void>
  export const initAudio: (options?: Record<string, any>) => Promise<void>
  export const samples: (source: string | Record<string, string[]>, baseUrl?: string, options?: Record<string, any>) => Promise<void>
  export const webaudioOutput: (...args: any[]) => any
  export const webaudioRepl: (options?: Record<string, any>) => {
    evaluate: (code: string, autostart?: boolean) => Promise<any>
    stop: () => void
    hush?: () => void
    start?: () => void
    state?: any
  }
  export const registerSynthSounds: () => void
  export const setLogger: (logger: (...args: any[]) => void) => void
}

declare module '@strudel/mini'
declare module '@strudel/soundfonts' {
  export const registerSoundfonts: () => void
  export const setSoundfontUrl: (url: string) => void
}
declare module '@strudel/tonal'
