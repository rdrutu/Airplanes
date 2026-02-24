'use client';

import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGame } from '@/context/GameContext';
import { useSocketEvents } from '@/hooks/useSocketEvents';
import HomeScreen from '@/components/screens/HomeScreen';
import SetupScreen from '@/components/screens/SetupScreen';
import BattleScreen from '@/components/screens/BattleScreen';
import EndScreen from '@/components/screens/EndScreen';

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
  exit:    { opacity: 0, y: -20, transition: { duration: 0.2 } },
};

export default function Page() {
  const { state } = useGame();

  // Înregistrăm toți listenerii Socket.io o singură dată
  useSocketEvents();

  return (
    <main>
      <AnimatePresence mode="wait">
        {state.phase === 'home' && (
          <motion.div key="home" variants={pageVariants} initial="initial" animate="animate" exit="exit">
            <HomeScreen />
          </motion.div>
        )}
        {state.phase === 'setup' && (
          <motion.div key="setup" variants={pageVariants} initial="initial" animate="animate" exit="exit">
            <SetupScreen />
          </motion.div>
        )}
        {state.phase === 'battle' && (
          <motion.div key="battle" variants={pageVariants} initial="initial" animate="animate" exit="exit">
            <BattleScreen />
          </motion.div>
        )}
        {state.phase === 'finished' && (
          <motion.div key="finished" variants={pageVariants} initial="initial" animate="animate" exit="exit">
            <EndScreen />
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
