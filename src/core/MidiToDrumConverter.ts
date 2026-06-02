/**
 * MIDI to Drum Pattern Converter for Genny 2.0
 * Converts AI-generated MIDI patterns to drum mini-notation
 */

import { GennyPattern } from '../types/genny'

export interface DrumMapping {
  [midiNote: number]: string
}

export class MidiToDrumConverter {
  private static instance: MidiToDrumConverter
  private drumMapping: DrumMapping = {}

  private constructor() {
    this.initializeDrumMapping()
  }

  static getInstance(): MidiToDrumConverter {
    if (!MidiToDrumConverter.instance) {
      MidiToDrumConverter.instance = new MidiToDrumConverter()
    }
    return MidiToDrumConverter.instance
  }

  /**
   * Initialize standard drum mapping (GM Drum Map)
   */
  private initializeDrumMapping(): void {
    this.drumMapping = {
      // Bass drums
      35: 'bd', // Acoustic Bass Drum
      36: 'bd', // Bass Drum 1
      
      // Snare drums
      38: 'sn', // Acoustic Snare
      40: 'sn', // Electric Snare
      
      // Hi-hats
      42: 'hh', // Closed Hi-Hat
      44: 'hh', // Pedal Hi-Hat
      46: 'oh', // Open Hi-Hat
      
      // Toms
      41: 'lt', // Low Floor Tom
      43: 'lt', // High Floor Tom
      45: 'mt', // Low Tom
      47: 'ht', // Low-Mid Tom
      48: 'ht', // Hi-Mid Tom
      50: 'ht', // High Tom
      
      // Cymbals
      49: 'cr', // Crash Cymbal 1
      51: 'ride', // Ride Cymbal 1
      52: 'cr', // Chinese Cymbal
      53: 'ride', // Ride Bell
      55: 'cr', // Splash Cymbal
      57: 'cr', // Crash Cymbal 2
      59: 'ride', // Ride Cymbal 2
      
      // Percussion
      39: 'cp', // Hand Clap
      54: 'tamb', // Tambourine
      56: 'cb', // Cowbell
      58: 'vib', // Vibraslap
      60: 'bongo', // Hi Bongo
      61: 'bongo', // Low Bongo
      62: 'conga', // Mute Hi Conga
      63: 'conga', // Open Hi Conga
      64: 'conga', // Low Conga
      
      // Additional percussion
      69: 'cab', // Cabasa
      70: 'mar', // Maracas
      75: 'clv', // Claves
      76: 'wb', // Hi Wood Block
      77: 'wb', // Low Wood Block
    }
  }

  /**
   * Convert MIDI pattern to drum mini-notation string
   */
  convertToMiniNotation(pattern: GennyPattern): string {
    if (!pattern || pattern.length === 0) {
      return '~'
    }

    // Group notes by time for simultaneous hits
    const timeMap = new Map<string, number[]>()
    
    pattern.forEach(([timeCode, midiNote]) => {
      if (!timeMap.has(timeCode)) {
        timeMap.set(timeCode, [])
      }
      timeMap.get(timeCode)!.push(midiNote)
    })

    // Sort by time and convert to mini-notation
    const sortedTimes = Array.from(timeMap.keys()).sort((a, b) => {
      const [measureA, beatA, subdivisionA] = a.split(':').map(Number)
      const [measureB, beatB, subdivisionB] = b.split(':').map(Number)
      
      if (measureA !== measureB) return measureA - measureB
      if (beatA !== beatB) return beatA - beatB
      return subdivisionA - subdivisionB
    })

    const drumEvents: string[] = []
    
    sortedTimes.forEach(timeCode => {
      const midiNotes = timeMap.get(timeCode)!
      const drumSounds = this.midiNotesToDrumSounds(midiNotes)
      
      if (drumSounds.length === 0) {
        drumEvents.push('~') // Rest
      } else if (drumSounds.length === 1) {
        drumEvents.push(drumSounds[0])
      } else {
        // Multiple simultaneous drum hits - use bracket notation
        drumEvents.push(`[${drumSounds.join(' ')}]`)
      }
    })

    return drumEvents.join(' ')
  }

  /**
   * Convert MIDI notes to drum sound names
   */
  private midiNotesToDrumSounds(midiNotes: number[]): string[] {
    const drumSounds: string[] = []
    
    midiNotes.forEach(midiNote => {
      const drumSound = this.drumMapping[midiNote]
      if (drumSound && !drumSounds.includes(drumSound)) {
        drumSounds.push(drumSound)
      }
    })
    
    return drumSounds
  }

  /**
   * Get drum sound for a specific MIDI note
   */
  getDrumSound(midiNote: number): string | null {
    return this.drumMapping[midiNote] || null
  }

  /**
   * Check if MIDI note is a drum sound
   */
  isDrumNote(midiNote: number): boolean {
    return midiNote in this.drumMapping
  }

  /**
   * Get all supported MIDI notes
   */
  getSupportedMidiNotes(): number[] {
    return Object.keys(this.drumMapping).map(Number).sort((a, b) => a - b)
  }

  /**
   * Get drum mapping for reference
   */
  getDrumMapping(): DrumMapping {
    return { ...this.drumMapping }
  }

  /**
   * Simple pattern conversion for basic rhythms
   * Fills in gaps with rests to create a more regular pattern
   */
  convertToRegularPattern(pattern: GennyPattern, stepCount: number = 16): string {
    if (!pattern || pattern.length === 0) {
      return Array(stepCount).fill('~').join(' ')
    }

    // Create step array
    const steps: string[] = Array(stepCount).fill('~')
    
    // Calculate steps per subdivision (assuming 16th notes)
    const stepsPerSubdivision = stepCount / 16 // For 16 subdivisions in a bar
    
    pattern.forEach(([timeCode, midiNote]) => {
      const [measure, beat, subdivision] = timeCode.split(':').map(Number)
      const totalSubdivisions = (measure * 16) + (beat * 4) + subdivision
      const stepIndex = Math.floor(totalSubdivisions * stepsPerSubdivision)
      
      if (stepIndex >= 0 && stepIndex < stepCount) {
        const drumSound = this.getDrumSound(midiNote)
        if (drumSound) {
          if (steps[stepIndex] === '~') {
            steps[stepIndex] = drumSound
          } else if (!steps[stepIndex].includes(drumSound)) {
            // Multiple sounds on same step - combine them
            if (steps[stepIndex].startsWith('[') && steps[stepIndex].endsWith(']')) {
              // Already has brackets
              steps[stepIndex] = steps[stepIndex].slice(0, -1) + ` ${drumSound}]`
            } else {
              // Convert to bracket notation
              steps[stepIndex] = `[${steps[stepIndex]} ${drumSound}]`
            }
          }
        }
      }
    })
    
    return steps.join(' ')
  }
}

// Singleton instance
const midiToDrumConverter = MidiToDrumConverter.getInstance()
export default midiToDrumConverter
