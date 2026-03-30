# 🎮 Gesture-Controlled Rock Paper Scissors

A real-time, webcam-powered Rock Paper Scissors game that uses **Google MediaPipe Hand Landmarker** to detect your hand gestures and play against an AI opponent — all running in the browser!

![Game Screenshot](https://img.shields.io/badge/Status-Live-brightgreen) ![Tech](https://img.shields.io/badge/Tech-MediaPipe%20%7C%20JavaScript%20%7C%20WebCam-blue)

## 🚀 Features

- **🖐️ Real-time Hand Gesture Detection** — Uses MediaPipe to track 21 hand landmarks via webcam
- **🤖 Smart AI Opponent** — 3 difficulty levels (Easy, Medium, Hard with Markov chain prediction)
- **🏆 Tournament Mode** — Best of 3 rounds, each round has 5 matches
- **🔥 Win Streak System** — Track consecutive wins with fire effects
- **🎭 3 Themes** — Classic (✊✋✌️), Naruto (🔥💧🌀), Marvel (🛡️⚡🕷️)
- **🎵 Sound Effects** — Procedural audio via Web Audio API (zero external files)
- **✨ Premium UI** — Glassmorphism dark theme with neon glow effects and animations
- **⏳ Countdown Timer** — 3-2-1-SHOOT! with gesture capture at the exact moment

## 🎯 How It Works

1. **Camera** detects your hand using MediaPipe Hand Landmarker
2. **Finger State Analysis** classifies your gesture:
   - ✊ **Rock** — All fingers folded
   - ✋ **Paper** — All fingers extended
   - ✌️ **Scissors** — Index + Middle finger extended
3. **AI picks** its move (pattern-based prediction on Hard mode)
4. **Result** is displayed with animations and sound effects

## 🕹️ How to Play

1. Clone this repo
2. Run a local server:
   ```bash
   python -m http.server 3000
   ```
3. Open `http://localhost:3000` in Chrome/Edge
4. Allow camera access
5. Click **▶ Start Match** or press **Space**
6. Show your hand gesture during the countdown
7. Win the tournament! 🏆

## 🛠️ Tech Stack

| Technology | Purpose |
|-----------|---------|
| MediaPipe Hand Landmarker | Real-time hand tracking (21 landmarks) |
| Vanilla JavaScript | Game logic, AI opponent, gesture classification |
| CSS3 | Glassmorphism, animations, theme system |
| Web Audio API | Procedural sound effects |
| HTML5 Canvas | Hand skeleton overlay drawing |

## 📁 Project Structure

```
├── index.html    # Main game page
├── style.css     # Premium dark theme + animations
├── game.js       # MediaPipe, gesture detection, AI, game flow
├── audio.js      # Procedural sound effects engine
└── README.md     # This file
```

## 🎨 Themes

| Theme | Style | Icons |
|-------|-------|-------|
| Classic | Purple/Cyan neon | ✊ ✋ ✌️ |
| Naruto | Orange/Red flames | 🔥 💧 🌀 |
| Marvel | Red/Gold metallic | 🛡️ ⚡ 🕷️ |

## 📜 License

MIT License — feel free to use and modify!

---

Built with ❤️ using MediaPipe + JavaScript
