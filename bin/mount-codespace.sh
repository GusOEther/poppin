#!/bin/bash
set -e

CODESPACE_NAME="literate-space-happiness-jpr5xrwq7qv3g45"
MOUNT_POINT="/home/mark/poppin/remote_codespace"
SSH_CONFIG="/home/mark/.ssh/config_codespaces"

echo "🔄 Refreshing SSH config related to Codespace..."
gh codespace ssh -c $CODESPACE_NAME --config > $SSH_CONFIG

# Get the Host from the config (it changes dynamically)
HOST_ALIAS=$(awk '/^Host / {print $2; exit}' $SSH_CONFIG)

echo "📂 Ensuring mount point exists..."
mkdir -p $MOUNT_POINT

# Check if already mounted
if mount | grep -q "$MOUNT_POINT"; then
    echo "⚠️  Already mounted. Unmounting first..."
    fusermount -u $MOUNT_POINT || true
fi

echo "🔗 Mounting Codespace to $MOUNT_POINT..."
sshfs -F $SSH_CONFIG $HOST_ALIAS:/app $MOUNT_POINT

echo "✅ Success! Codespace mounted at: $MOUNT_POINT"
echo "   (You can edit files there now)"
