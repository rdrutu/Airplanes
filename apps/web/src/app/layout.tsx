import type { Metadata } from 'next';
import './globals.css';
import { GameProvider } from '@/context/GameContext';

export const metadata: Metadata = {
  title: 'Avioane Online',
  description: 'Jocul clasic de pe caietul de matematică, acum online. Plasează avioanele, trage, câștigă!',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ro">
      <body suppressHydrationWarning>
        <GameProvider>
          {children}
        </GameProvider>
      </body>
    </html>
  );
}
