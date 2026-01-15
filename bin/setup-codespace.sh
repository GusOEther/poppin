#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Detect if we are running on the host (outside Docker/Codespace)
if [ ! -f "/.dockerenv" ] && [ "$CODESPACES" != "true" ]; then
    echo "❌ This setup script must be run INSIDE the Codespace/Container."
    echo "To run it remotely, use: gh codespace ssh -c <name> -- 'cd /app && ./bin/setup-codespace.sh'"
    exit 1
fi

echo "🚀 Starting Poppin Codespace Setup..."

# 1. Setup Python Virtual Environment and install dependencies
echo "🐍 Setting up Python environment..."
cd "$PROJECT_ROOT/functions"
if [ -d "venv" ] && [ ! -f "venv/bin/activate" ]; then
    echo "⚠️  Existing venv is broken, removing..."
    rm -rf venv
fi

if [ ! -d "venv" ]; then
    echo "⚒️  Creating new venv..."
    python3 -m venv venv
fi
# source venv/bin/activate
./venv/bin/python3 -m pip install --upgrade pip
./venv/bin/python3 -m pip install -r requirements.txt
cd "$PROJECT_ROOT"

# 2. Setup Node dependencies for the app
echo "📦 Installing Node dependencies..."
cd "$PROJECT_ROOT/app"
npm install --legacy-peer-deps
cd "$PROJECT_ROOT"

# 3. Environment Validation
echo "🔍 Validating environment..."
if [ -z "$GEMINI_API_KEY" ]; then
    echo "⚠️  WARNING: GEMINI_API_KEY is not set. Please add it to your Codespaces secrets."
else
    echo "✅ GEMINI_API_KEY is detected."
fi

echo "✨ Setup complete! You can now start the services:"
echo "👉 Backend: ./bin/dev-backend.sh"
echo "👉 Frontend: ./bin/dev-frontend.sh"
