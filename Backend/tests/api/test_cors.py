"""S-3 — CORS."""
import pytest


@pytest.mark.security
def test_cors_nao_e_wildcard_com_credenciais(app_module):
    """`allow_origins=["*"]` combinado com `allow_credentials=True` é recusado
    pelos navegadores e, quando aceito, permite que qualquer origem leia
    respostas autenticadas."""
    cors = [m for m in app_module.app.user_middleware
            if "CORSMiddleware" in str(m.cls)]
    assert cors, "CORSMiddleware não registrado"
    opts = cors[0].kwargs
    origins = opts.get("allow_origins", [])
    if opts.get("allow_credentials"):
        assert "*" not in origins, (
            "allow_origins=['*'] com allow_credentials=True. "
            "Configure por CORS_ORIGINS (env)."
        )


@pytest.mark.security
def test_cors_vem_de_variavel_de_ambiente(monkeypatch):
    """Antes de Arq-B (M5) isto conferia `"CORS_ORIGINS" in inspect.getsource
    (app_module)` — depois da extração para `config.py`, `app.py` só tem a
    string num comentário, e o teste virava vacuamente verde sem provar nada
    (achado do Revisor, DEC-088). Prova pelo comportamento real: muda o env,
    confere que `Settings` recém-criado reflete, sem depender de onde o
    código mora.
    """
    from src.config import Settings

    monkeypatch.setenv("CORS_ORIGINS", "https://exemplo-de-teste.invalid")
    assert Settings().allowed_origins == ["https://exemplo-de-teste.invalid"], (
        "origens permitidas não são configuráveis por ambiente; "
        "o deploy de terceiro não consegue ajustar sem editar código."
    )
