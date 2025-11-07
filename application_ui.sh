#!/bin/bash

LOG_FILE_BACKEND="./logs_backend.log"
LOG_FILE_FRONTEND="./logs_frontend.log"
BACKEND_PID=""
FRONTEND_PID=""

# Default URLs
BACKEND_URL="http://localhost:8000"
FRONTEND_URL=""

# Conda paths
CONDA_BASE=$(conda info --base 2>/dev/null)

if [ $? -ne 0 ] || [ -z "$CONDA_BASE" ]; then
    echo "Erro: Conda não encontrado ou não inicializado"
    exit 1
fi

CONDA_ENV_NAME="ic"
CONDA_ENV_PATH="$CONDA_BASE/envs/$CONDA_ENV_NAME"
REQUIREMENTS_FILE="./requirements.txt"

# Function to extract frontend port from the log
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
    echo "5179"  
}

# Function to check if conda environment exists
check_conda_env() {
    if [ -d "$CONDA_ENV_PATH" ]; then
        echo "✅ Conda environment '$CONDA_ENV_NAME' found."
        return 0
    else
        echo "❌ Conda environment '$CONDA_ENV_NAME' not found."
        return 1
    fi
}

# Function to create conda environment and install requirements
create_conda_env() {
    echo "🔄 Creating conda environment '$CONDA_ENV_NAME'..."
    
    if [ ! -f "$REQUIREMENTS_FILE" ]; then
        echo "❌ ERROR: File $REQUIREMENTS_FILE not found!"
        return 1
    fi
    
    if conda create -n $CONDA_ENV_NAME python=3.10 -y; then
        echo "✅ Conda environment created successfully."
        
        export PATH="$CONDA_ENV_PATH/bin:$PATH"
        export CONDA_PREFIX="$CONDA_ENV_PATH"
        export CONDA_DEFAULT_ENV="$CONDA_ENV_NAME"
        
        echo "📦 Installing dependencies from requirements.txt..."
        if pip install -r "$REQUIREMENTS_FILE"; then
            echo "✅ Dependencies installed successfully."
            return 0
        else
            echo "❌ Failed to install dependencies."
            return 1
        fi
    else
        echo "❌ Failed to create conda environment."
        return 1
    fi
}

cleanup() {
    echo "Running cleanup..."
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
    fi
    exit 1
}

# Configure trap to catch error signals
trap 'cleanup' 1 2 3 15

check_command() {
    if [ $? -ne 0 ]; then
        echo "ERROR: Failed to execute: $1"
        cleanup
    fi
}

check_port() {
    if command -v lsof >/dev/null 2>&1; then
        if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null ; then
            echo "WARNING: Port $1 is already in use (Vite will automatically choose another)"
            return 1
        fi
    else
        # Fallback using netstat
        if command -v netstat >/dev/null 2>&1; then
            if netstat -tuln | grep ":$1 " >/dev/null; then
                echo "WARNING: Port $1 is already in use (Vite will automatically choose another)"
                return 1
            fi
        else
            echo "WARNING: Could not check port $1 (lsof and netstat not found)"
        fi
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
    
    echo "WARNING: Timeout waiting for $url (it may be starting up more slowly)"
    return 1
}

# Phylogenetic tools installation check and setup
check_and_install_phylogenetic_tools() {
    echo ""
    echo "🔍 Checking phylogenetic tools..."
    echo "=========================================="
    
    local tools=("clustalo" "mafft" "iqtree2" "fasttree" "raxml-ng" "mb")
    local tools_names=("Clustal Omega" "MAFFT" "IQ-TREE" "FastTree" "RAxML" "MrBayes")
    local missing_tools=()
    
    # Check which tools are missing
    for i in "${!tools[@]}"; do
        if command -v "${tools[$i]}" >/dev/null 2>&1; then
            echo "✅ ${tools_names[$i]} ($(command -v ${tools[$i]}))"
        else
            echo "❌ ${tools_names[$i]} not found"
            missing_tools+=("${tools[$i]}")
        fi
    done
    
    # Install missing tools if any
    if [ ${#missing_tools[@]} -gt 0 ]; then
        echo ""
        echo "📦 Installing missing phylogenetic tools..."
        
        # Activate conda environment for installation
        export PATH="$CONDA_ENV_PATH/bin:$PATH"
        export CONDA_PREFIX="$CONDA_ENV_PATH"
        export CONDA_DEFAULT_ENV="$CONDA_ENV_NAME"
        
        # Install via conda
        if conda install -c bioconda "${missing_tools[@]}" -y; then
            echo "✅ All phylogenetic tools installed successfully!"
        else
            echo "⚠️  Some tools may not have installed correctly"
            echo "You can try manual installation: conda install -c bioconda ${missing_tools[*]}"
        fi
    else
        echo "✅ All phylogenetic tools are available!"
    fi
    
    echo "=========================================="
}

# Alternative method for individual tool installation (more robust)
install_individual_tools() {
    echo ""
    echo "🔧 Installing phylogenetic tools individually..."
    
    # Activate conda environment
    export PATH="$CONDA_ENV_PATH/bin:$PATH"
    export CONDA_PREFIX="$CONDA_ENV_PATH"
    export CONDA_DEFAULT_ENV="$CONDA_ENV_NAME"
    
    local tools_to_install=()
    
    # Check and collect missing tools
    command -v clustalo >/dev/null 2>&1 || tools_to_install+=("clustalo")
    command -v mafft >/dev/null 2>&1 || tools_to_install+=("mafft")
    command -v iqtree2 >/dev/null 2>&1 || tools_to_install+=("iq-tree")
    command -v FastTree >/dev/null 2>&1 || tools_to_install+=("fasttree")
    command -v raxml-ng >/dev/null 2>&1 || tools_to_install+=("raxml")
    command -v mb >/dev/null 2>&1 || tools_to_install+=("mrbayes")
    
    if [ ${#tools_to_install[@]} -gt 0 ]; then
        echo "Installing: ${tools_to_install[*]}"
        
        for tool in "${tools_to_install[@]}"; do
            echo "📦 Installing $tool..."
            if conda install -c bioconda "$tool" -y; then
                echo "✅ $tool installed successfully"
            else
                echo "❌ Failed to install $tool"
            fi
        done
    fi
}

# Verify installation after setup
verify_phylogenetic_tools() {
    echo ""
    echo "✅ Verification of phylogenetic tools:"
    echo "=========================================="
    
    declare -A tool_commands=(
        ["Clustal Omega"]="clustalo --version"
        ["MAFFT"]="mafft --version"
        ["IQ-TREE"]="iqtree2 --version"
        ["FastTree"]="FastTree -expert 2>&1 | head -1"
        ["RAxML"]="raxml-ng --version"
        ["MrBayes"]="mb --version 2>&1 | head -1"
    )
    
    for tool_name in "${!tool_commands[@]}"; do
        if eval "${tool_commands[$tool_name]}" >/dev/null 2>&1; then
            echo "✅ $tool_name: Working"
        else
            echo "❌ $tool_name: Not functioning properly"
        fi
    done
}

#  INITIAL CHECK 
echo "🔍 Checking prerequisites..."
echo "=========================================="

# Check if conda is installed
if ! command -v conda >/dev/null 2>&1; then
    echo "❌ ERROR: Conda is not installed!"
    echo "Install Miniconda/Anaconda first: https://docs.conda.io/en/latest/miniconda.html"
    exit 1
fi

# Check if conda environment exists, otherwise create it
if ! check_conda_env; then
    echo "📝 Environment does not exist, creating automatically..."
    if ! create_conda_env; then
        echo "❌ Failed to create conda environment. Check the errors above."
        exit 1
    fi
fi

#  SOLUTION FOR CONDA SOLVER ISSUE 
echo "Configuring Conda classic solver..."
export CONDA_ALWAYS_YES="true"
conda config --set solver classic >/dev/null 2>&1 || echo "WARNING: Could not configure classic solver"

#  Check ports 
echo "Checking ports..."
check_port 8000
check_port 5179

#  Start Backend 
echo "Starting backend in background..."
cd Backend || { echo "ERROR: Backend directory not found!"; exit 1; }

# Manually activate conda environment
echo "Activating conda environment '$CONDA_ENV_NAME'..."
export PATH="$CONDA_ENV_PATH/bin:$PATH"
export CONDA_PREFIX="$CONDA_ENV_PATH"
export CONDA_DEFAULT_ENV="$CONDA_ENV_NAME"

# Check if correct Python is being used
if command -v python >/dev/null 2>&1; then
    PYTHON_PATH=$(command -v python)
    PYTHON_VERSION=$(python --version 2>&1)
    echo "Using Python: $PYTHON_PATH"
    echo "Version: $PYTHON_VERSION"
else
    echo "ERROR: Python not found in environment!"
    cleanup
fi

# Check if requirements.txt is up to date
echo "Checking if all dependencies are installed..."
if pip install -r requirements.txt --quiet; then
    echo "✅ Dependencies verified/updated."
else
    echo "⚠️  WARNING: Some dependencies may not be up to date"
fi

# Check if uvicorn is available
if ! command -v uvicorn >/dev/null 2>&1; then
    echo "❌ ERROR: uvicorn not found in environment!"
    echo "Installing uvicorn..."
    pip install uvicorn
    check_command "pip install uvicorn"
fi

echo "Starting backend server..."
uvicorn src.app:app --reload --reload-dir src --host 0.0.0.0 --port 8000 > ../$LOG_FILE_BACKEND 2>&1 &
BACKEND_PID=$!
cd ..

echo "Backend started with PID: $BACKEND_PID"
echo "Backend logs: $LOG_FILE_BACKEND"

#  Start Frontend 
echo "Starting frontend in background..."
cd Frontend/fpm-tree-app || { echo "ERROR: Frontend/fpm-tree-app directory not found!"; cleanup; }

# Check if npm is available
# if ! command -v npm &> /dev/null; then
#     echo "📦 Installing Node.js..."
#     curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
#     sudo apt-get install -y nodejs
# fi

# # Check if npm is available
# if ! command -v npm &> /dev/null; then
#     echo "❌ ERROR: npm not found even after Node.js install!"
#     cleanup
# fi

# # Check if package.json exists
# if [ ! -f "package.json" ]; then
#     echo "❌ ERROR: package.json not found in frontend directory!"
#     cleanup
# fi

# # Remove node_modules and lock file to avoid conflicts
# echo "🧹 Cleaning old dependencies..."
# rm -rf node_modules package-lock.json

# # Install required frontend dependencies
# echo "📦 Installing frontend dependencies..."
# npm install react@18 react-dom@18 --save
# npm install vite @vitejs/plugin-react --save-dev
# npm install react-router-dom leaflet vis-data vis-network react-markdown --save
# npm install react-leaflet@4.2.1 --save

# # Reinstall all other project dependencies
# npm install

# # Ensure vite.config.js exists with react plugin
# if [ ! -f "vite.config.js" ]; then
#     echo "⚠️ vite.config.js not found, creating a basic one..."
#     cat > vite.config.js <<EOL
# import { defineConfig } from 'vite'
# import react from '@vitejs/plugin-react'

# export default defineConfig({
#   plugins: [react()],
# })
# EOL
# fi

# # Ensure tsconfig.json/jsconfig.json has react-jsx
# if [ ! -f "tsconfig.json" ] && [ ! -f "jsconfig.json" ]; then
#     echo "⚠️ tsconfig.json/jsconfig.json not found, creating jsconfig.json..."
#     cat > jsconfig.json <<EOL
# {
#   "compilerOptions": {
#     "jsx": "react-jsx"
#   }
# }
# EOL
# fi

echo "Starting frontend server..."
npm run dev > ../../$LOG_FILE_FRONTEND 2>&1 &
FRONTEND_PID=$!
cd ../..

echo "Frontend started with PID: $FRONTEND_PID"
echo "Frontend logs: $LOG_FILE_FRONTEND"

#  Wait for apps to start 
echo ""
echo "Waiting for applications to start..."
echo "=========================================="

# Give frontend time to choose a port
echo "Waiting for frontend to choose a port..."
sleep 5

# Detect actual frontend port
FRONTEND_PORT=$(get_frontend_port)
FRONTEND_URL="http://localhost:$FRONTEND_PORT"

echo "Frontend using port: $FRONTEND_PORT"

# Check if curl is available to check URLs
if ! command -v curl >/dev/null 2>&1; then
    echo "WARNING: curl not found, skipping URL checks"
    echo "Backend probably at: $BACKEND_URL"
    echo "Frontend probably at: $FRONTEND_URL"
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
echo "   pkill -f 'uvicorn src.app:app'"
echo "   pkill -f 'npm run dev'"
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
echo "Press Ctrl+C to stop the applications..."
while check_processes; do
    sleep 5
done

cleanup