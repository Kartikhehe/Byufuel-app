import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogTitle, DialogContent, Button, TextField, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Box, useTheme, CircularProgress, Typography, InputAdornment, Menu, MenuItem, Chip, ListItemIcon, ListItemText, IconButton, Dialog as ConfirmDialog, DialogTitle as ConfirmDialogTitle, DialogContent as ConfirmDialogContent, DialogActions as ConfirmDialogActions, Collapse, Paper } from '@mui/material';
import { Search, LocalShipping as LocalShippingIcon, Add, Edit, Delete, ExpandMore, ExpandLess, Warehouse as WarehouseIcon } from '@mui/icons-material';
import { fleetsAPI, warehousesAPI } from '../services/api';

function FleetListDialog({ open, onClose, onShowSnackbar, onAddNew, onEdit }) {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [fleets, setFleets] = useState([]);
  const [fleetsLoading, setFleetsLoading] = useState(false);
  const [warehouses, setWarehouses] = useState([]);
  const [warehousesLoading, setWarehousesLoading] = useState(false);

  // Search
  const [searchQuery, setSearchQuery] = useState('');

  // Menu state for each row
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [selectedFleet, setSelectedFleet] = useState(null);

  // Delete confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Expanded warehouses state (for grouped view)
  const [expandedWarehouses, setExpandedWarehouses] = useState({});
  const [viewMode, setViewMode] = useState('grouped'); // 'grouped' or 'flat'

  // Load warehouses and fleets when dialog opens
  useEffect(() => {
    const loadData = async () => {
      try {
        setFleetsLoading(true);
        setWarehousesLoading(true);
        
        const [fleetsData, warehousesData] = await Promise.all([
          fleetsAPI.getAll(),
          warehousesAPI.getAll()
        ]);
        
        setFleets(fleetsData);
        setWarehouses(warehousesData);
        
        // Expand all warehouses by default
        const initialExpanded = {};
        warehousesData.forEach(w => { initialExpanded[w.id] = true; });
        setExpandedWarehouses(initialExpanded);
      } catch (err) {
        console.error('Error loading data:', err);
        setFleets([]);
        setWarehouses([]);
      } finally {
        setFleetsLoading(false);
        setWarehousesLoading(false);
      }
    };
    if (open) loadData();
  }, [open]);

  // Group fleets by warehouse
  const fleetsByWarehouse = useMemo(() => {
    const grouped = {};
    
    // Add warehouses with fleets
    warehouses.forEach(warehouse => {
      const warehouseFleets = fleets.filter(f => f.warehouse_id === warehouse.id);
      if (warehouseFleets.length > 0) {
        grouped[warehouse.id] = {
          warehouse,
          fleets: warehouseFleets
        };
      }
    });
    
    // Add fleets without warehouse (warehouse_id is null)
    const orphanFleets = fleets.filter(f => !f.warehouse_id);
    if (orphanFleets.length > 0) {
      grouped['orphan'] = {
        warehouse: { id: 'orphan', name: 'Unassigned Fleets' },
        fleets: orphanFleets
      };
    }
    
    return grouped;
  }, [fleets, warehouses]);

  // Filter fleets for flat view
  const filteredFleets = useMemo(() => {
    if (!searchQuery.trim()) return fleets;
    
    const q = searchQuery.toLowerCase();
    return fleets.filter(f => 
      f.vehicle.toLowerCase().includes(q) ||
      f.vehicle_type.toLowerCase().includes(q) ||
      (f.fuel_type && f.fuel_type.toLowerCase().includes(q)) ||
      (f.warehouse_name && f.warehouse_name.toLowerCase().includes(q))
    );
  }, [fleets, searchQuery]);

  const toggleWarehouse = (warehouseId) => {
    setExpandedWarehouses(prev => ({
      ...prev,
      [warehouseId]: !prev[warehouseId]
    }));
  };

  const expandAll = () => {
    const allExpanded = {};
    Object.keys(fleetsByWarehouse).forEach(id => { allExpanded[id] = true; });
    setExpandedWarehouses(allExpanded);
  };

  const collapseAll = () => {
    const allCollapsed = {};
    Object.keys(fleetsByWarehouse).forEach(id => { allCollapsed[id] = false; });
    setExpandedWarehouses(allCollapsed);
  };

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
        maxWidth="lg"
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
          {/* Search Row */}
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <TextField
              size="small"
              fullWidth
              placeholder="Search by vehicle, type, fuel or warehouse..."
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
          </Box>

          {/* View Mode Toggle */}
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <Button
              variant={viewMode === 'grouped' ? 'contained' : 'outlined'}
              size="small"
              onClick={() => setViewMode('grouped')}
              sx={{ textTransform: 'none' }}
            >
              Grouped by Warehouse
            </Button>
            <Button
              variant={viewMode === 'flat' ? 'contained' : 'outlined'}
              size="small"
              onClick={() => setViewMode('flat')}
              sx={{ textTransform: 'none' }}
            >
              Flat List
            </Button>
            {viewMode === 'grouped' && (
              <>
                <Button
                  variant="text"
                  size="small"
                  onClick={expandAll}
                  sx={{ textTransform: 'none', ml: 'auto' }}
                >
                  Expand All
                </Button>
                <Button
                  variant="text"
                  size="small"
                  onClick={collapseAll}
                  sx={{ textTransform: 'none' }}
                >
                  Collapse All
                </Button>
              </>
            )}
          </Box>

          {fleetsLoading || warehousesLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          ) : viewMode === 'grouped' ? (
            // Grouped by Warehouse View
            <Box sx={{ maxHeight: '60vh', overflow: 'auto' }}>
              {Object.entries(fleetsByWarehouse).map(([warehouseId, { warehouse, fleets: warehouseFleets }]) => (
                <Paper 
                  key={warehouseId} 
                  variant="outlined" 
                  sx={{ mb: 2, borderRadius: 2, overflow: 'hidden' }}
                >
                  {/* Warehouse Header */}
                  <Box
                    onClick={() => toggleWarehouse(warehouseId)}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      p: 1.5,
                      cursor: 'pointer',
                      backgroundColor: theme.palette.action.hover,
                      borderBottom: expandedWarehouses[warehouseId] ? `1px solid ${theme.palette.divider}` : 'none',
                      '&:hover': { backgroundColor: theme.palette.action.selected }
                    }}
                  >
                    <IconButton size="small" sx={{ mr: 1 }}>
                      {expandedWarehouses[warehouseId] ? <ExpandLess /> : <ExpandMore />}
                    </IconButton>
                    <WarehouseIcon sx={{ mr: 1, color: '#4CAF50' }} />
                    <Typography variant="subtitle1" fontWeight={600}>
                      {warehouse.name}
                    </Typography>
                    <Chip 
                      label={`${warehouseFleets.length} fleet${warehouseFleets.length !== 1 ? 's' : ''}`} 
                      size="small" 
                      sx={{ ml: 'auto' }}
                    />
                  </Box>
                  
                  {/* Fleets Table - Collapsible */}
                  <Collapse in={expandedWarehouses[warehouseId]}>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }}>
                            <TableCell sx={{ fontWeight: 600 }}>Vehicle</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                            <TableCell sx={{ fontWeight: 600 }} align="right">Count</TableCell>
                            <TableCell sx={{ fontWeight: 600 }} align="right">Capacity</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Fuel</TableCell>
                            <TableCell sx={{ fontWeight: 600 }} align="center">Available</TableCell>
                            <TableCell sx={{ fontWeight: 600 }} align="center" width={50}></TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {warehouseFleets.map((fleet) => (
                            <TableRow key={fleet.id} hover>
                              <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                  <LocalShippingIcon sx={{ mr: 1, color: '#4CAF50', fontSize: 20 }} />
                                  <Typography variant="body2" fontWeight={500}>{fleet.vehicle}</Typography>
                                </Box>
                              </TableCell>
                              <TableCell>{fleet.vehicle_type}</TableCell>
                              <TableCell align="right">{fleet.count}</TableCell>
                              <TableCell align="right">{fleet.capacity ? `${fleet.capacity}t` : '-'}</TableCell>
                              <TableCell>
                                {fleet.fuel_type && (
                                  <Chip 
                                    label={fleet.fuel_type} 
                                    size="small" 
                                    sx={{ fontSize: '0.75rem' }}
                                  />
                                )}
                              </TableCell>
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
                                  <Edit fontSize="small" />
                                </IconButton>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Collapse>
                </Paper>
              ))}
              {Object.keys(fleetsByWarehouse).length === 0 && (
                <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                  <Typography>No fleets found</Typography>
                </Box>
              )}
            </Box>
          ) : (
            // Flat List View
            <TableContainer sx={{ maxHeight: '60vh', border: `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Vehicle</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">Count</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">Capacity</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Fuel</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Warehouse</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="center">Available</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="center" width={50}></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredFleets.map((fleet) => (
                    <TableRow key={fleet.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <LocalShippingIcon sx={{ mr: 1, color: '#4CAF50', fontSize: 20 }} />
                          <Typography variant="body2" fontWeight={500}>{fleet.vehicle}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>{fleet.vehicle_type}</TableCell>
                      <TableCell align="right">{fleet.count}</TableCell>
                      <TableCell align="right">{fleet.capacity ? `${fleet.capacity}t` : '-'}</TableCell>
                      <TableCell>
                        {fleet.fuel_type && (
                          <Chip 
                            label={fleet.fuel_type} 
                            size="small" 
                            sx={{ fontSize: '0.75rem' }}
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        {fleet.warehouse_name || (
                          <Typography variant="body2" color="text.secondary">Unassigned</Typography>
                        )}
                      </TableCell>
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
                          <Edit fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredFleets.length === 0 && (
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

