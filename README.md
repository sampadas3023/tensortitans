# 🎮 Tensor Titans | Problem 6: Game Bot Arena (Connect-4 AI)

[![Python 3.10+](https://img.shields.io/badge/Python-3.10%2B-blue.svg)](https://www.python.org/)
[![Flask 3.0+](https://img.shields.io/badge/Flask-3.0%2B-lightgrey.svg)](https://flask.palletsprojects.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Problem 6 Status](https://img.shields.io/badge/Problem%206-100%25%20Compliant-brightgreen.svg)]()

> A state-of-the-art **Connect-4 Game Bot Arena** engineered for speed and strategic dominance. Featuring an ultra-fast **64-bit Bitboard Minimax Engine** with **Alpha-Beta Pruning**, **Transposition Memoization**, **Strategic Move Ordering**, and a modern **Luminous Crystal Glassmorphism UI** with Web Audio sound synthesis and real-time neural telemetry.

---

## 🏆 Problem 6 Compliance Matrix

| Requirement | Specification | Our Implementation | Status |
| :--- | :--- | :--- | :---: |
| **Grid Dimensions** | 6 Rows $\times$ 7 Columns | Standard 6x7 grid, 0=empty, 1=P1, 2=P2 | ✅ **PASS** |
| **Win Detection** | 4-in-a-row (Horiz, Vert, Diagonals) | Sub-300ns bitwise shifts across all 4 axes | ✅ **PASS** |
| **Interface** | `choose_move(board, player) -> int` | Exact required signature (returns col 0 to 6) | ✅ **PASS** |
| **Search Engine** | Minimax Search to fixed depth | Minimax with Alpha-Beta Pruning (Depth 4/6) | ✅ **PASS** |
| **Move Time Limit** | Must move within 1.0 second ($1000\text{ ms}$) | **$1.2\text{ ms} - 4.7\text{ ms}$** peak turn time ($200\times$ faster) | ✅ **PASS** |
| **Legal Moves Only** | Never an illegal or full column | Rigorous column capacity masking & validation | ✅ **PASS** |
| **"DONE WHEN"** | Beats Random Bot in $\ge 9$ of 10 games | **$10 / 10\text{ Wins (100\%)}$** in $0.08\text{ seconds}$ | ✅ **PASS** |
| **Never Crashes** | Bulletproof execution | 100% test pass rate with zero exceptions/timeouts | ✅ **PASS** |
| **Bonus Marks** | Alpha-beta, smart scoring, move ordering, bot-vs-bot | Center bias, 3-in-a-row traps, `[3, 2, 4, 1, 5, 0, 6]` ordering | ✅ **PASS** |

---

## ⚡ Performance Highlights & Benchmarks

```text
=======================================================
 PROBLEM 6 | 10-GAME VERIFICATION BENCHMARK (Depth 4)
=======================================================
Game  1: Bot played as Player 1 -> BOT    (7 moves, peak move: 1.8ms)
Game  2: Bot played as Player 2 -> BOT    (20 moves, peak move: 4.7ms)
Game  3: Bot played as Player 1 -> BOT    (7 moves, peak move: 3.1ms)
Game  4: Bot played as Player 2 -> BOT    (8 moves, peak move: 2.7ms)
Game  5: Bot played as Player 1 -> BOT    (7 moves, peak move: 2.4ms)
Game  6: Bot played as Player 2 -> BOT    (20 moves, peak move: 3.3ms)
Game  7: Bot played as Player 1 -> BOT    (7 moves, peak move: 2.1ms)
Game  8: Bot played as Player 2 -> BOT    (8 moves, peak move: 1.8ms)
Game  9: Bot played as Player 1 -> BOT    (11 moves, peak move: 2.1ms)
Game 10: Bot played as Player 2 -> BOT    (8 moves, peak move: 4.1ms)
-------------------------------------------------------
Bot Score: 10/10 (100%)
Peak Turn Latency: 4.7 ms (Limit: 1000.0 ms)
Total Tournament Time: 0.08 s
DONE WHEN REQUIREMENT: PASSED (COMPLIANT)
=======================================================
```

- **Bitwise Win Detection**: Evaluates 4-in-a-row in under **$300\text{ nanoseconds}$** using bitwise masks.
- **Move Ordering**: Prioritizes column evaluations center-outward: `[3, 2, 4, 1, 5, 0, 6]` to maximize early Alpha-Beta cutoffs.
- **Transposition Table**: Eliminates redundant computation on symmetric or transposing game branches.
- **1-Ply Tactical Shortcuts**: Instant win execution and opponent threat neutralization before launching deep search.

---

## 🎨 Frontend Architecture & Motion Graphics

- **Luminous Crystal Aesthetic**: Clean ivory canvas (`#f1f5f9`) layered with floating ambient iridescent orbs (coral, sky azure, soft violet) that drift smoothly.
- **3D Tactile Buttons**: Dynamic curved specular highlights, animated light-beam sheens sweeping across buttons on hover, and tactile 3D press feedback.
- **Sapphire Connect-4 Board**: Multi-layered glossy crystal blue chassis with beveled recessed slots.
- **Squash & Stretch Drop Physics**: Discs fall with natural gravity easing, slightly stretching during descent and bouncing on landing.
- **Victory Celebrations**: Automatic 90-particle confetti burst and holographic golden glow on winning discs.
- **Web Audio API**: Procedurally synthesized drop thuds, hover clicks, victory fanfare chords, and buzzer tones (works offline with zero external audio files).

---

## 💻 Standalone API & Function Usage

### Python: `choose_move(board, player)`

```python
from connect4_bot import choose_move

# 6 rows x 7 columns board (0=empty, 1=Player 1, 2=Player 2)
board = [
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 1, 1, 1, 0, 0]
]

# Get optimal move for Player 1 (returns column 0 to 6)
col = choose_move(board, player=1)
print(f"Chosen Column: {col}")  # Output: 1 or 5 (completing 4-in-a-row)
```

### JavaScript: `choose_move(board, player)`

Available globally in browser on `window.choose_move`:

```javascript
const col = window.choose_move(board, 1);
console.log(`Chosen Column: ${col}`);
```

---

## 🚀 Running the Game Locally

### 1. Clone the Repository
```bash
git clone https://github.com/sampadas3023/tensortitans.git
cd tensortitans
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Start the Server
```bash
python app.py
```
Open **[http://localhost:5000](http://localhost:5000)** (or **[http://127.0.0.1:5000](http://127.0.0.1:5000)**) in your browser!

---

## 🧪 Running Tests & Benchmarks

### Run the 10-Game Verification Benchmark
```bash
python connect4_bot.py --benchmark 10
```

### Run the Backend Unit & Integration Test Suite
```bash
python test_backend.py
```
Expected output:
```text
........
----------------------------------------------------------------------
Ran 8 tests in 0.156s

OK
```

---

## 📡 REST API Documentation

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/choose_move` | Calculates best move. Body: `{"board": [...], "player": 1, "depth": 4}` |
| `POST` | `/api/benchmark` | Runs automated N-game tournament against random bot. |
| `POST` | `/api/duel` | Simulates full bot vs bot match turn-by-turn. |
| `GET` | `/api/health` | Returns server health, engine specs, and latency metrics. |
| `GET` | `/` | Serves the interactive Game Bot Arena frontend. |

---

## 📂 Repository Structure

```text
tensortitans/
├── app.py              # Flask full-stack backend & REST API server
├── connect4_bot.py     # 64-bit Bitboard Minimax AI engine & choose_move implementation
├── bot.js              # Standalone JavaScript Connect-4 Minimax AI engine
├── game.js             # UI Controller, Web Audio synthesizer, animations, telemetry
├── index.html          # Semantic HTML5 game arena with telemetry HUD & modal
├── style.css           # Modern Luminous Crystal Glassmorphism stylesheet
├── test_backend.py     # Automated unit & integration tests for Problem 6 compliance
├── test_bot.py         # 10-game tournament benchmark runner script
├── requirements.txt    # Python package dependencies
├── .gitignore          # Git ignore file
└── README.md           # Project documentation and specifications
```

---

## 📜 License
MIT License. Built for **Tensor Titans — Problem 6: Game Bot Arena**.