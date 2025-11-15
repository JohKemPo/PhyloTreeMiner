from fastapi import APIRouter, HTTPException
from src.services.neo4j_services import neo4j_service
import re

router = APIRouter()


@router.post("/execute")
async def execute_cql(query_data: dict):
    """
    Executa um ou múltiplos comandos CQL
    """
    try:
        query = query_data.get('query')
        parameters = query_data.get('parameters', {})
        
        if not query:
            raise HTTPException(status_code=400, detail="Query CQL é obrigatória")
        
        if not neo4j_service.connected:
            raise HTTPException(status_code=500, detail="Neo4j não conectado")
        
        
        result = await neo4j_service.execute_query(query, parameters)
        
        return {
            "success": True,
            "execution_type": "single",
            "result": result,
            "message": "Query executada com sucesso"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro na execução: {str(e)}")