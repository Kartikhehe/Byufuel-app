import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  useTheme,
} from '@mui/material';
import { Login as LoginIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

function LoginPromptDialog({ open, onClose }) {
  const theme = useTheme();
  const navigate = useNavigate();

  const handleLogin = () => {
    onClose();
    navigate('/login');
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          borderRadius: { xs: '0.5625rem', sm: '0.75rem' },
          minWidth: { xs: 'calc(100% - 1.5rem)', sm: '15rem' },
          maxWidth: { xs: '90vw', sm: '18.75rem' },
          width: { xs: 'calc(100% - 1.5rem)', sm: 'auto' },
          margin: { xs: '0.75rem', sm: 'auto' },
        },
      }}
    >
      <DialogTitle sx={{ px: { xs: 1.5, sm: 2 }, pt: { xs: 1.5, sm: 2 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 1.5 } }}>
          <Box
            sx={{
              width: { xs: '1.875rem', sm: '2.25rem' },
              height: { xs: '1.875rem', sm: '2.25rem' },
              borderRadius: { xs: '0.5625rem', sm: '0.65625rem', md: '0.75rem' },
              background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <LoginIcon sx={{ fontSize: { xs: '0.9375rem', sm: '1.125rem' }, color: 'white' }} />
          </Box>
          <Typography variant="h6" sx={{ 
            fontWeight: 600,
            fontSize: { xs: '0.75rem', sm: '0.9375rem' }
          }}>
            Login Required
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ px: { xs: 1.125, sm: 1.5 }, pb: { xs: 0.75, sm: 1.125 } }}>
        <Typography variant="body1" sx={{ 
          color: 'text.secondary', 
          mb: { xs: 1.125, sm: 1.5 },
          fontSize: { xs: '0.65625rem', sm: '0.75rem' }
        }}>
          Please log in to access this feature. You need to be authenticated to save, delete, navigate, or view saved waypoints.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ p: { xs: 1.5, sm: 2 }, pt: { xs: 0.5, sm: 1 }, gap: { xs: 1, sm: 1.5 } }}>
        <Button onClick={onClose} sx={{ color: 'text.secondary' }}>
          Cancel
        </Button>
        <Button
          onClick={handleLogin}
          variant="contained"
          sx={{
            background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
            color: 'white',
            '&:hover': {
              background: `linear-gradient(135deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`,
            },
          }}
        >
          Go to Login
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default LoginPromptDialog;

