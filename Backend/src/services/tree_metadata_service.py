"""Índice/cache de metadados de árvore (Arq-B/M5).

Movido de `app.py` — cópia literal de `build_metadata_index`,
`get_metadata_cache`, `accession_base`, `_riqueza_metadado`,
`iter_metadata_nodes`, `get_metadata_node`, `get_node_information`, e do
cache `metadata_cache`/`cache_lock`. Refatoração pura — mesma lógica que já
lidava com D12/D13.

Serviço não conhece FastAPI: nada de `HTTPException` aqui.

`map_country_to_region` continua vindo de `src.utils.treePlot` — zona
sagrada (A6), não duplicada nem alterada, só importada como antes.
"""
import os
import re
import threading
from collections import defaultdict
from typing import Any, Dict

import ijson

from src.logging_conf import obter_logger
from src.utils.treePlot import map_country_to_region

logger = obter_logger(__name__)

metadata_cache: Dict[str, Any] = {}
cache_lock = threading.Lock()


def accession_base(label: str) -> str:
    """Acesso sem a versão.

    IQ-TREE e RAxML gravam o rótulo truncado em 10 caracteres pelo limite de
    nome do PHYLIP: `NC_008030.1` vira `NC_008030.` (D13). Os dois rótulos
    designam o mesmo registro do GenBank, e é por este acesso que os dois se
    reencontram."""
    return label.split('.')[0] if label else label


def _riqueza_metadado(node: dict) -> tuple:
    """Quanto metadado real o registro carrega. Ordena registros do mesmo
    acesso: o rótulo truncado vem sempre com `features` vazio."""
    metadata = node.get('metadata') or {}
    return (len(metadata.get('features') or []),
            len(metadata.get('annotations') or {}))


def iter_metadata_nodes(file_path: str, only_first: bool = True, iter_tree: bool = False):
    """Terminais do metadata.json, um por acesso, com o registro mais rico.

    D13 — o arquivo guarda cada terminal uma vez por árvore, e as árvores de
    IQ-TREE e RAxML trazem o rótulo truncado, sem `features`. Ler só a
    primeira árvore (o comportamento anterior) descartava metadado genuíno
    sempre que essa árvore era uma delas: em VARV-6 a primeira é
    `clustalo_raxml` e 3 dos 6 táxons — incluindo `NC_001611`, o genoma de
    referência de Variola — chegavam à API sem organismo, país, hospedeiro
    nem data.

    Por isso lê-se árvore a árvore, guardando o registro mais rico de cada
    acesso, e para-se na primeira árvore em que nenhum táxon esteja vazio.
    Quando a primeira árvore já está completa — o caso de todos os projetos
    de Zika e de VARV-49 — o custo é idêntico ao anterior.

    `only_first` não tem efeito: no código anterior o `continue` do ramo
    `iter_tree` pulava o `break`, e o ramo de terminais agora decide sozinho
    quando parar. Mantido só para não quebrar chamadas existentes.
    """
    if iter_tree:
        with open(file_path, 'rb') as f:
            for base_node in ijson.items(f, 'item.item'):
                if isinstance(base_node, dict):
                    yield base_node
        return

    # acesso -> (riqueza, ordem de primeira aparição, nó)
    melhores = {}

    with open(file_path, 'rb') as f:
        for base_node in ijson.items(f, 'item.item'):
            if not isinstance(base_node, dict):
                continue
            for tree_name, tree_content in base_node.items():
                for subtree_name, subtree_content in tree_content.items():
                    if isinstance(subtree_content, dict) and 'data_terminals' in subtree_content:
                        for node in subtree_content['data_terminals']:
                            rotulo = node.get('newick')
                            if not rotulo:
                                continue
                            acesso = accession_base(rotulo)
                            riqueza = _riqueza_metadado(node)
                            anterior = melhores.get(acesso)
                            if anterior is None:
                                melhores[acesso] = (riqueza, len(melhores), node)
                            elif riqueza > anterior[0]:
                                melhores[acesso] = (riqueza, anterior[1], node)

            if melhores and all(r > (0, 0) for r, _, _ in melhores.values()):
                break

    # Ordem de primeira aparição no arquivo: determinística, e a mesma que a
    # versão anterior produzia (04-rigor-cientifico §4).
    for _, (_, _, node) in sorted(melhores.items(), key=lambda kv: kv[1][1]):
        yield node


def get_metadata_node(node: dict):
    """
    Extrai campos
    """
    metadata = node.get('metadata', {})
    features_list = metadata.get("features") or []
    features = features_list[0] if features_list else {}
    annotations = metadata.get('annotations', {})
    qualifiers = features.get('qualifiers', {})

    return metadata, annotations, features, qualifiers


def get_node_information(annotations, features, qualifiers, accession: str):
    """
    Retorna informações do nó

    Return
    ----
    accessionId,
    lineage,
    host,
    country,
    year,
    pubmedId
    """
    accessionIdAux = annotations.get('accessions', ['Unknown'])
    accessionId = accessionIdAux[0] if isinstance(accessionIdAux, list) else accessionIdAux
    if accessionId == 'Unknown':
        accessionId = accession

    lineage = annotations.get("organism") or annotations.get("source") or "Unknown"

    isolate = qualifiers.get("isolate", ["Unknown"])

    host_list = qualifiers.get("host", ["Unknown"])
    host_raw = host_list[0] if isinstance(host_list, list) else host_list
    # O GenBank permite anexar atributos estruturados após ';' (sex, age, breed).
    # Não faz parte do nome do organismo; mantê-los fragmenta hospedeiros
    # idênticos em entradas distintas (D12d).
    host = host_raw.split(';')[0].strip() if host_raw else host_raw

    # Um metadado ausente é ausente — não é inferido de outro campo (D12a/b).
    # `strain` é um identificador de isolado, não uma localização nem uma data;
    # extrair país/ano dele por regex já produziu falsos positivos (ex.:
    # "China Horn 1948; Sabin Lab" -> país "China Horn", que não existe).
    geo_loc = qualifiers.get("geo_loc_name", [None])[0]
    country = geo_loc.split(':')[0].strip() if geo_loc else "Unknown"

    region = map_country_to_region(country)

    coll_date = qualifiers.get("collection_date", [None])[0]
    year = "Unknown Date"
    if coll_date:
        year_match = re.search(r'\d{4}', coll_date)
        year = year_match.group(0) if year_match else "Unknown Date"

    # `references` já vem serializado pelo BioComp_UFF (workflow/utils/treeUtils.py,
    # seqrecord_to_serializable_dict) com o `pubmed_id` do artigo associado ao
    # registro do GenBank, quando o autor da submissão o declarou. Nem todo
    # registro tem: usa-se a primeira referência que de fato o traga.
    pubmed_id = None
    for referencia in annotations.get("references") or []:
        candidato = referencia.get("pubmed_id") if isinstance(referencia, dict) else None
        if candidato:
            pubmed_id = candidato
            break

    return {
        "accessionId": accessionId,
        "lineage": lineage,
        "host": host,
        "country": country,
        "region": region,
        "year": year,
        "isolate": isolate,
        "pubmedId": pubmed_id
    }


def build_metadata_index(metadata_path):

    nodes = []
    node_index = {}

    host_index = defaultdict(list)
    lineage_index = defaultdict(list)

    hosts_count = defaultdict(int)
    country_count = defaultdict(int)
    timeline_count = defaultdict(int)

    unique_lineages = set()

    for node in iter_metadata_nodes(metadata_path):

        _, annotations, features, qualifiers = get_metadata_node(node)
        accession = accession_base(node['newick'])
        info = get_node_information(annotations, features, qualifiers, accession=accession)

        nodes.append(info)
        node_index[info["accessionId"]] = info

        host_index[info["host"]].append(info)
        lineage_index[info["lineage"]].append(info)

        hosts_count[info["host"]] += 1
        country_count[info["country"]] += 1
        timeline_count[info["year"]] += 1

        if info["lineage"]:
            unique_lineages.add(info["lineage"])

    insights = {
        "metrics": {
            "totalNodes": len(nodes),
            "uniqueLineages": len(unique_lineages),
            "uniqueHosts": len(hosts_count),
            "timeSpan": f"{min([y for y in timeline_count.keys() if y != 'Unknown Date'], default='N/A')} - {max([y for y in timeline_count.keys() if y != 'Unknown Date'], default='N/A')}"
        },
        "hostData": [{"name": k, "value": v} for k, v in hosts_count.items()],
        "countryData": [{"country": k, "count": v} for k, v in country_count.items()],
        "timelineData": [
            {"year": k, "count": v}
            for k, v in sorted(timeline_count.items())
        ],
    }

    return {
        "nodes": nodes,
        "node_index": node_index,
        "host_index": host_index,
        "lineage_index": lineage_index,
        "filters": {
            "hosts": sorted(host_index.keys()),
            "lineages": sorted(lineage_index.keys()),
        },
        "insights": insights,
    }


def get_metadata_cache(metadata_path: str):

    file_mtime = os.path.getmtime(metadata_path)

    with cache_lock:

        cache_entry = metadata_cache.get(metadata_path)

        # cache existe e arquivo NÃO mudou
        if cache_entry and cache_entry["mtime"] == file_mtime:
            return cache_entry["data"]

        logger.info("Construindo cache de metadata...")

        data = build_metadata_index(
            metadata_path
        )

        metadata_cache[metadata_path] = {
            "mtime": file_mtime,
            "data": data
        }

        return data
