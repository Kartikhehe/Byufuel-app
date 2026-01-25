import L from 'leaflet';

/**
 * Create a red circle marker for survey waypoints
 * @param {L.LatLng} latlng - Coordinates for the marker
 * @returns {L.CircleMarker} Red circle marker
 */
export const createSurveyMarker = (latlng) => {
    // Responsive marker sizes
    const isMobile = window.innerWidth < 600;
    const radius = isMobile ? 8 : 10;

    const marker = L.circleMarker(latlng, {
        radius: radius,
        fillColor: '#f44336', // Red for new survey points
        color: '#d32f2f',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8,
        interactive: false, // Make it non-interactive so clicks pass through to the marker below
        bubblingMouseEvents: false // Prevent event bubbling
    });

    // Set pointer-events to none on the element to ensure clicks pass through
    marker.on('add', function () {
        const element = this.getElement();
        if (element) {
            element.style.zIndex = '1000';
            element.style.pointerEvents = 'none'; // Ensure clicks pass through
            element.style.cursor = 'default';
            // Also set on SVG path and circle if they exist
            const path = element.querySelector('path');
            if (path) {
                path.style.pointerEvents = 'none';
            }
            const circle = element.querySelector('circle');
            if (circle) {
                circle.style.pointerEvents = 'none';
            }
            // Set on all children
            const children = element.querySelectorAll('*');
            children.forEach(child => {
                child.style.pointerEvents = 'none';
            });
        }
    });

    return marker;
};

/**
 * Create a blue circle marker for live location
 * @param {L.LatLng} latlng - Coordinates for the marker
 * @returns {L.CircleMarker} Blue circle marker
 */
export const createLiveLocationMarker = (latlng) => {
    // Responsive marker sizes
    const isMobile = window.innerWidth < 600;
    const radius = isMobile ? 8 : 10;

    const marker = L.circleMarker(latlng, {
        radius: radius,
        fillColor: '#2196F3', // Blue for live location
        color: '#1976D2',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8,
        interactive: false, // Make it non-interactive
        bubblingMouseEvents: false // Prevent event bubbling
    });

    // Set pointer-events to none on the element
    marker.on('add', function () {
        const element = this.getElement();
        if (element) {
            element.style.zIndex = '999';
            element.style.pointerEvents = 'none'; // Ensure clicks pass through
            element.style.cursor = 'default';
            // Also set on SVG path and circle if they exist
            const path = element.querySelector('path');
            if (path) {
                path.style.pointerEvents = 'none';
            }
            const circle = element.querySelector('circle');
            if (circle) {
                circle.style.pointerEvents = 'none';
            }
            // Set on all children
            const children = element.querySelectorAll('*');
            children.forEach(child => {
                child.style.pointerEvents = 'none';
            });
        }
    });

    return marker;
};

/**
 * Compute dynamic map height on mobile based on visible bottom cards
 * @param {boolean} isMobile - Whether the device is mobile
 * @param {boolean} waypointDetailsOpen - Whether waypoint details card is visible
 * @param {boolean} bottomSheetExpanded - Whether bottom sheet is fully expanded (mobile only)
 * @param {Object} refs - Object containing refs for live coords and waypoint details
 * @param {Function} setMapDynamicHeight - Function to set the map height
 */
export const updateMobileMapHeight = (isMobile, waypointDetailsOpen, bottomSheetExpanded, refs, setMapDynamicHeight) => {
    if (!isMobile || typeof window === 'undefined') return;
    const headerEl = document.querySelector('header');
    const headerHeight = headerEl?.offsetHeight || 72; // Updated to 72px (4.5rem) for mobile navbar
    const liveH = refs.liveCoordsRef?.current?.offsetHeight || 0;
    // Only include details height if bottom sheet is FULLY EXPANDED, not during animation
    // Add 30px extra to cover the rounded corners of the waypoint details section
    const detailsH = (waypointDetailsOpen && bottomSheetExpanded) ? (refs.waypointDetailsRef?.current?.offsetHeight || 0) - 30 : 0;
    const available = Math.max(200, window.innerHeight - headerHeight - liveH - detailsH);
    setMapDynamicHeight(available);
};
