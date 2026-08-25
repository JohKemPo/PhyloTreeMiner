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
def test_cors_vem_de_variavel_de_ambiente(app_module):
    import inspect
    fonte = inspect.getsource(app_module)
    assert "CORS_ORIGINS" in fonte, (
        "origens permitidas não são configuráveis por ambiente; "
        "o deploy de terceiro não consegue ajustar sem editar código."
    )
