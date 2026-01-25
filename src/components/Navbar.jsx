import { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  IconButton,
  useTheme,
  Switch,
  FormControlLabel,
} from '@mui/material';
import { DarkMode, LightMode, LocationOn as LocationOnIcon, SatelliteAlt as SatelliteAltIcon } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const drawerWidth = 260;
const drawerCollapsedWidth = 64;

function Navbar({ sidebarOpen, isMobile, darkMode, onToggleDarkMode, onSetDefaultLocation, onToggleSatelliteHybrid, satelliteHybridMode }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Get user data from auth context
  const userName = isAuthenticated ? (user?.full_name || 'User') : 'Guest User';
  const userFirstName = userName && userName.split(' ')[0];
  const userEmail = isAuthenticated ? (user?.email || '') : 'Not Logged in';

  // Generate avatar initials from full name
  const getAvatarInitials = (name) => {
    if (!name) return 'U';
    if (name === 'Guest User') return 'GU';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
    handleClose();
  };

  const handleLogin = () => {
    navigate('/login');
    handleClose();
  };

  const handleDarkModeToggle = () => {
    onToggleDarkMode();
    handleClose();
  };

  return (
    <AppBar
      position="fixed"
      elevation={2}
      sx={(theme) => ({
        backgroundColor: theme.palette.mode === 'dark' ? '#1e1e1e' : '#fff',
        color: theme.palette.text.primary,
        boxShadow: theme.palette.mode === 'dark'
          ? '0 2px 8px rgba(0,0,0,0.3)'
          : '0 2px 8px rgba(0,0,0,0.08)',
        borderRadius: '0 0 0 0',
        zIndex: theme.zIndex.drawer + 1,
        width: '100%',
        marginLeft: 0,
      })}
    >
      <Toolbar sx={{
        px: { xs: '0.875rem', sm: '1.3125rem', md: '1.75rem' },
        minHeight: { xs: '4.5rem', sm: '3.5rem' }
      }}>
        <Typography
          variant="h5"
          component="div"
          sx={{
            flexGrow: 1,
            fontWeight: 600,
            letterSpacing: { xs: '0.2625px', sm: '0.4375px' },
            fontSize: { xs: '1.25rem', sm: '0.9625rem', md: '1.3125rem' },
            color: 'text.primary',
          }}
        >
          Byufuel app
        </Typography>
        <IconButton
          onClick={handleClick}
          size="small"
          sx={{
            ml: { xs: 0.875, sm: 1.75 },
            backgroundColor: theme.palette.mode === 'dark' ? '#2a2a2a' : '#f5f5f5',
            borderRadius: '50%',
            width: { xs: '3.25rem', sm: '2.1875rem' },
            height: { xs: '3.25rem', sm: '2.1875rem' },
            '&:hover': {
              backgroundColor: theme.palette.mode === 'dark' ? '#3a3a3a' : '#e0e0e0',
            },
          }}
          aria-controls={open ? 'account-menu' : undefined}
          aria-haspopup="true"
          aria-expanded={open ? 'true' : undefined}
        >
          <Avatar
            src={`https://avatar.iran.liara.run/public/boy?username=${encodeURIComponent(userFirstName)}&size=32`}
            sx={{
              width: { xs: 40, sm: 32 },
              height: { xs: 40, sm: 32 },
              bgcolor: theme.palette.primary.main,
              color: 'white',
              fontWeight: 600,
              fontSize: { xs: '1.125rem', sm: '1rem' },
            }}
            alt="User Avatar"
          >
            {getAvatarInitials(userName)}
          </Avatar>
        </IconButton>
        <Menu
          anchorEl={anchorEl}
          id="account-menu"
          open={open}
          onClose={handleClose}
          MenuListProps={{
            dense: true,
            sx: { py: { xs: 0.25, sm: 0.5 } },
          }}
          PaperProps={{
            elevation: 3,
            sx: {
              overflow: 'visible',
              filter: 'drop-shadow(0px 0.125rem 0.5rem rgba(0,0,0,0.1))',
              mt: 1.5,
              minWidth: { xs: '10.5rem', sm: '12.03125rem' },
              maxWidth: { xs: '90vw', sm: '17.5rem' },
              borderRadius: '0.65625rem',
              backgroundColor: theme.palette.mode === 'dark' ? '#1e1e1e' : '#fff',
              '& .MuiAvatar-root': {
                width: { xs: '1.53125rem', sm: '1.75rem' },
                height: { xs: '1.53125rem', sm: '1.75rem' },
                ml: -0.5,
                mr: 1,
              },
              '&:before': {
                content: '""',
                display: 'block',
                position: 'absolute',
                top: 0,
                right: { xs: '0.65625rem', sm: '0.765625rem' },
                width: { xs: '0.4375rem', sm: '0.546875rem' },
                height: { xs: '0.4375rem', sm: '0.546875rem' },
                bgcolor: theme.palette.mode === 'dark' ? '#1e1e1e' : 'background.paper',
                transform: 'translateY(-50%) rotate(45deg)',
                zIndex: 0,
              },
            },
          }}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          <MenuItem onClick={handleClose}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%' }}>
              <Avatar
                src={`https://avatar.iran.liara.run/public/boy?username=${encodeURIComponent(userFirstName)}&size=32`}
                sx={{
                  width: 32,
                  height: 32,
                  bgcolor: theme.palette.primary.main,
                  color: 'white',
                  fontWeight: 600,
                }}
              >
                {getAvatarInitials(userName)}
              </Avatar>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', flex: 1, minWidth: 0 }}>
                <Typography variant="body2" sx={{
                  fontWeight: 600,
                  color: 'text.primary',
                  fontSize: { xs: '0.8rem', sm: '0.8rem' },
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  width: '100%'
                }}>
                  {userName}
                </Typography>
                <Typography variant="caption" sx={{
                  color: 'text.secondary',
                  fontSize: { xs: '0.7rem', sm: '0.7rem' },
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  width: '100%'
                }}>
                  {userEmail}
                </Typography>
              </Box>
            </Box>
          </MenuItem>
          <Divider />
          <MenuItem onClick={handleDarkModeToggle} sx={{ py: { xs: 0.85, sm: 1.1 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                {isDark ? (
                  <DarkMode sx={{ fontSize: { xs: '0.9625rem', sm: '1.09375rem' }, color: 'text.secondary' }} />
                ) : (
                  <LightMode sx={{ fontSize: { xs: '0.9625rem', sm: '1.09375rem' }, color: 'text.secondary' }} />
                )}
                <Typography sx={{
                  color: 'text.primary',
                  fontSize: { xs: '0.85rem', sm: '0.85rem' }
                }}>
                  {isDark ? 'Dark Mode' : 'Light Mode'}
                </Typography>
              </Box>
              <Switch
                checked={isDark}
                onChange={handleDarkModeToggle}
                sx={{
                  '& .MuiSwitch-switchBase.Mui-checked': {
                    color: '#4CAF50',
                  },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                    backgroundColor: '#4CAF50',
                  },
                }}
              />
            </Box>
          </MenuItem>
          <Divider />
          <MenuItem
            onClick={() => {
              if (onSetDefaultLocation) {
                onSetDefaultLocation();
              }
              handleClose();
            }}
            sx={{ py: { xs: 0.85, sm: 1.1 } }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.3125 }}>
              <LocationOnIcon sx={{ fontSize: { xs: '0.9625rem', sm: '1.09375rem' }, color: 'text.secondary' }} />
              <Typography sx={{
                color: 'text.primary',
                fontSize: { xs: '0.85rem', sm: '0.85rem' }
              }}>
                Set Default Location
              </Typography>
            </Box>
          </MenuItem>
          <Divider />
          <MenuItem
            onClick={() => {
              if (onToggleSatelliteHybrid) {
                onToggleSatelliteHybrid();
              }
              handleClose();
            }}
            sx={{ py: { xs: 0.85, sm: 1.1 } }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.3125 }}>
              <SatelliteAltIcon sx={{ fontSize: { xs: '0.9625rem', sm: '1.09375rem' }, color: 'text.secondary' }} />
              <Typography sx={{
                color: 'text.primary',
                fontSize: { xs: '0.85rem', sm: '0.85rem' }
              }}>
                {satelliteHybridMode ? 'Switch to Map View' : 'Switch to Satellite Hybrid'}
              </Typography>
            </Box>
          </MenuItem>
          <Divider />
          {isAuthenticated ? (
            <MenuItem
              onClick={handleLogout}
              sx={{ color: '#d32f2f', py: { xs: 0.85, sm: 1.1 } }}
            >
              Logout
            </MenuItem>
          ) : (
            <MenuItem onClick={handleLogin} sx={{ py: { xs: 0.85, sm: 1.1 } }}>
              <Typography sx={{
                color: 'text.primary',
                fontSize: { xs: '0.85rem', sm: '0.85rem' }
              }}>
                Login
              </Typography>
            </MenuItem>
          )}
        </Menu>
      </Toolbar>
    </AppBar>
  );
}

export default Navbar;

