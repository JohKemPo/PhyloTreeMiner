"""Comparação de árvores — RF, quartet, clados comuns/conflitantes (Arq-B/M5).

Movido de `app.py`, byte a byte. **Zona sagrada** (docs/agents/03-backend-core.md
§3): nada do cálculo mudou, só o arquivo em que mora. Qualquer mudança de
resultado aqui precisa do protocolo de `docs/automation/04-rigor-cientifico.md
§3` (oráculo independente, parecer no ledger) — não é deste lote.

Exceção deliberada à regra "serviço não conhece FastAPI": `_comparar_arvores_sync`
já levantava `HTTPException` antes desta extração, e o formato do erro (400
para entrada inválida, com a mensagem exata) é parte do contrato caracterizado
pelos golden snapshots (`compare_fasttree_nj_varv6.json`,
`compare_identidade_varv6.json`) — trocar por outra exceção mudaria
comportamento observável, o que esta fatia não autoriza.
"""
import random
from collections import defaultdict
from itertools import combinations
from typing import Dict, List, Optional, Tuple

import numpy as np
from dendropy import Tree, TreeList, TaxonNamespace
from dendropy.calculate import treecompare
from fastapi import HTTPException

from src.services.tree_metadata_service import accession_base


def extract_trees_from_nexus(nexus_content: str) -> List[Tree]:
    """
    Extrai árvores do conteúdo Nexus usando processamento em memória

    Sempre no próprio namespace: reaproveitar o namespace de outra árvore
    aborta a leitura quando os rótulos divergem (D13). A reconciliação é feita
    depois, por `canonical_label_map` e `align_taxon_namespaces`.
    """
    try:
        trees = TreeList.get_from_string(
            nexus_content,
            'nexus',
            rooting='force-unrooted'
        )

        return trees

    except Exception as e:
        raise ValueError(f"Failed to parse Nexus content: {str(e)}")


def leaf_labels(tree: Tree) -> set:
    """Rótulos efetivamente usados pelas folhas — não os declarados no bloco
    `TaxLabels`, que em IQ-TREE e RAxML divergem deles (D13)."""
    return {node.taxon.label for node in tree.leaf_node_iter() if node.taxon is not None}


def canonical_label_map(tree1: Tree, tree2: Tree):
    """Reconcilia rótulos truncados entre duas árvores (D13).

    IQ-TREE e RAxML gravam `NC_008030.` onde FastTree e as árvores de
    distância gravam `NC_008030.1`. Sem reconciliar, as duas árvores não têm
    táxon nenhum em comum e a comparação é recusada — em VARV-6 isso derrubava
    24 dos 45 pares.

    Devolve `rótulo -> rótulo canônico`, ou `None` quando não há reconciliação
    a fazer ou quando ela não é segura. Nunca funde dois táxons distintos:
    se dois rótulos da mesma árvore compartilham o acesso, ou se os conjuntos
    de acessos diferem, devolve `None` e a comparação segue pelos rótulos
    originais — recusar é preferível a comparar clados errados.
    """
    rotulos1, rotulos2 = leaf_labels(tree1), leaf_labels(tree2)
    if rotulos1 == rotulos2:
        return None

    por_acesso = []
    for rotulos in (rotulos1, rotulos2):
        agrupado = defaultdict(list)
        for rotulo in rotulos:
            agrupado[accession_base(rotulo)].append(rotulo)
        if any(len(v) > 1 for v in agrupado.values()):
            return None
        por_acesso.append(agrupado)

    if set(por_acesso[0]) != set(por_acesso[1]):
        return None

    return {
        rotulo: max(por_acesso[0][acesso] + por_acesso[1][acesso],
                    key=lambda r: (len(r), r))
        for acesso in por_acesso[0]
        for rotulo in por_acesso[0][acesso] + por_acesso[1][acesso]
    }


def align_taxon_namespaces(tree1: Tree, tree2: Tree, label_map: dict = None) -> Tuple[Tree, Tree]:
    """
    Alinha os taxon namespaces das duas árvores preservando todas as informações
    """
    canonico = (lambda rotulo: label_map.get(rotulo, rotulo)) if label_map else (lambda rotulo: rotulo)
    unified_ns = TaxonNamespace()

    taxon_map = {}
    for tree in [tree1, tree2]:
        for taxon in tree.taxon_namespace:
            rotulo = canonico(taxon.label)
            if rotulo not in taxon_map:
                new_taxon = unified_ns.new_taxon(label=rotulo)
                taxon_map[rotulo] = new_taxon

    # Clonar árvores com novo namespace
    tree1_aligned = tree1.__class__(tree1)
    tree2_aligned = tree2.__class__(tree2)

    # Substituir taxon namespace
    tree1_aligned.taxon_namespace = unified_ns
    tree2_aligned.taxon_namespace = unified_ns

    # Mapear todos os nós para os novos táxons
    for tree in [tree1_aligned, tree2_aligned]:
        for node in tree.leaf_node_iter():
            if node.taxon is not None and canonico(node.taxon.label) in taxon_map:
                node.taxon = taxon_map[canonico(node.taxon.label)]

    return tree1_aligned, tree2_aligned


def calculate_rf_distance(tree1: Tree, tree2: Tree) -> int:
    """
    Calcula a distância Robinson-Foulds
    """
    tree1.encode_bipartitions()
    tree2.encode_bipartitions()
    return treecompare.symmetric_difference(tree1, tree2)


def make_tree_binary(tree: Tree) -> Tree:
    """
    Resolve politomias aleatoriamente para tornar a árvore binária
    Retorna uma nova árvore com estrutura binária
    """
    new_tree = tree.__class__(tree)

    for node in list(new_tree.internal_nodes()):
        children = node.child_nodes()
        if len(children) > 2:
            random.shuffle(children)

            while len(children) > 1:
                child1 = children.pop(0)
                child2 = children.pop(0)

                new_node = new_tree.node_factory()
                new_node.add_child(child1)
                new_node.add_child(child2)

                new_node.edge.length = 1e-6

                children.append(new_node)

            node.set_children(children)

    return new_tree


def calculate_quartet_distance(tree1: Tree, tree2: Tree) -> Tuple[Optional[int], Optional[str]]:
    """
    Distância quartet, ou `None` **com o motivo** quando ela é indefinida.

    Devolvia `-1` para árvore não binária, com um `TODO` — e `-1` é um número:
    ele descia para o payload, era dividido pelo máximo em
    `interpret_quartet_distance` e em `check_consistency`, e chegava à interface
    como se fosse uma distância. É a regra 5 do projeto: **"não aplicável" nunca
    é `0` nem `-1`**.

    Politomia não é ruído a resolver por sorteio. `make_tree_binary` existia
    logo acima e resolvia politomias **aleatoriamente** — duas chamadas dariam
    dois resultados. A resposta honesta é que a métrica não se aplica, e por quê.

    Return
    ------
    tuple of (int or None, str or None)
        Valor e motivo. O motivo só é preenchido quando o valor é `None`.
    """
    n_taxa = len(tree1.taxon_namespace)

    if n_taxa < 4:
        return None, f"indefinida com menos de 4 táxons (há {n_taxa})"

    nao_binarias = [nome for nome, arvore in (("1", tree1), ("2", tree2))
                    if not get_tree_statistics(arvore)['is_binary']]
    if nao_binarias:
        return None, ("a distância quartet exige árvores binárias, e a árvore "
                      f"{' e '.join(nao_binarias)} tem politomia. Resolver a "
                      "politomia por sorteio daria um número diferente a cada "
                      "chamada, então a métrica é declarada indefinida")

    if n_taxa <= 25:
        try:
            return treecompare.quartet_distance(tree1, tree2), None
        except Exception:
            return exact_quartet_distance(tree1, tree2), None

    return approximate_quartet_distance(
        tree1, tree2, sample_size=min(1000, n_taxa * 10)), None


def exact_quartet_distance(tree1: Tree, tree2: Tree) -> int:
    """
    Calcula a distância Quartet exata para árvores pequenas
    """
    taxa = sorted([taxon.label for taxon in tree1.taxon_namespace])
    if len(taxa) < 4:
        return 0

    quartet_distance = 0
    all_quartets = list(combinations(taxa, 4))

    for quartet_taxa in all_quartets:
        try:
            quartet_set = set(quartet_taxa)
            quartet1 = tree1.quartet(*quartet_set)
            quartet2 = tree2.quartet(*quartet_set)

            if quartet1 != quartet2:
                quartet_distance += 1
        except Exception:
            quartet_distance += 1

    return quartet_distance


def approximate_quartet_distance(tree1: Tree, tree2: Tree, sample_size: int = 1000) -> int:
    """
    Calcula uma aproximação da distância Quartet com amostragem mais inteligente
    """
    taxa = sorted([taxon.label for taxon in tree1.taxon_namespace])
    if len(taxa) < 4:
        return 0

    quartet_distance = 0
    n_taxa = len(taxa)

    for _ in range(sample_size):
        try:
            strata_size = max(1, n_taxa // 4)
            strata_indices = np.random.choice(range(n_taxa), strata_size, replace=False)
            strata_taxa = [taxa[i] for i in strata_indices]

            remaining_taxa = list(set(taxa) - set(strata_taxa))
            if len(remaining_taxa) < 4 - len(strata_taxa):
                continue

            additional_taxa = np.random.choice(remaining_taxa, 4 - len(strata_taxa), replace=False)
            sampled_taxa = list(strata_taxa) + list(additional_taxa)

            quartet_set = set(sampled_taxa)
            quartet1 = tree1.quartet(*quartet_set)
            quartet2 = tree2.quartet(*quartet_set)

            if quartet1 != quartet2:
                quartet_distance += 1
        except Exception as e:
            if "quartet" in str(e).lower() or "taxon" in str(e).lower():
                quartet_distance += 1

    total_quartets = n_taxa * (n_taxa-1) * (n_taxa-2) * (n_taxa-3) // 24
    if total_quartets > 0 and sample_size > 0:
        return int((quartet_distance / sample_size) * total_quartets)
    return 0


def count_non_trivial_bipartitions(tree: Tree) -> int:
    """
    Conta o número de bipartições não triviais em uma árvore
    """
    tree.encode_bipartitions()
    count = 0
    for edge in tree.postorder_edge_iter():
        if edge.bipartition and not edge.bipartition.is_trivial():
            count += 1
    return count


def find_common_clades(tree1: Tree, tree2: Tree) -> Tuple[int, List[str]]:
    """
    Encontra clados comuns entre duas árvores usando comparação de bipartições
    """
    common_clades = 0
    common_clade_descriptions = []

    tree1.encode_bipartitions()
    tree2.encode_bipartitions()

    bipartitions1 = set()
    for edge in tree1.postorder_edge_iter():
        if edge.bipartition and not edge.bipartition.is_trivial():
            bipartitions1.add(edge.bipartition.split_bitmask)

    bipartitions2 = set()
    for edge in tree2.postorder_edge_iter():
        if edge.bipartition and not edge.bipartition.is_trivial():
            bipartitions2.add(edge.bipartition.split_bitmask)

    common_bipartitions = bipartitions1.intersection(bipartitions2)
    common_clades = len(common_bipartitions)

    return common_clades, common_clade_descriptions


def find_conflicting_clades(tree1: Tree, tree2: Tree) -> Tuple[int, List[str]]:
    """
    Encontra clados conflitantes entre duas árvores
    """
    conflicting_clades = 0

    tree1.encode_bipartitions()
    tree2.encode_bipartitions()

    bipartitions1 = set()
    bipartitions2 = set()

    for edge in tree1.postorder_edge_iter():
        if edge.bipartition and not edge.bipartition.is_trivial():
            bipartitions1.add(edge.bipartition.split_bitmask)

    for edge in tree2.postorder_edge_iter():
        if edge.bipartition and not edge.bipartition.is_trivial():
            bipartitions2.add(edge.bipartition.split_bitmask)

    conflicting_clades = len(bipartitions1.symmetric_difference(bipartitions2))

    return conflicting_clades, []


def get_tree_statistics(tree: Tree) -> Dict:
    """
    Obtém estatísticas detalhadas de uma árvore com detecção precisa de binariedade
    """
    nodes = 0
    leaves = 0
    internal_nodes = 0
    politomy_count = 0
    non_binary_nodes = []

    for node in tree:
        nodes += 1
        if node.is_leaf():
            leaves += 1
        else:
            internal_nodes += 1
            if len(node.child_nodes()) > 2:
                politomy_count += 1
                non_binary_nodes.append(node.label)

    branch_lengths = []
    for edge in tree.postorder_edge_iter():
        if edge.length is not None:
            branch_lengths.append(edge.length)

    avg_branch_length = sum(branch_lengths) / len(branch_lengths) if branch_lengths else 0

    return {
        'total_nodes': nodes,
        'leaf_nodes': leaves,
        'internal_nodes': internal_nodes,
        'avg_branch_length': round(avg_branch_length, 6),
        'tree_length': round(tree.length(), 6),
        'is_binary': politomy_count == 0,
        'politomy_count': politomy_count,
        'non_binary_nodes': non_binary_nodes
    }


def calculate_similarity(tree1: Tree, tree2: Tree, common_clades: int) -> float:
    """
    Calcula score de similaridade corretamente para árvores não binárias
    """
    tree1_bipartitions = count_non_trivial_bipartitions(tree1)
    tree2_bipartitions = count_non_trivial_bipartitions(tree2)

    min_bipartitions = min(tree1_bipartitions, tree2_bipartitions)

    if min_bipartitions == 0:
        return 0.0

    return (common_clades / min_bipartitions) * 100


def rf_maximo(num_taxa: int) -> int:
    """Máximo teórico da RF não enraizada: `2(n-3)`, e 0 quando não há o que comparar."""
    return 2 * (num_taxa - 3) if num_taxa > 3 else 0


def quartet_maximo(num_taxa: int) -> int:
    """Número de quartetos, `C(n,4)`. Zero abaixo de 4 táxons."""
    if num_taxa < 4:
        return 0
    return num_taxa * (num_taxa - 1) * (num_taxa - 2) * (num_taxa - 3) // 24


def check_consistency(rf_distance, quartet_distance, num_taxa):
    """
    Compara as duas métricas normalizadas — quando as duas existem.

    Dividia sem guarda nenhuma: com `num_taxa <= 3` os dois máximos são zero e a
    função levantava `ZeroDivisionError`; com a quartet indefinida, dividia
    `-1` e devolvia um veredito calculado sobre um sentinela.
    """
    max_rf = rf_maximo(num_taxa)
    max_quartet = quartet_maximo(num_taxa)

    if quartet_distance is None:
        return "Comparação entre métricas indisponível: a distância quartet não se aplica a este par"
    if max_rf == 0 or max_quartet == 0:
        return f"Comparação entre métricas indefinida com {num_taxa} táxons"

    normalized_rf = rf_distance / max_rf
    normalized_quartet = quartet_distance / max_quartet

    if abs(normalized_rf - normalized_quartet) > 0.5:
        return "Inconsistent results: RF and Quartet metrics show significant discrepancy"
    return "Results are consistent"


def _comparar_arvores_sync(tree_data: dict) -> dict:
    """Corpo síncrono de `compare_trees` (M4.10) — roda em thread própria."""
    tree1_nexus = tree_data.get('tree1')
    tree2_nexus = tree_data.get('tree2')

    if not tree1_nexus or not tree2_nexus:
        raise HTTPException(status_code=400, detail="Both tree1 and tree2 content are required")

    trees1 = extract_trees_from_nexus(tree1_nexus)
    if len(trees1) == 0:
        raise HTTPException(status_code=400, detail="No trees found in tree1 Nexus content")

    # Cada árvore é lida no próprio namespace. Impor o da primeira à
    # segunda fazia o dendropy abortar sempre que os rótulos divergiam,
    # e é assim que D13 derrubava metade das comparações de VARV-6.
    trees2 = extract_trees_from_nexus(tree2_nexus)
    if len(trees2) == 0:
        raise HTTPException(status_code=400, detail="No trees found in tree2 Nexus content")

    tree1 = trees1[0]
    tree2 = trees2[0]

    tree1.is_rooted = False
    tree2.is_rooted = False

    tree1, tree2 = align_taxon_namespaces(tree1, tree2, canonical_label_map(tree1, tree2))

    rotulos1, rotulos2 = leaf_labels(tree1), leaf_labels(tree2)
    if rotulos1 != rotulos2:
        somente1 = sorted(rotulos1 - rotulos2)
        somente2 = sorted(rotulos2 - rotulos1)
        raise HTTPException(
            status_code=400,
            detail=("Trees do not share the same taxon set; RF and quartet "
                    f"distances are undefined. Only in tree1: {somente1}. "
                    f"Only in tree2: {somente2}."))

    rf_distance = calculate_rf_distance(tree1, tree2)
    quartet_distance, quartet_motivo = calculate_quartet_distance(tree1, tree2)
    common_clades, common_clade_descriptions = find_common_clades(tree1, tree2)
    conflicting_clades, conflicting_descriptions = find_conflicting_clades(tree1, tree2)

    tree1_stats = get_tree_statistics(tree1)
    tree2_stats = get_tree_statistics(tree2)

    similarity_score = calculate_similarity(tree1, tree2, common_clades)

    n_taxa = len(tree1.taxon_namespace)
    max_rf = rf_maximo(n_taxa)
    max_quartet = quartet_maximo(n_taxa)

    return {
        'rf_distance': rf_distance,
        # O máximo e o normalizado saem daqui prontos. A interface os
        # recalculava por conta própria, e duas fórmulas para a mesma
        # grandeza divergem na primeira mudança — é D5 noutro assunto.
        'rf_max': max_rf,
        'rf_normalized': round(rf_distance / max_rf, 4) if max_rf else None,
        # `null` quando indefinida, **com o motivo ao lado** (regra 5).
        'quartet_distance': quartet_distance,
        'quartet_max': max_quartet or None,
        'quartet_normalized': (round(quartet_distance / max_quartet, 4)
                               if quartet_distance is not None and max_quartet else None),
        'quartet_note': quartet_motivo,
        'common_clades': common_clades,
        'conflicting_clades': conflicting_clades,
        'similarity_score': round(similarity_score, 2),
        'tree1_stats': tree1_stats,
        'tree2_stats': tree2_stats,
        'taxon_count': n_taxa,
        'comparison_notes': {
            'consistency': check_consistency(rf_distance, quartet_distance, n_taxa),
            'rf_interpretation': interpret_rf_distance(rf_distance, tree1_stats['leaf_nodes']),
            'quartet_interpretation': interpret_quartet_distance(quartet_distance, tree1_stats['leaf_nodes']),
            'similarity_interpretation': interpret_similarity(similarity_score)
        }
    }


def interpret_rf_distance(rf_distance: int, num_taxa: int) -> str:
    """Interpret the RF distance"""
    max_rf = rf_maximo(num_taxa)
    if max_rf == 0:
        return "Identical trees or too small for RF comparison"

    normalized_rf = rf_distance / max_rf
    if normalized_rf < 0.1:
        return "Trees are very similar"
    elif normalized_rf < 0.3:
        return "Trees are similar with small differences"
    elif normalized_rf < 0.6:
        return "Trees are moderately different"
    else:
        return "Trees are very different"


def interpret_quartet_distance(qd: Optional[int], num_taxa: int) -> str:
    """Interpret the Quartet distance. `qd` é `None` quando indefinida."""
    if qd is None:
        return "Distância quartet indefinida para este par"
    max_qd = quartet_maximo(num_taxa)
    if max_qd == 0:
        return "Not applicable (fewer than 4 taxa)"

    normalized_qd = qd / max_qd
    if normalized_qd < 0.1:
        return "Low quartet discordance"
    elif normalized_qd < 0.3:
        return "Moderate quartet discordance"
    elif normalized_qd < 0.6:
        return "High quartet discordance"
    else:
        return "Very high quartet discordance"


def interpret_similarity(similarity: float) -> str:
    """Interpret the similarity score"""
    if similarity > 90:
        return "Trees are nearly identical"
    elif similarity > 70:
        return "Trees are very similar"
    elif similarity > 50:
        return "Trees are moderately similar"
    elif similarity > 30:
        return "Trees have limited similarity"
    else:
        return "Trees are very different"
