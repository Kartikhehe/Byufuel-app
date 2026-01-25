import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  Typography,
  IconButton,
  Button,
  useTheme,
  List,
  ListItem,
  ListItemText,
  Checkbox,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
  InputAdornment,
  Divider,
} from '@mui/material';
import { Close, Download, Map, ExpandMore, Search, FolderOpen } from '@mui/icons-material';
import { useState, useEffect } from 'react';
import { waypointsAPI, projectsAPI } from '../services/api';

function ExportDialog({ open, onClose, onShowSnackbar }) {
  const theme = useTheme();
  const [exportFormat, setExportFormat] = useState(null); // 'geojson' or 'kml'
  const [projects, setProjects] = useState([]);
  const [individualPoints, setIndividualPoints] = useState([]);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && exportFormat) {
      loadData();
    }
  }, [open, exportFormat]);

  const loadData = async () => {
    setLoading(true);
    try {
      const waypointsData = await waypointsAPI.getAll();

      // Group waypoints by project
      const projectsGrouped = waypointsData.reduce((acc, wp) => {
        const pid = wp.project_id || null;
        if (pid) {
          if (!acc[pid]) {
            acc[pid] = {
              project_id: pid,
              project_name: wp.project_name || 'Project',
              waypoints: [],
              created_at: wp.created_at
            };
          }
          acc[pid].waypoints.push(wp);
        }
        return acc;
      }, {});

      // Separate individual points (no project)
      const individual = waypointsData.filter(wp => !wp.project_id);

      setProjects(Object.values(projectsGrouped));
      setIndividualPoints(individual);
    } catch (error) {
      console.error('Error loading data:', error);
      if (onShowSnackbar) {
        onShowSnackbar('Failed to load waypoints', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSelectFormat = (format) => {
    setExportFormat(format);
    setSelectedItems(new Set());
  };

  const handleBack = () => {
    setExportFormat(null);
    setSelectedItems(new Set());
    setSearchQuery('');
  };

  const handleToggleItem = (id) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const handleToggleProject = (project) => {
    const newSelected = new Set(selectedItems);
    const allSelected = project.waypoints.every(wp => newSelected.has(`wp-${wp.id}`));

    if (allSelected) {
      // Deselect all waypoints in this project
      project.waypoints.forEach(wp => newSelected.delete(`wp-${wp.id}`));
    } else {
      // Select all waypoints in this project
      project.waypoints.forEach(wp => newSelected.add(`wp-${wp.id}`));
    }
    setSelectedItems(newSelected);
  };

  const getSelectedWaypoints = () => {
    const selected = [];

    // Get selected individual points
    individualPoints.forEach(wp => {
      if (selectedItems.has(`wp-${wp.id}`)) {
        selected.push(wp);
      }
    });

    // Get selected project points
    projects.forEach(project => {
      project.waypoints.forEach(wp => {
        if (selectedItems.has(`wp-${wp.id}`)) {
          selected.push(wp);
        }
      });
    });

    return selected;
  };

  const exportToGeoJSON = (waypoints) => {
    const geoJSON = {
      type: 'FeatureCollection',
      features: waypoints.map(wp => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [parseFloat(wp.longitude), parseFloat(wp.latitude)]
        },
        properties: {
          name: wp.name || 'Unnamed Point',
          description: wp.notes || '',
          image: wp.image_url || null,
          project_id: wp.project_id || null,
          project_name: wp.project_name || null,
          created_at: wp.created_at || null,
          updated_at: wp.updated_at || null
        }
      }))
    };

    const jsonString = JSON.stringify(geoJSON, null, 2);
    const blob = new Blob([jsonString], { type: 'application/geo+json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `waypoints_export_${new Date().toISOString().split('T')[0]}.geojson`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportToKML = (waypoints) => {
    let kmlString = '<?xml version="1.0" encoding="UTF-8"?>\n';
    kmlString += '<kml xmlns="http://www.opengis.net/kml/2.2">\n';
    kmlString += '  <Document>\n';
    kmlString += `    <name>Waypoints Export ${new Date().toISOString().split('T')[0]}</name>\n`;
    kmlString += `    <description>Exported ${waypoints.length} waypoint${waypoints.length !== 1 ? 's' : ''}</description>\n`;

    waypoints.forEach(wp => {
      const latitude = parseFloat(wp.latitude);
      const longitude = parseFloat(wp.longitude);
      const name = wp.name || 'Unnamed Point';
      const notes = wp.notes || '';
      const imageUrl = wp.image_url || '';

      let description = notes;
      if (imageUrl) {
        description += (notes ? '\n\n' : '') + `Image: ${imageUrl}`;
      }

      kmlString += '    <Placemark>\n';
      kmlString += `      <name><![CDATA[${name}]]></name>\n`;
      if (description) {
        kmlString += `      <description><![CDATA[${description}]]></description>\n`;
      }

      // Add extended data for additional properties
      kmlString += '      <ExtendedData>\n';
      if (wp.project_id) {
        kmlString += `        <Data name="project_id"><value>${wp.project_id}</value></Data>\n`;
      }
      if (wp.project_name) {
        kmlString += `        <Data name="project_name"><value><![CDATA[${wp.project_name}]]></value></Data>\n`;
      }
      if (imageUrl) {
        kmlString += `        <Data name="image_url"><value>${imageUrl}</value></Data>\n`;
      }
      kmlString += '      </ExtendedData>\n';

      kmlString += '      <Point>\n';
      kmlString += `        <coordinates>${longitude},${latitude},0</coordinates>\n`;
      kmlString += '      </Point>\n';
      kmlString += '    </Placemark>\n';
    });

    kmlString += '  </Document>\n';
    kmlString += '</kml>';

    const blob = new Blob([kmlString], { type: 'application/vnd.google-earth.kml+xml' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `waypoints_export_${new Date().toISOString().split('T')[0]}.kml`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExport = () => {
    const waypoints = getSelectedWaypoints();

    if (waypoints.length === 0) {
      if (onShowSnackbar) {
        onShowSnackbar('Please select at least one waypoint to export', 'warning');
      }
      return;
    }

    try {
      if (exportFormat === 'geojson') {
        exportToGeoJSON(waypoints);
      } else if (exportFormat === 'kml') {
        exportToKML(waypoints);
      }

      if (onShowSnackbar) {
        onShowSnackbar(`Exported ${waypoints.length} waypoint${waypoints.length !== 1 ? 's' : ''} to ${exportFormat.toUpperCase()}`, 'success');
      }
      onClose();
    } catch (error) {
      console.error('Error exporting:', error);
      if (onShowSnackbar) {
        onShowSnackbar('Failed to export data. Please try again.', 'error');
      }
    }
  };

  const filteredProjects = projects.filter(project =>
    project.project_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.waypoints.some(wp => wp.name?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredIndividualPoints = individualPoints.filter(wp =>
    wp.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: { xs: '0.5625rem', sm: '0.75rem' },
          backgroundColor: theme.palette.background.paper,
          boxShadow: theme.palette.mode === 'dark'
            ? '0 0.1875rem 0.5625rem rgba(0, 0, 0, 0.5)'
            : '0 0.1875rem 0.5625rem rgba(0, 0, 0, 0.1)',
          margin: { xs: '0.75rem', sm: 'auto' },
          maxHeight: { xs: '90vh', sm: '80vh' },
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: `1px solid ${theme.palette.divider}`,
          pb: { xs: 1.5, sm: 2 },
          px: { xs: 1.5, sm: 2 },
          pt: { xs: 1.5, sm: 2 },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography
            sx={{
              fontSize: { xs: '0.75rem', sm: '0.825rem', md: '0.9rem' },
              fontWeight: 600,
              color: theme.palette.text.primary,
            }}
          >
            {exportFormat ? `Select Points to Export (${exportFormat.toUpperCase()})` : 'Export Data'}
          </Typography>
        </Box>
        <IconButton
          onClick={exportFormat ? handleBack : onClose}
          sx={{
            color: theme.palette.text.secondary,
            backgroundColor: theme.palette.action.hover,
            borderRadius: '50%',
            width: { xs: '1.3125rem', sm: '1.5rem' },
            height: { xs: '1.3125rem', sm: '1.5rem' },
            '&:hover': {
              backgroundColor: theme.palette.mode === 'dark' ? '#3a3a3a' : '#e0e0e0',
            },
          }}
        >
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
        {!exportFormat ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 1.5, sm: 2 } }}>
            <Typography
              variant="body2"
              sx={{
                color: theme.palette.text.secondary,
                mb: { xs: 0.75, sm: 1 },
                fontSize: { xs: '0.85rem', sm: '0.875rem', md: '1rem' },
              }}
            >
              Choose an export format:
            </Typography>

            <Button
              variant="contained"
              startIcon={<Map />}
              onClick={() => handleSelectFormat('geojson')}
              fullWidth
              sx={{
                py: { xs: 1.5, sm: 2 },
                borderRadius: { xs: '0.75rem', sm: '0.875rem', md: '1rem' },
                backgroundColor: '#4CAF50',
                textTransform: 'none',
                fontSize: { xs: '0.875rem', sm: '0.9rem', md: '1rem' },
                fontWeight: 500,
                boxShadow: '0 0.125rem 0.5rem rgba(76, 175, 80, 0.3)',
                '&:hover': {
                  backgroundColor: '#45a049',
                  boxShadow: '0 0.25rem 0.75rem rgba(76, 175, 80, 0.4)',
                },
              }}
            >
              Export to GeoJSON
            </Button>

            <Button
              variant="outlined"
              startIcon={<Download />}
              onClick={() => handleSelectFormat('kml')}
              fullWidth
              sx={{
                py: { xs: 1.5, sm: 2 },
                borderRadius: { xs: '0.75rem', sm: '0.875rem', md: '1rem' },
                borderColor: theme.palette.divider,
                color: theme.palette.text.primary,
                backgroundColor: theme.palette.mode === 'dark' ? '#2a2a2a' : '#f5f5f5',
                textTransform: 'none',
                fontSize: { xs: '0.875rem', sm: '0.9rem', md: '1rem' },
                fontWeight: 500,
                '&:hover': {
                  borderColor: '#4CAF50',
                  backgroundColor: theme.palette.mode === 'dark' ? '#3a3a3a' : '#e0e0e0',
                },
              }}
            >
              Export to KML
            </Button>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              placeholder="Search waypoints..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              size="small"
              fullWidth
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ color: theme.palette.text.secondary }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '0.75rem',
                  backgroundColor: theme.palette.mode === 'dark' ? '#2a2a2a' : '#f5f5f5',
                },
              }}
            />

            <Box sx={{ maxHeight: '50vh', overflow: 'auto' }}>
              {/* Individual Points */}
              {filteredIndividualPoints.length > 0 && (
                <>
                  <Typography variant="subtitle2" sx={{ mb: 1, color: theme.palette.text.secondary }}>
                    Individual Points ({filteredIndividualPoints.length})
                  </Typography>
                  <List dense>
                    {filteredIndividualPoints.map(wp => (
                      <ListItem
                        key={`wp-${wp.id}`}
                        button
                        onClick={() => handleToggleItem(`wp-${wp.id}`)}
                        sx={{
                          borderRadius: '0.5rem',
                          mb: 0.5,
                          '&:hover': {
                            backgroundColor: theme.palette.action.hover,
                          },
                        }}
                      >
                        <Checkbox
                          checked={selectedItems.has(`wp-${wp.id}`)}
                          sx={{ mr: 1 }}
                        />
                        <ListItemText
                          primary={wp.name || 'Unnamed Point'}
                          secondary={`${parseFloat(wp.latitude).toFixed(6)}, ${parseFloat(wp.longitude).toFixed(6)}`}
                        />
                      </ListItem>
                    ))}
                  </List>
                  <Divider sx={{ my: 2 }} />
                </>
              )}

              {/* Projects */}
              {filteredProjects.map(project => (
                <Accordion
                  key={project.id}
                  sx={{
                    mb: 1,
                    '&:before': { display: 'none' },
                    boxShadow: 'none',
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: '0.5rem !important',
                  }}
                >
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Box
                      sx={{ display: 'flex', alignItems: 'center', width: '100%', cursor: 'pointer' }}
                      onClick={(e) => {
                        // Only toggle if not clicking the expand icon
                        if (!e.target.closest('.MuiAccordionSummary-expandIconWrapper')) {
                          e.stopPropagation();
                          handleToggleProject(project);
                        }
                      }}
                    >
                      <Checkbox
                        checked={project.waypoints.every(wp => selectedItems.has(`wp-${wp.id}`))}
                        indeterminate={
                          project.waypoints.some(wp => selectedItems.has(`wp-${wp.id}`)) &&
                          !project.waypoints.every(wp => selectedItems.has(`wp-${wp.id}`))
                        }
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleProject(project);
                        }}
                        sx={{ mr: 1 }}
                      />
                      <FolderOpen sx={{ mr: 1, color: theme.palette.primary.main }} />
                      <Typography variant="subtitle2">
                        {project.project_name} ({project.waypoints.length})
                      </Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <List dense>
                      {project.waypoints.map(wp => (
                        <ListItem
                          key={`wp-${wp.id}`}
                          button
                          onClick={() => handleToggleItem(`wp-${wp.id}`)}
                          sx={{
                            borderRadius: '0.5rem',
                            '&:hover': {
                              backgroundColor: theme.palette.action.hover,
                            },
                          }}
                        >
                          <Checkbox
                            checked={selectedItems.has(`wp-${wp.id}`)}
                            sx={{ mr: 1 }}
                          />
                          <ListItemText
                            primary={wp.name || 'Unnamed Point'}
                            secondary={`${parseFloat(wp.latitude).toFixed(6)}, ${parseFloat(wp.longitude).toFixed(6)}`}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </AccordionDetails>
                </Accordion>
              ))}

              {filteredProjects.length === 0 && filteredIndividualPoints.length === 0 && (
                <Typography variant="body2" sx={{ textAlign: 'center', color: theme.palette.text.secondary, py: 4 }}>
                  No waypoints found
                </Typography>
              )}
            </Box>

            <Button
              variant="contained"
              onClick={handleExport}
              fullWidth
              disabled={selectedItems.size === 0}
              sx={{
                py: 1.5,
                borderRadius: '0.75rem',
                backgroundColor: '#4CAF50',
                textTransform: 'none',
                fontSize: '1rem',
                fontWeight: 600,
                '&:hover': {
                  backgroundColor: '#45a049',
                },
              }}
            >
              Export {selectedItems.size} Selected Point{selectedItems.size !== 1 ? 's' : ''}
            </Button>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default ExportDialog;
