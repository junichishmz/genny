/**
 * Sound Pattern for Genny 2.0
 * Provides Strudel-like pattern API with s() and bank() methods
 */

import bankManager from './BankManager'
import soundManager from './SoundManager'
import strudelAudioEngine from './StrudelAudioEngine'
import modelManager from './ModelManager'
import midiToDrumConverter from './MidiToDrumConverter'
import { GennyPattern, ModelInstance } from '../types/genny'

const debugSoundPatternLog = (..._args: unknown[]) => {}

export interface PatternOptions {
  loop?: boolean
  gain?: number
  speed?: number
  room?: number
  delay?: number
  pan?: number
  [key: string]: any
}

export class SoundPattern {
  private pattern: string
  private bankName: string | null = null
  private sampleIndex: string | null = null
  private options: PatternOptions = { loop: true }
  private patternId: string
  private isPlaying: boolean = false
  private loopTimeouts: Set<number> = new Set()
  private generationModel?: ModelInstance
  private generationModelName?: string
  private generationTemperature?: number
  private generationActive: boolean = false
  private seedPattern: string

  constructor(pattern: string) {
    this.pattern = pattern
    this.seedPattern = pattern
    this.patternId = `pattern_${Date.now()}_${Math.floor(Math.random() * 1000)}`

    // Auto-play like Strudel. If a gen()/output() chain has marked this pattern
    // for generation by the time the timeout fires, skip the seed playback — the
    // generation path drives playback of the generated rhythm instead.
    window.setTimeout(() => {
      if (this.generationActive) return
      this.play()
    }, 10)
  }
  
  /**
   * Set the bank for this pattern
   */
  bank(name: string): this {
    this.bankName = name
    
    // Restart with new bank if already playing
    if (this.isPlaying) {
      this.stop()
      window.setTimeout(() => this.play(), 10)
    }
    return this
  }
  
  /**
   * Set the gain (volume)
   */
  gain(value: number): this {
    this.options.gain = value
    return this
  }
  
  /**
   * Set the playback speed
   */
  speed(value: number): this {
    this.options.speed = value
    return this
  }
  
  /**
   * Set room (reverb) amount
   */
  room(value: number): this {
    this.options.room = value
    return this
  }
  
  /**
   * Set delay amount
   */
  delay(value: number): this {
    this.options.delay = value
    return this
  }
  
  /**
   * Set pan (-1 to 1)
   */
  pan(value: number): this {
    this.options.pan = value
    return this
  }
  
  /**
   * Set sample index/indices for sample selection (Strudel-compatible)
   */
  n(indices: string | number): this {
    this.sampleIndex = indices.toString()
    
    // Restart with new sample indices if already playing
    if (this.isPlaying) {
      this.stop()
      window.setTimeout(() => this.play(), 10)
    }
    return this
  }
  
  /**
   * Set loop mode
   */
  loop(value: boolean = true): this {
    this.options.loop = value
    return this
  }

  /**
   * Select the model used by this pattern's gen() chain.
   */
  model(modelName: string): this {
    this.generationModelName = modelName
    modelManager.setActiveModel(modelName)
    return this
  }

  /**
   * Set generation temperature for this pattern.
   */
  temperature(value: number): this {
    this.generationTemperature = value
    return this
  }

  /**
   * Generate a new rhythm from this mini-notation pattern.
   *
   * Unlike a bare s(...), the generated sequence replaces the seed: once
   * generation completes the original mini-notation loop is swapped out for the
   * generated rhythm (with the current bank applied) and that is what plays.
   */
  gen(): this {
    const modelName = this.generationModelName || modelManager.getActiveModelName()
    const model = modelManager.createModelInstance(modelName)
    if (this.generationTemperature !== undefined) {
      model.temperature(this.generationTemperature)
    }

    // We drive playback ourselves (so the bank is honoured); keep the model's
    // own oscillator-based output side effects from double-playing.
    model._suppressOutputSideEffects = true
    model._onGenerated = (generated: GennyPattern) => {
      this.applyGeneratedPattern(generated)
    }

    this.generationActive = true
    this.generationModel = model.gen(this.seedPattern)
    return this
  }

  /**
   * Swap the seed mini-notation for the generated rhythm and (re)start playback.
   */
  private applyGeneratedPattern(generated: GennyPattern): void {
    if (!generated || generated.length === 0) return

    // Derive step count from the generated pattern length (16th-note grid).
    const maxStep = generated.reduce((max, [timeCode]) => {
      const [measure = 0, beat = 0, subdivision = 0] = timeCode.split(':').map(Number)
      return Math.max(max, measure * 16 + beat * 4 + subdivision)
    }, 0)
    const stepCount = Math.max(16, Math.ceil((maxStep + 1) / 16) * 16)

    const drumPattern = midiToDrumConverter.convertToRegularPattern(generated, stepCount)
    if (!drumPattern || drumPattern.replace(/[~\s]/g, '').length === 0) return

    this.pattern = drumPattern

    // Restart so the generated rhythm (with the bank) replaces the seed loop.
    this.stop()
    window.setTimeout(() => this.play(), 10)
  }

  /**
   * Write generated data back into the editor, keeping mini notation for s(...).
   *
   * output() makes the generated rhythm explicit (injected into the editor);
   * playback is still driven by gen()'s _onGenerated hook so the bank is honoured.
   */
  output(...notes: any[]): GennyPattern | any[] {
    // Explicit mini-notation: this is the canonical (already generated) rhythm
    // persisted into the editor. Play it through our bank-aware loop instead of
    // the seed and skip the model's oscillator-based playback.
    if (notes.length === 1 && typeof notes[0] === 'string') {
      const generatedNotation = notes[0] as string
      this.generationActive = true

      // The explicit notation is authoritative — cancel any pending gen()
      // playback so it doesn't race the explicit rhythm.
      if (this.generationModel) {
        this.generationModel._onGenerated = undefined
      }

      this.pattern = generatedNotation
      this.stop()
      window.setTimeout(() => this.play(), 10)
      return modelManager.parseNotesToGennyPattern(generatedNotation)
    }

    if (!this.generationModel) {
      this.gen()
    }
    return this.generationModel!.output(...notes)
  }

  /**
   * Expose the phrase as a GennyPattern for stack(...) and generation.
   */
  getPattern(): GennyPattern {
    return modelManager.parseNotesToGennyPattern(this.pattern)
  }
  
  /**
   * Play the pattern
   */
  async play(): Promise<void> {
    if (this.isPlaying) {
      this.stop()
    }
    
    this.isPlaying = true
    
    // Apply bank to pattern if specified
    const processedPattern = this.bankName 
      ? bankManager.applyBankToPattern(this.pattern, this.bankName)
      : this.pattern
    
    // Playing sound pattern with bank
    
    // Start the pattern loop
    this.startPatternLoop(processedPattern)
    
    // Apply additional effects if specified
    if (this.options.room || this.options.delay || this.options.pan) {
      debugSoundPatternLog('Effects:', {
        room: this.options.room,
        delay: this.options.delay,
        pan: this.options.pan
      })
    }
  }
  
  /**
   * Start pattern loop
   */
  private startPatternLoop(pattern: string): void {
    const tokens = this.tokenizePattern(pattern)
    const stepDuration = 0.25 // 16th note at 120 BPM
    
    // Calculate pattern duration by counting actual steps (not repetitions)
    let stepCount = 0
    for (const token of tokens) {
      if (token === '[' || token === ']') {
        continue
      } else if (token === '~' || this.isSoundToken(token)) {
        stepCount++
      }
    }
    
    const patternDuration = stepCount * stepDuration
    
    // Play one iteration
    this.playSoundPattern(pattern)
    
    // Schedule next iteration if looping
    if (this.options.loop !== false) {
      const loopTimeout = window.setTimeout(() => {
        if (this.isPlaying) {
          this.startPatternLoop(pattern)
        }
      }, patternDuration * 1000)
      
      this.loopTimeouts.add(loopTimeout)
    }
  }
  
  /**
   * Play sound pattern directly using SoundManager
   */
  private async playSoundPattern(pattern: string): Promise<void> {
    const tokens = this.tokenizePattern(pattern)
    const audioContext = (globalThis as any).strudelAudioEngine?.audioContext
    
    if (!audioContext) {
      console.warn('Audio context not available')
      return
    }
    
    const startTime = audioContext.currentTime
    const stepDuration = 0.25 // 16th note at 120 BPM
    let stepIndex = 0
    
    for (const token of tokens) {
      if (token === '~') {
        // Rest - just advance step
        stepIndex++
      } else if (token === '[' || token === ']') {
        // Ignore brackets for now
        continue
      } else if (this.isSoundToken(token)) {
        // Parse sound with repetition and sample index
        const { sound, repetitions, sampleIndex } = this.parseSoundToken(token)
        
        if (repetitions > 1) {
          // Play repetitions within the current step
          const repDuration = stepDuration / repetitions
          for (let i = 0; i < repetitions; i++) {
            const playTime = startTime + (stepIndex * stepDuration) + (i * repDuration)
            this.scheduleSound(sound, playTime, sampleIndex, stepIndex)
          }
        } else {
          // Single sound
          const playTime = startTime + (stepIndex * stepDuration)
          this.scheduleSound(sound, playTime, sampleIndex, stepIndex)
        }
        
        stepIndex++
      }
    }
  }
  
  /**
   * Schedule a sound to play at a specific time
   */
  private scheduleSound(soundName: string, when: number, sampleIndex?: number, stepIndex?: number): void {
    const audioContext = (globalThis as any).strudelAudioEngine?.audioContext
    if (!audioContext) return
    
    const delay = Math.max(0, when - audioContext.currentTime)
    
    window.setTimeout(() => {
      this.playSound(soundName, sampleIndex, stepIndex)
    }, delay * 1000)
  }
  
  /**
   * Play a single sound using SoundManager
   */
  private playSound(soundName: string, sampleIndex?: number, stepIndex?: number): void {
    // Determine which sample variant to use
    let finalSoundName = soundName
    let actualSampleIndex = sampleIndex
    
    // If sampleIndex is provided via colon notation, use it
    // If n() method was used, calculate index for this step
    if (actualSampleIndex === undefined && this.sampleIndex) {
      const indices = this.sampleIndex.split(' ').map(s => parseInt(s.trim()) || 0)
      if (indices.length > 0 && stepIndex !== undefined) {
        // Use step index to cycle through the n() pattern
        actualSampleIndex = indices[stepIndex % indices.length]
      } else {
        actualSampleIndex = indices[0] || 0
      }
    }
    
    // Try to get the specific sample variant if index is provided
    if (actualSampleIndex !== undefined) {
      const sampleLoader = (globalThis as any).sampleLoader
      
      if (sampleLoader && sampleLoader.hasSample(soundName)) {
        const variant = sampleLoader.getSampleVariant(soundName, actualSampleIndex)
        if (variant) {
          // Create unique name for this variant
          const variantName = `${soundName}_var_${actualSampleIndex}`
          
          // Only register if not already registered
          if (!soundManager.hasSound(variantName)) {
            soundManager.registerSound(variantName, {
              type: 'sample',
              source: variant,
              metadata: { isVariant: true, originalSound: soundName, index: actualSampleIndex }
            })
          }
          finalSoundName = variantName
        }
      }
    }
    
    soundManager.playSound(finalSoundName, {
      gain: this.options.gain || 0.8,
      velocity: 1.0,
      duration: 1.0
    }).catch(error => {
      console.warn(`Failed to play sound ${finalSoundName}:`, error)
    })
  }
  
  /**
   * Stop the pattern
   */
  stop(): void {
    this.isPlaying = false
    
    // Clear all loop timeouts
    this.loopTimeouts.forEach(timeoutId => {
      try {
        clearTimeout(timeoutId)
      } catch (error) {
        console.warn('Error clearing timeout:', error)
      }
    })
    this.loopTimeouts.clear()
    
    // Also stop in StrudelAudioEngine if it was used
    try {
      strudelAudioEngine.stopPatternNamed(this.patternId)
    } catch (error) {
      console.warn('Error stopping in StrudelAudioEngine:', error)
    }
  }
  
  /**
   * Convert mini-notation pattern to GennyPattern format
   */
  private convertToGennyPattern(pattern: string): GennyPattern {
    const gennyPattern: GennyPattern = []
    const tokens = this.tokenizePattern(pattern)
    
    let currentBeat = 0
    const beatsPerBar = 4
    const ticksPerBeat = 480
    
    for (const token of tokens) {
      if (token === '~') {
        // Rest
        currentBeat++
      } else if (token === '[' || token === ']') {
        // Ignore brackets for now
        continue
      } else if (this.isSoundToken(token)) {
        // Parse sound with repetition and sample index
        const { sound, repetitions } = this.parseSoundToken(token)
        
        if (repetitions > 1) {
          // Distribute repetitions evenly
          const stepSize = 1 / repetitions
          for (let i = 0; i < repetitions; i++) {
            const beat = currentBeat + (i * stepSize)
            const bar = Math.floor(beat / beatsPerBar)
            const beatInBar = Math.floor(beat % beatsPerBar)
            const tick = Math.floor((beat % 1) * ticksPerBeat)
            
            const timeCode = `${bar}:${beatInBar}:${tick}`
            gennyPattern.push([timeCode, 60, 127]) // Default to MIDI note 60
          }
        } else {
          // Single sound
          const bar = Math.floor(currentBeat / beatsPerBar)
          const beatInBar = Math.floor(currentBeat % beatsPerBar)
          const tick = 0
          
          const timeCode = `${bar}:${beatInBar}:${tick}`
          gennyPattern.push([timeCode, 60, 127])
        }
        
        currentBeat++
      }
    }
    
    return gennyPattern
  }
  
  /**
   * Tokenize pattern string
   */
  private tokenizePattern(pattern: string): string[] {
    const tokens: string[] = []
    let current = ''
    let inBracket = 0
    
    for (let i = 0; i < pattern.length; i++) {
      const char = pattern[i]
      
      if (char === '[') {
        if (current.trim()) {
          tokens.push(current.trim())
          current = ''
        }
        tokens.push('[')
        inBracket++
      } else if (char === ']') {
        if (current.trim()) {
          tokens.push(current.trim())
          current = ''
        }
        tokens.push(']')
        inBracket--
      } else if (char === ' ' && inBracket === 0) {
        if (current.trim()) {
          tokens.push(current.trim())
          current = ''
        }
      } else if (char !== ' ' || inBracket > 0) {
        current += char
      }
    }
    
    if (current.trim()) {
      tokens.push(current.trim())
    }
    
    return tokens
  }
  
  /**
   * Check if token is a sound
   */
  private isSoundToken(token: string): boolean {
    if (!token || token === '~' || token === '[' || token === ']') {
      return false
    }
    
    // Extract base sound name (before *)
    const baseName = token.split('*')[0].trim()
    return baseName.length > 0
  }
  
  /**
   * Parse sound token with repetition syntax and sample index
   */
  private parseSoundToken(token: string): { sound: string, repetitions: number, sampleIndex?: number } {
    let sound = token.trim()
    let repetitions = 1
    let sampleIndex: number | undefined
    
    // Handle repetition syntax (bd*4)
    if (sound.includes('*')) {
      const parts = sound.split('*')
      sound = parts[0].trim()
      const repsStr = parts[1].trim()
      repetitions = parseInt(repsStr) || 1
    }
    
    // Handle colon notation (hh:2)
    if (sound.includes(':')) {
      const parts = sound.split(':')
      sound = parts[0].trim()
      const indexStr = parts[1].trim()
      sampleIndex = parseInt(indexStr) || 0
    }
    
    return { sound, repetitions, sampleIndex }
  }
  
  /**
   * Extract primary sound name from pattern
   */
  private extractPrimarySoundName(pattern: string): string {
    const tokens = this.tokenizePattern(pattern)
    for (const token of tokens) {
      if (this.isSoundToken(token)) {
        const { sound } = this.parseSoundToken(token)
        return sound
      }
    }
    return 'default'
  }
}

// Global pattern registry to prevent duplicates
const globalPatternRegistry = new Map<string, SoundPattern>()
let lastExecutionId = 0

/**
 * Clear patterns from previous execution
 */
export function clearPreviousExecution(): void {
  globalPatternRegistry.forEach(pattern => {
    pattern.stop()
  })
  globalPatternRegistry.clear()
  lastExecutionId++
}

/**
 * Global s() function for Strudel-like syntax
 */
export function s(pattern: string): SoundPattern {
  // Create a unique key for this pattern
  const patternKey = `${pattern}_exec${lastExecutionId}`
  
  // Create new pattern
  const newPattern = new SoundPattern(pattern)
  globalPatternRegistry.set(patternKey, newPattern)
  
  return newPattern
}

/**
 * Stop all active patterns
 */
export function stopAllPatterns(): void {
  globalPatternRegistry.forEach(pattern => {
    pattern.stop()
  })
  globalPatternRegistry.clear()
}

// Make s() function globally available
if (typeof window !== 'undefined') {
  (window as any).s = s
  ;(window as any).stopAllSounds = stopAllPatterns
}

// Also export as default for easier imports
export default s
