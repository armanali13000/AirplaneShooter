# ✈️ Air Shooter

A fast-paced 2D airplane shooting game built with **React Native** and **Expo**. Fly, shoot, dodge enemies, collect power-ups, and challenge your high score!

---

## 🎮 Features

- 🔫 Smooth player shooting mechanics
- 💣 Enemy spawn & bullet logic
- 🛡️ Power-ups: Shield & Double Shot
- 🎵 Toggle sound effects and background music
- 🕹️ Resume game from where you left
- 🎨 Custom-designed game assets
- ⚙️ Settings menu & Pause functionality
- 🌌 Dynamic game background (video/image supported)
- 📦 Optimized and ready for APK build

---

## 📱 Screenshots

*(Add your gameplay and menu screen screenshots here)*

---

## 🚀 Getting Started

### 1. Clone the repository
```bash

git clone https://github.com/your-username/air-shooter-game.git
cd air-shooter-game

2. Install dependencies

npm install

3. Start the app in development

npx expo start
Scan the QR code with Expo Go app or run on an emulator.

🛠️ Build APK (Android)

Make sure eas-cli is installed:

npm install -g eas-cli

Then build the APK:

eas build -p android --profile preview

⚙️ Project Structure

AirplaneShooter
├── assets/
│   ├── sounds/
│   ├── play/
│   └── powerups/
├── screens/
│   ├── GameScreen.tsx
│   ├── MenuScreen.tsx
│   └── SettingsScreen.tsx
├── App.tsx
├── app.json
├── eas.json
└── README.md


🧠 Tech Stack

React Native
Expo SDK
expo-av / expo-audio
lottie-react-native
AsyncStorage


💡 Future Plans

Global leaderboard (Firebase)
Boss enemies & levels
Multiplayer mode
WebGL version
