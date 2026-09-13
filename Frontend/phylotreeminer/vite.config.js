import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // F-2: o alvo do proxy vem do mesmo `VITE_API_URL` que o app usa em
  // runtime (src/config.js) — nenhum endereço fixo se o `.env.development`
  // for sobrescrito. Só usado por quem optar por chamar caminhos relativos
  // (`/api/...`) durante `vite dev`; o app hoje chama a URL absoluta.
  // `'.'` (não `process.cwd()`): este arquivo cai sob `globals: browser` do
  // eslint.config.js compartilhado, que não conhece `process` — e o Vite já
  // roda a partir da raiz do projeto de qualquer forma.
  const env = loadEnv(mode, '.', 'VITE_')
  const backend = env.VITE_API_URL

  return {
    plugins: [react()],
    server: backend
      ? {
          proxy: {
            '/api': { target: backend, changeOrigin: true },
            '/ws': { target: backend, changeOrigin: true, ws: true },
          },
        }
      : undefined,
  }
})
