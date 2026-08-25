# Ficha de fatos — o que foi verificado, com o comando que verificou

[← Automação](README.md) · **Documento vivo.** Dono: [Gerenciador](../agents/00-orquestrador.md). Verificado em **2026-08-19** na máquina de desenvolvimento Linux.

## Por que este documento existe

É o **antídoto contra delírio e contra reauditoria**. Todo agente lê esta ficha na abertura da sessão e passa a tratar o que está aqui como fato estabelecido — não precisa reabrir `app.py`, não precisa redescobrir se o Docker existe, não precisa reconferir número de linha de defeito. Quem contradisser esta ficha tem de trazer o comando que a refuta, e então **atualiza a ficha**.

Custo de leitura: ~2 500 tokens. Custo de redescobrir o que está aqui: ≥ 60 000 tokens por janela.

**Regra de validade:** cada linha tem data. Fato com mais de 30 dias que embase decisão irreversível deve ser reverificado pelo comando anotado. Fato sem comando reprodutível não entra nesta ficha.

---

## 1. Ambiente de execução — **mudou desde a auditoria**

> ⚠️ **Isto invalida a premissa central do protocolo antigo.** [`02-protocolo-de-orquestracao.md §1`](02-protocolo-de-orquestracao.md) e [`../agents/10-revisor.md §5`](../agents/10-revisor.md) afirmam que "a máquina de desenvolvimento Windows não roda o stack (sem conda, node, npm ou Docker)" e que agentes "não podem afirmar que funciona". **Falso hoje.** Ver [DEC-008](07-log-de-execucao.md).

Comando: `for c in python3 conda node npm docker pytest git; do command -v $c && $c --version; done`

| Componente | Estado | Versão |
|---|---|---|
| SO | Linux | 6.8.0-136-generic |
| Python (sistema) | ✅ | 3.11.10 |
| conda | ✅ | 26.1.1 (`/home/joh/miniconda3`) |
| **Ambiente do projeto** | ✅ | `Phylotreeminer` → `/home/joh/miniconda3/envs/Phylotreeminer/bin/python`, Python 3.10.19 |
| node / npm | ✅ | v22.22.3 / 10.9.8 |
| Docker | ✅ | 28.3.3 |
| pytest (sistema) | ✅ | 7.2.1 |

### Pacotes Python no ambiente `Phylotreeminer`

Comando: `/home/joh/miniconda3/envs/Phylotreeminer/bin/python -c "import Bio, dendropy, ete3, ..."`

| Pacote | Versão | Papel |
|---|---|---|
| biopython | 1.81 | parsing, NJ/UPGMA |
| pandas | 2.2.2 | tabelas |
| mlxtend | 0.23.1 | FPMax |
| fastapi | 0.121.0 | backend |
| neo4j | 5.20.0 | driver |
| matplotlib | 3.10.8 | `treePlot.py` |
| numpy | 2.2.6 | — |
| uvicorn | 0.38.0 | servidor |
| psutil | 5.9.4 | métricas |
| python-dotenv | ✅ | config |
| **dendropy** | **4.6.1** | **oráculo independente de RF/consenso** |
| **ete3** | **3.1.3** | **oráculo independente de topologia** |

> **Os dois oráculos exigidos por [`04-rigor-cientifico.md §3`](04-rigor-cientifico.md#3-protocolo-de-mudança-na-zona-sagrada) já estão instalados.** O protocolo de mudança na zona sagrada é executável hoje, sem instalar nada.

### Ferramentas de bioinformática no `PATH`

| Ferramenta | Estado | Versão instalada | Versão nos logs de VARV | Coincide? |
|---|---|---|---|---|
| MAFFT | ✅ | v7.490 (2021/Oct/30) | não registrada ([D11](../science/02-defeitos-que-alteram-resultado.md#d11)) | indeterminável |
| Clustal Omega | ✅ | 1.2.4 | não registrada | indeterminável |
| IQ-TREE | ✅ (binário `iqtree2`) | 2.2.2.6 COVID-edition | **2.2.2.6** | ✅ **sim** |
| FastTree | ✅ (`FastTree`/`fasttree`) | 2.1.11 Double precision | **2.2.0** Double precision | ❌ **não** |
| RAxML-NG | ✅ | (binário presente) | não registrada | indeterminável |
| MUSCLE | ✅ | v3.8.1551 | — | (candidato de [E4](../science/04-agenda-de-pesquisa.md)) |
| MrBayes | ❌ ausente | — | — | não usado |

> **Achado novo (2026-08-19): divergência de versão do FastTree.** Os logs de VARV registram FastTree 2.2.0; a máquina tem 2.1.11. Reexecutar hoje **não reproduz** as árvores FastTree em disco. Isto é uma instância concreta de [D11](../science/02-defeitos-que-alteram-resultado.md#d11) (ausência de manifesto) e precisa ser resolvido antes de qualquer reexecução — ou pinando 2.2.0, ou declarando 2.1.11 como a versão do experimento e reexecutando tudo.
>
> **MUSCLE instalado é 3.8.1551, não MUSCLE5.** A recomendação de [E4](../science/04-agenda-de-pesquisa.md#e4--◐--o-fator-alinhador-medido-onde-ele-existe) supõe MUSCLE5. Com 3.8 a opção "duas estratégias do MAFFT" (`--retree 1` × `--maxiterate 1000`) fica ainda mais favorecida, pois não exige instalação nova.

### Serviços

Comando: `docker ps -a --format "{{.Names}}\t{{.Image}}\t{{.Status}}"`

| Serviço | Estado |
|---|---|
| `phylotree_neo4j` | **de pé**, imagem `neo4j:2026.01.3` |
| `neo4j_data/` | 2,4 GB em disco |

**Conteúdo do grafo:** apenas Zika. A Deep Analysis de Variola lê CSV/JSON do disco, não o grafo — ver [`../science/05-grafo-neo4j.md`](../science/05-grafo-neo4j.md).

---

## 2. Estado do repositório

Comando: `wc -l Backend/src/app.py; ls Backend/tests .github`

| Fato | Valor | Consequência |
|---|---|---|
| `Backend/src/app.py` | **2 122 linhas** | monólito; lock contencioso; ler só por faixa (`sed -n`), nunca inteiro |
| `Backend/tests/` | **não existe** | W0 é pré-requisito real, não formalidade |
| `.github/` | **não existe** | sem CI |
| Testes de frontend | **nenhum** (`find Frontend -name "*.test.*"` → vazio) | `package.json` não tem script `test` |
| `Frontend/.../node_modules` | instalado | `npm run build` / `lint` executáveis já |
| Branch | `main` | a auditoria fala de `claude/phylotreeminer-audit-ef6b53`, que é um worktree em `.claude/worktrees/` |
| Submódulo `BioComp_UFF` | presente, modificado (`m` no status) | contém todo o pipeline científico |

**Definição de sucesso do [plano mestre §2](01-plano-mestre.md): 0 de 5 satisfeita.** Confirmado.

### ⚠️ O trabalho de P0/P1 **não está em `main`**

Descoberto em 2026-08-19 ao aplicar a trava "verificar o portão no código, não no log" — na primeira aplicação da regra.

O log declara *"P0 ✅ CONCLUÍDO e validado (WSL)"* e *"P1 batch 1 ✅ aplicado e revisado"*. **Falso para `main`.** O trabalho existe apenas em `.claude/worktrees/phylotreeminer-audit-ef6b53/`, que **não é um worktree git registrado** (`git worktree list` mostra só `main`) — é um diretório órfão, com CRLF, da máquina Windows.

Comando: `diff --strip-trailing-cr -u Backend/src/app.py .claude/worktrees/*/Backend/src/app.py`

O diff real é de **62 linhas em 9 hunks** (os 4 241 do diff bruto são CRLF). Conjunto de endpoints idêntico; `main` é mais novo (2026-08-07 vs 2026-07-16). **É portável limpo.**

O que está aberto em `main` hoje:

| Item | Estado em `main` | `app.py` |
|---|---|---|
| `S-3` CORS | `allow_origins=["*"]` **com** `allow_credentials=True` | :68 |
| `S-2` traversal | `resolve_within` **não existe**; `startswith` fraco em 5 pontos | :367, :412, :838, :924, :979 |
| `S-2` / `B-2` `run_workflow` | validação de path **e lock de concorrência comentados** | :313 |
| `S-2` upload | filtro ZIP com `''` no `endswith` — **casa qualquer nome de arquivo** | :1943 |
| `S-2` upload | nome de arquivo do cliente usado sem `basename`/regex | :1959 |
| `C-2` / `C-3a` `set_ncbi_email` | `try/except` converte o `400` em `500`; `ncbi_service` local sombreia e não atualiza nada | :1895 |
| `P1-3` bind Neo4j | `docker-compose.yml` publica `7474:7474` e `7687:7687` em todas as interfaces | compose:11 |
| `.env.example` | **ausente** em `main` (existe no diretório órfão) | — |

**Consequência para o plano:** M0.4 muda de forma. Não é "escrever teste retroativo do que já foi corrigido" — é **escrever o teste que falha em `main` e depois portar o patch verificado**. O lote de segurança de M4 é antecipado para M0 porque o patch já existe, já foi revisado e agora tem teste.

---

### Arquivos que nenhum agente deve abrir inteiro

| Arquivo | Tamanho | Como consultar |
|---|---|---|
| `BioComp_UFF/workflow/owid_analysis_report_v2.json` | **88,7 MB** | `jq` com filtro, ou nunca |
| `BioComp_UFF/workflow/owid_analysis_report.json` | 13,5 MB | idem |
| `BioComp_UFF/workflow/owid_integration_test.ipynb` | 1,6 MB | idem |
| `BioComp_UFF/projects/Variola_Yu_li_2007/` | 2,0 GB | `find`/`md5sum` pontual |
| `BioComp_UFF/projects/teste52/` | 2,0 GB | idem |
| `Backend/src/app.py` | 2 122 linhas (~21k tokens) | `grep -n` para localizar, `sed -n 'A,Bp'` para ler |

---

## 3. Defeitos científicos — reverificados linha a linha em 2026-08-19

Os 12 defeitos de [`../science/02-defeitos-que-alteram-resultado.md`](../science/02-defeitos-que-alteram-resultado.md) foram escritos em 2026-08-19. Amostra reverificada **no código atual**, com o comando ao lado. Todos confirmados — a auditoria científica **não** está datada.

| Defeito | Local confirmado | Verificação | Estado |
|---|---|---|---|
| **D1** braço `clustalo` espúrio | `BioComp_UFF/workflow/controller/treeBuilderController.py:868,898` | `md5sum` dos 4 `.aln` de VARV-49 → **todos `852c538c0ae617a95f662199b0fe4ac9`** | ✅ **confirmado** |
| **D4** `support` = limiar | `BioComp_UFF/workflow/subtree_mining/miner.py:147` — `result_fpmax['support'] = support` dentro do laço `np.arange(0.1, 1.1, 0.1)` | `sed -n '140,152p'` | ✅ confirmado |
| **D5** identidade de 16 bits | `BioComp_UFF/workflow/utils/treeUtils.py:275-294` — `int(hash_object.hexdigest()[:4], 16)` sobre `str(lst)` | `sed -n '275,295p'` | ✅ confirmado |
| **D7** truncamento silencioso | `Backend/src/app.py:1560` — `max_pattern_size: int = Query(100, ge=1)` | `sed -n '1558,1562p'` | ✅ confirmado |
| **D8** `tree_coverage` colide | `Backend/src/app.py:1582` — `hash_subtrees_infos.update(get_hash_to_subtree(metadata))` em laço | `sed -n '1579,1584p'` | ✅ confirmado |
| **D12c** fallback morto | `Backend/src/app.py:628` — `annotations.get("organism", 'Unknown') or annotations.get("source", 'Unknown')` | `sed -n '625,630p'` | ✅ confirmado |
| **D12a** ano do nome da cepa | `Backend/src/app.py:650` — `raw_date = coll_date if coll_date else strain_info` | `sed -n '646,654p'` | ✅ confirmado |

**Correção já escrita e não usada:** `BioComp_UFF/workflow/stability/clade_identity.py` existe e implementa a identidade canônica correta (D5). O pipeline de produção não a chama.

**Harness de auditoria existente e funcional:** `docs/science/scripts/audit_variola.py` (529 linhas) **executa** neste ambiente e reproduz a seção 1 exatamente como documentado:

```bash
cd BioComp_UFF && /home/joh/miniconda3/envs/Phylotreeminer/bin/python \
  ../docs/science/scripts/audit_variola.py --secao 1
```

Saída confirmada: alinhamentos idênticos nos 4 experimentos de Variola; árvores `fasttree`, `nj_distance`, `upgma_distance` byte a byte idênticas; `iqtree` difere (estocástico); controle Zika com alinhamentos **distintos**.

> Este script é o **oráculo diferencial do projeto** e deve ser promovido de ferramenta de auditoria a instrumento de regressão. Ver [`10-marcos-e-metas.md`](10-marcos-e-metas.md) M1.

---

## 4. O baseline — Li *et al.* (2007)

**Referência.** Li Y, Carroll DS, Gardner SN, Walsh MC, Vitalis EA, Damon IK. *On the origin of smallpox: correlating variola phylogenics with historical smallpox records.* PNAS. 2007 Oct 2;104(40):15787-92. doi:10.1073/pnas.0609268104. PMID 17901212; PMCID PMC2000395.

**Estado no repositório: a replicação já está parcialmente escrita, comentada.**

`BioComp_UFF/workflow/workflow_dataAcquisition.py:798-884` contém, **comentado**, o experimento completo:

| Parâmetro | Valor no script |
|---|---|
| `work_dir` | `replication-RetMax200-ITRs` |
| `initial_min_length` | 180 000 pb |
| `refined_min_length` | 183 000 pb |
| `utr5_end` / `utr3_start` | `None` (genoma completo) |
| `similarity_threshold` | 0,999 |
| `retmax` | 200 |
| `query` | **48 accessions explícitas**: `DQ437580`–`DQ437594` (15) + `DQ441416`–`DQ441448` (33) |
| `outgroup_query` | Taterapox + Camelpox, `complete genome`, `"1900"[PDAT] : "2007"[PDAT]` |

**Diretórios de dados já existentes:**

- `BioComp_UFF/data/workflow_dataAcquisition_li_et_al_2007_replication-RetMax200/` (contém `dataset_final.fasta`)
- `BioComp_UFF/data/workflow_dataAcquisition_li_et_al_2007_replication-RetMax200-ITRs/`
- `BioComp_UFF/data/workflow_dataAcquisition_li_et_al_2007_replication-RetMax100/`
- `BioComp_UFF/data/SMALL_li_2007_replication-RetMax200-ITRs/`

**O que falta para o baseline ser um dataset de referência** (ver [E3](../science/04-agenda-de-pesquisa.md#e3--◐--varv-49-clean-replicação-depurada-de-li-et-al-2007)):

1. Filtro taxonômico explícito `txid10242` (*Orthopoxvirus*) — hoje ausente, causa de [D6](../science/02-defeitos-que-alteram-resultado.md#d6)
2. Enraizamento explícito e comum pelo grupo externo declarado — hoje a raiz é a convenção de escrita do Newick ([D3](../science/02-defeitos-que-alteram-resultado.md#d3))
3. Manifesto de execução com versões, sementes e hashes ([D11](../science/02-defeitos-que-alteram-resultado.md#d11))
4. `MANIFEST.sha256` + `expected.json` em `Backend/tests/data/reference/`

**O invariante científico que o baseline fornece** — e que é o critério de aceite de toda a refatoração:

> Em três conjuntos independentes (49, 52 e 121 táxons), a **monofilia de VARV** e o **clado P-II** (África Ocidental + América do Sul, *alastrim minor*) são recuperados por **100% dos métodos de inferência (4/4)**, reproduzindo Li *et al.* (2007) e Esposito *et al.* (2006). A bipartição aninhada de 10 táxons que posiciona P-II como linhagem basal de VARV também tem suporte 4/4.

Fonte: [`../science/01-revisao-variola.md §4.3`](../science/01-revisao-variola.md).

### O resultado principal do artigo (§4.4 da revisão)

UFBoot = 100 **não** garante robustez metodológica. Replicado em três conjuntos:

| Conjunto | Ramos com UFBoot=100 | Sobrevivem à troca de método (4/4) | % |
|---|---:|---:|---:|
| VARV-121 | 86 | 35 | 40,7% |
| VARV-49 | 27 | 13 | 48,1% |
| VARV-52 | 30 | 14 | 46,7% |

Correlação de Pearson UFBoot × suporte metodológico: 0,44 / 0,27 / 0,37.
Assimetria: **0 de 167** ramos com UFBoot ≥ 95 foi recuperado por um único pipeline.

---

## 5. Decisões pendentes do usuário (bloqueiam execução)

Registradas em [`../science/04-agenda-de-pesquisa.md`](../science/04-agenda-de-pesquisa.md#decisões-que-são-do-usuário-não-de-um-agente). Nenhum agente pode decidi-las.

| # | Decisão | Bloqueia |
|---|---|---|
| 1 | Qual é o segundo alinhador (Clustal Omega reduzido · MUSCLE · duas estratégias MAFFT) | E4, e a correção de D1 — **única pendente**; não bloqueia M2 nem M3 |
| 2 | ~~VARV-121 fica ou sai~~ — ✅ **FICA** (DEC-024): histórico de experimentos, mostra a evolução do workflow | ~~M2~~ destravado |
| 3 | ~~VARV-6 fica ou sai~~ — ✅ **FICA** (DEC-024): demo didático | ~~M2~~ destravado |
| 4 | ~~UPGMA fica ou sai~~ — ✅ **FICA** (DEC-024), reportando `sup` **com e sem**: o projeto quer uma biblioteca com várias ferramentas | ~~todos os números de suporte~~ |
| 5 | ~~Quando reexecutar~~ — ✅ **corrigir e re-rodar** (DEC-018) | — |
| **6** | ~~Agentes podem editar o submódulo `BioComp_UFF`?~~ — ✅ **SIM**, saída (a), com lock e histórico separados (DEC-020) | ~~D3, D4, D5, D10~~ — D3/D4/D5 já corrigidos em M1 |

---

## 6. Conflito de protocolo detectado — precisa de decisão

[`02-protocolo-de-orquestracao.md §3`](02-protocolo-de-orquestracao.md#3-write-lock-por-arquivo) estabelece:

> `BioComp_UFF/**` (submódulo) — **ninguém edita daqui.** A11 especifica e propõe ao usuário

Mas as correções **D3** (bipartição canônica em `stability.py`), **D4** (`support` em `miner.py`), **D5** (identidade canônica em `treeUtils.py`) e **D10** (propagar UFBoot ao Nexus) estão **todas dentro do submódulo**. Sob a regra atual, nenhuma pode ser executada.

Três saídas, e a escolha é do usuário:

| Saída | Consequência |
|---|---|
| **(a)** Liberar escrita no submódulo com lock próprio e commit separado no repo do submódulo | Destrava M1 inteiro. Exige disciplina de dois históricos git. **Recomendada.** |
| **(b)** Manter congelado; correções vivem em camada de pós-processamento no `Backend/` | Duplica lógica científica em dois lugares — é exatamente o defeito D5 (dois universos de identidade paralelos) institucionalizado. Não recomendada. |
| **(c)** Absorver o submódulo no repositório principal | Muda o modelo de distribuição do projeto. Decisão de produto. |

---

## Histórico de atualizações desta ficha

| Data | O que mudou | Quem |
|---|---|---|
| 2026-08-19 | Criação. Ambiente reverificado (invalida premissa Windows), versões de ferramentas pinadas, divergência FastTree 2.2.0 vs 2.1.11 descoberta, 7 defeitos reconfirmados linha a linha, baseline Li *et al.* localizado no script de aquisição, conflito de protocolo do submódulo detectado. | sessão de planejamento |
