import { useEffect, useState, useRef } from 'react'
import '../App.css'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css';
import 'leaflet-rotate/dist/leaflet-rotate.js';
import markerIcon2xUrl from 'leaflet/dist/images/marker-icon-2x.png';
import markerIconUrl from 'leaflet/dist/images/marker-icon.png';
import markerShadowUrl from 'leaflet/dist/images/marker-shadow.png';
import DynamicPickupDialog from '../components/DynamicPickupDialog'; 
import {
  Box,
  useTheme,
  useMediaQuery,
  Paper,
  Typography,
  IconButton,
  ThemeProvider,
  CssBaseline,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Switch
} from '@mui/material';
// Update this line at the top of MapApp.jsx
import { MyLocation, Menu as MenuIcon, Restaurant as RestaurantIcon, AccessTime, KeyboardArrowUp } from '@mui/icons-material';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import CustomSnackbar from '../components/Snackbar';
import { createAppTheme } from '../theme/theme.js';
import { useAuth } from '../context/AuthContext';
import LoginPromptDialog from '../components/LoginPromptDialog';
import StartSurveyDialog from '../components/StartSurveyDialog';
import FleetListDialog from '../components/FleetListDialog';
import AddWarehouseDialog from '../components/AddWarehouseDialog';
import AddFleetDialog from '../components/AddFleetDialog';
import AddRestaurantDialog from '../components/AddRestaurantDialog';
import RestaurantListDialog from '../components/RestaurantListDialog';
import RestaurantDetailsDialog from '../components/RestaurantDetailsDialog';
import OptimizeRouteDialog from '../components/OptimizeRouteDialog';
import RouteResultsDialog from '../components/RouteResultsDialog';
import GPSWarningDialog from '../components/GPSWarningDialog';
import BottomSheet from '../components/BottomSheet';
import WaypointDetails from '../components/WaypointDetails';
import { createLiveLocationMarker, updateMobileMapHeight } from '../utils/mapUtils';
import { INDIA_CENTER } from '../constants/mapConstants';
import { warehousesAPI, fleetsAPI, restaurantsAPI, optimizeAPI } from '../services/api';

// Ensure default Leaflet markers load correctly when bundled (e.g., on Vercel)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2xUrl,
  iconUrl: markerIconUrl,
  shadowUrl: markerShadowUrl,
});

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [coordinates, setCoordinates] = useState({ lat: 0, lng: 0, accuracy: null });
  const [cursorCoordinates, setCursorCoordinates] = useState({ lat: 0, lng: 0, accuracy: null });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('themeMode');
    return saved === 'dark';
  });
  const [loginPromptOpen, setLoginPromptOpen] = useState(false);
  const [gpsWarningOpen, setGpsWarningOpen] = useState(false);
  const [gpsActive, setGpsActive] = useState(false);
  const [startSurveyDialogOpen, setStartSurveyDialogOpen] = useState(false);
  const [activeProject, setActiveProject] = useState(null);
  const [fleetListDialogOpen, setFleetListDialogOpen] = useState(false);
  const [addWarehouseDialogOpen, setAddWarehouseDialogOpen] = useState(false);
  const [addFleetDialogOpen, setAddFleetDialogOpen] = useState(false);
  const [editFleetData, setEditFleetData] = useState(null);
  const [addRestaurantDialogOpen, setAddRestaurantDialogOpen] = useState(false);
  const [restaurantListDialogOpen, setRestaurantListDialogOpen] = useState(false);
  const [restaurantDetailsOpen, setRestaurantDetailsOpen] = useState(false);
  const [optimizeRouteDialogOpen, setOptimizeRouteDialogOpen] = useState(false);
  const [routeResultsOpen, setRouteResultsOpen] = useState(false);
  const [routeOptimizationResults, setRouteOptimizationResults] = useState(null);
  const [isResultsMinimized, setIsResultsMinimized] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [restaurantData, setRestaurantData] = useState({});
  const [restaurantLocationSelectionActive, setRestaurantLocationSelectionActive] = useState(false);
  const [satelliteHybridMode, setSatelliteHybridMode] = useState(false);
  const [bottomSheetExpanded, setBottomSheetExpanded] = useState(false);

  // --- ADD THESE NEW STATES FOR DYNAMIC VRP ---
  const [isLiveDispatchMode, setIsLiveDispatchMode] = useState(false);
  const [activeFleetRoutes, setActiveFleetRoutes] = useState(null);
  const [dynamicPickupDialogOpen, setDynamicPickupDialogOpen] = useState(false);
  // --------------------------------------------

  
  // Warehouse markers state
  const [warehouses, setWarehouses] = useState([]);
  const [warehouseMarkers, setWarehouseMarkers] = useState({});
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);
  const [waypointDetailsOpen, setWaypointDetailsOpen] = useState(false);
  const [waypointData, setWaypointData] = useState({});
  const [locationSelectionActive, setLocationSelectionActive] = useState(false);
  
  // Restaurant markers state
  const [restaurants, setRestaurants] = useState([]);
  const [restaurantMarkers, setRestaurantMarkers] = useState({});
  
  const watchPositionIdRef = useRef(null);
  const mapRef = useRef(null);
  const liveLocationMarkerRef = useRef(null);
  const customCursorRef = useRef(null);
  const tileLayerRef = useRef(null);
  const labelLayerRef = useRef(null);
  const locateHandlerRef = useRef(null);
  const liveCoordsRef = useRef(null);
  const bottomSheetRef = useRef(null);
  const [mapDynamicHeight, setMapDynamicHeight] = useState(null);
  
  // --- ADD DYNAMIC REROUTE LOGIC ---
// --- TIME INTERPOLATION & DYNAMIC REROUTE LOGIC ---
const parseTimeToSeconds = (timeStr) => {
  if (!timeStr || timeStr === '-') return 0;
  let isNextDay = timeStr.includes('Next day');
  let t = timeStr.replace('Next day ', '').trim();
  const [h, m] = t.split(':').map(Number);
  let seconds = ((h - 8) * 3600) + (m * 60);
  if (isNextDay) seconds += 24 * 3600;
  return Math.max(0, seconds);
};

const handleDynamicReroute = async (newPickup, simulatedTimeStr) => {
  if (!routeOptimizationResults || !routeOptimizationResults.routes) {
    showSnackbar('No active route to modify. Please run a standard optimization first.', 'warning');
    return;
  }
  showSnackbar('Calculating exact live physical locations...', 'info');

  const simulatedSeconds = simulatedTimeStr ? parseTimeToSeconds(simulatedTimeStr) : 0;
  const activeVehicles = [];
  let unserved = [];

  routeOptimizationResults.routes.forEach(route => {
    if (route.vehicleName === 'Unassigned' || !route.stops || route.stops.length < 2) return;

    let lastVisitedStop = null;
    let nextStop = null;
    let prevStop = null;

    // 1. Traverse Timeline to find exact physical position
    for (let i = 0; i < route.stops.length; i++) {
      const stop = route.stops[i];
      const stopTime = parseTimeToSeconds(stop.arrivalTime);
      if (stopTime <= simulatedSeconds) {
        lastVisitedStop = stop;
      }
      if (stopTime > simulatedSeconds && !nextStop) {
        nextStop = stop;
        prevStop = i > 0 ? route.stops[i - 1] : stop;
      }
    }

    // If no next stop, the truck is already parked at the warehouse for the night. Do not reroute.
    if (!nextStop) return;

    const currentLoad = lastVisitedStop ? parseFloat(lastVisitedStop.load || 0) : 0;
    let currentLat, currentLng;
    
    // Calculate Exact Physics Ratio (Including 15-min waiting periods)
    const isPrevRestaurant = prevStop.type === 'restaurant';
    const prevArrivalTime = parseTimeToSeconds(prevStop.arrivalTime);
    const departureTimeFromPrev = prevArrivalTime + (isPrevRestaurant ? 900 : 0); // Stays parked for 15 mins
    const nextArrivalTime = parseTimeToSeconds(nextStop.arrivalTime);

    if (simulatedSeconds <= departureTimeFromPrev || prevStop === nextStop) {
      // Truck is physically parked at the location processing UCO
      const wp = routeOptimizationResults.waypoints.find(w => w.index === prevStop.index);
      currentLat = wp.latitude; currentLng = wp.longitude;
    } else {
      // Truck is actively driving on the road
      const travelTime = nextArrivalTime - departureTimeFromPrev;
      const elapsedDrivingTime = simulatedSeconds - departureTimeFromPrev;
      const ratio = Math.max(0, Math.min(1, elapsedDrivingTime / travelTime));
      
      const wpPrev = routeOptimizationResults.waypoints.find(w => w.index === prevStop.index);
      const wpNext = routeOptimizationResults.waypoints.find(w => w.index === nextStop.index);
      currentLat = wpPrev.latitude + (wpNext.latitude - wpPrev.latitude) * ratio;
      currentLng = wpPrev.longitude + (wpNext.longitude - wpPrev.longitude) * ratio;
    }

    // 2. Gather Remaining Unserved Pickups (PRESERVING SUPREME PRIORITIES)
    const vehicleUnserved = route.stops
      .filter(s => s.type === 'restaurant' && parseTimeToSeconds(s.arrivalTime) > simulatedSeconds)
      .map(s => {
        const fullData = restaurants.find(r => r.outlet_name === s.name);
        const stopIdx = route.stops.indexOf(s);
        const previousLoad = parseFloat(route.stops[stopIdx - 1]?.load || 0);
        const demand = parseFloat(s.load) - previousLoad;
        
        return fullData ? { 
          ...fullData, 
          amount: demand, 
          priorityLevel: s.priorityLevel || 1 // Critical: Preserves old Supreme tags!
        } : null;
      }).filter(Boolean);

    unserved = [...unserved, ...vehicleUnserved];

    // 3. Register Vehicle State
    let cap = 500;
    if (route.vehicleName.toLowerCase().includes('moped')) cap = 80;
    else if (route.vehicleName.toLowerCase().includes('intra')) cap = 1250;
    else if (route.vehicleName.toLowerCase().includes('bolero')) cap = 1900;

    activeVehicles.push({
      name: route.vehicleName,
      lat: currentLat,
      lng: currentLng,
      totalCapacity: cap,
      currentLoad: currentLoad,
      warehouseId: warehouses.find(w => w.name === route.warehouseName)?.id || null
    });
  });

  try {
    const response = await optimizeAPI.dynamicReroute({
      activeVehicles,
      unservedRestaurants: unserved,
      newPickup,
      warehouses,
      currentTimeSeconds: simulatedSeconds
    });
    setRouteOptimizationResults(response);
    setRouteResultsOpen(true);
    showSnackbar('Dynamic routing successful!', 'success');
  } catch (error) {
    console.error('Rerouting error:', error);
    showSnackbar('Failed to recalculate route.', 'error');
  }
};
// ---------------------------------

const theme = createAppTheme(darkMode ? 'dark' : 'light');
const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
const { isAuthenticated } = useAuth();

useEffect(() => {
  setSidebarOpen(isMobile ? false : true);
}, [isMobile]);

// --- ADD ROUTE DRAWING EFFECT WITH LIVE TRUCK MARKER ---
const routeLayersRef = useRef([]);

useEffect(() => {
  if (!mapRef.current || !routeOptimizationResults) return;
  const map = mapRef.current;

  // Clear previous route lines + markers
  routeLayersRef.current.forEach(layer => map.removeLayer(layer));
  routeLayersRef.current = [];

  const colors = ['#2196F3', '#FF9800', '#9C27B0', '#F44336', '#00BCD4'];

  routeOptimizationResults.routes.forEach((route, index) => {
    if (route.vehicleName === 'Unassigned' || !route.stops || route.stops.length === 0) return;

    const vehicleColor = colors[index % colors.length];
    const waypoints = [];

    route.stops.forEach((stop, stopIdx) => {
      const wp = routeOptimizationResults.waypoints.find(w => w.index === stop.index);
      if (!wp) return;

      const latlng = [wp.latitude, wp.longitude];
      waypoints.push(latlng);

      let label = stopIdx;
      if (stopIdx === 0) label = 'S';
      if (stopIdx === route.stops.length - 1) label = 'E';

      // Detect if this is the "Live" location we mathematically calculated
      const isCurrentLoc = wp.name === 'Current GPS Location';
      
      const markerHtml = `<div style="
        background-color: ${isCurrentLoc ? '#2E2E2E' : vehicleColor};
        color: white;
        border-radius: 50%;
        width: ${isCurrentLoc ? '32px' : '24px'};
        height: ${isCurrentLoc ? '32px' : '24px'};
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: ${isCurrentLoc ? '16px' : '12px'};
        font-weight: bold;
        border: 2px solid ${isCurrentLoc ? '#4CAF50' : 'white'};
        box-shadow: 0 4px 8px rgba(0,0,0,0.5);
        z-index: ${isCurrentLoc ? 1000 : 1};
      ">${isCurrentLoc ? '🚚' : label}</div>`;

      const icon = L.divIcon({
        html: markerHtml,
        className: '',
        iconSize: isCurrentLoc ? [32, 32] : [24, 24],
        iconAnchor: isCurrentLoc ? [16, 16] : [12, 12]
      });

      const marker = L.marker(latlng, { icon }).addTo(map);

      marker.bindTooltip(
        `<b>${stop.name}</b><br/>Vehicle: ${route.vehicleName}<br/>Arr: ${stop.arrivalTime || 'N/A'}`
      );

      routeLayersRef.current.push(marker);
    });

    if (waypoints.length > 1) {
      const polyline = L.polyline(waypoints, {
        color: vehicleColor,
        weight: 4,
        opacity: 0.8,
        dashArray: isLiveDispatchMode ? '10, 10' : null,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map);

      routeLayersRef.current.push(polyline);
    }
  });

  // Fit map bounds to show the whole route
  if (routeLayersRef.current.length > 0) {
    const group = new L.featureGroup(routeLayersRef.current);
    map.fitBounds(group.getBounds(), { padding: [50, 50] });
  }
}, [routeOptimizationResults, isLiveDispatchMode]);
// ---------------------------------
  // ---------------------------------

  const handleToggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('themeMode', newMode ? 'dark' : 'light');
    window.location.reload();
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  // Toggle satellite hybrid view
  const handleToggleSatelliteHybrid = () => {
    if (!mapRef.current) return;

    const map = mapRef.current;
    const newMode = !satelliteHybridMode;

    showSnackbar(newMode ? 'Switching to satellite view...' : 'Switching to map view...', 'info');

    if (tileLayerRef.current) {
      try {
        map.removeLayer(tileLayerRef.current);
        tileLayerRef.current = null;
      } catch (e) {
        console.warn('Error removing tile layer:', e);
      }
    }
    if (labelLayerRef.current) {
      try {
        map.removeLayer(labelLayerRef.current);
        labelLayerRef.current = null;
      } catch (e) {
        console.warn('Error removing label layer:', e);
      }
    }

    setTimeout(() => {
      if (!mapRef.current) return;

      setSatelliteHybridMode(newMode);

      if (newMode) {
        const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
          attribution: '',
          maxZoom: 19,
          minZoom: 1,
          tileSize: 256,
          zoomOffset: 0,
          errorTileUrl: '',
          crossOrigin: true
        });

        satelliteLayer.addTo(map);
        tileLayerRef.current = satelliteLayer;

        setTimeout(() => {
          if (!mapRef.current) return;

          const labelLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
            attribution: '',
            maxZoom: 19,
            minZoom: 1,
            opacity: 0.7,
            tileSize: 256,
            zoomOffset: 0,
            errorTileUrl: '',
            crossOrigin: true
          });

          labelLayer.addTo(map);
          labelLayerRef.current = labelLayer;
        }, 100);

        showSnackbar('Satellite hybrid view enabled', 'success');
      } else {
        const tileUrl = darkMode
          ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
          : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

        const tileLayer = L.tileLayer(tileUrl, {
          attribution: '',
          maxZoom: 19,
          errorTileUrl: '',
          crossOrigin: true
        });

        tileLayer.addTo(map);
        tileLayerRef.current = tileLayer;

        showSnackbar('Map view enabled', 'success');
      }
    }, 50);
  };

  const handleSidebarToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleMenuItemClick = (item) => {
    if (item === 'Add Warehouse') {
      if (!isAuthenticated) {
        setLoginPromptOpen(true);
        return;
      }
      setAddWarehouseDialogOpen(true);
    } else if (item === 'Warehouses') {
      if (!isAuthenticated) {
        setLoginPromptOpen(true);
        return;
      }
      setStartSurveyDialogOpen(true);
    }  else if (item === 'View all Warehouses') {
      if (!isAuthenticated) {
        setLoginPromptOpen(true);
        return;
      }
      // 🔥 No longer plotting all visible IDs
      setStartSurveyDialogOpen(true); // Just open the list instead
      
    } else if (item === 'View Fleets') {
      if (!isAuthenticated) {
        setLoginPromptOpen(true);
        return;
      }
      setFleetListDialogOpen(true);
    } else if (item === 'Restaurants' || item === 'View Restaurants' || item === 'View all Restaurants') {
      if (!isAuthenticated) {
        setLoginPromptOpen(true);
        return;
      }
      // 🔥 Merged "View all" to just open the dialog without plotting all IDs
      setRestaurantListDialogOpen(true);
    } else if (item === 'View all Restaurants') {
      if (!isAuthenticated) {
        setLoginPromptOpen(true);
        return;
      }
      setVisibleRestaurantIds(restaurants.map(r => String(r.id)));
      if (restaurants[0]?.latitude && restaurants[0]?.longitude) {
        handleNavigateToRestaurantLocation(restaurants[0]);
      }
    } else if (item === 'Optimize Route') {
      if (!isAuthenticated) {
        setLoginPromptOpen(true);
        return;
      }
      setOptimizeRouteDialogOpen(true);
    }

    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  // Handle opening add warehouse dialog from StartSurveyDialog
  const handleAddWarehouseFromDialog = () => {
    setStartSurveyDialogOpen(false);
    setAddWarehouseDialogOpen(true);
  };

  // Handle opening add fleet dialog from FleetListDialog
  const handleAddFleetFromDialog = () => {
    setFleetListDialogOpen(false);
    setAddFleetDialogOpen(true);
  };

  // Handle warehouse created from AddWarehouseDialog
  const handleWarehouseCreated = (warehouse) => {
    setWarehouses(prev => [...prev, warehouse]);
    addWarehouseMarker(warehouse);
  };

  // Handle fleet created/updated from AddFleetDialog
  const handleFleetCreated = (fleet) => {
    // Fleets are just shown in the list, no markers needed
    // The list will be refreshed when reopened
  };

  // Handle edit fleet request
  const handleEditFleet = (fleet) => {
    setEditFleetData(fleet);
    setAddFleetDialogOpen(true);
  };

  // Clear edit data when dialog closes
  const handleAddFleetDialogClose = () => {
    setAddFleetDialogOpen(false);
    setEditFleetData(null);
  };

  // Restaurant handlers
  const handleAddRestaurantFromDialog = () => {
    setRestaurantListDialogOpen(false);
    setAddRestaurantDialogOpen(true);
  };

  const handleRestaurantCreated = (restaurant) => {
    setRestaurants(prev => [...prev, restaurant]);
    if (restaurant.latitude && restaurant.longitude) {
      addRestaurantMarker(restaurant);
    }
  };

  const handleRestaurantDetails = (restaurant) => {
    setSelectedRestaurant(restaurant);
    setRestaurantData({
      id: restaurant.id,
      outlet_name: restaurant.outlet_name,
      area: restaurant.area || '',
      city: restaurant.city || '',
      pincode: restaurant.pincode || '',
      amount: restaurant.amount || '',
      latitude: restaurant.latitude || '',
      longitude: restaurant.longitude || '',
      created_at: restaurant.created_at
    });

    // When selecting from sidebar/dialog, show only this restaurant marker
    setVisibleRestaurantIds((prev) => {
      const idStr = String(restaurant.id);
      return prev.includes(idStr) ? prev : [idStr];
    });

    setRestaurantListDialogOpen(false);
    setRestaurantDetailsOpen(true);
  };

  const handleSaveRestaurant = async () => {
    if (!restaurantData.outlet_name) {
      showSnackbar('Please enter outlet name', 'error');
      return;
    }
    try {
      if (restaurantData.id && !String(restaurantData.id).startsWith('temp-')) {
        await restaurantsAPI.update(restaurantData.id, restaurantData);
        showSnackbar('Restaurant updated', 'success');
      } else {
        await restaurantsAPI.create(restaurantData);
        showSnackbar('Restaurant created', 'success');
      }
      setRestaurantDetailsOpen(false);
    } catch (err) {
      console.error('Error saving restaurant:', err);
      showSnackbar(err.response?.data?.error || 'Failed to save restaurant', 'error');
    }
  };

  const handleDeleteRestaurant = async () => {
    if (!restaurantData.id) return;
    try {
      await restaurantsAPI.delete(restaurantData.id);
      showSnackbar('Restaurant deleted', 'success');
      setRestaurantDetailsOpen(false);
    } catch (err) {
      console.error('Error deleting restaurant:', err);
      showSnackbar('Failed to delete restaurant', 'error');
    }
  };

  const handleNavigateToRestaurant = () => {
    if (!mapRef.current) return;
    const lat = parseFloat(restaurantData.latitude);
    const lng = parseFloat(restaurantData.longitude);
    if (!isNaN(lat) && !isNaN(lng)) {
      mapRef.current.setView([lat, lng], 15);
      showSnackbar(`Navigated to ${restaurantData.outlet_name}`, 'success');
      setRestaurantDetailsOpen(false);
    }
  };

  const handleRestaurantToggleLocationSelection = () => {
    setRestaurantLocationSelectionActive(!restaurantLocationSelectionActive);
    if (!restaurantLocationSelectionActive) {
      showSnackbar('Click on map to set location', 'info');
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Handler when GPS warning's continue is clicked
  const handleGpsWarningContinue = () => {
    goToDefaultLocation();
  };

  const goToDefaultLocation = () => {
    const map = mapRef.current;
    if (!map) return;

    const defaultLat = 26.516654;
    const defaultLng = 80.231507;
    
    map.setView([defaultLat, defaultLng], 15);
    setCoordinates({
      lat: defaultLat.toFixed(6),
      lng: defaultLng.toFixed(6),
      accuracy: null
    });
  };

  useEffect(() => {
    // initialize map only once
    const map = L.map('map', {

      zoomControl: false,
      attributionControl: false,
      rotate: true,
      touchRotate: true,
      touchGestures: true,
      rotateControl: false,
      bearing: 0,
    }).setView([INDIA_CENTER.lat, INDIA_CENTER.lng], 5);
    mapRef.current = map;

    // Initialize tile layer based on satellite hybrid mode
    if (satelliteHybridMode) {
      const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: '',
        maxZoom: 19,
        minZoom: 1,
        tileSize: 256,
        zoomOffset: 0,
        errorTileUrl: '',
        crossOrigin: true
      });

      satelliteLayer.addTo(map);
      tileLayerRef.current = satelliteLayer;

      setTimeout(() => {
        if (mapRef.current && satelliteHybridMode) {
          const labelLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
            attribution: '',
            maxZoom: 19,
            minZoom: 1,
            opacity: 0.7,
            tileSize: 256,
            zoomOffset: 0,
            errorTileUrl: '',
            crossOrigin: true
          });

          labelLayer.addTo(mapRef.current);
          labelLayerRef.current = labelLayer;
        }
      }, 200);
    } else {
      const tileUrl = darkMode
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

      const tileLayer = L.tileLayer(tileUrl, {
        attribution: '',
        maxZoom: 19,
        errorTileUrl: '',
        crossOrigin: true
      }).addTo(map);

      tileLayerRef.current = tileLayer;
    }

    // Try to get user's current location and center map on it
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (!mapRef.current || !mapRef.current._panes) return;
          const { latitude, longitude, accuracy } = position.coords;
          const hasAccuracy = typeof accuracy === 'number' && !Number.isNaN(accuracy);

          if (hasAccuracy && accuracy > 100) {
            console.log('Low GPS accuracy detected. Accuracy (m):', accuracy);
            setSnackbar({ open: true, message: `Low GPS accuracy: ±${Math.round(accuracy)}m — location may be imprecise`, severity: 'warning' });
          }

          map.setView([latitude, longitude], 15);
          if (isMobile) {
            updateMobileMapHeight();
            setTimeout(() => {
              try { map.invalidateSize(); } catch (e) { }
              try { map.setView([latitude, longitude], 15, { animate: false }); } catch (e) { }
            }, 120);
          }

          setCoordinates({
            lat: latitude.toFixed(6),
            lng: longitude.toFixed(6),
            accuracy: accuracy ? Math.round(accuracy) : null
          });

          const liveMarker = createLiveLocationMarker([latitude, longitude]).addTo(map);
          liveLocationMarkerRef.current = liveMarker;
          setGpsActive(true);

          const waypointId = 'current-location';
          
          try {
            if (liveLocationMarkerRef.current) {
              liveLocationMarkerRef.current.remove();
              liveLocationMarkerRef.current = null;
            }
            const liveMarker = createLiveLocationMarker([latitude, longitude]).addTo(map);
            liveLocationMarkerRef.current = liveMarker;
          } catch (e) {
            console.error('Error creating live location marker:', e);
          }

          watchPositionIdRef.current = navigator.geolocation.watchPosition(
            (position) => {
              const { latitude: newLat, longitude: newLng, accuracy: newAccuracy } = position.coords;

              setCoordinates({
                lat: newLat.toFixed(6),
                lng: newLng.toFixed(6),
                accuracy: newAccuracy ? Math.round(newAccuracy) : null
              });

              if (typeof newAccuracy === 'number' && !Number.isNaN(newAccuracy) && newAccuracy > 100) {
                setSnackbar({ open: true, message: `Low GPS accuracy: ±${Math.round(newAccuracy)}m — location may be imprecise`, severity: 'warning' });
              }

              if (liveLocationMarkerRef.current && liveLocationMarkerRef.current._icon) {
                liveLocationMarkerRef.current.setLatLng([newLat, newLng]);
              } else if (mapRef.current && mapRef.current._panes) {
                const liveMarker = createLiveLocationMarker([newLat, newLng]).addTo(mapRef.current);
                liveLocationMarkerRef.current = liveMarker;
              }
              if (isMobile && gpsActive) {
                setTimeout(() => {
                  try { mapRef.current.invalidateSize(); } catch (e) { }
                  try { mapRef.current.setView([newLat, newLng], 15, { animate: false }); } catch (e) { }
                }, 120);
              }
            },
            (error) => {
              console.log('Watch position error:', error);
              setGpsActive(false);
              if (liveLocationMarkerRef.current) {
                liveLocationMarkerRef.current.remove();
                liveLocationMarkerRef.current = null;
              }
            },
            {
              enableHighAccuracy: true,
              timeout: 5000,
              maximumAge: 1000
            }
          );
        },
        (error) => {
          console.log('Geolocation error:', error);
          setGpsActive(false);
          setSnackbar('Unable to access device location. Please allow GPS access and try again.', 'error');
          setGpsWarningOpen(true);
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      );
    } else {
      setGpsWarningOpen(true);
    }

    // Create custom control container for all map controls
    const MapControlsContainer = L.Control.extend({
      onAdd: function (map) {
        const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control map-controls-container');
        const isSmallScreen = window.innerWidth < 600;
        container.style.marginTop = isSmallScreen ? '60px' : '72px';
        container.style.marginRight = '10px';
        container.style.borderRadius = '12px';
        container.style.overflow = 'hidden';
        container.style.boxShadow = darkMode
          ? '0 2px 8px rgba(0, 0, 0, 0.5)'
          : '0 2px 8px rgba(0, 0, 0, 0.15)';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '0';

        // Search button
        const searchButton = L.DomUtil.create('a', 'leaflet-control-search', container);
        searchButton.href = '#';
        searchButton.title = 'Search Location';
        const buttonSize = isSmallScreen ? '2.5rem' : '2.125rem';
        const iconSize = isSmallScreen ? '1.25rem' : '1.125rem';
        searchButton.style.cssText = `
          width: ${buttonSize};
          height: ${buttonSize};
          line-height: ${buttonSize};
          text-align: center;
          display: block;
          background-color: ${darkMode ? '#1e1e1e' : '#fff'};
          color: ${darkMode ? '#fff' : '#333'};
          text-decoration: none;
          border: none;
          border-bottom: 1px solid ${darkMode ? 'rgba(255,255,255,0.1)' : '#e0e0e0'};
        `;

        const searchIcon = `
          <svg width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-top: ${isSmallScreen ? '0.75rem' : '0.5rem'};">
            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" fill="#4CAF50"/>
          </svg>
        `;
        searchButton.innerHTML = searchIcon;

        L.DomEvent.disableClickPropagation(searchButton);
        L.DomEvent.on(searchButton, 'click', L.DomEvent.stop);
        L.DomEvent.on(searchButton, 'click', () => {
          const query = prompt('Enter location to search:');
          if (query && query.trim()) {
            fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`)
              .then(response => response.json())
              .then(data => {
                if (data && data.length > 0) {
                  const { lat, lon } = data[0];
                  map.setView([parseFloat(lat), parseFloat(lon)], 13);
                  setTimeout(() => {
                    setSnackbar({ open: true, message: `Found: ${data[0].display_name}`, severity: 'success' });
                  }, 0);
                } else {
                  setTimeout(() => {
                    setSnackbar({ open: true, message: 'Location not found. Please try a different search term.', severity: 'error' });
                  }, 0);
                }
              })
              .catch(error => {
                console.error('Search error:', error);
                setTimeout(() => {
                  setSnackbar({ open: true, message: 'Search failed. Please try again.', severity: 'error' });
                }, 0);
              });
          }
        });

        // Locate button
        const locateButton = L.DomUtil.create('a', 'leaflet-control-locate', container);
        locateButton.href = '#';
        locateButton.title = 'Locate Me';
        locateButton.style.cssText = `
          width: ${buttonSize};
          height: ${buttonSize};
          line-height: ${buttonSize};
          text-align: center;
          display: block;
          background-color: ${darkMode ? '#1e1e1e' : '#fff'};
          color: ${darkMode ? '#fff' : '#333'};
          text-decoration: none;
          border: none;
        `;

        const locateIconSize = isSmallScreen ? '1.5rem' : '1.09375rem';
        const locateIcon = `
          <svg width="${locateIconSize}" height="${locateIconSize}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-top: ${isSmallScreen ? '0.75rem' : '0.4375rem'};">
            <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3A8.994 8.994 0 0 0 13 3.06V1h-2v2.06A8.994 8.994 0 0 0 3.06 11H1v2h2.06A8.994 8.994 0 0 0 11 20.94V23h2v-2.06A8.994 8.994 0 0 0 20.94 13H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z" fill="#4CAF50"/>
          </svg>
        `;
        locateButton.innerHTML = locateIcon;

        L.DomEvent.disableClickPropagation(locateButton);
        L.DomEvent.on(locateButton, 'click', L.DomEvent.stop);

        locateHandlerRef.current = () => {
          if (navigator.geolocation) {
            locateButton.style.opacity = '0.6';
            navigator.geolocation.getCurrentPosition(
              (position) => {
                const { latitude, longitude } = position.coords;
                const accuracy = position.coords.accuracy || 0;

                map.setView([latitude, longitude], 15);
                locateButton.style.opacity = '1';

                setCoordinates({
                  lat: latitude.toFixed(6),
                  lng: longitude.toFixed(6)
                });

                setTimeout(() => {
                  setSnackbar({ open: true, message: `Location found! Accuracy: ${Math.round(accuracy)}m`, severity: 'success' });
                }, 0);
              },
              (error) => {
                locateButton.style.opacity = '1';
                console.error('Geolocation error:', error);
                setGpsWarningOpen(true);
              },
              {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
              }
            );
          } else {
            setGpsWarningOpen(true);
          }
        };

        L.DomEvent.on(locateButton, 'click', locateHandlerRef.current);

        return container;
      },
      onRemove: function (map) {
      }
    });

    const mapControlsContainer = new MapControlsContainer({ position: 'topright' });
    mapControlsContainer.addTo(map);

    // Add click handler for location selection
    map.on('click', handleMapClick);

    const mapContainer = map.getContainer();

    if (isMobile) {
      updateMobileMapHeight();
    }

    // Cleanup function
    return () => {
      if (watchPositionIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchPositionIdRef.current);
        watchPositionIdRef.current = null;
        setGpsActive(false);
      }
      if (liveLocationMarkerRef.current) {
        liveLocationMarkerRef.current.remove();
        liveLocationMarkerRef.current = null;
      }
      map.remove();
    };
  }, [darkMode, satelliteHybridMode]);

  // Update tile layer when dark mode changes
  useEffect(() => {
    if (!mapRef.current || satelliteHybridMode) return;

    const map = mapRef.current;
    const mapContainer = map.getContainer();
    if (!mapContainer || !mapContainer.parentNode) {
      return;
    }

    if (tileLayerRef.current) {
      try {
        map.removeLayer(tileLayerRef.current);
        tileLayerRef.current = null;
      } catch (e) {
        console.warn('Error removing tile layer:', e);
      }
    }

    setTimeout(() => {
      if (!mapRef.current || satelliteHybridMode) return;

      const currentMap = mapRef.current;
      const currentContainer = currentMap.getContainer();
      if (!currentContainer || !currentContainer.parentNode) {
        return;
      }

      const tileUrl = darkMode
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

      const tileLayer = L.tileLayer(tileUrl, {
        attribution: '',
        maxZoom: 19,
        errorTileUrl: '',
        crossOrigin: true
      });

      tileLayer.addTo(currentMap);
      tileLayerRef.current = tileLayer;
    }, 50);
  }, [darkMode, satelliteHybridMode]);

  // Update live coordinates
  useEffect(() => {
    if (!mapRef.current) return;


    const map = mapRef.current;

    const updateCenterCoordinates = () => {
      const center = map.getCenter();
      setCursorCoordinates({
        lat: center.lat.toFixed(6),
        lng: center.lng.toFixed(6),
        accuracy: null
      });
    };

    const handleMouseMove = (e) => {
      const latlng = map.mouseEventToLatLng(e.originalEvent);
      setCursorCoordinates({
        lat: latlng.lat.toFixed(6),
        lng: latlng.lng.toFixed(6),
        accuracy: null
      });
    };

    map.on('mousemove', handleMouseMove);

    return () => {
      map.off('mousemove', handleMouseMove);
    };
  }, [gpsActive]);

  // Recalculate map size on mobile
  useEffect(() => {
    if (!isMobile) return;
    const handler = () => updateMobileMapHeightWrapper();
    handler();
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, [isMobile, sidebarOpen]);

  const updateMobileMapHeightWrapper = () => {
    updateMobileMapHeight(isMobile, false, bottomSheetExpanded, { liveCoordsRef }, setMapDynamicHeight);
  };

  // Update loadWarehouses to this:
  const loadWarehouses = async () => {
    if (!isAuthenticated) return;
    try {
      const data = await warehousesAPI.getAll();
      setWarehouses(data);
      // 🔥 REMOVED THE AUTO-PLOTTING FOREACH LOOP HERE
    } catch (err) {
      console.error('Error loading warehouses:', err);
    }
  };

  // Update loadRestaurants to this:
  const loadRestaurants = async () => {
    if (!isAuthenticated) return;
    try {
      const data = await restaurantsAPI.getAll();
      setRestaurants(data);
      // 🔥 REMOVED THE AUTO-PLOTTING FOREACH LOOP HERE
    } catch (err) {
      console.error('Error loading restaurants:', err);
    }
  };

  // Add a marker for a restaurant
  const addRestaurantMarker = (restaurant) => {
    if (!mapRef.current || !mapRef.current._panes || restaurantMarkers[restaurant.id]) return;
    
    const lat = parseFloat(restaurant.latitude);
    const lng = parseFloat(restaurant.longitude);
    
    if (isNaN(lat) || isNaN(lng)) return;

    const marker = L.marker([lat, lng], {
      icon: L.divIcon({
        className: 'restaurant-marker',
        html: `<div style="
          background-color: #FF5722;
          width: 32px;
          height: 32px;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        ">
          <span style="
            transform: rotate(45deg);
            color: white;
            font-size: 14px;
          ">🍽️</span>
        </div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32]
      })
    });

    marker.on('click', () => {
      handleRestaurantMarkerClick(restaurant);
    });

    marker.addTo(mapRef.current);
    setRestaurantMarkers(prev => ({ ...prev, [restaurant.id]: marker }));
  };

  // Handle restaurant marker click
  const handleRestaurantMarkerClick = (restaurant) => {
    handleRestaurantDetails(restaurant);
  };

  // Navigate to restaurant location
  const handleNavigateToRestaurantLocation = (restaurant) => {
    if (!mapRef.current) return;
    const lat = parseFloat(restaurant.latitude || restaurant.lat);
    const lng = parseFloat(restaurant.longitude || restaurant.lng);
    if (!isNaN(lat) && !isNaN(lng)) {
      mapRef.current.setView([lat, lng], 15);
      showSnackbar(`Navigated to ${restaurant.outlet_name}`, 'success');
    }
  };

  // Add a marker for a warehouse
  const addWarehouseMarker = (warehouse) => {
    if (!mapRef.current || !mapRef.current._panes || warehouseMarkers[warehouse.id]) return;
    
    const lat = parseFloat(warehouse.latitude);
    const lng = parseFloat(warehouse.longitude);
    
    if (isNaN(lat) || isNaN(lng)) return;

    const marker = L.marker([lat, lng], {
      icon: L.divIcon({
        className: 'warehouse-marker',
        html: `<div style="
          background-color: #4CAF50;
          width: 32px;
          height: 32px;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        ">
          <span style="
            transform: rotate(45deg);
            color: white;
            font-size: 14px;
          ">🏭</span>
        </div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32]
      })
    });

    marker.on('click', () => {
      handleWarehouseMarkerClick(warehouse);
    });

    marker.addTo(mapRef.current);
    setWarehouseMarkers(prev => ({ ...prev, [warehouse.id]: marker }));
  };

  // Handle warehouse marker click
  const handleWarehouseMarkerClick = (warehouse) => {
    setSelectedWarehouse(warehouse);
    setWaypointData({
      id: warehouse.id,
      name: warehouse.name,
      latitude: warehouse.latitude,
      longitude: warehouse.longitude,
      address: warehouse.address || '',
      state: warehouse.state || '',
      rent_type: warehouse.rent_type || '',
      image: warehouse.image || '',
      created_at: warehouse.created_at
    });
    setWaypointDetailsOpen(true);
  };

  // Navigate to warehouse location
  const handleNavigateToWarehouse = (warehouse) => {
    if (!mapRef.current) return;
    const lat = parseFloat(warehouse.latitude || warehouse.lat);
    const lng = parseFloat(warehouse.longitude || warehouse.lng);
    if (!isNaN(lat) && !isNaN(lng)) {
      mapRef.current.setView([lat, lng], 15);
      showSnackbar(`Navigated to ${warehouse.name}`, 'success');
    }
  };

  // Toggle location selection mode
  const handleToggleLocationSelection = () => {
    setLocationSelectionActive(!locationSelectionActive);
    if (!locationSelectionActive) {
      showSnackbar('Click on map to set location', 'info');
    }
  };

  // Handle map click for location selection
  const handleMapClick = (e) => {
    if (!locationSelectionActive) return;
    const { lat, lng } = e.latlng;
    setWaypointData(prev => ({
      ...prev,
      latitude: lat.toFixed(6),
      longitude: lng.toFixed(6),
      lat: lat.toFixed(6),
      lng: lng.toFixed(6)
    }));
    setLocationSelectionActive(false);
    showSnackbar('Location set', 'success');
  };

  // Handle save warehouse
  const handleSaveWarehouse = async () => {
    if (!waypointData.name) {
      showSnackbar('Please enter a name', 'error');
      return;
    }
    try {
      if (waypointData.id && !String(waypointData.id).startsWith('temp-')) {
        // Update existing warehouse
        await warehousesAPI.update(waypointData.id, waypointData);
        showSnackbar('Warehouse updated', 'success');
      } else {
        // Create new warehouse
        const newWarehouse = await warehousesAPI.create({
          name: waypointData.name,
          address: waypointData.address,
          state: waypointData.state,
          rent_type: waypointData.rent_type,
          latitude: waypointData.latitude || waypointData.lat,
          longitude: waypointData.longitude || waypointData.lng
        });
        setWarehouses(prev => [...prev, newWarehouse]);
        addWarehouseMarker(newWarehouse);
        showSnackbar('Warehouse created', 'success');
      }
      setWaypointDetailsOpen(false);
      loadWarehouses();
    } catch (err) {
      console.error('Error saving warehouse:', err);
      showSnackbar(err.response?.data?.error || 'Failed to save warehouse', 'error');
    }
  };

  // Handle delete warehouse
  const handleDeleteWarehouse = async () => {
    if (!waypointData.id) return;
    try {
      await warehousesAPI.delete(waypointData.id);
      // Remove marker
      if (warehouseMarkers[waypointData.id]) {
        warehouseMarkers[waypointData.id].remove();
        setWarehouseMarkers(prev => {
          const next = { ...prev };
          delete next[waypointData.id];
          return next;
        });
      }
      showSnackbar('Warehouse deleted', 'success');
      setWaypointDetailsOpen(false);
      loadWarehouses();
    } catch (err) {
      console.error('Error deleting warehouse:', err);
      showSnackbar('Failed to delete warehouse', 'error');
    }
  };

  // Handle warehouse selection from dialog
  const handleWarehouseSelect = (warehouse) => {
    setActiveProject({ id: warehouse.id, name: warehouse.name });

    // When selecting from sidebar/dialog, show only this warehouse marker
    setVisibleWarehouseIds((prev) => {
      const idStr = String(warehouse.id);
      return prev.includes(idStr) ? prev : [idStr];
    });

    // Navigate to warehouse
    if (warehouse.latitude && warehouse.longitude) {
      handleNavigateToWarehouse(warehouse);
    }

    showSnackbar(`Selected: ${warehouse.name}`, 'info');
  };

  const [visibleWarehouseIds, setVisibleWarehouseIds] = useState([]);
  const [visibleRestaurantIds, setVisibleRestaurantIds] = useState([]);

  const syncWarehouseMarkers = (ids) => {
    // remove
    Object.entries(warehouseMarkers).forEach(([id, marker]) => {
      if (!ids.includes(id)) {
        marker.remove();
        setWarehouseMarkers(prev => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      }
    });
    // add
    ids.forEach((id) => {
      const w = warehouses.find(x => String(x.id) === String(id));
      if (w) addWarehouseMarker(w);
    });
  };

  const syncRestaurantMarkers = (ids) => {
    Object.entries(restaurantMarkers).forEach(([id, marker]) => {
      if (!ids.includes(id)) {
        marker.remove();
        setRestaurantMarkers(prev => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      }
    });
    ids.forEach((id) => {
      const r = restaurants.find(x => String(x.id) === String(id));
      if (r) addRestaurantMarker(r);
    });
  };

  // Load data when auth state changes (do NOT render all markers by default)
  useEffect(() => {
    if (isAuthenticated) {
      loadWarehouses();
      loadRestaurants();
      setVisibleWarehouseIds([]);
      setVisibleRestaurantIds([]);
      // markers will remain empty until user selects
    } else {
      Object.values(warehouseMarkers).forEach(marker => marker.remove());
      setWarehouseMarkers({});
      setWarehouses([]);
      Object.values(restaurantMarkers).forEach(marker => marker.remove());
      setRestaurantMarkers({});
      setRestaurants([]);
      setVisibleWarehouseIds([]);
      setVisibleRestaurantIds([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  useEffect(() => {
    syncWarehouseMarkers(visibleWarehouseIds.map(String));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleWarehouseIds, warehouses]);

  useEffect(() => {
    syncRestaurantMarkers(visibleRestaurantIds.map(String));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleRestaurantIds, restaurants]);

  // Cleanup map click handler on unmount
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.off('click', handleMapClick);
      }
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !isMobile) return;
    const map = mapRef.current;
    const currentCenter = map.getCenter();
    const currentZoom = map.getZoom();
    const timer = setTimeout(() => {
      if (!mapRef.current) return;
      mapRef.current.invalidateSize();
      mapRef.current.setView(currentCenter, currentZoom, { animate: false });
    }, 140);
    return () => clearTimeout(timer);
  }, [mapDynamicHeight, isMobile]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{
        display: 'flex',
        height: '100vh',
        overflow: 'hidden',
        backgroundColor: theme.palette.background.default
      }}>
        <Navbar
          sidebarOpen={sidebarOpen}
          isMobile={isMobile}
          darkMode={darkMode}
          onToggleDarkMode={handleToggleDarkMode}
          onSetDefaultLocation={goToDefaultLocation}
          onToggleSatelliteHybrid={handleToggleSatelliteHybrid}
          satelliteHybridMode={satelliteHybridMode}
        />
        <Sidebar
          sidebarOpen={sidebarOpen}
          onToggle={handleSidebarToggle}
          isMobile={isMobile}
          onMenuItemClick={handleMenuItemClick}
        />
        <StartSurveyDialog
          open={startSurveyDialogOpen}
          onClose={() => setStartSurveyDialogOpen(false)}
          onContinue={handleWarehouseSelect}
          onShowSnackbar={showSnackbar}
          onAddNew={handleAddWarehouseFromDialog}
        />
        <FleetListDialog
          open={fleetListDialogOpen}
          onClose={() => setFleetListDialogOpen(false)}
          onShowSnackbar={showSnackbar}
          onAddNew={handleAddFleetFromDialog}
          onEdit={handleEditFleet}
        />
        <AddWarehouseDialog
          open={addWarehouseDialogOpen}
          onClose={() => setAddWarehouseDialogOpen(false)}
          onShowSnackbar={showSnackbar}
          onWarehouseCreated={handleWarehouseCreated}
        />
        <AddFleetDialog
          open={addFleetDialogOpen}
          onClose={handleAddFleetDialogClose}
          onShowSnackbar={showSnackbar}
          onFleetCreated={handleFleetCreated}
          editData={editFleetData}
        />
        <AddRestaurantDialog
          open={addRestaurantDialogOpen}
          onClose={() => setAddRestaurantDialogOpen(false)}
          onShowSnackbar={showSnackbar}
          onRestaurantCreated={handleRestaurantCreated}
        />
        <RestaurantListDialog
          open={restaurantListDialogOpen}
          onClose={() => setRestaurantListDialogOpen(false)}
          onShowSnackbar={showSnackbar}
          onAddNew={handleAddRestaurantFromDialog}
          onSelect={handleRestaurantDetails}
        />
        <RestaurantDetailsDialog
          open={restaurantDetailsOpen}
          selectedRestaurantId={restaurantData.id}
          restaurantData={restaurantData}
          setRestaurantData={setRestaurantData}
          onClose={() => setRestaurantDetailsOpen(false)}
          onSave={handleSaveRestaurant}
          onDelete={handleDeleteRestaurant}
          onNavigate={handleNavigateToRestaurant}
          currentLocation={coordinates}
          locationSelectionActive={restaurantLocationSelectionActive}
          onToggleLocationSelection={handleRestaurantToggleLocationSelection}
        />
        <OptimizeRouteDialog
          open={optimizeRouteDialogOpen}
          onClose={() => setOptimizeRouteDialogOpen(false)}
          onShowSnackbar={showSnackbar}
          onNext={(results) => {
            console.log('Route optimization results:', results);
            setRouteOptimizationResults(results);
            setRouteResultsOpen(true);
            setIsResultsMinimized(false);
            setOptimizeRouteDialogOpen(false);
          }}
        />
        {/* --- ADD DYNAMIC PICKUP DIALOG HERE --- */}
        <DynamicPickupDialog 
          open={dynamicPickupDialogOpen}
          onClose={() => setDynamicPickupDialogOpen(false)}
          onSubmit={handleDynamicReroute}
          restaurants={restaurants}
        />
        <RouteResultsDialog
          open={routeResultsOpen}
          onClose={() => {
            setRouteResultsOpen(false);
            setRouteOptimizationResults(null);
          }}
          onMinimize={() => {
            setRouteResultsOpen(false);
            setIsResultsMinimized(true);
          }}
          results={routeOptimizationResults}
          onRestaurantClick={(stop) => {
            // Navigate to restaurant location on map
            const waypoint = routeOptimizationResults?.waypoints?.find(w => w.index === stop.index);
            if (waypoint && waypoint.latitude && waypoint.longitude) {
              handleNavigateToRestaurantLocation({
                outlet_name: stop.name,
                lat: waypoint.latitude,
                lng: waypoint.longitude
              });
            }
          }}
        />
        <WaypointDetails
          open={waypointDetailsOpen}
          selectedWaypointId={waypointData.id}
          waypointData={waypointData}
          setWaypointData={setWaypointData}
          onClose={() => setWaypointDetailsOpen(false)}
          onSave={handleSaveWarehouse}
          onDelete={handleDeleteWarehouse}
          onImageUpload={() => {}}
          onNavigate={handleNavigateToWarehouse}
          currentLocation={coordinates}
          locationSelectionActive={locationSelectionActive}
          onToggleLocationSelection={handleToggleLocationSelection}
        />
        {isMobile && (
          <IconButton
            onClick={handleSidebarToggle}
            sx={{
              position: 'fixed',
              top: '5rem',
              left: '0.75rem',
              width: '3.5rem',
              height: '3.5rem',
              zIndex: theme.zIndex.drawer + 15,
              backgroundColor: theme.palette.background.paper,
              border: `1px solid ${theme.palette.divider}`,
              boxShadow: theme.palette.mode === 'dark'
                ? '0 2px 8px rgba(0,0,0,0.45)'
                : '0 2px 8px rgba(0,0,0,0.15)',
              '&:hover': {
                backgroundColor: theme.palette.action.hover,
              },
              '& .MuiSvgIcon-root': {
                fontSize: '1.75rem',
              },
            }}
            size="medium"
          >
            <MenuIcon />
          </IconButton>
        )}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: 0,
            height: '100vh',
            overflow: 'hidden',
            marginTop: { xs: '4.5rem', sm: '3.5rem' },
            width: '100%',
            position: 'relative',
          }}
        >
          <Box
            sx={{
              position: 'relative',
              width: '100%',
              height: isMobile && mapDynamicHeight ? `${mapDynamicHeight}px` : '100%',
              overflow: 'hidden',
            }}
          >
            <Box
              id="map"
              sx={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
              }}
            />
          </Box>

          {/* --- ADD THIS DYNAMIC VRP UI BLOCK --- */}
          {isAuthenticated && (
            <>
              {/* Live Dispatch Toggle (Top Left) */}
              <Paper sx={{ 
                position: 'absolute', 
                top: { xs: '85px', sm: '75px' },
                left: { xs: '15px', sm: sidebarOpen ? '280px' : '85px' },
                zIndex: 1200,
                p: 1,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                borderRadius: 2
              }}>

                <Typography variant="body2" fontWeight={600} color={isLiveDispatchMode ? "error" : "text.secondary"}>
                  Live Dispatch
                </Typography>
                <Switch 
                  checked={isLiveDispatchMode} 
                  onChange={(e) => setIsLiveDispatchMode(e.target.checked)} 
                  color="error" 
                  size="small"
                />
              </Paper>

          {/* New Urgent Pickup FAB (Bottom Right - Only visible in Live Mode) */}
              {isLiveDispatchMode && (
                <Button
                  variant="contained"
                  color="error"
                  startIcon={<RestaurantIcon />}
                  sx={{ 
                    position: 'absolute', 
                    bottom: isMobile ? 120 : 40, 
                    right: 20, 
                    zIndex: 1000, 
                    borderRadius: 8, 
                    px: 3, 
                    py: 1.5,
                    boxShadow: 3
                  }}
                  onClick={() => setDynamicPickupDialogOpen(true)}
                >
                  Urgent Pickup
                </Button>
              )}

              {/* Maximize button for minimized route results */}
              {isResultsMinimized && (
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<KeyboardArrowUp />}
                  onClick={() => {
                    setRouteResultsOpen(true);
                    setIsResultsMinimized(false);
                  }}
                  sx={{ 
                    position: 'absolute', 
                    bottom: 30, 
                    left: '50%', 
                    transform: 'translateX(-50%)', 
                    zIndex: 1200,
                    borderRadius: 8,
                    px: 3,
                    py: 1.5,
                    boxShadow: 3
                  }}
                >
                  Maximize Route Results
                </Button>
              )}
            </>
          )}
          {/* --------------------------------------- */}

          {/* Live Coordinates card */}
          {!isMobile && (
            <Paper
              sx={{
                position: 'fixed',
                bottom: 3,
                left: sidebarOpen ? '17rem' : '5rem',
                px: 2,
                py: 1,
                borderRadius: 2,
                zIndex: theme.zIndex.drawer,
                transition: 'left 0.2s ease',
                backgroundColor: theme.palette.mode === 'dark' ? 'rgba(30,30,30,0.9)' : 'rgba(255,255,255,0.95)',
                boxShadow: theme.palette.mode === 'dark'
                  ? '0 2px 8px rgba(0,0,0,0.5)'
                  : '0 2px 8px rgba(0,0,0,0.15)',
              }}
            >
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                {cursorCoordinates.lat}, {cursorCoordinates.lng}
              </Typography>
            </Paper>
          )}
        </Box>

        {/* Snackbar for notifications */}
        <CustomSnackbar
          open={snackbar.open}
          message={snackbar.message}
          severity={snackbar.severity}
          onClose={handleCloseSnackbar}
        />

        {/* Login Prompt Dialog */}
        <LoginPromptDialog
          open={loginPromptOpen}
          onClose={() => setLoginPromptOpen(false)}
        />
        
        <GPSWarningDialog
          open={gpsWarningOpen}
          onClose={() => setGpsWarningOpen(false)}
          onContinue={handleGpsWarningContinue}
          projectOngoing={!!activeProject}
        />
      </Box>
    </ThemeProvider>
  )
}

export default App;

