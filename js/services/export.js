// Export Service Module
// Handles data export functionality for CSV and Excel formats

// Main export function called from the UI
async function exportData(tableName, format = 'csv') {
    try {
        // Get data from Supabase
        const data = await supabaseRequest(tableName);
        
        if (!data || data.length === 0) {
            showToast(`No ${tableName} data to export`, 'warning');
            return;
        }
        
        // Convert and download based on format
        if (format === 'csv') {
            const csv = convertToCSV(data);
            downloadFile(csv, `${tableName}.csv`, 'text/csv');
        } else if (format === 'excel') {
            // For now, export as CSV with .xlsx extension
            // In a real implementation, you'd use a library like SheetJS
            const csv = convertToCSV(data);
            downloadFile(csv, `${tableName}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        }
        
        showToast(`${tableName} exported successfully!`, 'success');
        
    } catch (error) {
        console.error('Export error:', error);
        showToast(`Error exporting ${tableName}: ${error.message}`, 'error');
        throw error;
    }
}

// Export from local data (fallback when Supabase fails)
async function exportLocalData(dataType, format = 'csv') {
    try {
        let data = [];
        let filename = '';
        
        // Get the appropriate local data
        switch (dataType) {
            case 'workouts':
                data = workoutData.map(workout => ({
                    id: workout.id,
                    date: workout.date.toISOString().split('T')[0],
                    type: workout.type,
                    duration: workout.duration || '',
                    distance: workout.distance || '',
                    hr_zone: workout.hrZone || '',
                    notes: workout.notes || '',
                    muscle_groups: workout.muscleGroups ? workout.muscleGroups.join(', ') : ''
                }));
                filename = 'workouts';
                break;
                
            case 'weight_logs':
                data = weightData.map(weight => ({
                    id: weight.id,
                    date: weight.date.toISOString().split('T')[0],
                    weight: weight.weight,
                    body_fat: weight.bodyFat || '',
                    notes: weight.notes || ''
                }));
                filename = 'weight_logs';
                break;
                
            case 'birthdays':
                data = birthdayData.map(birthday => ({
                    id: birthday.id,
                    name: birthday.name,
                    date: birthday.date.toISOString().split('T')[0],
                    age: birthday.age || '',
                    notes: birthday.notes || ''
                }));
                filename = 'birthdays';
                break;
                
            default:
                throw new Error(`Unknown data type: ${dataType}`);
        }
        
        if (data.length === 0) {
            showToast(`No ${dataType} data to export`, 'warning');
            return;
        }
        
        // Convert and download
        if (format === 'csv') {
            const csv = convertToCSV(data);
            downloadFile(csv, `${filename}.csv`, 'text/csv');
        } else if (format === 'excel') {
            const csv = convertToCSV(data);
            downloadFile(csv, `${filename}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        }
        
        showToast(`${dataType} exported successfully from local data!`, 'success');
        
    } catch (error) {
        console.error('Local export error:', error);
        showToast(`Error exporting ${dataType}: ${error.message}`, 'error');
        throw error;
    }
}

// Convert data array to CSV format
function convertToCSV(data) {
    if (!data || data.length === 0) {
        return '';
    }
    
    // Get headers from the first object
    const headers = Object.keys(data[0]);
    const csvRows = [];
    
    // Add header row
    csvRows.push(headers.join(','));
    
    // Add data rows
    for (const row of data) {
        const values = headers.map(header => {
            const value = row[header];
            
            // Handle null/undefined values
            if (value === null || value === undefined) {
                return '';
            }
            
            // Convert to string and escape quotes
            const stringValue = String(value);
            
            // If value contains comma, newline, or quote, wrap in quotes and escape internal quotes
            if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
                return `"${stringValue.replace(/"/g, '""')}"`;
            }
            
            return stringValue;
        });
        
        csvRows.push(values.join(','));
    }
    
    return csvRows.join('\n');
}

// Download file to user's device
function downloadFile(content, filename, mimeType) {
    try {
        // Create blob with the content
        const blob = new Blob([content], { type: mimeType });
        
        // Create download URL
        const url = URL.createObjectURL(blob);
        
        // Create temporary link element
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        
        // Add to DOM, click, and remove
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up the URL
        URL.revokeObjectURL(url);
        
        console.log(`File downloaded: ${filename}`);
        
    } catch (error) {
        console.error('Download error:', error);
        throw new Error(`Failed to download file: ${error.message}`);
    }
}

// Validate export parameters
function validateExportParams(dataType, format) {
    const validDataTypes = ['workouts', 'weight_logs', 'birthdays'];
    const validFormats = ['csv', 'excel'];
    
    if (!validDataTypes.includes(dataType)) {
        throw new Error(`Invalid data type: ${dataType}. Must be one of: ${validDataTypes.join(', ')}`);
    }
    
    if (!validFormats.includes(format)) {
        throw new Error(`Invalid format: ${format}. Must be one of: ${validFormats.join(', ')}`);
    }
    
    return true;
}

// Export with enhanced error handling and fallback
async function exportDataWithFallback(dataType, format = 'csv') {
    try {
        // Validate parameters
        validateExportParams(dataType, format);
        
        // Try Supabase export first
        try {
            await exportData(dataType, format);
        } catch (supabaseError) {
            console.log('Supabase export failed, trying local data:', supabaseError.message);
            
            // Fallback to local data
            await exportLocalData(dataType, format);
        }
        
    } catch (error) {
        console.error('Export failed completely:', error);
        showToast(`Export failed: ${error.message}`, 'error');
        throw error;
    }
}

// Get export statistics
function getExportStats() {
    return {
        workouts: {
            count: workoutData.length,
            dateRange: workoutData.length > 0 ? {
                earliest: Math.min(...workoutData.map(w => w.date.getTime())),
                latest: Math.max(...workoutData.map(w => w.date.getTime()))
            } : null
        },
        weights: {
            count: weightData.length,
            dateRange: weightData.length > 0 ? {
                earliest: Math.min(...weightData.map(w => w.date.getTime())),
                latest: Math.max(...weightData.map(w => w.date.getTime()))
            } : null
        },
        birthdays: {
            count: birthdayData.length
        }
    };
}

// Preview export data (for debugging)
function previewExportData(dataType, maxRows = 5) {
    try {
        let data = [];
        
        switch (dataType) {
            case 'workouts':
                data = workoutData.slice(0, maxRows);
                break;
            case 'weight_logs':
                data = weightData.slice(0, maxRows);
                break;
            case 'birthdays':
                data = birthdayData.slice(0, maxRows);
                break;
            default:
                throw new Error(`Unknown data type: ${dataType}`);
        }
        
        console.log(`Preview of ${dataType} export data:`, data);
        return data;
        
    } catch (error) {
        console.error('Preview error:', error);
        return [];
    }
}
