/** @type {import('tailwindcss').Config} */
export default {
  // Dark mode follows the app setting (html.dark), not only the OS preference.
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      keyframes: {
        flip: {
          '0%': { transform: 'rotateY(0deg)', zIndex: '10' },
          '20%': { transform: 'rotateY(-180deg)', zIndex: '10' },
          '50%': { zIndex: '0' },
          '100%': { transform: 'rotateY(-180deg)', zIndex: '0' },
        },
        bookCover: {
          '0%': { transform: 'rotateY(0deg)' },
          '40%': { transform: 'rotateY(0deg)' },
          '60%': { transform: 'rotateY(-180deg)' },
          '100%': { transform: 'rotateY(-180deg)' },
        },
      },
      animation: {
        flip: 'flip 2s ease-in-out infinite',
        bookCover: 'bookCover 2s ease-in-out infinite',
      },
      fontFamily: {
        sans: ['Roboto', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['Mulish', '"Museo Sans"', 'Roboto', 'sans-serif'],
        heading: ['Mulish', '"Museo Sans"', 'Roboto', 'sans-serif'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
}