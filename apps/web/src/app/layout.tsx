import type { Metadata } from 'next';
import './globals.css';
import { GameProvider } from '@/context/GameContext';
import ThemeToggle from '@/components/ThemeToggle';

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
          <ThemeToggle />
          {children}
        </GameProvider>
      </body>
    </html>
  );
}
