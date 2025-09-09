from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, Optional
from ..services.neo4j_services import neo4j_service

router = APIRouter()

class CQLBlock(BaseModel):
    block: str
    index: int
    total: int
    parameters: Optional[Dict[str, Any]] = None

class CQLScript(BaseModel):
    script: str
    filename: str

@router.post("/execute-block")
async def execute_cql_block(cql_block: CQLBlock):
    """
    Executa um único bloco CQL no banco de dados Neo4j com parâmetros.
    """
    if not neo4j_service.connected:
        raise HTTPException(status_code=400, detail="Não conectado ao Neo4j")
    
    try:
        if cql_block.parameters:
            result = await neo4j_service.execute_query(
                cql_block.block, 
                cql_block.parameters
            )
        else:
            result = await neo4j_service.execute_query(cql_block.block)
            
        return {
            'success': True,
            'index': cql_block.index,
            'result': result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao executar bloco {cql_block.index}: {str(e)}")

@router.post("/execute-cql")
async def execute_cql_script(cql_script: CQLScript):
    """
    Executa um script CQL completo (para compatibilidade)
    """
    if not neo4j_service.connected:
        raise HTTPException(status_code=400, detail="Não conectado ao Neo4j")
    
    try:
        commands = [cmd.strip() for cmd in cql_script.script.split(';') if cmd.strip()]
        
        results = []
        stats = {
            'commands_executed': 0,
            'successful_commands': 0,
            'failed_commands': 0,
            'total_commands': len(commands)
        }
        
        for command in commands:
            if not command:
                continue
                
            try:
                result = await neo4j_service.execute_query(command)
                results.append({
                    'command': command,
                    'status': 'success',
                    'result': result
                })
                stats['successful_commands'] += 1
            except Exception as e:
                results.append({
                    'command': command,
                    'status': 'error',
                    'error': str(e)
                })
                stats['failed_commands'] += 1
            
            stats['commands_executed'] += 1
        
        return {
            'success': True,
            'filename': cql_script.filename,
            'stats': stats,
            'results': results
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao executar script: {str(e)}")