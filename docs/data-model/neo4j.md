# Modelo de dados do grafo — o que existe de fato

[← Documentação](../README.md) · Dono: [A12 Neo4j & Grafo](../agents/12-neo4j-grafo.md) · Entregável **M0.9** · Introspecção de 2026-08-19

Levantado por execução, não por leitura de código:

```bash
cd Backend && python scripts/neo4j_introspect.py          # tabela
cd Backend && python scripts/neo4j_introspect.py --json    # docs/data-model/neo4j-introspeccao.json
```

Instância: `phylotree_neo4j`, imagem `neo4j:2026.01.3`, volume `neo4j_data/` (2,4 GB).

---

## 1. O esquema efetivo

**3 799 898 nós · 3 811 293 relacionamentos.**

| Label | Nós | Propriedades |
|---|---:|---|
| `Qualifier` | 2 684 376 | `key`, `value` |
| `Feature` | 952 948 | `location`, `strand`, `type` |
| `Metadata` | 153 030 | `date`, `description`, `molecule_type`, `newick_id`, `organism`, `source`, `taxonomy`, `terminal_hash`, `topology` |
| `Subtree` | 9 524 | `name`, `uid` |
| `Tree` | 10 | `name`, `uid` |
| `Support` | 9 | `value` |
| `User` | 1 | `uid` |

| Relacionamento | Instâncias |
|---|---:|
| `HAS_QUALIFIER` | 2 684 376 |
| `HAS_FEATURE` | 952 948 |
| `HAS_METADATA` | 153 030 |
| `HAS_SUPPORT` | 11 405 |
| `HAS_SUBTREE` | 9 524 |
| `OWNS` | 10 |

```
(User)-[:OWNS]->(Tree)-[:HAS_SUBTREE]->(Subtree)-[:HAS_METADATA]->(Metadata)
                                                       |
                                    ┌──────────────────┴──────────────────┐
                              [:HAS_FEATURE]                        [:HAS_SUPPORT]
                                    ↓                                     ↓
                               (Feature)-[:HAS_QUALIFIER]->(Qualifier)  (Support)
```

---

## 2. Constraints e índices

| | Quantidade |
|---|---|
| **Constraints** | **0** |
| Índices | **2**, ambos `LOOKUP` — são os índices de token que o Neo4j cria sozinho |
| Índices de propriedade | **0** |

> **Nenhuma consulta que filtre por `uid`, `name`, `terminal_hash` ou `q.key` tem índice.** Toda consulta desse tipo é varredura completa do label. Com 2,7 M nós `Qualifier`, isso é o item `P-3` da auditoria, agora com número.

**Nenhuma constraint de unicidade** significa que nada impede o mesmo nó ser inserido duas vezes — o que é exatamente o que aconteceu (§3).

---

## 3. Duplicação massiva

O grafo tem 3,8 M nós para um conteúdo que, deduplicado, é ordens de grandeza menor.

- **`Metadata`: 153 030 nós.** Um nó de metadado por *ocorrência de terminal em subárvore*, não por acesso do GenBank. O mesmo registro é reinserido a cada subárvore em que o táxon aparece.
- **`Qualifier`: 2,68 M nós** de pares `key`/`value` — a maioria repetições literais dos mesmos pares (`molecule_type`/`DNA`, `mol_type`/`genomic DNA`).
- **`Feature`: 953 mil**, mesma lógica.

Confirma `G1`/`G2` de [`../science/05-grafo-neo4j.md`](../science/05-grafo-neo4j.md).

**Causa:** o ingest emite `CREATE` sem `MERGE` e sem chave de identidade estável. A correção é de duas partes, e a segunda depende da primeira:

1. **Constraint de unicidade** em cada entidade que tem identidade natural — `Metadata.accession`, `Qualifier(key,value)`, `Tree.uid`, `Subtree.uid`.
2. **`MERGE` em vez de `CREATE`** no ingest, apoiado nessas constraints.

---

## 4. O que o grafo contém — e o que não contém

**Contém apenas Zika.** Os 10 nós `Tree` são de projetos de Zika. A página *Deep Analysis* de *Variola* lê CSV e JSON do disco (`app.py:1576`), **não o grafo**.

Consequência para o planejamento: o grafo **não está no caminho crítico** de M1→M3. Ele é infraestrutura para a escala futura, não para o resultado do artigo. Isso rebaixa a prioridade de T5 em relação ao que o roadmap original sugeria.

---

## 5. `Support` guarda a coisa errada

Há 9 nós `Support` e 11 405 relacionamentos `HAS_SUPPORT`. A propriedade `value` guarda o **limiar da varredura do FPMax** (os valores 0,1 … 0,9 de [D4](../science/02-defeitos-que-alteram-resultado.md#d4)), não suporte de ramo.

O nome está tomado pela coisa errada. Quando [D10](../science/02-defeitos-que-alteram-resultado.md#d10) propagar o UFBoot ao grafo (marco M3), será preciso ou renomear este label, ou dar ao suporte de ramo um label próprio. **Decidir antes de M3.1**, não durante.

---

## 6. Postura de segurança

| Item | Estado |
|---|---|
| Bind das portas | ✅ **fechado em M0** — `127.0.0.1:7474` e `127.0.0.1:7687` |
| Senha obrigatória | ✅ **fechado em M0** — `${NEO4J_PASSWORD:?}` no compose |
| APOC irrestrito | ✅ **removido em M0** — `apoc.*` não é usado por nenhuma consulta do projeto; `procedures_unrestricted` + import/export de arquivo davam leitura e escrita no host a quem alcançasse o Cypher |
| Credencial de leitura separada | ❌ M4 — sessão `READ_ACCESS` com usuário somente-leitura |
| `$user_id` parametrizado | ❌ M4 — fecha `S-1` **sem login** |
| `LIMIT` obrigatório no servidor | ❌ M4 |

---

## 7. Fila de trabalho de T5, em ordem

1. **Constraints de unicidade** — pré-requisito de tudo o mais; sem elas o `MERGE` não tem em que se apoiar. **Correção de 2026-09-13, ver §8:** a formulação original deste item ("constraint de unicidade em `Tree.uid`, `Subtree.uid`") estava errada — introspecção contra dados reais mostrou que `uid` nessas duas labels é chave de **partição** (todos os nós de um usuário carregam o mesmo valor), não identidade de entidade. Uma constraint de unicidade ali é inviável por construção. Fica como item futuro achar/criar a chave de identidade real (`Tree.name` já serve; `Subtree.name` não — G1/G2).
2. **Índices de propriedade justificados por `PROFILE`** — medir antes e depois, não adivinhar. **Feito parcialmente em 2026-09-13**, ver §8 (migração `0001` e `0002`).
3. **Ingest transacional por lote com `MERGE`** — é o que estanca a duplicação. Ainda aberto.
4. **Separação de credenciais** + `$user_id` parametrizado (M4). Ainda aberto (M4.13/M4.14, ver ledger DEC-061).
5. **Decidir o destino do label `Support`** antes de M3.1. Ainda aberto.
6. **Esquema versionado** com migrações idempotentes e o inverso de cada uma (M5). **Feito em 2026-09-13**, ver §8.

> Nenhum destes itens bloqueia M1, M2 ou M3. O grafo é a trilha paralela mais folgada do projeto.

---

## 8. Esquema versionado (M5/Grafo, 2026-09-13)

Mecanismo leve, sem framework: `Backend/src/graph_migrations/NNNN_slug.up.cql` +
`NNNN_slug.down.cql`, cada um idempotente (`IF NOT EXISTS` / `IF EXISTS`).
O que já foi aplicado é rastreado **no próprio banco**, como nó
`(:SchemaMigration {id, applied_at})` — não em arquivo local, porque o
esquema pertence ao banco e precisa sobreviver a reconectar em outra máquina.

Runner: `Backend/scripts/graph_migrate.py {status|up|down}`.

```bash
python scripts/graph_migrate.py status
python scripts/graph_migrate.py up
python scripts/graph_migrate.py down --target 0002_indice_qualifier_key
```

### 8.1 Migração 0001 — índices de partição por `uid`

Introspecção real (não a suposição de §7 item 1) mostrou:

```
Tree.uid    -> 1 valor distinto para 10 nós   (chave de partição do usuário)
Subtree.uid -> 1 valor distinto para 9524 nós (idem)
Tree.uid nulo: 0 · Subtree.uid nulo: 0
```

Ou seja: `uid` em `Tree`/`Subtree` não é identidade de entidade, é a chave
estrangeira do dono copiada em cada nó — a recomendação anterior deste
documento (§3, "constraint de unicidade em Tree.uid, Subtree.uid") estava
errada e foi escrita sem checar os valores reais. Correção: **índice
não-único** nas duas labels — o que P-3 realmente pede ("índices em `uid`") —
e uma constraint de unicidade só onde há identidade de entidade de verdade:
`User.uid` (um usuário = um uid; hoje 1 nó, zero risco de violação).

```cypher
CREATE CONSTRAINT user_uid_unico IF NOT EXISTS FOR (u:User) REQUIRE u.uid IS UNIQUE;
CREATE INDEX tree_uid_idx IF NOT EXISTS FOR (t:Tree) ON (t.uid);
CREATE INDEX subtree_uid_idx IF NOT EXISTS FOR (s:Subtree) ON (s.uid);
```

`PROFILE MATCH (s:Subtree) WHERE s.uid = $uid RETURN count(s)`:

| | operador inicial | `db hits` |
|---|---|---:|
| antes | `NodeByLabelScan` + `Filter` | 9 525 + 9 524 = 19 049 |
| depois | `NodeIndexSeek` | 9 525 |

`PROFILE MATCH (t:Tree) WHERE t.uid = $uid RETURN count(t)`: `NodeByLabelScan`+`Filter` (11+10=21 db hits) → `NodeIndexSeek` (11 db hits). No demo (1 usuário só) o ganho absoluto é modesto — a query some com o `Filter` porque o índice já resolve a igualdade — mas a mudança estrutural é o que importa: com múltiplos usuários, `NodeByLabelScan` cresceria com o total de árvores/subárvores de *todo mundo*; `NodeIndexSeek` cresce só com o do usuário filtrado.

Compatibilidade com o ingest verificada (ver §8.3): `MERGE (u:User {uid: ...})` em `BioComp_UFF/workflow/utils/neo4jProcessing.py:47` continua funcionando sob a constraint nova porque é `MERGE`, não `CREATE`; `Tree`/`Subtree` usam `CREATE` mas os índices ali são não-únicos, então nunca rejeitam escrita.

**Inverso testado:** `down --target 0001_indices_particao_uid` remove os 2 índices e a constraint; `up` de novo os recria. Confirmado nesta sessão (evidência em `docs/automation/07-log-de-execucao.md`, entrada desta tarefa).

### 8.2 Migração 0002 — índice de propriedade em `Qualifier.key`

`Qualifier` é a label mais populosa (2 684 376 nós). A consulta `frequence_geograph`
do catálogo (§9) filtra `WHERE q.key = "geo_loc_name"`.

```cypher
CREATE INDEX qualifier_key_idx IF NOT EXISTS FOR (q:Qualifier) ON (q.key);
```

`PROFILE` da consulta completa (instância local, dados reais do demo):

| | operador inicial | `db hits` no nó raiz | `db hits` na árvore inteira |
|---|---|---:|---:|
| antes | `NodeByLabelScan(:Qualifier)` | 2 684 377 | ≈ 7,8 M |
| depois | `NodeIndexSeek(:Qualifier(key))` | 153 031 | ≈ 2,3 M |

A consulta deixou de varrer os 2,68 M nós `Qualifier` inteiros antes de
descartar os que não são `geo_loc_name`; o que sobra de custo (as duas
etapas de `Expand(All)` para `Feature`→`Metadata`) é inerente ao padrão de
travessia, não a este índice.

**Inverso testado:** `down --target 0002_indice_qualifier_key` remove o índice;
`PROFILE` volta a mostrar `NodeByLabelScan` com os mesmos 2 684 377 `db hits`
de antes — confirmado nesta sessão. `up` de novo o recria.

### 8.3 Prova de idempotência

```
$ python scripts/graph_migrate.py up      # 1ª vez
aplicando 0001_indices_particao_uid (3 statement(s))...
aplicando 0002_indice_qualifier_key (1 statement(s))...

$ python scripts/graph_migrate.py up      # 2ª vez
nada a aplicar — todas as migrações locais já estão registradas no banco
```

`SHOW CONSTRAINTS`/`SHOW INDEXES` antes e depois da 2ª execução: **2
constraints, 7 índices** nos dois momentos — nenhuma duplicata. Testado
ainda um caso mais forte: apagando os nós `(:SchemaMigration)` (simulando
perda do rastreamento) e rodando `up` de novo, os `CREATE CONSTRAINT
IF NOT EXISTS`/`CREATE INDEX IF NOT EXISTS` rodaram contra objetos já
existentes sem erro e sem duplicar — a contagem continuou 2/7. A
idempotência não depende só do rastreamento; o próprio CQL de cada migração
já é seguro para rodar duas vezes.

### 8.4 Não incluído nesta rodada

- **Constraints de unicidade em `Metadata`/`Qualifier`/`Subtree`** — a
  duplicação de conteúdo (§3) e a falta de identidade estável em `Subtree`
  (metade dos nós chama-se `"metadata"`) tornam qualquer constraint ali
  fadada a falhar contra o dado real hoje. Pré-requisito: consertar o ingest
  para `MERGE` com chave de identidade (fila item 3, ainda aberta).
- **Índice em `Qualifier.value`** — tipo misto (string/lista) e nenhuma
  consulta hoje o filtra isoladamente; não há evidência para justificá-lo.
- **Migrações de segurança** (M4.13-M4.20: `$user_id` parametrizado,
  credenciais separadas, allowlist de procedures, `LIMIT` obrigatório) —
  milestone diferente, deliberadamente fora do escopo deste lote.

---

## 9. Catálogo de consultas predefinidas

Fonte: `Backend/src/graph_queries/catalogo.py`. Consumido por
`GET /api/neo4j/predefined-queries` (`neo4j_router.py`), que devolve o
subconjunto `name`/`description`/`type`/`query` para o seletor da página de
exploração do grafo no frontend (`GraphVisualization.jsx`). O módulo também
guarda, por consulta, `parametros`, `plano_esperado` (medido com `PROFILE`) e
`teto_resultado` — não expostos na API, para quem for auditar ou reperfilar.

| Chave | Tipo | Teto | Plano medido |
|---|---|---:|---|
| `all_trees` | grafo | 25 | `NodeByLabelScan(:Tree)` + `Limit` — 11 db hits |
| `all_subtrees` | grafo | 25 | `NodeByLabelScan(:Subtree)` + `Limit` — 26 db hits (o `LIMIT` evita varrer os 9524) |
| `full_graph_pattern` | grafo | 5 | `NodeByLabelScan(:Tree)` + 4× `Expand(All)`/`Filter` + `Limit` — 135 db hits |
| `frequence_geograph` | tabela | — (agregação total, não listagem) | `NodeIndexSeek(:Qualifier(key))` depois da migração `0002` — ver §8.2 |

Nenhuma das quatro é nova — todas já existiam, inline, no roteador; este
lote só as centralizou e documentou o plano de execução real de cada uma.
