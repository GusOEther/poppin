#!/bin/bash
set -e

CODESPACE_NAME="literate-space-happiness-jpr5xrwq7qv3g45"
MOUNT_POINT="/home/mark/poppin/remote_codespace"
SSH_CONFIG="/home/mark/.ssh/config_codespaces"

echo "🔍 Checking Codespace status..."
# Attempt to run a dummy command. If the codespace is stopped, this will trigger the interactive "starting..." flow or fail if non-interactive.
# We trust gh CLI to handle the "Starting codespace..." spinner usually.
gh codespace ssh -c $CODESPACE_NAME -- echo "✅ Codespace is active"

echo "🔄 Refreshing SSH config related to Codespace..."
gh codespace ssh -c $CODESPACE_NAME --config > $SSH_CONFIG

# Get the Host from the config (it changes dynamically)
HOST_ALIAS=$(awk '/^Host / {print $2; exit}' $SSH_CONFIG)

echo "📂 Ensuring mount point exists..."
mkdir -p $MOUNT_POINT

# Check if already mounted
if mount | grep -q "$MOUNT_POINT"; then
    echo "⚠️  Already mounted. Unmounting (lazy)..."
    fusermount -uz $MOUNT_POINT || true
    sleep 1
fi

echo "🔗 Mounting Codespace to $MOUNT_POINT..."
sshfs -o reconnect,ServerAliveInterval=15,ServerAliveCountMax=3 -F $SSH_CONFIG $HOST_ALIAS:/app $MOUNT_POINT

echo "✅ Success! Codespace mounted at: $MOUNT_POINT"

echo "📡 Starting Port Forwarding (8081, 4000, 8080, 5001)..."
# Kill previous forwarding processes to avoid "port already in use"
pkill -f "gh codespace ports forward.*$CODESPACE_NAME" || true

# Forward ports in the background using nohup to ensure it persists.
nohup gh codespace ports forward 8081:8081 4000:4000 8080:8080 5001:5001 8085:8085 9099:9099 -c $CODESPACE_NAME > /dev/null 2>&1 &

echo "🚀 Everything ready! Open http://localhost:8081"
