// Catraca de lint: o débito existente é tolerado, o crescimento não.
// Para baixar a linha de base: corrija erros e rode `npm run lint:baseline`.
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'

const BASELINE = new URL('../.eslint-baseline.json', import.meta.url)

function contar() {
  let saida
  try {
    saida = execFileSync('npx', ['eslint', '.', '-f', 'json'], {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    })
  } catch (e) {
    saida = e.stdout
  }
  const relatorio = JSON.parse(saida)
  return relatorio.reduce(
    (acc, f) => ({
      errors: acc.errors + f.errorCount,
      warnings: acc.warnings + f.warningCount,
    }),
    { errors: 0, warnings: 0 },
  )
}

const atual = contar()

if (process.argv.includes('--write')) {
  fs.writeFileSync(BASELINE, JSON.stringify(atual, null, 2) + '\n')
  console.log('linha de base gravada:', atual)
  process.exit(0)
}

const base = JSON.parse(fs.readFileSync(BASELINE, 'utf8'))
console.log(
  `lint  erros ${atual.errors}/${base.errors}  avisos ${atual.warnings}/${base.warnings}`,
)

if (atual.errors > base.errors || atual.warnings > base.warnings) {
  console.error('\nA catraca subiu. Corrija o que você introduziu.')
  process.exit(1)
}
if (atual.errors < base.errors || atual.warnings < base.warnings) {
  console.log('\nDébito reduzido. Rode `npm run lint:baseline` para fixar o ganho.')
}
