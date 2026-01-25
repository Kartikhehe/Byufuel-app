/**
 * Intelligent GPS Tracking Utility
 * 
 * Features:
 * - Smart point saving (time >= 5s OR distance >= 5m)
 * - Batch point submission (reduces API calls)
 * - Real-time polyline visualization
 * - Accuracy filtering (ignores points with accuracy > 20m)
 * - Battery optimization
 */

import L from 'leaflet';
import { tracksAPI } from '../services/api';

export class GPSTracker {
    constructor(map, projectId) {
        this.map = map;
        this.projectId = projectId;

        // Tracking state
        this.isActive = false;
        this.isPaused = false;
        this.trackId = null;

        // Point buffering
        this.pointBuffer = [];
        this.lastSavedPoint = null;
        this.lastSavedTime = null;

        // Visual elements
        this.polyline = null;
        this.allPoints = [];

        // Configuration
        this.config = {
            minTimeDelta: 5000, // 5 seconds in milliseconds
            minDistance: 5, // 5 meters
            maxAccuracy: 20, // Ignore points with accuracy > 20m
            batchSize: 5, // Send batch when buffer reaches this size
            batchInterval: 15000, // Or send every 15 seconds
        };

        // Batch timer
        this.batchTimer = null;
    }

    /**
     * Start GPS tracking
     */
    async start() {
        try {
            // Start track on server
            const track = await tracksAPI.start(this.projectId);
            this.trackId = track.id;
            this.isActive = true;
            this.isPaused = false;

            // Create polyline for visualization
            this.polyline = L.polyline([], {
                color: '#4CAF50',
                weight: 3,
                opacity: 0.7,
                dashArray: '10, 10',
                smoothFactor: 1
            }).addTo(this.map);

            // Start batch timer
            this.startBatchTimer();

            console.log('GPS tracking started for project:', this.projectId);
            return track;
        } catch (error) {
            console.error('Error starting GPS tracking:', error);
            throw error;
        }
    }

    /**
     * Process new GPS position
     * Called whenever GPS coordinates change
     */
    processPosition(lat, lng, accuracy, elevation = null) {
        if (!this.isActive || this.isPaused) return;

        const now = Date.now();

        // Filter out inaccurate points
        if (accuracy && accuracy > this.config.maxAccuracy) {
            console.log(`Ignoring inaccurate point: ${accuracy}m`);
            return;
        }

        // Add to visual polyline immediately (real-time feedback)
        this.allPoints.push([lat, lng]);
        if (this.polyline) {
            this.polyline.setLatLngs(this.allPoints);
        }

        // Decide whether to save this point
        if (this.shouldSavePoint(lat, lng, now)) {
            this.bufferPoint(lat, lng, accuracy, elevation, now);
        }
    }

    /**
     * Determine if point should be saved
     * Logic: (time >= 5s) OR (distance >= 5m)
     */
    shouldSavePoint(lat, lng, time) {
        // Always save first point
        if (!this.lastSavedPoint) {
            return true;
        }

        // Check time delta
        const timeDelta = time - this.lastSavedTime;
        if (timeDelta >= this.config.minTimeDelta) {
            return true;
        }

        // Check distance
        const distance = this.calculateDistance(
            [this.lastSavedPoint.lat, this.lastSavedPoint.lng],
            [lat, lng]
        );

        if (distance >= this.config.minDistance) {
            return true;
        }

        return false;
    }

    /**
     * Add point to buffer for batch sending
     */
    bufferPoint(lat, lng, accuracy, elevation, time) {
        const point = {
            lat,
            lng,
            accuracy,
            elevation,
            timestamp: new Date(time).toISOString()
        };

        this.pointBuffer.push(point);
        this.lastSavedPoint = { lat, lng };
        this.lastSavedTime = time;

        // Send batch if buffer is full
        if (this.pointBuffer.length >= this.config.batchSize) {
            this.sendBatch();
        }
    }

    /**
     * Send buffered points to server
     */
    async sendBatch() {
        if (this.pointBuffer.length === 0) return;

        const pointsToSend = [...this.pointBuffer];
        this.pointBuffer = [];

        try {
            await tracksAPI.addPointsBatch(this.projectId, pointsToSend);
            console.log(`Sent batch of ${pointsToSend.length} points`);
        } catch (error) {
            console.error('Error sending batch:', error);
            // Re-add points to buffer on error
            this.pointBuffer = [...pointsToSend, ...this.pointBuffer];
        }
    }

    /**
     * Start batch timer to send points periodically
     */
    startBatchTimer() {
        this.batchTimer = setInterval(() => {
            this.sendBatch();
        }, this.config.batchInterval);
    }

    /**
     * Stop batch timer
     */
    stopBatchTimer() {
        if (this.batchTimer) {
            clearInterval(this.batchTimer);
            this.batchTimer = null;
        }
    }

    /**
     * Pause tracking
     */
    pause() {
        this.isPaused = true;

        // Send any remaining buffered points
        this.sendBatch();

        // Change polyline to solid
        if (this.polyline) {
            this.polyline.setStyle({
                dashArray: null,
                opacity: 0.8
            });
        }

        console.log('GPS tracking paused');
    }

    /**
     * Resume tracking
     */
    resume() {
        this.isPaused = false;

        // Change polyline back to dotted
        if (this.polyline) {
            this.polyline.setStyle({
                dashArray: '10, 10',
                opacity: 0.7
            });
        }

        console.log('GPS tracking resumed');
    }

    /**
     * Stop and finalize tracking
     */
    async stop() {
        this.isActive = false;
        this.stopBatchTimer();

        // Send any remaining buffered points
        await this.sendBatch();

        // End track on server (calculates distance)
        try {
            const result = await tracksAPI.endTrack(this.projectId);
            console.log('GPS tracking ended. Total distance:', result.total_distance, 'm');

            // Change polyline to final state
            if (this.polyline) {
                this.polyline.setStyle({
                    dashArray: null,
                    opacity: 1,
                    color: '#2196F3'
                });
            }

            return result;
        } catch (error) {
            console.error('Error ending track:', error);
            throw error;
        }
    }

    /**
     * Clear visualization
     */
    clear() {
        if (this.polyline) {
            this.polyline.remove();
            this.polyline = null;
        }
        this.allPoints = [];
        this.pointBuffer = [];
        this.lastSavedPoint = null;
        this.lastSavedTime = null;
    }

    /**
     * Calculate distance between two points using Leaflet
     */
    calculateDistance(point1, point2) {
        return this.map.distance(point1, point2);
    }

    /**
     * Load and display saved track
     */
    static async loadTrack(map, projectId) {
        try {
            const data = await tracksAPI.getByProject(projectId);

            if (data.points && data.points.length > 0) {
                const latlngs = data.points.map(p => [p.lat, p.lng]);

                const polyline = L.polyline(latlngs, {
                    color: '#2196F3',
                    weight: 3,
                    opacity: 1,
                    smoothFactor: 1
                }).addTo(map);

                console.log(`Loaded track with ${data.points.length} points`);
                console.log('Total distance:', data.summary?.total_distance, 'm');

                return { polyline, data };
            }

            return null;
        } catch (error) {
            console.error('Error loading track:', error);
            return null;
        }
    }
}
