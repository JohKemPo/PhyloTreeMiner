# routers/aligners_router.py — biblioteca de alinhadores (Arq-B/M5).
#
# Movidas de app.py sem mudar comportamento: `/api/aligners` e
# `/api/aligners/viability`. `ALIGNERS`/`memoria_disponivel_bytes`/
# `viability` continuam vindo do submódulo (workflow.alignment.aligners) —
# fonte única, D5 — não duplicados aqui.
import os

from fastapi import APIRouter, HTTPException, Query

from src import config as cfg
from src.seguranca import resolve_within
from workflow.alignment.aligners import (ALIGNERS, memoria_disponivel_bytes,
                                         viability as aligner_viability)

router = APIRouter()


def _dimensoes_do_fasta(caminho: str):
    """Número de sequências e comprimento da MAIOR delas, sem carregar o arquivo.

    O máximo, e não a média: é uma sequência só que estoura a memória do
    alinhador."""
    n = 0
    maior = 0
    atual = 0
    with open(caminho, "r", encoding="utf-8", errors="ignore") as f:
        for linha in f:
            if linha.startswith(">"):
                n += 1
                maior = max(maior, atual)
                atual = 0
            else:
                atual += len(linha.strip())
    return n, max(maior, atual)


@router.get("/api/aligners")
async def listar_alinhadores():
    """
    A biblioteca de alinhadores: o que existe, o que está instalado, e que
    limites cada um impõe.

    Serve à tela de configuração do experimento. O campo `note` é obrigatório
    na resposta porque limite sem motivo declarado vira superstição — e este
    projeto já carregou um limite de 20 kb que ninguém sabia de onde vinha.
    """
    return {
        "aligners": [
            {
                "key": a.key,
                "label": a.label,
                "binary": a.binary,
                "installed": a.installed(),
                "version": a.version(),
                "max_sequence_bp": a.max_sequence_bp,
                "max_sequences": a.max_sequences,
                "note": a.note,
            }
            for a in ALIGNERS.values()
        ]
    }


@router.get("/api/aligners/viability")
async def viabilidade_de_alinhadores(
    path: str = Query(..., description="Caminho relativo do FASTA ou do diretório de entrada, sob data/."),
):
    """
    Diz, para um conjunto concreto, quais alinhadores são viáveis e **por que**
    os outros não são.

    O veredito é **desta máquina**, não da ferramenta: `estimated_bytes` e
    `available_bytes` vêm separados para que a mensagem seja *"precisa de ~19 GB
    e há 31"* em vez de *"indisponível"*. A primeira é um requisito e diz o que
    mudaria a resposta; a segunda é um veto sem apelação, e esconde que noutra
    máquina seria possível ([R2](../../docs/respostasUteis/r2.md)).

    A política é **avisar, não bloquear**: a resposta traz `viable` e `reasons`,
    e a interface esmaece o inviável mostrando o motivo. Bloquear remove agência
    de quem sabe o que está fazendo; substituir em silêncio é o defeito D1, que
    custou metade do delineamento dos experimentos de *Variola*. Informar é o
    meio-termo que preserva as duas coisas.
    """
    alvo = resolve_within(cfg.DATA_ROOT, path)

    if os.path.isdir(alvo):
        fastas = sorted(
            os.path.join(alvo, f) for f in os.listdir(alvo)
            if f.endswith((".fasta", ".fa", ".fna"))
        )
        if not fastas:
            raise HTTPException(status_code=404, detail="Nenhum FASTA no diretório informado.")
    elif os.path.isfile(alvo):
        fastas = [alvo]
    else:
        raise HTTPException(status_code=404, detail="Caminho não encontrado.")

    n_total = 0
    maior_bp = 0
    for caminho in fastas:
        n, maior = _dimensoes_do_fasta(caminho)
        n_total += n
        maior_bp = max(maior_bp, maior)

    if n_total == 0:
        raise HTTPException(status_code=400, detail="O arquivo não contém nenhuma sequência.")

    vereditos = aligner_viability(n_total, maior_bp)

    return {
        "dataset": {
            "path": path,
            "files": [os.path.basename(f) for f in fastas],
            "n_sequences": n_total,
            "max_sequence_bp": maior_bp,
        },
        # O orçamento da máquina faz parte da resposta porque o veredito é dela,
        # não da ferramenta: o mesmo conjunto pode ser inviável aqui e viável
        # numa máquina maior. Ver docs/respostasUteis/r2.md.
        "machine": {
            "memory_bytes": memoria_disponivel_bytes(),
            "cpu_count": os.cpu_count(),
        },
        "aligners": [v.summary() for v in vereditos.values()],
        "policy": "warn",
    }
