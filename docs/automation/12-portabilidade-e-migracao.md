# Portabilidade e migração entre máquinas

[← Automação](README.md) · **Documento vivo.** Criado em 2026-08-25.

> **Objetivo declarado do projeto:** o PhyloTreeMiner **não pode ficar preso a um
> hardware específico**. Deve funcionar em arquiteturas diversas — com ressalvas
> e avisos de limitação na interface, nunca com vetos silenciosos nem números
> compilados que só valem numa máquina.

Este documento é o mapa de tudo que depende de hardware, o que já foi tratado, o
que falta, e o que fazer ao ligar o projeto numa máquina nova.

---

## 1. Os quatro eixos de dependência

Um limite declarado só em pares de base **não vê três destes quatro**. A análise
completa está em [R2](../respostasUteis/r2.md).

| Eixo | Efeito observado | Evidência |
|---|---|---|
| **Memória** | processo morto pelo OOM killer | Clustal Omega (código 137) em Zika479; MUSCLE, **19,4 GB** em 52×228 kb |
| **Núcleos** | o esquema de paralelização muda **o resultado** | [D17](../science/02-defeitos-que-alteram-resultado.md#d17): **RF = 8** com a mesma semente |
| **Núcleos** | autoconfiguração escolhe esquema que quebra | D17: `SIGSEGV` com `5 workers × 3 threads` |
| **Versão da ferramenta** | algoritmo diferente sob o mesmo nome | MUSCLE 3.8 (`-in/-out`) × MUSCLE 5 (`-align/-output`) — interfaces incompatíveis |
| **Origem do binário** | a mesma máquina dá duas versões conforme o PATH | env: FastTree 2.2.0, RAxML-NG 1.2.2, IQ-TREE 3.0.1 · sistema: 2.1.11, 1.1.0, 2.2.2.6 |
| **Nome do binário** | o pacote instala, o pipeline não acha | `iqtree` 3.x instala `iqtree`/`iqtree3` e **não** instala `iqtree2` |

**O fingerprint de execução é parte do resultado científico.** Se o número de
núcleos muda a árvore, relatar a topologia sem relatar o esquema de
paralelização é relatar metade do experimento.

Os dois últimos eixos custaram caro antes de serem entendidos. A **origem do
binário** fez este repositório registrar por dias uma "divergência de versões
entre máquinas" que não existia: era o PATH resolvendo `/usr/bin` em vez do env
(corrigido em [`11 §2.2`](11-handoff-maquina-de-validacao.md#22-não-havia-divergência-entre-máquinas--havia-sombreamento-de-path)).
O **nome do binário** fez a instalação correta da receita não conseguir rodar,
porque o pipeline chamava `iqtree2` fixo. Ambos são resolvidos por
`workflow/utils/external_tools.py` e sinalizados por `check_dependencies.sh`.

---

## 2. O que já é portável

| Mecanismo | Onde | O que garante |
|---|---|---|
| **Manifesto de execução** | `workflow/utils/manifest.py` | Grava ambiente, núcleos, memória, versões das 7 ferramentas, semente, paralelização efetiva e SHA-256 de entradas e saídas. Sem *hostname*, usuário ou caminho absoluto |
| **Resolução de binário** | `workflow/utils/external_tools.py` | Um lugar só sabe os nomes possíveis de cada ferramenta (`iqtree3`/`iqtree2`/`iqtree`, `FastTree`/`fasttree`, `mb`/`mrbayes`). Pipeline e manifesto consultam a mesma tabela |
| **Ambiente isolado** | `environment.yml` + `scripts/setup_env.sh` | O projeto instala num env próprio e nunca no `base`. Os canais são fixados **por ambiente**, sem tocar o `~/.condarc` do usuário. `check_dependencies.sh` acusa toda ferramenta resolvida fora do env |
| **Gestor do frontend fixado** | `packageManager` + `pnpm-lock.yaml` | pnpm com `--frozen-lockfile`: duas máquinas resolvem a mesma árvore de dependências do mesmo commit. `scripts/lib_node.sh` liga o pnpm pelo corepack quando ele falta |
| **Semente e paralelização fixas** | `builder.reproducibility_settings` | `--threads N --workers 1` no RAxML e `-seed`/`-nt N` no IQ-TREE. Sem isso, a árvore muda com o número de núcleos |
| **Modelo de custo por alinhador** | `workflow/alignment/aligners.py` | Requisito estimado × **orçamento lido da máquina em execução** — o mesmo código dá vereditos diferentes em máquinas diferentes, que é o correto |
| **Falha observada vence estimativa** | `ResourceModel.blocking_failure` | Uma falha só condena máquinas de orçamento **igual ou menor**; numa maior, o veredito volta a ser do modelo |
| **Verificação de dependências** | `scripts/check_dependencies.sh` | Detecta as 7 ferramentas e suas versões; instala só com `--install` |
| **Portão científico em dois níveis** | `docs/science/scripts/reference_check.py` | O rápido roda em qualquer máquina em segundos; o completo exige reexecução |
| **Aviso na interface** | `AlignerSelect.jsx` | Mostra requisito **e** orçamento: *"precisa de ~19 GB, esta máquina tem 31"* — requisito, não veto |

---

## 3. O que ainda **não** é portável

| Item | Problema | Onde resolver |
|---|---|---|
| **Curva de custo não ajustada** | `fitted=False` em todos: com pontos de **uma máquina só**, expoente e deslocamento ficam confundidos — qualquer curva passa por dois pontos | **M7.7**, bissectando em ≥2 máquinas |
| **Limite de 20 kb do Clustal Omega** | herdado do código original, **nunca medido**; ainda é escalar absoluto | M7.7 |
| **`max_sequences` do MUSCLE** | 1 000, **palpite não medido** | M7.7 |
| **Sem modelo de custo para inferência** | RAxML, IQ-TREE, FastTree, MrBayes e parcimônia não têm `ResourceModel` | **M7.1 / M7.7** |
| **Sem eixo de núcleos no modelo** | o custo é só memória; D17 mostrou que núcleos mudam **resultado**, não só tempo | **M7.7** |
| **Caminhos absolutos em artefatos antigos** | `metadata.json` traz `/home/<usuário>/…` de outra máquina | [D15](../science/02-defeitos-que-alteram-resultado.md#d15), `xfail` rastreando |
| **`tmp_dir` do MrBayes** | montado com `split('/PhyloTreeMiner/')` — depende do **nome do diretório do repositório** e produz caminho relativo | [D20](../science/02-defeitos-que-alteram-resultado.md#d20) / M7.4 |
| **14 arquivos do frontend fixam `localhost:8000`** | zero uso de `import.meta.env` | **M5 / Arq-A** |

---

## 4. Ao ligar numa máquina nova

### 4.1 Registrar o ambiente — **primeiro passo, sempre**

```bash
bash scripts/check_dependencies.sh          # as 7 ferramentas e suas versões
nproc && free -g && uname -a                # núcleos, memória, arquitetura
```

Anote em [`11-handoff-maquina-de-validacao.md §2.3`](11-handoff-maquina-de-validacao.md).
**Uma medição sem o ambiente declarado não entra no ledger.**

### 4.2 Portão de sanidade

```bash
make test-backend       # 216 passed, 1 xfailed
make test-frontend      # 8 passed
make lint               # erros 68/68, avisos 27/27
make reference-check    # invariante 3/3; código 2 até o RAxML entrar em M

cd BioComp_UFF && python -m unittest \
  workflow.tests.test_aligners workflow.tests.test_taxonomy workflow.tests.test_rooting \
  workflow.tests.test_rf_bipartition workflow.tests.test_stability \
  workflow.tests.test_manifest workflow.tests.test_subtree_mining \
  workflow.tests.test_tree_identity            # 138 tests, OK

cd BioComp_UFF && python ../docs/science/scripts/oraculo_rf_dendropy.py   # 137 pares, 0 divergências
cd BioComp_UFF && python ../docs/science/scripts/auditar_taxonomia.py     # 6 fora do clado, exit 1
```

⚠️ **Dois testes são propositalmente relativos à máquina** e vão divergir — corretamente:

- `test_aligners.TestLimiteEhRelativoAMaquina` usa `available_bytes` explícito, então **não** depende da máquina. Se falhar, é regressão de verdade.
- `viability()` sem argumento lê a memória local: numa máquina de 128 GB, o MUSCLE passa a ser viável em conjuntos onde aqui não é. **Isso é o comportamento correto**, não uma quebra.

### 4.3 Acrescentar medições, nunca sobrescrever

Cada máquina nova **acrescenta pontos** a `ResourceModel.measurements`:

```python
Measurement(n_sequences=52, max_sequence_bp=228_250, outcome="ok",
            peak_rss_bytes=..., seconds=..., machine="AMD EPYC · 64 núcleos · 256 GB",
            machine_bytes=..., date="2026-09-XX")
```

Um ponto `ok` numa máquina grande **não apaga** o `oom` na pequena: os dois juntos
é que permitem separar a lei do orçamento. Com dois pontos numa máquina só,
`fitted` **tem de continuar False**.

### 4.4 Só então, o trabalho pesado

Ver [`11-handoff-maquina-de-validacao.md §4`](11-handoff-maquina-de-validacao.md).

---

## 5. Regras de projeto que decorrem disso

1. **Nenhum limite absoluto compilado.** Todo limite é `requisito estimado × orçamento detectado`. Onde há modelo de custo, ele **tem precedência** sobre qualquer escalar.
2. **Toda medição carrega suas condições.** `Measurement` sem `machine_bytes` não transfere e não veta — é dado incompleto, e o código o ignora explicitamente.
3. **Estimativa vinda de falha é piso, não requisito.** O pico registrado no instante da morte subestima por construção; `bytes_is_lower_bound` marca isso.
4. **Falha observada vence estimativa**, e só em máquinas de orçamento igual ou menor.
5. **A interface informa requisito, nunca emite veredito final.** *"Precisa de X, há Y"* permite decidir; *"indisponível"* esconde que noutra máquina daria.
6. **Comparação de memória usa tolerância.** Leituras do mesmo hardware variam em dezenas de MB; `>=` estrito faz uma máquina não reconhecer a própria medição.

---

## Ver também

- [R2](../respostasUteis/r2.md) — a análise completa: o que é do algoritmo e o que é da máquina
- [`../science/07-gargalos-e-rotas.md`](../science/07-gargalos-e-rotas.md) — custo medido e rotas de execução
- [`11-handoff-maquina-de-validacao.md`](11-handoff-maquina-de-validacao.md) — o que rodar na máquina grande
- [`10-marcos-e-metas.md §8`](10-marcos-e-metas.md) — M7, onde a calibração acontece
