---
name: perf-baseline
description: Protocolo de medição de performance do PhyloTreeMiner (item P-0 da auditoria) — provar bloqueio do event loop, perfilar blocos de CPU, medir render do frontend e consultas Neo4j, e reportar antes/depois. Use antes e depois de qualquer mudança de performance.
---

# Baseline de performance — medir, nunca supor

A regra do projeto: **mudança de performance sem número antes/depois é reprovada**, mesmo quando obviamente correta. Sem medição não se sabe se o gargalo era o que se pensava, nem se o remédio funcionou — e no artigo, escalabilidade é resultado, não impressão.

## 0. Registrar o ambiente (sempre primeiro)

```bash
uname -a; python -V; node -v
nproc; free -h
docker exec <neo4j> neo4j version
```
Número sem ambiente não é comparável. Vai para a tabela de [`../../automation/07-log-de-execucao.md`](../../automation/07-log-de-execucao.md).

## 1. Bloqueio do event loop (a medição mais importante)

Hipótese: chamadas síncronas de NCBI e de bioinformática travam o loop, degradando **todos** os endpoints.

Prova: medir a latência de um endpoint trivial *durante* uma operação pesada.

```bash
# terminal 1 — dispara a carga pesada
curl -s -X POST localhost:8000/api/tree/compare -H 'Content-Type: application/json' -d @payload.json &

# terminal 2 — sonda o endpoint trivial durante a carga
for i in $(seq 1 20); do
  curl -s -o /dev/null -w "%{time_total}\n" localhost:8000/projects
  sleep 0.25
done
```

Interpretação: em repouso `/projects` responde em milissegundos. Se durante a carga sobe para segundos, o loop está bloqueado — e esse é exatamente o número que justifica `asyncio.to_thread`. Depois da correção, a latência da sonda deve permanecer próxima da de repouso.

Endpoints a sondar sob carga: `/api/tree/compare`, `/api/gen_plot`, `/api/tree/pattern-analysis`, download do NCBI, e o tick de `psutil`.

## 2. Perfil de CPU dos blocos quentes

```python
import cProfile, pstats
cProfile.run("exact_quartet_distance(t1, t2)", "prof.out")
pstats.Stats("prof.out").sort_stats("cumulative").print_stats(20)
```

Para tempo pontual, `time.perf_counter()` em script isolado no scratchpad — **não** instrumente o código de produção de forma permanente. Verifique se a complexidade medida corresponde à declarada: `treePlot` documenta "O(1)" num lookup que é O(n), e `exact_quartet_distance` é O(n⁴) com cutoff em n≤25. Meça em 2-3 tamanhos de entrada e confira o formato da curva.

## 3. Neo4j

```cypher
PROFILE MATCH (n:Sequence {uid: $uid}) RETURN n LIMIT 100;
```
Olhe `db hits` e se houve `NodeByLabelScan` (falta índice) ou `AllNodesScan` (falta filtro). Crie índice **depois** de ver o plano, não antes. Consulta aberta sem `LIMIT` pode estourar a memória — meça com `LIMIT` e registre o teto.

## 4. Frontend

- **React DevTools Profiler:** gravar uma interação (clique em nó, troca de layout) e ler o tempo de commit por componente.
- **`performance.mark`/`measure`** em torno do `renderTree` para número reproduzível.
- **Leak de listener:** no console, `getEventListeners(svgEl)` antes e depois de N interações. Contagem crescente = leak (é o item `F-5`, zoom reanexado sem remoção).
- **Índice reconstruído por render** (`F-4`): contar chamadas de `findAllDataTerminals` com um contador temporário; deve cair para 1 por mudança de dado após a memoização.

## 5. Protocolo de comparação

- Mesmo hardware, mesma entrada, mesma versão de dependências.
- **≥3 repetições**; reporte **mediana** e dispersão (min-max ou desvio).
- Descarte a primeira execução (aquecimento de cache/JIT) — e diga que descartou.
- Uma variável por vez. Quatro otimizações num PR = nenhuma conclusão.
- `psutil.cpu_percent(interval=None)` devolve `0.0` na primeira chamada: aqueça ou documente.

## 6. Relatório

| Métrica | Ambiente | Antes (mediana ± disp.) | Depois | Δ | Comando |
|---|---|---|---|---|---|
| latência `/projects` sob `compare` | ... | 3.4 s ± 0.4 | 12 ms ± 3 | −99% | ver §1 |

Regras do relatório: **ganho dentro do ruído deve ser declarado como tal** ("melhorou 4%, dentro da dispersão") — manter uma mudança por fé é pior que revertê-la; golden snapshots precisam estar inalterados (otimização preserva a saída); estado global que passou a ser acessado concorrentemente precisa estar listado.

## Neste ambiente

Nada disso executa no Windows deste worktree (sem o stack). O que se faz aqui: escrever o script de medição, montar os comandos, definir o payload de carga. A execução é do usuário em WSL — entregue os comandos prontos e diga qual resultado confirmaria ou refutaria a hipótese.
