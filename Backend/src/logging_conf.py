"""Configuração central de logging do backend (M4.2).

O erro real (traceback incluso) fica no log do servidor; o cliente recebe
só uma mensagem genérica em `detail=`. Ver docs/automation/10-marcos-e-metas.md
M4.2 — vazar `str(e)` numa resposta HTTP é o defeito S-4.
"""
import logging
import os

_NIVEL_PADRAO = "INFO"


def configurar_logging() -> None:
    """Configura o `logging` raiz uma única vez, por variável de ambiente `LOG_LEVEL`."""
    nivel = os.getenv("LOG_LEVEL", _NIVEL_PADRAO).upper()
    logging.basicConfig(
        level=getattr(logging, nivel, logging.INFO),
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )


def obter_logger(nome: str) -> logging.Logger:
    """Atalho para `logging.getLogger`, para uniformizar o import nos módulos."""
    return logging.getLogger(nome)
