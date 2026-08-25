# Protocolo de orquestração de subagentes

[← Automação](README.md)

Regras de coordenação. Um orquestrador que siga este documento consegue rodar a evolução do projeto por múltiplas janelas de contexto sem perder estado nem produzir conflitos de escrita.

## 1. Papéis

| Papel | Quem | Escreve código? |
|---|---|---|
| Orquestrador | [A0](../agents/00-orquestrador.md) — modelo **opus** | **Não.** Planeja, delega, verifica gates, mantém o log |
| Especialistas | A1-A9, A11-A13 — **fable** para escrever código; **opus** nos de julgamento (A6, A8, A11, A13) | Sim, dentro do próprio *write-lock* |
| Revisor | [A10](../agents/10-revisor.md) — modelo **opus** | Não. Reprova ou aprova contra o gate |
| Validador humano | o usuário, em WSL/Linux | Roda o stack de verdade |

Por que o humano continua no circuito: a máquina de desenvolvimento Windows deste worktree **não roda o stack** (sem conda, node, npm ou Docker). Agentes podem escrever, ler, analisar e checar sintaxe; **não podem afirmar que "funciona"** — só que "está consistente e passa nas verificações estáticas disponíveis". Essa distinção deve aparecer literalmente nos relatórios.

## 2. Ciclo de delegação

```
Orquestrador
  1. lê o gate da onda corrente (01-plano-mestre.md)
  2. verifica no repositório se o gate anterior está satisfeito  ← não confiar no log
  3. escolhe um LOTE: escopo fechado, um único write-lock, ~1 PR
  4. escreve o HANDOFF (§4) e delega ao especialista
  5. recebe o relatório; delega ao Revisor (A10)
  6. registra decisão + evidência em 07-log-de-execucao.md
  7. se o gate exige execução real → pede validação ao usuário e PARA
```

Um lote é bem dimensionado quando cabe numa descrição de 10 linhas, toca ≤ 5 arquivos e tem critério de aceite objetivo. Lote grande demais é a causa nº 1 de agente que "termina" sem terminar.

## 3. Write-lock por arquivo

**Regra:** dentro de uma onda, cada caminho tem **exatamente um** agente com permissão de escrita. Quem não tem o lock pode ler, medir e recomendar — nunca editar.

Propriedade padrão (o orquestrador pode reatribuir por onda, registrando no log):

| Caminho | Dono padrão |
|---|---|
| `docker-compose.yml`, `*/Dockerfile`, `nginx.conf`, `.env.example`, `start.sh`, `application_ui.sh`, `requirements.txt`, `environment.yml`, `.gitignore`, `.gitmodules`, `.github/` | A1 Infra |
| `Backend/src/app.py` | **Contencioso** — atribuir por onda: A2 (W1), A4 (W2), A3 (W3/W4) |
| `Backend/src/routers/**` | A3 (A2 nas ondas de segurança) |
| `Backend/src/services/neo4j_services.py`, consultas predefinidas, migrações de esquema | **A12** (A3 mantém driver/ciclo de vida/DI) |
| `Backend/src/services/cql_batch_service.py` | A3 (exceto o tokenizador `C-5e`, que é de A6) |
| `Backend/src/services/ncbi_acquisition.py` | A4 (perf/resiliência) · A8 revisa proveniência · A11 revisa QC e amostragem |
| `Backend/src/utils/treePlot.py`, `genericOWIDAnalyzer.py`, lógica de quartet/RF/FPMax | **A6** — mesmo quando a motivação é performance |
| `BioComp_UFF/**` (submódulo) | **escrita liberada** desde 2026-08-24 ([DEC-020](07-log-de-execucao.md)), com write-lock próprio e commit separado no repositório do submódulo. A11 continua especificando; o histórico é outro e **nunca** se commita nem se dá push sem pedido explícito ([DEC-003](07-log-de-execucao.md)). Um lote não pode tocar `Backend/` e `BioComp_UFF/` ao mesmo tempo. |
| `Backend/tests/**` | A7 |
| `Frontend/**` | A5 |
| `Frontend/**` testes (`*.test.jsx`) | A7 |
| `docs/audit/**` | somente A0 (e `10-progresso-execucao.md`) |
| `docs/automation/07-log-de-execucao.md` | A0 |
| `docs/agents/**`, `docs/skills/**` | A0 |
| `docs/science/metricas.md` | A6 |
| `docs/science/metodos-inferencia.md` | A11 |
| `docs/data-model/neo4j.md` | A12 |
| `docs/paper/**` | A13 |
| `docs/reproducao/**`, `README.md` da raiz, `CITATION.cff` | A9 |

**Consequência importante:** `app.py` é um monólito de ~2100 linhas tocado por quase todos os itens. Enquanto Arq-B (W4) não o quebrar, **ondas que mexem em `app.py` não paralelizam entre si**. Isso é um argumento a favor de antecipar a extração de serviços — mas só depois de W0, nunca antes.

## 4. Formato do handoff

O orquestrador entrega ao especialista exatamente este bloco (é também o formato do relatório de volta, invertido):

```markdown
## HANDOFF → <agente>  ·  onda <Wn>  ·  lote <n>

**Objetivo (1 frase):**
**Itens da auditoria:** <ex.: B-9, C-3c>  → leia docs/audit/<arquivos>
**Write-lock:** <lista exata de caminhos que você pode editar>
**Proibido tocar:** <caminhos>
**Pré-condições verificadas:** <o que o orquestrador já confirmou>
**Critério de aceite (objetivo, verificável):**
  - [ ] ...
**Evidência exigida no relatório:** <comando + saída | diff | medição antes/depois>
**Limite de escopo:** se você encontrar problema fora deste lote, REGISTRE e NÃO corrija.
**Orçamento:** ~<n> arquivos, ~<n> edições. Se estourar, pare e reporte.
```

Resposta do especialista:

```markdown
## RELATÓRIO ← <agente>  ·  onda <Wn>  ·  lote <n>

**Feito:** <lista de mudanças, arquivo:linha>
**Critério de aceite:** <item por item: atendido / não atendido / não verificável aqui>
**Evidência:** <colar saída real; se não pôde executar, dizer explicitamente>
**Não verificado:** <o que só o usuário pode confirmar rodando o stack>
**Achados fora de escopo (não corrigidos):** <lista, com arquivo:linha>
**Riscos introduzidos / mudanças de contrato:** <...>
```

Um relatório sem a seção **Não verificado** preenchida honestamente deve ser rejeitado pelo revisor. "Provavelmente funciona" não é evidência.

## 5. Paralelismo

Pode rodar em paralelo (locks disjuntos):

- A7 (testes) ‖ A1 (infra/CI)
- A5 (frontend) ‖ A3 ou A2 (backend) — **desde que** o contrato da API não mude no mesmo lote
- A8 (governança, escreve só em `docs/`) ‖ qualquer um
- A9 (documentação) ‖ qualquer um
- A13 (escrita, escreve só em `docs/paper/`) ‖ qualquer um
- A12 (Neo4j) ‖ A5 (frontend) ou A1 (infra)

**Nunca em paralelo:**

- Dois agentes em `Backend/src/app.py`.
- A6 (domínio) com qualquer outro no mesmo caminho de cálculo — mudança de resultado precisa de diff isolado, senão não se sabe o que mudou o número.
- A11 (inferência) com A6 no mesmo dataset de referência: se o pipeline e o cálculo mudam juntos, o diff de topologia não é atribuível.
- A12 (Neo4j) com A3 em `neo4j_services.py` — o lock é de A12; A3 atua nos routers e no ciclo de vida.
- Mudança de contrato de API (backend) com consumo desse contrato (frontend) no mesmo lote — sequencie: backend, teste, então frontend.
- Refatoração estrutural com mudança de comportamento. São dois PRs, sempre.

## 6. Escalonamento ao humano — pare e pergunte

O agente **para** e devolve ao usuário quando:

1. A mudança altera um **número científico** já publicado (ver [04-rigor-cientifico](04-rigor-cientifico.md)), ou uma **escolha metodológica** do pipeline de inferência (ver [A11](../agents/11-bioinformatica-inferencia.md)).
2. Há **dado pessoal real** onde não deveria (log, fixture, snapshot, dump) — ver [05-governanca](05-governanca-de-dados-lgpd.md).
3. O gate exige **executar o stack** (Docker/conda/npm) — impossível no ambiente de dev atual.
4. A correção exige decisão de produto (ex.: "o demo público continua aceitando upload anônimo?").
5. Um item da auditoria não se confirma no código atual — a auditoria tem meses; **verificar antes de "corrigir"**.
6. O trabalho exigiria commit/push (política: só com pedido explícito).

## 7. Continuidade entre janelas

Estado durável vive em **três** lugares, e apenas neles:

1. [`../audit/10-progresso-execucao.md`](../audit/10-progresso-execucao.md) — o que foi aplicado no código, por prioridade.
2. [`07-log-de-execucao.md`](07-log-de-execucao.md) — decisões, evidências, handoffs, medições.
3. O próprio código e seus testes.

Nada de estado importante em memória de conversa. Ao encerrar um lote, o orquestrador **primeiro** grava nos dois documentos, **depois** responde ao usuário. Se a sessão morrer no meio, o próximo bootstrap deve conseguir retomar sem perguntas.

## 8. Eficiência (contexto e custo)

- **Não re-auditar.** O diagnóstico existe em `../audit/`. Reabrir análise já feita é o desperdício mais caro deste projeto.
- **Ler por faixa.** `app.py` tem ~83 KB (~21k tokens). Use `Grep` para localizar e leia só a faixa de linhas relevante. Ler o arquivo inteiro sem motivo é erro de processo.
- **Um lote, uma janela.** Handoff fechado → especialista executa → relatório → janela pode morrer.
- **Modelo por tarefa:** orquestração e revisão adversarial em **opus**; escrita de código em **fable**; varreduras mecânicas (renomear, propagar `API_URL` em 12 arquivos) no modelo mais barato que resolva.
- **Um subagente por escopo, não por arquivo.** Cada spawn recomeça frio e reconstrói contexto; agrupe o trabalho correlato.
- **Evidência é barata, retrabalho é caro.** Sempre grave o comando e a saída no log: economiza a próxima janela inteira.
