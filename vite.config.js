import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// version.json beside each build, so a running Atlas can tell a newer one is live
// (src/components/UpdateNotice.jsx). The dev server answers it too; set
// ATLAS_FAKE_VERSION to see the "new version" notice on localhost.
function versionFile() {
  const version = () => readFileSync(new URL('./src/version.js', import.meta.url), 'utf8').match(/VERSION = '([^']+)'/)?.[1] ?? ''
  const body = (v) => JSON.stringify({ version: v, builtAt: new Date().toISOString() })
  return {
    name: 'atlas-version-file',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.split('?')[0].endsWith('/version.json')) return next()
        res.setHeader('Content-Type', 'application/json')
        res.setHeader('Cache-Control', 'no-store')
        res.end(body(process.env.ATLAS_FAKE_VERSION || version()))
      })
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'version.json', source: body(version()) })
    },
  }
}

export default defineConfig({
  plugins: [react(), versionFile()],
})
