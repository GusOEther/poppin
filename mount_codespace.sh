#!/bin/bash
set -e

CODESPACE_NAME="literate-space-happiness-jpr5xrwq7qv3g45"
# We mount it to the same path as before
# NOTE: Adjust this path if you run the script from a different location locally
MOUNT_POINT="/home/mark/poppin/remote_codespace"
CONFIG_FILE="$HOME/.ssh/config_codespaces"

echo "🔄 Refreshing SSH Config (and starting Codespace if needed)..."
# This command automatically starts the codespace if it's currently stopped
gh codespace ssh -c "$CODESPACE_NAME" --config > "$CONFIG_FILE"

echo "📂 Ensuring mount point exists..."
mkdir -p "$MOUNT_POINT"

echo "🚀 Mounting via SSHFS..."
# Check if already mounted
if mountpoint -q "$MOUNT_POINT"; then
    echo "⚠️  Already mounted. Unmounting first..."
    fusermount -u "$MOUNT_POINT"
fi

# Extract Host from config (it's usually 'cs.<name>.main')
HOST_ALIAS="cs.${CODESPACE_NAME}.main"

sshfs -F "$CONFIG_FILE" "$HOST_ALIAS":/app "$MOUNT_POINT"

echo "✅ Successfully mounted Codespace at: $MOUNT_POINT"
echo "👉 You can now access your files there."
