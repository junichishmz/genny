/**
 * ModelPattern Class - AI Model Integration for Genny2.0
 * Provides Strudel-style chaining for AI music generation
 */

import { GennyPattern } from '../types/genny'
import { useGennyStore } from '../store/gennyStore'

export class ModelPattern {
  private _modelName: string
  private _temperature: number = 0.5
  private _generatedPattern: GennyPattern | null = null
  private _isGenerating: boolean = false
  private _generationPromise: Promise<GennyPattern> | null = null

  constructor(modelName: string) {
    this._modelName = modelName
  }

  /**
   * Set temperature for generation
   */
  temperature(temp: number): ModelPattern {
    this._temperature = Math.max(0, Math.min(2, temp))
    return this
  }

  /**
   * Generate pattern using AI model
   */
  gen(): ModelPattern {
    if (this._isGenerating || this._generatedPattern) {
      return this
    }

    this._isGenerating = true
    this._generationPromise = this.performGeneration()
    
    return this
  }

  /**
   * Async generate method for compatibility with old API
   */
  async generate(): Promise<GennyPattern> {
    if (this._generatedPattern) {
      return this._generatedPattern
    }
    
    if (!this._generationPromise) {
      this._isGenerating = true
      this._generationPromise = this.performGeneration()
    }
    
    return await this._generationPromise
  }

  /**
   * Perform the actual AI generation
   */
  private async performGeneration(): Promise<GennyPattern> {
    const store = useGennyStore.getState()
    
    try {
      store.addLog({
        level: 'info',
        message: `🧠 Generating with ${this._modelName} (temp: ${this._temperature})`
      })

      // Mock generation for now - in real implementation, this would call AI models
      await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate generation time
      
      // Generate a simple pattern as placeholder
      const mockPattern: GennyPattern = [
        ["0:0:0", 60, 100],
        ["0:1:0", 64, 100], 
        ["0:2:0", 67, 100],
        ["0:3:0", 72, 100],
        ["1:0:0", 67, 100],
        ["1:1:0", 64, 100],
        ["1:2:0", 60, 100],
      ]

      // Add some randomness based on temperature
      const generatedPattern = mockPattern.map(([time, pitch, velocity]) => {
        const pitchVariation = Math.floor((Math.random() - 0.5) * this._temperature * 12)
        const newPitch = Math.max(20, Math.min(127, pitch + pitchVariation))
        return [time, newPitch, velocity] as [string, number, number]
      })

      this._generatedPattern = generatedPattern
      this._isGenerating = false

      // Update global pattern_gen variable for compatibility
      ;(globalThis as any).pattern_gen = {
        data: generatedPattern
      }

      store.addLog({
        level: 'success',
        message: `✅ Generated ${generatedPattern.length} events`
      })

      return generatedPattern

    } catch (error) {
      this._isGenerating = false
      
      store.addLog({
        level: 'error',
        message: `❌ Generation failed: ${error}`
      })

      // Return empty pattern on error
      this._generatedPattern = []
      return []
    }
  }

  /**
   * Get the generated pattern (synchronous)
   * Returns empty array if generation not complete
   */
  getPattern(): GennyPattern {
    if (this._generatedPattern) {
      return this._generatedPattern
    }
    
    // If generation is in progress, return empty pattern
    // In a real implementation, this might queue the playback
    if (this._isGenerating) {
      const store = useGennyStore.getState()
      store.addLog({
        level: 'warning',
        message: '⚠️ Pattern not ready, generation in progress...'
      })
    }
    
    return []
  }

  /**
   * Get pattern data for compatibility with StrudelPattern
   */
  get data(): GennyPattern {
    return this.getPattern()
  }

  /**
   * Check if generation is complete
   */
  get isReady(): boolean {
    return this._generatedPattern !== null && !this._isGenerating
  }

  /**
   * Check if generation is in progress
   */
  get isGenerating(): boolean {
    return this._isGenerating
  }

  /**
   * Get generation promise for async handling
   */
  get generationPromise(): Promise<GennyPattern> | null {
    return this._generationPromise
  }

  /**
   * Get model name
   */
  get modelName(): string {
    return this._modelName
  }

  /**
   * Get current temperature setting
   */
  get currentTemperature(): number {
    return this._temperature
  }
}

/**
 * Global model function (Strudel-style)
 */
export function createModel(modelName: string): ModelPattern {
  return new ModelPattern(modelName)
}