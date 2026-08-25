---
name: oracle-check
description: Confronta um resultado do PhyloTreeMiner contra um oráculo independente (dendropy, ete3, audit_variola.py) antes de aceitar qualquer número da zona sagrada. Use sempre que uma mudança tocar distância entre árvores, identidade de clado, suporte, padrões minerados ou metadados derivados.
---

# oracle-check — confronto contra oráculo independente

Procedimento obrigatório do passo 3 de `docs/automation/04-rigor-cientifico.md §3`. Nenhum número da zona sagrada é aceito por plausibilidade.

## Quando usar

Toda mudança que toca: distância entre árvores (RF, quartet), identidade de clado, suporte de clado, padrões maximais/FPMax, agregação país/região, deduplicação de sequências.

## Ambiente

```bash
# O ambiente conda varia por máquina; descubra o seu com `which python`
# depois de ativar o env, ou use `make ... PY=<caminho>`.
PY="${PY:-python}"
```

dendropy 4.6.1 e ete3 3.1.3 já estão instalados.

## 1. Robinson-Foulds entre árvores não enraizadas

O defeito D3 é comparar clados **enraizados** entre árvores que não são enraizadas. O oráculo mede a distância de bipartição correta.

```bash
$PY - <<'PYEOF'
import dendropy
from dendropy.calculate import treecompare

tns = dendropy.TaxonNamespace()
a = dendropy.Tree.get(path="tree_a.nwk", schema="newick",
                      taxon_namespace=tns, rooting="force-unrooted")
b = dendropy.Tree.get(path="tree_b.nwk", schema="newick",
                      taxon_namespace=tns, rooting="force-unrooted")
a.encode_bipartitions(); b.encode_bipartitions()

rf = treecompare.symmetric_difference(a, b)
n = len(tns)
print("RF bruta:", rf)
print("RF normalizada 2(n-3):", rf / (2 * (n - 3)))
PYEOF
```

**O `taxon_namespace` compartilhado é obrigatório.** Sem ele o dendropy compara conjuntos de folhas distintos e o número não significa nada.

O denominador é `2(n−3)` para árvores não enraizadas, **não** `2(n−2)`.

## 2. Topologia por ete3 — segundo oráculo

```bash
$PY - <<'PYEOF'
from ete3 import Tree
a = Tree("tree_a.nwk"); b = Tree("tree_b.nwk")
rf, rf_max, names, parts_a, parts_b, _, _ = a.robinson_foulds(b, unrooted_trees=True)
print(f"RF={rf} max={rf_max} normalizada={rf/rf_max if rf_max else 'n/a'}")
PYEOF
```

Dois oráculos que concordam entre si e discordam da produção = a produção está errada. Dois oráculos que discordam entre si = investigue a preparação da entrada antes de concluir qualquer coisa.

## 3. Tabelas de Variola

```bash
cd BioComp_UFF && $PY ../docs/science/scripts/audit_variola.py --secao N
```

| Seção | Verifica |
|---|---|
| 1 | D1 — braço `clustalo` espúrio (digests idênticos) |
| 2 | D6 — contaminação taxonômica |
| 3 | D3 — RF enraizada × bipartição |
| 4 | D2 — denominador do suporte |
| 5 | D4, D5 — suporte do FPMax e identidade de clado |
| 6 | D10 — UFBoot × suporte metodológico |

## 4. Tabela de diff — a saída deste procedimento

| Métrica | Antes | Depois | Δ | Afeta número publicado? |
|---|---|---|---|---|

**Registre no ledger inclusive quando Δ = 0** — ausência de mudança também é resultado.

## 5. Casos-limite que precisam de teste explícito

Árvore não-binária (politomia), folha única, árvores com conjuntos de folhas diferentes, metadado ausente, data malformada, país fora do dicionário.

## 6. Parada obrigatória

Se algum Δ ≠ 0 numa métrica publicada: **pare**. A decisão entre corrigir com *erratum*, corrigir e re-rodar, ou postergar é do autor, não de um agente.
