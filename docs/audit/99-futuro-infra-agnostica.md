# Fase futura — Aplicação agnóstica de infraestrutura

[← Índice](README.md) · **Fora do roadmap P0-P4** — retomar depois do P4. Artifact publicado (diagrama interativo): https://claude.ai/code/artifact/d27a848e-46ee-434a-95d4-f6b74c6e7825

## Objetivo

Desacoplar **processamento** e **armazenamento** do host, permitindo que cada usuário acople servidores, clusters HPC ou instâncias de nuvem — sem que o domínio saiba onde nada roda. Padrão: **Ports & Adapters**, apoiado em duas peças que o projeto já tem: `parsl` (já é dependência) e um workflow conteinerizável.

## 01 — O modelo: domínio no centro, infra nas bordas

O núcleo depende apenas de **portas** (interfaces). Cada infra concreta é um **adaptador** plugável, escolhido por configuração. Trocar de FS local para S3, ou de subprocess para SLURM, não toca uma linha do domínio.

**Domain Core:** Workflow · Mining · Tree Compare — regras puras, sem I/O, testáveis, portáveis.

Seis portas ao redor do núcleo:

| Porta | Responsabilidade |
|---|---|
| `StoragePort` | blobs / artefatos |
| `ComputePort` | execução de jobs |
| `GraphStorePort` | grafo / consultas |
| `JobStorePort` | estado de jobs |
| `EventBusPort` | progresso realtime |
| `SecretsPort` | credenciais / vault |

## 02 — Do acoplamento atual às portas

| Acoplamento hoje | Porta | Adaptadores-alvo |
|---|---|---|
| `open()` · `glob()` · `os.path` | `StoragePort` | **LocalFS** (local, ponto de partida) · S3/MinIO · GCS · Azure · SFTP |
| `subprocess_exec(workflow.py)` | `ComputePort` | **Local** (local) · SSH · SLURM/HPC · Kubernetes · Cloud Batch |
| `neo4j_service` (singleton global) | `GraphStorePort` | **Neo4j local** (local) · Aura · self-hosted |
| `running_workflows` (dict em RAM) | `JobStorePort` | **Memória** (local) · Redis · Postgres |
| WebSocket + dict local | `EventBusPort` | **In-process** (local) · Redis Pub/Sub · SQS/Pub-Sub |
| `.env` fixo | `SecretsPort` | **Env** (local) · Vault · Secrets Manager |

**Reaproveitar, não reinventar:** `fsspec` já unifica todo o storage por URL de esquema (`s3://`, `gs://`, `sftp://`), e `parsl` (já no projeto) já é a camada de compute agnóstica — seus *providers* cobrem Local, SSH, SLURM, Kubernetes e nuvem.

## 03 — Fluxo: um job rodando em compute + storage remotos

Nenhum passo referencia um caminho de disco ou host fixo: tudo vem do **perfil de infraestrutura** do projeto. O job é `imagem + refs de entrada + parâmetros` — location-independent.

1. Usuário seleciona um **InfraProfile** no projeto — ex.: `S3` + `SLURM` + `Aura`.
2. **Stage-in:** a API sobe o FASTA de entrada via `storage.put(key)` (ou já está no bucket).
3. A API monta um **JobSpec** e chama `compute.submit()` — o adaptador SLURM faz `sbatch`.
4. No HPC, o job baixa as entradas do S3, roda a **imagem do workflow** (Apptainer) e sobe as saídas de volta.
5. O compute publica eventos normalizados no **EventBus**; a API os repassa ao browser por **WebSocket** — progresso real, independente de onde roda.
6. **Ingest** das árvores/metadados no **GraphStore** a partir do storage; análises leem via `StoragePort`.
7. O frontend baixa árvores e plots via **URL pré-assinada** (`storage.get_url`), sem passar pela API.

## 04 — Migração: strangler-fig, cada fase entregável e reversível

A regra é introduzir as portas com **adaptadores locais que embrulham o código atual** e só então adicionar os remotos. O ponto de inflexão é a Fase 1: a partir dela, acoplar infra é sempre aditivo.

| Fase | Nome | Descrição | Risco |
|---|---|---|---|
| 0 | Pré-requisitos | Conteinerizar o workflow · injeção de dependência do Neo4j · autenticação real · JobStore fora da memória | não quebra (interno) |
| 1 | Portas com adaptadores locais | `StoragePort=LocalFS`, `ComputePort=LocalSubprocess`, `EventBus=in-process`. Comportamento idêntico ao de hoje, agora atrás de interfaces | não quebra |
| 2 | Storage agnóstico | Adaptador `fsspec` (S3/MinIO). Migrar todo `open`/`glob` para a porta; URLs pré-assinadas no front | opt-in por perfil |
| 3 | Compute remoto | Adaptadores SSH + SLURM via Parsl; EventBus em Redis; realtime cross-backend | default segue "local" |
| 4 | BYO-infra + vault | InfraProfile por usuário, credenciais em vault, allowlist/egress isolado, escopo de tenant. UI de "conectar meu servidor/bucket" | **superfície de segurança** |
| 5 | Cloud batch / Kubernetes | Adaptadores AWS Batch · Cloud Run Jobs · KubernetesProvider | aditivo |

## 05 — Disciplina: trade-offs e o que NÃO fazer

1. **Não abstraia o que não vai plugar.** Cada porta é custo de manutenção. Comece por duas (Storage + Compute) e dois adaptadores cada — local + um remoto real (provavelmente SLURM/HPC).
2. **BYO-infra é 70% segurança, não código de adaptador.** Vault, isolamento de tenant, validação de destino e egress anti-SSRF. Sem autenticação real, nem comece a Fase 4.
3. **Transferência de dados vira o novo gargalo.** Use artefatos endereçados por conteúdo (hash) para cache e evitar re-transferência — casa com o cache de análises ([M-2](08-aspecto4-melhorias-futuras.md)).
4. **Para o demo atual, isto é roadmap.** O valor imediato está nas Fases 0-1: conteinerizar + portas locais + DI + auth. Elas já pagam sozinhas e destravam todo o resto — e coincidem com o [P4](07-eixo-arquitetura.md) do roadmap principal.

## Quando retomar

Depois do [P4](07-eixo-arquitetura.md) (estrutural: Docker full-stack, backend em camadas, frontend modular) — as Fases 0-1 desta fase futura já estão essencialmente cobertas pelo P4 e pela autenticação de [S-5](04-eixo-seguranca.md).
