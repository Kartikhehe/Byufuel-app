import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogTitle, DialogContent, Button, TextField, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Box, useTheme, CircularProgress, Typography, InputAdornment, Menu, MenuItem, Chip, ListItemIcon, ListItemText, IconButton, Dialog as ConfirmDialog, DialogTitle as ConfirmDialogTitle, DialogContent as ConfirmDialogContent, DialogActions as ConfirmDialogActions } from '@mui/material';
import { Search, Sort, SwapVertRounded, LocalShipping as LocalShippingIcon, Add, Edit, Delete, MoreVert } from '@mui/icons-material';
import { fleetsAPI } from '../services/api';

function FleetListDialog({ open, onClose, onShowSnackbar, onAddNew, onEdit }) {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [fleets, setFleets] = useState([]);
  const [fleetsLoading, setFleetsLoading] = useState(false);

  // Search and Sort
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState('newest');
  const [sortMenuAnchor, setSortMenuAnchor] = useState(null);

  // Menu state for each row
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [selectedFleet, setSelectedFleet] = useState(null);

  // Delete confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const loadFleets = async () => {
      try {
        setFleetsLoading(true);
        const data = await fleetsAPI.getAll();
        setFleets(data);
      } catch (err) {
        console.error('Error loading fleets:', err);
        setFleets([]);
      } finally {
        setFleetsLoading(false);
      }
    };
    if (open) loadFleets();
  }, [open]);

  // Filter and Sort Fleets
  const processedFleets = useMemo(() => {
    let filtered = [...fleets];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(f => 
        f.vehicle.toLowerCase().includes(q) ||
        f.vehicle_type.toLowerCase().includes(q) ||
        (f.fuel_type && f.fuel_type.toLowerCase().includes(q)) ||
        (f.area && f.area.toLowerCase().includes(q))
      );
    }

    filtered.sort((a, b) => {
      const vehicleA = a.vehicle.toLowerCase();
      const vehicleB = b.vehicle.toLowerCase();
      const dateA = new Date(a.created_at || 0).getTime();
      const dateB = new Date(b.created_at || 0).getTime();

      switch (sortOption) {
        case 'oldest': return dateA - dateB;
        case 'newest': return dateB - dateA;
        case 'az': return vehicleA.localeCompare(vehicleB);
        case 'za': return vehicleB.localeCompare(vehicleA);
        default: return 0;
      }
    });

    return filtered;
  }, [fleets, searchQuery, sortOption]);

  const getAvailabilityColor = (fleet) => {
    if (fleet.available === 0) return 'error';
    if (fleet.available <= fleet.count / 2) return 'warning';
    return 'success';
  };

  const getAvailabilityLabel = (fleet) => {
    return `${fleet.available}/${fleet.count}`;
  };

  const handleMenuOpen = (event, fleet) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
    setSelectedFleet(fleet);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const handleEdit = () => {
    handleMenuClose();
    if (onEdit && selectedFleet) {
      onEdit(selectedFleet);
    }
  };

  const handleDeleteClick = () => {
    handleMenuClose();
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedFleet) return;
    
    setDeleting(true);
    try {
      await fleetsAPI.delete(selectedFleet.id);
      setFleets(prev => prev.filter(f => f.id !== selectedFleet.id));
      onShowSnackbar?.('Fleet deleted successfully', 'success');
      setDeleteDialogOpen(false);
      setSelectedFleet(null);
    } catch (err) {
      console.error('Error deleting fleet:', err);
      onShowSnackbar?.('Failed to delete fleet', 'error');
    }
    setDeleting(false);
  };

  return (
    <>
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
          <DialogTitle sx={{ textAlign: 'center', pb: 0, fontWeight: 600, flex: 1 }}>Fleets</DialogTitle>
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
              placeholder="Search by vehicle, type, fuel or area..."
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

          {fleetsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer sx={{ maxHeight: '50vh', border: `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Vehicle</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">Count</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">Capacity</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Fuel</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Area</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="center">Available</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="center" width={50}></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {processedFleets.map((fleet) => (
                    <TableRow key={fleet.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <LocalShippingIcon sx={{ mr: 1, color: '#4CAF50', fontSize: 20 }} />
                          <Typography variant="body2" fontWeight={500}>{fleet.vehicle}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>{fleet.vehicle_type}</TableCell>
                      <TableCell align="right">{fleet.count}</TableCell>
                      <TableCell align="right">{fleet.capacity ? `${fleet.capacity}` : '-'}</TableCell>
                      <TableCell>
                        {fleet.fuel_type && (
                          <Chip 
                            label={fleet.fuel_type} 
                            size="small" 
                            sx={{ fontSize: '0.75rem' }}
                          />
                        )}
                      </TableCell>
                      <TableCell>{fleet.area || '-'}</TableCell>
                      <TableCell align="center">
                        <Chip 
                          label={getAvailabilityLabel(fleet)} 
                          color={getAvailabilityColor(fleet)}
                          size="small"
                          sx={{ fontWeight: 600, minWidth: 60 }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          onClick={(e) => handleMenuOpen(e, fleet)}
                        >
                          <MoreVert fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                  {processedFleets.length === 0 && !fleetsLoading && (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                        <Typography>No fleets found</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Actions Menu */}
          <Menu
            anchorEl={menuAnchor}
            open={Boolean(menuAnchor)}
            onClose={handleMenuClose}
          >
            <MenuItem onClick={handleEdit}>
              <ListItemIcon><Edit fontSize="small" /></ListItemIcon>
              <ListItemText>Edit</ListItemText>
            </MenuItem>
            <MenuItem onClick={handleDeleteClick} sx={{ color: 'error.main' }}>
              <ListItemIcon><Delete fontSize="small" color="error" /></ListItemIcon>
              <ListItemText>Delete</ListItemText>
            </MenuItem>
          </Menu>

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

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <ConfirmDialogTitle>Delete Fleet</ConfirmDialogTitle>
        <ConfirmDialogContent>
          <Typography>
            Are you sure you want to delete "{selectedFleet?.vehicle}"? This action cannot be undone.
          </Typography>
        </ConfirmDialogContent>
        <ConfirmDialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} variant="text" sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button onClick={handleDeleteConfirm} variant="contained" color="error" sx={{ textTransform: 'none' }}>
            {deleting ? <CircularProgress size={20} color="inherit" /> : 'Delete'}
          </Button>
        </ConfirmDialogActions>
      </ConfirmDialog>
    </>
  );
}

export default FleetListDialog;

