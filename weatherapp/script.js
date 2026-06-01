// ========== WEATHER CODES ==========
const weatherConditions = {
    0: { condition: 'Clear sky', icon: 'fa-sun', background: 'clear-sky' },
    1: { condition: 'Mainly clear', icon: 'fa-sun', background: 'clear-sky' },
    2: { condition: 'Partly cloudy', icon: 'fa-cloud-sun', background: 'cloudy' },
    3: { condition: 'Overcast', icon: 'fa-cloud', background: 'cloudy' },
    45: { condition: 'Foggy', icon: 'fa-smog', background: 'cloudy' },
    48: { condition: 'Depositing rime fog', icon: 'fa-smog', background: 'cloudy' },
    51: { condition: 'Light drizzle', icon: 'fa-cloud-rain', background: 'rainy' },
    53: { condition: 'Moderate drizzle', icon: 'fa-cloud-rain', background: 'rainy' },
    55: { condition: 'Dense drizzle', icon: 'fa-cloud-showers-heavy', background: 'rainy' },
    61: { condition: 'Slight rain', icon: 'fa-cloud-rain', background: 'rainy' },
    63: { condition: 'Moderate rain', icon: 'fa-cloud-rain', background: 'rainy' },
    65: { condition: 'Heavy rain', icon: 'fa-cloud-showers-heavy', background: 'rainy' },
    71: { condition: 'Slight snow', icon: 'fa-snowflake', background: 'snowy' },
    73: { condition: 'Moderate snow', icon: 'fa-snowflake', background: 'snowy' },
    75: { condition: 'Heavy snow', icon: 'fa-snowflake', background: 'snowy' },
    77: { condition: 'Snow grains', icon: 'fa-snowflake', background: 'snowy' },
    80: { condition: 'Slight rain showers', icon: 'fa-cloud-rain', background: 'rainy' },
    81: { condition: 'Moderate rain showers', icon: 'fa-cloud-showers-heavy', background: 'rainy' },
    82: { condition: 'Violent rain showers', icon: 'fa-cloud-showers-heavy', background: 'rainy' },
    85: { condition: 'Slight snow showers', icon: 'fa-snowflake', background: 'snowy' },
    86: { condition: 'Heavy snow showers', icon: 'fa-snowflake', background: 'snowy' },
    95: { condition: 'Thunderstorm', icon: 'fa-bolt', background: 'stormy' },
    96: { condition: 'Thunderstorm with slight hail', icon: 'fa-bolt', background: 'stormy' },
    99: { condition: 'Thunderstorm with heavy hail', icon: 'fa-bolt', background: 'stormy' }
};

function getWeatherIcon(code) { return weatherConditions[code]?.icon || 'fa-question'; }
function getWeatherCondition(code) { return weatherConditions[code]?.condition || 'Unknown'; }
function getWeatherBackground(code) { return weatherConditions[code]?.background || 'clear-sky'; }

// ========== DOM ELEMENTS ==========
const DOM = {
    searchForm: document.getElementById('search-form'),
    searchInput: document.getElementById('search-input'),
    locationBtn: document.getElementById('location-btn'),
    weatherInfo: document.getElementById('weather-info'),
    cityName: document.getElementById('city-name'),
    temperature: document.getElementById('temperature'),
    weatherIcon: document.getElementById('weather-icon'),
    weatherCondition: document.getElementById('weather-condition'),
    feelsLike: document.getElementById('feels-like'),
    windSpeed: document.getElementById('wind-speed'),
    humidity: document.getElementById('humidity'),
    unitToggle: document.getElementById('unit-toggle'),
    forecast: document.getElementById('forecast'),
    forecastTitle: document.getElementById('forecast-title'),
    searchHistory: document.getElementById('search-history'),
    loading: document.getElementById('loading'),
    error: document.getElementById('error')
};

// ========== STATE ==========
let isCelsius = true;
let lastTempC = null;
let currentWeatherData = null;
const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search?name=';
const WEATHER_URL = 'https://api.open-meteo.com/v1/forecast';
const cache = {};
const CACHE_TTL = 10 * 60 * 1000;
const HISTORY_KEY = 'weatherSearchHistory';
const MAX_HISTORY = 5;

// ========== API FUNCTIONS ==========
async function fetchWeather(city) {
    const cacheKey = city.toLowerCase();
    if (cache[cacheKey]) {
        const age = Date.now() - cache[cacheKey].timestamp;
        if (age < CACHE_TTL) return cache[cacheKey].data;
    }

    const geocodingResponse = await fetch(`${GEOCODING_URL}${encodeURIComponent(city)}&count=1&language=en`);
    if (!geocodingResponse.ok) throw new Error('City not found');

    const geocodingData = await geocodingResponse.json();
    if (!geocodingData.results || geocodingData.results.length === 0) throw new Error('City not found');

    const { latitude, longitude, name, country } = geocodingData.results[0];

    const weatherResponse = await fetch(
        `${WEATHER_URL}?latitude=${latitude}&longitude=${longitude}&current_weather=true&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto`
    );
    if (!weatherResponse.ok) throw new Error('Failed to fetch weather data');

    const weatherData = await weatherResponse.json();
    const result = {
        cityName: name,
        country: country || '',
        latitude,
        longitude,
        current_weather: weatherData.current_weather,
        daily: weatherData.daily
    };

    cache[cacheKey] = { data: result, timestamp: Date.now() };
    return result;
}

async function fetchWeatherByCoords(lat, lon) {
    const weatherResponse = await fetch(
        `${WEATHER_URL}?latitude=${lat}&longitude=${lon}&current_weather=true&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto`
    );
    if (!weatherResponse.ok) throw new Error('Failed to fetch weather data');

    const weatherData = await weatherResponse.json();
    let cityName = 'Your Location';
    try {
        const reverseResponse = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`);
        const reverseData = await reverseResponse.json();
        if (reverseData.address) {
            cityName = reverseData.address.city || reverseData.address.town || reverseData.address.village || 'Your Location';
        }
    } catch (e) {
        cityName = `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`;
    }

    return {
        cityName,
        country: '',
        latitude: lat,
        longitude: lon,
        current_weather: weatherData.current_weather,
        daily: weatherData.daily
    };
}

// ========== UI FUNCTIONS ==========
function updateTemperatureDisplay() {
    if (lastTempC === null) return;
    if (isCelsius) {
        DOM.temperature.textContent = `${Math.round(lastTempC)}°C`;
    } else {
        DOM.temperature.textContent = `${Math.round(lastTempC * 9/5 + 32)}°F`;
    }
}

function displayWeather(data) {
    currentWeatherData = data;
    lastTempC = data.current_weather.temperature;

    DOM.cityName.textContent = `${data.cityName}${data.country ? ', ' + data.country : ''}`;
    updateTemperatureDisplay();
    DOM.weatherCondition.textContent = getWeatherCondition(data.current_weather.weathercode);
    DOM.weatherIcon.className = `fas ${getWeatherIcon(data.current_weather.weathercode)}`;
    DOM.windSpeed.innerHTML = `<i class="fas fa-wind"></i> Wind: ${data.current_weather.windspeed} km/h`;
    DOM.humidity.innerHTML = `<i class="fas fa-droplet"></i> Humidity: --%`;
    document.body.className = getWeatherBackground(data.current_weather.weathercode);
    DOM.weatherInfo.style.display = 'block';
    DOM.error.style.display = 'none';
}

function renderForecast(dailyData, useCelsius) {
    if (useCelsius === undefined) useCelsius = true;
    DOM.forecast.innerHTML = '';
    DOM.forecastTitle.style.display = 'block';

    for (let i = 1; i < Math.min(dailyData.time.length, 6); i++) {
        const date = new Date(dailyData.time[i]);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        const maxTemp = dailyData.temperature_2m_max[i];
        const minTemp = dailyData.temperature_2m_min[i];
        const weatherCode = dailyData.weathercode[i];
        const iconClass = getWeatherIcon(weatherCode);

        const maxDisplay = useCelsius ? Math.round(maxTemp) : Math.round(maxTemp * 9/5 + 32);
        const minDisplay = useCelsius ? Math.round(minTemp) : Math.round(minTemp * 9/5 + 32);

        const dayEl = document.createElement('div');
        dayEl.className = 'forecast-day';
        dayEl.innerHTML = `
            <div class="day-name">${dayName}</div>
            <i class="fas ${iconClass}"></i>
            <div class="temps">
                <span class="max-temp">${maxDisplay}°</span>
                <span class="min-temp">${minDisplay}°</span>
            </div>
        `;
        DOM.forecast.appendChild(dayEl);
    }
}

function showLoading() {
    DOM.loading.style.display = 'block';
    DOM.error.style.display = 'none';
}

function hideLoading() {
    DOM.loading.style.display = 'none';
}

function showError(message) {
    DOM.error.textContent = message;
    DOM.error.style.display = 'block';
    DOM.cityName.textContent = '--';
    DOM.temperature.textContent = '--°C';
    DOM.weatherCondition.textContent = '--';
    DOM.feelsLike.textContent = 'Feels like: --°C';
    DOM.windSpeed.innerHTML = '<i class="fas fa-wind"></i> Wind: -- km/h';
    DOM.humidity.innerHTML = '<i class="fas fa-droplet"></i> Humidity: --%';
    DOM.weatherIcon.className = 'fas fa-sun';
    DOM.weatherInfo.style.display = 'block';
    DOM.forecast.innerHTML = '';
    DOM.forecastTitle.style.display = 'none';
    lastTempC = null;
    currentWeatherData = null;
}

function toggleUnit() {
    isCelsius = !isCelsius;
    updateTemperatureDisplay();
    DOM.unitToggle.textContent = isCelsius ? '°C / °F' : '°F / °C';
    if (currentWeatherData && currentWeatherData.daily) {
        renderForecast(currentWeatherData.daily, isCelsius);
    }
}

// ========== HISTORY ==========
function getHistory() {
    const saved = localStorage.getItem(HISTORY_KEY);
    return saved ? JSON.parse(saved) : [];
}

function saveToHistory(cityName) {
    let history = getHistory();
    history = history.filter(function(c) { return c.toLowerCase() !== cityName.toLowerCase(); });
    history.unshift(cityName);
    history = history.slice(0, MAX_HISTORY);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    renderHistory(history);
}

function renderHistory(history) {
    DOM.searchHistory.innerHTML = '';
    history.forEach(function(city) {
        const tag = document.createElement('span');
        tag.className = 'history-tag';
        tag.textContent = city;
        tag.addEventListener('click', function() {
            DOM.searchInput.value = city;
            searchWeather(city);
        });
        DOM.searchHistory.appendChild(tag);
    });
}

// ========== MAIN SEARCH ==========
async function searchWeather(city) {
    try {
        showLoading();
        const data = await fetchWeather(city);
        displayWeather(data);
        if (data.daily) renderForecast(data.daily, isCelsius);
        saveToHistory(data.cityName);
    } catch (err) {
        showError(err.message);
    } finally {
        hideLoading();
    }
}

function getLocationWeather() {
    if (!navigator.geolocation) {
        showError('Geolocation is not supported by your browser');
        return;
    }

    showLoading();
    navigator.geolocation.getCurrentPosition(
        async function(position) {
            try {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                const data = await fetchWeatherByCoords(lat, lon);
                displayWeather(data);
                if (data.daily) renderForecast(data.daily, isCelsius);
                saveToHistory(data.cityName);
            } catch (err) {
                showError(err.message);
            } finally {
                hideLoading();
            }
        },
        function(err) {
            hideLoading();
            if (err.code === err.PERMISSION_DENIED) showError('Location access denied');
            else if (err.code === err.POSITION_UNAVAILABLE) showError('Location unavailable');
            else if (err.code === err.TIMEOUT) showError('Location request timed out');
            else showError('Could not get location');
        }
    );
}

// ========== EVENT LISTENERS ==========
DOM.searchForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const city = DOM.searchInput.value.trim();
    if (city) searchWeather(city);
});

DOM.locationBtn.addEventListener('click', getLocationWeather);
DOM.unitToggle.addEventListener('click', toggleUnit);

document.addEventListener('DOMContentLoaded', function() {
    renderHistory(getHistory());
    getLocationWeather();
});