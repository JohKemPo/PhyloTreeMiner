#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOCKER_COMPOSE_FILE="docker-compose.yml"
APP_SCRIPT="./application_ui.sh"
DEPS_SCRIPT="./scripts/check_dependencies.sh"

source "$SCRIPT_DIR/scripts/lib_node.sh"

# ==============================================================================
# COLORS FOR BETTER VISUALIZATION
# ==============================================================================
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' 

# ==============================================================================
# FUNÇÃO DE LIMPEZA (Sair com Ctrl+C)
# ==============================================================================
cleanup() {
    echo -e "\n\n${YELLOW}═══════════════════════════════════════════════════════════════════${NC}"
    echo -e "${YELLOW}          CLOSING PHYLOTREEMINER STACK           ${NC}"
    echo -e "${YELLOW}═══════════════════════════════════════════════════════════════════${NC}"
    
    echo -e "${BLUE}ℹ Stopping Docker containers...${NC}"
    docker compose -f "$DOCKER_COMPOSE_FILE" down
    
    echo -e "${GREEN}✓ Docker finished!${NC}\n"
    exit 0
}

trap 'cleanup' SIGINT SIGTERM

# ==============================================================================
# FLUXO PRINCIPAL
# ==============================================================================

echo -e "${BLUE}═══════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}          STARTING PHYLOTREEMINER STACK        ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════════${NC}"

# 1. Verificar se o Docker está rodando
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}Erro: Docker doesn't seem to be running. Start Docker first.${NC}"
    exit 1
fi

# 2. Conferir as ferramentas de bioinformática
# Falhar aqui é melhor que falhar no meio de um alinhamento de duas horas.
echo -e "\n${YELLOW}[1/5] Checking bioinformatics dependencies...${NC}"
if [ -f "$DEPS_SCRIPT" ]; then
    if ! bash "$DEPS_SCRIPT"; then
        echo -e "${YELLOW}Continue anyway? The pipeline will fail for methods that need what is missing. [y/N]${NC}"
        read -r resposta
        case "$resposta" in
            [yY]*) echo -e "${YELLOW}Continuing with missing tools.${NC}" ;;
            *) echo -e "${BLUE}Install with: bash $DEPS_SCRIPT --install${NC}"; exit 1 ;;
        esac
    fi
else
    echo -e "${YELLOW}$DEPS_SCRIPT not found; skipping dependency check.${NC}"
fi

# 3. Conferir o pnpm — o frontend não sobe sem ele.
# Falhar aqui é melhor que subir o Neo4j e o backend para descobrir no fim.
echo -e "\n${YELLOW}[2/5] Checking the frontend package manager (pnpm)...${NC}"
if ! garantir_pnpm; then
    echo -e "${YELLOW}Continue anyway? The frontend will not start. [y/N]${NC}"
    read -r resposta
    case "$resposta" in
        [yY]*) echo -e "${YELLOW}Continuing without pnpm.${NC}" ;;
        *) exit 1 ;;
    esac
fi

# 4. Iniciar o Banco de Dados (Neo4j)
echo -e "\n${YELLOW}[3/5] Starting Neo4j via Docker...${NC}"
docker compose -f "$DOCKER_COMPOSE_FILE" up -d

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Neo4j is rising in the background.${NC}"
else
    echo -e "${RED}✗ Failed to start Docker containers.${NC}"
    exit 1
fi

# 5. Aguardar o Neo4j
echo -e "${YELLOW}[4/5] Waiting for Bolt (Neo4j) to respond at door 7687...${NC}"
if command -v nc >/dev/null 2>&1; then
    until nc -z localhost 7687 > /dev/null 2>&1; do
      echo -n "."
      sleep 2
    done
else
    echo -e "${YELLOW}Netcat not found. Waiting 15s...${NC}"
    sleep 15
fi
echo -e "\n${GREEN}✓ Neo4j ready for connections!${NC}"

# 6. Iniciar a Interface e Backend
echo -e "${YELLOW}[5/5] Starting application services...${NC}"
echo -e "${BLUE}Tip: Press Ctrl+C to stop everything (App + Docker)${NC}\n"

bash "$APP_SCRIPT" "$@"

cleanup
