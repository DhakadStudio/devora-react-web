import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The build id is stamped into every bundle. The app compares it against the
// id stored in localStorage on load — a stale tab (running an older build
// from before a deploy) auto-reloads ONCE, so deploys self-heal instead of
// leaving users on broken chunks ("Failed to fetch dynamically imported
// module" / the atob crash class).
export default defineConfig({
  define: {
    __BUILD_ID__: JSON.stringify(`v1-${Date.now().toString(36)}`)
  },
  plugins: [react()],
  server: { port: 5173, host: true },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          monaco: ['@monaco-editor/react'],
          vendor: ['react', 'react-dom', 'react-router-dom']
        }
      }
    }
  }
})
