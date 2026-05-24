import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogTitle, DialogContent, Button, TextField, List, ListItem, Box, useTheme, CircularProgress, Typography, InputAdornment, Menu, MenuItem, ListItemIcon, ListItemText, IconButton, Checkbox, Stepper, Step, StepLabel, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Select, TablePagination } from '@mui/material';
import { Folder as FolderIcon, Search, Sort, SwapVertRounded, ArrowBack, ArrowForward, LocalShipping as LocalShippingIcon, Restaurant as RestaurantIcon, AccessTime } from '@mui/icons-material';

import { warehousesAPI, fleetsAPI, restaurantsAPI, optimizeAPI } from '../services/api';

function OptimizeRouteDialog({ open, onClose, onShowSnackbar, onNext }) {
  const theme = useTheme();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  
  // Step 1: Warehouses
  const [warehouses, setWarehouses] = useState([]);
  const [selectedWarehouseIds, setSelectedWarehouseIds] = useState([]);
  const [warehousesLoading, setWarehousesLoading] = useState(false);
  const [warehouseAmounts, setWarehouseAmounts] = useState({});
  
  // Step 2: Fleets
  const [fleets, setFleets] = useState([]);
  const [fleetsLoading, setFleetsLoading] = useState(false);
  const [fleetAvailabilities, setFleetAvailabilities] = useState({});
  
  // Step 3: Restaurants
  const [restaurants, setRestaurants] = useState([]);
  const [selectedRestaurantIds, setSelectedRestaurantIds] = useState([]);
  const [restaurantsLoading, setRestaurantsLoading] = useState(false);
const [restaurantAmounts, setRestaurantAmounts] = useState({});
  const [restaurantPriorities, setRestaurantPriorities] = useState({});
  const [restaurantTimeWindows, setRestaurantTimeWindows] = useState({});

  // Search and Sort
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState('newest');
  const [sortMenuAnchor, setSortMenuAnchor] = useState(null);

  // --- PAGINATION STATE ---
  const [warehousePage, setWarehousePage] = useState(0);
  const [warehouseRowsPerPage, setWarehouseRowsPerPage] = useState(10);
  const [restaurantPage, setRestaurantPage] = useState(0);
  const [restaurantRowsPerPage, setRestaurantRowsPerPage] = useState(10);

  // Reset pages when search changes
  useEffect(() => {
    setWarehousePage(0);
    setRestaurantPage(0);
  }, [searchQuery, sortOption]);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setStep(1);
      setSelectedWarehouseIds([]);
      setWarehouseAmounts({});
      setFleetAvailabilities({});
      setSelectedRestaurantIds([]);
      setRestaurantAmounts({});
      setSearchQuery('');
      setSortOption('newest');
    }
  }, [open]);

  // Load warehouses
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

  // Load fleets when step changes to 2
  useEffect(() => {
    const loadFleets = async () => {
      try {
        setFleetsLoading(true);
        const data = await fleetsAPI.getAll();
        setFleets(data);
        
        // Initialize fleet availabilities from loaded data
        const availabilities = {};
        data.forEach(fleet => {
          availabilities[fleet.id] = fleet.available;
        });
        setFleetAvailabilities(availabilities);
      } catch (err) {
        console.error('Error loading fleets:', err);
        setFleets([]);
      } finally {
        setFleetsLoading(false);
      }
    };
    if (open && step === 2) loadFleets();
  }, [open, step]);

  // Helper function to calculate average from UCO pickup history array
  const calculateAverageUCO = (history) => {
    if (!history || !Array.isArray(history) || history.length === 0) {
      return 0;
    }
    const sum = history.reduce((acc, val) => acc + (val || 0), 0);
    return Math.round((sum / history.length) * 100) / 100; // Round to 2 decimal places
  };

  // Load restaurants when step changes to 3
  useEffect(() => {
    const loadRestaurants = async () => {
      try {
        setRestaurantsLoading(true);
        const data = await restaurantsAPI.getAll();
        setRestaurants(data);
        
        // Calculate average UCO for each restaurant and set as default
        const defaultAmounts = {};
        data.forEach(restaurant => {
          const avgUCO = calculateAverageUCO(restaurant.uco_pickup_history);
          defaultAmounts[restaurant.id] = avgUCO.toString();
        });
        setRestaurantAmounts(defaultAmounts);
      } catch (err) {
        console.error('Error loading restaurants:', err);
        setRestaurants([]);
      } finally {
        setRestaurantsLoading(false);
      }
    };
    if (open && step === 3) loadRestaurants();
  }, [open, step]);

  // Filter and Sort Warehouses/Restaurants
  const processedItems = useMemo(() => {
    let filtered = [...(step === 1 ? warehouses : restaurants)];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(item => 
        item.name?.toLowerCase().includes(q) || 
        (item.outlet_name && item.outlet_name.toLowerCase().includes(q)) ||
        (item.address && item.address.toLowerCase().includes(q)) ||
        (item.area && item.area.toLowerCase().includes(q))
      );
    }

    filtered.sort((a, b) => {
      const nameA = (a.name || a.outlet_name || '').toLowerCase();
      const nameB = (b.name || b.outlet_name || '').toLowerCase();
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
  }, [warehouses, restaurants, searchQuery, sortOption, step]);

  // Get the paginated slice of the filtered items
  const paginatedItems = useMemo(() => {
    const page = step === 1 ? warehousePage : restaurantPage;
    const rowsPerPage = step === 1 ? warehouseRowsPerPage : restaurantRowsPerPage;
    return processedItems.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [processedItems, step, warehousePage, warehouseRowsPerPage, restaurantPage, restaurantRowsPerPage]);

  // Get selected warehouses with details
  const selectedWarehouses = useMemo(() => {
    return warehouses.filter(w => selectedWarehouseIds.includes(w.id)).map(w => ({
      ...w,
      amount: warehouseAmounts[w.id] || ''
    }));
  }, [warehouses, selectedWarehouseIds, warehouseAmounts]);

  // Get fleets grouped by warehouse for selected warehouses
  const fleetsByWarehouse = useMemo(() => {
    const grouped = {};
    
    // Get fleets for selected warehouses
    selectedWarehouseIds.forEach(warehouseId => {
      const warehouseFleets = fleets.filter(f => f.warehouse_id === warehouseId);
      const warehouse = warehouses.find(w => w.id === warehouseId);
      if (warehouseFleets.length > 0) {
        grouped[warehouseId] = {
          warehouse,
          fleets: warehouseFleets
        };
      }
    });
    
    // Also include fleets without warehouse (orphan fleets)
    const orphanFleets = fleets.filter(f => !f.warehouse_id);
    if (orphanFleets.length > 0) {
      grouped['orphan'] = {
        warehouse: { id: 'orphan', name: 'Unassigned Fleets' },
        fleets: orphanFleets
      };
    }
    
    return grouped;
  }, [fleets, warehouses, selectedWarehouseIds]);

  // Handle checkbox toggle for warehouses
  const handleWarehouseToggle = (warehouseId) => {
    setSelectedWarehouseIds(prev => {
      if (prev.includes(warehouseId)) {
        const next = prev.filter(id => id !== warehouseId);
        setWarehouseAmounts(prevAmounts => {
          const nextAmounts = { ...prevAmounts };
          delete nextAmounts[warehouseId];
          return nextAmounts;
        });
        return next;
      } else {
        return [...prev, warehouseId];
      }
    });
  };

  // Handle amount change for warehouse
  const handleWarehouseAmountChange = (warehouseId, value) => {
    setWarehouseAmounts(prev => ({
      ...prev,
      [warehouseId]: value
    }));
  };

  // Handle fleet availability change
  const handleFleetAvailabilityChange = (fleetId, value) => {
    const fleet = fleets.find(f => f.id === fleetId);
    if (!fleet) return;
    
    let numValue = parseInt(value) || 0;
    // Ensure value doesn't exceed total count
    numValue = Math.min(Math.max(0, numValue), fleet.count);
    
    setFleetAvailabilities(prev => ({
      ...prev,
      [fleetId]: numValue
    }));
  };

  // Handle checkbox toggle for restaurants
  const handleRestaurantToggle = (restaurantId) => {
    setSelectedRestaurantIds(prev => {
      if (prev.includes(restaurantId)) {
        const next = prev.filter(id => id !== restaurantId);
        setRestaurantAmounts(prevAmounts => {
          const nextAmounts = { ...prevAmounts };
          delete nextAmounts[restaurantId];
          return nextAmounts;
        });
        setRestaurantPriorities(prev => {
          const next = { ...prev };
          delete next[restaurantId];
          return next;
        });
        setRestaurantTimeWindows(prev => {
          const next = { ...prev };
          delete next[restaurantId];
          return next;
        });
        return next;
      } else {
        return [...prev, restaurantId];
      }
    });
  };

// Handle amount change for restaurant
  const handleRestaurantAmountChange = (restaurantId, value) => {
    setRestaurantAmounts(prev => ({
      ...prev,
      [restaurantId]: value
    }));
  };

  const [timeWindowAnchor, setTimeWindowAnchor] = useState({ open: false, restaurantId: null });

  const handleTimeWindowChange = (restaurantId, field, value) => {
    setRestaurantTimeWindows(prev => ({
      ...prev,
      [restaurantId]: {
        ...prev[restaurantId],
        [field]: value
      }
    }));
  };

  // Snap to quarter hour
  const snapToQuarter = (timeStr) => {
    const match = timeStr.match(/(\d+):(\d+)/);
    if (!match) return timeStr;
    let [, hour, min] = match;
    hour = parseInt(hour);
    min = parseInt(min);
    min = Math.round(min / 15) * 15;
    if (min === 60) {
      min = 0;
      hour = (hour + 1) % 24;
    }
    if (hour < 8) hour = 8;
    if (hour > 17) hour = 17;
    return `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
  };

  const closeTimeWindowPopup = () => {
    setTimeWindowAnchor({ open: false, restaurantId: null });
  };

  // Format address for display
  const formatAddress = (address, maxLength = 25) => {
    if (!address) return '-';
    if (address.length <= maxLength) return address;
    return address.substring(0, maxLength) + '...';
  };

  const [optimizing, setOptimizing] = useState(false);

  // Navigation handlers
  const goToStep = (newStep) => {
    // Reset search when changing steps
    setSearchQuery('');
    
    if (newStep === 2 && selectedWarehouseIds.length === 0) {
      if (onShowSnackbar) onShowSnackbar('Please select at least one warehouse', 'warning');
      return;
    }
    if (newStep === 3 && Object.keys(fleetsByWarehouse).length === 0) {
      if (onShowSnackbar) onShowSnackbar('No fleets available for selected warehouses', 'warning');
      return;
    }
    setStep(newStep);
  };

  const handleOptimize = async () => {
    if (selectedRestaurantIds.length === 0) {
      if (onShowSnackbar) onShowSnackbar('Please select at least one restaurant', 'warning');
      return;
    }

    setOptimizing(true);

    try {
      const result = {
        warehouses: selectedWarehouses.map(w => ({
          id: w.id,
          name: w.name,
          address: w.address,
          latitude: w.latitude,
          longitude: w.longitude
        })),
        fleets: Object.entries(fleetsByWarehouse).map(([_, { warehouse, fleets: warehouseFleets }]) => ({
          warehouseId: warehouse.id === 'orphan' ? null : warehouse.id,
          warehouseName: warehouse.name,
          fleets: warehouseFleets.map(fleet => ({
            id: fleet.id,
            vehicle: fleet.vehicle,
            vehicle_type: fleet.vehicle_type,
            capacity: fleet.capacity,
            totalCount: fleet.count,
            availableCount: fleetAvailabilities[fleet.id] !== undefined ? fleetAvailabilities[fleet.id] : fleet.available
          }))
        })),
            restaurants: restaurants
              .filter(r => selectedRestaurantIds.includes(r.id))
              .map(r => ({
                id: r.id,
                name: r.outlet_name,
                address: formatAddress(r.area, 30) + (r.city ? `, ${r.city}` : ''),
                amount: restaurantAmounts[r.id] || '',
                priorityLevel: restaurantPriorities[r.id] || 1,
                timeWindow: restaurantTimeWindows[r.id] || undefined,
                latitude: r.latitude,
                longitude: r.longitude
              }))
      };

      // Call backend API for route optimization
      const optimizationResult = await optimizeAPI.optimizeRoute(result);
      
      if (onNext) {
        onNext(optimizationResult);
      }
      onClose();
    } catch (error) {
      console.error('Route optimization error:', error);
      if (onShowSnackbar) {
        onShowSnackbar(error.message || 'Failed to optimize route', 'error');
      }
    } finally {
      setOptimizing(false);
    }
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
      {/* Stepper */}
      <Box sx={{ mb: 2 }}>
        <Stepper activeStep={step - 1} alternativeLabel>
          <Step>
            <StepLabel>Select Warehouses</StepLabel>
          </Step>
          <Step>
            <StepLabel>Confirm Fleets Availability</StepLabel>
          </Step>
          <Step>
            <StepLabel>Select Restaurants</StepLabel>
          </Step>
        </Stepper>
      </Box>

      {/* Step 1: Select Warehouses */}
      {step === 1 && (
        <>
          <DialogTitle sx={{ textAlign: 'center', pb: 0, fontWeight: 600 }}>
            Select Warehouses
          </DialogTitle>
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
              <Button
                variant="outlined"
                onClick={() => {
                  if (selectedWarehouseIds.length === warehouses.length) {
                    setSelectedWarehouseIds([]);
                  } else {
                    setSelectedWarehouseIds(warehouses.map(w => w.id));
                  }
                }}
                sx={{ borderColor: theme.palette.divider }}
              >
                {selectedWarehouseIds.length === warehouses.length ? 'Deselect All' : 'Select All'}
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
                  <ListItemIcon><Sort fontSize="small" /></ListItemIcon>
                  <ListItemText>Name (A-Z)</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => { setSortOption('za'); setSortMenuAnchor(null); }} selected={sortOption === 'za'}>
                  <ListItemIcon><Sort fontSize="small" /></ListItemIcon>
                  <ListItemText>Name (Z-A)</ListItemText>
                </MenuItem>
              </Menu>
            </Box>

            {warehousesLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <CircularProgress />
              </Box>
            ) : (
              <>
                <List sx={{ maxHeight: '40vh', overflow: 'auto', mb: 1, border: `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
                  {/* 👇 CHANGED to paginatedItems 👇 */}
                  {paginatedItems.map((warehouse) => (
                    <ListItem key={warehouse.id} disablePadding>
                      <Box
                        onClick={() => handleWarehouseToggle(warehouse.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleWarehouseToggle(warehouse.id);
                        }}
                        tabIndex={0}
                        sx={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          p: 1.5,
                          cursor: 'pointer',
                          backgroundColor: selectedWarehouseIds.includes(warehouse.id) ? theme.palette.action.selected : 'transparent',
                          '&:hover': { backgroundColor: theme.palette.action.hover },
                          borderBottom: `1px solid ${theme.palette.divider}`
                        }}
                      >
                        <Checkbox
                          checked={selectedWarehouseIds.includes(warehouse.id)}
                          onChange={() => handleWarehouseToggle(warehouse.id)}
                          onClick={(e) => e.stopPropagation()}
                          sx={{ mr: 1 }}
                        />
                        <FolderIcon sx={{ mr: 2, color: '#4CAF50' }} />
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography variant="body1" fontWeight={500}>{warehouse.name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatAddress(warehouse.address, 40)}
                          </Typography>
                        </Box>
                      </Box>
                    </ListItem>
                  ))}
                  {processedItems.length === 0 && !warehousesLoading && (
                    <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
                      <Typography>No warehouses found</Typography>
                    </Box>
                  )}
                </List>
                
                {/* 👇 ADDED Pagination Component 👇 */}
                {!warehousesLoading && processedItems.length > 0 && (
                  <TablePagination
                    component="div"
                    count={processedItems.length}
                    page={warehousePage}
                    onPageChange={(e, newPage) => setWarehousePage(newPage)}
                    rowsPerPage={warehouseRowsPerPage}
                    onRowsPerPageChange={(e) => {
                      setWarehouseRowsPerPage(parseInt(e.target.value, 10));
                      setWarehousePage(0);
                    }}
                    rowsPerPageOptions={[10, 20, 50, 100]}
                    sx={{ mb: 2, borderBottom: 'none' }}
                  />
                )}
              </>
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
                onClick={() => goToStep(2)}
                variant="contained"
                disabled={selectedWarehouseIds.length === 0}
                sx={{ textTransform: 'none', boxShadow: 1 }}
                endIcon={<ArrowForward />}
              >
                Next ({selectedWarehouseIds.length} selected)
              </Button>
            </Box>
          </DialogContent>
        </>
      )}

      {/* Step 2: Confirm Fleets Availability */}
      {step === 2 && (
        <>
          <DialogTitle sx={{ textAlign: 'center', pb: 0, fontWeight: 600 }}>
            Confirm Fleets Availability
          </DialogTitle>
          <DialogContent sx={{ pt: 1 }}>
            {fleetsLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <CircularProgress />
              </Box>
            ) : (
              <Box sx={{ maxHeight: '50vh', overflow: 'auto' }}>
                {Object.entries(fleetsByWarehouse).map(([warehouseId, { warehouse, fleets: warehouseFleets }]) => (
                  <Paper key={warehouseId} variant="outlined" sx={{ mb: 2, borderRadius: 2, overflow: 'hidden' }}>
                    <Box sx={{ p: 1.5, backgroundColor: theme.palette.action.hover, borderBottom: `1px solid ${theme.palette.divider}` }}>
                      <Typography variant="subtitle2" fontWeight={600}>
                        {warehouse.name}
                      </Typography>
                    </Box>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }}>
                            <TableCell sx={{ fontWeight: 600 }}>Vehicle</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                            <TableCell sx={{ fontWeight: 600 }} align="center">Total</TableCell>
                            <TableCell sx={{ fontWeight: 600 }} align="center">Available</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {warehouseFleets.map((fleet) => (
                            <TableRow key={fleet.id}>
                              <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                  <LocalShippingIcon sx={{ mr: 1, color: '#4CAF50', fontSize: 20 }} />
                                  <Typography variant="body2" fontWeight={500}>{fleet.vehicle}</Typography>
                                </Box>
                              </TableCell>
                              <TableCell>{fleet.vehicle_type}</TableCell>
                              <TableCell align="center">
                                <Typography variant="body2">{fleet.count}</Typography>
                              </TableCell>
                              <TableCell align="center" sx={{ minWidth: 100 }}>
                                <TextField
                                  size="small"
                                  type="number"
                                  value={fleetAvailabilities[fleet.id] !== undefined ? fleetAvailabilities[fleet.id] : fleet.available}
                                  onChange={(e) => handleFleetAvailabilityChange(fleet.id, e.target.value)}
                                  inputProps={{ 
                                    min: 0, 
                                    max: fleet.count,
                                    style: { textAlign: 'center' }
                                  }}
                                  sx={{ width: 80 }}
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Paper>
                ))}
                {Object.keys(fleetsByWarehouse).length === 0 && (
                  <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                    <Typography>No fleets available for selected warehouses</Typography>
                  </Box>
                )}
              </Box>
            )}

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'space-between' }}>
              <Button
                onClick={() => setStep(1)}
                variant="outlined"
                sx={{ textTransform: 'none' }}
                startIcon={<ArrowBack />}
              >
                Back
              </Button>
              <Button
                onClick={() => goToStep(3)}
                variant="contained"
                sx={{ textTransform: 'none', boxShadow: 1 }}
                endIcon={<ArrowForward />}
                disabled={Object.keys(fleetsByWarehouse).length === 0}
              >
                Next
              </Button>
            </Box>
          </DialogContent>
        </>
      )}

      {/* Step 3: Select Restaurants */}
      {step === 3 && (
        <>
          <DialogTitle sx={{ textAlign: 'center', pb: 0, fontWeight: 600 }}>
            Select Restaurants
          </DialogTitle>
          <DialogContent sx={{ pt: 1 }}>
            {/* Search and Sort Row */}
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <TextField
                size="small"
                fullWidth
                placeholder="Search restaurants..."
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
                  <ListItemIcon><Sort fontSize="small" /></ListItemIcon>
                  <ListItemText>Name (A-Z)</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => { setSortOption('za'); setSortMenuAnchor(null); }} selected={sortOption === 'za'}>
                  <ListItemIcon><Sort fontSize="small" /></ListItemIcon>
                  <ListItemText>Name (Z-A)</ListItemText>
                </MenuItem>
              </Menu>
            </Box>

            {restaurantsLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <CircularProgress />
              </Box>
            ) : (
              <>
                <List sx={{ maxHeight: '40vh', overflow: 'auto', mb: 1, border: `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
                  {/* 👇 CHANGED to paginatedItems 👇 */}
                  {paginatedItems.map((restaurant) => (
                    <ListItem key={restaurant.id} disablePadding>
                      <Box
                        onClick={() => handleRestaurantToggle(restaurant.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRestaurantToggle(restaurant.id);
                        }}
                        tabIndex={0}
                        sx={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          p: 1.5,
                          cursor: 'pointer',
                          backgroundColor: selectedRestaurantIds.includes(restaurant.id) ? theme.palette.action.selected : 'transparent',
                          '&:hover': { backgroundColor: theme.palette.action.hover },
                          borderBottom: `1px solid ${theme.palette.divider}`
                        }}
                      >
                        <Checkbox
                          checked={selectedRestaurantIds.includes(restaurant.id)}
                          onChange={() => handleRestaurantToggle(restaurant.id)}
                          onClick={(e) => e.stopPropagation()}
                          sx={{ mr: 1 }}
                        />
                        <RestaurantIcon sx={{ mr: 2, color: '#FF5722' }} />
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography variant="body1" fontWeight={500}>{restaurant.outlet_name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatAddress((restaurant.area || '') + (restaurant.city ? `, ${restaurant.city}` : ''), 40)}
                          </Typography>
                        </Box>
                        {selectedRestaurantIds.includes(restaurant.id) && (
                          <>
                            <TextField
                              size="small"
                              placeholder="Amount (L)"
                              value={restaurantAmounts[restaurant.id] || ''}
                              onChange={(e) => handleRestaurantAmountChange(restaurant.id, e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              type="number"
                              sx={{ width: 100, mr: 1 }}
                              InputProps={{
                                endAdornment: <Typography sx={{ ml: 0.5 }}>L</Typography>
                              }}
                            />
                            <Select
                              size="small"
                              value={restaurantPriorities[restaurant.id] || 1}
                              onChange={(e) => setRestaurantPriorities(prev => ({ ...prev, [restaurant.id]: parseInt(e.target.value) }))}
                              onClick={(e) => e.stopPropagation()}
                              sx={{ width: 90, mr: 1 }}
                            >
                              <MenuItem value={1}>Normal</MenuItem>
                              <MenuItem value={2}>High</MenuItem>
                              <MenuItem value={3}>Supreme</MenuItem>
                            </Select>
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                setTimeWindowAnchor({ open: true, restaurantId: restaurant.id });
                              }}
                              sx={{ mr: 1 }}
                            >
                              <AccessTime />
                            </IconButton>
                            {restaurantTimeWindows[restaurant.id] && (
                              <Typography variant="caption" sx={{ mr: 1 }}>
                                {restaurantTimeWindows[restaurant.id].start}-{restaurantTimeWindows[restaurant.id].end}
                              </Typography>
                            )}
                          </>
                        )}
                      </Box>
                    </ListItem>
                  ))}
                  {processedItems.length === 0 && !restaurantsLoading && (
                    <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
                      <Typography>No restaurants found</Typography>
                    </Box>
                  )}
                </List>

                {/* 👇 ADDED Pagination Component 👇 */}
                {!restaurantsLoading && processedItems.length > 0 && (
                  <TablePagination
                    component="div"
                    count={processedItems.length}
                    page={restaurantPage}
                    onPageChange={(e, newPage) => setRestaurantPage(newPage)}
                    rowsPerPage={restaurantRowsPerPage}
                    onRowsPerPageChange={(e) => {
                      setRestaurantRowsPerPage(parseInt(e.target.value, 10));
                      setRestaurantPage(0);
                    }}
                    rowsPerPageOptions={[10, 20, 50, 100]}
                    sx={{ mb: 2, borderBottom: 'none' }}
                  />
                )}
              </>
            )}

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'space-between' }}>
              <Button
                onClick={() => setStep(2)}
                variant="outlined"
                sx={{ textTransform: 'none' }}
                startIcon={<ArrowBack />}
                disabled={optimizing}
              >
                Back
              </Button>
              <Button
                onClick={handleOptimize}
                variant="contained"
                sx={{ textTransform: 'none', boxShadow: 1 }}
                disabled={selectedRestaurantIds.length === 0 || optimizing}
              >
                {optimizing ? (
                  <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} />
                ) : null}
                Optimize Route ({selectedRestaurantIds.length} selected)
              </Button>
            </Box>
          </DialogContent>

          {/* Time Window Popup */}
          <Dialog
            open={timeWindowAnchor.open}
            onClose={closeTimeWindowPopup}
            maxWidth="xs"
          >
            <DialogTitle>Set Time Window</DialogTitle>
            <DialogContent>
              <TextField
                label="Start Time (HH:MM)"
                fullWidth
                value={restaurantTimeWindows[timeWindowAnchor.restaurantId]?.start || ''}
                onChange={(e) => handleTimeWindowChange(timeWindowAnchor.restaurantId, 'start', snapToQuarter(e.target.value))}
                sx={{ mb: 2 }}
              />
              <TextField
                label="End Time (HH:MM)"
                fullWidth
                value={restaurantTimeWindows[timeWindowAnchor.restaurantId]?.end || ''}
                onChange={(e) => handleTimeWindowChange(timeWindowAnchor.restaurantId, 'end', snapToQuarter(e.target.value))}
              />
              <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
                Minutes snap to quarters (00/15/30/45), 8AM-5PM
              </Typography>
            </DialogContent>
            <Box sx={{ p: 2, display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
              <Button onClick={closeTimeWindowPopup}>Cancel</Button>
              <Button variant="contained" onClick={closeTimeWindowPopup}>OK</Button>
            </Box>
          </Dialog>
        </>
      )}
    </Dialog>
  );
}

export default OptimizeRouteDialog;

