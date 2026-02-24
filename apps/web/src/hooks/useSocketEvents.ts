'use client';

import { useEffect, useRef } from 'react';
import { getSocket } from '@/lib/socket';
import { useGame } from '@/context/GameContext';
import { buildOwnGrid } from '@avioane/shared';

/**
 * Hook care ascultă toate evenimentele de la server și actualizează contextul.
 * Se montează o singură dată în root, e activ pe tot parcursul sesiunii.
 */
export function useSocketEvents() {
  const { dispatch } = useGame();
  const bound = useRef(false);

  useEffect(() => {
    if (bound.current) return;
    bound.current = true;

    const socket = getSocket();

    socket.on('opponent_joined', ({ nickname }) => {
      dispatch({ type: 'OPPONENT_JOINED', nickname });
    });

    socket.on('opponent_ready', () => {
      dispatch({ type: 'OPPONENT_READY' });
    });

    socket.on('game_start', ({ yourTurn }) => {
      dispatch({ type: 'GAME_START', isMyTurn: yourTurn });
    });

    socket.on('your_shot_result', ({ row, col, result, deadPlane }) => {
      dispatch({
        type: 'SHOT_RESULT',
        row,
        col,
        result,
        deadCells: deadPlane,
      });
    });

    socket.on('shot_received', ({ row, col, result, deadPlane }) => {
      dispatch({
        type: 'INCOMING_SHOT',
        row,
        col,
        result,
        deadCells: deadPlane,
      });
    });

    socket.on('turn_change', ({ yourTurn }) => {
      dispatch({ type: 'TURN_CHANGE', isMyTurn: yourTurn });
    });

    socket.on('game_over', ({ winnerNickname, winnerId, myStats }) => {
      const socket = getSocket();
      dispatch({
        type: 'GAME_OVER',
        winnerNickname,
        didIWin: winnerId === socket.id,
        myStats,
      });
    });

    socket.on('rematch_start', ({ yourTurn }) => {
      dispatch({ type: 'REMATCH_START', isMyTurn: yourTurn });
    });

    socket.on('opponent_disconnected', () => {
      dispatch({ type: 'SET_PHASE', phase: 'home' });
      setTimeout(() => {
        alert('Adversarul s-a deconectat.');
      }, 100);
    });

    return () => {
      socket.off('opponent_joined');
      socket.off('opponent_ready');
      socket.off('game_start');
      socket.off('your_shot_result');
      socket.off('shot_received');
      socket.off('turn_change');
      socket.off('game_over');
      socket.off('rematch_start');
      socket.off('opponent_disconnected');
      bound.current = false;
    };
  }, [dispatch]);
}
