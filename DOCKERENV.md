# Development Environment Strategy

This project supports three distinct development modes. Choose the one that fits your workflow.

| Mode | Best For | Description |
|------|----------|-------------|
| **A. Cloud (Codespaces)** | 🚀 **Recommended** | Develop entirely in the browser or via remote VS Code. Zero local setup. |
| **B. Local (Plain Docker)** | 🖥️ **Offline / Local** | Run the container locally using standard Docker. Edit with local Antigravity. |
| **C. Hybrid (Mount)** | 🌩️ **Advanced** | Local Editor (Antigravity) + Cloud Compute. Files are mounted locally. |

---

## Mode A: Cloud (GitHub Codespaces)
**"Run everything in the cloud."**

In this mode, both the code execution and the terminal exist on GitHub's servers. You access it via the browser or by connecting VS Code remotely.

### 1. Start the Codespace
1. Go to the GitHub repository.
2. Click **Code** → **Codespaces** → **Create codespace on main**.
3. Wait for the setup to complete (~2 mins).

### 2. Run Commands (Inside Codespace)
**Important:** When you open a terminal in Codespaces, you are *already inside* the container. You can run scripts directly.

**Terminal 1: Start Backend**
```bash
./bin/dev-backend.sh
```

**Terminal 2: Start Frontend**
```bash
./bin/dev-frontend.sh
```

**Stop Everything**
```bash
./bin/stop-dev.sh
```

---

## Mode B: Local (Plain Docker)
**"Run everything on my machine."**

In this mode, you use Docker Desktop to run the environment locally. You use Antigravity (or any editor) to edit files on your actual hard drive.

### 1. Start the Container
Run this in your local terminal (host):
```bash
docker-compose up -d
```

### 2. Run Setup (First Time Only)
You need to initialize the environment *inside* the container:
```bash
docker exec -it poppin-dev bin/setup-codespace.sh
```

### 3. Run Commands (Using the Container)
Since the environment lives inside the container, you must execute commands there.

**To Start Backend:**
```bash
docker exec -it poppin-dev ./bin/dev-backend.sh
```
*Or enter the shell first:*
```bash
docker exec -it poppin-dev bash
# Now you are inside the container
./bin/dev-backend.sh
```

**To Start Frontend:**
```bash
docker exec -it poppin-dev ./bin/dev-frontend.sh
```

### 4. Access Points
| Service | Local URL |
|---------|-----|
| Frontend (Web) | http://localhost:8081 |
| Emulator UI | http://localhost:4000 |
| Functions | http://localhost:5001 |

---

## Mode C: Hybrid (Antigravity Mount)
**"Edit locally, Run globally."**

In this unique workflow, you run the heavy computation (interpreters, servers) in the Cloud (Codespaces), but you mount the filesystem to your local machine so you can use your local Antigravity editor seamlessly.

### 1. Prerequisites
- `gh` CLI installed and authenticated.
- `sshfs` installed.

### 2. Mount the Cloud Filesystem
Run this script to connect:
```bash
./bin/mount-codespace.sh
```
**Where to run**: Run this in your **Antigravity Terminal** or local host (not inside any Docker container).

> **🚀 Tip**: This project is configured to run this automatically on startup via the "Mount Codespace" task.

This mounts the remote folder to `./remote_codespace`.

### 3. Cleanup & Shutdown
Run this script to disconnect and stop the remote compute:
```bash
./bin/dismount-codespace.sh
```
**Where to run**: Run this in your **Antigravity Terminal** or local host.

### 4. Edit Files
Open the `remote_codespace` folder in Antigravity. Any edits you make here are instantly saved to the cloud.

### 5. Run Commands
The scripts in `bin/` are "smart"—if you run them from your local host terminal, they will automatically proxy the command to the Codespace via SSH.

- To Start Backend: `./bin/dev-backend.sh`
- To Start Frontend: `./bin/dev-frontend.sh`
- To Stop Services: `./bin/stop-dev.sh`

*Alternatively, you can manually SSH in: `gh codespace ssh`*

---

## 🛠 Troubleshooting

| Issue | Solution |
|-------|----------|
| **Secrets not found** | Ensure `GEMINI_API_KEY` is in GitHub Codespaces Secrets or local `.env`. |
| **Permission Denied (Local)** | Run `chmod +x bin/*`. |
| **Port Conflicts (Local)** | The scripts now automatically try to kill zombie emulator processes. If it fails, run `fuser -k 4000/tcp 8080/tcp 8085/tcp`. |
