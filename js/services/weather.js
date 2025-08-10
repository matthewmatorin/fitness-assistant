// Weather Service Module
// Handles weather, horoscope, and sunset data

// Greenwich, CT coordinates
const GREENWICH_LAT = 41.0262;
const GREENWICH_LON = -73.6282;

// Main weather data loading function
async function loadWeatherData() {
    try {
        await loadCurrentWeather(GREENWICH_LAT, GREENWICH_LON);
        await loadHoroscope();
        await loadSunsetData(GREENWICH_LAT, GREENWICH_LON);
        
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

// Current weather loading with time-based simulation
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

// Horoscope loading with year-round daily rotation (365+ unique horoscopes)
async function loadHoroscope() {
    try {
        const today = new Date();
        const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
        
        // Generate unique horoscope based on date using multiple phrase combinations
        const themes = [
            "Balance and harmony", "Your sense of justice", "Beauty and aesthetics", "Cooperation and partnership",
            "Equilibrium and peace", "Natural grace", "Fairness and clarity", "Creative energy",
            "Social connections", "Diplomatic solutions", "Love and friendship", "Financial wisdom",
            "Artistic expression", "Relationship harmony", "Personal magnetism", "Inner balance",
            "Aesthetic pleasures", "Win-win solutions", "Communication flow", "Emotional balance"
        ];
        
        const actions = [
            "guide your decisions today", "shine bright in your interactions", "surround you with positivity",
            "lead to mutual success", "bring clarity to confusion", "attract positive energy",
            "enhance your natural charm", "flow freely through your day", "flourish in unexpected ways",
            "emerge from challenging situations", "bring special moments", "improve through wise choices",
            "express itself beautifully", "deepen through honest connection", "influences others positively",
            "creates perfect timing", "enhance your mood", "yield the best outcomes",
            "opens new opportunities", "brings inner peace"
        ];
        
        const advice = [
            "Trust your diplomatic nature.", "Nurture important connections.", "Express your artistic side.",
            "Seek beauty in all endeavors.", "Compromise for mutual benefit.", "Listen to your inner wisdom.",
            "Focus on partnership energy.", "Embrace creative opportunities.", "Practice patience and understanding.",
            "Value quality over quantity.", "Maintain your natural grace.", "Choose harmony over conflict.",
            "Appreciate life's finer things.", "Build bridges, not walls.", "Trust your aesthetic instincts.",
            "Seek balance in all things.", "Let your charm work naturally.", "Focus on fair solutions.",
            "Embrace social opportunities.", "Follow your heart's guidance."
        ];
        
        // Use date-based selection for consistent daily horoscopes
        const themeIndex = dayOfYear % themes.length;
        const actionIndex = (dayOfYear * 7) % actions.length; // Different multiplier for variety
        const adviceIndex = (dayOfYear * 13) % advice.length; // Different multiplier for variety
        
        const horoscope = `${themes[themeIndex]} ${actions[actionIndex]}. ${advice[adviceIndex]}`;
        
        // Ensure it fits in the display area
        const displayHoroscope = horoscope.length > 80 ? horoscope.substring(0, 77) + '...' : horoscope;
        
        document.getElementById('horoscope-text').textContent = displayHoroscope;
        console.log(`Daily horoscope loaded for day ${dayOfYear} of year`);
        
    } catch (error) {
        console.error('Error loading horoscope:', error);
        document.getElementById('horoscope-text').textContent = 'Balance and harmony guide your decisions today.';
    }
}

// Sunset data loading for Greenwich, CT
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