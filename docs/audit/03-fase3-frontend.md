# Fase 3 — Frontend (F-x)

[← Índice](README.md) · Ver também: [06-eixo-bugs.md](06-eixo-bugs.md) · [07-eixo-arquitetura.md](07-eixo-arquitetura.md)

- **F-1 [P0/bug]** `uuid` importado (`UserContext.jsx:2`) mas não declarado no `package.json` (resolve só por hoisting transitivo).
  **Fix:** `crypto.randomUUID()`. (= [C-1](06-eixo-bugs.md)) — ✅ **aplicado no P0**, ver [progresso](10-progresso-execucao.md)

- **F-2 [alto/config]** `http://localhost:8000` hardcoded 19× em 12 arquivos + `ws://localhost:8000` em 3; zero `import.meta.env`.
  **Fix:** `src/config.js` com `import.meta.env.VITE_API_URL`, `.env.development`, proxy no `vite.config.js`.

- **F-3 [alto/seg]** Isolamento multiusuário quebrado: `injectUidFilter` reescreve Cypher por regex no cliente (`GraphVisualization.jsx:344`) + `/api/neo4j/connect` muta o singleton global `neo4j_service` (conexão compartilhada + SSRF).
  **Fix:** single-tenant read-only; remover `injectUidFilter`; proteger/remover `connect`. **Liga com [S-1](04-eixo-seguranca.md) — adiado até autenticação ([S-5](04-eixo-seguranca.md)) existir** (decisão do usuário).

- **F-4 [alto/perf]** `PhylogeneticTreeViewer.getMetadataValue` reconstrói `findAllDataTerminals(metadata)` por nó por render (`:172,385,458,596,651`) → O(nós×terminais). Gate `treeTooLarge>2500 chars` (`:51`) desativa árvore anotada.
  **Fix:** `useMemo` de `Map<newick,metadata>` O(1); elevar/remover gate. (= [P-4](05-eixo-performance.md))

- **F-5 [médio-alto/perf+leak]** D3: `svg.selectAll("*").remove()` + re-layout a cada clique (deps `selectedNode/collapsedNodes` no effect `:528-538`); `svg.call(zoom)` reanexa sem remover → leak de listeners (`:520`).
  **Fix:** separar estrutura (deps `filteredTreeData/layoutType`) de estilo (imperativo); `svg.on(".zoom",null)` antes de reanexar. (= [P-4](05-eixo-performance.md))

- **F-6 [médio/bug+leak]** `NotificationContext` (`:29-46`): avisos sem `showProgress` viram toast E Alert de estado (duplicado); lista nunca limpa (vazamento DOM); `id=Date.now()` colide.
  **Fix:** só empilhar estado quando `showProgress`; `crypto.randomUUID()`. (= [C-4d](06-eixo-bugs.md))

- **F-7 [baixo/bug]** `<ConfigProvider heme={{...}}>` typo → tema ignorado (`App.jsx:79`); `errorElement: NotFoundPage()` invoca em vez de `<NotFoundPage/>` (`main.jsx:33,37`); `<Modal visible=>` depreciado antd v5 (`GraphVisualization.jsx:710`). (= [C-4a/b](06-eixo-bugs.md))

- **F-8 [médio/contrato]** `executeGraphQuery` sem header `X-User-ID` exigido por `/api/neo4j/graph` → 422 (`dataServices.jsx:52-63`); `PatternAnalysisResult` desalinhado com payload real de `pattern-analysis`. (= [C-4c](06-eixo-bugs.md))

- **F-9 [médio/arq+resiliência]** `GeographicDistribution.extractAllSequences()` retorna `[]` fixo (mapa nunca popula, `useGeocoding.jsx:94`); 3 hooks de geocoding duplicados; Nominatim client-side sem rate-limit/User-Agent (viola política OSM); ícones Leaflet de CDN cloudflare (`GeoDispersionMap.jsx:9-11`); `onNodeSelect` inline reconstrói marcadores.
  **Fix:** dicionário local + geocoding server-side com cache; assets Leaflet locais; `useCallback`. Relevante para [M-3 filogeografia funcional](08-aspecto4-melhorias-futuras.md) — hoje é o stub que bloqueia essa feature.

- **F-10 [médio/arq]** Componentes gigantes: `CQLExecutor` 1265, `PhylogeneticTreeViewer` 1111, `MSAViewer` 775, `GraphVisualization` 767, `TreePatternAnalysis` 766. Sem camada de serviço (só `dataServices` parcial); 62 `useEffect` com fetch manual/refetch.
  **Fix:** ver [07-eixo-arquitetura.md § C](07-eixo-arquitetura.md).
