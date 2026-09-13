// Migração 0001 — índices de partição por `uid` (M5/Grafo, item P-3)
//
// Introspecção real (docker compose up -d neo4j, 2026-09-13) mostrou que
// `Tree.uid` e `Subtree.uid` são a CHAVE DE PARTIÇÃO por usuário — todos os
// 10 nós `Tree` e todos os 9524 nós `Subtree` do demo carregam o MESMO valor
// (o uid do único `User` existente). Isso invalida a recomendação anterior
// de `docs/data-model/neo4j.md` §3 ("constraint de unicidade em Tree.uid,
// Subtree.uid") — não é identidade de entidade, é chave estrangeira embutida,
// e uma constraint de unicidade sobre ela é inviável por construção (mais de
// um nó com o mesmo valor é o comportamento correto, não um defeito).
// `Subtree.name` também não serve de identidade hoje: 4762 dos 9524 nós
// (exatamente a metade) chamam-se literalmente "metadata" — lixo do parser
// (G1/G2, já registrado). Dedup de identidade fica para quando o ingest virar
// MERGE; aqui só o que já é seguro e mensurável: índice não-único na chave de
// partição, para a consulta `WHERE n.uid = $user_id` parar de ser
// NodeByLabelScan.
//
// PROFILE antes (instância local, dados reais do demo):
//   MATCH (s:Subtree) WHERE s.uid = $uid RETURN count(s)
//     NodeByLabelScan  dbHits=9525  rows=9524
//   MATCH (t:Tree) WHERE t.uid = $uid RETURN count(t)
//     NodeByLabelScan  dbHits=11    rows=10
// (ver docs/data-model/neo4j.md §2 para o PROFILE depois da migração)
//
// `User.uid` É identidade de entidade de verdade (um User = uma conta) —
// zero risco de violação hoje (1 usuário) e passa a impedir duplicidade de
// conta à medida que a base crescer.

CREATE CONSTRAINT user_uid_unico IF NOT EXISTS
FOR (u:User) REQUIRE u.uid IS UNIQUE;

CREATE INDEX tree_uid_idx IF NOT EXISTS
FOR (t:Tree) ON (t.uid);

CREATE INDEX subtree_uid_idx IF NOT EXISTS
FOR (s:Subtree) ON (s.uid);
