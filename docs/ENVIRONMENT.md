# Environment & Connectivity Guide

This document explains how the Poppin app handles connectivity between the frontend (Expo) and the backend (Firebase Emulators or Production) across different environments.

## Overview

The app uses a shared utility in `app/services/env.ts` to determine the correct host and protocol for services like Firestore and Cloud Functions. This is crucial because different environments expose ports in different ways.

## Environments

### 1. Local Development (`localhost`)
- **Trigger**: App is running on `localhost` or a local IP.
- **Behavior**: Services are accessed via standard ports on the same host.
- **Example**:
  - Frontend: `http://localhost:8081`
  - Firestore: `localhost:8080`
  - Cloud Functions: `http://localhost:5001/...`

### 2. Github Codespaces
- **Trigger**: App hostname includes `app.github.dev` or `preview.app.github.dev`.
- **Behavior**: Codespaces exposes each port on a **unique subdomain**. The utility dynamically transforms the current hostname to point to the correct port.
- **Transformation**: `*-8081.app.github.dev` -> `*-5001.app.github.dev` (for Functions).
- **Example**:
  - Frontend: `https://my-space-8081.app.github.dev`
  - Firestore Host: `my-space-8080.app.github.dev`
  - Cloud Functions: `https://my-space-5001.app.github.dev/...`

### 3. Production
- **Trigger**: Environment variable `EXPO_PUBLIC_USE_EMULATOR=false`.
- **Behavior**: All emulator connection logic is bypassed. The app connects directly to production Google Cloud endpoints.
- **Requirement**: CI/CD pipelines (Vercel, EAS, etc.) should have this variable set to `false`.

---

## Configuration

| Variable | Description | Default |
| :--- | :--- | :--- |
| `EXPO_PUBLIC_USE_EMULATOR` | Whether to use Firebase Emulators. Set to `false` for prod. | `true` (if not defined) |
| `EXPO_PUBLIC_FIREBASE_HOST` | Fallback host for emulators if detection fails. | `localhost` |

## Key Files
- [env.ts](file:///app/app/services/env.ts): Logic for host detection and URL transformation.
- [firebase.ts](file:///app/app/services/firebase.ts): Firestore initialization.
- [FirebaseEventService.ts](file:///app/app/services/FirebaseEventService.ts): Cloud Function URL resolution.
