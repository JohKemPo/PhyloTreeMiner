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

1. **Constraints de unicidade** — pré-requisito de tudo o mais; sem elas o `MERGE` não tem em que se apoiar.
2. **Índices de propriedade justificados por `PROFILE`** — medir antes e depois, não adivinhar.
3. **Ingest transacional por lote com `MERGE`** — é o que estanca a duplicação.
4. **Separação de credenciais** + `$user_id` parametrizado (M4).
5. **Decidir o destino do label `Support`** antes de M3.1.
6. **Esquema versionado** com migrações idempotentes e o inverso de cada uma (M5).

> Nenhum destes itens bloqueia M1, M2 ou M3. O grafo é a trilha paralela mais folgada do projeto.
