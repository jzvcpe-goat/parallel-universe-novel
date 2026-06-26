import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const appSurface = mode === 'creator' ? 'creator' : 'reader'
  return {
  base: process.env.VITE_BASE_PATH || './',
  build: {
    outDir: appSurface === 'creator' ? 'dist-creator' : 'dist',
  },
  define: {
    'import.meta.env.VITE_APP_SURFACE': JSON.stringify(appSurface),
  },
  plugins: [react()],
  server: {
    port: 3000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@app-surface": path.resolve(
        __dirname,
        appSurface === 'creator' ? './src/apps/creator/LocalCreatorApp.tsx' : './src/App.tsx',
      ),
    },
  },
  }
});
