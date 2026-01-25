/**
 * Start timer from project data
 * @param {Object} project - Project object with elapsed_seconds, started_at, status
 * @param {Function} setTimerSeconds - State setter for timer seconds
 * @param {Object} timerIntervalRef - Ref object for timer interval
 */
export const startTimerFromProject = (project, setTimerSeconds, timerIntervalRef) => {
    if (!project) return;

    // Initialize to 0 to prevent showing old timer value
    setTimerSeconds(0);

    // Compute base seconds
    let base = project.elapsed_seconds || 0;
    if (project.started_at && project.status === 'playing') {
        const startedAt = new Date(project.started_at).getTime();
        base += Math.floor((Date.now() - startedAt) / 1000);
    }

    // Set the actual timer value after a brief moment
    setTimeout(() => setTimerSeconds(base), 50);

    // Start timer interval
    if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
    }
    timerIntervalRef.current = setInterval(() => {
        setTimerSeconds(prev => prev + 1);
    }, 1000);
};

/**
 * Stop the project timer
 * @param {Object} timerIntervalRef - Ref object for timer interval
 */
export const stopTimer = (timerIntervalRef) => {
    if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
    }
};
