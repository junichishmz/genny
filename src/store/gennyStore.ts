/**
 * Genny2.0 Central State Management with Zustand
 * Modern state management for hybrid live coding environment
 */

import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { enableMapSet } from 'immer'
import { GennyPattern, SystemStatus, ExecutionResult, LogEntry } from '../types/genny'
import { defaultCode } from '../templates/gennyTemplates'

// Enable MapSet plugin for Immer to handle Map and Set
enableMapSet()

export interface GennyState {
  // === Core State ===
  code: string
  systemStatus: SystemStatus
  logs: LogEntry[]
  
  // === Pattern State ===
  activePatterns: Map<string, {
    data: GennyPattern
    isPlaying: boolean
    lastPlayed: Date
  }>
  generatedPatterns: GennyPattern[]
  
  // === Execution State ===
  isExecuting: boolean
  lastExecution: ExecutionResult | null
  
  // === Audio State ===
  audioContext: AudioContext | null
  isAudioReady: boolean
  masterVolume: number
  
  // === UI State ===
  selectedPatternId: string | null
  showVisualizer: boolean
  
  // === Actions ===
  setCode: (code: string) => void
  updateSystemStatus: (status: Partial<SystemStatus>) => void
  addLog: (entry: Omit<LogEntry, 'timestamp'>) => void
  clearLogs: () => void
  
  // Pattern actions
  addPattern: (id: string, pattern: GennyPattern) => void
  removePattern: (id: string) => void
  playPattern: (id: string) => void
  stopPattern: (id: string) => void
  stopAllPatterns: () => void
  
  // Execution actions
  setExecuting: (executing: boolean) => void
  setLastExecution: (result: ExecutionResult) => void
  
  // Audio actions
  initializeAudio: () => Promise<void>
  setMasterVolume: (volume: number) => void
  
  // UI actions
  selectPattern: (id: string | null) => void
  toggleVisualizer: () => void
  
}

export const useGennyStore = create<GennyState>()(
  subscribeWithSelector(
    immer((set, get) => ({
      // === Initial State ===
      code: defaultCode,

      systemStatus: {
        isPlaying: false,
        tempo: 120,
        scale: 'C:major',
        executionMode: 'hybrid'
      },

      logs: [],
      activePatterns: new Map(),
      generatedPatterns: [],
      isExecuting: false,
      lastExecution: null,
      audioContext: null,
      isAudioReady: false,
      masterVolume: 0.8,
      selectedPatternId: null,
      showVisualizer: false,

      // === Actions Implementation ===
      setCode: (code) => set(state => {
        state.code = code
      }),

      updateSystemStatus: (status) => set(state => {
        Object.assign(state.systemStatus, status)
      }),

      addLog: (entry) => set(state => {
        const logEntry: LogEntry = {
          ...entry,
          timestamp: new Date().toISOString()
        }
        state.logs.push(logEntry)
        
        // Keep only last 100 logs
        if (state.logs.length > 100) {
          state.logs = state.logs.slice(-100)
        }
      }),

      clearLogs: () => set(state => {
        state.logs = []
      }),

      addPattern: (id, pattern) => set(state => {
        state.activePatterns.set(id, {
          data: pattern,
          isPlaying: false,
          lastPlayed: new Date()
        })
      }),

      removePattern: (id) => set(state => {
        state.activePatterns.delete(id)
        if (state.selectedPatternId === id) {
          state.selectedPatternId = null
        }
      }),

      playPattern: (id) => set(state => {
        const pattern = state.activePatterns.get(id)
        if (pattern) {
          pattern.isPlaying = true
          pattern.lastPlayed = new Date()
        }
      }),

      stopPattern: (id) => set(state => {
        const pattern = state.activePatterns.get(id)
        if (pattern) {
          pattern.isPlaying = false
        }
      }),

      stopAllPatterns: () => set(state => {
        state.activePatterns.forEach(pattern => {
          pattern.isPlaying = false
        })
        state.systemStatus.isPlaying = false
      }),

      setExecuting: (executing) => set(state => {
        state.isExecuting = executing
      }),

      setLastExecution: (result) => set(state => {
        state.lastExecution = result
      }),

      initializeAudio: async () => {
        if (get().audioContext) return

        try {
          const context = new AudioContext()
          if (context.state === 'suspended') {
            await context.resume()
          }
          
          set(state => {
            state.audioContext = context
            state.isAudioReady = true
          })

          get().addLog({
            level: 'info',
            message: 'Audio context initialized successfully'
          })
        } catch (error) {
          get().addLog({
            level: 'error',
            message: `Failed to initialize audio: ${error instanceof Error ? error.message : 'Unknown error'}`
          })
          throw error
        }
      },

      setMasterVolume: (volume) => set(state => {
        state.masterVolume = Math.max(0, Math.min(1, volume))
      }),

      selectPattern: (id) => set(state => {
        state.selectedPatternId = id
      }),

      toggleVisualizer: () => set(state => {
        state.showVisualizer = !state.showVisualizer
      })
    }))
  )
)

// === Selectors for optimized re-renders ===
export const useSystemStatus = () => useGennyStore(state => state.systemStatus)
export const useIsPlaying = () => useGennyStore(state => state.systemStatus.isPlaying)
export const useTempo = () => useGennyStore(state => state.systemStatus.tempo)
export const useScale = () => useGennyStore(state => state.systemStatus.scale)
export const useExecutionMode = () => useGennyStore(state => state.systemStatus.executionMode)
export const useCode = () => useGennyStore(state => state.code)
export const useLogs = () => useGennyStore(state => state.logs)
export const useActivePatterns = () => useGennyStore(state => state.activePatterns)
export const useIsExecuting = () => useGennyStore(state => state.isExecuting)
export const useAudioReady = () => useGennyStore(state => state.isAudioReady)
