"""Catálogo de consultas predefinidas do grafo Neo4j (M5/Grafo).

Centraliza as consultas que já se repetiam soltas em
`routers/neo4j_router.py` (endpoint `GET /predefined-queries`, consumido pelo
seletor de consultas da página de exploração do grafo no frontend —
`GraphVisualization.jsx`). Cada entrada documenta propósito, parâmetros,
o plano de execução medido com `PROFILE` contra a instância local com os
dados reais do demo (2026-09-13, ver `docs/data-model/neo4j.md` §2) e o teto
de resultado aplicado na própria consulta.

Este módulo só organiza o que já existia — não inventa consulta nova nem
altera o contrato do endpoint (mesmas chaves, mesmos valores de
`name`/`description`/`type`/`query` que o dict inline anterior).
"""
from typing import Any, Dict, Optional, TypedDict


class EntradaCatalogo(TypedDict):
    name: str
    description: str
    type: str  # "graph" (nós/relacionamentos) ou "query" (tabela)
    query: str
    parametros: Dict[str, str]
    plano_esperado: str
    teto_resultado: Optional[int]  # None = agregação, sem teto de linhas


CATALOGO: Dict[str, EntradaCatalogo] = {
    "all_trees": {
        "name": "All Trees",
        "description": "List all nodes with the label Tree.",
        "type": "graph",
        "query": "MATCH (n:Tree) RETURN n LIMIT 25",
        "parametros": {},
        "plano_esperado": (
            "NodeByLabelScan(:Tree) -> Limit. PROFILE real (10 nós Tree): "
            "dbHits=11, rows=10 — barato mesmo sem índice porque o label é "
            "pequeno e o LIMIT interrompe a varredura cedo."
        ),
        "teto_resultado": 25,
    },
    "all_subtrees": {
        "name": "All Subtrees",
        "description": "List all nodes with the label Subtree.",
        "type": "graph",
        "query": "MATCH (n:Subtree) RETURN n LIMIT 25",
        "parametros": {},
        "plano_esperado": (
            "NodeByLabelScan(:Subtree) -> Limit. PROFILE real (9524 nós "
            "Subtree, teto 25): dbHits=26, rows=25 — o LIMIT evita varrer os "
            "9524; sem ele, seria varredura completa do label."
        ),
        "teto_resultado": 25,
    },
    "full_graph_pattern": {
        "name": "Complete Pattern (Graph)",
        "description": "Shows the pattern Tree -> Subtree -> Metadata -> Feature -> Qualifier.",
        "type": "graph",
        "query": (
            "MATCH path = (t:Tree)-[:HAS_SUBTREE]->(s:Subtree)-[:HAS_METADATA]->(m:Metadata)"
            "-[:HAS_FEATURE]->(f:Feature)-[:HAS_QUALIFIER]->(q:Qualifier) RETURN path LIMIT 5"
        ),
        "parametros": {},
        "plano_esperado": (
            "NodeByLabelScan(:Tree) -> 4x Expand(All)/Filter -> Limit. "
            "PROFILE real: dbHits=135 no total para 5 caminhos — barato "
            "porque o LIMIT 5 propaga por toda a cadeia de Expand."
        ),
        "teto_resultado": 5,
    },
    "frequence_geograph": {
        "name": "Frequency by location",
        "description": "Table with frequencies by location based on Qualifier nodes.",
        "type": "query",
        "query": (
            "MATCH (m:Metadata)-[:HAS_FEATURE]->(f:Feature)-[:HAS_QUALIFIER]->(q:Qualifier)\n"
            "                WHERE q.key = \"geo_loc_name\"\n"
            "                UNWIND q.value AS location\n"
            "                RETURN location, count(*) AS freq\n"
            "                ORDER BY freq DESC"
        ),
        "parametros": {},
        "plano_esperado": (
            "Antes da migração 0002: NodeByLabelScan(:Qualifier) sobre "
            "2 684 376 nós, ~7,8M dbHits no total. Depois de "
            "`0002_indice_qualifier_key`: NodeIndexSeek(:Qualifier(key)), "
            "raiz cai de dbHits=2 684 377 para dbHits=153 031 — a consulta "
            "não filtra mais TODOS os Qualifier antes de descartar os que "
            "não são 'geo_loc_name'. Sem LIMIT — é uma agregação total, não "
            "uma listagem aberta; o resultado é limitado pela cardinalidade "
            "de localizações distintas (102 no demo), não por um teto do "
            "servidor. Ver docs/data-model/neo4j.md §2 para o PROFILE completo."
        ),
        "teto_resultado": None,  # agregação, não listagem — ver nota acima
    },
}


def obter_catalogo() -> Dict[str, Dict[str, Any]]:
    """Formato compatível com o retorno atual de `GET /neo4j/predefined-queries`.

    Mantém só as quatro chaves que o frontend já consome
    (`name`, `description`, `type`, `query`) — os metadados de plano e teto
    ficam em `CATALOGO` para quem for auditar ou medir de novo, sem inflar o
    payload que a UI recebe.
    """
    return {
        chave: {
            "name": entrada["name"],
            "description": entrada["description"],
            "type": entrada["type"],
            "query": entrada["query"],
        }
        for chave, entrada in CATALOGO.items()
    }
