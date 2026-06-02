/**
 * Magenta.js Model Manager
 * Handles loading and interfacing with Magenta.js models (MusicVAE, MusicRNN)
 */

import type * as Magenta from '@magenta/music'
import { NoteSequence, GennyPattern } from '../types/genny'
import { useGennyStore } from '../store/gennyStore'
import { withMutedExternalLogs } from '../utils/quietExternalLogs'

const debugMagentaLog = (..._args: unknown[]) => {}
type MusicVAE = Magenta.MusicVAE
type MusicRNN = Magenta.MusicRNN

export class MagentaModelManager {
  private static instance: MagentaModelManager
  private magentaModule: typeof Magenta | null = null
  private musicVAEModels: Map<string, MusicVAE> = new Map()
  private musicRNNModels: Map<string, MusicRNN> = new Map()
  private loadingPromises: Map<string, Promise<any>> = new Map()

  private constructor() {}

  static getInstance(): MagentaModelManager {
    if (!MagentaModelManager.instance) {
      MagentaModelManager.instance = new MagentaModelManager()
    }
    return MagentaModelManager.instance
  }

  /**
   * Load a MusicVAE model
   */
  async loadMusicVAE(checkpoint: string): Promise<MusicVAE> {
    // Check if already loaded
    if (this.musicVAEModels.has(checkpoint)) {
      return this.musicVAEModels.get(checkpoint)!
    }

    // Check if already loading
    if (this.loadingPromises.has(checkpoint)) {
      return this.loadingPromises.get(checkpoint)
    }

    // Start loading
    const loadingPromise = this._loadMusicVAE(checkpoint)
    this.loadingPromises.set(checkpoint, loadingPromise)

    try {
      const model = await loadingPromise
      this.musicVAEModels.set(checkpoint, model)
      this.loadingPromises.delete(checkpoint)
      return model
    } catch (error) {
      this.loadingPromises.delete(checkpoint)
      throw error
    }
  }

  private async _loadMusicVAE(checkpoint: string): Promise<MusicVAE> {
    debugMagentaLog(`🎼 Loading MusicVAE model: ${checkpoint}`)
    const store = useGennyStore.getState()
    
    store.addLog({
      level: 'info',
      message: `🎼 Loading MusicVAE model...`
    })

    try {
      const mm = await this.getMagenta()
      const model = new mm.MusicVAE(checkpoint)
      await withMutedExternalLogs(() => model.initialize())
      
      debugMagentaLog(`✅ MusicVAE model loaded: ${checkpoint}`)
      store.addLog({
        level: 'info',
        message: `✅ MusicVAE model loaded successfully`
      })
      
      return model
    } catch (error) {
      console.error('Failed to load MusicVAE model:', error)
      store.addLog({
        level: 'error',
        message: `Failed to load MusicVAE model: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
      throw error
    }
  }

  /**
   * Load a MusicRNN model
   */
  async loadMusicRNN(checkpoint: string): Promise<MusicRNN> {
    // Check if already loaded
    if (this.musicRNNModels.has(checkpoint)) {
      return this.musicRNNModels.get(checkpoint)!
    }

    // Check if already loading
    if (this.loadingPromises.has(checkpoint)) {
      return this.loadingPromises.get(checkpoint)
    }

    // Start loading
    const loadingPromise = this._loadMusicRNN(checkpoint)
    this.loadingPromises.set(checkpoint, loadingPromise)

    try {
      const model = await loadingPromise
      this.musicRNNModels.set(checkpoint, model)
      this.loadingPromises.delete(checkpoint)
      return model
    } catch (error) {
      this.loadingPromises.delete(checkpoint)
      throw error
    }
  }

  private async _loadMusicRNN(checkpoint: string): Promise<MusicRNN> {
    debugMagentaLog(`🎼 Loading MusicRNN model: ${checkpoint}`)
    const store = useGennyStore.getState()
    
    store.addLog({
      level: 'info',
      message: `🎼 Loading MusicRNN model...`
    })

    try {
      const mm = await this.getMagenta()
      const model = new mm.MusicRNN(checkpoint)
      await withMutedExternalLogs(() => model.initialize())
      
      debugMagentaLog(`✅ MusicRNN model loaded: ${checkpoint}`)
      store.addLog({
        level: 'info',
        message: `✅ MusicRNN model loaded successfully`
      })
      
      return model
    } catch (error) {
      console.error('Failed to load MusicRNN model:', error)
      store.addLog({
        level: 'error',
        message: `Failed to load MusicRNN model: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
      throw error
    }
  }

  /**
   * Generate using temperature sampling (no input)
   */
  async sampleFromMusicVAE(
    model: MusicVAE,
    temperature: number,
    stepsPerQuarter: number = 4
  ): Promise<NoteSequence> {
    debugMagentaLog(`🎲 Sampling from MusicVAE with temperature=${temperature}`)
    
    try {
      const samples = await withMutedExternalLogs(() =>
        model.sample(1, temperature, undefined, stepsPerQuarter),
      )
      return samples[0] as NoteSequence
    } catch (error) {
      console.error('MusicVAE sampling failed:', error)
      throw error
    }
  }

  /**
   * Generate similar sequences
   */
  async generateSimilar(
    model: MusicVAE,
    inputSequence: NoteSequence,
    temperature: number,
    similarity: number = 0.5
  ): Promise<NoteSequence> {
    debugMagentaLog(`🎲 Generating similar with temperature=${temperature}, similarity=${similarity}`)
    
    try {
      const samples = await withMutedExternalLogs(() =>
        model.similar(inputSequence, 1, similarity, temperature),
      )
      return samples[0] as NoteSequence
    } catch (error) {
      console.error('MusicVAE similar generation failed:', error)
      throw error
    }
  }

  /**
   * Interpolate between two sequences
   */
  async interpolate(
    model: MusicVAE,
    startSequence: NoteSequence,
    endSequence: NoteSequence,
    numInterpolations: number,
    temperature?: number
  ): Promise<NoteSequence[]> {
    debugMagentaLog(`🎲 Interpolating between sequences with ${numInterpolations} steps`)
    
    try {
      return await withMutedExternalLogs(() =>
        model.interpolate(
          [startSequence, endSequence],
          numInterpolations,
          temperature,
        ),
      ) as NoteSequence[]
    } catch (error) {
      console.error('MusicVAE interpolation failed:', error)
      throw error
    }
  }

  /**
   * Continue a sequence using MusicRNN
   */
  async continueSequence(
    model: MusicRNN,
    inputSequence: NoteSequence,
    steps: number,
    temperature: number
  ): Promise<NoteSequence> {
    debugMagentaLog(`🎲 Continuing sequence with MusicRNN, steps=${steps}, temperature=${temperature}`)
    
    try {
      return await withMutedExternalLogs(() =>
        model.continueSequence(inputSequence, steps, temperature),
      ) as NoteSequence
    } catch (error) {
      console.error('MusicRNN continuation failed:', error)
      throw error
    }
  }

  /**
   * Convert Magenta NoteSequence to GennyPattern
   * Enhanced for Strudel mini-notation compatibility
   */
  magentaToGennyPattern(noteSequence: NoteSequence): GennyPattern {
    const pattern: GennyPattern = []
    
    if (!noteSequence.notes || noteSequence.notes.length === 0) {
      console.warn('Empty or invalid note sequence from Magenta')
      // Return a simple fallback pattern
      return [['0:0:0', 60, 100]]
    }
    
    // Sort notes by start time for proper sequencing
    const sortedNotes = [...noteSequence.notes].sort((a, b) => {
      const aStart = a.quantizedStartStep || 0
      const bStart = b.quantizedStartStep || 0
      return aStart - bStart
    })
    
    const stepsPerQuarter = noteSequence.quantizationInfo?.stepsPerQuarter || 4
    debugMagentaLog(`🎵 Converting ${sortedNotes.length} notes from Magenta (stepsPerQuarter: ${stepsPerQuarter})`)
    
    sortedNotes.forEach((note, index) => {
      // Validate note data
      if (!note.pitch || note.pitch < 0 || note.pitch > 127) {
        console.warn(`Invalid pitch in note ${index}: ${note.pitch}`)
        return
      }
      
      const startStep = Math.max(0, note.quantizedStartStep || 0)
      
      // Convert Magenta quantized steps to Genny timeCode format
      // 16分音符単位から measure:beat:subdivision への変換
      const measures = Math.floor(startStep / (stepsPerQuarter * 4))
      const remainingSteps = startStep % (stepsPerQuarter * 4)
      const beats = Math.floor(remainingSteps / stepsPerQuarter)
      const subdivision = remainingSteps % stepsPerQuarter
      
      const timeCode = `${measures}:${beats}:${subdivision}`
      const pitch = Math.round(note.pitch)
      
      // ベロシティの正規化 (Magentaは0-127, Gennyも0-127で互換性)
      let velocity = note.velocity || 80
      if (velocity < 1) velocity = 80 // 最低値保証
      velocity = Math.max(1, Math.min(127, Math.round(velocity)))
      
      pattern.push([timeCode, pitch, velocity])
    })
    
    if (pattern.length === 0) {
      console.warn('No valid notes could be converted from Magenta output')
      return [['0:0:0', 60, 100]] // Fallback
    }
    
    debugMagentaLog(`✅ Converted to ${pattern.length} Genny notes`)
    return pattern
  }

  /**
   * Get loaded models info
   */
  getLoadedModels() {
    return {
      musicVAE: Array.from(this.musicVAEModels.keys()),
      musicRNN: Array.from(this.musicRNNModels.keys())
    }
  }

  /**
   * Clear all loaded models
   */
  clearModels() {
    this.musicVAEModels.clear()
    this.musicRNNModels.clear()
    this.loadingPromises.clear()
  }

  private async getMagenta(): Promise<typeof Magenta> {
    if (!this.magentaModule) {
      this.magentaModule = await withMutedExternalLogs(() => import('@magenta/music'))
    }
    return this.magentaModule
  }
}

// Singleton instance
const magentaModelManager = MagentaModelManager.getInstance()

export default magentaModelManager
