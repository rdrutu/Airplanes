import type { Metadata, Viewport } from 'next';
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

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
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
