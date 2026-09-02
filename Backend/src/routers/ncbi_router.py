# routers/ncbi_router.py
import asyncio
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from Bio import Entrez, SeqIO
from Bio.Blast import NCBIWWW

from src.logging_conf import obter_logger

Entrez.email = "seu.email@exemplo.com"

router = APIRouter()
logger = obter_logger(__name__)

class NCBIInfoRequest(BaseModel):
    identifier: str

class BLASTRequest(BaseModel):
    sequence: str
    database: str = "nr"
    program: str = "blastn"

def fetch_ncbi_info_sync(genbank_id: str):
    """Função síncrona para buscar dados no NCBI."""
    try:
        handle = Entrez.esearch(db="nucleotide", term=genbank_id, retmax=1)
        search_results = Entrez.read(handle)
        handle.close()
        
        if not search_results['IdList']:
            return {'error': 'Sequência não encontrada no NCBI'}

        uid = search_results['IdList'][0]
        handle = Entrez.efetch(db="nucleotide", id=uid, rettype="gb", retmode="text")
        record = SeqIO.read(handle, "genbank")
        handle.close()

        return {
            'genbank_id': genbank_id,
            'description': record.description,
            'species': record.annotations.get('organism', 'Desconhecido'),
            'taxonomy': '; '.join(record.annotations.get('taxonomy', [])),
            'length': len(record.seq)
        }
    except Exception as e:
        logger.exception("Erro ao contatar NCBI (id='%s')", genbank_id)
        raise RuntimeError("Erro ao contatar NCBI.") from e

@router.post("/info")
async def get_ncbi_info(request_data: NCBIInfoRequest):
    """Busca informações de uma sequência no NCBI de forma não-bloqueante."""
    if not request_data.identifier:
        raise HTTPException(status_code=400, detail="Identificador não fornecido")
    
    try:
        info = await asyncio.to_thread(fetch_ncbi_info_sync, request_data.identifier)
        if "error" in info:
            raise HTTPException(status_code=404, detail=info["error"])
        return info
    except Exception:
        logger.exception("Erro ao buscar informações NCBI (id='%s')", request_data.identifier)
        raise HTTPException(status_code=500, detail="Erro ao buscar informações no NCBI.")

def run_blast_task(project_name: str, sequence: str, database: str, program: str):
    """
    Função síncrona que executa o BLAST e envia o resultado via WebSocket.
    ATENÇÃO: Isso pode ser MUITO LENTO.
    """
    logger.info("Iniciando BLAST para o projeto %s...", project_name)
    try:
        result_handle = NCBIWWW.qblast(program, database, sequence)
        blast_result = result_handle.read()

        logger.info("BLAST para %s concluído.", project_name)

    except Exception:
        logger.exception("Erro no BLAST para %s", project_name)

@router.post("/blast/{project_name}")
async def run_blast(project_name: str, request_data: BLASTRequest, background_tasks: BackgroundTasks):
    """
    Inicia uma busca BLAST em segundo plano.
    """
    if not request_data.sequence:
        raise HTTPException(status_code=400, detail="Sequência não fornecida")

    background_tasks.add_task(
        run_blast_task,
        project_name,
        request_data.sequence,
        request_data.database,
        request_data.program
    )

    return {"message": f"Análise BLAST para o projeto '{project_name}' iniciada em segundo plano. Você será notificado quando estiver pronta."}