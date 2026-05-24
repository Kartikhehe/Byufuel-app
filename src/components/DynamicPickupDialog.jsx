import React, { useState, useMemo, useEffect } from 'react';
import { 
  Dialog, DialogTitle, DialogContent, Button, TextField, List, ListItem, 
  Box, useTheme, Typography, InputAdornment, Menu, MenuItem, ListItemIcon, 
  ListItemText, Checkbox, Divider, TablePagination 
} from '@mui/material';
import { Search, Sort, Restaurant as RestaurantIcon, AccessTime, Sync } from '@mui/icons-material';

export default function DynamicPickupDialog({ open, onClose, onSubmit, restaurants }) {
  const theme = useTheme();
  const [selectedRestaurantId, setSelectedRestaurantId] = useState('');
  const [amount, setAmount] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState('az');
  const [sortMenuAnchor, setSortMenuAnchor] = useState(null);
  
  // 🔥 THE TIMING STATE
  const [simulatedTime, setSimulatedTime] = useState('08:00');

  // --- PAGINATION STATE ---
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Address Formatter
  const formatAddress = (address, maxLength = 35) => {
    if (!address) return '-';
    if (address.length <= maxLength) return address;
    return address.substring(0, maxLength) + '...';
  };

  // 🔥 SYNC CURRENT IST TIME
  const handleSyncTime = () => {
    const d = new Date();
    const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
    const nd = new Date(utc + (3600000 * 5.5)); // +5:30 for IST
    const timeString = `${nd.getHours().toString().padStart(2, '0')}:${nd.getMinutes().toString().padStart(2, '0')}`;
    setSimulatedTime(timeString);
  };

  // Reset states when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setSelectedRestaurantId('');
      setAmount('');
      setSimulatedTime('08:00');
      setSearchQuery('');
      setPage(0);
    }
  }, [open]);

  // Reset page to 0 if the user searches or sorts
  useEffect(() => {
    setPage(0);
  }, [searchQuery, sortOption]);

  const processedItems = useMemo(() => {
    let filtered = [...restaurants];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(item => 
        (item.outlet_name && item.outlet_name.toLowerCase().includes(q)) ||
        (item.address && item.address.toLowerCase().includes(q)) ||
        (item.area && item.area.toLowerCase().includes(q)) ||
        (item.city && item.city.toLowerCase().includes(q))
      );
    }
    filtered.sort((a, b) => {
      const nameA = (a.outlet_name || '').toLowerCase();
      const nameB = (b.outlet_name || '').toLowerCase();
      return sortOption === 'az' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
    });
    return filtered;
  }, [restaurants, searchQuery, sortOption]);

  const paginatedItems = useMemo(() => {
    return processedItems.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [processedItems, page, rowsPerPage]);

  const handleToggle = (id) => {
    setSelectedRestaurantId((prev) => (prev === id ? '' : id));
  };

  const handleSubmit = () => {
    const restaurantData = restaurants.find(r => r.id === selectedRestaurantId);
    if (!restaurantData || !amount) return;

    onSubmit({
      ...restaurantData,
      amount: amount,
      isNewUrgent: true,
      priorityLevel: 3 
    }, simulatedTime); // 🔥 PASSES THE CHOSEN TIME TO THE ALGORITHM
    
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: 3, p: 1 } }}>
      <DialogTitle sx={{ textAlign: 'center', pb: 0, fontWeight: 600 }}>Dynamic Dispatch Reroute</DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        
        {/* 🔥 TIME SIMULATION SECTION 🔥 */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, p: 2, bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#f5f5f5', borderRadius: 2 }}>
          <AccessTime color="primary" />
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="body2" fontWeight={600}>Route Time</Typography>
            <Typography variant="caption" color="text.secondary">Enter the time to calculate live vehicle locations.</Typography>
          </Box>
          <TextField
            size="small"
            type="time"
            value={simulatedTime}
            onChange={(e) => setSimulatedTime(e.target.value)}
            sx={{ width: 120, bgcolor: 'background.paper' }}
          />
          <Button variant="outlined" size="small" startIcon={<Sync />} onClick={handleSyncTime}>
            Current IST
          </Button>
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* Search and Sort */}
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <TextField
            size="small"
            fullWidth
            placeholder="Search restaurants or cities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><Search sx={{ color: 'text.secondary' }} /></InputAdornment> }}
          />
          <Button variant="outlined" onClick={(e) => setSortMenuAnchor(e.currentTarget)} sx={{ minWidth: 40, px: 0 }}>
            <Sort />
          </Button>
          <Menu anchorEl={sortMenuAnchor} open={Boolean(sortMenuAnchor)} onClose={() => setSortMenuAnchor(null)}>
            <MenuItem onClick={() => { setSortOption('az'); setSortMenuAnchor(null); }} selected={sortOption === 'az'}>
              <ListItemIcon><Sort fontSize="small" /></ListItemIcon>
              <ListItemText>Name (A-Z)</ListItemText>
            </MenuItem>
            <MenuItem onClick={() => { setSortOption('za'); setSortMenuAnchor(null); }} selected={sortOption === 'za'}>
              <ListItemIcon><Sort fontSize="small" /></ListItemIcon>
              <ListItemText>Name (Z-A)</ListItemText>
            </MenuItem>
          </Menu>
        </Box>

        {/* Paginated List */}
        <List sx={{ maxHeight: '35vh', overflow: 'auto', mb: 1, border: `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
          {paginatedItems.map((restaurant) => (
            <ListItem key={restaurant.id} disablePadding>
              <Box 
                onClick={() => handleToggle(restaurant.id)} 
                sx={{ 
                  width: '100%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  p: 1.5, 
                  cursor: 'pointer', 
                  backgroundColor: selectedRestaurantId === restaurant.id ? theme.palette.action.selected : 'transparent', 
                  borderBottom: `1px solid ${theme.palette.divider}`,
                  '&:hover': { backgroundColor: theme.palette.action.hover }
                }}
              >
                <Checkbox checked={selectedRestaurantId === restaurant.id} sx={{ mr: 1 }} />
                <RestaurantIcon sx={{ mr: 2, color: '#FF5722' }} />
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="body1" fontWeight={500}>
                    {restaurant.outlet_name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatAddress(
                      (restaurant.area || '') + (restaurant.city ? `, ${restaurant.city}` : ''),
                      40
                    )}
                  </Typography>
                </Box>
                {selectedRestaurantId === restaurant.id && (
                  <TextField
                    size="small"
                    placeholder="Liters"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    type="number"
                    sx={{ width: 100, ml: 2 }}
                    InputProps={{ endAdornment: <Typography sx={{ ml: 0.5 }}>L</Typography> }}
                    autoFocus
                  />
                )}
              </Box>
            </ListItem>
          ))}
          {processedItems.length === 0 && (
            <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
              <Typography>No restaurants found</Typography>
            </Box>
          )}
        </List>

        {/* Pagination Controls */}
        {processedItems.length > 0 && (
          <TablePagination
            component="div"
            count={processedItems.length}
            page={page}
            onPageChange={(e, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[10, 30, 50, 100]}
            sx={{ mb: 2, borderBottom: 'none' }}
          />
        )}

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          <Button onClick={onClose} variant="text" color="inherit">Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" color="error" disabled={!selectedRestaurantId || !amount || !simulatedTime}>
            Inject & Reroute
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
}