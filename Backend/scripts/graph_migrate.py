"""Runner de migrações de esquema do grafo Neo4j (M5/Grafo).

Mecanismo leve, sem framework: cada migração é um par de arquivos `.cql` em
`Backend/src/graph_migrations/`, nomeado `NNNN_slug.up.cql` / `NNNN_slug.down.cql`.
Cada arquivo deve ser idempotente por si só (`IF NOT EXISTS` / `IF EXISTS`) —
o rastreamento abaixo é uma segunda camada de segurança, não a única.

O que já foi aplicado fica registrado NO PRÓPRIO BANCO, como nó
`(:SchemaMigration {id, applied_at})` — não em arquivo local — porque o
esquema pertence ao banco e precisa sobreviver a reconectar em outra máquina
(handoff de validação, por exemplo).

Uso:
    python scripts/graph_migrate.py status
    python scripts/graph_migrate.py up [--target 0002_indice_qualifier_key]
    python scripts/graph_migrate.py down [--target 0002_indice_qualifier_key] [--steps N]

`down` sem `--target` reverte a migração aplicada mais recentemente (a de
`applied_at` maior). `--steps N` reverte as N mais recentes em ordem inversa.
`down --target X` reverte X **e tudo que foi aplicado depois dele**, da mais
recente para a mais antiga — simétrico ao `up --target`, para nunca deixar
uma migração posterior registrada como aplicada sobre um esquema que ela
não espera mais encontrar.
"""
import argparse
import asyncio
import os
import pathlib
import re
import sys
from typing import List, Optional

from dotenv import load_dotenv  # noqa: E402
from neo4j import AsyncGraphDatabase  # noqa: E402

load_dotenv(pathlib.Path(__file__).resolve().parents[2] / ".env")

URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
USUARIO = os.getenv("NEO4J_USERNAME", "neo4j")
SENHA = os.getenv("NEO4J_PASSWORD")

DIR_MIGRACOES = pathlib.Path(__file__).resolve().parents[1] / "src" / "graph_migrations"

BOOTSTRAP_CONSTRAINT = (
    "CREATE CONSTRAINT schema_migration_id_unico IF NOT EXISTS "
    "FOR (m:SchemaMigration) REQUIRE m.id IS UNIQUE"
)

NOME_PADRAO = re.compile(r"^(\d{4})_([a-z0-9_]+)\.up\.cql$")


class Migracao:
    def __init__(self, id_: str, caminho_up: pathlib.Path, caminho_down: pathlib.Path):
        self.id = id_
        self.caminho_up = caminho_up
        self.caminho_down = caminho_down

    def __repr__(self):
        return f"Migracao({self.id})"


def descobrir_migracoes() -> List[Migracao]:
    """Lista as migrações locais, ordenadas pelo prefixo numérico."""
    if not DIR_MIGRACOES.is_dir():
        return []

    migracoes = []
    for arquivo_up in sorted(DIR_MIGRACOES.glob("*.up.cql")):
        m = NOME_PADRAO.match(arquivo_up.name)
        if not m:
            print(f"aviso: ignorando arquivo fora do padrão NNNN_slug.up.cql: {arquivo_up.name}", file=sys.stderr)
            continue
        id_ = arquivo_up.name[: -len(".up.cql")]
        caminho_down = DIR_MIGRACOES / f"{id_}.down.cql"
        if not caminho_down.exists():
            raise SystemExit(f"migração '{id_}' não tem o par .down.cql — recusando prosseguir")
        migracoes.append(Migracao(id_, arquivo_up, caminho_down))

    migracoes.sort(key=lambda mig: mig.id)
    return migracoes


def dividir_statements(conteudo: str) -> List[str]:
    """Divide um arquivo .cql em statements individuais.

    Remove comentários de linha `//` e divide por `;`. Statements de DDL
    (CREATE/DROP CONSTRAINT/INDEX) não costumam ter `;` dentro de literal de
    string, então um split simples é suficiente aqui — diferente do CQL de
    ingest (ver `cql_batch_service.parse_cql_blocks`), que precisa ser
    consciente de aspas por causa de descrições de GenBank.
    """
    sem_comentarios = re.sub(r"//.*$", "", conteudo, flags=re.MULTILINE)
    partes = [p.strip() for p in sem_comentarios.split(";")]
    return [p for p in partes if p]


async def conectar():
    if not SENHA:
        raise SystemExit("NEO4J_PASSWORD ausente no .env")
    driver = AsyncGraphDatabase.driver(URI, auth=(USUARIO, SENHA))
    await driver.verify_connectivity()
    return driver


async def garantir_bootstrap(session):
    await session.run(BOOTSTRAP_CONSTRAINT)


async def migracoes_aplicadas(session) -> List[dict]:
    resultado = await session.run(
        "MATCH (m:SchemaMigration) RETURN m.id AS id, m.applied_at AS applied_at "
        "ORDER BY m.applied_at ASC"
    )
    return await resultado.data()


async def aplicar_statements(session, statements: List[str], id_migracao: str):
    for stmt in statements:
        try:
            await session.run(stmt)
        except Exception as exc:
            raise RuntimeError(
                f"migração '{id_migracao}' falhou no statement:\n  {stmt}\nerro: {exc}"
            ) from exc


async def cmd_status(driver):
    locais = descobrir_migracoes()
    async with driver.session() as session:
        await garantir_bootstrap(session)
        aplicadas = {r["id"]: r["applied_at"] for r in await migracoes_aplicadas(session)}

    if not locais:
        print("nenhuma migração encontrada em", DIR_MIGRACOES)
        return

    for mig in locais:
        if mig.id in aplicadas:
            print(f"[aplicada]  {mig.id}  (em {aplicadas[mig.id]})")
        else:
            print(f"[pendente]  {mig.id}")


async def cmd_up(driver, alvo: Optional[str]):
    locais = descobrir_migracoes()
    async with driver.session() as session:
        await garantir_bootstrap(session)
        aplicadas = {r["id"] for r in await migracoes_aplicadas(session)}

        pendentes = [m for m in locais if m.id not in aplicadas]
        if alvo:
            if not any(m.id == alvo for m in locais):
                raise SystemExit(f"migração alvo '{alvo}' não encontrada")
            pendentes = [m for m in pendentes if m.id <= alvo]

        if not pendentes:
            print("nada a aplicar — todas as migrações locais já estão registradas no banco")
            return

        for mig in pendentes:
            conteudo = mig.caminho_up.read_text(encoding="utf-8")
            statements = dividir_statements(conteudo)
            print(f"aplicando {mig.id} ({len(statements)} statement(s))...")
            await aplicar_statements(session, statements, mig.id)
            await session.run(
                "MERGE (m:SchemaMigration {id: $id}) SET m.applied_at = datetime()",
                {"id": mig.id},
            )
            print(f"  ok: {mig.id} registrada")


async def cmd_down(driver, alvo: Optional[str], passos: int):
    locais = {m.id: m for m in descobrir_migracoes()}
    async with driver.session() as session:
        await garantir_bootstrap(session)
        aplicadas = await migracoes_aplicadas(session)  # ordenado ASC por applied_at

    if not aplicadas:
        print("nada a reverter — nenhuma migração registrada no banco")
        return

    if alvo:
        if alvo not in locais:
            raise SystemExit(f"migração alvo '{alvo}' não encontrada localmente")
        # Simétrico ao `up --target`: reverte `alvo` e tudo que foi aplicado
        # depois dele, da mais recente para a mais antiga. Reverter só `alvo`
        # isolado deixaria uma migração posterior registrada como aplicada
        # sobre um esquema que ela não esperava mais encontrar.
        ids_aplicados_desc = [r["id"] for r in reversed(aplicadas)]
        a_reverter = [id_ for id_ in ids_aplicados_desc if id_ >= alvo]
    else:
        # mais recentes primeiro
        ordem_desc = [r["id"] for r in reversed(aplicadas)]
        a_reverter = ordem_desc[:passos]

    async with driver.session() as session:
        for id_ in a_reverter:
            if id_ not in locais:
                raise SystemExit(f"migração '{id_}' está registrada no banco mas não existe localmente — não é seguro reverter")
            mig = locais[id_]
            conteudo = mig.caminho_down.read_text(encoding="utf-8")
            statements = dividir_statements(conteudo)
            print(f"revertendo {id_} ({len(statements)} statement(s))...")
            await aplicar_statements(session, statements, id_)
            await session.run("MATCH (m:SchemaMigration {id: $id}) DETACH DELETE m", {"id": id_})
            print(f"  ok: {id_} revertida e removida do registro")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="comando", required=True)

    sub.add_parser("status", help="lista migrações locais e o que já está aplicado no banco")

    p_up = sub.add_parser("up", help="aplica as migrações pendentes, em ordem")
    p_up.add_argument("--target", dest="alvo", default=None, help="aplica até esta migração (inclusive)")

    p_down = sub.add_parser("down", help="reverte migrações já aplicadas")
    p_down.add_argument("--target", dest="alvo", default=None, help="reverte até esta migração (inclusive), da mais recente para trás")
    p_down.add_argument("--steps", dest="passos", type=int, default=1, help="quantas migrações reverter (ignorado se --target for usado)")

    args = ap.parse_args()

    async def rodar():
        driver = await conectar()
        try:
            if args.comando == "status":
                await cmd_status(driver)
            elif args.comando == "up":
                await cmd_up(driver, args.alvo)
            elif args.comando == "down":
                await cmd_down(driver, args.alvo, args.passos)
        finally:
            await driver.close()

    asyncio.run(rodar())


if __name__ == "__main__":
    main()
