# Arq-D — avaliação de reestruturação dos controladores de `BioComp_UFF/workflow/`

[← Automação](README.md) · Pedido do usuário: avaliar e documentar uma reestruturação de `treeBuilderController.py`, `subtreeBuilderController.py` e `subtreeMinerController.py` — "assim como fizemos em `app.py` em M5" — considerando as dependências de `workflow/` que os importam. **Este documento é avaliação, não execução.** Nenhum código foi alterado.

## 0. Resposta curta

**Não são três problemas iguais.** Só `treeBuilderController.py` (1071 linhas) tem o formato de monólito que justificou Arq-B. Os outros dois (188 e 130 linhas) já são orquestradores finos sobre classes de cálculo (`SubtreeBuilder`, `SubtreeMiner`) e reestruturá-los do mesmo jeito seria criar indireção sem pagar por ela.

**Achado que muda a prioridade da tarefa:** `subtreeMinerController.py` define uma classe (`SubtreeMinerController`) que **não é chamada por ninguém em produção** e que, se fosse chamada, **quebraria** — dois defeitos de código morto, não um. Ver §3. Isso é mais urgente do que qualquer reestruturação: é lixo confirmado, candidato a exclusão, não a "arquitetura melhor".

**Necessidade:** média para `treeBuilderController.py`, referente ao [D26](../science/02-defeitos-que-alteram-resultado.md#d26) e à duplicação `_process_auto_mode`/`_process_advanced_mode` (§4). Baixa para os outros dois. **Possibilidade:** sim, mas o custo de pré-requisito (golden/caracterização — regra 4 do `CLAUDE.md`) é proporcionalmente **maior** que o de Arq-B, porque o modo `advanced` exige as quatro ferramentas externas reais (IQ-TREE/FastTree/RAxML-NG/MrBayes) para caracterizar, não só HTTP mockado.

## 1. Método

Comandos usados para levantar os fatos abaixo (reproduzíveis, ver regra 3 do `CLAUDE.md` — evidência é comando + saída):

```bash
wc -l BioComp_UFF/workflow/controller/*.py
grep -rln "TreeBuilderController\|SubtreeBuilderController\|SubtreeMinerController" --include="*.py" BioComp_UFF | grep -v __pycache__
grep -rln "\bSubtreeMiner\b" --include="*.py" BioComp_UFF | grep -v __pycache__ | grep -v SubtreeMinerController
cd BioComp_UFF && git log --oneline -- workflow/controller/treeBuilderController.py | wc -l
cd BioComp_UFF && git log --oneline -- workflow/controller/subtreeBuilderController.py | wc -l
cd BioComp_UFF && git log --oneline -- workflow/controller/subtreeMinerController.py | wc -l
```

## 2. Fatos levantados

### 2.1 Tamanho — a assimetria que a pergunta original não previa

| Arquivo | Linhas | Commits no histórico | Import direto por fora de `controller/` |
|---|---:|---:|---|
| `treeBuilderController.py` | **1071** | 21 | `workflow.py`, 3 arquivos de teste |
| `subtreeBuilderController.py` | 188 | 6 | `workflow.py` |
| `subtreeMinerController.py` | 130 | 4 | **nenhum** (só a reexportação acidental — §3) |

78% das linhas e 66% do churn de commits estão num arquivo só. Os outros dois já têm o tamanho que um "router fino" de Arq-B tinha depois da extração (`system_router.py`/`aligners_router.py` ficaram na faixa de 30-250 linhas). Tratá-los como parte do mesmo problema estrutural seria impreciso.

### 2.2 Fan-in (quem depende dos três) — pequeno, ao contrário de `app.py`

```
workflow.py                              → TreeBuilderController, SubtreeBuilderController
workflow/tests/test_execution_mode_dispatch.py → TreeBuilderController (roda de verdade, MAFFT real)
workflow/tests/test_deduplicacao.py            → TreeBuilderController (só via .__new__, sem __init__)
workflow/tests/test_aligners.py                → referências indiretas (política de alinhador)
workflow/tests/test_data_acquisition_refseq.py → comentário, não import
```

`app.py` tinha 34 rotas HTTP tocadas por praticamente toda feature do backend — múltiplos agentes precisavam do mesmo arquivo ao mesmo tempo, e isso *é* o que Arq-B resolveu (T2 deixar de ser serial). Aqui o fan-in é **um único ponto de entrada** (`workflow.py`) mais 4 arquivos de teste. Não há "vários agentes brigando pelo mesmo arquivo" — há um pipeline sequencial que uma pessoa por vez tende a mexer. **O argumento de paralelismo que justificou Arq-B não se aplica da mesma forma aqui.**

### 2.3 Fan-out (o que os três já delegam) — a decomposição em camada de cálculo já existe

```
treeBuilderController.py    → TreeBuilder (tree_construction/builder.py, 539 linhas)
                             → AlignmentSeqs (alignment/alignmentSeq.py, 522 linhas)
                             → ALIGNERS/AlignerPolicy/resolve_aligner (alignment/aligners.py, 570 linhas)
                             → dataValidation, dataCleaning, messages, metrics

subtreeBuilderController.py → SubtreeBuilder (subtree_construction/builder.py, 182 linhas)
                             → SubtreeMiner (subtree_mining/miner.py, 367 linhas) — via subtreeMinerController

subtreeMinerController.py   → SubtreeMiner (subtree_mining/miner.py) — mas ver §3
```

Ou seja: ao contrário de `app.py` (que tinha lógica de negócio *inline* nos handlers, sem nenhuma camada de serviço), estes três **já são controladores sobre uma camada de builders/miners separada**. O padrão `config`/`routers`/`services` de Arq-B já existe aqui em espírito — só tem nomes diferentes (`controller` = router+parte do service; `tree_construction`/`subtree_construction`/`subtree_mining` = services). O ganho estrutural de "separar HTTP de regra de negócio" **já foi feito** neste canto do projeto, provavelmente desde a origem.

### 2.4 Cobertura de teste — pré-requisito da regra 4, hoje insuficiente

| Cenário | Caracterizado? |
|---|---|
| `mode="basic"`/`"auto"` produzem o mesmo nº de árvores | ✅ `test_execution_mode_dispatch.py` (roda MAFFT real) |
| `mode="distance"` / `mode="parsimony"` isolados | ❌ nenhum teste dedicado |
| `mode="advanced"` (IQ-TREE/FastTree/RAxML-NG/MrBayes) | ❌ nenhum teste dedicado — só a suíte de `stability`/`aligners` testa os construtores individualmente, não o dispatch do controlador |
| Resolução de alinhador com fallback (`_resolver_alinhador`) | ◐ testado em `test_aligners.py`, mas contra `aligners.py` diretamente, não contra o controlador |
| Geração de heatmap/imagem (`save_tree_image`, `somarMatrizes`) | ❌ nenhum teste |
| `_process_auto_mode` vs `_process_advanced_mode` (a duplicação em si) | ❌ nenhum teste que trate os dois como "devem produzir a mesma árvore de distância/parcimônia dado o mesmo insumo" |
| `SubtreeBuilderController.__call__` de ponta a ponta | ❌ nenhum teste — só `builder()` isolado, sem `subtree_miner=True` |
| `SubtreeMinerController` | irrelevante — código morto (§3) |

Comparado a Arq-B (onde 7 de 34 rotas já tinham golden, e o resto ganhou golden **antes** de mover, num total de 4 arquivos novos), aqui a cobertura de partida é proporcionalmente **menor**, e o custo de escrever golden para `mode="advanced"` é **maior**: exige as quatro ferramentas externas instaladas e rodando de verdade (o padrão que `test_execution_mode_dispatch.py` já usa, com `@unittest.skipUnless(external_tools.resolve_tool(...))`), não um `httpx.AsyncClient` contra um FastAPI em processo.

## 3. Achado — `SubtreeMinerController` é código morto, e quebrado se fosse chamado

Este é o achado mais concreto desta avaliação, e vale independentemente de qualquer decisão sobre reestruturar o resto.

**A classe nunca é instanciada em produção.** `grep -rn "SubtreeMinerController\b"` no repositório inteiro só encontra a própria definição e as menções a ela em docstring/log dentro do próprio arquivo. `workflow.py` (o único ponto de entrada real) importa `TreeBuilderController` e `SubtreeBuilderController` — nunca `SubtreeMinerController`.

**O que `subtreeBuilderController.py` de fato chama** (linha 12 e 135):

```python
from workflow.controller.subtreeMinerController import SubtreeMiner
...
miner = SubtreeMiner(**self.subtree_miner_configs)
data = miner.miner(data=self.raw_data)
```

Isso **parece** importar algo de `subtreeMinerController.py`, mas não importa: `subtreeMinerController.py` faz, na própria linha 13, `from workflow.subtree_mining.miner import SubtreeMiner` — e o Python reexporta esse nome pelo módulo. `from workflow.controller.subtreeMinerController import SubtreeMiner` pega a classe `SubtreeMiner` de `subtree_mining/miner.py` **por tabela**, atravessando um módulo que tem uma classe de nome quase idêntico (`SubtreeMinerController`) e nada a ver com ela. É a mesma classe de armadilha que [D5](../science/02-defeitos-que-alteram-resultado.md#d5) já documentou noutro contexto: dois nomes parecidos, só um é o real, e o código não distingue visualmente qual.

**A classe `SubtreeMinerController`, se alguém a instanciasse, quebraria em ambos os ramos do seu único método relevante** (`miner()`, linhas 88-131 de `subtreeMinerController.py`):

- Ramo `mode == "OFST"`: chama `SubtreeMiner.group_data_by_tree_base(data)` — isto é, o método de **instância** `group_data_by_tree_base(self, data)` de `SubtreeMiner` (`subtree_mining/miner.py:81`) invocado **pela classe**, sem instância. Em Python 3, isso vincula `data` ao parâmetro `self` e reclama de `data` ausente: `TypeError: group_data_by_tree_base() missing 1 required positional argument: 'data'`.
- Ramo `else`: chama `self.process_group(data)` — mas `SubtreeMinerController` **não define** `process_group` em lugar nenhum (só `__init__`, `group_data_by_tree_base`, `miner`). `AttributeError: 'SubtreeMinerController' object has no attribute 'process_group'`.

**A explicação mais provável, com evidência de `git log`:** `SubtreeMiner` (a classe real) tem hoje os métodos `miner()`, `group_data_by_tree_base()` e `process_group()` como métodos de instância próprios (`subtree_mining/miner.py:64,81,104`) — comparando `SubtreeMiner.miner()` com o `SubtreeMinerController.miner()` morto, a lógica é **quase idêntica linha a linha**, só que uma versão usa `self.group_data_by_tree_base(...)` (correto) e a outra usa `SubtreeMiner.group_data_by_tree_base(...)` (quebrado). Tudo indica que em algum momento a responsabilidade de orquestrar a mineração migrou para dentro da própria `SubtreeMiner`, e `SubtreeMinerController` ficou para trás — sem que ninguém apagasse o arquivo nem os `import`s que o atravessam. O commit mais recente que tocou o arquivo (`be05cef`, 2026-08-26) só adicionou a chamada de `run_logging.garantir` (D22) no `__init__` — não mexeu no `miner()` morto, então a decadência não foi notada nem então.

**Não corrigido nesta avaliação** (é achado, não é o pedido desta tarefa) — registrado na fila de triagem do ledger (§7).

## 4. Avaliação por arquivo

### 4.1 `treeBuilderController.py` — o único candidato real a Arq-D

**Pontos de dor estruturais, com localização:**

1. **Duplicação `_process_auto_mode` (linhas 472-509) × `_process_advanced_mode` (linhas 511-555).** São o mesmo laço aninhado (`for alg in self.aligners: for method in ['nj','upgma']: ...distance...parsimony...`) com um bloco extra de métodos avançados no segundo. É onde [D18](../science/02-defeitos-que-alteram-resultado.md#d18) foi descoberto (já fechado) — a duplicação em si nunca foi corrigida, só o comportamento que ela escondia.
2. **Quatro métodos quase-idênticos para os métodos avançados** (`build_tree_iqtree`/`build_tree_fasttree`/`build_tree_raxml`/`build_tree_mrbayes`, linhas 834-880): cada um cria um `TreeBuilder` novo, chama `_get_alignment`, chama um `builder.<x>_constructor`, conta nós. É **o mesmo lugar** onde vive [D26](../science/02-defeitos-que-alteram-resultado.md#d26) — nenhuma das quatro chamadas repassa `tree_config` ao `TreeBuilder`, porque cada uma reconstrói os kwargs à mão. Uma reestruturação que unifique os quatro em um só caminho parametrizado **é o lugar natural para decidir o que fazer com D26** (repassar `tree_config` de verdade, ou declarar os três valores como constantes documentadas — as duas saídas que a ficha de método já propõe e não implementou, "fora do escopo de M7.1").
3. **Bloco de merge de `multi_trees` duplicado literalmente** em `__call__` (linhas 302-309 e 322-329) — o mesmo laço `for alg in file_multi_trees: for method_type in ...: extend(...)` aparece nos dois `elif` (modo básico e modo avançado), byte a byte igual.
4. **`save_tree_image` (linhas 1013-1072) mistura renderização matplotlib com orquestração** — é a única responsabilidade do arquivo que não é "decidir qual árvore construir", e o projeto já tem precedente de separar isso (`workflow/utils/metrics.py::plot_heatmap_distances`/`process_histogram_frequence`).
5. **Resolução de alinhador (`_resolver_alinhador`, `_alinhar`, `_get_alignment`, `_dimensoes_do_conjunto`, linhas 882-1011) é uma responsabilidade coesa** que arguavelmente pertence a `workflow/alignment/`, não ao controlador de árvore — hoje mora aqui porque foi crescendo junto com D1.

**O que este arquivo NÃO tem** (diferença importante de `app.py`): múltiplos "endpoints" independentes que agentes diferentes precisem tocar ao mesmo tempo. É um único fluxo sequencial (`__call__` → `_process_*_mode` → `_process_*_tree_method` → `build_tree_*`). A motivação de Arq-B ("T2 é serial, isso trava paralelismo do projeto inteiro") não se sustenta aqui: não há uma "trilha T-alguma" esperando este arquivo virar fino para poder avançar em paralelo. A motivação aqui seria **legibilidade e correção** (D26, a duplicação), não desbloqueio de paralelismo.

### 4.2 `subtreeBuilderController.py` — não precisa da mesma cirurgia

188 linhas, um `__init__` e dois métodos (`__call__`, `builder`). Já delega tudo que é cálculo para `SubtreeBuilder`. O único ponto de atenção real é o import confuso descrito em §3 — que se resolve **apontando o import para `workflow.subtree_mining.miner` diretamente** (`from workflow.subtree_mining.miner import SubtreeMiner`), sem precisar de nenhuma camada nova. Reestruturar este arquivo em `config`/`router`/`service` seria criar três módulos para um controlador que já cabe numa tela.

### 4.3 `subtreeMinerController.py` — candidato a exclusão, não a reestruturação

130 linhas, e a classe que define é código morto e quebrado (§3). A pergunta certa não é "como reestruturar `subtreeMinerController.py`" — é **"o arquivo deveria existir?"** Duas saídas, nenhuma implementada aqui:

- **(a) Excluir o arquivo.** `subtreeBuilderController.py` passaria a importar `SubtreeMiner` direto de `subtree_mining.miner` (troca de uma linha de import). Nenhum outro lugar do repositório referencia `SubtreeMinerController`.
- **(b) Manter como documentação morta, com aviso explícito.** Menos indicado — o projeto já tem o hábito de marcar isso com comentário `# DEPRECATED`/`# não usado`, mas um arquivo inteiro de 130 linhas fingindo ser um controlador ativo é o tipo de coisa que engana quem lê o projeto pela primeira vez (inclusive enganou esta avaliação por um instante, até o `grep` de fan-in vir vazio).

## 5. Paralelo direto com Arq-B — onde a analogia vale e onde não vale

| Critério | `app.py` (Arq-B) | `treeBuilderController.py` | `subtreeBuilderController.py`/`subtreeMinerController.py` |
|---|---|---|---|
| Tamanho que justifica "monólito" | 2917 linhas, 34 rotas | 1071 linhas, 1 classe sequencial | 188/130 linhas |
| Fan-in (quem precisa mexer ao mesmo tempo) | toda feature do backend | 1 entry point + 4 testes | 1 entry point |
| Já delega cálculo a uma camada de serviço | não (motivo de Arq-B existir) | sim (`TreeBuilder`) | sim (`SubtreeBuilder`/`SubtreeMiner`) |
| Bloqueia paralelismo de outras trilhas | sim (T2 inteira serial) | não identificado | não identificado |
| Defeito de domínio já documentado preso à estrutura | não (contrato HTTP, não cálculo) | sim — D26, adjacente à zona sagrada | não |
| Cobertura de teste de partida | 7/34 rotas com golden | 1 cenário caracterizado (basic×auto) | 0 |
| Custo de escrever a caracterização que falta | HTTP mockado, rápido | precisa dos 4 binários externos rodando | médio |

## 6. Se a decisão for prosseguir — proposta de arquitetura candidata (só `treeBuilderController.py`)

Não implementado. Esboço para avaliação, seguindo o mesmo vocabulário de Arq-B adaptado ao domínio:

- **`tree_construction/dispatch.py`** (novo) — substitui `_process_auto_mode`/`_process_advanced_mode` por uma função parametrizada por lista de métodos (`["distance", "parsimony"]` para básico; `+ ["iqtree","fasttree","raxml","mrbayes"]` para avançado), eliminando a duplicação do achado 4.1.1 sem mudar o resultado.
- **`tree_construction/method_registry.py`** (novo) — o `builder_methods = {...}` que já existe informalmente em `_process_advanced_tree_method` (linha 652) vira o registro único para os quatro `build_tree_*`, todos passando pelo mesmo caminho — o lugar certo para a decisão de D26 (repassar `tree_config` ou declarar constante).
- **`workflow/alignment/resolution.py`** (novo, ou dentro de `alignment/aligners.py` existente) — `_resolver_alinhador`/`_alinhar`/`_get_alignment`/`_dimensoes_do_conjunto` migram para perto de `ALIGNERS`/`AlignerPolicy`, de onde dependem.
- **`tree_construction/rendering.py`** (novo) — `save_tree_image`/`somarMatrizes` saem do controlador; `TreeBuilderController` deixa de importar `matplotlib` diretamente.
- **`TreeBuilderController` fica fino**: `__init__`, `__call__` (dispatch de alto nível), `_prepare_output_paths`, `_validate_and_prepare_fasta` — o equivalente ao "app.py só com lifespan e include_router".

**Pré-requisito, sem exceção (regra 4):** golden/caracterização de `mode="advanced"` rodando os quatro métodos de verdade, mais um teste que force `_process_auto_mode`/`_process_advanced_mode` a produzir a mesma árvore de distância/parcimônia dado o mesmo insumo (prova de que a unificação não mudou nada), antes de tocar em qualquer linha. Estimativa qualitativa: maior que qualquer fatia individual de Arq-B, por causa das ferramentas externas.

## 7. Achados para a fila de triagem do ledger

- **`SubtreeMinerController` (`BioComp_UFF/workflow/controller/subtreeMinerController.py`) é código morto e quebrado** (§3) — candidato a exclusão (opção a) independente de qualquer decisão sobre Arq-D. Baixo risco de corrigir (é `BioComp_UFF/`, write-lock próprio, regra 6 do `CLAUDE.md`), mas fora do pedido desta avaliação — registrar em `docs/automation/07-log-de-execucao.md` na tabela "Achados fora de escopo" para não se perder.
- **D26** (`tree_config` não alcança `TreeBuilder`) segue aberto, e este documento aponta onde uma reestruturação futura o resolveria de graça — não é razão suficiente sozinha para justificar a reestruturação, mas é o item de maior valor científico se ela acontecer.

## 8. Recomendação

**Não tratar os três arquivos como um único lote "Arq-D".** Se o usuário decidir prosseguir com alguma reestruturação:

1. **Prioridade imediata, baixo custo, alto valor:** resolver o achado de código morto (§3) — é um lote curto, isolado, sem dependência de golden test pesado (é exclusão de código inalcançável, não mudança de comportamento).
2. **Prioridade condicional, custo médio-alto:** reestruturar só `treeBuilderController.py`, e só depois de escrever a caracterização de `mode="advanced"` que hoje não existe — o item que mais paga (resolve D26, remove duplicação) é também o que mais exige de infraestrutura de teste antes de começar.
3. **Não reestruturar** `subtreeBuilderController.py`/`subtreeMinerController.py` além do achado do item 1 — não há monólito para quebrar, e criar camadas novas para 130-188 linhas é custo sem benefício correspondente.

Nenhuma ação de código foi tomada. Esta avaliação fica para decisão do usuário.
