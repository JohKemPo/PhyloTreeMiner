from fastapi import APIRouter, HTTPException
from src.services.neo4j_services import neo4j_service, Neo4jUnavailableError
import re

router = APIRouter()

NEO4J_RETRY_AFTER_SECONDS = "30"


def _neo4j_indisponivel() -> HTTPException:
    """503 uniforme para as rotas que dependem do Neo4j (M4.1)."""
    return HTTPException(
        status_code=503,
        detail={"connected": False, "message": "Neo4j indisponível. Tente novamente em instantes."},
        headers={"Retry-After": NEO4J_RETRY_AFTER_SECONDS},
    )


@router.post("/execute")
async def execute_cql(query_data: dict):
    """
    Executa um ou múltiplos comandos CQL
    """
    try:
        query = query_data.get('query')
        parameters = query_data.get('parameters', {})
        user_id_request = query_data.get('user_id')
        
        if not query:
            raise HTTPException(status_code=400, detail="Query CQL é obrigatória")

        if not neo4j_service.connected:
            raise _neo4j_indisponivel()

        if user_id_request and "<<USER_UID>>" in query:
            query = query.replace("<<USER_UID>>", user_id_request)

        result = await neo4j_service.execute_query(query, parameters)

        return {
            "success": True,
            "execution_type": "single",
            "result": result,
            "message": "Query executada com sucesso"
        }

    except Neo4jUnavailableError:
        raise _neo4j_indisponivel()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro na execução: {str(e)}")
    
@router.post("/execute-batch")
async def execute_batch_cql(query_data: dict):
    """
    Executa comandos CQL em lote para mitigar overhead de rede e transações.
    """
    try:
        queries = query_data.get('queries', [])
        user_id_request = query_data.get('user_id')
        
        if not queries or not isinstance(queries, list):
            raise HTTPException(status_code=400, detail="A lista de queries é obrigatória")

        if not neo4j_service.connected:
            raise _neo4j_indisponivel()

        batch_payload = []
        for query in queries:
            if user_id_request and "<<USER_UID>>" in query:
                query = query.replace("<<USER_UID>>", user_id_request)
            batch_payload.append((query, {"user_id": user_id_request}))
            
        results = await neo4j_service.execute_batch_queries(batch_payload)
        
        success_count = sum(1 for r in results if r.get("success"))
        
        return {
            "success": True,
            "execution_type": "batch",
            "executed": success_count,
            "total": len(queries),
            "results": results
        }

    except Neo4jUnavailableError:
        raise _neo4j_indisponivel()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro na execução do batch: {str(e)}")