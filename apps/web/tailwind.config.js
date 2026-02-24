/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#020818',
          900: '#0a1628',
          800: '#0d1f3c',
          700: '#162a4a',
          600: '#1e3a5f',
          500: '#2a4f7c',
        },
        cyan: {
          400: '#22d3ee',
          300: '#67e8f9',
        },
        amber: {
          400: '#fbbf24',
          500: '#f59e0b',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Courier New', 'monospace'],
      },
      animation: {
        'radar-pulse': 'radarPulse 0.6s ease-out forwards',
        'cell-shake': 'cellShake 0.4s ease-in-out',
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'plane-fall': 'planeFall 1s ease-in forwards',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
      },
      keyframes: {
        radarPulse: {
          '0%':   { transform: 'scale(1)',   opacity: '1' },
          '50%':  { transform: 'scale(1.4)', opacity: '0.7' },
          '100%': { transform: 'scale(1)',   opacity: '1' },
        },
        cellShake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-3px)' },
          '40%': { transform: 'translateX(3px)' },
          '60%': { transform: 'translateX(-2px)' },
          '80%': { transform: 'translateX(2px)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        planeFall: {
          '0%':   { transform: 'translateY(0) rotate(0deg)',    opacity: '1' },
          '100%': { transform: 'translateY(40px) rotate(45deg)', opacity: '0' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 5px rgba(34,211,238,0.3)' },
          '50%':       { boxShadow: '0 0 20px rgba(34,211,238,0.7)' },
        },
      },
    },
  },
  plugins: [],
};
