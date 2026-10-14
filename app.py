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
# Online Multiplayer Room Management (Chess.com-style Invite Friend System)
# --------------------------------------------------------------------------
import uuid
import secrets

rooms = {}

def get_winning_cells_2d(board, piece):
    """Finds exact 4 winning cell coordinates for UI laser and highlights."""
    # Horizontal
    for r in range(ROWS):
        for c in range(COLS - 3):
            if all(board[r][c+i] == piece for i in range(4)):
                return [{"row": r, "col": c+i} for i in range(4)]
    # Vertical
    for c in range(COLS):
        for r in range(ROWS - 3):
            if all(board[r+i][c] == piece for i in range(4)):
                return [{"row": r+i, "col": c} for i in range(4)]
    # Diagonal Up-Right
    for r in range(3, ROWS):
        for c in range(COLS - 3):
            if all(board[r-i][c+i] == piece for i in range(4)):
                return [{"row": r-i, "col": c+i} for i in range(4)]
    # Diagonal Down-Right
    for r in range(ROWS - 3):
        for c in range(COLS - 3):
            if all(board[r+i][c+i] == piece for i in range(4)):
                return [{"row": r+i, "col": c+i} for i in range(4)]
    return []

def sanitize_room_state(room, viewer_token=None):
    """Produces clean state for the client without leaking private tokens."""
    return {
        "id": room["id"],
        "board": room["board"],
        "current_player": room["current_player"],
        "version": room["version"],
        "winner": room["winner"],
        "winning_cells": room["winning_cells"],
        "moves": room["moves"],
        "player1_name": room["player1_name"],
        "player2_name": room["player2_name"],
        "player2_joined": room["player2_token"] is not None,
        "is_your_turn": (
            (viewer_token == room["player1_token"] and room["current_player"] == 1) or
            (viewer_token == room["player2_token"] and room["current_player"] == 2)
        ) if viewer_token else False,
        "your_player_num": 1 if viewer_token == room["player1_token"] else (2 if viewer_token == room["player2_token"] else 0),
        "reactions": room["reactions"][-5:] if "reactions" in room else []
    }

@app.route("/api/rooms/create", methods=["POST"])
def api_room_create():
    """Creates a new shareable game room."""
    data = request.get_json(force=True, silent=True) or {}
    player_name = str(data.get("playerName", "Host")).strip()[:20] or "Host"
    color_pref = int(data.get("colorPref", 1)) # 1=Red, 2=Cyan, 0=Random

    room_code = f"TITAN-{secrets.token_hex(2).upper()}"
    p1_token = str(uuid.uuid4())

    rooms[room_code] = {
        "id": room_code,
        "created_at": time.time(),
        "last_active": time.time(),
        "board": [[EMPTY for _ in range(COLS)] for _ in range(ROWS)],
        "current_player": 1,
        "player1_token": p1_token,
        "player2_token": None,
        "player1_name": player_name,
        "player2_name": None,
        "winner": None,
        "winning_cells": [],
        "moves": [],
        "version": 1,
        "reactions": []
    }

    return jsonify({
        "status": "success",
        "roomId": room_code,
        "token": p1_token,
        "playerNum": 1,
        "shareUrl": f"/?room={room_code}"
    }), 201

@app.route("/api/rooms/join", methods=["POST"])
def api_room_join():
    """Allows a friend to join an existing game room."""
    data = request.get_json(force=True, silent=True) or {}
    room_id = str(data.get("roomId", "")).strip().upper()
    player_name = str(data.get("playerName", "Guest")).strip()[:20] or "Guest"

    if room_id not in rooms:
        return jsonify({"error": "Room not found. Please verify your game code."}), 404

    room = rooms[room_id]

    # If reconnecting existing player
    token = data.get("token")
    if token and (token == room["player1_token"] or token == room["player2_token"]):
        player_num = 1 if token == room["player1_token"] else 2
        return jsonify({
            "status": "success",
            "token": token,
            "playerNum": player_num,
            "state": sanitize_room_state(room, token)
        }), 200

    # New guest joining
    if room["player2_token"] is not None:
        return jsonify({"error": "This room already has 2 players."}), 403

    p2_token = str(uuid.uuid4())
    room["player2_token"] = p2_token
    room["player2_name"] = player_name
    room["version"] += 1
    room["last_active"] = time.time()

    return jsonify({
        "status": "success",
        "roomId": room_id,
        "token": p2_token,
        "playerNum": 2,
        "state": sanitize_room_state(room, p2_token)
    }), 200

@app.route("/api/rooms/<room_id>", methods=["GET"])
def api_room_state(room_id):
    """
    Fetches real-time room state.
    Supports long-polling (up to 2.5 seconds) if client passes current version.
    """
    room_id = room_id.upper()
    if room_id not in rooms:
        return jsonify({"error": "Room not found."}), 404

    room = rooms[room_id]
    token = request.args.get("token")
    client_version = request.args.get("version", type=int)

    # Long polling: if version matches, wait briefly for an update
    if client_version is not None and client_version == room["version"]:
        for _ in range(12):  # poll up to ~2.4s
            time.sleep(0.2)
            if room["version"] != client_version:
                break

    return jsonify({
        "status": "success",
        "state": sanitize_room_state(room, token)
    }), 200

@app.route("/api/rooms/<room_id>/move", methods=["POST"])
def api_room_move(room_id):
    """Executes a move in the multiplayer room."""
    room_id = room_id.upper()
    if room_id not in rooms:
        return jsonify({"error": "Room not found."}), 404

    room = rooms[room_id]
    data = request.get_json(force=True, silent=True) or {}
    token = data.get("token")
    col = data.get("col")

    if token not in (room["player1_token"], room["player2_token"]):
        return jsonify({"error": "Invalid player authorization token."}), 403

    player_num = 1 if token == room["player1_token"] else 2
    if room["current_player"] != player_num:
        return jsonify({"error": "Not your turn."}), 400

    if room["winner"] is not None:
        return jsonify({"error": "Game is already over."}), 400

    if col is None or not (0 <= col < COLS):
        return jsonify({"error": "Invalid column index."}), 400

    board = room["board"]
    if board[0][col] != EMPTY:
        return jsonify({"error": "Column is full."}), 400

    # Drop piece
    row = -1
    for r in range(ROWS - 1, -1, -1):
        if board[r][col] == EMPTY:
            board[r][col] = player_num
            row = r
            break

    room["moves"].append({
        "player": player_num,
        "row": row,
        "col": col,
        "timestamp": time.time()
    })

    # Check win
    winning_cells = get_winning_cells_2d(board, player_num)
    if winning_cells:
        room["winner"] = player_num
        room["winning_cells"] = winning_cells
    elif not any(board[0][c] == EMPTY for c in range(COLS)):
        room["winner"] = "draw"
        room["winning_cells"] = []
    else:
        room["current_player"] = 2 if player_num == 1 else 1

    room["version"] += 1
    room["last_active"] = time.time()

    return jsonify({
        "status": "success",
        "state": sanitize_room_state(room, token)
    }), 200

@app.route("/api/rooms/<room_id>/react", methods=["POST"])
def api_room_react(room_id):
    """Sends floating reaction emote to the opponent."""
    room_id = room_id.upper()
    if room_id not in rooms:
        return jsonify({"error": "Room not found."}), 404

    room = rooms[room_id]
    data = request.get_json(force=True, silent=True) or {}
    token = data.get("token")
    emote = str(data.get("emote", "🔥"))[:4]

    if token not in (room["player1_token"], room["player2_token"]):
        return jsonify({"error": "Unauthorized."}), 403

    sender_num = 1 if token == room["player1_token"] else 2
    room["reactions"].append({
        "id": secrets.token_hex(4),
        "sender": sender_num,
        "emote": emote,
        "time": time.time()
    })
    room["version"] += 1
    return jsonify({"status": "success"}), 200

@app.route("/api/rooms/<room_id>/rematch", methods=["POST"])
def api_room_rematch(room_id):
    """Resets the board for a new game in the same room."""
    room_id = room_id.upper()
    if room_id not in rooms:
        return jsonify({"error": "Room not found."}), 404

    room = rooms[room_id]
    data = request.get_json(force=True, silent=True) or {}
    token = data.get("token")

    if token not in (room["player1_token"], room["player2_token"]):
        return jsonify({"error": "Unauthorized."}), 403

    # Reset game
    room["board"] = [[EMPTY for _ in range(COLS)] for _ in range(ROWS)]
    room["current_player"] = 1
    room["winner"] = None
    room["winning_cells"] = []
    room["moves"] = []
    room["version"] += 1
    room["last_active"] = time.time()

    return jsonify({
        "status": "success",
        "state": sanitize_room_state(room, token)
    }), 200


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
        "active_multiplayer_rooms": len(rooms),
        "endpoints": [
            "POST /api/choose_move",
            "POST /api/benchmark",
            "POST /api/duel",
            "POST /api/rooms/create",
            "POST /api/rooms/join",
            "GET  /api/rooms/<id>",
            "POST /api/rooms/<id>/move",
            "POST /api/rooms/<id>/react",
            "POST /api/rooms/<id>/rematch",
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
