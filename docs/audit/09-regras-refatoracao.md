# Regras da refatoração

[← Índice](README.md)

Estas regras governam **toda** mudança feita a partir desta auditoria — independentemente de fase, eixo ou prioridade.

- **Strangler-fig:** introduzir interfaces/portas com implementação idêntica à atual primeiro; trocar depois. Cada passo reversível.
- **Golden tests antes de mover:** capturar snapshot da saída atual de cada endpoint pesado (`compare`, `pattern-analysis`, `gen_plot`, `metadata`) antes de extrair serviço.
- **Medir ([P-0](05-eixo-performance.md)) antes/depois** em toda mudança de performance; anexar evidência ao PR.
- **Não construir features ([M-3](08-aspecto4-melhorias-futuras.md)) antes de event loop ([P-1](05-eixo-performance.md)) e segurança (P0/P1 do roadmap).**
- **Domínio científico é sagrado:** bugs [C-5](06-eixo-bugs.md) (quartet, organismo, tabelas de país, `only_first`) mudam **RESULTADOS** — validar contra o artigo publicado / dados de referência antes de alterar.
- **Modelo preferido para execução: fable.** Orquestração e revisão: opus. Usuário valida o stack rodando em WSL/Linux (a máquina Windows deste worktree não roda o stack completo).
- **Nunca commitar sem o usuário pedir explicitamente.**
