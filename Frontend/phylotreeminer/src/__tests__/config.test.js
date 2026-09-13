import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const SRC = path.resolve(__dirname, '..')

function arquivosFonte(dir = SRC, acc = []) {
  for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entrada.name)
    if (entrada.isDirectory()) {
      if (entrada.name !== '__tests__') arquivosFonte(p, acc)
    } else if (/\.(js|jsx)$/.test(entrada.name)) {
      acc.push(p)
    }
  }
  return acc
}

const semComentarios = (txt) =>
  txt.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

describe('configuração de endereço da API', () => {
  const ofensores = arquivosFonte()
    .filter((f) => /localhost:8000/.test(semComentarios(fs.readFileSync(f, 'utf8'))))
    .map((f) => path.relative(SRC, f))

  // F-2 / Arq-C, M5: corrigido — `src/config.js` lê `VITE_API_URL`/`VITE_WS_URL`
  // do ambiente (`.env.development`/`.env.production`). Nenhum arquivo de
  // `src/` fixa mais o literal `localhost:8000`.
  //
  // F-8: fechado — todo `fetch`/`WebSocket` que fala com o NOSSO backend passa
  // por `services/http.js` (`httpGet`/`httpPost`/`httpPut`/`httpPatch`/
  // `httpDelete`/`wsUrl`), que já anexa `X-User-ID` e lança `ApiError`. Sobram
  // só duas exceções deliberadas, cada uma com o motivo comentado no próprio
  // arquivo:
  //   - `GraphVisualization.checkConnectionStatus` (`/status`): decide o
  //     estado pelo CORPO da resposta, não pelo status HTTP — precisa ler o
  //     JSON mesmo com `!response.ok` para mostrar o aviso de Neo4j fora do
  //     ar, e `httpGet` lançaria antes disso.
  //   - `useGeocoding.getCoordinatesForCountryWithFallback`: chama o
  //     Nominatim (OpenStreetMap), um terceiro — não o nosso backend.
  //     `httpGet` anexaria `X-User-ID` a essa chamada, vazando um
  //     identificador interno para fora.
  it('nenhum arquivo fixa o endereço do backend', () => {
    expect(ofensores).toEqual([])
  })

  it('o endereço do backend vem do ambiente', () => {
    const usaEnv = arquivosFonte().some((f) =>
      /import\.meta\.env\.VITE_/.test(fs.readFileSync(f, 'utf8')),
    )
    expect(usaEnv).toBe(true)
  })
})
