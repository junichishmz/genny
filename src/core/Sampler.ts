/**
 * Sampler for Genny 2.0
 * Handles sample loading, management, and playback
 */

import soundManager from './SoundManager'
import sampleLoader from './SampleLoader'
import { getSamplesConfig } from '../config/samples.config'

export interface SampleMap {
  [key: string]: string | string[] | SampleMap
}

export interface SampleInfo {
  url: string
  name: string
  bank?: string
  pitch?: number
}

export class Sampler {
  private static instance: Sampler
  private sampleMaps: Map<string, SampleMap> = new Map()
  private baseUrl: string
  private config = getSamplesConfig()
  
  private constructor() {
    this.baseUrl = this.config.baseUrl
  }
  
  static getInstance(): Sampler {
    if (!Sampler.instance) {
      Sampler.instance = new Sampler()
    }
    return Sampler.instance
  }
  
  /**
   * Register a sample bank
   */
  async registerSampleBank(
    bankName: string, 
    sampleMap: SampleMap, 
    baseUrl?: string
  ): Promise<void> {
    this.sampleMaps.set(bankName, sampleMap)
    const url = baseUrl || this.baseUrl + bankName + '/'
    
    // Process and register each sample
    await this.processSampleMap(bankName, sampleMap, url)
  }
  
  /**
   * Process a sample map recursively
   */
  private async processSampleMap(
    prefix: string,
    sampleMap: SampleMap,
    baseUrl: string
  ): Promise<void> {
    for (const [key, value] of Object.entries(sampleMap)) {
      const soundName = prefix ? `${prefix}_${key}` : key
      
      if (typeof value === 'string') {
        // Single sample
        await this.registerSample(soundName, baseUrl + value)
      } else if (Array.isArray(value)) {
        // Multiple samples (for velocity layers or round-robin)
        if (value.length > 0) {
          // For now, just use the first sample
          await this.registerSample(soundName, baseUrl + value[0])
        }
      } else if (typeof value === 'object') {
        // Nested sample map
        await this.processSampleMap(soundName, value, baseUrl)
      }
    }
  }
  
  /**
   * Register a single sample
   */
  private async registerSample(name: string, url: string): Promise<void> {
    soundManager.registerSound(name, {
      type: 'sample',
      source: url,
      metadata: { url }
    })
  }
  
  /**
   * Register a sample using SampleLoader (deprecated - use SampleLoader directly)
   */
  private async registerSampleFromDirectory(soundName: string): Promise<void> {
    // This method is now deprecated - SampleLoader handles this better
    console.warn(`registerSampleFromDirectory(${soundName}) is deprecated. Use SampleLoader instead.`)
    
    // Try to get from SampleLoader first
    if (sampleLoader.hasSample(soundName)) {
      const variant = sampleLoader.getSampleVariant(soundName, 0)
      if (variant) {
        await this.registerSample(soundName, variant)
        return
      }
    }
    
    throw new Error(`Sample ${soundName} not found in sample library`)
  }
  
  /**
   * Load default sample banks
   */
  async loadDefaultBanks(): Promise<void> {
    // Use the new SampleLoader to load from strudel.json
    await sampleLoader.loadDefaultSamples()
    
    // Create aliases for common drum sounds
    this.createAliases()
    
  }
  
  /**
   * Register individual sound folders (deprecated - SampleLoader handles this)
   */
  private async registerIndividualSounds(): Promise<void> {
    // This method is now deprecated - SampleLoader handles sample registration
    console.warn('registerIndividualSounds() is deprecated. SampleLoader handles this automatically.')
  }
  
  /**
   * Register 808 bank from 808 folder (deprecated - SampleLoader handles this)
   */
  private async register808Bank(): Promise<void> {
    // This method is now deprecated - SampleLoader handles bank registration
    console.warn('register808Bank() is deprecated. SampleLoader handles this automatically.')
  }
  
  /**
   * Create aliases for common sample names
   */
  private createAliases(): void {
    // Common aliases for drum sounds
    const commonAliases: Record<string, string> = {
      'kick': 'bd',
      'snare': 'sd', 
      'hihat': 'hh',
      'openhat': 'oh',
      'clap': 'cp',
      'crash': 'cr',
      'ride': 'rd'
    }
    
    // Create aliases if the original sounds exist
    for (const [alias, original] of Object.entries(commonAliases)) {
      if (sampleLoader.hasSample(original)) {
        const sound = soundManager.getSound(original)
        if (sound) {
          soundManager.registerSound(alias, {
            type: sound.type,
            source: sound.source,
            onTrigger: sound.onTrigger,
            metadata: { ...sound.metadata, alias: true, original }
          })
        }
      }
    }
    
  }
  
  /**
   * Get sample info by name
   */
  getSampleInfo(name: string): SampleInfo | null {
    const sound = soundManager.getSound(name)
    if (!sound || sound.type !== 'sample') {
      return null
    }
    
    return {
      url: sound.source as string,
      name: sound.name,
      bank: sound.metadata?.bank,
      pitch: sound.metadata?.pitch
    }
  }
  
  /**
   * List all available samples
   */
  listSamples(): string[] {
    return soundManager.listSounds().filter(name => {
      const sound = soundManager.getSound(name)
      return sound && sound.type === 'sample'
    })
  }
  
  /**
   * List samples in a specific bank
   */
  listBankSamples(bankName: string): string[] {
    return this.listSamples().filter(name => 
      name.startsWith(bankName + '_')
    )
  }
}

// Singleton instance
const sampler = Sampler.getInstance()
export default sampler
