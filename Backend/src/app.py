"""App FastAPI do PhyloTreeMiner — criação do app, middlewares, lifespan e
`include_router` de tudo (Arq-B/M5).

Todas as rotas que moravam aqui foram extraídas para `routers/*` (HTTP,
validação, status) + `services/*` (regra de negócio, sem FastAPI) — ver
`docs/agents/03-backend-core.md`. As poucas reexportações abaixo existem só
porque testes existentes referenciam esses nomes via `app_module.<nome>`
diretamente (mutação de instância/lista compartilhada, ou chamada de função
pura) — nenhuma é usada por código deste arquivo.
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.routers.neo4j_router import router as neo4j_router
from src.routers.ncbi_router import router as ncbi_router
from src.routers.cql_router import router as cql_router
from src.routers.cql_batch_router import router as cql_batch_router
from src.routers.system_router import router as system_router
from src.routers.execution_router import router as execution_router
from src.routers.tree_router import router as tree_router
from src.routers.input_data_router import router as input_data_router
from src.routers.aligners_router import router as aligners_router
from src.services.neo4j_services import neo4j_service
from src.services.cql_batch_service import init_cql_batch_service
from src.logging_conf import configurar_logging, obter_logger
from src.config import get_settings

configurar_logging()
logger = obter_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await neo4j_service.connect()
    init_cql_batch_service()
    yield
    await neo4j_service.close()

app = FastAPI(lifespan=lifespan)

# Origens permitidas configuráveis por CORS_ORIGINS (env) — ver src/config.py.
settings = get_settings()
ALLOWED_ORIGINS = settings.allowed_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(
    neo4j_router,
    prefix="/api/neo4j",
    tags=["Neo4j"]
)

app.include_router(
    cql_router,
    prefix="/api/cql",
    tags=["cql"]
)

app.include_router(
    cql_batch_router,
    prefix="/api/cql-batch",
    tags=["CQL Batch"]
)

app.include_router(
    ncbi_router,
    prefix="/api/ncbi",
    tags=["NCBI"]
)

app.include_router(
    system_router,
    tags=["system"]
)

app.include_router(
    execution_router,
    tags=["execution"]
)

app.include_router(
    tree_router,
    tags=["tree"]
)

app.include_router(
    input_data_router,
    tags=["input-data"]
)

app.include_router(
    aligners_router,
    tags=["aligners"]
)


# --- Reexportações de compatibilidade (Arq-B/M5) ---------------------------
# Cada uma existe porque um teste já escrito referencia o nome via
# `app_module.<nome>`; nenhuma é o objeto "de verdade" — todas apontam para o
# mesmo objeto que o router correspondente usa.

# zona sagrada (A6): tests/unit/test_metadados_cientificos.py chama
# `app_module.map_country_to_region` diretamente.
from src.utils.treePlot import map_country_to_region

# tests/api/test_ncbi_thread.py monkeypatcha métodos de
# `app_module.ncbi_service` (mutação de atributo de instância).
from src.routers.ncbi_router import ncbi_service

# tests/api/test_event_loop.py chama `app_module.performance_watcher()` e
# muta `app_module.performance_clients` (lista compartilhada).
from src.routers.system_router import performance_watcher, performance_clients

# tests/unit/test_rotulos_truncados.py chama `app_module.canonical_label_map`
# e `app_module.analyze_patterns` diretamente — zona sagrada, cálculo em
# services/tree_compare_service.py e services/pattern_analysis_service.py.
from src.services.tree_compare_service import canonical_label_map
from src.services.pattern_analysis_service import analyze_patterns

# tests/unit/test_rotulos_truncados.py chama `app_module.accession_base` e
# `app_module.iter_metadata_nodes` diretamente.
from src.services.tree_metadata_service import accession_base, iter_metadata_nodes, get_node_information

# tests/api/test_previa_de_json.py chama `app_module.json_root_kind`
# diretamente.
from src.services.json_preview_service import json_root_kind

# tests/unit/test_upload_seguranca.py importa estas duas direto de `src.app`.
from src.services.upload_service import _ler_upload_ate_o_teto, _extrair_membro_com_teto

# tests/api/test_project_delete.py, tests/golden/test_execution_routes.py e
# tests/unit/test_stream_workflow.py mutam/chamam estes três diretamente
# (dicionário e instância compartilhados; `stream_workflow_output` é chamada
# de verdade, não monkeypatchada).
from src.services.workflow_runtime import manager, running_workflows
from src.services.execution_service import stream_workflow_output

# tests/conftest.py (`projects_root`), tests/golden/test_system_routes.py,
# tests/unit/test_suporte_de_ramo.py e outros leem `app_module.PROJECTS_ROOT`
# para montar caminhos de verificação (leitura, não isolamento — os testes que
# isolam PROJECTS_ROOT por rota já monkeypatcham `src.config.PROJECTS_ROOT`,
# ver comentário em src/config.py).
from src.config import PROJECTS_ROOT

# tests/unit/test_path_safety.py chama `app_module.resolve_within` direto
# (função pura, sem estado — zero risco de mutação cruzada entre módulos).
from src.seguranca import resolve_within
