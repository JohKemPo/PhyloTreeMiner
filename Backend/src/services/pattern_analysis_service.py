"""Análise de padrões FPMax (Arq-B/M5).

Movido de `app.py`, byte a byte. **Zona sagrada** (docs/agents/03-backend-core.md
§3, adjacente a FPMax): nada do cálculo mudou, só o arquivo em que mora.
Qualquer mudança de resultado aqui precisa do protocolo de
`docs/automation/04-rigor-cientifico.md §3` — não é deste lote.

Exceção deliberada à regra "serviço não conhece FastAPI": `_analisar_padroes_sync`
já levantava `HTTPException` (404) antes desta extração, e esse contrato é
parte do que os golden snapshots (`pattern_analysis_varv6.json`) e os testes
D7/D8/D9 (`test_golden_endpoints.py`) caracterizam — trocar por outra exceção
mudaria comportamento observável, o que esta fatia não autoriza.
"""
import os
from collections import Counter, defaultdict

import pandas as pd
from fastapi import HTTPException

from src.services.tree_metadata_service import iter_metadata_nodes


def get_hash_to_subtree(metadata):
    """Mapeia hash de clado -> informação da subárvore.

    Um clado conservado aparece na MESMA posição de hash em várias árvores. O
    mapa é, portanto, um-para-muitos: `trees` guarda todas as árvores em que o
    clado ocorre. `tree_name`/`subtree_name` seguem existindo para compatibilidade
    e apontam para a primeira ocorrência em ordem estável.
    """
    hash_to_subtree_info = {}
    if isinstance(metadata, dict):
        for tree_name in sorted(metadata):
            subtrees = metadata[tree_name]
            for subtree_name in sorted(subtrees):
                subtree_info = subtrees[subtree_name]
                chave = subtree_info['List_terminals_hash']
                terminals = [d.get("newick", "Unknown")
                             for d in subtree_info.get('data_terminals', [])]

                entrada = hash_to_subtree_info.get(chave)
                if entrada is None:
                    entrada = {
                        "tree_name": tree_name,
                        "subtree_name": subtree_name,
                        "trees": {},
                        "terminals": terminals,
                        "nodes": {}
                    }
                    hash_to_subtree_info[chave] = entrada
                entrada["trees"][tree_name] = subtree_name

                get_newick = lambda h: next(
                    (d["newick"] for d in subtree_info['data_terminals']
                     if d["terminal_hash"] == h), None)
                for terminal_hash in subtree_info['Terminals']:
                    entrada['nodes'].setdefault(terminal_hash, get_newick(terminal_hash))
    return hash_to_subtree_info


def merge_hash_to_subtree(destino, origem):
    """Funde mapas preservando o um-para-muitos.

    `dict.update` faria a última árvore vencer e descartaria as demais — era o
    que perdia 50-62% das árvores no painel de cobertura.
    """
    for chave, entrada in origem.items():
        atual = destino.get(chave)
        if atual is None:
            destino[chave] = entrada
            continue
        atual["trees"].update(entrada["trees"])
        for h, newick in entrada["nodes"].items():
            atual["nodes"].setdefault(h, newick)
    return destino


def analyze_patterns(fpmax_df, rare_threshold, robust_threshold, min_size, max_size, hash_to_subtree_info={}):
    """
    Analisa padrões do DataFrame FPMax e metadados.
    """
    def parse_frozenset(fset_str):
        try:
            cleaned = fset_str.replace('frozenset({', '').replace('})', '')
            items = cleaned.split(', ')
            return set(int(item) for item in items if item.strip())
        except:
            return set()

    # D4 — até M1.1 o pipeline gravava o LIMIAR da varredura na coluna `support`,
    # e o mesmo itemset aparecia em várias linhas com "suportes" diferentes. Um CSV
    # gravado antes daquela correção não tem `min_support_threshold`; é por essa
    # ausência que se reconhece o artefato antigo. Ler os dois como se fossem a
    # mesma coisa é exibir o parâmetro da varredura como se fosse suporte.
    colunas = set(fpmax_df.columns)
    esquema_corrigido = 'min_support_threshold' in colunas

    patterns = []
    descartados = []
    ilegiveis = 0

    for _, row in fpmax_df.iterrows():
        try:
            itemset = parse_frozenset(row['itemsets'])
            support = row['support']
        except Exception:
            ilegiveis += 1
            continue

        if min_size <= len(itemset) <= max_size:
            patterns.append({
                'itemset': itemset,
                'support': support,
                'size': len(itemset)
            })
        else:
            descartados.append(len(itemset))

    method_sensitive_signatures = []
    topologically_robust = []

    for pattern in patterns:
        node_names = []
        terminals_by_node = {}

        for h in pattern['itemset']:
            if h in hash_to_subtree_info:
                name = hash_to_subtree_info[h]["subtree_name"]
                node_names.append(name)
                terminals_by_node[name] = hash_to_subtree_info[h]["terminals"]
            else:
                node_names.append(f"Unknown_{h}")

        pattern_data = {
            'pattern': list(pattern['itemset']),
            'node_names': node_names,
            'terminals_by_node': terminals_by_node,  # dict: node_name → [terminals]
            'terminals': list({t for seqs in terminals_by_node.values() for t in seqs}),  # mantém o total para compatibilidade
            'support': pattern['support'],
            'size': pattern['size']
        }

        if pattern['support'] <= rare_threshold:
            method_sensitive_signatures.append(pattern_data)
        elif pattern['support'] >= robust_threshold:
            topologically_robust.append(pattern_data)

    pattern_sizes = [p['size'] for p in patterns]
    support_values = [p['support'] for p in patterns]

    statistics = {
        'total_patterns': len(patterns),
        'patterns_in_source': int(len(fpmax_df)),
        'discarded_by_size': len(descartados),
        'discarded_sizes': sorted(descartados),
        'unreadable_rows': ilegiveis,
        'size_filter': {'min': min_size, 'max': max_size},
        'method_sensitive_count': len(method_sensitive_signatures),
        'topologically_robust_count': len(topologically_robust),
        'avg_pattern_size': sum(pattern_sizes) / len(pattern_sizes) if pattern_sizes else 0,
        'avg_support': sum(support_values) / len(support_values) if support_values else 0,
        'size_distribution': dict(Counter(pattern_sizes)),
        'support_schema': {
            'corrected': esquema_corrigido,
            'support_means': ('fração de árvores que contêm o padrão'
                              if esquema_corrigido
                              else 'LIMIAR da varredura do FPMax, não o suporte real'),
            'warning': (None if esquema_corrigido else
                        'Este projeto foi gerado antes da correção de D4 (M1.1). A coluna '
                        '`support` guarda o limiar da varredura, não a fração de árvores, e o '
                        'mesmo padrão pode aparecer em mais de uma linha. Reexecute o projeto '
                        'para obter os valores corretos.'),
        },
        'support_distribution': {
            'low': len([s for s in support_values if s <= 0.3]),
            'medium': len([s for s in support_values if 0.3 < s <= 0.7]),
            'high': len([s for s in support_values if s > 0.7])
        }
    }

    tree_coverage = analyze_tree_coverage(patterns, hash_to_subtree_info)

    return {
        'method_sensitive_signatures': method_sensitive_signatures,
        'topologically_robust': topologically_robust,
        'pattern_statistics': statistics,
        'tree_coverage': tree_coverage
    }


def analyze_tree_coverage(patterns, hash_to_subtree_info):
    """
    Analisa a cobertura dos padrões nas árvores.
    """
    tree_patterns = defaultdict(list)

    for pattern in patterns:
        for h in pattern['itemset']:
            if h not in hash_to_subtree_info:
                continue
            tree_info = hash_to_subtree_info[h]
            for tree_name in tree_info.get("trees") or {tree_info["tree_name"]: None}:
                tree_patterns[tree_name].append({
                    'pattern_hash': h,
                    'support': pattern['support'],
                    'size': pattern['size']
                })

    coverage_stats = {}
    for tree_name, patterns in tree_patterns.items():
        coverage_stats[tree_name] = {
            'pattern_count': len(patterns),
            'avg_support': sum(p['support'] for p in patterns) / len(patterns) if patterns else 0,
            'size_range': {
                'min': min(p['size'] for p in patterns) if patterns else 0,
                'max': max(p['size'] for p in patterns) if patterns else 0,
                'avg': sum(p['size'] for p in patterns) / len(patterns) if patterns else 0
            }
        }

    return coverage_stats


def _analisar_padroes_sync(
    project_name: str,
    rare_threshold: float,
    robust_threshold: float,
    min_pattern_size: int,
    max_pattern_size: int,
    projects_root: str,
) -> dict:
    """Corpo síncrono de `analyze_tree_patterns` (M4.10) — roda em thread própria."""
    project_path = os.path.join(projects_root, project_name)

    fpmax_path = os.path.join(project_path, "out", "outputs", "all_results_fpmax.csv")
    metadata_path = os.path.join(project_path, "out", "outputs", "metadata.json")

    if not os.path.exists(fpmax_path):
        raise HTTPException(status_code=404, detail="Arquivo FPMax não encontrado")
    if not os.path.exists(metadata_path):
        raise HTTPException(status_code=404, detail="Arquivo de metadados não encontrado")

    fpmax_df = pd.read_csv(fpmax_path)

    hash_subtrees_infos = dict()

    for metadata in iter_metadata_nodes(metadata_path, iter_tree=True):
        merge_hash_to_subtree(hash_subtrees_infos, get_hash_to_subtree(metadata))

    return analyze_patterns(
        fpmax_df=fpmax_df,
        rare_threshold=rare_threshold,
        robust_threshold=robust_threshold,
        min_size=min_pattern_size,
        max_size=max_pattern_size,
        hash_to_subtree_info=hash_subtrees_infos
    )
