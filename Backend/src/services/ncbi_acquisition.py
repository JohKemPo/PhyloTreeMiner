import os
import logging
from Bio import Entrez, SeqIO
from Bio.SeqRecord import SeqRecord
import pandas as pd
import tempfile
from typing import List, Dict, Optional
import json

# D23/DEC-082: mesma regra de preferência RefSeq/GenBank da aquisição de
# `BioComp_UFF/workflow/workflow_dataAcquisition.py` — reusada, não
# reimplementada. Importável no escopo do módulo porque `app.py` só importa
# esta classe depois de `PATH_BASE_WORKFLOW` entrar no `sys.path` (ver
# comentário "D23/DEC-082" em `app.py`, junto de suporte_de_ramo/suporte_metodologico).
from workflow.utils.ncbi_accession import eh_refseq

class NCBIAcquisition:
    def __init__(self, email: str, work_dir: str, data_root: str):
        """
        Inicializa o serviço de aquisição de dados do NCBI.
        
        Parameters:
        -----------
        email : str
            E-mail para consulta ao Entrez (obrigatório)
        work_dir : str
            Diretório temporário para processamento
        data_root : str
            Diretório raiz onde os dados finais serão salvos
        """
        Entrez.email = email
        self.work_dir = work_dir
        self.data_root = data_root
        os.makedirs(self.work_dir, exist_ok=True)
        os.makedirs(self.data_root, exist_ok=True)
        
        self.default_params = {
            'initial_min_length': 700,
            'refined_min_length': 9000,
            'utr5_end': None,
            'utr3_start': None,
            'similarity_threshold': 0.99
        }
        
        self.logger = logging.getLogger("NCBIAcquisition")
        self.logger.setLevel(logging.INFO)
        
    def download_sequences(self, query: str, retmax: int = 1000, species_name: str = None, **params) -> Dict:
        """
        Baixa sequências do GenBank baseado em uma query.
        
        Parameters:
        -----------
        query : str
            Query de busca no NCBI
        retmax : int
            Número máximo de resultados
        species_name : str, optional
            Nome personalizado para a espécie
        
        Returns:
        --------
        Dict: Informações sobre o download
        """
        try:
            self.logger.info(f"Buscando sequências com query: {query}")
            
            handle = Entrez.esearch(db="nucleotide", term=query, retmax=retmax)
            record = Entrez.read(handle)
            handle.close()
            
            id_list = record["IdList"]
            count = len(id_list)
            self.logger.info(f"Encontrados {count} sequências")
            
            if count == 0:
                return {"success": False, "message": "Nenhuma sequência encontrada"}
            
            if not species_name:
                if id_list:
                    summary_handle = Entrez.esummary(db="nucleotide", id=id_list[0])
                    summary_record = Entrez.read(summary_handle)
                    summary_handle.close()
                    
                    if summary_record:
                        item = summary_record[0]
                        species_name = item.get('Organism', 'unknown_species')
            
            species_name = self._clean_filename(species_name or "unknown_species")
            
            handle = Entrez.efetch(db="nucleotide", id=id_list, rettype="gb", retmode="text")
            gb_content = handle.read()
            handle.close()
            
            temp_gb = os.path.join(self.work_dir, f"temp_{species_name}.gb")
            with open(temp_gb, "w") as f:
                f.write(gb_content)
            
            records = list(SeqIO.parse(temp_gb, "genbank"))
            
            processed_records = self._process_sequences(
                records, 
                initial_min_length=params.get('initial_min_length', self.default_params['initial_min_length']),
                refined_min_length=params.get('refined_min_length', self.default_params['refined_min_length']),
                utr5_end=params.get('utr5_end', self.default_params['utr5_end']),
                utr3_start=params.get('utr3_start', self.default_params['utr3_start']),
                similarity_threshold=params.get('similarity_threshold', self.default_params['similarity_threshold'])
            )
            
            if not processed_records:
                return {"success": False, "message": "Nenhuma sequência válida encontrada após processamento"}
            
            final_dir = os.path.join(self.data_root, species_name)
            os.makedirs(final_dir, exist_ok=True)
            
            final_fasta = os.path.join(final_dir, f"{species_name}.fasta")
            SeqIO.write(processed_records, final_fasta, "fasta")
            
            metadata = {
                "species": species_name,
                "query": query,
                "sequence_count": len(processed_records),
                "file_path": final_fasta,
                "download_date": pd.Timestamp.now().isoformat(),
                "processing_params": {
                    "initial_min_length": params.get('initial_min_length'),
                    "refined_min_length": params.get('refined_min_length'),
                    "utr5_end": params.get('utr5_end'),
                    "utr3_start": params.get('utr3_start'),
                    "similarity_threshold": params.get('similarity_threshold')
                }
            }
            
            metadata_file = os.path.join(final_dir, "metadata.json")
            with open(metadata_file, "w") as f:
                json.dump(metadata, f, indent=2)
            
            os.remove(temp_gb)
            
            self.logger.info(f"Download concluído: {len(processed_records)} sequências salvas em {final_fasta}")
            
            return {
                "success": True,
                "species": species_name,
                "count": len(processed_records),
                "file_path": final_fasta,
                "folder_path": final_dir,
                "metadata": metadata
            }
            
        except Exception as e:
            self.logger.error(f"Erro no download: {str(e)}")
            return {"success": False, "message": str(e)}
    
    def download_from_accessions(self, accessions: List[str], species_name: str = None, **params) -> Dict:
        """
        Baixa sequências baseado em uma lista de números de acesso.
        
        Parameters:
        -----------
        accessions : List[str]
            Lista de números de acesso
        species_name : str, optional
            Nome personalizado para a espécie
        
        Returns:
        --------
        Dict: Informações sobre o download
        """
        try:
            if not accessions:
                return {"success": False, "message": "Lista de accessions vazia"}
            
            handle = Entrez.efetch(db="nucleotide", id=accessions, rettype="gb", retmode="text")
            gb_content = handle.read()
            handle.close()
            
            if not species_name:
                summary_handle = Entrez.esummary(db="nucleotide", id=accessions[0])
                summary_record = Entrez.read(summary_handle)
                summary_handle.close()
                
                if summary_record:
                    species_name = summary_record[0].get('Organism', 'unknown_species')
                else:
                    species_name = "unknown_species"
            
            species_name = self._clean_filename(species_name)
            
            temp_gb = os.path.join(self.work_dir, f"temp_{species_name}.gb")
            with open(temp_gb, "w") as f:
                f.write(gb_content)
            
            records = list(SeqIO.parse(temp_gb, "genbank"))
            
            processed_records = self._process_sequences(
                records, 
                initial_min_length=params.get('initial_min_length', self.default_params['initial_min_length']),
                refined_min_length=params.get('refined_min_length', self.default_params['refined_min_length']),
                utr5_end=params.get('utr5_end', self.default_params['utr5_end']),
                utr3_start=params.get('utr3_start', self.default_params['utr3_start']),
                similarity_threshold=params.get('similarity_threshold', self.default_params['similarity_threshold'])
            )
            
            if not processed_records:
                return {"success": False, "message": "Nenhuma sequência válida encontrada"}
            
            final_dir = os.path.join(self.data_root, species_name)
            os.makedirs(final_dir, exist_ok=True)
            
            final_fasta = os.path.join(final_dir, f"{species_name}.fasta")
            SeqIO.write(processed_records, final_fasta, "fasta")
            
            metadata = {
                "species": species_name,
                "accessions": accessions,
                "sequence_count": len(processed_records),
                "file_path": final_fasta,
                "download_date": pd.Timestamp.now().isoformat(),
                "processing_params": {
                    "initial_min_length": params.get('initial_min_length'),
                    "refined_min_length": params.get('refined_min_length'),
                    "utr5_end": params.get('utr5_end'),
                    "utr3_start": params.get('utr3_start'),
                    "similarity_threshold": params.get('similarity_threshold')
                }
            }
            
            metadata_file = os.path.join(final_dir, "metadata.json")
            with open(metadata_file, "w") as f:
                json.dump(metadata, f, indent=2)
            
            os.remove(temp_gb)
            
            self.logger.info(f"Download concluído: {len(processed_records)} sequências salvas em {final_fasta}")
            
            return {
                "success": True,
                "species": species_name,
                "count": len(processed_records),
                "file_path": final_fasta,
                "metadata": metadata
            }
            
        except Exception as e:
            self.logger.error(f"Erro no download por accessions: {str(e)}")
            return {"success": False, "message": str(e)}
        
    def _process_sequences(self, records, initial_min_length=700, refined_min_length=9000, 
                          utr5_end=None, utr3_start=None, similarity_threshold=0.99):
        """
        Processa as sequências com os filtros especificados.
        """
        processed = []
        # str(seq) maiúscula -> índice em `processed`. Era um `set` (só
        # sabia dizer "já vi"); precisa ser dict para D23/DEC-082 poder
        # relabelar a posição certa quando o duplicado é o par RefSeq/GenBank.
        indice_por_sequencia = {}

        for rec in records:
            if initial_min_length and len(rec.seq) < initial_min_length:
                continue

            if utr5_end is not None and utr3_start is not None:
                try:
                    cds_features = [f for f in rec.features if f.type == 'CDS']
                    if cds_features:
                        cds = cds_features[0]
                        cds_seq = rec.seq[cds.location.start:cds.location.end]
                        new_rec = SeqRecord(cds_seq, id=rec.id, name=rec.name,
                                          description=rec.description, annotations=rec.annotations)
                        rec = new_rec
                except Exception as e:
                    self.logger.warning(f"Erro ao remover UTRs para {rec.id}: {e}")

            if refined_min_length and len(rec.seq) < refined_min_length:
                continue

            seq_str = str(rec.seq).upper()
            indice_existente = self._indice_duplicata(seq_str, indice_por_sequencia, similarity_threshold)
            if indice_existente is not None:
                # D23/DEC-082: mesma sequência já vista (por similaridade).
                # RefSeq prevalece sobre GenBank, relabelando NA POSIÇÃO em
                # que o sobrevivente por ordem de chegada já está — o
                # conjunto não é reordenado (opção (A) do DEC-082).
                sobrevivente = processed[indice_existente]
                if eh_refseq(rec.id) and not eh_refseq(sobrevivente.id):
                    self.logger.info(
                        f"D23/DEC-082: {rec.id} (RefSeq) substitui "
                        f"{sobrevivente.id} (GenBank) na posição {indice_existente} "
                        "— mesma sequência, RefSeq preferido."
                    )
                    processed[indice_existente] = rec
                    indice_por_sequencia[seq_str] = indice_existente
                continue

            indice_por_sequencia[seq_str] = len(processed)
            processed.append(rec)

        return processed

    def _indice_duplicata(self, seq_str, indice_por_sequencia, similarity_threshold):
        """
        Mesma verificação de similaridade de sempre — mas devolve a POSIÇÃO
        do registro já visto, não só True/False: D23/DEC-082 precisa saber
        onde relabelar quando o duplicado é o par RefSeq/GenBank do mesmo
        genoma.
        """
        for seq_vista, indice in indice_por_sequencia.items():
            matches = sum(1 for a, b in zip(seq_str, seq_vista) if a == b)
            similarity = matches / min(len(seq_str), len(seq_vista))
            if similarity >= similarity_threshold:
                return indice
        return None
    
    def _clean_filename(self, name: str) -> str:
        """Limpa o nome para uso em caminhos de arquivo."""
        invalid_chars = '<>:"/\\|?*'
        for char in invalid_chars:
            name = name.replace(char, '_')
        
        name = name.replace(' ', '_')
        
        if len(name) > 100:
            name = name[:100]
        
        return name
    
    def search_species(self, query: str, retmax: int = 10) -> List[Dict]:
        """
        Busca espécies no NCBI usando esearch + esummary no banco taxonomy.
        """
        try:
            handle = Entrez.esearch(db="taxonomy", term=query, retmax=retmax)
            search_result = Entrez.read(handle)
            handle.close()
            
            id_list = search_result["IdList"]
            if not id_list:
                return []
            
            handle = Entrez.esummary(db="taxonomy", id=",".join(id_list))
            summaries = Entrez.read(handle)
            handle.close()
            
            species_list = []
            for summary in summaries:
                species_list.append({
                    "scientific_name": summary.get("ScientificName", ""),
                    "common_name": summary.get("CommonName", ""),
                    "taxid": summary.get("TaxId", ""),
                    "rank": summary.get("Rank", ""),
                    "division": summary.get("Division", "")
                })
            
            return species_list
            
        except Exception as e:
            self.logger.error(f"Erro na busca de espécies: {str(e)}")
            return []