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

  // F-2 / Arq-C: 13 arquivos fixam http://localhost:8000. A aplicação não roda
  // fora da máquina do autor. A correção é a trilha T4 do marco M5.
  it.fails('nenhum arquivo fixa o endereço do backend', () => {
    expect(ofensores).toEqual([])
  })

  it('o defeito está contido e não se espalhou', () => {
    expect(ofensores.length).toBeLessThanOrEqual(13)
  })

  it.fails('o endereço do backend vem do ambiente', () => {
    const usaEnv = arquivosFonte().some((f) =>
      /import\.meta\.env\.VITE_/.test(fs.readFileSync(f, 'utf8')),
    )
    expect(usaEnv).toBe(true)
  })
})
