import { Snackbar, Alert, IconButton } from '@mui/material';
import { Close } from '@mui/icons-material';

function CustomSnackbar({ open, message, severity, onClose }) {
  return (
    <Snackbar
      open={open}
      autoHideDuration={4000}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      sx={{
        bottom: { xs: '6rem', sm: '4.6875rem' } + ' !important', // Above the Live Coordinates card
        right: { xs: '0.75rem', sm: '1.125rem' },
        left: { xs: '0.75rem', sm: 'auto' },
        maxWidth: { xs: 'calc(100% - 1.5rem)', sm: '18.75rem' },
      }}
    >
      <Alert
        onClose={onClose}
        severity={severity}
        variant="filled"
        sx={{
          borderRadius: { xs: '0.5625rem', sm: '0.65625rem', md: '0.75rem' },
          backgroundColor: severity === 'success' ? '#4CAF50' : severity === 'error' ? '#f44336' : severity === 'info' ? '#2196F3' : '#616161',
          color: '#fff',
          fontWeight: 500,
          boxShadow: '0 0.1875rem 0.5625rem rgba(0, 0, 0, 0.15)',
          minWidth: { xs: 'auto', sm: '14.0625rem' },
          maxWidth: { xs: '100%', sm: '18.75rem' },
          width: { xs: '100%', sm: 'auto' },
          fontSize: { xs: '0.9rem', sm: '0.75rem' },
          '& .MuiAlert-icon': {
            color: '#fff',
            fontSize: { xs: '1.1rem', sm: '0.9375rem' },
          },
          '& .MuiAlert-message': {
            fontSize: { xs: '0.9rem', sm: '0.75rem' },
            padding: { xs: '0.375rem 0', sm: '0.5625rem 0' },
          },
          '& .MuiAlert-action': {
            paddingTop: 0,
            alignItems: 'center',
          },
          '& .MuiIconButton-root': {
            color: '#fff',
            padding: { xs: '0.1875rem', sm: '0.28125rem' },
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '50%',
            },
          },
        }}
        action={
          <IconButton
            size="small"
            aria-label="close"
            color="inherit"
            onClick={onClose}
            sx={{
              borderRadius: '50%',
              width: { xs: '1.125rem', sm: '1.3125rem' },
              height: { xs: '1.125rem', sm: '1.3125rem' },
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
              },
            }}
          >
            <Close fontSize="small" />
          </IconButton>
        }
      >
        {message}
      </Alert>
    </Snackbar>
  );
}

export default CustomSnackbar;

