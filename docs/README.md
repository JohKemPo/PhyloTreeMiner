# PhyloTreeMiner — Documentação de Engenharia e Pesquisa

Este diretório é a **memória externa do projeto**: o que foi diagnosticado, o que decidimos fazer, com que rigor, e quem (qual agente) executa cada parte. Foi escrito para ser lido por *outra* janela de contexto — humana ou agente — sem precisar redescobrir nada.

Contexto: o PhyloTreeMiner é a ferramenta de uma pesquisa em **mineração de dados filogenéticos com itens maximais frequentes (FPMax)**. O objetivo declarado é evoluí-la de protótipo de graduação a artefato de software defensável em submissão de alto impacto (Nature), enquadrado como *computação para o bem da saúde pública*. Isso impõe três exigências que atravessam tudo aqui: **reprodutibilidade**, **correção do domínio científico** e **governança de dados (LGPD / ética em pesquisa)**.

## Mapa

| Pasta | O que é | Muda com frequência? |
|---|---|---|
| [`audit/`](audit/README.md) | **Auditoria técnica** (2026-07): 4 causas-raiz, fases 1-3, eixos S/P/C/Arq, aspecto 4, roadmap P0→P4. Cada achado com `arquivo:linha`, trade-offs e riscos. | Não — registro estável (exceto `10-progresso-execucao.md`) |
| [`automation/`](automation/README.md) | **Sistema de execução**: plano mestre em ondas, protocolo de orquestração, diretrizes de engenharia, rigor científico, governança LGPD, riscos/rollback, log vivo — mais a **ficha de fatos**, a **arquitetura de 5 papéis** e os **marcos M0→M6**. | Sim — o log, a ficha e o plano evoluem |
| [`agents/`](agents/README.md) | **Um documento por subagente**: objetivo, responsabilidade, limites, guia passo a passo, diretrizes, *definition of done*, eficiência, documentação e prompt de inicialização copiável. | Raramente — contrato estável |
| [`science/`](science/README.md) | **Parecer científico** sobre os dados que já existem: revisão dos experimentos de *Variola*, registro de defeitos que alteram resultado, definição formal das métricas, agenda de pesquisa e auditoria do grafo Neo4j. | Sim — evolui com cada experimento |
| [`skills/`](skills/README.md) | **Procedimentos reutilizáveis** (formato `SKILL.md`, instaláveis em `.claude/skills/`): golden snapshots, baseline de performance, bateria de segurança, validação científica, mapa de dados LGPD, handoff/PR. | Raramente |
| [`respostasUteis/`](respostasUteis/README.md) | **Respostas metodológicas e conceituais** guardadas para releitura: o *porquê* de uma decisão, separado do registro operacional do ledger. | Sim — uma por assunto que valha reler |

## Como começar (nova janela de contexto)

> **Numa máquina diferente da de desenvolvimento?** Leia [`../CLAUDE.md`](../CLAUDE.md) e [`automation/11-handoff-maquina-de-validacao.md`](automation/11-handoff-maquina-de-validacao.md) **antes** de rodar qualquer coisa pesada. O desenvolvimento e a validação vivem em máquinas separadas, e o handoff diz o que já está conferido, o que espera máquina grande e quais versões de ferramenta divergem.


1. Leia [`automation/08-ficha-de-fatos.md`](automation/08-ficha-de-fatos.md) — **sempre primeiro**. São os fatos já verificados, com o comando que os verificou. Não rediscuta o que está lá; para refutar, traga o comando.
2. Leia [`automation/10-marcos-e-metas.md`](automation/10-marcos-e-metas.md) — em que marco estamos e qual é o gate.
3. Leia [`automation/07-log-de-execucao.md`](automation/07-log-de-execucao.md) — decisões, lotes abertos, write-locks ativos.
4. Abra o contrato do seu papel em [`automation/09-arquitetura-de-agentes.md §2`](automation/09-arquitetura-de-agentes.md) — Planejador, Gerenciador, Desenvolvedor, Revisor de Código ou Validador.
5. Se a sua tarefa toca **resultado científico**, leia [`science/README.md`](science/README.md) — ele diz quais números atuais são publicáveis e quais não são.
6. Se você atua com um **perfil de especialista** (frontend, segurança, Neo4j, domínio…), abra o doc correspondente em [`agents/`](agents/README.md) e execute só o que está no seu escopo.

## Regras invioláveis (resumo — detalhe em `automation/03`)

1. **Nada de commit sem pedido explícito do usuário.**
2. **Golden test antes de mover código.** Sem caracterização da saída atual, refatoração estrutural está proibida.
3. **Domínio científico é sagrado.** Mudança que altera resultado (distância de árvores, extração de metadados, agregação país/região, padrões FPMax) só entra com validação do [agente de domínio](agents/06-dominio-cientifico.md).
4. **Medir antes e depois** em toda mudança de performance; a evidência vai no PR.
5. **Dado pessoal não entra em log, cache, snapshot de teste nem repositório.** Ver [`automation/05-governanca-de-dados-lgpd.md`](automation/05-governanca-de-dados-lgpd.md).
6. **Um arquivo, um dono, por onda.** Paralelismo só entre escopos com *write-lock* disjunto.
7. **Evidência é comando + saída literal.** Prosa não é evidência, e "provavelmente funciona" é motivo de reprovação. Desde [DEC-008](automation/07-log-de-execucao.md) o ambiente executa o stack — `NÃO-EXECUTÁVEL` agora exige razão técnica.
8. **O invariante do baseline não pode mudar.** Monofilia de VARV e clado P-II a 4/4 ([Li *et al.* 2007](automation/10-marcos-e-metas.md)) é o gate científico de toda refatoração a partir de M2.
