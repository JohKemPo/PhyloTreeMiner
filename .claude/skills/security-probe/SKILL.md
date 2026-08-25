---
name: security-probe
description: Bateria de verificação de segurança do PhyloTreeMiner contra os vetores da auditoria — path traversal, upload malicioso, Cypher arbitrário, CORS, origem de WebSocket, vazamento de erro e ausência de autenticação. Use ao fechar um vetor e ao revisar um lote de segurança.
---

# Bateria de provas de segurança

Provas executadas **contra a instância local do próprio projeto**, para confirmar que um vetor está fechado e que nenhum caminho legítimo quebrou. Não é ferramenta para uso contra sistema de terceiro.

Modelo de ameaça (`S-0`): atacante = visitante web anônimo do demo público; nenhuma rota exige autenticação hoje; `X-User-ID` é auto-declarado.

## Regra de ouro

**Escreva o teste que explora o vetor antes da correção.** Ele deve **falhar**. Um teste que passa desde antes não prova fechamento nenhum.

## 1. Path traversal / contenção de diretório

```bash
B=localhost:8000
code() { curl -s -o /dev/null -w "%{http_code}\n" "$@"; }

code "$B/browse?path=../../etc"                     # esperado 403
code "$B/browse?path=/etc/passwd"                   # esperado 403
code "$B/file?path=../../../../etc/hosts"           # esperado 403
code -X POST "$B/projects/..%2F..%2Fx/run" \
     -H 'Content-Type: application/json' -d '{"configs":{}}'   # esperado 400
```

**O caso que `startswith` não pega** — irmão com prefixo comum:
```bash
mkdir -p projects_x && echo segredo > projects_x/leak.txt
code "$B/file?path=projects_x/leak.txt"             # esperado 403
```
Este é o teste que distingue `resolve_within` (com `os.path.commonpath`) de uma validação ingênua. Cobrir também `rerun_workflow` e `can_rerun_project` — resíduo conhecido, e `rerun_workflow` executa subprocess.

## 2. Upload

```bash
# nome com traversal
curl -s -o /dev/null -w "%{http_code}\n" -F 'files=@ok.fasta;filename=../../evil.fasta' "$B/upload"   # 400
# tipo não permitido
curl -s -o /dev/null -w "%{http_code}\n" -F 'files=@payload.sh' "$B/upload"                            # 400
# tamanho acima do limite
head -c 200M /dev/zero > big.bin
curl -s -o /dev/null -w "%{http_code}\n" -F 'files=@big.bin' "$B/upload"                               # 413
```
Também: ZIP com entrada `../` (*zip slip*) deve ser rejeitada **antes** da extração; e o filtro de extensão não pode conter string vazia (o bug `.endswith((..., ''))` casava qualquer nome).

Depois de cada prova, confirme que **upload legítimo continua funcionando** — controle que bloqueia o uso normal não é aceito.

## 3. Cypher

```bash
# destrutivo em rota de leitura — deve ser recusado
curl -s -X POST "$B/api/neo4j/query" -H 'X-User-ID: t' -H 'Content-Type: application/json' \
  -d '{"query":"MATCH (n) DETACH DELETE n"}'                      # esperado 4xx

# injeção via identificador de usuário (o <<USER_UID>> interpolado como texto)
curl -s -X POST "$B/api/cql/execute" -H "X-User-ID: x' OR '1'='1" -H 'Content-Type: application/json' \
  -d '{"query":"MATCH (n {uid:\"<<USER_UID>>\"}) RETURN n LIMIT 1"}'   # não deve vazar dado de outro uid

# consulta aberta sem LIMIT — não deve consumir memória sem teto
curl -s -X POST "$B/api/neo4j/graph" -H 'X-User-ID: t' -H 'Content-Type: application/json' \
  -d '{"query":"MATCH (n) RETURN n"}'                             # esperado 4xx exigindo LIMIT
```

**Verificação de não-regressão obrigatória:** o ingest em lote (`/api/cql-batch/execute-batch`, que usa `CREATE`/`MERGE` legítimos) precisa continuar funcionando. É o motivo pelo qual `S-1` foi adiado ([DEC-002](../../automation/07-log-de-execucao.md)) e a solução correta é separar credenciais de leitura e escrita.

## 4. SSRF via `/api/neo4j/connect`

```bash
curl -s -X POST "$B/api/neo4j/connect" -H 'Content-Type: application/json' \
  -d '{"uri":"bolt://169.254.169.254:7687","username":"x","password":"y"}'   # esperado 401/403/404
```
Preferência: a rota não existir. Se existir, exige token administrativo e allowlist de host — e reconfigurar o driver global a partir de entrada do cliente permanece sendo um erro de projeto.

## 5. CORS e WebSocket

```bash
curl -s -D- -o /dev/null "$B/projects" -H 'Origin: https://evil.example'
# não deve retornar Access-Control-Allow-Origin: * nem refletir o Origin arbitrário
# e nunca "*" junto de Access-Control-Allow-Credentials: true (combinação inválida)
```
```python
import websockets   # handshake com Origin não permitido deve ser recusado
await websockets.connect("ws://localhost:8000/ws/progress",
                         extra_headers={"Origin": "https://evil.example"})
```
CORS **não** protege WebSocket: a checagem de `Origin` no handshake é obrigatória e separada.

## 6. Vazamento de informação

```bash
curl -s "$B/api/tree/metadata?path=/inexistente" | grep -Ei 'Traceback|/home/|/mnt/|site-packages'  # nada
curl -s "$B/api/neo4j/status"     # não deve expor uri/usuário sem autenticação
```
Cliente recebe mensagem genérica; detalhe vai para o log do servidor. E `404` interno não pode virar `500` (`C-2`).

## 7. Autenticação e rate limit (`S-5`)

```bash
for r in "/upload" "/projects/demo/run" "/api/neo4j/connect" "/api/cql-batch/execute-batch"; do
  echo -n "$r anônimo: "; code -X POST "$B$r"      # esperado 401/403 após S-5
done
for i in $(seq 1 100); do code "$B/api/ncbi/info?term=x"; done | sort | uniq -c   # esperar 429
```

## Relatório

| Vetor | Prova | Esperado | Obtido | Teste automatizado |
|---|---|---|---|---|

Mais: caminhos legítimos verificados (ingest, upload válido, workflow); contratos alterados (`401`/`403`/`503` novos → avisar [A5](../../agents/05-frontend.md)); controles ainda ausentes com prioridade.

## Neste ambiente

`curl` contra o backend não roda aqui (o backend não sobe no Windows deste worktree). O que se faz: escrever o teste `pytest` equivalente com `httpx.AsyncClient` — que é o entregável durável, melhor que `curl` — e montar o script de prova manual para o usuário rodar em WSL, com o status esperado de cada linha.
