"""B1/B2 da revisão do lote M4 (T2) — `docs/automation/07-log-de-execucao.md`, DEC-065.

B1: `/upload-data` lia `await uploaded_file.read()` inteiro antes de checar
`MAX_UPLOAD_BYTES` — um upload de vários GB era materializado em memória por
completo só para ser recusado depois. `_ler_upload_ate_o_teto` lê em blocos e
aborta assim que ultrapassa o teto.

B2: a defesa contra zip bomb confiava em `ZipInfo.file_size`, campo do
cabeçalho do ZIP escrito pelo autor do arquivo — um ZIP forjado podia
declarar um tamanho pequeno e entregar muito mais bytes na descompressão
real. `_extrair_membro_com_teto` nunca lê `file_size`: aplica o teto sobre o
byte de fato produzido pela descompressão, o que o torna imune a spoofing
por construção (não há campo do cabeçalho para forjar).
"""
import io
import zipfile

import pytest

from src.app import _extrair_membro_com_teto, _ler_upload_ate_o_teto


class _UploadFalso:
    """Simula `UploadFile.read(n)` sobre um buffer em memória, contando as chamadas."""

    def __init__(self, conteudo: bytes):
        self._buffer = io.BytesIO(conteudo)
        self.chamadas = 0

    async def read(self, tamanho: int) -> bytes:
        self.chamadas += 1
        return self._buffer.read(tamanho)


async def test_upload_aborta_sem_ler_o_arquivo_inteiro():
    """B1: com teto menor que o conteúdo, a leitura para antes do fim do buffer."""
    conteudo = b"x" * (5 * 1024 * 1024)  # 5 MB
    upload = _UploadFalso(conteudo)
    teto = 2 * 1024 * 1024  # 2 MB — bem menor que o conteúdo

    with pytest.raises(Exception) as excinfo:
        await _ler_upload_ate_o_teto(upload, teto)
    assert getattr(excinfo.value, "status_code", None) == 413

    # Blocos de 1 MB (TAMANHO_BLOCO_LEITURA_LIMITADA): abortou ao passar de 2 MB,
    # não leu os 5 MB inteiros. Prova que a materialização é limitada, não total.
    bytes_no_maximo_lidos = upload.chamadas * (1024 * 1024)
    assert bytes_no_maximo_lidos < len(conteudo), (
        f"leu {bytes_no_maximo_lidos} bytes de um arquivo de {len(conteudo)} — "
        "deveria abortar antes de consumir o arquivo inteiro"
    )


async def test_upload_dentro_do_teto_e_lido_por_completo():
    conteudo = b"y" * 1024  # 1 KB
    upload = _UploadFalso(conteudo)

    lido = await _ler_upload_ate_o_teto(upload, 10 * 1024 * 1024)
    assert lido == conteudo


def _zip_com_membro(nome: str, conteudo: bytes) -> bytes:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr(nome, conteudo)
    return buffer.getvalue()


def test_extracao_aborta_pelo_byte_real_nao_pelo_cabecalho():
    """B2: o teto vale para o que a descompressão produz, não para `file_size`.

    Não precisa forjar um `ZipInfo.file_size` mentiroso para provar o ponto:
    a função nunca lê esse campo, então nenhum valor nele mudaria o
    resultado — o mecanismo é imune a spoofing por não consultar a fonte
    forjável, e não por validá-la.
    """
    conteudo_real = b"ACGT" * 100_000  # 400 KB reais, altamente compressível
    zip_bytes = _zip_com_membro("seq.fasta", conteudo_real)

    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
        assert zf.infolist()[0].file_size == len(conteudo_real)  # cabeçalho não mente aqui

        with pytest.raises(Exception) as excinfo:
            _extrair_membro_com_teto(zf, "seq.fasta", bytes_restantes=1024)  # teto bem menor
        assert getattr(excinfo.value, "status_code", None) == 400


def test_extracao_dentro_do_teto_devolve_conteudo_completo():
    conteudo_real = b"ACGT" * 10
    zip_bytes = _zip_com_membro("seq.fasta", conteudo_real)

    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
        extraido = _extrair_membro_com_teto(zf, "seq.fasta", bytes_restantes=10 * 1024 * 1024)
    assert extraido == conteudo_real
