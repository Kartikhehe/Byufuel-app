
import React, { useState, useMemo } from 'react';
import { Dialog, DialogTitle, DialogContent, Button, Box, useTheme, Typography, Chip, Paper, Accordion, AccordionSummary, AccordionDetails, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Dialog as ConfirmDialog } from '@mui/material';
import { ExpandMore, LocalShipping as LocalShippingIcon, Restaurant as RestaurantIcon, AccessTime, LocationOn, Navigation, OpenInNew, ArrowDropDownCircle, ContentCopy } from '@mui/icons-material';

function RouteResultsDialog({ open, onClose, results, onRestaurantClick }) {
  const theme = useTheme();
  const [expandedWarehouse, setExpandedWarehouse] = useState(null);
  const [expandedUnassigned, setExpandedUnassigned] = useState(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  if (!results || !results.routes) {
    return null;
  }

  const { routes, summary, waypoints } = results;

  const getWaypoint = (index) => {
    return waypoints.find(w => w.index === index) || { name: `Point ${index}`, type: 'unknown' };
  };

  const getStopDetails = (stop) => {
    if (stop.latitude !== undefined && stop.longitude !== undefined) {
      return stop;
    }
    return getWaypoint(stop.index);
  };

  const generateGoogleMapsLink = (stops) => {
    if (stops.length < 2) return '';
    const originDetails = getStopDetails(stops[0]);
    const destDetails = getStopDetails(stops[stops.length - 1]);
    const origin = `${originDetails.latitude},${originDetails.longitude}`;
    const destination = `${destDetails.latitude},${destDetails.longitude}`;
    
    if (stops.length === 2) {
      return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;
    } else {
      const waypoints = stops.slice(1, -1).map(s => {
        const details = getStopDetails(s);
        return `${details.latitude},${details.longitude}`;
      }).join('|');
      return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypoints}&travelmode=driving`;
    }
  };

  const generateRouteText = () => {
    let text = 'ROUTE OPTIMIZATION RESULTS\n';
    text += '=' .repeat(50) + '\n\n';
    text += `Total Distance: ${(summary.totalDistance || 0).toFixed(1)} km\n`;
    text += `Total Load: ${summary.totalLoad || 0} L\n`;
    text += `Total Cost: ₹${(summary.totalCost || 0).toFixed(0)}\n`;
    text += `Unassigned: ${summary.unassignedCount || 0}\n\n`;
    text += '=' .repeat(50) + '\n\n';

    // Group routes by warehouse
    const grouped = {};
    const unassignedRoutes = [];
    
    routes.forEach((route) => {
      if (route.warehouseName && route.warehouseName !== 'Unknown Warehouse' && route.stops.length > 2) {
        if (!grouped[route.warehouseName]) {
          grouped[route.warehouseName] = [];
        }
        grouped[route.warehouseName].push(route);
      } else if (route.vehicleName === 'Unassigned' || route.stops.length <= 2) {
        unassignedRoutes.push(route);
      } else {
        const warehouseKey = route.warehouseName || 'Other';
        if (!grouped[warehouseKey]) {
          grouped[warehouseKey] = [];
        }
        grouped[warehouseKey].push(route);
      }
    });

    // Assigned routes by warehouse
    Object.entries(grouped).forEach(([warehouseName, warehouseRoutes]) => {
      text += `${warehouseName.toUpperCase()}:\n`;
      text += '-'.repeat(30) + '\n';
      
      warehouseRoutes.forEach((route) => {
        text += `${route.vehicleName}:\n`;
        
        // Build route with times
        const routeStops = route.stops.map(stop => {
          const name = stop.name;
          const time = stop.arrivalTime || '-';
          return `${name}(${time})`;
        }).join(' -> ');
        
        text += `${routeStops}\n`;
        
        // Add Google Maps link
        const mapsLink = generateGoogleMapsLink(route.stops);
        if (mapsLink) {
          text += `Google Maps Link:\n${mapsLink}\n`;
        }
        
        text += '\n';
      });
    });

    // Unassigned vehicles
    if (unassignedRoutes.length > 0) {
      text += 'UNASSIGNED / NO TASK:\n';
      text += '-'.repeat(30) + '\n';
      
      unassignedRoutes.forEach((route) => {
        text += `${route.vehicleName}: No stops assigned`;
        if (route.warehouseName) {
          text += ` (${route.warehouseName})`;
        }
        text += '\n';
      });
    }

    return text;
  };

  const handleCopyRouteDetails = async () => {
    try {
      const routeText = generateRouteText();
      await navigator.clipboard.writeText(routeText);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleCloseWithConfirm = () => {
    setShowExitConfirm(true);
  };

  const handleCopyAndExit = async () => {
    try {
      const routeText = generateRouteText();
      await navigator.clipboard.writeText(routeText);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
    setShowExitConfirm(false);
    onClose();
  };

  const openGoogleMaps = (stop) => {
    const details = getStopDetails(stop);
    const { latitude, longitude } = details;
    if (latitude === undefined || longitude === undefined) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=driving`;
    window.open(url, '_blank');
  };

  const openRouteInGoogleMaps = (stops) => {
    if (stops.length < 2) return;
    const originDetails = getStopDetails(stops[0]);
    const destDetails = getStopDetails(stops[stops.length - 1]);
    const origin = `${originDetails.latitude},${originDetails.longitude}`;
    const destination = `${destDetails.latitude},${destDetails.longitude}`;
    
    if (stops.length === 2) {
      window.open(`https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`, '_blank');
    } else {
      const waypointsParam = stops.slice(1, -1).map(s => {
        const details = getStopDetails(s);
        return `${details.latitude},${details.longitude}`;
      }).join('|');
      const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypointsParam}&travelmode=driving`;
      window.open(url, '_blank');
    }
  };

  const hasNoAssignedStops = (route) => {
    return route.stops.filter(s => s.type === 'restaurant').length === 0;
  };

  // Group routes by warehouse for rendering
  const routesByWarehouse = useMemo(() => {
    const grouped = {};
    const unassignedRoutes = [];
    
    routes.forEach((route) => {
      if (route.warehouseName && route.warehouseName !== 'Unknown Warehouse' && route.stops.length > 2) {
        if (!grouped[route.warehouseName]) {
          grouped[route.warehouseName] = [];
        }
        grouped[route.warehouseName].push(route);
      } else if (route.vehicleName === 'Unassigned' || route.stops.length <= 2) {
        unassignedRoutes.push(route);
      } else {
        const warehouseKey = route.warehouseName || 'Other';
        if (!grouped[warehouseKey]) {
          grouped[warehouseKey] = [];
        }
        grouped[warehouseKey].push(route);
      }
    });
    
    return { grouped, unassigned: unassignedRoutes };
  }, [routes]);

  const handleWarehouseToggle = (warehouseName) => {
    setExpandedWarehouse(expandedWarehouse === warehouseName ? null : warehouseName);
  };

  const handleUnassignedToggle = () => {
    setExpandedUnassigned(expandedUnassigned === 'unassigned' ? null : 'unassigned');
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={handleCloseWithConfirm}
        fullWidth
        maxWidth="md"
        PaperProps={{
          sx: {
            borderRadius: 3,
            p: 0,
            maxHeight: '90vh',
            overflow: 'hidden'
          }
        }}
      >
        <DialogTitle sx={{ 
          textAlign: 'center', 
          pb: 2, 
          fontWeight: 700,
          fontSize: '1.5rem',
          borderBottom: `1px solid ${theme.palette.divider}`,
          bgcolor: theme.palette.mode === 'dark' ? 'background.paper' : '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pr: 2,
          position: 'relative'
        }}>
          <Box sx={{ width: 100 }} />
          Route Optimization Results
          <Button
            variant="contained"
            startIcon={copySuccess ? <AccessTime /> : <ContentCopy />}
            onClick={handleCopyRouteDetails}
            sx={{ 
              textTransform: 'none',
              borderRadius: 2,
              boxShadow: 'none',
              bgcolor: copySuccess ? '#4CAF50' : theme.palette.text.primary,
              color: theme.palette.background.paper,
              '&:hover': { 
                boxShadow: 'none',
                bgcolor: copySuccess ? '#43A047' : theme.palette.text.secondary
              }
            }}
          >
            {copySuccess ? 'Copied!' : 'Copy Route Details'}
          </Button>
        </DialogTitle>

        <DialogContent sx={{ pt: 3, p: 0 }}>
          {/* Summary Cards */}
          <Box sx={{ display: 'flex', gap: 1.5, mb: 3, flexWrap: 'wrap', px: 3 }}>
            <Paper sx={{ 
              px: 2, 
              py: 1, 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1,
              borderRadius: 2,
              border: `1px solid ${theme.palette.divider}`
            }}>
              <LocalShippingIcon sx={{ color: 'primary.main', fontSize: 20 }} />
              <Typography variant="body2" fontWeight={600}>
                {summary.totalRoutes} Routes
              </Typography>
            </Paper>
            <Paper sx={{ 
              px: 2, 
              py: 1, 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1,
              borderRadius: 2,
              border: `1px solid ${theme.palette.divider}`
            }}>
              <LocationOn sx={{ color: '#4CAF50', fontSize: 20 }} />
              <Typography variant="body2" fontWeight={600}>
                {(summary.totalDistance || 0).toFixed(1)} km
              </Typography>
            </Paper>
            <Paper sx={{ 
              px: 2, 
              py: 1, 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1,
              borderRadius: 2,
              border: `1px solid ${theme.palette.divider}`
            }}>
              <Typography variant="body2" fontWeight={600}>
                {summary.totalLoad || 0} L
              </Typography>
            </Paper>
            <Paper sx={{ 
              px: 2, 
              py: 1, 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1,
              borderRadius: 2,
              border: `1px solid ${theme.palette.divider}`
            }}>
              <AccessTime sx={{ color: 'info.main', fontSize: 20 }} />
              <Typography variant="body2" fontWeight={600}>
                ₹{(summary.totalCost || 0).toFixed(0)}
              </Typography>
            </Paper>
            {summary.unassignedCount > 0 && (
              <Paper sx={{ 
                px: 2, 
                py: 1, 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1,
                borderRadius: 2,
                border: `1px solid ${theme.palette.error.main}`,
                bgcolor: theme.palette.error.main,
                color: 'white'
              }}>
                <Typography variant="body2" fontWeight={600}>
                  {summary.unassignedCount} Unassigned
                </Typography>
              </Paper>
            )}
          </Box>

          {/* Warehouse-wise Sections */}
          {Object.entries(routesByWarehouse.grouped).map(([warehouseName, warehouseRoutes]) => {
            const totalDistance = warehouseRoutes.reduce((sum, r) => sum + (r.distance || 0), 0);
            const totalLoad = warehouseRoutes.reduce((sum, r) => sum + (r.load || 0), 0);
            
            return (
              <Box key={warehouseName} sx={{ mb: 2, px: 3 }}>
                <Accordion 
                  expanded={expandedWarehouse === warehouseName}
                  onChange={() => handleWarehouseToggle(warehouseName)}
                  sx={{ 
                    boxShadow: 'none',
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: '12px !important',
                    overflow: 'hidden',
                    '&:before': { display: 'none' },
                    '&.Mui-expanded': { margin: 0 }
                  }}
                >
                  <AccordionSummary 
                    expandIcon={<ExpandMore />}
                    sx={{ 
                      bgcolor: theme.palette.mode === 'dark' ? 'rgba(76, 175, 80, 0.08)' : '#f8f9fa',
                      minHeight: 56,
                      '&.Mui-expanded': { minHeight: 56 }
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', pr: 1 }}>
                      <Box sx={{ 
                        width: 40, 
                        height: 40, 
                        borderRadius: 2, 
                        bgcolor: '#4CAF50', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        mr: 2
                      }}>
                        <LocalShippingIcon sx={{ color: 'white', fontSize: 22 }} />
                      </Box>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="subtitle1" fontWeight={700} sx={{ color: theme.palette.text.primary }}>
                          {warehouseName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {warehouseRoutes.length} vehicle{warehouseRoutes.length !== 1 ? 's' : ''} • {(totalDistance / 1000).toFixed(1)} km • {totalLoad} L
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip 
                          size="small" 
                          label={`${warehouseRoutes.length}`}
                          sx={{ 
                            bgcolor: '#4CAF50', 
                            color: 'white',
                            fontWeight: 700,
                            minWidth: 32,
                            height: 28
                          }}
                        />
                      </Box>
                    </Box>
                  </AccordionSummary>
                  
                  <AccordionDetails sx={{ p: 0 }}>
                    {warehouseRoutes.map((route, routeIndex) => (
                      <Box 
                        key={routeIndex}
                        sx={{ 
                          m: 2,
                          border: `1px solid ${theme.palette.divider}`,
                          borderRadius: 2,
                          overflow: 'hidden'
                        }}
                      >
                        {/* Route Header */}
                        <Box sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between',
                          px: 2,
                          py: 1.5,
                          bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#fafafa',
                          borderBottom: `1px solid ${theme.palette.divider}`
                        }}>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Typography variant="body2" fontWeight={700}>
                              {route.vehicleName}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 2, ml: 3 }}>
                              <Typography variant="caption" color="text.secondary">
                                {(route.distance / 1000).toFixed(1)} km
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {route.load} L
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {route.stops.filter(s => s.type === 'restaurant').length} stop{route.stops.filter(s => s.type === 'restaurant').length !== 1 ? 's' : ''}
                              </Typography>
                            </Box>
                          </Box>
                          <Button
                            variant="contained"
                            size="small"
                            startIcon={<Navigation />}
                            onClick={() => openRouteInGoogleMaps(route.stops)}
                            sx={{ 
                              textTransform: 'none',
                              borderRadius: 1.5,
                              boxShadow: 'none',
                              bgcolor: '#4CAF50',
                              '&:hover': { bgcolor: '#43A047', boxShadow: 'none' }
                            }}
                          >
                            Navigate
                          </Button>
                        </Box>
                        
                        {/* Route Timeline */}
                        <TableContainer>
                          <Table size="small">
                            <TableHead>
                              <TableRow sx={{ bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#f5f5f5' }}>
                                <TableCell sx={{ fontWeight: 600, py: 1.5, fontSize: '0.75rem', width: 80 }}>Time</TableCell>
                                <TableCell sx={{ fontWeight: 600, py: 1.5, fontSize: '0.75rem', width: 50 }}>Type</TableCell>
                                <TableCell sx={{ fontWeight: 600, py: 1.5, fontSize: '0.75rem' }}>Location</TableCell>
                                <TableCell sx={{ fontWeight: 600, py: 1.5, fontSize: '0.75rem', width: 60 }} align="center">Nav</TableCell>
                                <TableCell sx={{ fontWeight: 600, py: 1.5, fontSize: '0.75rem', width: 70 }} align="right">Load (L)</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {route.stops.map((stop, stopIndex) => (
                                <TableRow 
                                  key={stopIndex}
                                  hover
                                  onClick={() => stop.type === 'restaurant' && onRestaurantClick && onRestaurantClick(stop)}
                                  sx={{ 
                                    cursor: stop.type === 'restaurant' ? 'pointer' : 'default',
                                    '&:last-child': { borderBottom: 'none' }
                                  }}
                                >
                                  <TableCell sx={{ py: 1.25 }}>
                                    {stop.arrivalTime ? (
                                      <Typography variant="body2" fontWeight={600} sx={{ fontFamily: 'monospace' }}>
                                        {stop.arrivalTime}
                                      </Typography>
                                    ) : (
                                      <Typography variant="body2" color="text.secondary">-</Typography>
                                    )}
                                  </TableCell>
                                  <TableCell sx={{ py: 1.25 }}>
                                    {stop.type === 'warehouse' ? (
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#4CAF50' }} />
                                        <Typography variant="caption" sx={{ fontWeight: 600 }}>WH</Typography>
                                      </Box>
                                    ) : (
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#FF5722' }} />
                                        <Typography variant="caption" sx={{ fontWeight: 600 }}>R</Typography>
                                      </Box>
                                    )}
                                  </TableCell>
                                  <TableCell sx={{ py: 1.25 }}>
                                    <Typography variant="body2" fontWeight={500}>{stop.name}</Typography>
                                    {stop.address && (
                                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {stop.address}
                                      </Typography>
                                    )}
                                  </TableCell>
                                  <TableCell sx={{ py: 1.25 }} align="center">
                                    <IconButton
                                      size="small"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openGoogleMaps(stop);
                                      }}
                                      sx={{ 
                                        color: '#4CAF50',
                                        '&:hover': { bgcolor: 'rgba(76, 175, 80, 0.1)' }
                                      }}
                                    >
                                      <OpenInNew fontSize="small" />
                                    </IconButton>
                                  </TableCell>
                                  <TableCell sx={{ py: 1.25 }} align="right">
                                    <Typography variant="body2" fontWeight={600}>{stop.load}</Typography>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </Box>
                    ))}
                  </AccordionDetails>
                </Accordion>
              </Box>
            );
          })}

          {/* Unassigned / No Task Section */}
          {routesByWarehouse.unassigned.length > 0 && (
            <Box sx={{ mb: 2, px: 3 }}>
              <Accordion 
                expanded={expandedUnassigned === 'unassigned'}
                onChange={() => handleUnassignedToggle()}
                sx={{ 
                  boxShadow: 'none',
                  border: `1px solid ${theme.palette.error.main}`,
                  borderRadius: '12px !important',
                  overflow: 'hidden',
                  '&:before': { display: 'none' },
                  '&.Mui-expanded': { margin: 0 }
                }}
              >
                <AccordionSummary 
                  expandIcon={<ExpandMore />}
                  sx={{ 
                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(244, 67, 54, 0.08)' : '#fff5f5',
                    minHeight: 56,
                    '&.Mui-expanded': { minHeight: 56 }
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', pr: 1 }}>
                    <Box sx={{ 
                      width: 40, 
                      height: 40, 
                      borderRadius: 2, 
                      bgcolor: '#f44336', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      mr: 2
                    }}>
                      <ArrowDropDownCircle sx={{ color: 'white', fontSize: 22 }} />
                    </Box>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="subtitle1" fontWeight={700} sx={{ color: theme.palette.text.primary }}>
                        Unassigned / No Task
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {routesByWarehouse.unassigned.length} vehicle{routesByWarehouse.unassigned.length !== 1 ? 's' : ''} with no stops
                      </Typography>
                    </Box>
                    <Chip 
                      size="small" 
                      label={`${routesByWarehouse.unassigned.length}`}
                      sx={{ 
                        bgcolor: '#f44336', 
                        color: 'white',
                        fontWeight: 700,
                        minWidth: 32,
                        height: 28
                      }}
                    />
                  </Box>
                </AccordionSummary>
                
                <AccordionDetails sx={{ p: 0 }}>
                  {routesByWarehouse.unassigned.map((route, routeIndex) => (
                    <Box 
                      key={routeIndex}
                      sx={{ 
                        m: 2,
                        border: `1px solid ${theme.palette.error.light}`,
                        borderRadius: 2,
                        overflow: 'hidden',
                        bgcolor: theme.palette.mode === 'dark' ? 'rgba(244, 67, 54, 0.05)' : '#fffafa'
                      }}
                    >
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        px: 2,
                        py: 1.5,
                        bgcolor: theme.palette.mode === 'dark' ? 'rgba(244, 67, 54, 0.1)' : '#fff0f0',
                        borderBottom: `1px solid ${theme.palette.error.light}`
                      }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Typography variant="body2" fontWeight={700}>
                            {route.vehicleName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
                            {route.warehouseName || 'No Warehouse'}
                          </Typography>
                        </Box>
                        <Chip 
                          size="small" 
                          label="NA" 
                          sx={{ 
                            bgcolor: '#f44336', 
                            color: 'white',
                            fontWeight: 700,
                            minWidth: 32,
                            height: 24
                          }}
                        />
                      </Box>
                      
                      <Box sx={{ py: 4, textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                          No stops assigned to this vehicle
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </AccordionDetails>
              </Accordion>
            </Box>
          )}

          {routes.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 6, px: 3 }}>
              <Typography variant="h6" color="text.secondary">No routes generated</Typography>
            </Box>
          )}

          {/* Footer Actions */}
          <Box sx={{ 
            display: 'flex', 
            gap: 2, 
            justifyContent: 'flex-end', 
            mt: 3, 
            pt: 2, 
            borderTop: `1px solid ${theme.palette.divider}`,
            px: 3,
            pb: 2
          }}>
            <Button
              onClick={handleCloseWithConfirm}
              variant="outlined"
              sx={{ 
                textTransform: 'none',
                borderRadius: 2,
                px: 3,
                py: 1,
                borderColor: theme.palette.divider,
                '&:hover': { borderColor: theme.palette.text.secondary }
              }}
            >
              Close
            </Button>
          </Box>
        </DialogContent>
      </Dialog>

      {/* Exit Confirmation Dialog */}
      <ConfirmDialog
        open={showExitConfirm}
        onClose={() => setShowExitConfirm(false)}
        PaperProps={{
          sx: {
            borderRadius: 3,
            p: 2,
            maxWidth: 400
          }
        }}
      >
        <Typography variant="h6" fontWeight={700} sx={{ mb: 2, textAlign: 'center' }}>
          Exit Optimization Results?
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3, textAlign: 'center' }}>
          Are you sure you want to exit? Please copy the route details before exiting, as the results will no longer be accessible.
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
          <Button
            onClick={() => setShowExitConfirm(false)}
            variant="outlined"
            sx={{ 
              textTransform: 'none',
              borderRadius: 2,
              px: 3,
              flex: 1
            }}
          >
            Close
          </Button>
          <Button
            onClick={handleCopyAndExit}
            variant="contained"
            startIcon={<ContentCopy />}
            sx={{ 
              textTransform: 'none',
              borderRadius: 2,
              px: 3,
              flex: 1,
              bgcolor: '#4CAF50',
              '&:hover': { bgcolor: '#43A047' }
            }}
          >
            Copy & Exit
          </Button>
        </Box>
      </ConfirmDialog>
    </>
  );
}

export default RouteResultsDialog;

