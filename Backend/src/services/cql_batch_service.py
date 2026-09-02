from fastapi import HTTPException, BackgroundTasks
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Tuple
import aiofiles
import asyncio
import os
import re
import glob
import tempfile

from src.logging_conf import obter_logger

logger = obter_logger(__name__)

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
        except Exception:
            logger.exception("Erro ao iniciar execução em lote (projeto '%s')", request.project_name)
            raise HTTPException(status_code=500, detail="Erro ao iniciar execução em lote.")

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
                            
                    except Exception:
                        cql_batch_status[project_name]["failed_blocks"] += 1
                        logger.exception("Erro no bloco %s (projeto '%s')", index, project_name)
                    
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
            
        except Exception:
            cql_batch_status[project_name]["status"] = "failed"
            logger.exception("Erro no processamento em lote (projeto '%s')", project_name)

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
            
        except Exception:
            logger.exception("Erro ao executar bloco %s", index)
            return {"success": False, "error": "Erro ao executar o bloco CQL."}

    def parse_cql_blocks(self, content: str) -> List[str]:
        """
        Parseia o conteúdo CQL em blocos individuais.

        C-5e: dividir por `;` sem olhar para aspas quebra qualquer instrução cujo
        dado contenha um `;` literal — descrições do GenBank trazem isso com
        frequência (ex.: "African green monkey kidney cells 1 time; serogroup:
        Spondweni"). Um único `;` dentro de string funde duas instruções em um
        bloco (a segunda vira texto solto) ou corta uma em duas (a segunda fica
        sem MATCH/MERGE). Ambos os casos falham na execução ou gravam lixo.

        Este tokenizer varre caractere a caractere e só corta em `;` fora de
        string simples/dupla, respeitando `\` como escape — mesma regra usada
        pelo parser "inteligente" do frontend (`CQLExecutor.jsx`), mantida em
        paridade para que os dois lados do sistema concordem no número de
        blocos para o mesmo arquivo.
        """
        if not content:
            return []

        cleaned_content = re.sub(r'//.*$', '', content, flags=re.MULTILINE)
        cleaned_content = re.sub(r'/\*[\s\S]*?\*/', '', cleaned_content)

        blocks: List[str] = []
        current: List[str] = []
        in_single_quote = False
        in_double_quote = False
        escaped = False

        for char in cleaned_content:
            current.append(char)

            if escaped:
                escaped = False
                continue

            if char == '\\':
                escaped = True
                continue

            if char == "'" and not in_double_quote:
                in_single_quote = not in_single_quote
            elif char == '"' and not in_single_quote:
                in_double_quote = not in_double_quote
            elif char == ';' and not in_single_quote and not in_double_quote:
                block = ''.join(current).strip()
                if block:
                    blocks.append(block)
                current = []

        last_block = ''.join(current).strip()
        if last_block:
            blocks.append(last_block)

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