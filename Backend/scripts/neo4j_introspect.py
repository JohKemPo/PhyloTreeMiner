"""Introspecção do modelo real do grafo Neo4j (M0.9).

Lê o esquema efetivo — labels, relacionamentos, propriedades, constraints e
índices — e devolve o que existe, não o que se supõe existir.

    python scripts/neo4j_introspect.py [--json]
"""
import argparse
import asyncio
import json
import os
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))

from dotenv import load_dotenv  # noqa: E402
from neo4j import AsyncGraphDatabase  # noqa: E402

load_dotenv(pathlib.Path(__file__).resolve().parents[2] / ".env")

URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
USER = os.getenv("NEO4J_USERNAME", "neo4j")
SENHA = os.getenv("NEO4J_PASSWORD")

CONSULTAS = {
    "labels": "CALL db.labels() YIELD label RETURN label ORDER BY label",
    "relacionamentos": (
        "CALL db.relationshipTypes() YIELD relationshipType "
        "RETURN relationshipType ORDER BY relationshipType"
    ),
    "constraints": "SHOW CONSTRAINTS YIELD name, type, labelsOrTypes, properties",
    "indices": "SHOW INDEXES YIELD name, type, labelsOrTypes, properties, state",
}


async def coletar():
    if not SENHA:
        raise SystemExit("NEO4J_PASSWORD ausente no .env")
    driver = AsyncGraphDatabase.driver(URI, auth=(USER, SENHA))
    saida = {}
    try:
        async with driver.session() as s:
            for nome, cypher in CONSULTAS.items():
                r = await s.run(cypher)
                saida[nome] = [dict(reg) for reg in await r.data()] if False else \
                    [reg for reg in await r.data()]

            saida["contagem_por_label"] = {}
            for reg in saida["labels"]:
                lbl = reg["label"]
                r = await s.run(f"MATCH (n:`{lbl}`) RETURN count(n) AS n")
                saida["contagem_por_label"][lbl] = (await r.single())["n"]

            saida["contagem_por_relacionamento"] = {}
            for reg in saida["relacionamentos"]:
                tipo = reg["relationshipType"]
                r = await s.run(f"MATCH ()-[r:`{tipo}`]->() RETURN count(r) AS n")
                saida["contagem_por_relacionamento"][tipo] = (await r.single())["n"]

            saida["propriedades_por_label"] = {}
            for reg in saida["labels"]:
                lbl = reg["label"]
                r = await s.run(
                    f"MATCH (n:`{lbl}`) WITH n LIMIT 500 "
                    f"UNWIND keys(n) AS k RETURN DISTINCT k ORDER BY k"
                )
                saida["propriedades_por_label"][lbl] = [x["k"] for x in await r.data()]

            r = await s.run("MATCH (n) RETURN count(n) AS n")
            saida["total_nos"] = (await r.single())["n"]
            r = await s.run("MATCH ()-[r]->() RETURN count(r) AS n")
            saida["total_relacionamentos"] = (await r.single())["n"]
    finally:
        await driver.close()
    return saida


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--json", action="store_true")
    args = ap.parse_args()
    d = asyncio.run(coletar())

    if args.json:
        print(json.dumps(d, indent=2, ensure_ascii=False, default=str))
        return

    print(f"Total: {d['total_nos']} nós, {d['total_relacionamentos']} relacionamentos\n")
    print("Nós por label")
    for lbl, n in sorted(d["contagem_por_label"].items(), key=lambda x: -x[1]):
        props = ", ".join(d["propriedades_por_label"].get(lbl, [])) or "(sem propriedades)"
        print(f"  {lbl:22s} {n:>10,}   props: {props}")
    print("\nRelacionamentos")
    for t, n in sorted(d["contagem_por_relacionamento"].items(), key=lambda x: -x[1]):
        print(f"  {t:22s} {n:>10,}")
    print(f"\nConstraints: {len(d['constraints'])}")
    for c in d["constraints"]:
        print(f"  {c}")
    print(f"\nÍndices: {len(d['indices'])}")
    for i in d["indices"]:
        print(f"  {i.get('name')}  {i.get('type')}  {i.get('labelsOrTypes')}"
              f"  {i.get('properties')}  {i.get('state')}")


if __name__ == "__main__":
    main()
