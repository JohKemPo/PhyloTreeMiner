---
name: science-validate
description: Protocolo de validação de mudança que afeta resultado científico no PhyloTreeMiner — distâncias entre árvores, extração de metadados, agregação geográfica, FPMax, deduplicação. Use obrigatoriamente antes de alterar qualquer cálculo cujo resultado possa ter ido para um artigo.
---

# Validar mudança que altera resultado

Aplica-se à **zona sagrada** ([rigor científico §1](../../automation/04-rigor-cientifico.md)): quartet/RF/consistência, extração de metadados, tabelas país/região, FPMax, deduplicação, parser de blocos CQL. Fora dela, use o *definition of done* geral.

Premissa: os bugs desta área **não fazem a ferramenta falhar** — fazem produzir resultado plausível e errado. `-1` virando "Inconsistent", `or` com default truthy tornando o fallback inalcançável, `only_first` processando uma árvore de várias, dedup comparando posições com `zip`. Por isso o protocolo é pesado.

## Passo 1 — Caracterizar (antes de tocar)

Golden snapshot do comportamento atual sobre o dataset de referência, com comentário explícito de que caracteriza um bug conhecido. Skill: [`golden-snapshot`](../golden-snapshot/SKILL.md).

## Passo 2 — Formalizar

Escreva, **em uma frase**, o que a função deveria computar, com a definição da métrica e a fonte:

> "Distância de quartetos entre T1 e T2 = número de subconjuntos de 4 folhas cuja topologia resolvida difere entre as duas árvores, sobre o conjunto de folhas comum. Fonte: <referência>."

E as suposições: árvore binária? enraizada? conjuntos de folhas idênticos? comprimento de ramo relevante? O que acontece em politomia?

**Se você não consegue escrever isso, a correção não está pronta para ser feita.** Escrever a frase é o passo que expõe a ambiguidade — e é o texto que vai para Métodos.

## Passo 3 — Oráculo independente

Comparar contra implementação estabelecida, sobre a **mesma** entrada:

| O que | Oráculo |
|---|---|
| Robinson-Foulds | `dendropy.calculate.treecompare.symmetric_difference` |
| Topologia / comparação de árvores | `ete3` (`Tree.compare`, `robinson_foulds`) |
| Distância de quartetos | `tqDist` |
| Árvore de consenso | `dendropy` (majority-rule) |
| Padrões maximais frequentes | `mlxtend` sobre a mesma matriz de transações |

Divergência é **dado a investigar**, não ruído a ignorar. Documente se a diferença vem de normalização, de tratamento de politomia ou de conjunto de folhas distinto.

## Passo 4 — Casos-limite, cada um com teste

- árvore não-binária / politomia (é o que expõe `C-5a`)
- folha única; duas folhas
- T1 e T2 com conjuntos de folhas **diferentes**
- árvore com nomes duplicados de folha
- metadado ausente (`organism` vazio → `C-5b`); data malformada
- país fora do dicionário (`C-5d`)
- `;` dentro de string de dado (`C-5e`)
- arquivo com **duas** árvores (`C-5c` — `only_first` processa só a primeira)
- entrada acima do cutoff (n>25 em quartetos): comportamento deve ser explícito, não silencioso

## Passo 5 — Diff de resultado

Rodar antes e depois sobre o dataset de referência:

| Métrica | Entrada | Antes | Depois | Δ | Afeta número publicado? |
|---|---|---|---|---|---|
| quartet(T1,T2) | ref/nonbinary | -1 | null | semântico | **sim** — `check_consistency` deixa de dizer "Inconsistent" |

Floats: `math.isclose` com tolerância declarada, nunca `==`.

## Passo 6 — Parecer e decisão

Registre em [`../../automation/07-log-de-execucao.md`](../../automation/07-log-de-execucao.md) — **inclusive quando Δ = 0**, porque a ausência de mudança também é resultado e evita que a pergunta seja reaberta:

```markdown
### Parecer C-5a · <data>
**Mudança:** exact_quartet_distance devolve None (era -1) para árvore não-binária.
**Definição adotada:** <uma frase + fonte>
**Oráculo:** tqDist concorda em 12/12 casos binários; não aplicável em não-binários.
**Δ em métrica publicada:** SIM — check_consistency respondia "Inconsistent" para
todo par com politomia; a Tabela 2 do artigo pode ter sido afetada.
**Recomendação:** re-rodar a Tabela 2 antes de submeter; verificar quantos pares
do conjunto original eram não-binários.
**Decisão do usuário:** <pendente>
```

**Se Δ ≠ 0 em métrica publicada: pare.** O merge não acontece antes da decisão do usuário — corrigir e re-rodar, corrigir com erratum, ou postergar. Essa decisão não é de um agente.

## Passo 7 — Propagar a semântica

Uma correção de "não aplicável" só está completa quando atravessa a pilha: serviço devolve `None` → API devolve `null` (não `0`, não `-1`) → UI mostra "não aplicável" (não "0", não "erro"). Meia propagação recria o bug uma camada acima.

## Neste ambiente

O ambiente bioinformático (conda, DendroPy, ETE3) não roda no Windows deste worktree. Aqui se faz: ler o algoritmo, escrever a definição formal, escrever os testes e o script de comparação com o oráculo, montar o dataset de referência. A **execução numérica é do usuário em WSL** — entregue o script pronto e diga qual saída confirmaria a hipótese. Nunca reporte Δ que você não mediu.
