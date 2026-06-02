/**
 * SampleLoader for Genny 2.0
 * Handles loading samples from strudel.json format
 */

import soundManager from './SoundManager'
import { getSamplesConfig, getStrudelJsonUrl, BASIC_SAMPLES } from '../config/samples.config'

export interface StrudelSampleMap {
  [key: string]: string | string[] | StrudelSampleMap | undefined
  _base?: string
}

export interface SampleMapping {
  name: string
  paths: string[]
  baseUrl: string
}

export class SampleLoader {
  private static instance: SampleLoader
  private baseUrl: string
  private sampleMappings: Map<string, SampleMapping> = new Map()
  private config = getSamplesConfig()
  
  private constructor() {
    this.baseUrl = this.config.baseUrl
  }
  
  static getInstance(): SampleLoader {
    if (!SampleLoader.instance) {
      SampleLoader.instance = new SampleLoader()
    }
    return SampleLoader.instance
  }
  
  /**
   * Load samples from a strudel.json format
   */
  async loadSamplesFromJson(jsonPath: string): Promise<void> {
    try {
      const response = await fetch(jsonPath)
      const sampleMap: StrudelSampleMap = await response.json()
      
      // Extract base URL if provided
      const baseUrl = sampleMap._base || this.baseUrl
      
      // Process all samples in the map
      await this.processSampleMap('', sampleMap, baseUrl)
      
    } catch (error) {
      console.error(`Failed to load samples from ${jsonPath}:`, error)
      throw error
    }
  }
  
  /**
   * Process a sample map recursively
   */
  async processSampleMap(
    prefix: string,
    sampleMap: StrudelSampleMap,
    baseUrl: string
  ): Promise<void> {
    for (const [key, value] of Object.entries(sampleMap)) {
      // Skip special keys
      if (key.startsWith('_')) {
        continue
      }
      
      const sampleName = prefix ? `${prefix}_${key}` : key
      
      if (typeof value === 'string') {
        // Single sample
        this.registerSampleMapping(sampleName, [value], baseUrl)
      } else if (Array.isArray(value)) {
        // Multiple samples
        this.registerSampleMapping(sampleName, value, baseUrl)
      } else if (typeof value === 'object') {
        // Nested sample map
        await this.processSampleMap(sampleName, value, baseUrl)
      }
    }
  }
  
  /**
   * Register a sample mapping (without immediately loading audio)
   */
  private registerSampleMapping(
    name: string,
    paths: string[],
    baseUrl: string
  ): void {
    this.sampleMappings.set(name, {
      name,
      paths,
      baseUrl
    })
    
    // Register with SoundManager for lazy loading
    soundManager.registerSound(name, {
      type: 'sample',
      source: `${baseUrl}${paths[0]}`, // Default to first sample
      metadata: {
        sampleCount: paths.length,
        allPaths: paths.map(path => `${baseUrl}${path}`),
        baseUrl,
        isStrudelSample: true
      }
    })
  }
  
  /**
   * Get a specific sample variant by index
   */
  getSampleVariant(name: string, index: number = 0): string | null {
    const mapping = this.sampleMappings.get(name)
    if (!mapping) {
      return null
    }
    
    // Wrap around if index is too high
    const actualIndex = index % mapping.paths.length
    return `${mapping.baseUrl}${mapping.paths[actualIndex]}`
  }
  
  /**
   * Get all variants for a sample
   */
  getSampleVariants(name: string): string[] {
    const mapping = this.sampleMappings.get(name)
    if (!mapping) {
      return []
    }
    
    return mapping.paths.map(path => `${mapping.baseUrl}${path}`)
  }
  
  /**
   * Check if a sample exists
   */
  hasSample(name: string): boolean {
    return this.sampleMappings.has(name)
  }
  
  /**
   * Get the number of variants for a sample
   */
  getSampleCount(name: string): number {
    const mapping = this.sampleMappings.get(name)
    return mapping ? mapping.paths.length : 0
  }
  
  /**
   * List all available sample names
   */
  listSamples(): string[] {
    return Array.from(this.sampleMappings.keys())
  }
  
  /**
   * Get samples by category/prefix
   */
  getSamplesByPrefix(prefix: string): string[] {
    return this.listSamples().filter(name => name.startsWith(prefix))
  }
  
  /**
   * Load the default strudel.json file
   */
  async loadDefaultSamples(): Promise<void> {
    try {
      const strudelJsonUrl = getStrudelJsonUrl()
      await this.loadSamplesFromJson(strudelJsonUrl)
    } catch (error) {
      if (this.config.fallbackToBasicSamples) {
        console.warn('Could not load default strudel.json, falling back to basic samples')
        // Fallback to basic sample registration
        await this.loadBasicSamples()
      } else {
        throw error
      }
    }
  }
  
  /**
   * Fallback method to load basic samples if strudel.json fails
   */
  private async loadBasicSamples(): Promise<void> {
    for (const [name, paths] of Object.entries(BASIC_SAMPLES)) {
      this.registerSampleMapping(name, paths, this.baseUrl)
    }
    
  }
}

// Singleton instance
const sampleLoader = SampleLoader.getInstance()
export default sampleLoader
