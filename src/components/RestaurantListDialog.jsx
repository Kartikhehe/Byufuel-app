import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, Button, TextField, Box, useTheme, CircularProgress, Typography, InputAdornment, Menu, MenuItem, ListItemIcon, ListItemText, IconButton } from '@mui/material';
import { Folder as FolderIcon, Search, Sort, SwapVertRounded, Add } from '@mui/icons-material';
import { restaurantsAPI } from '../services/api';

function RestaurantListDialog({ open, onClose, onShowSnackbar, onAddNew, onSelect }) {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [restaurants, setRestaurants] = useState([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState(null);
  const [restaurantsLoading, setRestaurantsLoading] = useState(false);

  // Search and Sort
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState('newest');
  const [sortMenuAnchor, setSortMenuAnchor] = useState(null);

  useEffect(() => {
    const loadRestaurants = async () => {
      try {
        setRestaurantsLoading(true);
        const data = await restaurantsAPI.getAll();
        setRestaurants(data);
      } catch (err) {
        console.error('Error loading restaurants:', err);
        setRestaurants([]);
      } finally {
        setRestaurantsLoading(false);
      }
    };
    if (open) loadRestaurants();
  }, [open]);

  // Filter and Sort Restaurants
  const processedRestaurants = React.useMemo(() => {
    let filtered = [...restaurants];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(r => 
        r.outlet_name.toLowerCase().includes(q) ||
        (r.area && r.area.toLowerCase().includes(q)) ||
        (r.city && r.city.toLowerCase().includes(q))
      );
    }

    filtered.sort((a, b) => {
      const nameA = a.outlet_name.toLowerCase();
      const nameB = b.outlet_name.toLowerCase();
      const dateA = new Date(a.created_at || 0).getTime();
      const dateB = new Date(b.created_at || 0).getTime();

      switch (sortOption) {
        case 'oldest': return dateA - dateB;
        case 'newest': return dateB - dateA;
        case 'az': return nameA.localeCompare(nameB);
        case 'za': return nameB.localeCompare(nameA);
        default: return 0;
      }
    });

    return filtered;
  }, [restaurants, searchQuery, sortOption]);

  const handleRestaurantClick = (restaurant) => {
    setSelectedRestaurantId(restaurant.id);
    if (onSelect) {
      onSelect(restaurant);
    }
    onClose();
  };

  const handleContinue = () => {
    const restaurant = restaurants.find(r => r.id === selectedRestaurantId);
    if (!restaurant) return;
    if (onContinue) onContinue(restaurant);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          onClose();
        }
      }}
      PaperProps={{
        sx: {
          borderRadius: 3,
          p: 2
        }
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <DialogTitle sx={{ textAlign: 'center', pb: 0, fontWeight: 600, flex: 1 }}>Restaurants</DialogTitle>
        <IconButton 
          onClick={onAddNew}
          sx={{ 
            backgroundColor: theme.palette.primary.main, 
            color: 'white',
            '&:hover': { backgroundColor: theme.palette.primary.dark }
          }}
          size="small"
        >
          <Add />
        </IconButton>
      </Box>
      <DialogContent sx={{ pt: 1 }}>
        {/* Search and Sort Row */}
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <TextField
            size="small"
            fullWidth
            placeholder="Search by name, area, or city..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search sx={{ color: 'text.secondary' }} />
                </InputAdornment>
              ),
            }}
          />
          <Button
            variant="outlined"
            onClick={(e) => setSortMenuAnchor(e.currentTarget)}
            sx={{ minWidth: 40, px: 0, borderColor: theme.palette.divider }}
          >
            <Sort />
          </Button>
          <Menu
            anchorEl={sortMenuAnchor}
            open={Boolean(sortMenuAnchor)}
            onClose={() => setSortMenuAnchor(null)}
          >
            <MenuItem onClick={() => { setSortOption('newest'); setSortMenuAnchor(null); }} selected={sortOption === 'newest'}>
              <ListItemIcon><SwapVertRounded fontSize="small" /></ListItemIcon>
              <ListItemText>Newest First</ListItemText>
            </MenuItem>
            <MenuItem onClick={() => { setSortOption('oldest'); setSortMenuAnchor(null); }} selected={sortOption === 'oldest'}>
              <ListItemIcon><SwapVertRounded fontSize="small" /></ListItemIcon>
              <ListItemText>Oldest First</ListItemText>
            </MenuItem>
            <MenuItem onClick={() => { setSortOption('az'); setSortMenuAnchor(null); }} selected={sortOption === 'az'}>
              <ListItemIcon><SwapVertRounded fontSize="small" /></ListItemIcon>
              <ListItemText>Name (A-Z)</ListItemText>
            </MenuItem>
            <MenuItem onClick={() => { setSortOption('za'); setSortMenuAnchor(null); }} selected={sortOption === 'za'}>
              <ListItemIcon><SwapVertRounded fontSize="small" /></ListItemIcon>
              <ListItemText>Name (Z-A)</ListItemText>
            </MenuItem>
          </Menu>
        </Box>

        {restaurantsLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ maxHeight: '50vh', overflow: 'auto', border: `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: theme.palette.action.hover }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, borderBottom: `1px solid ${theme.palette.divider}` }}>Outlet Name</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, borderBottom: `1px solid ${theme.palette.divider}` }}>Area</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, borderBottom: `1px solid ${theme.palette.divider}` }}>City</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontWeight: 600, borderBottom: `1px solid ${theme.palette.divider}` }}>Pincode</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, borderBottom: `1px solid ${theme.palette.divider}` }}>Location</th>
                </tr>
              </thead>
              <tbody>
                {processedRestaurants.map((restaurant) => (
                  <tr 
                    key={restaurant.id} 
                    onClick={() => handleRestaurantClick(restaurant)}
                    style={{ 
                      cursor: 'pointer',
                      backgroundColor: selectedRestaurantId === restaurant.id ? theme.palette.action.selected : 'transparent',
                    }}
                  >
                    <td style={{ padding: '12px', borderBottom: `1px solid ${theme.palette.divider}` }}>
                      <Typography variant="body2" fontWeight={500}>{restaurant.outlet_name}</Typography>
                    </td>
                    <td style={{ padding: '12px', borderBottom: `1px solid ${theme.palette.divider}` }}>
                      {restaurant.area || '-'}
                    </td>
                    <td style={{ padding: '12px', borderBottom: `1px solid ${theme.palette.divider}` }}>
                      {restaurant.city || '-'}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', borderBottom: `1px solid ${theme.palette.divider}` }}>
                      {restaurant.pincode || '-'}
                    </td>
                    <td style={{ padding: '12px', borderBottom: `1px solid ${theme.palette.divider}` }}>
                      <Typography variant="caption" color="text.secondary">
                        {restaurant.latitude && restaurant.longitude ? `${parseFloat(restaurant.latitude).toFixed(4)}, ${parseFloat(restaurant.longitude).toFixed(4)}` : '-'}
                      </Typography>
                    </td>
                  </tr>
                ))}
                {processedRestaurants.length === 0 && !restaurantsLoading && (
                  <tr>
                    <td colSpan={5} align="center" style={{ padding: '24px', color: theme.palette.text.secondary }}>
                      <Typography>No restaurants found</Typography>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Box>
        )}

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
          <Button
            onClick={onClose}
            variant="text"
            sx={{ textTransform: 'none' }}
          >
            Close
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
}

export default RestaurantListDialog;

