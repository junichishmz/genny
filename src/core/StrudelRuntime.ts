import { evalScope, Pattern } from '@strudel/core'
import * as strudelCore from '@strudel/core'
import { mini } from '@strudel/mini'
import { transpiler } from '@strudel/transpiler'

// `s` is a dynamically generated control (registerControl), so it isn't declared
// in @strudel/core's type surface. Grab it at runtime.
const strudelSound = (strudelCore as any).s as (value: any) => any
import { registerSoundfonts } from '@strudel/soundfonts'
import {
  getAudioContext,
  aliasBank,
  initAudio,
  registerSynthSounds,
  samples as registerSamples,
  setLogger as setSuperdoughLogger,
  webaudioOutput,
  webaudioRepl,
} from '@strudel/webaudio'
import { GennyPattern, ModelInstance } from '../types/genny'
import modelManager from './ModelManager'
import { useGennyStore } from '../store/gennyStore'

type StrudelRepl = ReturnType<typeof webaudioRepl>

class StrudelRuntime {
  private static instance: StrudelRuntime
  private repl: StrudelRepl | null = null
  private initialized = false
  private audioReady: Promise<void> | null = null
  private currentCode = ''

  static getInstance(): StrudelRuntime {
    if (!StrudelRuntime.instance) {
      StrudelRuntime.instance = new StrudelRuntime()
    }
    return StrudelRuntime.instance
  }

  async initialize(): Promise<void> {
    if (this.initialized && this.repl) return

    const audioContext = getAudioContext()
    setSuperdoughLogger(() => undefined)
    registerSynthSounds()
    registerSoundfonts()
    await this.registerLocalSamples()
    this.installGennyPatternBridge()

    evalScope(
      import('@strudel/core'),
      import('@strudel/mini'),
      import('@strudel/webaudio'),
      import('@strudel/tonal'),
    )

    ;(globalThis as any).samples = registerSamples

    this.repl = webaudioRepl({
      audioContext,
      defaultOutput: webaudioOutput,
      getTime: () => audioContext.currentTime,
      transpiler,
      onEvalError: (error: Error) => {
        useGennyStore.getState().addLog({
          level: 'error',
          message: error.message,
        })
      },
      logger: () => undefined,
    })

    this.initialized = true
  }

  async evaluate(code: string): Promise<void> {
    await this.initialize()
    await this.prepareAudio()
    this.currentCode = code
    await this.repl?.evaluate(this.normalizeCode(code), true)
  }

  stop(): void {
    try {
      this.repl?.stop()
    } catch (error) {
      useGennyStore.getState().addLog({
        level: 'error',
        message: `Failed to stop Strudel runtime: ${error instanceof Error ? error.message : 'Unknown error'}`,
      })
    }
  }

  private normalizeCode(code: string): string {
    const normalized = code
      .split('\n')
      .filter(line => !line.trim().startsWith('// @'))
      .join('\n')
      .trim()

    return stackTopLevelPatternExpressions(normalized)
  }

  private async prepareAudio(): Promise<void> {
    if (!this.audioReady) {
      this.audioReady = (async () => {
        const audioContext = getAudioContext()
        await audioContext.resume()
        await initAudio()
      })()
    }
    await this.audioReady
  }

  private installGennyPatternBridge(): void {
    const runtime = this
    const proto = Pattern.prototype as any
    if (proto.__gennyBridgeInstalled) return

    if (typeof proto.bank === 'function' && !proto.__gennyBankWrapped) {
      const originalBank = proto.bank
      proto.bank = function(bankName: string, ...args: any[]) {
        const result = originalBank.call(this, bankName, ...args)
        copyGennyPatternMetadata(this, result)
        if (result && typeof result === 'object') {
          result.__gennyBankName = bankName
          appendGennyPlaybackMethod(result, 'bank', [bankName, ...args])
        }
        return result
      }
      proto.__gennyBankWrapped = true
    }
    wrapMetadataPreservingMethods(proto)

    proto.model = function(modelName: string) {
      modelManager.setActiveModel(modelName)
      this.__gennyModelName = modelName
      return this
    }

    proto.temperature = function(value: number) {
      this.__gennyTemperature = value
      return this
    }

    proto.gen = function() {
      const modelName = this.__gennyModelName || modelManager.getActiveModelName()
      const model = modelManager.createModelInstance(modelName)
      if (this.__gennyTemperature !== undefined) {
        model.temperature(this.__gennyTemperature)
      }
      model._throwOnGenerationError = true

      const seedPattern = strudelPatternToGennyPattern(this)
      model._outputFormat = 'mini'
      this.__gennyModel = model
      this.__gennySeedPattern = seedPattern.pattern

      // gen() drives both generation AND playback: when the model finishes it
      // swaps this pattern's query in-place to the generated rhythm (so the
      // generated sequence plays, not the seed) and writes the result back into
      // .output(...) purely for visualization. No re-eval, so no restart loop.
      startGeneratedOutputUpdate(this, runtime)

      return this
    }

    // output() is visualization-only: it shows the generated rhythm in the editor
    // but never drives playback (gen() owns playback). It is a pass-through so the
    // chained pattern stays the gen()-controlled source pattern.
    proto.output = function(..._notes: any[]) {
      return this
    }

    proto.__gennyBridgeInstalled = true
  }

  applyGeneratedOutput(sourcePattern: any, pattern: GennyPattern): void {
    const miniNotation = gennyPatternToMiniNotation(pattern)

    // 1) Playback: swap the live pattern's query to the generated rhythm in place.
    //    The scheduler holds this pattern by reference, so the next cycle plays
    //    the generated sequence — no re-eval, no restart loop, seed is gone.
    buildOutputPlaybackPattern(sourcePattern, miniNotation)

    // 2) Visualization: reflect the generated rhythm in the editor's .output(...).
    //    Editor text only — we do NOT re-evaluate (playback already updated).
    const outputText = JSON.stringify(miniNotation)
    const updatedCode = replaceFirstOutputOrGenCall(this.currentCode, outputText)
    if (updatedCode !== this.currentCode) {
      this.currentCode = updatedCode
      useGennyStore.getState().setCode(updatedCode)
    }
  }

  private async registerLocalSamples(): Promise<void> {
    const dirtBase = 'https://raw.githubusercontent.com/tidalcycles/Dirt-Samples/master/'
    const drumMachineBase = 'https://strudel.b-cdn.net/tidal-drum-machines/machines/'
    await registerSamples({
      bd: ['kick_deep.wav'],
      kick: ['kick.wav'],
      sn: ['snare.wav'],
      sd: ['snare.wav'],
      hh: ['closehat.wav'],
      oh: ['open.wav'],
      cp: ['clap.wav'],
      rim: ['rim.wav'],
      lt: ['tom.wav'],
      mt: ['tom.wav'],
      ht: ['tom.wav'],
      tom: ['tom.wav'],
    }, '/samples/genny-demo/')

    await registerSamples({
      '808_bd': ['808bd/BD0000.WAV', '808bd/BD0010.WAV', '808bd/BD0025.WAV'],
      '808_kick': ['808bd/BD0000.WAV', '808bd/BD0010.WAV', '808bd/BD0025.WAV'],
      '808_sn': ['808sd/SD0000.WAV', '808sd/SD0010.WAV', '808sd/SD0025.WAV'],
      '808_sd': ['808sd/SD0000.WAV', '808sd/SD0010.WAV', '808sd/SD0025.WAV'],
      '808_hh': ['808hc/HC00.WAV', '808hc/HC10.WAV', '808hc/HC25.WAV'],
      '808_oh': ['808oh/OH00.WAV', '808oh/OH10.WAV', '808oh/OH25.WAV'],
      '808_cp': ['808/CP.WAV'],
      '808_rim': ['808/RS.WAV'],
      '808_lt': ['808lt/LT00.WAV', '808lt/LT10.WAV', '808lt/LT25.WAV'],
      '808_mt': ['808mt/MT00.WAV', '808mt/MT10.WAV', '808mt/MT25.WAV'],
      '808_ht': ['808ht/HT00.WAV', '808ht/HT10.WAV', '808ht/HT25.WAV'],
    }, dirtBase)

    const tr909Samples = {
      bd: ['RolandTR909/rolandtr909-bd/Bassdrum-01.wav', 'RolandTR909/rolandtr909-bd/Bassdrum-02.wav', 'RolandTR909/rolandtr909-bd/Bassdrum-03.wav', 'RolandTR909/rolandtr909-bd/Bassdrum-04.wav'],
      cp: ['RolandTR909/rolandtr909-cp/Clap.wav', 'RolandTR909/rolandtr909-cp/cp01.wav', 'RolandTR909/rolandtr909-cp/cp02.wav', 'RolandTR909/rolandtr909-cp/cp03.wav', 'RolandTR909/rolandtr909-cp/cp04.wav'],
      cr: ['RolandTR909/rolandtr909-cr/Crash.wav', 'RolandTR909/rolandtr909-cr/cr01.wav', 'RolandTR909/rolandtr909-cr/cr02.wav', 'RolandTR909/rolandtr909-cr/cr03.wav', 'RolandTR909/rolandtr909-cr/cr04.wav'],
      hh: ['RolandTR909/rolandtr909-hh/hh01.wav', 'RolandTR909/rolandtr909-hh/hh02.wav', 'RolandTR909/rolandtr909-hh/hh03.wav', 'RolandTR909/rolandtr909-hh/hh04.wav'],
      ht: ['RolandTR909/rolandtr909-ht/Tom H.wav', 'RolandTR909/rolandtr909-ht/ht01.wav', 'RolandTR909/rolandtr909-ht/ht02.wav', 'RolandTR909/rolandtr909-ht/ht03.wav', 'RolandTR909/rolandtr909-ht/ht04.wav', 'RolandTR909/rolandtr909-ht/ht05.wav', 'RolandTR909/rolandtr909-ht/ht06.wav', 'RolandTR909/rolandtr909-ht/ht07.wav', 'RolandTR909/rolandtr909-ht/ht08.wav'],
      lt: ['RolandTR909/rolandtr909-lt/Tom L.wav', 'RolandTR909/rolandtr909-lt/lt01.wav', 'RolandTR909/rolandtr909-lt/lt02.wav', 'RolandTR909/rolandtr909-lt/lt03.wav', 'RolandTR909/rolandtr909-lt/lt04.wav', 'RolandTR909/rolandtr909-lt/lt05.wav', 'RolandTR909/rolandtr909-lt/lt06.wav', 'RolandTR909/rolandtr909-lt/lt07.wav', 'RolandTR909/rolandtr909-lt/lt08.wav'],
      mt: ['RolandTR909/rolandtr909-mt/Tom M.wav', 'RolandTR909/rolandtr909-mt/mt01.wav', 'RolandTR909/rolandtr909-mt/mt02.wav', 'RolandTR909/rolandtr909-mt/mt03.wav', 'RolandTR909/rolandtr909-mt/mt04.wav', 'RolandTR909/rolandtr909-mt/mt05.wav', 'RolandTR909/rolandtr909-mt/mt06.wav', 'RolandTR909/rolandtr909-mt/mt07.wav', 'RolandTR909/rolandtr909-mt/mt08.wav'],
      oh: ['RolandTR909/rolandtr909-oh/Hat Open.wav', 'RolandTR909/rolandtr909-oh/oh01.wav', 'RolandTR909/rolandtr909-oh/oh02.wav', 'RolandTR909/rolandtr909-oh/oh03.wav', 'RolandTR909/rolandtr909-oh/oh04.wav'],
      rd: ['RolandTR909/rolandtr909-rd/Ride.wav', 'RolandTR909/rolandtr909-rd/rd01.wav', 'RolandTR909/rolandtr909-rd/rd02.wav', 'RolandTR909/rolandtr909-rd/rd03.wav', 'RolandTR909/rolandtr909-rd/rd04.wav'],
      rim: ['RolandTR909/rolandtr909-rim/Rimhot.wav', 'RolandTR909/rolandtr909-rim/rs01.wav', 'RolandTR909/rolandtr909-rim/rs02.wav'],
      sd: ['RolandTR909/rolandtr909-sd/naredrum.wav', 'RolandTR909/rolandtr909-sd/sd01.wav', 'RolandTR909/rolandtr909-sd/sd02.wav', 'RolandTR909/rolandtr909-sd/sd03.wav', 'RolandTR909/rolandtr909-sd/sd04.wav', 'RolandTR909/rolandtr909-sd/sd05.wav', 'RolandTR909/rolandtr909-sd/sd06.wav', 'RolandTR909/rolandtr909-sd/sd07.wav', 'RolandTR909/rolandtr909-sd/sd08.wav', 'RolandTR909/rolandtr909-sd/sd09.wav', 'RolandTR909/rolandtr909-sd/sd10.wav', 'RolandTR909/rolandtr909-sd/sd11.wav', 'RolandTR909/rolandtr909-sd/sd12.wav', 'RolandTR909/rolandtr909-sd/sd13.wav', 'RolandTR909/rolandtr909-sd/sd14.wav', 'RolandTR909/rolandtr909-sd/sd15.wav'],
      sn: ['RolandTR909/rolandtr909-sd/naredrum.wav', 'RolandTR909/rolandtr909-sd/sd01.wav', 'RolandTR909/rolandtr909-sd/sd02.wav', 'RolandTR909/rolandtr909-sd/sd03.wav', 'RolandTR909/rolandtr909-sd/sd04.wav', 'RolandTR909/rolandtr909-sd/sd05.wav', 'RolandTR909/rolandtr909-sd/sd06.wav', 'RolandTR909/rolandtr909-sd/sd07.wav', 'RolandTR909/rolandtr909-sd/sd08.wav', 'RolandTR909/rolandtr909-sd/sd09.wav', 'RolandTR909/rolandtr909-sd/sd10.wav', 'RolandTR909/rolandtr909-sd/sd11.wav', 'RolandTR909/rolandtr909-sd/sd12.wav', 'RolandTR909/rolandtr909-sd/sd13.wav', 'RolandTR909/rolandtr909-sd/sd14.wav', 'RolandTR909/rolandtr909-sd/sd15.wav'],
    }

    await registerSamples({
      ...buildBankSampleMap('RolandTR909', tr909Samples),
      ...buildBankSampleMap('909', tr909Samples),
      ...buildBankSampleMap('tr909', tr909Samples),
    }, drumMachineBase, { tag: 'drum-machines' })

    await aliasBank({
      RolandTR808: ['808', 'tr808', 'TR808'],
      RolandTR909: ['909', 'tr909', 'TR909'],
    })
  }
}

const drumPitchMap: Record<string, number> = {
  bd: 36,
  kick: 36,
  sn: 38,
  sd: 38,
  snare: 38,
  hh: 42,
  oh: 46,
  cp: 39,
  rim: 37,
  rd: 51,
  lt: 41,
  mt: 47,
  ht: 50,
}

const buildBankSampleMap = (
  bankName: string,
  samples: Record<string, string[]>,
): Record<string, string[]> =>
  Object.fromEntries(
    Object.entries(samples).map(([soundName, files]) => [`${bankName}_${soundName}`, files]),
  )

const buildOutputPlaybackPattern = (sourcePattern: any, outputPattern: string): any => {
  // Build a real Strudel pattern from the output mini-notation. Note: the
  // transpiler normally wraps string literals in mini(), so we must do that
  // ourselves here since this runs outside the transpile step. Using the global
  // genny s() instead would yield a SoundPattern with no .query and the seed
  // would keep playing.
  let replacement: any
  try {
    replacement = strudelSound(mini(outputPattern))
  } catch (error) {
    useGennyStore.getState().addLog({
      level: 'error',
      message: `output parse failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    })
    return sourcePattern
  }

  replacement = applyStoredPlaybackMethods(replacement, sourcePattern)

  useGennyStore.getState().addLog({
    level: 'info',
    message: `generated: ${outputPattern}`
  })

  replacePatternRuntime(sourcePattern, replacement)
  return sourcePattern
}

const replacePatternRuntime = (targetPattern: any, replacementPattern: any): void => {
  if (!targetPattern || !replacementPattern) return
  if (typeof replacementPattern.query === 'function') {
    targetPattern.query = replacementPattern.query
  }
  if (replacementPattern._steps !== undefined) {
    targetPattern._steps = replacementPattern._steps
  }
}

const applyStoredPlaybackMethods = (pattern: any, sourcePattern: any): any => {
  const methods = Array.isArray(sourcePattern.__gennyPlaybackMethods)
    ? sourcePattern.__gennyPlaybackMethods
    : []

  return methods.reduce((currentPattern: any, method: { methodName: string; args: any[] }) => {
    if (typeof currentPattern?.[method.methodName] !== 'function') {
      return currentPattern
    }
    const nextPattern = currentPattern[method.methodName](...method.args)
    return nextPattern ?? currentPattern
  }, pattern)
}

const startGeneratedOutputUpdate = (sourcePattern: any, runtime: StrudelRuntime): void => {
  const model = sourcePattern.__gennyModel as ModelInstance | undefined
  if (!model) return
  if (model._generationPending) return

  model._suppressOutputSideEffects = true
  model._onGenerated = (generated: GennyPattern) => {
    runtime.applyGeneratedOutput(sourcePattern, generated)
  }
  model.gen(sourcePattern.__gennySeedPattern ?? strudelPatternToGennyPattern(sourcePattern).pattern)
}

const metadataPreservingMethodNames = [
  'gain',
  'pan',
  'room',
  'delay',
  'speed',
  'fast',
  'slow',
  'rev',
  'jux',
  'every',
  'sometimes',
  'rarely',
  'often',
  'struct',
  'mask',
  'euclid',
  'euclidRot',
  'degrade',
  'degradeBy',
  'ply',
  'chunk',
  'loopAt',
  'hurry',
  'late',
  'early',
  'legato',
  'scale',
  'dict',
  'offset',
  'voicing',
  'voicings',
  'mode',
  'anchor',
  'segment',
  'clip',
  'size',
  'attack',
  'release',
  'dec',
  'cutoff',
  'resonance',
  'lpf',
  'hpf',
  'orbit',
  'vowel',
  'shape',
  'phaser',
  'fm',
  'lpq',
]

const wrapMetadataPreservingMethods = (proto: any): void => {
  if (proto.__gennyMetadataMethodsWrapped) return

  metadataPreservingMethodNames.forEach(methodName => {
    if (typeof proto[methodName] !== 'function') return

    const originalMethod = proto[methodName]
    proto[methodName] = function(...args: any[]) {
      const result = originalMethod.apply(this, args)
      copyGennyPatternMetadata(this, result)
      appendGennyPlaybackMethod(result, methodName, args)
      return result
    }
  })

  proto.__gennyMetadataMethodsWrapped = true
}

const copyGennyPatternMetadata = (source: any, target: any): void => {
  if (!target || typeof target !== 'object') return

  const metadataKeys = [
    '__gennyModelName',
    '__gennyTemperature',
    '__gennyModel',
    '__gennySeedPattern',
    '__gennyBankName',
    '__gennyPlaybackMethods',
  ]

  metadataKeys.forEach(key => {
    if (source?.[key] !== undefined) {
      target[key] = source[key]
    }
  })
}

const appendGennyPlaybackMethod = (target: any, methodName: string, args: any[]): void => {
  if (!target || typeof target !== 'object') return

  const previousMethods = Array.isArray(target.__gennyPlaybackMethods)
    ? target.__gennyPlaybackMethods
    : []
  target.__gennyPlaybackMethods = [...previousMethods, { methodName, args }]
}

const extractPlaybackControls = (pattern: any): Record<string, any> => {
  try {
    const hap = pattern
      .queryArc(0, 1)
      .find((candidate: any) => typeof candidate.hasOnset === 'function' ? candidate.hasOnset() : true)
    const value = hap?.value
    if (!value || typeof value !== 'object') return {}

    const excluded = new Set(['s', 'sound', 'n', 'note', 'freq', 'value'])
    return Object.fromEntries(
      Object.entries(value).filter(([key]) => !excluded.has(key)),
    )
  } catch {
    return {}
  }
}

const replaceFirstOutputOrGenCall = (code: string, outputText: string): string => {
  let searchIndex = 0

  while (searchIndex < code.length) {
    const outputIndex = code.indexOf('.output', searchIndex)
    if (outputIndex < 0) return code

    const openParenIndex = code.indexOf('(', outputIndex)
    if (openParenIndex < 0) return code

    const closeParenIndex = findMatchingParenInText(code, openParenIndex)
    if (closeParenIndex < 0) return code

    return `${code.slice(0, openParenIndex + 1)}${outputText}${code.slice(closeParenIndex)}`
  }

  searchIndex = 0
  while (searchIndex < code.length) {
    const genIndex = code.indexOf('.gen', searchIndex)
    if (genIndex < 0) return code

    const openParenIndex = code.indexOf('(', genIndex)
    if (openParenIndex < 0) return code

    const closeParenIndex = findMatchingParenInText(code, openParenIndex)
    if (closeParenIndex < 0) return code

    return `${code.slice(0, closeParenIndex + 1)}.output(${outputText})${code.slice(closeParenIndex + 1)}`
  }

  return code
}

const gennyPatternToMiniNotation = (pattern: GennyPattern): string => {
  if (pattern.length === 0) return '~'

  const maxStep = pattern.reduce((max, [timeCode]) => Math.max(max, timeCodeToStep(timeCode)), 0)
  const stepCount = Math.max(16, Math.ceil((maxStep + 1) / 16) * 16)
  const steps: string[][] = Array.from({ length: stepCount }, () => [])

  pattern.forEach(([timeCode, pitch]) => {
    const step = timeCodeToStep(timeCode)
    if (step >= 0 && step < steps.length) {
      steps[step].push(midiToDrumSound(pitch))
    }
  })

  const tokens = steps.map(sounds => {
    if (sounds.length === 0) return '~'
    const uniqueSounds = Array.from(new Set(sounds))
    return uniqueSounds.length === 1 ? uniqueSounds[0] : `[${uniqueSounds.join(' ')}]`
  })

  return compactRestRuns(tokens).join(' ')
}

const timeCodeToStep = (timeCode: string): number => {
  const [bar = 0, beat = 0, tickOrSubdivision = 0] = timeCode.split(':').map(part => Number(part) || 0)
  const subdivision = tickOrSubdivision >= 4 ? Math.floor(tickOrSubdivision / 120) : tickOrSubdivision
  return Math.max(0, bar * 16 + beat * 4 + subdivision)
}

const midiToDrumSound = (pitch: number): string => {
  const rounded = Math.round(pitch)
  const midiMap: Record<number, string> = {
    36: 'bd',
    35: 'bd',
    38: 'sd',
    40: 'sd',
    42: 'hh',
    44: 'hh',
    46: 'oh',
    39: 'cp',
    37: 'rim',
    41: 'lt',
    43: 'lt',
    45: 'mt',
    47: 'mt',
    48: 'ht',
    50: 'ht',
    49: 'cr',
    51: 'rd',
    56: 'cb',
  }
  if (midiMap[rounded]) return midiMap[rounded]

  const closest = Object.keys(midiMap)
    .map(Number)
    .reduce((best, current) => (
      Math.abs(current - rounded) < Math.abs(best - rounded) ? current : best
    ), 36)

  return midiMap[closest]
}

const compactRestRuns = (tokens: string[]): string[] => {
  const compacted: string[] = []

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]
    if (token !== '~') {
      compacted.push(token)
      continue
    }

    let length = 1
    while (tokens[i + length] === '~') {
      length += 1
    }

    compacted.push(length === 1 ? '~' : `~@${length}`)
    i += length - 1
  }

  return compacted
}

const stackTopLevelPatternExpressions = (code: string): string => {
  if (!code || hasStrudelPatternLabels(code)) return code

  const statements = splitTopLevelStatements(code)
  const patternStatements = statements.filter(isTopLevelPatternExpression)
  if (patternStatements.length <= 1) return code

  const setupStatements = statements.filter(statement => !isTopLevelPatternExpression(statement))
  const stackedPatterns = `stack(\n${patternStatements
    .map(statement => `  ${stripLeadingComments(trimStatementTerminator(statement))}`)
    .join(',\n')}\n)`

  return [...setupStatements, stackedPatterns].join('\n\n')
}

const hasStrudelPatternLabels = (code: string): boolean =>
  /(^|\n)\s*p\d+\s*:/.test(code)

const splitTopLevelStatements = (code: string): string[] => {
  const statements: string[] = []
  let current = ''
  let parenDepth = 0
  let bracketDepth = 0
  let braceDepth = 0
  let quote: '"' | "'" | '`' | null = null
  let inLineComment = false
  let inBlockComment = false

  for (let index = 0; index < code.length; index++) {
    const char = code[index]
    const nextChar = code[index + 1] ?? ''
    const previousChar = index > 0 ? code[index - 1] : ''
    current += char

    if (inLineComment) {
      if (char === '\n') {
        inLineComment = false
        if (isAtTopLevel(parenDepth, bracketDepth, braceDepth) && !nextStatementContinuesChain(code, index + 1)) {
          pushCurrentStatement()
        }
      }
      continue
    }

    if (inBlockComment) {
      if (char === '*' && nextChar === '/') {
        current += nextChar
        index += 1
        inBlockComment = false
      }
      continue
    }

    if (quote) {
      if (char === quote && previousChar !== '\\') {
        quote = null
      }
      continue
    }

    if (char === '/' && nextChar === '/') {
      current += nextChar
      index += 1
      inLineComment = true
      continue
    }

    if (char === '/' && nextChar === '*') {
      current += nextChar
      index += 1
      inBlockComment = true
      continue
    }

    if (char === '"' || char === "'" || char === '`') {
      quote = char
      continue
    }

    if (char === '(') parenDepth += 1
    if (char === ')') parenDepth -= 1
    if (char === '[') bracketDepth += 1
    if (char === ']') bracketDepth -= 1
    if (char === '{') braceDepth += 1
    if (char === '}') braceDepth -= 1

    if (
      isAtTopLevel(parenDepth, bracketDepth, braceDepth) &&
      (char === ';' || (char === '\n' && !nextStatementContinuesChain(code, index + 1)))
    ) {
      pushCurrentStatement()
    }
  }

  pushCurrentStatement()
  return statements

  function pushCurrentStatement(): void {
    const statement = current.trim()
    if (statement && !isCommentOnlyStatement(statement)) {
      statements.push(statement)
    }
    current = ''
  }
}

const isTopLevelPatternExpression = (statement: string): boolean => {
  const trimmed = stripLeadingComments(trimStatementTerminator(statement))
  if (/^(const|let|var|function|class|import|export|if|for|while|switch|try|return)\b/.test(trimmed)) {
    return false
  }

  return /^(stack|s|sound|n|note|chord)\s*\(/.test(trimmed)
}

const trimStatementTerminator = (statement: string): string =>
  statement.trim().replace(/;+\s*$/, '')

const stripLeadingComments = (statement: string): string =>
  statement
    .replace(/^\s*(?:\/\/[^\n]*\n\s*|\/\*[\s\S]*?\*\/\s*)+/, '')
    .trim()

const isAtTopLevel = (parenDepth: number, bracketDepth: number, braceDepth: number): boolean =>
  parenDepth === 0 && bracketDepth === 0 && braceDepth === 0

const nextStatementContinuesChain = (code: string, startIndex: number): boolean => {
  const rest = code.slice(startIndex)
  const match = rest.match(/^\s*(?:\/\/[^\n]*\n\s*|\/\*[\s\S]*?\*\/\s*)*(.)/)
  return match?.[1] === '.'
}

const isCommentOnlyStatement = (statement: string): boolean => {
  const withoutComments = statement
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter(line => !line.trim().startsWith('//'))
    .join('\n')
    .trim()

  return !withoutComments
}

const findMatchingParenInText = (text: string, openParenIndex: number): number => {
  let depth = 0
  let inString = false
  let stringChar = ''

  for (let i = openParenIndex; i < text.length; i++) {
    const char = text[i]
    const prevChar = i > 0 ? text[i - 1] : ''

    if ((char === '"' || char === "'" || char === '`') && prevChar !== '\\') {
      if (!inString) {
        inString = true
        stringChar = char
      } else if (char === stringChar) {
        inString = false
        stringChar = ''
      }
    }

    if (inString) continue

    if (char === '(') {
      depth += 1
    } else if (char === ')') {
      depth -= 1
      if (depth === 0) return i
    }
  }

  return -1
}

const strudelPatternToGennyPattern = (pattern: any): { pattern: GennyPattern; outputFormat: 'genny' | 'mini' } => {
  const haps = pattern
    .queryArc(0, 1)
    .filter((hap: any) => typeof hap.hasOnset === 'function' ? hap.hasOnset() : true)

  const result: GennyPattern = []
  let hasDrumSound = false

  haps.forEach((hap: any) => {
    const value = hap.value ?? {}
    const begin = Number(hap.whole?.begin?.valueOf?.() ?? hap.part?.begin?.valueOf?.() ?? 0)
    const timeCode = cyclePositionToTimeCode(begin)
    const rawSound = normalizeDrumSoundName(String(value.s ?? value.sound ?? '').split(':')[0])
    const rawNote = value.note ?? value.n ?? value.value
    const pitch = soundOrNoteToMidi(rawSound, rawNote)

    if (rawSound && drumPitchMap[rawSound] !== undefined) {
      hasDrumSound = true
    }
    if (pitch !== null) {
      const velocity = Number(value.velocity ?? value.gain ?? 1)
      result.push([timeCode, pitch, velocity <= 1 ? Math.max(1, Math.round(velocity * 127)) : 127])
    }
  })

  return {
    pattern: result.length > 0 ? result : [['0:0:0', 36, 100], ['0:2:0', 38, 100]],
    outputFormat: hasDrumSound ? 'mini' : 'genny',
  }
}

const normalizeDrumSoundName = (sound: string): string => {
  const normalized = sound.trim()
  if (drumPitchMap[normalized] !== undefined) return normalized

  const bankPrefixedMatch = normalized.match(/^(?:808|tr808|909|tr909|RolandTR808|RolandTR909)_(.+)$/i)
  if (bankPrefixedMatch) {
    const unbankedSound = bankPrefixedMatch[1].toLowerCase()
    if (drumPitchMap[unbankedSound] !== undefined) return unbankedSound
  }

  return normalized
}

const soundOrNoteToMidi = (sound: string, note: unknown): number | null => {
  if (sound && drumPitchMap[sound] !== undefined) {
    return drumPitchMap[sound]
  }
  if (typeof note === 'number' && Number.isFinite(note)) {
    return Math.max(0, Math.min(127, Math.round(note)))
  }
  if (typeof note === 'string') {
    const parsed = noteNameToMidi(note)
    if (parsed !== null) return parsed
  }
  return sound ? 60 : null
}

const noteNameToMidi = (noteName: string): number | null => {
  const match = noteName.trim().match(/^([a-gA-G])([#bsf]?)(-?\d+)?$/)
  if (!match) return null
  const [, base, accidental, octaveText] = match
  const offsets: Record<string, number> = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 }
  const accidentalOffset = accidental === '#' || accidental === 's'
    ? 1
    : accidental === 'b' || accidental === 'f'
      ? -1
      : 0
  const octave = octaveText === undefined ? 4 : Number(octaveText)
  return Math.max(0, Math.min(127, (octave + 1) * 12 + offsets[base.toLowerCase()] + accidentalOffset))
}

const cyclePositionToTimeCode = (cyclePosition: number): string => {
  const totalTicks = Math.max(0, Math.floor(cyclePosition * 1920))
  const bars = Math.floor(totalTicks / 1920)
  const remainingTicks = totalTicks % 1920
  const beats = Math.floor(remainingTicks / 480)
  const ticks = remainingTicks % 480
  return `${bars}:${beats}:${ticks}`
}

const strudelRuntime = StrudelRuntime.getInstance()
export default strudelRuntime
