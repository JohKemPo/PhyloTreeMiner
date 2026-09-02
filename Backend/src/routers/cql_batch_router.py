from fastapi import APIRouter, BackgroundTasks, HTTPException, Depends
from src.services.cql_batch_service import CQLBatchRequest, get_cql_batch_service
from src.services.neo4j_services import neo4j_service

router = APIRouter()

NEO4J_RETRY_AFTER_SECONDS = "30"


@router.post("/execute-batch")
async def execute_cql_batch(
    background_tasks: BackgroundTasks,
    request: CQLBatchRequest,
    cql_batch_service = Depends(get_cql_batch_service)
):
    # Falha cedo: sem conexão, não há por que agendar a tarefa em background
    # só para ela falhar bloco a bloco (M4.1).
    if not neo4j_service.connected:
        raise HTTPException(
            status_code=503,
            detail={"connected": False, "message": "Neo4j indisponível. Tente novamente em instantes."},
            headers={"Retry-After": NEO4J_RETRY_AFTER_SECONDS},
        )
    return await cql_batch_service.execute_cql_batch(background_tasks, request)

@router.get("/batch-status/{project_name}")
async def get_batch_status(
    project_name: str,
    cql_batch_service = Depends(get_cql_batch_service)
):
    return await cql_batch_service.get_batch_status(project_name)

@router.post("/cancel-batch/{project_name}")
async def cancel_batch(
    project_name: str,
    cql_batch_service = Depends(get_cql_batch_service)
):
    return await cql_batch_service.cancel_batch(project_name)