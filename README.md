# 🗼 Tower of Hanoi

A sophisticated interactive web-based puzzle game with smooth animations, real-time leaderboard, and an intelligent backend system that tracks only the elite players.

![Status](https://img.shields.io/badge/status-Active-success)
![Stack](https://img.shields.io/badge/stack-HTML%20|%20CSS%20|%20JS%20|%20Python-brightgreen)

---

## 📌 Overview

Tower of Hanoi is a classic puzzle game where players move disks between three pegs following strict rules. This implementation features:

- **Interactive Gameplay**: 3-9 difficulty levels with smooth animations
- **Smart Hints & Auto-Solve**: Get help or watch the algorithm work
- **Global Leaderboard**: Compete with players worldwide (Top 100 Elite Players)
- **Dark/Light Theme**: Toggle between themes instantly
- **Social Sharing**: Share your wins on WhatsApp, Telegram, Facebook, Twitter, and Instagram
- **Educational Content**: Learn the history, algorithm, and mathematics behind the puzzle

**Quick Start**: Open `index.html` in your browser or run with `python -m http.server 8000`

---

## 📁 Project Structure

```
Tower-of-hanoi/
│
├── 📄 index.html                  # Main game interface (20.7 KB)
│   ├── Game board with 3 towers
│   ├── Control panel (Reset, Undo, Hint, Solve)
│   ├── Stats display (Moves, Timer, Difficulty)
│   ├── Leaderboard modal
│   ├── Win celebration screen
│   └── Educational content section
│
├── 🎨 style.css                   # Styling & animations (28.9 KB)
│   ├── Dark/Light theme system
│   ├── Responsive grid layout
│   ├── Smooth animations
│   ├── Mobile-first design
│   └── 9 color-coded disk styles
│
├── ⚙️ game.js                     # Game engine (37.2 KB)
│   ├── Game state management
│   ├── Move validation & animation
│   ├── Recursive solver algorithm
│   ├── Leaderboard API integration
│   ├── User identification (UUID)
│   ├── Theme toggle & persistence
│   ├── Country picker (195 countries)
│   ├── Social sharing functionality
│   └── Toast notifications
│
├── 🖥️ backend server/             # Python backend
│   ├── server.py                      # Flask API server
│   └── requirements.txt            # Python dependencies
│
├── 📄 about.html                   # About page
├── 📄 privacy-policy.html          # Privacy information
├── 📄 terms.html                   # Terms of service
│
└── 📄 README.md                    # This file

```

### Language Composition
- **HTML**: 34.4% - Structure & Content
- **JavaScript**: 32.1% - Game Logic & Interactions
- **CSS**: 25.0% - Styling & Animations
- **Python**: 8.5% - Scalable Backend

---

## 🚀 Getting Started

### Frontend Only (No Backend)
```bash
# Clone repository
git clone https://github.com/ShoaibCodes17/Tower-of-hanoi.git
cd Tower-of-hanoi

# Open in browser
open index.html

# Or use local server
python -m http.server 8000
# Visit http://localhost:8000
```

### With Backend (Full Features)
```bash
# Install backend dependencies
cd "backend server"
pip install -r requirements.txt

# Start the backend API
python server.py

# Backend runs on http://localhost:5000/api you have keep running the code while plating the game
# Frontend automatically connects to leaderboard
```

---

## 🎮 How to Play

**Goal**: Move all disks from peg A to peg C

**Rules**:
1. Only one disk can move at a time
2. A larger disk cannot be placed on a smaller disk
3. Any peg can be the source or destination

**Controls**: Click towers to select and move disks

**Difficulty**: Choose 3-9 disks (minimum moves = 2ⁿ - 1)

---

## 🏆 Elite Backend System

### The Competitive Leaderboard

Our backend implements an intelligent ranking system that maintains the **Top 100 Elite Players** worldwide.

#### Key Features

**🎯 100-Player Elite Cap**
- Only the top 100 best scores are stored in the leaderboard
- When you beat someone's score, they are automatically removed from the rankings
- Fresh players have equal opportunity to compete

**📊 Score Tracking Per Difficulty**
- Separate leaderboards for each disk count (3-9)
- Players ranked by:
  1. **Moves** (lower is better) - Primary metric
  2. **Time** (seconds) - Tiebreaker

**⚡ Real-Time Updates**
- Scores submitted instantly
- Leaderboard refreshes automatically
- Your rank shown immediately upon completion

#### How It Works

```
Player Submits Score
        ↓
Backend Validates
        ↓
Compare with Top 100
        ↓
┌─────────────────────────────────┐
│ Is Score Better Than #100?      │
└─────────────────────────────────┘
    Yes ↓              ↓ No
    │                 Return to
    │                Game (No Rank)
    ↓
Add to Rankings
    ↓
Remove Previous Entry (if exists)
    ↓
Remove #101 (if exists)
    ↓
Show New Rank & Celebrate! 🏆
```

#### Database Structure

```python
Elite Player Record:
{
    "rank": 1,
    "name": "Champion",
    "country": "US",
    "moves": 15,
    "time_seconds": 89,
    "disks": 4,
    "user_id": "uuid-string",
    "timestamp": "2024-07-13T12:30:45Z"
}
```

#### Scalability

✅ **Optimized Storage**
- Only 100 records per difficulty level (7 levels max)
- Total maximum: 700 database records
- Minimal memory footprint
- Lightning-fast queries

#### Examples

**Scenario 1: New Player, Same Score**
```
Current #100: 20 moves, 120 seconds
New Player:   20 moves, 125 seconds

Result: New player NOT added (worse time tiebreaker)
```

**Scenario 2: New Player Beats Top 50**
```
Current #45: 18 moves, 115 seconds
New Player:  17 moves, 100 seconds

Result: New player ranked #45
        Old #45 kicked to #46
        Old #100 removed from leaderboard
```

**Scenario 3: Returning Player with Better Score**
```
Previous Rank: #67 (18 moves)
New Score:     15 moves

Result: Old entry removed
        New entry ranked #25
        Leaderboard rebalanced
        Everyone sees the update
```

#### API Endpoints

**POST /api/score** - Submit game result
```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Player Name",
  "country": "US",
  "moves": 15,
  "time_seconds": 127,
  "num_disks": 4
}
```

**Response** (if made Top 100):
```json
{
  "rank": 25,
  "message": "Congratulations! You're ranked #25! 🏆",
  "updated": true
}
```

**Response** (if not in Top 100):
```json
{
  "rank": null,
  "message": "Great try! Keep playing to beat the elite.",
  "updated": false
}
```

**GET /api/leaderboard?disks=4&user_id=uuid** - Fetch rankings
```json
[
  {
    "rank": 1,
    "name": "Top Player",
    "country": "US",
    "moves": 15,
    "time_seconds": 89,
    "is_you": false
  },
  {
    "rank": 2,
    "name": "Your Name",
    "country": "US",
    "moves": 15,
    "time_seconds": 100,
    "is_you": true
  }
]
```

---

## 🧠 Game Algorithm

**Recursive Solution** (Time Complexity: O(2ⁿ))

```
hanoi(n, source, dest, aux):
    if n == 1:
        move source → dest
    else:
        hanoi(n-1, source, aux, dest)
        move source → dest
        hanoi(n-1, aux, dest, source)
```

**Optimal Moves by Difficulty**

| Disks | Minimum | Formula |
|-------|---------|---------|
| 3 | 7 | 2³ - 1 |
| 4 | 15 | 2⁴ - 1 |
| 5 | 31 | 2⁵ - 1 |
| 9 | 511 | 2⁹ - 1 |

---

## 🎨 Features

✨ **Smooth Animations** - Fluid disk movements with easing effects  
🎯 **Smart Hints** - Next optimal move highlighted  
🤖 **Auto-Solve** - Watch the recursive algorithm work  
🌙 **Dark/Light Theme** - Toggle with one click  
📱 **Responsive Design** - Works on desktop, tablet, mobile  
🌍 **195 Countries** - Select your country for leaderboard  
📤 **Social Sharing** - Share wins on 5 platforms  
⏱️ **Timer & Stats** - Track moves and time  
↩️ **Undo Function** - Reverse mistakes  
🎉 **Confetti Celebration** - Animated win screen  

---

## 📊 Performance

- **Load Time**: <2 seconds
- **Animation FPS**: 60fps (smooth)
- **API Response**: <100ms
- **Database Queries**: O(log n) - Highly optimized
- **Storage**: Minimal (max 700 records)

---

## 🔒 Privacy & Security

- **No Tracking**: Zero analytics
- **Local Storage**: Theme & preferences stored client-side
- **UUID Identification**: Unique player IDs generated locally
- **Country Optional**: Not required, only for leaderboard flavor
- **No Passwords**: Play anonymously or with a name

**Status**: Active & Maintained ✅  
**Last Updated**: July 2026
**Version**: 1.0  

---


