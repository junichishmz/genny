import type { Completion, CompletionContext, CompletionResult } from '@codemirror/autocomplete'
import { RangeSetBuilder } from '@codemirror/state'
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view'

const gennyCompletions: Completion[] = [
  { label: 'model', type: 'function', info: 'Load a generative model' },
  { label: 'gen', type: 'function', info: 'Generate a pattern' },
  { label: 'output', type: 'function', info: 'Output a generated pattern' },
  { label: 'temperature', type: 'function', info: 'Set generation temperature' },
  { label: 'steps', type: 'function', info: 'Set generation length' },
  { label: 'similar', type: 'function', info: 'Generate a similar pattern' },
  { label: 'interpolate', type: 'function', info: 'Interpolate between patterns' },
  { label: 'pattern1', type: 'function', info: 'Create a Genny pattern' },
  { label: 'pattern2', type: 'function', info: 'Create a Genny pattern' },
  { label: 'pattern3', type: 'function', info: 'Create a Genny pattern' },
  { label: 'pattern4', type: 'function', info: 'Create a Genny pattern' },
  { label: 'mini', type: 'function', info: 'Convert Strudel mini-notation to a Genny rhythm seed' },
  { label: 'strudelPattern', type: 'function', info: 'Convert Strudel mini-notation to a Genny rhythm seed' },
  { label: 'magenta_music_vae', type: 'variable', info: 'MusicVAE drum model' },
  { label: 'magenta_melody_vae', type: 'variable', info: 'MusicVAE melody model' },
  { label: 'pattern_gen', type: 'variable', info: 'Generated pattern container' },
]

const strudelCompletions: Completion[] = [
  { label: 's', type: 'function', info: 'Create a sound pattern' },
  { label: 'sound', type: 'function', info: 'Alias for sound pattern control' },
  { label: 'note', type: 'function', info: 'Create a note pattern' },
  { label: 'n', type: 'function', info: 'Create a numeric pattern' },
  { label: 'samples', type: 'function', info: 'Load a Strudel sample map' },
  { label: 'setcps', type: 'function', info: 'Set Strudel cycles per second' },
  { label: 'setcpm', type: 'function', info: 'Set Strudel cycles per minute' },
  { label: 'chord', type: 'function', info: 'Create a chord pattern' },
  { label: 'scale', type: 'method', info: 'Map scale degrees to notes' },
  { label: 'stack', type: 'function', info: 'Layer patterns together' },
  { label: 'cat', type: 'function', info: 'Concatenate patterns' },
  { label: 'seq', type: 'function', info: 'Sequence patterns' },
  { label: 'slowcat', type: 'function', info: 'Concatenate patterns slowly' },
  { label: 'fastcat', type: 'function', info: 'Concatenate patterns quickly' },
  { label: 'setcps', type: 'function', info: 'Set cycles per second' },
  { label: 'cps', type: 'function', info: 'Set cycles per second' },
  { label: 'cpm', type: 'function', info: 'Set cycles per minute' },
  { label: 'bank', type: 'method', info: 'Choose a sample bank' },
  { label: 'gain', type: 'method', info: 'Set volume' },
  { label: 'pan', type: 'method', info: 'Set stereo pan' },
  { label: 'room', type: 'method', info: 'Set reverb amount' },
  { label: 'delay', type: 'method', info: 'Set delay amount' },
  { label: 'speed', type: 'method', info: 'Set playback speed' },
  { label: 'fast', type: 'method', info: 'Speed up a pattern' },
  { label: 'slow', type: 'method', info: 'Slow down a pattern' },
  { label: 'rev', type: 'method', info: 'Reverse a pattern' },
  { label: 'jux', type: 'method', info: 'Apply a transform to one stereo side' },
  { label: 'every', type: 'method', info: 'Apply a transform every n cycles' },
  { label: 'sometimes', type: 'method', info: 'Sometimes apply a transform' },
  { label: 'rarely', type: 'method', info: 'Rarely apply a transform' },
  { label: 'often', type: 'method', info: 'Often apply a transform' },
  { label: 'struct', type: 'method', info: 'Apply rhythmic structure' },
  { label: 'mask', type: 'method', info: 'Mask a pattern' },
  { label: 'euclid', type: 'method', info: 'Apply Euclidean rhythm' },
  { label: 'euclidRot', type: 'method', info: 'Apply rotated Euclidean rhythm' },
  { label: 'degrade', type: 'method', info: 'Randomly remove events' },
  { label: 'degradeBy', type: 'method', info: 'Remove events by probability' },
  { label: 'ply', type: 'method', info: 'Subdivide events' },
  { label: 'chunk', type: 'method', info: 'Apply a transform to chunks' },
  { label: 'loopAt', type: 'method', info: 'Fit a sample loop to cycles' },
  { label: 'hurry', type: 'method', info: 'Speed and pitch up together' },
  { label: 'late', type: 'method', info: 'Shift events later' },
  { label: 'early', type: 'method', info: 'Shift events earlier' },
  { label: 'legato', type: 'method', info: 'Set note duration' },
  { label: 'dict', type: 'method', info: 'Choose chord dictionary' },
  { label: 'offset', type: 'method', info: 'Offset chord or scale degree' },
  { label: 'voicing', type: 'method', info: 'Voice chord notes' },
  { label: 'voicings', type: 'method', info: 'Choose available chord voicings' },
  { label: 'mode', type: 'method', info: 'Set modal interpretation' },
  { label: 'anchor', type: 'method', info: 'Anchor voicing around a note' },
  { label: 'segment', type: 'method', info: 'Segment pattern values' },
  { label: 'clip', type: 'method', info: 'Clip event duration' },
  { label: 'size', type: 'method', info: 'Set pattern size' },
  { label: 'attack', type: 'method', info: 'Set envelope attack' },
  { label: 'release', type: 'method', info: 'Set envelope release' },
  { label: 'cutoff', type: 'method', info: 'Set filter cutoff' },
  { label: 'resonance', type: 'method', info: 'Set filter resonance' },
  { label: 'lpf', type: 'method', info: 'Set low-pass filter' },
  { label: 'hpf', type: 'method', info: 'Set high-pass filter' },
  { label: 'orbit', type: 'method', info: 'Route to an effect orbit' },
  { label: 'vowel', type: 'method', info: 'Apply vowel/formant filter' },
  { label: 'shape', type: 'method', info: 'Apply wave shaping' },
  { label: 'phaser', type: 'method', info: 'Apply phaser effect' },
  { label: 'fm', type: 'method', info: 'Apply FM modulation' },
  { label: 'lpq', type: 'method', info: 'Set low-pass filter Q' },
  { label: 'toBinaryPattern', type: 'method', info: 'Convert to a Genny binary pattern' },
  { label: 'play', type: 'method', info: 'Play a Genny/Strudel pattern' },
]

const allCodeCompletions = [...gennyCompletions, ...strudelCompletions]
const modelNameCompletions = gennyCompletions.filter(completion =>
  completion.label.startsWith('magenta_'),
)
const chainMethodLabels = new Set([
  'gen',
  'output',
  'temperature',
  'steps',
  'similar',
  'interpolate',
  's',
  'sound',
])
const methodOnlyLabels = new Set([
  'gen',
  'output',
  'temperature',
  'steps',
  'similar',
  'interpolate',
])
const methodCompletions = allCodeCompletions.filter(
  completion => completion.type === 'method' || chainMethodLabels.has(completion.label),
)
const functionCompletions = allCodeCompletions.filter(
  completion =>
    completion.type === 'function' &&
    !methodOnlyLabels.has(completion.label),
)

type MiniContext = 'sound' | 'bank' | 'note' | 'structure'

export const strudelCompletionSource = (context: CompletionContext): CompletionResult | null => {
  const doc = context.state.doc.toString()

  if (isInsideString(doc, context.pos)) {
    return null
  }

  const word = context.matchBefore(/[\w$]*/)
  if (!word || (word.from === word.to && !context.explicit)) {
    return null
  }

  const argumentCompletions = getArgumentCompletions(doc, word.from)
  const options = argumentCompletions
    ?? (isMethodCompletion(doc, word.from) ? methodCompletions : functionCompletions)

  return {
    from: word.from,
    options,
    validFor: /^[\w$]*$/,
  }
}

const getArgumentCompletions = (doc: string, from: number): Completion[] | null => {
  const callName = getInnermostCallName(doc, from)

  switch (callName) {
    case 'model':
      return modelNameCompletions
    default:
      return null
  }
}

const getInnermostCallName = (doc: string, from: number): string | null => {
  let depth = 0

  for (let index = from - 1; index >= 0; index--) {
    const char = doc[index]

    if (char === ')') {
      depth += 1
      continue
    }

    if (char !== '(') {
      continue
    }

    if (depth > 0) {
      depth -= 1
      continue
    }

    let nameEnd = index
    while (nameEnd > 0 && /\s/.test(doc[nameEnd - 1])) {
      nameEnd -= 1
    }

    let nameStart = nameEnd
    while (nameStart > 0 && /[\w$]/.test(doc[nameStart - 1])) {
      nameStart -= 1
    }

    const callName = doc.slice(nameStart, nameEnd)
    return callName || null
  }

  return null
}

const isMethodCompletion = (doc: string, from: number): boolean => {
  let index = from - 1
  while (index >= 0 && /\s/.test(doc[index])) {
    index -= 1
  }
  return doc[index] === '.'
}

const isInsideString = (doc: string, pos: number): boolean => {
  let quote: '"' | "'" | '`' | null = null
  let inLineComment = false
  let inBlockComment = false

  for (let index = 0; index < pos; index++) {
    const char = doc[index]
    const nextChar = doc[index + 1] ?? ''
    const previousChar = index > 0 ? doc[index - 1] : ''

    if (inLineComment) {
      if (char === '\n') {
        inLineComment = false
      }
      continue
    }

    if (inBlockComment) {
      if (char === '*' && nextChar === '/') {
        index += 1
        inBlockComment = false
      }
      continue
    }

    if (quote) {
      if (char === quote && previousChar !== '\\') {
        quote = null
      }
      continue
    }

    if (char === '/' && nextChar === '/') {
      index += 1
      inLineComment = true
      continue
    }

    if (char === '/' && nextChar === '*') {
      index += 1
      inBlockComment = true
      continue
    }

    if (char === '"' || char === "'" || char === '`') {
      quote = char
    }
  }

  return quote !== null
}

const callStartPattern = /(?:^|[.\s(])([A-Za-z_$][\w$]*)\(\s*(['"`])/g
const miniWordPattern = /[A-Za-z0-9][\w-]*/g
const noteTokenPattern = /[A-Ga-g](?:#|b)?\d*/g
const numberPattern = /\d+(?:\.\d+)?/g
const operatorPattern = /[*\/!?:<>\[\],|{}()]/g

const contextClass = (context: MiniContext): string => {
  switch (context) {
    case 'sound':
      return 'cm-strudel-sound'
    case 'bank':
      return 'cm-strudel-bank'
    case 'note':
      return 'cm-strudel-note'
    case 'structure':
      return 'cm-strudel-operator'
  }
}

const contextForCall = (name: string): MiniContext | null => {
  switch (name) {
    case 's':
    case 'sound':
      return 'sound'
    case 'bank':
      return 'bank'
    case 'note':
      return 'note'
    case 'n':
    case 'struct':
    case 'mask':
      return 'structure'
    default:
      return null
  }
}

const addTokenDecorations = (
  marks: Array<{ from: number; to: number; className: string }>,
  content: string,
  from: number,
  pattern: RegExp,
  className: string,
) => {
  pattern.lastIndex = 0
  let token: RegExpExecArray | null
  while ((token = pattern.exec(content))) {
    const tokenFrom = from + token.index
    const tokenTo = tokenFrom + token[0].length
    marks.push({ from: tokenFrom, to: tokenTo, className })
  }
}

const buildMiniNotationDecorations = (view: EditorView): DecorationSet => {
  const builder = new RangeSetBuilder<Decoration>()
  const marks: Array<{ from: number; to: number; className: string }> = []
  const doc = view.state.doc.toString()
  let match: RegExpExecArray | null

  callStartPattern.lastIndex = 0
  while ((match = callStartPattern.exec(doc))) {
    const miniContext = contextForCall(match[1])
    if (!miniContext) continue

    const quote = match[2]
    const contentFrom = match.index + match[0].length
    let cursor = contentFrom
    let contentTo = -1

    while (cursor < doc.length) {
      if (doc[cursor] === quote && doc[cursor - 1] !== '\\') {
        contentTo = cursor
        break
      }
      cursor += 1
    }

    if (contentTo <= contentFrom) continue

    const content = doc.slice(contentFrom, contentTo)
    addTokenDecorations(marks, content, contentFrom, operatorPattern, 'cm-strudel-operator')
    addTokenDecorations(marks, content, contentFrom, /~/g, 'cm-strudel-rest')
    if (miniContext !== 'sound' && miniContext !== 'bank') {
      addTokenDecorations(marks, content, contentFrom, numberPattern, 'cm-strudel-number')
    }
    addTokenDecorations(
      marks,
      content,
      contentFrom,
      miniContext === 'note' ? noteTokenPattern : miniWordPattern,
      contextClass(miniContext),
    )

    callStartPattern.lastIndex = contentTo + 1
  }

  marks
    .sort((a, b) => a.from - b.from || a.to - b.to)
    .forEach(mark => {
      builder.add(mark.from, mark.to, Decoration.mark({ class: mark.className }))
    })

  return builder.finish()
}

export const strudelMiniNotationHighlighter = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet

    constructor(view: EditorView) {
      this.decorations = buildMiniNotationDecorations(view)
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = buildMiniNotationDecorations(update.view)
      }
    }
  },
  {
    decorations: plugin => plugin.decorations,
  },
)
