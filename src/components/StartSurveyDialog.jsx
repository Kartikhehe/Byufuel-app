import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, Button, TextField, List, ListItem, Box, useTheme, CircularProgress, Typography, InputAdornment, Menu, MenuItem, ListItemIcon, ListItemText, IconButton } from '@mui/material';
import { Folder as FolderIcon, Search, Sort, SwapVertRounded, Add } from '@mui/icons-material';
import { warehousesAPI } from '../services/api';

function StartSurveyDialog({ open, onClose, onContinue, onShowSnackbar, onAddNew }) {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [warehouses, setWarehouses] = useState([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState(null);
  const [warehousesLoading, setWarehousesLoading] = useState(false);

  // Search and Sort
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState('newest');
  const [sortMenuAnchor, setSortMenuAnchor] = useState(null);

  useEffect(() => {
    const loadWarehouses = async () => {
      try {
        setWarehousesLoading(true);
        const data = await warehousesAPI.getAll();
        setWarehouses(data);
      } catch (err) {
        console.error('Error loading warehouses:', err);
        setWarehouses([]);
      } finally {
        setWarehousesLoading(false);
      }
    };
    if (open) loadWarehouses();
  }, [open]);

  // Filter and Sort Warehouses
  const processedWarehouses = React.useMemo(() => {
    let filtered = [...warehouses];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(w => w.name.toLowerCase().includes(q));
    }

    filtered.sort((a, b) => {
      const nameA = a.name.toLowerCase();
      const nameB = b.name.toLowerCase();
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
  }, [warehouses, searchQuery, sortOption]);

  const handleWarehouseClick = (warehouse) => {
    setSelectedWarehouseId(warehouse.id);
  };

  const handleContinue = () => {
    const warehouse = warehouses.find(w => w.id === selectedWarehouseId);
    if (!warehouse) return;
    if (onContinue) onContinue(warehouse);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
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
        <DialogTitle sx={{ textAlign: 'center', pb: 0, fontWeight: 600, flex: 1 }}>Warehouses</DialogTitle>
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
            placeholder="Search warehouses..."
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

        {warehousesLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : (
          <List sx={{ maxHeight: '40vh', overflow: 'auto', mb: 3, border: `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
            {processedWarehouses.map((warehouse) => (
              <ListItem key={warehouse.id} disablePadding>
                <Box
                  onClick={() => handleWarehouseClick(warehouse)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (selectedWarehouseId === warehouse.id) {
                        handleContinue();
                      } else {
                        handleWarehouseClick(warehouse);
                      }
                    }
                  }}
                  tabIndex={0}
                  sx={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    p: 1.5,
                    cursor: 'pointer',
                    backgroundColor: selectedWarehouseId === warehouse.id ? theme.palette.action.selected : 'transparent',
                    '&:hover': { backgroundColor: theme.palette.action.hover },
                    borderBottom: `1px solid ${theme.palette.divider}`
                  }}
                >
                  <FolderIcon sx={{ mr: 2, color: '#4CAF50' }} />
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="body1" fontWeight={500}>{warehouse.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{new Date(warehouse.created_at).toLocaleString()}</Typography>
                  </Box>
                </Box>
              </ListItem>
            ))}
            {processedWarehouses.length === 0 && !warehousesLoading && (
              <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
                <Typography>No warehouses found</Typography>
              </Box>
            )}
          </List>
        )}

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          <Button
            onClick={onClose}
            variant="text"
            sx={{ textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleContinue}
            variant="contained"
            disabled={!selectedWarehouseId}
            sx={{ textTransform: 'none', boxShadow: 1 }}
          >
            Select Warehouse
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
}

export default StartSurveyDialog;

