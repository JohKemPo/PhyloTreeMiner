# Dataset de referência — VARV-49

Replicação de **Li Y, Carroll DS, Gardner SN, Walsh MC, Vitalis EA, Damon IK.
*On the origin of smallpox: correlating variola phylogenics with historical
smallpox records.* PNAS 2007;104(40):15787-92.**
[doi:10.1073/pnas.0609268104](https://doi.org/10.1073/pnas.0609268104) · PMID 17901212

**Gerado por** `docs/science/scripts/gerar_dataset_referencia.py`.
**Não editar à mão** — regenerar.

## Por que este conjunto

Dos quatro experimentos de *Variola* do projeto, o VARV-49 é o único com
delineamento defensável **e** o único taxonomicamente limpo:

| Conjunto | Composição | Fora de *Orthopoxvirus* |
|---|---|---|
| **VARV-49** | 45 VARV + 2 CMLV + 1 CPXV + 1 TATV | **0 de 49** |
| VARV-52 | 48 VARV + externo | 1 |
| VARV-121 | 77 VARV + 23 MPXV + … | 4 |
| VARV-6 | 4 VARV + externo | 1 de 6 |

Conferido por `docs/science/scripts/auditar_taxonomia.py`.

## O que o portão afirma

Só o **invariante biológico** — não a topologia completa. A razão está em
`expected.json`, campo `tolerance.rationale`: exigir topologia idêntica
reprovaria por troca de máquina, e [D17](../../../../docs/science/02-defeitos-que-alteram-resultado.md#d17)
mediu RF = 8 entre execuções com a mesma semente variando só a paralelização.

| Invariante | Táxons | Verificado neste artefato |
|---|---:|---|
| Monofilia de VARV | 4 (grupo externo) | sim |
| Clado P-II | 6 | sim |
| P-II basal | 10 | sim |

Os três invariantes são recuperados por **todos** os pipelines presentes.

## O que ainda falta

As árvores aqui vêm do artefato **anterior à reexecução** e têm **8
pipelines efetivos**. O M alvo declarado é de 1 alinhadores ×
5 métodos, alcançável só depois de reexecutar na máquina de
validação com a biblioteca completa.

Até lá, `make reference-check` devolve **código 2**: invariante válido, M incompleto.

⚠️ **Divergência de versão a resolver antes da reexecução:** os logs destas
árvores registram FastTree 2.2.0 e RAxML-NG 1.2.2; a máquina de desenvolvimento
tem 2.1.11 e 1.1.0.

## Conferir

```bash
make reference-check          # rápido, sobre estas árvores; roda em qualquer lugar
make reference-check-full     # reexecuta o pipeline; máquina de validação
```
