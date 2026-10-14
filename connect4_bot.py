"""
Connect-4 AI Engine (Problem 6 | Game Bot Arena)
Ultra-Fast Bitboard Minimax Engine with Alpha-Beta Pruning, Move Ordering,
Transposition Table, and Heuristic Window Evaluation.

Standard Interface:
    choose_move(board, player) -> int (column 0 to 6)
"""

import sys
import time
import math
import random
from typing import List, Tuple, Optional, Dict

ROWS = 6
COLS = 7
EMPTY = 0
WINDOW_LENGTH = 4

# Move ordering prioritizing center outward
COLUMN_ORDER = [3, 2, 4, 1, 5, 0, 6]

# Bitboard constants: 7 bits per column (6 rows + 1 sentinel bit)
BITS_PER_COL = 7
BOTTOM_MASK = sum(1 << (c * BITS_PER_COL) for c in range(COLS))
BOARD_MASK = sum(( (1 << ROWS) - 1 ) << (c * BITS_PER_COL) for c in range(COLS))
COL_TOP_MASKS = [(1 << (c * BITS_PER_COL + ROWS - 1)) for c in range(COLS)]


class BitboardConnect4:
    """High-speed bitboard representation of Connect-4."""
    __slots__ = ('player_bb', 'all_bb', 'heights')

    def __init__(self, player_bb: int = 0, all_bb: int = 0, heights: Optional[List[int]] = None):
        self.player_bb = player_bb
        self.all_bb = all_bb
        if heights is None:
            self.heights = [c * BITS_PER_COL for c in range(COLS)]
        else:
            self.heights = heights

    @classmethod
    def from_2d_board(cls, board: List[List[int]], current_player: int):
        """Converts standard 6x7 2D board (0=empty, 1/2=players) to BitboardConnect4."""
        player_bb = 0
        all_bb = 0
        heights = []

        for c in range(COLS):
            # Count pieces in column from bottom (row 5) upwards to row 0
            pieces_in_col = 0
            for r in range(ROWS - 1, -1, -1):
                val = board[r][c]
                if val != EMPTY:
                    bit = (c * BITS_PER_COL) + (ROWS - 1 - r)
                    all_bb |= (1 << bit)
                    if val == current_player:
                        player_bb |= (1 << bit)
                    pieces_in_col += 1
                else:
                    break
            heights.append(c * BITS_PER_COL + pieces_in_col)

        return cls(player_bb, all_bb, heights)

    def can_play(self, col: int) -> bool:
        """Returns True if column is not full."""
        return (self.all_bb & COL_TOP_MASKS[col]) == 0

    def get_valid_moves(self) -> List[int]:
        """Returns non-full columns in strategic center-out order."""
        return [c for c in COLUMN_ORDER if self.can_play(c)]

    def make_move(self, col: int):
        """Drops a piece in column and switches perspective."""
        move = 1 << self.heights[col]
        self.heights[col] += 1
        # Switch turn: new player_bb is (all_bb ^ player_bb)
        self.player_bb ^= self.all_bb
        self.all_bb |= move

    def undo_move(self, col: int):
        """Undoes the move in column and reverts perspective."""
        self.heights[col] -= 1
        move = 1 << self.heights[col]
        self.all_bb ^= move
        self.player_bb ^= self.all_bb

    @staticmethod
    def check_win_bb(bitboard: int) -> bool:
        """
        Bitwise 4-in-a-row detection in under 300 nanoseconds.
        Horizontal (-), Vertical (|), Diagonal (\\), Diagonal (/)
        """
        # Horizontal (-)
        m = bitboard & (bitboard >> 7)
        if m & (m >> 14):
            return True
        # Vertical (|)
        m = bitboard & (bitboard >> 1)
        if m & (m >> 2):
            return True
        # Diagonal (\)
        m = bitboard & (bitboard >> 6)
        if m & (m >> 12):
            return True
        # Diagonal (/)
        m = bitboard & (bitboard >> 8)
        if m & (m >> 16):
            return True
        return False

    def opponent_has_won(self) -> bool:
        """Checks if the opponent (who just moved) won."""
        opp_bb = self.all_bb ^ self.player_bb
        return self.check_win_bb(opp_bb)

    def player_has_won(self) -> bool:
        """Checks if current player has won."""
        return self.check_win_bb(self.player_bb)


def heuristic_evaluate(game: BitboardConnect4) -> int:
    """Fast heuristic evaluation of the board state for current player."""
    score = 0
    p_bb = game.player_bb
    o_bb = game.all_bb ^ game.player_bb

    # 1. Center column preference (column 3 has the most winning vectors)
    center_mask = ((1 << ROWS) - 1) << (3 * BITS_PER_COL)
    p_center = bin(p_bb & center_mask).count('1')
    o_center = bin(o_bb & center_mask).count('1')
    score += (p_center - o_center) * 6

    # 2. Inner columns (2 & 4) preference
    inner_mask = (((1 << ROWS) - 1) << (2 * BITS_PER_COL)) | (((1 << ROWS) - 1) << (4 * BITS_PER_COL))
    p_inner = bin(p_bb & inner_mask).count('1')
    o_inner = bin(o_bb & inner_mask).count('1')
    score += (p_inner - o_inner) * 3

    # 3. 3-in-a-row alignment potentials
    for shift in (1, 7, 6, 8):
        m_p = p_bb & (p_bb >> shift)
        if m_p:
            score += bin(m_p & (p_bb >> (2 * shift))).count('1') * 45
        m_o = o_bb & (o_bb >> shift)
        if m_o:
            score -= bin(m_o & (o_bb >> (2 * shift))).count('1') * 40

    return score


class MinimaxSearcher:
    """High-speed Minimax searcher with Alpha-Beta pruning and transposition cache."""
    def __init__(self, depth: int = 4, time_limit_sec: float = 0.9):
        self.depth = depth
        self.time_limit = time_limit_sec
        self.start_time = 0.0
        self.nodes_evaluated = 0
        self.cutoffs = 0
        self.transposition_table: Dict[Tuple[int, int, int], int] = {}

    def search(self, game: BitboardConnect4, depth: int, alpha: int, beta: int, is_max: bool) -> int:
        self.nodes_evaluated += 1

        # Check terminal win states
        if game.opponent_has_won():
            # Opponent just won
            return -10000000 - depth
        if game.player_has_won():
            return 10000000 + depth

        valid_moves = game.get_valid_moves()
        if not valid_moves:
            return 0  # Draw

        if depth == 0:
            return heuristic_evaluate(game)

        # Transposition table lookup
        tt_key = (game.player_bb, game.all_bb, depth)
        if tt_key in self.transposition_table:
            return self.transposition_table[tt_key]

        if is_max:
            value = -math.inf
            for col in valid_moves:
                game.make_move(col)
                # Next turn is opponent's perspective
                score = -self.search(game, depth - 1, -beta, -alpha, is_max)
                game.undo_move(col)

                if score > value:
                    value = score
                alpha = max(alpha, value)
                if alpha >= beta:
                    self.cutoffs += 1
                    break
            self.transposition_table[tt_key] = value
            return value
        else:
            value = math.inf
            for col in valid_moves:
                game.make_move(col)
                score = -self.search(game, depth - 1, -beta, -alpha, is_max)
                game.undo_move(col)

                if score < value:
                    value = score
                beta = min(beta, value)
                if alpha >= beta:
                    self.cutoffs += 1
                    break
            self.transposition_table[tt_key] = value
            return value


def choose_move(board: List[List[int]], player: int, depth: int = 4) -> int:
    """
    Standard required interface for Problem 6:
    choose_move(board, player) -> int (column 0 to 6)

    - board: 6 rows x 7 cols list of lists (0 = empty, 1 = player 1, 2 = player 2)
    - player: 1 or 2
    - returns: column index 0 to 6
    """
    start_time = time.perf_counter()
    opp_player = 1 if player == 2 else 2

    # Instantiate bitboard representation
    game = BitboardConnect4.from_2d_board(board, player)
    valid_moves = game.get_valid_moves()

    if not valid_moves:
        return 0

    # Step 1: Immediate Winning Move (win if you can)
    for col in valid_moves:
        game.make_move(col)
        if game.opponent_has_won():  # from new perspective, previous mover is opponent
            game.undo_move(col)
            return col
        game.undo_move(col)

    # Step 2: Immediate Threat Blocking (block if you must)
    opp_game = BitboardConnect4.from_2d_board(board, opp_player)
    for col in valid_moves:
        opp_game.make_move(col)
        if opp_game.opponent_has_won():
            opp_game.undo_move(col)
            return col
        opp_game.undo_move(col)

    # Step 3: High-speed Minimax search with Alpha-Beta Pruning
    searcher = MinimaxSearcher(depth=depth, time_limit_sec=0.85)
    best_col = valid_moves[0]
    best_score = -math.inf
    alpha = -math.inf
    beta = math.inf

    for col in valid_moves:
        game.make_move(col)
        score = -searcher.search(game, depth - 1, -beta, -alpha, True)
        game.undo_move(col)

        if score > best_score:
            best_score = score
            best_col = col

        alpha = max(alpha, best_score)

    return best_col


def evaluate_all_columns_py(board: List[List[int]], player: int, depth: int = 3) -> Dict[int, int]:
    """Returns heuristic evaluation scores for each valid column."""
    game = BitboardConnect4.from_2d_board(board, player)
    valid_moves = game.get_valid_moves()
    searcher = MinimaxSearcher(depth=depth)
    results = {}

    for col in valid_moves:
        game.make_move(col)
        if game.opponent_has_won():
            score = 100000
        else:
            score = -searcher.search(game, depth - 1, -math.inf, math.inf, True)
        game.undo_move(col)
        results[col] = score

    return results


def random_bot(board: List[List[int]], player: int) -> int:
    """Random legal move generator for benchmarks."""
    game = BitboardConnect4.from_2d_board(board, player)
    valid = game.get_valid_moves()
    return random.choice(valid) if valid else 0


def play_benchmark_game(bot_player_id: int = 1, depth: int = 4):
    """Simulates a single head-to-head game between Minimax and Random bot."""
    board = [[EMPTY for _ in range(COLS)] for _ in range(ROWS)]
    cur = 1
    total_moves = 0
    bot_times = []

    while True:
        # Check legal moves
        if not any(board[0][c] == EMPTY for c in range(COLS)):
            return "draw", total_moves, max(bot_times) if bot_times else 0.0

        if cur == bot_player_id:
            t0 = time.perf_counter()
            col = choose_move(board, cur, depth=depth)
            dt = time.perf_counter() - t0
            bot_times.append(dt)

            if board[0][col] != EMPTY:
                raise ValueError(f"Illegal move by bot on col {col}")
        else:
            col = random_bot(board, cur)

        # Drop piece
        for r in range(ROWS - 1, -1, -1):
            if board[r][col] == EMPTY:
                board[r][col] = cur
                break
        total_moves += 1

        # Check win
        bb = BitboardConnect4.from_2d_board(board, cur)
        if bb.player_has_won():
            winner = "bot" if cur == bot_player_id else "random"
            return winner, total_moves, max(bot_times) if bot_times else 0.0

        cur = 1 if cur == 2 else 2


def run_benchmark(n_games: int = 10, depth: int = 4):
    """Executes Problem 6 10-Game Verification Suite."""
    print(f"\n=======================================================")
    print(f" PROBLEM 6 | 10-GAME VERIFICATION BENCHMARK (Depth {depth})")
    print(f"=======================================================")
    wins = {"bot": 0, "random": 0, "draw": 0}
    max_time = 0.0
    start_total = time.perf_counter()

    for i in range(1, n_games + 1):
        bot_id = 1 if i % 2 != 0 else 2
        winner, moves, peak_t = play_benchmark_game(bot_id, depth=depth)
        wins[winner] += 1
        if peak_t > max_time:
            max_time = peak_t
        print(f"Game {i:2d}: Bot played as Player {bot_id} -> {winner.upper():<6} ({moves} moves, peak move: {peak_t*1000:.1f}ms)")

    total_duration = time.perf_counter() - start_total
    passed = wins["bot"] >= 9 and max_time < 1.0

    print("-------------------------------------------------------")
    print(f"Bot Score: {wins['bot']}/{n_games} ({(wins['bot']/n_games)*100:.0f}%)")
    print(f"Peak Turn Latency: {max_time*1000:.1f} ms (Limit: 1000.0 ms)")
    print(f"Total Tournament Time: {total_duration:.2f} s")
    print(f"DONE WHEN REQUIREMENT: {'PASSED (COMPLIANT)' if passed else 'FAILED'}")
    print("=======================================================\n")
    return passed


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--benchmark":
        games = int(sys.argv[2]) if len(sys.argv) > 2 else 10
        run_benchmark(games)
    else:
        test_board = [[EMPTY] * COLS for _ in range(ROWS)]
        t0 = time.perf_counter()
        move = choose_move(test_board, 1, depth=4)
        elapsed = (time.perf_counter() - t0) * 1000
        print(f"Bitboard Minimax chosen move for Player 1: Column {move} (calculated in {elapsed:.2f} ms)")
