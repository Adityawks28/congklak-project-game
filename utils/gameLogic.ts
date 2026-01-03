// utils/gameLogic.ts

export type Player = 'A' | 'B';
export type Board = number[];

// --- NEW STRUCT: BUKU CATATAN SEJARAH ---
export interface HistoryStep {
    boardState: Board;      // Foto papan saat detik ini
    activeHoleIndex: number | null; // Lubang mana yang sedang diisi/diambil (untuk efek lampu)
    action: 'PICK' | 'DROP' | 'STOP'; // Lagi ngapain? (Optional, buat debugging)
    hand: number;
}

export interface TurnResult {
    updatedBoard: Board;
    nextTurn: Player;
    message: string;
    history: HistoryStep[]; // <--- INI DATA ANIMASINYA
}

const HOUSE_A = 7;
const HOUSE_B = 15;

// ... (Helper isOwnHouse & isValidMove SAMA SEPERTI SEBELUMNYA, copy saja) ...
const isOwnHouse = (index: number, player: Player): boolean => {
    if (index === HOUSE_A && player === 'A') return true;
    if (index === HOUSE_B && player === 'B') return true;
    return false;
};

const isValidMove = (index: number, player: Player, board: Board): boolean => {
    if (board[index] === 0) return false;
    if (player === 'A' && (index < 0 || index > 6)) return false;
    if (player === 'B' && (index < 8 || index > 14)) return false;
    return true;
};
// ... (End Helper) ...


// --- CORE LOGIC WITH RECORDING ---
export const playCongklakMove = (
    currentBoard: Board,
    activePlayer: Player,
    startIndex: number,
): TurnResult => {
    
    // 1. Validasi
    if (!isValidMove(startIndex, activePlayer, currentBoard)) {
        throw new Error("Invalid move!");
    }

    // 2. Setup
    let newBoard = [...currentBoard];
    // RECORDING START: Siapkan array kosong
    const history: HistoryStep[] = [];

    // Ambil biji pertama
    let hand = newBoard[startIndex];
    newBoard[startIndex] = 0;
    
    // SNAPSHOT 1: Biji diambil
    history.push({
        boardState: [...newBoard], // PENTING: Harus di-copy pakai spread operator [...]
        activeHoleIndex: startIndex,
        action: 'PICK',
        hand: hand
    });

    let currentIndex = startIndex;
    let turnActive = true;
    let nextTurn: Player = activePlayer === 'A' ? 'B' : 'A';
    let message = "";

    // 3. The Loop
    while (turnActive) {
        // a. Loop Tebar Biji
        while (hand > 0) {
            currentIndex = (currentIndex + 1) % 16;

            // Skip Lumbung Lawan
            if (activePlayer === 'A' && currentIndex === 15) continue;
            if (activePlayer === 'B' && currentIndex === 7) continue;

            newBoard[currentIndex] += 1;
            hand--;

            // SNAPSHOT 2: Biji Jatuh (Setiap biji jatuh, kita rekam)
            history.push({
                boardState: [...newBoard], // Copy papan terbaru
                activeHoleIndex: currentIndex, // Tandai lubang ini (biar nyala)
                action: 'DROP',
                hand: hand
            });
        }

        // b. Cek Posisi Jatuh
        if (isOwnHouse(currentIndex, activePlayer)) {
            turnActive = false;
            nextTurn = activePlayer; 
            message = `Player ${activePlayer} main lagi (Lumbung)!`;
            
        } else if (newBoard[currentIndex] > 1) {
            // ESTAFET: Ambil lagi
            hand = newBoard[currentIndex];
            newBoard[currentIndex] = 0;
            
            // SNAPSHOT 3: Biji Diambil lagi (Estafet)
            history.push({
                boardState: [...newBoard],
                activeHoleIndex: currentIndex,
                action: 'PICK',
                hand: hand
            });
            // Loop lanjut karena turnActive masih true

        } else {
            // MATI / NEMBAK
            turnActive = false;
            nextTurn = activePlayer === 'A' ? 'B' : 'A';
            message = `Giliran Player ${nextTurn}`;

            // Logic Nembak
            const isPlayerASide = currentIndex >= 0 && currentIndex <= 6;
            const isPlayerBSide = currentIndex >= 8 && currentIndex <= 14;

            if ((activePlayer === 'A' && isPlayerASide) || (activePlayer === 'B' && isPlayerBSide)) {
                const opponentIndex = 14 - currentIndex;
                const myHouse = activePlayer === 'A' ? HOUSE_A : HOUSE_B;

                if (newBoard[opponentIndex] > 0) {
                    // Ambil punya lawan + punya sendiri
                    const captured = newBoard[opponentIndex] + newBoard[currentIndex];
                    newBoard[myHouse] += captured;
                    newBoard[opponentIndex] = 0;
                    newBoard[currentIndex] = 0;
                    message = "TEMBAK! Capture biji lawan!";

                    // SNAPSHOT 4: Hasil Nembak
                    history.push({
                        boardState: [...newBoard],
                        activeHoleIndex: myHouse, // Highlight lumbung yang dapet banyak
                        action: 'CAPTURE',
                        hand: 0
                    });
                }
            }
        }
    }

    // SNAPSHOT FINAL: Matikan highlight
    history.push({
        boardState: [...newBoard],
        activeHoleIndex: null, // Lampu dimatikan
        action: 'STOP',
        hand: 0
    });

    return {
        updatedBoard: newBoard,
        nextTurn,
        message,
        history // Kembalikan rekaman video
    };
};