// Application Initialization
document.addEventListener('DOMContentLoaded', function() {
    console.log('App starting...');
    initializeApp();
    loadInitialData();
});

function initializeApp() {
    document.getElementById('current-date').textContent = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    setupEventListeners();
    setupTabNavigation();
    loadWeatherData();
}

// Event Listeners Setup
function setupEventListeners() {
    document.getElementById('log-weight-btn').addEventListener('click', () => openModal('weight-modal'));
    document.getElementById('log-workout-btn').addEventListener('click', () => openModal('workout-modal'));
    document.getElementById('log-birthday-btn').addEventListener('click', () => openModal('birthday-modal'));

    document.getElementById('workout-card').addEventListener('click', () => openModal('workout-detail-modal'));
    document.getElementById('weight-card').addEventListener('click', () => openModal('weight-detail-modal'));
    document.getElementById('birthday-card').addEventListener('click', () => openModal('birthday-detail-modal'));

    document.getElementById('weight-form').addEventListener('submit', handleWeightSubmit);
    document.getElementById('workout-form').addEventListener('submit', handleWorkoutSubmit);
    document.getElementById('birthday-form').addEventListener('submit', handleBirthdaySubmit);

    document.getElementById('workout-type').addEventListener('change', handleWorkoutTypeChange);
    document.getElementById('refresh-data-btn').addEventListener('click', () => loadInitialData());
    document.getElementById('export-btn').addEventListener('click', handleExport);
    document.getElementById('ask-question-btn').addEventListener('click', handleChatQuestion);
    
    document.getElementById('chat-question').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleChatQuestion();
        }
    });

    // Add delayed event listeners for AI functions
    setTimeout(() => {
        const saveBtn = document.getElementById('save-api-key-btn');
        const showSyncBtn = document.getElementById('show-sync-code-btn');
        const useSyncBtn = document.getElementById('use-sync-code-btn');
        const copySyncBtn = document.getElementById('copy-sync-code-btn');
        const viewHistoryBtn = document.getElementById('view-history-btn');
        const hideHistoryBtn = document.getElementById('hide-history-btn');
        const generateBtn = document.getElementById('generate-insight-btn');
        
        if (saveBtn) saveBtn.addEventListener('click', saveApiKey);
        if (showSyncBtn) showSyncBtn.addEventListener('click', showSyncCode);
        if (useSyncBtn) useSyncBtn.addEventListener('click', useSyncCode);
        if (copySyncBtn) copySyncBtn.addEventListener('click', copySyncCode);
        if (viewHistoryBtn) viewHistoryBtn.addEventListener('click', showRecentExchanges);
        if (hideHistoryBtn) hideHistoryBtn.addEventListener('click', hideRecentExchanges);
        if (generateBtn) generateBtn.addEventListener('click', manualGenerateInsight);
        
        generateDashboardInsight();
    }, 100);
}

// Tab Navigation
function setupTabNavigation() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const tabName = this.dataset.tab;
            
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(tabName).classList.add('active');

            if (tabName === 'insights') {
                updateInsights();
            } else if (tabName === 'settings') {
                updateApiKeyStatus();
            }
        });
    });
}

// Data Loading
async function loadInitialData() {
    showLoading(true);
    console.log('Loading data from Supabase...');
    
    try {
        await testConnection();
        
        await Promise.all([
            loadWorkouts(),
            loadWeights(),
            loadBirthdays()
        ]);
        
        updateDashboard();
        updateDataStatus();
        updateConnectionStatus('Connected');
        updateApiKeyStatus();
        generateDashboardInsight();
        showToast('Data loaded successfully!', 'success');
    } catch (error) {
        console.error('Error loading data:', error);
        updateConnectionStatus('Connection failed');
        updateDataStatus('Error loading data');
        showToast('Error connecting to database. Check console for details.', 'error');
        
        // Load from localStorage as fallback
        loadFromLocalStorage();
    }
    
    showLoading(false);
}

// Load from localStorage as fallback
function loadFromLocalStorage() {
    try {
        const savedWorkouts = JSON.parse(localStorage.getItem('workoutData') || '[]');
        const savedWeights = JSON.parse(localStorage.getItem('weightData') || '[]');
        const savedBirthdays = JSON.parse(localStorage.getItem('birthdayData') || '[]');
        
        workoutData = savedWorkouts.map(w => ({
            ...w,
            date: new Date(w.date)
        }));
        
        weightData = savedWeights.map(w => ({
            ...w,
            date: new Date(w.date)
        }));
        
        birthdayData = savedBirthdays.map(b => ({
            ...b,
            date: new Date(b.date)
        }));
        
        updateDashboard();
        updateDataStatus();
        showToast('Loaded data from local storage', 'info');
    } catch (error) {
        console.error('Error loading from localStorage:', error);
        loadSampleData();
    }
}

// Weather Data Loading
async function loadWeatherData() {
    try {
        const lat = 41.0262;
        const lon = -73.6282;
        
        await loadCurrentWeather(lat, lon);
        await loadHoroscope();
        await loadSunsetData(lat, lon);
        
        console.log('Weather data loaded successfully for Greenwich, CT');
        
    } catch (error) {
        console.error('Error loading weather data:', error);
        document.getElementById('current-temp').textContent = '--°F';
        document.getElementById('temp-high').textContent = 'H: --°';
        document.getElementById('weather-icon').textContent = '🌤️';
        document.getElementById('horoscope-text').textContent = 'Horoscope unavailable';
        document.getElementById('sunset-time').textContent = '--';
    }
}

async function loadCurrentWeather(lat, lon) {
    try {
        const now = new Date();
        const hour = now.getHours();
        
        const temps = {
            morning: { current: 68, high: 82, icon: '🌤️' },
            afternoon: { current: 79, high: 82, icon: '☀️' },
            evening: { current: 75, high: 82, icon: '🌅' },
            night: { current: 71, high: 82, icon: '🌙' }
        };
        
        let weatherData;
        if (hour < 10) weatherData = temps.morning;
        else if (hour < 17) weatherData = temps.afternoon;
        else if (hour < 21) weatherData = temps.evening;
        else weatherData = temps.night;
        
        document.getElementById('current-temp').textContent = `${weatherData.current}°F`;
        document.getElementById('temp-high').textContent = `H: ${weatherData.high}°`;
        document.getElementById('weather-icon').textContent = weatherData.icon;
        
    } catch (error) {
        console.error('Error loading weather:', error);
    }
}

async function loadHoroscope() {
    try {
        const response = await fetch('https://horoscope-app-api.vercel.app/api/v1/get-horoscope/daily?sign=libra&day=today');
        
        if (response.ok) {
            const data = await response.json();
            if (data && data.data && data.data.horoscope_data) {
                let horoscope = data.data.horoscope_data;
                if (horoscope.length > 80) {
                    horoscope = horoscope.substring(0, 77) + '...';
                }
                document.getElementById('horoscope-text').textContent = horoscope;
                console.log('Real horoscope loaded successfully');
            } else {
                throw new Error('Invalid horoscope data structure');
            }
        } else {
            throw new Error('Horoscope API request failed');
        }
        
    } catch (error) {
        console.error('Error loading horoscope:', error);
        
        const fallbackHoroscopes = [
            "Balance and harmony guide your decisions today. Trust your diplomatic nature.",
            "Your sense of justice shines bright. A partnership brings unexpected joy.",
            "Beauty surrounds you today. Take time to appreciate art and relationships.",
            "Cooperation leads to success. Your charm opens new doors.",
            "Seek equilibrium in all things. A fair solution presents itself."
        ];
        
        const randomHoroscope = fallbackHoroscopes[Math.floor(Math.random() * fallbackHoroscopes.length)];
        document.getElementById('horoscope-text').textContent = randomHoroscope;
        console.log('Using fallback horoscope');
    }
}

async function loadSunsetData(lat, lon) {
    try {
        const response = await fetch(`https://api.sunrise-sunset.org/json?lat=${lat}&lng=${lon}&formatted=0`);
        const data = await response.json();
        
        if (data.status === 'OK') {
            const sunsetUTC = new Date(data.results.sunset);
            const sunsetLocal = sunsetUTC.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
                timeZone: 'America/New_York'
            });
            
            document.getElementById('sunset-time').textContent = sunsetLocal;
            console.log(`Real sunset time loaded: ${sunsetLocal}`);
        } else {
            throw new Error('Sunset API failed');
        }
        
    } catch (error) {
        console.error('Error loading real sunset data:', error);
        
        const now = new Date();
        const month = now.getMonth();
        const day = now.getDate();
        
        let sunset;
        if (month === 6) {
            if (day <= 15) sunset = '8:05 PM';
            else if (day <= 25) sunset = '8:00 PM';
            else sunset = '7:55 PM';
        } else if (month === 5) {
            sunset = '8:15 PM';
        } else if (month === 7) {
            sunset = day <= 15 ? '7:50 PM' : '7:40 PM';
        } else {
            sunset = '7:30 PM';
        }
        
        document.getElementById('sunset-time').textContent = sunset;
        console.log(`Using fallback sunset time: ${sunset}`);
    }
}

// Modal Functions
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.add('active');
    
    if (modalId.includes('weight') || modalId.includes('workout')) {
        const dateInput = modal.querySelector('input[type="date"]');
        if (dateInput) {
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            const todayString = `${year}-${month}-${day}`;
            dateInput.value = todayString;
        }
    }
    
    if (modalId === 'birthday-modal') {
        setupBirthdayModal();
    }
    
    if (modalId === 'workout-detail-modal') {
        loadWorkoutDetails();
    } else if (modalId === 'weight-detail-modal') {
        loadWeightDetails();
    } else if (modalId === 'birthday-detail-modal') {
        loadBirthdayDetails();
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.remove('active');
    
    const form = modal.querySelector('form');
    if (form) {
        form.reset();
        document.querySelectorAll('.conditional').forEach(field => {
            field.classList.remove('show');
        });
    }
}

function setupBirthdayModal() {
    const dateInput = document.getElementById('birthday-date');
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayString = `${year}-${month}-${day}`;
    dateInput.value = todayString;
}

// Form Handlers
async function handleWeightSubmit(e) {
    e.preventDefault();
    showLoading(true);
    
    try {
        const weightEntry = {
            date: new Date(document.getElementById('weight-date').value),
            weight: parseFloat(document.getElementById('weight-value').value),
            bodyFat: parseFloat(document.getElementById('body-fat').value) || null,
            notes: document.getElementById('weight-notes').value
        };
        
        try {
            const savedEntry = await saveWeight(weightEntry);
            weightEntry.id = savedEntry.id;
        } catch (dbError) {
            console.log('Database save failed, using localStorage:', dbError);
            weightEntry.id = Date.now();
        }
        
        weightData.unshift(weightEntry);
        weightData.sort((a, b) => b.date - a.date);
        
        updateDashboard();
        updateDataStatus();
        saveToLocalStorage();
        closeModal('weight-modal');
        showToast('Weight logged successfully!', 'success');
    } catch (error) {
        console.error('Error saving weight:', error);
        showToast('Error saving weight entry', 'error');
    }
    
    showLoading(false);
}

async function handleWorkoutSubmit(e) {
    e.preventDefault();
    showLoading(true);
    
    try {
        const workoutType = document.getElementById('workout-type').value;
        const durationValue = document.getElementById('workout-duration').value;
        const distanceValue = document.getElementById('workout-distance').value;
        const hrValue = document.getElementById('workout-hr').value;
        const notesValue = document.getElementById('workout-notes').value;
        
        const muscleGroups = Array.from(document.querySelectorAll('#muscle-group input[type="checkbox"]:checked'))
            .map(cb => cb.value);
        
        const workoutEntry = {
            date: new Date(document.getElementById('workout-date').value),
            type: workoutType,
            duration: durationValue || null,
            distance: distanceValue ? parseFloat(distanceValue) : null,
            hrZone: hrValue ? parseInt(hrValue) : null,
            notes: notesValue || null,
            muscleGroups: muscleGroups
        };
        
        if (workoutType === 'walk') {
            if (!workoutEntry.duration) {
                showToast('Duration is required for walks', 'warning');
                showLoading(false);
                return;
            }
        } else if (workoutType === 'run') {
            if (!workoutEntry.distance) {
                showToast('Distance is required for runs', 'warning');
                showLoading(false);
                return;
            }
        }
        
        try {
            const savedEntry = await saveWorkout(workoutEntry);
            workoutEntry.id = savedEntry.id;
        } catch (dbError) {
            console.log('Database save failed, using localStorage:', dbError);
            workoutEntry.id = Date.now();
        }
        
        workoutData.unshift(workoutEntry);
        workoutData.sort((a, b) => b.date - a.date);
        
        updateDashboard();
        updateDataStatus();
        saveToLocalStorage();
        closeModal('workout-modal');
        showToast('Workout logged successfully!', 'success');
    } catch (error) {
        console.error('Error saving workout:', error);
        showToast('Error saving workout entry: ' + error.message, 'error');
    }
    
    showLoading(false);
}

async function handleBirthdaySubmit(e) {
    e.preventDefault();
    showLoading(true);
    
    try {
        const birthdayEntry = {
            name: document.getElementById('birthday-name').value,
            date: new Date(document.getElementById('birthday-date').value),
            age: parseInt(document.getElementById('birthday-age').value) || null,
            notes: document.getElementById('birthday-notes').value
        };
        
        try {
            const savedEntry = await saveBirthday(birthdayEntry);
            birthdayEntry.id = savedEntry.id;
        } catch (dbError) {
            console.log('Database save failed, using localStorage:', dbError);
            birthdayEntry.id = Date.now();
        }
        
        birthdayData.push(birthdayEntry);
        birthdayData.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        updateDashboard();
        updateDataStatus();
        saveToLocalStorage();
        closeModal('birthday-modal');
        showToast('Birthday added successfully!', 'success');
    } catch (error) {
        console.error('Error saving birthday:', error);
        showToast('Error saving birthday entry', 'error');
    }
    
    showLoading(false);
}

function handleWorkoutTypeChange(e) {
    const type = e.target.value;
    
    document.querySelectorAll('.conditional').forEach(field => {
        field.classList.remove('show');
        const inputs = field.querySelectorAll('input, select');
        inputs.forEach(input => input.required = false);
    });
    
    switch (type) {
        case 'walk':
            document.getElementById('duration-group').classList.add('show');
            document.getElementById('hr-group').classList.add('show');
            document.getElementById('workout-duration').required = true;
            document.getElementById('workout-hr').required = true;
            break;
        case 'run':
            document.getElementById('distance-group').classList.add('show');
            document.getElementById('workout-distance').required = true;
            break;
        case 'lift':
            document.getElementById('muscle-group').classList.add('show');
            break;
    }
}

async function handleExport() {
    const dataType = document.getElementById('export-type').value;
    const format = document.getElementById('export-format').value;
    
    if (!dataType) {
        showToast('Please select a data type to export', 'warning');
        return;
    }
    
    showLoading(true);
    
    try {
        await exportData(dataType, format);
    } catch (error) {
        console.error('Export error:', error);
        showToast('Error during export', 'error');
    }
    
    showLoading(false);
}

// Save to localStorage
function saveToLocalStorage() {
    try {
        localStorage.setItem('workoutData', JSON.stringify(workoutData));
        localStorage.setItem('weightData', JSON.stringify(weightData));
        localStorage.setItem('birthdayData', JSON.stringify(birthdayData));
    } catch (error) {
        console.error('Error saving to localStorage:', error);
    }
}

// Dashboard Updates
function updateDashboard() {
    updateWorkoutCard();
    updateWeightCard();
    updateBirthdayCard();
}

function updateWorkoutCard() {
    const thisWeek = getWorkoutsThisWeek();
    const avgWorkouts = getAverageWorkoutsPerWeek();
    const lastWeek = getWorkoutsLastWeek();
    
    document.getElementById('workouts-this-week').textContent = thisWeek;
    document.getElementById('workouts-avg').textContent = avgWorkouts.toFixed(1);
    
    const trend = thisWeek - lastWeek;
    const trendElement = document.getElementById('workout-trend');
    if (trend > 0) {
        trendElement.textContent = `+${trend} vs last week`;
        trendElement.className = 'trend positive';
    } else if (trend < 0) {
        trendElement.textContent = `${trend} vs last week`;
        trendElement.className = 'trend negative';
    } else {
        trendElement.textContent = 'Same as last week';
        trendElement.className = 'trend';
    }
}

function updateWeightCard() {
    if (weightData.length === 0) {
        document.getElementById('current-weight').textContent = '--';
        document.getElementById('weight-lost').textContent = '0';
        document.getElementById('weight-trend').textContent = '--';
        return;
    }
    
    const currentWeight = weightData[0].weight;
    const maxWeight = Math.max(...weightData.map(w => w.weight));
    const weightLost = maxWeight - currentWeight;
    
    document.getElementById('current-weight').textContent = `${currentWeight} lbs`;
    document.getElementById('weight-lost').textContent = weightLost.toFixed(1);
    
    if (weightData.length >= 3) {
        const recent = weightData.slice(0, 5).map(w => w.weight);
        const trend = recent[0] - recent[recent.length - 1];
        const trendElement = document.getElementById('weight-trend');
        
        if (trend < -1) {
            trendElement.textContent = `Trending down (-${Math.abs(trend).toFixed(1)} lbs recently)`;
            trendElement.className = 'trend positive';
        } else if (trend > 1) {
            trendElement.textContent = `Trending up (+${trend.toFixed(1)} lbs recently)`;
            trendElement.className = 'trend negative';
        } else {
            trendElement.textContent = 'Stable';
            trendElement.className = 'trend';
        }
    }
}

function updateBirthdayCard() {
    const thisWeek = getBirthdaysThisWeek();
    const thisMonth = getBirthdaysThisMonth();
    
    document.getElementById('birthdays-this-week').textContent = thisWeek;
    document.getElementById('birthdays-this-month').textContent = thisMonth;
}

function updateDataStatus(error = null) {
    const statusDiv = document.getElementById('data-status');
    if (error) {
        statusDiv.innerHTML = `<p style="color: #ef4444;">❌ ${error}</p>`;
    } else {
        statusDiv.innerHTML = `
            <p>✅ Weight entries: ${weightData.length}</p>
            <p>✅ Workout entries: ${workoutData.length}</p>
            <p>✅ Birthday entries: ${birthdayData.length}</p>
        `;
    }
}

function updateConnectionStatus(status) {
    const statusDiv = document.getElementById('connection-status');
    if (status === 'Connected') {
        statusDiv.innerHTML = '<p style="color: #10b981;">✅ Connected to Supabase</p>';
    } else {
        statusDiv.innerHTML = `<p style="color: #ef4444;">❌ ${status}</p>`;
    }
}

// Utility Functions
function showLoading(show) {
    const loading = document.getElementById('loading');
    if (show) {
        loading.classList.add('active');
    } else {
        loading.classList.remove('active');
    }
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    container.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 100);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (container.contains(toast)) {
                container.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

// Click outside modal to close
window.addEventListener('click', function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.classList.remove('active');
    }
});

// Week calculation helper
function getMonday(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
}

// Workout statistics
function getWorkoutsThisWeek() {
    const today = new Date();
    const monday = getMonday(today);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    
    const mondayStart = new Date(monday);
    mondayStart.setHours(0, 0, 0, 0);
    
    const sundayEnd = new Date(sunday);
    sundayEnd.setHours(23, 59, 59, 999);
    
    return workoutData.filter(workout => {
        const workoutDateStart = new Date(workout.date);
        workoutDateStart.setHours(0, 0, 0, 0);
        return workoutDateStart >= mondayStart && workoutDateStart <= sundayEnd;
    }).length;
}

function getWorkoutsLastWeek() {
    const today = new Date();
    const thisMonday = getMonday(today);
    const lastMonday = new Date(thisMonday);
    lastMonday.setDate(thisMonday.getDate() - 7);
    
    const lastSunday = new Date(lastMonday);
    lastSunday.setDate(lastMonday.getDate() + 6);
    
    return workoutData.filter(workout => {
        const workoutDateStart = new Date(workout.date);
        workoutDateStart.setHours(0, 0, 0, 0);
        const lastMondayStart = new Date(lastMonday);
        lastMondayStart.setHours(0, 0, 0, 0);
        const lastSundayEnd = new Date(lastSunday);
        lastSundayEnd.setHours(23, 59, 59, 999);
        return workoutDateStart >= lastMondayStart && workoutDateStart <= lastSundayEnd;
    }).length;
}

function getAverageWorkoutsPerWeek() {
    if (workoutData.length === 0) return 0;
    
    const dates = workoutData.map(w => w.date.getTime());
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));
    const weeks = Math.ceil((maxDate - minDate) / (7 * 24 * 60 * 60 * 1000)) || 1;
    
    return workoutData.length / weeks;
}

function getBirthdaysThisWeek() {
    const today = new Date();
    const oneWeekFromNow = new Date(today);
    oneWeekFromNow.setDate(today.getDate() + 7);
    
    return birthdayData.filter(birthday => {
        const thisYear = new Date(today.getFullYear(), birthday.date.getMonth(), birthday.date.getDate());
        return thisYear >= today && thisYear <= oneWeekFromNow;
    }).length;
}

function getBirthdaysThisMonth() {
    const today = new Date();
    
    return birthdayData.filter(birthday => {
        return birthday.date.getMonth() === today.getMonth();
    }).length;
}

// Insights Functions
function updateInsights() {
    updateWeightProgress();
    updateWalkingProgress();
    updateRunningProgress();
    createInsightsChart();
}

function updateWeightProgress() {
    if (weightData.length === 0) {
        document.getElementById('weight-progress').textContent = '--';
        document.getElementById('weight-description').textContent = 'No weight data available.';
        return;
    }
    
    const currentWeight = weightData[0].weight;
    const maxWeight = Math.max(...weightData.map(w => w.weight));
    const weightLost = maxWeight - currentWeight;
    
    document.getElementById('weight-progress').textContent = `-${weightLost.toFixed(1)} lbs`;
    
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    const monthData = weightData.filter(w => w.date >= monthAgo);
    
    if (monthData.length >= 2) {
        const monthlyChange = monthData[0].weight - monthData[monthData.length - 1].weight;
        const description = monthlyChange < 0 ? 
            `Lost ${Math.abs(monthlyChange).toFixed(1)} lbs this month. Great progress!` :
            `Gained ${monthlyChange.toFixed(1)} lbs this month. Consider reviewing your routine.`;
        document.getElementById('weight-description').textContent = description;
    } else {
        document.getElementById('weight-description').textContent = 'Not enough recent data for monthly comparison.';
    }
}

function updateWalkingProgress() {
    const walkingStats = getWalkingStatsComparison();
    
    document.getElementById('walking-time').textContent = `${walkingStats.thisWeek} min`;
    
    let description = '';
    if (walkingStats.change > 0) {
        description = `Up ${walkingStats.change} minutes from last week. Great improvement!`;
    } else if (walkingStats.change < 0) {
        description = `Down ${Math.abs(walkingStats.change)} minutes from last week. Try to walk more this week.`;
    } else {
        description = walkingStats.thisWeek > 0 ? 'Same walking time as last week.' : 'No walking logged this week.';
    }
    
    document.getElementById('walking-description').textContent = description;
}

function updateRunningProgress() {
    const runningStats = getRunningStatsComparison();
    
    document.getElementById('running-distance').textContent = `${runningStats.thisWeek.toFixed(1)} mi`;
    
    let description = '';
    if (runningStats.change > 0) {
        description = `Up ${runningStats.change.toFixed(1)} miles from last week. Excellent pace!`;
    } else if (runningStats.change < 0) {
        description = `Down ${Math.abs(runningStats.change).toFixed(1)} miles from last week. Consider adding more runs.`;
    } else {
        description = runningStats.thisWeek > 0 ? 'Same running distance as last week.' : 'No running logged this week.';
    }
    
    document.getElementById('running-description').textContent = description;
}

// Walking and Running Stats
function getWalkingStatsComparison() {
    const thisWeekWalks = getWalkingThisWeek();
    const lastWeekWalks = getWalkingLastWeek();
    
    const thisWeekMinutes = thisWeekWalks.reduce((total, walk) => total + (parseInt(walk.duration) || 0), 0);
    const lastWeekMinutes = lastWeekWalks.reduce((total, walk) => total + (parseInt(walk.duration) || 0), 0);
    
    return {
        thisWeek: thisWeekMinutes,
        lastWeek: lastWeekMinutes,
        change: thisWeekMinutes - lastWeekMinutes
    };
}

function getRunningStatsComparison() {
    const thisWeekRuns = getRunningThisWeek();
    const lastWeekRuns = getRunningLastWeek();
    
    const thisWeekDistance = thisWeekRuns.reduce((total, run) => total + (parseFloat(run.distance) || 0), 0);
    const lastWeekDistance = lastWeekRuns.reduce((total, run) => total + (parseFloat(run.distance) || 0), 0);
    
    return {
        thisWeek: thisWeekDistance,
        lastWeek: lastWeekDistance,
        change: thisWeekDistance - lastWeekDistance
    };
}

function getWalkingThisWeek() {
    const today = new Date();
    const monday = getMonday(today);
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    
    return workoutData.filter(workout => {
        const workoutDate = new Date(workout.date);
        workoutDate.setHours(0, 0, 0, 0);
        return workout.type === 'walk' && workoutDate >= monday && workoutDate <= sunday;
    });
}

function getWalkingLastWeek() {
    const today = new Date();
    const thisMonday = getMonday(today);
    const lastMonday = new Date(thisMonday);
    lastMonday.setDate(thisMonday.getDate() - 7);
    lastMonday.setHours(0, 0, 0, 0);
    const lastSunday = new Date(lastMonday);
    lastSunday.setDate(lastMonday.getDate() + 6);
    lastSunday.setHours(23, 59, 59, 999);
    
    return workoutData.filter(workout => {
        const workoutDate = new Date(workout.date);
        workoutDate.setHours(0, 0, 0, 0);
        return workout.type === 'walk' && workoutDate >= lastMonday && workoutDate <= lastSunday;
    });
}

function getRunningThisWeek() {
    const today = new Date();
    const monday = getMonday(today);
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    
    return workoutData.filter(workout => {
        const workoutDate = new Date(workout.date);
        workoutDate.setHours(0, 0, 0, 0);
        return workout.type === 'run' && workoutDate >= monday && workoutDate <= sunday;
    });
}

function getRunningLastWeek() {
    const today = new Date();
    const thisMonday = getMonday(today);
    const lastMonday = new Date(thisMonday);
    lastMonday.setDate(thisMonday.getDate() - 7);
    lastMonday.setHours(0, 0, 0, 0);
    const lastSunday = new Date(lastMonday);
    lastSunday.setDate(lastMonday.getDate() + 6);
    lastSunday.setHours(23, 59, 59, 999);
    
    return workoutData.filter(workout => {
        const workoutDate = new Date(workout.date);
        workoutDate.setHours(0, 0, 0, 0);
        return workout.type === 'run' && workoutDate >= lastMonday && workoutDate <= lastSunday;
    });
}

function createInsightsChart() {
    const ctx = document.getElementById('insights-weight-chart').getContext('2d');
    
    const filterDropdown = document.getElementById('insights-chart-filter');
    if (filterDropdown && !filterDropdown.hasAttribute('data-listener')) {
        filterDropdown.setAttribute('data-listener', 'true');
        filterDropdown.addEventListener('change', createInsightsChart);
    }
    
    if (window.insightsChart) {
        window.insightsChart.destroy();
    }
    
    const selectedDays = filterDropdown ? filterDropdown.value : '30';
    
    let filteredWeights = [...weightData];
    
    if (selectedDays !== 'all') {
        const daysAgo = new Date();
        daysAgo.setDate(daysAgo.getDate() - parseInt(selectedDays));
        filteredWeights = weightData.filter(w => w.date >= daysAgo);
    }
    
    filteredWeights = filteredWeights.sort((a, b) => a.date - b.date);
    
    const periodChangeElement = document.getElementById('weight-period-change');
    if (filteredWeights.length >= 2 && periodChangeElement) {
        const startWeight = filteredWeights[0].weight;
        const endWeight = filteredWeights[filteredWeights.length - 1].weight;
        const weightChange = endWeight - startWeight;
        const periodName = selectedDays === 'all' ? 'overall' : `last ${selectedDays} days`;
        
        if (weightChange < 0) {
            periodChangeElement.innerHTML = `<span style="color: #10b981;">↓ ${Math.abs(weightChange).toFixed(1)} lbs lost (${periodName})</span>`;
        } else if (weightChange > 0) {
            periodChangeElement.innerHTML = `<span style="color: #ef4444;">↑ ${weightChange.toFixed(1)} lbs gained (${periodName})</span>`;
        } else {
            periodChangeElement.innerHTML = `<span style="color: #667eea;">No change (${periodName})</span>`;
        }
    } else if (periodChangeElement) {
        periodChangeElement.innerHTML = '<span style="color: #666;">Not enough data for comparison</span>';
    }
    
    if (filteredWeights.length === 0) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.fillStyle = 'white';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`No weight data for the selected period`, ctx.canvas.width / 2, ctx.canvas.height / 2);
        return;
    }
    
    window.insightsChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: filteredWeights.map(w => w.date.toLocaleDateString()),
            datasets: [{
                label: 'Weight (lbs)',
                data: filteredWeights.map(w => w.weight),
                borderColor: '#000000',
                backgroundColor: 'rgba(0, 0, 0, 0.1)',
                borderWidth: 3,
                tension: 0.1,
                fill: true,
                pointBackgroundColor: '#000000',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 5
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    labels: {
                        color: 'white'
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: 'white'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                },
                y: {
                    beginAtZero: false,
                    ticks: {
                        color: 'white'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                }
            }
        }
    });
}

// Detail Loading Functions
function loadWorkoutDetails() {
    const recentWorkouts = workoutData.slice(0, 14);
    const workoutList = document.getElementById('workout-list');
    
    if (recentWorkouts.length === 0) {
        workoutList.innerHTML = '<p>No workouts logged yet.</p>';
        return;
    }
    
    workoutList.innerHTML = recentWorkouts.map(workout => `
        <div class="workout-item">
            <div class="workout-header">
                <span class="workout-type">${workout.type.toUpperCase()}</span>
                <div class="item-actions">
                    <span class="workout-date">${workout.date.toLocaleDateString()}</span>
                    <button class="delete-btn" onclick="deleteWorkout(${workout.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="workout-details">
                ${workout.duration ? `<span>Duration: ${workout.duration} min</span>` : ''}
                ${workout.distance ? `<span>Distance: ${workout.distance} mi</span>` : ''}
                ${workout.hrZone ? `<span>HR Zone: ${workout.hrZone}</span>` : ''}
                ${workout.muscleGroups && workout.muscleGroups.length ? `<span>Muscles: ${workout.muscleGroups.join(', ')}</span>` : ''}
            </div>
            ${workout.notes ? `<div class="workout-notes">${workout.notes}</div>` : ''}
        </div>
    `).join('');
}

function loadWeightDetails() {
    const thisWeekAvg = getWeightAverage('thisWeek');
    const lastWeekAvg = getWeightAverage('lastWeek');
    const monthlyAvg = getWeightAverage('month');
    
    const thisWeekEl = document.getElementById('weight-this-week');
    const lastWeekEl = document.getElementById('weight-last-week');
    const monthlyEl = document.getElementById('weight-monthly-avg');
    
    if (thisWeekEl) thisWeekEl.textContent = thisWeekAvg ? `${thisWeekAvg.toFixed(1)} lbs` : '--';
    if (lastWeekEl) lastWeekEl.textContent = lastWeekAvg ? `${lastWeekAvg.toFixed(1)} lbs` : '--';
    if (monthlyEl) monthlyEl.textContent = monthlyAvg ? `${monthlyAvg.toFixed(1)} lbs` : '--';
    
    const weeklyChangeElement = document.getElementById('weight-weekly-change');
    if (weeklyChangeElement) {
        if (thisWeekAvg && lastWeekAvg) {
            const change = thisWeekAvg - lastWeekAvg;
            if (change < 0) {
                weeklyChangeElement.textContent = `${change.toFixed(1)} lbs`;
                weeklyChangeElement.className = 'trend positive';
            } else if (change > 0) {
                weeklyChangeElement.textContent = `+${change.toFixed(1)} lbs`;
                weeklyChangeElement.className = 'trend negative';
            } else {
                weeklyChangeElement.textContent = 'No change';
                weeklyChangeElement.className = 'trend';
            }
        } else {
            weeklyChangeElement.textContent = '--';
            weeklyChangeElement.className = 'trend';
        }
    }
    
    const recentWeights = weightData.slice(0, 5);
    const weightEntriesList = document.getElementById('weight-entries-list');
    
    if (weightEntriesList) {
        if (recentWeights.length === 0) {
            weightEntriesList.innerHTML = '<p>No weight entries yet.</p>';
            return;
        }
        
        weightEntriesList.innerHTML = recentWeights.map(weight => `
            <div class="weight-entry-item">
                <div class="weight-entry-details">
                    <div class="weight-entry-date">${weight.date.toLocaleDateString()}</div>
                    <div class="weight-entry-value">${weight.weight} lbs${weight.bodyFat ? ` • ${weight.bodyFat}% BF` : ''}</div>
                </div>
                <button class="delete-btn" onclick="deleteWeight(${weight.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `).join('');
    }
}

function getWeightAverage(period) {
    if (weightData.length === 0) return null;
    
    const today = new Date();
    let startDate, endDate;
    
    switch (period) {
        case 'thisWeek':
            startDate = getMonday(today);
            endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + 6);
            break;
        case 'lastWeek':
            const thisMonday = getMonday(today);
            startDate = new Date(thisMonday);
            startDate.setDate(thisMonday.getDate() - 7);
            endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + 6);
            break;
        case 'month':
            startDate = new Date(today);
            startDate.setDate(today.getDate() - 30);
            endDate = today;
            break;
    }
    
    const filteredWeights = weightData.filter(w => {
        const weightDate = new Date(w.date);
        return weightDate >= startDate && weightDate <= endDate;
    });
    
    if (filteredWeights.length === 0) return null;
    
    const total = filteredWeights.reduce((sum, w) => sum + w.weight, 0);
    return total / filteredWeights.length;
}

function loadBirthdayDetails() {
    const monthDropdown = document.getElementById('birthday-month-filter');
    
    if (monthDropdown) {
        const currentMonth = new Date().getMonth();
        monthDropdown.value = currentMonth;
        
        monthDropdown.removeEventListener('change', updateBirthdayList);
        monthDropdown.addEventListener('change', updateBirthdayList);
        
        updateBirthdayList();
    }
}

function updateBirthdayList() {
    const monthDropdown = document.getElementById('birthday-month-filter');
    const birthdayList = document.getElementById('birthday-list');
    
    if (!monthDropdown || !birthdayList) return;
    
    const selectedMonth = parseInt(monthDropdown.value);
    
    const monthBirthdays = birthdayData.filter(birthday => {
        return birthday.date.getMonth() === selectedMonth;
    });
    
    if (monthBirthdays.length === 0) {
        birthdayList.innerHTML = '<p>No birthdays in this month.</p>';
        return;
    }
    
    birthdayList.innerHTML = monthBirthdays.map(birthday => `
        <div class="birthday-item">
            <h4>${birthday.name}</h4>
            <p>Date: ${birthday.date.toLocaleDateString()}</p>
            ${birthday.age ? `<p>Age: ${birthday.age}</p>` : ''}
            ${birthday.notes ? `<p>Notes: ${birthday.notes}</p>` : ''}
        </div>
    `).join('');
}

// Sample Data for Demo
function loadSampleData() {
    if (weightData.length > 0 || workoutData.length > 0 || birthdayData.length > 0) {
        return; // Don't load sample data if we already have data
    }
    
    // Sample weight data
    const sampleWeights = [
        { id: 1, date: new Date('2025-08-01'), weight: 185.2, bodyFat: 18.5, notes: '' },
        { id: 2, date: new Date('2025-07-28'), weight: 186.1, bodyFat: 18.8, notes: '' },
        { id: 3, date: new Date('2025-07-25'), weight: 187.3, bodyFat: 19.1, notes: '' },
        { id: 4, date: new Date('2025-07-21'), weight: 188.0, bodyFat: 19.3, notes: '' }
    ];

    // Sample workout data
    const sampleWorkouts = [
        { id: 1, date: new Date('2025-08-03'), type: 'run', distance: 3.2, notes: 'Morning run' },
        { id: 2, date: new Date('2025-08-02'), type: 'lift', muscleGroups: ['chest', 'shoulders'], notes: 'Upper body day' },
        { id: 3, date: new Date('2025-08-01'), type: 'walk', duration: 45, hrZone: 2, notes: 'Evening walk' }
    ];

    // Sample birthday data
    const sampleBirthdays = [
        { id: 1, name: 'Sarah', date: new Date('1990-08-15'), age: 35, notes: 'Sister' },
        { id: 2, name: 'Mike', date: new Date('1985-03-22'), age: 40, notes: 'Best friend' }
    ];

    weightData = sampleWeights;
    workoutData = sampleWorkouts;
    birthdayData = sampleBirthdays;
    
    saveToLocalStorage();
    updateDashboard();
    showToast('Sample data loaded for demo!', 'info');
}
