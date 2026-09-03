#!/usr/bin/env python
"""
Resultado principal do artigo — M3.4.

Regenera, por um comando, as tabelas cruzadas **bootstrap × suporte
metodológico** dos conjuntos de *Variola* e assere as duas afirmações do
argumento do artigo ([`01-revisao-variola.md §4.4`](../01-revisao-variola.md)).

Uso
---
    cd BioComp_UFF
    python ../docs/science/scripts/resultado_principal.py
    python ../docs/science/scripts/resultado_principal.py --json
    python ../docs/science/scripts/resultado_principal.py --conjunto VARV-49

Definição formal das duas grandezas cruzadas
--------------------------------------------
Sejam ``T_iq`` a árvore de máxima verossimilhança do IQ-TREE gravada em
``out/Trees/tree_dataset_final_mafft_iqtree.nexus`` e ``b`` uma bipartição não
trivial de ``T_iq``.

**Bootstrap (UFBoot).** ``ufboot(b) ∈ [0, 100]`` é o suporte de *ultrafast
bootstrap* que o IQ-TREE atribuiu ao ramo que induz ``b``, sobre 1000 réplicas
de reamostragem de colunas do **mesmo** alinhamento sob o **mesmo** modelo. Mede
variância **amostral**, condicionada ao pipeline.
Fonte: Minh, Nguyen & von Haeseler (2013), *Mol. Biol. Evol.* 30:1188-1195,
doi:10.1093/molbev/mst024.

**Suporte metodológico.** Dado um universo ``P`` de ``M`` pipelines aplicados
aos **mesmos** dados, ``sup(b) = |{p ∈ P : b ∈ B(T_p)}| / M`` — a fração de
pipelines que recuperam ``b``. Mede variância **metodológica**, com os dados
fixos. Definição em [`03-metricas.md §4.1`](../03-metricas.md); implementação em
``workflow.stability.StabilityAnalyzer`` (bipartição canônica, D3 corrigido).

As duas são ortogonais por construção: uma varia os dados com o método fixo, a
outra varia o método com os dados fixos.

As duas afirmações que este script assere
-----------------------------------------
**(i) UFBoot máximo não garante robustez metodológica.** Existe ramo com
``ufboot = 100`` que **não** é recuperado por todos os pipelines do universo —
e a proporção que sobrevive é reportada, não fixada. O portão exige a
*existência* da falha, não um valor específico: os valores herdados de
[`01-revisao-variola.md §4.4`](../01-revisao-variola.md) (35/86, 13/27, 14/30)
foram medidos **antes** das correções de D1/D3/D4/D5 e da reexecução, e entram
aqui apenas como coluna de comparação.

(i) é uma afirmação sobre uma **distribuição**, então só é asserida onde há
distribuição a examinar: sobre os conjuntos declarados ``principal`` e com pelo
menos ``MINIMO_RAMOS_PARA_I`` ramos em UFBoot = 100. Um conjunto com um único
ramo nessa faixa não confirma nem refuta — declará-lo "violação" seria ler ruído
como resultado, e declará-lo "sustenta" seria pior. VARV-6 (n = 6, 3 ramos
internos) é exatamente esse caso: entra no relatório, não entra no portão.
Conjunto principal sem amostra suficiente conta como reprodução **incompleta**
(código 2), nunca como aprovação silenciosa.

**(ii) UFBoot alto é necessário, não suficiente.** Nenhum ramo com
``ufboot >= 95`` é recuperado por um **único** pipeline. Esta é uma afirmação de
contagem exata (zero) e é asserida como tal.

Universos de pipelines
----------------------
"Sobreviver à troca de método de inferência" exige **fixar o alinhador** e variar
só a inferência. Com a reexecução, o braço ``mafft`` tem 5 métodos, então:

===========  ===  ==================================================
Universo      M   O que responde
===========  ===  ==================================================
``mafft-5``   5   **principal** — robustez à troca de inferência
``mafft-4``   4   comparabilidade com §4.4 (mesmos 4 métodos de 2026-08-19)
``todos``    10   robustez ao pipeline inteiro (inferência **e** alinhador)
===========  ===  ==================================================

Os três são impressos. Só o principal e o de comparabilidade entram na tabela de
diff; ``todos`` responde a outra pergunta e é reportado como secundário.

Três códigos de saída, não dois
-------------------------------
    0   as duas afirmações valem E a reprodução está completa
    2   as duas afirmações valem, reprodução INCOMPLETA (conjunto bloqueado,
        árvore ML sem suporte de ramo, ou oráculo indisponível)
    1   alguma afirmação está VIOLADA — o argumento do artigo não se sustenta
        nestes dados

Colapsar 1 e 2 ensinaria a ignorar o portão: "ainda não terminamos" e "quebrou"
são estados diferentes. Enquanto VARV-52 não for reexecutado, 2 é o esperado.
"""

from __future__ import annotations

import argparse
import glob
import json
import math
import os
import re
import sys
from collections import Counter, defaultdict
from typing import Dict, FrozenSet, List, Optional, Sequence, Set, Tuple

sys.path.insert(0, os.path.abspath("."))

# `TreeSet.from_directory` já normaliza os rótulos com
# `strip_accession_version` (D13: IQ-TREE e RAxML truncam a versão do acesso).
# Este script não renormaliza nada por conta própria — uma segunda cópia da
# normalização é a forma de D5.
try:
    from workflow.stability.clade_identity import canonical_bipartition
    from workflow.stability.stability import (PipelineLabel, StabilityAnalyzer,
                                              TreeSet)
except ImportError as erro:  # pragma: no cover - só ocorre com cwd errado
    raise SystemExit(
        f"não achei o pacote `workflow` a partir de {os.path.abspath('.')}: {erro}\n"
        "Este script lê os artefatos por caminho relativo e precisa rodar de "
        "dentro de BioComp_UFF, como os demais de docs/science/scripts:\n"
        "    cd BioComp_UFF && python ../docs/science/scripts/resultado_principal.py\n"
        "Pelo Makefile da raiz: make main-result"
    ) from erro

VERDE, VERMELHO, AMARELO, DIM, FIM = (
    "\033[32m", "\033[31m", "\033[33m", "\033[2m", "\033[0m")

#: Tolerância declarada para toda comparação de ponto flutuante deste script
#: (`04-rigor-cientifico §3`: tolerância declarada, nunca `==`).
TOLERANCIA = 1e-9

#: Faixas de UFBoot, na mesma partição usada em `01-revisao-variola.md §4.4`.
#: O limite superior é 100,0 exato — comparar com `>=` e tolerância porque o
#: valor chega como float lido de texto.
FAIXAS = ("100", "95-99", "70-94", "<70")

#: Métodos cuja árvore deveria carregar suporte de ramo. NJ e UPGMA são métodos
#: de distância sem reamostragem no pipeline atual: ausência de suporte ali é
#: esperada, não defeito. A escala difere por método e **nunca** é misturada:
#: IQ-TREE grava UFBoot em 0-100, FastTree grava suporte local tipo SH em 0-1,
#: RAxML-NG grava FBP em 0-100 (só a partir de DEC-064).
SUPORTE_ESPERADO = {"iqtree": "UFBoot 0-100",
                    "raxml": "FBP 0-100 (a partir de DEC-064)",
                    "fasttree": "SH-like local 0-1",
                    "mrbayes": "probabilidade posterior 0-1"}


class Conjunto:
    """
    Um experimento de *Variola* e o estado do artefato em disco.

    Attributes
    ----------
    rotulo : str
        Nome curto do conjunto (ex.: ``VARV-49``).
    projeto : str or None
        Caminho do projeto reexecutado e validado, ou ``None`` se bloqueado.
    bloqueio : str or None
        Motivo do bloqueio, quando ``projeto`` é ``None``.
    principal : bool
        Se entra nas três tabelas exigidas pelo portão de M3.
    """

    def __init__(self, rotulo: str, projeto: Optional[str],
                 bloqueio: Optional[str] = None, principal: bool = True) -> None:
        self.rotulo = rotulo
        self.projeto = projeto
        self.bloqueio = bloqueio
        self.principal = principal


#: Os três conjuntos do portão de M3, mais VARV-6 como auxiliar.
#:
#: VARV-52 **não tem reexecução corrigida em disco**. Os dois diretórios que
#: existem (`projects/teste52` e `projects/test_variola_noITRs_57_Complete`) são
#: anteriores a M1/M2: têm o braço `clustalo` que D1 mostrou ser cópia byte a
#: byte do `mafft`, não têm o braço `mafft_iterative`, e não têm `manifest.json`.
#: Usá-los produziria um número plausível e errado — exatamente o defeito que
#: `04-rigor-cientifico` proíbe. O conjunto fica declarado como pendência.
CONJUNTOS = [
    Conjunto("VARV-49", "projects/Variola_VARV49_reexec_20260901"),
    Conjunto("VARV-52", None,
             bloqueio="requer reexecução — nenhum artefato pós-M1/M2 em disco "
                      "(só `projects/teste52` e "
                      "`projects/test_variola_noITRs_57_Complete`, ambos com o "
                      "braço `clustalo` de D1, sem `mafft_iterative` e sem "
                      "manifesto)"),
    Conjunto("VARV-121", "projects/Variola_VARV121_reexec_20260901"),
    Conjunto("VARV-6", "projects/Variola_VARV6_reexec_20260901", principal=False),
]

#: Artefatos **anteriores** às correções, usados só por `--caracterizar`.
#:
#: Caracterização (`04-rigor-cientifico §3`, passo 1): rodar este mesmo caminho
#: de cálculo sobre os artefatos de onde `01-revisao-variola §4.4` tirou seus
#: números deve devolver exatamente aqueles números. Se devolver, o Δ observado
#: sobre os artefatos reexecutados é dos **dados**, não do código — e é isso que
#: separa "o resultado mudou" de "eu quebrei a medição".
PRE_CORRECAO = {
    "VARV-49": "projects/Variola_Yu_li_2007",
    "VARV-121": "projects/Variola_Yu_li_2007_200seq",
    "VARV-6": "projects/Variola_Yu_li_2007_noITRs_6seqs",
    "VARV-52": "projects/test_variola_noITRs_57_Complete",
}

#: Universo principal e universo de comparabilidade, por método de inferência.
#: `mafft-4` reproduz exatamente o conjunto de métodos de `01-revisao-variola
#: §4.4` (2026-08-19), quando o RAxML ainda não fazia parte do delineamento.
UNIVERSOS = {
    "mafft-5": ("mafft", ("fasttree", "iqtree", "nj_distance",
                          "upgma_distance", "raxml")),
    "mafft-4": ("mafft", ("fasttree", "iqtree", "nj_distance",
                          "upgma_distance")),
}
UNIVERSO_PRINCIPAL = "mafft-5"
UNIVERSO_COMPARAVEL = "mafft-4"

#: Números herdados de `01-revisao-variola.md §4.4`, medidos em 2026-08-19 sobre
#: os artefatos **anteriores** às correções de D1/D3/D4/D5 e às reexecuções.
#: São **expectativa a confrontar, não alvo a reproduzir**: se divergirem, o
#: número novo é o resultado e a divergência é o que se documenta.
HERANCA = {
    # rótulo: (ramos com UFBoot=100, quantos deles a M/M, ramos com UFBoot>=95,
    #          idiossincráticos com UFBoot>=95, Pearson)
    "VARV-49":  (27, 13, 34, 0, 0.44),
    "VARV-52":  (30, 14, 38, 0, 0.27),
    "VARV-121": (86, 35, 94, 0, 0.37),
    "VARV-6":   (1,   1,  1, 0, None),
}

#: Faixa de Pearson herdada de `03-metricas §4.1`. Hipótese a confirmar — o
#: portão **não** reprova por sair dela.
PEARSON_HERDADO = (0.27, 0.44)

#: Mínimo de ramos em UFBoot = 100 para que a afirmação (i) seja testável.
#: Abaixo disso a "existência de um ramo que não sobrevive" é indistinguível de
#: acidente amostral, nos dois sentidos.
MINIMO_RAMOS_PARA_I = 5


# --------------------------------------------------------------------------- #
# Utilidades
# --------------------------------------------------------------------------- #

def faixa_ufboot(valor: float) -> str:
    """
    Classifica um valor de UFBoot na partição de `01-revisao-variola §4.4`.

    Parameters
    ----------
    valor : float
        Suporte de ultrafast bootstrap, em 0-100.

    Return
    ------
    str
        Um de ``"100"``, ``"95-99"``, ``"70-94"``, ``"<70"``.
    """
    if valor >= 100.0 - TOLERANCIA:
        return "100"
    if valor >= 95.0 - TOLERANCIA:
        return "95-99"
    if valor >= 70.0 - TOLERANCIA:
        return "70-94"
    return "<70"


def pearson(xs: Sequence[float], ys: Sequence[float]) -> Optional[float]:
    """
    Correlação de Pearson, ou ``None`` quando indefinida.

    Indefinida quando há menos de dois pontos ou quando uma das variáveis é
    constante (variância zero) — nesses casos o coeficiente **não existe**, e
    devolver ``0`` faria "sem correlação medível" passar por "sem correlação"
    (`04-rigor-cientifico §3`: "não aplicável" nunca é um número).

    Parameters
    ----------
    xs, ys : sequence of float
        Amostras pareadas, do mesmo tamanho.

    Return
    ------
    float or None
        Coeficiente em [-1, 1], ou ``None`` se indefinido.
    """
    n = len(xs)
    if n < 2 or n != len(ys):
        return None
    mx, my = sum(xs) / n, sum(ys) / n
    sxx = sum((a - mx) ** 2 for a in xs)
    syy = sum((b - my) ** 2 for b in ys)
    if math.isclose(sxx, 0.0, abs_tol=TOLERANCIA) or math.isclose(syy, 0.0, abs_tol=TOLERANCIA):
        return None
    numerador = sum((a - mx) * (b - my) for a, b in zip(xs, ys))
    return numerador / math.sqrt(sxx * syy)


def pipelines_do_universo(tree_set: TreeSet, alinhador: str,
                          inferencias: Sequence[str]) -> List[str]:
    """
    Seleciona os pipelines de um universo, por rótulo decomposto.

    A seleção é feita sobre `PipelineLabel`, não sobre substring do nome do
    arquivo: ``mafft`` é prefixo de ``mafft_iterative`` e um casamento textual
    juntaria os dois braços num só universo (foi a forma de D25).

    Parameters
    ----------
    tree_set : TreeSet
        Conjunto de árvores carregado de ``out/Trees``.
    alinhador : str
        Alinhador a fixar.
    inferencias : sequence of str
        Métodos de inferência admitidos.

    Return
    ------
    list of str
        Rótulos de pipeline presentes, em ordem determinística.
    """
    admitidos = set(inferencias)
    return sorted(nome for nome, rotulo in tree_set.labels.items()
                  if rotulo.aligner == alinhador and rotulo.inference in admitidos)


def ocorrencias(analisador: StabilityAnalyzer,
                pipelines: Sequence[str]) -> Dict[FrozenSet[str], Set[str]]:
    """
    Mapeia cada bipartição ao conjunto de pipelines do universo que a recuperam.

    Parameters
    ----------
    analisador : StabilityAnalyzer
        Analisador construído sobre o conjunto completo de árvores.
    pipelines : sequence of str
        Universo considerado.

    Return
    ------
    dict
        Bipartição -> conjunto de pipelines.
    """
    mapa: Dict[FrozenSet[str], Set[str]] = defaultdict(set)
    for nome in pipelines:
        for bipart in analisador.clade_sets[nome]:
            mapa[bipart].add(nome)
    return dict(mapa)


def ramos_com_ufboot(tree_set: TreeSet, fonte: str
                     ) -> List[Tuple[float, FrozenSet[str]]]:
    """
    Extrai (UFBoot, bipartição) de cada ramo interno da árvore do IQ-TREE.

    A fonte é a árvore de produção — a mesma que participa do cálculo de suporte
    metodológico. Cruzar o `.contree` (consenso das réplicas) com o suporte
    calculado sobre os `.nexus` compararia ramos de uma árvore que não está no
    universo de pipelines.

    Parameters
    ----------
    tree_set : TreeSet
        Conjunto carregado de ``out/Trees``.
    fonte : str
        Rótulo do pipeline IQ-TREE (ex.: ``mafft_iqtree``).

    Return
    ------
    list of (float, frozenset)
        Um par por ramo interno não trivial com suporte; ordenado por UFBoot
        decrescente e, em empate, pela bipartição — determinismo antes de agregar.
    """
    todos = frozenset(tree_set.taxa)
    linhas: List[Tuple[float, FrozenSet[str]]] = []
    for clado in tree_set.trees[fonte].get_nonterminals():
        bipart = canonical_bipartition(
            frozenset(t.name for t in clado.get_terminals()), todos)
        if bipart is None or clado.confidence is None:
            continue
        linhas.append((float(clado.confidence), bipart))
    linhas.sort(key=lambda par: (-par[0], sorted(par[1])))
    return linhas


# --------------------------------------------------------------------------- #
# Oráculo independente — dendropy
# --------------------------------------------------------------------------- #

_VERSAO = re.compile(r"\.\d*$")


def oraculo_dendropy(diretorio: str, analisador: StabilityAnalyzer,
                     bipartições: Sequence[FrozenSet[str]]
                     ) -> Tuple[Optional[int], Optional[int], str]:
    """
    Confere, contra o dendropy, a pertinência de cada bipartição em cada árvore.

    O suporte metodológico é uma contagem de pertinência: ``b ∈ B(T_p)``. O
    oráculo refaz **essa** decisão por um caminho que não compartilha nenhuma
    linha com a produção: o dendropy lê o Nexus, codifica as bipartições e
    normaliza o *split bitmask* pela sua própria máquina. Só o conjunto de
    rótulos é compartilhado.

    Trata as duas armadilhas de `oraculo_rf_dendropy.py`: D13 (rótulos truncados
    — cada arquivo é lido no próprio namespace e só depois reunido) e
    ``force-unrooted`` (comparar bipartições, não clados).

    Parameters
    ----------
    diretorio : str
        ``out/Trees`` do projeto.
    analisador : StabilityAnalyzer
        Lado de produção.
    bipartições : sequence of frozenset
        Bipartições a conferir (as da árvore do IQ-TREE).

    Return
    ------
    (int or None, int or None, str)
        Testes realizados, divergências e uma nota. ``(None, None, motivo)``
        quando o oráculo não pôde rodar — indisponibilidade não vira aprovação.
    """
    try:
        import dendropy
    except ImportError:
        return None, None, "dendropy ausente no ambiente"

    newicks: Dict[str, str] = {}
    for caminho in sorted(glob.glob(os.path.join(diretorio, "*.nexus"))):
        nome = PipelineLabel.parse(caminho, prefix="tree_dataset_final_").name
        if nome in newicks:
            continue
        arvore = dendropy.Tree.get(path=caminho, schema="nexus",
                                   rooting="force-unrooted",
                                   preserve_underscores=True)
        for taxon in arvore.taxon_namespace:
            taxon.label = _VERSAO.sub("", taxon.label.strip().strip("'\""))
        newicks[nome] = arvore.as_string(schema="newick", suppress_rooting=True)

    espaco = dendropy.TaxonNamespace()
    codificacao: Dict[str, Set[int]] = {}
    mascara_total = 0
    for nome, texto in sorted(newicks.items()):
        arvore = dendropy.Tree.get(data=texto, schema="newick",
                                   taxon_namespace=espaco,
                                   rooting="force-unrooted",
                                   preserve_underscores=True)
        arvore.encode_bipartitions()
        codificacao[nome] = set(arvore.split_bitmask_edge_map)
        mascara_total = arvore.seed_node.edge.bipartition.leafset_bitmask

    def normalizar(rotulos: FrozenSet[str]) -> int:
        bruta = espaco.taxa_bitmask(labels=sorted(rotulos))
        return dendropy.Bipartition(bitmask=bruta,
                                    tree_leafset_bitmask=mascara_total,
                                    is_mutable=False,
                                    compile_bipartition=True).split_bitmask

    testes = divergencias = 0
    for bipart in bipartições:
        alvo = normalizar(bipart)
        for nome in sorted(codificacao):
            if nome not in analisador.clade_sets:
                continue
            testes += 1
            if (alvo in codificacao[nome]) != (bipart in analisador.clade_sets[nome]):
                divergencias += 1
    return testes, divergencias, "dendropy.encode_bipartitions / split_bitmask"


# --------------------------------------------------------------------------- #
# Análise de um conjunto
# --------------------------------------------------------------------------- #

def procedencia(projeto: str, fonte: str) -> Dict[str, Optional[str]]:
    """
    Extrai a procedência dos valores de UFBoot: versão do inferidor e chamada.

    "Versão de ferramenta muda resultado" é regra deste projeto, e o Δ desta
    tabela contra `01-revisao-variola §4.4` é exatamente disso: o alinhamento é
    byte a byte o mesmo, o inferidor não. Sem esta linha ao lado da tabela, o
    número não é rastreável até a execução que o produziu.

    Parameters
    ----------
    projeto : str
        Raiz do projeto.
    fonte : str
        Rótulo do pipeline IQ-TREE (ex.: ``mafft_iqtree``).

    Return
    ------
    dict
        ``versao``, ``chamada`` e ``semente``; cada campo é ``None`` quando o
        log não os traz — jamais um valor inventado.
    """
    caminho = os.path.join(projeto, "out", "tmp",
                           f"iqtree_tree_dataset_final_{fonte}",
                           f"tree_dataset_final_{fonte}.log")
    dados: Dict[str, Optional[str]] = {"versao": None, "chamada": None,
                                       "semente": None, "log": None}
    if not os.path.exists(caminho):
        return dados
    dados["log"] = caminho
    with open(caminho, encoding="utf-8", errors="replace") as arquivo:
        for linha in arquivo:
            texto = linha.strip()
            if dados["versao"] is None and texto.startswith("IQ-TREE "):
                dados["versao"] = texto
            elif dados["chamada"] is None and texto.startswith("Command:"):
                # Só as opções: o caminho absoluto do arquivo de entrada é do
                # ambiente de quem rodou, não do resultado.
                dados["chamada"] = " ".join(
                    p for p in texto.split()[1:] if p.startswith("-")
                    or (p.startswith("GTR") or p.isdigit()))
            elif dados["semente"] is None and texto.startswith("Seed:"):
                dados["semente"] = texto
            if all(dados[c] for c in ("versao", "chamada", "semente")):
                break
    return dados


def digest_do_alinhamento(projeto: str, alinhador: str) -> Optional[str]:
    """
    MD5 do alinhamento de entrada, para amarrar o número ao insumo.

    Parameters
    ----------
    projeto : str
        Raiz do projeto.
    alinhador : str
        Nome do braço de alinhamento (ex.: ``mafft``).

    Return
    ------
    str or None
        Digest em hexadecimal, ou ``None`` se o arquivo não existe.
    """
    import hashlib

    caminho = os.path.join(projeto, "out", "Align", f"dataset_final_{alinhador}.aln")
    if not os.path.exists(caminho):
        return None
    digest = hashlib.md5()
    with open(caminho, "rb") as arquivo:
        for bloco in iter(lambda: arquivo.read(1 << 20), b""):
            digest.update(bloco)
    return digest.hexdigest()


def inventario_de_suporte(tree_set: TreeSet) -> List[Dict[str, object]]:
    """
    Diz, por árvore, se ela carrega suporte de ramo e em que escala.

    Parameters
    ----------
    tree_set : TreeSet
        Conjunto carregado de ``out/Trees``.

    Return
    ------
    list of dict
        Um registro por pipeline, ordenado por nome.
    """
    linhas: List[Dict[str, object]] = []
    for nome in sorted(tree_set.trees):
        rotulo = tree_set.labels[nome]
        valores = [c.confidence for c in tree_set.trees[nome].get_nonterminals()
                   if c.confidence is not None]
        esperado = SUPORTE_ESPERADO.get(rotulo.inference)
        linhas.append({
            "pipeline": nome,
            "inferencia": rotulo.inference,
            "com_suporte": len(valores),
            "minimo": min(valores) if valores else None,
            "maximo": max(valores) if valores else None,
            "escala_esperada": esperado,
            "deveria_ter": esperado is not None,
            "falta": esperado is not None and not valores,
        })
    return linhas


def analisar(conjunto: Conjunto) -> Dict[str, object]:
    """
    Produz a tabela cruzada e as contagens das duas afirmações, por universo.

    Parameters
    ----------
    conjunto : Conjunto
        Conjunto a analisar; deve ter ``projeto`` não nulo.

    Return
    ------
    dict
        Resultado serializável, com chave ``"erro"`` quando o artefato não
        permite a análise (nunca um número inventado no lugar).
    """
    diretorio = os.path.join(conjunto.projeto, "out", "Trees")
    if not os.path.isdir(diretorio):
        return {"rotulo": conjunto.rotulo, "principal": conjunto.principal, "erro": f"{diretorio} ausente"}

    tree_set = TreeSet.from_directory(diretorio)
    if tree_set.n_taxa < 4:
        # Bipartição não trivial exige n >= 4 (`03-metricas §3`). Abaixo disso a
        # grandeza não existe; não há número a devolver.
        return {"rotulo": conjunto.rotulo, "principal": conjunto.principal,
                "erro": f"n={tree_set.n_taxa} < 4: nenhuma bipartição não trivial"}

    analisador = StabilityAnalyzer(tree_set)
    contagens = analisador.bipartition_counts()
    maximo_binario = tree_set.n_taxa - 3
    politomias = {n: c for n, c in contagens.items() if c < maximo_binario}

    fonte = next((n for n in sorted(tree_set.trees)
                  if tree_set.labels[n].inference == "iqtree"
                  and tree_set.labels[n].aligner == "mafft"), None)
    if fonte is None:
        return {"rotulo": conjunto.rotulo, "principal": conjunto.principal,
                "erro": "nenhuma árvore mafft_iqtree — sem fonte de UFBoot"}

    linhas = ramos_com_ufboot(tree_set, fonte)
    if not linhas:
        return {"rotulo": conjunto.rotulo, "principal": conjunto.principal,
                "erro": f"'{fonte}' não carrega suporte de ramo (D10 aberto "
                        f"neste artefato)"}

    universos: Dict[str, object] = {}
    for nome_universo, (alinhador, inferencias) in UNIVERSOS.items():
        pipes = pipelines_do_universo(tree_set, alinhador, inferencias)
        universos[nome_universo] = _tabela(linhas, analisador, pipes)
    universos["todos"] = _tabela(linhas, analisador, sorted(tree_set.trees))

    testes, divergencias, nota = oraculo_dendropy(
        diretorio, analisador, [b for _, b in linhas])

    return {
        "rotulo": conjunto.rotulo,
        "principal": conjunto.principal,
        "projeto": conjunto.projeto,
        "n_taxa": tree_set.n_taxa,
        "M_disco": len(tree_set),
        "fonte_ufboot": fonte,
        "ramos": len(linhas),
        "bipartition_counts": contagens,
        "maximo_binario": maximo_binario,
        "politomias": politomias,
        "procedencia": procedencia(conjunto.projeto, fonte),
        "md5_alinhamento": digest_do_alinhamento(
            conjunto.projeto, tree_set.labels[fonte].aligner),
        "inventario_suporte": inventario_de_suporte(tree_set),
        "universos": universos,
        "oraculo": {"testes": testes, "divergencias": divergencias, "nota": nota},
    }


def _tabela(linhas: Sequence[Tuple[float, FrozenSet[str]]],
            analisador: StabilityAnalyzer,
            pipelines: Sequence[str]) -> Dict[str, object]:
    """
    Tabela cruzada UFBoot x suporte metodológico para um universo de pipelines.

    Parameters
    ----------
    linhas : sequence of (float, frozenset)
        Ramos do IQ-TREE, com UFBoot e bipartição.
    analisador : StabilityAnalyzer
        Lado de produção.
    pipelines : sequence of str
        Universo.

    Return
    ------
    dict
        ``M``, a matriz faixa x k, as contagens das duas afirmações e Pearson.
    """
    m = len(pipelines)
    if m == 0:
        return {"M": 0, "erro": "universo vazio — nenhum pipeline casa o filtro"}

    mapa = ocorrencias(analisador, pipelines)
    suportes = [len(mapa.get(bipart, ())) for _, bipart in linhas]

    matriz: Dict[str, Counter] = defaultdict(Counter)
    for (boot, _), k in zip(linhas, suportes):
        matriz[faixa_ufboot(boot)][k] += 1

    maximo = [par for par, k in zip(linhas, suportes) if faixa_ufboot(par[0]) == "100"]
    maximo_universal = sum(1 for par, k in zip(linhas, suportes)
                           if faixa_ufboot(par[0]) == "100" and k == m)
    altos = [(par, k) for par, k in zip(linhas, suportes) if par[0] >= 95.0 - TOLERANCIA]
    idiossincraticos = sum(1 for _, k in altos if k == 1)

    return {
        "M": m,
        "pipelines": list(pipelines),
        "matriz": {faixa: {str(k): matriz[faixa].get(k, 0) for k in range(m, 0, -1)}
                   for faixa in FAIXAS if matriz[faixa]},
        "ufboot_100": len(maximo),
        "ufboot_100_universal": maximo_universal,
        "ufboot_95mais": len(altos),
        "ufboot_95mais_idiossincratico": idiossincraticos,
        "pearson": pearson([par[0] for par in linhas], [float(k) for k in suportes]),
    }


# --------------------------------------------------------------------------- #
# Impressão
# --------------------------------------------------------------------------- #

def _cabecalho(titulo: str) -> None:
    print("\n" + "═" * 78)
    print(f"  {titulo}")
    print("═" * 78)


def imprimir_conjunto(resultado: Dict[str, object]) -> None:
    """Imprime o bloco de um conjunto: inventário, tabelas e oráculo."""
    rotulo = resultado["rotulo"]
    if "erro" in resultado:
        print(f"\n  {VERMELHO}{rotulo}: {resultado['erro']}{FIM}")
        return

    print(f"\n  {rotulo}  n={resultado['n_taxa']}  "
          f"árvores em disco={resultado['M_disco']}  "
          f"fonte de UFBoot={resultado['fonte_ufboot']}  "
          f"ramos internos com suporte={resultado['ramos']}")

    proc = resultado["procedencia"]
    print(f"    {DIM}procedência do UFBoot: "
          f"{proc['versao'] or 'versão do inferidor NÃO registrada'}{FIM}")
    print(f"    {DIM}  chamada: {proc['chamada'] or '(não registrada)'}"
          f"   ·   {proc['semente'] or 'semente não registrada'}{FIM}")
    print(f"    {DIM}  md5 do alinhamento: "
          f"{resultado['md5_alinhamento'] or '(alinhamento ausente)'}{FIM}")

    if resultado["politomias"]:
        print(f"    {AMARELO}politomia: {resultado['politomias']} "
              f"(|B| < n-3 = {resultado['maximo_binario']}){FIM}")
    else:
        print(f"    {DIM}|B(T)| = n-3 = {resultado['maximo_binario']} em todos os "
              f"pipelines — nenhuma politomia{FIM}")

    faltando = [linha for linha in resultado["inventario_suporte"] if linha["falta"]]
    for linha in resultado["inventario_suporte"]:
        if not linha["deveria_ter"]:
            continue
        if linha["falta"]:
            print(f"    {AMARELO}sem suporte de ramo: {linha['pipeline']:32s} "
                  f"(esperado {linha['escala_esperada']}){FIM}")
        else:
            print(f"    {DIM}suporte de ramo: {linha['pipeline']:32s} "
                  f"{linha['com_suporte']:4d} ramos, "
                  f"{linha['minimo']}-{linha['maximo']} "
                  f"({linha['escala_esperada']}){FIM}")
    if not faltando:
        print(f"    {VERDE}toda árvore de método com suporte esperado o carrega{FIM}")

    for nome_universo in list(UNIVERSOS) + ["todos"]:
        tabela = resultado["universos"][nome_universo]
        marca = " (principal)" if nome_universo == UNIVERSO_PRINCIPAL else (
            " (comparável a §4.4)" if nome_universo == UNIVERSO_COMPARAVEL else " (secundário)")
        if "erro" in tabela:
            print(f"\n    universo {nome_universo}{marca}: "
                  f"{VERMELHO}{tabela['erro']}{FIM}")
            continue
        m = tabela["M"]
        print(f"\n    universo {nome_universo}{marca} — M={m}: "
              f"{', '.join(p.replace('mafft_', '') for p in tabela['pipelines'])}")
        print(f"      {'UFBoot':>7s} | " +
              " ".join(f"{k}/{m}".rjust(6) for k in range(m, 0, -1)) + "    total")
        for faixa in FAIXAS:
            linha = tabela["matriz"].get(faixa)
            if not linha:
                continue
            print(f"      {faixa:>7s} | " +
                  " ".join(str(linha[str(k)]).rjust(6) for k in range(m, 0, -1)) +
                  f"    {sum(linha.values()):5d}")
        correlacao = tabela["pearson"]
        print(f"      Pearson(UFBoot, suporte metodológico) = "
              f"{'indefinido' if correlacao is None else format(correlacao, '.3f')}")

    oraculo = resultado["oraculo"]
    if oraculo["testes"] is None:
        print(f"\n    {AMARELO}oráculo NÃO executado: {oraculo['nota']}{FIM}")
    else:
        cor = VERDE if oraculo["divergencias"] == 0 else VERMELHO
        print(f"\n    {cor}oráculo dendropy: {oraculo['testes']} testes de "
              f"pertinência, {oraculo['divergencias']} divergência(s){FIM}"
              f"  {DIM}[{oraculo['nota']}]{FIM}")


def imprimir_diff(resultados: List[Dict[str, object]]) -> None:
    """Tabela de diff contra os números herdados de `01-revisao-variola §4.4`."""
    _cabecalho("Diff de resultado — herdado (2026-08-19, pré-correção) × agora")
    print(f"{DIM}  Coluna 'herdado' = medição anterior às correções de "
          f"D1/D3/D4/D5 e às reexecuções.\n"
          f"  É hipótese a confrontar, NÃO alvo a reproduzir. Universo "
          f"{UNIVERSO_COMPARAVEL} (mesmos 4 métodos).{FIM}\n")
    cabecalho = (f"  {'conjunto':10s} {'métrica':28s} {'herdado':>9s} "
                 f"{'agora':>9s} {'Δ':>9s}  afeta número publicado?")
    print(cabecalho)
    print("  " + "-" * (len(cabecalho) - 2))

    for resultado in resultados:
        rotulo = resultado["rotulo"]
        herdado = HERANCA.get(rotulo)
        if herdado is None:
            continue
        if "erro" in resultado:
            print(f"  {rotulo:10s} {'(todas)':28s} {'—':>9s} {'—':>9s} {'—':>9s}"
                  f"  {AMARELO}bloqueado — não medido{FIM}")
            continue
        tabela = resultado["universos"][UNIVERSO_COMPARAVEL]
        if "erro" in tabela:
            continue
        pares = [
            ("ramos com UFBoot=100", herdado[0], tabela["ufboot_100"]),
            ("... deles a M/M", herdado[1], tabela["ufboot_100_universal"]),
            ("ramos com UFBoot>=95", herdado[2], tabela["ufboot_95mais"]),
            ("... deles a 1/M", herdado[3], tabela["ufboot_95mais_idiossincratico"]),
        ]
        for nome, antes, depois in pares:
            delta = depois - antes
            nota = "não" if delta == 0 else "SIM — número de §4.4 muda"
            celula = (f"{delta:+9d}" if delta == 0
                      else f"{AMARELO}{delta:+9d}{FIM}")
            print(f"  {rotulo:10s} {nome:28s} {antes:9d} {depois:9d} "
                  f"{celula}  {nota}")
        antes_r, depois_r = herdado[4], tabela["pearson"]
        if antes_r is not None and depois_r is not None:
            delta_r = depois_r - antes_r
            # Tolerância de 5e-3: os valores herdados de §4.4 estão publicados
            # com duas casas, então Δ menor que meia unidade da última casa é
            # arredondamento, não mudança de resultado.
            igual = math.isclose(delta_r, 0.0, abs_tol=5e-3)
            celula = (f"{delta_r:+9.3f}" if igual
                      else f"{AMARELO}{delta_r:+9.3f}{FIM}")
            print(f"  {rotulo:10s} {'Pearson':28s} {antes_r:9.3f} {depois_r:9.3f} "
                  f"{celula}  {'não' if igual else 'SIM — número de §4.4 muda'}")

    print(f"\n{DIM}  Sobre a linha 'Pearson': §4.4 calculou o coeficiente sobre o "
          f"`.contree` (consenso das\n"
          f"  réplicas de bootstrap); este script usa a árvore de produção em "
          f"`out/Trees/`, que é a\n"
          f"  que participa do suporte metodológico. As duas diferem em 2 "
          f"bipartições, e é daí que\n"
          f"  vem o Δ de Pearson — inclusive no modo `--caracterizar`, onde "
          f"todas as CONTAGENS batem.\n"
          f"  Cruzar ramos do `.contree` com suporte medido nos `.nexus` "
          f"compararia ramos de uma\n"
          f"  árvore que não está no universo de pipelines; a troca de fonte é "
          f"deliberada.{FIM}")


def avaliar(resultados: Sequence[Dict[str, object]]) -> Dict[str, object]:
    """
    Assere as duas afirmações do artigo sobre o universo principal.

    (i) é asseverada como **existência de falha** — há ramo com UFBoot = 100 que
    não sobrevive à troca de método —, e apenas sobre conjuntos principais com
    amostra suficiente (``MINIMO_RAMOS_PARA_I``). A proporção é reportada, nunca
    fixada. (ii) é asseverada como **contagem exata zero**, em todo conjunto
    medido: ali basta um contraexemplo, e um contraexemplo não depende de
    tamanho de amostra.

    Parameters
    ----------
    resultados : sequence of dict
        Saída de `analisar`, um por conjunto.

    "Não medida" **não** é "violada". Um lote que só encontrou conjunto
    bloqueado devolve ``i_violada = False`` com ``conjuntos_testados_i = 0`` — o
    portão então reprova por reprodução incompleta (código 2), nunca por
    afirmação falsa (código 1). Colapsar os dois faria o portão acusar o artigo
    de estar errado sempre que faltasse um artefato em disco.

    Return
    ------
    dict
        ``i_violada``, ``ii_violada``, ``conjuntos_testados_i``, ``avisos`` e as
        linhas já formatáveis de cada afirmação — a mesma avaliação serve à
        saída em texto e à saída JSON, para que as duas não possam divergir.
    """
    avisos: List[str] = []
    linhas_i: List[Dict[str, object]] = []
    linhas_ii: List[Dict[str, object]] = []
    i_violada = ii_violada = False
    testados = 0

    for resultado in resultados:
        rotulo = resultado["rotulo"]
        principal = bool(resultado.get("principal"))
        if "erro" in resultado:
            avisos.append(f"{rotulo}: {resultado['erro']}")
            continue
        tabela = resultado["universos"][UNIVERSO_PRINCIPAL]
        if "erro" in tabela:
            avisos.append(f"{rotulo}: universo {UNIVERSO_PRINCIPAL} — {tabela['erro']}")
            continue

        total = tabela["ufboot_100"]
        universal = tabela["ufboot_100_universal"]
        if not principal:
            veredito, motivo = "auxiliar", "conjunto auxiliar — fora do portão"
        elif total < MINIMO_RAMOS_PARA_I:
            veredito = "nao_testavel"
            motivo = (f"só {total} ramo(s) em UFBoot=100 — abaixo de "
                      f"{MINIMO_RAMOS_PARA_I}, a afirmação não é testável")
            avisos.append(f"{rotulo}: (i) não testável ({motivo})")
        else:
            testados += 1
            sustenta = universal < total
            i_violada = i_violada or not sustenta
            veredito, motivo = ("sustenta" if sustenta else "VIOLADA"), ""
        linhas_i.append({"rotulo": rotulo, "M": tabela["M"], "total": total,
                         "universal": universal, "veredito": veredito,
                         "motivo": motivo})

        altos = tabela["ufboot_95mais"]
        idio = tabela["ufboot_95mais_idiossincratico"]
        ok = idio == 0
        ii_violada = ii_violada or not ok
        linhas_ii.append({"rotulo": rotulo, "M": tabela["M"], "altos": altos,
                          "idiossincraticos": idio,
                          "veredito": "sustenta" if ok else "VIOLADA"})

    if testados == 0:
        avisos.append("(i) não foi testada em nenhum conjunto principal — "
                      "o portão não tem sobre o que se pronunciar; isso é "
                      "reprodução incompleta, não afirmação falsa")

    return {"i_violada": i_violada, "ii_violada": ii_violada, "avisos": avisos,
            "linhas_i": linhas_i, "linhas_ii": linhas_ii,
            "conjuntos_testados_i": testados}


def imprimir_afirmacoes(veredito: Dict[str, object]) -> None:
    """Imprime as duas afirmações já avaliadas por `avaliar`."""
    _cabecalho("As duas afirmações do argumento do artigo")

    print(f"\n  (i) UFBoot = 100 não garante robustez metodológica")
    print(f"      universo {UNIVERSO_PRINCIPAL} — alinhador fixo, inferência variada\n")
    print(f"      {'conjunto':10s} {'M':>3s} {'UFBoot=100':>11s} {'sobrevivem':>11s} "
          f"{'%':>7s}   veredito")
    for linha in veredito["linhas_i"]:
        total = linha["total"]
        proporcao = f"{linha['universal'] / total:6.1%}" if total else "     —"
        cor = {"sustenta": VERDE, "VIOLADA": VERMELHO}.get(linha["veredito"], AMARELO)
        print(f"      {linha['rotulo']:10s} {linha['M']:3d} {total:11d} "
              f"{linha['universal']:11d} {proporcao}   "
              f"{cor}{linha['veredito']}{FIM}"
              f"{'  ' + DIM + linha['motivo'] + FIM if linha['motivo'] else ''}")

    print(f"\n  (ii) UFBoot alto é necessário, não suficiente")
    print(f"       nenhum ramo com UFBoot >= 95 recuperado por um único pipeline\n")
    print(f"       {'conjunto':10s} {'M':>3s} {'UFBoot>=95':>11s} "
          f"{'idiossincráticos':>17s}   veredito")
    soma_altos = soma_idio = 0
    for linha in veredito["linhas_ii"]:
        soma_altos += linha["altos"]
        soma_idio += linha["idiossincraticos"]
        cor = VERDE if linha["veredito"] == "sustenta" else VERMELHO
        print(f"       {linha['rotulo']:10s} {linha['M']:3d} {linha['altos']:11d} "
              f"{linha['idiossincraticos']:17d}   {cor}{linha['veredito']}{FIM}")
    print(f"\n       {DIM}total nos conjuntos medidos: {soma_idio} de {soma_altos}"
          f"  (§4.4 dizia '0 de 167', somando os quatro conjuntos "
          f"pré-correção, VARV-52 incluído){FIM}")


# --------------------------------------------------------------------------- #
# Ponto de entrada
# --------------------------------------------------------------------------- #

def main(argv: Optional[List[str]] = None) -> int:
    """Ponto de entrada de linha de comando."""
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--conjunto", action="append",
                        choices=[c.rotulo for c in CONJUNTOS],
                        help="Restringe a análise ao(s) conjunto(s) indicado(s).")
    parser.add_argument("--json", action="store_true", help="saída em JSON")
    parser.add_argument("--caracterizar", action="store_true",
                        help="roda sobre os artefatos PRÉ-correção, de onde §4.4 "
                             "tirou seus números. Serve para provar que o Δ é "
                             "dos dados e não deste código; não é o portão.")
    args = parser.parse_args(argv)

    alvos = [c for c in CONJUNTOS
             if not args.conjunto or c.rotulo in args.conjunto]
    if args.caracterizar:
        alvos = [Conjunto(c.rotulo, PRE_CORRECAO.get(c.rotulo),
                          bloqueio=f"sem artefato pré-correção mapeado para "
                                   f"{c.rotulo}",
                          principal=c.principal)
                 for c in alvos]
        alvos = [c for c in alvos
                 if c.projeto is None or os.path.isdir(c.projeto)]
    bloqueados = [c for c in alvos if c.projeto is None]
    resultados = [analisar(c) for c in alvos if c.projeto is not None]

    veredito = avaliar(resultados)
    sem_suporte = [(r["rotulo"], linha["pipeline"])
                   for r in resultados if "erro" not in r
                   for linha in r["inventario_suporte"] if linha["falta"]]
    sem_oraculo = [r["rotulo"] for r in resultados
                   if "erro" not in r and r["oraculo"]["testes"] is None]
    com_divergencia = [r["rotulo"] for r in resultados
                       if "erro" not in r and r["oraculo"]["divergencias"]]
    incompleto = bool(bloqueados or sem_suporte or sem_oraculo
                      or veredito["avisos"]
                      or veredito["conjuntos_testados_i"] == 0
                      or any("erro" in r for r in resultados))
    violada = veredito["i_violada"] or veredito["ii_violada"]

    if args.json:
        # Em modo JSON a saída é só o JSON: prosa depois dele quebraria
        # `json.loads(stdout)` em qualquer consumidor. A avaliação é a MESMA de
        # `avaliar` que a saída em texto usa — duas cópias divergiriam.
        print(json.dumps({
            "afirmacao_i_violada": veredito["i_violada"],
            "afirmacao_ii_violada": veredito["ii_violada"],
            "conjuntos_testados_i": veredito["conjuntos_testados_i"],
            "afirmacao_i": veredito["linhas_i"],
            "afirmacao_ii": veredito["linhas_ii"],
            "oraculo_divergiu_em": com_divergencia,
            "reproducao_completa": not incompleto,
            "avisos": veredito["avisos"],
            "bloqueados": [{"rotulo": c.rotulo, "motivo": c.bloqueio}
                           for c in bloqueados],
            "conjuntos": resultados,
        }, indent=2, ensure_ascii=False, default=lambda o: sorted(o)))
        if com_divergencia or violada:
            return 1
        return 2 if incompleto else 0

    if args.caracterizar:
        _cabecalho("CARACTERIZAÇÃO — o mesmo cálculo sobre os artefatos "
                   "PRÉ-correção")
        print(f"{AMARELO}  Isto NÃO é o portão de M3. É o passo 1 de "
              f"04-rigor-cientifico §3: se a tabela de\n"
              f"  diff abaixo sair toda com Δ = 0, este código reproduz "
              f"§4.4 e o Δ do modo\n  normal é dos DADOS, não da medição.{FIM}")

    _cabecalho("RESULTADO PRINCIPAL — bootstrap × robustez metodológica (M3.4)")
    print(f"{DIM}  UFBoot: Minh, Nguyen & von Haeseler (2013) MBE 30:1188-95 · "
          f"doi:10.1093/molbev/mst024\n"
          f"  Suporte metodológico: docs/science/03-metricas.md §4.1\n"
          f"  Tabelas herdadas: docs/science/01-revisao-variola.md §4.4 "
          f"(2026-08-19, pré-correção){FIM}")

    _cabecalho("Tabelas cruzadas por conjunto")
    for resultado in resultados:
        imprimir_conjunto(resultado)

    if bloqueados:
        _cabecalho("Pendências — conjuntos sem artefato válido")
        for conjunto in bloqueados:
            print(f"\n  {VERMELHO}{conjunto.rotulo}: BLOQUEADO{FIM} — "
                  f"{conjunto.bloqueio}")
            print(f"  {DIM}Nenhuma tabela é produzida para este conjunto. "
                  f'"Não aplicável" nunca é um número:{FIM}')
            print(f"  {DIM}usar o artefato antigo daria um resultado plausível "
                  f"e errado.{FIM}")

    imprimir_diff(resultados)
    imprimir_afirmacoes(veredito)

    _cabecalho("Veredito")
    if com_divergencia:
        print(f"  {VERMELHO}✗ Oráculo dendropy divergiu em: "
              f"{', '.join(com_divergencia)}{FIM}")
        print(f"  {VERMELHO}  Divergência é dado a investigar, não ruído a "
              f"ignorar — nenhum número acima é aceitável até que se explique.{FIM}")
        return 1
    if violada:
        print(f"  {VERMELHO}✗ AFIRMAÇÃO VIOLADA nestes dados "
              f"(i={'VIOLADA' if veredito['i_violada'] else 'ok'}, "
              f"ii={'VIOLADA' if veredito['ii_violada'] else 'ok'}).{FIM}")
        print(f"  {VERMELHO}  O argumento do artigo não se sustenta como está "
              f"escrito. Escreva o parecer e escale ao usuário.{FIM}")
        return 1

    testados = veredito["conjuntos_testados_i"]
    if testados:
        print(f"  {VERDE}✓ As duas afirmações do artigo se sustentam nos "
              f"{testados} conjunto(s) principal(is) testado(s).{FIM}")
    else:
        print(f"  {AMARELO}○ Nenhuma afirmação foi testada — nenhum conjunto "
              f"principal mensurável neste recorte.{FIM}")
    if incompleto:
        print(f"\n  {AMARELO}○ Reprodução INCOMPLETA:{FIM}")
        for conjunto in bloqueados:
            print(f"    {AMARELO}- {conjunto.rotulo} bloqueado (requer "
                  f"reexecução){FIM}")
        for rotulo, pipeline in sem_suporte:
            print(f"    {AMARELO}- {rotulo}: {pipeline} sem suporte de ramo — "
                  f"artefato anterior a DEC-064{FIM}")
        for rotulo in sem_oraculo:
            print(f"    {AMARELO}- {rotulo}: oráculo independente não "
                  f"executado{FIM}")
        for aviso in veredito["avisos"]:
            print(f"    {AMARELO}- {aviso}{FIM}")
        print(f"\n  {DIM}Código 2: as afirmações valem, a reprodução ainda não "
              f"está completa.{FIM}")
        return 2

    print(f"  {VERDE}✓ Reprodução completa.{FIM}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
