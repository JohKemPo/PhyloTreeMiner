"""Leitura e exposição do suporte de ramo das árvores de um projeto (M3.1).

Este módulo é a metade `Backend/` de M3.1: levar ao usuário o suporte de ramo
que o pipeline já calcula e grava no Nexus (`out/Trees/*.nexus`), sem que ele
chegue à interface como um número solto.

**A regra que organiza tudo aqui:** suporte de ramo *não é uma grandeza só*.
FastTree, IQ-TREE, RAxML-NG e MrBayes produzem quatro coisas diferentes, e
duas delas (UFBoot e FBP) saem na mesma escala 0-100 sem serem a mesma métrica
(DEC-064). Expor um campo genérico ``support: 87`` faria o usuário comparar
FBP com UFBoot como se fossem intercambiáveis — seria pior do que não expor
nada. Por isso todo valor sai daqui acompanhado do método e da métrica que o
produziram, e **nenhum valor é normalizado para uma escala comum**: normalizar
é justamente o convite à comparação que a metodologia não autoriza.

Três armadilhas que este módulo evita por construção:

1. **`InnerNN` não é suporte.** As árvores de distância (NJ/UPGMA) trazem
   `Inner45` como *nome* de nó interno. O Biopython deixa `.confidence` em
   `None` e guarda o rótulo em `.name`. A leitura aqui olha **apenas**
   `.confidence`; nunca cai para `.name`.
2. **Ausência não é zero.** Método que não produz suporte devolve
   ``metrica: null`` com o motivo, e lista de ramos vazia — nunca `0`
   (regra 5 do CLAUDE.md).
3. **Identidade de clado é a bipartição canônica**, reutilizada de
   `workflow.stability.clade_identity` (D3/D5/D13). É o mesmo
   `canonical_item_id` que já identifica o clado em `metadata.json`, no FPMax
   e no Neo4j — então o suporte devolvido aqui junta-se aos padrões minerados
   sem uma segunda fórmula de identidade.
"""

from __future__ import annotations

import os
import statistics
from dataclasses import asdict, dataclass
from typing import Any, Dict, List, Optional

from Bio import Phylo

from workflow.stability.clade_identity import (
    canonical_bipartition,
    canonical_digest,
    canonical_item_id,
    strip_accession_version,
)
from workflow.stability.stability import PipelineLabel

__all__ = [
    "MetricaDeSuporte",
    "METRICA_POR_METODO",
    "SEM_SUPORTE_POR_CONSTRUCAO",
    "NOTA_DE_COMPARABILIDADE",
    "metrica_do_metodo",
    "ler_suporte_de_arquivo",
    "ler_suporte_do_projeto",
]


@dataclass(frozen=True)
class MetricaDeSuporte:
    """Uma métrica de suporte de ramo, com o que é preciso para lê-la certo.

    Attributes
    ----------
    id : str
        Identificador curto e estável (``ufboot``, ``fbp``, ``sh_local``,
        ``posterior``).
    rotulo : str
        Nome por extenso, para exibição.
    natureza : str
        O que a métrica de fato mede. É o campo que impede a leitura
        equivocada de dois valores na mesma escala.
    escala_min, escala_max : float
        Domínio declarado do valor.
    limiar_alto : float or None
        Limiar de "suporte alto" **quando o projeto já o adota**. `None`
        significa que nenhum limiar foi decidido para esta métrica — e `None`
        é a resposta honesta, não um número emprestado de outra métrica.
    observacao : str
        Advertência de leitura que acompanha o valor até a interface.
    """

    id: str
    rotulo: str
    natureza: str
    escala_min: float
    escala_max: float
    limiar_alto: Optional[float]
    observacao: str


#: UFBoot — IQ-TREE, `-bb 1000` (ficha de chamada por método §2).
_UFBOOT = MetricaDeSuporte(
    id="ufboot",
    rotulo="UFBoot — bootstrap ultrarrápido (IQ-TREE, -bb 1000)",
    natureza="bootstrap aproximado; não é o bootstrap não-paramétrico clássico",
    escala_min=0.0,
    escala_max=100.0,
    # 95 não é um limiar inventado aqui: é o que o próprio portão de M3 usa
    # ("0 de 167 ramos com UFBoot >= 95", 10-marcos-e-metas.md §5).
    limiar_alto=95.0,
    observacao=(
        "Mesma escala 0-100 do FBP do RAxML-NG, métrica diferente (DEC-064): "
        "UFBoot é aproximado e sistematicamente menos conservador. "
        "UFBoot >= 95 NÃO equivale a FBP >= 95."
    ),
)

#: FBP — RAxML-NG, `--all --bs-trees 1000`, a partir de M3.2/DEC-064.
_FBP = MetricaDeSuporte(
    id="fbp",
    rotulo="FBP — Felsenstein bootstrap proportion (RAxML-NG, --all --bs-trees 1000)",
    natureza="bootstrap não-paramétrico clássico",
    escala_min=0.0,
    escala_max=100.0,
    # O projeto ainda não decidiu um limiar para FBP. Emprestar o 95 do UFBoot
    # seria exatamente o erro que este módulo existe para evitar.
    limiar_alto=None,
    observacao=(
        "Mesma escala 0-100 do UFBoot do IQ-TREE, métrica diferente (DEC-064). "
        "Nenhum limiar de suporte alto foi decidido para FBP neste projeto; "
        "o limiar do UFBoot não se aplica."
    ),
)

#: Suporte local do FastTree, ligado por padrão (ficha §1).
_SH_LOCAL = MetricaDeSuporte(
    id="sh_local",
    rotulo="Suporte local tipo Shimodaira-Hasegawa (FastTree, padrão)",
    natureza=(
        "teste local de reamostragem em torno de um ramo; não é bootstrap "
        "não-paramétrico global"
    ),
    escala_min=0.0,
    escala_max=1.0,
    limiar_alto=None,
    observacao=(
        "Escala 0-1, não 0-100: um valor de 0,95 aqui não é comparável a 95 de "
        "UFBoot ou de FBP, nem por reescala. Nenhum limiar foi decidido para "
        "esta métrica neste projeto."
    ),
)

#: Probabilidade posterior do MrBayes (`sumt`). Ver a ressalva em `observacao`.
_POSTERIOR = MetricaDeSuporte(
    id="posterior",
    rotulo="Probabilidade posterior (MrBayes, sumt)",
    natureza="probabilidade posterior bayesiana",
    escala_min=0.0,
    escala_max=1.0,
    limiar_alto=None,
    observacao=(
        "Probabilidade posterior é sistematicamente mais alta que bootstrap "
        "para o mesmo ramo e não deve ser lida no mesmo limiar. Além disso, a "
        "ficha de chamada por método registra a hipótese, não confirmada, de "
        "que `_clean_mrbayes_tree` remove os colchetes antes da extração — se "
        "nenhum ramo trouxer valor, é esse o suspeito. Um resultado bayesiano "
        "também exige diagnóstico de convergência (ESS/PSRF/ASDSF), que este "
        "endpoint não tem como conferir."
    ),
)

#: Métrica de suporte por método de inferência, indexada como
#: `PipelineLabel.inference` (mesma tupla `INFERENCE_METHODS` do submódulo).
METRICA_POR_METODO: Dict[str, MetricaDeSuporte] = {
    "iqtree": _UFBOOT,
    "raxml": _FBP,
    "fasttree": _SH_LOCAL,
    "mrbayes": _POSTERIOR,
}

#: Métodos que, por construção, não produzem suporte de ramo nenhum: uma árvore
#: de distância ou de parcimônia sem reamostragem tem uma topologia e nada mais.
#: Devolver `0` para eles seria inventar um número (regra 5).
SEM_SUPORTE_POR_CONSTRUCAO: Dict[str, str] = {
    "nj_distance": "método de distância sem reamostragem: não há suporte de ramo a reportar",
    "upgma_distance": "método de distância sem reamostragem: não há suporte de ramo a reportar",
    "nj_parsimony": "método de parcimônia sem reamostragem: não há suporte de ramo a reportar",
    "upgma_parsimony": "método de parcimônia sem reamostragem: não há suporte de ramo a reportar",
    "parsimony": "método de parcimônia sem reamostragem: não há suporte de ramo a reportar",
}

NOTA_DE_COMPARABILIDADE = (
    "Os valores de suporte NÃO são comparáveis entre métodos de inferência. "
    "UFBoot (IQ-TREE) e FBP (RAxML-NG) compartilham a escala 0-100 sem serem a "
    "mesma métrica; o suporte local do FastTree é 0-1 e mede outra coisa; a "
    "probabilidade posterior do MrBayes é outra coisa ainda. Nenhum valor é "
    "normalizado por esta API justamente para não sugerir essa comparação. "
    "Comparar métodos entre si é o que a distância entre árvores e a mineração "
    "de padrões fazem — não a leitura lado a lado de dois números de suporte."
)


def metrica_do_metodo(inference: str) -> Optional[MetricaDeSuporte]:
    """Métrica de suporte esperada para um método de inferência, ou `None`."""
    return METRICA_POR_METODO.get(inference)


def _valor_de_confianca(clade) -> Optional[float]:
    """Suporte de um clado, lido **só** de `.confidence`.

    O `.name` de nó interno é deliberadamente ignorado: nas árvores de NJ/UPGMA
    ele carrega `Inner45`, que é identificador de nó e não suporte. Promover
    `.name` a suporte inventaria valores onde não há nenhum.
    """
    bruto = getattr(clade, "confidence", None)
    if bruto is None:
        return None
    try:
        return float(bruto)
    except (TypeError, ValueError):
        return None


def _ramos_com_identidade(tree) -> List[Dict[str, Any]]:
    """Ramos internos informativos, com identidade canônica e suporte cru.

    Rótulos de terminal passam por `strip_accession_version` antes de qualquer
    identidade (D13: IQ-TREE e RAxML truncam `NC_008030.1` em `NC_008030.`), e
    a identidade é a **bipartição canônica** (D3), não o clado como escrito —
    o clado depende de onde o arquivo pôs a raiz, que é convenção de escrita.
    """
    terminais = tree.get_terminals()
    todos = frozenset(strip_accession_version(t.name) for t in terminais if t.name)

    vistos = set()
    ramos: List[Dict[str, Any]] = []

    for clade in tree.find_clades():
        if clade.is_terminal():
            continue
        taxa = frozenset(
            strip_accession_version(t.name) for t in clade.get_terminals() if t.name
        )
        bipart = canonical_bipartition(taxa, todos)
        if bipart is None:
            # Aresta externa ou clado universal: não carrega informação
            # topológica, e é onde a raiz do arquivo costuma cair.
            continue
        if bipart in vistos:
            continue
        vistos.add(bipart)
        ramos.append({
            "clade_id": canonical_item_id(bipart),
            "digest": canonical_digest(bipart),
            "n_taxa": len(bipart),
            "taxa": sorted(bipart),
            "valor_bruto": _valor_de_confianca(clade),
        })

    return ramos


def ler_suporte_de_arquivo(caminho: str,
                           formato: str = "nexus",
                           prefixo: str = "tree_dataset_final_") -> Dict[str, Any]:
    """Suporte de ramo de um arquivo de árvore, com método e métrica de origem.

    Parameters
    ----------
    caminho : str
        Caminho do arquivo de árvore (tipicamente `out/Trees/*.nexus`).
    formato : str, optional
        Formato aceito por `Bio.Phylo.parse`.
    prefixo : str, optional
        Prefixo removido do nome antes de decompor o pipeline, o mesmo que
        `TreeSet.from_directory` usa.

    Return
    ------
    dict
        Bloco da árvore, pronto para serializar. `metrica` é `None` — com
        `metrica_ausente_porque` preenchido — sempre que o método não declara
        uma métrica de suporte.
    """
    arquivo = os.path.basename(caminho)
    rotulo = PipelineLabel.parse(arquivo, prefix=prefixo)
    metrica = metrica_do_metodo(rotulo.inference)

    avisos: List[str] = []

    arvores = list(Phylo.parse(caminho, formato))
    if not arvores:
        return {
            "arquivo": arquivo,
            "pipeline": rotulo.name,
            "alinhador": rotulo.aligner,
            "metodo": rotulo.inference,
            "metrica": asdict(metrica) if metrica else None,
            "metrica_ausente_porque": None if metrica else _motivo_sem_metrica(rotulo.inference),
            "suporte_presente": False,
            "ramos_internos": 0,
            "ramos_com_suporte": 0,
            "ramos_sem_suporte": 0,
            "ramos": [],
            "resumo": None,
            "avisos": [f"Nenhuma árvore legível em '{arquivo}'."],
        }
    if len(arvores) > 1:
        avisos.append(
            f"O arquivo traz {len(arvores)} árvores; só a primeira foi lida, "
            "como no restante do pipeline."
        )

    ramos_crus = _ramos_com_identidade(arvores[0])
    com_valor = [r for r in ramos_crus if r["valor_bruto"] is not None]

    if metrica is None:
        # Sem métrica declarada não há como rotular o número; devolver o valor
        # cru seria devolver um suporte sem unidade. A lista sai vazia e o
        # motivo vai explícito.
        if com_valor:
            avisos.append(
                f"{len(com_valor)} ramos trazem valor numérico, mas o método "
                f"'{rotulo.inference}' não tem métrica de suporte declarada — "
                "os valores foram omitidos em vez de rotulados por adivinhação. "
                "Se o método passou a produzir suporte, registre a métrica em "
                "`METRICA_POR_METODO` antes de expor o número."
            )
        return {
            "arquivo": arquivo,
            "pipeline": rotulo.name,
            "alinhador": rotulo.aligner,
            "metodo": rotulo.inference,
            "metrica": None,
            "metrica_ausente_porque": _motivo_sem_metrica(rotulo.inference),
            "suporte_presente": False,
            "ramos_internos": len(ramos_crus),
            "ramos_com_suporte": 0,
            "ramos_sem_suporte": len(ramos_crus),
            "ramos": [],
            "resumo": None,
            "avisos": avisos,
        }

    fora_da_escala = [
        r["valor_bruto"] for r in com_valor
        if not (metrica.escala_min <= r["valor_bruto"] <= metrica.escala_max)
    ]
    if fora_da_escala:
        avisos.append(
            f"{len(fora_da_escala)} valores fora da escala declarada "
            f"[{metrica.escala_min}, {metrica.escala_max}] de {metrica.id} "
            f"(ex.: {fora_da_escala[:3]}). A métrica associada ao método pode "
            "estar errada — não leia estes valores antes de conferir."
        )

    if not com_valor and ramos_crus:
        motivo = (
            "O método declara produzir suporte, mas nenhum ramo do artefato o "
            "traz."
        )
        if rotulo.inference == "raxml":
            motivo += (
                " Para RAxML-NG, o suspeito é o artefato ser anterior a "
                "M3.2/DEC-064, quando `--all --bs-trees 1000` foi habilitado: "
                "só a reexecução materializa o FBP."
            )
        avisos.append(motivo)

    ramos = [
        {
            "clade_id": r["clade_id"],
            "digest": r["digest"],
            "n_taxa": r["n_taxa"],
            "taxa": r["taxa"],
            # Rastreabilidade método -> métrica repetida em CADA ramo, de
            # propósito: nenhum consumidor consegue ler o valor sem ler de
            # onde ele veio, nem misturando ramos de árvores diferentes.
            "valor": r["valor_bruto"],
            "metrica": metrica.id,
            "metodo": rotulo.inference,
            "escala": [metrica.escala_min, metrica.escala_max],
        }
        for r in ramos_crus
        if r["valor_bruto"] is not None
    ]

    valores = [r["valor"] for r in ramos]
    resumo = None
    if valores:
        resumo = {
            "minimo": min(valores),
            "maximo": max(valores),
            "mediana": statistics.median(valores),
            "media": sum(valores) / len(valores),
        }
        if metrica.limiar_alto is not None:
            resumo["acima_do_limiar_alto"] = sum(
                1 for v in valores if v >= metrica.limiar_alto)
            resumo["limiar_alto"] = metrica.limiar_alto

    return {
        "arquivo": arquivo,
        "pipeline": rotulo.name,
        "alinhador": rotulo.aligner,
        "metodo": rotulo.inference,
        "metrica": asdict(metrica),
        "metrica_ausente_porque": None,
        "suporte_presente": bool(ramos),
        "ramos_internos": len(ramos_crus),
        "ramos_com_suporte": len(ramos),
        "ramos_sem_suporte": len(ramos_crus) - len(ramos),
        "ramos": ramos,
        "resumo": resumo,
        "avisos": avisos,
    }


def _motivo_sem_metrica(inference: str) -> str:
    """Por que este método não tem métrica de suporte declarada."""
    if inference in SEM_SUPORTE_POR_CONSTRUCAO:
        return SEM_SUPORTE_POR_CONSTRUCAO[inference]
    if inference == "unknown":
        return (
            "O método de inferência não foi reconhecido no nome do arquivo; sem "
            "método não há métrica, e um valor de suporte sem métrica não é "
            "interpretável."
        )
    return (
        f"Método '{inference}' não tem métrica de suporte declarada em "
        "`METRICA_POR_METODO`."
    )


def ler_suporte_do_projeto(dir_trees: str,
                           arquivo: Optional[str] = None,
                           sufixo: str = ".nexus") -> Dict[str, Any]:
    """Suporte de ramo de todas as árvores de um `out/Trees` (ou de uma só).

    Parameters
    ----------
    dir_trees : str
        Diretório `out/Trees` do projeto.
    arquivo : str or None, optional
        Nome de um único arquivo a ler. `None` lê todos os que casam `sufixo`.
    sufixo : str, optional
        Sufixo dos arquivos considerados.

    Return
    ------
    dict
        `{"arvores": [...], "comparabilidade": {...}, "metricas_presentes": [...]}`.
    """
    if arquivo is not None:
        alvos = [arquivo]
    else:
        alvos = sorted(n for n in os.listdir(dir_trees) if n.endswith(sufixo))

    arvores = [ler_suporte_de_arquivo(os.path.join(dir_trees, nome)) for nome in alvos]

    metricas = sorted({a["metrica"]["id"] for a in arvores if a["metrica"]})

    return {
        "arvores": arvores,
        "metricas_presentes": metricas,
        "comparabilidade": {
            "entre_metodos": False,
            "valores_normalizados": False,
            "nota": NOTA_DE_COMPARABILIDADE,
        },
        "identidade_de_clado": (
            "`clade_id` é o `canonical_item_id` da bipartição canônica (D3), o "
            "mesmo identificador usado em metadata.json, no FPMax e no Neo4j — "
            "então o mesmo ramo tem o mesmo `clade_id` em árvores de métodos "
            "diferentes, e é por ele que se comparam os suportes do MESMO ramo."
        ),
    }
