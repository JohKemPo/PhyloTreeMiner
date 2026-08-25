# Subagentes — contratos de execução

[← Documentação](../README.md) · [Automação](../automation/README.md)

Cada arquivo aqui é o **contrato de um subagente**: objetivo, responsabilidade, limites, guia de execução, diretrizes, *definition of done*, eficiência, documentação e um prompt de inicialização copiável. Os arquivos têm frontmatter compatível com o Claude Code — podem ser copiados para `.claude/agents/` e passar a ser invocáveis como subagentes reais (ver [instalação](../automation/README.md#instalação-opcional-no-harness)).

## Elenco

| # | Agente | Objetivo em uma frase | Itens da auditoria | Modelo |
|---|---|---|---|---|
| A0 | [Orquestrador](00-orquestrador.md) | Planeja, delega, verifica gates e mantém a memória externa. **Não escreve código.** | — | opus |
| A1 | [Infra & DevEx](01-infra-devex.md) | Fazer o projeto subir em máquina de terceiro com um comando | `P1-3` a `P1-7`, Arq-`A` | fable |
| A2 | [Segurança](02-seguranca.md) | Fechar os vetores exploráveis por visitante anônimo | `S-0`..`S-5`, `B-1`..`B-3` | fable |
| A3 | [Backend Core](03-backend-core.md) | Corretude de contrato e quebra do monólito `app.py` | `B-6`..`B-12`, `C-2`, `C-3`, Arq-`B` | fable |
| A4 | [Performance](04-performance.md) | Desbloquear o event loop e provar cada ganho com medição | `P-0`..`P-5`, `B-4`, `B-5`, `B-11` | fable |
| A5 | [Frontend](05-frontend.md) | UI configurável, sem leak, sem re-render desnecessário | `F-1`..`F-10`, Arq-`C` | fable |
| A6 | [Domínio Científico](06-dominio-cientifico.md) | Garantir que os resultados estão certos — poder de veto | `C-5a`..`C-5e`, `B-10`, `M-3` | opus |
| A7 | [Qualidade & Testes](07-qualidade-e-testes.md) | Construir e manter a rede de segurança (harness, golden tests, CI) | *(novo)* — habilita todo o resto | fable |
| A8 | [Dados & Governança](08-dados-e-governanca.md) | LGPD, ética, proveniência e licenças — poder de veto | `G1`..`G11` | opus |
| A9 | [Documentação & Publicação](09-documentacao-e-publicacao.md) | Tornar o artefato reproduzível e citável por terceiros | checklist de W7 | fable |
| A10 | [Revisor](10-revisor.md) | Reprovar o que não tem evidência. **Não escreve código.** | — | opus |
| A11 | [Bioinformática & Inferência](11-bioinformatica-inferencia.md) | Garantir que as árvores e a interpretação delas se sustentam | pipeline `BioComp_UFF`, QC, amostragem, `M-3` | opus |
| A12 | [Neo4j & Grafo](12-neo4j-grafo.md) | Modelo de dados, Cypher parametrizado, índices por evidência, ingest transacional | `P-3`, modelagem de `B-1`/`S-1` | fable |
| A13 | [Escrita Científica](13-escrita-cientifica.md) | Manuscrito submissível: afirmações sustentadas, figuras, pacote de submissão | — | opus |

Modelo: preferência do usuário é **fable** para escrever código e **opus** para orquestração, revisão e julgamento (domínio científico, inferência, governança, escrita).

## Fronteiras que costumam confundir

| Par | Quem faz o quê |
|---|---|
| [A6](06-dominio-cientifico.md) vs [A11](11-bioinformatica-inferencia.md) | A6: o cálculo **sobre** a árvore recebida está certo (quartet/RF, metadados, FPMax). A11: a árvore **é** uma estimativa defensável, e a interpretação respeita o método (alinhamento, modelo, suporte, amostragem). |
| [A3](03-backend-core.md) vs [A12](12-neo4j-grafo.md) | A3: driver, ciclo de vida, DI, exceção → HTTP. A12: modelo de dados, Cypher, índices, transação de ingest. |
| [A9](09-documentacao-e-publicacao.md) vs [A13](13-escrita-cientifica.md) | A9: o **artefato** (README que funciona, `CITATION.cff`, manifesto, benchmark) — "o revisor consegue rodar?". A13: o **texto** (manuscrito, figuras, carta, rebuttal) — "o revisor se convence?". |
| [A4](04-performance.md) vs [A5](05-frontend.md) | A4 mede e especifica; A5 implementa no frontend. |

## Quem tem poder de veto

Quatro agentes podem **bloquear** um merge, e o orquestrador é obrigado a respeitar:

- **A6 Domínio Científico** — quando a mudança altera um resultado computado.
- **A11 Bioinformática & Inferência** — quando a escolha de inferência ou a interpretação biológica não se sustenta.
- **A8 Dados & Governança** — quando há dado pessoal, segredo ou risco ético.
- **A10 Revisor** — quando falta evidência para o critério de aceite.

## Matriz agente × onda

| | W0 | W1 | W2 | W3 | W4 | W5 | W6 | W7 |
|---|---|---|---|---|---|---|---|---|
| A1 Infra | ● | | | | ● | | | ○ |
| A2 Segurança | | ● | | | | ○ | | ○ |
| A3 Backend | | ○ | | ● | ● | | | |
| A4 Performance | ○ | | ● | ○ | | ● | | ○ |
| A5 Frontend | ○ | ○ | ● | ○ | ● | | ● | |
| A6 Domínio | | | | ● | | | ● | ○ |
| A7 Testes | ● | ○ | ○ | ○ | ○ | ○ | ○ | ○ |
| A8 Governança | ● | ○ | | | | ○ | ○ | ● |
| A9 Documentação | | | | | ○ | | | ● |
| A10 Revisor | ● | ● | ● | ● | ● | ● | ● | ● |
| A11 Bioinformática | ○ | | | ● | | ○ | ● | ○ |
| A12 Neo4j | ○ | ○ | ● | ○ | ● | ○ | | |
| A13 Escrita | | | | | | | ○ | ● |

● líder da onda · ○ participa

A11 e A13 têm um trabalho **contínuo e paralelizável** que não aparece bem na matriz: A11 monta o quadro de decisões metodológicas desde W0 (é insumo do dataset de referência); A13 monta o mapa de afirmações desde que existam resultados, porque reconstruir procedência de figuras no fim é caro e frágil.

## Estrutura de cada documento

1. **Objetivo** — para que o agente existe
2. **Responsabilidade** — itens e arquivos sob sua guarda
3. **Limites** — *write-lock*, o que nunca toca, quando para e pergunta
4. **Guia de execução** — passo a passo do trabalho típico
5. **Diretrizes** — regras técnicas específicas do domínio
6. **Definition of Done** — critérios verificáveis
7. **Eficiência** — modelo, ordem de leitura, orçamento de contexto
8. **Documentação** — o que deve escrever ao terminar
9. **Interfaces** — de quem recebe, para quem entrega
10. **Prompt de inicialização** — bloco copiável para abrir a sessão
