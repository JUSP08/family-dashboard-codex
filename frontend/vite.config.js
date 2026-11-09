import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { randomUUID } from 'node:crypto'

const buildId = randomUUID()

// https://vitejs.dev/config/
export default defineConfig({
  define: { __DASHBOARD_BUILD_ID__: JSON.stringify(buildId) },
  plugins: [react(), {
    name: 'dashboard-build-version',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ buildId }) })
    },
  }],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8099', // <--- Your Python Server Port
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
