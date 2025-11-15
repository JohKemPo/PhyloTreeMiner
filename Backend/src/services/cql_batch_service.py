from fastapi import HTTPException, BackgroundTasks
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Tuple
import aiofiles
import asyncio
import os
import re
import glob
import tempfile

class CQLBatchRequest(BaseModel):
    project_name: str
    cql_content: str = Field(..., description="Conteúdo CQL completo para execução")
    batch_size: int = Field(100, description="Número de comandos por lote")
    max_workers: int = Field(2, description="Número máximo de workers paralelos")

class CQLBatchStatus(BaseModel):
    project_name: str
    status: str
    total_blocks: int
    processed_blocks: int
    failed_blocks: int
    progress: float
    current_batch: int
    total_batches: int

cql_batch_status = {}

class CQLBatchService:
    def __init__(self):
        pass

    async def execute_cql_batch(
        self,
        background_tasks: BackgroundTasks,
        request: CQLBatchRequest
    ):
        """
        Executa conteúdo CQL em lotes
        """
        try:
            if not request.cql_content or not request.cql_content.strip():
                raise HTTPException(status_code=400, detail="Conteúdo CQL vazio")
            
            blocks = self.parse_cql_blocks(request.cql_content)
            
            if not blocks:
                raise HTTPException(status_code=400, detail="Nenhum comando CQL válido encontrado")
            
            cql_batch_status[request.project_name] = {
                "status": "starting",
                "total_blocks": len(blocks),
                "processed_blocks": 0,
                "failed_blocks": 0,
                "progress": 0.0,
                "current_batch": 0,
                "total_batches": (len(blocks) + request.batch_size - 1) // request.batch_size
            }
            
            background_tasks.add_task(
                self.process_cql_batch,
                blocks,
                request.project_name,
                request.batch_size,
                request.max_workers
            )
            
            return {
                "success": True,
                "message": f"Execução em lote iniciada para {request.project_name}",
                "project_name": request.project_name,
                "total_blocks": len(blocks),
                "total_batches": cql_batch_status[request.project_name]["total_batches"]
            }
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Erro ao iniciar execução em lote: {str(e)}")

    async def process_cql_batch(
        self,
        blocks: List[str], 
        project_name: str, 
        batch_size: int, 
        max_workers: int
    ):
        """
        Processa os blocos CQL em lotes
        """
        try:
            cql_batch_status[project_name]["status"] = "processing"
            
            semaphore = asyncio.Semaphore(max_workers)
            
            async def process_block(block, index):
                async with semaphore:
                    try:
                        parameterized_block, parameters = self.convert_block_to_parameterized(block)
                        
                        response = await self.execute_single_block(parameterized_block, parameters, index)
                        
                        if response.get("success"):
                            cql_batch_status[project_name]["processed_blocks"] += 1
                        else:
                            cql_batch_status[project_name]["failed_blocks"] += 1
                            
                    except Exception as e:
                        cql_batch_status[project_name]["failed_blocks"] += 1
                        print(f"Erro no bloco {index}: {str(e)}")
                    
                    total_processed = (
                        cql_batch_status[project_name]["processed_blocks"] + 
                        cql_batch_status[project_name]["failed_blocks"]
                    )
                    progress = (total_processed / len(blocks)) * 100
                    current_batch = (total_processed // batch_size) + 1
                    
                    cql_batch_status[project_name].update({
                        "progress": progress,
                        "current_batch": current_batch
                    })
            
            batch_tasks = []
            for i, block in enumerate(blocks):
                if i % batch_size == 0 and batch_tasks:
                    await asyncio.gather(*batch_tasks)
                    batch_tasks = []
                    await asyncio.sleep(0.1)  
                
                task = asyncio.create_task(process_block(block, i))
                batch_tasks.append(task)
            
            if batch_tasks:
                await asyncio.gather(*batch_tasks)
            
            cql_batch_status[project_name]["status"] = "completed"
            
        except Exception as e:
            cql_batch_status[project_name]["status"] = f"failed: {str(e)}"
            print(f"Erro no processamento em lote: {str(e)}")

    async def execute_single_block(self, block: str, parameters: dict, index: int):
        """
        Executa um único bloco CQL usando o serviço Neo4j existente
        """
        try:
            from src.services.neo4j_services import neo4j_service
            
            if not neo4j_service.connected:
                return {"success": False, "error": "Neo4j não conectado"}
            
            result = await neo4j_service.execute_query(block, parameters)
            
            return {
                "success": True, 
                "message": f"Bloco {index} executado",
                "result": result
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}

    def parse_cql_blocks(self, content: str) -> List[str]:
        """
        Parseia o conteúdo CQL em blocos individuais de forma consistente
        """
        if not content:
            return []
        
        cleaned_content = re.sub(r'//.*$', '', content, flags=re.MULTILINE)
        cleaned_content = re.sub(r'/\*[\s\S]*?\*/', '', cleaned_content)
        
        blocks = [
            block.strip() + ';' 
            for block in cleaned_content.split(';') 
            if block.strip() and not block.strip().startswith('//')
        ]
        
        return blocks

    def convert_block_to_parameterized(self, block: str) -> Tuple[str, dict]:
        """
        Converte um bloco CQL para formato parametrizado
        """
        parameters = {}
        converted_block = block
        
        json_regex = r"(value:\s*)'(\{.*?\})'"
        
        def replace_json(match):
            nonlocal parameters
            param_name = f"param{len(parameters)}"
            parameters[param_name] = match.group(2)
            return f"{match.group(1)}${param_name}"
        
        converted_block = re.sub(json_regex, replace_json, converted_block, flags=re.DOTALL)
        
        return converted_block, parameters

    async def get_batch_status(self, project_name: str):
        """
        Obtém o status atual da execução em lote
        """
        if project_name not in cql_batch_status:
            raise HTTPException(status_code=404, detail="Nenhuma execução em lote encontrada para este projeto")
        
        return cql_batch_status[project_name]

    async def cancel_batch(self, project_name: str):
        """
        Cancela a execução em lote
        """
        if project_name in cql_batch_status:
            cql_batch_status[project_name]["status"] = "cancelled"
            return {"success": True, "message": "Execução cancelada"}
        
        raise HTTPException(status_code=404, detail="Nenhuma execução em lote encontrada")


cql_batch_service = None

def get_cql_batch_service() -> CQLBatchService:
    """Obter instância do serviço - garante que não seja None"""
    global cql_batch_service
    if cql_batch_service is None:
        raise RuntimeError("CQLBatchService não foi inicializado. Chame init_cql_batch_service() primeiro.")
    return cql_batch_service

def init_cql_batch_service() -> CQLBatchService:
    """Inicializar o serviço e retornar a instância"""
    global cql_batch_service
    cql_batch_service = CQLBatchService()
    return cql_batch_service