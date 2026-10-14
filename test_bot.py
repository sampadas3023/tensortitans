"""
Test suite to verify Problem 6 DONE WHEN conditions:
- Beats a random-move bot in at least 9 of 10 games.
- Never crashes or times out (< 1 second per move).
"""

import copy
import random
import time
from connect4_bot import (
    ROWS, COLS, EMPTY, is_valid_location, get_valid_locations,
    get_next_open_row, drop_piece, check_win, choose_move
)


def random_bot(board, player):
    valid_cols = get_valid_locations(board)
    return random.choice(valid_cols)


def play_game(bot_player_id=1, depth=4):
    board = [[0 for _ in range(COLS)] for _ in range(ROWS)]
    current_player = 1
    total_moves = 0
    bot_move_times = []

    while True:
        valid_cols = get_valid_locations(board)
        if not valid_cols:
            return "draw", total_moves, max(bot_move_times) if bot_move_times else 0

        if current_player == bot_player_id:
            t0 = time.perf_counter()
            col = choose_move(board, current_player, depth=depth)
            dt = time.perf_counter() - t0
            bot_move_times.append(dt)

            if not is_valid_location(board, col):
                raise ValueError(f"Bot made illegal move on col {col}!")
        else:
            col = random_bot(board, current_player)

        row = get_next_open_row(board, col)
        drop_piece(board, row, col, current_player)
        total_moves += 1

        if check_win(board, current_player):
            winner = "bot" if current_player == bot_player_id else "random"
            return winner, total_moves, max(bot_move_times) if bot_move_times else 0

        current_player = 1 if current_player == 2 else 2


def run_benchmark(n_games=10):
    print(f"=== RUNNING 10 GAMES BENCHMARK ===")
    results = {"bot": 0, "random": 0, "draw": 0}
    max_time_observed = 0.0

    for i in range(1, n_games + 1):
        # Alternate who goes first (5 games bot is P1, 5 games bot is P2)
        bot_id = 1 if i % 2 != 0 else 2
        winner, moves, max_t = play_game(bot_player_id=bot_id, depth=4)
        results[winner] += 1
        if max_t > max_time_observed:
            max_time_observed = max_t
        print(f"Game {i:2d}: Bot played as P{bot_id} -> Result: {winner.upper()} ({moves} moves, max move time: {max_t*1000:.1f}ms)")

    print("\n=== SUMMARY ===")
    print(f"Bot Wins: {results['bot']}/{n_games} ({results['bot']/n_games*100:.0f}%)")
    print(f"Random Wins: {results['random']}/{n_games}")
    print(f"Draws: {results['draw']}/{n_games}")
    print(f"Peak Move Duration: {max_time_observed*1000:.1f}ms (Limit: 1000ms)")
    passed = results["bot"] >= 9 and max_time_observed < 1.0
    print(f"Problem 6 'DONE WHEN' Requirement Met: {'SUCCESS - PASSED!' if passed else 'FAILED'}")
    return passed


if __name__ == "__main__":
    run_benchmark(10)
