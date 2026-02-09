import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  resolve: {
    alias: {
      // Resolve modules from parent directory's node_modules if not found locally
    },
  },
  // Try to resolve dependencies from parent node_modules
  optimizeDeps: {
    include: ['emoji-picker-react', '@tiptap/react', '@tiptap/starter-kit', '@tiptap/extension-link'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
    // Ensure dynamic imports are handled correctly
    commonjsOptions: {
      include: [/node_modules/],
    },
  },
})
