'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CellState } from '@avioane/shared';
import { getSocket } from '@/lib/socket';
import { useGame } from '@/context/GameContext';
import { useTranslation } from '@/lib/i18n';

const COL_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const ROW_LABELS = ['1', '2', '3', '4', '5', '6', '7', '8'];

type SketchMap = Record<string, boolean>;
type ShotState = { row: number; col: number; result: 'miss' | 'hit' | 'dead' } | null;

const HOLD_DURATION = 350;

export default function BattleScreen() {
  const { state } = useGame();
  const t = useTranslation(state.lang);

  const [notification, setNotification] = useState<{
    text: string;
    type: 'miss' | 'hit' | 'dead' | 'info';
  } | null>(null);
  const notifTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [sketchMap, setSketchMap] = useState<SketchMap>({});
  // Celula in zbor (shot trimis, asteptam rezultatul)
  const [pendingCell, setPendingCell] = useState<{ row: number; col: number } | null>(null);
  // Previne dublu-click
  const isFiringRef = useRef(false);

  useEffect(() => {
    if (!state.lastShot) return;
    isFiringRef.current = false;
    setPendingCell(null);
    // Sterge schita DOAR daca a ratat  daca a lovit, X-ul acopera celula oricum
    if (state.lastShot.result === 'miss') {
      const key = `${state.lastShot.row},${state.lastShot.col}`;
      setSketchMap(prev => { const n = { ...prev }; delete n[key]; return n; });
    }
    const msgs: Record<string, string> = {
      miss: t('miss'),
      hit: t('hit'),
      dead: t('dead'),
    };
    showNotification(msgs[state.lastShot.result], state.lastShot.result);
  }, [state.lastShot]);

  useEffect(() => {
    if (!state.lastIncoming) return;
    const r = state.lastIncoming.result;
    if (r === 'dead')     showNotification('Avionul tau a fost doborat!', 'dead');
    else if (r === 'hit') showNotification('Ai fost lovit!', 'hit');
    else                  showNotification('Adversarul a ratat!', 'miss');
  }, [state.lastIncoming]);

  function showNotification(text: string, type: 'miss' | 'hit' | 'dead' | 'info') {
    setNotification({ text, type });
    if (notifTimerRef.current) clearTimeout(notifTimerRef.current);
    notifTimerRef.current = setTimeout(() => setNotification(null), 2500);
  }

  function handleShoot(row: number, col: number) {
    if (!state.isMyTurn) return;
    if (state.shotsGrid[row][col] !== 'empty') return;
    if (isFiringRef.current) return;
    isFiringRef.current = true;
    setPendingCell({ row, col });
    getSocket().emit('shoot', { row, col }, (res) => {
      if (!res.ok) {
        // Shot respins (ex: ai mai tras acolo) - reset silentios
        isFiringRef.current = false;
        setPendingCell(null);
      }
    });
  }

  function toggleSketch(row: number, col: number) {
    if (state.shotsGrid[row][col] !== 'empty') return;
    const key = `${row},${col}`;
    setSketchMap(prev => {
      const n = { ...prev };
      if (n[key]) delete n[key];
      else n[key] = true;
      return n;
    });
  }

  const myHits   = state.shotsGrid.flat().filter(c => c === 'hit' || c === 'dead').length;
  const myMisses = state.shotsGrid.flat().filter(c => c === 'miss').length;

  const notifStyle: Record<string, string> = {
    miss: 'text-slate-300 border-slate-500/40',
    hit:  'text-amber-300 border-amber-400/50',
    dead: 'text-red-400  border-red-400/50',
    info: 'text-cyan-400 border-cyan-400/40',
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-start px-2 py-6">

      {/* Header */}
      <div className="flex items-center gap-3 mb-4 text-sm">
        <span className="text-cyan-300 font-bold">{state.nickname}</span>
        <span className="text-slate-600">vs</span>
        <span className="text-slate-300 font-bold">{state.opponentNickname}</span>
      </div>

      {/* Rand indicator */}
      <AnimatePresence mode="wait">
        <motion.div
          key={state.isMyTurn ? 'myturn' : 'wait'}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          className="mb-5"
        >
          {state.isMyTurn ? (
            <span className="badge-your-turn text-sm px-5 py-2">{t('yourTurn')}</span>
          ) : (
            <span className="badge-wait text-sm px-5 py-2">{t('waitTurn')}</span>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            key={notification.text}
            initial={{ opacity: 0, scale: 0.8, y: -16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -16 }}
            transition={{ type: 'spring', stiffness: 380, damping: 22 }}
            className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 glass-panel px-8 py-3 text-xl font-bold tracking-wide border ${notifStyle[notification.type]}`}
          >
            {notification.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grids */}
      <div className="flex flex-col lg:flex-row gap-6 items-start justify-center">

        {/* Tinte */}
        <div className="glass-panel p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-cyan-400/70 text-xs font-bold uppercase tracking-widest">
              {t('battleTargets')}
            </span>
            <span className="text-xs text-slate-500">
              <span className="text-amber-400 font-bold">{myHits}</span>
              <span className="text-slate-600"> / {myHits + myMisses}</span>
            </span>
          </div>
          <TargetGrid
            grid={state.shotsGrid}
            interactive={state.isMyTurn}
            sketchMap={sketchMap}
            onShoot={handleShoot}
            onSketch={toggleSketch}
            lastShot={state.lastShot}
            pendingCell={pendingCell}
          />
        </div>

        {/* Flota proprie */}
        <div className="glass-panel p-4">
          <div className="mb-3">
            <span className="text-slate-400/70 text-xs font-bold uppercase tracking-widest">
              {t('battleFleet')}
            </span>
          </div>
          <FleetGrid grid={state.myGrid} lastIncoming={state.lastIncoming} />
        </div>
      </div>

      {/* Stats */}
      <div className="mt-5 flex gap-6 text-xs text-slate-500">
        <span>Lovit: <span className="text-amber-400 font-bold">{myHits}</span></span>
        <span>Ratat: <span className="font-bold">{myMisses}</span></span>
        {myHits + myMisses > 0 && (
          <span>
            Precizie:{' '}
            <span className="text-cyan-400 font-bold">
              {Math.round((myHits / (myHits + myMisses)) * 100)}%
            </span>
          </span>
        )}
        {Object.keys(sketchMap).length > 0 && (
          <span>
            Marcate: <span className="text-violet-400 font-bold">{Object.keys(sketchMap).length}</span>
            <button
              onClick={() => setSketchMap({})}
              className="ml-2 text-slate-600 hover:text-red-400 transition-colors"
              title="Sterge toate marcajele"
            >
              x
            </button>
          </span>
        )}
      </div>
    </div>
  );
}

//  Target Grid 

interface TargetGridProps {
  grid: CellState[][];
  interactive: boolean;
  sketchMap: SketchMap;
  onShoot: (row: number, col: number) => void;
  onSketch: (row: number, col: number) => void;
  lastShot: ShotState;
  pendingCell: { row: number; col: number } | null;
}

function TargetCell({
  cell, row, col, interactive, sketched, isPending,
  isLastShot, lastShotResult, onShoot, onSketch,
}: {
  cell: CellState; row: number; col: number;
  interactive: boolean; sketched: boolean; isPending: boolean;
  isLastShot: boolean; lastShotResult?: string;
  onShoot: (r: number, c: number) => void;
  onSketch: (r: number, c: number) => void;
}) {
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didHold   = useRef(false);

  function startHold() {
    didHold.current = false;
    holdTimer.current = setTimeout(() => {
      didHold.current = true;
      onSketch(row, col);
    }, HOLD_DURATION);
  }

  function cancelHold() {
    if (holdTimer.current) clearTimeout(holdTimer.current);
  }

  function handleClick() {
    if (didHold.current) return;
    if (cell !== 'empty') return;
    if (interactive) onShoot(row, col);
  }

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    if (cell === 'empty') onSketch(row, col);
  }

  const isEmpty = cell === 'empty';

  const bg =
    cell === 'dead'  ? 'bg-red-800/70 border-red-500/80' :
    cell === 'hit'   ? 'bg-amber-700/60 border-amber-400/80' :
    cell === 'miss'  ? 'bg-slate-800/70 border-slate-600/50' :
    isPending        ? 'bg-cyan-500/25 border-cyan-400/80' :
    sketched         ? 'bg-violet-600/20 border-violet-400/60 hover:bg-violet-600/30 cursor-pointer' :
    isEmpty && interactive
                     ? 'bg-navy-900/50 border-navy-600/30 hover:bg-navy-700/40 hover:border-cyan-400/30 cursor-crosshair' :
                       'bg-navy-900/50 border-navy-600/30 hover:bg-navy-800/60 cursor-pointer';

  return (
    <motion.div
      className={`w-10 h-10 border rounded-sm flex items-center justify-center select-none transition-colors ${bg}`}
      onMouseDown={startHold}
      onMouseUp={() => { cancelHold(); handleClick(); }}
      onMouseLeave={cancelHold}
      onTouchStart={startHold}
      onTouchEnd={() => { cancelHold(); if (!didHold.current && cell === 'empty' && interactive) onShoot(row, col); }}
      onContextMenu={handleContextMenu}
      animate={
        isLastShot && lastShotResult === 'dead' ? { scale: [1, 1.3, 1], transition: { duration: 0.45 } } :
        isLastShot && lastShotResult === 'hit'  ? { scale: [1, 1.2, 1], transition: { duration: 0.3  } } :
        {}
      }
    >
      {cell === 'miss' && (
        <span className="text-slate-300 font-bold text-xl leading-none select-none"></span>
      )}
      {(cell === 'hit' || cell === 'dead') && (
        <motion.span
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 18 }}
          className={`font-black text-xl leading-none select-none ${cell === 'dead' ? 'text-red-200' : 'text-white'}`}
        >
          X
        </motion.span>
      )}
      {isEmpty && isPending && (
        <motion.div
          className="w-3 h-3 rounded-full bg-cyan-400"
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 0.6, repeat: Infinity }}
        />
      )}
      {isEmpty && !isPending && sketched && (
        <div className="w-2.5 h-2.5 rounded-full bg-violet-400/80" />
      )}
    </motion.div>
  );
}

function TargetGrid({ grid, interactive, sketchMap, onShoot, onSketch, lastShot, pendingCell }: TargetGridProps) {
  return (
    <div className="select-none">
      <div className="flex mb-1 ml-7">
        {COL_LABELS.map(l => (
          <div key={l} className="w-10 h-5 flex items-center justify-center text-slate-600 text-xs font-mono font-semibold">
            {l}
          </div>
        ))}
      </div>
      {grid.map((row, rIdx) => (
        <div key={rIdx} className="flex">
          <div className="w-7 h-10 flex items-center justify-center text-slate-600 text-xs font-mono font-semibold">
            {ROW_LABELS[rIdx]}
          </div>
          {row.map((cell, cIdx) => (
            <TargetCell
              key={cIdx}
              cell={cell}
              row={rIdx}
              col={cIdx}
              interactive={interactive}
              sketched={!!sketchMap[`${rIdx},${cIdx}`]}
              isPending={pendingCell?.row === rIdx && pendingCell?.col === cIdx}
              isLastShot={lastShot?.row === rIdx && lastShot?.col === cIdx}
              lastShotResult={lastShot?.result}
              onShoot={onShoot}
              onSketch={onSketch}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

//  Fleet Grid 

interface FleetGridProps {
  grid: CellState[][];
  lastIncoming: ShotState;
}

function FleetGrid({ grid, lastIncoming }: FleetGridProps) {
  return (
    <div className="select-none">
      <div className="flex mb-1 ml-7">
        {COL_LABELS.map(l => (
          <div key={l} className="w-10 h-5 flex items-center justify-center text-slate-600 text-xs font-mono font-semibold">
            {l}
          </div>
        ))}
      </div>
      {grid.map((row, rIdx) => (
        <div key={rIdx} className="flex">
          <div className="w-7 h-10 flex items-center justify-center text-slate-600 text-xs font-mono font-semibold">
            {ROW_LABELS[rIdx]}
          </div>
          {row.map((cell, cIdx) => {
            const isLastHit = lastIncoming?.row === rIdx && lastIncoming?.col === cIdx;
            const bg =
              cell === 'dead'  ? 'bg-red-800/70 border-red-500/80' :
              cell === 'hit'   ? 'bg-amber-700/60 border-amber-400/80' :
              cell === 'miss'  ? 'bg-slate-800/70 border-slate-600/50' :
              cell === 'head'  ? 'bg-cyan-500/25 border-cyan-400/60' :
              cell === 'plane' ? 'bg-slate-700/40 border-slate-500/30' :
                                 'bg-navy-900/50 border-navy-600/30';
            return (
              <motion.div
                key={cIdx}
                className={`w-10 h-10 border rounded-sm flex items-center justify-center ${bg}`}
                animate={isLastHit ? { scale: [1, 1.25, 1] } : {}}
                transition={{ duration: 0.3 }}
              >
                {cell === 'miss' && (
                  <span className="text-slate-300 font-bold text-xl leading-none"></span>
                )}
                {(cell === 'hit' || cell === 'dead') && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 400 }}
                    className={`font-black text-xl leading-none ${cell === 'dead' ? 'text-red-200' : 'text-white'}`}
                  >
                    X
                  </motion.span>
                )}
                {cell === 'head' && (
                  <div className="w-2.5 h-2.5 rounded-full bg-cyan-400/90" />
                )}
              </motion.div>
            );
          })}
        </div>
      ))}
    </div>
  );
}