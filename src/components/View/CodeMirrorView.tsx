import React, { useRef, useEffect, useCallback } from 'react'
import { EditorView, keymap, Decoration, DecorationSet } from '@codemirror/view'
import { EditorState, StateField, StateEffect, Transaction } from '@codemirror/state'
import { javascript } from '@codemirror/lang-javascript'
import { autocompletion, closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete'
import { syntaxHighlighting, HighlightStyle, indentOnInput, bracketMatching, indentUnit } from '@codemirror/language'
import { tags } from '@lezer/highlight'
import { toggleComment, history, historyKeymap, defaultKeymap, indentWithTab } from '@codemirror/commands'
import { useGennyStore } from '../../store/gennyStore'
import {
  strudelCompletionSource,
  strudelMiniNotationHighlighter,
} from '../../editor/strudelEditorExtensions'
import strudelRuntime from '../../core/StrudelRuntime'

const PLAYBACK_TOGGLE_EVENT = 'genny:playback-toggle'
const PLAYBACK_UPDATE_EVENT = 'genny:playback-update'

// コードを文単位に分割する関数
const parseCodeStatements = (code: string): string[] => {
  // コメント行とコード行を識別し、意味のある文に分割
  const lines = code.split('\n')
  const statements: string[] = []
  let currentStatement = ''
  let inMultiLineComment = false
  
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex]
    const trimmedLine = line.trim()
    
    // 複数行コメントの処理
    if (trimmedLine.includes('/*')) {
      inMultiLineComment = true
    }
    if (trimmedLine.includes('*/')) {
      inMultiLineComment = false
      continue
    }
    if (inMultiLineComment) {
      continue
    }
    
    // 空行と単行コメントはスキップ
    if (!trimmedLine || trimmedLine.startsWith('//')) {
      continue
    }
    
    // 文の継続判定（関数呼び出し、配列、オブジェクトの複数行）
    currentStatement += (currentStatement ? '\n' : '') + line
    
    // 文の終了判定
    if (isStatementComplete(currentStatement)) {
      const nextLine = findNextCodeLine(lines, lineIndex + 1)
      if (!nextLine?.startsWith('.')) {
        statements.push(currentStatement)
        currentStatement = ''
      }
    }
  }
  
  // 最後の文も追加
  if (currentStatement.trim()) {
    statements.push(currentStatement)
  }
  
  return statements
}

const findNextCodeLine = (lines: string[], startIndex: number): string | null => {
  let inMultiLineComment = false

  for (let i = startIndex; i < lines.length; i++) {
    const trimmedLine = lines[i].trim()

    if (trimmedLine.includes('/*')) {
      inMultiLineComment = true
    }
    if (inMultiLineComment) {
      if (trimmedLine.includes('*/')) {
        inMultiLineComment = false
      }
      continue
    }
    if (!trimmedLine || trimmedLine.startsWith('//')) {
      continue
    }

    return trimmedLine
  }

  return null
}

const isLikelyStrudelReplCode = (code: string): boolean => {
  const withoutComments = code
    .split('\n')
    .filter(line => !line.trim().startsWith('//'))
    .join('\n')

  if (/\bpattern[1-4]\s*\(/.test(withoutComments)) {
    return false
  }

  return /(^|\n)\s*p\d+\s*:|\bsamples\s*\(|\bsetcps\s*\(|\bsetcpm\s*\(|\bchord\s*\(|\bstack\s*\(|\bn\s*\(|\bs\s*\(|\brand\.|\bperlin\.|\bsine\.|\btri\.|\.struct\s*\(|\.mask\s*\(|\.bank\s*\(|\.scale\s*\(|\.voicing\s*\(|\.late\s*\(|\.early\s*\(|\.chunk\s*\(/.test(withoutComments)
}

// 文が完結しているかチェック
const isStatementComplete = (statement: string): boolean => {
  const trimmed = statement.trim()
  if (!trimmed) return false
  
  // セミコロンで終わる場合は完結
  if (trimmed.endsWith(';')) return true
  
  // 波括弧、角括弧、丸括弧のバランスチェック
  let braceCount = 0
  let bracketCount = 0
  let parenCount = 0
  let inString = false
  let stringChar = ''
  
  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed[i]
    const prevChar = i > 0 ? trimmed[i - 1] : ''
    
    // 文字列リテラル内の判定
    if ((char === '"' || char === "'" || char === '`') && prevChar !== '\\') {
      if (!inString) {
        inString = true
        stringChar = char
      } else if (char === stringChar) {
        inString = false
        stringChar = ''
      }
    }
    
    if (!inString) {
      switch (char) {
        case '{': braceCount++; break
        case '}': braceCount--; break
        case '[': bracketCount++; break
        case ']': bracketCount--; break
        case '(': parenCount++; break
        case ')': parenCount--; break
      }
    }
  }
  
  // すべての括弧が閉じられている場合は完結
  return braceCount === 0 && bracketCount === 0 && parenCount === 0
}

const CodeMirrorView: React.FC = () => {
  const editorCode = useGennyStore(state => state.code)
  
  // バックグラウンド同期用のdebounce関数
  const syncToStore = useCallback(
    (() => {
      let timeoutId: number | null = null
      return (code: string) => {
        if (timeoutId) clearTimeout(timeoutId)
        timeoutId = window.setTimeout(() => {
          useGennyStore.getState().setCode(code)
        }, 100)
      }
    })(),
    []
  )
  
  const editorRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const isUpdatingRef = useRef(false)
  const highlightTimeoutRef = useRef<number | null>(null)

  // StateEffect for adding highlight decorations
  const addHighlight = StateEffect.define<{from: number, to: number}>()
  const clearHighlights = StateEffect.define()

  // StateField for managing highlight decorations
  const highlightField = StateField.define<DecorationSet>({
    create() {
      return Decoration.none
    },
    update(highlights, tr) {
      highlights = highlights.map(tr.changes)
      
      for (let effect of tr.effects) {
        if (effect.is(addHighlight)) {
          const decoration = Decoration.mark({
            class: "cm-execution-highlight"
          }).range(effect.value.from, effect.value.to)
          highlights = highlights.update({
            add: [decoration]
          })
        } else if (effect.is(clearHighlights)) {
          highlights = Decoration.none
        }
      }
      
      return highlights
    },
    provide: f => EditorView.decorations.from(f)
  })

  // Execution function from store
  const executeCode = useCallback(async (codeToExecute?: string) => {
    const store = useGennyStore.getState()
    const currentCode = viewRef.current?.state.doc.toString() || editorCode
    const targetCode = codeToExecute || currentCode
    
    try {
      store.setExecuting(true)
      
      // Clear previous sound patterns before execution
      const clearPrevious = (globalThis as any).clearPreviousExecution
      if (clearPrevious) {
        clearPrevious()
      }
      
      // エディタ実行時に新しいセッションを開始（前のセッションは自動停止）
      const audioEngine = (globalThis as any).strudelAudioEngine
      if (audioEngine && audioEngine.startNewExecutionSession) {
        audioEngine.startNewExecutionSession()
      }

      if (isLikelyStrudelReplCode(targetCode)) {
        await strudelRuntime.evaluate(targetCode)
        store.updateSystemStatus({ isPlaying: true })
        store.setLastExecution({
          success: true,
          result: null,
          type: 'strudel'
        })
        return
      }
      
      // 複数の文を分割して順次実行
      const statements = parseCodeStatements(targetCode)
      let result = null
      
      for (const [index, statement] of statements.entries()) {
        if (statement.trim()) {
          try {
            // Execute each statement individually
            const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor
            const executor = new AsyncFunction('console', 'globalThis', statement)
            result = await executor(console, globalThis)
          } catch (statementError) {
            store.addLog({
              level: 'error',
              message: `Statement ${index + 1} failed: ${statementError instanceof Error ? statementError.message : 'Unknown error'}`
            })
            // Continue execution of remaining statements
          }
        }
      }
      
      store.setLastExecution({
        success: true,
        result,
        type: 'hybrid'
      })
      store.updateSystemStatus({ isPlaying: true })
    } catch (error) {
      store.addLog({
        level: 'error',
        message: `Execution error: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
      
      store.setLastExecution({
        success: false,
        result: null,
        error: error as Error,
        type: 'hybrid'
      })
    } finally {
      store.setExecuting(false)
    }
  }, [])

  // コード実行時のハイライト機能
  const highlightExecutedCode = useCallback((from: number, to: number) => {
    if (!viewRef.current) return

    const view = viewRef.current
    
    // Add highlight decoration
    view.dispatch({
      effects: [
        clearHighlights.of(null),
        addHighlight.of({ from, to })
      ]
    })
    
    // Clear highlight after 500ms
    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current)
    }
    
    highlightTimeoutRef.current = window.setTimeout(() => {
      if (viewRef.current) {
        viewRef.current.dispatch({
          effects: [clearHighlights.of(null)]
        })
      }
    }, 500)
  }, [])

  // 簡素化された全体実行機能
  const executeFullCode = useCallback(async () => {
    // 現在のエディター全体内容を実行
    const currentCode = viewRef.current?.state.doc.toString() || editorCode

    // ハイライト表示（全体）
    if (viewRef.current) {
      const docLength = viewRef.current.state.doc.length
      highlightExecutedCode(0, docLength)
    }
    
    // 実行
    await executeCode(currentCode)
  }, [executeCode, highlightExecutedCode])

  const stopPlayback = useCallback(() => {
    const store = useGennyStore.getState()
    store.stopAllPatterns()
    
    // Stop audio engine
    const audioEngine = (globalThis as any).strudelAudioEngine
    if (audioEngine) {
      audioEngine.stop()
    }

    strudelRuntime.stop()
    
    store.addLog({
      level: 'info',
      message: 'Playback stopped'
    })
  }, [])

  useEffect(() => {
    const handlePlaybackToggle = () => {
      const { systemStatus } = useGennyStore.getState()
      if (systemStatus.isPlaying) {
        stopPlayback()
      } else {
        executeFullCode()
      }
    }

    const handlePlaybackUpdate = () => {
      executeFullCode()
    }

    window.addEventListener(PLAYBACK_TOGGLE_EVENT, handlePlaybackToggle)
    window.addEventListener(PLAYBACK_UPDATE_EVENT, handlePlaybackUpdate)

    return () => {
      window.removeEventListener(PLAYBACK_TOGGLE_EVENT, handlePlaybackToggle)
      window.removeEventListener(PLAYBACK_UPDATE_EVENT, handlePlaybackUpdate)
    }
  }, [executeFullCode, stopPlayback])

  useEffect(() => {
    if (!editorRef.current || viewRef.current) return

    // カスタムシンタックスハイライト for Genny + Strudel
    const gennyStrudelHighlight = HighlightStyle.define([
      {tag: tags.comment, color: '#94a6a6'},
      {tag: tags.variableName, color: '#75baff'},
      {tag: tags.function(tags.variableName), color: '#78d6ff'},
      {tag: [tags.propertyName, tags.function(tags.propertyName)], color: '#78d6ff'},
      {tag: [tags.string, tags.special(tags.brace)], color: '#e8f5ff'},
      {tag: tags.number, color: '#b7f7ff'},
      {tag: tags.bool, color: '#b7f7ff'},
      {tag: tags.null, color: '#b7f7ff'},
      {tag: tags.keyword, color: '#ffffff'},
      {tag: tags.operator, color: '#d6d6e7'},
      {tag: tags.punctuation, color: '#d6d6e7'},
      {tag: tags.bracket, color: '#d6d6e7'},
      {tag: tags.className, color: '#5c6166'},
      {tag: tags.typeName, color: '#5c6166'},
    ])

    const view = new EditorView({
      state: EditorState.create({
        doc: editorCode,
        extensions: [
          javascript({ jsx: true }),
          // テキストエディタとしての基本機能: undo/redo・自動インデント・括弧補完
          history(),
          indentUnit.of('    '),
          indentOnInput(),
          bracketMatching(),
          closeBrackets(),
          syntaxHighlighting(gennyStrudelHighlight),
          strudelMiniNotationHighlighter,
          highlightField,
          keymap.of([
            {
              key: 'Cmd-Enter',
              run: () => {
                executeFullCode()
                return true
              }
            },
            {
              key: 'Ctrl-Enter', 
              run: () => {
                // Windows/Linux用
                executeFullCode()
                return true
              }
            },
            {
              key: 'Cmd-.',
              run: () => {
                stopPlayback()
                return true
              }
            },
            {
              key: 'Ctrl-.',
              run: () => {
                // Windows/Linux用
                stopPlayback()
                return true
              }
            },
            {
              key: 'Cmd-/',
              run: toggleComment
            },
            {
              key: 'Ctrl-/',
              run: toggleComment
            }
          ]),
          // 標準のテキストエディタ操作（undo/redo・改行＋自動インデント・括弧補完・Tab）
          // カスタムキーマップの後に置くことで Cmd-Enter 等が優先される
          keymap.of([
            ...closeBracketsKeymap,
            ...defaultKeymap,
            ...historyKeymap,
            indentWithTab,
          ]),
          autocompletion({
            override: [strudelCompletionSource],
            maxRenderedOptions: 12,
            activateOnTyping: true,
          }),
          EditorView.updateListener.of((update) => {
            if (update.docChanged && !isUpdatingRef.current) {
              const newCode = update.state.doc.toString()
              // フラグを設定して無限ループを防ぐ
              isUpdatingRef.current = true
              syncToStore(newCode)
              
              // 次のフレームでフラグをリセット
              requestAnimationFrame(() => {
                isUpdatingRef.current = false
              })
            }
          }),
          EditorView.theme({
            '&': {
              color: '#ffffff',
              backgroundColor: 'rgba(0, 0, 0, 0)',
              fontSize: '14px',
              height: '100%'
            },
            '.cm-content': {
              padding: '16px',
              fontSize: '14px',
              lineHeight: '1.5',
              fontFamily: 'Inconsolata, "Source Code Pro", Monaco, Menlo, monospace',
              caretColor: '#00e5ff'
            },
            '.cm-focused': {
              outline: 'none'
            },
            '.cm-cursor': {
              borderLeftColor: '#00e5ff',
              borderLeftWidth: '3px',
              boxShadow: '0 0 6px #00e5ff'
            },
            '.cm-selectionBackground': {
              backgroundColor: '#00e5ff33'
            },
            '.cm-activeLine': {
              backgroundColor: '#8a91991a'
            },
            '.cm-execution-highlight': {
              backgroundColor: 'rgba(255, 255, 255, 0.35)',
              animation: 'execution-flash 0.5s ease-out'
            },
            '.cm-strudel-sound': {
              color: '#9db4ff !important',
              fontWeight: '600'
            },
            '.cm-strudel-bank': {
              color: '#ffdc7a !important',
              fontWeight: '600'
            },
            '.cm-strudel-note': {
              color: '#78d6ff !important',
              fontWeight: '600'
            },
            '.cm-strudel-rest': {
              color: '#ff8f9f !important',
              fontWeight: '600'
            },
            '.cm-strudel-operator': {
              color: '#ffffff !important'
            },
            '.cm-strudel-number': {
              color: '#c6a3ff !important'
            },
            '@keyframes execution-flash': {
              '0%': { backgroundColor: 'rgba(255, 255, 255, 0.55)' },
              '100%': { backgroundColor: 'rgba(255, 255, 255, 0.2)' }
            },
            '.cm-gutters': {
              backgroundColor: '#282c34',
              color: 'rgba(255, 255, 255, 0.35)',
              border: 'none'
            },
            '.cm-gutterElement': {
              padding: '0 8px'
            },
            '.cm-scroller': {
              fontFamily: 'Inconsolata, "Source Code Pro", Monaco, Menlo, monospace'
            },
            '.cm-tooltip': {
              backgroundColor: '#111722',
              color: '#e9f6ff',
              border: '1px solid rgba(157, 180, 255, 0.34)',
              borderRadius: '8px',
              boxShadow: '0 18px 44px rgba(0, 0, 0, 0.42), 0 0 0 1px rgba(255, 255, 255, 0.04)',
              overflow: 'hidden',
            },
            '.cm-tooltip-autocomplete': {
              padding: '6px',
            },
            '.cm-tooltip-autocomplete > ul': {
              maxHeight: '280px',
              minWidth: '260px',
              fontFamily: 'Inconsolata, "Source Code Pro", Monaco, Menlo, monospace',
            },
            '.cm-tooltip-autocomplete > ul > li': {
              display: 'flex',
              alignItems: 'center',
              minHeight: '28px',
              padding: '3px 10px 3px 6px',
              borderRadius: '6px',
              color: '#d8e9f8',
            },
            '.cm-tooltip-autocomplete > ul > li[aria-selected]': {
              backgroundColor: 'rgba(121, 145, 255, 0.2)',
              color: '#ffffff',
            },
            '.cm-completionLabel': {
              fontWeight: '600',
            },
            '.cm-completionMatchedText': {
              color: '#ffdc7a',
              textDecoration: 'none',
            },
            '.cm-completionDetail': {
              marginLeft: 'auto',
              color: 'rgba(216, 233, 248, 0.58)',
              fontSize: '12px',
            },
            '.cm-completionInfo': {
              maxWidth: '300px',
              padding: '10px 12px',
              backgroundColor: '#151d2b',
              border: '1px solid rgba(120, 214, 255, 0.25)',
              borderRadius: '8px',
              color: '#cfe9ff',
              fontSize: '12px',
              lineHeight: '1.35',
            },
            '.cm-completionIcon': {
              display: 'none',
            },
            '&.cm-editor': {
              height: '100%'
            },
            '.cm-editor': {
              height: '100%'
            }
          })
        ]
      }),
      parent: editorRef.current
    })

    viewRef.current = view

    return () => {
      // タイムアウトをクリア
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current)
      }
      
      if (viewRef.current) {
        viewRef.current.destroy()
        viewRef.current = null
      }
    }
  }, [executeCode, stopPlayback, executeFullCode, highlightExecutedCode])

  // 外部からのコード変更を同期
  useEffect(() => {
    if (viewRef.current && !isUpdatingRef.current) {
      const currentDoc = viewRef.current.state.doc.toString()
      if (currentDoc !== editorCode) {
        isUpdatingRef.current = true
        
        viewRef.current.dispatch({
          changes: {
            from: 0,
            to: currentDoc.length,
            insert: editorCode
          },
          // 生成結果の書き戻しなど外部同期は undo 履歴に積まない
          annotations: Transaction.addToHistory.of(false)
        })
        
        requestAnimationFrame(() => {
          isUpdatingRef.current = false
        })
      }
    }
  }, [editorCode])

  return (
    <div className="codemirror">
      <div
        ref={editorRef}
        className="codemirror-shell"
      />
    </div>
  )
}

export default CodeMirrorView
