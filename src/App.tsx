import React, { useEffect, useRef } from 'react'
import { ApiProvider } from '@contexts/ApiContext'
import Header from '@components/View/Header'
import CodeMirrorView from '@components/View/CodeMirrorView'
import ConsoleView from '@components/View/ConsoleView'
import hybridSystem from '@core/HybridSystem'
import { useGennyStore } from './store/gennyStore'
import './App.css'

const App: React.FC = () => {
  const addLog = useGennyStore(state => state.addLog)
  const initializeRef = useRef(false)

  useEffect(() => {
    // React StrictModeでの重複実行を防ぐ
    if (initializeRef.current) return
    initializeRef.current = true

    // HybridSystemの初期化
    const initializeSystem = async () => {
      try {
        addLog({
          level: 'info',
          message: 'Initializing Genny Strudel Hybrid System...'
        })
        
        await hybridSystem.initialize()
        
        addLog({
          level: 'info',
          message: 'Genny Strudel ready - TypeScript + Vite + Zustand + Strudel'
        })
      } catch (error) {
        console.error('Failed to initialize Genny Strudel:', error)
        addLog({
          level: 'error',
          message: `Initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        })
      }
    }

    initializeSystem()
  }, [addLog])

  return (
    <ApiProvider>
      <div className="App">
        <Header />
        <div className="main-container">
          <div className="editor-section">
            <CodeMirrorView />
            <ConsoleView />
          </div>
          {/* Visual section will be re-enabled after full TS migration */}
          {/* <div className="visual-section">
            <GlslView />
          </div> */}
        </div>
      </div>
    </ApiProvider>
  )
}

export default App
