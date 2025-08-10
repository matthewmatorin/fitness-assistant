// Insights Data Component
// Handles all insights calculations, charts, and analytics for the insights tab

// Main insights update function
function updateInsights() {
    updateWeightProgress();
    updateWalkingProgress();
    updateRunningProgress();
    createInsightsChart();
}

// Weight Progress Analysis
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
    
    // Calculate week-over-week averages
    const weekOverWeekAvg = calculateWeekOverWeekWeightAverage();
    
    if (monthData.length >= 2) {
        const monthlyChange = monthData[0].weight - monthData[monthData.length - 1].weight;
        const description = monthlyChange < 0 ? 
            `Lost ${Math.abs(monthlyChange).toFixed(1)} lbs this month. Great progress!` :
            `Gained ${monthlyChange.toFixed(1)} lbs this month. Consider reviewing your routine.`;
        
        // Add week-over-week average to description
        const weekOverWeekText = weekOverWeekAvg ? 
            ` Week-over-week avg: ${weekOverWeekAvg > 0 ? '+' : ''}${weekOverWeekAvg.toFixed(2)} lbs.` : '';
        
        document.getElementById('weight-description').textContent = description + weekOverWeekText;
    } else {
        document.getElementById('weight-description').textContent = 'Not enough recent data for monthly comparison.';
    }
}

// Walking Activity Analysis
function updateWalkingProgress() {
    const walkingStats = getWalkingStatsComparison();
    
    document.getElementById('walking-time').textContent = `${walkingStats.thisWeek} min`;
    
    // Calculate week-over-week average for walking
    const weekOverWeekAvg = calculateWeekOverWeekWalkingAverage();
    
    let description = '';
    if (walkingStats.change > 0) {
        description = `Up ${walkingStats.change} minutes from last week. Great improvement!`;
    } else if (walkingStats.change < 0) {
        description = `Down ${Math.abs(walkingStats.change)} minutes from last week. Try to walk more this week.`;
    } else {
        description = walkingStats.thisWeek > 0 ? 'Same walking time as last week.' : 'No walking logged this week.';
    }
    
    // Add week-over-week average to description
    if (weekOverWeekAvg !== null) {
        const avgText = ` 4-week avg change: ${weekOverWeekAvg > 0 ? '+' : ''}${weekOverWeekAvg.toFixed(1)} min/week.`;
        description += avgText;
    }
    
    document.getElementById('walking-description').textContent = description;
}

// Running Distance Analysis
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

// Walking Statistics Comparison
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

// Running Statistics Comparison
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

// Get Walking Data for This Week
function getWalkingThisWeek() {
    const today = new Date();
    const monday = getInsightsMonday(today);
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

// Get Walking Data for Last Week
function getWalkingLastWeek() {
    const today = new Date();
    const thisMonday = getInsightsMonday(today);
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

// Get Running Data for This Week
function getRunningThisWeek() {
    const today = new Date();
    const monday = getInsightsMonday(today);
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

// Get Running Data for Last Week
function getRunningLastWeek() {
    const today = new Date();
    const thisMonday = getInsightsMonday(today);
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

// Insights-specific Monday calculation (avoiding conflicts with dashboard)
function getInsightsMonday(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
}

// Weight Chart Creation and Management
function createInsightsChart() {
    const ctx = document.getElementById('insights-weight-chart').getContext('2d');
    
    const filterDropdown = document.getElementById('insights-chart-filter');
    if (filterDropdown && !filterDropdown.hasAttribute('data-listener')) {
        filterDropdown.setAttribute('data-listener', 'true');
        filterDropdown.addEventListener('change', createInsightsChart);
    }
    
    // Destroy existing chart if it exists
    if (window.insightsChart) {
        window.insightsChart.destroy();
    }
    
    const selectedDays = filterDropdown ? filterDropdown.value : '30';
    
    let filteredWeights = [...weightData];
    
    // Filter by selected time period
    if (selectedDays !== 'all') {
        const daysAgo = new Date();
        daysAgo.setDate(daysAgo.getDate() - parseInt(selectedDays));
        filteredWeights = weightData.filter(w => w.date >= daysAgo);
    }
    
    // Sort by date ascending for proper chart display
    filteredWeights = filteredWeights.sort((a, b) => a.date - b.date);
    
    // Update period change display
    updatePeriodChange(filteredWeights, selectedDays);
    
    // Handle empty data case
    if (filteredWeights.length === 0) {
        clearChart(ctx);
        return;
    }
    
    // Create the chart
    createWeightChart(ctx, filteredWeights);
}

// Update the period change display
function updatePeriodChange(filteredWeights, selectedDays) {
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
}

// Clear chart when no data
function clearChart(ctx) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.fillStyle = 'white';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('No weight data for the selected period', ctx.canvas.width / 2, ctx.canvas.height / 2);
}

// Create the actual weight chart
function createWeightChart(ctx, filteredWeights) {
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

// Advanced Analytics Functions

// Calculate week-over-week weight average
function calculateWeekOverWeekWeightAverage() {
    if (weightData.length < 10) return null;
    
    const weeklyAverages = [];
    const today = new Date();
    
    // Get last 4 weeks of data
    for (let i = 0; i < 4; i++) {
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - (i * 7) - today.getDay() + 1);
        weekStart.setHours(0, 0, 0, 0);
        
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);
        
        const weekWeights = weightData.filter(w => 
            w.date >= weekStart && w.date <= weekEnd
        );
        
        if (weekWeights.length > 0) {
            const avgWeight = weekWeights.reduce((sum, w) => sum + w.weight, 0) / weekWeights.length;
            weeklyAverages.unshift(avgWeight); // Add to beginning
        }
    }
    
    if (weeklyAverages.length < 2) return null;
    
    // Calculate week-over-week changes
    const weekChanges = [];
    for (let i = 1; i < weeklyAverages.length; i++) {
        weekChanges.push(weeklyAverages[i] - weeklyAverages[i - 1]);
    }
    
    // Return average of week-over-week changes
    return weekChanges.reduce((sum, change) => sum + change, 0) / weekChanges.length;
}

// Calculate week-over-week walking average
function calculateWeekOverWeekWalkingAverage() {
    const walkingWorkouts = workoutData.filter(w => w.type === 'walk' && w.duration);
    if (walkingWorkouts.length < 5) return null;
    
    const weeklyTotals = [];
    const today = new Date();
    
    // Get last 4 weeks of walking data
    for (let i = 0; i < 4; i++) {
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - (i * 7) - today.getDay() + 1);
        weekStart.setHours(0, 0, 0, 0);
        
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);
        
        const weekWalks = walkingWorkouts.filter(w => 
            w.date >= weekStart && w.date <= weekEnd
        );
        
        const totalMinutes = weekWalks.reduce((sum, w) => sum + (parseInt(w.duration) || 0), 0);
        weeklyTotals.unshift(totalMinutes); // Add to beginning
    }
    
    if (weeklyTotals.length < 2) return null;
    
    // Calculate week-over-week changes
    const weekChanges = [];
    for (let i = 1; i < weeklyTotals.length; i++) {
        weekChanges.push(weeklyTotals[i] - weeklyTotals[i - 1]);
    }
    
    // Return average of week-over-week changes
    return weekChanges.reduce((sum, change) => sum + change, 0) / weekChanges.length;
}

// Get workout intensity trends
function getWorkoutIntensityTrends() {
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);
    
    const recentWorkouts = workoutData.filter(w => w.date >= last30Days);
    
    const intensityByType = {};
    recentWorkouts.forEach(workout => {
        if (!intensityByType[workout.type]) {
            intensityByType[workout.type] = [];
        }
        
        // Calculate intensity score based on type
        let intensity = 0;
        if (workout.type === 'run' && workout.distance) {
            intensity = workout.distance * 10; // Distance-based intensity
        } else if (workout.type === 'walk' && workout.duration) {
            intensity = workout.duration / 10; // Duration-based intensity
        } else if (workout.type === 'lift') {
            intensity = workout.muscleGroups ? workout.muscleGroups.length * 5 : 5;
        }
        
        intensityByType[workout.type].push(intensity);
    });
    
    return intensityByType;
}

// Get weight loss velocity (rate of change)
function getWeightLossVelocity() {
    if (weightData.length < 3) return null;
    
    const sortedWeights = [...weightData].sort((a, b) => a.date - b.date);
    const recent = sortedWeights.slice(-7); // Last 7 entries
    
    if (recent.length < 2) return null;
    
    const timeSpan = (recent[recent.length - 1].date - recent[0].date) / (1000 * 60 * 60 * 24); // Days
    const weightChange = recent[recent.length - 1].weight - recent[0].weight;
    
    return weightChange / timeSpan; // lbs per day
}

// Get consistency metrics
function getConsistencyMetrics() {
    const last4Weeks = [];
    const today = new Date();
    
    for (let i = 0; i < 4; i++) {
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - (i * 7) - today.getDay() + 1);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        
        const weekWorkouts = workoutData.filter(w => 
            w.date >= weekStart && w.date <= weekEnd
        ).length;
        
        last4Weeks.unshift(weekWorkouts);
    }
    
    const average = last4Weeks.reduce((a, b) => a + b, 0) / last4Weeks.length;
    const variance = last4Weeks.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / last4Weeks.length;
    const consistency = Math.max(0, 100 - (variance * 10)); // Scale to percentage
    
    return {
        weeklyWorkouts: last4Weeks,
        averagePerWeek: average,
        consistencyScore: consistency
    };
}

// Export insights data for external analysis
function exportInsightsData() {
    return {
        weightProgress: {
            current: weightData.length > 0 ? weightData[0].weight : null,
            totalLoss: weightData.length > 0 ? Math.max(...weightData.map(w => w.weight)) - weightData[0].weight : 0,
            velocity: getWeightLossVelocity()
        },
        workoutStats: {
            walking: getWalkingStatsComparison(),
            running: getRunningStatsComparison(),
            intensity: getWorkoutIntensityTrends(),
            consistency: getConsistencyMetrics()
        },
        chartData: {
            weightEntries: weightData.length,
            workoutEntries: workoutData.length,
            dateRange: weightData.length > 0 ? {
                start: Math.min(...weightData.map(w => w.date.getTime())),
                end: Math.max(...weightData.map(w => w.date.getTime()))
            } : null
        }
    };
}