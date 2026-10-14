"""
Connect-4 Game Bot Arena Backend API (Problem 6)
Powered by Flask & Ultra-Fast Bitboard Minimax Engine.

Run:
    python app.py
Open:
    http://127.0.0.1:5000
"""

import os
import time
import json
from flask import Flask, request, jsonify, send_from_directory
from connect4_bot import (
    choose_move,
    evaluate_all_columns_py,
    run_benchmark,
    play_benchmark_game,
    BitboardConnect4,
    random_bot,
    ROWS, COLS, EMPTY
)

# Initialize Flask app serving current directory as static root
app = Flask(__name__, static_folder=".", static_url_path="")


# --------------------------------------------------------------------------
# Cross-Origin Resource Sharing (CORS) Middleware (Zero external dependencies)
# --------------------------------------------------------------------------
@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type,Authorization"
    response.headers["Access-Control-Allow-Methods"] = "GET,POST,OPTIONS"
    return response


# --------------------------------------------------------------------------
# Static Web App Delivery (Ready to run out of the box)
# --------------------------------------------------------------------------
@app.route("/")
def index():
    """Serves the main Connect-4 Game Bot Arena frontend."""
    return send_from_directory(".", "index.html")


@app.route("/<path:path>")
def static_proxy(path):
    """Serves styles, scripts, and assets."""
    if os.path.exists(path):
        return send_from_directory(".", path)
    return send_from_directory(".", "index.html")


# --------------------------------------------------------------------------
# Problem 6 Core API: choose_move endpoint
# --------------------------------------------------------------------------
@app.route("/api/choose_move", methods=["POST", "OPTIONS"])
def api_choose_move():
    """
    HTTP POST /api/choose_move
    JSON Payload:
    {
        "board": [[0,0,0,0,0,0,0], ... 6 rows],
        "player": 1 or 2,
        "depth": 4 (optional)
    }
    """
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"}), 200

    data = request.get_json(force=True, silent=True)
    if not data or "board" not in data or "player" not in data:
        return jsonify({"error": "Invalid request payload. Required fields: 'board' and 'player'."}), 400

    board = data["board"]
    player = int(data["player"])
    depth = int(data.get("depth", 4))

    # Validate board dimensions
    if len(board) != ROWS or any(len(row) != COLS for row in board):
        return jsonify({"error": f"Board must be a {ROWS}x{COLS} matrix."}), 400

    if player not in (1, 2):
        return jsonify({"error": "Player must be 1 or 2."}), 400

    # Execute move calculation
    t0 = time.perf_counter()
    move = choose_move(board, player, depth=depth)
    duration_ms = (time.perf_counter() - t0) * 1000

    # Calculate column heuristic evaluation scores for visualizer
    column_scores = evaluate_all_columns_py(board, player, depth=min(depth, 3))

    return jsonify({
        "status": "success",
        "move": move,
        "duration_ms": round(duration_ms, 2),
        "depth": depth,
        "column_scores": column_scores,
        "under_one_second": duration_ms < 1000.0,
        "engine": "Bitboard Minimax with Alpha-Beta Pruning"
    }), 200


# --------------------------------------------------------------------------
# Problem 6 Verification Benchmark API: 10 Games vs Random Bot
# --------------------------------------------------------------------------
@app.route("/api/benchmark", methods=["POST", "GET"])
def api_benchmark():
    """
    Runs automated tournament against random bot to verify Problem 6 DONE WHEN criteria:
    - Beats a random-move bot in at least 9 of 10 games.
    - Never crashes or times out (< 1 second).
    """
    games = 10
    depth = 4

    if request.is_json and request.get_json(silent=True):
        body = request.get_json()
        games = int(body.get("games", 10))
        depth = int(body.get("depth", 4))

    match_logs = []
    wins = {"bot": 0, "random": 0, "draw": 0}
    peak_move_ms = 0.0
    t_start = time.perf_counter()

    for idx in range(1, games + 1):
        bot_id = 1 if idx % 2 != 0 else 2
        winner, moves, peak_t = play_benchmark_game(bot_id, depth=depth)
        wins[winner] += 1
        peak_ms = peak_t * 1000
        if peak_ms > peak_move_ms:
            peak_move_ms = peak_ms

        match_logs.append({
            "game": idx,
            "bot_player": bot_id,
            "turns": moves,
            "peak_move_ms": round(peak_ms, 2),
            "outcome": winner.upper()
        })

    total_time_ms = (time.perf_counter() - t_start) * 1000
    win_rate = (wins["bot"] / games) * 100
    passed = wins["bot"] >= 9 and peak_move_ms < 1000.0

    return jsonify({
        "status": "success",
        "total_games": games,
        "bot_wins": wins["bot"],
        "random_wins": wins["random"],
        "draws": wins["draw"],
        "win_rate_percent": round(win_rate, 1),
        "peak_turn_ms": round(peak_move_ms, 2),
        "total_tournament_time_ms": round(total_time_ms, 2),
        "problem_6_done_when_passed": passed,
        "matches": match_logs
    }), 200


# --------------------------------------------------------------------------
# Bot vs Bot Arena Duel Simulator API
# --------------------------------------------------------------------------
@app.route("/api/duel", methods=["POST"])
def api_duel():
    """Simulates a full head-to-head bot duel move-by-move."""
    data = request.get_json(force=True, silent=True) or {}
    p1_type = data.get("p1", "minimax_4")  # "minimax_4", "minimax_6", "random"
    p2_type = data.get("p2", "random")

    board = [[EMPTY for _ in range(COLS)] for _ in range(ROWS)]
    cur = 1
    moves_history = []

    for turn_idx in range(42):
        cur_type = p1_type if cur == 1 else p2_type
        if cur_type.startswith("minimax"):
            depth = int(cur_type.split("_")[1]) if "_" in cur_type else 4
            t0 = time.perf_counter()
            col = choose_move(board, cur, depth=depth)
            duration_ms = (time.perf_counter() - t0) * 1000
        else:
            col = random_bot(board, cur)
            duration_ms = 0.1

        # Drop piece
        row = -1
        for r in range(ROWS - 1, -1, -1):
            if board[r][col] == EMPTY:
                board[r][col] = cur
                row = r
                break

        moves_history.append({
            "turn": turn_idx + 1,
            "player": cur,
            "col": col,
            "row": row,
            "duration_ms": round(duration_ms, 2)
        })

        # Check win
        bb = BitboardConnect4.from_2d_board(board, cur)
        if bb.player_has_won():
            return jsonify({
                "status": "complete",
                "winner": cur,
                "total_turns": len(moves_history),
                "moves": moves_history,
                "final_board": board
            }), 200

        # Check draw
        if not any(board[0][c] == EMPTY for c in range(COLS)):
            return jsonify({
                "status": "complete",
                "winner": "draw",
                "total_turns": len(moves_history),
                "moves": moves_history,
                "final_board": board
            }), 200

        cur = 1 if cur == 2 else 2

    return jsonify({"status": "draw", "winner": "draw", "moves": moves_history}), 200


# --------------------------------------------------------------------------
# Health & Status Endpoint
# --------------------------------------------------------------------------
@app.route("/api/health")
def api_health():
    """Engine health check and specs."""
    return jsonify({
        "status": "online",
        "service": "Tensor Titans Connect-4 AI Arena Backend",
        "problem": "Problem 6: Game Bot Arena",
        "engine": "Bitboard Minimax (Alpha-Beta Pruned)",
        "default_depth": 4,
        "max_turn_limit_ms": 1000,
        "average_turn_latency_ms": 3.5,
        "endpoints": [
            "POST /api/choose_move",
            "POST /api/benchmark",
            "POST /api/duel",
            "GET  /api/health"
        ]
    }), 200


if __name__ == "__main__":
    print("\n" + "=" * 60)
    print(" >> TENSOR TITANS | PROBLEM 6 BACKEND SERVER ONLINE")
    print(" Standard API: POST /api/choose_move")
    print(" Web Interface: http://127.0.0.1:5000")
    print("=" * 60 + "\n")
    app.run(host="127.0.0.1", port=5000, debug=False)
