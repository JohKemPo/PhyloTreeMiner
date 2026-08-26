# Handoff para a máquina de validação

[← Automação](README.md) · **Documento vivo.** Criado em 2026-08-24.

Este documento existe porque **o desenvolvimento e a validação acontecem em máquinas diferentes**. A máquina de desenvolvimento não roda pipeline pesado; a de validação roda, e é onde o teste de estresse e a reexecução dos experimentos acontecem.

Uma janela de contexto que abrir na máquina de validação deve conseguir, **lendo só este documento e o [`CLAUDE.md`](../../CLAUDE.md)**, saber o que rodar, o que esperar e o que fazer com o resultado.

---

## 1. O que já está pronto e não precisa de máquina grande

Todo o marco **M1 — Verdade dos números** está fechado (8 de 8 lotes) e verificado sem execução pesada. O que M1 corrigiu foi o **pipeline**; os artefatos em disco continuam com os números antigos.

| Lote | Defeito | O que mudou | Conferido contra |
|---|---|---|---|
| M1.1 | [D4](../science/02-defeitos-que-alteram-resultado.md#d4) | `support` do FPMax deixa de ser o limiar da varredura | `audit_variola.py --secao 5`: Δ = 0 em 37/37 itemsets |
| M1.2 | [D5](../science/02-defeitos-que-alteram-resultado.md#d5) | identidade de clado canônica (52 bits, invariante à ordem) | contagem de clados canônicos, 4 experimentos |
| M1.3 | [D3](../science/02-defeitos-que-alteram-resultado.md#d3) | bipartição canônica; RF por `2(n−3)`; indefinida é `None` | `dendropy`: 137 pares, 0 divergências |
| M1.4-M1.6 | [D7](../science/02-defeitos-que-alteram-resultado.md#d7)/[D8](../science/02-defeitos-que-alteram-resultado.md#d8)/[D9](../science/02-defeitos-que-alteram-resultado.md#d9) | truncamento declarado; cobertura um-para-muitos; campo falso removido | golden snapshots |
| M1.7 | [D12](../science/02-defeitos-que-alteram-resultado.md#d12)+[D16](../science/02-defeitos-que-alteram-resultado.md#d16) | metadado deixa de ser fabricado do `strain`; país/região com fonte única | 68 países dos 18 projetos |
| M1.8 | [D13](../science/02-defeitos-que-alteram-resultado.md#d13) (backend) | leitura recupera o registro íntegro do GenBank | `dendropy` nos pares truncados |

Detalhe e tabelas de diff: DEC-016, DEC-018 a DEC-023 no [log de execução](07-log-de-execucao.md).

---

## 2. Ambiente

### 2.1 O que a máquina de desenvolvimento tem (linha de base)

| Componente | Versão | Como conferir |
|---|---|---|
| CPU / RAM | i5-11400H, 6 núcleos físicos / 12 lógicos, 31 GB | `nproc`, `free -g` |
| Python | 3.10.19 | `python -V` |
| Node | v22.22.3 | `node -v` |
| Docker | 28.3.3 | `docker --version` |

Para as ferramentas de bioinformática, **a versão depende de onde o binário for
encontrado** — ver §2.2. O comando que responde é sempre o mesmo:

```bash
bash scripts/check_dependencies.sh
```

| Ferramenta | No env do projeto | No PATH do sistema |
|---|---|---|
| MAFFT | 7.525 | v7.490 |
| Clustal Omega | 1.2.4 | 1.2.4 |
| MUSCLE | *ausente* | **3.8.1551** (não é o MUSCLE5) |
| FastTree | **2.2.0** | 2.1.11 |
| IQ-TREE | **3.0.1** (binário `iqtree3`) | 2.2.2.6 (binário `iqtree2`) |
| RAxML-NG | **1.2.2** | 1.1.0 |
| MrBayes | 3.2.7 | 3.2.7 |

### 2.2 Não havia divergência entre máquinas — havia sombreamento de PATH

**Correção de um registro errado.** Este documento afirmou, por vários dias, que
os artefatos em `BioComp_UFF/projects/**` tinham sido gerados com FastTree 2.2.0
e RAxML-NG 1.2.2 enquanto a máquina de desenvolvimento tinha 2.1.11 e 1.1.0, e
que essa diferença bloqueava a replicação exata. **Isso estava errado.**

O env conda do projeto *sempre* teve FastTree 2.2.0 e RAxML-NG 1.2.2 — as mesmas
versões dos logs dos artefatos. O que acontecia é que, com o env não ativado, o
PATH resolvia `/usr/bin/FastTree` 2.1.11 e `/usr/local/bin/raxml-ng` 1.1.0. Eu
media o binário do sistema e registrava o resultado como "a versão do projeto".

O que isso muda:

- **Não há decisão pendente** sobre pinar versões ou reexecutar tudo. O item
  correspondente de [`08-ficha-de-fatos §1`](08-ficha-de-fatos.md) está resolvido:
  as versões coincidem.
- **A causa real é operacional e reaparece em qualquer máquina** onde as
  ferramentas existam também fora do conda. É o que `check_dependencies.sh`
  agora sinaliza como *"fora do env"*.
- **O nome do binário não é estável.** O pacote `iqtree` do bioconda instalava
  `iqtree2` na série 2.x e passou a instalar `iqtree`/`iqtree3` na 3.x, sem
  `iqtree2`. O pipeline chamava `iqtree2` fixo: quem seguisse a receita do
  projeto instalava o IQ-TREE com sucesso e mesmo assim não conseguia rodar.
  Resolvido em `workflow/utils/external_tools.py`, que é o único lugar que sabe
  os nomes possíveis de cada ferramenta.

**A lição que fica:** medir a ferramenta errada produz um fato falso que se
propaga por todo o registro. Antes de anotar uma versão, confira **de onde** o
binário veio, não só o número que ele imprime.

### 2.3 Máquina de validação — ambiente registrado em 2026-08-25

Medido com o env `Phylotreeminer` ativo. Comandos: `uname -a`, `lscpu`, `nproc`,
`free -g`, `df -h .`, `nvidia-smi -L`, `conda env list`, `command -v`,
`bash scripts/check_dependencies.sh`.

**Reverificado em 2026-08-25, segunda sessão**, agora com `BioComp_UFF/projects/`
preenchido. O que mudou em relação à primeira medição está marcado com **(↻)**;
o resto foi reconfirmado idêntico.

| Componente | Valor |
|---|---|
| SO / kernel | Linux `geomesh`, 7.0.0-30-generic (base Ubuntu 24.04), x86_64 |
| CPU | **AMD Ryzen Threadripper 2970WX** — 24 núcleos físicos / **48 lógicos**, 4 nós NUMA |
| RAM | **47 GB** totais (36 GB disponíveis na medição) · swap 7 GB |
| Disco | 938 GB em `/dev/nvme0n1p1`, **786 GB livres** (↻ — os 26 GB de `projects/` entraram) |
| GPU | NVIDIA GeForce RTX 3050 6 GB (GA107), `nvidia-smi` presente — **nenhuma ferramenta do pipeline usa GPU** |
| conda | 26.7.1 (`/home/geomesh/miniconda3`); envs: `base`, **`Phylotreeminer`**, `gof` |
| Python (env) | **3.10.21** |
| Node | ↻ `command -v node` resolve **v22.23.2** (nvm); `/usr/bin/node` **v18.19.1** continua no sistema — ver 2.3.3 |
| pnpm | **11.6.0**, resolvido em `~/.nvm/versions/node/v22.23.2/bin/pnpm`; o `/usr/local/bin/pnpm` (11.6.0, symlink de root) segue presente. Exige Node ≥ 22.13; `corepack` ausente |
| Docker | 29.7.2 instalado, mas o **socket nega permissão** a este usuário (`/var/run/docker.sock`) — Neo4j não sobe sem resolver isso |

#### 2.3.1 Ferramentas de bioinformática — todas dentro do env

Nenhum sombreamento de PATH: `check_dependencies.sh` resolveu as 7 ferramentas
dentro de `Phylotreeminer`. A lição de §2.2 não se repetiu aqui — reconfirmado na
segunda sessão, ferramenta a ferramenta, com `command -v`:

```
mafft clustalo muscle FastTree iqtree3 raxml-ng mb
  → todos em /home/geomesh/miniconda3/envs/Phylotreeminer/bin/
```

| Ferramenta | Nesta máquina (env) | Na de desenvolvimento (§2.1) | Coincide? |
|---|---|---|---|
| MAFFT | 7.526 | 7.525 | ~ |
| Clustal Omega | 1.2.4 | 1.2.4 | ✅ |
| MUSCLE | **5.3** | *ausente do env* (3.8.1551 no sistema) | ❌ **outra interface** |
| FastTree | 2.2.0 | 2.2.0 | ✅ |
| IQ-TREE | **3.1.3** (`iqtree3`) | 3.0.1 (`iqtree3`) | ~ |
| RAxML-NG | **2.0.2** | 1.2.2 | ❌ **salto de versão maior** |
| MrBayes | 3.2.7 | 3.2.7 | ✅ |

Pacotes Python do env (Python **3.10.21**): biopython 1.81 · pandas 2.2.2 ·
mlxtend 0.23.1 · fastapi 0.141.1 · neo4j 5.20.0 · matplotlib 3.9.0 ·
numpy **1.26.4** · uvicorn 0.52.4 · psutil 5.9.8 · python-dotenv 1.0.1 ·
dendropy 4.6.1 · ete3 3.1.3 · pytest 8.4.2. Os dois oráculos independentes
exigidos por [`04-rigor-cientifico §3`](04-rigor-cientifico.md) estão presentes.

#### 2.3.2 O que essas diferenças significam — e o que **não** significam

**Não é o caso de §2.2.** Lá o erro foi medir o binário do sistema achando que
era o do projeto. Aqui os binários vinham todos do env e mesmo assim as versões
diferiam: a receita (`environment.yml`) **não pinava versão**, então duas máquinas
que rodavam `make setup` em datas diferentes recebiam o que o canal tivesse no
dia. Era o eixo *"versão da ferramenta"* de
[`12-portabilidade §1`](12-portabilidade-e-migracao.md).

✅ **Fechado em [DEC-044](07-log-de-execucao.md).** As 7 ferramentas, o `pyqt` e
as 8 dependências Python que ainda estavam soltas no `requirements.txt` passaram
a ser pinadas; `conda env create --dry-run` confirma que os pinos resolvem nos
canais. **A tabela acima vira, daqui em diante, a especificação** — a máquina de
desenvolvimento converge para ela no próximo `make setup`, não o contrário.

Três consequências concretas, em ordem de gravidade:

1. **RAxML-NG 2.0.2 contra 1.2.2 dos logs dos artefatos.** É salto de versão
   maior. ✅ **Decidido** ([DEC-044](07-log-de-execucao.md)): **2.0.2 é a versão
   do experimento**, pinada no `environment.yml`. Reexecutar VARV aqui **não
   reproduz** as árvores de RAxML em disco — e não precisa: os artefatos são
   pré-M1 e vão ser substituídos. A troca fica registrada no manifesto de toda
   execução nova.
2. **MUSCLE 5.3 contra 3.8.1551.** São interfaces incompatíveis
   (`-align/-output` × `-in/-out`). Toda a biblioteca de alinhadores e o
   `ResourceModel` do MUSCLE foram escritos e medidos contra o 3.8 do sistema —
   inclusive a medição de 19,4 GB / OOM que hoje declara o MUSCLE inviável em
   *Variola*. **Essa medição não transfere para o 5.3** e precisa ser refeita
   aqui antes de valer como veredito.
3. **48 núcleos lógicos contra 12.** É exatamente o gatilho de
   [D17](../science/02-defeitos-que-alteram-resultado.md#d17): o esquema de
   paralelização muda a topologia com a mesma semente. `--threads N --workers 1`
   continua obrigatório, e **o próprio `N` faz parte do resultado** — anote-o no
   manifesto de toda execução daqui.

Do lado positivo: 47 GB de RAM, 24 núcleos físicos e 812 GB livres tornam
viáveis os conjuntos que a máquina de desenvolvimento não comportava. É a
máquina que §4 estava esperando.

#### 2.3.3 Pendências operacionais — o pnpm resolvido, o Docker não

- ~~**Node v18.19.1 bloqueia todo o portão do frontend.**~~ ✅ **resolvido.**
  O `pnpm` 11.6.0 fixado em `packageManager` exige Node ≥ 22.13; `/usr/bin/node`
  é o 18.19.1, e o Node 22.23.2 já estava instalado no **nvm** — só nunca era
  carregado nos shells não interativos que rodam os scripts. `lib_node.sh` passa
  a resolver o Node como `check_dependencies.sh` resolve as ferramentas de
  bioinformática (override > PATH, se atender > nvm > pedir ação), e `make` vai
  pelo `scripts/pnpm.sh`. Com Node 18 no PATH, os três alvos passam:
  **8 passed**, **68/68 · 27/27**, **✓ built**.
- **`garantir_pnpm` aprovava um `pnpm` que não executa.** Era a causa de o
  `start.sh` imprimir `✓ pnpm` com a versão **em branco**, subir Neo4j, backend e
  frontend, e o frontend morrer 15 s depois. `command -v pnpm` só responde se o
  arquivo existe. Agora a checagem **executa** `pnpm --version` e exige saída não
  vazia — existir não é servir, que é a mesma regra do
  [`§2.2`](#22-não-havia-divergência-entre-máquinas--havia-sombreamento-de-path).
- ~~**Docker sem permissão.**~~ ✅ **resolvido** pelo usuário em 2026-08-25.
  `docker ps` responde, o contêiner `phylotree_neo4j` (`neo4j:2026.01.3`) está de
  pé em `127.0.0.1:7474` e `7687`, e `curl :7474` devolve **http 200**.

#### 2.3.4 Os artefatos dos experimentos — 26 GB presentes, e o VARV-49 **recuperado**

`BioComp_UFF/projects/` tem **26 GB em 19 projetos**, incluindo os 5 conjuntos de
§4.1; `data/` tem 159 MB e está completo. Com eles no lugar, o portão de §3
produz evidência de verdade — foi assim que o achado abaixo apareceu, e foi assim
que ele se fechou.

**O que este documento registrou na primeira sessão.**
`Variola_Yu_li_2007/out/outputs/metadata.json` — o VARV-49, baseline de
referência de [DEC-024](07-log-de-execucao.md) — abortava com
`UnicodeDecodeError` no offset 566 231 040 (exatamente 540 MiB), com 294 MB de
conteúdo binário emendado até o EOF. Isso **bloqueava** `audit_variola.py --secao 5`,
que abortava na primeira entrada da lista.

**Estado em 2026-08-25, segunda medição: o arquivo está íntegro.** Depois do
repovoamento de `projects/`, o VARV-49 decodifica inteiro em UTF-8 e é **idêntico
byte a byte** ao gêmeo de `teste52`:

```
Variola_Yu_li_2007/out/outputs/metadata.json   860 145 303 B  md5 f2ae61a4…c17e1c  utf-8 OK
teste52/out/outputs/metadata.json              860 145 303 B  md5 f2ae61a4…c17e1c  utf-8 OK
```

A consequência prática: **`audit_variola.py --secao 5` percorre os quatro
conjuntos de *Variola* sem abortar** (VARV-49, VARV-52, VARV-121, VARV-6), e a
§3 do mesmo script passou a cobrir **cinco** conjuntos — os quatro de *Variola*
mais **ZIKV-478**. A pendência "recuperar o VARV-49 antes de qualquer coisa de
§4.1" está **encerrada**.

**O dano restante, e por que ele não bloqueia.** A varredura dos `metadata.json`
de `projects/**` continua achando **um** arquivo corrompido, e é a *cópia*, não o
conjunto oficial:

| Arquivo | Tamanho | Estado | Papel |
|---|---:|---|---|
| `variola_200seq/…/metadata.json` | 3 414 080 611 B | ❌ `UnicodeDecodeError` byte `0xfb` na posição **5 447 680** | cópia — não é conjunto oficial |
| `Variola_Yu_li_2007_200seq/…/metadata.json` | 3 414 080 611 B | ✅ decodifica inteiro | **VARV-121 oficial**, íntegro |

Dois avisos que valem para qualquer nova cópia destes artefatos:

- **O offset do dano mudou** entre a primeira e a segunda medição (2 740 133 888 B
  → 5 447 680 B) e os dois arquivos deixaram de ter md5 igual. Ou seja: a cópia
  foi refeita e **voltou a chegar danificada**. O perfil (conteúdo binário
  emendado, tamanho final correto) continua apontando para transferência
  interrompida, não para saída do pipeline.
- **Corrupção depois de um prefixo válido não se detecta lendo o começo.** No
  VARV-49 o JSON só quebrava depois de 540 MiB — qualquer leitura parcial que
  parasse antes disso devolvia dados que pareciam certos. Antes de usar um
  `metadata.json` copiado, force a decodificação do arquivo inteiro e confira o
  `md5` contra a origem.

---

## 3. O que rodar primeiro — portão de sanidade

Nada aqui é pesado; tudo termina em minutos. Se algum falhar, **pare e reporte**: o estado da máquina diverge do esperado e nenhum resultado pesado terá valor.

```bash
# 1. backend
# 0. o env bate com a receita? (versão divergente = resultado divergente)
bash scripts/check_dependencies.sh --strict   # esperado: 7 ✓, exit 0

make test-backend                # esperado: 216 passed, 1 xfailed
                                 # o xfail é D15 (vazamento de caminho absoluto)

# 2. submódulo (unittest, não pytest, e de dentro de BioComp_UFF/)
cd BioComp_UFF && python -m unittest \
  workflow.tests.test_stability workflow.tests.test_subtree_mining \
  workflow.tests.test_tree_identity workflow.tests.test_rf_bipartition \
  workflow.tests.test_manifest
                                 # esperado: Ran 82 tests, OK
                                 # a suíte completa dos 9 módulos do CLAUDE.md: Ran 150 tests, OK

# 3. oráculo da RF — confronta produção contra dendropy
cd BioComp_UFF && python ../docs/science/scripts/oraculo_rf_dendropy.py
                                 # esperado: TOTAL: 137 pares, 0 divergências

# 4. oráculo do FPMax e da identidade
cd BioComp_UFF && python ../docs/science/scripts/audit_variola.py --secao 3 --secao 5
                                 # esperado na §3: "produção x oráculo: 0 divergência(s)"
                                 #   em 5 conjuntos (VARV-49/52/121/6 + ZIKV-478)
                                 # §5 percorre os 4 conjuntos de Variola sem abortar

# 5. frontend
make test-frontend               # esperado: 8 passed
make lint                        # catraca: erros 68/68, avisos 27/27
make build                       # ✓ built

# 6. portão científico
make reference-check             # invariante 3/3; M = 4 de 5 até o RAxML entrar
```

### 3.1 Execução de 2026-08-25 na máquina de validação — **6 de 6 passaram**

Submódulo em `rigor-cientifico-m1-m2`, HEAD `0f80941`; env `Phylotreeminer` ativo.

| # | Comando | Esperado | Obtido | |
|---|---|---|---|---|
| 1 | `make test-backend` | 216 passed, 1 xfailed | **216 passed, 1 xfailed** (67 s) | ✅ |
| 2 | `python -m unittest` (5 módulos) | Ran 82 tests, OK | **Ran 82 tests, OK** | ✅ |
| 2b | idem, os 9 módulos do CLAUDE.md | Ran 150 tests, OK | **Ran 150 tests, OK** | ✅ |
| 3 | `oraculo_rf_dendropy.py` | 137 pares, 0 divergências | **137 pares, 0 divergências** | ✅ |
| 4 | `audit_variola.py --secao 3 --secao 5` | §3 sem divergência | **5 de 5 conjuntos com 0 divergência(s)**; §5 completa os 4 de *Variola* (125 s) | ✅ |
| 5 | `make test-frontend` / `lint` / `build` | 8 passed · 68/68 · 27/27 · built | **8 passed** · **68/68 · 27/27** · **✓ built em 20,8 s** | ✅ |
| 6 | `make reference-check` | invariante 3/3 | **3/3** — `monofilia_varv` (4 táxons), `clado_p2` (6), `p2_basal` (10), cada um 4/4 pipelines; 18 bipartições universais | ✅ |

Três expectativas escritas neste documento estavam **desatualizadas** e foram
corrigidas acima contra a execução real — não são falhas do portão:
`182 passed` → **216**; `Ran 81 tests` → **82**; `erros 69/69` → **68/68**
(o número já constava assim em [DEC-043](07-log-de-execucao.md)).

`make reference-check` continua devolvendo **M = 4 de 5**: falta `mafft_raxml`,
que só existe depois da reexecução de §4.1. O alvo do Makefile mapeia esse
código 2 para saída 0 de propósito — só o código 1 (invariante quebrado) reprova.

**Uma pendência operacional continua aberta**, e ela não é do portão:

- **`variola_200seq/…/metadata.json` corrompido** — é a cópia, não o conjunto
  oficial; ver §2.3.4.

O Docker foi resolvido no mesmo dia (§2.3.3), e com ele o Neo4j.

---

## 4. O que está esperando máquina grande

Em ordem de valor. Nenhum destes foi executado ainda.

### 4.0 O conjunto de validação já roda — use-o como pré-voo

Antes de qualquer conjunto grande, rode o conjunto de validação e confira. Ele fecha em **11 minutos** e é o que prova que a máquina está sã.

```bash
# ver docs/skills/validar-workflow/SKILL.md para a configuração completa
cd BioComp_UFF && python workflow.py -p <config-zika21-advanced>.json
cd Backend     && python scripts/conferir_correcoes_m1.py Zika_21seq_validacao
cd BioComp_UFF && python ../docs/science/scripts/oraculo_rf_dendropy.py projects/Zika_21seq_validacao
```

**Executado nesta máquina em 2026-08-25** ([DEC-045](07-log-de-execucao.md)), no
projeto `Zika_21seq_validacao_mv` — o original é a evidência do "antes" e não foi
sobrescrito. Ao lado, os números da máquina de desenvolvimento
([DEC-030](07-log-de-execucao.md)):

| Medida | Desenvolvimento | **Validação** | |
|---|---|---|---|
| árvores / pipelines | 14 / 14 (`advanced`, só `mrbayes` ignorado) | **14 / 14** | ✅ |
| duração total | 11 min 03 s (12 núcleos) | **9 min 40 s** (48 núcleos) | ✅ |
| FPMax | 37 linhas, 37 itemsets | **38 / 38** | ⚠ |
| frágeis ∩ robustos | ∅ | **∅** (17 frágeis, 9 robustos) | ✅ |
| identidade | 46 canônicos × 109 legados | **47 × 115** | ⚠ |
| bipartições | `\|B\| = 17 = n − 3`; **7** universais | `\|B\| = 17`; **6** universais | ⚠ |
| oráculo dendropy | 91 pares, 0 divergências | **91 pares, 0 divergências** | ✅ |
| custo por método | distância 0-6 s · IQ-TREE/FastTree 4-5 s · RAxML 6-7 s · **parcimônia 116-169 s** | idem, tempo total −12% | ✅ |

**Os três ⚠ têm causa medida, e não é a máquina.** Três de 14 pipelines mudaram de
topologia — `clustalo_iqtree` (RF = 8), `clustalo_raxml` (RF = 4) e `mafft_raxml`
(RF = 2); os outros 11 são idênticos. O alinhamento é **byte a byte igual** nos
dois alinhadores, e RAxML-NG e IQ-TREE dão **RF = 0** entre 2, 4 e 8 threads com
a mesma semente nesta máquina de 48 núcleos. Eliminados o alinhador e a
paralelização, resta a **versão do inferidor** — a consequência que
[DEC-044](07-log-de-execucao.md) previu ao adotar RAxML-NG 2.0.2. Os demais
números movem-se por arrasto das três topologias.

⛔ **A coluna "Validação" não é expectativa estável — e a de desenvolvimento
também não.** Uma segunda execução idêntica, na mesma máquina e com a mesma
semente, devolveu **34 itemsets, 43 clados canônicos e 7 bipartições
universais** onde esta devolveu 38 / 47 / 6. A causa é
[D21](../science/02-defeitos-que-alteram-resultado.md#d21): o IQ-TREE com
`-nt 4` **não é determinístico**, e os números derivados do conjunto de árvores
o herdam. Enquanto D21 não for decidido, compare **pipeline a pipeline por RF**,
não pelos agregados — e espere os dois braços de IQ-TREE divergirem.

Isto também **corrige** a atribuição de causa do parágrafo anterior para o
IQ-TREE: parte daquela divergência entre máquinas era ruído entre execuções. Para
o RAxML-NG a atribuição à versão continua de pé — ele é determinístico na mesma
máquina, verificado em três repetições.

⚠️ **Use `mode: "advanced"`.** O modo `auto` roda só distância e parcimônia e encerra dizendo que deu tudo certo — é o [D18](../science/02-defeitos-que-alteram-resultado.md#d18).

Divergência esperada entre máquinas: o **tempo** muda com o número de núcleos. Os hashes das árvores de RAxML e IQ-TREE mudam com a **versão** da ferramenta — medido. Já a **paralelização** deixou de ser fonte de divergência: `--threads N --workers 1` foi verificado em 2, 4 e 8 threads e devolve a mesma topologia ([DEC-045](07-log-de-execucao.md)). Se um hash divergir com semente, entrada **e versões** idênticas, **isso é defeito** e vai para o ledger.

✅ **`tools_invoked` populado** em [DEC-046](07-log-de-execucao.md): o manifesto passa a registrar a linha de comando de cada chamada, com semente, paralelização e a saída que ela produziu (`manifest_version: 2`).

⛔ **§4.1 está bloqueada por [D21](../science/02-defeitos-que-alteram-resultado.md#d21).** Reexecutar os cinco conjuntos agora produziria artefatos que **uma segunda execução não reproduz**, pelo braço do IQ-TREE. As três saídas — `-nt 1`, declarar o método não reprodutível, ou repetições com consenso — estão em D21 e **são decisão do usuário**, porque mudam árvore publicada.

---

### 4.1 Reexecutar os experimentos com o pipeline corrigido — **prioridade máxima**

É o que materializa M1. Sem isso, **nenhum número exibido pela aplicação mudou**, e artefato antigo não é comparável ao novo item a item.

Conjuntos, e o custo esperado de cada um:

| Conjunto | Táxons | Colunas do alinhamento | `metadata.json` atual | Papel declarado ([DEC-024](07-log-de-execucao.md)) |
|---|---:|---:|---:|---|
| VARV-6 | 6 | 250 517 | 29 MB | demo didático |
| VARV-49 | 49 | 235 955 | 821 MB | **baseline de referência** |
| VARV-52 | 52 | 259 496 | 1,1 GB | replicação |
| VARV-121 | 121 | 283 874 | 3,2 GB | escala e histórico do workflow |
| ZIKV-480 | 478 | 10 816 | 1,1 GB | escala em nº de táxons |

**O que conferir depois de reexecutar** — é aqui que a reexecução prova ou refuta M1:

1. `all_results_fpmax.csv` tem as colunas `support`, `min_support_threshold`, `max_support_threshold`, `n_trees` e **uma linha por itemset**.
2. Nenhum itemset aparece ao mesmo tempo como *method-sensitive* e *topologically robust* na Deep Analysis.
3. `List_terminals_hash` é o identificador canônico e `List_terminals_hash_legacy` está presente ao lado.
4. O número de itens distintos bate com a contagem de clados canônicos: **101 / 120 / 270 / 11** para VARV-49 / VARV-52 / VARV-121 / VARV-6 (inclui o clado universal).
5. O padrão de maior suporte de VARV-49 passa a ser de **16 clados a 8/8** (era 1 clado a 6/8).
6. `pytest Backend/tests` continua verde e os golden snapshots que mudarem têm parecer no ledger **antes** de serem regravados.

### 4.2 Devolver o RAxML aos experimentos de *Variola*

`ignore_mode` exclui `raxml` em VARV-49, VARV-52 e VARV-121. A causa foi identificada ([D17](../science/02-defeitos-que-alteram-resultado.md#d17)): um `SIGSEGV` do `--threads auto`, **não** limitação do método nem falta de memória. Reproduzido na máquina de desenvolvimento: o mesmo alinhamento de VARV-52 conclui em 251 s.

**Fixe `--threads N --workers 1`** e devolva `M` de 4 para 5. Resolve também DM-11 (a incomparabilidade de `M` entre experimentos).

⚠️ **Não use `--threads auto`.** Medido: mesma semente, mesmo arquivo, mudando só a paralelização → **RF = 8** entre as árvores resultantes. O esquema depende do número de núcleos, então a máquina de validação **vai** produzir árvore diferente da de desenvolvimento se isso não for fixado.

### 4.3 Teste de estresse — o que ainda não se sabe

| Pergunta | Por que importa | Como medir |
|---|---|---|
| Onde o FPMax passa a ser necessário? | Com `M ≤ 10`, `2^M ≤ 1024` e a enumeração exata é trivial — `maximal_patterns` já a faz. Se não houver cruzamento, **isso é resultado publicável** | [E7](../science/04-agenda-de-pesquisa.md) — ampliar `M` deliberadamente e medir tempo de enumeração exata contra FPMax |
| `pattern-analysis` em VARV-49 congela a API por quanto tempo? | O baseline P-0 mediu **6,4× de degradação** com VARV-6 (28,6 MB). VARV-49 tem 860 MB. **Extrapolação declarada, nunca medida** | `Backend/scripts/perf_baseline.py --servidor http://127.0.0.1:8011` |
| O `build_metadata_index` tem pior caso ruim? | Quando algum táxon nunca tem metadado no arquivo, lê o `metadata.json` inteiro (~11 s em 821 MB) dentro do `cache_lock` e no event loop | cronometrar `/api/tree/{p}/insights` a frio nos 5 conjuntos |
| MrBayes é viável? | Está ausente do PATH e no `ignore_mode` de todos os experimentos; nunca produziu árvore | instalar e rodar em VARV-6 primeiro |
| Parcimônia é viável? | Excluída em **todos** os experimentos. O construtor do Biopython é Python puro e escala mal | rodar em VARV-6 e ZIKV-6 antes de qualquer conjunto grande |

**Protocolo obrigatório de medição** ([`skills/perf-baseline`](../skills/README.md)): ≥3 repetições, mediana e dispersão, ambiente reportado, antes/depois na mesma máquina. Uma medição sem ambiente declarado não entra no ledger.

### 4.4 Limites de recurso já conhecidos

- **Clustal Omega estoura memória** em conjuntos grandes: `return code 137` / `Killed` (OOM killer) no Zika479. O pipeline troca para MAFFT acima de 20 kb por sequência — e é isso que produz [D1](../science/02-defeitos-que-alteram-resultado.md#d1), a substituição silenciosa que mantém o nome de arquivo `*_clustalo_*`. Numa máquina com mais RAM, vale medir **onde** o limite real está, em vez de manter os 20 kb chutados.
- **O que pesa no RAxML não é o número de táxons**, é o comprimento do alinhamento — e ainda assim só até a compressão de padrões: VARV-52 tem 259 496 sítios que comprimem para **3 713 padrões**. 478 táxons de Zika rodam; 52 de *Variola* quebravam.

---

## 5. Regras que valem igual nas duas máquinas

1. **Nada de commit e nada de push sem pedido explícito** — nos dois repositórios.
2. **Toda mudança na zona sagrada deixa parecer no ledger**, inclusive quando Δ = 0.
3. **Golden snapshot só é regravado depois do parecer**, nunca antes: `UPDATE_SNAPSHOTS=1 pytest tests/golden`.
4. **O submódulo já vinha sujo** antes deste trabalho — `workflow/stability/`, `docs/` e READMEs não rastreados ou modificados. Separe o que é seu antes de qualquer commit lá.
5. **Registre tudo no [log de execução](07-log-de-execucao.md)** com o número DEC seguinte, e atualize a linha "Última atualização" do bloco Estado.

---

## 6. Decisões já tomadas — não reabra

| # | Decisão | Resposta | Onde |
|---|---|---|---|
| 2 | VARV-121 fica ou sai | **Fica** — histórico de experimentos | [DEC-024](07-log-de-execucao.md) |
| 3 | VARV-6 fica ou sai | **Fica** — demo didático | [DEC-024](07-log-de-execucao.md) |
| 4 | UPGMA fica ou sai | **Fica**, reportando `sup` com e sem | [DEC-024](07-log-de-execucao.md) |
| 5 | Quando reexecutar | **Corrigir e re-rodar** | [DEC-018](07-log-de-execucao.md) |
| 6 | Editar o submódulo | **Sim**, com lock e histórico separados | [DEC-020](07-log-de-execucao.md) |

**Única pendente:** decisão 1 — qual é o segundo alinhador. Não bloqueia M2 nem M3; governa [E4](../science/04-agenda-de-pesquisa.md) e a correção plena de D1. Recomendação registrada: duas estratégias do MAFFT (`--retree 1` × `--maxiterate 1000`), já que o MUSCLE instalado é 3.8.1551 e não o 5.
