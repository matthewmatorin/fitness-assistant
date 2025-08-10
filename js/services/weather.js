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

// Horoscope loading (Libra sign)
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
