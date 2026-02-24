'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { CellState, GRID_SIZE } from '@avioane/shared';
import clsx from 'clsx';

interface GridProps {
  grid: CellState[][];
  onCellClick?: (row: number, col: number) => void;
  hoveredCells?: Set<string>;           // preview plasare avion
  headCells?: Set<string>;              // celulă cap (roșu distinct)
  interactive?: boolean;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  dimmed?: boolean;                     // când nu e rândul tău
}

const SIZE_MAP = {
  sm: 'w-7 h-7 text-xs',
  md: 'w-9 h-9 text-sm',
  lg: 'w-11 h-11 text-base',
};

const COL_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const ROW_LABELS = ['1', '2', '3', '4', '5', '6', '7', '8'];

function getCellStyle(state: CellState, isHead?: boolean): string {
  switch (state) {
    case 'plane':
      return 'bg-navy-600/80 border-cyan-400/30';
    case 'head':
      return 'bg-cyan-400/20 border-cyan-400/60';
    case 'miss':
      return 'bg-navy-800/80 border-slate-600/40';
    case 'hit':
      return 'bg-amber-500/40 border-amber-400/60';
    case 'dead':
      return 'bg-red-600/50 border-red-400/60';
    default:
      return 'bg-navy-900/50 border-navy-600/30 hover:bg-navy-700/50 hover:border-cyan-400/30';
  }
}

function getCellContent(state: CellState): React.ReactNode {
  switch (state) {
    case 'miss':
      return <span className="text-slate-500 font-bold">·</span>;
    case 'hit':
      return <span className="text-amber-400 font-bold text-lg leading-none">✕</span>;
    case 'dead':
      return <span className="text-red-400 font-bold text-lg leading-none">✕</span>;
    case 'head':
      return <span className="text-cyan-400 text-xs">◆</span>;
    default:
      return null;
  }
}

export default function Grid({
  grid,
  onCellClick,
  hoveredCells = new Set(),
  headCells = new Set(),
  interactive = false,
  size = 'md',
  label,
  dimmed = false,
}: GridProps) {
  const cellSize = SIZE_MAP[size];

  return (
    <div className={clsx('select-none transition-opacity duration-300', dimmed && 'opacity-50')}>
      {label && (
        <div className="text-cyan-400/70 text-xs font-bold uppercase tracking-widest mb-2">
          {label}
        </div>
      )}
      <div className="inline-block">
        {/* Etichete coloane */}
        <div className={clsx('flex mb-1 ml-6')}>
          {COL_LABELS.map(l => (
            <div key={l} className={clsx(cellSize, 'flex items-center justify-center text-navy-500 text-xs font-mono font-semibold')}>
              {l}
            </div>
          ))}
        </div>

        {/* Rânduri */}
        {grid.map((row, rIdx) => (
          <div key={rIdx} className="flex">
            {/* Etichetă rând */}
            <div className={clsx('w-6 flex items-center justify-center text-navy-500 text-xs font-mono font-semibold flex-shrink-0')}>
              {ROW_LABELS[rIdx]}
            </div>

            {row.map((cell, cIdx) => {
              const key = `${rIdx},${cIdx}`;
              const isHovered = hoveredCells.has(key);
              const isHeadPreview = headCells.has(key);
              const isDead = cell === 'dead';
              const isHit = cell === 'hit';

              return (
                <motion.div
                  key={cIdx}
                  className={clsx(
                    cellSize,
                    'border flex items-center justify-center rounded-sm cursor-default',
                    'transition-colors duration-100',
                    interactive && onCellClick && cell === 'empty' && 'cursor-crosshair',
                    isHovered && !isHeadPreview && 'bg-cyan-400/15 border-cyan-400/50',
                    isHeadPreview && 'bg-cyan-400/30 border-cyan-400/80',
                    !isHovered && !isHeadPreview && getCellStyle(cell),
                  )}
                  onClick={() => interactive && onCellClick?.(rIdx, cIdx)}
                  whileTap={interactive && cell === 'empty' ? { scale: 0.9 } : undefined}
                  animate={isDead ? { backgroundColor: 'rgba(220,38,38,0.4)' } : {}}
                >
                  <AnimatePresence mode="wait">
                    {(cell !== 'empty' && cell !== 'plane' && cell !== 'head') && (
                      <motion.div
                        key={cell + key}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={isDead
                          ? { scale: [0, 1.5, 1], opacity: 1 }
                          : { scale: 1, opacity: 1 }
                        }
                        transition={{ duration: isDead ? 0.5 : 0.2 }}
                      >
                        {getCellContent(cell)}
                      </motion.div>
                    )}
                    {(cell === 'head' || cell === 'plane') && (
                      <motion.div
                        key={cell + key}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.15 }}
                      >
                        {getCellContent(cell)}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
