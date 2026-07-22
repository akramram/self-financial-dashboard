/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        'balance-lg': ['2rem', { lineHeight: '1.2', fontWeight: '700' }],
      },
      borderRadius: {
        xs: '4px',
        sm: '6px',
        md: '10px',
        lg: 'var(--radius)',
        xl: '20px',
        '2xl': '28px',
      },
      boxShadow: {
        'elevation-1': '0 1px 3px rgba(0,0,0,0.24), 0 1px 2px rgba(0,0,0,0.32)',
        'elevation-2': '0 4px 12px rgba(0,0,0,0.36), 0 2px 4px rgba(0,0,0,0.24)',
        'elevation-3': '0 8px 24px rgba(0,0,0,0.48), 0 4px 8px rgba(0,0,0,0.32)',
        'glow-mint': '0 0 20px rgba(16,185,129,0.25)',
        'glow-coral': '0 0 20px rgba(239,68,68,0.25)',
        'glow-gold': '0 0 20px rgba(245,158,11,0.25)',
      },
      colors: {
        // ─── Fintech color scales ─────────────────────────
        navy: {
          50: '#eef0f6', 100: '#d5dae8', 200: '#8b97b8',
          300: '#6876a0', 400: '#3d4a73', 500: '#2a3559',
          600: '#1a2240', 700: '#141b33', 800: '#0c1228',
          900: '#090e1f', 950: '#060a18',
        },
        mint: {
          400: '#34d399', 500: '#10b981', 600: '#059669', 700: '#047857',
        },
        coral: {
          400: '#f87171', 500: '#ef4444', 600: '#dc2626', 700: '#b91c1c',
        },
        gold: {
          400: '#fbbf24', 500: '#f59e0b', 600: '#d97706', 700: '#b45309',
        },

        // ─── shadcn/ui semantic (kept for backward compat) ─
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
