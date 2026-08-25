"""Linha de base P-0. Mede latência em repouso e sob carga, com repetições.

Protocolo: docs/automation/04-rigor-cientifico.md §5 — mesma máquina, mesma
entrada, >=3 repetições, mediana e dispersão, ambiente reportado.

A medida que importa não é a latência de um endpoint pesado: é a latência de um
endpoint TRIVIAL enquanto um pesado roda. Se subir, o trabalho pesado está
bloqueando o event loop (B-4, B-5, P-1).

    python scripts/perf_baseline.py [--json]
"""
import argparse
import asyncio
import json
import platform
import statistics
import subprocess
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import httpx  # noqa: E402
import psutil  # noqa: E402

import src.app as A  # noqa: E402

PROJETO = "Variola_Yu_li_2007_noITRs_6seqs"
REPETICOES = 5


def ambiente():
    def versao(cmd):
        try:
            r = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
            return (r.stdout or r.stderr).strip().splitlines()[0]
        except Exception:
            return "indisponível"

    return {
        "so": platform.platform(),
        "python": platform.python_version(),
        "cpu_logicos": psutil.cpu_count(),
        "cpu_fisicos": psutil.cpu_count(logical=False),
        "ram_gb": round(psutil.virtual_memory().total / 1024**3, 1),
        "mafft": versao(["mafft", "--version"]),
        "iqtree": versao(["iqtree2", "--version"]),
    }


async def cronometrar(client, metodo, url, **kw):
    t = time.perf_counter()
    r = await client.request(metodo, url, **kw)
    return (time.perf_counter() - t) * 1000, r.status_code


def resumir(amostras):
    return {
        "n": len(amostras),
        "mediana_ms": round(statistics.median(amostras), 1),
        "min_ms": round(min(amostras), 1),
        "max_ms": round(max(amostras), 1),
        "desvio_ms": round(statistics.stdev(amostras), 1) if len(amostras) > 1 else 0.0,
    }


async def medir():
    transporte = httpx.ASGITransport(app=A.app)
    resultados = {}
    async with httpx.AsyncClient(transport=transporte, base_url="http://test",
                                 timeout=600) as c:
        rotas = [
            ("repouso/health", "GET", "/api/system/health", {}),
            ("repouso/projects", "GET", "/projects", {}),
            ("pesado/insights", "GET", f"/api/tree/{PROJETO}/insights", {}),
            ("pesado/pattern-analysis", "GET",
             f"/api/tree/pattern-analysis/{PROJETO}", {}),
        ]
        for nome, metodo, url, kw in rotas:
            amostras, status = [], None
            for _ in range(REPETICOES):
                ms, status = await cronometrar(c, metodo, url, **kw)
                amostras.append(ms)
            resultados[nome] = {**resumir(amostras), "status": status}

    return resultados


async def medir_bloqueio(base_url):
    """A medida que decide P-1: latência de rota trivial ENQUANTO um endpoint
    pesado roda. Exige servidor de verdade — o transporte em processo atende as
    requisições em sequência e mascara o bloqueio."""
    async with httpx.AsyncClient(base_url=base_url, timeout=600) as c:
        repouso = []
        for _ in range(REPETICOES):
            ms, _ = await cronometrar(c, "GET", "/projects")
            repouso.append(ms)

        pesado = asyncio.create_task(
            c.get(f"/api/tree/pattern-analysis/{PROJETO}"))
        await asyncio.sleep(0.05)
        sob_carga = []
        while not pesado.done() and len(sob_carga) < 20:
            ms, _ = await cronometrar(c, "GET", "/projects")
            sob_carga.append(ms)
        await pesado

    saida = {"repouso/projects": resumir(repouso)}
    if sob_carga:
        saida["sob_carga/projects"] = resumir(sob_carga)
    return saida
    return resultados


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--json", action="store_true")
    ap.add_argument("--servidor", metavar="URL",
                    help="mede bloqueio do event loop contra um servidor de "
                         "verdade, ex.: http://127.0.0.1:8000")
    args = ap.parse_args()

    env = ambiente()
    if args.servidor:
        res = asyncio.run(medir_bloqueio(args.servidor))
    else:
        res = asyncio.run(medir())

    if args.json:
        print(json.dumps({"ambiente": env, "medidas": res}, indent=2,
                         ensure_ascii=False))
        return

    print("Ambiente")
    for k, v in env.items():
        print(f"  {k:14s} {v}")
    print(f"\nMedidas ({REPETICOES} repetições, mediana [min-max] ±desvio)")
    for nome, m in res.items():
        print(f"  {nome:26s} {m['mediana_ms']:8.1f} ms  "
              f"[{m['min_ms']:.1f}-{m['max_ms']:.1f}] ±{m['desvio_ms']:.1f}")

    repouso = res.get("repouso/projects", {}).get("mediana_ms")
    carga = res.get("sob_carga/projects", {}).get("mediana_ms")
    if repouso and carga:
        print(f"\n  Degradação de /projects sob carga: {carga / repouso:.1f}x")


if __name__ == "__main__":
    main()
