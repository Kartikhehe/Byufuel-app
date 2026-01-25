import React from 'react';
import { Box, Paper, Typography, useTheme, useMediaQuery } from '@mui/material';

const LiveCoordinates = React.forwardRef(function LiveCoordinates({ coordinates, sidebarOpen = false }, ref) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Paper
      elevation={0}
      sx={{
        position: 'fixed',
        bottom: { xs: '0', sm: '1.5rem' },
        right: { xs: 0, sm: '1.5rem' },
        left: {
          xs: 0,
          sm: 'auto'
        },
        width: {
          xs: '100%',
          sm: '19.25rem',
          md: '22.96875rem'
        },
        maxWidth: { xs: '100%', sm: '90vw', md: '22.96875rem' },
        p: { xs: '0.75rem 1rem', sm: 1.75, md: 2.625 },
        borderRadius: { xs: 0, sm: '0.875rem' },
        backgroundColor: theme.palette.background.paper,
        boxShadow: {
          xs: 'none',
          sm: theme.palette.mode === 'dark'
            ? '0 0.25rem 0.75rem rgba(0, 0, 0, 0.5)'
            : '0 0.25rem 0.75rem rgba(0, 0, 0, 0.1)',
        },
        border: { xs: 'none', sm: `1px solid ${theme.palette.divider}` },
        zIndex: {
          xs: theme.zIndex.drawer + 4,
          sm: theme.zIndex.drawer + 2,
        },
        transform: 'translateZ(0)',
        willChange: 'transform',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
      ref={ref}
    >
      {/* Mobile Layout: Two Lines */}
      {isMobile ? (
        <>
          {/* First Line: Live Coordinates */}
          <Typography
            variant="h6"
            sx={{
              fontSize: '1rem',
              fontWeight: 600,
              color: theme.palette.text.primary,
              mb: 0.5,
            }}
          >
            Live Coordinates
          </Typography>

          {/* Second Line: LAT and LONG side by side */}
          <Box sx={{
            display: 'flex',
            gap: 2,
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="body1"
                sx={{
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  color: '#4CAF50',
                  fontFamily: 'monospace',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                LAT {coordinates.lat}
              </Typography>
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="body1"
                sx={{
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  color: '#4CAF50',
                  fontFamily: 'monospace',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                LONG {coordinates.lng}
              </Typography>
            </Box>
          </Box>
        </>
      ) : (
        /* Desktop Layout: Original Three Column Layout */
        <>
          <Box sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 1,
            flexShrink: 0,
            position: 'relative',
            zIndex: 1,
          }}>
            <Typography
              variant="h6"
              sx={{
                fontSize: { sm: '0.875rem', md: '0.9625rem' },
                fontWeight: 600,
                color: theme.palette.text.primary,
              }}
            >
              Live Coordinates
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: { sm: 2 }, flex: 1, overflow: 'auto', minHeight: 0 }}>
            <Box sx={{
              display: 'flex',
              gap: { sm: 1.5, md: 2 },
              alignItems: 'flex-start',
              flexWrap: 'nowrap'
            }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  variant="caption"
                  sx={{
                    fontSize: { sm: '0.7rem' },
                    color: theme.palette.text.secondary,
                    textTransform: 'uppercase',
                    letterSpacing: { sm: '0.5px' },
                    mb: 0.5,
                    display: 'block',
                  }}
                >
                  Latitude
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontSize: { sm: '0.74375rem', md: '0.7875rem' },
                    fontWeight: 500,
                    color: '#4CAF50',
                    fontFamily: 'monospace',
                    wordBreak: 'break-all',
                  }}
                >
                  {coordinates.lat}°
                </Typography>
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  variant="caption"
                  sx={{
                    fontSize: { sm: '0.7rem' },
                    color: theme.palette.text.secondary,
                    textTransform: 'uppercase',
                    letterSpacing: { sm: '0.5px' },
                    mb: 0.5,
                    display: 'block',
                  }}
                >
                  Longitude
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontSize: { sm: '0.74375rem', md: '0.7875rem' },
                    fontWeight: 500,
                    color: '#4CAF50',
                    fontFamily: 'monospace',
                    wordBreak: 'break-all',
                  }}
                >
                  {coordinates.lng}°
                </Typography>
              </Box>
              {coordinates.accuracy !== null && (
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    variant="caption"
                    sx={{
                      fontSize: { sm: '0.7rem' },
                      color: theme.palette.text.secondary,
                      textTransform: 'uppercase',
                      letterSpacing: { sm: '0.5px' },
                      mb: 0.5,
                      display: 'block',
                    }}
                  >
                    Accuracy
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      fontSize: { sm: '0.74375rem', md: '0.7875rem' },
                      fontWeight: 500,
                      color: '#4CAF50',
                      fontFamily: 'monospace',
                    }}
                  >
                    ±{coordinates.accuracy}m
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        </>
      )}
    </Paper>
  );
});

export default LiveCoordinates;