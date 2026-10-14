/**
 * Connect-4 Game Arena Controller & UI Engine
 * Orchestrates:
 *  - High-precision rendering & 3D realistic board animations
 *  - Web Audio sound synthesizer (drop, hover, victory, join, reaction, buzzer)
 *  - AI Telemetry & Problem 6 benchmark suites
 *  - Chess.com-style Online Multiplayer ("Invite a Friend" with shareable rooms & live sync)
 *  - Quick reaction emotes & victory confetti celebrations
 */

class Connect4Game {
    constructor() {
        this.ROWS = 6;
        this.COLS = 7;
        this.board = this.createEmptyBoard();
        this.currentPlayer = 1; // 1 or 2
        this.isGameOver = false;
        this.winner = null; // 1, 2, or 'draw'
        this.winningCells = [];
        this.moveHistory = [];
        this.isAiThinking = false;
        this.soundEnabled = true;

        // Player configurations
        this.playerTypes = {
            1: 'human', // 'human', 'minimax', 'random', 'greedy'
            2: 'minimax'
        };

        this.botDepths = {
            1: 4,
            2: 4
        };

        // Scoreboard
        this.scores = {
            1: 0,
            2: 0,
            draws: 0
        };

        // Arena & Tournament state
        this.currentMode = 'pve'; // 'pve', 'bvb', 'online'
        this.botSpeedMs = 280;
        this.isDuelRunning = false;
        this.duelTimer = null;

        // Online Multiplayer State (Chess.com Style)
        this.onlineRoomId = null;
        this.onlineToken = null;
        this.onlinePlayerNum = 0; // 1 or 2
        this.isOnlineMatch = false;
        this.onlinePollingActive = false;
        this.onlineVersion = 0;
        this.onlineOpponentJoined = false;
        this.onlineOpponentName = '';
        this.seenReactionIds = new Set();

        // Web Audio Context setup
        this.audioCtx = null;

        // Bind DOM elements & events
        this.initDOM();
        this.initAudio();
        this.initEventListeners();
        this.renderBoard();
        this.updateUI();

        // Auto-check for ?room=ROOM_ID in URL query parameters
        this.checkUrlRoomParam();
    }

    createEmptyBoard() {
        const board = [];
        for (let r = 0; r < this.ROWS; r++) {
            board.push(new Array(this.COLS).fill(0));
        }
        return board;
    }

    initDOM() {
        this.boardElem = document.getElementById('connect4-board');
        this.hoverBarElem = document.getElementById('hover-indicator-bar');
        this.statusMsgElem = document.getElementById('status-message');
        this.turnPillElem = document.getElementById('turn-pill');
        this.moveCountElem = document.getElementById('move-counter');
        this.p1CardElem = document.getElementById('player1-card');
        this.p2CardElem = document.getElementById('player2-card');
        this.p1ScoreElem = document.getElementById('p1-score');
        this.p2ScoreElem = document.getElementById('p2-score');
        this.undoBtn = document.getElementById('undo-btn');
        this.newGameBtn = document.getElementById('new-game-btn');
        this.botHintBtn = document.getElementById('bot-hint-btn');
        this.soundToggleBtn = document.getElementById('sound-toggle-btn');

        // Telemetry DOM
        this.statTimeElem = document.getElementById('stat-time');
        this.statNodesElem = document.getElementById('stat-nodes');
        this.statCutoffsElem = document.getElementById('stat-cutoffs');
        this.statDepthElem = document.getElementById('stat-depth');
        this.valuationChartElem = document.getElementById('valuation-chart');

        // Benchmark DOM
        this.runBenchmarkBtn = document.getElementById('run-benchmark-btn');
        this.benchmarkProgressFill = document.getElementById('benchmark-progress-fill');
        this.benchmarkProgressText = document.getElementById('benchmark-progress-text');
        this.benchmarkTableBody = document.getElementById('benchmark-table-body');
        this.benchmarkSummaryElem = document.getElementById('benchmark-summary-box');

        // Modal DOM (Code)
        this.codeModal = document.getElementById('code-modal');
        this.openCodeModalBtn = document.getElementById('open-code-modal-btn');
        this.closeCodeModalBtn = document.getElementById('close-code-modal-btn');
        this.copyJsBtn = document.getElementById('copy-js-code-btn');
        this.copyPyBtn = document.getElementById('copy-py-code-btn');

        // Modal DOM (Invite Friend & Online Multiplayer)
        this.inviteModal = document.getElementById('invite-friend-modal');
        this.openInviteModalBtn = document.getElementById('open-invite-modal-btn');
        this.closeInviteModalBtn = document.getElementById('close-invite-modal-btn');
        this.createRoomBtn = document.getElementById('create-room-btn');
        this.submitJoinRoomBtn = document.getElementById('submit-join-room-btn');
        this.inviteLinkBox = document.getElementById('invite-link-box');
        this.shareableLinkInput = document.getElementById('shareable-link-input');
        this.copyInviteLinkBtn = document.getElementById('copy-invite-link-btn');
        this.copyJustCodeBtn = document.getElementById('copy-just-code-btn');
        this.shareWhatsappBtn = document.getElementById('share-whatsapp-btn');
        this.justCodeDisplay = document.getElementById('just-code-display');

        // Online HUD & Reactions DOM
        this.onlineMatchHud = document.getElementById('online-match-hud');
        this.onlineRoomIdDisplay = document.getElementById('online-room-id-display');
        this.onlineOpponentStatus = document.getElementById('online-opponent-status');
        this.copyRoomLinkBtn = document.getElementById('copy-room-link-btn');
        this.leaveRoomBtn = document.getElementById('leave-room-btn');
        this.floatingEmotesContainer = document.getElementById('floating-emotes-container');
    }

    initAudio() {
        const enableAudio = () => {
            if (!this.audioCtx) {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                if (AudioContext) {
                    this.audioCtx = new AudioContext();
                }
            }
            window.removeEventListener('click', enableAudio);
            window.removeEventListener('keydown', enableAudio);
        };
        window.addEventListener('click', enableAudio, { once: true });
        window.addEventListener('keydown', enableAudio, { once: true });
    }

    playSound(type) {
        if (!this.soundEnabled || !this.audioCtx) return;
        try {
            if (this.audioCtx.state === 'suspended') {
                this.audioCtx.resume();
            }

            const now = this.audioCtx.currentTime;

            if (type === 'drop') {
                // Physical drop punch with sub-bass resonance
                const osc = this.audioCtx.createOscillator();
                const gain = this.audioCtx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(260, now);
                osc.frequency.exponentialRampToValueAtTime(70, now + 0.14);
                gain.gain.setValueAtTime(0.45, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
                osc.connect(gain);
                gain.connect(this.audioCtx.destination);
                osc.start(now);
                osc.stop(now + 0.15);
            } else if (type === 'hover') {
                // Subtle high-tech tick
                const osc = this.audioCtx.createOscillator();
                const gain = this.audioCtx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(800, now);
                gain.gain.setValueAtTime(0.03, now);
                gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);
                osc.connect(gain);
                gain.connect(this.audioCtx.destination);
                osc.start(now);
                osc.stop(now + 0.04);
            } else if (type === 'win') {
                // Triumphant victory arpeggio chord
                const notes = [440, 554.37, 659.25, 880];
                notes.forEach((freq, idx) => {
                    const osc = this.audioCtx.createOscillator();
                    const gain = this.audioCtx.createGain();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(freq, now + idx * 0.08);
                    gain.gain.setValueAtTime(0, now + idx * 0.08);
                    gain.gain.linearRampToValueAtTime(0.25, now + idx * 0.08 + 0.03);
                    gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 0.45);
                    osc.connect(gain);
                    gain.connect(this.audioCtx.destination);
                    osc.start(now + idx * 0.08);
                    osc.stop(now + idx * 0.08 + 0.5);
                });
            } else if (type === 'join') {
                // Cheerful chime when online friend joins room
                const notes = [523.25, 659.25, 783.99, 1046.50];
                notes.forEach((freq, idx) => {
                    const osc = this.audioCtx.createOscillator();
                    const gain = this.audioCtx.createGain();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(freq, now + idx * 0.08);
                    gain.gain.setValueAtTime(0.01, now + idx * 0.08);
                    gain.gain.linearRampToValueAtTime(0.2, now + idx * 0.08 + 0.02);
                    gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 0.35);
                    osc.connect(gain);
                    gain.connect(this.audioCtx.destination);
                    osc.start(now + idx * 0.08);
                    osc.stop(now + idx * 0.08 + 0.4);
                });
            } else if (type === 'reaction') {
                // Bubble pop for quick reactions
                const osc = this.audioCtx.createOscillator();
                const gain = this.audioCtx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(440, now);
                osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);
                gain.gain.setValueAtTime(0.25, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
                osc.connect(gain);
                gain.connect(this.audioCtx.destination);
                osc.start(now);
                osc.stop(now + 0.09);
            } else if (type === 'error') {
                // Buzz tone for illegal action
                const osc = this.audioCtx.createOscillator();
                const gain = this.audioCtx.createGain();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(140, now);
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
                osc.connect(gain);
                gain.connect(this.audioCtx.destination);
                osc.start(now);
                osc.stop(now + 0.12);
            }
        } catch (e) {
            console.warn('Audio playback error', e);
        }
    }

    initEventListeners() {
        // Mode buttons
        document.querySelectorAll('.nav-mode-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const mode = btn.dataset.mode;
                if (mode === 'online') {
                    this.openInviteModal('create');
                } else {
                    this.setMode(mode);
                }
            });
        });

        // Player selectors
        const p1Select = document.getElementById('p1-type-select');
        if (p1Select) {
            p1Select.addEventListener('change', (e) => {
                this.playerTypes[1] = e.target.value;
                this.updateUI();
                this.checkNextTurn();
            });
        }

        const p2Select = document.getElementById('p2-type-select');
        if (p2Select) {
            p2Select.addEventListener('change', (e) => {
                this.playerTypes[2] = e.target.value;
                this.updateUI();
                this.checkNextTurn();
            });
        }

        // Depth selector
        const p2DepthSelect = document.getElementById('p2-depth-select');
        if (p2DepthSelect) {
            p2DepthSelect.addEventListener('change', (e) => {
                this.botDepths[2] = parseInt(e.target.value, 10);
                this.updateTelemetryVisuals();
            });
        }

        // Sound toggle
        if (this.soundToggleBtn) {
            this.soundToggleBtn.addEventListener('click', () => {
                this.soundEnabled = !this.soundEnabled;
                this.soundToggleBtn.innerHTML = this.soundEnabled 
                    ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>`
                    : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>`;
            });
        }

        // Board buttons
        this.newGameBtn.addEventListener('click', () => {
            if (this.isOnlineMatch) {
                this.requestOnlineRematch();
            } else {
                this.resetGame();
            }
        });
        this.undoBtn.addEventListener('click', () => this.undoMove());
        this.botHintBtn.addEventListener('click', () => this.forceBotMove());

        // Code modal triggers
        if (this.openCodeModalBtn) this.openCodeModalBtn.addEventListener('click', () => this.openCodeModal());
        if (this.closeCodeModalBtn) this.closeCodeModalBtn.addEventListener('click', () => this.closeCodeModal());
        if (this.codeModal) {
            this.codeModal.addEventListener('click', (e) => {
                if (e.target === this.codeModal) this.closeCodeModal();
            });
        }

        // Invite Friend Modal triggers
        if (this.openInviteModalBtn) this.openInviteModalBtn.addEventListener('click', () => this.openInviteModal('create'));
        if (this.closeInviteModalBtn) this.closeInviteModalBtn.addEventListener('click', () => this.closeInviteModal());
        if (this.inviteModal) {
            this.inviteModal.addEventListener('click', (e) => {
                if (e.target === this.inviteModal) this.closeInviteModal();
            });
        }

        // Modal Tab Switching
        document.querySelectorAll('.modal-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const parentModal = btn.closest('.modal-content');
                if (!parentModal) return;
                parentModal.querySelectorAll('.modal-tab-btn').forEach(b => b.classList.remove('active'));
                parentModal.querySelectorAll('.code-tab-content').forEach(c => c.style.display = 'none');
                btn.classList.add('active');
                const target = document.getElementById(btn.dataset.target);
                if (target) target.style.display = 'block';
            });
        });

        // Copy buttons
        if (this.copyJsBtn) {
            this.copyJsBtn.addEventListener('click', () => {
                const code = document.getElementById('js-code-block').innerText;
                navigator.clipboard.writeText(code).then(() => {
                    this.copyJsBtn.innerText = 'Copied!';
                    setTimeout(() => this.copyJsBtn.innerText = 'Copy Code', 1500);
                });
            });
        }
        if (this.copyPyBtn) {
            this.copyPyBtn.addEventListener('click', () => {
                const code = document.getElementById('py-code-block').innerText;
                navigator.clipboard.writeText(code).then(() => {
                    this.copyPyBtn.innerText = 'Copied!';
                    setTimeout(() => this.copyPyBtn.innerText = 'Copy Code', 1500);
                });
            });
        }

        // Online Room Actions
        if (this.createRoomBtn) this.createRoomBtn.addEventListener('click', () => this.createOnlineRoom());
        if (this.submitJoinRoomBtn) this.submitJoinRoomBtn.addEventListener('click', () => this.submitJoinOnlineRoom());
        if (this.copyInviteLinkBtn) this.copyInviteLinkBtn.addEventListener('click', () => this.copyInviteLink());
        if (this.copyJustCodeBtn) this.copyJustCodeBtn.addEventListener('click', () => this.copyGameCodeOnly());
        if (this.copyRoomLinkBtn) this.copyRoomLinkBtn.addEventListener('click', () => this.copyInviteLink());
        if (this.leaveRoomBtn) this.leaveRoomBtn.addEventListener('click', () => this.leaveOnlineRoom());

        // Quick Reaction Emotes buttons
        document.querySelectorAll('.reaction-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const emote = btn.dataset.emote;
                this.sendReaction(emote);
            });
        });

        // Benchmark Runner Trigger
        if (this.runBenchmarkBtn) {
            this.runBenchmarkBtn.addEventListener('click', () => this.runProblem6Benchmark(10));
        }

        // Bot Speed selector
        const botSpeedSelect = document.getElementById('bot-speed-select');
        if (botSpeedSelect) {
            botSpeedSelect.addEventListener('change', (e) => {
                this.botSpeedMs = parseInt(e.target.value, 10);
            });
        }
    }

    checkUrlRoomParam() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const room = urlParams.get('room');
            if (room) {
                this.openInviteModal('join', room.toUpperCase());
            }
        } catch (e) {}
    }

    setMode(mode) {
        if (this.isOnlineMatch && mode !== 'online') {
            this.leaveOnlineRoom();
        }

        this.currentMode = mode;
        document.querySelectorAll('.nav-mode-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.mode === mode);
        });

        const p1Select = document.getElementById('p1-type-select');
        const p2Select = document.getElementById('p2-type-select');

        if (mode === 'pve') {
            this.playerTypes[1] = 'human';
            this.playerTypes[2] = 'minimax';
            if (p1Select) p1Select.value = 'human';
            if (p2Select) p2Select.value = 'minimax';
        } else if (mode === 'bvb') {
            this.playerTypes[1] = 'random';
            this.playerTypes[2] = 'minimax';
            if (p1Select) p1Select.value = 'random';
            if (p2Select) p2Select.value = 'minimax';
        }

        this.resetGame();
    }

    renderBoard() {
        // Clear slots but keep corner screws
        const existingSlots = this.boardElem.querySelectorAll('.board-column');
        existingSlots.forEach(s => s.remove());
        this.hoverBarElem.innerHTML = '';

        // Create hover indicator slots
        for (let c = 0; c < this.COLS; c++) {
            const hoverSlot = document.createElement('div');
            hoverSlot.className = 'hover-slot';
            hoverSlot.id = `hover-slot-${c}`;
            hoverSlot.innerHTML = `<span class="drop-arrow">▼</span>`;
            this.hoverBarElem.appendChild(hoverSlot);
        }

        // Create board columns and slots
        for (let c = 0; c < this.COLS; c++) {
            const colElem = document.createElement('div');
            colElem.className = 'board-column';
            colElem.dataset.col = c;

            // Hover effects
            colElem.addEventListener('mouseenter', () => this.onColumnHover(c, true));
            colElem.addEventListener('mouseleave', () => this.onColumnHover(c, false));
            colElem.addEventListener('click', () => this.handleColumnClick(c));

            for (let r = 0; r < this.ROWS; r++) {
                const cellElem = document.createElement('div');
                cellElem.className = 'board-cell';
                cellElem.dataset.row = r;
                cellElem.dataset.col = c;
                cellElem.id = `cell-${r}-${c}`;
                colElem.appendChild(cellElem);
            }
            this.boardElem.appendChild(colElem);
        }
    }

    onColumnHover(col, isHovered) {
        if (this.isGameOver || this.isAiThinking) return;
        const hoverSlot = document.getElementById(`hover-slot-${col}`);
        if (!hoverSlot) return;

        if (isHovered && isValidLocation(this.board, col)) {
            hoverSlot.classList.add('visible');
            const arrow = hoverSlot.querySelector('.drop-arrow');
            arrow.className = `drop-arrow ${this.currentPlayer === 1 ? 'red-arrow' : 'cyan-arrow'}`;
            this.playSound('hover');
        } else {
            hoverSlot.classList.remove('visible');
        }
    }

    handleColumnClick(col) {
        if (this.isGameOver) return;

        // Online Multiplayer Move Handling
        if (this.isOnlineMatch) {
            if (this.currentPlayer !== this.onlinePlayerNum) {
                this.playSound('error');
                this.statusMsgElem.innerText = `⏳ Waiting for opponent's turn...`;
                return;
            }
            this.sendOnlineMove(col);
            return;
        }

        // Offline bot check
        if (this.isAiThinking || this.playerTypes[this.currentPlayer] !== 'human') {
            return;
        }

        this.playMove(col);
    }

    playMove(col) {
        if (!isValidLocation(this.board, col)) {
            this.playSound('error');
            return false;
        }

        const row = getNextOpenRow(this.board, col);
        const player = this.currentPlayer;

        // Save move in history for undo
        this.moveHistory.push({
            board: this.board.map(r => [...r]),
            player: player,
            row: row,
            col: col
        });

        // Update internal board
        this.board[row][col] = player;

        // Render animated disc drop
        this.renderDiscDrop(row, col, player);
        this.playSound('drop');

        // Check for Win
        const winResult = checkWinDetailed(this.board, player);
        if (winResult) {
            this.handleGameOver(player, winResult);
            return true;
        }

        // Check for Draw (board full)
        if (getValidLocations(this.board).length === 0) {
            this.handleGameOver('draw');
            return true;
        }

        // Switch Turn
        this.currentPlayer = player === 1 ? 2 : 1;
        this.updateUI();
        this.updateTelemetryVisuals();

        // Check if next player is an offline bot
        if (!this.isOnlineMatch) {
            this.checkNextTurn();
        }
        return true;
    }

    renderDiscDrop(row, col, player) {
        const cell = document.getElementById(`cell-${row}-${col}`);
        if (!cell) return;

        cell.innerHTML = '';
        const disc = document.createElement('div');
        disc.className = `disc player-${player} dropping`;

        // Calculate drop distance based on row
        const dropPx = -((row + 1) * 80 + 40);
        disc.style.setProperty('--drop-distance', `${dropPx}px`);

        cell.appendChild(disc);

        if (this.board[0][col] !== 0) {
            const colElem = document.querySelector(`.board-column[data-col="${col}"]`);
            if (colElem) colElem.classList.add('full');
        }
    }

    checkNextTurn() {
        if (this.isGameOver || this.isOnlineMatch) return;

        const pType = this.playerTypes[this.currentPlayer];
        if (pType !== 'human') {
            this.isAiThinking = true;
            this.updateUI();

            const delay = this.currentMode === 'bvb' ? this.botSpeedMs : 250;

            setTimeout(async () => {
                if (this.isGameOver) {
                    this.isAiThinking = false;
                    return;
                }

                let chosenCol;
                const depth = this.botDepths[this.currentPlayer] || 4;

                if (pType === 'random') {
                    chosenCol = randomBot(this.board, this.currentPlayer);
                } else if (pType === 'greedy') {
                    chosenCol = greedyBot(this.board, this.currentPlayer);
                } else {
                    let usedBackend = false;
                    try {
                        const controller = new AbortController();
                        const timeoutId = setTimeout(() => controller.abort(), 800);
                        const res = await fetch('/api/choose_move', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                board: this.board,
                                player: this.currentPlayer,
                                depth: depth
                            }),
                            signal: controller.signal
                        });
                        clearTimeout(timeoutId);
                        if (res.ok) {
                            const data = await res.json();
                            if (data && typeof data.move === 'number') {
                                chosenCol = data.move;
                                usedBackend = true;
                                if (this.statTimeElem) {
                                    this.statTimeElem.innerText = `${data.duration_ms} ms (Bitboard)`;
                                }
                            }
                        }
                    } catch (e) {}

                    if (!usedBackend) {
                        chosenCol = choose_move(this.board, this.currentPlayer, { depth: depth });
                    }
                }

                this.isAiThinking = false;
                this.playMove(chosenCol);
            }, delay);
        }
    }

    handleGameOver(winner, winCells = []) {
        this.isGameOver = true;
        this.winner = winner;
        this.winningCells = winCells;

        if (winner === 'draw') {
            this.scores.draws++;
            this.statusMsgElem.innerText = "Stalemate! Game ended in a Draw.";
            this.statusMsgElem.style.color = "var(--accent-gold)";
        } else {
            this.scores[winner]++;
            const winnerName = winner === 1 ? "Player 1" : "Player 2";
            this.statusMsgElem.innerText = `Connect-4! ${winnerName} Wins!`;
            this.statusMsgElem.style.color = winner === 1 ? "var(--p1-base)" : "var(--p2-base)";

            // Highlight the winning 4 discs
            winCells.forEach(cell => {
                const discElem = document.querySelector(`#cell-${cell.row}-${cell.col} .disc`);
                if (discElem) {
                    discElem.classList.add('winning-cell');
                }
            });

            this.launchConfetti();
            this.playSound('win');
        }

        this.updateUI();
    }

    launchConfetti() {
        const canvas = document.getElementById('confetti-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4'];
        const particles = [];
        for (let i = 0; i < 90; i++) {
            particles.push({
                x: window.innerWidth / 2,
                y: window.innerHeight / 2 - 80,
                vx: (Math.random() - 0.5) * 18,
                vy: (Math.random() - 0.75) * 18,
                size: Math.random() * 8 + 5,
                color: colors[Math.floor(Math.random() * colors.length)],
                rotation: Math.random() * 360,
                vRot: (Math.random() - 0.5) * 10,
                opacity: 1
            });
        }

        const startTime = performance.now();
        const render = (now) => {
            const elapsed = now - startTime;
            if (elapsed > 2500) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                return;
            }

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach(p => {
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.38;
                p.rotation += p.vRot;
                p.opacity = Math.max(0, 1 - (elapsed / 2500));

                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate((p.rotation * Math.PI) / 180);
                ctx.fillStyle = p.color;
                ctx.globalAlpha = p.opacity;
                ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
                ctx.restore();
            });

            requestAnimationFrame(render);
        };

        requestAnimationFrame(render);
    }

    updateUI() {
        if (this.p1ScoreElem) this.p1ScoreElem.innerText = this.scores[1];
        if (this.p2ScoreElem) this.p2ScoreElem.innerText = this.scores[2];

        if (this.p1CardElem && this.p2CardElem) {
            this.p1CardElem.classList.toggle('p1-active', this.currentPlayer === 1 && !this.isGameOver);
            this.p2CardElem.classList.toggle('p2-active', this.currentPlayer === 2 && !this.isGameOver);
        }

        if (this.moveCountElem) {
            this.moveCountElem.innerText = `Move: #${this.moveHistory.length + 1}`;
        }

        if (!this.isGameOver) {
            if (this.turnPillElem) {
                this.turnPillElem.className = `turn-pill ${this.currentPlayer === 1 ? 'p1' : 'p2'}`;
                this.turnPillElem.innerText = this.currentPlayer === 1 ? 'Player 1' : 'Player 2';
            }

            if (this.isOnlineMatch) {
                const isYourTurn = this.currentPlayer === this.onlinePlayerNum;
                this.statusMsgElem.innerText = isYourTurn ? "⚡ Your Turn: Click a column to drop disc" : "⏳ Opponent's Turn: Waiting for move...";
                this.statusMsgElem.style.color = isYourTurn ? "var(--text-primary)" : "var(--p2-base)";
            } else if (this.isAiThinking) {
                this.statusMsgElem.innerText = `🤖 Bot thinking (evaluating minimax tree)...`;
                this.statusMsgElem.style.color = 'var(--p2-base)';
            } else if (this.playerTypes[this.currentPlayer] === 'human') {
                this.statusMsgElem.innerText = `Your Turn: Select a column to drop disc`;
                this.statusMsgElem.style.color = 'var(--text-primary)';
            } else {
                this.statusMsgElem.innerText = `Waiting for bot...`;
            }
        }

        if (this.undoBtn) {
            this.undoBtn.disabled = this.moveHistory.length === 0 || this.isAiThinking || this.isOnlineMatch;
        }
    }

    updateTelemetryVisuals() {
        const stats = window.getSearchStats ? window.getSearchStats() : null;

        if (stats && this.statTimeElem && !this.isOnlineMatch) {
            this.statTimeElem.innerText = `${stats.durationMs.toFixed(1)} ms`;
            this.statNodesElem.innerText = stats.nodesEvaluated.toLocaleString();
            this.statCutoffsElem.innerText = stats.cutoffs.toLocaleString();
            this.statDepthElem.innerText = `Depth ${stats.depth}`;
        }

        this.renderValuationHeatmap();
    }

    renderValuationHeatmap() {
        if (!this.valuationChartElem) return;

        const colScores = evaluateAllColumns(this.board, this.currentPlayer, 3);
        const validCols = getValidLocations(this.board);

        this.valuationChartElem.innerHTML = '';

        let maxScore = -Infinity;
        let minScore = Infinity;
        validCols.forEach(c => {
            const s = colScores[c] || 0;
            if (s > maxScore) maxScore = s;
            if (s < minScore) minScore = s;
        });

        for (let c = 0; c < this.COLS; c++) {
            const wrap = document.createElement('div');
            wrap.className = 'valuation-bar-wrap';

            const bar = document.createElement('div');
            bar.className = 'valuation-bar';

            if (validCols.includes(c)) {
                const score = colScores[c] || 0;
                let percent = 20;
                if (maxScore > minScore) {
                    percent = Math.max(15, Math.min(100, Math.round(((score - minScore) / (maxScore - minScore)) * 90 + 10)));
                } else {
                    percent = 50;
                }
                bar.style.height = `${percent}%`;

                if (score === maxScore) {
                    bar.classList.add('best-col');
                }
                bar.title = `Col ${c}: Score ${score}`;
            } else {
                bar.style.height = '2%';
                bar.style.opacity = '0.2';
                bar.title = `Col ${c}: Full`;
            }

            const label = document.createElement('span');
            label.className = `valuation-col-label ${validCols.includes(c) ? 'active' : ''}`;
            label.innerText = `C${c}`;

            wrap.appendChild(bar);
            wrap.appendChild(label);
            this.valuationChartElem.appendChild(wrap);
        }
    }

    undoMove() {
        if (this.moveHistory.length === 0 || this.isAiThinking || this.isOnlineMatch) return;

        const isBotPlaying = this.playerTypes[1] !== this.playerTypes[2];
        const movesToUndo = (isBotPlaying && this.moveHistory.length >= 2) ? 2 : 1;

        for (let i = 0; i < movesToUndo; i++) {
            const lastMove = this.moveHistory.pop();
            if (lastMove) {
                this.board[lastMove.row][lastMove.col] = 0;
                const cell = document.getElementById(`cell-${lastMove.row}-${lastMove.col}`);
                if (cell) cell.innerHTML = '';

                const colElem = document.querySelector(`.board-column[data-col="${lastMove.col}"]`);
                if (colElem) colElem.classList.remove('full');
            }
        }

        this.currentPlayer = 1;
        this.isGameOver = false;
        this.winner = null;
        this.winningCells = [];

        document.querySelectorAll('.disc.winning-cell').forEach(d => d.classList.remove('winning-cell'));

        this.updateUI();
        this.updateTelemetryVisuals();
    }

    forceBotMove() {
        if (this.isGameOver || this.isAiThinking || this.isOnlineMatch) return;
        const col = choose_move(this.board, this.currentPlayer, { depth: this.botDepths[this.currentPlayer] || 4 });
        this.playMove(col);
    }

    resetGame() {
        this.board = this.createEmptyBoard();
        this.currentPlayer = 1;
        this.isGameOver = false;
        this.winner = null;
        this.winningCells = [];
        this.moveHistory = [];
        this.isAiThinking = false;

        this.renderBoard();
        this.updateUI();
        this.updateTelemetryVisuals();
        if (!this.isOnlineMatch) {
            this.checkNextTurn();
        }
    }

    // =========================================================================
    // MODALS: CODE & ONLINE INVITE
    // =========================================================================
    openCodeModal() {
        if (this.codeModal) this.codeModal.classList.add('active');
    }

    closeCodeModal() {
        if (this.codeModal) this.codeModal.classList.remove('active');
    }

    openInviteModal(tab = 'create', prefillCode = '') {
        if (this.inviteModal) {
            this.inviteModal.classList.add('active');

            // Switch to requested tab
            const targetTabId = tab === 'join' ? 'join-room-tab' : 'create-room-tab';
            this.inviteModal.querySelectorAll('.modal-tab-btn').forEach(b => {
                b.classList.toggle('active', b.dataset.target === targetTabId);
            });
            this.inviteModal.querySelectorAll('.code-tab-content').forEach(c => {
                c.style.display = c.id === targetTabId ? 'block' : 'none';
            });

            if (prefillCode) {
                const codeInput = document.getElementById('join-room-code-input');
                if (codeInput) codeInput.value = prefillCode;
            }
        }
    }

    closeInviteModal() {
        if (this.inviteModal) this.inviteModal.classList.remove('active');
    }

    // =========================================================================
    // CHESS.COM-STYLE ONLINE MULTIPLAYER ROOMS
    // =========================================================================
    async createOnlineRoom() {
        const nameInput = document.getElementById('host-player-name');
        const playerName = nameInput ? nameInput.value.trim() || 'Player 1' : 'Player 1';
        const colorRadio = document.querySelector('input[name="color-choice"]:checked');
        const colorPref = colorRadio ? parseInt(colorRadio.value, 10) : 1;

        if (this.createRoomBtn) {
            this.createRoomBtn.disabled = true;
            this.createRoomBtn.innerHTML = '<span>Creating room...</span>';
        }

        try {
            const res = await fetch('/api/rooms/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ playerName, colorPref })
            });
            const data = await res.json();

            if (res.ok && data.status === 'success') {
                this.onlineRoomId = data.roomId;
                this.onlineToken = data.token;
                this.onlinePlayerNum = 1;
                this.isOnlineMatch = true;
                this.onlineOpponentJoined = false;
                this.currentMode = 'online';

                // Update full shareable URL
                const shareUrl = `${window.location.origin}/?room=${data.roomId}`;
                if (this.shareableLinkInput) this.shareableLinkInput.value = shareUrl;
                if (this.justCodeDisplay) this.justCodeDisplay.innerText = data.roomId;
                if (this.inviteLinkBox) this.inviteLinkBox.style.display = 'flex';

                // WhatsApp Share link
                if (this.shareWhatsappBtn) {
                    const msg = encodeURIComponent(`Let's play Connect-4! Click this invite link to join my game: ${shareUrl}`);
                    this.shareWhatsappBtn.href = `https://wa.me/?text=${msg}`;
                }

                // Show Online Room HUD
                this.setupOnlineMatchView(data.roomId, playerName, 'Waiting for friend...');

                // Copy to clipboard automatically as a convenience
                navigator.clipboard.writeText(shareUrl).catch(() => {});

                // Start polling room state
                this.pollOnlineRoomState();
            } else {
                alert(data.error || 'Failed to create online room.');
            }
        } catch (e) {
            console.error('Room creation error:', e);
            alert('Could not connect to server. Ensure app.py backend is running.');
        } finally {
            if (this.createRoomBtn) {
                this.createRoomBtn.disabled = false;
                this.createRoomBtn.innerHTML = '<span>⚡ Create Game & Generate Invite Link</span>';
            }
        }
    }

    async submitJoinOnlineRoom() {
        const nameInput = document.getElementById('guest-player-name');
        const codeInput = document.getElementById('join-room-code-input');
        const playerName = nameInput ? nameInput.value.trim() || 'Player 2' : 'Player 2';
        let rawCode = codeInput ? codeInput.value.trim() : '';

        // Extract code if user pasted full URL (e.g., http://localhost:5000/?room=TITAN-1234)
        if (rawCode.includes('room=')) {
            const match = rawCode.match(/room=([A-Z0-9-]+)/i);
            if (match) rawCode = match[1];
        }
        const roomId = rawCode.toUpperCase();

        if (!roomId) {
            alert('Please enter a room code or paste an invite link.');
            return;
        }

        if (this.submitJoinRoomBtn) {
            this.submitJoinRoomBtn.disabled = true;
            this.submitJoinRoomBtn.innerHTML = '<span>Joining room...</span>';
        }

        try {
            const res = await fetch('/api/rooms/join', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roomId, playerName })
            });
            const data = await res.json();

            if (res.ok && data.status === 'success') {
                this.onlineRoomId = roomId;
                this.onlineToken = data.token;
                this.onlinePlayerNum = 2;
                this.isOnlineMatch = true;
                this.onlineOpponentJoined = true;
                this.currentMode = 'online';

                this.closeInviteModal();
                this.setupOnlineMatchView(roomId, data.state.player1_name || 'Player 1', '🟢 Friend Connected');
                this.syncOnlineRoomState(data.state);
                this.playSound('join');

                // Start background sync
                this.pollOnlineRoomState();
            } else {
                alert(data.error || 'Failed to join game room.');
            }
        } catch (e) {
            console.error('Join room error:', e);
            alert('Could not connect to server. Ensure app.py backend is running.');
        } finally {
            if (this.submitJoinRoomBtn) {
                this.submitJoinRoomBtn.disabled = false;
                this.submitJoinRoomBtn.innerHTML = '<span>🚀 Join Friend\'s Game</span>';
            }
        }
    }

    setupOnlineMatchView(roomId, opponentName, statusText) {
        if (this.onlineMatchHud) this.onlineMatchHud.style.display = 'flex';
        if (this.onlineRoomIdDisplay) this.onlineRoomIdDisplay.innerText = roomId;
        if (this.onlineOpponentStatus) this.onlineOpponentStatus.innerText = statusText;

        // Update player labels
        const p1Title = document.querySelector('#player1-card .player-info h3');
        const p2Title = document.querySelector('#player2-card .player-info h3');
        if (p1Title) p1Title.innerText = this.onlinePlayerNum === 1 ? 'You (Red)' : `${opponentName} (Red)`;
        if (p2Title) p2Title.innerText = this.onlinePlayerNum === 2 ? 'You (Cyan)' : `${opponentName} (Cyan)`;

        // Reset board for match
        this.resetGame();
    }

    copyInviteLink() {
        const url = this.shareableLinkInput ? this.shareableLinkInput.value : `${window.location.origin}/?room=${this.onlineRoomId}`;
        navigator.clipboard.writeText(url).then(() => {
            if (this.copyInviteLinkBtn) {
                const orig = this.copyInviteLinkBtn.innerHTML;
                this.copyInviteLinkBtn.innerHTML = '<span>✓ Copied!</span>';
                setTimeout(() => this.copyInviteLinkBtn.innerHTML = orig, 1800);
            }
            if (this.copyRoomLinkBtn) {
                this.copyRoomLinkBtn.innerHTML = '<span>✓ Copied!</span>';
                setTimeout(() => this.copyRoomLinkBtn.innerHTML = '<span>Copy Link</span>', 1800);
            }
        });
    }

    copyGameCodeOnly() {
        if (!this.onlineRoomId) return;
        navigator.clipboard.writeText(this.onlineRoomId).then(() => {
            if (this.copyJustCodeBtn) {
                const orig = this.copyJustCodeBtn.innerHTML;
                this.copyJustCodeBtn.innerHTML = '<span>✓ Code Copied!</span>';
                setTimeout(() => this.copyJustCodeBtn.innerHTML = orig, 1800);
            }
        });
    }

    leaveOnlineRoom() {
        this.isOnlineMatch = false;
        this.onlinePollingActive = false;
        this.onlineRoomId = null;
        this.onlineToken = null;
        this.onlinePlayerNum = 0;

        if (this.onlineMatchHud) this.onlineMatchHud.style.display = 'none';

        // Revert player card titles
        const p1Title = document.querySelector('#player1-card .player-info h3');
        const p2Title = document.querySelector('#player2-card .player-info h3');
        if (p1Title) p1Title.innerText = 'Player 1';
        if (p2Title) p2Title.innerText = 'Player 2';

        this.setMode('pve');
    }

    async pollOnlineRoomState() {
        if (!this.isOnlineMatch || !this.onlineRoomId) return;
        this.onlinePollingActive = true;

        while (this.isOnlineMatch && this.onlinePollingActive) {
            try {
                const res = await fetch(`/api/rooms/${this.onlineRoomId}?token=${this.onlineToken}&version=${this.onlineVersion}`);
                if (!res.ok) {
                    await new Promise(r => setTimeout(r, 2000));
                    continue;
                }
                const data = await res.json();
                if (data.status === 'success' && data.state) {
                    this.syncOnlineRoomState(data.state);
                }
            } catch (e) {
                await new Promise(r => setTimeout(r, 1200));
            }
        }
    }

    syncOnlineRoomState(state) {
        // Detect friend connecting
        if (state.player2_joined && !this.onlineOpponentJoined) {
            this.onlineOpponentJoined = true;
            this.closeInviteModal();
            this.playSound('join');
            if (this.onlineOpponentStatus) this.onlineOpponentStatus.innerText = `🟢 ${state.player2_name || 'Friend'} Connected`;
            const p2Title = document.querySelector('#player2-card .player-info h3');
            if (p2Title && this.onlinePlayerNum === 1) p2Title.innerText = `${state.player2_name} (Cyan)`;
        }

        // Apply any new moves from opponent
        if (state.moves && state.moves.length > this.moveHistory.length) {
            const lastMove = state.moves[state.moves.length - 1];
            if (this.board[lastMove.row][lastMove.col] === 0) {
                this.board[lastMove.row][lastMove.col] = lastMove.player;
                this.moveHistory.push({
                    board: this.board.map(r => [...r]),
                    player: lastMove.player,
                    row: lastMove.row,
                    col: lastMove.col
                });
                this.renderDiscDrop(lastMove.row, lastMove.col, lastMove.player);
                this.playSound('drop');
            }
        }

        this.currentPlayer = state.current_player;
        this.onlineVersion = state.version;

        // Check for incoming quick reactions
        if (state.reactions && state.reactions.length > 0) {
            state.reactions.forEach(r => {
                if (!this.seenReactionIds.has(r.id)) {
                    this.seenReactionIds.add(r.id);
                    if (r.sender !== this.onlinePlayerNum) {
                        this.spawnFloatingEmote(r.emote);
                    }
                }
            });
        }

        // Check game over
        if (state.winner && !this.isGameOver) {
            this.handleGameOver(state.winner, state.winning_cells || []);
        }

        this.updateUI();
    }

    async sendOnlineMove(col) {
        if (!isValidLocation(this.board, col)) {
            this.playSound('error');
            return;
        }

        try {
            const res = await fetch(`/api/rooms/${this.onlineRoomId}/move`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token: this.onlineToken,
                    col: col
                })
            });
            const data = await res.json();
            if (res.ok && data.status === 'success') {
                this.syncOnlineRoomState(data.state);
            } else {
                this.playSound('error');
            }
        } catch (e) {
            console.error('Online move error:', e);
            this.playSound('error');
        }
    }

    async sendReaction(emote) {
        this.spawnFloatingEmote(emote);
        this.playSound('reaction');

        if (this.isOnlineMatch && this.onlineRoomId && this.onlineToken) {
            try {
                await fetch(`/api/rooms/${this.onlineRoomId}/react`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        token: this.onlineToken,
                        emote: emote
                    })
                });
            } catch (e) {}
        }
    }

    spawnFloatingEmote(emote) {
        if (!this.floatingEmotesContainer) return;

        const bubble = document.createElement('div');
        bubble.className = 'floating-emote-bubble';
        bubble.innerText = emote;

        // Random horizontal start within board width
        const leftPercent = Math.floor(Math.random() * 70) + 15;
        bubble.style.left = `${leftPercent}%`;

        this.floatingEmotesContainer.appendChild(bubble);

        setTimeout(() => {
            bubble.remove();
        }, 2200);
    }

    async requestOnlineRematch() {
        if (!this.isOnlineMatch || !this.onlineRoomId) return;

        try {
            const res = await fetch(`/api/rooms/${this.onlineRoomId}/rematch`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: this.onlineToken })
            });
            const data = await res.json();
            if (res.ok && data.status === 'success') {
                this.syncOnlineRoomState(data.state);
                this.resetGame();
            }
        } catch (e) {}
    }

    // =========================================================================
    // BENCHMARK SUITE (PROBLEM 6 VERIFICATION)
    // =========================================================================
    async runProblem6Benchmark(totalGames = 10) {
        if (this.runBenchmarkBtn) this.runBenchmarkBtn.disabled = true;
        this.benchmarkTableBody.innerHTML = '';
        this.benchmarkSummaryElem.style.display = 'none';

        let botWins = 0;
        let randomWins = 0;
        let draws = 0;
        let peakTimeMs = 0;

        for (let gameIdx = 1; gameIdx <= totalGames; gameIdx++) {
            const percent = Math.round((gameIdx / totalGames) * 100);
            if (this.benchmarkProgressFill) this.benchmarkProgressFill.style.width = `${percent}%`;
            if (this.benchmarkProgressText) this.benchmarkProgressText.innerText = `Running Game ${gameIdx} of ${totalGames}...`;

            await new Promise(r => setTimeout(r, 40));

            const botPlayerId = gameIdx % 2 !== 0 ? 1 : 2;
            const res = this.simulateSingleBenchmarkGame(botPlayerId, 4);

            if (res.winner === 'bot') botWins++;
            else if (res.winner === 'random') randomWins++;
            else draws++;

            if (res.maxMoveTime > peakTimeMs) peakTimeMs = res.maxMoveTime;

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>#${gameIdx}</td>
                <td>Player ${botPlayerId}</td>
                <td>${res.totalMoves}</td>
                <td>${res.maxMoveTime.toFixed(1)} ms</td>
                <td><span class="status-badge ${res.winner === 'bot' ? 'win' : 'loss'}">${res.winner.toUpperCase()}</span></td>
            `;
            this.benchmarkTableBody.appendChild(row);
        }

        if (this.runBenchmarkBtn) this.runBenchmarkBtn.disabled = false;
        if (this.benchmarkProgressText) this.benchmarkProgressText.innerText = `Benchmark Finished (${totalGames} Games Completed)`;

        const isPassed = botWins >= 9 && peakTimeMs < 1000;
        this.benchmarkSummaryElem.style.display = 'block';
        this.benchmarkSummaryElem.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
                <div>
                    <h3 style="color:${isPassed ? 'var(--accent-emerald)' : '#ef4444'}; font-size:1.15rem; margin-bottom:4px;">
                        ${isPassed ? '🏆 PROBLEM 6 "DONE WHEN" CRITERIA MET!' : '❌ Criteria Incomplete'}
                    </h3>
                    <p style="color:var(--text-secondary); font-size:0.85rem;">
                        Bot Won: <strong>${botWins}/${totalGames} (${(botWins/totalGames*100).toFixed(0)}%)</strong> | 
                        Peak Move Latency: <strong>${peakTimeMs.toFixed(1)}ms</strong> (Limit: 1000ms) | 
                        Illegal Moves: <strong>0</strong>
                    </p>
                </div>
                <div style="background:${isPassed ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}; border:1px solid ${isPassed ? 'var(--accent-emerald)' : '#ef4444'}; padding:6px 14px; border-radius:8px; font-weight:700; font-family:var(--font-mono); color:${isPassed ? 'var(--accent-emerald)' : '#ef4444'};">
                    ${isPassed ? 'STATUS: PASSED (100% COMPLIANT)' : 'STATUS: REVIEW'}
                </div>
            </div>
        `;
        this.playSound(isPassed ? 'win' : 'error');
    }

    simulateSingleBenchmarkGame(botPlayerId, depth = 4) {
        const board = this.createEmptyBoard();
        let curPlayer = 1;
        let totalMoves = 0;
        let maxMoveTime = 0;

        while (true) {
            const valid = getValidLocations(board);
            if (valid.length === 0) {
                return { winner: 'draw', totalMoves, maxMoveTime };
            }

            let col;
            if (curPlayer === botPlayerId) {
                const t0 = performance.now();
                col = choose_move(board, curPlayer, { depth: depth });
                const dt = performance.now() - t0;
                if (dt > maxMoveTime) maxMoveTime = dt;

                if (!isValidLocation(board, col)) {
                    throw new Error(`Bot made illegal move on col ${col}`);
                }
            } else {
                col = randomBot(board, curPlayer);
            }

            const row = getNextOpenRow(board, col);
            board[row][col] = curPlayer;
            totalMoves++;

            if (checkWin(board, curPlayer)) {
                const winner = curPlayer === botPlayerId ? 'bot' : 'random';
                return { winner, totalMoves, maxMoveTime };
            }

            curPlayer = curPlayer === 1 ? 2 : 1;
        }
    }
}

// Instantiate game when DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
    window.gameInstance = new Connect4Game();
});
