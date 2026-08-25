---
name: validar-workflow
description: Executa o workflow do PhyloTreeMiner de ponta a ponta no conjunto de validação (Zika-21) e confere que as correções de M1 e M2.5 materializaram nos artefatos. Use depois de qualquer mudança no pipeline (BioComp_UFF/**) e sempre que a máquina de validação for reexecutar experimentos.
---

# validar-workflow — o pipeline de ponta a ponta, no conjunto de validação

Testes de unidade provam que uma função calcula certo. Só a execução completa prova que o **artefato gravado** carrega o número certo — e M1 corrigiu o pipeline sem tocar em nenhum artefato existente, então essa distinção é o eixo do projeto inteiro.

## O conjunto de validação

`Zika_Virus_Singapura_Large_21seq` — 20 táxons, alinhamento de ~10,8 kb. Escolhido por três razões, e não por ser o menor:

1. **Roda inteiro em minutos**, o que permite validar a cada mudança em vez de uma vez por mês.
2. **O braço `clustalo` é genuíno aqui.** Nos conjuntos de *Variola* as sequências têm ~250 kb, acima do limite de 20 kb de `_isExecutableByClustalO`, e o controlador troca silenciosamente para MAFFT — os dois braços viram cópias byte a byte ([D1](../../science/02-defeitos-que-alteram-resultado.md#d1)). Com 10,8 kb o Clustal Omega executa de verdade, e o fator alinhador passa a existir.
3. **O RAxML conclui sem drama**, ao contrário de *Variola*, onde o `--threads auto` derrubava o processo ([D17](../../science/02-defeitos-que-alteram-resultado.md#d17)).

**Nunca sobrescreva o projeto original.** Ele é a evidência do "antes". Rode num projeto novo e compare.

## Procedimento

### 1. Montar a configuração

```jsonc
{
  "log_file": true,
  "project_name": "Zika_21seq_validacao",
  "output_log": "<raiz>/BioComp_UFF/projects/Zika_21seq_validacao/out",
  "tree_config": {
    "mode": "auto",
    "ignore_mode": ["mrbayes"],       // declare o que ficou de fora, e por quê
    "construct_tree_method": "distance",
    "align_method": "mafft",
    "num_threads": 4,                  // governa só o ALINHAMENTO
    "random_seed": 12345,              // M2.5 — sem isso não há reprodução
    "raxml_threads": 4,                // D17 — nunca deixe em `auto`
    "iqtree_threads": 4,
    "input_path": "<raiz>/BioComp_UFF/data/Zika479_Test_large",
    "output_path": "<raiz>/BioComp_UFF/projects/Zika_21seq_validacao/out",
    "output_format": "nexus"
  },
  "subtree_config": { /* ... com subtree_miner: true e support_fpmax: "auto" */ }
}
```

`mode: "auto"` cruza **2 alinhadores × {nj, upgma} × {distance, parsimony}** e ainda roda os métodos avançados não ignorados — `fasttree`, `iqtree`, `raxml`. São até 14 árvores.

### 2. Executar

```bash
cd BioComp_UFF && python workflow.py -p <config>.json
```

Precisa de rede: o passo de metadados baixa os registros do GenBank.

### 3. Conferir

```bash
cd Backend && python scripts/conferir_correcoes_m1.py Zika_21seq_validacao Zika_Virus_Singapura_Large_21seq
```

O script confere, direto nos arquivos gravados:

| Verificação | O que prova |
|---|---|
| `manifest.json` com `run_id`, `finished_at`, versões, commits, SHA-256 | M2.5 / [D11](../../science/02-defeitos-que-alteram-resultado.md#d11) |
| nenhum caminho absoluto no manifesto | [D15](../../science/02-defeitos-que-alteram-resultado.md#d15) tratado na origem |
| `all_results_fpmax.csv` com uma linha por itemset e as quatro colunas | M1.1 / [D4](../../science/02-defeitos-que-alteram-resultado.md#d4) |
| nenhum limiar acima do suporte real | o `support` é suporte, não parâmetro |
| nenhum padrão frágil **e** robusto ao mesmo tempo | a contradição que D4 produzia na UI |
| identidade fora de 16 bits e dentro do seguro do JavaScript | M1.2 / [D5](../../science/02-defeitos-que-alteram-resultado.md#d5) |
| `List_terminals_hash_legacy` gravado ao lado | `legacy` só para auditoria |
| `\|B(T)\| ≤ n − 3` em todo pipeline | M1.3 / [D3](../../science/02-defeitos-que-alteram-resultado.md#d3) |

### 4. Confrontar contra o oráculo

```bash
cd BioComp_UFF && python ../docs/science/scripts/oraculo_rf_dendropy.py projects/Zika_21seq_validacao
```

Exigência: **0 divergências**. O script recalcula a RF fora do pipeline, com dendropy.

### 5. Provar a reprodutibilidade

O manifesto só vale se duas execuções da mesma entrada derem o mesmo resultado. Rode uma segunda vez, em projeto separado, e compare:

```bash
python - <<'PY'
import json
a = json.load(open('.../projeto_1/out/outputs/manifest.json'))
b = json.load(open('.../projeto_2/out/outputs/manifest.json'))
assert a['inputs_sha256'] == b['inputs_sha256'], 'entradas diferentes'
assert a['reproducibility'] == b['reproducibility'], 'semente ou threads diferentes'
divergentes = [k for k in a['outputs_sha256']
               if a['outputs_sha256'][k] != b['outputs_sha256'].get(k)]
print('saídas divergentes:', divergentes or 'nenhuma')
PY
```

Uma saída divergente com entrada e semente idênticas é **defeito**, não ruído — foi assim que D17 apareceu.

## O que registrar

No [log de execução](../../automation/07-log-de-execucao.md), com o número DEC seguinte: `run_id`, ambiente, o que a conferência devolveu, e **quanto tempo cada método levou**. O tempo por método é o insumo de [E7](../../science/04-agenda-de-pesquisa.md) e é o que diz se um método é viável em escala.

## Armadilhas

- **Parcimônia é lenta.** O `ParsimonyTreeConstructor` do Biopython é Python puro e domina o tempo total mesmo em 20 táxons. Se estiver medindo outra coisa, ponha `parsimony` no `ignore_mode` — e **declare** que pôs.
- **O workflow reaproveita árvore existente.** Rodar duas vezes no mesmo diretório não refaz nada. Para reexecutar, use diretório novo.
- **MrBayes não está em todas as máquinas.** O manifesto grava `"mrbayes": null` — não invente uma versão, e não silencie a ausência.
