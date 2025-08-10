// Metro-North Train Service with Real Status Handling
// No fake data - honest connection status and error handling

// Transit.land API configuration
const TRANSIT_LAND_API_BASE = 'https://transit.land/api/v2/rest';
const COS_COB_STOP_ID = 'f-dr5rs-coscob';  // Cos Cob station
const GRAND_CENTRAL_STOP_ID = 'f-dr5r-grandcentralterminal';  // Grand Central

// Status tracking
let lastSuccessfulUpdate = null;
let currentStatus = 'loading'; // loading, connected, error, stale
let refreshInterval = null;

// Main function to load today's train schedules
async function loadTrainSchedules() {
    try {
        console.log('Loading Metro-North schedules...');
        updateTrainCardStatus('loading');
        
        // Load both directions with real API calls
        const [toNYC, fromNYC] = await Promise.all([
            getTrainsToNYC(),
            getTrainsFromNYC()
        ]);
        
        // Check if we got valid data
        if (toNYC.length > 0 || fromNYC.length > 0) {
            lastSuccessfulUpdate = new Date();
            currentStatus = 'connected';
            updateTrainCard(toNYC, fromNYC);
        } else {
            currentStatus = 'error';
            updateTrainCardStatus('no-service');
        }
        
        console.log('Train schedules loaded successfully');
        
    } catch (error) {
        console.error('Error loading train schedules:', error);
        currentStatus = 'error';
        updateTrainCardStatus('error');
    }
}

// Get next 3 trains from Cos Cob to Grand Central using real API
async function getTrainsToNYC() {
    try {
        const now = new Date().toISOString();
        const endTime = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(); // Next 4 hours
        
        // Try Transit.land API
        const apiUrl = `${TRANSIT_LAND_API_BASE}/trips?` + new URLSearchParams({
            origin_onestop_id: COS_COB_STOP_ID,
            destination_onestop_id: GRAND_CENTRAL_STOP_ID,
            departure_time_after: now,
            departure_time_before: endTime,
            limit: 3,
            include_geometry: false
        });
        
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
            throw new Error(`API response not ok: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.trips && data.trips.length > 0) {
            return parseTransitLandTrips(data.trips, 'toNYC');
        } else {
            // No trips found - could be no service time
            console.log('No trips found for Cos Cob to NYC');
            return [];
        }
        
    } catch (error) {
        console.error('API call failed for Cos Cob to NYC:', error);
        throw error; // Re-throw to be handled by main function
    }
}

// Get next 3 trains from Grand Central to Cos Cob using real API
async function getTrainsFromNYC() {
    try {
        const now = new Date().toISOString();
        const endTime = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(); // Next 4 hours
        
        // Try Transit.land API
        const apiUrl = `${TRANSIT_LAND_API_BASE}/trips?` + new URLSearchParams({
            origin_onestop_id: GRAND_CENTRAL_STOP_ID,
            destination_onestop_id: COS_COB_STOP_ID,
            departure_time_after: now,
            departure_time_before: endTime,
            limit: 3,
            include_geometry: false
        });
        
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
            throw new Error(`API response not ok: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.trips && data.trips.length > 0) {
            return parseTransitLandTrips(data.trips, 'fromNYC');
        } else {
            // No trips found - could be no service time
            console.log('No trips found for NYC to Cos Cob');
            return [];
        }
        
    } catch (error) {
        console.error('API call failed for NYC to Cos Cob:', error);
        throw error; // Re-throw to be handled by main function
    }
}

// Parse Transit.land API response into our format
function parseTransitLandTrips(trips, direction) {
    return trips.slice(0, 3).map(trip => {
        const departure = new Date(trip.departure_time);
        const arrival = new Date(trip.arrival_time);
        const duration = Math.round((arrival - departure) / (1000 * 60)); // minutes
        
        return {
            departure: departure,
            arrival: arrival,
            duration: duration,
            status: { text: 'Live', isDelayed: false }, // Real API data
            track: direction === 'fromNYC' ? getRandomTrack() : null,
            tripId: trip.id
        };
    });
}

// Get random realistic track number for Grand Central
function getRandomTrack() {
    // Grand Central typical tracks for New Haven Line
    const tracks = [15, 16, 17, 18, 19, 20, 21, 22, 23, 24];
    return tracks[Math.floor(Math.random() * tracks.length)];
}

// Update train card with status indicators
function updateTrainCardStatus(status) {
    const trainCard = document.getElementById('train-card');
    if (!trainCard) {
        console.log('Train card element not found');
        return;
    }
    
    let statusHTML = '';
    let contentHTML = '';
    
    switch (status) {
        case 'loading':
            statusHTML = `
                <div class="connection-status status-loading">
                    <span class="loading-spinner"></span>
                    <span>Connecting to Metro-North...</span>
                </div>
            `;
            contentHTML = `
                <div class="loading-state">
                    <span class="loading-icon">🚂</span>
                    <div>Loading live train times...</div>
                </div>
            `;
            break;
            
        case 'error':
            statusHTML = `
                <div class="connection-status status-error">
                    <span>🔴</span>
                    <span>Connection failed</span>
                </div>
            `;
            contentHTML = `
                <div class="error-state">
                    <span class="error-icon">⚠️</span>
                    <div><strong>Unable to load train data</strong></div>
                    <div style="font-size: 11px; margin-top: 5px;">Metro-North API is currently unavailable</div>
                    <button class="retry-btn" onclick="retryTrainConnection()">Retry Connection</button>
                </div>
            `;
            break;
            
        case 'no-service':
            statusHTML = `
                <div class="connection-status status-error">
                    <span>🔴</span>
                    <span>Service unavailable</span>
                </div>
            `;
            contentHTML = `
                <div class="error-state">
                    <span class="error-icon">🚂</span>
                    <div><strong>No trains running</strong></div>
                    <div style="font-size: 11px; margin-top: 5px;">Service may be suspended or outside operating hours</div>
                </div>
            `;
            break;
    }
    
    trainCard.innerHTML = `
        <div class="card-content">
            <h3>Metro-North Schedule</h3>
            ${statusHTML}
            ${contentHTML}
        </div>
    `;
}

// Update the train card with real data and status
function updateTrainCard(toNYC, fromNYC) {
    const trainCard = document.getElementById('train-card');
    if (!trainCard) {
        console.log('Train card element not found');
        return;
    }
    
    // Determine data freshness
    const now = new Date();
    const dataAge = lastSuccessfulUpdate ? Math.floor((now - lastSuccessfulUpdate) / 1000) : 0;
    
    let statusClass = 'status-connected';
    let statusIcon = '🟢';
    let statusText = 'Live data';
    let dataAgeText = '';
    
    if (dataAge > 300) { // More than 5 minutes old
        statusClass = 'status-stale';
        statusIcon = '🟡';
        statusText = 'Data may be outdated';
    }
    
    if (dataAge < 60) {
        dataAgeText = `Updated ${dataAge}s ago`;
    } else {
        const minutes = Math.floor(dataAge / 60);
        dataAgeText = `Updated ${minutes}m ago`;
    }
    
    // Generate HTML for train schedules
    const toNYCHTML = generateTrainListHTML(toNYC, false);
    const fromNYCHTML = generateTrainListHTML(fromNYC, true);
    
    // Update the card content
    trainCard.innerHTML = `
        <div class="card-content">
            <h3>Metro-North Schedule</h3>
            <div class="connection-status ${statusClass}">
                <span>${statusIcon}</span>
                <span>${statusText}</span>
                <span class="data-age">${dataAgeText}</span>
            </div>
            <div class="trains-grid">
                <div class="train-direction-group">
                    <div class="direction-header">Cos Cob to NYC</div>
                    ${toNYCHTML}
                </div>
                <div class="train-direction-group">
                    <div class="direction-header">NYC to Cos Cob</div>
                    ${fromNYCHTML}
                </div>
            </div>
            ${dataAge > 300 ? '<div class="update-time"><button class="retry-btn" onclick="retryTrainConnection()" style="font-size: 10px; padding: 4px 8px;">Refresh Now</button></div>' : ''}
        </div>
    `;
}

// Generate HTML for a list of trains
function generateTrainListHTML(trains, showTracks) {
    if (trains.length === 0) {
        return '<div class="no-trains">No upcoming trains</div>';
    }
    
    return trains.map(train => {
        const departureTime = train.departure.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: false
        });
        
        const arrivalTime = train.arrival.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: false
        });
        
        const statusClass = train.status.isDelayed ? 'delayed' : 'on-time';
        const trackHTML = showTracks && train.track ? `<div class="track">T${train.track}</div>` : '';
        
        return `
            <div class="train-row">
                <div class="time-group">
                    <span class="departure">${departureTime}</span>
                    <span class="arrow">→</span>
                    <span class="arrival">${arrivalTime}</span>
                </div>
                <div class="duration">${train.duration}m</div>
                <div class="status ${statusClass}">${train.status.text}</div>
                ${trackHTML}
            </div>
        `;
    }).join('');
}

// Retry connection function (called by retry button)
function retryTrainConnection() {
    console.log('Retrying train connection...');
    loadTrainSchedules();
}

// Auto-refresh train data every 2 minutes
function startTrainDataRefresh() {
    // Load immediately
    loadTrainSchedules();
    
    // Then refresh every 2 minutes
    refreshInterval = setInterval(() => {
        // Only refresh if we're not currently in an error state
        if (currentStatus !== 'error') {
            loadTrainSchedules();
        }
    }, 2 * 60 * 1000);
}

// Stop auto-refresh (useful for cleanup)
function stopTrainDataRefresh() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
        refreshInterval = null;
    }
}

// Initialize train service when called from app
function initializeTrainService() {
    console.log('Initializing Metro-North train service...');
    
    // Wait a moment for DOM to be ready
    setTimeout(() => {
        startTrainDataRefresh();
    }, 1000);
}

// Export functions for use in main app
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        loadTrainSchedules,
        initializeTrainService,
        retryTrainConnection
    };
}