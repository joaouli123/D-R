import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')

  // Em desenvolvimento o front fala com a API pelo próprio host,
  // via proxy. Isso mantém o cookie de sessão como same-site e
  // dispensa configurar CORS para trabalhar localmente.
  const alvoApi = env.VITE_API_PROXY ?? 'http://localhost:3333'

  return {
    plugins: [react()],
    resolve: {
      alias: { '@': path.resolve(__dirname, './src') },
    },
    server: {
      port: 5173,
      host: true,
      proxy: {
        '/api': {
          target: alvoApi,
          changeOrigin: true,
          rewrite: (caminho) => caminho.replace(/^\/api/, ''),
        },
        // Fotos das vistorias servidas pelo backend.
        '/uploads': { target: alvoApi, changeOrigin: true },
      },
    },
  }
})
