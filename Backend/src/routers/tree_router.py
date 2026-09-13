# routers/tree_router.py — rotas de árvore (Arq-B/M5).
#
# Movidas de app.py sem mudar comportamento: `/api/owid/metadata/`,
# `/api/tree/{p}/search-nodes`, `/api/tree/{p}/node/{node_id}`,
# `/api/tree/{p}/insights`, `/api/tree/{p}/branch-support`,
# `/api/tree/{p}/methodological-support`, `/api/tree/metadata/{p}`,
# `/api/gen_plot/{p}`, `/api/tree/compare` (zona sagrada de RF/quartet,
# services/tree_compare_service.py) e `/api/tree/pattern-analysis/{p}` (zona
# sagrada de FPMax, services/pattern_analysis_service.py).
#
# `get_metadata_cache` é acessado via módulo qualificado (`tms.get_metadata_cache`,
# não `from ... import get_metadata_cache`) porque `test_cpu_bound_to_thread.py`
# o troca por um fake, e só um lookup em tempo de chamada sobre o módulo
# enxerga a troca (mesma convenção de `PROJECTS_ROOT` em src/config.py).
import asyncio
import json
import os
from typing import Optional

from Bio import Phylo
from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import FileResponse, JSONResponse

from src import config as cfg
from src.logging_conf import obter_logger
from src.services import tree_metadata_service as tms
from src.services import tree_compare_service as tcs
from src.services import pattern_analysis_service as pas
from src.services.genericOWIDAnalyzer import GenericOWIDAnalyzer
from src.seguranca import resolve_within
from src.suporte_de_ramo import ler_suporte_do_projeto
from src.suporte_metodologico import ler_suporte_metodologico_do_projeto
from src.utils.treePlot import render_annotated_tree

router = APIRouter()
logger = obter_logger(__name__)


@router.post("/api/tree/compare")
async def compare_trees(tree_data: dict):
    """
    Compara duas árvores filogenéticas no formato Nexus
    """
    try:
        # M4.10: dendropy/RF é CPU-bound; roda numa thread para não travar o
        # loop. Refatoração pura — a lógica abaixo não mudou de lugar nenhum.
        return await asyncio.to_thread(tcs._comparar_arvores_sync, tree_data)
    except HTTPException:
        raise
    except ValueError:
        logger.warning("Entrada inválida em /api/tree/compare", exc_info=True)
        raise HTTPException(status_code=400, detail="Entrada inválida para comparação de árvores.")
    except Exception:
        logger.exception("Erro ao comparar árvores")
        raise HTTPException(status_code=500, detail="Erro ao comparar árvores.")


@router.get("/api/tree/pattern-analysis/{project_name}")
async def analyze_tree_patterns(
    project_name: str,
    rare_threshold: float = Query(0.3, ge=0.0, le=1.0),
    robust_threshold: float = Query(0.6, ge=0.0, le=1.0),
    min_pattern_size: int = Query(1, ge=1),
    max_pattern_size: int = Query(100, ge=1)
):
    """
    Analisa padrões de assinatura única e padrões quase-invariantes em todas as árvores de um projeto.
    """
    try:
        # M4.10: FPMax/hash de subárvore é CPU-bound; roda numa thread para não
        # travar o loop. Refatoração pura — mesma lógica, só mudou de função.
        return await asyncio.to_thread(
            pas._analisar_padroes_sync,
            project_name, rare_threshold, robust_threshold, min_pattern_size, max_pattern_size,
            cfg.PROJECTS_ROOT,
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Erro na análise de padrões do projeto '%s'", project_name)
        raise HTTPException(status_code=500, detail="Erro na análise de padrões.")


@router.post("/api/owid/metadata/")
async def get_owid_metadata(request: Request):
    try:
        data = await request.json()
        analyzer = GenericOWIDAnalyzer(data)
        report = analyzer.generate_comprehensive_report()
        return JSONResponse(content=report)
    except HTTPException:
        raise
    except Exception:
        logger.exception("Erro ao processar JSON em /api/owid/metadata/")
        raise HTTPException(status_code=400, detail="Erro ao processar o JSON enviado.")


@router.get("/api/tree/{project_name}/search-nodes")
async def search_tree_nodes(
    project_name: str,
):
    """Retorna apenas os IDs dos nós que correspondem aos filtros."""
    metadata_path = os.path.join(cfg.PROJECTS_ROOT, project_name, 'out', 'outputs', "metadata.json")
    if not os.path.exists(metadata_path):
        raise HTTPException(status_code=404, detail="Metadata not found")

    try:
        cache = await asyncio.to_thread(tms.get_metadata_cache, metadata_path)
        nodes = cache["nodes"]

        return nodes

    except HTTPException:
        raise
    except Exception:
        logger.exception("Erro ao buscar nós do projeto '%s'", project_name)
        raise HTTPException(status_code=500, detail="Erro ao buscar nós da árvore.")


@router.get("/api/tree/{project_name}/node/{node_id}")
async def get_node_details(project_name: str, node_id: str):
    """Busca os detalhes de um único nó."""
    metadata_path = os.path.join(cfg.PROJECTS_ROOT, project_name, 'out', 'outputs', "metadata.json")
    if not os.path.exists(metadata_path):
        raise HTTPException(status_code=404, detail="Metadata not found")

    try:

        cache = await asyncio.to_thread(tms.get_metadata_cache, metadata_path)

        node = cache["node_index"].get(node_id)

        if not node:
            raise HTTPException(status_code=404, detail="Node not found in metadata")

        return node
    except HTTPException:
        raise
    except Exception:
        logger.exception("Erro ao buscar detalhes do nó '%s' no projeto '%s'", node_id, project_name)
        raise HTTPException(status_code=500, detail="Erro ao buscar detalhes do nó.")


@router.get("/api/tree/{project_name}/insights")
async def get_tree_insights(project_name: str):
    """Processa agregações e métricas de forma iterativa no servidor."""
    metadata_path = os.path.join(cfg.PROJECTS_ROOT, project_name, 'out', 'outputs', "metadata.json")
    if not os.path.exists(metadata_path):
        raise HTTPException(status_code=404, detail="Metadata not found")

    try:

        cache = await asyncio.to_thread(tms.get_metadata_cache, metadata_path)

        return cache["insights"]
    except HTTPException:
        raise
    except Exception:
        logger.exception("Erro ao gerar insights do projeto '%s'", project_name)
        raise HTTPException(status_code=500, detail="Erro ao gerar insights da árvore.")


@router.get("/api/tree/{project_name}/branch-support")
async def get_branch_support(
    project_name: str,
    tree: Optional[str] = Query(
        None,
        description="Nome de um único arquivo de árvore em out/Trees. Omitido, lê todos.",
    ),
):
    """Suporte de ramo por clado, **com o método e a métrica de origem** (M3.1).

    É a primeira rota que leva ao usuário o suporte que o pipeline já calcula e
    grava no Nexus. Cada ramo sai com `valor`, `metrica` e `metodo`, e nada é
    normalizado: UFBoot (IQ-TREE) e FBP (RAxML-NG) dividem a escala 0-100 sem
    serem a mesma métrica, e o suporte local do FastTree (0-1) é outra coisa
    ainda (DEC-064). Um campo genérico `support` seria pior que não expor nada.

    Método sem métrica declarada (NJ/UPGMA) devolve `metrica: null` com o
    motivo e lista de ramos vazia — nunca `0` (regra 5).
    """
    dir_trees = resolve_within(cfg.PROJECTS_ROOT, project_name, "out", "Trees")
    if not os.path.isdir(dir_trees):
        raise HTTPException(status_code=404, detail="Diretório de árvores não encontrado")

    if tree is not None:
        caminho = resolve_within(dir_trees, tree)
        if not os.path.isfile(caminho):
            raise HTTPException(status_code=404, detail="Árvore não encontrada")
        tree = os.path.basename(caminho)

    try:
        # Leitura e travessia de árvore são CPU-bound (M4.10): fora do loop.
        resultado = await asyncio.to_thread(ler_suporte_do_projeto, dir_trees, tree)
    except HTTPException:
        raise
    except Exception:
        logger.exception("Erro ao ler suporte de ramo do projeto '%s'", project_name)
        raise HTTPException(status_code=500, detail="Erro ao ler suporte de ramo.")

    resultado["projeto"] = project_name
    return resultado


@router.get("/api/tree/{project_name}/methodological-support")
async def get_methodological_support(
    project_name: str,
    alinhador: Optional[str] = Query(
        None,
        description="Restringe o universo a um alinhador (ex.: 'mafft'). Omitido, usa todos os pipelines em disco.",
    ),
):
    """Suporte metodológico por clado — a outra metade de M3 (M3.3/M3.4).

    Complementa `/branch-support`: aquela rota mede robustez **amostral**
    (bootstrap, dentro de um pipeline); esta mede robustez **metodológica**
    (`sup(b) = |pipelines que recuperam b| / M`, `03-metricas §4.1`) — quantos
    pipelines diferentes (alinhador × método de inferência) concordam no mesmo
    clado. As duas métricas são ortogonais por construção: um clado pode ter
    bootstrap máximo e suporte metodológico baixo, e é exatamente essa
    discordância que o argumento do artigo mede (`make main-result`).

    `clade_id` usa a mesma identidade canônica (D3/D5) de `/branch-support`,
    `metadata.json`, FPMax e Neo4j — o cliente cruza as duas rotas por esse
    campo para mostrar bootstrap e suporte metodológico lado a lado do mesmo
    ramo.
    """
    dir_trees = resolve_within(cfg.PROJECTS_ROOT, project_name, "out", "Trees")
    if not os.path.isdir(dir_trees):
        raise HTTPException(status_code=404, detail="Diretório de árvores não encontrado")

    try:
        # TreeSet/StabilityAnalyzer são CPU-bound (M4.10): fora do loop.
        resultado = await asyncio.to_thread(
            ler_suporte_metodologico_do_projeto, dir_trees, alinhador
        )
    except ValueError:
        logger.warning(
            "Alinhador '%s' não encontrado no projeto '%s'", alinhador, project_name
        )
        raise HTTPException(status_code=404, detail="Alinhador não encontrado neste projeto.")
    except HTTPException:
        raise
    except Exception:
        logger.exception("Erro ao ler suporte metodológico do projeto '%s'", project_name)
        raise HTTPException(status_code=500, detail="Erro ao ler suporte metodológico.")

    resultado["projeto"] = project_name
    return resultado


@router.get("/api/tree/metadata/{project_name}", status_code=202)
async def get_tree_metadata(project_name: str):
    """
    Obtém metadados para os nós de uma árvore filogenética.
    """
    project_path = os.path.join(cfg.PROJECTS_ROOT, project_name)
    metadata_path = os.path.join(project_path, 'out', 'outputs', "metadata.json")

    if not os.path.exists(metadata_path):
        raise HTTPException(status_code=404, detail="Metadata file not found")

    try:
        with open(metadata_path, 'r') as f:
            metadata = json.load(f)

        # with open(os.path.join(project_path,'out','outputs',"metadata_filtered.json"), 'w') as f:
        #      json.dump([metadata[0][0]], f, indent=2)

        return [metadata[0][0]]

    except HTTPException:
        raise
    except Exception:
        logger.exception("Erro ao ler metadata do projeto '%s'", project_name)
        raise HTTPException(status_code=500, detail="Erro ao ler metadata.")


@router.get("/api/gen_plot/{project_name}", status_code=200)
async def generate_tree_plot(project_name: str):
    project_path = os.path.join(cfg.PROJECTS_ROOT, project_name)

    # Adicionado: Resolução do caminho da árvore (Ajuste a extensão/nome conforme seu pipeline)
    tree_path = os.path.join(project_path, 'out', 'Trees', 'tree_dataset_final_mafft_iqtree.nwk')
    nexus_path = os.path.join(project_path, 'out', 'Trees', 'tree_dataset_final_mafft_iqtree.nexus')
    plot_dir = os.path.join(project_path, 'out', 'outputs', "plot")
    plot_path = os.path.join(plot_dir, "arvore_anotada_final.png")
    metadata_path = os.path.join(project_path, 'out', 'outputs', "metadata.json")

    if not os.path.exists(metadata_path):
        raise HTTPException(status_code=404, detail="Metadata not found")

    if not os.path.exists(tree_path):
        if os.path.exists(nexus_path):
            try:
                logger.info("Convertendo arquivo NEXUS para Newick (projeto '%s')...", project_name)
                # M4.10: conversão de árvore é CPU-bound; roda numa thread.
                await asyncio.to_thread(Phylo.convert, nexus_path, 'nexus', tree_path, 'newick')
            except HTTPException:
                raise
            except Exception:
                logger.exception("Erro ao converter NEXUS para Newick (projeto '%s')", project_name)
                raise HTTPException(status_code=500, detail="Erro ao converter árvore de NEXUS para Newick.")
        else:
            raise HTTPException(status_code=404, detail="Tree files (.nwk or .nexus) not found")

    try:
        os.makedirs(plot_dir, exist_ok=True)

        # M4.10: a leitura/indexação do metadata é CPU-bound e thread-safe;
        # roda numa thread (cache protegido por cache_lock).
        cache = await asyncio.to_thread(tms.get_metadata_cache, metadata_path)
        node_index = cache["node_index"]  # dict indexado pela chave, acesso O(1) no ETE3 (M4.12: era cache["nodes"], uma lista)

        # B4 (revisão de M4.10): render_annotated_tree usa ete3/PyQt, que
        # exige rodar na main thread — chamá-la via asyncio.to_thread causa
        # SIGSEGV ("QApplication was not created in the main() thread"),
        # confirmado por execução real. Fica síncrona no event loop, como
        # antes de M4.10; só a parte que é de fato thread-safe foi movida.
        if not os.path.exists(plot_path):
            render_annotated_tree(
                tree_file=tree_path,
                metadata_dict=node_index,
                output_file=plot_path
            )

        # Retorna o arquivo binário da imagem gerada
        return FileResponse(plot_path, media_type="image/png")

    except HTTPException:
        raise
    except Exception:
        logger.exception("Erro ao gerar a visualização do projeto '%s'", project_name)
        raise HTTPException(status_code=500, detail="Erro ao gerar a visualização.")
