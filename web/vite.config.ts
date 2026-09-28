import react from '@vitejs/plugin-react'
import { defineConfig, searchForWorkspaceRoot } from 'vite'

const backend = 'http://127.0.0.1:8000'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: { '/api': backend },
    // nombres.json lives in the project root, shared with the Python POC.
    fs: { allow: [searchForWorkspaceRoot(process.cwd()), '../nombres.json'] },
  },
  preview: {
    proxy: { '/api': backend },
  },
})
