// Dashboard Data Component
// Handles all data calculations and updates for the dashboard tab

// Main dashboard update function
function updateDashboard() {
    updateWorkoutCard();
    updateWeightCard();
    updateBirthdayCard();
}

// Workout Card Updates
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
    
    // NEW IMPROVED TREND LOGIC - Current vs 7-Day Average
    if (weightData.length >= 3) {
        const trendElement = document.getElementById('weight-trend');
        const trendResult = calculateWeightTrendVsAverage();
        
        if (trendResult) {
            const { difference, direction, average, method } = trendResult;
            
            if (Math.abs(difference) < 0.5) {
                // Very small change - consider stable
                trendElement.textContent = `Stable (${currentWeight} vs ${average.toFixed(1)} avg)`;
                trendElement.className = 'trend';
            } else if (direction === 'down') {
                // Weight is down from recent average - good trend
                trendElement.textContent = `Trending down (-${Math.abs(difference).toFixed(1)} vs ${method})`;
                trendElement.className = 'trend positive';
            } else {
                // Weight is up from recent average - concerning trend
                trendElement.textContent = `Trending up (+${difference.toFixed(1)} vs ${method})`;
                trendElement.className = 'trend negative';
            }
        } else {
            // Fallback for insufficient data
            trendElement.textContent = 'Building trend data...';
            trendElement.className = 'trend';
        }
    } else {
        document.getElementById('weight-trend').textContent = '--';
    }
}

// NEW HELPER FUNCTION - Calculate Current Weight vs Recent Average
function calculateWeightTrendVsAverage() {
    if (weightData.length < 3) return null;
    
    const currentWeight = weightData[0].weight;
    const currentDate = weightData[0].date;
    
    // Get entries from the last 7 days (excluding today's entry)
    const sevenDaysAgo = new Date(currentDate);
    sevenDaysAgo.setDate(currentDate.getDate() - 7);
    
    const recentEntries = weightData.slice(1).filter(entry => {
        return entry.date >= sevenDaysAgo;
    });
    
    // Need at least 2 entries for a meaningful average
    if (recentEntries.length >= 2) {
        // Use 7-day average
        const average = recentEntries.reduce((sum, entry) => sum + entry.weight, 0) / recentEntries.length;
        const difference = currentWeight - average;
        
        return {
            difference: difference,
            direction: difference < 0 ? 'down' : 'up',
            average: average,
            entriesUsed: recentEntries.length,
            method: '7-day avg'
        };
    } else {
        // Fallback: use last 4 entries (excluding current) if no 7-day data
        const fallbackEntries = weightData.slice(1, 5);
        if (fallbackEntries.length < 2) return null;
        
        const average = fallbackEntries.reduce((sum, entry) => sum + entry.weight, 0) / fallbackEntries.length;
        const difference = currentWeight - average;
        
        return {
            difference: difference,
            direction: difference < 0 ? 'down' : 'up',
            average: average,
            entriesUsed: fallbackEntries.length,
            method: 'recent avg'
        };
    }
}

function updateBirthdayCard() {
    const thisWeek = getBirthdaysThisWeek();
    const thisMonth = getBirthdaysThisMonth();
    
    document.getElementById('birthdays-this-week').textContent = thisWeek;
    document.getElementById('birthdays-this-month').textContent = thisMonth;
}

// Week Calculation Helper
function getMonday(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
}

// Workout Statistics Functions
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

// Birthday Statistics Functions
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

// Detail Modal Loading Functions
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

// Data Status Update Function
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

// Sample Data Loading (for demo purposes)
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