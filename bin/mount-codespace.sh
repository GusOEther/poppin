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

# Check for stale mount or existing connection
if mount | grep -q "$MOUNT_POINT"; then
    echo "🔍 Checking mount health..."
    if ! timeout 2 ls "$MOUNT_POINT" >/dev/null 2>&1; then
        echo "⚠️  Mount point is stale (Transport endpoint is not connected). Cleaning up..."
        fusermount -uz "$MOUNT_POINT" || true
        # Also kill any sshfs processes that might be hanging
        pkill -f "sshfs.*$MOUNT_POINT" || true
    else
        echo "✅ Mount is healthy. Re-mounting to ensure fresh session..."
        fusermount -uz "$MOUNT_POINT" || true
    fi
    sleep 1
fi

# Ensure no orphan sshfs processes are targeting this mount point
pkill -f "sshfs.*$MOUNT_POINT" || true

echo "🔗 Mounting Codespace to $MOUNT_POINT..."
# We disable ControlMaster because it can cause hangs with sshfs.
sshfs -o reconnect,ServerAliveInterval=15,ServerAliveCountMax=3 \
      -o ControlMaster=no \
      -F $SSH_CONFIG $HOST_ALIAS:/app $MOUNT_POINT

# Verify mount success
if ! mount | grep -q "$MOUNT_POINT"; then
    echo "❌ Failed to mount $MOUNT_POINT. Check $SSH_CONFIG and codespace status."
    exit 1
fi

echo "✅ Success! Codespace mounted at: $MOUNT_POINT"

echo "📡 Starting Port Forwarding (8081, 4000, 8080, 5001)..."
# Kill previous forwarding processes to avoid "port already in use"
pkill -f "gh codespace ports forward.*$CODESPACE_NAME" || true

# Forward ports in the background using nohup to ensure it persists.
nohup gh codespace ports forward 8081:8081 4000:4000 8080:8080 5001:5001 8085:8085 9099:9099 -c $CODESPACE_NAME > /dev/null 2>&1 &

echo "🚀 Everything ready! Open http://localhost:8081"
