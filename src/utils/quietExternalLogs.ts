const externalNoisePatterns = [
  'Tone.js v',
  'An AudioContext was prevented from starting automatically',
  'Platform browser has already been set',
  'webgl backend was already registered',
  'Cannot access "buffer.Buffer" in client code',
  /^The kernel '.+' for backend '.+' is already registered/,
]

const isExternalNoise = (args: unknown[]): boolean => {
  const message = args.map(arg => String(arg)).join(' ')
  return externalNoisePatterns.some(pattern =>
    typeof pattern === 'string' ? message.includes(pattern) : pattern.test(message),
  )
}

export async function withMutedExternalLogs<T>(operation: () => Promise<T>): Promise<T> {
  const originalLog = console.log
  const originalWarn = console.warn

  console.log = (...args: unknown[]) => {
    if (!isExternalNoise(args)) originalLog(...args)
  }
  console.warn = (...args: unknown[]) => {
    if (!isExternalNoise(args)) originalWarn(...args)
  }

  try {
    return await operation()
  } finally {
    console.log = originalLog
    console.warn = originalWarn
  }
}
