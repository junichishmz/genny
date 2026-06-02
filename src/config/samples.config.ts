/**
 * Samples configuration for Genny 2.0
 * Centralized configuration for sample paths and settings
 */

export interface SamplesConfig {
  baseUrl: string
  strudelJsonPath: string
  useMinimalSamples: boolean
  fallbackToBasicSamples: boolean
  cacheSamples: boolean
  lazyLoad: boolean
}

/**
 * Get samples configuration from environment variables or defaults
 */
export function getSamplesConfig(): SamplesConfig {
  // Check for environment variables (Vite uses import.meta.env)
  const env = (import.meta as any)?.env || {}
  
  return {
    baseUrl: env.VITE_SAMPLES_BASE_URL || '/samples/',
    strudelJsonPath: env.VITE_STRUDEL_JSON_PATH || 'strudel.json',
    useMinimalSamples: env.VITE_USE_MINIMAL_SAMPLES === 'true' || false,
    fallbackToBasicSamples: env.VITE_FALLBACK_TO_BASIC_SAMPLES !== 'false',
    cacheSamples: env.VITE_CACHE_SAMPLES !== 'false',
    lazyLoad: env.VITE_LAZY_LOAD_SAMPLES !== 'false'
  }
}

/**
 * Get the full path to strudel.json
 */
export function getStrudelJsonUrl(): string {
  const config = getSamplesConfig()
  const baseUrl = config.baseUrl.endsWith('/') ? config.baseUrl : config.baseUrl + '/'
  const jsonPath = config.useMinimalSamples ? 'strudel-minimal.json' : config.strudelJsonPath
  return baseUrl + jsonPath
}

/**
 * Basic samples fallback configuration
 */
export const BASIC_SAMPLES = {
  bd: ['bd/BT0A0A7.wav'],
  sn: ['sn/ST0T0S0.wav'], 
  hh: ['hh/000_hh3closedhh.wav'],
  arp: ['arp/000_arp2.wav', 'arp/001_arp.wav'],
  bass: ['bass/000_bass1.wav', 'bass/001_bass2.wav', 'bass/002_bass3.wav', 'bass/003_bass4.wav'],
  bleep: ['bleep/boip.wav', 'bleep/checkpoint-hit.wav'],
  click: ['click/000_click0.wav', 'click/001_click1.wav', 'click/002_click2.wav', 'click/003_click3.wav'],
  crow: ['crow/000_crow.wav', 'crow/001_crow2.wav', 'crow/002_crow3.wav', 'crow/003_crow4.wav'],
  glitch: ['glitch/000_BD.wav', 'glitch/001_CB.wav', 'glitch/002_FX.wav']
}

/**
 * Minimal samples for quick loading
 */
export const MINIMAL_SAMPLES = {
  // Essential drum sounds
  bd: ['bd/BT0A0A7.wav', 'bd/BT0A0D0.wav', 'bd/BT0A0D3.wav'],
  sn: ['808sd/SD0000.WAV', '808sd/SD0010.WAV', '808sd/SD0025.WAV'],
  hh: ['808hc/HC00.WAV', '808hc/HC10.WAV', '808hc/HC25.WAV'],
  oh: ['808oh/OH00.WAV', '808oh/OH10.WAV'],
  cp: ['cp/HANDCLP0.wav'],
  
  // Basic melodic sounds
  bass: ['bass/000_bass1.wav', 'bass/001_bass2.wav'],
  arp: ['arp/000_arp2.wav', 'arp/001_arp.wav'],
  
  // Essential effects
  click: ['click/000_click0.wav'],
  bleep: ['bleep/boip.wav']
}

export default getSamplesConfig