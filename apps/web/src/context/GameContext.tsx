'use client';

import React, { createContext, useContext, useReducer, useCallback } from 'react';
import { CellState, Plane, GRID_SIZE } from '@avioane/shared';

// ─── Starea jocului ───────────────────────────────────────────────────────────

export type AppPhase = 'home' | 'setup' | 'battle' | 'finished';
export type Language = 'ro' | 'en';

export interface ShotNotification {
  row: number;
  col: number;
  result: 'miss' | 'hit' | 'dead';
}

export interface GameState {
  phase: AppPhase;
  lang: Language;
  roomCode: string | null;
  playerId: string | null;
  nickname: string;
  opponentNickname: string | null;
  opponentReady: boolean;
  myPlanes: Plane[];
  myGrid: CellState[][];           // flota proprie
  shotsGrid: CellState[][];        // tabla de ținte
  opponentPlaneReveal: Plane[];    // avioanele adversarului (revelate la MORT)
  isMyTurn: boolean;
  winnerNickname: string | null;
  didIWin: boolean;
  myStats: { hits: number; misses: number; totalShots: number } | null;
  lastShot: ShotNotification | null;
  lastIncoming: ShotNotification | null;
}

function emptyGrid(): CellState[][] {
  return Array.from({ length: GRID_SIZE }, () => Array<CellState>(GRID_SIZE).fill('empty'));
}

const initialState: GameState = {
  phase: 'home',
  lang: 'ro',
  roomCode: null,
  playerId: null,
  nickname: '',
  opponentNickname: null,
  opponentReady: false,
  myPlanes: [],
  myGrid: emptyGrid(),
  shotsGrid: emptyGrid(),
  opponentPlaneReveal: [],
  isMyTurn: false,
  winnerNickname: null,
  didIWin: false,
  myStats: null,
  lastShot: null,
  lastIncoming: null,
};

// ─── Actions ──────────────────────────────────────────────────────────────────

type Action =
  | { type: 'SET_PHASE'; phase: AppPhase }
  | { type: 'SET_LANG'; lang: Language }
  | { type: 'ROOM_CREATED'; code: string; playerId: string; nickname: string }
  | { type: 'ROOM_JOINED'; code: string; playerId: string; nickname: string; opponentNickname: string }
  | { type: 'OPPONENT_JOINED'; nickname: string }
  | { type: 'OPPONENT_READY' }
  | { type: 'SET_MY_PLANES'; planes: Plane[]; grid: CellState[][] }
  | { type: 'GAME_START'; isMyTurn: boolean }
  | { type: 'SHOT_RESULT'; row: number; col: number; result: 'miss' | 'hit' | 'dead'; deadCells?: Array<{row:number;col:number}> }
  | { type: 'INCOMING_SHOT'; row: number; col: number; result: 'miss' | 'hit' | 'dead'; deadCells?: Array<{row:number;col:number}> }
  | { type: 'TURN_CHANGE'; isMyTurn: boolean }
  | { type: 'GAME_OVER'; winnerNickname: string; didIWin: boolean; myStats: GameState['myStats'] }
  | { type: 'REMATCH_START'; isMyTurn: boolean }
  | { type: 'RESET' };

// ─── Reducer ──────────────────────────────────────────────────────────────────

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {

    case 'SET_PHASE':
      return { ...state, phase: action.phase };

    case 'SET_LANG':
      return { ...state, lang: action.lang };

    case 'ROOM_CREATED':
      return {
        ...state,
        phase: 'setup',
        roomCode: action.code,
        playerId: action.playerId,
        nickname: action.nickname,
        opponentNickname: null,
        opponentReady: false,
        myGrid: emptyGrid(),
        shotsGrid: emptyGrid(),
        myPlanes: [],
      };

    case 'ROOM_JOINED':
      return {
        ...state,
        phase: 'setup',
        roomCode: action.code,
        playerId: action.playerId,
        nickname: action.nickname,
        opponentNickname: action.opponentNickname,
        opponentReady: false,
        myGrid: emptyGrid(),
        shotsGrid: emptyGrid(),
        myPlanes: [],
      };

    case 'OPPONENT_JOINED':
      return { ...state, opponentNickname: action.nickname };

    case 'OPPONENT_READY':
      return { ...state, opponentReady: true };

    case 'SET_MY_PLANES':
      return { ...state, myPlanes: action.planes, myGrid: action.grid };

    case 'GAME_START':
      return { ...state, phase: 'battle', isMyTurn: action.isMyTurn, lastShot: null, lastIncoming: null };

    case 'SHOT_RESULT': {
      const newGrid = state.shotsGrid.map(r => [...r]) as CellState[][];
      // Marcăm DOAR celula lovită — nu reveăm forma avionului
      newGrid[action.row][action.col] =
        action.result === 'miss' ? 'miss' :
        action.result === 'hit'  ? 'hit'  : 'dead';
      return {
        ...state,
        shotsGrid: newGrid,
        lastShot: { row: action.row, col: action.col, result: action.result },
        isMyTurn: false,
      };
    }

    case 'INCOMING_SHOT': {
      const newGrid = state.myGrid.map(r => [...r]) as CellState[][];
      if (action.result === 'dead' && action.deadCells) {
        for (const c of action.deadCells) {
          newGrid[c.row][c.col] = 'dead';
        }
      } else {
        const current = newGrid[action.row][action.col];
        newGrid[action.row][action.col] = action.result === 'miss' ? 'miss'
          : action.result === 'hit' ? 'hit'
          : current;
      }
      return {
        ...state,
        myGrid: newGrid,
        lastIncoming: { row: action.row, col: action.col, result: action.result },
      };
    }

    case 'TURN_CHANGE':
      return { ...state, isMyTurn: action.isMyTurn };

    case 'GAME_OVER':
      return {
        ...state,
        phase: 'finished',
        winnerNickname: action.winnerNickname,
        didIWin: action.didIWin,
        myStats: action.myStats,
      };

    case 'REMATCH_START':
      return {
        ...state,
        phase: 'setup',
        isMyTurn: action.isMyTurn,
        myPlanes: [],
        myGrid: emptyGrid(),
        shotsGrid: emptyGrid(),
        opponentReady: false,
        winnerNickname: null,
        didIWin: false,
        myStats: null,
        lastShot: null,
        lastIncoming: null,
      };

    case 'RESET':
      return initialState;

    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface GameContextValue {
  state: GameState;
  dispatch: React.Dispatch<Action>;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  return (
    <GameContext.Provider value={{ state, dispatch }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame trebuie folosit în interiorul <GameProvider>');
  return ctx;
}
