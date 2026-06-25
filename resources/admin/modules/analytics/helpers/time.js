// Format a date object to YYYY-MM-DD format for API requests
export function formatDate(date) {
    if (!date) return '';
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
}

// Format seconds: colons, no "0:" when hour is 0; MM:SSs or H:MM:SSs; always "s" at end
export function formatDuration(seconds) {
    if (seconds == null || isNaN(parseFloat(seconds))) return '0s';
    const s = Math.floor(parseFloat(seconds));
    if (s === 0) return '0s';
    const hours = Math.floor(s / 3600);
    const minutes = Math.floor((s % 3600) / 60);
    const secs = s % 60;
    const mm = String(minutes).padStart(2, '0');
    const ss = String(secs).padStart(2, '0');
    if (hours >= 1) {
        return `${hours}:${mm}:${ss}s`;
    }
    return `${mm}:${ss}s`;
}

// Get default date range (previous 1 month / last 30 days)
export function getDefaultDateRange() {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    return {
        startDate,
        endDate
    };
}

// Format a completion-rate stat as a rounded integer percentage (e.g. 72.6 -> "73%").
// Null/empty values render as "0%".
export function formatCompletionRate(rate) {
    if (rate == null || rate === '') return '0%';
    return `${Number(rate).toFixed(0)}%`;
}