"""
Unit & Integration Test Suite for Problem 6 Backend API
Tests Connect-4 Bot Engine, Win Detection, Threat Blocking, and Flask Endpoints.
"""

import unittest
import time
from connect4_bot import (
    choose_move,
    BitboardConnect4,
    random_bot,
    play_benchmark_game,
    run_benchmark,
    ROWS, COLS, EMPTY
)
from app import app


class TestConnect4Bot(unittest.TestCase):

    def setUp(self):
        self.empty_board = [[EMPTY for _ in range(COLS)] for _ in range(ROWS)]
        self.client = app.test_client()

    def test_choose_move_empty_board(self):
        """Must return a valid column 0 to 6 on empty board."""
        t0 = time.perf_counter()
        col = choose_move(self.empty_board, 1)
        duration = time.perf_counter() - t0

        self.assertIn(col, range(COLS))
        self.assertLess(duration, 1.0, "Move must execute in < 1 second")

    def test_immediate_winning_move(self):
        """Bot must immediately take the winning 4th move."""
        board = [[EMPTY for _ in range(COLS)] for _ in range(ROWS)]
        # Player 1 has 3 in a horizontal row on bottom (row 5, cols 0, 1, 2)
        board[5][0] = 1
        board[5][1] = 1
        board[5][2] = 1

        move = choose_move(board, 1)
        self.assertEqual(move, 3, "Bot should immediately complete 4-in-a-row on column 3")

    def test_immediate_threat_block(self):
        """Bot must block opponent's immediate winning move."""
        board = [[EMPTY for _ in range(COLS)] for _ in range(ROWS)]
        # Player 2 (opponent) has 3 in a vertical column (col 4, rows 5, 4, 3)
        board[5][4] = 2
        board[4][4] = 2
        board[3][4] = 2

        # Player 1 must drop piece on column 4 to block
        move = choose_move(board, 1)
        self.assertEqual(move, 4, "Bot should immediately block opponent's vertical threat in column 4")

    def test_never_plays_full_column(self):
        """Bot must never choose a full column."""
        board = [[EMPTY for _ in range(COLS)] for _ in range(ROWS)]
        # Fill column 3 completely
        for r in range(ROWS):
            board[r][3] = 1

        move = choose_move(board, 1)
        self.assertNotEqual(move, 3, "Bot must never choose a full column")
        self.assertIn(move, [c for c in range(COLS) if c != 3])

    def test_benchmark_problem_6_done_when(self):
        """Verifies Problem 6 DONE WHEN condition: beats random bot in >= 9 of 10 games."""
        wins = 0
        games = 10
        peak_time = 0.0

        for i in range(1, games + 1):
            bot_id = 1 if i % 2 != 0 else 2
            winner, moves, peak_t = play_benchmark_game(bot_id, depth=4)
            if winner == "bot":
                wins += 1
            if peak_t > peak_time:
                peak_time = peak_t

        self.assertGreaterEqual(wins, 9, f"Must win at least 9/10 games, got {wins}/{games}")
        self.assertLess(peak_time, 1.0, f"Peak move time must be < 1.0s, got {peak_time*1000:.1f}ms")

    def test_api_health(self):
        """Tests GET /api/health endpoint."""
        response = self.client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(data["status"], "online")
        self.assertIn("Bitboard Minimax", data["engine"])

    def test_api_choose_move(self):
        """Tests POST /api/choose_move endpoint."""
        payload = {
            "board": self.empty_board,
            "player": 1,
            "depth": 4
        }
        response = self.client.post("/api/choose_move", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(data["status"], "success")
        self.assertIn(data["move"], range(COLS))
        self.assertTrue(data["under_one_second"])

    def test_api_benchmark_endpoint(self):
        """Tests POST /api/benchmark endpoint."""
        response = self.client.post("/api/benchmark", json={"games": 5, "depth": 4})
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(data["status"], "success")
        self.assertEqual(data["total_games"], 5)
        self.assertGreaterEqual(data["bot_wins"], 4)

    def test_online_room_multiplayer_flow(self):
        """Tests full invite friend flow: create room, friend joins, makes moves, reacts."""
        # 1. Host creates room
        res = self.client.post("/api/rooms/create", json={"playerName": "Alice"})
        self.assertEqual(res.status_code, 201)
        create_data = res.get_json()
        room_id = create_data["roomId"]
        p1_token = create_data["token"]
        self.assertTrue(room_id.startswith("TITAN-"))

        # 2. Friend joins room
        res_join = self.client.post("/api/rooms/join", json={"roomId": room_id, "playerName": "Bob"})
        self.assertEqual(res_join.status_code, 200)
        join_data = res_join.get_json()
        p2_token = join_data["token"]
        self.assertTrue(join_data["state"]["player2_joined"])

        # 3. Host makes move on col 3
        res_m1 = self.client.post(f"/api/rooms/{room_id}/move", json={"token": p1_token, "col": 3})
        self.assertEqual(res_m1.status_code, 200)
        m1_data = res_m1.get_json()
        self.assertEqual(m1_data["state"]["board"][5][3], 1)
        self.assertEqual(m1_data["state"]["current_player"], 2)

        # 4. Friend makes move on col 3
        res_m2 = self.client.post(f"/api/rooms/{room_id}/move", json={"token": p2_token, "col": 3})
        self.assertEqual(res_m2.status_code, 200)
        m2_data = res_m2.get_json()
        self.assertEqual(m2_data["state"]["board"][4][3], 2)
        self.assertEqual(m2_data["state"]["current_player"], 1)

        # 5. Friend sends emoji reaction
        res_react = self.client.post(f"/api/rooms/{room_id}/react", json={"token": p2_token, "emote": "🔥"})
        self.assertEqual(res_react.status_code, 200)

        # 6. Fetch room state
        res_state = self.client.get(f"/api/rooms/{room_id}?token={p1_token}")
        self.assertEqual(res_state.status_code, 200)
        state_data = res_state.get_json()
        self.assertEqual(len(state_data["state"]["moves"]), 2)
        self.assertEqual(len(state_data["state"]["reactions"]), 1)


if __name__ == "__main__":
    unittest.main()
