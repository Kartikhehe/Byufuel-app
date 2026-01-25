/**
 * Parse GeoJSON file content
 * @param {string} text - GeoJSON file content
 * @returns {Array} Array of waypoint objects {lat, lng, name, notes, image}
 */
export const parseGeoJSON = (text) => {
    try {
        const geoJSON = JSON.parse(text);
        if (geoJSON.type === 'FeatureCollection' && Array.isArray(geoJSON.features)) {
            return geoJSON.features
                .filter(feature => feature.type === 'Feature' && feature.geometry && feature.geometry.type === 'Point')
                .map(feature => {
                    const [lng, lat] = feature.geometry.coordinates;
                    const props = feature.properties || {};
                    return {
                        lat,
                        lng,
                        name: props.name || 'Imported Point',
                        notes: props.notes || props.description || '',
                        image: props.image_url || null
                    };
                });
        }
        return [];
    } catch (error) {
        console.error('Error parsing GeoJSON:', error);
        throw new Error('Invalid GeoJSON file format');
    }
};

/**
 * Parse KML file content
 * @param {string} text - KML file content
 * @returns {Array} Array of waypoint objects {lat, lng, name, notes, image}
 */
export const parseKML = (text) => {
    try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(text, 'text/xml');

        // Check for parsing errors
        const parserError = xmlDoc.querySelector('parsererror');
        if (parserError) {
            throw new Error('Invalid KML file format');
        }

        const placemarks = xmlDoc.querySelectorAll('Placemark');
        const waypoints = [];

        placemarks.forEach(placemark => {
            const nameElement = placemark.querySelector('name');
            const descriptionElement = placemark.querySelector('description');
            const pointElement = placemark.querySelector('Point');

            if (pointElement) {
                const coordinatesElement = pointElement.querySelector('coordinates');
                if (coordinatesElement) {
                    const coords = coordinatesElement.textContent.trim().split(',');
                    const lng = parseFloat(coords[0]);
                    const lat = parseFloat(coords[1]);

                    if (!isNaN(lat) && !isNaN(lng)) {
                        const name = nameElement ? nameElement.textContent.trim() : 'Imported Point';
                        const notes = descriptionElement ? descriptionElement.textContent.trim() : '';

                        waypoints.push({
                            lat,
                            lng,
                            name,
                            notes,
                            image: null
                        });
                    }
                }
            }
        });

        return waypoints;
    } catch (error) {
        console.error('Error parsing KML:', error);
        throw new Error('Invalid KML file format');
    }
};
