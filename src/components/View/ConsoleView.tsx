import React, { useEffect, useRef } from 'react'
import { useLogs } from '../../store/gennyStore'

const ConsoleView: React.FC = () => {
  const logs = useLogs()
  const consoleRef = useRef<HTMLDivElement>(null)
  const isConsoleMessage = (message: string, level: string) => {
    const normalized = message.toLowerCase()
    return (
      level === 'error' ||
      normalized.startsWith('generated') ||
      normalized.startsWith('output') ||
      normalized.includes('failed')
    )
  }
  const latestLogs = logs
    .filter(log => isConsoleMessage(log.message, log.level))
    .slice(-4)
  const cleanMessage = (message: string) =>
    message
      .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
      .replace(/\s+/g, ' ')
      .trim()

  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight
    }
  }, [logs])

  return (
    <div className="console-view" ref={consoleRef}>
      <p>console :</p>
      {latestLogs.length === 0 ? (
        <p className="console-muted">ready</p>
      ) : (
        latestLogs.map((log, index) => (
          <p
            key={`${log.timestamp}-${index}`}
            className={`console-line console-${log.level}`}
          >
            {cleanMessage(log.message)}
          </p>
        ))
      )}
    </div>
  )
}

export default ConsoleView
