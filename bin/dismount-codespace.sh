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
    # Wait a moment and force kill any hanging sshfs processes
    sleep 1
    pkill -f "sshfs.*$MOUNT_POINT" || true
    
    if mount | grep -q "$MOUNT_POINT"; then
        echo "⚠️  Lazy unmount failed to clear mount point entry. Attempting one last cleanup..."
        pkill -KILL -f "sshfs.*$MOUNT_POINT" || true
        sleep 1
    fi
    echo "✅ Unmounted."
else
    # Even if not in 'mount', there might be orphaned sshfs processes
    echo "ℹ️  $MOUNT_POINT was not in mount table, cleaning up any orphan processes..."
    pkill -f "sshfs.*$MOUNT_POINT" || true
fi

echo "📡 Stopping Port Forwarding..."
pkill -f "gh codespace ports forward.*$CODESPACE_NAME" || true
echo "✅ Port forwarding stopped."

echo "💤 Stopping Codespace ($CODESPACE_NAME)..."
gh codespace stop -c "$CODESPACE_NAME"
echo "✅ Codespace is shutting down."

echo "🚀 Session ended. Everything cleaned up."
