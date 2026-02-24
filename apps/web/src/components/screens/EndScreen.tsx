'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { getSocket } from '@/lib/socket';
import { useGame } from '@/context/GameContext';
import { useTranslation } from '@/lib/i18n';

export default function EndScreen() {
  const { state, dispatch } = useGame();
  const t = useTranslation(state.lang);
  const [rematchRequested, setRematchRequested] = useState(false);

  const accuracy = state.myStats && state.myStats.totalShots > 0
    ? Math.round((state.myStats.hits / state.myStats.totalShots) * 100)
    : 0;

  function handleRematch() {
    const socket = getSocket();
    socket.emit('rematch');
    setRematchRequested(true);
  }

  function handleHome() {
    const socket = getSocket();
    socket.emit('leave_room');
    socket.disconnect();
    dispatch({ type: 'RESET' });
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">

      {/* Victory / Defeat */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="text-center mb-8"
      >
        <div className="mb-6">
          <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full border-2 font-black text-2xl tracking-widest ${
            state.didIWin
              ? 'border-cyan-400/50 bg-cyan-400/10 text-cyan-400'
              : 'border-red-400/50 bg-red-400/10 text-red-400'
          }`}>
            {state.didIWin ? 'WIN' : 'GG'}
          </div>
        </div>
        <h1 className={`text-5xl font-bold tracking-tight mb-2 ${
          state.didIWin ? 'text-cyan-400' : 'text-red-400'
        }`}>
          {state.didIWin ? t('victory') : t('defeat')}
        </h1>
        {state.winnerNickname && (
          <p className="text-slate-400 text-base">
            {state.didIWin
              ? `Felicitări, ${state.nickname}!`
              : `${state.winnerNickname} a câștigat.`
            }
          </p>
        )}
      </motion.div>

      {/* Stats */}
      {state.myStats && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-panel p-6 w-full max-w-sm mb-6"
        >
          <h2 className="text-cyan-400/70 text-xs uppercase tracking-widest mb-4">{t('statsTitle')}</h2>
          <div className="flex flex-col gap-3">
            <StatRow label={t('totalShots')} value={state.myStats.totalShots} />
            <StatRow label={t('hitsLabel')} value={state.myStats.hits} color="text-amber-400" />
            <StatRow label={t('missesLabel')} value={state.myStats.misses} color="text-slate-500" />
            <div className="border-t border-navy-600 pt-3 mt-1">
              <StatRow
                label={t('accuracyLabel')}
                value={`${accuracy}%`}
                color={accuracy >= 60 ? 'text-emerald-400' : accuracy >= 40 ? 'text-amber-400' : 'text-red-400'}
              />
            </div>
          </div>
        </motion.div>
      )}

      {/* Acțiuni */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="flex flex-col gap-3 w-full max-w-sm"
      >
        {!rematchRequested ? (
          <button className="btn-primary text-lg py-4" onClick={handleRematch}>
            🔄 {t('rematch')}
          </button>
        ) : (
          <div className="glass-panel p-4 text-center">
            <div className="flex items-center justify-center gap-2 text-cyan-400 text-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400"></span>
              </span>
              Aștepți confirmarea revanșei...
            </div>
            <p className="text-slate-500 text-xs mt-1">{t('opponentRequestedRematch')}</p>
          </div>
        )}
        <button className="btn-secondary" onClick={handleHome}>
          🏠 {t('backHome')}
        </button>
      </motion.div>
    </div>
  );
}

function StatRow({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-slate-400 text-sm">{label}</span>
      <span className={`font-bold text-sm ${color || 'text-slate-200'}`}>{value}</span>
    </div>
  );
}
