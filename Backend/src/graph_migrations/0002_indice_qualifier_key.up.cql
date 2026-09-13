// Migração 0002 — índice de propriedade em `Qualifier.key` (M5/Grafo, P-3)
//
// `Qualifier` é o label mais populoso do grafo (2 684 376 nós). A consulta
// predefinida `frequence_geograph` (catálogo em
// Backend/src/graph_queries/catalogo.py) filtra `WHERE q.key = "geo_loc_name"`
// sem nenhum índice de propriedade — só os índices de token (`LOOKUP`) que o
// Neo4j cria sozinho.
//
// PROFILE antes (instância local, dados reais do demo, 2026-09-13):
//   NodeByLabelScan(:Qualifier)  dbHits=2 684 377  rows=2 684 376
//   (soma da árvore de execução inteira: ~7,8 M dbHits)
// PROFILE depois: ver docs/data-model/neo4j.md §2.
//
// Índice de propriedade simples (RANGE, padrão do Neo4j 5+), não composto —
// `Qualifier.value` seria a próxima candidata, mas hoje guarda tipos mistos
// (string e lista, ver `frequence_geograph`) e não há evidência ainda de
// consulta que a filtre isoladamente; não criar por intuição.

CREATE INDEX qualifier_key_idx IF NOT EXISTS
FOR (q:Qualifier) ON (q.key);
