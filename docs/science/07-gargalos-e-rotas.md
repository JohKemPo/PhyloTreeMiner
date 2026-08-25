# Gargalos e rotas de execução

[← Ciência](README.md) · **Documento vivo.** Criado em 2026-08-25.

O que cada método custa, onde ele quebra, por onde a execução passa, e o que
acontece quando não dá. Existe porque três defeitos do projeto — [D1](02-defeitos-que-alteram-resultado.md#d1),
[D17](02-defeitos-que-alteram-resultado.md#d17) e [D18](02-defeitos-que-alteram-resultado.md#d18) —
têm a mesma raiz: **o pipeline decidia sozinho o que não conseguia fazer, e não contava a ninguém.**

> **Regra de leitura.** Número medido vem com a máquina e a data. Onde não há
> medição, está escrito *não medido* — nunca um palpite. Limite estimado é
> superstição com aparência de engenharia, e este projeto já carregou por anos
> um limite de 20 kb que ninguém sabia de onde vinha.

---

## 1. Custo medido

**Máquina:** i5-11400H, 6 núcleos físicos / 12 lógicos, 31 GB · **Data:** 2026-08-25
**Conjunto:** Zika-21 — 20 sequências × ~10,8 kb (o conjunto de validação)

### 1.1 Alinhadores

| Alinhador | Versão | Tempo | Colunas produzidas |
|---|---|---:|---:|
| **MAFFT** | 7.490 | **4,9 s** | 10 792 |
| MUSCLE | 3.8.1551 | 34,5 s | 10 791 |
| Clustal Omega | 1.2.4 | 64,0 s | 10 791 |

MAFFT é **7× mais rápido que o MUSCLE e 13× que o Clustal Omega**, produzindo
alinhamento do mesmo comprimento. Num conjunto pequeno, onde os três são
viáveis, a escolha é de método — não de custo. A diferença passa a decidir
quando o conjunto cresce, e é aí que o limite importa.

### 1.2 Métodos de inferência

| Método | Tempo por árvore | Observação |
|---|---:|---|
| distância (NJ, UPGMA) | 0-6 s | Biopython, sobre a matriz de distâncias |
| **IQ-TREE** | 4-5 s | inclui **1000 réplicas de UFBoot** |
| **FastTree** | 4-5 s | |
| **RAxML-NG** | 6-7 s | 10 árvores iniciais aleatórias |
| **parcimônia** | **116-169 s** | `ParsimonyTreeConstructor` do Biopython, Python puro |

**A parcimônia é ~25× mais lenta que qualquer método de máxima verossimilhança**
e consome 9 dos 11 minutos de uma execução completa. E o **RAxML — o suposto
vilão — é o terceiro mais rápido**: ele estava excluído de todos os experimentos
de *Variola* por um `SIGSEGV` do `--threads auto` (D17), não por custo.

---

## 2. Limites conhecidos, e o que os sustenta

| Ferramenta | Limite declarado | Origem do número |
|---|---|---|
| Clustal Omega | **20 kb por sequência** | Falha **observada**: `return code 137` (OOM killer) no conjunto Zika479. O valor de 20 kb é herdado do código original e é **conservador** — o limite real não foi medido |
| MUSCLE 3.8 | **1 000 sequências** | Conservador, **não medido**. O refinamento iterativo da 3.8 cresce rápido no número de sequências; o MUSCLE 5 troca o algoritmo |
| MAFFT | **nenhum** | Sem falha observada neste projeto. Alinhou genomas de 250 kb de *Variola*. **Não medido** onde quebra |
| RAxML-NG | **nenhum de memória** | O alinhamento de 52 táxons × 259 496 sítios comprime para **3 713 padrões**: dezenas de MB. O que quebrava era a autoconfiguração de threads, não o tamanho |
| IQ-TREE | **nenhum** | Sem falha observada |
| MrBayes | **desconhecido** | Nunca executado neste projeto — ver [D20](02-defeitos-que-alteram-resultado.md#d20) |
| parcimônia | **prático, não técnico** | Não estoura; demora. O limite é de paciência, e depende do que se aceita esperar |

### A dimensão que pesa não é a que parece

| Conjunto | Táxons | Colunas | Células | RAxML |
|---|---:|---:|---:|---|
| ZIKV-480 | **478** | 10 816 | 5,2 M | **rodou** |
| VARV-52 | 52 | 259 496 | 13,5 M | SIGSEGV (autoconfiguração) |
| VARV-121 | 121 | 283 874 | 34,3 M | excluído por precaução |

**478 táxons de Zika rodam; 52 de *Variola* quebravam.** O que pesa no alinhamento
é o **comprimento das sequências**, não o número de folhas. Na inferência, nem
isso: a compressão de padrões torna 259 mil sítios baratos quando 70% deles são
invariantes.

---

## 3. Rotas de execução

### 3.1 Do experimento à árvore

```
config do projeto
  └─ mode: "auto"      → {nj, upgma} × {distance, parsimony}          ← NÃO chama métodos avançados (D18)
     mode: "advanced"  → o acima + {FastTree, IQ-TREE, RAxML, MrBayes}
        └─ para cada alinhador × método:
             _resolver_alinhador()   ← decide e DECLARA
             _alinhar()              ← executa
             construtor da árvore    ← IQ-TREE / RAxML / FastTree / MrBayes / distância
```

⚠️ **`mode: "auto"` é o modo básico**, apesar do nome. Ele encerra com
`Completed successfully!` tendo produzido metade dos pipelines. É [D18](02-defeitos-que-alteram-resultado.md#d18),
e o número de pipelines `M` é o denominador de todo suporte metodológico.

### 3.2 Quando o alinhador não serve

Antes de 2026-08-25, a rota era esta:

```
clustalo pedido → sequência > 20 kb? → troca para MAFFT
                                     → grava em dataset_final_clustalo.aln
```

O arquivo continuava chamando-se `clustalo` e contendo MAFFT. Nos experimentos
de *Variola*, **metade dos "pipelines" são cópias byte a byte** e o fator
alinhador não existe. É [D1](02-defeitos-que-alteram-resultado.md#d1), o defeito
mais caro do projeto — e note que **a substituição não era o problema; o nome era.**

A rota atual:

```
alinhador pedido → viability(n, L) → viável?  → executa
                                   → inviável → ERRO com o motivo             (padrão)
                                              → se autorizado: substitui E
                                                DEVOLVE O NOME DO QUE RODOU
```

### 3.3 A política, e por que ela é esta

Três saídas eram possíveis. A escolhida é a terceira:

| Saída | Por que não | |
|---|---|---|
| **Substituir em silêncio** | É D1. Produz artefato que mente sobre a própria proveniência, e ninguém descobre até auditar | ✗ |
| **Bloquear a escolha na UI** | Remove agência de quem sabe o que está fazendo. E os limites são conservadores — o de 20 kb nunca foi medido, o de 1 000 sequências é palpite. Bloquear com base num número não medido é pior que avisar | ✗ |
| **Avisar e deixar escolher** | O inviável aparece esmaecido, com o motivo ao lado, e continua selecionável. Se falhar, o motivo fica no manifesto | ✓ |

Implementação: `GET /api/aligners` e `GET /api/aligners/viability?path=…`
alimentam o seletor. **O registro de limites vive num lugar só**
(`workflow/alignment/aligners.py`) e o backend o importa em vez de duplicá-lo —
duas tabelas de limites divergindo seria [D5](02-defeitos-que-alteram-resultado.md#d5)
em outro assunto.

### 3.4 Quando o método de inferência não serve

Ainda **não há política**. Hoje:

| Situação | O que acontece |
|---|---|
| método no `ignore_mode` | pulado, e o log diz |
| método falha em execução | exceção sobe, o workflow para |
| método não instalado | falha ao invocar o binário |
| **método excluído porque quebrou antes** | **indistinguível de "excluído de propósito"** |

A última linha é o buraco: `ignore_mode` mistura decisão com cicatriz. Foi assim
que o RAxML sumiu dos experimentos de *Variola* e ninguém soube que a causa era
um `SIGSEGV` de autoconfiguração. É o lote **M7.6**.

---

## 4. O que falta medir

Tudo aqui exige a máquina de validação. É o marco [M7.7](../automation/10-marcos-e-metas.md).

| Pergunta | Como responder |
|---|---|
| Onde o Clustal Omega **realmente** estoura? | Subir o comprimento por sequência até o OOM, com memória monitorada. O limite de 20 kb pode estar ordens de grandeza abaixo do real |
| Onde o MUSCLE 3.8 deixa de terminar? | Subir o número de sequências com `-maxiters` fixo e cronometrar |
| MAFFT tem limite? | Nenhuma falha observada; medir onde as três estratégias trocam e o que cada uma custa |
| Parcimônia é viável em que escala? | Curva de tempo por `n` e `L`. Ou se troca por implementação em C, ou se declara o limite — **com número** |
| MrBayes converge em que tempo? | Nunca executado. Começar por VARV-6 e ler o ASDSF ([D20](02-defeitos-que-alteram-resultado.md#d20)) |
| `pattern-analysis` congela a API por quanto? | Medido 6,4× de degradação com 28,6 MB; o maior conjunto tem 3,2 GB. **Extrapolação declarada, nunca medida** |

**Protocolo obrigatório:** ≥3 repetições, mediana e dispersão, ambiente
reportado, antes/depois na mesma máquina. Medição sem ambiente declarado não
entra no ledger.

---

## Ver também

- [`02-defeitos-que-alteram-resultado.md`](02-defeitos-que-alteram-resultado.md) — D1, D17, D18, D20
- [`../automation/11-handoff-maquina-de-validacao.md`](../automation/11-handoff-maquina-de-validacao.md) — o que rodar na máquina grande
- [`../skills/validar-workflow/SKILL.md`](../skills/validar-workflow/SKILL.md) — o procedimento de validação
