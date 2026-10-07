import react from '@vitejs/plugin-react'
import { defineConfig, searchForWorkspaceRoot } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // nombres.json lives in the project root, shared with the Python POC.
    fs: { allow: [searchForWorkspaceRoot(process.cwd()), '../nombres.json'] },
  },
})
