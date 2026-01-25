import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, Button, TextField, Box, useTheme, CircularProgress, Typography } from '@mui/material';
import { LocalShipping as LocalShippingIcon } from '@mui/icons-material';
import { fleetsAPI } from '../services/api';

function AddFleetDialog({ open, onClose, onShowSnackbar, onFleetCreated, editData }) {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [vehicle, setVehicle] = useState('');
  const [vehicleType, setVehicleType] = useState('Truck');
  const [count, setCount] = useState(1);
  const [available, setAvailable] = useState(1);
  const [capacity, setCapacity] = useState('');
  const [fuelType, setFuelType] = useState('Diesel');
  const [area, setArea] = useState('');
  const [errors, setErrors] = useState({});

  const isEditing = Boolean(editData?.id);

  useEffect(() => {
    if (open) {
      if (editData) {
        setVehicle(editData.vehicle || '');
        setVehicleType(editData.vehicle_type || 'Truck');
        setCount(editData.count || 1);
        setAvailable(editData.available || 1);
        setCapacity(editData.capacity || '');
        setFuelType(editData.fuel_type || 'Diesel');
        setArea(editData.area || '');
      } else {
        // Reset form for new entry
        setVehicle('');
        setVehicleType('Truck');
        setCount(1);
        setAvailable(1);
        setCapacity('');
        setFuelType('Diesel');
        setArea('');
      }
      setErrors({});
    }
  }, [open, editData]);

  // Update available when count changes (only for new entries)
  useEffect(() => {
    if (!isEditing) {
      setAvailable(count);
    }
  }, [count, isEditing]);

  const handleCreate = async () => {
    const newErrors = {};
    if (!vehicle.trim()) newErrors.vehicle = 'Vehicle name is required';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      if (isEditing) {
        // Update existing fleet
        const updated = await fleetsAPI.update(editData.id, {
          vehicle: vehicle.trim(),
          vehicle_type: vehicleType,
          count: parseInt(count) || 1,
          available: parseInt(available) || 1,
          capacity: capacity ? parseInt(capacity) : null,
          fuel_type: fuelType,
          area: area.trim(),
        });
        onShowSnackbar?.('Fleet updated successfully', 'success');
        onFleetCreated?.(updated);
      } else {
        // Create new fleet
        const fleet = await fleetsAPI.create({
          vehicle: vehicle.trim(),
          vehicle_type: vehicleType,
          count: parseInt(count) || 1,
          available: parseInt(available) || 1,
          capacity: capacity ? parseInt(capacity) : null,
          fuel_type: fuelType,
          area: area.trim(),
        });
        onShowSnackbar?.('Fleet created successfully', 'success');
        onFleetCreated?.(fleet);
      }
      onClose();
    } catch (err) {
      console.error('Save fleet error:', err);
      if (err.response?.data?.error) {
        setErrors({ vehicle: err.response.data.error });
      } else {
        onShowSnackbar?.(isEditing ? 'Failed to update fleet' : 'Failed to create fleet', 'error');
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
      <DialogTitle sx={{ textAlign: 'center', pb: 2, fontWeight: 600 }}>
        {isEditing ? 'Edit Fleet' : 'Add New Fleet'}
      </DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Vehicle Name / Number"
            value={vehicle}
            onChange={(e) => {
              setVehicle(e.target.value);
              setErrors(prev => ({ ...prev, vehicle: '' }));
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && vehicle.trim()) {
                handleCreate();
              } else if (e.key === 'Escape') {
                onClose();
              }
            }}
            placeholder="e.g., MH-12-AB-1234"
            variant="outlined"
            fullWidth
            error={!!errors.vehicle}
            helperText={errors.vehicle}
            disabled={loading}
          />

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="Vehicle Type"
              value={vehicleType}
              onChange={(e) => setVehicleType(e.target.value)}
              select
              variant="outlined"
              sx={{ flex: 1 }}
              disabled={loading}
              SelectProps={{ native: true }}
            >
              <option value="Truck">Truck</option>
              <option value="Tempo">Tempo</option>
              <option value="Pickup">Pickup</option>
              <option value="Tractor">Tractor</option>
              <option value="Other">Other</option>
            </TextField>
          </Box>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="Total Count"
              value={count}
              onChange={(e) => {
                const val = parseInt(e.target.value) || 0;
                setCount(Math.max(1, val));
              }}
              type="number"
              inputProps={{ min: 1, max: 1000 }}
              variant="outlined"
              sx={{ flex: 1 }}
              disabled={loading}
            />
            <TextField
              label="Available"
              value={available}
              onChange={(e) => {
                let val = parseInt(e.target.value) || 0;
                // Ensure available doesn't exceed count
                val = Math.min(Math.max(0, val), count);
                setAvailable(val);
              }}
              type="number"
              inputProps={{ min: 0, max: count }}
              variant="outlined"
              sx={{ flex: 1 }}
              disabled={loading}
              error={available > count}
              helperText={available > count ? 'Available cannot exceed count' : ''}
            />
          </Box>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="Capacity (tons)"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              type="number"
              inputProps={{ min: 0 }}
              placeholder="e.g., 10"
              variant="outlined"
              sx={{ flex: 1 }}
              disabled={loading}
            />
            <TextField
              label="Fuel Type"
              value={fuelType}
              onChange={(e) => setFuelType(e.target.value)}
              select
              variant="outlined"
              sx={{ flex: 1 }}
              disabled={loading}
              SelectProps={{ native: true }}
            >
              <option value="Diesel">Diesel</option>
              <option value="Petrol">Petrol</option>
              <option value="CNG">CNG</option>
              <option value="Electric">Electric</option>
            </TextField>
          </Box>

          <TextField
            label="Area / Zone"
            value={area}
            onChange={(e) => setArea(e.target.value)}
            placeholder="e.g., North Zone"
            variant="outlined"
            fullWidth
            disabled={loading}
          />

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
              disabled={loading || !vehicle.trim() || available > count}
              sx={{ textTransform: 'none', boxShadow: 1 }}
            >
              {loading ? <CircularProgress size={20} color="inherit" /> : isEditing ? 'Update Fleet' : 'Create Fleet'}
            </Button>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
}

export default AddFleetDialog;

