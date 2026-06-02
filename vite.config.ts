import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@components': resolve(__dirname, './src/components'),
      '@core': resolve(__dirname, './src/core'),
      '@types': resolve(__dirname, './src/types'),
      '@contexts': resolve(__dirname, './src/contexts')
    }
  },
  define: {
    global: 'globalThis',
  },
  server: {
    port: 3000,
    host: true
  },
  build: {
    target: 'esnext',
    sourcemap: true
  },
  esbuild: {
    loader: 'tsx',
    include: /src\/.*\.[tj]sx?$/,
    exclude: []
  },
  optimizeDeps: {
    include: ['@strudel/core', '@strudel/webaudio']
  }
})