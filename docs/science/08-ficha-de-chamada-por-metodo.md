# Ficha de chamada por método — FastTree, IQ-TREE, RAxML-NG, MrBayes

[← Ciência](README.md) · Dono: [A11 Bioinformática & Inferência](../agents/11-bioinformatica-inferencia.md) · Entregável **M7.1** · 2026-09-01

## Para que serve

[M7.1](../automation/10-marcos-e-metas.md#8-m7--heurísticas-de-inferência-corretas-parametrizáveis-escaláveis) pede a linha de base que nunca existiu: para cada método avançado, a linha de comando **efetiva**, o que cada parâmetro faz, o que é fixo no código, o que o `tree_config` do usuário pode mudar, e o que deveria poder e não pode (ou vice-versa). Nenhum método entra em `M` (o denominador do suporte metodológico) sem ter passado por este documento.

**Método.** Leitura de código, sem executar nenhuma ferramenta de bioinformática — há uma reexecução pesada real rodando nesta máquina (`Variola_VARV121_reexec_20260901`) e a regra do projeto proíbe invocar IQ-TREE/RAxML-NG/FastTree/MrBayes de verdade enquanto ela dura. Toda linha de comando abaixo foi reconstruída lendo `BioComp_UFF/workflow/tree_construction/builder.py` linha a linha; os poucos pontos verificados contra artefato em disco usam projetos **já concluídos e fora do write-lock** (`Zika_21seq_validacao`), nunca o projeto em execução. Onde não há como confirmar sem rodar, isto está dito explicitamente, não estimado.

**Achado mais caro deste lote:** duas "escolhas configuráveis" documentadas nos defeitos D11/D17/D21/D20 — semente e paralelização de IQ-TREE/RAxML-NG — **não são alcançáveis pelo usuário hoje**, apesar do código parecer prever isso. É o §0.

---

## 0. Achado transversal — semente e paralelização parecem parametrizáveis e não são

`BioComp_UFF/workflow/tree_construction/builder.py:26-52` define:

```python
REPRODUCIBILITY_DEFAULTS = {
    'random_seed': 12345,
    'raxml_threads': 4,
    'iqtree_threads': 4,
}

def reproducibility_settings(config: dict) -> dict:
    return {chave: int(config.get(chave, padrao))
            for chave, padrao in REPRODUCIBILITY_DEFAULTS.items()}
```

e `TreeBuilder.__init__` (`builder.py:88-94`) chama `reproducibility_settings(kwargs)` sobre o que recebeu. A leitura natural é: "se o experimento declarar `random_seed`/`raxml_threads`/`iqtree_threads` no `tree_config`, o pipeline usa esse valor; senão, o default". **Isso é verdade em um lugar e falso no outro.**

**Onde é verdade — o manifesto.** `BioComp_UFF/workflow.py:100`:

```python
manifest.register_reproducibility(reproducibility_settings(params.get('tree_config', {})))
```

Aqui `reproducibility_settings` recebe o `tree_config` **de fato enviado pelo usuário**. Se alguém adicionar `"random_seed": 999` ao JSON, o manifesto declara `random_seed: 999`.

**Onde é falso — a construção da árvore.** `TreeBuilderController` (`treeBuilderController.py:803-849`) instancia um `TreeBuilder` novo para cada método avançado, e nenhuma das quatro chamadas repassa o `tree_config`:

```python
# build_tree_iqtree,   treeBuilderController.py:808
builder = TreeBuilder(fasta_path=fasta_path, output_path_tree=output_path_tree)
# build_tree_fasttree, treeBuilderController.py:820   — idêntico
# build_tree_raxml,    treeBuilderController.py:832   — idêntico
# build_tree_mrbayes,  treeBuilderController.py:844   — idêntico
```

`kwargs` dentro de `TreeBuilder.__init__` é `{fasta_path, output_path_tree}` — nunca contém `random_seed`, `raxml_threads` nem `iqtree_threads`. `reproducibility_settings({...sem essas chaves...})` cai sempre no default do dicionário. **O `TreeBuilder` que de fato roda a inferência nunca vê o `tree_config`.**

Confirmado por varredura: nenhuma dessas três chaves aparece em código algum de `BioComp_UFF/workflow/` fora de `builder.py` (`grep -rn "random_seed\|raxml_threads\|iqtree_threads" BioComp_UFF/workflow/*.py BioComp_UFF/workflow/controller/*.py` → 0 ocorrências). E não são alcançáveis pela UI: `Frontend/phylotreeminer/src/components/configures/pipelineConfigurator.jsx` monta o `tree_config` enviado ao backend só com `mode`, `ignore_mode`, `construct_tree_method`, `align_method` e `num_threads` (linhas 440-447); `BioComp_UFF/templates/config.json` — o exemplo de referência do próprio submódulo — tampouco declara as três chaves.

**Consequência.**

1. **Hoje, na prática, é inofensivo**: como ninguém expõe essas chaves, `params.get('tree_config', {})` no manifesto e `kwargs` no `TreeBuilder` caem no mesmo default (12345 / 4 / 4) por caminhos diferentes, e por acidente concordam.
2. **É uma mina para o futuro.** No dia em que alguém — usuário avançado editando o JSON à mão, ou uma versão futura da UI — declarar `random_seed` no `tree_config` esperando reproduzir uma árvore específica, **o manifesto vai mentir**: ele vai registrar a semente pedida, e a árvore vai ter sido gerada com `12345`. É exatamente o que o docstring de `ExecutionManifest.register_reproducibility` (`manifest.py:324-332`) adverte contra: *"se o manifesto declarar um número e o pipeline usar outro, ele deixa de ser manifesto e passa a ser ficção"* — e o mecanismo que causaria isso já existe no código hoje, sem que ninguém tenha precisado acioná-lo ainda.
3. Isto também significa que **`raxml_threads`/`iqtree_threads` não são, hoje, parâmetros de experimento**: são constantes de módulo com um nome que sugere configuração. `threads_configurados=self.iqtree_threads`, gravado no manifesto pelo IQ-TREE (`builder.py:217`), é sempre `4` — nunca reflete uma intenção real do usuário, porque não há caminho para o usuário expressar essa intenção.

**Correção sugerida (não implementada — é código do submódulo, fora do escopo deste documento):** ou (a) `TreeBuilderController` repassa o `tree_config` recebido para cada `TreeBuilder(**self.__dict__ filtrado)`, fechando o caminho hoje aberto só até o manifesto; ou (b), mais barato e mais honesto enquanto a UI não expõe esses campos, `reproducibility_settings` deixa de aceitar `config` e os três valores viram constantes de verdade, documentadas como tal — e o manifesto para de fingir que lê um `tree_config` que o `TreeBuilder` não lê.

---

## 1. FastTree

**Onde.** Montagem em `builder.py:248-285` (`TreeBuilder.fasttree_constructor`); chamada em `treeBuilderController.py:815-825` (`build_tree_fasttree`).

### Linha de comando efetiva

```python
cmd = [require_tool('fasttree'), '-nt', '-gtr', align_path]
```

com `align_path = tmp_dir/{base_name}.fasta`, gravado por `AlignIO.write(alignment, align_path, 'fasta')` (`builder.py:258-259`) a partir do alinhamento que o controlador já produziu. O resultado é lido do **stdout** do processo (`builder.py:271`, `Phylo.read(StringIO(result.stdout), 'newick')`), não de um arquivo — é a única das quatro ferramentas que funciona assim.

| Parâmetro | O que faz | Fixo ou parametrizável |
|---|---|---|
| `-nt` | Declara que a entrada é nucleotídeo, não proteína | Fixo no código |
| `-gtr` | Usa o modelo GTR (substituição geral reversível no tempo) em vez do padrão Jukes-Cantor para nucleotídeos; exige `-nt` | Fixo no código |
| `align_path` | Alinhamento de entrada, formato FASTA | Vem do alinhador escolhido via `tree_config.align_method` |

**Semente e paralelização — corretamente não declaradas, não por omissão.** O comentário em `builder.py:263-266` registra a razão: *"o FastTree não aceita nem uma nem outra nesta chamada"*. Não há flag de semente no FastTree para este modo de uso, e `tool_runs.registrar('fasttree', cmd, saida=output_path_tree, model='GTR (-nt -gtr)')` (`builder.py:267-268`) grava isso no manifesto sem inventar um valor — é a regra 5 do projeto aplicada corretamente aqui.

**Suporte de ramo — sobrevive, ao contrário do que os outros métodos sugerem.** Sem a flag `-nosupport` (não presente), o FastTree calcula por padrão um suporte local por ramo interno (teste do tipo Shimodaira-Hasegawa, escala 0–1 — **não é bootstrap** e não deve ser lido no limiar de UFBoot ou de probabilidade posterior). Verificado em artefato já em disco, fora do write-lock:

```bash
grep -o "Tree tree1=.*" BioComp_UFF/projects/Zika_21seq_validacao/out/Trees/tree_dataset_final_mafft_fasttree.nexus
# (...)(KF383085.1:0.00145,KF383114.1:0.00413)0.93:0.00716)1.00:0.04110)0.99:0.02301...
```

Os números antes de cada `:` de ramo interno (`0.93`, `1.00`, `0.99`...) são exatamente esse suporte, e sobrevivem ao `Phylo.read`/`Phylo.write` para Nexus (`builder.py:271-273`) — confirmado lendo `Bio/Phylo/NewickIO.py` do ambiente do projeto: um rótulo de nó interno que é numérico e ainda não tem `.confidence` é promovido a `.confidence` na leitura (`NewickIO.py`, `Parser.process_clade`), e o escritor reserializa como `"%1.2f:branch_length"` — daí o `.00` de sufixo em valores que no log da ferramenta são inteiros. **Isto é diferente do que [D10](02-defeitos-que-alteram-resultado.md#d10) descreve para o IQ-TREE**: aqui o suporte não é descartado ao gravar o Nexus. O que fica em aberto — e é fora do escopo de `BioComp_UFF` — é se o backend de fato lê `.confidence` do Nexus do FastTree ao montar `metadata.json`/grafo/UI; não verificado neste lote.

**O que deveria ser parametrizável e não é.** Nada de crítico: `-gtr` é uma escolha de modelo razoável por padrão, e a ausência de correção gama (`-gamma`, que reescala comprimentos de ramo e recalcula a log-verossimilhança sob 20 categorias gama sem mudar a topologia) é uma omissão menor, não uma decisão silenciosa de alto custo — precisa só ser declarada em *Methods* como "sem correção gama".

**O que a execução real teria de confirmar.** Determinismo do resultado entre chamadas na mesma máquina — ao contrário de RAxML-NG e IQ-TREE, não há registro no projeto de uma medição de reprodutibilidade específica do FastTree (D17/D21 mediram os outros dois). Fica para M7.5/M7.7 se o custo justificar medir.

---

## 2. IQ-TREE

**Onde.** `builder.py:177-246` (`TreeBuilder.iqtree_constructor`); `treeBuilderController.py:803-813` (`build_tree_iqtree`).

### Linha de comando efetiva

```python
cmd = [
    require_tool('iqtree'), '-s', align_path,
    '-m', 'GTR+G', '-bb', '1000',
    '-seed', str(self.random_seed),
    '-pre', prefix,
    '-nt', '1'
]
```

com `align_path = tmp_dir/{base_name}.phylip` (`builder.py:187-188`, o alinhamento reescrito em formato PHYLIP — é a origem do truncamento de rótulo em 10 caracteres, [D13](02-defeitos-que-alteram-resultado.md#d13)) e `self.random_seed` sempre `12345` na prática, pelo §0.

| Parâmetro | O que faz | Fixo ou parametrizável |
|---|---|---|
| `-s align_path` | Alinhamento de entrada | Vem do alinhador (`tree_config.align_method`) |
| `-m GTR+G` | **Fixa** o modelo de substituição em GTR com heterogeneidade de taxa gama, e por isso **desliga** o ModelFinder — quando `-m` não é passado, o IQ-TREE 2/3 roda ModelFinder Plus por padrão e escolhe o modelo por AIC/BIC/BIC-corrigido | Fixo no código, hoje sem exceção |
| `-bb 1000` | 1000 réplicas de bootstrap ultrarrápido (UFBoot); produz um valor de suporte de 0 a 100 por ramo, com escala e interpretação **diferentes** de bootstrap clássico ou de probabilidade posterior | Contagem de réplicas fixa no código; não há flag de SH-aLRT (`-alrt`) — só UFBoot é calculado |
| `-seed N` | Semente do gerador pseudoaleatório, cobre a escolha da árvore inicial e o resampling do UFBoot | Nominalmente vem de `self.random_seed`; na prática **sempre `12345`**, pelo §0 |
| `-pre prefix` | Prefixo dos arquivos de saída (`.treefile`, `.contree`, `.log`, ...) | Interno, deriva do caminho de saída |
| `-nt 1` | Uma thread para a busca de ML | Fixo no código **por decisão do usuário**, [D21](02-defeitos-que-alteram-resultado.md#d21): com `-nt N > 1`, três repetições da mesma semente devolveram três topologias (RF = 2); com `-nt 1`, uma só. `iqtree_threads` (sempre `4`, pelo §0) continua sem efeito na topologia — o comentário em `builder.py:203-205` documenta que ele governaria o bootstrap, que é embaraçosamente paralelo, mas a chamada atual não usa `iqtree_threads` em lugar nenhum: **é um campo do manifesto sem função na linha de comando** |

**Confirmação de D17/D21 lendo o código atual.** `-seed` e `-nt 1` estão de fato na chamada, como os defeitos descrevem — a correção continua aplicada. O que os defeitos não capturam (porque a semente e a paralelização nominalmente vêm de `self`) é o §0: `self.random_seed` nunca é outra coisa senão `12345`, então "semente fixa e configurável" hoje é apenas "semente fixa".

**Arquivo de árvore lido — e um achado que atualiza D10 parcialmente.** `builder.py:222-232` procura, nesta ordem, `.treefile`, `.contree`, `.tre`, e usa o **primeiro que existir** — na prática sempre `.treefile` (IQ-TREE sempre o grava com `-bb`). Verificado em artefato fora do write-lock:

```bash
grep -o "Tree tree1=.*" BioComp_UFF/projects/Zika_21seq_validacao/out/Trees/tree_dataset_final_mafft_iqtree.nexus
# (...)(KY317936.1:0.00075,(KY317938.1:0.00021,KY317940.1:0.00075)46.00:0.00010)75.00:0.00059...
```

Os rótulos `46.00`, `75.00`, `72.00` (mesmo mecanismo do FastTree, §1: número em nó interno → `.confidence` na leitura do Newick) são valores de UFBoot escritos diretamente no `.treefile`, e sobrevivem ao `Phylo.write` para Nexus. **Isto contradiz, para este artefato e esta versão do pipeline, a premissa central de [D10](02-defeitos-que-alteram-resultado.md#d10)** ("o `.nexus` gravado em `out/Trees/` não os tem"), que foi escrita olhando para artefatos de *Variola* mais antigos. Não estou fechando D10 — não sei se essa mudança é de versão do IQ-TREE (2.2.2.6 registrado em D10 vs. 3.1.3 usado desde D21), de comportamento entre `.treefile` e `.contree`, ou algo que já mudou no código sem que o defeito fosse atualizado — e não verifiquei se o suporte chega a `metadata.json`/grafo/UI, que é a parte do defeito que de fato importa para a mineração. Isto precisa de confirmação de quem é dono de D10 (A6/ledger) antes de qualquer parecer de "fechado", mas **muda o que M7.2/M7.6 têm que fazer**: talvez seja só propagação a jusante, não geração.

**O que deveria ser parametrizável e não é.**

- **Modelo (`-m GTR+G`).** Fixá-lo desliga o ModelFinder, que é a prática recomendada e citável do IQ-TREE. `06-decisoes-metodologicas.md` (DM-2) registra "o IQ-TREE roda ModelFinder e escolhe sozinho" — **essa frase não descreve o código atual**, que passa `-m GTR+G` explicitamente. É uma divergência entre o quadro de decisões e o código que precisa ser reconciliada (ou o quadro está desatualizado, ou uma versão anterior do código de fato deixava o `-m` livre); registrado aqui, não corrigido — é [M7.3](../automation/10-marcos-e-metas.md#8-m7--heurísticas-de-inferência-corretas-parametrizáveis-escaláveis).
- **Contagem de réplicas do UFBoot (`-bb 1000`)** e **ausência de SH-aLRT (`-alrt`)**: nenhum dos dois é exposto por `tree_config`. Não é necessariamente errado manter fixo, mas precisa estar em *Methods*, não implícito.
- `iqtree_threads`, como já dito, é um campo do manifesto sem contrapartida na chamada — ou passa a controlar de fato o UFBoot (`-bb 1000 -nt AUTO` faria isso de forma diferente da atual, que roda tudo em `-nt 1`), ou o campo deveria deixar de existir para não sugerir um controle que não há.

---

## 3. RAxML-NG

**Onde.** `builder.py:287-341` (`TreeBuilder.raxml_ng_constructor`); `treeBuilderController.py:827-837` (`build_tree_raxml`).

### Linha de comando efetiva

```python
cmd = [
    require_tool('raxml-ng'), '--msa', align_path,
    '--model', 'GTR+G',
    '--threads', str(self.raxml_threads), '--workers', '1',
    '--seed', str(self.random_seed), '--tree', 'rand{10}',
    '--prefix', prefix
]
```

com `align_path` também em PHYLIP (`builder.py:297-298`, mesma origem do truncamento de D13) e `self.raxml_threads`/`self.random_seed` sempre `4`/`12345` na prática (§0).

| Parâmetro | O que faz | Fixo ou parametrizável |
|---|---|---|
| `--msa align_path` | Alinhamento de entrada | Vem do alinhador |
| `--model GTR+G` | Fixa o modelo de substituição; RAxML-NG não roda seleção de modelo nesta chamada (existe `--evaluate`/uso conjunto com ModelTest-NG, não usado aqui) | Fixo no código, sem exceção |
| `--threads N --workers 1` | `N` threads dentro de **um único worker** — serializa a busca de ML. Fixado por [D17](02-defeitos-que-alteram-resultado.md#d17): `--threads auto` deixava o RAxML-NG escolher o esquema de paralelização a partir do número de núcleos, e o esquema **mudava a topologia** com a mesma semente (RF = 8 medido) e derrubou o processo com `SIGSEGV` em outra máquina | `workers=1` fixo no código, por decisão medida; `N` nominalmente vem de `self.raxml_threads`, na prática sempre `4` (§0) |
| `--seed N` | Semente do gerador pseudoaleatório, cobre a escolha das árvores iniciais aleatórias | Nominalmente `self.random_seed`, na prática sempre `12345` (§0) |
| `--tree rand{10}` | 10 árvores iniciais **aleatórias**; o RAxML-NG otimiza cada uma e reporta a de maior verossimilhança. Não há árvores iniciais por parcimônia (`pars{N}`) misturadas — é só o braço aleatório | Fixo no código |
| `--prefix prefix` | Prefixo dos arquivos de saída | Interno |

**Suporte de ramo — ausente, e é esperado que esteja.** Sem `--bs-trees`/`--all`/`--bootstrap`, o RAxML-NG não calcula suporte algum; a árvore lida em `builder.py:327` (`prefix + '.raxml.bestTree'`) não tem valores de confiança. Confirmado no mesmo artefato de controle:

```bash
grep -o "Tree tree1=.*" BioComp_UFF/projects/Zika_21seq_validacao/out/Trees/tree_dataset_final_mafft_raxml.nexus
# ((KY317938.1:0.00021,(KY317936.1:0.00075,KY317940.1:0.00069):0.00010)...   — sem rótulo numérico nos nós internos
```

É exatamente o que [M7.2](../automation/10-marcos-e-metas.md#8-m7--heurísticas-de-inferência-corretas-parametrizáveis-escaláveis) pede para fechar: habilitar `--bs-trees` com o mesmo número de réplicas do UFBoot, para que o suporte metodológico não venha só do IQ-TREE.

**O que deveria ser parametrizável e não é.** Mesma lista do IQ-TREE: modelo (`GTR+G` fixo, sem seleção por critério de informação) e o par semente/threads, que hoje só existe na aparência (§0). O número de árvores iniciais (`rand{10}`) também é uma escolha silenciosa — não há registro de por que 10, nem de ter sido comparado com um número maior.

---

## 4. MrBayes

**Onde.** `builder.py:345-384` (`_clean_mrbayes_tree`, pós-processamento) e `builder.py:387-487` (`TreeBuilder.mrbayes_constructor`); `treeBuilderController.py:839-849` (`build_tree_mrbayes`).

### "Linha de comando" efetiva — quase toda a decisão está no script, não no argv

```python
cmd_mb = [require_tool('mrbayes')]     # builder.py:426 — resolve para "mb"
```

O binário é chamado **sem argumentos**; tudo o que decide o resultado é lido da entrada padrão, de um arquivo de script gerado em `builder.py:406-413`:

```
set autoclose=yes nowarn=yes
execute {nexus_path}
lset nst=6 rates=gamma
mcmc ngen={generations} printfreq=1000 samplefreq=100
sump
sumt burnin=250
quit
```

com `generations` vindo do parâmetro `generations=1000000` da assinatura de `mrbayes_constructor` (`builder.py:387`) — e o chamador (`build_tree_mrbayes`, `treeBuilderController.py:844-847`) **não passa esse argumento**, então é sempre `1000000` também na prática, não só por default de assinatura.

| Comando MrBayes | O que faz | Fixo ou parametrizável |
|---|---|---|
| `set autoclose=yes nowarn=yes` | Não pausa para confirmação interativa nem para avisos — necessário para rodar sem terminal | Fixo, corretamente (é infraestrutura, não método) |
| `execute {nexus}` | Carrega o alinhamento | Nome do arquivo é interno |
| `lset nst=6 rates=gamma` | Modelo GTR (`nst=6`, 6 taxas de substituição) com heterogeneidade de taxa gama | Fixo no código, e é uma quinta decisão de modelo independente das outras três (IQ-TREE e RAxML-NG usam `GTR+G` explícito; FastTree usa `-gtr` sem gama) — nunca comparadas entre si, é a DM-2/M7.3 |
| `mcmc ngen=1000000 printfreq=1000 samplefreq=100` | Roda a cadeia por 1 milhão de gerações, imprime progresso a cada 1000, amostra a cada 100 (10 000 amostras) | `ngen` é parâmetro de função nunca alcançado pelo chamador — fixo na prática; `printfreq`/`samplefreq` fixos no f-string |
| `sump` | Sumariza os parâmetros do modelo amostrados (inclui os diagnósticos de estacionariedade que a ferramenta calcula) | Fixo; **a saída não é lida por código nenhum** |
| `sumt burnin=250` | Descarta as 250 primeiras amostras e sumariza as árvores restantes numa árvore de consenso (regra da maioria) | Fixo no código. Com `ngen=10⁶` e `samplefreq=100`, 250 de 10 000 amostras é **2,5% de burn-in** — a prática usual é 25%, dez vezes mais |
| `quit` | Encerra | — |

**O que não está no script, e deveria estar.**

- **Semente.** Nem `set seed=` nem `set swapseed=`. O MCMC é estocástico; sem semente, **duas execuções da mesma entrada produzem cadeias diferentes**, e nada no manifesto ou no artefato registra por quê — confirmado lendo o script gerado hoje, [D20](02-defeitos-que-alteram-resultado.md#d20) segue aberto neste ponto.
- **`nruns`/`nchains`.** O comando `mcmc` não os declara, então valem os defaults do MrBayes (`nruns=2`, `nchains=4` — 1 fria e 3 aquecidas por corrida, na versão 3.2.x). É o que tornaria o ASDSF calculável (ele compara as frequências de bipartição **entre corridas**) — mas ninguém lê o `sump`/`sumt` para extrair esse número.
- **Diagnóstico de convergência.** `sump`/`sumt` calculam ASDSF e ESS e os imprimem no stdout/log do MrBayes; `mrbayes_constructor` não olha para nenhum dos dois antes de aceitar a árvore de `sumt` como resultado (`builder.py:450-469`). É o item mais grave de D20: uma árvore de uma cadeia que não convergiu é indistinguível, no artefato, de uma que convergiu.

**Achado adicional deste lote — suporte posterior parece ser descartado no pós-processamento, não confirmado sem rodar.** `_clean_mrbayes_tree` (`builder.py:345-384`) lê o `.con.tre` do MrBayes e, antes de extrair a árvore, remove **todo** comentário entre colchetes:

```python
tree_str = re.sub(r"\[.*?\]", "", tree_str)     # builder.py:363
```

O formato de consenso do MrBayes (`sumt`) tradicionalmente anota a probabilidade posterior de cada clado como comentário do tipo `[&prob=0.95,...]` associado ao ramo — exatamente a sintaxe que este regex apaga, **antes** de qualquer extração de valor. Se essa hipótese estiver certa, é o equivalente para o MrBayes do que [D10](02-defeitos-que-alteram-resultado.md#d10) descreve para o IQ-TREE: o suporte mais caro de calcular (uma cadeia MCMC inteira) seria jogado fora no mesmo método que o gera. **Não confirmo isto empiricamente** — exigiria rodar o MrBayes numa entrada de teste para ver o `.con.tre` bruto antes da limpeza, o que está fora do que este lote pode fazer agora. Registro como hipótese fundamentada, não como fato, e recomendo que entre em [M7.4](../automation/10-marcos-e-metas.md#8-m7--heurísticas-de-inferência-corretas-parametrizáveis-escaláveis) como primeiro item a checar antes de qualquer outro conserto do MrBayes — não adianta consertar semente e convergência se o produto final ainda descarta o suporte.

**Detalhes de integração, ainda presentes.**

- `tmp_dir` continua montado por `os.path.dirname(output_path_tree).split('/PhyloTreeMiner/')[-1]).split('/Trees')[0]` (`builder.py:394`) — caminho **relativo**, dependente do repositório se chamar exatamente `PhyloTreeMiner`, ao contrário dos outros três construtores (que preservam o caminho absoluto). D20, item 1, confirmado ainda aberto.
- `stdin=open(script_path, 'r')` (`builder.py:435`) sem `with` — o descritor não é fechado explicitamente. D20, item 5, confirmado ainda aberto.
- `timeout=3600` fixo (`builder.py:437`), sem relação com `ngen` — um `ngen` maior que o suficiente para estourar uma hora falha por timeout, não por decisão de modelo.

---

## 5. Quadro-resumo

| | FastTree | IQ-TREE | RAxML-NG | MrBayes |
|---|---|---|---|---|
| **Modelo** | GTR sem gama (`-gtr`), fixo | GTR+G fixo (`-m GTR+G`) — ModelFinder desligado | GTR+G fixo, sem seleção por critério | GTR+G (`nst=6 rates=gamma`), fixo |
| **Semente declarável na ferramenta?** | Não (a ferramenta não aceita, nesta chamada) | Sim (`-seed`) | Sim (`--seed`) | Sim (`set seed=`/`set swapseed=`), **não usada** |
| **Semente efetivamente configurável pelo usuário?** | N/A | **Não** — sempre `12345` (§0) | **Não** — sempre `12345` (§0) | Não se aplica; não há semente nenhuma |
| **Paralelização controlada?** | N/A | `-nt 1` fixo, por decisão medida (D21) | `--workers 1` fixo, por decisão medida (D17); `--threads` nominalmente configurável, na prática sempre `4` (§0) | Não declarada |
| **Suporte de ramo produzido?** | Sim, local (SH-like, 0–1), por padrão | Sim, UFBoot (`-bb 1000`, escala 0–100) | Não (sem `--bs-trees`) | Sim em princípio (probabilidade posterior via `sumt`) |
| **Suporte sobrevive ao artefato final?** | Sim — confirmado no Nexus em disco | Sim, no `.treefile` — confirmado no Nexus em disco (atualiza D10 parcialmente) | N/A (não há suporte a preservar) | **Hipótese de que não** — `_clean_mrbayes_tree` apaga colchetes antes de extrair; não confirmado sem rodar |
| **Convergência verificada?** | N/A (não é MCMC) | N/A | N/A | **Não** — ASDSF/ESS calculados pela ferramenta e nunca lidos (D20) |
| **Contagem de réplicas/gerações parametrizável?** | N/A | Não (`-bb 1000` fixo) | N/A (sem bootstrap) | Não (`ngen`/`burnin`/`printfreq`/`samplefreq` fixos; `generations` é parâmetro de função nunca alcançado pelo chamador) |

---

## 6. O que só a máquina de validação/execução real fecha

Estes itens exigem rodar a ferramenta de verdade — proibido neste lote pela reexecução em andamento, e por isso não tentado:

1. **Confirmar a hipótese do §4** sobre o MrBayes: rodar num alinhamento pequeno e inspecionar o `.con.tre` bruto antes de `_clean_mrbayes_tree` processá-lo, para ver se a anotação de probabilidade posterior está de fato entre colchetes e sendo apagada, ou se sai em outro formato que sobrevive.
2. **Determinismo do FastTree entre execuções na mesma máquina** — nunca medido, ao contrário do que D17/D21 fizeram para RAxML-NG/IQ-TREE.
3. **Se o `.confidence` do FastTree/IQ-TREE (achado do §1/§2) chega a `metadata.json`, ao grafo Neo4j e à UI** — isto é código de `Backend/`, fora de `BioComp_UFF`, e portanto fora do escopo deste documento; mas é o teste que decide se D10 está parcialmente fechado ou só parece estar.
4. **Viabilidade da parcimônia em função de `n`** ([M7.5](../automation/10-marcos-e-metas.md#8-m7--heurísticas-de-inferência-corretas-parametrizáveis-escaláveis)) e **curva de custo por método calibrada em ≥ 2 máquinas** ([M7.7](../automation/10-marcos-e-metas.md#8-m7--heurísticas-de-inferência-corretas-parametrizáveis-escaláveis)) — já marcados como bloqueados pela máquina de validação no próprio marco.
5. **Reconciliar DM-2** (`06-decisoes-metodologicas.md`, "o IQ-TREE roda ModelFinder e escolhe sozinho") com o código atual (`-m GTR+G` fixo, §2) — não é execução, mas é decisão de qual dos dois textos está desatualizado, e cabe a quem mantém aquele quadro (A11, mas em revisão do próprio documento, não deste).

---

## Arquivos lidos para produzir esta ficha

- `BioComp_UFF/workflow/tree_construction/builder.py` (inteiro, 512 linhas)
- `BioComp_UFF/workflow/controller/treeBuilderController.py` (cabeçalho/`__init__`, linhas 1-130, e a seção de construtores avançados, linhas 660-860)
- `BioComp_UFF/workflow/utils/external_tools.py` (inteiro)
- `BioComp_UFF/workflow/utils/tool_runs.py` (inteiro)
- `BioComp_UFF/workflow/utils/manifest.py` (cabeçalho e as funções `register_reproducibility`/`register_tool_run`/`tool_versions`)
- `BioComp_UFF/workflow.py` (fluxo de `params['tree_config']` até `TreeBuilderController` e até o manifesto)
- `BioComp_UFF/templates/config.json`
- `Frontend/phylotreeminer/src/components/configures/pipelineConfigurator.jsx` (montagem do `tree_config` enviado ao backend)
- `docs/science/02-defeitos-que-alteram-resultado.md` (D10, D11, D17, D18, D20, D21 — conferidos contra o código atual, não copiados)
- `docs/science/06-decisoes-metodologicas.md` (DM-2, DM-4, DM-5, DM-11 — usado como ponto de partida, com a divergência do §2 registrada)
- `docs/automation/10-marcos-e-metas.md` (§8, definição de M7 e M7.1)
- `Bio/Phylo/NewickIO.py` do ambiente conda do projeto (`~/miniconda3/envs/Phylotreeminer/...`), para confirmar o mecanismo de conversão rótulo-numérico → `.confidence`
- Artefatos em disco, só leitura, fora do write-lock: `BioComp_UFF/projects/Zika_21seq_validacao/out/Trees/tree_dataset_final_mafft_{fasttree,iqtree,raxml}.nexus`

Nenhum arquivo de código foi alterado. Nenhuma ferramenta de bioinformática foi invocada.
