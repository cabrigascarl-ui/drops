import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
export default defineConfig({ plugins: [tailwindcss()], server: { host: 'localhost', port: 5175, strictPort: true, watch: { ignored: ['**/.geo-source/**', '**/.npm-cache/**'] } } })
