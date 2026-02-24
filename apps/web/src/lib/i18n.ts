import { Language } from '@/context/GameContext';

const translations = {
  ro: {
    // Home
    homeTitle: 'Avioane',
    homeSubtitle: 'Jocul clasic, acum online',
    homeTagline: 'Caiet de matematică. Două pixuri. Strategie pură.',
    createRoom: 'Creează Cameră',
    joinRoom: 'Alătură-te',
    enterCode: 'Introdu codul camerei',
    enterNickname: 'Nickname-ul tău',
    join: 'Intră',
    waitingForOpponent: 'Aștepți adversarul...',
    sharecode: 'Trimite codul prietenului tău:',

    // Setup
    setupTitle: 'Plasează Avioanele',
    setupSubtitle: 'Ai 3 avioane. Plasează-le strategic.',
    rotate: 'Rotire',
    ready: 'Gata! Să luptăm!',
    opponentReady: 'Adversarul e gata!',
    waitingOpponentSetup: 'Adversarul plasează avioanele...',
    planeN: 'Avion Nord',
    planeE: 'Avion Est',
    planeS: 'Avion Sud',
    planeW: 'Avion Vest',
    selectPlane: 'Selectează avionul',
    planeHint: 'Click pe grilă pentru a plasa. Rotește cu butonul ↻',

    // Battle
    battleFleet: 'Flota Ta',
    battleTargets: 'Ținte',
    yourTurn: 'Rândul tău!',
    waitTurn: 'Adversarul trage...',
    miss: 'Aer!',
    hit: 'Lovit!',
    dead: 'MORT!',
    shotsInfo: 'lovituri',
    missInfo: 'ratate',

    // End
    victory: 'VICTORIE!',
    defeat: 'ÎNFRÂNGERE!',
    statsTitle: 'Statistici',
    totalShots: 'Total lovituri:',
    hitsLabel: 'Nimerite:',
    missesLabel: 'Ratate:',
    accuracyLabel: 'Precizie:',
    rematch: 'Revanșă!',
    backHome: 'Acasă',
    opponentRequestedRematch: 'Adversarul vrea revanșă!',
    opponentLeft: 'Adversarul a deconectat.',

    // Misc
    connecting: 'Conectare...',
    error: 'Eroare',
    back: '← Înapoi',
    copied: 'Copiat!',
    copyCode: 'Copiază codul',
    plane: 'Avion',
    of: 'din',
  },
  en: {
    homeTitle: 'Airplanes',
    homeSubtitle: 'The classic game, now online',
    homeTagline: 'Math notebook. Two pens. Pure strategy.',
    createRoom: 'Create Room',
    joinRoom: 'Join a Room',
    enterCode: 'Enter room code',
    enterNickname: 'Your nickname',
    join: 'Join',
    waitingForOpponent: 'Waiting for opponent...',
    sharecode: 'Send this code to your friend:',

    setupTitle: 'Place Your Planes',
    setupSubtitle: 'You have 3 planes. Place them strategically.',
    rotate: 'Rotate',
    ready: 'Ready! Let\'s fight!',
    opponentReady: 'Opponent is ready!',
    waitingOpponentSetup: 'Opponent is placing planes...',
    planeN: 'Plane North',
    planeE: 'Plane East',
    planeS: 'Plane South',
    planeW: 'Plane West',
    selectPlane: 'Select plane',
    planeHint: 'Click on grid to place. Rotate with ↻ button',

    battleFleet: 'Your Fleet',
    battleTargets: 'Targets',
    yourTurn: 'Your turn!',
    waitTurn: 'Opponent is shooting...',
    miss: 'Miss!',
    hit: 'Hit!',
    dead: 'DEAD!',
    shotsInfo: 'shots',
    missInfo: 'missed',

    victory: 'VICTORY!',
    defeat: 'DEFEAT!',
    statsTitle: 'Stats',
    totalShots: 'Total shots:',
    hitsLabel: 'Hits:',
    missesLabel: 'Misses:',
    accuracyLabel: 'Accuracy:',
    rematch: 'Rematch!',
    backHome: 'Home',
    opponentRequestedRematch: 'Opponent wants a rematch!',
    opponentLeft: 'Opponent disconnected.',

    connecting: 'Connecting...',
    error: 'Error',
    back: '← Back',
    copied: 'Copied!',
    copyCode: 'Copy code',
    plane: 'Plane',
    of: 'of',
  },
} as const;

export type TranslationKey = keyof typeof translations.ro;

export function useTranslation(lang: Language) {
  return (key: TranslationKey): string => translations[lang][key];
}

export default translations;
