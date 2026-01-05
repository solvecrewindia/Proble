/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            fontFamily: {
                sans: ['Outfit', 'sans-serif'],
                display: ['Outfit', 'sans-serif'],
            },
            colors: {
                primary: {
                    DEFAULT: '#0097b2', // User specific blue
                    600: '#007aa6',     // Darker shade
                    foreground: '#e0f7fa',
                    glow: '#4dd2ff',
                },
                secondary: {
                    DEFAULT: '#a855f7', // Purple-500
                    foreground: '#f3e8ff',
                },
                background: 'rgb(var(--color-background) / <alpha-value>)',
                surface: 'rgb(var(--color-surface) / <alpha-value>)',
                'surface-highlight': 'rgb(var(--color-surface-highlight) / <alpha-value>)',
                muted: 'rgb(var(--color-muted) / <alpha-value>)',
                text: 'rgb(var(--color-text) / <alpha-value>)',
                'text-secondary': 'rgb(var(--color-text-secondary) / <alpha-value>)',
                border: 'rgb(var(--color-border) / <alpha-value>)',

                // Glassmorphism specific
                glass: {
                    DEFAULT: 'rgba(255, 255, 255, 0.05)',
                    hover: 'rgba(255, 255, 255, 0.1)',
                    border: 'rgba(255, 255, 255, 0.1)',
                },

                // Semantic
                success: '#10b981',
                warning: '#f59e0b',
                error: '#ef4444',
            },
            backgroundImage: {
                'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
                'card-gradient': 'linear-gradient(180deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)',
                'glow-gradient': 'conic-gradient(from 180deg at 50% 50%, #2a8af6 0deg, #a853ba 180deg, #e92a67 360deg)',
            },
            boxShadow: {
                'glass': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                'neon': '0 0 5px theme("colors.primary.DEFAULT"), 0 0 20px theme("colors.primary.DEFAULT")',
            },
            keyframes: {
                fadeInScale: {
                    '0%': { opacity: '0', transform: 'scale(0.95)' },
                    '100%': { opacity: '1', transform: 'scale(1)' },
                },
                wiggle: {
                    '0%, 100%': { transform: 'rotate(-3deg)' },
                    '50%': { transform: 'rotate(3deg)' },
                }
            },
            animation: {
                fadeInScale: 'fadeInScale 0.2s ease-out forwards',
                wiggle: 'wiggle 0.3s ease-in-out infinite',
            },
        },
    },
    plugins: [],
}
