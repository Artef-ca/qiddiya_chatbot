export const theme = {
  colors: {
    // Primary Colors - Electric Violet Palette
    primary: {
      DEFAULT: '#7122F4',     // Main purple - Electric Violet 600
      light: '#8955FD',       // Electric Violet 500 - lighter shade for hover states
      dark: '#5B1BBC',        // Electric Violet 800 - darker shade for active states
      50: '#F5F2FF',          // Electric Violet 50 - very light background
      100: '#ECE8FF',         // Electric Violet 100 - light background
      200: '#DCD4FF',         // Electric Violet 200
      300: '#C3B2FF',         // Electric Violet 300 - light border/outline
      400: '#A686FF',         // Electric Violet 400
      500: '#8955FD',         // Electric Violet 500 - main color
      600: '#7122F4',         // Electric Violet 600 - DEFAULT
      700: '#6C20E1',         // Electric Violet 700
      800: '#5B1BBC',         // Electric Violet 800
      900: '#4C189A',         // Electric Violet 900
      950: '#2E0C69',         // Electric Violet 950 - darkest shade
    },

    // Secondary Colors - Picton Blue Palette
    secondary: {
      DEFAULT: '#0093D4',     // Picton Blue 600 - used for secondary actions and active tabs
      light: '#0BC0FF',       // Picton Blue 500 - lighter shade
      dark: '#0075AB',        // Picton Blue 700 - darker shade
      50: '#EFFAFF',          // Picton Blue 50
      100: '#DEF4FF',         // Picton Blue 100
      200: '#B6EBFF',         // Picton Blue 200
      300: '#75DDFF',         // Picton Blue 300
      400: '#2CCDFF',         // Picton Blue 400
      500: '#0BC0FF',         // Picton Blue 500
      600: '#0093D4',         // Picton Blue 600 - DEFAULT
      700: '#0075AB',         // Picton Blue 700
      800: '#00628D',         // Picton Blue 800
      900: '#065274',         // Picton Blue 900
      950: '#04344D',         // Picton Blue 950
    },

    // Accent Colors
    accent: {
      // Lucky Point Blue Palette (for info/context)
      blue: {
        DEFAULT: '#1360FF',   // Lucky Point 500 - Blue for info/context
        50: '#E4F5FF',        // Lucky Point 50
        100: '#CFEBFF',       // Lucky Point 100
        200: '#A8D9FF',       // Lucky Point 200
        300: '#74BEFF',       // Lucky Point 300
        400: '#3E8FFF',       // Lucky Point 400
        500: '#1360FF',       // Lucky Point 500 - DEFAULT
        600: '#004CFF',       // Lucky Point 600
        700: '#004CFF',       // Lucky Point 700
        800: '#0044E4',       // Lucky Point 800
        900: '#002FB0',       // Lucky Point 900
        950: '#001B72',       // Lucky Point 950
      },
      // Sun Yellow Palette (for stars/warnings)
      yellow: {
        DEFAULT: '#FFAD05',   // Sun 500 - Yellow for stars/warnings
        50: '#FFFDEA',        // Sun 50
        100: '#FFF7C5',       // Sun 100
        200: '#FFEE85',       // Sun 200
        300: '#FFDF46',       // Sun 300
        400: '#FFCD1B',       // Sun 400
        500: '#FFAD05',       // Sun 500 - DEFAULT
        600: '#E28200',       // Sun 600
        700: '#BB5A02',       // Sun 700
        800: '#984508',       // Sun 800
        900: '#7C390B',       // Sun 900
        950: '#481C00',       // Sun 950
      },
      // Sorbus Orange Palette (for delete actions)
      orange: {
        DEFAULT: '#FF900A',   // Sorbus 500 - Orange for delete actions
        50: '#FFF9EC',        // Sorbus 50
        100: '#FFF3D3',       // Sorbus 100
        200: '#FFE3A5',       // Sorbus 200
        300: '#FFCD6D',       // Sorbus 300
        400: '#FFAB32',       // Sorbus 400
        500: '#FF900A',       // Sorbus 500 - DEFAULT
        600: '#FF7800',       // Sorbus 600
        700: '#CC5702',       // Sorbus 700
        800: '#A1430B',       // Sorbus 800
        900: '#82390C',       // Sorbus 900
        950: '#461A04',       // Sorbus 950
      },
    },

    // Neutral/Gray Colors - Lynch Palette (cool gray with blue undertone)
    gray: {
      50: '#F6F7F9',         // Lynch 50 - lightest background
      100: '#ECEEF2',        // Lynch 100 - light background
      200: '#D5D9E2',        // Lynch 200 - border/hover
      300: '#B1BBC8',        // Lynch 300 - border
      400: '#8695AA',        // Lynch 400 - muted text/icons
      500: '#64748B',        // Lynch 500 - medium text
      600: '#526077',        // Lynch 600 - dark text
      700: '#434E61',        // Lynch 700 - darker text
      800: '#3A4252',        // Lynch 800 - very dark text/buttons
      900: '#343A46',        // Lynch 900 - darkest text
      950: '#23272E',        // Lynch 950
    },

    // Jumbo Neutral Gray (for additional neutral tones)
    neutral: {
      50: '#F5F5F6',         // Jumbo 50
      100: '#E6E6E7',        // Jumbo 100
      200: '#CFCFD2',        // Jumbo 200
      300: '#ADADB3',        // Jumbo 300
      400: '#84848C',        // Jumbo 400
      500: '#71717A',        // Jumbo 500
      600: '#5A5A60',        // Jumbo 600
      700: '#4D4C52',        // Jumbo 700
      800: '#434347',        // Jumbo 800
      900: '#3C3B3E',        // Jumbo 900
      950: '#252527',        // Jumbo 950
    },

    // Semantic Colors
    background: {
      DEFAULT: '#FFFFFF',    // White background
      secondary: '#F6F7F9',  // Lynch 50 - used for page backgrounds
      tertiary: '#ECEEF2',   // Lynch 100 - used for hover states
    },

    text: {
      primary: '#343A46',    // Lynch 900 - main text
      secondary: '#64748B', // Lynch 500 - secondary text
      muted: '#8695AA',      // Lynch 400 - muted text
      inverse: '#FFFFFF',    // White text on dark backgrounds
    },

    border: {
      DEFAULT: '#D5D9E2',    // Lynch 200 - default borders
      light: '#ECEEF2',      // Lynch 100 - light borders
      medium: '#B1BBC8',     // Lynch 300 - medium borders
      focus: '#C3B2FF',      // Electric Violet 300 - focus borders
    },

    // Status Colors - Using designer palettes where possible
    // Note: Some colors don't match designer palettes - listed for review
    success: '#15D27D',      // Spring Green 500 - success state
    warning: '#FFAD05',      // Sun 500 - warning state (using accent yellow)
    error: '#E8604B',         // Punch 500 - error state
    info: '#1360FF',         // Lucky Point 500 - info state (using accent blue)

    // Code/Technical Colors
    code: {
      background: '#3A4252',  // Lynch 800 - code block background
      text: '#ECEEF2',        // Lynch 100 - code text
      inline: {
        background: '#ECEEF2',  // Lynch 100 - inline code background
        text: '#4C189A',        // Electric Violet 900 - inline code text
      },
    },
  },

  // Gradient Definitions
  gradients: {
    primary: 'from-purple-600 to-purple-700',
    userAvatar: 'from-purple-600 to-purple-700',
    profileAvatar: 'from-blue-400 to-blue-500',
  },

  // Shadow Definitions
  shadows: {
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
  },

  // Spacing Scale
  spacing: {
    xs: '4px',
    sm: '8px',
    sm2: '12px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    '2xl': '40px',
  },

  // Border Radius Scale
  borderRadius: {
    sm: '2px',
    base: '4px',
    md: '8px',
    lg: '12px',
    xl: '24px',
  },

  // Typography Scale
  typography: {
    // Display Styles
    display: {
      large: {
        size: '64px',
        lineHeight: '1.2',
        className: 'text-display-large',
      },
      medium: {
        size: '51px',
        lineHeight: '1.2',
        className: 'text-display-medium',
      },
      small: {
        size: '40px',
        lineHeight: '1.2',
        className: 'text-display-small',
      },
    },
    // Headline Styles
    headline: {
      large: {
        size: '32px',
        lineHeight: '1.25',
        className: 'text-headline-large',
      },
      medium: {
        size: '25px',
        lineHeight: '1.3',
        className: 'text-headline-medium',
      },
      small: {
        size: '20px',
        lineHeight: '1.4',
        className: 'text-headline-small',
      },
    },
    // Text Styles
    text: {
      large: {
        size: '18px',
        lineHeight: '1.5',
        className: 'text-large',
      },
      base: {
        size: '16px',
        lineHeight: '1.5',
        className: 'text-base',
      },
      small: {
        size: '13px',
        lineHeight: '1.5',
        className: 'text-small',
      },
      tiny: {
        size: '10px',
        lineHeight: '1.4',
        className: 'text-tiny',
      },
    },
    // Font Weights
    weights: {
      light: {
        value: 300,
        className: 'font-light',
      },
      regular: {
        value: 400,
        className: 'font-regular',
      },
      medium: {
        value: 500,
        className: 'font-medium',
      },
      semibold: {
        value: 600,
        className: 'font-semibold',
      },
      bold: {
        value: 700,
        className: 'font-bold',
      },
    },
  },
} as const;

/**
 * Helper function to get theme color
 * Usage: theme.colors.primary.DEFAULT
 */
export type Theme = typeof theme;

/**
 * CSS Variable Names (for use in globals.css)
 */
export const cssVariables = {
  // Primary colors
  '--color-primary': theme.colors.primary.DEFAULT,
  '--color-primary-light': theme.colors.primary.light,
  '--color-primary-dark': theme.colors.primary.dark,
  '--color-primary-50': theme.colors.primary[50],
  '--color-primary-100': theme.colors.primary[100],
  '--color-primary-200': theme.colors.primary[200],
  '--color-primary-300': theme.colors.primary[300],
  '--color-primary-400': theme.colors.primary[400],
  '--color-primary-500': theme.colors.primary[500],
  '--color-primary-600': theme.colors.primary[600],
  '--color-primary-700': theme.colors.primary[700],
  '--color-primary-800': theme.colors.primary[800],
  '--color-primary-900': theme.colors.primary[900],
  '--color-primary-950': theme.colors.primary[950],

  // Secondary colors
  '--color-secondary': theme.colors.secondary.DEFAULT,
  '--color-secondary-light': theme.colors.secondary.light,
  '--color-secondary-dark': theme.colors.secondary.dark,
  '--color-secondary-50': theme.colors.secondary[50],
  '--color-secondary-100': theme.colors.secondary[100],
  '--color-secondary-200': theme.colors.secondary[200],
  '--color-secondary-300': theme.colors.secondary[300],
  '--color-secondary-400': theme.colors.secondary[400],
  '--color-secondary-500': theme.colors.secondary[500],
  '--color-secondary-600': theme.colors.secondary[600],
  '--color-secondary-700': theme.colors.secondary[700],
  '--color-secondary-800': theme.colors.secondary[800],
  '--color-secondary-900': theme.colors.secondary[900],
  '--color-secondary-950': theme.colors.secondary[950],

  // Accent colors
  '--color-accent-blue': theme.colors.accent.blue.DEFAULT,
  '--color-accent-blue-50': theme.colors.accent.blue[50],
  '--color-accent-blue-100': theme.colors.accent.blue[100],
  '--color-accent-blue-200': theme.colors.accent.blue[200],
  '--color-accent-blue-300': theme.colors.accent.blue[300],
  '--color-accent-blue-400': theme.colors.accent.blue[400],
  '--color-accent-blue-500': theme.colors.accent.blue[500],
  '--color-accent-blue-600': theme.colors.accent.blue[600],
  '--color-accent-blue-700': theme.colors.accent.blue[700],
  '--color-accent-blue-800': theme.colors.accent.blue[800],
  '--color-accent-blue-900': theme.colors.accent.blue[900],
  '--color-accent-blue-950': theme.colors.accent.blue[950],

  '--color-accent-yellow': theme.colors.accent.yellow.DEFAULT,
  '--color-accent-yellow-50': theme.colors.accent.yellow[50],
  '--color-accent-yellow-100': theme.colors.accent.yellow[100],
  '--color-accent-yellow-200': theme.colors.accent.yellow[200],
  '--color-accent-yellow-300': theme.colors.accent.yellow[300],
  '--color-accent-yellow-400': theme.colors.accent.yellow[400],
  '--color-accent-yellow-500': theme.colors.accent.yellow[500],
  '--color-accent-yellow-600': theme.colors.accent.yellow[600],
  '--color-accent-yellow-700': theme.colors.accent.yellow[700],
  '--color-accent-yellow-800': theme.colors.accent.yellow[800],
  '--color-accent-yellow-900': theme.colors.accent.yellow[900],
  '--color-accent-yellow-950': theme.colors.accent.yellow[950],

  '--color-accent-orange': theme.colors.accent.orange.DEFAULT,
  '--color-accent-orange-50': theme.colors.accent.orange[50],
  '--color-accent-orange-100': theme.colors.accent.orange[100],
  '--color-accent-orange-200': theme.colors.accent.orange[200],
  '--color-accent-orange-300': theme.colors.accent.orange[300],
  '--color-accent-orange-400': theme.colors.accent.orange[400],
  '--color-accent-orange-500': theme.colors.accent.orange[500],
  '--color-accent-orange-600': theme.colors.accent.orange[600],
  '--color-accent-orange-700': theme.colors.accent.orange[700],
  '--color-accent-orange-800': theme.colors.accent.orange[800],
  '--color-accent-orange-900': theme.colors.accent.orange[900],
  '--color-accent-orange-950': theme.colors.accent.orange[950],

  // Gray colors
  '--color-gray-50': theme.colors.gray[50],
  '--color-gray-100': theme.colors.gray[100],
  '--color-gray-200': theme.colors.gray[200],
  '--color-gray-300': theme.colors.gray[300],
  '--color-gray-400': theme.colors.gray[400],
  '--color-gray-500': theme.colors.gray[500],
  '--color-gray-600': theme.colors.gray[600],
  '--color-gray-700': theme.colors.gray[700],
  '--color-gray-800': theme.colors.gray[800],
  '--color-gray-900': theme.colors.gray[900],
  '--color-gray-950': theme.colors.gray[950],

  // Neutral colors
  '--color-neutral-50': theme.colors.neutral[50],
  '--color-neutral-100': theme.colors.neutral[100],
  '--color-neutral-200': theme.colors.neutral[200],
  '--color-neutral-300': theme.colors.neutral[300],
  '--color-neutral-400': theme.colors.neutral[400],
  '--color-neutral-500': theme.colors.neutral[500],
  '--color-neutral-600': theme.colors.neutral[600],
  '--color-neutral-700': theme.colors.neutral[700],
  '--color-neutral-800': theme.colors.neutral[800],
  '--color-neutral-900': theme.colors.neutral[900],
  '--color-neutral-950': theme.colors.neutral[950],

  // Background colors
  '--color-background': theme.colors.background.DEFAULT,
  '--color-background-secondary': theme.colors.background.secondary,
  '--color-background-tertiary': theme.colors.background.tertiary,

  // Text colors
  '--color-text-primary': theme.colors.text.primary,
  '--color-text-secondary': theme.colors.text.secondary,
  '--color-text-muted': theme.colors.text.muted,
  '--color-text-inverse': theme.colors.text.inverse,

  // Border colors
  '--color-border': theme.colors.border.DEFAULT,
  '--color-border-light': theme.colors.border.light,
  '--color-border-medium': theme.colors.border.medium,
  '--color-border-focus': theme.colors.border.focus,

  // Status colors
  '--color-success': theme.colors.success,
  '--color-warning': theme.colors.warning,
  '--color-error': theme.colors.error,
  '--color-info': theme.colors.info,

  // Code colors
  '--color-code-background': theme.colors.code.background,
  '--color-code-text': theme.colors.code.text,
  '--color-code-inline-background': theme.colors.code.inline.background,
  '--color-code-inline-text': theme.colors.code.inline.text,
} as const;

