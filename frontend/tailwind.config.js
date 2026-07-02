export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      screens: {
        nav: '424px',
      },
      colors: {
        bg: 'var(--color-bg)',
        surface: 'var(--color-surface)',
        ink: 'var(--color-ink)',
        muted: 'var(--color-muted)',
        primary: {
          DEFAULT: 'var(--color-primary)',
          hover: 'var(--color-primary-hover)',
        },
        accent: {
          DEFAULT: 'var(--color-accent)',
          hover: 'var(--color-accent-hover)',
        },
      },
      fontFamily: {
        sans: ['Manrope', 'Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '16px',
      },
      boxShadow: {
        hover: '0 4px 16px oklch(0.200 0.020 280 / 0.08)',
        modal: '0 24px 64px oklch(0.200 0.020 280 / 0.18)',
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
