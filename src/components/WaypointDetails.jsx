import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  IconButton,
  useTheme,
  Menu,
  MenuItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { CloudUpload, Save, Delete, Close, ArrowOutwardOutlined as ArrowOutwardOutlinedIcon, MyLocation as MyLocationIcon, LocationSearching as LocationSearchingIcon, LocationOn as LocationOnIcon, KeyboardArrowDown } from '@mui/icons-material';
import React, { useState } from 'react';
import { CircularProgress } from '@mui/material';

const DEFAULT_LOCATION = { lat: 26.516654, lng: 80.231507 };

const WaypointDetails = React.forwardRef(function WaypointDetails({
  open = true,
  selectedWaypointId,
  waypointData,
  setWaypointData,
  onClose,
  onSave,
  onDelete,
  onImageUpload,
  savedWaypoints = [],
  onNavigate,
  currentLocation = null,
  locationSelectionActive = false,
  onToggleLocationSelection,
  onCollapseBottomSheet = null,
  showSaveDeleteButtons = true,
}, ref) {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState(null);
  const isMenuOpen = Boolean(anchorEl);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);

  const handleNavigateClick = (event) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);
  const handleDeleteClick = () => setDeleteDialogOpen(true);
  const handleDeleteConfirm = () => { setDeleteDialogOpen(false); onDelete?.(); };
  const handleDeleteCancel = () => setDeleteDialogOpen(false);

  const handleNavigateSelect = (fromWaypoint) => {
    if (onNavigate && fromWaypoint) onNavigate(fromWaypoint);
    handleMenuClose();
  };

  const handleCurrentLocationSelect = () => {
    if (!onNavigate) { handleMenuClose(); return; }
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          onNavigate({ id: 'current-location', name: 'Current Location', latitude, longitude });
          handleMenuClose();
        },
        (error) => {
          const { lat, lng } = currentLocation || {};
          const fallbackLat = lat ? parseFloat(lat) : DEFAULT_LOCATION.lat;
          const fallbackLng = lng ? parseFloat(lng) : DEFAULT_LOCATION.lng;
          onNavigate({ id: 'current-location', name: 'Current Location', latitude: fallbackLat, longitude: fallbackLng });
          handleMenuClose();
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      const { lat, lng } = currentLocation || {};
      const fallbackLat = lat ? parseFloat(lat) : DEFAULT_LOCATION.lat;
      const fallbackLng = lng ? parseFloat(lng) : DEFAULT_LOCATION.lng;
      onNavigate({ id: 'current-location', name: 'Current Location', latitude: fallbackLat, longitude: fallbackLng });
      handleMenuClose();
    }
  };

  const isTouchDevice = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
  const captureAttr = isTouchDevice ? 'environment' : undefined;
  const isExistingWarehouse = selectedWaypointId && !String(selectedWaypointId).startsWith('temp-');

  if (!open) return null;

  return (
    <>
      <Paper elevation={0} ref={ref} sx={{
        position: 'fixed', right: { xs: 0, sm: '1.5rem' }, bottom: { xs: 0, sm: '10rem' },
        left: { xs: 0, sm: 'auto' }, width: { xs: '100%', sm: '19.25rem' },
        maxWidth: { xs: '100%', sm: '22rem' }, maxHeight: { xs: 'none', sm: 'calc(100vh - 10rem)' },
        p: { xs: 0, sm: 2 }, pt: { xs: 0, sm: 2 },
        borderRadius: { xs: '24px 24px 0 0', sm: '0.875rem' },
        overflow: 'hidden', backgroundColor: theme.palette.background.paper,
        boxShadow: theme.palette.mode === 'dark' ? '0 4px 12px rgba(0,0,0,0.5)' : '0 4px 12px rgba(0,0,0,0.1)',
        border: { xs: 'none', sm: `1px solid ${theme.palette.divider}` },
        zIndex: theme.zIndex.drawer + 3, display: 'flex', flexDirection: 'column', gap: 2,
      }}>
        {onCollapseBottomSheet && (
          <Box onClick={onCollapseBottomSheet} sx={{ display: { xs: 'flex', sm: 'none' }, justifyContent: 'center', py: 1, cursor: 'pointer' }}>
            <KeyboardArrowDown sx={{ fontSize: '1.75rem', color: theme.palette.text.secondary }} />
          </Box>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>Warehouse Details</Typography>
          <IconButton size="small" onClick={onClose} sx={{ borderRadius: '50%' }}>
            <Close />
          </IconButton>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, overflow: 'auto' }}>
          <TextField label="Name" value={waypointData.name || ''}
            onChange={(e) => setWaypointData(p => ({ ...p, name: e.target.value }))}
            fullWidth size="small" disabled={isExistingWarehouse} />

          <TextField label="Address" value={waypointData.address || ''}
            onChange={(e) => setWaypointData(p => ({ ...p, address: e.target.value }))}
            fullWidth size="small" multiline rows={2} disabled={isExistingWarehouse} />

          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField label="State" value={waypointData.state || ''}
              onChange={(e) => setWaypointData(p => ({ ...p, state: e.target.value }))}
              size="small" sx={{ flex: 1 }} disabled={isExistingWarehouse} />
            <TextField label="Rent Type" value={waypointData.rent_type || ''}
              onChange={(e) => setWaypointData(p => ({ ...p, rent_type: e.target.value }))}
              size="small" sx={{ flex: 1 }} disabled={isExistingWarehouse} />
          </Box>

          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
            <TextField label="Latitude" value={waypointData.latitude || waypointData.lat || ''}
              onChange={(e) => setWaypointData(p => ({ ...p, latitude: e.target.value, lat: e.target.value }))}
              size="small" InputProps={{ readOnly: isExistingWarehouse }} sx={{ flex: 1 }} />
            <TextField label="Longitude" value={waypointData.longitude || waypointData.lng || ''}
              onChange={(e) => setWaypointData(p => ({ ...p, longitude: e.target.value, lng: e.target.value }))}
              size="small" InputProps={{ readOnly: isExistingWarehouse }} sx={{ flex: 1 }} />
            <IconButton onClick={onToggleLocationSelection}
              disabled={isExistingWarehouse || locationSelectionActive}
              sx={{ mt: 0.5, backgroundColor: locationSelectionActive ? theme.palette.primary.main : undefined }}>
              <LocationSearchingIcon />
            </IconButton>
          </Box>

          <Box>
            <input accept="image/*" style={{ display: 'none' }} id="image-upload" type="file" capture={captureAttr} onChange={onImageUpload} disabled={imageUploading} />
            <label htmlFor="image-upload">
              <Button variant="outlined" component="span" startIcon={imageUploading ? <CircularProgress size={16} /> : <CloudUpload />} fullWidth sx={{ textTransform: 'none' }}>
                {imageUploading ? 'Uploading...' : (waypointData.image ? 'Change Image' : 'Upload Image')}
              </Button>
            </label>
            {waypointData.image && <Box component="img" src={waypointData.image} alt="Uploaded" sx={{ width: '100%', maxHeight: 150, objectFit: 'cover', borderRadius: 1, mt: 1 }} />}
          </Box>

          {waypointData.created_at && (
            <Typography variant="caption" color="text.secondary">
              Created: {new Date(waypointData.created_at).toLocaleString()}
            </Typography>
          )}

          {showSaveDeleteButtons && (
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button variant="contained" startIcon={<Save />} onClick={onSave} sx={{ flex: 1, backgroundColor: '#4CAF50', textTransform: 'none' }}>Save</Button>
              <Button variant="outlined" startIcon={<ArrowOutwardOutlinedIcon />} onClick={handleNavigateClick} sx={{ flex: 1, textTransform: 'none' }}>Navigate</Button>
              <Button variant="outlined" startIcon={<Delete />} onClick={handleDeleteClick} sx={{ flex: 1, textTransform: 'none' }}>Delete</Button>
            </Box>
          )}
        </Box>
      </Paper>

      <Menu anchorEl={anchorEl} open={isMenuOpen} onClose={handleMenuClose}>
        <MenuItem disabled sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>Navigate from</MenuItem>
        {currentLocation && (
          <MenuItem onClick={handleCurrentLocationSelect}>
            <ListItemIcon><MyLocationIcon sx={{ color: '#2196f3' }} /></ListItemIcon>
            <ListItemText primary="Current Location" secondary={`${parseFloat(currentLocation.lat).toFixed(6)}, ${parseFloat(currentLocation.lng).toFixed(6)}`} />
          </MenuItem>
        )}
        {currentLocation && savedWaypoints.length > 0 && <Divider />}
        {savedWaypoints.map((waypoint) => (
          <MenuItem key={waypoint.id} onClick={() => handleNavigateSelect(waypoint)}>
            <ListItemIcon><LocationOnIcon sx={{ color: '#4CAF50' }} /></ListItemIcon>
            <ListItemText primary={waypoint.name} secondary={`${parseFloat(waypoint.latitude || waypoint.lat).toFixed(6)}, ${parseFloat(waypoint.longitude || waypoint.lng).toFixed(6)}`} />
          </MenuItem>
        ))}
      </Menu>

      <Dialog open={deleteDialogOpen} onClose={handleMenuClose}>
        <DialogTitle>Delete Warehouse</DialogTitle>
        <DialogContent><Typography>Are you sure you want to delete this warehouse? This action cannot be undone.</Typography></DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} variant="text" sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} variant="contained" color="error" sx={{ textTransform: 'none' }}>Delete</Button>
        </DialogActions>
      </Dialog>
    </>
  );
});

export default WaypointDetails;

