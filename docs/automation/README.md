# Sistema de automação da evolução do PhyloTreeMiner

[← Documentação](../README.md)

Este diretório descreve **como a refatoração e a evolução da ferramenta são executadas por agentes**, de ponta a ponta, com rigor científico e governança de dados. A auditoria (`../audit/`) diz *o que* está errado e *por quê*; aqui está *quem faz*, *em que ordem*, *com que prova* e *quando pode passar para a próxima etapa*.

## Estado atual

| Campo | Valor |
|---|---|
| Branch | `main` (a auditoria cita `claude/phylotreeminer-audit-ef6b53`, um worktree em `.claude/worktrees/`) |
| Marco corrente | **M0 — Fundação verificável** (não iniciado) — equivale a W0 |
| Roadmap da auditoria | P0 ✅ · P1 em andamento (batch 1 aplicado, batch 2 pendente) · P2-P4 não iniciados |
| Bloqueio estrutural | **Nenhum teste automatizado no repositório** (nem `pytest`, nem `vitest`, nem CI) — confirmado em 2026-08-19 |
| Ambiente | ✅ **executa o stack completo** (conda, Docker+Neo4j de pé, Node, cadeia bioinformática, dendropy+ete3) — [DEC-008](07-log-de-execucao.md) |
| Aguardando o usuário | validação do plano + **6 decisões** ([ficha §5](08-ficha-de-fatos.md#5-decisões-pendentes-do-usuário-bloqueiam-execução)) |

> A consequência prática: as regras "golden test antes de mover" e "medir antes/depois" **ainda não têm infraestrutura**. Por isso M0 existe e é pré-requisito de tudo. O que mudou em 2026-08-19 é que **agora há ambiente para construí-la e para executá-la** — antes, nem isso.

## Índice

| Documento | Conteúdo |
|---|---|
| [01-plano-mestre.md](01-plano-mestre.md) | Objetivo, definição de sucesso, **ondas W0→W7** com escopo, agentes, gates de saída e mapeamento para os itens da auditoria |
| [02-protocolo-de-orquestracao.md](02-protocolo-de-orquestracao.md) | Como o orquestrador delega, formato de handoff, *write-lock* por arquivo, o que pode rodar em paralelo, escalonamento ao humano |
| [03-diretrizes-de-engenharia.md](03-diretrizes-de-engenharia.md) | Padrões de código, testes, erro/logging, commits e PRs, *definition of done* geral, lista do que nunca fazer |
| [04-rigor-cientifico.md](04-rigor-cientifico.md) | Reprodutibilidade, determinismo, oráculos de validação, benchmarks, manifesto de análise, requisitos de artefato para publicação |
| [05-governanca-de-dados-lgpd.md](05-governanca-de-dados-lgpd.md) | Classificação dos dados tratados, LGPD (incl. dado genético como sensível), Nagoya/SisGen, riscos do demo público, checklists |
| [06-riscos-e-rollback.md](06-riscos-e-rollback.md) | Registro de riscos por onda, sinais de alarme, procedimento de reversão |
| [07-log-de-execucao.md](07-log-de-execucao.md) | **Documento vivo** — decisões (ADR-lite), evidências e handoffs. É onde a próxima janela lê o que aconteceu |
| [08-ficha-de-fatos.md](08-ficha-de-fatos.md) | **Documento vivo** — fatos verificados com o comando que os verificou: ambiente, versões, defeitos reconfirmados linha a linha, baseline, decisões pendentes. **Leitura obrigatória na abertura de toda sessão** — é o antídoto contra delírio e contra reauditoria |
| [09-arquitetura-de-agentes.md](09-arquitetura-de-agentes.md) | **Hierarquia de 5 papéis** (Planejador · Gerenciador · Desenvolvedor · Revisor de Código · Validador), matriz de validação cruzada, loop de execução, arquitetura anti-delírio / anti-perda-de-contexto / anti-desperdício, seis trilhas paralelas |
| [10-marcos-e-metas.md](10-marcos-e-metas.md) | **Marcos M0→M6** com gate executável; o baseline de Li *et al.* (2007) como teste de regressão científica; limitações honestas; quadro das decisões que destravam o plano |
| [11-handoff-maquina-de-validacao.md](11-handoff-maquina-de-validacao.md) | **Ponte entre a máquina de desenvolvimento e a de validação.** Ambiente e divergências de versão, portão de sanidade, o que espera máquina grande (reexecução, RAxML de volta, teste de estresse) e os limites de recurso já conhecidos |
| [12-portabilidade-e-migracao.md](12-portabilidade-e-migracao.md) | **O mapa da independência de hardware.** Os quatro eixos de dependência (memória, núcleos, autoconfiguração, versão), o que já é portável, o que não é, e o procedimento ao ligar numa máquina nova |

Relacionados: [`../agents/`](../agents/README.md) (contrato de cada subagente) e [`../skills/`](../skills/README.md) (procedimentos executáveis).

## Bootstrap: prompt para abrir uma sessão de orquestração

Cole isto numa janela nova para retomar o trabalho sem contexto prévio:

```
Você é o <PAPEL> do PhyloTreeMiner.
(PAPEL ∈ Planejador · Gerenciador · Desenvolvedor · Revisor de Código · Validador)

Leia, nesta ordem, e nada além:
1. docs/automation/08-ficha-de-fatos.md       (fatos verificados — não rediscuta)
2. docs/automation/09-arquitetura-de-agentes.md §2  (seu contrato)
3. docs/automation/10-marcos-e-metas.md       (marco corrente e gate)
4. docs/automation/07-log-de-execucao.md      (estado, lotes abertos, locks)

Regras invioláveis:
- Fato da ficha não se rediscute; para refutar, traga o comando.
- Evidência é comando + saída literal. Prosa não é evidência.
- Fique dentro do seu write-lock. Achado fora de escopo: registre, não corrija.
- Verifique o gate anterior NO CÓDIGO, não no log.
- Nenhum commit sem pedido explícito do usuário.
- Se estourar o orçamento de contexto do seu papel, PARE e reporte.
```

Prompts equivalentes para cada especialista estão no fim de cada documento em [`../agents/`](../agents/README.md).

## Instalação opcional no harness

Os arquivos em `../agents/` e `../skills/` foram escritos em formato compatível com o Claude Code (frontmatter `name`/`description`). Para torná-los invocáveis como subagentes e skills reais neste repositório:

```bash
mkdir -p .claude/agents .claude/skills
cp docs/agents/*.md .claude/agents/          # ignora README.md se preferir: use `ls docs/agents/[0-9]*.md`
cp -r docs/skills/*/ .claude/skills/
```

Isso é **opcional e reversível**: os documentos funcionam igualmente bem sendo apenas lidos/colados. Nada em `docs/` depende dessa instalação.
