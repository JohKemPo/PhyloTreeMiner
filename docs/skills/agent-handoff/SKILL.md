---
name: agent-handoff
description: Abrir e fechar um lote de trabalho no PhyloTreeMiner sem perder estado entre janelas de contexto — formato de handoff, relatório, registro no log e empacotamento de PR. Use ao delegar trabalho, ao terminar um lote e ao encerrar uma sessão.
---

# Handoff — trabalho que sobrevive ao fim da janela

O risco mais barato de eliminar neste projeto é **perder contexto entre sessões**: uma janela nova que não sabe o que já foi feito repete trabalho, ou pior, "corrige" o que já estava correto. Estado durável vive em três lugares e apenas neles:

1. [`../../audit/10-progresso-execucao.md`](../../audit/10-progresso-execucao.md) — o que mudou **no código**
2. [`../../automation/07-log-de-execucao.md`](../../automation/07-log-de-execucao.md) — **decisões, medições, pareceres, handoffs**
3. O código e seus testes

## 1. Abrir um lote (orquestrador)

Um lote é bem dimensionado quando cabe em 10 linhas, toca ≤5 arquivos e tem critério de aceite objetivo.

```markdown
## HANDOFF → <agente>  ·  onda <Wn>  ·  lote <n>

**Objetivo (1 frase):**
**Itens da auditoria:** <ex.: B-9, C-3c>  → leia docs/audit/<arquivos>
**Write-lock:** <caminhos exatos que pode editar>
**Proibido tocar:** <caminhos>
**Pré-condições verificadas:** <o que o orquestrador já confirmou, com o comando usado>
**Critério de aceite (objetivo, verificável):**
  - [ ] ...
**Evidência exigida:** <comando + saída | diff | medição antes/depois>
**Limite de escopo:** achado fora deste lote → REGISTRE, não corrija.
**Orçamento:** ~<n> arquivos, ~<n> edições. Estourou? Pare e reporte.
```

Antes de entregar, verifique a pré-condição **no código**, não no log: `Grep` pelo sintoma. A auditoria tem meses e P0/P1 já fecharam vários itens.

## 2. Fechar um lote (especialista)

```markdown
## RELATÓRIO ← <agente>  ·  onda <Wn>  ·  lote <n>

**Feito:** <mudanças, arquivo:linha>
**Critério de aceite:** <item por item: atendido / não atendido / não verificável aqui>
**Evidência:** <saída real de comando; se não pôde executar, DIGA>
**Não verificado:** <o que só o usuário pode confirmar rodando o stack>
**Achados fora de escopo (não corrigidos):** <lista com arquivo:linha>
**Riscos / mudanças de contrato:** <...>
**Rollback:** <como reverter>
```

A seção **Não verificado** é obrigatória e é o que dá credibilidade ao resto. Este ambiente Windows não tem Docker, conda, node nem o ambiente Python do projeto: "verificado estaticamente" e "executado" são categorias diferentes, e confundi-las é motivo de reprovação.

## 3. Registrar no log (orquestrador, antes de responder ao usuário)

Atualize [`../../automation/07-log-de-execucao.md`](../../automation/07-log-de-execucao.md):

- **Estado:** onda, lotes abertos, *write-locks* ativos, o que aguarda decisão do usuário
- **Decisão** nova como `DEC-nnn` (decisão · motivo · consequência · reversível?)
- **Medição** na tabela, com ambiente
- **Parecer científico**, se houve — inclusive com Δ = 0
- **Handoff + relatório** (mantendo os ~10 últimos; arquive o resto ao fim da onda)
- **Achados fora de escopo** na fila de triagem
- **Risco materializado**, se houve, com o controle que falhou

E [`../../audit/10-progresso-execucao.md`](../../audit/10-progresso-execucao.md) se o código mudou.

Ordem importa: **grave primeiro, responda depois.** Se a sessão morrer no meio, o próximo bootstrap precisa retomar sem perguntas.

## 4. Empacotar o PR

```
<Fix|Feat|Doc> | <resumo curto>

Itens da auditoria: <B-9, C-3c>
O que muda de contrato: <ou "nada">
Evidência: <comando + saída, ou medição antes/depois>
Não verificado: <o que exige o stack rodando>
Risco / rollback: <como reverter>
```

Regras: um PR = um lote coeso; refatoração e mudança de comportamento **nunca** no mesmo PR (senão a reversão exige cirurgia); **nenhum commit sem pedido explícito do usuário** ([DEC-003](../../automation/07-log-de-execucao.md)) — isso inclui `git add`.

## 5. Encerrar uma sessão

Checklist antes de fechar a janela:

- [ ] Log atualizado (estado, decisões, evidências, achados)
- [ ] `10-progresso-execucao.md` atualizado se o código mudou
- [ ] Nenhum *write-lock* pendurado sem lote correspondente
- [ ] Pendências do usuário listadas na última resposta
- [ ] Nenhuma decisão importante existindo só na conversa
- [ ] Nenhum commit feito sem pedido

## 6. Retomar em janela nova

Prompt de bootstrap em [`../../automation/README.md`](../../automation/README.md). Ordem de leitura: `automation/README.md` → `01-plano-mestre.md` → `07-log-de-execucao.md` → `audit/10-progresso-execucao.md`. Depois **verifique o gate no código** antes de agir — log otimista é uma das falhas registradas no [registro de riscos](../../automation/06-riscos-e-rollback.md).
