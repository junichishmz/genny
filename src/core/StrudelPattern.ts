/**
 * Strudel-style Pattern Class
 * Chainable methods for audio effects and pattern manipulation
 */

import { GennyPattern, ModelInstance, PatternContainer } from '../types/genny'
import { useGennyStore } from '../store/gennyStore'
import bankManager from './BankManager'
import modelManager from './ModelManager'
import midiToDrumConverter from './MidiToDrumConverter'
import { SoundPattern } from './SoundPattern'

const debugPatternLog = (..._args: unknown[]) => {}

export class StrudelPattern {
  private _pattern: GennyPattern
  private _sound: string = 'sine'
  private _effects: Record<string, any> = {}
  private _options: Record<string, any> = {}
  private _lastBankUsed?: string
  private _generationModel?: ModelInstance
  private _generationModelName?: string
  private _generationTemperature?: number

  constructor(pattern: GennyPattern | PatternContainer | any) {
    if (Array.isArray(pattern)) {
      this._pattern = pattern
    } else if (pattern?.data && Array.isArray(pattern.data)) {
      this._pattern = pattern.data
    } else if (typeof pattern === 'string') {
      // Parse note string like "c d e f"
      this._pattern = this.parseNoteString(pattern)
    } else if (pattern && typeof pattern === 'object' && pattern._generatedPattern) {
      // Handle model instances with generated patterns
      this._pattern = pattern._generatedPattern
      debugPatternLog('🎵 Using AI-generated pattern from model instance:', this._pattern.length, 'notes')
    } else if (pattern && typeof pattern === 'object' && pattern._modelName) {
      // Handle model instances without generated patterns yet
      console.warn('Model instance passed without generated pattern. Using global pattern_gen as fallback.')
      const patternGen = (globalThis as any).pattern_gen
      if (patternGen && patternGen.data) {
        this._pattern = patternGen.data
      } else {
        this._pattern = []
      }
    } else {
      console.warn('Invalid pattern for StrudelPattern:', pattern)
      this._pattern = []
    }
  }

  /**
   * Parse Strudel mini-notation to GennyPattern
   */
  private parseNoteString(notation: string): GennyPattern {
    return this.parseMiniNotation(notation)
  }

  /**
   * Strudel Mini-Notation Parser
   * Supports: [c,e,g], <c d e>, c*4, ~, nested patterns
   */
  private parseMiniNotation(notation: string): GennyPattern {
    const pattern: GennyPattern = []
    const events = this.parseEvents(notation.trim())
    
    events.forEach(event => {
      if (event.notes.length > 0) {
        // 複数音符は同じタイムコードで同時発音（和音）
        event.notes.forEach(midiNote => {
          pattern.push([
            this.cyclePosToTimeCode(event.cyclePos, event.duration),
            midiNote,
            event.velocity
          ])
        })
      }
      // 休符（event.notes.length === 0）は何も追加しない
    })
    
    return pattern
  }

  /**
   * Parse notation into structured events
   */
  private parseEvents(notation: string): Array<{
    cyclePos: number,
    duration: number,
    notes: number[],
    velocity: number
  }> {
    // 1. プリプロセス: 基本的な置換
    let processed = notation
      .replace(/~/g, 'REST')  // 休符をマーク
      .replace(/\s+/g, ' ')   // 空白正規化
      .trim()

    // 2. トップレベルの解析
    const tokens = this.tokenize(processed)
    const events: Array<{
      cyclePos: number,
      duration: number,
      notes: number[],
      velocity: number
    }> = []

    let cyclePos = 0
    const totalTokens = tokens.length

    tokens.forEach((token, index) => {
      const tokenDuration = 1.0 / totalTokens
      const tokenEvents = this.parseToken(token, cyclePos, tokenDuration)
      events.push(...tokenEvents)
      cyclePos += tokenDuration
    })

    return events
  }

  /**
   * Tokenize notation string
   */
  private tokenize(notation: string): string[] {
    const tokens: string[] = []
    let current = ''
    let depth = 0
    let inAngleBrackets = false

    for (let i = 0; i < notation.length; i++) {
      const char = notation[i]
      
      if (char === '[') {
        depth++
        current += char
      } else if (char === ']') {
        depth--
        current += char
      } else if (char === '<') {
        inAngleBrackets = true
        current += char
      } else if (char === '>') {
        inAngleBrackets = false
        current += char
      } else if (char === ' ' && depth === 0 && !inAngleBrackets) {
        if (current.trim()) {
          tokens.push(current.trim())
          current = ''
        }
      } else {
        current += char
      }
    }

    if (current.trim()) {
      tokens.push(current.trim())
    }

    return tokens
  }

  /**
   * Parse individual token
   */
  private parseToken(token: string, cyclePos: number, duration: number): Array<{
    cyclePos: number,
    duration: number,
    notes: number[],
    velocity: number
  }> {
    // 繰り返し記法処理: c*4 や [c,e,g]*2
    const repeatMatch = token.match(/^(.+?)\*(\d+)$/)
    if (repeatMatch) {
      const baseToken = repeatMatch[1]
      const repeatCount = parseInt(repeatMatch[2])
      const events: Array<{
        cyclePos: number,
        duration: number,
        notes: number[],
        velocity: number
      }> = []
      
      const subDuration = duration / repeatCount
      for (let i = 0; i < repeatCount; i++) {
        const subEvents = this.parseToken(baseToken, cyclePos + i * subDuration, subDuration)
        events.push(...subEvents)
      }
      return events
    }

    // 角括弧選択記法: <c d e>
    if (token.startsWith('<') && token.endsWith('>')) {
      const choices = token.slice(1, -1).trim()
      const options = this.tokenize(choices)
      const selectedOption = options[Math.floor(Math.random() * options.length)]
      return this.parseToken(selectedOption, cyclePos, duration)
    }

    // 角括弧グループ記法: [c,e,g] または [c e f g]
    if (token.startsWith('[') && token.endsWith(']')) {
      const inner = token.slice(1, -1).trim()
      
      // カンマ区切り: 和音 [c,e,g]
      if (inner.includes(',')) {
        const chordNotes = inner.split(',').map(n => n.trim())
        const midiNotes = chordNotes.map(note => this.noteToMidi(note)).filter(n => n !== null) as number[]
        
        return [{
          cyclePos,
          duration,
          notes: midiNotes,
          velocity: 127
        }]
      } else {
        // スペース区切り: 細分化 [c d e f]
        const subTokens = this.tokenize(inner)
        const events: Array<{
          cyclePos: number,
          duration: number,
          notes: number[],
          velocity: number
        }> = []
        
        const subDuration = duration / subTokens.length
        subTokens.forEach((subToken, index) => {
          const subEvents = this.parseToken(subToken, cyclePos + index * subDuration, subDuration)
          events.push(...subEvents)
        })
        return events
      }
    }

    // 単一音符または休符
    if (token === 'REST') {
      return [{
        cyclePos,
        duration,
        notes: [],
        velocity: 0
      }]
    }

    const midiNote = this.noteToMidi(token)
    if (midiNote !== null) {
      return [{
        cyclePos,
        duration,
        notes: [midiNote],
        velocity: 127
      }]
    }

    // 解析失敗時は休符として扱う
    return [{
      cyclePos,
      duration,
      notes: [],
      velocity: 0
    }]
  }

  /**
   * Convert note name to MIDI number
   */
  private noteToMidi(noteName: string): number | null {
    if (!noteName || noteName === 'REST') return null
    
    const note = noteName.toLowerCase().trim()
    
    // ドラム音符マッピング
    const drumMap: Record<string, number> = {
      'bd': 36, 'kick': 36, 'sn': 38, 'snare': 38, 'hh': 42, 'hihat': 42,
      'oh': 46, 'openhat': 46, 'cp': 39, 'clap': 39, 'cy': 49, 'crash': 49
    }
    
    if (drumMap[note]) {
      return drumMap[note]
    }
    
    // 音楽音符マッピング
    const noteMap: Record<string, number> = {
      'c': 60, 'd': 62, 'e': 64, 'f': 65, 'g': 67, 'a': 69, 'b': 71
    }
    
    const baseNote = note.charAt(0)
    if (!noteMap[baseNote]) return null
    
    let midiNote = noteMap[baseNote]
    
    // シャープ・フラット処理
    if (note.includes('#')) midiNote += 1
    if (note.includes('b') && !note.includes('bd')) midiNote -= 1
    
    // オクターブ処理
    const octaveMatch = note.match(/(\d+)/)
    if (octaveMatch) {
      const octave = parseInt(octaveMatch[1])
      midiNote += (octave - 4) * 12
    }
    
    return Math.max(0, Math.min(127, midiNote))
  }

  /**
   * Convert cycle position to time code
   */
  private cyclePosToTimeCode(cyclePos: number, duration: number): string {
    // 1サイクル = 1小節として計算
    const totalTicks = Math.floor(cyclePos * 1920) // 1920ティック/小節
    const bars = Math.floor(totalTicks / 1920)
    const remainingTicks = totalTicks % 1920
    const beats = Math.floor(remainingTicks / 480) // 480ティック/拍
    const ticks = remainingTicks % 480
    
    return `${bars}:${beats}:${ticks}`
  }

  // === Strudel-style chaining methods ===

  /**
   * Set sound/instrument and automatically start playback
   */
  sound(soundName: string): StrudelPattern {
    this._sound = soundName
    this.autoPlay()
    return this
  }

  /**
   * Shorthand for sound() - automatically starts playback
   * Now supports sample banks for AI-generated drum patterns
   */
  s(soundName: string): StrudelPattern {
    // Check if soundName is actually a bank name
    if (bankManager.isBankName(soundName)) {
      // Convert MIDI pattern to drum pattern and play with samples
      return this.playAsDrumPattern(soundName)
    } else {
      // Traditional behavior for synthesizer sounds
      this._sound = soundName
      this.autoPlay()
      return this
    }
  }

  /**
   * Convert MIDI pattern to drum pattern and play with sample bank
   */
  private playAsDrumPattern(bankName: string): StrudelPattern {
    try {
      // Remember the bank for future updates
      this._lastBankUsed = bankName
      
      // Convert MIDI pattern to drum mini-notation
      // Calculate pattern length based on maximum measure found in the pattern
      let maxMeasures = 0
      this._pattern.forEach(([timeCode]) => {
        const [measure] = timeCode.split(':').map(Number)
        maxMeasures = Math.max(maxMeasures, measure + 1)
      })
      
      // Use 16 steps per measure (16th note resolution)
      const totalSteps = Math.max(16, maxMeasures * 16)
      const drumPattern = midiToDrumConverter.convertToRegularPattern(this._pattern, totalSteps)
      
      if (drumPattern && drumPattern !== '~') {
        // Create SoundPattern with the drum notation and apply the bank
        const soundPattern = new SoundPattern(drumPattern)
        
        // Apply the bank to the pattern
        soundPattern.bank(bankName)
        
        // Apply any effects from this StrudelPattern to the SoundPattern
        if (this._effects.room) {
          soundPattern.room(this._effects.room)
        }
        if (this._effects.delay) {
          soundPattern.delay(this._effects.delay)
        }
        if (this._effects.pan !== undefined) {
          soundPattern.pan(this._effects.pan)
        }
        if (this._effects.gain !== undefined) {
          soundPattern.gain(this._effects.gain)
        }
        
        debugPatternLog(`🥁 AI pattern converted to drums: "${drumPattern}" with bank "${bankName}"`)
      } else {
        console.warn('Could not convert MIDI pattern to drum pattern')
      }
    } catch (error) {
      console.error('Error converting to drum pattern:', error)
      // Fallback to traditional synth behavior
      this._sound = bankName
      this.autoPlay()
    }
    
    return this
  }

  /**
   * Update pattern with new AI-generated data
   */
  updatePattern(newPattern: GennyPattern): void {
    this._pattern = newPattern
    
    // If this pattern is currently being played as drums, update it
    if (this._lastBankUsed) {
      this.playAsDrumPattern(this._lastBankUsed)
      debugPatternLog(`🔄 Updated AI pattern with ${newPattern.length} notes for bank "${this._lastBankUsed}"`)
    }
  }

  /**
   * Add reverb room
   */
  room(amount: number): StrudelPattern {
    this._effects.room = Math.max(0, Math.min(1, amount))
    if (this._sound) this.autoPlay() // Update playback if sound is already set
    return this
  }

  /**
   * Add delay
   */
  delay(time: number): StrudelPattern {
    this._effects.delay = Math.max(0, Math.min(1, time))
    if (this._sound) this.autoPlay() // Update playback if sound is already set
    return this
  }

  /**
   * Low-pass filter
   */
  lpf(frequency: number): StrudelPattern {
    this._effects.lpf = Math.max(20, Math.min(20000, frequency))
    if (this._sound) this.autoPlay() // Update playback if sound is already set
    return this
  }

  /**
   * High-pass filter
   */
  hpf(frequency: number): StrudelPattern {
    this._effects.hpf = Math.max(20, Math.min(20000, frequency))
    if (this._sound) this.autoPlay() // Update playback if sound is already set
    return this
  }

  /**
   * Gain/volume
   */
  gain(level: number): StrudelPattern {
    this._effects.gain = Math.max(0, Math.min(2, level))
    if (this._sound) this.autoPlay() // Update playback if sound is already set
    return this
  }

  /**
   * Apply rhythmic mask
   */
  mask(maskPattern: string): StrudelPattern {
    this._effects.mask = maskPattern
    return this
  }

  /**
   * Apply rhythmic structure from binary pattern
   */
  struct(binaryPattern: string): StrudelPattern {
    this._effects.struct = binaryPattern
    return this
  }

  /**
   * Set playback speed/pitch
   */
  speed(rate: number): StrudelPattern {
    this._effects.speed = Math.max(0.1, Math.min(4, rate))
    return this
  }

  /**
   * Reverse pattern
   */
  rev(): StrudelPattern {
    this._options.reverse = true
    return this
  }

  /**
   * Fast playback
   */
  fast(factor: number): StrudelPattern {
    this._effects.speed = (this._effects.speed || 1) * factor
    return this
  }

  /**
   * Slow playback
   */
  slow(factor: number): StrudelPattern {
    this._effects.speed = (this._effects.speed || 1) / factor
    return this
  }

  /**
   * Select the model used by this pattern's gen() chain.
   */
  model(modelName: string): StrudelPattern {
    this._generationModelName = modelName
    modelManager.setActiveModel(modelName)
    return this
  }

  /**
   * Set generation temperature for this pattern.
   */
  temperature(value: number): StrudelPattern {
    this._generationTemperature = value
    return this
  }

  /**
   * Generate a new phrase from this note pattern.
   */
  gen(): StrudelPattern {
    const modelName = this._generationModelName || modelManager.getActiveModelName()
    const model = modelManager.createModelInstance(modelName)
    if (this._generationTemperature !== undefined) {
      model.temperature(this._generationTemperature)
    }
    this._generationModel = model.gen(this.getPattern())
    return this
  }

  /**
   * Write generated data back into the editor.
   */
  output(...notes: any[]): GennyPattern | any[] {
    if (!this._generationModel) {
      this.gen()
    }
    return this._generationModel!.output(...notes)
  }

  // === Auto-playback methods ===

  /**
   * 手動でパターンを再生（並列発音対応）
   */
  play(options: { loop?: boolean, parallel?: boolean } = {}): StrudelPattern {
    const store = useGennyStore.getState()
    store.addLog({
      level: 'info',
      message: `▶️ ${this._sound} (${this._pattern.length} events)`
    })

    // Apply effects to pattern and play
    const processedPattern = this.applyEffects(this._pattern)
    
    // Use Strudel Audio Engine directly
    const strudelAudioEngine = (globalThis as any).strudelAudioEngine
    if (strudelAudioEngine) {
      strudelAudioEngine.playGennyPattern(processedPattern, { 
        loop: options.loop ?? true,
        soundName: this._sound,
        volume: this._effects.gain ?? 0.8, // 元の音量設定を使用
        allowParallel: options.parallel ?? false,
        replaceExisting: !options.parallel
      })
    }
    return this
  }

  /**
   * Automatically start playback when sound is set (並列発音対応)
   */
  private autoPlay(): void {
    const store = useGennyStore.getState()
    store.addLog({
      level: 'info',
      message: `🎵 ${this._sound} (${this._pattern.length} events)`
    })

    // Apply effects to pattern and play immediately
    const processedPattern = this.applyEffects(this._pattern)
    
    // Use Strudel Audio Engine directly
    const strudelAudioEngine = (globalThis as any).strudelAudioEngine
    if (strudelAudioEngine) {
      // 並列発音対応: 常にユニークIDを生成
      strudelAudioEngine.playGennyPattern(processedPattern, { 
        loop: true,
        soundName: this._sound,
        volume: this._effects.gain ?? 0.8, // 元の音量設定を使用
        allowParallel: true, // 並列発音を許可
        replaceExisting: false // 既存パターンを置き換えない
      })
    }
  }

  /**
   * Generate a hash for pattern identification
   */
  private generatePatternHash(pattern: GennyPattern, sound: string): string {
    // Create a simple hash based on pattern content
    const patternString = pattern.map(([t, p, v]) => `${t}:${p}:${v}`).join('|')
    const effectsString = JSON.stringify(this._effects)
    const combined = `${patternString}_${sound}_${effectsString}`
    
    // Simple hash function
    let hash = 0
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(36).substring(0, 8)
  }

  /**
   * Apply effects to pattern
   */
  private applyEffects(pattern: GennyPattern): GennyPattern {
    let result = [...pattern]
    
    // Apply reverse
    if (this._options.reverse) {
      result = result.reverse()
    }
    
    // Apply speed change (modify timing)
    if (this._effects.speed && this._effects.speed !== 1) {
      result = result.map(([timeCode, pitch, velocity]) => {
        const [bars, beats, ticks] = timeCode.split(':').map(Number)
        const totalTicks = bars * 1920 + beats * 480 + ticks
        const newTotalTicks = Math.floor(totalTicks / this._effects.speed)
        const newBars = Math.floor(newTotalTicks / 1920)
        const newBeats = Math.floor((newTotalTicks % 1920) / 480)
        const newTicks = newTotalTicks % 480
        return [`${newBars}:${newBeats}:${newTicks}`, pitch, velocity] as [string, number, number]
      })
    }
    
    // Apply struct (rhythmic structure)
    if (this._effects.struct) {
      result = this.applyStruct(result, this._effects.struct)
    }
    
    return result
  }

  /**
   * Apply binary structure to pattern
   */
  private applyStruct(pattern: GennyPattern, struct: string): GennyPattern {
    const structArray = struct.split('').map(c => c === '1')
    const result: GennyPattern = []
    
    pattern.forEach(([timeCode, pitch, velocity], index) => {
      const structIndex = index % structArray.length
      if (structArray[structIndex]) {
        result.push([timeCode, pitch, velocity])
      }
    })
    
    return result
  }

  // === Getter methods ===

  /**
   * Get the processed pattern
   */
  getPattern(): GennyPattern {
    return this.applyEffects(this._pattern)
  }

  /**
   * Get pattern data for compatibility
   */
  get data(): GennyPattern {
    return this.getPattern()
  }
}

/**
 * Global note function (Strudel-style)
 */
export function createNote(pattern: GennyPattern | PatternContainer | string): StrudelPattern {
  return new StrudelPattern(pattern)
}

/**
 * Stack multiple patterns
 */
export function stack(...patterns: (StrudelPattern | SoundPattern | GennyPattern)[]): StrudelPattern {
  const combinedPattern: GennyPattern = []
  
  patterns.forEach(pattern => {
    const patternData = pattern instanceof StrudelPattern || pattern instanceof SoundPattern
      ? pattern.getPattern()
      : pattern
    combinedPattern.push(...patternData)
  })
  
  return new StrudelPattern(combinedPattern)
}
