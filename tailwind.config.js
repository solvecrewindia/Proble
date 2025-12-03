/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: '#0ebcdb', // User requested blue
                    600: '#0c9ab3', // Darker shade for hover
                },
                background: 'rgb(var(--color-background) / <alpha-value>)',
                surface: 'rgb(var(--color-surface) / <alpha-value>)',
                muted: 'rgb(var(--color-muted) / <alpha-value>)',
                text: 'rgb(var(--color-text) / <alpha-value>)',
                neutral: {
                    900: '#1A1A1A',
                    700: '#4A4A4A',
                    500: '#858585',
                },
                bg: '#F5F7FA',
            },
            fontFamily: {
                sans: ['Montserrat', 'sans-serif'],
            },
            spacing: {
                '15': '3.75rem', // 60px
            }
        },
    },
    plugins: [],
}
