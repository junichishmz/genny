/**
 * Sound Manager for Genny 2.0
 * Manages sound registration, loading, and playback
 */

export type SoundType = 'sample' | 'synth' | 'soundfont'

export interface SoundDefinition {
  name: string
  type: SoundType
  source?: string | AudioBuffer
  onTrigger?: (context: AudioContext, params: SoundParams) => AudioNode
  metadata?: Record<string, any>
}

export interface SoundParams {
  pitch?: number
  velocity?: number
  duration?: number
  gain?: number
  pan?: number
  [key: string]: any
}

export class SoundManager {
  private static instance: SoundManager
  private soundMap: Map<string, SoundDefinition> = new Map()
  private audioBufferCache: Map<string, AudioBuffer> = new Map()
  private audioContext: AudioContext | null = null
  
  private constructor() {}
  
  static getInstance(): SoundManager {
    if (!SoundManager.instance) {
      SoundManager.instance = new SoundManager()
    }
    return SoundManager.instance
  }
  
  /**
   * Initialize with AudioContext
   */
  initialize(audioContext: AudioContext): void {
    this.audioContext = audioContext
    this.registerDefaultSounds()
  }
  
  /**
   * Register a sound
   */
  registerSound(name: string, definition: Omit<SoundDefinition, 'name'>): void {
    this.soundMap.set(name, { name, ...definition })
  }

  registerGennyDemoSamples(): void {
    const demoSamples: Record<string, string> = {
      bd: 'kick_deep.wav',
      kick: 'kick.wav',
      sn: 'snare.wav',
      sd: 'snare.wav',
      snare: 'snare.wav',
      hh: 'closehat.wav',
      hihat: 'closehat.wav',
      oh: 'open.wav',
      openhat: 'open.wav',
      cp: 'clap.wav',
      clap: 'clap.wav',
      rim: 'rim.wav',
      lt: 'tom.wav',
      mt: 'tom.wav',
      ht: 'tom.wav',
      tom: 'tom.wav'
    }

    Object.entries(demoSamples).forEach(([name, fileName]) => {
      this.registerSound(name, {
        type: 'sample',
        source: `/samples/genny-demo/${fileName}`,
        metadata: {
          sourceSet: 'genny-demo',
          originalFile: fileName
        }
      })
    })
  }
  
  /**
   * Get a sound definition
   */
  getSound(name: string): SoundDefinition | undefined {
    return this.soundMap.get(name)
  }
  
  /**
   * Check if a sound exists
   */
  hasSound(name: string): boolean {
    return this.soundMap.has(name)
  }
  
  /**
   * Load an audio file and cache it
   */
  async loadAudioBuffer(url: string): Promise<AudioBuffer> {
    if (this.audioBufferCache.has(url)) {
      return this.audioBufferCache.get(url)!
    }
    
    if (!this.audioContext) {
      throw new Error('AudioContext not initialized')
    }
    
    try {
      const response = await fetch(url)
      const arrayBuffer = await response.arrayBuffer()
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer)
      
      this.audioBufferCache.set(url, audioBuffer)
      return audioBuffer
    } catch (error) {
      console.error(`Failed to load audio file: ${url}`, error)
      throw error
    }
  }
  
  /**
   * Register default synthesizer sounds
   */
  private registerDefaultSounds(): void {
    // Basic oscillator synths
    const oscillatorTypes: OscillatorType[] = ['sine', 'square', 'sawtooth', 'triangle']
    
    oscillatorTypes.forEach(type => {
      this.registerSound(type, {
        type: 'synth',
        onTrigger: (context, params) => {
          const oscillator = context.createOscillator()
          const gainNode = context.createGain()
          
          oscillator.type = type
          const frequency = this.midiToFrequency(params.pitch || 60)
          oscillator.frequency.setValueAtTime(frequency, context.currentTime)
          
          const gain = (params.gain ?? 0.5) * (params.velocity ?? 1.0)
          gainNode.gain.setValueAtTime(gain, context.currentTime)
          
          if (params.duration) {
            gainNode.gain.setValueAtTime(gain, context.currentTime)
            gainNode.gain.exponentialRampToValueAtTime(
              0.001, 
              context.currentTime + params.duration
            )
            oscillator.stop(context.currentTime + params.duration)
          }
          
          oscillator.connect(gainNode)
          oscillator.start(context.currentTime)
          
          return gainNode
        }
      })
    })
    
    // White noise
    this.registerSound('noise', {
      type: 'synth',
      onTrigger: (context, params) => {
        const bufferSize = context.sampleRate * (params.duration || 0.1)
        const buffer = context.createBuffer(1, bufferSize, context.sampleRate)
        const data = buffer.getChannelData(0)
        
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1
        }
        
        const source = context.createBufferSource()
        const gainNode = context.createGain()
        
        source.buffer = buffer
        const gain = (params.gain ?? 0.5) * (params.velocity ?? 1.0)
        gainNode.gain.setValueAtTime(gain, context.currentTime)
        
        if (params.duration) {
          gainNode.gain.exponentialRampToValueAtTime(
            0.001, 
            context.currentTime + params.duration
          )
          source.stop(context.currentTime + params.duration)
        }
        
        source.connect(gainNode)
        source.start(context.currentTime)
        
        return gainNode
      }
    })

    const registerDrum = (name: string, kind: 'kick' | 'snare' | 'hat' | 'clap') => {
      this.registerSound(name, {
        type: 'synth',
        onTrigger: (context, params) => {
          const now = context.currentTime
          const output = context.createGain()
          const gain = (params.gain ?? 0.8) * (params.velocity ?? 1)
          output.gain.setValueAtTime(gain, now)

          if (kind === 'kick') {
            const oscillator = context.createOscillator()
            const body = context.createGain()
            oscillator.type = 'sine'
            oscillator.frequency.setValueAtTime(150, now)
            oscillator.frequency.exponentialRampToValueAtTime(45, now + 0.18)
            body.gain.setValueAtTime(1, now)
            body.gain.exponentialRampToValueAtTime(0.001, now + 0.22)
            oscillator.connect(body)
            body.connect(output)
            oscillator.start(now)
            oscillator.stop(now + 0.24)
          } else {
            const duration = kind === 'hat' ? 0.05 : kind === 'clap' ? 0.16 : 0.12
            const buffer = context.createBuffer(1, context.sampleRate * duration, context.sampleRate)
            const data = buffer.getChannelData(0)
            for (let i = 0; i < data.length; i++) {
              data[i] = (Math.random() * 2 - 1) * (1 - i / data.length)
            }

            const source = context.createBufferSource()
            const filter = context.createBiquadFilter()
            const envelope = context.createGain()
            source.buffer = buffer
            filter.type = kind === 'hat' ? 'highpass' : 'bandpass'
            filter.frequency.setValueAtTime(kind === 'hat' ? 7000 : 1800, now)
            filter.Q.setValueAtTime(kind === 'clap' ? 0.8 : 1.2, now)
            envelope.gain.setValueAtTime(1, now)
            envelope.gain.exponentialRampToValueAtTime(0.001, now + duration)
            source.connect(filter)
            filter.connect(envelope)
            envelope.connect(output)
            source.start(now)
            source.stop(now + duration)
          }

          return output
        }
      })
    }

    const drumAliases: Record<string, 'kick' | 'snare' | 'hat' | 'clap'> = {
      bd: 'kick',
      kick: 'kick',
      '808bd': 'kick',
      sn: 'snare',
      sd: 'snare',
      snare: 'snare',
      '808sd': 'snare',
      hh: 'hat',
      hihat: 'hat',
      '808hc': 'hat',
      oh: 'hat',
      openhat: 'hat',
      '808oh': 'hat',
      cp: 'clap',
      clap: 'clap',
      '808cp': 'clap',
      '808': 'clap',
      '909': 'kick'
    }

    Object.entries(drumAliases).forEach(([name, kind]) => {
      registerDrum(name, kind)
    })
    
    // Default piano (placeholder - will be replaced with samples)
    this.registerSound('piano', {
      type: 'synth',
      onTrigger: (context, params) => {
        const oscillator1 = context.createOscillator()
        const oscillator2 = context.createOscillator()
        const gainNode = context.createGain()
        const filter = context.createBiquadFilter()
        
        const frequency = this.midiToFrequency(params.pitch || 60)
        oscillator1.type = 'triangle'
        oscillator1.frequency.setValueAtTime(frequency, context.currentTime)
        oscillator2.type = 'sine'
        oscillator2.frequency.setValueAtTime(frequency * 2, context.currentTime)
        
        filter.type = 'lowpass'
        filter.frequency.setValueAtTime(2000, context.currentTime)
        filter.Q.setValueAtTime(1, context.currentTime)
        
        const gain = (params.gain ?? 0.3) * (params.velocity ?? 1.0)
        gainNode.gain.setValueAtTime(gain, context.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(
          0.001, 
          context.currentTime + (params.duration || 1.0)
        )
        
        oscillator1.connect(filter)
        oscillator2.connect(filter)
        filter.connect(gainNode)
        
        oscillator1.start(context.currentTime)
        oscillator2.start(context.currentTime)
        oscillator1.stop(context.currentTime + (params.duration || 1.0))
        oscillator2.stop(context.currentTime + (params.duration || 1.0))
        
        return gainNode
      }
    })
  }
  
  /**
   * Convert MIDI note to frequency
   */
  private midiToFrequency(midiNote: number): number {
    return 440 * Math.pow(2, (midiNote - 69) / 12)
  }
  
  /**
   * Play a sound
   */
  async playSound(
    soundName: string, 
    params: SoundParams = {},
    destination?: AudioNode
  ): Promise<AudioNode | null> {
    if (!this.audioContext) {
      throw new Error('AudioContext not initialized')
    }
    
    const sound = this.getSound(soundName)
    if (!sound) {
      console.warn(`Sound not found: ${soundName}`)
      return null
    }
    
    let audioNode: AudioNode | null = null
    
    if (sound.type === 'sample' && typeof sound.source === 'string') {
      // Load and play sample
      const buffer = await this.loadAudioBuffer(sound.source)
      const source = this.audioContext.createBufferSource()
      const gainNode = this.audioContext.createGain()
      
      source.buffer = buffer
      
      if (params.pitch && params.pitch !== 60) {
        const pitchRatio = Math.pow(2, (params.pitch - 60) / 12)
        source.playbackRate.setValueAtTime(pitchRatio, this.audioContext.currentTime)
      }
      
      const gain = (params.gain ?? 0.8) * (params.velocity ?? 1.0)
      gainNode.gain.setValueAtTime(gain, this.audioContext.currentTime)
      
      source.connect(gainNode)
      audioNode = gainNode
      
      source.start(this.audioContext.currentTime)
      if (params.duration) {
        source.stop(this.audioContext.currentTime + params.duration)
      }
      
    } else if (sound.onTrigger) {
      // Use custom trigger function
      audioNode = sound.onTrigger(this.audioContext, params)
    }
    
    // Connect to destination
    if (audioNode) {
      const target = destination || this.audioContext.destination
      audioNode.connect(target)
    }
    
    return audioNode
  }
  
  /**
   * List all registered sounds
   */
  listSounds(): string[] {
    return Array.from(this.soundMap.keys())
  }
  
  /**
   * Clear all cached audio buffers
   */
  clearCache(): void {
    this.audioBufferCache.clear()
  }
}

// Singleton instance
const soundManager = SoundManager.getInstance()
export default soundManager
