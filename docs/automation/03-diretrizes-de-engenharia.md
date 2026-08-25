# Diretrizes de engenharia

[← Automação](README.md)

Padrões obrigatórios para qualquer agente que escreva código neste repositório. Complementa (não substitui) [`../audit/09-regras-refatoracao.md`](../audit/09-regras-refatoracao.md).

## 1. Precondições de toda mudança

1. **Confirme que o problema ainda existe.** A auditoria é de 2026-07 e itens já foram corrigidos. `Grep` o sintoma antes de aplicar o remédio. Corrigir algo já corrigido é o modo mais comum de introduzir regressão.
2. **Leia o item da auditoria correspondente** — diagnóstico, trade-offs e riscos já estão escritos.
3. **Verifique se existe teste cobrindo o comportamento.** Se não existe e a mudança é estrutural, o teste vem primeiro (regra de golden test).

## 2. Backend (Python / FastAPI)

- **Erro:** `except HTTPException: raise` **antes** de qualquer `except Exception`. Nunca `detail=str(e)` numa resposta — mensagem genérica para o cliente, detalhe no log. (`C-2`, `S-4`)
- **Logging:** `logging` com logger por módulo. `print()` não é logging; os ~28 `print` existentes saem junto com o `logging_conf.py` de Arq-B.
- **Assincronia:** função `async def` **não** executa trabalho bloqueante. I/O de rede de terceiros e CPU média vão para `await asyncio.to_thread(...)`. `ProcessPoolExecutor` só com medição que justifique.
- **Configuração:** nada de URL, credencial, e-mail ou path hardcoded. Env var com default seguro (nunca default permissivo — `CORS_ORIGINS` sem valor não vira `*`).
- **Path:** todo caminho derivado de entrada do usuário passa por `resolve_within(base, *parts)`. `startswith()` não valida contenção de diretório (`projects_x` casa o prefixo de `projects`).
- **Cypher:** identificador de usuário e qualquer valor vão como **parâmetro** (`$user_id`), nunca por interpolação de texto. Sessão de leitura usa `READ_ACCESS`; escrita só em caminho autenticado com credencial própria.
- **Cache:** nenhum dicionário global sem teto. LRU com limite, ou chave com TTL, e invalidação explícita (por `mtime` ou hash do insumo).
- **Estado global:** o singleton `neo4j_service` é dívida conhecida; código novo recebe dependência via `Depends`.
- **Tipos:** modelos Pydantic devem corresponder ao payload real. Modelo declarado e não usado (`PatternAnalysisResult`) é pior que ausência de modelo — mente para quem lê.

## 3. Frontend (React)

- **Sem URL hardcoded.** Tudo por `src/config.js` → `import.meta.env.VITE_API_URL`. Critério objetivo: `grep -rl "localhost:8000" Frontend/src` deve retornar vazio ao fim de W4.
- **Fetch:** cliente único em `services/http.js`; headers obrigatórios (ex.: `X-User-ID`) centralizados, não repetidos por chamada.
- **Cálculo derivado:** `useMemo`. Índice reconstruído por render é bug de performance, não detalhe. Estruturas de busca são `Map`/objeto, não `Array.find` em laço.
- **D3:** separar **estrutura** (efeito com deps de dados/layout) de **estilo/seleção** (imperativo, sem re-layout). Antes de reanexar comportamento: `svg.on(".zoom", null)`. `selectAll("*").remove()` a cada clique é re-render total disfarçado.
- **Efeitos:** todo `useEffect` que assina algo retorna cleanup. Chave de lista nunca é `Date.now()` — use `crypto.randomUUID()`.
- **Dependência:** nada de import sem entrada em `package.json` (o caso `uuid` resolvia só por *hoisting* transitivo — quebra no primeiro `npm ci` limpo).
- **Assets:** sem CDN externo em runtime (ícones Leaflet inclusive) — reprodutibilidade e privacidade.
- **Segurança no cliente não é segurança.** Filtro/isolamento aplicado no navegador é UX; a garantia mora no servidor.

## 4. Testes

Pirâmide pragmática para este projeto:

| Camada | Ferramenta | O que cobre | Prioridade |
|---|---|---|---|
| Unidade — núcleo científico | `pytest` | quartet/RF, extração de metadados, `parse_cql_blocks`, dedup, tabelas país/região | **Máxima** — é o que sustenta o artigo |
| Contrato — endpoints | `pytest` + `httpx.AsyncClient` | status codes, forma do payload, rejeição de traversal/upload malicioso, `503` quando Neo4j cai | Alta |
| Golden / caracterização | `pytest` + snapshot em `Backend/tests/golden/` | saída atual de `compare`, `pattern-analysis`, `gen_plot`, `metadata`, `paginated` | Alta — pré-requisito de refatoração |
| Unidade — utilitários do front | `vitest` | parser Newick, índice de metadados, dicionário de países | Média |
| E2E | manual pelo usuário (WSL) | fluxo completo | Baixa (automatizar depois de W4) |

Regras:
- Teste é **determinístico**: sem rede, sem relógio, sem ordem de dicionário como oráculo. NCBI e Neo4j são *fakes*/fixtures.
- **Snapshot nunca contém dado pessoal.** Use o dataset de referência sintético/público. Ver [05-governanca](05-governanca-de-dados-lgpd.md).
- **Golden test caracteriza, não abençoa.** Se o snapshot registra um comportamento errado, o comentário do teste diz isso: `# caracteriza o bug C-5a; atualizar quando corrigido em W3`.
- Toda correção de bug entra com um teste que **falha antes** da correção. Sem esse teste, o revisor reprova.

## 5. Commits e PRs

- **Nunca commitar sem pedido explícito do usuário.** Vale também para `git add`.
- Um PR = uma onda ou um lote coeso. Refatoração e mudança de comportamento **nunca** no mesmo PR.
- Mensagem no padrão do repositório (`Fix | ...`, `Feat | ...`, `Doc | ...`).
- Corpo do PR obrigatoriamente com:
  ```
  Itens da auditoria: <B-9, C-3c>
  O que muda de contrato: <ou "nada">
  Evidência: <comando + saída, ou medição antes/depois>
  Não verificado: <o que exige o stack rodando>
  Risco / rollback: <como reverter>
  ```
- Nunca `--no-verify`. Se um hook falha, o hook está falando com você.

## 6. Definition of Done (geral)

Um lote está pronto quando:

1. O critério de aceite do handoff está item por item atendido — ou marcado como não verificável **com a razão**.
2. Existe teste automatizado para o comportamento novo/corrigido.
3. Nenhum golden snapshot mudou sem justificativa escrita.
4. Nada de segredo, path absoluto de máquina, ou dado pessoal entrou em arquivo versionado.
5. [`../audit/10-progresso-execucao.md`](../audit/10-progresso-execucao.md) e [`07-log-de-execucao.md`](07-log-de-execucao.md) atualizados.
6. Achados fora de escopo registrados, não corrigidos silenciosamente.
7. Mudanças de contrato de API sinalizadas explicitamente para o dono do frontend.

## 7. Nunca faça

- Ampliar o escopo do lote "porque estava ali do lado". Registre; não corrija.
- Afirmar que algo funciona sem ter executado. Diga "não verificado neste ambiente".
- Apagar teste/asserção que ficou vermelho para "destravar".
- `rm -rf` em `node_modules`/lockfile (o `application_ui.sh` faz isso hoje — é bug, não padrão a imitar). Use `npm ci`.
- Reescrever código do submódulo `BioComp_UFF` a partir deste repositório.
- Introduzir dependência nova sem: justificar, pinar versão e checar licença.
- Otimizar sem medir, ou declarar complexidade no comentário sem prová-la (`treePlot.py` documenta "O(1)" num lookup O(n) — exatamente o que não fazer).
- Deixar `TODO` sem item correspondente na auditoria ou no log.
