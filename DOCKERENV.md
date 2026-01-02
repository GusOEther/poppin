# Docker Development Environment

This project uses a fully containerized development environment for both the Expo Frontend and the Firebase Backend (Functions, Firestore, PubSub). This ensures consistency across different development machines and prevents "works on my machine" issues.

## 🏗 Overview

The `poppin-dev` container enables:
1.  **Frontend:** Expo Web App running on port `8081`.
2.  **Backend:** Firebase Emulator Suite running on ports `5001` (Functions), `8080` (Firestore), `8085` (PubSub), and `4000` (UI).
3.  **Authentication:** A `dummy_credentials.json` setup bypasses production Google Auth, allowing local API calls to succeed.

---

## ☁️ GitHub Codespaces (Recommended)

The easiest way to get started is using **GitHub Codespaces**. It automatically sets up the entire development environment in your browser.

### 1. Create a Codespace
1. Go to the repository on GitHub.
2. Click the green **"Code"** button → **"Codespaces"** tab → **"Create codespace on main"**.
3. Wait for the container to build (first time takes ~5 minutes).

### 2. Add Your API Key
Codespaces will prompt you to set secrets, or you can add them manually:
1. Go to **Repository Settings** → **Secrets and variables** → **Codespaces**.
2. Add a new secret: `GEMINI_API_KEY` with your Gemini API key value.

### 3. Start the Environment
Once inside the Codespace terminal:

**Terminal 1: Backend (Emulators)**
```bash
cd functions && source venv/bin/activate && firebase emulators:start
```

**Terminal 2: Frontend (Expo)**
```bash
cd app && npx expo start --web
```

Codespaces will automatically forward the ports and provide clickable URLs.

---

## 🖥️ Local Development (Docker)

For local development on Linux, macOS, or Windows (with WSL2/Docker Desktop).

### 1. Prerequisites
*   Install **Docker** and **Docker Compose**.
*   Clone the repository:
    ```bash
    git clone <your-repo-url>
    cd poppin
    ```

### 2. Configure Secrets
Create a `.env` file in the project root:
```bash
GEMINI_API_KEY=AIzaSy...YourKey...
EXPO_PUBLIC_FIREBASE_HOST=localhost
```

> **Note:** The `dummy_credentials.json` is included in the repository with a self-generated fake key. No action needed.

### 3. Start the Environment

**Option A: Two Terminals (Recommended)**

*Terminal 1: Backend (Emulators)*
```bash
sudo docker-compose run --rm -p 5001:5001 -p 8080:8080 -p 8085:8085 -p 4000:4000 poppin-dev bash -c "apt-get update && apt-get install -y python3-venv && cd functions && python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt python-dotenv firebase-admin google-genai && firebase emulators:start"
```

*Terminal 2: Frontend (Expo Web)*
```bash
sudo docker-compose run --rm -p 8081:8081 poppin-dev bash -c "cd app && npx expo start --web"
```

**Option B: Mobile Development (Expo Tunnel)**

For testing on a physical mobile device via Expo Go:
```bash
sudo docker-compose run --rm -p 8081:8081 poppin-dev bash -c "cd app && npx expo start --tunnel"
```

### 4. Access Points
| Service | URL |
|---------|-----|
| Frontend (Web) | http://localhost:8081 |
| Functions | http://localhost:5001 |
| Firestore Emulator | http://localhost:8080 |
| Emulator UI | http://localhost:4000 |

---

## 📱 Mobile Testing (ChromeOS/Linux)

To test on a physical Android device using Expo Go:

1. Find your machine's WiFi IP address (e.g., `192.168.178.58`)
2. Update `.env`:
   ```
   EXPO_PUBLIC_FIREBASE_HOST=192.168.178.58
   ```
3. Ensure ports `5001` and `8080` are accessible from your phone's network.
4. Run with `--tunnel` mode (see above).

---

## 🛠 Troubleshooting

| Issue | Solution |
|-------|----------|
| **Port Conflicts** | Run `docker ps` and `docker kill <id>` to stop old containers |
| **500 Errors** | Check that `dummy_credentials.json` exists and is valid JSON |
| **Functions not loading** | Wait 60+ seconds after emulator start; check `docker logs` |
| **Mobile can't connect** | Verify WiFi IP and port forwarding settings |

---

## 🔄 Switching to Production

To run against the **real** Firebase project:
```bash
docker-compose run --rm -p 8081:8081 -e EXPO_PUBLIC_USE_EMULATOR=false poppin-dev bash -c "cd app && npx expo start --web"
```
