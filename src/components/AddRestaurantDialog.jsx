import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, Button, TextField, Box, useTheme, CircularProgress, Typography } from '@mui/material';
import { Restaurant as RestaurantIcon } from '@mui/icons-material';
import { restaurantsAPI } from '../services/api';

function AddRestaurantDialog({ open, onClose, onShowSnackbar, onRestaurantCreated }) {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [outletName, setOutletName] = useState('');
  const [area, setArea] = useState('');
  const [city, setCity] = useState('');
  const [pincode, setPincode] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [errors, setErrors] = useState({});

  const resetForm = () => {
    setOutletName('');
    setArea('');
    setCity('');
    setPincode('');
    setLatitude('');
    setLongitude('');
    setErrors({});
  };

  useEffect(() => {
    if (open) {
      resetForm();
    }
  }, [open]);

  const handleCreate = async () => {
    const newErrors = {};
    if (!outletName.trim()) newErrors.outletName = 'Outlet name is required';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const restaurant = await restaurantsAPI.create({
        outlet_name: outletName.trim(),
        area: area.trim(),
        city: city.trim(),
        pincode: pincode ? parseInt(pincode) : null,
        latitude: latitude || null,
        longitude: longitude || null,
      });
      
      onShowSnackbar?.('Restaurant created successfully', 'success');
      onRestaurantCreated?.(restaurant);
      onClose();
    } catch (err) {
      console.error('Create restaurant error:', err);
      if (err.response?.data?.error) {
        setErrors({ outletName: err.response.data.error });
      } else {
        onShowSnackbar?.('Failed to create restaurant', 'error');
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
      <DialogTitle sx={{ textAlign: 'center', pb: 2, fontWeight: 600 }}>Add New Restaurant</DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Outlet Name"
            value={outletName}
            onChange={(e) => {
              setOutletName(e.target.value);
              setErrors(prev => ({ ...prev, outletName: '' }));
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && outletName.trim()) {
                handleCreate();
              } else if (e.key === 'Escape') {
                onClose();
              }
            }}
            placeholder="e.g., Anardana (BK)"
            variant="outlined"
            fullWidth
            error={!!errors.outletName}
            helperText={errors.outletName}
            disabled={loading}
          />

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="Area"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              placeholder="e.g., Basant Kunj"
              variant="outlined"
              sx={{ flex: 1 }}
              disabled={loading}
            />
            <TextField
              label="City"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g., Delhi"
              variant="outlined"
              sx={{ flex: 1 }}
              disabled={loading}
            />
          </Box>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="Pincode"
              value={pincode}
              onChange={(e) => setPincode(e.target.value)}
              type="number"
              placeholder="e.g., 110070"
              variant="outlined"
              sx={{ flex: 1 }}
              disabled={loading}
              inputProps={{ min: 100000, max: 999999 }}
            />
          </Box>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="Latitude"
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
              placeholder="e.g., 28.5216"
              variant="outlined"
              sx={{ flex: 1 }}
              disabled={loading}
            />
            <TextField
              label="Longitude"
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
              placeholder="e.g., 77.1586"
              variant="outlined"
              sx={{ flex: 1 }}
              disabled={loading}
            />
          </Box>

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
              disabled={loading || !outletName.trim()}
              sx={{ textTransform: 'none', boxShadow: 1 }}
            >
              {loading ? <CircularProgress size={20} color="inherit" /> : 'Create Restaurant'}
            </Button>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
}

export default AddRestaurantDialog;

