import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, Button, TextField, Box, useTheme, CircularProgress, Typography } from '@mui/material';
import { Add, LocationOn } from '@mui/icons-material';
import { warehousesAPI } from '../services/api';

function AddWarehouseDialog({ open, onClose, onShowSnackbar, onWarehouseCreated }) {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [state, setState] = useState('');
  const [rentType, setRentType] = useState('WH Rent');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [locationSelectionActive, setLocationSelectionActive] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      setName('');
      setAddress('');
      setState('');
      setRentType('WH Rent');
      setLatitude('');
      setLongitude('');
      setLocationSelectionActive(false);
      setErrors({});
    }
  }, [open]);

  const handleToggleLocationSelection = () => {
    setLocationSelectionActive(!locationSelectionActive);
    if (!locationSelectionActive) {
      onShowSnackbar?.('Click on map to set location', 'info');
    }
  };

  const handleCreate = async () => {
    const newErrors = {};
    if (!name.trim()) newErrors.name = 'Name is required';
    if (!latitude) newErrors.latitude = 'Latitude is required';
    if (!longitude) newErrors.longitude = 'Longitude is required';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const warehouse = await warehousesAPI.create({
        name: name.trim(),
        address: address.trim(),
        state: state.trim(),
        rent_type: rentType,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
      });
      
      onShowSnackbar?.('Warehouse created successfully', 'success');
      onWarehouseCreated?.(warehouse);
      onClose();
    } catch (err) {
      console.error('Create warehouse error:', err);
      if (err.response?.data?.error) {
        setErrors({ name: err.response.data.error });
      } else {
        onShowSnackbar?.('Failed to create warehouse', 'error');
      }
    }
    setLoading(false);
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
      <DialogTitle sx={{ textAlign: 'center', pb: 2, fontWeight: 600 }}>Add New Warehouse</DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Warehouse Name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setErrors(prev => ({ ...prev, name: '' }));
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && name.trim() && latitude && longitude) {
                handleCreate();
              } else if (e.key === 'Escape') {
                onClose();
              }
            }}
            placeholder="Enter warehouse name"
            variant="outlined"
            fullWidth
            error={!!errors.name}
            helperText={errors.name}
            disabled={loading}
          />

          <TextField
            label="Address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Enter address"
            variant="outlined"
            fullWidth
            multiline
            rows={2}
            disabled={loading}
          />

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="State"
              value={state}
              onChange={(e) => setState(e.target.value)}
              placeholder="Enter state"
              variant="outlined"
              sx={{ flex: 1 }}
              disabled={loading}
            />
            <TextField
              label="Rent Type"
              value={rentType}
              onChange={(e) => setRentType(e.target.value)}
              select
              variant="outlined"
              sx={{ flex: 1 }}
              disabled={loading}
              SelectProps={{ native: true }}
            >
              <option value="WH Rent">WH Rent</option>
              <option value="Owner">Owner</option>
              <option value="Lease">Lease</option>
            </TextField>
          </Box>

          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
            <TextField
              label="Latitude"
              value={latitude}
              onChange={(e) => {
                setLatitude(e.target.value);
                setErrors(prev => ({ ...prev, latitude: '' }));
              }}
              placeholder="e.g., 26.516654"
              variant="outlined"
              sx={{ flex: 1 }}
              error={!!errors.latitude}
              helperText={errors.latitude}
              disabled={loading}
            />
            <TextField
              label="Longitude"
              value={longitude}
              onChange={(e) => {
                setLongitude(e.target.value);
                setErrors(prev => ({ ...prev, longitude: '' }));
              }}
              placeholder="e.g., 80.231507"
              variant="outlined"
              sx={{ flex: 1 }}
              error={!!errors.longitude}
              helperText={errors.longitude}
              disabled={loading}
            />
            <Button
              variant={locationSelectionActive ? 'contained' : 'outlined'}
              onClick={handleToggleLocationSelection}
              sx={{ 
                mt: 0.5, 
                minWidth: 'auto',
                px: 1,
                backgroundColor: locationSelectionActive ? theme.palette.primary.main : undefined 
              }}
              disabled={loading}
            >
              <LocationOn />
            </Button>
          </Box>

          {locationSelectionActive && (
            <Typography variant="caption" color="info.main" sx={{ display: 'block', textAlign: 'center' }}>
              Click on the map to set location coordinates
            </Typography>
          )}

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 1 }}>
            <Button
              onClick={onClose}
              variant="text"
              sx={{ textTransform: 'none' }}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              variant="contained"
              disabled={loading || !name.trim() || !latitude || !longitude}
              sx={{ textTransform: 'none', boxShadow: 1 }}
            >
              {loading ? <CircularProgress size={20} color="inherit" /> : 'Create Warehouse'}
            </Button>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
}

export default AddWarehouseDialog;

