import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { smashRelayPlugin } from './server/wsRelay'

export default defineConfig({
  plugins: [react(), smashRelayPlugin()],
  server: { host: true },
  preview: { host: true },
})
