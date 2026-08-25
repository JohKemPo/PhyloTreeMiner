import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const RAIZ = path.resolve(__dirname, '..', '..')
const SRC = path.join(RAIZ, 'src')
const pkg = JSON.parse(fs.readFileSync(path.join(RAIZ, 'package.json'), 'utf8'))

const declaradas = new Set([
  ...Object.keys(pkg.dependencies ?? {}),
  ...Object.keys(pkg.devDependencies ?? {}),
])

function arquivosFonte(dir = SRC, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) arquivosFonte(p, acc)
    else if (/\.(js|jsx)$/.test(e.name)) acc.push(p)
  }
  return acc
}

// C-1 / F-1: `uuid` era importado sem estar em package.json. O build só
// funcionava porque outro pacote o trazia transitivamente.
describe('dependências', () => {
  it('todo import externo está declarado em package.json', () => {
    const fantasmas = new Set()
    for (const f of arquivosFonte()) {
      const txt = fs.readFileSync(f, 'utf8')
      const importes = txt.matchAll(
        /^\s*(?:import|export)\s[^;\n]*?from\s+['"]([^'"]+)['"]/gm,
      )
      for (const m of importes) {
        const spec = m[1]
        if (spec.startsWith('.') || spec.startsWith('/')) continue
        const nome = spec.startsWith('@')
          ? spec.split('/').slice(0, 2).join('/')
          : spec.split('/')[0]
        if (!declaradas.has(nome) && !nome.startsWith('node:')) fantasmas.add(nome)
      }
    }
    expect([...fantasmas]).toEqual([])
  })
})
