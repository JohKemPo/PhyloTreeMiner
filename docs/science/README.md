# Ciência — revisão dos experimentos de Variola

[← Documentação](../README.md)

Esta pasta é o **parecer científico** sobre os dados que já existem no repositório: os quatro experimentos de *Variola* em `BioComp_UFF/projects/`, o que a página **Deep Analysis** mostra sobre eles, e o grafo Neo4j em `localhost:7474`. Foi escrita para responder à pergunta que decide a submissão: *quais números daqui podem ir para um artigo, e quais não podem.*

Complementa — não substitui — a [auditoria de engenharia](../audit/README.md). A auditoria pergunta "o código está correto?"; aqui a pergunta é "o **resultado** está correto, e o que ele significa?".

## Mapa

| Documento | O que responde | Para quem |
|---|---|---|
| [`01-revisao-variola.md`](01-revisao-variola.md) | **A revisão completa.** Delineamento, o que os dados de fato mostram, o resultado principal (bootstrap × robustez metodológica), validação contra a literatura, limitações. | Autor, orientador, banca |
| [`02-defeitos-que-alteram-resultado.md`](02-defeitos-que-alteram-resultado.md) | **Registro de defeitos com impacto numérico.** 12 achados, cada um com `arquivo:linha`, evidência, número afetado e correção. Ordenados por severidade. | Agentes [A6](../agents/06-dominio-cientifico.md), [A11](../agents/11-bioinformatica-inferencia.md), [A3](../agents/03-backend-core.md) |
| [`03-metricas.md`](03-metricas.md) | **Definição formal** de cada métrica (RF, suporte de clado, padrão maximal, identidade de clado), suposições, casos degenerados e fonte. É insumo direto de *Methods*. | [A6](../agents/06-dominio-cientifico.md), [A13](../agents/13-escrita-cientifica.md) |
| [`04-agenda-de-pesquisa.md`](04-agenda-de-pesquisa.md) | **O que rodar em seguida** e por quê: 9 experimentos priorizados, com hipótese, delineamento e critério de sucesso. | Autor |
| [`05-grafo-neo4j.md`](05-grafo-neo4j.md) | O que o grafo contém de fato, o que ele responde hoje, e o modelo mínimo para que responda a perguntas científicas. | [A12](../agents/12-neo4j-grafo.md) |
| [`07-gargalos-e-rotas.md`](07-gargalos-e-rotas.md) | **Custo medido de cada método, limites conhecidos e rotas de execução.** O que acontece quando um alinhador ou método de inferência não serve — e por que a política é avisar, não bloquear |

## Como reproduzir os números

Todos os valores citados vêm de `scripts/audit_variola.py`, somente leitura sobre os artefatos já em disco:

```bash
cd BioComp_UFF
python ../docs/science/scripts/audit_variola.py              # todas as seções
python ../docs/science/scripts/audit_variola.py --secao 6    # só bootstrap × método
```

Requisitos: `biopython`, `pandas`. Não é preciso o ambiente bioinformático completo (MAFFT/IQ-TREE etc.) — nada é reinferido.

## Resumo em cinco frases

1. **O fator "alinhador" não existe nos experimentos de Variola.** O Clustal Omega nunca executou (genomas de ~186 kb contra um limite de 20 kb), o controlador trocou silenciosamente por MAFFT e gravou o resultado como `dataset_final_clustalo.aln`. Metade dos oito "pipelines" são arquivos byte a byte idênticos.
2. **O suporte reportado tem denominador inflado por 2×.** "Recuperado por 8/8 pipelines" significa, de fato, 4/4.
3. **A comparação é feita entre clados enraizados**, misturando árvores não enraizadas (FastTree, IQ-TREE, RAxML, NJ) com enraizadas (UPGMA); isso **superestima a discordância em até 100%** — em VARV-6, três métodos que produzem a *mesma* topologia não enraizada aparecem como 75% discordantes.
4. **A coluna `support` do CSV do FPMax guarda o limiar da varredura, não o suporte do padrão.** Todo itemset aparece com 2 a 3 "suportes" diferentes, e a página Deep Analysis exibe o mesmo padrão simultaneamente como "frágil" e "robusto".
5. **Corrigidos esses quatro pontos, existe um resultado forte e replicado**: em três conjuntos independentes (49, 52 e 121 táxons), a monofilia de VARV e o clado P-II (África Ocidental + América do Sul) são recuperados por 100% dos métodos — e **o bootstrap não prediz isso**: em VARV-121, 86 ramos têm UFBoot = 100 e apenas 35 sobrevivem à troca de método.
