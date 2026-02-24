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

function cellVisualState(cell: CellState, isPending: boolean, sketched: boolean): string {
  if (cell !== 'empty') return cell;
  if (isPending) return 'pending';
  if (sketched) return 'sketch';
  return 'empty';
}

export default function BattleScreen() {
  const { state } = useGame();
  const t = useTranslation(state.lang);

  const [notification, setNotification] = useState<{
    text: string;
    type: 'miss' | 'hit' | 'dead' | 'info';
  } | null>(null);
  const notifTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [sketchMap, setSketchMap] = useState<SketchMap>({});
  const [pendingCell, setPendingCell] = useState<{ row: number; col: number } | null>(null);
  const isFiringRef = useRef(false);

  useEffect(() => {
    if (!state.lastShot) return;
    isFiringRef.current = false;
    setPendingCell(null);
    if (state.lastShot.result === 'miss') {
      const key = `${state.lastShot.row},${state.lastShot.col}`;
      setSketchMap(prev => { const n = { ...prev }; delete n[key]; return n; });
    }
    const msgs: Record<string, string> = { miss: t('miss'), hit: t('hit'), dead: t('dead') };
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

  const notifColors: Record<string, string> = {
    miss: 'var(--ind-miss)',
    hit:  'var(--ind-hit)',
    dead: 'var(--ind-dead)',
    info: 'var(--text-accent)',
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-start px-2 py-6">

      {/* Header */}
      <div className="flex items-center gap-3 mb-4 text-sm">
        <span style={{ color: 'var(--text-accent)', fontWeight: 700 }}>{state.nickname}</span>
        <span style={{ color: 'var(--text-muted)' }}>vs</span>
        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{state.opponentNickname}</span>
      </div>

      {/* Turn indicator */}
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
            initial={{ opacity: 0, scale: 0.85, y: -16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: -16 }}
            transition={{ type: 'spring', stiffness: 380, damping: 22 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 glass-panel px-8 py-3 text-xl font-bold tracking-wide"
            style={{ color: notifColors[notification.type] }}
          >
            {notification.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grids */}
      <div className="flex flex-col lg:flex-row gap-6 items-start justify-center">

        {/* Target grid */}
        <div className="glass-panel p-4">
          <div className="flex items-center justify-between mb-3">
            <span style={{ color: 'var(--text-accent)', opacity: 0.75 }} className="text-xs font-bold uppercase tracking-widest">
              {t('battleTargets')}
            </span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              <span style={{ color: 'var(--cell-hit-bd)', fontWeight: 700 }}>{myHits}</span>
              <span> / {myHits + myMisses}</span>
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

        {/* Fleet grid */}
        <div className="glass-panel p-4">
          <div className="mb-3">
            <span style={{ color: 'var(--text-muted)', opacity: 0.8 }} className="text-xs font-bold uppercase tracking-widest">
              {t('battleFleet')}
            </span>
          </div>
          <FleetGrid grid={state.myGrid} lastIncoming={state.lastIncoming} />
        </div>
      </div>

      {/* Legend */}
      <Legend />

      {/* Stats */}
      <div className="mt-5 flex gap-6 text-xs" style={{ color: 'var(--text-muted)' }}>
        <span>Lovit: <span style={{ color: 'var(--cell-hit-bd)', fontWeight: 700 }}>{myHits}</span></span>
        <span>Ratat: <span style={{ fontWeight: 700 }}>{myMisses}</span></span>
        {myHits + myMisses > 0 && (
          <span>
            Precizie:{' '}
            <span style={{ color: 'var(--text-accent)', fontWeight: 700 }}>
              {Math.round((myHits / (myHits + myMisses)) * 100)}%
            </span>
          </span>
        )}
        {Object.keys(sketchMap).length > 0 && (
          <span>
            Marcate: <span style={{ color: 'var(--ind-sketch)', fontWeight: 700 }}>{Object.keys(sketchMap).length}</span>
            <button
              onClick={() => setSketchMap({})}
              className="ml-2 transition-colors"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--ind-dead)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
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

// ─── Legend ───────────────────────────────────────────────────────────────────

function LegendItem({ state, label, symbol }: { state: string; label: string; symbol: string }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="grid-cell flex-shrink-0"
        style={{ width: 28, height: 28 }}
        data-state={state}
      >
        <span style={{
          fontWeight: 900,
          fontSize: 14,
          color: state === 'miss' ? 'var(--ind-miss)'
               : state === 'hit'  ? 'var(--ind-hit)'
               : state === 'dead' ? 'var(--ind-dead)'
               : 'var(--ind-sketch)',
          lineHeight: 1,
        }}>
          {symbol}
        </span>
      </div>
      <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{label}</span>
    </div>
  );
}

function Legend() {
  return (
    <div
      className="mt-4 px-5 py-3 rounded-xl flex flex-wrap gap-x-6 gap-y-2 justify-center"
      style={{ background: 'var(--bg-panel)', border: '1px solid var(--bg-panel-border)' }}
    >
      <LegendItem state="miss"   symbol="·" label="Ratat (Aer!)" />
      <LegendItem state="hit"    symbol="X" label="Lovit (corp)" />
      <LegendItem state="dead"   symbol="X" label="Doborat (cap) — MORT!" />
      <LegendItem state="sketch" symbol="·" label="Marcat suspect" />
    </div>
  );
}

//  TargetCell 

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

  const vState = cellVisualState(cell, isPending, sketched);

  return (
    <motion.div
      className="grid-cell"
      data-state={vState}
      data-interactive={interactive && cell === 'empty' ? 'true' : 'false'}
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
        <span className="ind-miss font-bold text-xl leading-none select-none"></span>
      )}
      {(cell === 'hit' || cell === 'dead') && (
        <motion.span
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 18 }}
          className={`font-black text-xl leading-none select-none ${cell === 'dead' ? 'ind-dead' : 'ind-hit'}`}
        >
          X
        </motion.span>
      )}
      {vState === 'pending' && (
        <motion.div
          className="w-3 h-3 rounded-full"
          style={{ background: 'var(--text-accent)' }}
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 0.6, repeat: Infinity }}
        />
      )}
      {vState === 'sketch' && (
        <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--ind-sketch)', opacity: 0.8 }} />
      )}
    </motion.div>
  );
}

function TargetGrid({ grid, interactive, sketchMap, onShoot, onSketch, lastShot, pendingCell }: TargetGridProps) {
  return (
    <div className="select-none">
      <div className="flex mb-1 ml-7">
        {COL_LABELS.map(l => (
          <div key={l} className="w-10 h-5 flex items-center justify-center text-xs font-mono font-semibold" style={{ color: 'var(--text-muted)' }}>
            {l}
          </div>
        ))}
      </div>
      {grid.map((row, rIdx) => (
        <div key={rIdx} className="flex">
          <div className="w-7 h-10 flex items-center justify-center text-xs font-mono font-semibold" style={{ color: 'var(--text-muted)' }}>
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

//  FleetGrid 

interface FleetGridProps {
  grid: CellState[][];
  lastIncoming: ShotState;
}

function FleetGrid({ grid, lastIncoming }: FleetGridProps) {
  return (
    <div className="select-none">
      <div className="flex mb-1 ml-7">
        {COL_LABELS.map(l => (
          <div key={l} className="w-10 h-5 flex items-center justify-center text-xs font-mono font-semibold" style={{ color: 'var(--text-muted)' }}>
            {l}
          </div>
        ))}
      </div>
      {grid.map((row, rIdx) => (
        <div key={rIdx} className="flex">
          <div className="w-7 h-10 flex items-center justify-center text-xs font-mono font-semibold" style={{ color: 'var(--text-muted)' }}>
            {ROW_LABELS[rIdx]}
          </div>
          {row.map((cell, cIdx) => {
            const isLastHit = lastIncoming?.row === rIdx && lastIncoming?.col === cIdx;
            return (
              <motion.div
                key={cIdx}
                className="grid-cell"
                data-state={cell}
                animate={isLastHit ? { scale: [1, 1.25, 1] } : {}}
                transition={{ duration: 0.3 }}
              >
                {cell === 'miss' && (
                  <span className="ind-miss font-bold text-xl leading-none"></span>
                )}
                {(cell === 'hit' || cell === 'dead') && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 400 }}
                    className={`font-black text-xl leading-none ${cell === 'dead' ? 'ind-dead' : 'ind-hit'}`}
                  >
                    X
                  </motion.span>
                )}
                {cell === 'head' && (
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--ind-head)' }} />
                )}
              </motion.div>
            );
          })}
        </div>
      ))}
    </div>
  );
}