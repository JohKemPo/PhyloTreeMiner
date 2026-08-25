"""P1-3 / S-3 — configuração de infraestrutura que o repositório declara."""
import pathlib
import re

import pytest

RAIZ = pathlib.Path(__file__).resolve().parents[3]
COMPOSE = (RAIZ / "docker-compose.yml").read_text(encoding="utf-8")


@pytest.mark.security
def test_neo4j_nao_escuta_em_todas_as_interfaces():
    publicadas = re.findall(r'-\s*"([^"]*:(?:7474|7687))"', COMPOSE)
    assert publicadas, "portas do Neo4j não encontradas no compose"
    for p in publicadas:
        assert p.startswith("127.0.0.1:"), (
            f"porta {p} publicada em todas as interfaces; o Neo4j fica exposto "
            f"à rede. Use 127.0.0.1:<porta>:<porta>."
        )


@pytest.mark.security
def test_apoc_irrestrito_nao_esta_habilitado():
    """APOC não é usado em nenhuma consulta do projeto, e
    `dbms_security_procedures_unrestricted: apoc.*` com import/export de arquivo
    habilitado dá leitura e escrita no host a quem alcança o Cypher."""
    for chave in ("procedures_unrestricted", "apoc_import_file_enabled",
                  "apoc_export_file_enabled"):
        assert chave not in COMPOSE, f"{chave} ainda habilitado no compose"


@pytest.mark.security
def test_senha_do_neo4j_e_obrigatoria():
    assert "NEO4J_PASSWORD:?" in COMPOSE, (
        "o compose sobe sem senha se a variável faltar; use ${NEO4J_PASSWORD:?...}"
    )


def test_env_example_existe_e_nao_traz_segredo():
    exemplo = RAIZ / ".env.example"
    assert exemplo.exists(), ".env.example ausente: terceiro não sabe o que configurar"
    for linha in exemplo.read_text(encoding="utf-8").splitlines():
        if "=" in linha and not linha.strip().startswith("#"):
            chave, _, valor = linha.partition("=")
            if chave.strip() in ("NEO4J_PASSWORD", "NCBI_API_KEY"):
                assert valor.strip() == "", f"{chave} traz valor preenchido no exemplo"


def test_dependencias_importadas_estao_declaradas():
    req = (RAIZ / "requirements.txt").read_text(encoding="utf-8").lower()
    for pacote in ("python-dotenv", "psutil"):
        assert pacote in req, f"{pacote} é importado em runtime e não está em requirements.txt"
