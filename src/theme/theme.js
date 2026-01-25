import { createTheme } from '@mui/material/styles';

export const createAppTheme = (mode) => {
  const isDark = mode === 'dark';
  
  return createTheme({
    palette: {
      mode: mode,
      primary: {
        main: '#4CAF50',
        light: '#81C784',
        dark: '#388E3C',
      },
      secondary: {
        main: '#FFC107',
      },
      background: {
        default: isDark ? '#121212' : '#f5f5f5',
        paper: isDark ? '#1e1e1e' : '#ffffff',
      },
      text: {
        primary: isDark ? '#ffffff' : '#333333',
        secondary: isDark ? '#b0b0b0' : '#666666',
      },
      divider: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
      action: {
        hover: isDark ? 'rgba(255, 255, 255, 0.08)' : '#f5f5f5',
        selected: isDark ? 'rgba(76, 175, 80, 0.16)' : '#E8F5E9',
      },
    },
    components: {
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundColor: isDark ? '#1e1e1e' : '#ffffff',
            borderRadius: '16px',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: '12px',
            textTransform: 'none',
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              backgroundColor: isDark ? '#2a2a2a' : '#f5f5f5',
              borderRadius: '12px',
            },
          },
        },
      },
    },
  });
};

