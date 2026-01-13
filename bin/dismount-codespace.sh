#!/bin/bash
set -e

CODESPACE_NAME="literate-space-happiness-jpr5xrwq7qv3g45"
MOUNT_POINT="/home/mark/poppin/remote_codespace"

# Detect if we are running inside the container/codespace
if [ -f "/.dockerenv" ] || [ "$CODESPACES" == "true" ]; then
    echo "❌ This script must be run on your LOCAL HOST, not inside the Codespace."
    exit 1
fi

echo "📂 Unmounting Codespace from $MOUNT_POINT..."
if mount | grep -q "$MOUNT_POINT"; then
    fusermount -uz "$MOUNT_POINT"
    echo "✅ Unmounted."
else
    echo "ℹ️  $MOUNT_POINT was not mounted."
fi

echo "📡 Stopping Port Forwarding..."
pkill -f "gh codespace ports forward.*$CODESPACE_NAME" || true
echo "✅ Port forwarding stopped."

echo "💤 Stopping Codespace ($CODESPACE_NAME)..."
gh codespace stop -c "$CODESPACE_NAME"
echo "✅ Codespace is shutting down."

echo "🚀 Session ended. Everything cleaned up."
