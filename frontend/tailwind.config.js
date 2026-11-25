/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./public/index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        /* Semantic surface + text pairs — every component uses these. */
        background: 'hsl(var(--background) / <alpha-value>)',
        foreground: 'hsl(var(--foreground) / <alpha-value>)',
        card: 'hsl(var(--card) / <alpha-value>)',
        'card-foreground': 'hsl(var(--card-foreground) / <alpha-value>)',
        popover: 'hsl(var(--popover) / <alpha-value>)',
        'popover-foreground': 'hsl(var(--popover-foreground) / <alpha-value>)',
        muted: 'hsl(var(--muted) / <alpha-value>)',
        'muted-foreground': 'hsl(var(--muted-foreground) / <alpha-value>)',
        subtle: 'hsl(var(--subtle) / <alpha-value>)',
        border: 'hsl(var(--border) / <alpha-value>)',
        input: 'hsl(var(--input) / <alpha-value>)',
        ring: 'hsl(var(--ring) / <alpha-value>)',

        /* Actions */
        primary: 'hsl(var(--primary) / <alpha-value>)',
        'primary-foreground': 'hsl(var(--primary-foreground) / <alpha-value>)',
        'primary-hover': 'hsl(var(--primary-hover) / <alpha-value>)',
        secondary: 'hsl(var(--secondary) / <alpha-value>)',
        'secondary-foreground': 'hsl(var(--secondary-foreground) / <alpha-value>)',
        accent: 'hsl(var(--accent) / <alpha-value>)',
        'accent-foreground': 'hsl(var(--accent-foreground) / <alpha-value>)',

        /* Feedback */
        success: 'hsl(var(--success) / <alpha-value>)',
        'success-foreground': 'hsl(var(--success-foreground) / <alpha-value>)',
        warning: 'hsl(var(--warning) / <alpha-value>)',
        'warning-foreground': 'hsl(var(--warning-foreground) / <alpha-value>)',
        danger: 'hsl(var(--danger) / <alpha-value>)',
        'danger-foreground': 'hsl(var(--danger-foreground) / <alpha-value>)',
        destructive: 'hsl(var(--danger) / <alpha-value>)',
        'destructive-foreground': 'hsl(var(--danger-foreground) / <alpha-value>)',
        info: 'hsl(var(--info) / <alpha-value>)',

        /* Primitive brand ramp kept for compatibility with older markup. */
        brand: {
          50: '#eef8f4',
          100: '#d6efe6',
          200: '#aee0d1',
          300: '#7ccab4',
          400: '#45ab90',
          500: '#228d73',
          600: '#15715c',
          700: '#135a4b',
          800: '#12483d',
          900: '#0f3c33',
          950: '#08231e',
        },
      },
      fontFamily: {
        sans: ['Geist', 'Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['Geist', 'Inter', 'system-ui', 'sans-serif'],
        serif: ['Instrument Serif', 'Iowan Old Style', 'Georgia', 'serif'],
        mono: ['Geist Mono', 'JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      borderRadius: {
        sm: 'calc(var(--radius) - 4px)',
        md: 'calc(var(--radius) - 2px)',
        DEFAULT: 'var(--radius)',
        lg: 'var(--radius)',
        xl: 'calc(var(--radius) + 4px)',
        '2xl': 'calc(var(--radius) + 8px)',
        '3xl': 'calc(var(--radius) + 14px)',
      },
      boxShadow: {
        xs: 'var(--shadow-xs)',
        sm: 'var(--shadow-sm)',
        DEFAULT: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        popover: 'var(--shadow-popover)',
      },
      maxWidth: {
        page: '1200px',
        prose: '68ch',
      },
      spacing: {
        nav: 'var(--nav-height)',
        18: '4.5rem',
      },
      transitionTimingFunction: {
        out: 'cubic-bezier(0.22, 1, 0.36, 1)',
        'in-out': 'cubic-bezier(0.65, 0, 0.35, 1)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.97)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.45' },
        },
        'wave': {
          '0%, 100%': { transform: 'scaleY(0.35)' },
          '50%': { transform: 'scaleY(1)' },
        },
        'typing-dot': {
          '0%, 80%, 100%': { transform: 'scale(0.6)', opacity: '0.35' },
          '40%': { transform: 'scale(1)', opacity: '1' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out both',
        'fade-up': 'fade-up 0.45s cubic-bezier(0.22, 1, 0.36, 1) both',
        'scale-in': 'scale-in 0.3s cubic-bezier(0.22, 1, 0.36, 1) both',
        'pulse-soft': 'pulse-soft 2.4s ease-in-out infinite',
        'wave': 'wave 0.9s ease-in-out infinite',
        'typing-dot': 'typing-dot 1.2s ease infinite',
        'shimmer': 'shimmer 1.8s linear infinite',
      },
    },
  },
  plugins: [],
};
