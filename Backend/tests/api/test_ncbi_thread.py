"""M4.9 — as 3 rotas NCBI síncronas não podem bloquear o event loop (B-4).

`ncbi_service.*` fala com o NCBI via Entrez/rede, direto de dentro de um
handler `async def`. Sem `asyncio.to_thread`, a chamada trava o loop inteiro
até a rede responder — nenhum outro cliente é atendido nesse meio-tempo.
"""
import asyncio
import time

import pytest


def _bloqueia_e_devolve(segundos, retorno):
    def _lenta(*args, **kwargs):
        time.sleep(segundos)
        return retorno
    return _lenta


@pytest.mark.parametrize("rota,metodo_mockado,payload,retorno", [
    ("/api/ncbi/search-species", "search_species", {"query": "zika virus"}, []),
    ("/api/ncbi/download", "download_sequences",
     {"query": "zika virus"}, {"success": True, "count": 0, "species": "x"}),
    ("/api/ncbi/download-accessions", "download_from_accessions",
     {"accessions": ["NC_012532"]}, {"success": True, "count": 0, "species": "x"}),
])
async def test_segunda_requisicao_responde_durante_chamada_ncbi(
    client, app_module, monkeypatch, rota, metodo_mockado, payload, retorno
):
    monkeypatch.setattr(app_module.ncbi_service, metodo_mockado, _bloqueia_e_devolve(0.5, retorno))

    async def chamada_lenta():
        return await client.post(rota, json=payload)

    # Sem `await` entre criar a task e medir: um `sleep` aqui não seria só
    # cooperativo — se a chamada NCBI travar o loop de verdade, o próprio timer
    # do `sleep` não dispara enquanto o loop estiver preso (mesma armadilha de
    # M4.8), e a medição acabaria começando só depois do bloqueio já ter
    # acontecido, escondendo a regressão.
    tarefa_lenta = asyncio.create_task(chamada_lenta())

    inicio = time.monotonic()
    r_rapida = await client.head("/")
    duracao_rapida = time.monotonic() - inicio

    assert r_rapida.status_code == 200
    assert duracao_rapida < 0.4, (
        f"segunda requisição levou {duracao_rapida:.2f}s — event loop bloqueado "
        f"pela chamada síncrona a ncbi_service.{metodo_mockado}"
    )

    r_lenta = await tarefa_lenta
    assert r_lenta.status_code == 200
