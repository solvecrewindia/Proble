import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'logo-dark.png', 'logo-light.png'],
      devOptions: {
        enabled: true
      },
      manifest: {
        name: 'Proble',
        short_name: 'Proble',
        description: 'Proble Learning Platform',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'favicon.png',
            sizes: '64x64 32x32 24x24 16x16',
            type: 'image/png'
          },
          {
            src: 'logo-dark.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'logo-dark.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  envPrefix: ['VITE_', 'GROQ_'],
})
