// Supabase Configuration
const SUPABASE_URL = 'https://qwzyypcnxbfkqrxmgbsh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3enl5cGNueGJma3FyeG1nYnNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMDE2NjAsImV4cCI6MjA2ODg3NzY2MH0.YdTmmC3qXxsXt4apwWxwVgp76KF2YtNcGZrv8CSbxDw';

// Data Storage
let workoutData = [];
let weightData = [];
let birthdayData = [];

// Supabase Request Function
async function supabaseRequest(endpoint, options = {}) {
    const url = `${SUPABASE_URL}/rest/v1/${endpoint}`;
    const defaultOptions = {
        headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        }
    };

    try {
        const response = await fetch(url, {
            ...defaultOptions,
            ...options,
            headers: { ...defaultOptions.headers, ...options.headers }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Supabase error details:', errorText);
            throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Supabase request error:', error);
        throw error;
    }
}

// Data Loading Functions
async function loadWorkouts() {
    const data = await supabaseRequest('workouts?order=date.desc');
    workoutData = data.map(row => ({
        id: row.id,
        date: parseSupabaseDate(row.date),
        type: row.type || '',
        duration: row.duration || '',
        distance: row.distance || null,
        hrZone: row['hr zone'] || row.hr_zone || null,
        notes: row.notes || '',
        muscleGroups: []
    }));
    console.log(`Loaded ${workoutData.length} workouts from Supabase`);
}

async function loadWeights() {
    const data = await supabaseRequest('weight_logs?order=date.desc');
    weightData = data.map(row => ({
        id: row.id,
        date: parseSupabaseDate(row.date),
        weight: parseFloat(row.weight) || 0,
        bodyFat: parseFloat(row.body_fat) || null,
        notes: row.notes || ''
    })).filter(row => row.weight > 0);
    console.log(`Loaded ${weightData.length} weight entries from Supabase`);
}

async function loadBirthdays() {
    const data = await supabaseRequest('birthdays?order=date.asc');
    birthdayData = data.map(row => ({
        id: row.id,
        name: row.name || '',
        date: parseSupabaseDate(row.date),
        age: row.age || null,
        notes: row.notes || ''
    })).filter(row => row.name);
    console.log(`Loaded ${birthdayData.length} birthdays from Supabase`);
}

// Data Parsing Function
function parseSupabaseDate(dateString) {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
}

// Data Saving Functions
async function saveWorkout(workout) {
    const data = {
        date: workout.date.toISOString().split('T')[0],
        type: workout.type,
        duration: workout.duration && workout.duration.trim() ? workout.duration.trim() : null,
        distance: workout.distance || null,
        'hr zone': workout.hrZone || null,
        notes: workout.notes && workout.notes.trim() ? workout.notes.trim() : null
    };
    
    Object.keys(data).forEach(key => {
        if (data[key] === null || data[key] === undefined || data[key] === '') {
            delete data[key];
        }
    });
    
    console.log('Sending workout data:', data);
    
    const result = await supabaseRequest('workouts', {
        method: 'POST',
        body: JSON.stringify(data)
    });
    
    return result[0];
}

async function saveWeight(weight) {
    const data = {
        date: weight.date.toISOString().split('T')[0],
        weight: weight.weight,
        body_fat: weight.bodyFat || null,
        notes: weight.notes || null
    };
    
    const result = await supabaseRequest('weight_logs', {
        method: 'POST',
        body: JSON.stringify(data)
    });
    
    return result[0];
}

async function saveBirthday(birthday) {
    const data = {
        name: birthday.name,
        date: birthday.date.toISOString().split('T')[0],
        age: birthday.age || null,
        notes: birthday.notes || null
    };
    
    const result = await supabaseRequest('birthdays', {
        method: 'POST',
        body: JSON.stringify(data)
    });
    
    return result[0];
}

// Delete Functions
async function deleteWorkout(workoutId) {
    if (!confirm('Delete this workout? This cannot be undone.')) {
        return;
    }
    
    showLoading(true);
    
    try {
        await supabaseRequest(`workouts?id=eq.${workoutId}`, {
            method: 'DELETE'
        });
        
        workoutData = workoutData.filter(w => w.id !== workoutId);
        
        updateDashboard();
        updateDataStatus();
        loadWorkoutDetails();
        
        showToast('Error deleting workout', 'error');
    }
    
    showLoading(false);
}

async function deleteWeight(weightId) {
    if (!confirm('Delete this weight entry? This cannot be undone.')) {
        return;
    }
    
    showLoading(true);
    
    try {
        await supabaseRequest(`weight_logs?id=eq.${weightId}`, {
            method: 'DELETE'
        });
        
        weightData = weightData.filter(w => w.id !== weightId);
        
        updateDashboard();
        updateDataStatus();
        loadWeightDetails();
        
        showToast('Weight entry deleted successfully!', 'success');
    } catch (error) {
        console.error('Error deleting weight:', error);
        showToast('Error deleting weight entry', 'error');
    }
    
    showLoading(false);
}

// Connection Test
async function testConnection() {
    try {
        await supabaseRequest('workouts?limit=1');
        return true;
    } catch (error) {
        throw new Error('Failed to connect to Supabase');
    }
}

// Export Functions
async function exportData(tableName, format = 'csv') {
    try {
        const data = await supabaseRequest(tableName);
        
        if (format === 'csv') {
            const csv = convertToCSV(data);
            downloadFile(csv, `${tableName}.csv`, 'text/csv');
        } else if (format === 'excel') {
            const csv = convertToCSV(data);
            downloadFile(csv, `${tableName}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        }
        
        showToast(`${tableName} exported successfully!`, 'success');
    } catch (error) {
        console.error('Export error:', error);
        showToast(`Error exporting ${tableName}`, 'error');
    }
}

function convertToCSV(data) {
    if (!data || data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];
    
    for (const row of data) {
        const values = headers.map(header => {
            const value = row[header];
            return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
        });
        csvRows.push(values.join(','));
    }
    
    return csvRows.join('\n');
}

function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}('Workout deleted successfully!', 'success');
    } catch (error) {
        console.error('Error deleting workout:', error);
        showToast