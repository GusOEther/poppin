#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Detect if we are running on the host (outside Docker/Codespace)
if [ ! -f "/.dockerenv" ] && [ "$CODESPACES" != "true" ]; then
    CODESPACE_NAME="literate-space-happiness-jpr5xrwq7qv3g45"
    echo "☁️  Executing remotely inside Codespace ($CODESPACE_NAME)..."
    gh codespace ssh -c "$CODESPACE_NAME" -- -L 8081:localhost:8081 "cd /app && ./bin/dev-frontend.sh"
    exit 0
fi

echo "🧹 Cleaning up old Expo processes..."
fuser -k 8081/tcp 2>/dev/null || true

echo "📱 Starting Expo Web..."
cd "$PROJECT_ROOT/app"
npx expo start --web
