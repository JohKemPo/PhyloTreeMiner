"""Upload de dados de entrada, com os tetos de M4.6 (Arq-B/M5).

Movido de `app.py` — cópia literal de `_ler_upload_ate_o_teto`,
`_extrair_membro_com_teto` e do corpo de `/upload-data`
(`processar_upload`). **Não é refatoração de comportamento**: nenhuma regra
de segurança mudou, só o arquivo em que mora — ver docs/agents/03-backend-core.md
§3 ("upload tem lógica de segurança sensível, M4.6, só mover").

Exceção deliberada à regra "serviço não conhece FastAPI": as três funções
abaixo já levantavam `HTTPException` antes desta extração, e ISSO é a própria
defesa (o teto de bytes vira 413/400 no meio da leitura em blocos, não depois
dela) — trocar por outra exceção seria alterar o mecanismo de segurança
caracterizado por `tests/api/test_limites_entrada.py` e
`tests/unit/test_upload_seguranca.py`. `UploadFile` (FastAPI/Starlette) também
é mantido como tipo de parâmetro pelo mesmo motivo: convertê-lo para bytes
antes de chamar o serviço destruiria a leitura em blocos que é o ponto inteiro
do teto (B1 da revisão de M4.6).
"""
import os
import re
import zipfile
from io import BytesIO, StringIO
from typing import List

from Bio import SeqIO
from fastapi import HTTPException, UploadFile

from src.config import get_settings
from src.seguranca import resolve_within

#: Tamanho do bloco de leitura ao aplicar os tetos de upload (B1/B2 da revisão
#: de M4.6): ler em blocos e abortar assim que ultrapassa o teto evita
#: materializar em memória um arquivo maior do que o próprio teto permite.
TAMANHO_BLOCO_LEITURA_LIMITADA = 1024 * 1024


async def _ler_upload_ate_o_teto(uploaded_file: UploadFile, bytes_restantes: int) -> bytes:
    """Lê `uploaded_file` em blocos, abortando assim que passa de `bytes_restantes`.

    B1 da revisão de M4.6: `await uploaded_file.read()` sem argumento
    materializa o corpo inteiro em memória antes de qualquer checagem de
    teto — um upload de alguns GB é lido por completo só para ser recusado
    depois. Aqui o teto é aplicado durante a leitura, não depois dela.

    Assinatura de 2 parâmetros preservada de propósito (Arq-B/M5):
    `tests/unit/test_upload_seguranca.py` importa e chama esta função direto,
    sem o teto total como terceiro argumento. A mensagem do 413 usa
    `Settings.max_upload_bytes` só para o texto — o teto de verdade é
    `bytes_restantes`, que o chamador já calculou.
    """
    partes = []
    lido = 0
    while True:
        bloco = await uploaded_file.read(TAMANHO_BLOCO_LEITURA_LIMITADA)
        if not bloco:
            break
        lido += len(bloco)
        if lido > bytes_restantes:
            raise HTTPException(
                status_code=413,
                detail=f"Upload excede o limite de {get_settings().max_upload_bytes / 1e6:.0f} MB.",
            )
        partes.append(bloco)
    return b"".join(partes)


def _extrair_membro_com_teto(zip_ref: "zipfile.ZipFile", nome_membro: str, bytes_restantes: int) -> bytes:
    """Descomprime um membro do ZIP em blocos, com teto no byte real produzido.

    B2 da revisão de M4.6: `ZipInfo.file_size` vem do cabeçalho do ZIP e é
    escrito pelo próprio autor do arquivo — um ZIP forjado pode declarar um
    tamanho pequeno e entregar muito mais bytes na descompressão real, o que
    contornaria a checagem por `infolist()` feita antes (mantida como
    triagem barata do caso honesto, não como a defesa). O teto aqui é
    aplicado sobre o `lido` que este laço acumula, byte a byte — não sobre
    `file_size` — então um `file_size` maior que o real não engana este teto.

    Correção (S1, DEC-067): a alegação anterior de que a função "nunca lê
    `file_size`" estava errada — `zipfile.ZipExtFile` usa esse campo
    internamente (junto com o CRC-32) para detectar um cabeçalho forjado
    *menor* que o conteúdo real, e levanta `BadZipFile` nesse caso, que o
    chamador captura e vira `400`. É uma falha segura, não a defesa em si:
    a defesa é este laço nunca confiar no que o cabeçalho diz para decidir
    quanto ler.
    """
    partes = []
    lido = 0
    with zip_ref.open(nome_membro) as membro:
        while True:
            bloco = membro.read(TAMANHO_BLOCO_LEITURA_LIMITADA)
            if not bloco:
                break
            lido += len(bloco)
            if lido > bytes_restantes:
                raise HTTPException(
                    status_code=400,
                    detail="Conteúdo descomprimido do ZIP excede o limite permitido.",
                )
            partes.append(bloco)
    return b"".join(partes)


async def processar_upload(
    name: str,
    files: List[UploadFile],
    data_root: str,
    max_upload_bytes: int,
    max_upload_files: int,
    max_zip_expansion_ratio: int,
) -> dict:
    """Corpo de `/upload-data` — cópia literal, parametrizada pelos tetos
    (antes lidos de globais de app.py, hoje de `src.config.Settings`)."""
    if not name or not re.match(r'^[a-zA-Z0-9_-]+$', name):
        raise HTTPException(status_code=400, detail="Nome inválido. Use apenas letras, números, hífens e underscores.")

    if len(files) > max_upload_files:
        raise HTTPException(status_code=413, detail=f"Máximo de {max_upload_files} arquivos por upload.")

    target_dir = os.path.join(data_root, name)
    os.makedirs(target_dir, exist_ok=True)

    final_fasta_path = os.path.join(target_dir, "concatenated_sequences.fasta")
    all_sequences = []
    processed_files = []
    total_bytes = 0
    # R1 (revisão de DEC-066/DEC-067): global ao upload inteiro, não por
    # ZIP — reiniciar a cada arquivo dava a cada ZIP um orçamento novo de
    # MAX_UPLOAD_BYTES, e vários ZIPs honestos e pequenos somados
    # acumulavam bem mais que o teto declarado (~10 GB nos valores de
    # produção, com 200 OK).
    bytes_descomprimidos_reais = 0

    for uploaded_file in files:
        file_content = await _ler_upload_ate_o_teto(
            uploaded_file, max_upload_bytes - total_bytes
        )
        total_bytes += len(file_content)

        if uploaded_file.filename.endswith('.zip'):
            with zipfile.ZipFile(BytesIO(file_content), 'r') as zip_ref:
                # Triagem barata pelo cabeçalho do ZIP (spoofável, ver B2):
                # rejeita o caso honesto sem gastar CPU descomprimindo.
                descomprimido_declarado = sum(info.file_size for info in zip_ref.infolist())
                comprimido = max(len(file_content), 1)
                if descomprimido_declarado / comprimido > max_zip_expansion_ratio:
                    raise HTTPException(
                        status_code=400,
                        detail="Razão de descompressão do ZIP suspeita demais para processar.",
                    )
                if descomprimido_declarado > max_upload_bytes:
                    raise HTTPException(
                        status_code=413,
                        detail=f"Conteúdo descomprimido do ZIP excede {max_upload_bytes / 1e6:.0f} MB.",
                    )

                zip_files = zip_ref.namelist()
                fasta_files = [f for f in zip_files if f.lower().endswith(('.fasta', '.fa', '.fas', '.faa'))]

                # Defesa real (B2): teto sobre o byte de fato
                # descomprimido, indiferente ao que o cabeçalho declara —
                # e sobre o upload inteiro (R1), não reiniciado por ZIP.
                for fasta_file in fasta_files:
                    try:
                        raw = _extrair_membro_com_teto(
                            zip_ref, fasta_file, max_upload_bytes - bytes_descomprimidos_reais
                        )
                    except zipfile.BadZipFile:
                        # S1: um file_size de cabeçalho forjado menor que o
                        # real produz CRC inválido ao ler até esse limite —
                        # falha segura (não é bypass), mas precisa virar
                        # 400 explícito, não cair no 500 genérico do except
                        # Exception mais externo.
                        raise HTTPException(
                            status_code=400,
                            detail="Conteúdo do ZIP corrompido ou com cabeçalho inconsistente.",
                        )
                    bytes_descomprimidos_reais += len(raw)
                    content = raw.decode('utf-8', errors='ignore')
                    sequences = list(SeqIO.parse(StringIO(content), "fasta"))
                    all_sequences.extend(sequences)
                    processed_files.append(fasta_file)

        elif uploaded_file.filename.lower().endswith(('.fasta', '.fa', '.fas', '.faa')):
            content = file_content.decode('utf-8', errors='ignore')
            sequences = list(SeqIO.parse(StringIO(content), "fasta"))
            all_sequences.extend(sequences)
            processed_files.append(uploaded_file.filename)

        else:
            safe_name = os.path.basename(uploaded_file.filename or "")
            if not re.match(r'^[A-Za-z0-9._-]+$', safe_name):
                raise HTTPException(status_code=400, detail="Nome de arquivo inválido.")
            other_file_path = resolve_within(target_dir, safe_name)
            with open(other_file_path, 'wb') as f:
                f.write(file_content)
            processed_files.append(uploaded_file.filename)

    if all_sequences:
        with open(final_fasta_path, 'w') as output_handle:
            SeqIO.write(all_sequences, output_handle, "fasta")

    return {
        "message": "Upload realizado com sucesso",
        "folder_name": name,
        "processed_files": processed_files,
        "total_sequences": len(all_sequences),
        "output_file": "concatenated_sequences.fasta" if all_sequences else None
    }
