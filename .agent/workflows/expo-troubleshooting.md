---
description: Troubleshooting and best practices for running Expo on Xiaomi/HyperOS devices
---

# Expo & Xiaomi/HyperOS Troubleshooting

When running Expo Go on Xiaomi/HyperOS devices, follow these rules to ensure stability and connectivity.

### 1. Version Management
- **Pin Expo SDK**: Match the `expo` version in `package.json` exactly to the version supported by your Expo Go app (e.g., `54.0.6` or `~54.0.30`).
- **Stable React**: Ensure `react` and `react-native` versions are those recommended by the Expo SDK (check using `npx expo doctor`).

### 2. Native Configuration (app.json)
- **Architecture**: Always keep `"newArchEnabled": false` (or remove the line) in `app.json`. The New Architecture (`TurboModules`) often conflicts with the Expo Tunnel and Go app on these devices.

### 3. Graphics & UI (Xiaomi Specific)
- **Avoid BlurView**: `expo-blur` / `<BlurView>` frequently causes crashes or freezes on Xiaomi/HyperOS graphics drivers.
- **Fallback Solution**: Use a standard `<View>` with a semi-transparent background color (e.g., `rgba(20, 20, 30, 0.8)`) instead.

### 4. Connectivity & Tunneling
- **Command**: Use `npx expo start --tunnel -c` to ensure a stable tunnel connection and clear the Metro cache.
- **Battery Optimization**: DISABLE "Battery Optimization" for the Expo Go app in the Android system settings. HyperOS aggressively kills background tunnels.

### 5. Memory & Process Management
- **Port Conflicts**: If the server exits with code 137 (OOM) or port errors, manually kill previous processes and clean the cache.
- **CI Flag**: Ensure the environment variable `CI` is NOT set to `1`, otherwise Metro will disable Live Reload.

### 6. Dependency Alignment
- **Explicit Icons**: Always include `@expo/vector-icons` in `package.json` if using Ionicons or MaterialIcons.
- **Validation**: Run `npx expo install --fix` after any manual dependency changes.
