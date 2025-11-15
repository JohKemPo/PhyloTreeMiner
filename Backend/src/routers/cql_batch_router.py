from fastapi import APIRouter, BackgroundTasks, HTTPException, Depends
from src.services.cql_batch_service import CQLBatchRequest, get_cql_batch_service

router = APIRouter()

@router.post("/execute-batch")
async def execute_cql_batch(
    background_tasks: BackgroundTasks,
    request: CQLBatchRequest,
    cql_batch_service = Depends(get_cql_batch_service)
):
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