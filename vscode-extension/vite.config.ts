import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Dynamically import Tailwind CSS v4 plugin
async function createConfig() {
  const { default: tailwindcss } = await import('@tailwindcss/vite')
  
  return {
    plugins: [
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src/webview"),
      },
    },
    build: {
      outDir: '../../webview-dist',
      rollupOptions: {
        input: {
          main: 'src/webview/index.html',
          'comment-modal': 'src/webview/comment-modal.html'
        },
        output: {
          entryFileNames: '[name].js',
          chunkFileNames: '[name].js',
          assetFileNames: '[name].[ext]'
        }
      },
      minify: 'esbuild' as const,
      target: 'es2020'
    },
    server: {
      port: 5173,
      strictPort: true
    },
    root: 'src/webview'
  }
}

// https://vite.dev/config/
export default defineConfig(createConfig())