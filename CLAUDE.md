# PhyloTreeMiner — contexto para agentes

Ferramenta de **mineração de padrões filogenéticos com itens maximais frequentes (FPMax)**, em evolução de protótipo de graduação para artefato de software defensável em submissão. Três exigências atravessam tudo: **reprodutibilidade**, **correção do domínio científico** e **governança de dados**.

## Comece por aqui

A memória externa do projeto é [`docs/`](docs/README.md), e ela foi escrita para ser lida por outra janela de contexto sem redescobrir nada. Em ordem:

1. [`docs/automation/08-ficha-de-fatos.md`](docs/automation/08-ficha-de-fatos.md) — fatos já verificados, com o comando que os verificou. **Não rediscuta o que está lá; para refutar, traga o comando.**
2. [`docs/automation/07-log-de-execucao.md`](docs/automation/07-log-de-execucao.md) — o ledger. Decisões (DEC-nnn), pareceres científicos, medições, lotes abertos, write-locks ativos, fila de triagem. **É o arquivo que diz o que já aconteceu e por quê.**
3. [`docs/automation/10-marcos-e-metas.md`](docs/automation/10-marcos-e-metas.md) — em que marco estamos (M0→M6) e qual é o portão.
4. [`docs/science/02-defeitos-que-alteram-resultado.md`](docs/science/02-defeitos-que-alteram-resultado.md) — D1..D19, os defeitos que mudam número publicado, cada um com estado.
5. Se for **validar** numa máquina de mais recursos: [`docs/automation/11-handoff-maquina-de-validacao.md`](docs/automation/11-handoff-maquina-de-validacao.md).
6. Se estiver **ligando o projeto numa máquina nova**: [`docs/automation/12-portabilidade-e-migracao.md`](docs/automation/12-portabilidade-e-migracao.md) — **primeiro registre o ambiente**, depois rode o portão de sanidade.

## Regras invioláveis

1. **Nada de commit e nada de push sem pedido explícito do usuário** — nos **dois** repositórios (este e o submódulo `BioComp_UFF`).
2. **Domínio científico é zona sagrada.** Qualquer mudança que altere distância entre árvores, identidade de clado, extração de metadados, agregação país/região ou padrões FPMax exige o protocolo de [`docs/automation/04-rigor-cientifico.md §3`](docs/automation/04-rigor-cientifico.md): caracterizar → formalizar → **oráculo independente** → casos-limite → tabela de diff → parecer no ledger.
3. **Evidência é comando + saída literal.** Prosa não é evidência; "provavelmente funciona" é motivo de reprovação.
4. **Golden test antes de mover código.** Refatoração estrutural sem caracterização da saída atual está proibida.
5. **"Não aplicável" nunca é um número.** Devolver `0` ou `-1` onde a métrica é indefinida é defeito, não convenção.
6. **Um arquivo, um dono, por lote.** Um lote não toca `Backend/` e `BioComp_UFF/` ao mesmo tempo.
7. **Dado pessoal não entra em log, cache, snapshot nem repositório.**
8. **Nenhum limite absoluto compilado.** A ferramenta não pode ficar presa a um hardware. Todo limite é `requisito estimado × orçamento lido da máquina em execução`, e toda medição carrega as condições em que foi feita — ver [`docs/automation/12-portabilidade-e-migracao.md`](docs/automation/12-portabilidade-e-migracao.md) e [R2](docs/respostasUteis/r2.md). A interface informa **requisito**, nunca veredito final.

## Layout

| Caminho | O que é |
|---|---|
| `Backend/src/app.py` | API FastAPI — monólito de ~2 260 linhas, quebrar em camadas é M5/Arq-B |
| `Backend/tests/` | pytest: `unit/`, `api/`, `golden/` (snapshots), `oracle/` (confronto com dendropy) |
| `Backend/scripts/` | `perf_baseline.py`, `neo4j_introspect.py`, `varredura_rotulos_truncados.py`, `conferir_correcoes_m1.py` |
| `BioComp_UFF/` | **submódulo, repositório próprio** — o pipeline de bioinformática |
| `BioComp_UFF/workflow/stability/` | identidade canônica de clado, bipartições, RF, relatórios |
| `BioComp_UFF/workflow/tests/` | `unittest` (não pytest) — rode de dentro de `BioComp_UFF/` |
| `BioComp_UFF/projects/*/out/` | artefatos de experimentos já executados; **grandes** (até 3,2 GB por `metadata.json`) |
| `Frontend/phylotreeminer/` | React + vite + vitest |
| `docs/science/scripts/` | oráculos independentes: `audit_variola.py`, `oraculo_rf_dendropy.py` |

## Ambiente

O projeto tem ambiente conda **próprio**; nada é instalado no `base` nem no
ambiente geral da máquina. O gestor de pacotes do frontend é o **pnpm**.

```bash
make setup                             # cria/atualiza o env conda e instala o frontend
bash scripts/check_dependencies.sh     # confere as 7 ferramentas DENTRO do env
bash scripts/check_dependencies.sh --strict   # e reprova se a versão divergir da receita
bash scripts/cleanup_env.sh            # diagnostica o que foi parar no 'base' (não apaga sem --apply)
conda activate Phylotreeminer
```

Sem o env ativo, o PATH pode resolver binários do sistema em versões
diferentes das da receita. `check_dependencies.sh` acusa toda ferramenta
resolvida **fora do env**; não ignore esse aviso antes de medir qualquer coisa.

As versões são **pinadas** no `environment.yml` (DEC-044). Antes de medir ou de
reexecutar experimento, rode com `--strict`: um env criado antes de um pino
continua com a versão antiga, e a versão do inferidor faz parte do resultado.

## Verificação

```bash
make test-backend                    # pytest Backend/tests  → 216 passed, 1 xfailed
make test-frontend                   # vitest                → 8 passed
make lint                            # catraca: falha se o débito de lint crescer
make build                           # build de produção do front

cd BioComp_UFF && python -m unittest \
  workflow.tests.test_stability workflow.tests.test_subtree_mining \
  workflow.tests.test_tree_identity workflow.tests.test_rf_bipartition \
  workflow.tests.test_manifest workflow.tests.test_rooting \
  workflow.tests.test_taxonomy workflow.tests.test_aligners \
  workflow.tests.test_external_tools                                    # 150 tests, OK

cd BioComp_UFF && python ../docs/science/scripts/oraculo_rf_dendropy.py  # 137 pares, 0 divergências
cd BioComp_UFF && python ../docs/science/scripts/audit_variola.py --secao 3
make reference-check                 # PORTÃO CIENTÍFICO: invariante 3/3; código 2 até o RAxML entrar em M
```

`PY` do Makefile aponta para o ambiente conda do projeto; sobrescreva se o seu difere (`make test-backend PY=/caminho/python`).

## Armadilhas conhecidas

- **Rótulos truncados (D13).** IQ-TREE e RAxML gravam `NC_008030.` onde FastTree grava `NC_008030.1`. Ler vários Nexus num `TaxonNamespace` compartilhado **faz o dendropy abortar**. Leia cada arquivo isolado, normalize com `strip_accession_version`, e só então reúna.
- **`--threads auto` do RAxML-NG (D17).** Com a mesma semente, o esquema de paralelização muda a árvore (RF = 8 medido) e já causou `SIGSEGV`. Sempre `--threads N --workers 1`.
- **Os artefatos em disco são anteriores às correções de M1.** O pipeline foi corrigido; `metadata.json`, `all_results_fpmax.csv` e relatórios em `BioComp_UFF/projects/**` ainda têm os números antigos. Só a reexecução materializa o número certo.
- **O submódulo já vinha sujo** antes deste trabalho (`workflow/stability/`, `docs/`, READMEs). O `git status` de lá não é linha de base limpa.
- **Não rode pipeline pesado sem combinar.** A execução pesada é feita numa máquina dedicada — ver o handoff de validação. O conjunto de validação (`Zika_21seq_validacao`, 14 pipelines, ~11 min) é leve e roda aqui: ver a skill [`validar-workflow`](docs/skills/validar-workflow/SKILL.md).
- **O nome do binário não acompanha o do pacote.** O `iqtree` 3.x instala `iqtree`/`iqtree3` e **não** `iqtree2`; o FastTree é `FastTree` ou `fasttree`; o MrBayes é `mb`. Nunca fixe um nome: use `workflow.utils.external_tools.require_tool`.
- **`npm` não é o gestor deste projeto.** É `pnpm`, e o lockfile versionado é o `pnpm-lock.yaml`. Rodar `npm install` cria um `package-lock.json` concorrente.
- **Use `mode: "advanced"`, nunca `auto`.** O modo `auto` roda só distância e parcimônia, e encerra dizendo `Completed successfully!` (D18).

## Estilo

Português no código novo, nos testes e nos documentos, seguindo o que já existe. Docstrings no formato NumPy, como o resto do `workflow/`. Comentário só onde explica **por que**, não o que — e, neste projeto, o "por que" quase sempre é o número de um defeito (`D5`, `D13`, `D17`) ou a seção de um documento (`03-metricas §2.2`).
