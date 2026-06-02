/**
 * Genny2.0 Enhanced Model Manager (TypeScript)
 * Magenta MusicVAE compatible with proper input/output formatting
 */

import {
  ModelConfig,
  ModelInstance,
  GeneratedModelInstance,
  GennyPattern,
  NoteSequence,
  GenerationParameters,
  GenerationOptions,
  TimeCode,
  MidiNote,
  PatternContainer
} from '../types/genny'
import { useGennyStore } from '../store/gennyStore'
import magentaModelManager from './MagentaModelManager'
import midiToDrumConverter from './MidiToDrumConverter'

const debugModelLog = (..._args: unknown[]) => {}

export class ModelManager {
  private models: Map<string, ModelConfig & { loaded: boolean; instance?: any }> = new Map()
  private loadedModels: Map<string, any> = new Map()
  private isInitialized: boolean = false
  private activeModelName: string = 'magenta_music_vae'

  constructor() {
    this.registerDefaultModels()
  }

  /**
   * システムの初期化
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      debugModelLog('🧠 ModelManager already initialized, skipping...')
      return
    }

    try {
      debugModelLog('🧠 ModelManager initializing...')
      this.isInitialized = true
      debugModelLog('✅ ModelManager initialized successfully')
    } catch (error) {
      console.error('Failed to initialize ModelManager:', error)
      throw error
    }
  }

  /**
   * デフォルトモデルの登録
   */
  private registerDefaultModels(): void {
    // MusicVAE Drums - 2小節ドラムパターン生成
    this.registerModel('magenta_music_vae', {
      name: 'magenta_music_vae',
      type: 'musicvae',
      url: 'https://storage.googleapis.com/magentadata/js/checkpoints/music_vae/drums_2bar_hikl_small',
      parameters: {
        temperature: 0.5,
        num_steps: 32, // 2小節 = 32ステップ
        num_samples: 1
      },
      description: 'MusicVAE 2-bar drum pattern generator'
    })

    // MusicVAE Melody - メロディ生成
    this.registerModel('magenta_melody_vae', {
      name: 'magenta_melody_vae',
      type: 'musicvae',
      url: 'https://storage.googleapis.com/magentadata/js/checkpoints/music_vae/mel_2bar_small',
      parameters: {
        temperature: 0.7,
        num_steps: 32,
        num_samples: 1
      },
      description: 'MusicVAE 2-bar melody generator'
    })

    // MusicVAE 4-bar Melody - より長いメロディ生成
    this.registerModel('magenta_melody_4bar', {
      name: 'magenta_melody_4bar',
      type: 'musicvae',
      url: 'https://storage.googleapis.com/magentadata/js/checkpoints/music_vae/mel_4bar_med_q2',
      parameters: {
        temperature: 0.7,
        num_steps: 64,
        num_samples: 1
      },
      description: 'MusicVAE 4-bar melody generator'
    })

    // Performance RNN
    this.registerModel('magenta_performance_rnn', {
      name: 'magenta_performance_rnn',
      type: 'performancernn',
      url: 'https://storage.googleapis.com/magentadata/js/checkpoints/music_rnn/performance_with_dynamics',
      parameters: {
        temperature: 1.0,
        steps: 128
      },
      description: 'Performance RNN for expressive timing'
    })

    debugModelLog('📝 Default models registered:', Array.from(this.models.keys()))
  }

  /**
   * モデルの登録
   */
  registerModel(name: string, config: ModelConfig): void {
    this.models.set(name, {
      ...config,
      loaded: false,
      instance: null
    })
  }

  /**
   * Set the model used by pattern-level generation chains.
   */
  setActiveModel(modelName: string): void {
    if (!this.models.has(modelName)) {
      throw new Error(`Model not found: ${modelName}`)
    }
    this.activeModelName = modelName
  }

  /**
   * Get the model used by pattern-level generation chains.
   */
  getActiveModelName(): string {
    return this.activeModelName
  }

  /**
   * モデルインスタンスの作成
   * UPDATE.md仕様に従って、Enhanced Model API を実装
   */
  createModelInstance(modelName: string): ModelInstance {
    const modelConfig = this.models.get(modelName)
    if (!modelConfig) {
      throw new Error(`Model not found: ${modelName}`)
    }

    const store = useGennyStore.getState()
    const modelManager = this // ModelManagerインスタンスへの参照

    const instance: ModelInstance = {
      _modelName: modelName,
      _temperature: modelConfig.parameters.temperature || 0.5,
      _steps: modelConfig.parameters.num_steps || 32,
      _generatedPattern: undefined,
      _activeStrudelPattern: null,
      _showOutputOnGeneration: false,
      _outputFormat: 'genny',
      _generationPending: false,

      temperature(temp: number): ModelInstance {
        this._temperature = Math.max(0.1, Math.min(2.0, temp))
        return this
      },

      steps(num: number): ModelInstance {
        this._steps = Math.max(1, Math.min(128, num))
        return this
      },

      gen(inputPattern?: GennyPattern | PatternContainer | string): ModelInstance {
        store.addLog({
          level: 'info',
          message: `🎲 Generating ${this._modelName}...`
        })
        
        // Strudel mini-notation入力の前処理
        const inputIsMini = typeof inputPattern === 'string'
        this._outputFormat = inputIsMini ? 'mini' : 'genny'
        const processedInput = inputPattern
          ? modelManager.preprocessStrudelInput(inputPattern)
          : undefined

        // Create a basic drum pattern immediately for drum banks
        // This will be replaced when actual generation completes
        const defaultDrumPattern: GennyPattern = [
          ['0:0:0', 36, 100],   // Kick on beat 1
          ['0:1:0', 38, 100],   // Snare on beat 2
          ['0:2:0', 36, 100],   // Kick on beat 3
          ['0:3:0', 38, 100],   // Snare on beat 4
        ]
        
        // Set initial pattern immediately so note(m1) works right away
        this._generatedPattern = processedInput || defaultDrumPattern
        
        this._generationPending = true

        // Start async generation and update when complete
        this.generate(processedInput).then(generated => {
          this._generationPending = false
          this._generatedPattern = generated
          
          // pattern_genグローバル変数を更新（PatternContainer形式で）
          ;(globalThis as any).pattern_gen = {
            data: generated,
            play: async () => {
              const globalPlay = (globalThis as any).play
              if (globalPlay) return await globalPlay(generated)
              return false
            }
          }
          
          store.addLog({
            level: 'info',
            message: `✅ Generated ${generated.length} notes`
          })

          if (this._showOutputOnGeneration && !this._suppressOutputSideEffects) {
            modelManager.showGeneratedOutput(this._modelName, generated, this._outputFormat)
            modelManager.playGeneratedOutput(generated)
          }

          // 生成完了を通知（自動再生のトリガー）
          const event = new CustomEvent('patternGenerated', { 
            detail: { pattern: generated } 
          })
          window.dispatchEvent(event)
          this._onGenerated?.(generated)
          
        }).catch(error => {
          this._generationPending = false
          // エラー時は一時パターンを使用
          this._generatedPattern = modelManager.createTemporaryPattern(processedInput)
          
          store.addLog({
            level: 'error',
            message: `Generation failed: ${error instanceof Error ? error.message : 'Error'}`
          })
        })
        
        // 初期パターンを設定（生成完了まで使用）
        if (!this._generatedPattern) {
          this._generatedPattern = modelManager.createTemporaryPattern(processedInput)
        }
        
        // Keep the model chainable: model(...).temperature(...).gen().output()
        return this
      },

      output(...notes: any[]): GennyPattern | any[] {
        this._showOutputOnGeneration = true
        if (notes.length > 0) {
          const outputPattern = typeof notes[0] === 'string' && notes.length === 1
            ? modelManager.preprocessStrudelInput(notes[0])
            : modelManager.normalizeOutputArguments(notes)
          this._outputFormat = typeof notes[0] === 'string' && notes.length === 1 ? 'mini' : this._outputFormat
          this._generatedPattern = outputPattern
          ;(globalThis as any).pattern_gen = modelManager.createPatternContainer(outputPattern)
          modelManager.playGeneratedOutput(outputPattern)
          store.addLog({
            level: 'info',
            message: `output(${outputPattern.length} events)`
          })
          return outputPattern
        }
        const generated = this._generatedPattern || modelManager.createTemporaryPattern()
        if (this._generationPending) {
          return generated
        }
        modelManager.showGeneratedOutput(this._modelName, generated, this._outputFormat)
        debugModelLog('Generated pattern output:', generated)
        return generated
      },

      /**
       * 生成されたパターンのリズムを保持しつつ、指定された音符で音程を変換
       */
      transformPatternWithNotes(this: ModelInstance, generatedPattern: GennyPattern, notePattern: GennyPattern): GennyPattern {
        if (notePattern.length === 0) return generatedPattern
        
        const transformedPattern: GennyPattern = []
        
        // 生成パターンの各ノートに対して、notePatternから音程を割り当てる
        generatedPattern.forEach((note, index) => {
          const [timeCode, _, velocity] = note
          const noteIndex = index % notePattern.length
          const newPitch = notePattern[noteIndex][1]
          
          transformedPattern.push([timeCode, newPitch, velocity])
        })
        
        return transformedPattern
      },

      async generateAndPlay(inputPattern?: GennyPattern | PatternContainer): Promise<GennyPattern> {
        const generated = await this.generate(inputPattern)
        ;(globalThis as any).play(generated)
        return generated
      },
      
      play(inputPattern?: GennyPattern | PatternContainer): void {
        debugModelLog(`▶️ play() called for ${this._modelName}`)
        this.generate(inputPattern).then(generated => {
          debugModelLog('🎵 Generated pattern:', generated)
          ;(globalThis as any).play(generated)
        }).catch(error => {
          console.error('Failed to generate and play:', error)
          store.addLog({
            level: 'error',
            message: `Failed to generate and play: ${error instanceof Error ? error.message : 'Unknown error'}`
          })
        })
      },
      
      async generate(inputPattern?: GennyPattern | PatternContainer): Promise<GennyPattern> {
        debugModelLog(`🎨 generate() called for ${this._modelName}`)
        
        try {
          let pattern: GennyPattern
          
          // 入力パターンの処理
          if (!inputPattern) {
            // 入力がない場合はデフォルトパターン
            pattern = [['0:0:0', 60, 100], ['0:1:0', 64, 100], ['0:2:0', 67, 100], ['0:3:0', 60, 100]]
          } else if (Array.isArray(inputPattern)) {
            pattern = inputPattern
          } else if (inputPattern?.data && Array.isArray(inputPattern.data)) {
            pattern = inputPattern.data
          } else {
            throw new Error('Invalid input pattern format')
          }
          
          // 入力パターンの詳細ログ
        debugModelLog('🎨 === Model Generation Start ===')
        debugModelLog(`Model: ${this._modelName}`)
        debugModelLog(`Temperature: ${this._temperature}`)
        debugModelLog(`Steps: ${this._steps}`)
        debugModelLog('Input Pattern:', pattern)
        debugModelLog(`Input Pattern Stats: ${pattern.length} notes`)
        
        // 前処理されたパターンをMagenta形式に変換
        const magentaInput = modelManager.gennyToMagentaNoteSequence(pattern)
        debugModelLog('Magenta Input:', magentaInput)
        debugModelLog(`Magenta Input Stats: ${magentaInput.notes.length} notes, ${magentaInput.totalQuantizedSteps} steps`)
        
        // 生成実行（内部メソッドを呼び出し）
        const generated = await modelManager.executeGeneration(
            magentaInput,
            { temperature: this._temperature, num_samples: 1 },
            modelConfig,
            modelName,
            instance
          )
          
          // 生成結果を保存
          this._generatedPattern = generated
          
          // AI生成完了時に、既存のパターンを更新
          if (this._activeStrudelPattern) {
            this._activeStrudelPattern.updatePattern(generated)
          }
          
          // 生成結果の詳細ログ
          debugModelLog('✅ === Model Generation Complete ===')
          debugModelLog('Generated Pattern:', generated)
          debugModelLog(`Generated Pattern Stats: ${generated.length} notes`)
          
          // 生成結果の統計情報
          const stats = modelManager.analyzePattern(generated)
          debugModelLog('Pattern Analysis:', stats)
          debugModelLog('🎨 === Generation End ===')
          
          // pattern_genグローバル変数として利用可能にする（PatternContainer形式）
          ;(globalThis as any).pattern_gen = {
            data: generated,
            play: async () => {
              const globalPlay = (globalThis as any).play
              if (globalPlay) return await globalPlay(generated)
              return false
            }
          }
          
          store.addLog({
            level: 'info',
            message: `✅ Generated ${generated.length} notes → pattern_gen`
          })

          if (this._showOutputOnGeneration && !this._suppressOutputSideEffects) {
            modelManager.showGeneratedOutput(this._modelName, generated, this._outputFormat)
            modelManager.playGeneratedOutput(generated)
          }
          
          return generated
        } catch (error) {
          store.addLog({
            level: 'error',
            message: `Generation failed: ${error instanceof Error ? error.message : 'Error'}`
          })
          if (this._throwOnGenerationError) {
            throw error
          }

          // エラー時は入力パターンを返す
          if (Array.isArray(inputPattern)) return inputPattern
          if (inputPattern?.data) return inputPattern.data
          return []
        }
      },


      async similar(inputPattern: GennyPattern): Promise<GennyPattern> {
        const inputSequence = modelManager.gennyToMagentaNoteSequence(inputPattern)
        return await modelManager.generatePattern(modelName, 
          { temperature: this._temperature }, 
          { inputSequence, mode: 'similar' }
        )
      },

      async interpolate(pattern1: GennyPattern, pattern2: GennyPattern, steps: number = 5): Promise<GennyPattern[]> {
        // 実際の補間アルゴリズム実装
        const results: GennyPattern[] = []
        for (let i = 0; i < steps; i++) {
          const t = i / (steps - 1)
          const interpolated = modelManager.interpolatePatterns(pattern1, pattern2, t)
          results.push(interpolated)
        }
        return results
      },

      toBinaryPattern(): string {
        // UPDATE.md Level 3仕様: .struct()で使用するバイナリパターンを生成
        if (!this._generatedPattern) {
          return '1000100010001000' // デフォルトパターン
        }
        
        return modelManager.patternToBinary(this._generatedPattern)
      }
    }

    return instance
  }

  showGeneratedOutput(modelName: string, pattern: GennyPattern, format: 'genny' | 'mini' = 'genny'): void {
    const outputText = this.formatPatternForOutput(pattern, format)
    const store = useGennyStore.getState()

    store.addLog({
      level: 'info',
      message: `generated data: ${outputText.replace(/\s+/g, ' ').trim()}`
    })

    const currentCode = store.code
    const updatedCode = this.injectGeneratedOutput(currentCode, modelName, outputText)
    if (updatedCode !== currentCode) {
      store.setCode(updatedCode)
    }
  }

  formatPatternForOutputText(pattern: GennyPattern, format: 'genny' | 'mini' = 'genny'): string {
    return this.formatPatternForOutput(pattern, format)
  }

  private formatPatternForOutput(pattern: GennyPattern, format: 'genny' | 'mini' = 'genny'): string {
    if (pattern.length === 0) return ''

    if (format === 'mini') {
      return JSON.stringify(this.patternToMiniNotation(pattern))
    }

    return pattern
      .map(([timeCode, pitch]) => `["${timeCode}", ${Math.round(pitch)}]`)
      .join(',')
  }

  private patternToMiniNotation(pattern: GennyPattern): string {
    const maxStep = pattern.reduce((max, [timeCode]) => {
      const [measure = 0, beat = 0, subdivision = 0] = timeCode.split(':').map(Number)
      return Math.max(max, measure * 16 + beat * 4 + subdivision)
    }, 0)
    const stepCount = Math.max(16, Math.ceil((maxStep + 1) / 16) * 16)

    return midiToDrumConverter.convertToRegularPattern(pattern, stepCount)
  }

  normalizeOutputArguments(notes: any[]): GennyPattern {
    return notes
      .map((note): [string, number, number] | null => {
        if (!Array.isArray(note) || note.length < 2) return null

        const timeCode = String(note[0])
        const pitch = Number(note[1])
        const velocity = note.length > 2 ? Number(note[2]) : 127

        if (!timeCode || Number.isNaN(pitch)) return null
        return [
          timeCode,
          Math.max(0, Math.min(127, Math.round(pitch))),
          Number.isNaN(velocity) ? 127 : Math.max(1, Math.min(127, Math.round(velocity)))
        ]
      })
      .filter((note): note is [string, number, number] => note !== null)
  }

  playGeneratedOutput(pattern: GennyPattern): void {
    const audioEngine = (globalThis as any).strudelAudioEngine
    if (!audioEngine || pattern.length === 0) return

    audioEngine.playGennyPattern(pattern, {
      patternId: 'output',
      replaceExisting: true,
      allowParallel: false
    }).catch((error: unknown) => {
      const store = useGennyStore.getState()
      store.addLog({
        level: 'error',
        message: `output playback failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    })
  }

  private injectGeneratedOutput(code: string, modelName: string, outputText: string): string {
    const modelIndex = code.indexOf(`model(${modelName})`)
    if (modelIndex < 0) return code

    const outputIndex = code.indexOf('.output', modelIndex)
    if (outputIndex < 0) return code

    const openParenIndex = code.indexOf('(', outputIndex)
    if (openParenIndex < 0) return code

    const closeParenIndex = this.findMatchingParen(code, openParenIndex)
    if (closeParenIndex < 0) return code

    const replacement = outputText ? `.output(${outputText})` : '.output()'
    return `${code.slice(0, outputIndex)}${replacement}${code.slice(closeParenIndex + 1)}`
  }

  private findMatchingParen(text: string, openParenIndex: number): number {
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

  /**
   * 内部メソッド - MagentaのNoteSequence形式で生成
   */
  private async executeGeneration(
    inputSequence: NoteSequence, 
    params: any, 
    modelConfig: ModelConfig & { loaded: boolean; instance?: any },
    modelName: string,
    instance: ModelInstance
  ): Promise<GennyPattern> {
    const store = useGennyStore.getState()
    
    // パラメータの検証
    const temperature = Math.max(0.1, Math.min(2.0, instance._temperature || 0.5))
    const steps = Math.max(4, Math.min(64, instance._steps || 32))
    
    try {
      // MusicVAEモデルの場合
      if (modelConfig.type === 'musicvae') {
        const musicVAE = await magentaModelManager.loadMusicVAE(modelConfig.url!)
        let generatedSequence: NoteSequence
        
        // 入力がない場合は温度サンプリング
        if (!inputSequence.notes || inputSequence.notes.length === 0) {
          // stepsをstepsPerQuarterとして使用（Magentaの仕様に合わせる）
          const stepsPerQuarter = 4 // 16分音符解像度
          generatedSequence = await magentaModelManager.sampleFromMusicVAE(
            musicVAE,
            temperature,
            stepsPerQuarter
          )
        } else {
          // 入力がある場合は類似パターン生成
          // 類似度はtemperatureから計算（temperatureが高いほど類似度が低い）
          const similarity = 1.0 - (temperature * 0.5) // 0.5 ~ 0.95の範囲

          try {
            generatedSequence = await magentaModelManager.generateSimilar(
              musicVAE,
              inputSequence,
              temperature,
              similarity
            )
          } catch (error) {
            store.addLog({
              level: 'warn',
              message: `Similar generation failed; sampling instead: ${error instanceof Error ? error.message : 'Unknown error'}`
            })
            generatedSequence = await magentaModelManager.sampleFromMusicVAE(
              musicVAE,
              temperature,
              inputSequence.quantizationInfo?.stepsPerQuarter || 4
            )
          }
        }
        
        // MagentaのNoteSequenceをGennyPatternに変換
        const gennyPattern = magentaModelManager.magentaToGennyPattern(generatedSequence)
        
        store.addLog({
          level: 'info',
          message: `🎵 Generated ${gennyPattern.length} notes using MusicVAE (temp: ${temperature})`
        })
        
        return gennyPattern
      }
      
      // MusicRNNモデルの場合
      if (modelConfig.type === 'musicrnn' || modelConfig.type === 'performancernn') {
        const musicRNN = await magentaModelManager.loadMusicRNN(modelConfig.url!)
        
        // 入力がない場合はデフォルトシーケンスを作成
        if (!inputSequence.notes || inputSequence.notes.length === 0) {
          inputSequence = {
            notes: [
              { pitch: 60, quantizedStartStep: 0, quantizedEndStep: 1 }
            ],
            quantizationInfo: { stepsPerQuarter: 4 },
            totalQuantizedSteps: 1
          }
        }
        
        // RNNで続きを生成
        const generatedSequence = await magentaModelManager.continueSequence(
          musicRNN,
          inputSequence,
          steps,
          temperature
        )
        
        // MagentaのNoteSequenceをGennyPatternに変換
        const gennyPattern = magentaModelManager.magentaToGennyPattern(generatedSequence)
        
        store.addLog({
          level: 'info',
          message: `🎵 Generated ${gennyPattern.length} notes using MusicRNN (temp: ${temperature}, steps: ${steps})`
        })
        
        return gennyPattern
      }
      
      // サポートされていないモデルタイプ
      throw new Error(`Unsupported model type: ${modelConfig.type}`)
      
    } catch (error) {
      console.error('Magenta generation failed:', error)
      store.addLog({
        level: 'error',
        message: `Generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      })

      if (instance._throwOnGenerationError) {
        throw error
      }
      
      // エラー時はフォールバックパターンを返す
      return this.createFallbackPattern(modelName, temperature, steps)
    }
  }

  /**
   * エラー時のフォールバックパターン生成
   */
  private createFallbackPattern(modelName: string, temperature: number, steps: number): GennyPattern {
    
    const pattern: GennyPattern = []
    const isDrums = modelName.includes('drums') || modelName.includes('drum')
    
    if (isDrums) {
      // シンプルなドラムパターン
      const drumNotes = [36, 38, 42] // Kick, Snare, Hi-hat
      for (let i = 0; i < Math.min(steps, 16); i++) {
        if (i % 4 === 0) pattern.push([`0:${Math.floor(i/4)}:0`, 36, 100]) // Kick
        if (i % 8 === 4) pattern.push([`0:${Math.floor(i/4)}:0`, 38, 100]) // Snare
        if (i % 2 === 0) pattern.push([`0:${Math.floor(i/4)}:0`, 42, 80])  // Hi-hat
      }
    } else {
      // シンプルなメロディパターン
      const scale = [60, 62, 64, 65, 67, 69, 71, 72] // C major
      for (let i = 0; i < Math.min(steps / 4, 8); i++) {
        const noteIndex = Math.floor(Math.random() * scale.length * temperature)
        const pitch = scale[noteIndex % scale.length]
        pattern.push([`0:${i}:0`, pitch, 100])
      }
    }
    
    return pattern
  }

  /**
   * GennyパターンをMagenta NoteSequence形式に変換
   * Strudel mini-notation対応版 - 和音とタイミングを適切に処理
   */
  private gennyToMagentaNoteSequence(pattern: GennyPattern): NoteSequence {
    if (!pattern || pattern.length === 0) {
      // 空パターンの場合はデフォルトの単音を返す
      return {
        notes: [{
          pitch: 60,
          quantizedStartStep: 0,
          quantizedEndStep: 1,
          isDrum: false,
          velocity: 80
        }],
        totalQuantizedSteps: 16,
        quantizationInfo: { stepsPerQuarter: 4 },
        tempos: [{ time: 0, qpm: 120 }],
        ticksPerQuarter: 220
      }
    }

    const drumMidiPitches = new Set([35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 56])
    const notes = pattern.map(([timeCode, pitch, velocity = 127]) => {
      // TimeCode解析の安全性を向上
      let bars = 0, beats = 0, ticks = 0
      
      try {
        const parts = timeCode.split(':')
        bars = parseInt(parts[0]) || 0
        beats = parseInt(parts[1]) || 0
        ticks = parseInt(parts[2]) || 0
      } catch (error) {
        console.warn(`Invalid timeCode: ${timeCode}, using 0:0:0`)
      }
      
      // Magentaの16分音符ベース量子化
      // より正確な変換: 1ティック = 1/480拍 = 1/120 * 16分音符
      const quantizedStartStep = Math.max(0, 
        bars * 16 + beats * 4 + Math.floor(ticks / 120)
      )
      
      return {
        pitch: Math.max(0, Math.min(127, Math.round(pitch))),
        quantizedStartStep,
        quantizedEndStep: quantizedStartStep + 1,
        isDrum: drumMidiPitches.has(Math.round(pitch)),
        velocity: Math.max(1, Math.min(127, Math.round(velocity * 127 / 127)))
      }
    })

    // パターンの長さを動的に計算
    const maxStep = Math.max(
      32, // 最低2小節
      ...notes.map(note => note.quantizedEndStep || note.quantizedStartStep + 1)
    )
    
    // 16の倍数に切り上げ（小節境界に合わせる）
    const totalSteps = Math.ceil(maxStep / 16) * 16

    return {
      notes: notes.filter(note => note.pitch > 0), // 無効な音程を除外
      totalQuantizedSteps: totalSteps,
      quantizationInfo: { 
        stepsPerQuarter: 4 // 4/4拍子、16分音符解像度
      },
      tempos: [{ time: 0, qpm: 120 }],
      ticksPerQuarter: 220 // Magenta標準
    }
  }

  /**
   * パターンコンテナの作成
   * UPDATE.md Level 2仕様対応
   */
  private createPatternContainer(pattern: GennyPattern): PatternContainer {
    const store = useGennyStore.getState()
    
    return {
      data: pattern,
      
      async play(): Promise<boolean> {
        try {
          // StrudelAudioEngineとの連携
          const audioEngine = (globalThis as any).strudelAudioEngine
          if (audioEngine) {
            await audioEngine.playGennyPattern(pattern)
            return true
          }
          
          store.addLog({
            level: 'warn',
            message: 'Audio engine not available'
          })
          return false
        } catch (error) {
          console.error('Pattern playback failed:', error)
          store.addLog({
            level: 'error',
            message: `Pattern playback failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          })
          return false
        }
      },

      toStrudel(): any {
        // Strudelパターンへの変換（後で実装）
        debugModelLog('🔄 Converting to Strudel pattern:', pattern)
        return null
      },

      toBinaryPattern(): string {
        return modelManager.patternToBinary(pattern)
      }
    }
  }

  /**
   * パターン生成
   */
  async generatePattern(
    modelName: string, 
    parameters: GenerationParameters = {},
    options?: { inputSequence?: NoteSequence; mode?: 'similar' | 'interpolate' | 'continue' }
  ): Promise<GennyPattern> {
    const modelConfig = this.models.get(modelName)
    if (!modelConfig) {
      throw new Error(`Model not found: ${modelName}`)
    }

    const mergedParams = { ...modelConfig.parameters, ...parameters }
    void mergedParams
    void options
    
    // 実際のMagentaモデル統合時に置き換え
    const defaultPattern: GennyPattern = [
      ['0:0:0', 36, 127], // Kick
      ['0:2:0', 38, 127], // Snare
      ['0:1:0', 42, 100], // Hi-hat
      ['0:3:0', 42, 100]  // Hi-hat
    ]

    return defaultPattern
  }

  /**
   * パターン補間
   */
  private interpolatePatterns(pattern1: GennyPattern, pattern2: GennyPattern, t: number): GennyPattern {
    const maxLength = Math.max(pattern1.length, pattern2.length)
    const result: GennyPattern = []

    for (let i = 0; i < maxLength; i++) {
      const p1 = pattern1[i] || pattern1[pattern1.length - 1]
      const p2 = pattern2[i] || pattern2[pattern2.length - 1]
      
      const pitch = Math.round(p1[1] + (p2[1] - p1[1]) * t)
      const velocity = Math.round((p1[2] || 127) + ((p2[2] || 127) - (p1[2] || 127)) * t)
      
      result.push([p1[0], pitch, velocity])
    }

    return result
  }

  /**
   * 一時的なパターンを作成（生成処理中の代替）
   */
  createTemporaryPattern(inputPattern?: GennyPattern | PatternContainer): GennyPattern {
    if (inputPattern) {
      if (Array.isArray(inputPattern)) {
        return inputPattern
      } else if (inputPattern?.data && Array.isArray(inputPattern.data)) {
        return inputPattern.data
      }
    }
    // デフォルトの一時パターン
    return [['0:0:0', 60, 100], ['0:1:0', 64, 100], ['0:2:0', 67, 100], ['0:3:0', 60, 100]]
  }

  /**
   * Strudel mini-notation入力をMagenta互換形式に前処理
   */
  preprocessStrudelInput(inputPattern: GennyPattern | PatternContainer | string): GennyPattern {
    let pattern: GennyPattern

    // 入力形式の正規化
    if (typeof inputPattern === 'string') {
      pattern = this.parseNotesToGennyPattern(inputPattern)
    } else if (Array.isArray(inputPattern)) {
      pattern = inputPattern
    } else if (inputPattern?.data && Array.isArray(inputPattern.data)) {
      pattern = inputPattern.data
    } else {
      console.warn('Invalid input pattern for preprocessing')
      return this.createTemporaryPattern()
    }

    if (pattern.length === 0) {
      return this.createTemporaryPattern()
    }

    // 1. 和音の分解 - 同じタイムコードの音符を個別のノートとして保持
    // Magentaは和音を個別の音符として処理するため、この処理は不要
    // むしろStrudelで作成された和音パターンはそのままMagentaに送る
    
    // 2. 音程とタイミングの検証・正規化
    const processedPattern: GennyPattern = pattern
      .filter(([timeCode, pitch, velocity]) => {
        // 無効な音程をフィルタリング
        if (typeof pitch !== 'number' || pitch < 0 || pitch > 127) {
          console.warn(`Invalid pitch filtered: ${pitch}`)
          return false
        }
        
        // 無効なタイムコードをフィルタリング
        if (typeof timeCode !== 'string' || !timeCode.includes(':')) {
          console.warn(`Invalid timeCode filtered: ${timeCode}`)
          return false
        }
        
        return true
      })
      .map(([timeCode, pitch, velocity = 127]) => {
        // ベロシティの正規化
        const normalizedVelocity = Math.max(1, Math.min(127, Math.round(velocity)))
        
        // タイムコードの検証と修正
        let validTimeCode = timeCode
        try {
          const parts = timeCode.split(':')
          if (parts.length !== 3) {
            validTimeCode = '0:0:0'
          } else {
            // 各部分が数値であることを確認
            const [bars, beats, ticks] = parts.map(p => parseInt(p) || 0)
            validTimeCode = `${bars}:${beats}:${ticks}`
          }
        } catch (error) {
          validTimeCode = '0:0:0'
        }
        
        return [validTimeCode, Math.round(pitch), normalizedVelocity] as [string, number, number]
      })

    // 3. パターンが空になった場合のフォールバック
    if (processedPattern.length === 0) {
      console.warn('All notes filtered out during preprocessing, using fallback')
      return this.createTemporaryPattern()
    }

    // 4. 長すぎるパターンの制限 (Magentaモデルの制限に合わせる)
    const maxNotes = 128 // MusicVAEの一般的な制限
    if (processedPattern.length > maxNotes) {
      console.warn(`Pattern too long (${processedPattern.length} notes), truncating to ${maxNotes}`)
      return processedPattern.slice(0, maxNotes)
    }

    debugModelLog(`✅ Preprocessed pattern: ${pattern.length} → ${processedPattern.length} notes`)
    return processedPattern
  }

  /**
   * パターンの統計情報を分析
   */
  analyzePattern(pattern: GennyPattern): any {
    if (pattern.length === 0) {
      return { notes: 0, duration: 0, pitchRange: { min: 0, max: 0 }, avgVelocity: 0 }
    }

    const pitches = pattern.map(([_, pitch]) => pitch)
    const velocities = pattern.map(([_, __, velocity]) => velocity || 127)
    
    // 時間範囲の計算
    const timeCodes = pattern.map(([timeCode]) => timeCode)
    const durations = timeCodes.map(tc => {
      const [bars, beats, ticks] = tc.split(':').map(Number)
      return bars * 2.0 + beats * 0.5 + ticks * (0.5 / 480)
    })

    return {
      notes: pattern.length,
      duration: Math.max(...durations) - Math.min(...durations),
      pitchRange: {
        min: Math.min(...pitches),
        max: Math.max(...pitches)
      },
      avgVelocity: velocities.reduce((sum, v) => sum + v, 0) / velocities.length,
      uniquePitches: new Set(pitches).size,
      timeSpan: {
        start: Math.min(...durations),
        end: Math.max(...durations)
      }
    }
  }

  /**
   * 音符列をGennyPatternに変換（メロディ・ドラム対応 + Strudel記法サポート）
   */
  parseNotesToGennyPattern(notes: string): GennyPattern {
    // Strudel記法を処理
    let processedNotes = this.processStrudelNotation(notes)
    
    const tokens = processedNotes.toLowerCase().split(/\s+/).filter(n => n.length > 0)
    const pattern: GennyPattern = []
    
    // ドラムマッピング（GM Drum Map準拠）
    const drumMap: Record<string, number> = {
      'bd': 36,   // Bass Drum (kick)
      'kick': 36, // Alias for bass drum
      'sn': 38,   // Snare
      'snare': 38, // Alias for snare
      'hh': 42,   // Hi-Hat Closed
      'hihat': 42, // Alias for hi-hat
      'oh': 46,   // Hi-Hat Open
      'openhat': 46, // Alias for open hi-hat
      'cp': 39,   // Clap
      'clap': 39, // Alias for clap
      'cy': 49,   // Crash Cymbal
      'crash': 49, // Alias for crash
      'cb': 56,   // Cowbell
      'cowbell': 56, // Alias for cowbell
      'rs': 37,   // Rim Shot
      'rim': 37,  // Alias for rim shot
      'mt': 47,   // Mid Tom
      'midtom': 47, // Alias for mid tom
      'lt': 41,   // Low Tom
      'lowtom': 41, // Alias for low tom
      'ht': 50,   // High Tom
      'hitom': 50, // Alias for high tom
      // Additional common drum sounds
      'perc': 81, // Triangle
      'shaker': 82, // Shaker
      'tamb': 54  // Tambourine
    }
    
    // メロディ音符マッピング
    const noteMap: Record<string, number> = {
      'c': 60, 'd': 62, 'e': 64, 'f': 65, 'g': 67, 'a': 69, 'b': 71
    }
    
    // ドラムかメロディかを判定
    const isDrumPattern = tokens.some(token => {
      const baseToken = token.replace(/@\d+/g, '') // @記法を除去して判定
      return drumMap.hasOwnProperty(baseToken)
    })
    
    let currentTimeIndex = 0
    
    tokens.forEach((token) => {
      // @記法で持続時間を処理
      const durationMatch = token.match(/(.+?)@(\d+)/)
      let noteToken = token
      let duration = 1
      
      if (durationMatch) {
        noteToken = durationMatch[1]
        duration = Math.max(1, Math.min(8, parseInt(durationMatch[2]))) // 1-8拍に制限
      }
      
      // レスト（休符）の処理
      if (noteToken === 'rest' || noteToken === '~' || noteToken === '-') {
        // レストの場合は音符を追加せず、時間だけ進める
        currentTimeIndex += duration
        return
      }
      
      let midiNote: number
      
      if (isDrumPattern && drumMap[noteToken]) {
        // ドラムパターンの場合
        midiNote = drumMap[noteToken]
      } else {
        // メロディパターンの場合
        let baseNote = noteMap[noteToken.charAt(0)] || 60 // デフォルトC4
        const octaveMatch = noteToken.match(/\d+/)
        if (octaveMatch) {
          const octave = parseInt(octaveMatch[0])
          baseNote = baseNote + (octave - 4) * 12
        }
        midiNote = baseNote
      }
      
      // 時間配置（durationを考慮）
      for (let d = 0; d < duration; d++) {
        const timeIndex = currentTimeIndex + d
        const bars = Math.floor(timeIndex / 16)
        const beats = Math.floor((timeIndex % 16) / 4)
        const ticks = (timeIndex % 4) * 120
        const timeCode = `${bars}:${beats}:${ticks}`
        
        // 最初のノートのみ通常のベロシティ、残りは小さめ（タイ）
        const velocity = d === 0 ? 127 : 100
        pattern.push([timeCode, midiNote, velocity])
      }
      
      currentTimeIndex += duration
    })
    
    return pattern.length > 0 ? pattern : [['0:0:0', 60, 127]]
  }

  /**
   * Strudel記法を処理
   */
  private processStrudelNotation(notes: string): string {
    let processed = notes.trim()
    
    // 複数のスペースを単一スペースに正規化
    processed = processed.replace(/\s+/g, ' ')
    
    // [c d e f] - グループ記法（括弧を除去してすべての要素を展開）
    processed = processed.replace(/\[([^\]]+)\]/g, '$1')
    
    // <c d e f> - 選択記法（ランダムに1つ選択）
    processed = processed.replace(/<([^>]+)>/g, (_, choices) => {
      const options = choices.trim().split(/\s+/).filter((opt: string) => opt.length > 0)
      if (options.length === 0) return 'c'
      return options[Math.floor(Math.random() * options.length)]
    })
    
    // c*4 - 繰り返し記法（より柔軟に）
    processed = processed.replace(/([a-z]+[0-9]*|~|bd|kick|sn|snare|hh|hihat|oh|openhat|cp|clap|cy|crash|cb|cowbell|rs|rim|mt|midtom|lt|lowtom|ht|hitom|perc|shaker|tamb)\*(\d+)/g, (_, note, count) => {
      const repeatCount = Math.max(1, Math.min(16, parseInt(count))) // 1-16回に制限
      return Array(repeatCount).fill(note).join(' ')
    })
    
    // ~ - レスト（休符）記法
    processed = processed.replace(/[~-]/g, 'rest')
    
    // | - バー区切り（スペースに変換）
    processed = processed.replace(/\|/g, ' ')
    
    // 連続スペースを再度クリーンアップ
    processed = processed.replace(/\s+/g, ' ').trim()
    
    return processed
  }

  /**
   * パターンをバイナリ文字列に変換
   */
  private patternToBinary(pattern: GennyPattern): string {
    const steps = new Array(16).fill('0')
    
    pattern.forEach(([timeCode]) => {
      try {
        const [bars, beats, ticks] = timeCode.split(':').map(Number)
        const stepIndex = (bars * 16 + beats * 4 + Math.floor(ticks / 120)) % 16
        steps[stepIndex] = '1'
      } catch (e) {
        // パース失敗時は無視
      }
    })
    
    return steps.join('')
  }

  /**
   * システム状態の取得
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      registeredModels: Array.from(this.models.keys()),
      loadedModels: Array.from(this.loadedModels.keys()),
      modelDetails: Object.fromEntries(
        Array.from(this.models.entries()).map(([name, config]) => [
          name,
          {
            type: config.type,
            loaded: config.loaded,
            description: config.description
          }
        ])
      )
    }
  }

  /**
   * リソースのクリーンアップ
   */
  cleanup(): void {
    this.loadedModels.clear()
    this.models.clear()
    this.isInitialized = false
  }
}

// シングルトンインスタンス
const modelManager = new ModelManager()

export default modelManager
