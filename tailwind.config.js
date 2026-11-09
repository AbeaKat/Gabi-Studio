/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        nacre: {
          50: '#FAF8F6',   // Background principal blanco perla cálido
          100: '#F4EFEA',  // Sidebar y paneles secundarios suaves
          200: '#E6E0D6',  // Bordes y divisores neutros
          300: '#D5CCBF',
          400: '#B8AB98',
          500: '#9B8C77',
          600: '#7D6F5C',
          700: '#5F5345',
          800: '#433B31',
          900: '#2A241F',
        },
        coral: {
          50: '#FFF1EF',   // Fondos badges / selección suave
          100: '#FFE1DC',  // Acento suave
          200: '#FFC5BC',
          300: '#FFA496',
          400: '#FA8271',
          500: '#F26B5B',  // Living Coral - Primario / Botones CTA
          600: '#E05343',  // Hover primario
          700: '#C23E30',
          800: '#9F3327',
          900: '#832D24',
        },
        deepSlate: {
          900: '#1E242B',  // Texto principal
          700: '#334155',  // Texto intermedio
          500: '#64748B',  // Texto secundario / labels
          400: '#94A3B8',  // Placeholders y bordes secundarios
        },
        financial: {
          healthy: '#0D9488',     // Verde esmeralda / Margen > 35%
          healthyBg: '#F0FDFA',
          warning: '#F59E0B',     // Ámbar cálido / Margen 15% - 34%
          warningBg: '#FEF3C7',
          danger: '#E11D48',      // Rosa frambuesa / Margen < 15% o sin stock
          dangerBg: '#FFE4E6',
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      backgroundImage: {
        'pearl-gradient': 'linear-gradient(135deg, #FAF8F6 0%, #FFFDFB 50%, #F7EFEA 100%)',
        'coral-gradient': 'linear-gradient(135deg, #F26B5B 0%, #FA8271 100%)',
      },
      boxShadow: {
        'nacre-card': '0 4px 20px -2px rgba(30, 36, 43, 0.05), 0 2px 6px -1px rgba(30, 36, 43, 0.03)',
        'coral-glow': '0 8px 24px -4px rgba(242, 107, 91, 0.35)',
        'modal-depth': '0 25px 50px -12px rgba(30, 36, 43, 0.18), 0 0 0 1px rgba(230, 224, 214, 0.6)',
      },
      transitionTimingFunction: {
        'out-natural': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        modalEnter: {
          '0%': { opacity: '0', transform: 'scale(0.97) translateY(8px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        cellSuccessPulse: {
          '0%': { backgroundColor: '#F0FDFA' },
          '100%': { backgroundColor: 'transparent' },
        },
      },
      animation: {
        'fade-in': 'fadeIn 200ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'modal-enter': 'modalEnter 320ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-down': 'slideDown 220ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'cell-success': 'cellSuccessPulse 700ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
      }
    },
  },
  plugins: [],
}

