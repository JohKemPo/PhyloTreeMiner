---
name: lgpd-datamap
description: Varredura de governança de dados no PhyloTreeMiner — encontrar dado pessoal, segredo, log de conteúdo, cache sem retenção e envio a terceiros, e atualizar o inventário de dados. Use ao iniciar uma onda e sempre que um lote tocar upload, identificação, log ou serviço externo.
---

# Mapa de dados — varredura de governança

Objetivo: manter o inventário da §2 de [`../../automation/05-governanca-de-dados-lgpd.md`](../../automation/05-governanca-de-dados-lgpd.md) correspondente ao código. Sem inventário não há minimização, não há política de retenção, e não há como responder a um incidente (LGPD arts. 46 e 48) — nem como escrever um *data availability statement* honesto.

## 1. Onde dado entra

```bash
grep -rn "UploadFile\|File(\|Form(" Backend/src
grep -rn "Header(\|X-User-ID\|x_user_id" Backend/src
grep -rn "localStorage\|sessionStorage\|randomUUID" Frontend/phylotreeminer/src
grep -rn "Entrez\|efetch\|esearch" Backend/src
```
Para cada ponto: que campos chegam, quem pode enviar (anônimo?), há limite de tamanho/tipo, e o dado é validado antes de ser persistido.

## 2. Onde dado é persistido

```bash
grep -rn "open(\|\.write(\|shutil\|makedirs\|to_csv\|json.dump" Backend/src
grep -rn "MERGE\|CREATE (" Backend/src
```
Pergunta central de **minimização**: cada campo persistido é usado por alguma métrica? Confirme com [A6](../../agents/06-dominio-cientifico.md). Se `isolate` não entra em nenhum cálculo, não deveria ir para o grafo — a combinação `host` humano + geografia fina + data + isolado é justamente a que carrega risco de reidentificação.

## 3. Onde dado é logado

```bash
grep -rn "print(\|logger\.\|logging\." Backend/src
grep -rn "detail=str(e)\|detail=f\"" Backend/src
grep -rn "console\.log" Frontend/phylotreeminer/src
```
Log registra **evento**: identificador de correlação, rota, tamanho, duração. Nunca payload, header de FASTA, nem `str(e)` cru — que vaza estrutura interna ao cliente (`S-4`) e pode carregar conteúdo.

## 4. Onde dado fica retido

```bash
grep -rn "_cache\|cache\[\|lru_cache\|batch_status" Backend/src
ls -la Backend/src/temp_ncbi/ 2>/dev/null   # deve estar ignorado e vazio no repo
```
Todo cache e todo diretório de upload precisa de **teto e TTL**, com purga testada. "Nunca apagamos" não é política, é acúmulo de risco. Partições de grafo por `X-User-ID` entram nessa conta.

## 5. Envio a terceiros

```bash
grep -rn "requests\.\|httpx\.\|fetch(\|nominatim\|openstreetmap\|cdnjs\|cloudflare\|unpkg" \
  Backend/src Frontend/phylotreeminer/src
```
Cada destino é uma divulgação, muitas vezes internacional. Casos conhecidos: NCBI Entrez (recebe o `NCBI_EMAIL` — use e-mail **institucional**), Nominatim client-side (recebe a localidade e expõe o IP do usuário; viola a política do OSM por não ter `User-Agent` nem rate limit), CDN de ícones do Leaflet (expõe o IP a cada carregamento de mapa). Mover para o servidor com cache reduz os três problemas de uma vez.

## 6. Segredo e dado no repositório

```bash
git ls-files | grep -Ei '\.env$|\.pem$|\.key$|credential|secret'
git ls-files | grep -Ei '\.gb$|\.fasta$|\.fa$|\.csv$'   # dado de execução comitado?
grep -rn "password\s*=\s*[\"'][^\"']" --include=*.py --include=*.js --include=*.yml .
git log --oneline -S"password" -- . | head
```
Achou segredo real: **pare e escale.** A rotação é primeiro passo e é ação do usuário; remover do histórico é segundo. Não apague por conta própria — pode destruir evidência necessária à análise de incidente.

## 7. Artefatos de teste e documentação

```bash
ls Backend/tests/data Backend/tests/golden 2>/dev/null
grep -rln "Homo sapiens\|isolate\|collection_date" Backend/tests docs 2>/dev/null
```
Fixture, snapshot, exemplo em documentação e figura **não** podem conter dado real identificável — só o dataset de referência público e não identificável (controle `G2`).

## 8. Atualizar o inventário

Para cada achado, uma linha em [`../../automation/05-governanca-de-dados-lgpd.md`](../../automation/05-governanca-de-dados-lgpd.md) §2:

| # | Dado | Origem | É pessoal? | Sensível? | Risco | Controle proposto | Responsável |
|---|---|---|---|---|---|---|---|

Classificação: **pessoal** (identifica ou torna identificável pessoa natural) · **sensível** (dado genético ou de saúde vinculável a pessoa natural — LGPD art. 5º, II) · **pseudonimizado** (identificador substituído, mas reversível — continua pessoal) · **anonimizado** (irreversível com esforço razoável — fora do escopo da lei, art. 12).

## 9. Relatório

O que mudou no inventário; achados por severidade com `arquivo:linha`; controles propostos com responsável nomeado; **pendências institucionais** (DPO, CEP/CONEP, SisGen) listadas explicitamente; e o que exige decisão do usuário (ex.: o modelo de acesso do demo público, [DEC-004](../../automation/07-log-de-execucao.md)).

Sem alarmismo e sem complacência: metadado público do GenBank em regra **não** é dado pessoal; o risco concreto está na combinação reidentificadora e no que **terceiros enviam** a um demo sem autenticação.
