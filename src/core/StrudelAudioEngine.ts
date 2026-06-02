/**
 * Genny2.0 Strudel-based Audio Engine
 * Modern Web Audio implementation using Strudel ecosystem
 */

import { GennyPattern, TimeCode, MidiNote } from '../types/genny'
import { useGennyStore } from '../store/gennyStore'

const debugAudioLog = (..._args: unknown[]) => {}

// 音楽的位置のインターフェース
interface MusicalPosition {
  bar: number
  beat: number
  sixteenth: number
  absoluteTime: number
}

// WebAudioチェーン管理
interface PatternAudioChain {
  gainNode: GainNode
  effectChain: AudioNode[]
  isActive: boolean
  createdAt: number
}

// パターン情報管理（位置追跡強化）
interface PatternInfo {
  pattern: GennyPattern
  audioChain: PatternAudioChain
  scheduledEvents: Set<number>
  isLooping: boolean
  volume: number
  currentPosition: number    // サイクル内位置（0.0-1.0）
  cycleLength: number       // サイクル長（秒）
  startOffset: number       // マスター開始からのオフセット
  lastSyncTime: number      // 最後の同期時刻
  lastStartTime: number     // 後方互換性のため保持
}

export class StrudelAudioEngine {
  private static instance: StrudelAudioEngine
  private audioContext: AudioContext | null = null
  private isInitialized = false
  private isPlaying = false
  private scheduledSounds: Set<number> = new Set()
  
  // マスターシーケンス管理
  private masterClockStartTime: number = 0
  private isClockRunning: boolean = false
  private pendingUpdate: { timerId: number; pattern: GennyPattern; scheduleTime: number } | null = null
  
  // 複数パターン同時再生管理
  private activePatterns: Map<string, PatternInfo> = new Map()
  private patternAudioChains: Map<string, PatternAudioChain> = new Map()

  // セッション管理
  private currentExecutionSessionId: string | null = null
  private sessionPatterns: Map<string, Set<string>> = new Map() // sessionId -> patternIds

  // 音色ベースのリソース管理（簡素化）
  private soundResourceMap: Map<string, {
    activePatterns: Set<string>
  }> = new Map()

  // 音声リソース制限
  private readonly MAX_CONCURRENT_PATTERNS = 8 // 最大同時再生パターン数
  private readonly MAX_SCHEDULED_SOUNDS = 100 // 最大スケジュールサウンド数

  private constructor() {
    // グローバルアクセス用
    ;(globalThis as any).strudelAudioEngine = this
  }

  static getInstance(): StrudelAudioEngine {
    if (!StrudelAudioEngine.instance) {
      StrudelAudioEngine.instance = new StrudelAudioEngine()
    }
    return StrudelAudioEngine.instance
  }

  /**
   * オーディオシステムの初期化（ユーザージェスチャー後に実行）
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return
    }

    try {
      // Web Audio API を直接初期化（ユーザージェスチャーが必要）
      this.audioContext = new AudioContext()
      
      // AudioContextが suspend状態の場合は resume を待つ
      if (this.audioContext.state === 'suspended') {
        // ユーザーがクリックなどのアクションをするまで待機
        return this.waitForUserGesture()
      }

      // Zustandストアに通知（重複チェック）
      const store = useGennyStore.getState()
      if (!store.audioContext) {
        await store.initializeAudio()
      }

      this.isInitialized = true

    } catch (error) {
      console.error('Failed to initialize Strudel Audio Engine:', error)
      throw error
    }
  }

  /**
   * ユーザージェスチャーを待機してAudioContextを再開
   */
  private async waitForUserGesture(): Promise<void> {
    return new Promise((resolve, reject) => {
      const resumeAudio = async () => {
        try {
          if (this.audioContext && this.audioContext.state === 'suspended') {
            await this.audioContext.resume()
          }
          
          // Zustandストアに通知
          const store = useGennyStore.getState()
          if (!store.audioContext) {
            await store.initializeAudio()
          }

          this.isInitialized = true
          
          // イベントリスナーを削除
          document.removeEventListener('click', resumeAudio)
          document.removeEventListener('keydown', resumeAudio)
          
          resolve()
        } catch (error) {
          console.error('Failed to resume AudioContext:', error)
          reject(error)
        }
      }

      // ユーザーのクリックまたはキーボード操作を待機
      document.addEventListener('click', resumeAudio, { once: true })
      document.addEventListener('keydown', resumeAudio, { once: true })
    })
  }

  /**
   * パターン専用のオーディオチェーンを作成
   */
  private createPatternAudioChain(patternId: string, volume: number = 0.8): PatternAudioChain {
    if (!this.audioContext) {
      throw new Error('AudioContext not initialized')
    }

    // 専用のGainNode作成
    const gainNode = this.audioContext.createGain()
    gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime)
    
    // エフェクトチェーンの初期化（将来の拡張用）
    const effectChain: AudioNode[] = [gainNode]
    
    // メインの出力に接続
    gainNode.connect(this.audioContext.destination)
    
    const audioChain: PatternAudioChain = {
      gainNode,
      effectChain,
      isActive: true,
      createdAt: Date.now()
    }

    // チェーンを管理に追加
    this.patternAudioChains.set(patternId, audioChain)
    
    return audioChain
  }

  /**
   * パターンのオーディオチェーンを破棄
   */
  private destroyPatternAudioChain(patternId: string): void {
    const audioChain = this.patternAudioChains.get(patternId)
    if (!audioChain) return

    try {
      // エフェクトチェーンを切断
      audioChain.effectChain.forEach(node => {
        try {
          node.disconnect()
        } catch (error) {
          console.warn(`Failed to disconnect audio node:`, error)
        }
      })
      
      // アクティブフラグを無効化
      audioChain.isActive = false
      
      // 管理から削除
      this.patternAudioChains.delete(patternId)
      
    } catch (error) {
      console.error(`Failed to destroy audio chain for ${patternId}:`, error)
    }
  }

  /**
   * ユニークなパターンIDを生成
   */
  private generateUniquePatternId(baseId?: string, soundName?: string): string {
    const timestamp = Date.now()
    const random = Math.floor(Math.random() * 1000)
    
    if (baseId && soundName) {
      return `${baseId}_${soundName}_${timestamp}_${random}`
    } else if (soundName) {
      return `pattern_${soundName}_${timestamp}_${random}`
    } else if (baseId) {
      return `${baseId}_${timestamp}_${random}`
    } else {
      return `pattern_${timestamp}_${random}`
    }
  }

  /**
   * 音色のリソース管理情報を取得または作成
   */
  private getSoundResource(soundName: string) {
    if (!this.soundResourceMap.has(soundName)) {
      this.soundResourceMap.set(soundName, {
        activePatterns: new Set<string>()
      })
    }
    return this.soundResourceMap.get(soundName)!
  }

  /**
   * 音色にパターンを追加（制限なし）
   */
  private addSoundPattern(soundName: string, patternId: string): void {
    const soundResource = this.getSoundResource(soundName)
    soundResource.activePatterns.add(patternId)
  }

  /**
   * 音色リソースからパターンを削除
   */
  private removeSoundResource(soundName: string, patternId: string): void {
    const soundResource = this.soundResourceMap.get(soundName)
    if (soundResource) {
      soundResource.activePatterns.delete(patternId)
      
      // アクティブパターンがない場合はリソース情報を削除
      if (soundResource.activePatterns.size === 0) {
        this.soundResourceMap.delete(soundName)
      }
    }
  }


  /**
   * パターンIDから音色名を抽出
   */
  private extractSoundNameFromPatternId(patternId: string): string | null {
    const parts = patternId.split('_')
    // パターン形式: pattern_soundName_timestamp_random または baseId_soundName_timestamp_random
    if (parts.length >= 2) {
      return parts[1] // 2番目の部分を音色名として使用
    }
    return null
  }

  /**
   * 新しい実行セッションを開始
   */
  startNewExecutionSession(): string {
    // 前のセッションのパターンを全て停止
    if (this.currentExecutionSessionId) {
      this.stopExecutionSession(this.currentExecutionSessionId)
    }
    
    // 新しいセッションIDを生成
    const sessionId = `session_${Date.now()}_${Math.floor(Math.random() * 1000)}`
    this.currentExecutionSessionId = sessionId
    this.sessionPatterns.set(sessionId, new Set())
    
    return sessionId
  }

  /**
   * 指定されたセッションのパターンを全て停止
   */
  private stopExecutionSession(sessionId: string): void {
    const patterns = this.sessionPatterns.get(sessionId)
    if (patterns) {
      patterns.forEach(patternId => {
        this.stopPatternNamed(patternId)
      })
      this.sessionPatterns.delete(sessionId)
    }
  }

  /**
   * 現在のセッションにパターンを追加
   */
  private addPatternToCurrentSession(patternId: string): void {
    if (this.currentExecutionSessionId) {
      const patterns = this.sessionPatterns.get(this.currentExecutionSessionId)
      if (patterns) {
        patterns.add(patternId)
      }
    }
  }

  /**
   * セッションからパターンを削除
   */
  private removePatternFromSession(patternId: string): void {
    this.sessionPatterns.forEach((patterns, sessionId) => {
      patterns.delete(patternId)
    })
  }

  /**
   * Gennyパターンを再生
   * マスタークロック同期による16分音符量子化更新
   */
  async playGennyPattern(pattern: GennyPattern, options: {
    loop?: boolean
    volume?: number
    patternId?: string
    soundName?: string
    replaceExisting?: boolean
    allowParallel?: boolean
  } = {}): Promise<boolean> {
    if (!this.isInitialized) {
      await this.initialize()
    }

    try {
      // 空パターンチェック
      if (!Array.isArray(pattern) || pattern.length === 0) {
        console.warn('Empty or invalid pattern')
        return false
      }
      
      // パターンIDの決定 - 並列発音の場合は常にユニークIDを生成
      let finalPatternId: string
      if (options.allowParallel || !options.patternId) {
        // 並列発音または匿名パターンの場合、ユニークIDを生成
        finalPatternId = this.generateUniquePatternId(options.patternId, options.soundName)
      } else {
        // 従来通りの名前付きパターン
        finalPatternId = options.patternId
      }
      
      return await this.playPatternNamed(finalPatternId, pattern, {
        loop: options.loop,
        volume: options.volume,
        replaceExisting: options.replaceExisting,
        soundName: options.soundName
      })
    } catch (error) {
      console.error('Failed to play Genny pattern:', error)
      const store = useGennyStore.getState()
      store.addLog({
        level: 'error',
        message: `Pattern playback failed: ${error instanceof Error ? error.message : 'Error'}`
      })
      return false
    }
  }

  /**
   * Web Audio APIを使用した直接的なパターン再生（マスタークロック同期）
   */
  private async playPatternWithWebAudio(pattern: GennyPattern, options: {
    loop?: boolean
    volume?: number
  } = {}): Promise<void> {
    const currentTime = this.audioContext!.currentTime
    const volume = options.volume || 1

    // 各ノートをスケジュール
    debugAudioLog('📝 Scheduling pattern notes:', pattern)
    pattern.forEach(([timeCode, pitch, velocity = 127], index) => {
      const relativeTime = this.parseGennyTimeCode(timeCode)
      const absoluteTime = currentTime + relativeTime
      debugAudioLog(`  Note ${index}: timeCode=${timeCode}, pitch=${pitch}, velocity=${velocity}, time=${absoluteTime.toFixed(3)}`)
      this.scheduleNote(pitch, absoluteTime, velocity / 127, volume)
    })

    // ループ処理（マスタークロック同期）
    if (options.loop) {
      const store = useGennyStore.getState()
      const tempo = store.systemStatus.tempo
      const patternDuration = this.calculatePatternDuration(pattern)
      
      // パターン終了時刻を計算
      const patternEndTime = currentTime + patternDuration
      
      // パターン終了時の16分音符境界で次のループを開始
      const nextLoopTime = this.getNext16thBoundary(patternEndTime)
      const loopDelay = (nextLoopTime - currentTime) * 1000
      
      debugAudioLog(`🔄 Scheduling next loop in ${loopDelay.toFixed(1)}ms at time ${nextLoopTime.toFixed(3)}`)
      
      const timeoutId = window.setTimeout(() => {
        if (this.isPlaying && this.isClockRunning) {
          debugAudioLog('🔄 Starting next loop at quantized boundary')
          this.playPatternWithWebAudio(pattern, options)
        }
      }, loopDelay)
      
      this.scheduledSounds.add(timeoutId)
    }
  }

  /**
   * 音符のスケジューリング
   */
  private scheduleNote(midiNote: MidiNote, time: number, velocity: number, volume: number): void {
    // 入力値の検証
    if (typeof midiNote !== 'number' || isNaN(midiNote) || midiNote < 0 || midiNote > 127) {
      console.warn(`Invalid MIDI note: ${midiNote}, skipping`)
      return
    }
    
    if (typeof time !== 'number' || isNaN(time) || time < 0) {
      console.warn(`Invalid time: ${time}, skipping`)
      return
    }
    
    if (typeof velocity !== 'number' || isNaN(velocity)) {
      velocity = 0.8
    }
    
    if (typeof volume !== 'number' || isNaN(volume)) {
      volume = 1
    }
    
    const oscillator = this.audioContext!.createOscillator()
    const gainNode = this.audioContext!.createGain()
    
    // MIDIノートを周波数に変換（安全な値であることを保証）
    const frequency = 440 * Math.pow(2, (midiNote - 69) / 12)
    
    // 周波数の最終チェック
    if (isNaN(frequency) || !isFinite(frequency)) {
      console.error(`Invalid frequency calculated: ${frequency} from MIDI note: ${midiNote}`)
      return
    }
    
    oscillator.frequency.setValueAtTime(frequency, time)
    oscillator.type = 'sine'
    
    // ボリューム設定（安全な値を保証）
    const gainValue = Math.max(0, Math.min(1, velocity * volume * 0.3))
    gainNode.gain.setValueAtTime(gainValue, time)
    gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.2)
    
    // 接続
    oscillator.connect(gainNode)
    gainNode.connect(this.audioContext!.destination)
    
    // 再生
    oscillator.start(time)
    oscillator.stop(time + 0.25)
    
    // クリーンアップ
    const noteId = Date.now() + Math.random()
    this.scheduledSounds.add(noteId)
    oscillator.onended = () => {
      oscillator.disconnect()
      gainNode.disconnect()
      this.scheduledSounds.delete(noteId)
    }
  }




  /**
   * Gennyタイムコードを秒に変換
   */
  private parseGennyTimeCode(timeCode: TimeCode): number {
    try {
      const [bars, beats, ticks] = timeCode.split(':').map(Number)
      const store = useGennyStore.getState()
      const tempo = store.systemStatus.tempo
      
      // 1分間 = 60秒, 1拍 = 60/tempo秒, 1tick = (60/tempo)/480秒
      const secondsPerBeat = 60 / tempo
      const secondsPerTick = secondsPerBeat / 480
      
      return bars * 4 * secondsPerBeat + beats * secondsPerBeat + ticks * secondsPerTick
    } catch (error) {
      console.warn('Failed to parse timeCode:', timeCode)
      return 0
    }
  }

  /**
   * MIDIノート番号を音名に変換
   */
  private midiToNoteName(midiNote: MidiNote): string {
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
    const octave = Math.floor(midiNote / 12) - 1
    const noteIndex = midiNote % 12
    return `${noteNames[noteIndex]}${octave}`.toLowerCase()
  }



  /**
   * 音名を周波数に変換
   */
  private noteToFrequency(note: string): number {
    // A4 = 440Hz を基準とした12平均律
    const noteMap: Record<string, number> = {
      'c': -9, 'c#': -8, 'd': -7, 'd#': -6, 'e': -5, 'f': -4,
      'f#': -3, 'g': -2, 'g#': -1, 'a': 0, 'a#': 1, 'b': 2
    }
    
    try {
      const match = note.toLowerCase().match(/^([a-g][#b]?)(\d+)$/)
      if (!match) return 440 // A4 fallback
      
      const [, noteName, octaveStr] = match
      const octave = parseInt(octaveStr)
      const semitoneOffset = noteMap[noteName] || 0
      const octaveOffset = (octave - 4) * 12
      
      return 440 * Math.pow(2, (semitoneOffset + octaveOffset) / 12)
    } catch {
      return 440 // A4 fallback
    }
  }

  /**
   * 特定のパターンを再生開始
   */
  async playPatternNamed(patternId: string, pattern: GennyPattern, options: {
    loop?: boolean
    volume?: number
    replaceExisting?: boolean
    soundName?: string
  } = {}): Promise<boolean> {
    if (!this.isInitialized) {
      await this.initialize()
    }

    try {
      // 音色名の抽出
      const soundName = options.soundName || this.extractSoundNameFromPatternId(patternId) || 'default'
      
      // 既存パターンの処理
      if (this.activePatterns.has(patternId)) {
        if (options.replaceExisting) {
          // 既存パターンを停止して置き換え
          this.stopPatternNamed(patternId)
          debugAudioLog(`🔄 Replacing existing pattern: ${patternId}`)
        } else {
          // 既存パターンが存在する場合はスキップ
          debugAudioLog(`Pattern ${patternId} already playing, skipping`)
          return false
        }
      }

      // 音色ベースのリソース管理
      if (soundName && !options.replaceExisting) {
        this.addSoundPattern(soundName, patternId)
      }

      // 最大同時再生パターン数チェック
      if (this.activePatterns.size >= this.MAX_CONCURRENT_PATTERNS) {
        console.warn(`Too many active patterns (${this.activePatterns.size}), stopping oldest`)
        this.stopOldestPattern()
      }

      // スケジュールされたサウンド数チェック
      if (this.scheduledSounds.size >= this.MAX_SCHEDULED_SOUNDS) {
        console.warn(`Too many scheduled sounds (${this.scheduledSounds.size}), forcing cleanup`)
        this.forceAudioCleanup()
      }

      const currentTime = this.audioContext!.currentTime
      
      // パターン専用のオーディオチェーンを作成（元の音量を保持）
      const audioChain = this.createPatternAudioChain(patternId, options.volume ?? 0.8)
      
      // パターンの長さを計算してサイクル情報を設定
      const cycleLength = this.calculatePatternCycleLength(pattern)
      
      const patternInfo: PatternInfo = {
        pattern,
        audioChain,
        scheduledEvents: new Set<number>(),
        isLooping: options.loop ?? true,
        volume: options.volume ?? 0.8,
        currentPosition: 0.0,
        cycleLength,
        startOffset: currentTime - this.masterClockStartTime,
        lastSyncTime: currentTime,
        lastStartTime: currentTime
      }

      this.activePatterns.set(patternId, patternInfo)

      // 現在のセッションにパターンを追加
      this.addPatternToCurrentSession(patternId)

      // マスタークロックが動いていない場合は開始
      if (!this.isClockRunning) {
        this.startMasterSequence(currentTime)
      }

      this.isPlaying = true
      await this.schedulePatternEvents(patternId, patternInfo)

      // Zustandストアを更新
      const store = useGennyStore.getState()
      store.updateSystemStatus({ isPlaying: true })
      store.playPattern(patternId)

      return true
    } catch (error) {
      console.error(`Failed to play pattern ${patternId}:`, error)
      return false
    }
  }

  /**
   * 特定のパターンを停止
   */
  stopPatternNamed(patternId: string): void {
    const patternInfo = this.activePatterns.get(patternId)
    if (!patternInfo) return

    debugAudioLog(`🛑 Stopping pattern: ${patternId}`)

    // 音色名を抽出して音色リソースから削除
    const soundName = this.extractSoundNameFromPatternId(patternId) || 'default'
    this.removeSoundResource(soundName, patternId)

    // セッションからパターンを削除
    this.removePatternFromSession(patternId)

    // スケジュールされたイベントをクリア
    patternInfo.scheduledEvents.forEach(timeoutId => {
      clearTimeout(timeoutId)
    })
    patternInfo.scheduledEvents.clear()

    // パターンを削除
    this.activePatterns.delete(patternId)

    // オーディオチェーンを破棄
    this.destroyPatternAudioChain(patternId)

    // Zustandストアを更新
    const store = useGennyStore.getState()
    store.stopPattern(patternId)

    // 音声リソースのクリーンアップを強制実行
    this.forceAudioCleanup()

    // すべてのパターンが停止している場合は全体停止
    if (this.activePatterns.size === 0) {
      this.isPlaying = false
      this.stopMasterSequence()
      store.updateSystemStatus({ isPlaying: false })
      debugAudioLog('🔇 All patterns stopped')
    }
  }

  /**
   * 全パターン停止（マスタークロック停止含む）
   */
  stop(): void {
    try {
      // すべてのアクティブパターンを停止
      Array.from(this.activePatterns.keys()).forEach(patternId => {
        this.stopPatternNamed(patternId)
      })

      // レガシー再生システムもクリア
      this.scheduledSounds.forEach(timeoutId => {
        clearTimeout(timeoutId)
      })
      this.scheduledSounds.clear()

      this.isPlaying = false
      
      // マスターシーケンスを停止
      this.stopMasterSequence()

      // Zustandストアを更新
      const store = useGennyStore.getState()
      store.updateSystemStatus({ isPlaying: false })
      store.stopAllPatterns()
      
    } catch (error) {
      console.error('Error stopping audio:', error)
    }
  }

  /**
   * パターンのイベントをスケジュール（和音対応）
   */
  private async schedulePatternEvents(patternId: string, patternInfo: PatternInfo): Promise<void> {
    const { pattern, scheduledEvents, isLooping, volume } = patternInfo
    const currentTime = this.audioContext!.currentTime

    // 同じタイムコードの音符をグループ化（和音対応）
    const eventGroups: Map<string, Array<{pitch: number, velocity: number}>> = new Map()
    
    pattern.forEach(([timeCode, pitch, velocity = 127]) => {
      if (!eventGroups.has(timeCode)) {
        eventGroups.set(timeCode, [])
      }
      eventGroups.get(timeCode)!.push({ pitch, velocity })
    })

    // グループ化されたイベントをスケジュール
    eventGroups.forEach((notes, timeCode) => {
      const eventTime = this.parseTimeCodeToSeconds(timeCode) + currentTime
      
      const timeoutId = window.setTimeout(() => {
        // 同じタイミングの音符を和音として再生
        const midiNotes = notes.map(n => n.pitch)
        const avgVelocity = notes.reduce((sum, n) => sum + n.velocity, 0) / notes.length
        
        this.playNotes(midiNotes, avgVelocity * volume / 127, 0.5, patternInfo.audioChain)
        scheduledEvents.delete(timeoutId)
      }, (eventTime - currentTime) * 1000)
      
      scheduledEvents.add(timeoutId)
    })

    // ループ再生の場合、パターン終了後に再スケジュール
    if (isLooping) {
      const patternDuration = this.calculatePatternDuration(pattern)
      const loopTimeoutId = window.setTimeout(() => {
        // パターンがまだアクティブかチェック
        if (this.activePatterns.has(patternId)) {
          const updatedPatternInfo = this.activePatterns.get(patternId)!
          updatedPatternInfo.lastStartTime = currentTime + patternDuration
          this.schedulePatternEvents(patternId, updatedPatternInfo)
        }
      }, patternDuration * 1000)
      
      scheduledEvents.add(loopTimeoutId)
    }
  }

  /**
   * パターンの持続時間を計算（秒）
   */
  private calculatePatternDuration(pattern: GennyPattern): number {
    if (pattern.length === 0) return 2.0 // デフォルト2秒

    let maxTime = 0
    pattern.forEach(([timeCode]) => {
      const timeInSeconds = this.parseTimeCodeToSeconds(timeCode)
      maxTime = Math.max(maxTime, timeInSeconds)
    })

    return Math.max(maxTime + 0.5, 2.0) // 最低2秒、最後のノート+0.5秒
  }

  /**
   * パターンのサイクル長を計算（秒）
   */
  private calculatePatternCycleLength(pattern: GennyPattern): number {
    if (pattern.length === 0) return 2.0

    // パターンの最大時間を基にサイクル長を計算
    let maxTime = 0
    pattern.forEach(([timeCode]) => {
      const timeInSeconds = this.parseTimeCodeToSeconds(timeCode)
      maxTime = Math.max(maxTime, timeInSeconds)
    })

    // サイクル長は小節境界に合わせる（4拍子想定）
    const beatsPerCycle = 4
    const secondsPerBeat = 0.5 // 120BPM想定
    const cycleDuration = beatsPerCycle * secondsPerBeat

    // パターンが1サイクルより長い場合は適切な長さに調整
    if (maxTime > cycleDuration) {
      return Math.ceil(maxTime / cycleDuration) * cycleDuration
    }

    return cycleDuration
  }

  /**
   * TimeCodeを秒に変換
   */
  private parseTimeCodeToSeconds(timeCode: string): number {
    const [bars, beats, ticks] = timeCode.split(':').map(Number)
    // 4/4拍子、120BPM想定: 1小節=2秒、1拍=0.5秒、1ティック=0.5/480秒
    return bars * 2.0 + beats * 0.5 + ticks * (0.5 / 480)
  }

  /**
   * MIDI音符を直接再生（単音）
   */
  private playNote(midiNote: number, velocity: number = 1.0, duration: number = 0.5): void {
    this.playNotes([midiNote], velocity, duration)
  }

  /**
   * 複数のMIDI音符を同時再生（和音対応・オーディオチェーン使用）
   */
  private playNotes(
    midiNotes: number[], 
    velocity: number = 1.0, 
    duration: number = 0.5, 
    targetAudioChain?: PatternAudioChain
  ): void {
    if (!this.audioContext || midiNotes.length === 0) return

    try {
      // オーディオチェーンのターゲットを決定
      let targetGain: GainNode
      if (targetAudioChain && targetAudioChain.isActive) {
        targetGain = targetAudioChain.gainNode
      } else {
        // フォールバック: 直接出力に接続
        targetGain = this.audioContext.createGain()
        targetGain.connect(this.audioContext.destination)
      }

      // 和音の場合は音量を調整（音符数に応じて分散）
      const chordVolume = Math.max(0, Math.min(1, velocity)) * 0.3 / Math.sqrt(midiNotes.length)
      
      // 各音符に対してオシレーターを作成
      midiNotes.forEach(midiNote => {
        const oscillator = this.audioContext!.createOscillator()
        const gainNode = this.audioContext!.createGain()
        
        // 音程を計算
        const frequency = this.midiToFrequency(midiNote)
        oscillator.frequency.setValueAtTime(frequency, this.audioContext!.currentTime)
        oscillator.type = 'sine'
        
        // 音量エンベロープ
        gainNode.gain.setValueAtTime(0, this.audioContext!.currentTime)
        gainNode.gain.linearRampToValueAtTime(chordVolume, this.audioContext!.currentTime + 0.01)
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext!.currentTime + duration)
        
        // 接続: オシレーター → ゲイン → パターンのオーディオチェーン
        oscillator.connect(gainNode)
        gainNode.connect(targetGain)
        
        // 再生
        oscillator.start(this.audioContext!.currentTime)
        oscillator.stop(this.audioContext!.currentTime + duration)
      })
      
    } catch (error) {
      console.error('Failed to play chord:', error)
    }
  }

  /**
   * MIDIノート番号を周波数に変換
   */
  private midiToFrequency(midiNote: number): number {
    return 440 * Math.pow(2, (midiNote - 69) / 12)
  }

  /**
   * テストトーン再生
   */
  async playTestTone(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize()
    }

    try {
      debugAudioLog('🔊 Playing test tone...')
      
      // C4のテストトーン
      const testPattern: GennyPattern = [['0:0:0', 60, 127]]
      await this.playGennyPattern(testPattern)
      
      // 1秒後に停止
      setTimeout(() => {
        this.stop()
      }, 1000)

      debugAudioLog('✅ Test tone completed')
      
    } catch (error) {
      console.error('Test tone failed:', error)
      throw error
    }
  }

  /**
   * マスターシーケンス開始
   */
  private startMasterSequence(startTime: number): void {
    this.masterClockStartTime = startTime
    this.isClockRunning = true
    debugAudioLog('🎼 Master sequence started at:', startTime.toFixed(3))
  }
  
  /**
   * マスターシーケンス位置継続でパターン更新
   */
  private updatePatternAtPosition(newPattern: GennyPattern, options: any): void {
    const currentTime = this.audioContext!.currentTime
    const nextBoundary = this.getNext16thBoundary(currentTime)
    const delay = (nextBoundary - currentTime) * 1000
    
    debugAudioLog(`🔄 Scheduling pattern update in ${delay.toFixed(1)}ms at next 16th boundary`)
    
    // 前回の待機更新をキャンセル
    if (this.pendingUpdate) {
      clearTimeout(this.pendingUpdate.timerId)
      debugAudioLog('Cancelled previous pending update')
    }
    
    // 新しい更新をスケジュール（機能未実装のためコメントアウト）
    /*
    this.pendingUpdate = {
      timerId: setTimeout(() => {
        // TODO: executePatternUpdateAtメソッドの実装
        this.pendingUpdate = null
      }, delay),
      pattern: newPattern,
      scheduleTime: nextBoundary
    }
    */
  }
  
  
  /**
   * 次の16分音符境界を取得
   */
  private getNext16thBoundary(currentTime: number): number {
    if (!this.isClockRunning) {
      return currentTime
    }
    
    const store = useGennyStore.getState()
    const tempo = store.systemStatus.tempo
    const sixteenthNoteDuration = (60 / tempo) / 4
    
    const elapsedTime = currentTime - this.masterClockStartTime
    const currentSixteenth = Math.floor(elapsedTime / sixteenthNoteDuration)
    const nextSixteenth = currentSixteenth + 1
    
    return this.masterClockStartTime + (nextSixteenth * sixteenthNoteDuration)
  }
  
  
  /**
   * 現在の音楽的位置を取得
   */
  private getCurrentMusicalPosition(currentTime: number): MusicalPosition {
    if (!this.isClockRunning) {
      return { bar: 0, beat: 0, sixteenth: 0, absoluteTime: currentTime }
    }
    
    const store = useGennyStore.getState()
    const tempo = store.systemStatus.tempo
    const sixteenthNoteDuration = (60 / tempo) / 4
    
    const elapsedTime = currentTime - this.masterClockStartTime
    const totalSixteenths = Math.floor(elapsedTime / sixteenthNoteDuration)
    
    const bar = Math.floor(totalSixteenths / 16)
    const beat = Math.floor((totalSixteenths % 16) / 4)
    const sixteenth = totalSixteenths % 4
    
    return {
      bar,
      beat,
      sixteenth,
      absoluteTime: currentTime
    }
  }
  
  /**
   * マスターシーケンス停止
   */
  private stopMasterSequence(): void {
    // 待機中の更新をキャンセル
    if (this.pendingUpdate) {
      clearTimeout(this.pendingUpdate.timerId)
      this.pendingUpdate = null
    }
    
    this.isClockRunning = false
    this.masterClockStartTime = 0
    debugAudioLog('🎼 Master sequence stopped')
  }
  
  // 旧いquantizeToAbsolute16thNoteメソッドは削除し、getNext16thBoundaryに統合済み
  
  // 旧いupdatePatternSynchronouslyメソッドは削除し、executePatternUpdateAtに統合済み
  
  /**
   * スケジュール済み音源のクリア（マスタークロックは維持）
   */
  private clearScheduledSounds(): void {
    this.scheduledSounds.forEach(timeoutId => {
      clearTimeout(timeoutId)
    })
    this.scheduledSounds.clear()
    debugAudioLog('🧹 Cleared scheduled sounds')
  }

  /**
   * 音声リソースの強制クリーンアップ
   */
  private forceAudioCleanup(): void {
    // Web Audio API コンテキストのガベージコレクションを促進
    if (this.audioContext && this.audioContext.state === 'running') {
      // アクティブなオーディオノードのチェック
      try {
        // 短い無音を再生してオーディオグラフをフラッシュ
        const silentOsc = this.audioContext.createOscillator()
        const silentGain = this.audioContext.createGain()
        
        silentGain.gain.setValueAtTime(0, this.audioContext.currentTime)
        silentOsc.connect(silentGain)
        silentGain.connect(this.audioContext.destination)
        
        silentOsc.start(this.audioContext.currentTime)
        silentOsc.stop(this.audioContext.currentTime + 0.001)
        
        // リソースを即座に切断
        setTimeout(() => {
          silentOsc.disconnect()
          silentGain.disconnect()
        }, 10)
        
      } catch (error) {
        console.warn('Audio cleanup warning:', error)
      }
    }

    // スケジュールされたサウンドも再度クリア
    this.clearScheduledSounds()
  }

  /**
   * 最も古いパターンを停止
   */
  private stopOldestPattern(): void {
    if (this.activePatterns.size === 0) return

    let oldestPatternId: string | null = null
    let oldestTime = Infinity

    // 最も古い開始時刻のパターンを見つける
    this.activePatterns.forEach((patternInfo, patternId) => {
      if (patternInfo.lastStartTime < oldestTime) {
        oldestTime = patternInfo.lastStartTime
        oldestPatternId = patternId
      }
    })

    if (oldestPatternId) {
      debugAudioLog(`🗑️ Stopping oldest pattern: ${oldestPatternId}`)
      this.stopPatternNamed(oldestPatternId)
    }
  }
  
  /**
   * システム状態の取得（リソース監視機能付き）
   */
  getStatus() {
    // 音色別リソース情報の収集
    const soundResources: Record<string, {
      activePatterns: number
    }> = {}
    
    this.soundResourceMap.forEach((resource, soundName) => {
      soundResources[soundName] = {
        activePatterns: resource.activePatterns.size
      }
    })

    return {
      initialized: this.isInitialized,
      isPlaying: this.isPlaying,
      audioContext: !!this.audioContext,
      scheduledSounds: this.scheduledSounds.size,
      activePatterns: this.activePatterns.size,
      soundResources,
      masterClock: {
        isRunning: this.isClockRunning,
        startTime: this.masterClockStartTime,
        elapsedTime: this.isClockRunning ? 
          (this.audioContext?.currentTime || 0) - this.masterClockStartTime : 0
      },
      limits: {
        maxConcurrentPatterns: this.MAX_CONCURRENT_PATTERNS,
        maxScheduledSounds: this.MAX_SCHEDULED_SOUNDS
      }
    }
  }

  /**
   * リソースのクリーンアップ
   */
  dispose(): void {
    this.stop()
    this.audioContext = null
    this.isInitialized = false
    debugAudioLog('🧹 Strudel Audio Engine disposed')
  }
}

// シングルトンインスタンス
const strudelAudioEngine = StrudelAudioEngine.getInstance()

export default strudelAudioEngine
