# Mapa de dados — o que a ferramenta trata, onde, e por quanto tempo

[← Documentação](../README.md) · Dono: [A8 Dados & Governança](../agents/08-dados-e-governanca.md) · Entregável **M0.7** · 2026-08-19

Pré-requisito de [`05-governanca-de-dados-lgpd.md`](../automation/05-governanca-de-dados-lgpd.md) e do item 4 da definição de sucesso: *"um terceiro consegue ler quais dados a ferramenta trata, com que base legal e por quanto tempo os retém"*.

Este mapa é também o **gate dos snapshots de teste**: nenhum artefato versionado pode conter dado pessoal identificável.

---

## 1. Classificação do que a ferramenta trata

| Classe | O que é | Onde vive | Pessoal? |
|---|---|---|---|
| **Sequências genômicas virais** | Genomas de *Orthopoxvirus* e *Flavivirus* baixados do GenBank | `BioComp_UFF/data/**`, `projects/**/out/outputs/raw_data_sequences.gb` | **Não.** É genoma do **patógeno**, não do hospedeiro humano |
| **Metadados de isolado** | `country`, `collection_date`, `host`, `strain`, `isolate` | idem, e `metadata.json` | **Ver §2** — atenção ao campo `strain` |
| **Árvores e subárvores** | Newick/Nexus derivados | `projects/**/out/Trees`, `out/Subtrees` | Não |
| **Padrões minerados** | Itemsets FPMax, suporte de clado | `out/outputs/all_results_fpmax.csv` | Não |
| **Grafo** | 3,8 M nós (`Metadata`, `Qualifier`, `Feature`, `Subtree`, `Tree`, `Support`, `User`) | Neo4j em `127.0.0.1:7687`, volume `neo4j_data/` | Não, exceto o label `User` (§3) |
| **Identificador de sessão** | `phylo_user_id` — UUID v4 gerado no navegador | `localStorage` do cliente; label `User` no grafo; header `X-User-ID` | **Pseudônimo.** Não identifica pessoa, mas particiona sessões |
| **Uploads do visitante** | FASTA/ZIP enviados pelo demo | `BioComp_UFF/data/<nome>/` | **Desconhecido — é o risco central (§4)** |
| **Logs** | `logs_backend.log`, `output_log.txt`, `workflow.log` | raiz e `out/outputs/` | Ver §5 |

---

## 2. O campo `strain` contém nomes de pessoas

**Achado de M0**, ao varrer os dados do baseline de *Variola*.

O campo `/strain=` dos registros do GenBank usados na replicação de Li *et al.* (2007) contém, em vários casos, o que parecem ser **nomes de pacientes** dos surtos de varíola dos anos 1960-70:

```
Bangladesh 1974 (nur islam)
Bangladesh 1974 (Shahzaman)
Bangladesh 1975 v75-550 Banu
Brazil 1966 (v66-39 Sao Paulo)
```

**Avaliação.**

- São registros **públicos** do GenBank, depositados por instituições de pesquisa, referentes a surtos de **1966-1975**.
- A doença foi **erradicada em 1980**; os indivíduos são, com altíssima probabilidade, falecidos há décadas.
- O dado **não foi coletado pelo projeto** — é reproduzido de uma base pública internacional.
- A LGPD não se aplica a pessoa falecida da mesma forma que a pessoa viva, e o tratamento aqui é para **pesquisa científica** (art. 7º, IV e art. 11, II, "c").

**Postura adotada.**

1. **Não é motivo de bloqueio** para a pesquisa nem para o dataset de referência.
2. **É motivo de menção explícita** na declaração de ética do manuscrito (M6): a ferramenta reproduz metadados de repositório público que podem conter identificadores históricos de pacientes, e não os enriquece, cruza nem republica de forma nova.
3. **Nenhum painel da UI deve exibir o campo `strain` bruto como rótulo de indivíduo.** Hoje ele é usado como *fallback* para país e ano ([D12](../science/02-defeitos-que-alteram-resultado.md#d12)) — o que, além de cientificamente errado, expõe o campo em lugares onde ele não deveria aparecer. A correção de D12 resolve os dois problemas de uma vez.
4. Registrar na base legal: **pesquisa científica sobre dado público de patógeno**, sem tratamento de dado de saúde de pessoa identificada ou identificável viva.

---

## 3. O identificador de sessão `phylo_user_id`

| Aspecto | Situação |
|---|---|
| Geração | `crypto.randomUUID()` no navegador (corrigido em M0 — antes era uma dependência fantasma `uuid`) |
| Finalidade | **Particionar sessões**, não autenticar ([DEC-004](../automation/07-log-de-execucao.md)) |
| Persistência | `localStorage` do visitante, sem expiração |
| No servidor | Label `User` no grafo — **1 nó hoje** |
| Vínculo a pessoa | Nenhum. Sem e-mail, nome, IP persistido ou qualquer atributo |

**Pendência:** não há **TTL nem purga**. Um UUID de `localStorage` sem expiração é rastreamento persistente ainda que anônimo. Definir prazo de retenção é item de M6.

---

## 4. Uploads do visitante — o risco central

O demo aceita upload **anônimo** (DEC-004, decisão de projeto). Consequência: **a ferramenta não sabe o que recebe.**

| Controle | Estado |
|---|---|
| Nome de arquivo sanitizado | ✅ **fechado em M0** — `basename` + regex + `resolve_within` |
| Filtro de conteúdo do ZIP | ✅ **fechado em M0** — o `''` que casava qualquer nome foi removido |
| Nome da pasta validado | ✅ já existia (`^[a-zA-Z0-9_-]+$`) |
| **Limite de tamanho** | ❌ **ausente** — M4 |
| **Rate limiting** | ❌ ausente — M4 |
| **TTL + purga** | ❌ ausente — M4 |
| **Aviso operante antes do upload** | ❌ ausente — é o controle `G6`, central sob DEC-004 |

**Postura declarada (DEC-004):** *dado sensível real não deve ser processado no demo.* Isso hoje é uma frase no README; precisa virar **aviso operante na própria interface de upload**, antes do envio — não depois.

---

## 5. Logs e vazamento de caminho

| Achado | Severidade |
|---|---|
| [D15](../science/02-defeitos-que-alteram-resultado.md#d15) — `GET /api/tree/metadata/{p}` devolve `/home/hilai360/Documents/...`: estrutura de diretórios e **nome de usuário de terceiro** expostos a qualquer cliente | **Média** — divulgação de informação. Rastreado por `xfail(strict=True)` |
| `S-4` — respostas de erro com `detail=str(e)` | ✅ **reduzido em M0**: os 17 blocos que convertiam `HTTPException` em `500` foram corrigidos; a varredura completa de `str(e)` é M4 |
| Logs de execução (`output_log.txt`, 70 KB-492 KB) contêm caminhos absolutos da máquina de origem | Baixa — não são servidos pela API |

---

## 6. Gate dos artefatos versionados

Verificado em M0 sobre os seis golden snapshots de `Backend/tests/golden/snapshots/`:

| Padrão procurado | Resultado |
|---|---|
| e-mail | limpo |
| CPF | limpo |
| telefone | limpo |
| `patient` / `paciente` | limpo |
| caminho absoluto `/home/...` | **1 ocorrência** — no snapshot completo de `metadata` |

**Ação tomada:** o snapshot de `metadata` foi substituído por um **resumo estrutural** (148 bytes em vez de 674 KB), sem caminho, sem conteúdo bruto. Os seis snapshots somam ~17 KB e estão limpos.

**Regra permanente:** todo snapshot novo passa por essa varredura antes de ser versionado. O comando está em `Backend/tests/` e é parte do gate de M0.

---

## 7. O que ainda falta declarar (M6)

- [ ] Base legal e finalidade, por classe de dado (esboçado em §1-§4; falta redação formal)
- [ ] Prazo de retenção do `phylo_user_id` e dos uploads
- [ ] Aviso operante antes do upload (`G6`)
- [ ] *Data availability statement* — quais dados são redistribuídos e sob que termos
- [ ] Licença do projeto e compatibilidade com as dependências, incluindo ferramentas do bioconda
- [ ] Nagoya/SisGen: **não aplicável** até aqui — nenhum material biológico brasileiro foi acessado; os genomas vêm de repositório público internacional. Reavaliar se houver sequenciamento próprio
- [ ] Menção, na declaração de ética, do achado de §2
