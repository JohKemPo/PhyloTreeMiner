# Repositório de Respostas

Respostas do assistente salvas para referência futura, uma por seção, com data e contexto.

---

## 2026-09-02 — Próximos passos após VARV-121 e atualização do plano

**Contexto:** branch `rigor-cientifico-m1-m2`. VARV-121 recém-concluído e validado (D25 confirmado corrigido, oráculo dendropy 45 pares/0 divergências), E4 com segunda réplica registrada, M4 com primeira onda de 4 lotes fechada (M4.1, M4.12, M4.21, M4.22; M4.13 implementado e revertido), M7.1 fechado com o achado D26. Artifact "Plano PhyloTreeMiner" já atualizado com esse estado.

---

Levantamento do estado atual (marcos + dependências já fatiadas) para responder com precisão, não achismo.

### Próximos passos, por prioridade

**1. Fechar M2 (rápido, zona sagrada, vale fazer sozinho antes do resto)**

Só falta: atualizar `Backend/tests/data/reference/expected.json` para `aligners: ["mafft", "mafft_iterative"]` (hoje desatualizado desde DEC-050) + registrar o parecer + rodar `make reference-dataset`. É o único item que falta para o portão sair do código 2. Pequeno, mas exige o protocolo de zona sagrada (parecer antes de regravar o fixture) — não é um lote para paralelizar, é um passo isolado que valeria fazer primeiro e sozinho.

**2. M3 — o resultado principal do artigo (agora destravado, ainda 0/4)**

Com M1 fechado e M2 quase lá, é a hora natural de começar M3 — é literalmente o argumento do artigo (bootstrap × robustez metodológica), hoje jogado fora pelo pipeline. M3.2 é o mesmo trabalho que M7.2.

**3. Continuar M4 (20 de 24 lotes restantes)**

**4. Continuar M7 (7 de 8 lotes restantes)**, com M7.5/M7.7/M7.8 bloqueados até uma execução pesada combinada (curva de custo precisa da máquina de validação).

### O que dá para paralelizar agora — três locks disjuntos, sem conflito

| Trilha | Lote | Por quê já pode começar |
|---|---|---|
| **T1** (`BioComp_UFF/workflow/**`) | **M3.2 / M7.2** — habilitar bootstrap no RAxML-NG (`--bs-trees`) e no FastTree (`-boot`) | Sem dependência declarada; é código, não precisa da máquina pesada para implementar (só para medir custo depois) |
| **T2** (`Backend/src/app.py`) | **M4.2** — logging estruturado, zero `str(e)` vazando | Sem dependência; abre a cadeia serial de M4.4→M4.11 |
| **T4** (`Frontend/`) | **M4.23** — UI trata `503` com banner | Depende de M4.1 e M4.22, **os dois já fechados** |

Essas três não compartilham arquivo nenhum entre si — dá para rodar em paralelo de verdade, do jeito que foi feito com M4/M7.1/E4 na rodada passada.

### O que fica para depois, em série (não em paralelo entre si)

Tudo isto é **T1** e provavelmente toca o mesmo `builder.py`/`treeBuilderController.py` — rodar simultaneamente arriscaria dois agentes editando a mesma região:

- **M3.1** — propagar `confidence` ao Nexus/metadata/grafo (faz mais sentido *depois* de M3.2, para já cobrir o suporte novo do RAxML/FastTree também, não só o do IQ-TREE)
- **Correção de D26** (achado de M7.1, ainda sem lote numerado) — `treeBuilderController.py` passar `tree_config` de verdade ao `TreeBuilder`. Recomendado fazer logo, é pequeno e é uma dívida de honestidade do manifesto
- **M7.3** — reconciliar o modelo de substituição (a divergência com DM-2)
- **M7.4** — MrBayes: semente, `nruns`/`nchains`, recusa por não-convergência
- **M7.6** — falha nunca silenciosa no manifesto

Depois de M4.2, a cadeia T2 segue serial (M4.4→M4.11); depois de M4.14 (que precisa de M4.3, que precisa de M4.2), destrava o T5 inteiro (M4.15→M4.20) e o M4.13 pode voltar.

**Bloqueado até combinarmos uma execução pesada:** M7.5 (viabilidade da parcimônia), M7.7 (curva de custo em ≥2 máquinas), M7.8 (eixo de núcleos) — e o ZIKV-480, que ainda não foi iniciado.
