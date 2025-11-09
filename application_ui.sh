#!/bin/bash

export CONDA_SOLVER=classic

LOG_FILE_BACKEND="./logs_backend.log"
LOG_FILE_FRONTEND="./logs_frontend.log"
BACKEND_PID=""
FRONTEND_PID=""

# Default URLs
BACKEND_URL="http://localhost:8000"
FRONTEND_URL=""

# Conda paths (will be defined dynamically)
CONDA_BASE=""
CONDA_ENV_NAME="Phylotreeminer"
CONDA_ENV_PATH=""
REQUIREMENTS_FILE="./requirements.txt"

# NEW: Parse setup parameter
IS_SETUP="false"
if [ "$1" == "--setup" ] || [ "$1" == "setup" ]; then
    IS_SETUP="true"
fi

# ==============================================================================
# UTILITY FUNCTIONS (from provided file)
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
    echo "Performing cleanup..."
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
    fi
    # Kill any remaining child processes
    pkill -f 'uvicorn src.app:app' 2>/dev/null || true
    pkill -f 'npm run dev' 2>/dev/null || true
    exit 1
}

# Set trap to capture error signals
trap 'cleanup' 1 2 3 15

check_command() {
    if [ $? -ne 0 ]; then
        echo "❌ ERROR: Failed to execute: $1"
        cleanup
    fi
}

check_port() {
    local port_to_check=$1
    local app_name=$2
    
    if command -v lsof >/dev/null 2>&1; then
        if lsof -Pi :$port_to_check -sTCP:LISTEN -t >/dev/null ; then
            echo "⚠️  WARNING: Port $port_to_check is already in use. ($app_name will choose another if possible)"
            return 1
        fi
    elif command -v netstat >/dev/null 2>&1; then
        if netstat -tuln | grep ":$port_to_check " >/dev/null; then
            echo "⚠️  WARNING: Port $port_to_check is already in use. ($app_name will choose another if possible)"
            return 1
        fi
    else
        echo "WARNING: Could not check port $port_to_check (lsof and netstat not found)"
    fi
    return 0
}

wait_for_app() {
    local url=$1
    local timeout=$2
    local interval=$3
    local elapsed=0
    
    echo "Waiting for $url to become available..."
    
    while [ $elapsed -lt $timeout ]; do
        if curl --silent --head --fail $url >/dev/null 2>&1; then
            echo "✓ $url is available"
            return 0
        fi
        sleep $interval
        elapsed=$((elapsed + interval))
        echo "Waiting... ($elapsed/$timeout seconds)"
    done
    
    echo "WARNING: Timeout waiting for $url"
    return 1
}


# ==============================================================================
# NEW SETUP FUNCTIONS (Integrated from our conversation)
# ==============================================================================

# Function to install Miniconda (Linux x86_64)
install_miniconda() {
    echo "------------------------------------------"
    echo "🔄 Attempting to install Miniconda (Linux x86_64)..."
    echo "------------------------------------------"
    echo ""
    local MINICONDA_URL="https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh"
    local MINICONDA_SH="Miniconda3-latest-Linux-x86_64.sh"
    
    if ! command -v curl >/dev/null 2>&1; then
        echo "❌ ERROR: 'curl' not found. Please install curl (sudo apt install curl) and try again."
        exit 1
    fi
    
    if ! curl -O $MINICONDA_URL; then
        echo ""
        echo "❌ ERROR: Failed to download Miniconda. Please install it manually."
        echo ""

        exit 1
    fi
    
    # Install in batch mode to default directory ~/miniconda3
    bash $MINICONDA_SH -b -p $HOME/miniconda3
    rm $MINICONDA_SH

    echo ""
    echo "✅ Miniconda installed in ~/miniconda3"
    echo ""
    
    # Add to current session's PATH
    export PATH="$HOME/miniconda3/bin:$PATH"
    
    # Check if conda command now exists
    if ! command -v conda >/dev/null 2>&1; then
        echo ""
        echo "❌ ERROR: Conda installation failed. Check ~/miniconda3."
        echo ""
        
        exit 1
    fi
    
    # Initialize conda for shell (required for 'conda activate')
    conda init bash
    echo ""
    echo "✅ Conda installed. You may need to 'source ~/.bashrc' or restart the terminal after this script."
    echo ""

}

# Main setup function
run_full_setup() {
    echo ""
    echo "=========================================="
    echo "🚀 Starting complete setup process..."
    echo "=========================================="
    echo ""

    
    # 1. Check/Install Conda
    if ! command -v conda >/dev/null 2>&1; then
        echo ""
        echo "❌ Conda not found."
        install_miniconda
    else
        echo ""
        echo "✅ Conda found."
    fi
    
    # Update CONDA_BASE and CONDA_ENV_PATH variables
    CONDA_BASE=$(conda info --base)
    CONDA_ENV_PATH="$CONDA_BASE/envs/$CONDA_ENV_NAME"
    
    # 2. Configure Bioconda channels (essential!)
    echo ""
    echo "🔧 Configuring Conda channels (bioconda, conda-forge)..."
    export CONDA_ALWAYS_YES="true"
    conda update -n base -c conda-forge conda
    conda config --add channels defaults >/dev/null 2>&1
    conda config --add channels bioconda >/dev/null 2>&1
    conda config --add channels conda-forge >/dev/null 2>&1
    echo ""

    
    # 3. Create Conda environment (if it doesn't exist)
    echo ""
    echo "🐍 Checking Conda environment '$CONDA_ENV_NAME'..."
    echo ""
    if [ ! -d "$CONDA_ENV_PATH" ]; then
        echo "🔄 Creating environment '$CONDA_ENV_NAME' with Python 3.10..."
        if ! conda create -n $CONDA_ENV_NAME python=3.10; then
            echo "❌ ERROR: Failed to create conda environment."
            echo ""

            exit 1
        fi
        echo "✅ Environment created."
        echo ""

    else
        echo "✅ Environment '$CONDA_ENV_NAME' already exists."
        echo ""

    fi
    
    # Activate environment for next commands
    echo "Activating environment for package installation..."
    echo ""

    export PATH="$CONDA_ENV_PATH/bin:$PATH"
    export CONDA_PREFIX="$CONDA_ENV_PATH"
    export CONDA_DEFAULT_ENV="$CONDA_ENV_NAME"
    
    # 4. Install Python dependencies (pip)
    echo "📦 Installing Python dependencies from $REQUIREMENTS_FILE..."
    echo ""

    if [ ! -f "$REQUIREMENTS_FILE" ]; then
        echo "❌ ERROR: File $REQUIREMENTS_FILE not found!"
        echo ""

        exit 1
    fi
    if ! pip install -r "$REQUIREMENTS_FILE"; then
         echo "❌ ERROR: Failed to install Python dependencies."
        echo ""

         exit 1
    fi
    echo ""
    echo "✅ Python dependencies installed."
    echo "------------------------------------------"
    echo ""
    


    # 5. Install phylogeny tools (Bioconda)
    echo "🧬 Installing phylogeny tools (Bioconda)..."
    echo ""

    # Required packages (conda package names):
    # clustalo, mafft, iq-tree, fasttree, raxml-ng, mrbayes
    local tools_list=("clustalo" "mafft" "iqtree" "fasttree" "raxml-ng" "mrbayes")

    
    echo "Installing: ${tools_list[*]}"
    echo ""

    if ! conda install -n $CONDA_ENV_NAME -c bioconda ${tools_list[@]}; then
        echo "❌ ERROR: Failed to install one or more phylogeny tools."
        echo "Try manually: conda install -n $CONDA_ENV_NAME -c bioconda ${tools_list[*]}"
        echo ""

        exit 1
    fi
    echo "✅ Phylogeny tools installed."
    echo ""


    # 6. Install Frontend dependencies (npm)
    echo "🎨 Installing Frontend dependencies (npm)..."
    cd Frontend/phylotreeminer-app || { echo "❌ ERROR: Frontend/phylotreeminer-app directory not found!"; exit 1; }
    echo ""

    
    # Check if npm is installed
    if ! command -v npm >/dev/null 2>&1; then
        echo "❌ ERROR: npm (Node.js) is not installed."
        echo "Please install Node.js manually (ex: 'sudo apt install nodejs npm') and run setup again."
        cd ../..
        exit 1
    fi
    
    if [ ! -f "package.json" ]; then
        echo "❌ ERROR: package.json not found!"
        cd ../..
        exit 1
    fi
    
    echo "🧹 Cleaning old frontend dependencies..."
    rm -rf node_modules package-lock.json
    
    echo "📦 Running npm install..."
    if ! npm install; then
        echo "❌ ERROR: Failed to install npm dependencies."
        cd ../..
        exit 1
    fi
    
    # Config creation logic (from your script) moved here
    if [ ! -f "vite.config.js" ]; then
        echo "⚠️ vite.config.js not found, creating a basic one..."
        cat > vite.config.js <<EOL
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
EOL
    fi

    if [ ! -f "tsconfig.json" ] && [ ! -f "jsconfig.json" ]; then
        echo "⚠️ tsconfig.json/jsconfig.json not found, creating jsconfig.json..."
        cat > jsconfig.json <<EOL
{
  "compilerOptions": {
    "jsx": "react-jsx"
  }
}
EOL
    fi
    
    echo "✅ Frontend dependencies and configs installed."
    cd ../..

    echo ""
    echo ""
    echo "=========================================="
    echo "🎉🎉🎉 Setup complete! 🎉🎉🎉"
    echo "=========================================="
    echo "Continuing to start applications..."
    echo ""
}

# ==============================================================================
# SCRIPT MAIN FLOW
# ==============================================================================

# INITIAL VERIFICATION
echo ""
echo ""
echo "=========================================="
echo "🔍 Checking prerequisites..."
echo "=========================================="
echo ""


# If setup is requested, run it
if [ "$IS_SETUP" == "true" ]; then
    run_full_setup
fi

# Define/Redefine Conda paths
# (Necessary if setup just ran)
if command -v conda >/dev/null 2>&1; then
    CONDA_BASE=$(conda info --base 2>/dev/null)
    if [ $? -ne 0 ] || [ -z "$CONDA_BASE" ]; then
        echo "Error: Conda not found or not initialized"
        exit 1
    fi
    CONDA_ENV_PATH="$CONDA_BASE/envs/$CONDA_ENV_NAME"
else
    # If conda is still not found (and not setup), fail
    echo "❌ ERROR: Conda is not installed or not in PATH."
    echo "Install Miniconda/Anaconda: https://docs.conda.io/en/latest/miniconda.html"
    echo "Or run this script with '--setup' to try automatic installation."
    exit 1
fi

# Critical check: Does the 'ic' environment exist?
if [ ! -d "$CONDA_ENV_PATH" ]; then
    echo "❌ ERROR: Conda environment '$CONDA_ENV_NAME' not found."
    echo "Please run this script with the '--setup' parameter first:"
    echo "   bash $0 --setup"
    exit 1
fi

echo "✅ Conda environment '$CONDA_ENV_NAME' found at $CONDA_ENV_PATH"
echo ""

# Check ports
echo "🔎 Checking ports..."
check_port 8000 "Backend"
check_port 5179 "Frontend (Vite)"

# Start Backend
echo ""
echo "📌 Starting backend in background..."
cd Backend || { echo "❌ ERROR: Backend directory not found!"; exit 1; }

# Manually activate conda environment
echo "📌 Activating conda environment '$CONDA_ENV_NAME'..."
export PATH="$CONDA_ENV_PATH/bin:$PATH"
export CONDA_PREFIX="$CONDA_ENV_PATH"
export CONDA_DEFAULT_ENV="$CONDA_ENV_NAME"

# Check if correct Python is being used
if command -v python >/dev/null 2>&1; then
    PYTHON_PATH=$(command -v python)
    PYTHON_VERSION=$(python --version 2>&1)
    echo "⚙️ Using Python: $PYTHON_PATH"
    echo "⚙️ Version: $PYTHON_VERSION"
else
    echo "❌ ERROR: Python not found in environment!"
    cleanup
fi
      
echo "------------------------------------------"
echo ""

# Check if uvicorn is available
if ! command -v uvicorn >/dev/null 2>&1; then
    echo "❌ ERROR: uvicorn not found in environment!"
    echo "The pip dependencies seem to not be installed. Try running with '--setup'."
    cleanup
fi

echo "📌 Starting backend server (Uvicorn)..."
uvicorn src.app:app --reload --reload-dir src --host 0.0.0.0 --port 8000 > ../$LOG_FILE_BACKEND 2>&1 &
BACKEND_PID=$!
cd ..

echo "📌 Backend started with PID: $BACKEND_PID"
echo "⚙️ Backend Logs: $LOG_FILE_BACKEND"
echo "------------------------------------------"
echo ""

# Start Frontend
echo "📌 Starting frontend in background..."
cd Frontend/phylotreeminer-app || { echo "❌ ERROR: Frontend/phylotreeminer-app directory not found!"; cleanup; }

# Check if npm is available (don't try to install, just check)
if ! command -v npm >/dev/null 2>&1; then
    echo "❌ ERROR: npm (Node.js) is not installed. Please install it manually."
    cleanup
fi

# Check if dependencies are installed (node_modules)
if [ ! -d "node_modules" ]; then
    echo "❌ ERROR: 'node_modules' directory not found."
    echo "Frontend dependencies are not installed. Try running with '--setup'."
    cleanup
fi

echo "📌 Starting frontend server (Vite)..."
npm run dev > ../../$LOG_FILE_FRONTEND 2>&1 &
FRONTEND_PID=$!
cd ../..

echo "⚙️ Frontend started with PID: $FRONTEND_PID"
echo "⚙️ Frontend Logs: $LOG_FILE_FRONTEND"

# Wait for apps to start
echo ""
echo "Waiting for applications to start..."
echo "=========================================="

# Give frontend time to choose a port
echo "Waiting for frontend to define port..."
sleep 5

# Detect actual frontend port
FRONTEND_PORT=$(get_frontend_port)
FRONTEND_URL="http://localhost:$FRONTEND_PORT"

echo "⚙️ Frontend using port: $FRONTEND_PORT"
echo ""

# Check if curl is available to check URLs
if ! command -v curl >/dev/null 2>&1; then
    echo "WARNING: curl not found, skipping URL verification"
    echo "   Backend probably at: $BACKEND_URL"
    echo "   Frontend probably at: $FRONTEND_URL"
else
    if wait_for_app $BACKEND_URL 10 2; then
        echo "✅ Backend running at: $BACKEND_URL"
        echo "   - API: $BACKEND_URL/docs (Swagger/OpenAPI)"
        echo "   - Health check: $BACKEND_URL/health"
    else
        echo "❌ Failed to connect to backend"
        echo "   Check logs: tail -f $LOG_FILE_BACKEND"
        echo "   Expected URL: $BACKEND_URL"
    fi

    if wait_for_app $FRONTEND_URL 15 3; then
        echo "✅ Frontend running at: $FRONTEND_URL"
    else
        echo "⚠️  Failed to connect to frontend"
        echo "   Check logs: tail -f $LOG_FILE_FRONTEND"
        echo "   Detected URL: $FRONTEND_URL"
    fi
fi

echo ""
echo "=========================================="
echo "🎉 Applications started!"
echo ""
echo "📋 Logs:"
echo "   Backend:  tail -f $LOG_FILE_BACKEND"
echo "   Frontend: tail -f $LOG_FILE_FRONTEND"
echo ""
echo "⏹️  To stop both applications:"
echo "   Use Ctrl+C in this terminal"
echo "(Or manually: pkill -f 'uvicorn src.app:app' && pkill -f 'npm run dev')"
echo ""
echo "🔍 To check if they are running:"
echo "   ps aux | grep -E '(uvicorn|npm)'"
echo ""
echo "📍 URLs:"
echo "   Frontend: $FRONTEND_URL"
echo "   Backend:  $BACKEND_URL"
echo "   API Docs: $BACKEND_URL/docs"
echo ""
echo "=========================================="

# Function to check if processes are still running
check_processes() {
    if ! kill -0 $BACKEND_PID 2>/dev/null; then
        echo "❌ Backend stopped unexpectedly!"
        return 1
    fi
    if ! kill -0 $FRONTEND_PID 2>/dev/null; then
        echo "❌ Frontend stopped unexpectedly!"
        return 1
    fi
    return 0
}

echo ""
echo "Press Ctrl+C to stop applications..."
while check_processes; do
    sleep 5
done

cleanup