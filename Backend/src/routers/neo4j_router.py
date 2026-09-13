from fastapi import APIRouter, HTTPException, Header, Depends
from pydantic import BaseModel
from typing import Dict, Any, Optional
from ..services.neo4j_services import get_neo4j_service, Neo4jUnavailableError
from ..logging_conf import obter_logger
from ..seguranca import exigir_admin
from ..graph_queries.catalogo import obter_catalogo

router = APIRouter()
logger = obter_logger(__name__)

NEO4J_RETRY_AFTER_SECONDS = "30"


def _neo4j_indisponivel() -> HTTPException:
    """503 uniforme para as rotas que dependem do Neo4j (M4.1)."""
    return HTTPException(
        status_code=503,
        detail={"connected": False, "message": "Neo4j indisponível. Tente novamente em instantes."},
        headers={"Retry-After": NEO4J_RETRY_AFTER_SECONDS},
    )

class CypherQuery(BaseModel):
    query: str
    parameters: Dict[str, Any] = {}
    
class ConnectionDetails(BaseModel):
    uri: str
    username: str
    password: Optional[str] = None

async def get_user_id(x_user_id: str = Header(...)):
    """Extrai o ID do usuário do Header e garante que existe."""
    if not x_user_id:
        raise HTTPException(status_code=400, detail="X-User-ID header missing")
    return x_user_id

@router.get("/status")
async def get_connection_status(neo4j_service = Depends(get_neo4j_service)):
    """Verifica o status da conexão com Neo4j."""
    return {
        'connected': neo4j_service.connected,
        'uri': neo4j_service.uri,
        'username': neo4j_service.username,
    }

@router.post("/connect", dependencies=[Depends(exigir_admin)])
async def set_connection(details: ConnectionDetails, neo4j_service = Depends(get_neo4j_service)):
    """
    Configura e testa uma nova conexão com o banco de dados Neo4j.
    """
    success = await neo4j_service.update_connection(
        uri=details.uri,
        username=details.username,
        password=details.password
    )
    
    if success:
        return {"success": True, "message": "Conectado ao Neo4j com sucesso!"}
    else:
        raise HTTPException(
            status_code=400,
            detail="Falha ao conectar ao Neo4j. Verifique as credenciais e o URI."
        )

@router.post("/query")
async def execute_cypher_query(
    cypher_query: CypherQuery,
    user_id: str = Depends(get_user_id),
    neo4j_service = Depends(get_neo4j_service),
):
    """Executa uma consulta Cypher personalizada."""

    cypher_query.parameters['user_id'] = user_id

    if not cypher_query.query.strip():
        raise HTTPException(status_code=400, detail="Consulta não fornecida")
    try:
        results = await neo4j_service.execute_query(cypher_query.query, cypher_query.parameters)
        return {'success': True, 'results': results}
    except Neo4jUnavailableError:
        raise _neo4j_indisponivel()
    except HTTPException:
        raise
    except Exception:
        logger.exception("Erro ao executar consulta Cypher")
        raise HTTPException(status_code=500, detail="Erro ao executar a consulta.")

@router.post("/graph")
async def get_graph_data(
    cypher_query: CypherQuery,
    user_id: str = Depends(get_user_id),
    neo4j_service = Depends(get_neo4j_service),
):
    """Retorna dados do grafo para visualização."""
    try:
        cypher_query.parameters['user_id'] = user_id
        graph_data = await neo4j_service.get_graph_data(cypher_query.query, parameters=cypher_query.parameters)
        return {'success': True, 'data': graph_data}
    except Neo4jUnavailableError:
        raise _neo4j_indisponivel()
    except HTTPException:
        raise
    except Exception:
        logger.exception("Erro ao buscar dados do grafo")
        raise HTTPException(status_code=500, detail="Erro ao buscar dados do grafo.")
    
@router.get("/predefined-queries")
async def get_predefined_queries():
    """Retorna uma lista de consultas pré-definidas para o frontend.

    Fonte única do catálogo: `graph_queries/catalogo.py` (M5/Grafo) — lá cada
    consulta carrega também parâmetros, plano de execução esperado e teto de
    resultado, para quem for auditar ou reperfilar. Este endpoint devolve só
    o subconjunto que o frontend já consumia, sem mudar o contrato.
    """
    return {"success": True, "queries": obter_catalogo()}