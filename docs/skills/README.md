# Skills — procedimentos reutilizáveis

[← Documentação](../README.md) · [Automação](../automation/README.md) · [Agentes](../agents/README.md)

Procedimentos que se repetem a cada onda. Escritos no formato `SKILL.md` do Claude Code (frontmatter `name` + `description`), então podem ser lidos diretamente **ou** copiados para `.claude/skills/` e invocados como skills reais:

```bash
mkdir -p .claude/skills && cp -r docs/skills/*/ .claude/skills/
```

| Skill | Para quê | Quem usa |
|---|---|---|
| [`golden-snapshot`](golden-snapshot/SKILL.md) | Capturar e validar a saída atual de um endpoint antes de refatorar | [A7](../agents/07-qualidade-e-testes.md), [A3](../agents/03-backend-core.md) |
| [`perf-baseline`](perf-baseline/SKILL.md) | Medir antes/depois com evidência (protocolo `P-0`) | [A4](../agents/04-performance.md), [A5](../agents/05-frontend.md) |
| [`security-probe`](security-probe/SKILL.md) | Bateria de provas contra os vetores da auditoria | [A2](../agents/02-seguranca.md), [A10](../agents/10-revisor.md) |
| [`science-validate`](science-validate/SKILL.md) | Validar mudança que altera resultado científico | [A6](../agents/06-dominio-cientifico.md) |
| [`lgpd-datamap`](lgpd-datamap/SKILL.md) | Varrer o repositório em busca de dado pessoal, segredo e envio a terceiros | [A8](../agents/08-dados-e-governanca.md) |
| [`agent-handoff`](agent-handoff/SKILL.md) | Abrir e fechar um lote sem perder estado entre janelas | [A0](../agents/00-orquestrador.md) e todos |
| [`validar-workflow`](validar-workflow/SKILL.md) | Rodar o pipeline de ponta a ponta no conjunto de validação (Zika-21) e conferir que as correções de M1/M2.5 materializaram nos artefatos | [A11](../agents/11-bioinformatica-inferencia.md), [A7](../agents/07-qualidade-e-testes.md) |

## Restrição de ambiente que atravessa todas

A máquina de desenvolvimento (Windows, este worktree) **não tem** Docker, conda, node/npm nem o ambiente Python do projeto. Toda skill que dependa de execução real distingue duas partes:

- **Parte estática** — o agente faz aqui (escrever script, conferir sintaxe, montar comando, ler código).
- **Parte executável** — o usuário roda em WSL/Linux, e o agente **precisa entregar o comando exato e o resultado esperado**.

Relatório que confunde as duas é reprovado pelo [revisor](../agents/10-revisor.md).
