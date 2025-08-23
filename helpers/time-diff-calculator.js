/**
 * Calculate time difference between two dates
 * @param {Date|string} startTime - Start time
 * @param {Date|string} endTime - End time (defaults to now)
 * @returns {object} - Time difference in various units
 */
function calculateTimeDifference(startTime, endTime = new Date()) {
    const start = new Date(startTime);
    const end = new Date(endTime);

    const diffInMs = end.getTime() - start.getTime();

    return {
        milliseconds: diffInMs,
        seconds: Math.floor(diffInMs / 1000),
        minutes: Math.floor(diffInMs / (1000 * 60)),
        hours: Math.floor(diffInMs / (1000 * 60 * 60)),
        days: Math.floor(diffInMs / (1000 * 60 * 60 * 24)),
        formatted: formatDuration(diffInMs)
    };
}

/**
 * Format duration in a human-readable format
 * @param {number} milliseconds - Duration in milliseconds
 * @returns {string} - Formatted duration string
 */
function formatDuration(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
        return `${days} day${days > 1 ? 's' : ''}, ${hours % 24} hour${hours % 24 !== 1 ? 's' : ''}`;
    } else if (hours > 0) {
        return `${hours} hour${hours > 1 ? 's' : ''}, ${minutes % 60} minute${minutes % 60 !== 1 ? 's' : ''}`;
    } else if (minutes > 0) {
        return `${minutes} minute${minutes > 1 ? 's' : ''}, ${seconds % 60} second${seconds % 60 !== 1 ? 's' : ''}`;
    } else {
        return `${seconds} second${seconds !== 1 ? 's' : ''}`;
    }
}

/**
 * Check if a payment has expired
 * @param {Date|string} createdTime - When the payment was created
 * @param {number} expiryMinutes - Expiry time in minutes (default: 30)
 * @returns {boolean} - Whether the payment has expired
 */
function isPaymentExpired(createdTime, expiryMinutes = 30) {
    const created = new Date(createdTime);
    const now = new Date();
    const expiryTime = new Date(created.getTime() + (expiryMinutes * 60 * 1000));

    return now > expiryTime;
}

/**
 * Get time remaining until expiry
 * @param {Date|string} createdTime - When the payment was created
 * @param {number} expiryMinutes - Expiry time in minutes (default: 30)
 * @returns {object|null} - Time remaining or null if expired
 */
function getTimeRemaining(createdTime, expiryMinutes = 30) {
    const created = new Date(createdTime);
    const now = new Date();
    const expiryTime = new Date(created.getTime() + (expiryMinutes * 60 * 1000));

    if (now > expiryTime) {
        return null; // Expired
    }

    const remaining = expiryTime.getTime() - now.getTime();

    return {
        milliseconds: remaining,
        seconds: Math.floor(remaining / 1000),
        minutes: Math.floor(remaining / (1000 * 60)),
        formatted: formatDuration(remaining)
    };
}

/**
 * Convert timestamp to ISO string
 * @param {number|Date|string} timestamp - Timestamp to convert
 * @returns {string} - ISO formatted date string
 */
function timestampToISO(timestamp) {
    if (typeof timestamp === 'number') {
        // Handle both seconds and milliseconds timestamps
        const date = timestamp > 10000000000 ? new Date(timestamp) : new Date(timestamp * 1000);
        return date.toISOString();
    }

    return new Date(timestamp).toISOString();
}

/**
 * Get current timestamp in various formats
 * @returns {object} - Current timestamp in different formats
 */
function getCurrentTimestamp() {
    const now = new Date();

    return {
        iso: now.toISOString(),
        unix: Math.floor(now.getTime() / 1000),
        milliseconds: now.getTime(),
        formatted: now.toLocaleString(),
        date: now.toDateString(),
        time: now.toTimeString()
    };
}

module.exports = {
    calculateTimeDifference,
    formatDuration,
    isPaymentExpired,
    getTimeRemaining,
    timestampToISO,
    getCurrentTimestamp
};