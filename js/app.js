// Global Variables
let workoutData = [];
let weightData = [];
let birthdayData = [];
let openaiApiKey = localStorage.getItem('openai_api_key') || null;
let conversationHistory = [];

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
    // Quick action buttons
    document.getElementById('log-weight-btn').addEventListener('click', () => openModal('weight-modal'));
    document.getElementById('log-workout-btn').addEventListener('click', () => openModal('workout-modal'));
    document.getElementById('log-birthday-btn').addEventListener('click', () => openModal('birthday-modal'));

    // Card clicks
    document.getElementById('workout-card').addEventListener('click', () => openModal('workout-detail-modal'));
    document.getElementById('weight-card').addEventListener('click', () => openModal('weight-detail-modal'));
    document.getElementById('birthday-card').addEventListener('click', () => openModal('birthday-detail-modal'));

    // Form submissions
    document.getElementById('weight-form').addEventListener('submit', handleWeightSubmit);
    document.getElementById('workout-form').addEventListener('submit', handleWorkoutSubmit);
    document.getElementById('birthday-form').addEventListener('submit', handleBirthdaySubmit);

    // Other controls
    document.getElementById('workout-type').addEventListener('change', handleWorkoutTypeChange);
    document.getElementById('export-btn').addEventListener('click', handleExport);
    
    // AI controls (with delay to ensure elements exist)
    setTimeout(() => {
        const saveBtn = document.getElementById('save-api-key-btn');
        const askBtn = document.getElementById('ask-question-btn');
        const generateBtn = document.getElementById('generate-insight-btn');
        
        if (saveBtn) saveBtn.addEventListener('click', saveApiKey);
        if (askBtn) askBtn.addEventListener('click', handleChatQuestion);
        if (generateBtn) generateBtn.addEventListener('click', manualGenerateInsight);
        
        updateApiKeyStatus();
        generateDashboardInsight();
    }, 100);
}

// Tab Navigation
function setupTabNavigation() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const tabName = this.dataset.tab;
            
            // Update nav buttons
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            // Update tab content
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(tabName).classList.add('active');

            // Tab-specific actions
            if (tabName === 'insights') {
                updateInsights();
            }
        });
    });
}

// Data Loading
async function loadInitialData() {
    showLoading(true);
    console.log('Loading data...');
    
    try {
        // Try Supabase first
        await testConnection();
        await Promise.all([
            loadWorkouts(),
            loadWeights(),
            loadBirthdays()
        ]);
        
        updateDashboard();
        updateDataStatus();
        showToast('Data loaded successfully!', 'success');
    } catch (error) {
        console.error('Supabase failed, using localStorage:', error);
        loadFromLocalStorage();
    }
    
    showLoading(false);
}

function loadFromLocalStorage() {
    try {
        const savedWorkouts = JSON.parse(localStorage.getItem('workoutData') || '[]');
        const savedWeights = JSON.parse(localStorage.getItem('weightData') || '[]');
        const savedBirthdays = JSON.parse(localStorage.getItem('birthdayData') || '[]');
        
        workoutData = savedWorkouts.map(w => ({ ...w, date: new Date(w.date) }));
        weightData = savedWeights.map(w => ({ ...w, date: new Date(w.date) }));
        birthdayData = savedBirthdays.map(b => ({ ...b, date: new Date(b.date) }));
        
        updateDashboard();
        updateDataStatus();
        
        // Load sample data if empty
        if (workoutData.length === 0 && weightData.length === 0) {
            loadSampleData();
        }
    } catch (error) {
        console.error('localStorage failed, loading sample data:', error);
        loadSampleData();
    }
}

// Weather Data (simplified)
async function loadWeatherData() {
    try {
        // Simple fallback weather
        const hour = new Date().getHours();
        const temp = hour < 12 ? 72 : hour < 18 ? 78 : 74;
        
        document.getElementById('current-temp').textContent = `${temp}°F`;
        document.getElementById('temp-high').textContent = 'H: 82°';
        document.getElementById('weather-icon').textContent = '☀️';
        document.getElementById('sunset-time').textContent = '7:45 PM';
        
        // Random horoscope
        const horoscopes = [
            "Balance guides your decisions today.",
            "Harmony brings unexpected opportunities.",
            "Your diplomatic nature opens doors.",
            "Focus on partnerships and collaboration.",
            "Beauty and justice align in your favor."
        ];
        const randomHoroscope = horoscopes[Math.floor(Math.random() * horoscopes.length)];
        document.getElementById('horoscope-text').textContent = randomHoroscope;
        
    } catch (error) {
        console.error('Weather loading failed:', error);
    }
}

// Modal Functions
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.add('active');
    
    // Set today's date for forms
    if (modalId.includes('weight') || modalId.includes('workout')) {
        const dateInput = modal.querySelector('input[type="date"]');
        if (dateInput) {
            const today = new Date().toISOString().split('T')[0];
            dateInput.value = today;
        }
    }
    
    // Load detail data
    if (modalId === 'workout-detail-modal') loadWorkoutDetails();
    if (modalId === 'weight-detail-modal') loadWeightDetails();
    if (modalId === 'birthday-detail-modal') loadBirthdayDetails();
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

// Form Handlers
async function handleWeightSubmit(e) {
    e.preventDefault();
    showLoading(true);
    
    try {
        const weightEntry = {
            id: Date.now(),
            date: new Date(document.getElementById('weight-date').value),
            weight: parseFloat(document.getElementById('weight-value').value),
            bodyFat: parseFloat(document.getElementById('body-fat').value) || null,
            notes: document.getElementById('weight-notes').value
        };
        
        // Try to save to Supabase, fallback to localStorage
        try {
            const savedEntry = await saveWeight(weightEntry);
            weightEntry.id = savedEntry.id;
        } catch (dbError) {
            console.log('Using localStorage for weight');
        }
        
        weightData.unshift(weightEntry);
        weightData.sort((a, b) => b.date - a.date);
        
        saveToLocalStorage();
        updateDashboard();
        closeModal('weight-modal');
        showToast('Weight logged!', 'success');
    } catch (error) {
        console.error('Error saving weight:', error);
        showToast('Error saving weight', 'error');
    }
    
    showLoading(false);
}

async function handleWorkoutSubmit(e) {
    e.preventDefault();
    showLoading(true);
    
    try {
        const workoutEntry = {
            id: Date.now(),
            date: new Date(document.getElementById('workout-date').value),
            type: document.getElementById('workout-type').value,
            duration: document.getElementById('workout-duration').value || null,
            distance: parseFloat(document.getElementById('workout-distance').value) || null,
            hrZone: parseInt(document.getElementById('workout-hr').value) || null,
            notes: document.getElementById('workout-notes').value
        };
        
        // Try to save to Supabase, fallback to localStorage
        try {
            const savedEntry = await saveWorkout(workoutEntry);
            workoutEntry.id = savedEntry.id;
        } catch (dbError) {
            console.log('Using localStorage for workout');
        }
        
        workoutData.unshift(workoutEntry);
        workoutData.sort((a, b) => b.date - a.date);
        
        saveToLocalStorage();
        updateDashboard();
        closeModal('workout-modal');
        showToast('Workout logged!', 'success');
    } catch (error) {
        console.error('Error saving workout:', error);
        showToast('Error saving workout', 'error');
    }
    
    showLoading(false);
}

async function handleBirthdaySubmit(e) {
    e.preventDefault();
    showLoading(true);
    
    try {
        const birthdayEntry = {
            id: Date.now(),
            name: document.getElementById('birthday-name').value,
            date: new Date(document.getElementById('birthday-date').value),
            age: parseInt(document.getElementById('birthday-age').value) || null,
            notes: document.getElementById('birthday-notes').value
        };
        
        // Try to save to Supabase, fallback to localStorage
        try {
            const savedEntry = await saveBirthday(birthdayEntry);
            birthdayEntry.id = savedEntry.id;
        } catch (dbError) {
            console.log('Using localStorage for birthday');
        }
        
        birthdayData.push(birthdayEntry);
        birthdayData.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        saveToLocalStorage();
        updateDashboard();
        closeModal('birthday-modal');
        showToast('Birthday added!', 'success');
    } catch (error) {
        console.error('Error saving birthday:', error);
        showToast('Error saving birthday', 'error');
    }
    
    showLoading(false);
}

function handleWorkoutTypeChange(e) {
    const type = e.target.value;
    
    // Hide all conditional fields
    document.querySelectorAll('.conditional').forEach(field => {
        field.classList.remove('show');
    });
    
    // Show relevant fields
    if (type === 'walk') {
        document.getElementById('duration-group').classList.add('show');
        document.getElementById('hr-group').classList.add('show');
    } else if (type === 'run') {
        document.getElementById('distance-group').classList.add('show');
    } else if (type === 'lift') {
        document.getElementById('muscle-group').classList.add('show');
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
    
    document.getElementById('workouts-this-week').textContent = thisWeek;
    document.getElementById('workouts-avg').textContent = avgWorkouts.toFixed(1);
    document.getElementById('workout-trend').textContent = `${thisWeek} this week`;
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
    document.getElementById('weight-trend').textContent = 'Recent data';
}

function updateBirthdayCard() {
    const thisWeek = getBirthdaysThisWeek();
    const thisMonth = getBirthdaysThisMonth();
    
    document.getElementById('birthdays-this-week').textContent = thisWeek;
    document.getElementById('birthdays-this-month').textContent = thisMonth;
}

// Utility Functions
function getWorkoutsThisWeek() {
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    return workoutData.filter(w => w.date >= weekAgo).length;
}

function getAverageWorkoutsPerWeek() {
    if (workoutData.length === 0) return 0;
    const weeks = Math.max(1, Math.ceil(workoutData.length / 7));
    return workoutData.length / weeks;
}

function getBirthdaysThisWeek() {
    const today = new Date();
    const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    return birthdayData.filter(birthday => {
        const thisYear = new Date(today.getFullYear(), birthday.date.getMonth(), birthday.date.getDate());
        return thisYear >= today && thisYear <= weekFromNow;
    }).length;
}

function getBirthdaysThisMonth() {
    const today = new Date();
    return birthdayData.filter(birthday => birthday.date.getMonth() === today.getMonth()).length;
}

// AI Functions (simplified)
function saveApiKey() {
    const apiKey = document.getElementById('openai-api-key').value.trim();
    if (!apiKey) {
        showToast('Please enter an API key', 'warning');
        return;
    }
    
    localStorage.setItem('openai_api_key', apiKey);
    openaiApiKey = apiKey;
    updateApiKeyStatus();
    showToast('API key saved!', 'success');
    document.getElementById('openai-api-key').value = '';
}

function updateApiKeyStatus() {
    const statusDiv = document.getElementById('api-key-status');
    if (openaiApiKey) {
        statusDiv.innerHTML = '<p style="color: #10b981;">✅ API key configured</p>';
    } else {
        statusDiv.innerHTML = '<p style="color: #f59e0b;">⚠️ No API key configured</p>';
    }
}

async function handleChatQuestion() {
    const question = document.getElementById('chat-question').value.trim();
    if (!question || !openaiApiKey) {
        showToast('Please enter question and configure API key', 'warning');
        return;
    }
    
    document.getElementById('ask-question-btn').disabled = true;
    document.getElementById('ask-question-btn').textContent = 'Asking...';
    
    try {
        // Simple AI response (you can enhance this)
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openaiApiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: 'You are a fitness coach. Keep responses under 100 words.' },
                    { role: 'user', content: `Based on my fitness data: ${workoutData.length} workouts, ${weightData.length} weight entries. Question: ${question}` }
                ],
                max_tokens: 150
            })
        });
        
        const data = await response.json();
        const answer = data.choices[0].message.content;
        
        // Show response
        const responseDiv = document.getElementById('current-response');
        if (responseDiv) {
            responseDiv.style.display = 'block';
            document.getElementById('current-question').textContent = question;
            document.getElementById('current-answer').textContent = answer;
        }
        
        showToast('Got AI response!', 'success');
    } catch (error) {
        console.error('AI error:', error);
        showToast('AI request failed', 'error');
    }
    
    document.getElementById('ask-question-btn').disabled = false;
    document.getElementById('ask-question-btn').textContent = 'Ask';
    document.getElementById('chat-question').value = '';
}

async function manualGenerateInsight() {
    if (!openaiApiKey) {
        showToast('Configure API key first', 'warning');
        return;
    }
    
    const button = document.getElementById('generate-insight-btn');
    button.disabled = true;
    button.textContent = 'Generating...';
    
    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openaiApiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: 'You are a fitness coach. Provide a brief daily insight in 2-3 sentences.' },
                    { role: 'user', content: `My fitness data: ${workoutData.length} workouts, current weight: ${weightData[0]?.weight || 'unknown'}. Give me today\'s insight.` }
                ],
                max_tokens: 80
            })
        });
        
        const data = await response.json();
        const insight = data.choices[0].message.content;
        
        document.getElementById('daily-insight-text').textContent = insight;
        showToast('New insight generated!', 'success');
    } catch (error) {
        console.error('Insight error:', error);
        showToast('Failed to generate insight', 'error');
    }
    
    button.disabled = false;
    button.textContent = 'New Insight';
}

async function generateDashboardInsight() {
    if (!openaiApiKey || weightData.length < 3) {
        document.getElementById('daily-insight-text').textContent = 
            openaiApiKey ? 'Add more fitness data for insights...' : 'Configure API key in Settings for insights...';
        return;
    }
    
    try {
        await manualGenerateInsight();
    } catch (error) {
        console.log('Auto insight failed:', error);
    }
}

// Detail Loading (simplified)
function loadWorkoutDetails() {
    const list = document.getElementById('workout-list');
    if (workoutData.length === 0) {
        list.innerHTML = '<p>No workouts yet.</p>';
        return;
    }
    
    list.innerHTML = workoutData.slice(0, 10).map(w => `
        <div style="padding: 10px; border-bottom: 1px solid #eee;">
            <strong>${w.type.toUpperCase()}</strong> - ${w.date.toLocaleDateString()}
            ${w.duration ? `<br>Duration: ${w.duration} min` : ''}
            ${w.distance ? `<br>Distance: ${w.distance} mi` : ''}
        </div>
    `).join('');
}

function loadWeightDetails() {
    const list = document.getElementById('weight-entries-list');
    if (weightData.length === 0) {
        list.innerHTML = '<p>No weight entries yet.</p>';
        return;
    }
    
    list.innerHTML = weightData.slice(0, 5).map(w => `
        <div style="padding: 10px; border-bottom: 1px solid #eee;">
            ${w.date.toLocaleDateString()} - ${w.weight} lbs
        </div>
    `).join('');
}

function loadBirthdayDetails() {
    const list = document.getElementById('birthday-list');
    if (birthdayData.length === 0) {
        list.innerHTML = '<p>No birthdays yet.</p>';
        return;
    }
    
    list.innerHTML = birthdayData.map(b => `
        <div style="padding: 10px; border-bottom: 1px solid #eee;">
            <strong>${b.name}</strong> - ${b.date.toLocaleDateString()}
        </div>
    `).join('');
}

// Insights (simplified)
function updateInsights() {
    if (weightData.length > 0) {
        const currentWeight = weightData[0].weight;
        const maxWeight = Math.max(...weightData.map(w => w.weight));
        const weightLost = maxWeight - currentWeight;
        document.getElementById('weight-progress').textContent = `-${weightLost.toFixed(1)} lbs`;
    }
    
    const walkingWorkouts = workoutData.filter(w => w.type === 'walk');
    const totalWalkingTime = walkingWorkouts.reduce((total, w) => total + (parseInt(w.duration) || 0), 0);
    document.getElementById('walking-time').textContent = `${totalWalkingTime} min`;
    
    const runningWorkouts = workoutData.filter(w => w.type === 'run');
    const totalRunningDistance = runningWorkouts.reduce((total, w) => total + (parseFloat(w.distance) || 0), 0);
    document.getElementById('running-distance').textContent = `${totalRunningDistance.toFixed(1)} mi`;
}

// Storage and utility
function saveToLocalStorage() {
    localStorage.setItem('workoutData', JSON.stringify(workoutData));
    localStorage.setItem('weightData', JSON.stringify(weightData));
    localStorage.setItem('birthdayData', JSON.stringify(birthdayData));
}

function updateDataStatus() {
    const statusDiv = document.getElementById('data-status');
    statusDiv.innerHTML = `
        <p>✅ Weight entries: ${weightData.length}</p>
        <p>✅ Workout entries: ${workoutData.length}</p>
        <p>✅ Birthday entries: ${birthdayData.length}</p>
    `;
}

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
        setTimeout(() => container.removeChild(toast), 300);
    }, 3000);
}

async function handleExport() {
    showToast('Export feature simplified - check console for data', 'info');
    console.log('Workout Data:', workoutData);
    console.log('Weight Data:', weightData);
    console.log('Birthday Data:', birthdayData);
}

// Sample data
function loadSampleData() {
    weightData = [
        { id: 1, date: new Date('2025-08-01'), weight: 185.2, bodyFat: 18.5, notes: '' },
        { id: 2, date: new Date('2025-07-28'), weight: 186.1, bodyFat: 18.8, notes: '' },
        { id: 3, date: new Date('2025-07-25'), weight: 187.3, bodyFat: 19.1, notes: '' }
    ];

    workoutData = [
        { id: 1, date: new Date('2025-08-03'), type: 'run', distance: 3.2, notes: 'Morning run' },
        { id: 2, date: new Date('2025-08-02'), type: 'lift', notes: 'Upper body day' },
        { id: 3, date: new Date('2025-08-01'), type: 'walk', duration: 45, hrZone: 2, notes: 'Evening walk' }
    ];

    birthdayData = [
        { id: 1, name: 'Sarah', date: new Date('1990-08-15'), age: 35, notes: 'Sister' },
        { id: 2, name: 'Mike', date: new Date('1985-03-22'), age: 40, notes: 'Best friend' }
    ];
    
    saveToLocalStorage();
    updateDashboard();
    showToast('Sample data loaded!', 'info');
}

// Click outside modal to close
window.addEventListener('click', function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.classList.remove('active');
    }
});