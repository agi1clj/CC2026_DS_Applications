import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Dev server on port 3000 so `npm run dev` matches the Docker Compose URL.
export default defineConfig({
  plugins: [react()],
  server: { port: 3000 },
})
