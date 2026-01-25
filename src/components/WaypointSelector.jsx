import { useState, useRef, useEffect } from 'react';
import { Box, Paper, Typography, IconButton, useTheme, useMediaQuery, Menu, MenuItem, ListItemText } from '@mui/material';
import { ChevronLeft, ChevronRight, ExpandMore } from '@mui/icons-material';

function WaypointSelector({ waypoints, selectedWaypointId, onSelectWaypoint }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const scrollContainerRef = useRef(null);
  const truncate = (s, n = 14) => {
    if (!s) return '';
    return s.length > n ? `${s.slice(0, n - 3)}...` : s;
  };
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);
  const [dropdownAnchor, setDropdownAnchor] = useState(null);
  const dropdownOpen = Boolean(dropdownAnchor);

  useEffect(() => {
    const checkScroll = () => {
      if (scrollContainerRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
        setShowLeftArrow(scrollLeft > 0);
        setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 1);
      }
    };

    checkScroll();
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScroll);
      window.addEventListener('resize', checkScroll);
      return () => {
        container.removeEventListener('scroll', checkScroll);
        window.removeEventListener('resize', checkScroll);
      };
    }
  }, [waypoints]);

  if (waypoints.length === 0) return null;

  const scroll = (direction) => {
    if (scrollContainerRef.current) {
      const scrollAmount = window.innerWidth < 600 ? 120 : 150;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const handleDropdownOpen = (event) => {
    setDropdownAnchor(event.currentTarget);
  };

  const handleDropdownClose = () => {
    setDropdownAnchor(null);
  };

  const handleWaypointSelect = (waypointId) => {
    onSelectWaypoint(waypointId);
    handleDropdownClose();
  };

  // Mobile dropdown view
  if (isMobile) {
    const selectedWaypoint = waypoints.find(wp => wp.id === selectedWaypointId);
    const selectedIndex = waypoints.findIndex(wp => wp.id === selectedWaypointId);

    const truncate = (s, n = 14) => {
      if (!s) return '';
      return s.length > n ? `${s.slice(0, n - 3)}...` : s;
    };

    return (
      <Box>
        <Paper
          elevation={0}
          sx={{
            position: 'fixed',
            top: '8.1375rem',
            left: '50%',
            transform: 'translateX(-50%)',
            maxWidth: { xs: '25vw', sm: '30vw' },
            px: 0.875,
            py: 0.65625,
            borderRadius: '0.65625rem',
            backgroundColor: theme.palette.background.paper,
            boxShadow: theme.palette.mode === 'dark'
              ? '0 0.125rem 0.5rem rgba(0, 0, 0, 0.5)'
              : '0 0.125rem 0.5rem rgba(0, 0, 0, 0.1)',
            border: `1px solid ${theme.palette.divider}`,
            zIndex: theme.zIndex.drawer + 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
          }}
          onClick={handleDropdownOpen}
        >
          <Typography
            sx={{
              fontSize: '0.85rem',
              fontWeight: selectedWaypoint ? 600 : 400,
              color: theme.palette.text.primary,
              flex: 1,
            }}
          >
            {selectedWaypoint ? truncate(selectedWaypoint.name || `Point ${selectedIndex + 1}`) : 'Select Point'}
          </Typography>
          <ExpandMore sx={{ fontSize: '1.50rem', color: theme.palette.text.secondary }} />
        </Paper>
        <Menu
          anchorEl={dropdownAnchor}
          open={dropdownOpen}
          onClose={handleDropdownClose}
          PaperProps={{
            sx: {
              maxHeight: '400px',
              width: 'calc(100vw - 2rem)',
              maxWidth: { xs: '200px', sm: '300px' },
              mt: 1,
              borderRadius: '0.65625rem',
              backgroundColor: theme.palette.background.paper,
              boxShadow: theme.palette.mode === 'dark'
                ? '0 0.25rem 0.75rem rgba(0, 0, 0, 0.5)'
                : '0 0.25rem 0.75rem rgba(0, 0, 0, 0.1)',
            },
          }}
          transformOrigin={{ horizontal: 'center', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'center', vertical: 'bottom' }}
        >
          {waypoints.map((wp, index) => (
            <MenuItem
              key={wp.id}
              onClick={() => handleWaypointSelect(wp.id)}
              selected={wp.id === selectedWaypointId}
              sx={{
                py: { xs: 0.5, sm: 1 },
                fontSize: { xs: '0.95rem', sm: '0.875rem' },
                minHeight: { xs: '36px', sm: '48px' },
                '&.Mui-selected': {
                  backgroundColor: theme.palette.action.selected,
                  '&:hover': {
                    backgroundColor: theme.palette.action.hover,
                  },
                },
              }}
            >
              <ListItemText
                primary={wp.name || `Point ${index + 1}`}
                primaryTypographyProps={{
                  fontSize: { xs: '0.95rem', sm: '0.875rem' },
                  fontWeight: wp.id === selectedWaypointId ? 600 : 400,
                }}
              />
            </MenuItem>
          ))}
        </Menu>
      </Box >
    );
  }

  // Desktop horizontal scroll view
  return (
    <Paper
      elevation={0}
      sx={{
        position: 'fixed',
        top: '4.375rem',
        left: '50%',
        transform: 'translateX(-50%)',
        px: 0.875,
        py: 0.875,
        borderRadius: '0.765625rem',
        backgroundColor: theme.palette.background.paper,
        boxShadow: theme.palette.mode === 'dark'
          ? '0 0.125rem 0.5rem rgba(0, 0, 0, 0.5)'
          : '0 0.125rem 0.5rem rgba(0, 0, 0, 0.1)',
        border: `1px solid ${theme.palette.divider}`,
        zIndex: theme.zIndex.drawer + 2,
        maxWidth: '30vw',
        minWidth: '12rem',
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden',
      }}
    >
      {showLeftArrow && (
        <IconButton
          onClick={() => scroll('left')}
          size="small"
          sx={{
            color: theme.palette.text.secondary,
            backgroundColor: theme.palette.action.hover,
            borderRadius: '50%',
            width: '2rem',
            height: '2rem',
            mr: 0.5,
            '&:hover': {
              backgroundColor: theme.palette.mode === 'dark' ? '#3a3a3a' : '#e0e0e0',
            },
          }}
        >
          <ChevronLeft />
        </IconButton>
      )}

      <Box
        ref={scrollContainerRef}
        sx={{
          display: 'flex',
          gap: 1,
          alignItems: 'center',
          overflowX: 'hidden',
          overflowY: 'hidden',
          flex: 1,
        }}
      >
        {waypoints.map((waypoint, index) => {
          const isSelected = waypoint.id === selectedWaypointId;
          return (
            <Box
              key={waypoint.id}
              onClick={() => onSelectWaypoint(waypoint.id)}
              sx={{
                px: { sm: 2, md: 2.5 },
                py: 1,
                borderRadius: { sm: '0.625rem', md: '0.75rem' },
                backgroundColor: isSelected ? theme.palette.action.hover : 'transparent',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
                border: isSelected ? `1px solid ${theme.palette.divider}` : '1px solid transparent',
                flexShrink: 0,
                '&:hover': {
                  backgroundColor: theme.palette.action.hover,
                },
              }}
            >
              <Typography
                sx={{
                  fontSize: { sm: '0.74375rem', md: '0.7875rem' },
                  fontWeight: isSelected ? 600 : 400,
                  color: theme.palette.text.primary,
                }}
              >
                {truncate(waypoint.name || `Point ${index + 1}`)}
              </Typography>
            </Box>
          );
        })}
      </Box>

      {showRightArrow && (
        <IconButton
          onClick={() => scroll('right')}
          size="small"
          sx={{
            color: theme.palette.text.secondary,
            backgroundColor: theme.palette.action.hover,
            borderRadius: '50%',
            width: '2rem',
            height: '2rem',
            ml: 0.5,
            '&:hover': {
              backgroundColor: theme.palette.mode === 'dark' ? '#3a3a3a' : '#e0e0e0',
            },
          }}
        >
          <ChevronRight />
        </IconButton>
      )}
    </Paper>
  );
}

export default WaypointSelector;

