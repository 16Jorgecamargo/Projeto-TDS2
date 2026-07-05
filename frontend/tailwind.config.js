export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      screens: {
        nav: '424px',
      },
      maxWidth: {
        app: '1400px',
      },
      colors: {
        bg: 'var(--color-bg)',
        surface: 'var(--color-surface)',
        ink: 'var(--color-ink)',
        muted: 'var(--color-muted)',
        border: 'var(--color-border)',
        focus: 'var(--color-focus)',
        overlay: 'var(--color-overlay)',
        primary: {
          DEFAULT: 'var(--color-primary)',
          hover: 'var(--color-primary-hover)',
        },
        accent: {
          DEFAULT: 'var(--color-accent)',
          hover: 'var(--color-accent-hover)',
        },
        success: {
          DEFAULT: 'var(--color-success)',
          hover: 'var(--color-success-hover)',
        },
        warning: {
          DEFAULT: 'var(--color-warning)',
          hover: 'var(--color-warning-hover)',
        },
        danger: {
          DEFAULT: 'var(--color-danger)',
          hover: 'var(--color-danger-hover)',
        },
        info: {
          DEFAULT: 'var(--color-info)',
          hover: 'var(--color-info-hover)',
        },
      },
      fontFamily: {
        sans: ['Manrope', 'Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        display: ['3rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        h1: ['2.25rem', { lineHeight: '1.15', letterSpacing: '-0.02em' }],
        h2: ['1.875rem', { lineHeight: '1.2', letterSpacing: '-0.01em' }],
        h3: ['1.5rem', { lineHeight: '1.25' }],
        h4: ['1.25rem', { lineHeight: '1.3' }],
        'body-lg': ['1.125rem', { lineHeight: '1.5' }],
        'body-md': ['1rem', { lineHeight: '1.5' }],
        'body-sm': ['0.875rem', { lineHeight: '1.45' }],
        caption: ['0.75rem', { lineHeight: '1.4' }],
        label: ['0.8125rem', { lineHeight: '1.3', letterSpacing: '0.01em', fontWeight: '600' }],
        button: ['0.9375rem', { lineHeight: '1', fontWeight: '600' }],
      },
      borderRadius: {
        xs: '4px',
        sm: '6px',
        md: '10px',
        lg: '16px',
        xl: '20px',
        '2xl': '28px',
        full: '9999px',
      },
      boxShadow: {
        xs: '0 1px 2px oklch(0.200 0.020 280 / 0.06)',
        sm: '0 2px 6px oklch(0.200 0.020 280 / 0.07)',
        hover: '0 4px 16px oklch(0.200 0.020 280 / 0.08)',
        md: '0 4px 16px oklch(0.200 0.020 280 / 0.08)',
        lg: '0 12px 32px oklch(0.200 0.020 280 / 0.12)',
        modal: '0 24px 64px oklch(0.200 0.020 280 / 0.18)',
        xl: '0 24px 64px oklch(0.200 0.020 280 / 0.18)',
        floating: '0 8px 24px oklch(0.200 0.020 280 / 0.14)',
      },
      zIndex: {
        dropdown: '20',
        sticky: '30',
        'modal-backdrop': '40',
        modal: '50',
        toast: '60',
        tooltip: '70',
      },
    },
  },
  plugins: [],
};
