/**
 * Format seconds into HH:MM:SS time format
 * @param {number} secs - Seconds to format
 * @returns {string} Formatted time string (HH:MM:SS)
 */
export const formatTime = (secs) => {
    if (!secs || secs < 0) return '00:00:00';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};
