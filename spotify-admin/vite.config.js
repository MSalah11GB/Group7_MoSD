import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        port: 5174
    },
    test: {
        environment: 'jsdom',
        setupFiles: './tests/setup.js',
        include: ['tests/**/*.test.{js,jsx}'],
    },
})
