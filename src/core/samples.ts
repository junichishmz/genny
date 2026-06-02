/**
 * Global samples() function for Genny 2.0
 * Provides Strudel-compatible sample loading functionality
 */

import sampleLoader, { StrudelSampleMap } from './SampleLoader'
import { getSamplesConfig } from '../config/samples.config'

/**
 * Load samples from various sources (Strudel-compatible)
 * 
 * @param source - Can be:
 *   - URL to strudel.json file
 *   - Object with sample mappings
 *   - Special strings like 'github:user/repo' or 'shabda:...'
 * @param baseUrl - Optional base URL for relative paths
 */
export async function samples(
  source: string | StrudelSampleMap, 
  baseUrl?: string
): Promise<void> {
  try {
    if (typeof source === 'string') {
      // Handle special source formats
      if (source.startsWith('github:')) {
        await loadFromGitHub(source)
      } else if (source.startsWith('shabda:')) {
        await loadFromShabda(source)
      } else if (source.startsWith('http')) {
        // Direct URL to JSON file
        await sampleLoader.loadSamplesFromJson(source)
      } else {
        // Assume it's a relative path
        await sampleLoader.loadSamplesFromJson(source)
      }
    } else if (typeof source === 'object') {
      // Direct sample map object
      await loadFromObject(source, baseUrl)
    } else {
      throw new Error('Invalid source type for samples()')
    }
    
  } catch (error) {
    console.error('Failed to load samples:', error)
    throw error
  }
}

/**
 * Load samples from GitHub repository
 */
async function loadFromGitHub(githubSource: string): Promise<void> {
  const match = githubSource.match(/^github:([^/]+)\/([^/]+)(?:\/(.+))?$/)
  if (!match) {
    throw new Error('Invalid GitHub format. Use: github:user/repo or github:user/repo/branch')
  }
  
  const [, user, repo, branch = 'main'] = match
  const url = `https://raw.githubusercontent.com/${user}/${repo}/${branch}/strudel.json`
  
  await sampleLoader.loadSamplesFromJson(url)
}

/**
 * Load samples from Shabda (placeholder - requires actual Shabda API)
 */
async function loadFromShabda(shabdaSource: string): Promise<void> {
  console.warn('Shabda support is not yet implemented')
  // TODO: Implement Shabda API integration
  void shabdaSource
}

/**
 * Load samples from object
 */
async function loadFromObject(
  sampleMap: StrudelSampleMap, 
  baseUrl?: string
): Promise<void> {
  const config = getSamplesConfig()
  
  // If baseUrl is provided, add it to the sample map
  if (baseUrl && !sampleMap._base) {
    sampleMap._base = baseUrl
  }
  
  // Process the sample map using the existing sampleLoader instance
  await sampleLoader.processSampleMap('', sampleMap, sampleMap._base || config.baseUrl)
  
}

/**
 * List all currently loaded samples
 */
export function listSamples(): string[] {
  return sampleLoader.listSamples()
}

/**
 * Get samples by category/prefix
 */
export function getSamplesByCategory(category: string): string[] {
  return sampleLoader.getSamplesByPrefix(category)
}

/**
 * Check if a sample exists
 */
export function hasSample(name: string): boolean {
  return sampleLoader.hasSample(name)
}

/**
 * Get the number of variants for a sample
 */
export function getSampleCount(name: string): number {
  return sampleLoader.getSampleCount(name)
}

// Make functions globally available
if (typeof window !== 'undefined') {
  (window as any).samples = samples
  ;(window as any).listSamples = listSamples
  ;(window as any).getSamplesByCategory = getSamplesByCategory
  ;(window as any).hasSample = hasSample
  ;(window as any).getSampleCount = getSampleCount
}

// Default export
export default samples
