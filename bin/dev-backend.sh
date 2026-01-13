#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Detect if we are running on the host (outside Docker/Codespace)
if [ ! -f "/.dockerenv" ] && [ "$CODESPACES" != "true" ]; then
    CODESPACE_NAME="literate-space-happiness-jpr5xrwq7qv3g45"
    echo "☁️  Executing remotely inside Codespace ($CODESPACE_NAME)..."
    gh codespace ssh -c "$CODESPACE_NAME" -- "cd /app && ./bin/dev-backend.sh"
    exit 0
fi

echo "🧹 Cleaning up old emulator processes..."
# Kill anything listening on emulator ports (4000, 4400, 4500, 5001, 8080, 8085)
fuser -k 4000/tcp 4400/tcp 4500/tcp 5001/tcp 8080/tcp 8085/tcp 2>/dev/null || true

echo "🔥 Starting Firebase Emulators..."
cd "$PROJECT_ROOT/functions"
source venv/bin/activate
firebase emulators:start
