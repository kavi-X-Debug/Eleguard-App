# 🐘 EleGuard — Smart Farm Defense & Wildlife Monitoring System

EleGuard is an advanced, real-time IoT-enabled mobile application designed to protect agricultural zones and farms from elephant intrusions. By combining real-time IoT sensor signals, automated physical deterrents (sirens, lights, gates), and live alert logs, EleGuard offers farmers and administrators a powerful system to prevent crop damage and ensure community safety.

---

## 🚀 Key Features

*   **Real-time Sensor Mapping**: Dynamic visual mapping (`FarmMap.js` and `SensorDot.js`) showing sensor positions and status in real-time.
*   **Heatmap Analytics**: Threat-density visualization (`HeatmapScreen.js`) to track and analyze elephant migration patterns and high-risk zones.
*   **Smart Auto-Defense Trigger**:
    *   **5 consecutive HIGH or CRITICAL severity alerts** from any single sensor triggers the defense system automatically.
    *   **10 consecutive LOW or MEDIUM severity alerts** from any single sensor triggers the defense system automatically.
*   **Zero-Trust Master Kill Switch**: A global auto-defense lock parameter. When disabled, the entire system shifts to total silence: alert counters stop, and hardware deterrents are instantly reset.
*   **Background Siren & Alerts**: Custom alarm playback using `expo-audio` and push notifications via `expo-notifications` (collapsing as `🐘 EleGuard Alert`).
*   **Firebase Integration**: Native real-time database synchronization and Firebase Cloud Functions backend monitoring.

---

## 🛠️ Technology Stack

*   **Framework**: [Expo SDK 54](https://expo.dev/) (React Native)
*   **Language**: JavaScript / Node.js
*   **State & Database**: [Firebase Realtime Database](https://firebase.google.com/)
*   **Backend Serverless**: Firebase Cloud Functions (v1)
*   **Typography**: Google Fonts (`Lexend`, `Space Grotesk`)
*   **Native Modules**: `expo-audio`, `expo-notifications`, `expo-linear-gradient`

---

## ⚙️ Architecture & Logic Flows

### 1. The Auto-Defense Gating Policy (Master Lock)
To guarantee that physical defense alarms do not trigger accidentally when disabled, the backend and frontend execute a strict checking order:
```
iot_signals listener fires
        ↓
Step 1: Fresh read of `defense_system/autoDefense` from DB (Zero-Trust)
        ↓
Step 2: If (autoDefense === false) -> Reset sensor counters & hard-exit immediately
        ↓
Step 3: If (autoDefense === true) -> Check severity and increment counters
```

### 2. Auto-Reset and Deactivation
*   **Master Toggle Reset**: Toggling the `autoDefense` switch (ON or OFF) triggers a global reset of `highSeverityCount`, `lowSeverityCount`, and `autoTriggered` flags across all sensors (`S1` to `S14`).
*   **Direct Deactivation**: A `SAFE` signal from any sensor immediately resets the specific counter and deactivates the corresponding deterrent hardware.
*   **Deduplication Guard**: Signals include a `lastProcessedKey` check to prevent network re-transmissions or duplicate database updates from prematurely triggering defense thresholds.

---

## 📦 Getting Started

### Prerequisites

*   Node.js (v18+)
*   Expo CLI (`npm install -g expo-cli`)
*   EAS CLI (For native builds: `npm install -g eas-cli`)
*   Firebase CLI (`npm install -g firebase-tools`)

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/kavi-X-Debug/Eleguard-App.git
    cd Eleguard-App
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Configure Firebase:
    *   Place your `google-services.json` in the root directory and the `android/app/` directory.
    *   Update `firebase.json` and `.firebaserc` with your Firebase project details.

### Running Locally

To run the development server:
```bash
npm start
```
*   Press `a` to run on Android emulator or connected device.
*   Press `w` to run on the web.

---

## ⚡ Cloud Functions Deployment

The background logic (consecutive alert counters and automatic deterrent triggering) runs on Firebase Cloud Functions.

To deploy or update backend rules and functions:
```bash
# Navigate to functions folder
cd functions

# Install dependencies
npm install

# Deploy to Firebase
firebase deploy --only functions
```

---

## 🏗️ Building with EAS (Expo Application Services)

Since EleGuard relies on native background notifications, background audio, and Android-specific intent filters, standard Expo Go cannot run all modules. You must build a custom development client or native APK.

### Step 1: Configure & Login
```bash
eas login
```

### Step 2: Initialize Expo Project Configuration (if needed)
```bash
eas project:init
```

### Step 3: Run the Build
*   **Android (APK)**:
    ```bash
    eas build --platform android --profile preview
    ```
*   **iOS**:
    ```bash
    eas build --platform ios
    ```

The EAS CLI will provide a progress link. Once completed, a downloadable binary or QR code will be generated for direct device installation.
