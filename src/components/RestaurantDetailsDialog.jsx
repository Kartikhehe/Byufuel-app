import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, Box, Button, TextField, Typography, useTheme, IconButton, Chip } from '@mui/material';
import { Close, Edit, Delete, Navigation, LocationOn, Restaurant } from '@mui/icons-material';
import { restaurantsAPI } from '../services/api';

function RestaurantDetailsDialog({ open, selectedRestaurantId, restaurantData, setRestaurantData, onClose, onSave, onDelete, onNavigate, currentLocation, locationSelectionActive, onToggleLocationSelection }) {
  const theme = useTheme();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSave = async () => {
    if (!restaurantData.outlet_name) {
      return;
    }
    setSaving(true);
    try {
      await onSave();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: {
          borderRadius: 3,
          p: 0
        }
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, pt: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Restaurant sx={{ mr: 1, color: '#FF5722' }} />
          <DialogTitle sx={{ p: 0, fontWeight: 600 }}>
            {restaurantData.id ? 'Restaurant Details' : 'New Restaurant'}
          </DialogTitle>
        </Box>
        <IconButton onClick={onClose} size="small">
          <Close />
        </IconButton>
      </Box>

      <DialogContent sx={{ px: 2, py: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Outlet Name */}
          <TextField
            label="Outlet Name"
            value={restaurantData.outlet_name || ''}
            onChange={(e) => setRestaurantData(prev => ({ ...prev, outlet_name: e.target.value }))}
            variant="outlined"
            fullWidth
            required
          />

          <Box sx={{ display: 'flex', gap: 2 }}>
            {/* Area */}
            <TextField
              label="Area"
              value={restaurantData.area || ''}
              onChange={(e) => setRestaurantData(prev => ({ ...prev, area: e.target.value }))}
              variant="outlined"
              sx={{ flex: 1 }}
            />
            {/* City */}
            <TextField
              label="City"
              value={restaurantData.city || ''}
              onChange={(e) => setRestaurantData(prev => ({ ...prev, city: e.target.value }))}
              variant="outlined"
              sx={{ flex: 1 }}
            />
          </Box>

          <Box sx={{ display: 'flex', gap: 2 }}>
            {/* Pincode */}
            <TextField
              label="Pincode"
              value={restaurantData.pincode || ''}
              onChange={(e) => setRestaurantData(prev => ({ ...prev, pincode: e.target.value }))}
              type="number"
              variant="outlined"
              sx={{ flex: 1 }}
            />
            {/* Amount */}
            <TextField
              label="Amount (₹)"
              value={restaurantData.amount || ''}
              onChange={(e) => setRestaurantData(prev => ({ ...prev, amount: e.target.value }))}
              type="number"
              variant="outlined"
              sx={{ flex: 1 }}
              InputProps={{
                startAdornment: <Typography sx={{ mr: 0.5 }}>₹</Typography>
              }}
            />
          </Box>

          {/* Location Section */}
          <Box sx={{ 
            p: 2, 
            border: `1px solid ${theme.palette.divider}`, 
            borderRadius: 2,
            backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)'
          }}>
            <Typography variant="subtitle2" sx={{ mb: 1.5, display: 'flex', alignItems: 'center' }}>
              <LocationOn sx={{ mr: 0.5, fontSize: 18 }} /> Location
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <TextField
                label="Latitude"
                value={restaurantData.latitude || ''}
                onChange={(e) => setRestaurantData(prev => ({ ...prev, latitude: e.target.value }))}
                placeholder="e.g., 28.5216"
                size="small"
                sx={{ flex: 1 }}
              />
              <TextField
                label="Longitude"
                value={restaurantData.longitude || ''}
                onChange={(e) => setRestaurantData(prev => ({ ...prev, longitude: e.target.value }))}
                placeholder="e.g., 77.1586"
                size="small"
                sx={{ flex: 1 }}
              />
            </Box>
            
            <Button
              variant={locationSelectionActive ? "contained" : "outlined"}
              color={locationSelectionActive ? "warning" : "primary"}
              size="small"
              onClick={onToggleLocationSelection}
              sx={{ textTransform: 'none' }}
            >
              {locationSelectionActive ? 'Cancel Selection' : 'Select from Map'}
            </Button>
            
            {currentLocation && (
              <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
                Current: {currentLocation.lat}, {currentLocation.lng}
              </Typography>
            )}
          </Box>

          {/* Location chips if coordinates exist */}
          {(restaurantData.latitude || restaurantData.longitude) && (
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {restaurantData.latitude && (
                <Chip 
                  label={`Lat: ${parseFloat(restaurantData.latitude).toFixed(4)}`}
                  size="small"
                  icon={<LocationOn fontSize="small" />}
                />
              )}
              {restaurantData.longitude && (
                <Chip 
                  label={`Lng: ${parseFloat(restaurantData.longitude).toFixed(4)}`}
                  size="small"
                  icon={<LocationOn fontSize="small" />}
                />
              )}
            </Box>
          )}

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
            <Button
              variant="outlined"
              color="primary"
              size="small"
              startIcon={<Navigation />}
              onClick={() => onNavigate?.(restaurantData)}
              sx={{ textTransform: 'none' }}
              disabled={!restaurantData.latitude || !restaurantData.longitude}
            >
              Navigate
            </Button>
          </Box>
        </Box>
      </DialogContent>

      {/* Actions */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 2, pb: 2 }}>
        {restaurantData.id && !String(restaurantData.id).startsWith('temp-') ? (
          <>
            <Button
              variant="outlined"
              color="error"
              size="small"
              startIcon={<Delete />}
              onClick={handleDelete}
              disabled={deleting}
              sx={{ textTransform: 'none' }}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
            <Button
              variant="contained"
              color="primary"
              size="small"
              startIcon={<Edit />}
              onClick={handleSave}
              disabled={saving || !restaurantData.outlet_name}
              sx={{ textTransform: 'none' }}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </>
        ) : (
          <Box sx={{ width: '100%', display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              color="primary"
              size="small"
              onClick={handleSave}
              disabled={saving || !restaurantData.outlet_name}
              sx={{ textTransform: 'none' }}
            >
              {saving ? 'Creating...' : 'Create Restaurant'}
            </Button>
          </Box>
        )}
      </Box>
    </Dialog>
  );
}

export default RestaurantDetailsDialog;

