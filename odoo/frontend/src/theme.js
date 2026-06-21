import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#714b67', // Professional Purple
      light: '#f3f4f6', // Light Gray
      dark: '#5a3d52', // Darker Purple
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#64748B', // Slate Secondary
      light: '#94A3B8',
      dark: '#475569',
      contrastText: '#ffffff',
    },
    background: {
      default: '#f3f4f6', // Light Gray Background
      paper: '#ffffff',
    },
    text: {
      primary: '#111827', // Gray-900
      secondary: '#6B7280', // Gray-500
    },
    success: {
      main: '#10B981', // Emerald/Green-500
    },
    warning: {
      main: '#F59E0B', // Amber-500
    },
    error: {
      main: '#EF4444', // Red-500
    },
  },
  typography: {
    fontFamily: [
      'Inter',
      'System-ui',
      '-apple-system',
      'sans-serif',
    ].join(','),
    h5: {
      fontWeight: 700,
      letterSpacing: '-0.02em',
    },
    h6: {
      fontWeight: 600,
      letterSpacing: '-0.015em',
    },
    subtitle1: {
      fontWeight: 600,
    },
    subtitle2: {
      fontWeight: 500,
    },
    body1: {
      fontSize: '0.925rem',
      lineHeight: 1.5,
    },
    body2: {
      fontSize: '0.85rem',
      lineHeight: 1.45,
    },
    button: {
      fontWeight: 600,
      textTransform: 'none',
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '10px',
          boxShadow: 'none',
          padding: '6px 16px',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(113, 75, 103, 0.15)',
            transform: 'translateY(-1px)',
          },
        },
        containedSecondary: {
          backgroundColor: '#E5E7EB',
          color: '#374151',
          '&:hover': {
            backgroundColor: '#D1D5DB',
            boxShadow: 'none',
          },
        },
        containedError: {
          backgroundColor: '#DC2626',
          color: '#ffffff',
          '&:hover': {
            backgroundColor: '#B91C1C',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.03)',
          border: '1px solid #E5E7EB',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
            transform: 'translateY(-1px)',
          }
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          backgroundColor: '#FAFBFD',
          color: '#374151',
          fontWeight: 600,
          borderBottom: '2px solid rgba(0, 0, 0, 0.03)',
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&.MuiTableRow-hover:hover': {
            backgroundColor: '#F3F4F6',
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: '12px',
          '&:not(.MuiInputBase-multiline)': {
            height: '44px',
          },
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: '#E5E7EB',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: '#94A3B8',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: '#714b67',
            borderWidth: '2px',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: '9999px',
          fontWeight: 600,
          fontSize: '0.75rem',
        },
      },
    },
  },
});

export default theme;
