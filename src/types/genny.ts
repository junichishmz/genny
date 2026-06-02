/**
 * Genny2.0 TypeScript Type Definitions
 * Core types for hybrid genny-strudel integration
 */

// === Core Genny Types ===

export type TimeCode = string; // "0:0:0" format (bars:beats:ticks)
export type MidiNote = number; // 0-127
export type Velocity = number; // 0-127

export type GennyPattern = Array<[TimeCode, MidiNote, Velocity?]>;

export interface ModelConfig {
  name: string;
  type: 'musicvae' | 'musicrnn' | 'coconet' | 'performancernn';
  url?: string;
  parameters: Record<string, any>;
  description?: string;
}

export interface GenerationParameters {
  temperature?: number;
  num_samples?: number;
  num_steps?: number;
  steps?: number;
}

export interface GenerationOptions {
  inputSequence?: NoteSequence;
  mode?: 'similar' | 'interpolate' | 'continue';
}

// === Magenta Integration ===

export interface NoteSequence {
  notes: Array<{
    pitch: number;
    quantizedStartStep?: number;
    quantizedEndStep?: number;
    startTime?: number;
    endTime?: number;
    isDrum?: boolean;
    velocity?: number;
  }>;
  totalQuantizedSteps?: number;
  totalTime?: number;
  ticksPerQuarter?: number;
  quantizationInfo?: {
    stepsPerQuarter: number;
  };
  tempos?: Array<{
    time: number;
    bpm?: number;
    qpm?: number;
  }>;
}

// === Strudel Integration ===

export interface StrudelPattern {
  events: StrudelEvent[];
  duration: number;
}

export interface StrudelEvent {
  time: number;
  value: any;
  context?: any;
}

// === Hybrid Integration Types ===

export interface PatternContainer {
  data: GennyPattern;
  play(): Promise<boolean>;
  toStrudel(): StrudelPattern;
  toBinaryPattern(): string; // For .struct() usage
}

export interface ModelInstance {
  _modelName: string;
  _temperature: number;
  _steps: number;
  _generatedPattern?: GennyPattern;
  _activeStrudelPattern?: any;
  _showOutputOnGeneration?: boolean;
  _outputFormat?: 'genny' | 'mini';
  _generationPending?: boolean;
  _onGenerated?: (pattern: GennyPattern) => void;
  _suppressOutputSideEffects?: boolean;
  _throwOnGenerationError?: boolean;
  
  temperature(temp: number): ModelInstance;
  steps(num: number): ModelInstance;
  gen(inputPattern?: GennyPattern | PatternContainer | string): ModelInstance;
  output(...notes: any[]): GennyPattern | any[];
  transformPatternWithNotes(generatedPattern: GennyPattern, notePattern: GennyPattern): GennyPattern;
  generate(inputPattern?: GennyPattern | PatternContainer): Promise<GennyPattern>;
  generateAndPlay(inputPattern?: GennyPattern | PatternContainer): Promise<GennyPattern>;
  play(inputPattern?: GennyPattern | PatternContainer): void;
  similar(inputPattern: GennyPattern): Promise<GennyPattern>;
  interpolate(pattern1: GennyPattern, pattern2: GennyPattern, steps?: number): Promise<GennyPattern[]>;
  toBinaryPattern(): string;
}

export interface GeneratedModelInstance {
  output(...notes: any[]): GennyPattern | any[];
}

// === Audio Engine Types ===

export interface AudioConfig {
  bpm: number;
  swing: number;
  volume: number;
}

export interface AudioStatus {
  initialized: boolean;
  isPlaying: boolean;
  transport: 'started' | 'stopped' | 'paused';
  bpm: number;
}

// === System State ===

export interface SystemStatus {
  isPlaying: boolean;
  tempo: number;
  scale: string;
  executionMode: 'genny' | 'strudel' | 'hybrid';
}

export interface ExecutionResult {
  success: boolean;
  result: any;
  error?: Error;
  type: 'genny' | 'strudel' | 'hybrid';
}

// === Event System ===

export type EventName = 
  | 'system:status'
  | 'playback:started' 
  | 'playback:stopped'
  | 'code:executed'
  | 'code:error'
  | 'pattern:generated'
  | 'model:loaded';

export interface EventPayload {
  'system:status': SystemStatus;
  'playback:started': { pattern: GennyPattern };
  'playback:stopped': {};
  'code:executed': ExecutionResult;
  'code:error': { code: string; error: Error };
  'pattern:generated': { model: string; pattern: GennyPattern };
  'model:loaded': { model: string; success: boolean };
}

// === Global Functions ===

export interface GlobalFunctions {
  model: (modelName: string) => ModelInstance;
  pattern1: (...data: GennyPattern) => PatternContainer;
  pattern2: (...data: GennyPattern) => PatternContainer;
  pattern3: (...data: GennyPattern) => PatternContainer;
  note: (notes: string) => StrudelNoteBuilder;
  mini: (pattern: string) => GennyPattern;
  strudelPattern: (pattern: string) => GennyPattern;
  audioEngine: any; // Will be properly typed later
}

export interface StrudelNoteBuilder {
  s(sound: string): StrudelSoundBuilder;
  scale(scale: string): StrudelNoteBuilder;
  struct(binaryPattern: string): StrudelNoteBuilder;
  model(modelName: string): StrudelNoteBuilder;
  temperature(temp: number): StrudelNoteBuilder;
  gen(): StrudelNoteBuilder;
  output(...notes: any[]): GennyPattern | any[];
  play(): Promise<boolean>;
}

export interface StrudelSoundBuilder {
  model(modelName: string): StrudelSoundBuilder;
  temperature(temp: number): StrudelSoundBuilder;
  gen(): StrudelSoundBuilder;
  output(...notes: any[]): GennyPattern | any[];
  play(): Promise<boolean>;
}

// === Utility Types ===

export type LogLevel = 'info' | 'warn' | 'error' | 'debug' | 'success' | 'warning';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: any;
}

// === API Context Types ===

export interface ApiContextValue {
  code: string;
  setCode: (code: string) => void;
  log: string;
  setLog: (log: string) => void;
  systemStatus: SystemStatus;
  executeCode: (code?: string) => Promise<ExecutionResult>;
  stopPlayback: () => void;
  setTempo: (bpm: number) => void;
  setScale: (scale: string) => void;
  setExecutionMode: (mode: SystemStatus['executionMode']) => void;
}
