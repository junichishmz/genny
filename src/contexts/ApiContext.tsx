/**
 * Genny2.0 API Context (TypeScript + Zustand)
 * Simplified context for component integration
 */

import React, { createContext, useContext, ReactNode } from 'react'
import { useGennyStore } from '../store/gennyStore'

interface ApiContextValue {
  // Re-export store selectors for compatibility
  code: string
  setCode: (code: string) => void
  systemStatus: any
  logs: any[]
}

const ApiContext = createContext<ApiContextValue | undefined>(undefined)

export const useApi = (): ApiContextValue => {
  const context = useContext(ApiContext)
  if (!context) {
    throw new Error('useApi must be used within an ApiProvider')
  }
  return context
}

interface ApiProviderProps {
  children: ReactNode
}

export const ApiProvider: React.FC<ApiProviderProps> = ({ children }) => {
  // Use Zustand store
  const { code, setCode, systemStatus, logs } = useGennyStore(state => ({
    code: state.code,
    setCode: state.setCode,
    systemStatus: state.systemStatus,
    logs: state.logs
  }))

  const value: ApiContextValue = {
    code,
    setCode,
    systemStatus,
    logs
  }

  return (
    <ApiContext.Provider value={value}>
      {children}
    </ApiContext.Provider>
  )
}

// Export both for compatibility
export { ApiProvider as default }
