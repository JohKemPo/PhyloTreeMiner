# Riscos e rollback

[← Automação](README.md)

## 1. Riscos estruturais (valem para todas as ondas)

| # | Risco | Sinal de alarme | Mitigação |
|---|---|---|---|
| R1 | **Refatorar sem rede de segurança.** `app.py` tem ~2100 linhas e zero teste; qualquer extração pode mudar comportamento sem ninguém notar. | Um lote de W4 sendo proposto sem golden snapshot correspondente | W0 é gate rígido. Revisor reprova refatoração estrutural sem snapshot. |
| R2 | **Corrigir bug científico e invalidar número publicado.** | Δ ≠ 0 no diff de resultado | Protocolo da §3 de [04-rigor-cientifico](04-rigor-cientifico.md); decisão é do usuário |
| R3 | **Agente declara sucesso sem executar.** O ambiente Windows não roda o stack. | Relatório sem seção "Não verificado" | Formato de relatório obrigatório; revisor reprova |
| R4 | **Auditoria desatualizada.** Itens de 2026-07 podem já estar corrigidos ou ter mudado de linha. | "Corrigi" algo que já estava correto | Confirmar o sintoma com `Grep` antes de agir |
| R5 | **Conflito de escrita em `app.py`.** | Dois lotes abertos no mesmo arquivo | Write-lock por onda ([protocolo §3](02-protocolo-de-orquestracao.md)) |
| R6 | **Escopo inflando.** Agente "aproveita" para corrigir o que viu ao lado. | Diff muito maior que o handoff | Registrar achado, não corrigir; orçamento no handoff |
| R7 | **Dado pessoal entrando em fixture/snapshot.** | Snapshot com `host: Homo sapiens` + `isolate` reais de execução | Dataset de referência público; checklist de [governança §6](05-governanca-de-dados-lgpd.md) |
| R8 | **Otimização que muda resultado.** Ex.: trocar dedup O(N²) por hash altera *quais* sequências entram na análise. | Mudança de perf com Δ em contagem de sequências | `B-10` é reclassificado como zona sagrada: dono é [A6](../agents/06-dominio-cientifico.md) |
| R9 | **Perda de continuidade entre janelas.** | Nova sessão repetindo trabalho já feito | Log gravado *antes* de responder ao usuário |
| R10 | **Segurança quebrando o ingest.** Cypher read-only universal impede `CREATE`/`MERGE` do pipeline em lote. | Batch CQL falhando após hardening | Separar credenciais leitura/escrita; teste de ingest no mesmo lote |

## 2. Riscos por onda

- **W0** — CI verde vazia (testes que não asseguram nada). *Controle:* cada golden snapshot precisa falhar se a lógica correspondente for alterada; verificar com mutação deliberada e temporária.
- **W1** — autenticação derrubando o demo público. *Controle:* decidir com o usuário se o demo vira somente-leitura autenticado ou mantém leitura anônima com escrita fechada; documentar em [07-log](07-log-de-execucao.md).
- **W1** — mudança de contrato `200 []` → `503` quebra a UI silenciosamente. *Controle:* frontend no mesmo PR ou imediatamente seguinte; teste de UI para o estado "Neo4j indisponível".
- **W2** — `to_thread` em código que muta estado global (`Entrez.email`, caches) introduz *race*. *Controle:* mapear estado compartilhado antes de mover para thread; caches com acesso protegido.
- **W2** — `psutil interval=None` na primeira chamada retorna `0.0`. *Controle:* aquecer a medição ou documentar o primeiro tick.
- **W3** — `C-5d` unificar tabelas de país/região **muda agregações**. *Controle:* tratar como mudança de resultado, com diff.
- **W4** — extração de serviços mudando ordem de chaves JSON e quebrando snapshot por motivo inócuo. *Controle:* comparar JSON normalizado (chaves ordenadas), não texto bruto.
- **W5** — retry sem *circuit breaker* amplifica sobrecarga no NCBI e pode gerar bloqueio de IP institucional. *Controle:* backoff com jitter + teto de tentativas + respeito ao limite de ~3 req/s.
- **W6** — feature nova sobre base científica não validada. *Controle:* W3 fechado é pré-requisito.
- **W7** — declaração de reprodutibilidade que não se sustenta na prática. *Controle:* um terceiro reproduz do zero, sem ajuda, antes da declaração ser escrita.

## 3. Rollback

Cada lote precisa ser reversível **por construção**:

- **Granularidade.** Um lote = um PR = uma reversão. Nunca misture refatoração e mudança de comportamento (a reversão passa a exigir cirurgia).
- **Estratégia padrão:** `git revert` do merge do PR. Ordem: reverter, confirmar golden snapshots voltando ao estado anterior, registrar no log **por que** foi revertido.
- **Strangler-fig:** ao introduzir uma nova implementação, mantenha a antiga acessível por *feature flag* de ambiente (`USE_NEW_TREE_SERVICE=0`) durante uma onda. Só remova a antiga na onda seguinte, com o snapshot estável.
- **Migração de dados** (esquema Neo4j, layout de diretórios): script de ida **e** de volta, ambos testados em base descartável, antes de rodar em qualquer base real.
- **Infra:** mudança em `docker-compose.yml` é validada em `docker compose config` + subida limpa; a versão anterior fica no histórico e a de rollback é citada no PR.
- **Ponto sem retorno.** Estes exigem confirmação explícita do usuário: reescrever histórico git, apagar volume do Neo4j, apagar diretório de uploads, rotacionar credencial, publicar release/DOI.

## 4. Registro

Todo risco materializado vira entrada em [07-log-de-execucao.md](07-log-de-execucao.md) com: o que aconteceu, como foi detectado, o que foi feito, e qual controle desta lista falhou. Se nenhum controle cobria o caso, **adicione o controle aqui** — é assim que este documento se mantém útil.
