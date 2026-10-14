"""
Connect-4 AI Bot for Problem 6 | Game Bot Arena
Implements choose_move(board, player) using Minimax with Alpha-Beta Pruning,
Move Ordering, Center-Column Bias, and Heuristic Window Evaluation.

Board format:
- 6 rows x 7 columns
- 0 = empty, 1 = Player 1, 2 = Player 2
- Row 0 is top, Row 5 is bottom (pieces drop to the lowest available row)
"""

import math
import random
import time

ROWS = 6
COLS = 7
EMPTY = 0
WINDOW_LENGTH = 4

# Move ordering: center column first, then adjacent, then edges
COLUMN_ORDER = [3, 2, 4, 1, 5, 0, 6]


def is_valid_location(board, col):
    """Returns True if column col is legal (not full)."""
    if col < 0 or col >= COLS:
        return False
    return board[0][col] == EMPTY


def get_valid_locations(board):
    """Returns list of all non-full columns, ordered by strategic priority."""
    valid_locations = []
    for col in COLUMN_ORDER:
        if is_valid_location(board, col):
            valid_locations.append(col)
    return valid_locations


def get_next_open_row(board, col):
    """Finds lowest empty row in column col (from row 5 up to 0)."""
    for r in range(ROWS - 1, -1, -1):
        if board[r][col] == EMPTY:
            return r
    return -1


def drop_piece(board, row, col, piece):
    """Places piece on board."""
    board[row][col] = piece


def check_win(board, piece):
    """Checks if piece has 4 in a row in any direction."""
    # Horizontal check
    for r in range(ROWS):
        for c in range(COLS - 3):
            if (board[r][c] == piece and board[r][c+1] == piece and
                    board[r][c+2] == piece and board[r][c+3] == piece):
                return True

    # Vertical check
    for r in range(ROWS - 3):
        for c in range(COLS):
            if (board[r][c] == piece and board[r+1][c] == piece and
                    board[r+2][c] == piece and board[r+3][c] == piece):
                return True

    # Positive diagonal (up-right)
    for r in range(3, ROWS):
        for c in range(COLS - 3):
            if (board[r][c] == piece and board[r-1][c+1] == piece and
                    board[r-2][c+2] == piece and board[r-3][c+3] == piece):
                return True

    # Negative diagonal (down-right)
    for r in range(ROWS - 3):
        for c in range(COLS - 3):
            if (board[r][c] == piece and board[r+1][c+1] == piece and
                    board[r+2][c+2] == piece and board[r+3][c+3] == piece):
                return True

    return False


def evaluate_window(window, piece, opp_piece):
    """Scores a 4-cell window."""
    score = 0
    piece_count = window.count(piece)
    empty_count = window.count(EMPTY)
    opp_count = window.count(opp_piece)

    if piece_count == 4:
        score += 100000
    elif piece_count == 3 and empty_count == 1:
        score += 100
    elif piece_count == 2 and empty_count == 2:
        score += 10

    if opp_count == 3 and empty_count == 1:
        score -= 90
    elif opp_count == 2 and empty_count == 2:
        score -= 8

    return score


def score_position(board, piece):
    """Evaluates the heuristic score of the entire board for piece."""
    score = 0
    opp_piece = 1 if piece == 2 else 2

    # Center column priority (4 winning lines pass through center column)
    center_col = [board[r][COLS // 2] for r in range(ROWS)]
    center_count = center_col.count(piece)
    score += center_count * 6

    # Inner columns (2 and 4)
    for c in [2, 4]:
        col_cells = [board[r][c] for r in range(ROWS)]
        score += col_cells.count(piece) * 3

    # Horizontal windows
    for r in range(ROWS):
        row_array = board[r]
        for c in range(COLS - 3):
            window = row_array[c:c+WINDOW_LENGTH]
            score += evaluate_window(window, piece, opp_piece)

    # Vertical windows
    for c in range(COLS):
        col_array = [board[r][c] for r in range(ROWS)]
        for r in range(ROWS - 3):
            window = col_array[r:r+WINDOW_LENGTH]
            score += evaluate_window(window, piece, opp_piece)

    # Positive diagonal
    for r in range(3, ROWS):
        for c in range(COLS - 3):
            window = [board[r-i][c+i] for i in range(WINDOW_LENGTH)]
            score += evaluate_window(window, piece, opp_piece)

    # Negative diagonal
    for r in range(ROWS - 3):
        for c in range(COLS - 3):
            window = [board[r+i][c+i] for i in range(WINDOW_LENGTH)]
            score += evaluate_window(window, piece, opp_piece)

    return score


def is_terminal_node(board):
    """Returns True if win or draw (board full)."""
    return (check_win(board, 1) or
            check_win(board, 2) or
            len(get_valid_locations(board)) == 0)


def minimax(board, depth, alpha, beta, maximizing_player, piece, opp_piece):
    """Minimax search algorithm with Alpha-Beta pruning."""
    valid_locations = get_valid_locations(board)
    is_terminal = is_terminal_node(board)

    if depth == 0 or is_terminal:
        if is_terminal:
            if check_win(board, piece):
                return None, 10000000 + depth  # Prefer faster wins
            elif check_win(board, opp_piece):
                return None, -10000000 - depth  # Prefer slower losses
            else:
                return None, 0  # Draw
        else:
            return None, score_position(board, piece)

    if maximizing_player:
        value = -math.inf
        best_col = random.choice(valid_locations) if valid_locations else 0
        for col in valid_locations:
            row = get_next_open_row(board, col)
            board[row][col] = piece
            _, new_score = minimax(board, depth - 1, alpha, beta, False, piece, opp_piece)
            board[row][col] = EMPTY

            if new_score > value:
                value = new_score
                best_col = col
            alpha = max(alpha, value)
            if alpha >= beta:
                break  # Beta cut-off
        return best_col, value
    else:
        value = math.inf
        best_col = random.choice(valid_locations) if valid_locations else 0
        for col in valid_locations:
            row = get_next_open_row(board, col)
            board[row][col] = opp_piece
            _, new_score = minimax(board, depth - 1, alpha, beta, True, piece, opp_piece)
            board[row][col] = EMPTY

            if new_score < value:
                value = new_score
                best_col = col
            beta = min(beta, value)
            if alpha >= beta:
                break  # Alpha cut-off
        return best_col, value


def choose_move(board, player, depth=4):
    """
    Required interface function for Problem 6:
    choose_move(board, player) -> int (column 0 to 6)

    - board: 6x7 list of lists (0=empty, 1=player 1, 2=player 2)
    - player: 1 or 2
    - returns: integer column 0-6
    """
    opp_piece = 1 if player == 2 else 2
    valid_locations = get_valid_locations(board)

    if not valid_locations:
        return 0

    # 1. Immediate Win: if any move wins on this turn, take it!
    for col in valid_locations:
        row = get_next_open_row(board, col)
        board[row][col] = player
        if check_win(board, player):
            board[row][col] = EMPTY
            return col
        board[row][col] = EMPTY

    # 2. Immediate Block: if opponent can win next turn, block them!
    for col in valid_locations:
        row = get_next_open_row(board, col)
        board[row][col] = opp_piece
        if check_win(board, opp_piece):
            board[row][col] = EMPTY
            return col
        board[row][col] = EMPTY

    # 3. Minimax with Alpha-Beta Pruning
    col, _ = minimax(board, depth, -math.inf, math.inf, True, player, opp_piece)

    # Fallback safety check: ensure chosen column is valid
    if col is not None and is_valid_location(board, col):
        return col

    return valid_locations[0]


if __name__ == "__main__":
    test_board = [[0] * 7 for _ in range(6)]
    move = choose_move(test_board, 1)
    print(f"Initial move for Player 1: column {move}")
