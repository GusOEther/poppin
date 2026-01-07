#!/bin/bash
set -e

echo "🚀 Starting Poppin Codespace Setup..."

# 1. Setup Python Virtual Environment and install dependencies
echo "🐍 Setting up Python environment..."
cd functions
if [ -d "venv" ] && [ ! -f "venv/bin/activate" ]; then
    echo "⚠️  Existing venv is broken, removing..."
    rm -rf venv
fi

if [ ! -d "venv" ]; then
    echo "⚒️  Creating new venv..."
    python3 -m venv venv
fi
source venv/bin/activate
python3 -m pip install --upgrade pip
python3 -m pip install -r requirements.txt
cd ..

# 2. Setup Node dependencies for the app
echo "📦 Installing Node dependencies..."
cd app
npm install --legacy-peer-deps
cd ..

# 3. Environment Validation
echo "🔍 Validating environment..."
if [ -z "$GEMINI_API_KEY" ]; then
    echo "⚠️  WARNING: GEMINI_API_KEY is not set. Please add it to your Codespaces secrets."
else
    echo "✅ GEMINI_API_KEY is detected."
fi

echo "✨ Setup complete! You can now start the services:"
echo "👉 Backend: cd functions && source venv/bin/activate && firebase emulators:start"
echo "👉 Frontend: cd app && npx expo start --web"
