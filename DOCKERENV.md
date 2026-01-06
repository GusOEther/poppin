# Development Environment Strategy

This project is optimized for **GitHub Codespaces**, providing a fully containerized environment for both the Expo Frontend and the Firebase Backend.

## 🚀 GitHub Codespaces (Primary)

The recommended way to develop is using **GitHub Codespaces**. It automatically sets up everything you need.

### 1. Create a Codespace
1. Go to the repository on GitHub.
2. Click **"Code"** → **"Codespaces"** → **"Create codespace on main"**.
3. The environment will auto-configure using `.devcontainer` (takes ~2-3 minutes).

### 2. Configure Secrets
Ensure you have your API keys set in GitHub:
1. **GitHub Settings** → **Secrets and variables** → **Codespaces**.
2. Add `GEMINI_API_KEY`.

### 3. Start the Environment
The `bin/setup-codespace.sh` script runs automatically on creation, but you can run it manually if needed:
```bash
bash bin/setup-codespace.sh
```

**Terminal 1: Backend (Emulators)**
```bash
cd functions && source venv/bin/activate && firebase emulators:start
```

**Terminal 2: Frontend (Expo)**
```bash
cd app && npx expo start --web
```

---

## 🖥️ Local Development (Docker)

If you prefer to work locally on Linux, macOS, or Windows (WSL2).

### 1. Start the Container
```bash
docker-compose up -d
```

### 2. Run Setup
```bash
docker exec -it poppin-dev bin/setup-codespace.sh
```

### 3. Access Points
| Service | URL |
|---------|-----|
| Frontend (Web) | http://localhost:8081 |
| Emulator UI | http://localhost:4000 |
| Functions | http://localhost:5001 |

---

## 🛠 Troubleshooting

| Issue | Solution |
|-------|----------|
| **Secrets not found** | Ensure `GEMINI_API_KEY` is in GitHub Codespaces Secrets. |
| **Port Forwarding** | Codespaces usually auto-forwards. Use the "Ports" tab in VS Code to see URLs. |
| **Dependency issues** | Run `bash bin/setup-codespace.sh` again. |
