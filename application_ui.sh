#!/bin/bash

export CONDA_SOLVER=classic

LOG_FILE_BACKEND="./logs_backend.log"
LOG_FILE_FRONTEND="./logs_frontend.log"
BACKEND_PID=""
FRONTEND_PID=""

# Default URLs
BACKEND_URL="http://localhost:8000"
FRONTEND_URL=""

# Repository root, so the helper scripts are found regardless of where this
# was invoked from.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# pnpm: detecção e instalação assistida num lugar só.
source "$SCRIPT_DIR/scripts/lib_node.sh"

# Conda paths (will be defined dynamically)
CONDA_BASE=""
CONDA_ENV_NAME="Phylotreeminer"
CONDA_ENV_PATH=""
REQUIREMENTS_FILE="./requirements.txt"

# Parse setup parameter
IS_SETUP="false"
if [ "$1" == "--setup" ] || [ "$1" == "setup" ]; then
    IS_SETUP="true"
fi

# ==============================================================================
# COLORS FOR BETTER VISUALIZATION
# ==============================================================================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# Icons for better visualization
ICON_SUCCESS="${GREEN}✓${NC}"
ICON_ERROR="${RED}✗${NC}"
ICON_WARNING="${YELLOW}⚠${NC}"
ICON_INFO="${BLUE}ℹ${NC}"
ICON_ROCKET="${GREEN}RUNING...${NC}"
ICON_GEAR="${CYAN}⚙${NC}"
ICON_CHECK="${GREEN}✔${NC}"

# ==============================================================================
# UTILITY FUNCTIONS
# ==============================================================================

# Function to extract frontend port from log
get_frontend_port() {
    if [ -f "$LOG_FILE_FRONTEND" ]; then
        local port_line=$(grep "Local: http://localhost:" "$LOG_FILE_FRONTEND" | tail -1)
        if [ ! -z "$port_line" ]; then
            local port=$(echo "$port_line" | grep -oE "localhost:([0-9]+)" | cut -d: -f2)
            echo "$port"
            return 0
        fi
        
        # Fallback: look for any port mentioned in recent logs
        local any_port=$(grep -E "localhost:([0-9]+)" "$LOG_FILE_FRONTEND" | tail -1 | grep -oE "localhost:([0-9]+)" | cut -d: -f2)
        if [ ! -z "$any_port" ]; then
            echo "$any_port"
            return 0
        fi
    fi
    echo "5179" # Fallback
}

cleanup() {
    echo -e "\n${YELLOW}═══════════════════════════════════════════════════════════════════${NC}"
    echo -e "${YELLOW}                      PERFORMING CLEANUP                          ${NC}"
    echo -e "${YELLOW}═══════════════════════════════════════════════════════════════════${NC}\n"
    
    if [ ! -z "$BACKEND_PID" ]; then
        echo -e "${ICON_INFO} Stopping backend (PID: $BACKEND_PID)..."
        kill $BACKEND_PID 2>/dev/null || true
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        echo -e "${ICON_INFO} Stopping frontend (PID: $FRONTEND_PID)..."
        kill $FRONTEND_PID 2>/dev/null || true
    fi
    # Kill any remaining child processes
    pkill -f 'uvicorn src.app:app' 2>/dev/null || true
    pkill -f 'pnpm run dev' 2>/dev/null || true
    pkill -f 'npm run dev' 2>/dev/null || true
    
    echo -e "\n${GREEN}${ICON_SUCCESS} Cleanup completed. Goodbye!\n  Thank you for choosing us.${NC}\n"
    exit 1
}

# Set trap to capture error signals
trap 'cleanup' 1 2 3 15

check_command() {
    if [ $? -ne 0 ]; then
        echo -e "         ${RED}${ICON_ERROR} ERROR: Failed to execute: $1${NC}"
        cleanup
    fi
}

check_port() {
    local port_to_check=$1
    local app_name=$2
    
    if command -v lsof >/dev/null 2>&1; then
        if lsof -Pi :$port_to_check -sTCP:LISTEN -t >/dev/null ; then
            echo -e "         ${YELLOW}${ICON_WARNING} Port $port_to_check is already in use. ($app_name will choose another if possible)${NC}"
            return 1
        fi
    elif command -v netstat >/dev/null 2>&1; then
        if netstat -tuln | grep ":$port_to_check " >/dev/null; then
            echo -e "         ${YELLOW}${ICON_WARNING} Port $port_to_check is already in use. ($app_name will choose another if possible)${NC}"
            return 1
        fi
    else
        echo -e "${YELLOW}${ICON_WARNING} WARNING: Could not check port $port_to_check (lsof and netstat not found)${NC}"
    fi
    return 0
}

wait_for_app() {
    local url=$1
    local timeout=$2
    local interval=$3
    local elapsed=0
    
    echo -e "\n${ICON_INFO} Waiting for ${CYAN}$url${NC} to become available..."
    
    while [ $elapsed -lt $timeout ]; do
        if curl --silent --head --fail $url >/dev/null 2>&1; then
            echo -e "   ${GREEN}${ICON_SUCCESS} $url is available${NC}"
            return 0
        fi
        sleep $interval
        elapsed=$((elapsed + interval))
        echo -e "   ${ICON_INFO} Waiting... ($elapsed/$timeout seconds)"
    done
    
    echo -e "   ${YELLOW}${ICON_WARNING} Timeout waiting for $url${NC}"
    return 1
}

# ==============================================================================
# SETUP FUNCTIONS
# ==============================================================================

# Function to install Miniconda (Linux x86_64)
install_miniconda() {
    echo -e "\n${PURPLE}═══════════════════════════════════════════════════════════════════${NC}"
    echo -e "${PURPLE}                ATTEMPTING TO INSTALL MINICONDA                    ${NC}"
    echo -e "${PURPLE}═══════════════════════════════════════════════════════════════════${NC}\n"
    
    local MINICONDA_URL="https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh"
    local MINICONDA_SH="Miniconda3-latest-Linux-x86_64.sh"
    
    if ! command -v curl >/dev/null 2>&1; then
        echo -e "${RED}${ICON_ERROR} ERROR: 'curl' not found. Please install curl (sudo apt install curl) and try again.${NC}"
        exit 1
    fi
    
    if ! curl -O $MINICONDA_URL; then
        echo -e "\n${RED}${ICON_ERROR} ERROR: Failed to download Miniconda. Please install it manually.${NC}\n"
        exit 1
    fi
    
    # Install in batch mode to default directory ~/miniconda3
    bash $MINICONDA_SH -b -p $HOME/miniconda3
    rm $MINICONDA_SH

    echo -e "\n${GREEN}${ICON_SUCCESS} Miniconda installed in ~/miniconda3${NC}\n"
    
    # Add to current session's PATH
    export PATH="$HOME/miniconda3/bin:$PATH"
    
    # Check if conda command now exists
    if ! command -v conda >/dev/null 2>&1; then
        echo -e "\n${RED}${ICON_ERROR} ERROR: Conda installation failed. Check ~/miniconda3.${NC}\n"
        exit 1
    fi
    
    # Initialize conda for shell (required for 'conda activate')
    conda init bash
    echo -e "\n${GREEN}${ICON_SUCCESS} Conda installed. You may need to 'source ~/.bashrc' or restart the terminal after this script.${NC}\n"
}

# Main setup function
run_full_setup() {
    echo -e "\n${PURPLE}═══════════════════════════════════════════════════════════════════${NC}"
    echo -e "${PURPLE}${ICON_ROCKET}            COMPLETE SETUP PROCESS STARTING              ${NC}"
    echo -e "${PURPLE}═══════════════════════════════════════════════════════════════════${NC}\n"
    
    # 1. Check/Install Conda
    if ! command -v conda >/dev/null 2>&1; then
        echo -e "${ICON_INFO} Conda not found. Installing..."
        install_miniconda
    else
        echo -e "${GREEN}${ICON_SUCCESS} Conda found.${NC}"
    fi
    
    # Update CONDA_BASE and CONDA_ENV_PATH variables
    CONDA_BASE=$(conda info --base)
    CONDA_ENV_PATH="$CONDA_BASE/envs/$CONDA_ENV_NAME"
    
    export CONDA_ALWAYS_YES="true"

    # 2 + 3. Create the environment from the recipe.
    #
    # This used to run `conda config --add channels ...`, which rewrites the
    # user's GLOBAL ~/.condarc — the opposite of keeping the project separate —
    # and added `defaults`, which conflicts with bioconda during solving and
    # now requires accepting Anaconda's terms of service. On a fresh machine
    # that combination is what made IQ-TREE fail to install.
    #
    # environment.yml pins the channels PER ENVIRONMENT instead, and is the
    # single place that lists the tools. See scripts/setup_env.sh.
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE} CONDA ENVIRONMENT SETUP${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════════${NC}\n"

    if ! PTM_ENV="$CONDA_ENV_NAME" bash "$SCRIPT_DIR/scripts/setup_env.sh"; then
        echo -e "${RED}${ICON_ERROR} ERROR: Failed to create conda environment.${NC}\n"
        exit 1
    fi
    
    # Activate environment for next commands
    echo -e "${ICON_INFO} Activating environment for package installation...\n"
    export PATH="$CONDA_ENV_PATH/bin:$PATH"
    export CONDA_PREFIX="$CONDA_ENV_PATH"
    export CONDA_DEFAULT_ENV="$CONDA_ENV_NAME"
    
    # 4. Install Python dependencies (pip)
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE} PYTHON DEPENDENCIES${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════════${NC}\n"
    
    echo -e "${ICON_INFO} Installing Python dependencies from $REQUIREMENTS_FILE...\n"
    if [ ! -f "$REQUIREMENTS_FILE" ]; then
        echo -e "${RED}${ICON_ERROR} ERROR: File $REQUIREMENTS_FILE not found!${NC}\n"
        exit 1
    fi
    if ! pip install -r "$REQUIREMENTS_FILE"; then
         echo -e "${RED}${ICON_ERROR} ERROR: Failed to install Python dependencies.${NC}\n"
         exit 1
    fi
    echo -e "\n${GREEN}${ICON_SUCCESS} Python dependencies installed.${NC}\n"
    
    # 5. Verify the phylogeny tools.
    #
    # They are installed by environment.yml in step 3 — listing them a second
    # time here would be two sources of truth for the same thing, and the two
    # lists had already drifted: MUSCLE was missing from this one.
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE} PHYLOGENY TOOLS${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════════${NC}\n"

    if ! PTM_ENV="$CONDA_ENV_NAME" bash "$SCRIPT_DIR/scripts/check_dependencies.sh" --install; then
        echo -e "${RED}${ICON_ERROR} ERROR: One or more phylogeny tools are missing.${NC}\n"
        exit 1
    fi
    
    # 6. Install Frontend dependencies (pnpm)
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}🌐 FRONTEND DEPENDENCIES (NPM)${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════════${NC}\n"
    
    cd Frontend/phylotreeminer || { 
        echo -e "${RED}${ICON_ERROR} ERROR: Frontend/phylotreeminer directory not found!${NC}"
        exit 1
    }
    
    # pnpm is this project's package manager (package.json "packageManager").
    # garantir_pnpm tries corepack first — it ships with Node and needs no
    # administrator — then a global npm install, and only then asks the user.
    if ! garantir_pnpm; then
        cd ../..
        exit 1
    fi
    
    if [ ! -f "package.json" ]; then
        echo -e "${RED}${ICON_ERROR} ERROR: package.json not found!${NC}"
        cd ../..
        exit 1
    fi
    
    echo -e "${ICON_INFO} Cleaning old frontend dependencies..."
    # pnpm-lock.yaml is NOT removed: it is what pins the exact versions. Wiping
    # the lockfile on every setup means two machines can resolve different
    # dependency trees from the same commit.
    rm -rf node_modules

    echo -e "${ICON_INFO} Running pnpm install...\n"
    if ! pnpm install --frozen-lockfile; then
        echo -e "${RED}${ICON_ERROR} ERROR: Failed to install frontend dependencies.${NC}"
        echo -e "${YELLOW}If package.json changed on purpose, run 'pnpm install' to update the lockfile.${NC}"
        cd ../..
        exit 1
    fi
    
    # Config creation logic (from your script) moved here
    if [ ! -f "vite.config.js" ]; then
        echo -e "${ICON_INFO} vite.config.js not found, creating a basic one..."
        cat > vite.config.js <<EOL
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
EOL
    fi

    if [ ! -f "tsconfig.json" ] && [ ! -f "jsconfig.json" ]; then
        echo -e "${ICON_INFO} tsconfig.json/jsconfig.json not found, creating jsconfig.json..."
        cat > jsconfig.json <<EOL
{
  "compilerOptions": {
    "jsx": "react-jsx"
  }
}
EOL
    fi
    
    echo -e "\n${GREEN}${ICON_SUCCESS} Frontend dependencies and configs installed.${NC}"
    cd ../..

    echo -e "\n${PURPLE}═══════════════════════════════════════════════════════════════════${NC}"
    echo -e "${PURPLE}${ICON_ROCKET}                 SETUP COMPLETE!                         ${NC}"
    echo -e "${PURPLE}═══════════════════════════════════════════════════════════════════${NC}"
    echo -e "\n${GREEN}${ICON_INFO} Continuing to start applications...${NC}\n"
}

# ==============================================================================
# SCRIPT MAIN FLOW
# ==============================================================================

# INITIAL VERIFICATION
echo -e "\n${CYAN}═══════════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}                 CHECKING PREREQUISITES                           ${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════════${NC}\n"

# If setup is requested, run it
if [ "$IS_SETUP" == "true" ]; then
    run_full_setup
fi

# Define/Redefine Conda paths
# (Necessary if setup just ran)
if command -v conda >/dev/null 2>&1; then
    CONDA_BASE=$(conda info --base 2>/dev/null)
    if [ $? -ne 0 ] || [ -z "$CONDA_BASE" ]; then
        echo -e "${RED}${ICON_ERROR} Error: Conda not found or not initialized${NC}"
        exit 1
    fi
    CONDA_ENV_PATH="$CONDA_BASE/envs/$CONDA_ENV_NAME"
else
    # If conda is still not found (and not setup), fail
    echo -e "${RED}${ICON_ERROR} ERROR: Conda is not installed or not in PATH.${NC}"
    echo -e "${YELLOW}Install Miniconda/Anaconda: https://docs.conda.io/en/latest/miniconda.html${NC}"
    echo -e "${YELLOW}Or run this script with '--setup' to try automatic installation.${NC}"
    exit 1
fi

# Critical check: Does the 'ic' environment exist?
if [ ! -d "$CONDA_ENV_PATH" ]; then
    echo -e "${RED}${ICON_ERROR} ERROR: Conda environment '$CONDA_ENV_NAME' not found.${NC}"
    echo -e "${YELLOW}Please run this script with the '--setup' parameter first:${NC}"
    echo -e "   ${WHITE}bash $0 --setup${NC}\n"
    exit 1
fi

echo -e "${GREEN}${ICON_SUCCESS} Conda environment '$CONDA_ENV_NAME' found at $CONDA_ENV_PATH${NC}\n"

# Check ports
echo -e "${CYAN}═══════════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}                      PORT CHECK                                   ${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════════${NC}\n"

echo -e "${ICON_INFO} Checking ports..."
check_port 8000 "Backend"
check_port 5179 "Frontend (Vite)"
echo ""

# Start Backend
echo -e "${CYAN}═══════════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}                      STARTING BACKEND                             ${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════════${NC}\n"

cd Backend || { 
    echo -e "${RED}${ICON_ERROR} ERROR: Backend directory not found!${NC}"
    exit 1
}

# Manually activate conda environment
echo -e "${ICON_INFO} Activating conda environment '$CONDA_ENV_NAME'..."
export PATH="$CONDA_ENV_PATH/bin:$PATH"
export CONDA_PREFIX="$CONDA_ENV_PATH"
export CONDA_DEFAULT_ENV="$CONDA_ENV_NAME"

# Check if correct Python is being used
if command -v python >/dev/null 2>&1; then
    PYTHON_PATH=$(command -v python)
    PYTHON_VERSION=$(python --version 2>&1)
    echo -e "${GREEN}${ICON_SUCCESS} Using Python: $PYTHON_PATH${NC}"
    echo -e "${GREEN}${ICON_SUCCESS} Version: $PYTHON_VERSION${NC}"
else
    echo -e "${RED}${ICON_ERROR} ERROR: Python not found in environment!${NC}"
    cleanup
fi
      
echo ""

# Check if uvicorn is available
if ! command -v uvicorn >/dev/null 2>&1; then
    echo -e "${RED}${ICON_ERROR} ERROR: uvicorn not found in environment!${NC}"
    echo -e "${YELLOW}The pip dependencies seem to not be installed. Try running with '--setup'.${NC}"
    cleanup
fi

echo -e "${ICON_INFO} Starting backend server (Uvicorn)..."
uvicorn src.app:app --reload --reload-dir src --host 0.0.0.0 --port 8000 > ../$LOG_FILE_BACKEND 2>&1 &
BACKEND_PID=$!
cd ..

echo -e "${GREEN}${ICON_SUCCESS} Backend started with PID: ${YELLOW}$BACKEND_PID${NC}"
echo -e "${ICON_INFO} Backend Logs: ${CYAN}$LOG_FILE_BACKEND${NC}\n"

# Start Frontend
echo -e "${CYAN}═══════════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}                     STARTING FRONTEND                             ${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════════${NC}\n"

cd Frontend/phylotreeminer || { 
    echo -e "${RED}${ICON_ERROR} ERROR: Frontend/phylotreeminer directory not found!${NC}"
    cleanup
}

# Check if pnpm is available, enabling it through corepack when possible.
if ! garantir_pnpm; then
    echo -e "${RED}${ICON_ERROR} ERROR: pnpm is required to start the frontend.${NC}"
    cleanup
fi

# Check if dependencies are installed (node_modules)
if [ ! -d "node_modules" ]; then
    echo -e "${RED}${ICON_ERROR} ERROR: 'node_modules' directory not found.${NC}"
    echo -e "${YELLOW}Frontend dependencies are not installed. Try running with '--setup'.${NC}"
    cleanup
fi

echo -e "${ICON_INFO} Starting frontend server (Vite)..."
pnpm run dev > ../../$LOG_FILE_FRONTEND 2>&1 &
FRONTEND_PID=$!
cd ../..

echo -e "${GREEN}${ICON_SUCCESS} Frontend started with PID: ${YELLOW}$FRONTEND_PID${NC}"
echo -e "${ICON_INFO} Frontend Logs: ${CYAN}$LOG_FILE_FRONTEND${NC}\n"

# Wait for apps to start
echo -e "${CYAN}═══════════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}              WAITING FOR APPLICATIONS TO START                   ${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════════${NC}\n"

# Give frontend time to choose a port
echo -e "${ICON_INFO} Waiting for frontend to define port..."
sleep 5

# Detect actual frontend port
FRONTEND_PORT=$(get_frontend_port)
FRONTEND_URL="http://localhost:$FRONTEND_PORT"

echo -e "${GREEN}${ICON_SUCCESS} Frontend using port: ${YELLOW}$FRONTEND_PORT${NC}\n"

# Check if curl is available to check URLs
if ! command -v curl >/dev/null 2>&1; then
    echo -e "${YELLOW}${ICON_WARNING} curl not found, skipping URL verification${NC}"
    echo -e "   ${ICON_INFO} Backend probably at: ${CYAN}$BACKEND_URL${NC}"
    echo -e "   ${ICON_INFO} Frontend probably at: ${CYAN}$FRONTEND_URL${NC}"
else
    if wait_for_app $BACKEND_URL 10 2; then
        echo -e "\n${GREEN}${ICON_SUCCESS} Backend running at: ${CYAN}$BACKEND_URL${NC}"
        echo -e "   ${ICON_INFO} API: ${CYAN}$BACKEND_URL/docs${NC} (Swagger/OpenAPI)"
        echo -e "   ${ICON_INFO} Health check: ${CYAN}$BACKEND_URL/health${NC}"
    else
        echo -e "\n${RED}${ICON_ERROR} Failed to connect to backend${NC}"
        echo -e "   ${ICON_INFO} Check logs: ${CYAN}tail -f $LOG_FILE_BACKEND${NC}"
        echo -e "   ${ICON_INFO} Expected URL: ${CYAN}$BACKEND_URL${NC}"
    fi

    if wait_for_app $FRONTEND_URL 15 3; then
        echo -e "\n${GREEN}${ICON_SUCCESS} Frontend running at: ${CYAN}$FRONTEND_URL${NC}"
    else
        echo -e "\n${RED}${ICON_ERROR} Failed to connect to frontend${NC}"
        echo -e "   ${ICON_INFO} Check logs: ${CYAN}tail -f $LOG_FILE_FRONTEND${NC}"
        echo -e "   ${ICON_INFO} Detected URL: ${CYAN}$FRONTEND_URL${NC}"
    fi
fi

echo -e "\n${PURPLE}═══════════════════════════════════════════════════════════════════${NC}"
echo -e "${PURPLE}${ICON_ROCKET}               APPLICATIONS STARTED!                      ${NC}"
echo -e "${PURPLE}═══════════════════════════════════════════════════════════════════${NC}\n"

echo -e "${WHITE} SUMMARY${NC}"
echo -e "${BLUE}───────────────────────────────────────────────────────────────────${NC}"
echo -e "   ${ICON_INFO} ${WHITE}Logs:${NC}"
echo -e "      ${GREEN}Backend:${NC}  tail -f $LOG_FILE_BACKEND"
echo -e "      ${GREEN}Frontend:${NC} tail -f $LOG_FILE_FRONTEND\n"

echo -e "   ${ICON_INFO} ${WHITE}Commands:${NC}"
echo -e "      ${GREEN}Stop both:${NC}    Use Ctrl+C in this terminal"
echo -e "      ${GREEN}Check running:${NC} ps aux | grep -E '(uvicorn|vite)'\n"

echo -e "   ${ICON_INFO} ${WHITE}URLs:${NC}"
echo -e "      ${GREEN}Frontend:${NC}  ${CYAN}$FRONTEND_URL${NC}"
echo -e "      ${GREEN}Backend:${NC}   ${CYAN}$BACKEND_URL${NC}"
echo -e "      ${GREEN}API Docs:${NC}  ${CYAN}$BACKEND_URL/docs${NC}"
echo -e "${BLUE}───────────────────────────────────────────────────────────────────${NC}\n"

# Function to check if processes are still running
check_processes() {
    if ! kill -0 $BACKEND_PID 2>/dev/null; then
        echo -e "\n${RED}${ICON_ERROR} Backend stopped unexpectedly!${NC}"
        return 1
    fi
    if ! kill -0 $FRONTEND_PID 2>/dev/null; then
        echo -e "\n${RED}${ICON_ERROR} Frontend stopped unexpectedly!${NC}"
        return 1
    fi
    return 0
}

echo -e "\n${RED}═══════════════════════════════════════════════════════════════════${NC}"
echo -e "${RED}                Press Ctrl+C to stop applications                   ${NC}"
echo -e "${RED}═══════════════════════════════════════════════════════════════════${NC}\n"

while check_processes; do
    sleep 5
done

cleanup