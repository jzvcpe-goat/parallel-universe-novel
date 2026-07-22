import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const appSurface = mode === 'creator' || mode === 'creator-qa' ? 'creator' : 'reader'
  const isCreatorQa = mode === 'creator-qa'
  return {
  base: process.env.VITE_BASE_PATH || (appSurface === 'creator' ? '/' : './'),
  build: {
    outDir: isCreatorQa ? 'dist-creator-qa' : appSurface === 'creator' ? 'dist-creator' : 'dist',
  },
  define: {
    'import.meta.env.VITE_APP_SURFACE': JSON.stringify(appSurface),
  },
  plugins: [react()],
  server: {
    port: 3000,
  },
  resolve: {
    alias: [
      ...(isCreatorQa
        ? [
            {
              find: "@/lib/pmfSupabase",
              replacement: path.resolve(__dirname, "./src/__fixtures__/pmfSupabase.creator-qa.ts"),
            },
          ]
        : []),
      {
        find: "@app-surface",
        replacement: path.resolve(
          __dirname,
          appSurface === 'creator' ? './src/apps/creator/LocalCreatorApp.tsx' : './src/App.tsx',
        ),
      },
      {
        find: "@",
        replacement: path.resolve(__dirname, "./src"),
      },
    ],
  },
  }
});
