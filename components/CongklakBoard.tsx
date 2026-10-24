"use client";

import React, { useState } from 'react';
import { Board, Player, playCongklakMove, checkGameOver, collectRemaining, getWinner } from '../utils/legacyGameLogic';

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '';

// Initial state: 7 seeds per hole, 0 in storehouses
const INITIAL_BOARD: Board = [7, 7, 7, 7, 7, 7, 7, 0, 7, 7, 7, 7, 7, 7, 7, 0];

// Helper to pause execution for animation effect
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default function CongklakBoard() {
  // Game State
  const [board, setBoard] = useState<Board>(INITIAL_BOARD);
  const [activePlayer, setActivePlayer] = useState<Player>('A');
  const [message, setMessage] = useState<string>("Player A Start!");
  
  // Animation State
  const [isAnimating, setIsAnimating] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState<number | null>(null);
  const [handCount, setHandCount] = useState<number>(0);

  // Game Over State
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<Player | 'DRAW' | null>(null);

  const handleHoleClick = async (index: number) => {
    // Guard: Prevent interaction during animation or after game over
    if (isAnimating) return;
    if (gameOver) return;
    
    // Guard: Prevent clicking empty holes
    if (board[index] === 0) return;

    // Guard: Enforce player side rules
    if (activePlayer === 'A' && index > 6) return;
    if (activePlayer === 'B' && (index < 8 || index > 14)) return;

    try {
      // 1. Execute logic (calculates the whole game in one go)
      const result = playCongklakMove(board, activePlayer, index);
      
      // 2. Start Animation Mode
      setIsAnimating(true);
      setMessage("Moving...");

      // 3. Playback the history (The "Movie Reel")
      for (const step of result.history) {
          setBoard(step.boardState);          
          setHighlightIndex(step.activeHoleIndex);
          setHandCount(step.hand); // Update the floating hand counter

          // Speed control: Slower for capture events
          const delay = step.action === 'CAPTURE' ? 1300 : 1000;
          await sleep(delay); 
      }

      // 4. End Animation & Finalize Turn
      setIsAnimating(false);
      setHighlightIndex(null);
      setHandCount(0);

      // 5. Check for game over
      if (checkGameOver(result.updatedBoard)) {
        const finalBoard = collectRemaining(result.updatedBoard);
        setBoard(finalBoard);
        const w = getWinner(finalBoard);
        setWinner(w);
        setGameOver(true);
        setMessage(w === 'DRAW' ? "It's a Draw!" : `Player ${w} Wins!`);
        return;
      }

      setActivePlayer(result.nextTurn);
      setMessage(result.message);

    } catch (error) {
      console.error("Logic Error:", error);
      setIsAnimating(false);
    }
  };

  const resetGame = () => {
    setBoard(INITIAL_BOARD);
    setActivePlayer('A');
    setMessage("Player A Start!");
    setIsAnimating(false);
    setHighlightIndex(null);
    setHandCount(0);
    setGameOver(false);
    setWinner(null);
  };

  // Render individual holes (The "Pits")
  const renderHole = (index: number) => {
    // Determine if this hole belongs to the active player
    const isOwnSide = 
        (activePlayer === 'A' && index >= 0 && index <= 6) ||
        (activePlayer === 'B' && index >= 8 && index <= 14);

    const isInteractable = isOwnSide && board[index] > 0 && !isAnimating;
    const isHighlighted = highlightIndex === index;

    return (
      <button
        key={index}
        onClick={() => handleHoleClick(index)}
        disabled={!isInteractable}
        className={`
          relative w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center 
          transition-all duration-300 transform group border
          
          /* WOODEN HOLE STYLE */
          /* Inset shadow creates the "carved deep" look */
          bg-[#3d2b1f] shadow-[inset_0_4px_10px_rgba(0,0,0,0.8),0_1px_0_rgba(255,255,255,0.1)]
          border-[#2a1d15]

          ${isInteractable 
            ? 'cursor-pointer hover:scale-105 hover:border-amber-500/50' 
            : 'cursor-not-allowed opacity-90'
          }
        `}
      >
        {/* ANIMATION GLOW: Yellow pulse when active */}
        {isHighlighted && (
           <div className="absolute inset-0 rounded-full bg-yellow-500/30 blur-md animate-pulse z-0"></div>
        )}

        {/* SEED REPRESENTATION */}
        {board[index] > 0 && (
            <div className="relative flex items-center justify-center z-10">
                {/* 1. Try to load Shell Image */}
                <img 
                    src={`${BASE_PATH}/shell-icon.png`} 
                    alt="seed"
                    // Fallback to hidden if image missing
                    onError={(e) => e.currentTarget.style.display = 'none'} 
                    className="w-10 h-10 object-contain drop-shadow-md"
                />
                
                {/* 2. Fallback Shape (White circle) if image fails */}
                <div className="absolute -z-10 w-8 h-8 bg-stone-100 rounded-full shadow-sm opacity-80"></div>

                {/* Seed Count Badge */}
                <span className="absolute -top-3 -right-3 bg-yellow-600 text-amber-100 text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full border border-yellow-400 shadow-lg">
                    {board[index]}
                </span>
            </div>
        )}

        {/* Ownership Ring Indicator (Subtle) */}
        <div className={`absolute -inset-1 rounded-full border-2 opacity-20 border-dashed pointer-events-none
            ${index >= 8 ? 'border-red-500' : 'border-blue-400'}`}>
        </div>
      </button>
    );
  };

  // Visual Mapping for Clockwise Flow
  // Player B (Top): 8 -> 14 (Left to Right)
  const topRowIndices = [8, 9, 10, 11, 12, 13, 14]; 
  // Player A (Bottom): 6 -> 0 (Right to Left) -> enters Store 7 (Left)
  const bottomRowIndices = [6, 5, 4, 3, 2, 1, 0];

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-stone-900 text-amber-100 p-4 font-serif selection:bg-amber-700">
      
      {/* 1. TITLE & HEADER */}
      <div className="mb-8 text-center space-y-2">
        <h1 className="text-4xl md:text-5xl font-bold tracking-[0.2em] text-amber-500 drop-shadow-md" style={{ fontFamily: 'serif' }}>
           C O N G K L A K
        </h1>
        <p className="text-stone-500 text-xs uppercase tracking-widest">Nusantara Heritage Edition</p>
        
        {/* Game Status Message */}
        <div className={`mt-4 px-6 py-2 rounded-lg bg-[#2a1d15] border shadow-inner transition-colors duration-500
            ${activePlayer === 'A' ? 'border-blue-500/30 text-blue-200' : 'border-red-500/30 text-red-200'}
        `}>
          {message}
        </div>
        <button
          onClick={resetGame}
          className="mt-2 px-4 py-1.5 text-xs uppercase tracking-widest bg-amber-800/50 hover:bg-amber-700/50 border border-amber-600/30 rounded-lg text-amber-300 transition-colors"
        >
          New Game
        </button>
      </div>

      {/* 2. FLOATING HAND INDICATOR */}
      {/* Shows up only during animation to indicate seeds in hand */}
      <div className={`
          fixed top-28 z-50 transition-all duration-300 transform
          ${isAnimating ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-4 scale-90 pointer-events-none'}
      `}>
          <div className="bg-[#4a3b32] text-amber-100 px-5 py-2 rounded-lg border-2 border-amber-700 shadow-2xl flex items-center gap-3">
             <span className="text-2xl">🖐️</span>
             <div className="flex flex-col leading-none">
                 <span className="text-[10px] text-amber-400 uppercase font-bold">In Hand</span>
                 <span className="text-xl font-mono font-bold">{handCount}</span>
             </div>
          </div>
      </div>

      {/* 3. MAIN BOARD CONTAINER (The Wood) */}
      <div 
        className="relative p-6 md:p-10 rounded-[4rem] shadow-[0_25px_60px_rgba(0,0,0,0.6),inset_0_2px_4px_rgba(255,255,255,0.1)] border-b-8 border-[#1e140e]"
        style={{ 
            backgroundColor: '#5D4037', // Fallback color
            backgroundImage: `url('${BASE_PATH}/wood-pattern.jpg')`, // Ensure this exists in /public
            backgroundSize: 'cover',
            backgroundPosition: 'center'
        }}
      >
        {/* Decorative Inner Border (Gold Line) */}
        <div className="absolute inset-3 md:inset-5 rounded-[3.5rem] border border-amber-500/10 pointer-events-none"></div>

        <div className="flex flex-row items-center gap-4 md:gap-8">
          
          {/* LEFT: STOREHOUSE A (Player A's Goal) */}
          <div className="flex flex-col items-center gap-2">
            <div className={`
                w-24 h-56 md:w-28 md:h-72 rounded-full flex items-center justify-center border-4 relative
                bg-[#3d2b1f] shadow-[inset_0_10px_20px_rgba(0,0,0,0.8)] transition-all duration-500
                ${highlightIndex === 7 ? 'border-yellow-500 shadow-[0_0_30px_rgba(234,179,8,0.4)]' : 'border-[#2a1d15]'}
            `}>
                <div className="flex flex-col items-center z-10">
                    <span className="text-4xl font-bold text-blue-400 drop-shadow-md">{board[7]}</span>
                </div>
                {/* Shell Icon Decoration */}
                <img src={`${BASE_PATH}/shell-icon.png`} className="absolute w-12 h-12 opacity-20 bottom-8" alt="" onError={(e) => e.currentTarget.style.display='none'}/>
            </div>
            <span className="text-[10px] font-bold tracking-widest text-blue-500/50 uppercase">Player A</span>
          </div>

          {/* CENTER: PLAYING AREA */}
          <div className="flex flex-col gap-4 md:gap-6">
              
              {/* Top Row: Player B (Index 8-14) */}
              <div className={`
                flex gap-2 md:gap-3 bg-[#2a1d15]/40 p-3 md:p-4 rounded-3xl border border-white/5 backdrop-blur-sm transition-colors duration-500
                ${activePlayer === 'B' ? 'bg-[#2a1d15]/70 border-red-500/20' : ''}
              `}>
                  {topRowIndices.map((index) => renderHole(index))}
              </div>

              {/* Bottom Row: Player A (Index 0-6) */}
              <div className={`
                flex gap-2 md:gap-3 bg-[#2a1d15]/40 p-3 md:p-4 rounded-3xl border border-white/5 backdrop-blur-sm transition-colors duration-500
                ${activePlayer === 'A' ? 'bg-[#2a1d15]/70 border-blue-500/20' : ''}
              `}>
                  {bottomRowIndices.map((index) => renderHole(index))}
              </div>

          </div>

          {/* RIGHT: STOREHOUSE B (Player B's Goal) */}
          <div className="flex flex-col items-center gap-2">
            <span className="text-[10px] font-bold tracking-widest text-red-500/50 uppercase">Player B</span>
            <div className={`
                w-24 h-56 md:w-28 md:h-72 rounded-full flex items-center justify-center border-4 relative
                bg-[#3d2b1f] shadow-[inset_0_10px_20px_rgba(0,0,0,0.8)] transition-all duration-500
                ${highlightIndex === 15 ? 'border-yellow-500 shadow-[0_0_30px_rgba(234,179,8,0.4)]' : 'border-[#2a1d15]'}
            `}>
                <div className="flex flex-col items-center z-10">
                    <span className="text-4xl font-bold text-red-400 drop-shadow-md">{board[15]}</span>
                </div>
                <img src={`${BASE_PATH}/shell-icon.png`} className="absolute w-12 h-12 opacity-20 bottom-8" alt="" onError={(e) => e.currentTarget.style.display='none'}/>
            </div>
          </div>

        </div>
      </div>
      
      {/* Game Over Overlay */}
      {gameOver && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-[#3d2b1f] border-2 border-amber-600/50 rounded-2xl p-8 text-center shadow-2xl max-w-sm">
            <h2 className="text-3xl font-bold text-amber-400 mb-2">Game Over</h2>
            <p className="text-xl text-amber-100 mb-1">
              {winner === 'DRAW' ? "It's a Draw!" : `Player ${winner} Wins!`}
            </p>
            <p className="text-sm text-stone-400 mb-6">
              Score: {board[7]} - {board[15]}
            </p>
            <button
              onClick={resetGame}
              className="px-6 py-2 bg-amber-700 hover:bg-amber-600 text-amber-100 rounded-lg font-bold tracking-wider uppercase transition-colors"
            >
              Play Again
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-12 text-stone-600 text-[10px] tracking-[0.3em] uppercase opacity-50">
          Digital Folklore • 2026
      </div>
    </div>
  );
}