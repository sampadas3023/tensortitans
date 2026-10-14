/**
 * Connect-4 AI Engine for Problem 6 | Game Bot Arena
 * Implements:
 *  - choose_move(board, player) -> column (0-6)
 *  - Minimax with Alpha-Beta Pruning
 *  - Move Ordering (Center-out: [3, 2, 4, 1, 5, 0, 6])
 *  - Heuristic Board Evaluation (Center bias, 2-in-a-row, 3-in-a-row, threat blocking)
 *  - Real-time Column Valuation & Telemetry
 *  - Automated Head-to-Head Tournament / Benchmark Runner
 */

const ROWS = 6;
const COLS = 7;
const EMPTY = 0;
const WINDOW_LENGTH = 4;

// Strategic column priority order (Center first for max branching cutoffs)
const COLUMN_ORDER = [3, 2, 4, 1, 5, 0, 6];

/**
 * Checks if a column is legal to drop into
 * @param {number[][]} board 
 * @param {number} col 
 * @returns {boolean}
 */
function isValidLocation(board, col) {
    if (col < 0 || col >= COLS) return false;
    return board[0][col] === EMPTY;
}

/**
 * Gets all playable columns in strategic priority order
 * @param {number[][]} board 
 * @returns {number[]}
 */
function getValidLocations(board) {
    const valid = [];
    for (let i = 0; i < COLUMN_ORDER.length; i++) {
        const col = COLUMN_ORDER[i];
        if (isValidLocation(board, col)) {
            valid.push(col);
        }
    }
    return valid;
}

/**
 * Finds the lowest unoccupied row in column col (from row 5 up to 0)
 * @param {number[][]} board 
 * @param {number} col 
 * @returns {number} row index or -1 if full
 */
function getNextOpenRow(board, col) {
    for (let r = ROWS - 1; r >= 0; r--) {
        if (board[r][col] === EMPTY) {
            return r;
        }
    }
    return -1;
}

/**
 * Checks if the given player has won (4 in a row in any direction)
 * Returns the winning 4 cells array if won, or null otherwise.
 * @param {number[][]} board 
 * @param {number} piece (1 or 2)
 * @returns {{row: number, col: number}[] | null}
 */
function checkWinDetailed(board, piece) {
    // 1. Horizontal check
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS - 3; c++) {
            if (board[r][c] === piece &&
                board[r][c + 1] === piece &&
                board[r][c + 2] === piece &&
                board[r][c + 3] === piece) {
                return [
                    { row: r, col: c },
                    { row: r, col: c + 1 },
                    { row: r, col: c + 2 },
                    { row: r, col: c + 3 }
                ];
            }
        }
    }

    // 2. Vertical check
    for (let r = 0; r < ROWS - 3; r++) {
        for (let c = 0; c < COLS; c++) {
            if (board[r][c] === piece &&
                board[r + 1][c] === piece &&
                board[r + 2][c] === piece &&
                board[r + 3][c] === piece) {
                return [
                    { row: r, col: c },
                    { row: r + 1, col: c },
                    { row: r + 2, col: c },
                    { row: r + 3, col: c }
                ];
            }
        }
    }

    // 3. Positive diagonal (up-right: r decreases, c increases)
    for (let r = 3; r < ROWS; r++) {
        for (let c = 0; c < COLS - 3; c++) {
            if (board[r][c] === piece &&
                board[r - 1][c + 1] === piece &&
                board[r - 2][c + 2] === piece &&
                board[r - 3][c + 3] === piece) {
                return [
                    { row: r, col: c },
                    { row: r - 1, col: c + 1 },
                    { row: r - 2, col: c + 2 },
                    { row: r - 3, col: c + 3 }
                ];
            }
        }
    }

    // 4. Negative diagonal (down-right: r increases, c increases)
    for (let r = 0; r < ROWS - 3; r++) {
        for (let c = 0; c < COLS - 3; c++) {
            if (board[r][c] === piece &&
                board[r + 1][c + 1] === piece &&
                board[r + 2][c + 2] === piece &&
                board[r + 3][c + 3] === piece) {
                return [
                    { row: r, col: c },
                    { row: r + 1, col: c + 1 },
                    { row: r + 2, col: c + 2 },
                    { row: r + 3, col: c + 3 }
                ];
            }
        }
    }

    return null;
}

/**
 * Quick boolean check if a player has won
 * @param {number[][]} board 
 * @param {number} piece 
 * @returns {boolean}
 */
function checkWin(board, piece) {
    return checkWinDetailed(board, piece) !== null;
}

/**
 * Evaluates a 4-slot window heuristically
 * @param {number[]} window 
 * @param {number} piece 
 * @param {number} oppPiece 
 * @returns {number}
 */
function evaluateWindow(window, piece, oppPiece) {
    let score = 0;
    let pieceCount = 0;
    let emptyCount = 0;
    let oppCount = 0;

    for (let i = 0; i < 4; i++) {
        const val = window[i];
        if (val === piece) pieceCount++;
        else if (val === EMPTY) emptyCount++;
        else if (val === oppPiece) oppCount++;
    }

    if (pieceCount === 4) {
        score += 100000;
    } else if (pieceCount === 3 && emptyCount === 1) {
        score += 120;
    } else if (pieceCount === 2 && emptyCount === 2) {
        score += 12;
    }

    if (oppCount === 3 && emptyCount === 1) {
        score -= 100;
    } else if (oppCount === 2 && emptyCount === 2) {
        score -= 10;
    }

    return score;
}

/**
 * Evaluates the entire board position for the given piece
 * @param {number[][]} board 
 * @param {number} piece 
 * @returns {number}
 */
function scorePosition(board, piece) {
    let score = 0;
    const oppPiece = piece === 1 ? 2 : 1;

    // 1. Center column control (column 3 has 4 winning lines)
    let centerCount = 0;
    for (let r = 0; r < ROWS; r++) {
        if (board[r][3] === piece) centerCount++;
    }
    score += centerCount * 6;

    // 2. Flanking columns (columns 2 & 4)
    let innerCount = 0;
    for (let r = 0; r < ROWS; r++) {
        if (board[r][2] === piece) innerCount++;
        if (board[r][4] === piece) innerCount++;
    }
    score += innerCount * 3;

    // 3. Horizontal 4-windows
    for (let r = 0; r < ROWS; r++) {
        const row = board[r];
        for (let c = 0; c < COLS - 3; c++) {
            const window = [row[c], row[c + 1], row[c + 2], row[c + 3]];
            score += evaluateWindow(window, piece, oppPiece);
        }
    }

    // 4. Vertical 4-windows
    for (let c = 0; c < COLS; c++) {
        for (let r = 0; r < ROWS - 3; r++) {
            const window = [board[r][c], board[r + 1][c], board[r + 2][c], board[r + 3][c]];
            score += evaluateWindow(window, piece, oppPiece);
        }
    }

    // 5. Positive diagonal 4-windows (up-right)
    for (let r = 3; r < ROWS; r++) {
        for (let c = 0; c < COLS - 3; c++) {
            const window = [board[r][c], board[r - 1][c + 1], board[r - 2][c + 2], board[r - 3][c + 3]];
            score += evaluateWindow(window, piece, oppPiece);
        }
    }

    // 6. Negative diagonal 4-windows (down-right)
    for (let r = 0; r < ROWS - 3; r++) {
        for (let c = 0; c < COLS - 3; c++) {
            const window = [board[r][c], board[r + 1][c + 1], board[r + 2][c + 2], board[r + 3][c + 3]];
            score += evaluateWindow(window, piece, oppPiece);
        }
    }

    return score;
}

/**
 * Checks if board state is terminal (win or full)
 * @param {number[][]} board 
 * @returns {boolean}
 */
function isTerminalNode(board) {
    if (checkWin(board, 1) || checkWin(board, 2)) return true;
    for (let c = 0; c < COLS; c++) {
        if (board[0][c] === EMPTY) return false;
    }
    return true;
}

// Global stats tracker for UI telemetry
let searchStats = {
    nodesEvaluated: 0,
    cutoffs: 0,
    depth: 4,
    durationMs: 0,
    columnScores: {}
};

/**
 * Minimax algorithm with Alpha-Beta pruning
 */
function minimax(board, depth, alpha, beta, maximizingPlayer, piece, oppPiece) {
    searchStats.nodesEvaluated++;
    const validLocations = getValidLocations(board);
    const isTerminal = isTerminalNode(board);

    if (depth === 0 || isTerminal) {
        if (isTerminal) {
            if (checkWin(board, piece)) {
                return { col: null, score: 10000000 + depth }; // Prefer quicker wins
            } else if (checkWin(board, oppPiece)) {
                return { col: null, score: -10000000 - depth }; // Prefer delayed losses
            } else {
                return { col: null, score: 0 }; // Draw
            }
        } else {
            return { col: null, score: scorePosition(board, piece) };
        }
    }

    if (maximizingPlayer) {
        let maxScore = -Infinity;
        let bestCol = validLocations[0];

        for (let i = 0; i < validLocations.length; i++) {
            const col = validLocations[i];
            const row = getNextOpenRow(board, col);

            board[row][col] = piece;
            const result = minimax(board, depth - 1, alpha, beta, false, piece, oppPiece);
            board[row][col] = EMPTY;

            if (result.score > maxScore) {
                maxScore = result.score;
                bestCol = col;
            }
            alpha = Math.max(alpha, maxScore);
            if (alpha >= beta) {
                searchStats.cutoffs++;
                break; // Beta cut-off
            }
        }
        return { col: bestCol, score: maxScore };
    } else {
        let minScore = Infinity;
        let bestCol = validLocations[0];

        for (let i = 0; i < validLocations.length; i++) {
            const col = validLocations[i];
            const row = getNextOpenRow(board, col);

            board[row][col] = oppPiece;
            const result = minimax(board, depth - 1, alpha, beta, true, piece, oppPiece);
            board[row][col] = EMPTY;

            if (result.score < minScore) {
                minScore = result.score;
                bestCol = col;
            }
            beta = Math.min(beta, minScore);
            if (alpha >= beta) {
                searchStats.cutoffs++;
                break; // Alpha cut-off
            }
        }
        return { col: bestCol, score: minScore };
    }
}

/**
 * Analyzes and returns heuristic scores for all valid columns
 * Useful for the UI Heatmap and evaluation bar
 */
function evaluateAllColumns(board, player, depth = 3) {
    const oppPiece = player === 1 ? 2 : 1;
    const scores = {};
    const validLocations = getValidLocations(board);

    validLocations.forEach(col => {
        const row = getNextOpenRow(board, col);
        board[row][col] = player;

        if (checkWin(board, player)) {
            scores[col] = 100000;
        } else {
            const res = minimax(board, depth - 1, -Infinity, Infinity, false, player, oppPiece);
            scores[col] = res.score;
        }
        board[row][col] = EMPTY;
    });

    return scores;
}

/**
 * EXACT REQUIRED FUNCTION SIGNATURE FOR PROBLEM 6:
 * choose_move(board, player) -> column (0-6)
 *
 * Must:
 * - Return a column 0 to 6
 * - Execute well within 1 second
 * - Never pick an illegal or full column
 * - Beat a random-move bot in at least 9 of 10 games
 *
 * @param {number[][]} board 6x7 grid (0=empty, 1=player 1, 2=player 2)
 * @param {number} player 1 or 2
 * @param {object} [options] optional configuration (depth, mode)
 * @returns {number} column index 0 to 6
 */
function choose_move(board, player, options = {}) {
    const startTime = performance.now();
    const depth = options.depth !== undefined ? options.depth : 4;
    const oppPiece = player === 1 ? 2 : 1;

    searchStats = {
        nodesEvaluated: 0,
        cutoffs: 0,
        depth: depth,
        durationMs: 0,
        columnScores: {}
    };

    const validLocations = getValidLocations(board);
    if (validLocations.length === 0) {
        return 0; // Board full
    }

    // Step 1: Immediate Winning Move (win if you can)
    for (let i = 0; i < validLocations.length; i++) {
        const col = validLocations[i];
        const row = getNextOpenRow(board, col);
        board[row][col] = player;
        if (checkWin(board, player)) {
            board[row][col] = EMPTY;
            searchStats.durationMs = performance.now() - startTime;
            searchStats.columnScores[col] = 100000;
            return col;
        }
        board[row][col] = EMPTY;
    }

    // Step 2: Immediate Threat Block (block if you must)
    for (let i = 0; i < validLocations.length; i++) {
        const col = validLocations[i];
        const row = getNextOpenRow(board, col);
        board[row][col] = oppPiece;
        if (checkWin(board, oppPiece)) {
            board[row][col] = EMPTY;
            searchStats.durationMs = performance.now() - startTime;
            searchStats.columnScores[col] = 90000;
            return col;
        }
        board[row][col] = EMPTY;
    }

    // Step 3: Minimax Search with Alpha-Beta Pruning
    const searchResult = minimax(board, depth, -Infinity, Infinity, true, player, oppPiece);
    let chosenCol = searchResult.col;

    // Safety fallback: verify column is valid and legal
    if (chosenCol === null || chosenCol === undefined || !isValidLocation(board, chosenCol)) {
        chosenCol = validLocations[0];
    }

    searchStats.durationMs = performance.now() - startTime;
    return chosenCol;
}

/**
 * Random-move bot for benchmarking and comparison
 */
function randomBot(board, player) {
    const valid = getValidLocations(board);
    if (valid.length === 0) return 0;
    const idx = Math.floor(Math.random() * valid.length);
    return valid[idx];
}

/**
 * Greedy 1-ply Heuristic Bot for comparison
 */
function greedyBot(board, player) {
    return choose_move(board, player, { depth: 1 });
}

// Attach to window object for global / automated testing access
if (typeof window !== 'undefined') {
    window.choose_move = choose_move;
    window.randomBot = randomBot;
    window.greedyBot = greedyBot;
    window.checkWinDetailed = checkWinDetailed;
    window.checkWin = checkWin;
    window.isValidLocation = isValidLocation;
    window.getValidLocations = getValidLocations;
    window.getNextOpenRow = getNextOpenRow;
    window.evaluateAllColumns = evaluateAllColumns;
    window.getSearchStats = () => searchStats;
}
