'use client';

import { useGame } from '@/context/GameContext';

export default function ThemeToggle() {
  const { state, dispatch } = useGame();
  const isBlueprint = state.theme === 'blueprint';

  return (
    <div className="fixed top-3 left-3 z-50 flex rounded-lg overflow-hidden shadow-md" style={{ border: '1px solid var(--bg-panel-border)' }}>
      <button
        onClick={() => dispatch({ type: 'SET_THEME', theme: 'blueprint' })}
        style={{
          padding: '5px 10px',
          fontSize: '11px',
          fontWeight: 700,
          cursor: 'pointer',
          transition: 'all 0.25s',
          background: isBlueprint ? 'var(--text-accent)' : 'var(--bg-panel)',
          color: isBlueprint ? 'var(--btn-primary-text)' : 'var(--text-muted)',
          border: 'none',
          letterSpacing: '0.05em',
        }}
        title="Tema Blueprint (futurist)"
      >
        BLU
      </button>
      <button
        onClick={() => dispatch({ type: 'SET_THEME', theme: 'caiet' })}
        style={{
          padding: '5px 10px',
          fontSize: '11px',
          fontWeight: 700,
          cursor: 'pointer',
          transition: 'all 0.25s',
          background: !isBlueprint ? 'var(--text-accent)' : 'var(--bg-panel)',
          color: !isBlueprint ? 'var(--btn-primary-text)' : 'var(--text-muted)',
          border: 'none',
          borderLeft: '1px solid var(--bg-panel-border)',
          letterSpacing: '0.05em',
        }}
        title="Tema Caiet (nostalgic)"
      >
        CAIET
      </button>
    </div>
  );
}
