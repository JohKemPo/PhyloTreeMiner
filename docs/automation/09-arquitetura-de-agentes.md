# Arquitetura de agentes — hierarquia, validação cruzada e loop de execução

[← Automação](README.md) · Substitui a §1 e a §2 de [`02-protocolo-de-orquestracao.md`](02-protocolo-de-orquestracao.md); o resto daquele documento (write-locks, handoff, escalonamento) continua válido e é referenciado aqui.

## 0. O que mudou e por quê

O protocolo original tinha **dois papéis de coordenação** (Orquestrador A0, Revisor A10) e treze especialistas. Ele foi desenhado sob uma premissa que **hoje é falsa**: a de que nenhum agente conseguiria executar o stack, e portanto que "funciona" só poderia ser dito pelo humano.

[`08-ficha-de-fatos.md §1`](08-ficha-de-fatos.md) documenta o ambiente real: conda com o ambiente `Phylotreeminer` completo, Docker com Neo4j de pé, Node, e a cadeia bioinformática inteira (MAFFT, Clustal Omega, IQ-TREE 2.2.2.6, FastTree, RAxML-NG, MUSCLE) — mais **dendropy 4.6.1 e ete3 3.1.3**, que são precisamente os oráculos independentes que [`04-rigor-cientifico.md §3`](04-rigor-cientifico.md) exige.

A consequência arquitetural é grande: **a validação deixa de ser um gargalo humano e vira um papel de agente**. Isso permite fechar o loop, e é o que esta arquitetura faz.

Três defeitos do desenho anterior que esta arquitetura corrige:

| Defeito | Como se manifestava | Correção |
|---|---|---|
| **Papéis fundidos** | A0 planejava *e* gerenciava; A10 revisava código *e* julgava evidência. Quem planeja não é adversário do próprio plano. | Cinco papéis distintos, com validação cruzada obrigatória |
| **Validação por prosa** | "consistente e verificado estaticamente" era o teto alcançável | Validador executa; evidência é comando + saída |
| **Loop aberto** | O ciclo terminava no humano em todo gate; sem o humano, parava | Loop fechado com escalonamento seletivo — o humano decide o que é dele (ciência, ética, commit), não o que é mecânico |

---

## 1. A hierarquia

```
                        ┌──────────────────────────────┐
                        │  USUÁRIO (autor da pesquisa) │
                        │  veto científico e ético     │
                        └──────────────┬───────────────┘
                                       │ decide o que é decisão dele (§6)
                        ┌──────────────▼───────────────┐
                        │   P — PLANEJADOR   (opus)    │
                        │   marcos, gates, sequência   │
                        │   NÃO delega, NÃO codifica   │
                        └──────────────┬───────────────┘
                                       │ plano com gates verificáveis
                        ┌──────────────▼───────────────┐
                        │   G — GERENCIADOR  (opus)    │
                        │   lotes, locks, ledger,      │
                        │   despacho, fechamento       │
                        │   NÃO codifica, NÃO replaneja│
                        └──┬────────────┬───────────┬──┘
                           │            │           │
              ┌────────────▼──┐  ┌──────▼──────┐  ┌─▼─────────────┐
              │ D — DESENVOL- │  │ R — REVISOR │  │ V — VALIDADOR │
              │ VEDOR (fable) │  │ DE CÓDIGO   │  │    (fable +   │
              │               │  │   (opus)    │  │  opus/veredito)│
              │ escreve código│  │ lê diff     │  │ EXECUTA        │
              │ dentro do lock│  │ NÃO executa │  │ NÃO edita src  │
              └───────┬───────┘  └──────┬──────┘  └───┬───────────┘
                      │                 │             │
                      └────── R valida D ┘             │
                      └────────────── V valida D ──────┘
                                  V ⟷ R (§3)
                           │
              ┌────────────▼─────────────────────────────────┐
              │  ESPECIALISTAS — capacidades, não hierarquia │
              │  A6 domínio · A11 bioinfo · A8 governança    │
              │  → PODER DE VETO, acionados por G            │
              │  A1..A5, A7, A9, A12, A13 → perfis de D      │
              └──────────────────────────────────────────────┘
```

**Os treze agentes de [`../agents/`](../agents/README.md) não são descartados.** Eles passam a ser **perfis** que os papéis assumem: quando G despacha um lote de frontend, D executa *com o contrato de A5*. Quando o lote toca a zona sagrada, o veto de A6 é acionado antes de D começar, não depois. Isso preserva todo o trabalho de contrato já escrito e elimina a confusão entre "papel no loop" e "domínio de especialidade".

### Mapeamento papéis × elenco existente

| Papel novo | Absorve | Contratos que carrega |
|---|---|---|
| **P** Planejador | metade de A0 (§4.1-4.3 do contrato) | [`00-orquestrador.md`](../agents/00-orquestrador.md) §2 primeiro item |
| **G** Gerenciador | metade de A0 (§4.4-4.8) | [`00-orquestrador.md`](../agents/00-orquestrador.md), [`02-protocolo §3-4`](02-protocolo-de-orquestracao.md) |
| **D** Desenvolvedor | A1, A2, A3, A4, A5, A7, A9, A12 | o contrato do especialista do lote |
| **R** Revisor de Código | metade de A10 (diff, escopo, diretrizes) | [`10-revisor.md`](../agents/10-revisor.md) §4.2-4.6 |
| **V** Validador | metade de A10 (evidência) + **capacidade nova de execução** | [`10-revisor.md`](../agents/10-revisor.md) §4.3 + [`04-rigor-cientifico`](04-rigor-cientifico.md) §3 |
| **Vetos** | A6, A8, A11 | inalterados — [`README §quem tem poder de veto`](../agents/README.md) |
| **Escrita** | A13 | inalterado, paralelo permanente |

---

## 2. Contrato de cada papel

### P — Planejador · opus · não escreve código, não delega

**Existe para** manter a distância entre "o que estamos construindo" e "o que estamos fazendo agora". É o único que pode alterar marcos, gates e sequência.

- **Entrada:** [`08-ficha-de-fatos.md`](08-ficha-de-fatos.md), [`10-marcos-e-metas.md`](10-marcos-e-metas.md), o veredito de fechamento de marco vindo de G.
- **Saída:** um marco decomposto em lotes candidatos, cada um com gate verificável, dependências e trilha de paralelismo.
- **Limites:** não escolhe quem executa (é de G); não escreve handoff; não lê código além do necessário para dimensionar (usa a ficha de fatos).
- **É validado por:** **G**, que devolve o plano se um lote não couber num write-lock, estourar orçamento, ou depender de decisão do usuário ainda pendente. **D**, que devolve com "especificação ambígua" se o critério de aceite não for verificável.
- **Valida:** **G** — recusa o fechamento de um marco cujo gate não esteja objetivamente satisfeito, mesmo com todos os lotes aprovados.

### G — Gerenciador · opus · não escreve código, não replaneja

**Existe para** que nada fique só na memória da conversa e nenhum lote fique órfão. É o dono do ledger.

- **Entrada:** plano de P; relatórios de D, R e V.
- **Saída:** handoffs no formato de [`02-protocolo §4`](02-protocolo-de-orquestracao.md#4-formato-do-handoff); atualização de [`07-log-de-execucao.md`](07-log-de-execucao.md) e [`../audit/10-progresso-execucao.md`](../audit/10-progresso-execucao.md) **antes** de responder; veredito de fechamento de lote.
- **Limites:** não muda o plano (devolve a P); não codifica; não aprova lote sem **os dois** pareceres (R e V); não abre lote novo no mesmo write-lock de um lote aberto.
- **É validado por:** **P** (fechamento de marco) e **V** (G não pode declarar gate satisfeito sem a saída de comando que o comprova).
- **Valida:** **P** (executabilidade), **R e V** (que ambos se pronunciaram e que a divergência entre eles foi resolvida, não ignorada).

### D — Desenvolvedor · fable · escreve código apenas dentro do write-lock

**Existe para** implementar exatamente o lote, e nada além.

- **Entrada:** um handoff fechado. Nunca "melhore o módulo X".
- **Saída:** o diff + relatório no formato de [`02-protocolo §4`](02-protocolo-de-orquestracao.md#4-formato-do-handoff), com a seção **Não verificado** preenchida honestamente.
- **Limites:** um write-lock; se achar problema fora do escopo, **registra e não corrige**; se estourar o orçamento de arquivos/edições, **para e reporta**; nunca `git commit`.
- **É validado por:** **R** (o diff corresponde ao escopo e às diretrizes?) e **V** (roda?).
- **Valida:** **P** — devolve a especificação se o critério de aceite não for verificável como escrito.

### R — Revisor de Código · opus · não escreve código, não executa

**Existe para** ser o custo que um diff otimista tem de pagar. Lê o que foi escrito, não o que foi prometido.

- **Entrada:** handoff + relatório de D + `git diff` real.
- **Saída:** veredito **aprovado** / **aprovado com ressalvas** / **reprovado**, com lista fechada e acionável.
- **Limites:** não amplia escopo; não reprova por gosto; **não declara que funciona** — isso é de V. Uma reprovação, uma lista fechada: não descobre requisitos novos na segunda rodada.
- **É validado por:** **V** — se V executa e falha, a aprovação de R é invalidada e R registra o que a revisão estática não podia ver (isso alimenta as diretrizes).
- **Valida:** **D** (diff × escopo × diretrizes) e **V** (a evidência produzida é *relevante* ao critério de aceite? um teste que passa sem exercitar o caminho corrigido não é evidência).

### V — Validador · executa · o papel novo

**Existe para** que "funciona" volte a ser uma afirmação com prova. É a maior mudança em relação ao protocolo antigo.

- **Entrada:** handoff + diff aprovado por R (ou em paralelo a R — ver §3).
- **Saída:** para cada item do critério de aceite: **comando executado + saída literal**, e classificação em `EXECUTADO-VERDE` / `EXECUTADO-VERMELHO` / `NÃO-EXECUTÁVEL` (com a razão técnica).
- **Poderes de execução:** `pytest`, `npm run build`/`lint`, `docker compose`, subir o backend, `curl` nos endpoints, rodar o pipeline bioinformático, e — no que toca a zona sagrada — **confrontar contra os oráculos** dendropy/ete3 e contra `docs/science/scripts/audit_variola.py`.
- **Limites:** **não edita código de produção.** Pode escrever apenas em `Backend/tests/**`, `Frontend/**/*.test.jsx` e scripts de verificação. Não julga estilo. Não decide se um Δ científico é aceitável — mede o Δ e escala.
- **É validado por:** o **oráculo** (dendropy/ete3/audit script contradiz o número → V estava errado), pelo **determinismo** (toda evidência é um comando reproduzível; G pode reexecutar por amostragem) e por **R** (evidência irrelevante é rejeitada).
- **Valida:** **D** (roda?), **R** (a aprovação estática sobrevive à execução?) e **G** (nenhum gate fecha sem saída de comando).

> **A regra que dá sentido ao papel:** `NÃO-EXECUTÁVEL` continua sendo um veredito legítimo — mas agora precisa de **razão técnica**, não de "o ambiente não permite". O ambiente permite. Ver [`08-ficha-de-fatos.md §1`](08-ficha-de-fatos.md).

---

## 3. Validação cruzada — quem valida quem

Nenhum papel se autoaprova. A matriz é fechada: todo papel é validado por pelo menos um outro, e o ciclo não tem folha solta.

| Validador ↓ / Validado → | P | G | D | R | V |
|---|:-:|:-:|:-:|:-:|:-:|
| **P** Planejador | — | ✓ fecha marco? | | | |
| **G** Gerenciador | ✓ executável? | — | ✓ escopo do lote | ✓ pronunciou-se? | ✓ pronunciou-se? |
| **D** Desenvolvedor | ✓ spec verificável? | | — | | |
| **R** Revisor | | | ✓ diff × escopo × diretrizes | — | ✓ evidência relevante? |
| **V** Validador | | ✓ gate tem prova? | ✓ executa? | ✓ aprovação sobrevive? | — |
| **Oráculo** (dendropy/ete3/audit) | | | | | ✓ o número confere? |
| **Usuário** | ✓ marcos | | | | ✓ Δ científico aceitável? |

### Resolução de divergência R ⟷ V

É o caso interessante, e precisa de regra explícita para não virar impasse:

| Situação | Resolução |
|---|---|
| R aprova, V verde | Lote fecha. |
| R reprova, V verde | **R vence.** Código que roda mas viola o lock/diretriz volta para D. "Funciona" não é licença de escopo. |
| R aprova, V vermelho | **V vence.** A aprovação é anulada; R registra em [`03-diretrizes`](03-diretrizes-de-engenharia.md) o que a revisão estática não pegou — a diretriz melhora. |
| R reprova, V vermelho | Volta para D com **uma** lista consolidada por G. Nunca duas rodadas de descoberta. |
| V diz `NÃO-EXECUTÁVEL`, R aprova | G decide: ou aceita como débito **registrado no ledger com data**, ou reabre o lote. Nunca fecha silencioso. |
| V verde, mas oráculo diverge | **Oráculo vence.** Zona sagrada → escala ao usuário com a tabela de diff ([`04-rigor-cientifico §3.5`](04-rigor-cientifico.md#3-protocolo-de-mudança-na-zona-sagrada)). |

---

## 4. O loop de execução

```
   ┌─────────────────────────────────────────────────────────────────────┐
   │                                                                     │
   │   P: marco → lotes com gate            (1 vez por marco)            │
   │        ↓                                                            │
   │   G: verifica gate anterior NO CÓDIGO, não no log                   │
   │        ↓                                                            │
   │   G: escreve HANDOFF fechado (§4 do protocolo)                      │
   │        ↓                                                            │
   │   [ veto prévio: zona sagrada? → A6/A11 · dado/segredo? → A8 ]      │
   │        ↓                                                            │
   │   D: implementa dentro do lock → RELATÓRIO                          │
   │        ↓                                                            │
   │   ┌────────────────┬────────────────┐   ← R e V EM PARALELO         │
   │   R: diff/escopo   │   V: executa   │     (locks disjuntos:         │
   │   └────────┬───────┴────────┬───────┘      R lê, V roda)            │
   │            └────────┬───────┘                                       │
   │        ↓  resolução §3                                              │
   │   G: registra no ledger ANTES de responder                          │
   │        ↓                                                            │
   │   gate do marco satisfeito? ──não──→ próximo lote (volta a G)       │
   │        │ sim                                                        │
   │        ↓                                                            │
   │   P: valida fechamento do marco                                     │
   │        ↓                                                            │
   │   decisão do usuário pendente? ──sim──→ PARA e pergunta             │
   │        │ não                                                        │
   │        └──────────────────→ próximo marco                           │
   │                                                                     │
   └─────────────────────────────────────────────────────────────────────┘
```

**Uma iteração = um lote = cinco janelas curtas**, não uma janela longa. Cada janela morre depois de gravar seu artefato. É isso que torna o loop imune à perda de contexto: nenhum estado vive na conversa.

---

## 5. Arquitetura anti-delírio, anti-perda-de-contexto e anti-desperdício

Três problemas distintos, três mecanismos distintos. Misturá-los é o erro comum.

### 5.1 Contra perda de contexto — estado durável em quatro arquivos, e só neles

| Arquivo | Guarda | Dono |
|---|---|---|
| [`08-ficha-de-fatos.md`](08-ficha-de-fatos.md) | **fatos verificados** com o comando que os verificou | G |
| [`07-log-de-execucao.md`](07-log-de-execucao.md) | decisões (DEC-nnn), evidências, medições, pareceres, handoffs | G |
| [`../audit/10-progresso-execucao.md`](../audit/10-progresso-execucao.md) | o que mudou no código, por prioridade | G |
| o próprio código + testes | a verdade final | — |

**Regra de encerramento:** G grava **antes** de responder ao usuário. Se a sessão morrer no meio, o próximo bootstrap retoma sem perguntar nada.

**Teste da arquitetura:** uma janela nova, lendo só esses quatro artefatos, consegue dizer em que marco estamos, qual lote está aberto, quem tem qual lock e qual o próximo passo. Se não consegue, o ledger está incompleto — e isso é uma falha de G, reportável.

### 5.2 Contra delírio — três travas independentes

1. **Ficha de fatos.** Fato estabelecido não se rediscute; quem discordar traz o comando que refuta e atualiza a ficha. Elimina a classe inteira de "o agente supôs que não havia Docker".
2. **Oráculo independente.** Na zona sagrada, nenhum número é aceito por plausibilidade: dendropy/ete3 conferem RF e topologia; `audit_variola.py` confere as tabelas de Variola. **Divergência é dado, não ruído.**
3. **Gate verificado no código, não no log.** G reabre o repositório e confirma. Log otimista é risco conhecido (R3/R4 em [`06-riscos`](06-riscos-e-rollback.md)) e já se materializou neste projeto: o residual de `resolve_within` em `rerun_workflow` ficou registrado como "aplicado" no batch 1.

Mais duas travas de forma:

4. **Evidência é saída de comando, nunca prosa.** Relatório sem seção "Não verificado" é rejeitado por R antes de qualquer análise — economiza a janela inteira.
5. **A auditoria é hipótese datada.** Todo achado com mais de 30 dias é reconferido antes de virar tarefa. (A ficha de fatos já reconferiu os defeitos científicos em 2026-08-19: todos confirmados.)

### 5.3 Contra gasto desnecessário — orçamento explícito por papel

| Papel | Modelo | Lê | Orçamento de contexto | Nunca lê |
|---|---|---|---|---|
| **P** | opus | ficha + marcos + veredito de G | ~10k | código de produção |
| **G** | opus | ficha + ledger + progresso | ~12k | arquivos > 1 MB |
| **D** | **fable** | ficha + handoff + **faixas** localizadas por `grep -n` | ~18k | `app.py` inteiro; `owid_*.json` |
| **R** | opus | handoff + relatório + `git diff` | ~12k | o repositório inteiro |
| **V** | fable (execução) → opus (veredito) | handoff + relatório + saídas | ~10k | fontes fora do lote |
| Varredura mecânica | haiku | o que a varredura toca | — | — |

**Custo-alvo de um lote completo: ~60k tokens de contexto + o diff.** Um lote que estoure isso estava mal dimensionado — a falha é de P (lote grande demais), não de D.

Regras operacionais que produzem esse número:

- **Não reauditar.** O diagnóstico existe em [`../audit/`](../audit/README.md) e [`../science/`](../science/README.md). Reabrir análise pronta é o desperdício mais caro deste projeto — e o mais fácil de cometer.
- **Ler por faixa.** `grep -n` para localizar, `sed -n 'A,Bp'` para ler. `app.py` inteiro custa ~21k tokens; a faixa relevante custa ~600.
- **Nunca abrir os arquivos da lista negra** de [`08-ficha-de-fatos.md §2`](08-ficha-de-fatos.md#arquivos-que-nenhum-agente-deve-abrir-inteiro) — `owid_analysis_report_v2.json` sozinho tem 88,7 MB.
- **Um subagente por escopo, não por arquivo.** Cada spawn recomeça frio e reconstrói contexto; agrupe o correlato.
- **Um lote, uma janela.** Handoff fechado → executa → relatório → a janela pode morrer sem perda.
- **Evidência é barata, retrabalho é caro.** O comando e a saída no ledger economizam a próxima janela inteira.

---

## 6. Escalonamento — o que continua sendo do usuário

O loop fecha sozinho no que é mecânico. **Para** e pergunta quando:

1. A mudança altera um **número científico** ([`04-rigor-cientifico §1`](04-rigor-cientifico.md#1-zona-sagrada)) ou uma **escolha metodológica** de inferência.
2. Há **dado pessoal real** onde não deveria.
3. A correção exige **decisão de produto**.
4. Um achado da auditoria **não se confirma** no código atual.
5. O trabalho exigiria **commit/push** — [DEC-003](07-log-de-execucao.md), inalterada.
6. Uma das **seis decisões pendentes** de [`08-ficha-de-fatos.md §5`](08-ficha-de-fatos.md#5-decisões-pendentes-do-usuário-bloqueiam-execução) bloqueia o lote.

O item 3 do protocolo antigo — *"o gate exige executar o stack, impossível no ambiente atual"* — **deixa de ser motivo de escalonamento.** Essa era a razão de o loop não fechar.

---

## 7. Paralelismo — seis trilhas

Paralelismo é permitido **entre write-locks disjuntos**, e só. A tabela de propriedade de [`02-protocolo §3`](02-protocolo-de-orquestracao.md#3-write-lock-por-arquivo) continua valendo.

| Trilha | Write-lock | Perfil de D | Pode rodar com |
|---|---|---|---|
| **T1 · Pipeline científico** | `BioComp_UFF/workflow/**` ⚠️ | A6 + A11 | T3, T4, T5, T6 |
| **T2 · Backend API** | `Backend/src/app.py`, `routers/**` | A2 / A3 / A4 por onda | T3, T5, T6 — **nunca consigo mesma** |
| **T3 · Verificação** | `Backend/tests/**`, `.github/**`, `Makefile` | A7 + A1 | todas |
| **T4 · Frontend** | `Frontend/**` | A5 | todas, **se o contrato da API estiver congelado no lote** |
| **T5 · Grafo** | `neo4j_services.py`, esquema, consultas | A12 | todas menos T2 quando T2 toca o driver |
| **T6 · Documento & artefato** | `docs/paper/**`, `docs/reproducao/**`, `README.md`, `CITATION.cff` | A13 + A9 | todas, sempre |

⚠️ **T1 está bloqueada** pelo conflito de protocolo de [`08-ficha-de-fatos.md §6`](08-ficha-de-fatos.md#6-conflito-de-protocolo-detectado-precisa-de-decisão): o protocolo proíbe editar o submódulo, mas D3/D4/D5/D10 vivem dentro dele. **Decisão 6 do usuário destrava a trilha.**

### Proibições de paralelismo (invariantes)

- Dois agentes em `Backend/src/app.py`. Enquanto Arq-B não quebrar o monólito, T2 é serial — é o gargalo estrutural do projeto e o principal argumento a favor de antecipar a extração de serviços.
- **A6 com qualquer outro no mesmo caminho de cálculo.** Mudança de resultado precisa de diff isolado; agrupar dois itens esconde qual moveu o número.
- **A11 com A6 no mesmo dataset de referência.** Se pipeline e cálculo mudam juntos, o Δ de topologia não é atribuível.
- Contrato de API e seu consumo no mesmo lote. Sequencie: backend → teste → frontend.
- Refatoração estrutural e mudança de comportamento. **Sempre dois lotes**, para preservar reversibilidade.
- **Um lote = um defeito científico.** Regra de [`../science/02-defeitos §ordem de ataque`](../science/02-defeitos-que-alteram-resultado.md#ordem-de-ataque-sugerida).

### Grau de paralelismo realista

Com T1 destravada: **quatro lotes simultâneos** (T1, T3, T4, T6) mais T2 ou T5 — cinco frentes. Com T1 bloqueada: três (T3, T4, T6) mais T2/T5.

O limite prático não é o lock, é a **capacidade de revisão**: cada lote em execução consome uma rodada R+V. Recomendação de G: **no máximo 3 lotes abertos** simultaneamente, priorizando trilhas de lock disjunto e revisão barata.

---

## 8. Instalação no harness

Os papéis viram subagentes reais do Claude Code. Primeira tarefa de M0:

```bash
mkdir -p .claude/agents .claude/skills
cp docs/agents/[0-9]*.md .claude/agents/     # especialistas e vetos (já escritos)
cp -r docs/skills/*/ .claude/skills/         # golden-snapshot, perf-baseline, science-validate, ...
# + criar os 5 papéis do loop:
#   .claude/agents/ptm-planejador.md
#   .claude/agents/ptm-gerenciador.md   (reescreve ptm-orquestrador)
#   .claude/agents/ptm-desenvolvedor.md
#   .claude/agents/ptm-revisor-codigo.md (reescreve ptm-revisor)
#   .claude/agents/ptm-validador.md      (NOVO — o papel que executa)
```

**Skill nova a escrever em M0:** `docs/skills/oracle-check/SKILL.md` — o procedimento de confronto contra dendropy/ete3/`audit_variola.py`, que é o instrumento de trabalho de V na zona sagrada.

## 9. Prompt de bootstrap

```
Você é o <PAPEL> do PhyloTreeMiner.

Leia, nesta ordem, e nada além:
1. docs/automation/08-ficha-de-fatos.md      (fatos verificados — não rediscuta)
2. docs/automation/09-arquitetura-de-agentes.md §2 (seu contrato)
3. docs/automation/10-marcos-e-metas.md      (marco corrente)
4. docs/automation/07-log-de-execucao.md     (estado, lotes abertos, locks)

Regras invioláveis:
- Fato da ficha não se rediscute; para refutar, traga o comando.
- Evidência é comando + saída literal. Prosa não é evidência.
- Fique dentro do seu write-lock. Achado fora de escopo: registre, não corrija.
- Nenhum commit sem pedido explícito do usuário.
- Se estourar o orçamento de contexto do seu papel, PARE e reporte.
```
