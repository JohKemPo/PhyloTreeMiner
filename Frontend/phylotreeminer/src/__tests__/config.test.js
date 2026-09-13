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
  // `src/` fixa mais o literal `localhost:8000` — mas nem todo `fetch` passa
  // por `services/http.js` ainda (alguns componentes seguem com `fetch` cru
  // sobre `API_URL`/`WS_URL`, sem o header `X-User-ID` que `http.js` adiciona;
  // ver DEC-086, F-8 continua aberto nesses arquivos).
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
