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
    loadWeatherData(); // Calls weather service
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
        
        if (saveBtn) saveBtn.addEventListener('click', saveApiKey);
        if (showSyncBtn) showSyncBtn.addEventListener('click', showSyncCode);
        if (useSyncBtn) useSyncBtn.addEventListener('click', useSyncCode);
        if (copySyncBtn) copySyncBtn.addEventListener('click', copySyncCode);
        if (viewHistoryBtn) viewHistoryBtn.addEventListener('click', showRecentExchanges);
        if (hideHistoryBtn) hideHistoryBtn.addEventListener('click', hideRecentExchanges);
        
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
                updateInsights(); // Calls insights service
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
        
        updateDashboard(); // Calls dashboard service
        updateDataStatus(); // Calls dashboard service
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
        
        updateDashboard(); // Calls dashboard service
        updateDataStatus(); // Calls dashboard service
        showToast('Loaded data from local storage', 'info');
    } catch (error) {
        console.error('Error loading from localStorage:', error);
        loadSampleData(); // Calls dashboard service
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
        loadWorkoutDetails(); // Calls dashboard service
    } else if (modalId === 'weight-detail-modal') {
        loadWeightDetails(); // Calls dashboard service
    } else if (modalId === 'birthday-detail-modal') {
        loadBirthdayDetails(); // Calls dashboard service
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
        
        updateDashboard(); // Calls dashboard service
        updateDataStatus(); // Calls dashboard service
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
        
        updateDashboard(); // Calls dashboard service
        updateDataStatus(); // Calls dashboard service
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
        
        updateDashboard(); // Calls dashboard service
        updateDataStatus(); // Calls dashboard service
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
        await exportDataWithFallback(dataType, format); // Calls export service
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