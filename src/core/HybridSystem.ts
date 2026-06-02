/**
 * Genny2.0 Hybrid System (TypeScript + Zustand)
 * Global functions setup for genny-strudel integration
 */

import {
  GennyPattern,
  ModelInstance,
  PatternContainer,
  StrudelNoteBuilder,
  StrudelSoundBuilder
} from '../types/genny'
import { useGennyStore } from '../store/gennyStore'
import modelManager from './ModelManager'
import strudelAudioEngine from './StrudelAudioEngine'
import { StrudelPattern, createNote, stack } from './StrudelPattern'
import soundManager from './SoundManager'
import sampler from './Sampler'
import bankManager from './BankManager'
import { s as sPattern, stopAllPatterns, clearPreviousExecution } from './SoundPattern'
import { samples } from './samples'
import sampleLoader from './SampleLoader'

const debugHybridLog = (..._args: unknown[]) => {}

export class HybridSystem {
  private static instance: HybridSystem
  private static initializationPromise: Promise<void> | null = null
  private isInitialized = false

  private constructor() {}

  static getInstance(): HybridSystem {
    if (!HybridSystem.instance) {
      HybridSystem.instance = new HybridSystem()
    }
    return HybridSystem.instance
  }

  /**
   * システム初期化とグローバル関数設定
   */
  async initialize(): Promise<void> {
    // 既に初期化中または完了している場合は、既存のPromiseを返す
    if (HybridSystem.initializationPromise) {
      return HybridSystem.initializationPromise
    }

    // 初期化を開始
    HybridSystem.initializationPromise = this.doInitialize()
    return HybridSystem.initializationPromise
  }

  /**
   * 実際の初期化処理
   */
  private async doInitialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      // ModelManagerの初期化（サイレントモード）
      await modelManager.initialize()
      
      // Audio Engineの初期化は重複ログを避ける
      try {
        await strudelAudioEngine.initialize()
      } catch (error) {
        // 既に初期化されている場合のエラーは無視
        if (!(error as Error)?.message?.includes('already initialized')) {
          throw error
        }
      }
      
      // Initialize sound systems
      const audioContext = (globalThis as any).strudelAudioEngine?.audioContext
      if (audioContext) {
        soundManager.initialize(audioContext)
        await sampler.loadDefaultBanks()
        soundManager.registerGennyDemoSamples()
      }
      
      // グローバル関数の設定
      this.setupGlobalFunctions()
      
      this.isInitialized = true
      
      // 統合されたログメッセージを1回だけ出力
      const store = useGennyStore.getState()
      store.addLog({
        level: 'info',
        message: 'Genny 2.0 ready - MusicVAE + Strudel with Sound Banks'
      })

    } catch (error) {
      console.error('Failed to initialize Hybrid System:', error)
      const store = useGennyStore.getState()
      store.addLog({
        level: 'error',
        message: `Hybrid System initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
      
      // 初期化失敗時はPromiseをリセット
      HybridSystem.initializationPromise = null
      throw error
    }
  }

  /**
   * UPDATE.md仕様に従ったグローバル関数の設定
   */
  private setupGlobalFunctions(): void {
    const global = globalThis as any
    const store = useGennyStore.getState()
    const patternToBinary = (pattern: GennyPattern): string => {
      const steps = new Array(16).fill('0')
      pattern.forEach(([timeCode]) => {
        const [bars = 0, beats = 0, ticks = 0] = timeCode.split(':').map(Number)
        const stepIndex = (bars * 16 + beats * 4 + Math.floor(ticks / 120)) % 16
        steps[stepIndex] = '1'
      })
      return steps.join('')
    }

    const createPatternContainer = (name: string, pattern: GennyPattern): PatternContainer => ({
      data: pattern,
      async play(): Promise<boolean> {
        const result = await strudelAudioEngine.playGennyPattern(pattern, {
          patternId: name,
          replaceExisting: true,
          allowParallel: false
        })
        store.addPattern(name, pattern)
        return result
      },
      toStrudel(): any {
        return createNote(pattern)
      },
      toBinaryPattern(): string {
        return patternToBinary(pattern)
      }
    })

    // === Level 1: 既存のgenny使用 ===
    global.model = (modelName: string): ModelInstance => {
      modelManager.setActiveModel(modelName)
      return modelManager.createModelInstance(modelName)
    }

    global.pattern1 = (...pattern: GennyPattern): PatternContainer => createPatternContainer('pattern1', pattern)
    global.pattern2 = (...pattern: GennyPattern): PatternContainer => createPatternContainer('pattern2', pattern)
    global.pattern3 = (...pattern: GennyPattern): PatternContainer => createPatternContainer('pattern3', pattern)
    global.pattern4 = (...pattern: GennyPattern): PatternContainer => createPatternContainer('pattern4', pattern)

    // === Level 2: gennyとstrudelの基本組み合わせ ===
    global.note = (pattern: GennyPattern | PatternContainer | string | any): StrudelPattern => {
      // pattern_genへの参照を解決
      if (pattern === 'pattern_gen' || pattern === '{{pattern_gen}}') {
        const patternGen = (globalThis as any).pattern_gen
        if (patternGen && patternGen.data) {
          debugHybridLog('🎵 Using pattern_gen data:', patternGen.data)
          return createNote(patternGen.data)
        } else {
          console.warn('pattern_gen is empty or invalid')
          return createNote([])
        }
      }
      
      // Handle model instances - extract generated pattern
      if (pattern && typeof pattern === 'object' && pattern._generatedPattern) {
        debugHybridLog('🎵 Using AI-generated pattern:', pattern._generatedPattern)
        const strudelPattern = createNote(pattern._generatedPattern)
        // Register this StrudelPattern with the model instance for updates
        pattern._activeStrudelPattern = strudelPattern
        return strudelPattern
      }
      
      // Handle model instances that might have been generated
      if (pattern && typeof pattern === 'object' && pattern._modelName) {
        console.warn('Model instance passed to note() but no generated pattern found. Did you call .gen()?')
        // Try to find any generated pattern in the global context
        const patternGen = (globalThis as any).pattern_gen
        if (patternGen && patternGen.data) {
          debugHybridLog('🎵 Fallback: Using global pattern_gen data:', patternGen.data)
          return createNote(patternGen.data)
        } else {
          console.warn('No generated pattern available, returning empty pattern')
          return createNote([])
        }
      }
      
      return createNote(pattern)
    }

    // Strudel-like s() function for sound patterns
    global.s = sPattern
    global.n = (pattern: string | number): StrudelPattern => {
      return createNote(String(pattern))
    }
    
    // Strudel-like samples() function for loading sample maps
    global.samples = samples

    // Convert Strudel mini-notation into a Genny rhythm seed.
    global.mini = (pattern: string): GennyPattern => {
      return modelManager.parseNotesToGennyPattern(pattern)
    }
    global.strudelPattern = global.mini
    
    // Make sampleLoader globally available for sample selection
    global.sampleLoader = sampleLoader
    
    // Clear previous execution function
    global.clearPreviousExecution = clearPreviousExecution

    global.stack = (...patterns: any[]): StrudelPattern => {
      return stack(...patterns)
    }

    // グローバル変数の初期化
    global.pattern_gen = null
    global.lastGenerated = null
    global.generationHistory = []

    // モデル名定数
    global.magenta_music_vae = 'magenta_music_vae'
    global.magenta_melody_vae = 'magenta_melody_vae'
    global.magenta_melody_4bar = 'magenta_melody_4bar'
    global.magenta_performance_rnn = 'magenta_performance_rnn'

    // stop関数（全体停止）
    global.stop = () => {
      strudelAudioEngine.stop()
      stopAllPatterns()
      store.stopAllPatterns()
      store.addLog({
        level: 'info',
        message: 'Stopped all playback'
      })
    }

    // pattern_genにアクセスするヘルパー関数
    global.getGenerated = (): GennyPattern => {
      const patternGen = (globalThis as any).pattern_gen
      if (patternGen && patternGen.data) {
        return patternGen.data
      }
      console.warn('No generated pattern available')
      return []
    }

    // 生成と再生を一度に行うヘルパー関数
    global.genAndPlay = async (modelName: string, sound: string = "synth", options: any = {}) => {
      const m = (globalThis as any).model(modelName)
      if (options.temperature) m.temperature(options.temperature)
      if (options.steps) m.steps(options.steps)
      
      const generated = await m.generate()
      
      // 生成完了後に自動再生
      ;(globalThis as any).note(generated).s(sound)
      
      return generated
    }

    // 並列発音用のヘルパー関数
    global.parallel = (pattern: GennyPattern | PatternContainer | string, sound: string): void => {
      const notePattern = (globalThis as any).note(pattern)
      notePattern.sound(sound) // 自動的に並列発音される
    }

    // 複数のパターンを同時に並列発音
    global.multiPlay = (...soundPatterns: Array<[any, string]>): void => {
      soundPatterns.forEach(([pattern, sound]) => {
        ;(globalThis as any).parallel(pattern, sound)
      })
    }


  }



  /**
   * システム状態の取得
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      modelManager: modelManager.getStatus(),
      audioEngine: strudelAudioEngine.getStatus()
    }
  }
}

// シングルトンインスタンス
const hybridSystem = HybridSystem.getInstance()

export default hybridSystem
