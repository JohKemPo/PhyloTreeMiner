"""D23/DEC-082 — preferência RefSeq/GenBank na rota de gerar dataset via
GenBank (`NCBIAcquisition._process_sequences`, usada por `/api/ncbi/download`
e `/api/ncbi/download-accessions`).

Mesma regra da aquisição de `BioComp_UFF/workflow/workflow_dataAcquisition.py`
(ver `workflow.tests.test_data_acquisition_refseq`), aplicada aqui à segunda
implementação de aquisição — a que a UI de fato chama. `eh_refseq` é
importado de `workflow.utils.ncbi_accession`, não reimplementado.
"""

import pathlib

import pytest
from Bio.Seq import Seq
from Bio.SeqRecord import SeqRecord

PARAMS = dict(initial_min_length=10, refined_min_length=10,
              utr5_end=None, utr3_start=None, similarity_threshold=0.99)

_SEQ_TATERAPOX = Seq("ACGTACGTACGTAAGGCCTT" * 40)
_SEQ_CAMELPOX = Seq("TTGGCCAAGGTTACGTACGT" * 40)
_SEQ_OUTRA = Seq("GGGGCCCCAAAATTTTGGCC" * 40)


def _registro(acesso, descricao, seq):
    return SeqRecord(seq, id=acesso, name=acesso.split(".")[0],
                      description=descricao, annotations={"molecule_type": "DNA"})


@pytest.fixture(scope="module")
def NCBIAcquisition(app_module):
    # Importa via app_module para herdar o sys.path que põe BioComp_UFF no ar
    # — necessário porque o módulo faz `from workflow.utils.ncbi_accession
    # import eh_refseq` no topo.
    from src.services.ncbi_acquisition import NCBIAcquisition
    return NCBIAcquisition


@pytest.fixture
def servico(NCBIAcquisition, tmp_path: pathlib.Path):
    return NCBIAcquisition(
        email="mail@mail.com",
        work_dir=str(tmp_path / "work"),
        data_root=str(tmp_path / "data"),
    )


def test_refseq_prevalece_independente_da_ordem(servico):
    genbank_primeiro = servico._process_sequences(
        [
            _registro("DQ437594.1", "Taterapox GenBank", _SEQ_TATERAPOX),
            _registro("NC_008291.1", "Taterapox RefSeq", _SEQ_TATERAPOX),
        ],
        **PARAMS,
    )
    refseq_primeiro = servico._process_sequences(
        [
            _registro("NC_008291.1", "Taterapox RefSeq", _SEQ_TATERAPOX),
            _registro("DQ437594.1", "Taterapox GenBank", _SEQ_TATERAPOX),
        ],
        **PARAMS,
    )

    assert [r.id for r in genbank_primeiro] == ["NC_008291.1"]
    assert [r.id for r in refseq_primeiro] == ["NC_008291.1"]


def test_posicao_nao_muda_so_o_rotulo(servico):
    processados = servico._process_sequences(
        [
            _registro("AF438165.1", "Camelpox GenBank", _SEQ_CAMELPOX),
            _registro("DQ437594.1", "Taterapox GenBank", _SEQ_TATERAPOX),
            _registro("KP123456.1", "outro genoma", _SEQ_OUTRA),
            _registro("NC_008291.1", "Taterapox RefSeq", _SEQ_TATERAPOX),
        ],
        **PARAMS,
    )

    assert [r.id for r in processados] == ["AF438165.1", "NC_008291.1", "KP123456.1"]


def test_sem_refseq_no_par_mantem_a_primeira_ocorrencia(servico):
    processados = servico._process_sequences(
        [
            _registro("DQ437594.1", "primeira submissão GenBank", _SEQ_TATERAPOX),
            _registro("DQ437595.1", "segunda submissão GenBank", _SEQ_TATERAPOX),
        ],
        **PARAMS,
    )

    assert [r.id for r in processados] == ["DQ437594.1"]


def test_log_da_conta_da_substituicao(servico, caplog):
    with caplog.at_level("INFO", logger="NCBIAcquisition"):
        servico._process_sequences(
            [
                _registro("DQ437594.1", "Taterapox GenBank", _SEQ_TATERAPOX),
                _registro("NC_008291.1", "Taterapox RefSeq", _SEQ_TATERAPOX),
            ],
            **PARAMS,
        )

    mensagem = "\n".join(r.message for r in caplog.records)
    assert "D23/DEC-082" in mensagem
    assert "NC_008291.1" in mensagem
    assert "DQ437594.1" in mensagem
