// Fitness Assistant - Pure JavaScript/HTML Solution for GitHub Pages
// All data stored in localStorage - no external dependencies

// Application State
const appState = {
    currentTab: 'dashboard',
    workouts: [],
    weights: [],
    birthdays: [],
    charts: {},
    settings: {
        weeklyReminders: true,
        birthdayAlerts: true
    }
};

// Storage Keys
const STORAGE_KEYS = {
    workouts: 'fitness-workouts',
    weights: 'fitness-weights',
    birthdays: 'fitness-birthdays',
    settings: 'fitness-settings'
};

// DOM Elements
const elements = {
    navBtns: document.querySelectorAll('.nav-btn'),
    tabContents: document.querySelectorAll('.tab-content'),
    currentDate: document.getElementById('current-date'),
    
    // Action buttons
    logWeightBtn: document.getElementById('log-weight-btn'),
    logWorkoutBtn: document.getElementById('log-workout-btn'),
    logBirthdayBtn: document.getElementById('log-birthday-btn'),
    
    // Modals
    weightModal: document.getElementById('weight-modal'),
    workoutModal: document.getElementById('workout-modal'),
    birthdayModal: document.getElementById('birthday-modal'),
    
    // Forms
    weightForm: document.getElementById('weight-form'),
    workoutForm: document.getElementById('workout-form'),
    birthdayForm: document.getElementById('birthday-form'),
    
    // Cards
    workoutCard: document.getElementById('workout-card'),
    weightCard: document.getElementById('weight-card'),
    birthdayCard: document.getElementById('birthday-card'),
    
    // Settings
    importDataBtn: document.getElementById('import-data-btn'),
    csvFileInput: document.getElementById('csv-file-input'),
    backupAllBtn: document.getElementById('backup-all-btn'),
    restoreBtn: document.getElementById('restore-btn'),
    backupFileInput: document.getElementById('backup-file-input'),
    
    // Loading
    loading: document.getElementById('loading'),
    toastContainer: document.getElementById('toast-container')
};

// Utility Functions
const utils = {
    formatDate: (date) => {
        return new Date(date).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    },
    
    formatDateShort: (date) => {
        return new Date(date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
        });
    },
    
    getWeekStart: (date = new Date()) => {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(d.setDate(diff));
    },
    
    getWeekEnd: (date = new Date()) => {
        const weekStart = utils.getWeekStart(date);
        return new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
    },
    
    showLoading: () => {
        elements.loading.classList.add('active');
    },
    
    hideLoading: () => {
        elements.loading.classList.remove('active');
    },
    
    showToast: (message, type = 'success') => {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        elements.toastContainer.appendChild(toast);
        
        setTimeout(() => toast.classList.add('show'), 100);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (elements.toastContainer.contains(toast)) {
                    elements.toastContainer.removeChild(toast);
                }
            }, 300);
        }, 3000);
    },
    
    showError: (message) => {
        utils.showToast(message, 'error');
    },
    
    generateId: () => {
        return Date.now() + Math.random().toString(36).substr(2, 9);
    }
};

// Local Storage Functions
const storage = {
    save: (key, data) => {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Error saving to localStorage:', error);
            utils.showError('Failed to save data');
            return false;
        }
    },
    
    load: (key) => {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('Error loading from localStorage:', error);
            return [];
        }
    },
    
    loadAll: () => {
        appState.workouts = storage.load(STORAGE_KEYS.workouts);
        appState.weights = storage.load(STORAGE_KEYS.weights);
        appState.birthdays = storage.load(STORAGE_KEYS.birthdays);
        
        const savedSettings = storage.load(STORAGE_KEYS.settings);
        if (savedSettings.length > 0) {
            appState.settings = { ...appState.settings, ...savedSettings };
        }
    },
    
    saveAll: () => {
        storage.save(STORAGE_KEYS.workouts, appState.workouts);
        storage.save(STORAGE_KEYS.weights, appState.weights);
        storage.save(STORAGE_KEYS.birthdays, appState.birthdays);
        storage.save(STORAGE_KEYS.settings, appState.settings);
    }
};

// Data Management Functions
const dataManager = {
    addWorkout: (workout) => {
        workout.id = utils.generateId();
        workout.created_at = new Date().toISOString();
        appState.workouts.push(workout);
        storage.save(STORAGE_KEYS.workouts, appState.workouts);
        dashboard.updateCards();
        utils.showToast('Workout logged successfully!');
    },
    
    addWeight: (weight) => {
        weight.id = utils.generateId();
        weight.created_at = new Date().toISOString();
        appState.weights.push(weight);
        storage.save(STORAGE_KEYS.weights, appState.weights);
        dashboard.updateCards();
        utils.showToast('Weight logged successfully!');
    },
    
    addBirthday: (birthday) => {
        birthday.id = utils.generateId();
        birthday.created_at = new Date().toISOString();
        appState.birthdays.push(birthday);
        storage.save(STORAGE_KEYS.birthdays, appState.birthdays);
        dashboard.updateCards();
        utils.showToast('Birthday added successfully!');
    },
    
    importCSV: (file, dataType) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const csv = e.target.result;
                const lines = csv.split('\n');
                const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
                
                const data = [];
                for (let i = 1; i < lines.length; i++) {
                    if (lines[i].trim()) {
                        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
                        const row = {};
                        headers.forEach((header, index) => {
                            const value = values[index];
                            row[header.toLowerCase().replace(/\s+/g, '_')] = value;
                        });
                        
                        // Add ID and timestamp
                        row.id = utils.generateId();
                        row.created_at = new Date().toISOString();
                        data.push(row);
                    }
                }
                
                // Map to correct data structure based on type
                if (dataType === 'workouts') {
                    data.forEach(row => {
                        // Map your CSV headers to expected format
                        const workout = {
                            id: row.id,
                            date: row.date,
                            type: row.type?.toLowerCase() || 'other',
                            duration: row.duration || null,
                            distance: row.distance ? parseFloat(row.distance) : null,
                            hr_zone: row.hr_zone || null,
                            notes: row.notes || '',
                            created_at: row.created_at
                        };
                        appState.workouts.push(workout);
                    });
                } else if (dataType === 'weights') {
                    data.forEach(row => {
                        const weight = {
                            id: row.id,
                            date: row.date,
                            weight: parseFloat(row.weight),
                            body_fat: row.body_fat ? parseFloat(row.body_fat) : null,
                            notes: row.notes || '',
                            created_at: row.created_at
                        };
                        appState.weights.push(weight);
                    });
                } else if (dataType === 'birthdays') {
                    data.forEach(row => {
                        const birthday = {
                            id: row.id,
                            name: row.name,
                            date: row.date,
                            age: row.age ? parseInt(row.age) : null,
                            notes: row.notes || '',
                            created_at: row.created_at
                        };
                        appState.birthdays.push(birthday);
                    });
                }
                
                storage.saveAll();
                dashboard.updateCards();
                utils.showToast(`Imported ${data.length} ${dataType} records`);
                
            } catch (error) {
                console.error('CSV import error:', error);
                utils.showError('Failed to import CSV file');
            }
        };
        reader.readAsText(file);
    }
};

// Navigation Functions
const navigation = {
    init: () => {
        elements.navBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.currentTarget.dataset.tab;
                navigation.switchTab(tab);
            });
        });
    },
    
    switchTab: (tabName) => {
        // Update nav buttons
        elements.navBtns.forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.tab === tabName) {
                btn.classList.add('active');
            }
        });
        
        // Update tab content
        elements.tabContents.forEach(content => {
            content.classList.remove('active');
            if (content.id === tabName) {
                content.classList.add('active');
            }
        });
        
        appState.currentTab = tabName;
        
        // Load tab-specific content
        if (tabName === 'insights') {
            insights.init();
        }
    }
};

// Modal Functions
const modals = {
    init: () => {
        // Action button listeners
        elements.logWeightBtn.addEventListener('click', () => modals.openModal('weight-modal'));
        elements.logWorkoutBtn.addEventListener('click', () => modals.openModal('workout-modal'));
        elements.logBirthdayBtn.addEventListener('click', () => modals.openModal('birthday-modal'));
        
        // Close button listeners
        document.querySelectorAll('.close-btn, [data-modal]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modalId = e.target.dataset.modal || e.target.closest('[data-modal]')?.dataset.modal;
                if (modalId) {
                    modals.closeModal(modalId);
                }
            });
        });
        
        // Form listeners
        elements.weightForm.addEventListener('submit', modals.handleWeightSubmit);
        elements.workoutForm.addEventListener('submit', modals.handleWorkoutSubmit);
        elements.birthdayForm.addEventListener('submit', modals.handleBirthdaySubmit);
        
        // Workout type change listener for conditional fields
        document.getElementById('workout-type').addEventListener('change', modals.handleWorkoutTypeChange);
        
        // Modal backdrop clicks
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modals.closeModal(modal.id);
                }
            });
        });
    },
    
    openModal: (modalId) => {
        const modal = document.getElementById(modalId);
        modal.classList.add('active');
        
        // Set default date to today
        const dateInput = modal.querySelector('input[type="date"]');
        if (dateInput) {
            dateInput.value = new Date().toISOString().split('T')[0];
        }
    },
    
    closeModal: (modalId) => {
        const modal = document.getElementById(modalId);
        modal.classList.remove('active');
        
        // Reset form
        const form = modal.querySelector('form');
        if (form) form.reset();
        
        // Hide conditional fields
        modal.querySelectorAll('.conditional').forEach(field => {
            field.classList.remove('show');
        });
    },
    
    handleWorkoutTypeChange: (e) => {
        const workoutType = e.target.value;
        const conditionalFields = {
            duration: document.getElementById('duration-group'),
            distance: document.getElementById('distance-group'),
            hr: document.getElementById('hr-group'),
            muscle: document.getElementById('muscle-group')
        };
        
        // Hide all conditional fields first
        Object.values(conditionalFields).forEach(field => {
            field.classList.remove('show');
        });
        
        // Show relevant fields based on workout type
        switch (workoutType) {
            case 'walk':
                conditionalFields.duration.classList.add('show');
                conditionalFields.hr.classList.add('show');
                break;
            case 'run':
                conditionalFields.distance.classList.add('show');
                break;
            case 'lift':
                conditionalFields.muscle.classList.add('show');
                break;
        }
    },
    
    handleWeightSubmit: (e) => {
        e.preventDefault();
        
        const weight = {
            date: document.getElementById('weight-date').value,
            weight: parseFloat(document.getElementById('weight-value').value),
            body_fat: document.getElementById('body-fat').value ? parseFloat(document.getElementById('body-fat').value) : null,
            notes: document.getElementById('weight-notes').value || ''
        };
        
        dataManager.addWeight(weight);
        modals.closeModal('weight-modal');
    },
    
    handleWorkoutSubmit: (e) => {
        e.preventDefault();
        
        const workoutType = document.getElementById('workout-type').value;
        const muscleGroups = Array.from(document.querySelectorAll('#muscle-group input:checked'))
            .map(cb => cb.value);
        
        const workout = {
            date: document.getElementById('workout-date').value,
            type: workoutType,
            duration: document.getElementById('workout-duration').value || null,
            distance: document.getElementById('workout-distance').value ? parseFloat(document.getElementById('workout-distance').value) : null,
            hr_zone: document.getElementById('workout-hr').value || null,
            muscle_groups: muscleGroups.length > 0 ? muscleGroups.join(',') : null,
            notes: document.getElementById('workout-notes').value || ''
        };
        
        dataManager.addWorkout(workout);
        modals.closeModal('workout-modal');
    },
    
    handleBirthdaySubmit: (e) => {
        e.preventDefault();
        
        const birthday = {
            name: document.getElementById('birthday-name').value,
            date: document.getElementById('birthday-date').value,
            age: document.getElementById('birthday-age').value ? parseInt(document.getElementById('birthday-age').value) : null,
            notes: document.getElementById('birthday-notes').value || ''
        };
        
        dataManager.addBirthday(birthday);
        modals.closeModal('birthday-modal');
    }
};

// Dashboard Functions
const dashboard = {
    init: () => {
        // Set current date
        elements.currentDate.textContent = utils.formatDate(new Date());
        
        // Update summary cards
        dashboard.updateCards();
        
        // Card click listeners
        elements.workoutCard.addEventListener('click', dashboard.showWorkoutDetails);
        elements.weightCard.addEventListener('click', dashboard.showWeightDetails);
        elements.birthdayCard.addEventListener('click', dashboard.showBirthdayDetails);
    },
    
    updateCards: () => {
        dashboard.updateWorkoutCard();
        dashboard.updateWeightCard();
        dashboard.updateBirthdayCard();
    },
    
    updateWorkoutCard: () => {
        const now = new Date();
        const weekStart = utils.getWeekStart(now);
        const weekEnd = utils.getWeekEnd(now);
        const lastWeekStart = new Date(weekStart.getTime() - 7 * 24 * 60 * 60 * 1000);
        const lastWeekEnd = new Date(weekEnd.getTime() - 7 * 24 * 60 * 60 * 1000);
        
        // This week's workouts
        const thisWeekWorkouts = appState.workouts.filter(workout => {
            const workoutDate = new Date(workout.date);
            return workoutDate >= weekStart && workoutDate <= weekEnd;
        }).length;
        
        // Last week's workouts
        const lastWeekWorkouts = appState.workouts.filter(workout => {
            const workoutDate = new Date(workout.date);
            return workoutDate >= lastWeekStart && workoutDate <= lastWeekEnd;
        }).length;
        
        // Average workouts per week
        const totalWorkouts = appState.workouts.length;
        const firstWorkoutDate = appState.workouts.length > 0 ? new Date(appState.workouts[0].date) : now;
        const weeksOfData = Math.max(1, Math.ceil((now - firstWorkoutDate) / (7 * 24 * 60 * 60 * 1000)));
        const avgWorkouts = Math.round(totalWorkouts / weeksOfData * 10) / 10;
        
        // Update DOM
        document.getElementById('workouts-this-week').textContent = thisWeekWorkouts;
        document.getElementById('workouts-avg').textContent = avgWorkouts;
        
        const trendElement = document.getElementById('workout-trend');
        const trendDiff = thisWeekWorkouts - lastWeekWorkouts;
        if (trendDiff > 0) {
            trendElement.textContent = `+${trendDiff}`;
            trendElement.className = 'trend positive';
        } else if (trendDiff < 0) {
            trendElement.textContent = `${trendDiff}`;
            trendElement.className = 'trend negative';
        } else {
            trendElement.textContent = '±0';
            trendElement.className = 'trend';
        }
    },
    
    updateWeightCard: () => {
        if (appState.weights.length === 0) {
            document.getElementById('current-weight').textContent = '--';
            document.getElementById('weight-lost').textContent = '0';
            document.getElementById('weight-trend').textContent = '--';
            return;
        }
        
        // Sort weights by date
        const sortedWeights = [...appState.weights].sort((a, b) => new Date(b.date) - new Date(a.date));
        
        // Current weight
        const currentWeight = sortedWeights[0];
        document.getElementById('current-weight').textContent = `${currentWeight.weight} lbs`;
        
        // Weight lost (highest weight - current weight)
        const maxWeight = Math.max(...appState.weights.map(w => w.weight));
        const weightLost = maxWeight - currentWeight.weight;
        document.getElementById('weight-lost').textContent = Math.round(weightLost * 10) / 10;
        
        // Trend (current vs previous)
        const trendElement = document.getElementById('weight-trend');
        if (sortedWeights.length > 1) {
            const prevWeight = sortedWeights[1];
            const trendDiff = currentWeight.weight - prevWeight.weight;
            if (trendDiff < 0) {
                trendElement.textContent = `${Math.round(trendDiff * 10) / 10} lbs`;
                trendElement.className = 'trend positive'; // Weight loss is positive
            } else if (trendDiff > 0) {
                trendElement.textContent = `+${Math.round(trendDiff * 10) / 10} lbs`;
                trendElement.className = 'trend negative'; // Weight gain is negative
            } else {
                trendElement.textContent = '±0 lbs';
                trendElement.className = 'trend';
            }
        }
    },
    
    updateBirthdayCard: () => {
        const now = new Date();
        const weekStart = utils.getWeekStart(now);
        const weekEnd = utils.getWeekEnd(now);
        
        // This week's birthdays
        const thisWeekBirthdays = appState.birthdays.filter(birthday => {
            const birthdayDate = new Date(birthday.date);
            birthdayDate.setFullYear(now.getFullYear()); // Set to current year
            return birthdayDate >= weekStart && birthdayDate <= weekEnd;
        }).length;
        
        // This month's birthdays
        const thisMonthBirthdays = appState.birthdays.filter(birthday => {
            const birthdayDate = new Date(birthday.date);
            return birthdayDate.getMonth() === now.getMonth();
        }).length;
        
        document.getElementById('birthdays-this-week').textContent = thisWeekBirthdays;
        document.getElementById('birthdays-this-month').textContent = thisMonthBirthdays;
    },
    
    showWorkoutDetails: () => {
        const last14Workouts = [...appState.workouts]
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 14);
        
        let html = '';
        if (last14Workouts.length === 0) {
            html = '<p>No workouts logged yet.</p>';
        } else {
            last14Workouts.forEach(workout => {
                html += `
                    <div class="workout-item">
                        <div class="workout-date">${utils.formatDateShort(workout.date)}</div>
                        <div class="workout-type">${workout.type.charAt(0).toUpperCase() + workout.type.slice(1)}</div>
                        <div class="workout-details">
                            ${workout.duration ? `${workout.duration}min` : ''}
                            ${workout.distance ? `${workout.distance}mi` : ''}
                            ${workout.hr_zone ? `Zone ${workout.hr_zone}` : ''}
                            ${workout.muscle_groups ? workout.muscle_groups.split(',').join(', ') : ''}
                        </div>
                    </div>
                `;
            });
        }
        
        document.getElementById('workout-list').innerHTML = html;
        modals.openModal('workout-detail-modal');
    },
    
    showWeightDetails: () => {
        if (appState.weights.length === 0) {
            utils.showError('No weight data to display');
            return;
        }
        
        modals.openModal('weight-detail-modal');
        // Initialize filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                
                const days = e.target.dataset.days;
                insights.createWeightDetailChart(days);
            });
        });
        
        // Show default 7-day chart
        insights.createWeightDetailChart('7');
    },
    
    showBirthdayDetails: () => {
        const now = new Date();
        const thisMonthBirthdays = appState.birthdays.filter(birthday => {
            const birthdayDate = new Date(birthday.date);
            return birthdayDate.getMonth() === now.getMonth();
        }).sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            return dateA.getDate() - dateB.getDate();
        });
        
        let html = '';
        if (thisMonthBirthdays.length === 0) {
            html = '<p>No birthdays this month.</p>';
        } else {
            thisMonthBirthdays.forEach(birthday => {
                const birthdayDate = new Date(birthday.date);
                const dayOfMonth = birthdayDate.getDate();
                const monthName = birthdayDate.toLocaleDateString('en-US', { month: 'long' });
                
                html += `
                    <div class="birthday-item">
                        <div class="birthday-date">${monthName} ${dayOfMonth}</div>
                        <div class="birthday-name">${birthday.name}</div>
                        ${birthday.age ? `<div class="birthday-age">Age: ${birthday.age}</div>` : ''}
                        ${birthday.notes ? `<div class="birthday-notes">${birthday.notes}</div>` : ''}
                    </div>
                `;
            });
        }
        
        document.getElementById('birthday-list').innerHTML = html;
        modals.openModal('birthday-detail-modal');
    }
};

// Insights Functions
const insights = {
    init: () => {
        insights.createWorkoutChart();
        insights.createWeightChart();
        insights.updateInsightsSummary();
        insights.initChat();
    },
    
    createWorkoutChart: () => {
        const ctx = document.getElementById('workout-chart');
        if (!ctx) return;
        
        // Destroy existing chart
        if (appState.charts.workout) {
            appState.charts.workout.destroy();
        }
        
        // Prepare data - workouts per week for last 8 weeks
        const weeks = [];
        const workoutCounts = [];
        
        for (let i = 7; i >= 0; i--) {
            const weekStart = new Date();
            weekStart.setDate(weekStart.getDate() - (i * 7));
            const weekStartFormatted = utils.getWeekStart(weekStart);
            const weekEnd = utils.getWeekEnd(weekStart);
            
            const weekWorkouts = appState.workouts.filter(workout => {
                const workoutDate = new Date(workout.date);
                return workoutDate >= weekStartFormatted && workoutDate <= weekEnd;
            }).length;
            
            weeks.push(`Week ${8-i}`);
            workoutCounts.push(weekWorkouts);
        }
        
        appState.charts.workout = new Chart(ctx, {
            type: 'line',
            data: {
                labels: weeks,
                datasets: [{
                    label: 'Workouts per Week',
                    data: workoutCounts,
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
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
                        ticks: {
                            color: 'white',
                            stepSize: 1
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    }
                }
            }
        });
    },
    
    createWeightChart: () => {
        const ctx = document.getElementById('weight-chart');
        if (!ctx || appState.weights.length === 0) return;
        
        // Destroy existing chart
        if (appState.charts.weight) {
            appState.charts.weight.destroy();
        }
        
        // Prepare data - last 30 weight entries
        const sortedWeights = [...appState.weights]
            .sort((a, b) => new Date(a.date) - new Date(b.date))
            .slice(-30);
        
        const dates = sortedWeights.map(w => utils.formatDateShort(w.date));
        const weights = sortedWeights.map(w => w.weight);
        
        appState.charts.weight = new Chart(ctx, {
            type: 'line',
            data: {
                labels: dates,
                datasets: [{
                    label: 'Weight (lbs)',
                    data: weights,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
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
                            color: 'white',
                            maxTicksLimit: 6
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    },
                    y: {
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
    },
    
    createWeightDetailChart: (filterDays) => {
        const ctx = document.getElementById('weight-detail-chart');
        if (!ctx || appState.weights.length === 0) return;
        
        // Destroy existing chart
        if (appState.charts.weightDetail) {
            appState.charts.weightDetail.destroy();
        }
        
        // Filter data based on selected period
        let filteredWeights = [...appState.weights].sort((a, b) => new Date(a.date) - new Date(b.date));
        
        if (filterDays !== 'all') {
            const daysBack = parseInt(filterDays);
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysBack);
            
            filteredWeights = filteredWeights.filter(w => new Date(w.date) >= cutoffDate);
        }
        
        const dates = filteredWeights.map(w => utils.formatDateShort(w.date));
        const weights = filteredWeights.map(w => w.weight);
        
        appState.charts.weightDetail = new Chart(ctx, {
            type: 'line',
            data: {
                labels: dates,
                datasets: [{
                    label: 'Weight (lbs)',
                    data: weights,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            color: '#333'
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            color: '#333'
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    },
                    y: {
                        ticks: {
                            color: '#333'
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    }
                }
            }
        });
    },
    
    updateInsightsSummary: () => {
        // Workout insights
        const workoutInsights = document.getElementById('workout-insights');
        if (workoutInsights) {
            const totalWorkouts = appState.workouts.length;
            const thisWeek = appState.workouts.filter(w => {
                const workoutDate = new Date(w.date);
                const weekStart = utils.getWeekStart();
                const weekEnd = utils.getWeekEnd();
                return workoutDate >= weekStart && workoutDate <= weekEnd;
            }).length;
            
            const firstWorkoutDate = appState.workouts.length > 0 ? new Date(appState.workouts[0].date) : new Date();
            const weeksOfData = Math.max(1, Math.ceil((new Date() - firstWorkoutDate) / (7 * 24 * 60 * 60 * 1000)));
            const avgPerWeek = totalWorkouts > 0 ? Math.round((totalWorkouts / weeksOfData) * 10) / 10 : 0;
            
            workoutInsights.innerHTML = `
                <p>This week: ${thisWeek} workouts</p>
                <p>Average: ${avgPerWeek} workouts per week</p>
                <p>Total logged: ${totalWorkouts} workouts</p>
            `;
        }
        
        // Weight insights
        const weightInsights = document.getElementById('weight-insights');
        if (weightInsights && appState.weights.length > 0) {
            const sortedWeights = [...appState.weights].sort((a, b) => new Date(b.date) - new Date(a.date));
            const currentWeight = sortedWeights[0].weight;
            const maxWeight = Math.max(...appState.weights.map(w => w.weight));
            const totalLoss = maxWeight - currentWeight;
            
            weightInsights.innerHTML = `
                <p>Current: ${currentWeight} lbs</p>
                <p>Total lost: ${Math.round(totalLoss * 10) / 10} lbs</p>
                <p>Peak weight: ${maxWeight} lbs</p>
            `;
        }
    },
    
    initChat: () => {
        const chatSend = document.getElementById('chat-send');
        const chatInput = document.getElementById('chat-input');
        
        if (!chatSend || !chatInput) return;
        
        chatSend.addEventListener('click', insights.sendChatMessage);
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                insights.sendChatMessage();
            }
        });
    },
    
    sendChatMessage: () => {
        const chatInput = document.getElementById('chat-input');
        const chatMessages = document.getElementById('chat-messages');
        const message = chatInput.value.trim();
        
        if (!message) return;
        
        // Add user message
        const userMessage = document.createElement('div');
        userMessage.className = 'chat-message user';
        userMessage.innerHTML = `<strong>You:</strong> ${message}`;
        chatMessages.appendChild(userMessage);
        
        // Clear input
        chatInput.value = '';
        
        // Generate response based on data
        setTimeout(() => {
            const response = insights.generateDataResponse(message.toLowerCase());
            const botMessage = document.createElement('div');
            botMessage.className = 'chat-message bot';
            botMessage.innerHTML = `<strong>Assistant:</strong> ${response}`;
            chatMessages.appendChild(botMessage);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }, 1000);
        
        chatMessages.scrollTop = chatMessages.scrollHeight;
    },
    
    generateDataResponse: (message) => {
        const workoutCount = appState.workouts.length;
        const weightCount = appState.weights.length;
        const birthdayCount = appState.birthdays.length;
        
        if (message.includes('workout') || message.includes('exercise')) {
            if (workoutCount === 0) {
                return "You haven't logged any workouts yet. Start by clicking the 'Log Workout' button on the dashboard!";
            }
            
            const recentWorkouts = appState.workouts.slice(-5);
            const workoutTypes = [...new Set(recentWorkouts.map(w => w.type))];
            
            return `You've logged ${workoutCount} workouts total. Your recent activities include: ${workoutTypes.join(', ')}. Keep up the great work!`;
            
        } else if (message.includes('weight') || message.includes('progress')) {
            if (weightCount === 0) {
                return "No weight data found. Start tracking your weight to see progress over time!";
            }
            
            const sortedWeights = [...appState.weights].sort((a, b) => new Date(b.date) - new Date(a.date));
            const currentWeight = sortedWeights[0].weight;
            const maxWeight = Math.max(...appState.weights.map(w => w.weight));
            const totalLoss = maxWeight - currentWeight;
            
            return `Your current weight is ${currentWeight} lbs. You've lost ${Math.round(totalLoss * 10) / 10} lbs from your peak of ${maxWeight} lbs. Great progress!`;
            
        } else if (message.includes('birthday')) {
            if (birthdayCount === 0) {
                return "No birthdays added yet. Add important birthdays so you never miss celebrating with loved ones!";
            }
            
            return `You're tracking ${birthdayCount} birthdays. Use the birthday card to see who's celebrating this month!`;
            
        } else if (message.includes('summary') || message.includes('overview')) {
            return `Here's your fitness summary: ${workoutCount} workouts logged, ${weightCount} weight entries, and ${birthdayCount} birthdays tracked. You're doing great at staying consistent with your health tracking!`;
            
        } else {
            return `I can help you analyze your fitness data! Try asking about your workouts, weight progress, or upcoming birthdays. You currently have ${workoutCount} workouts, ${weightCount} weight entries, and ${birthdayCount} birthdays in your system.`;
        }
    }
};

// Settings Functions
const settings = {
    init: () => {
        // Import functionality
        elements.importDataBtn.addEventListener('click', settings.handleImportClick);
        elements.csvFileInput.addEventListener('change', settings.handleFileImport);
        
        // Backup/restore functionality
        elements.backupAllBtn.addEventListener('click', settings.backupAllData);
        elements.restoreBtn.addEventListener('click', settings.handleRestoreClick);
        elements.backupFileInput.addEventListener('change', settings.handleRestoreFile);
        
        // Export functionality
        document.getElementById('export-submit').addEventListener('click', settings.handleExport);
        document.getElementById('export-cancel').addEventListener('click', settings.cancelExport);
        
        // Notification settings
        document.getElementById('weekly-reminders').addEventListener('change', settings.updateSettings);
        document.getElementById('birthday-alerts').addEventListener('change', settings.updateSettings);
        
        // Load saved settings
        settings.loadSettings();
    },
    
    handleImportClick: () => {
        elements.csvFileInput.click();
    },
    
    handleFileImport: (e) => {
        const files = e.target.files;
        if (!files.length) return;
        
        Array.from(files).forEach(file => {
            const filename = file.name.toLowerCase();
            let dataType = '';
            
            if (filename.includes('workout')) {
                dataType = 'workouts';
            } else if (filename.includes('weight')) {
                dataType = 'weights';
            } else if (filename.includes('birthday')) {
                dataType = 'birthdays';
            } else {
                utils.showError(`Cannot determine data type for file: ${file.name}`);
                return;
            }
            
            dataManager.importCSV(file, dataType);
        });
        
        // Clear the input
        e.target.value = '';
    },
    
    backupAllData: () => {
        const backup = {
            version: '1.0',
            timestamp: new Date().toISOString(),
            data: {
                workouts: appState.workouts,
                weights: appState.weights,
                birthdays: appState.birthdays,
                settings: appState.settings
            }
        };
        
        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `fitness-assistant-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        utils.showToast('Backup created successfully!');
    },
    
    handleRestoreClick: () => {
        elements.backupFileInput.click();
    },
    
    handleRestoreFile: (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const backup = JSON.parse(e.target.result);
                
                if (backup.data) {
                    appState.workouts = backup.data.workouts || [];
                    appState.weights = backup.data.weights || [];
                    appState.birthdays = backup.data.birthdays || [];
                    appState.settings = { ...appState.settings, ...backup.data.settings };
                    
                    storage.saveAll();
                    dashboard.updateCards();
                    settings.loadSettings();
                    
                    utils.showToast('Data restored successfully!');
                } else {
                    utils.showError('Invalid backup file format');
                }
            } catch (error) {
                console.error('Restore error:', error);
                utils.showError('Failed to restore backup');
            }
        };
        reader.readAsText(file);
        
        // Clear the input
        e.target.value = '';
    },
    
    handleExport: () => {
        const exportType = document.getElementById('export-type').value;
        const exportFormat = document.getElementById('export-format').value;
        
        if (!exportType || !exportFormat) {
            utils.showError('Please select both data type and format');
            return;
        }
        
        let data = [];
        let filename = '';
        
        switch (exportType) {
            case 'workouts':
                data = appState.workouts;
                filename = `workouts_${new Date().toISOString().split('T')[0]}`;
                break;
            case 'weight':
                data = appState.weights;
                filename = `weight_${new Date().toISOString().split('T')[0]}`;
                break;
            case 'birthdays':
                data = appState.birthdays;
                filename = `birthdays_${new Date().toISOString().split('T')[0]}`;
                break;
            case 'all':
                data = {
                    workouts: appState.workouts,
                    weights: appState.weights,
                    birthdays: appState.birthdays
                };
                filename = `all_data_${new Date().toISOString().split('T')[0]}`;
                break;
        }
        
        if (exportFormat === 'csv' && exportType !== 'all') {
            settings.exportToCSV(data, filename);
        } else {
            settings.exportToJSON(data, filename);
        }
        
        utils.showToast(`${exportType} exported successfully!`);
        settings.cancelExport();
    },
    
    exportToCSV: (data, filename) => {
        if (data.length === 0) {
            utils.showError('No data to export');
            return;
        }
        
        const headers = Object.keys(data[0]).join(',');
        const rows = data.map(row => 
            Object.values(row).map(value => 
                typeof value === 'string' && value.includes(',') ? `"${value}"` : value
            ).join(',')
        );
        
        const csv = [headers, ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },
    
    exportToJSON: (data, filename) => {
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },
    
    cancelExport: () => {
        document.getElementById('export-type').value = '';
        document.getElementById('export-format').value = '';
    },
    
    updateSettings: () => {
        appState.settings.weeklyReminders = document.getElementById('weekly-reminders').checked;
        appState.settings.birthdayAlerts = document.getElementById('birthday-alerts').checked;
        
        storage.save(STORAGE_KEYS.settings, appState.settings);
        utils.showToast('Settings updated!');
    },
    
    loadSettings: () => {
        document.getElementById('weekly-reminders').checked = appState.settings.weeklyReminders;
        document.getElementById('birthday-alerts').checked = appState.settings.birthdayAlerts;
    }
};

// Sample Data for Demo
const sampleData = {
    loadSampleData: () => {
        // Only load if no existing data
        if (appState.workouts.length === 0 && appState.weights.length === 0 && appState.birthdays.length === 0) {
            // Sample workouts
            const sampleWorkouts = [
                {
                    id: utils.generateId(),
                    date: '2024-07-15',
                    type: 'run',
                    distance: 3.5,
                    notes: 'Morning run in the park',
                    created_at: '2024-07-15T10:00:00Z'
                },
                {
                    id: utils.generateId(),
                    date: '2024-07-17',
                    type: 'lift',
                    muscle_groups: 'chest,shoulders',
                    notes: 'Upper body workout',
                    created_at: '2024-07-17T18:00:00Z'
                },
                {
                    id: utils.generateId(),
                    date: '2024-07-19',
                    type: 'walk',
                    duration: 45,
                    hr_zone: '2',
                    notes: 'Evening walk',
                    created_at: '2024-07-19T19:00:00Z'
                }
            ];
            
            // Sample weights
            const sampleWeights = [
                {
                    id: utils.generateId(),
                    date: '2024-07-15',
                    weight: 180.5,
                    body_fat: 15.2,
                    notes: 'Morning weigh-in',
                    created_at: '2024-07-15T08:00:00Z'
                },
                {
                    id: utils.generateId(),
                    date: '2024-07-22',
                    weight: 179.8,
                    body_fat: 15.0,
                    notes: 'Weekly check-in',
                    created_at: '2024-07-22T08:00:00Z'
                }
            ];
            
            // Sample birthdays
            const sampleBirthdays = [
                {
                    id: utils.generateId(),
                    name: 'John Doe',
                    date: '1990-08-15',
                    age: 33,
                    notes: 'College friend',
                    created_at: '2024-01-01T00:00:00Z'
                },
                {
                    id: utils.generateId(),
                    name: 'Jane Smith',
                    date: '1985-07-25',
                    age: 38,
                    notes: 'Sister',
                    created_at: '2024-01-01T00:00:00Z'
                }
            ];
            
            appState.workouts = sampleWorkouts;
            appState.weights = sampleWeights;
            appState.birthdays = sampleBirthdays;
            
            storage.saveAll();
            
            utils.showToast('Sample data loaded for demo purposes!');
        }
    }
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    try {
        utils.showLoading();
        
        // Load data from localStorage
        storage.loadAll();
        
        // Load sample data if empty (for demo)
        sampleData.loadSampleData();
        
        // Initialize modules
        navigation.init();
        modals.init();
        dashboard.init();
        settings.init();
        
        utils.hideLoading();
        utils.showToast('Fitness Assistant loaded successfully!');
    } catch (error) {
        console.error('Application initialization failed:', error);
        utils.hideLoading();
        utils.showError('Failed to initialize application');
    }
});