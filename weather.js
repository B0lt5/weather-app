import { API_KEY } from './api-config.js';

const searchBtn = document.getElementById('search-btn');
const cityInput = document.getElementById('city-input');
const resultDiv = document.getElementById('weather-result');
const errorMsg  = document.getElementById('error-msg');
const historyUnitToggleBtn = document.getElementById('unit-toggle-btn');
const resultUnitToggleBtn = document.getElementById('result-unit-toggle-btn');
const clearHistoryBtn = document.getElementById('clear-history-btn');
const clearInputBtn = document.getElementById('clear-input-btn');
const suggestionsContainer = document.getElementById('suggestions-container');
const resultWindToggleBtn = document.getElementById('result-wind-toggle-btn');
const historyWindToggleBtn = document.getElementById('wind-toggle-btn');
let searchHistory = [];
let isResultCelsius = true;
let isHistoryCelsius = true;
let isResultWindMps = true;
let isHistoryWindMps = true;
let currentCity = null;
let currentWeatherData = null;

function saveAppData() {
  localStorage.setItem('weatherAppHistory', JSON.stringify(searchHistory));
  localStorage.setItem('weatherAppUnit', isResultCelsius ? 'celsius' : 'fahrenheit');
  localStorage.setItem('weatherAppWindUnit', isResultWindMps ? 'm/s' : 'mph');
}

// Load data from localStorage on app start
function loadFromStorage() {
  const stored = localStorage.getItem('weatherAppHistory');
  if (stored) searchHistory = JSON.parse(stored);

  const storedUnit = localStorage.getItem('weatherAppUnit');
  const storedIsCelsius = storedUnit ? storedUnit === 'celsius' : true;
  isResultCelsius = storedIsCelsius;
  isHistoryCelsius = storedIsCelsius;

  const storedWindUnit = localStorage.getItem('weatherAppWindUnit');
  const storedIsMps = storedWindUnit ? storedWindUnit === 'm/s' : true;
  isResultWindMps = storedIsMps;
  isHistoryWindMps = storedIsMps;

  updateHistoryTable();
  updateHistoryUnitToggleButton();
  updateResultUnitToggleButton();
  updateHistoryWindToggleButton();
  updateResultWindToggleButton();
  updateTemperatureHeader();
  updateWindHeader();
}

function clearHistory() {
  searchHistory = [];
  saveAppData();
  updateHistoryTable();
}

if (clearHistoryBtn) {
  clearHistoryBtn.addEventListener('click', clearHistory);
}

// Fetch weather from the API
async function getWeather(city) {
  const units = isResultCelsius ? 'metric' : 'imperial';
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=${units}`;
  const response = await fetch(url);

  if (response.status === 404) throw new Error('City not found');
  if (response.status === 401) throw new Error('Invalid API key');
  if (!response.ok) throw new Error(`Error: ${response.status}`);

  return await response.json();
}

function updateCurrentWeatherDisplay(data) {
  const unit = data.unit || (isResultCelsius ? '°C' : '°F');
  document.getElementById('city-name').textContent = data.name;
  
  const flagContainer = document.getElementById('country-flag-container');
  const flagImg = document.getElementById('country-flag');
  const tooltip = document.getElementById('country-tooltip');

  if (data.sys && data.sys.country) {
    const countryCode = data.sys.country.toLowerCase();
    
    flagImg.src = `https://flagcdn.com/w40/${countryCode}.png`;
    
    // Map country code or use data if full name is available.
    // OpenWeatherMap gives us the 2-letter code, which we can display or map.
    tooltip.textContent = data.sys.country; // Alternatively, you can display the country code
    
    flagContainer.classList.remove('hidden');
  } else {
    flagContainer.classList.add('hidden');
  }

  document.getElementById('temperature').textContent = `🌡️ ${data.main.temp}${unit}`;
  document.getElementById('description').textContent = data.weather[0].description;
  document.getElementById('humidity').textContent    = `💧 Humidity: ${data.main.humidity}%`;
  const windUnit = isResultWindMps ? 'm/s' : 'mph';
  document.getElementById('wind').textContent = `💨 Wind: ${data.wind.speed} ${windUnit}`;
}

// Display the weather data on the page
function displayWeather(data) {
  errorMsg.classList.add('hidden');
  resultDiv.classList.remove('hidden');

  currentCity = data.name;
  currentWeatherData = {
    ...data,
    unit: isResultCelsius ? '°C' : '°F'
  };

  updateCurrentWeatherDisplay(currentWeatherData);

  // Save to history
  const record = {
    date: new Date().toLocaleDateString(),
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    city: data.name,
    temp: Number(data.main.temp.toFixed(1)),
    description: data.weather[0].description,
    humidity: data.main.humidity + '%',
    wind: data.wind.speed,
    windUnit: isResultWindMps ? 'm/s' : 'mph',
    unit: currentWeatherData.unit
  };

  searchHistory.unshift(record);
  if (searchHistory.length > 10) searchHistory.pop();
  updateHistoryTable();
  saveAppData();
}

function updateHistoryTable() {
  const tbody = document.getElementById('history-body');
  const container = document.getElementById('history-container');

  if (searchHistory.length === 0) {
    container.style.display = 'none';
    return;
  }

  container.style.display = 'block';
  tbody.innerHTML = '';

  searchHistory.forEach((record, index) => {
    const row = document.createElement('tr');
    row.style.cursor = 'pointer';
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${record.date}</td>
      <td>${record.time}</td>
      <td>${record.city}</td>
      <td>${record.temp.toFixed(1)}</td>
      <td>${record.description}</td>
      <td>${record.humidity}</td>
      <td>${record.wind} ${record.windUnit || (isHistoryWindMps ? 'm/s' : 'mph')}</td>
    `;
    row.addEventListener('click', () => {
      cityInput.value = record.city;
      searchBtn.click();
    });
    tbody.appendChild(row);
  });
}

// Button click triggers the whole flow
searchBtn.addEventListener('click', async () => {
  const city = cityInput.value.trim();
  if (!city) return;

  document.getElementById('loader').classList.add('active');
  resultDiv.classList.add('hidden');
  errorMsg.classList.add('hidden');

  try {
    const data = await getWeather(city);
    displayWeather(data);
  } catch (err) {
    resultDiv.classList.add('hidden');
    errorMsg.classList.remove('hidden');
  } finally {
    document.getElementById('loader').classList.remove('active');
  }
});

loadFromStorage();

cityInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') searchBtn.click();
});

const clearBtn = document.getElementById('clear-btn');

clearBtn.addEventListener('click', () => {
  resultDiv.classList.add('hidden');
  cityInput.value = '';
});


// Fetch city suggestions from OpenWeatherMap Geocoding API
async function getCitySuggestions(query) {
  if (!query || query.length < 2) return [];
  
  const encodedQuery = encodeURIComponent(query);
  const url = `https://api.openweathermap.org/geo/1.0/direct?q=${encodedQuery}&limit=5&appid=${API_KEY}`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) return [];
    return await response.json();
  } catch (err) {
    console.error('Error fetching suggestions:', err);
    return [];
  }
}

cityInput.addEventListener('input', () => {
  if (cityInput.value.trim() !== '') {
    clearInputBtn.classList.remove('hidden');
  } else {
    clearInputBtn.classList.add('hidden');
  }
});

clearInputBtn.addEventListener('click', () => {
  cityInput.value = '';
  clearInputBtn.classList.add('hidden');
  cityInput.focus();
});

// History table unit toggle button click event
if (historyUnitToggleBtn) {
  historyUnitToggleBtn.addEventListener('click', () => {
    const previousUnit = isHistoryCelsius ? '°C' : '°F';
    const nextUnit = isHistoryCelsius ? '°F' : '°C';

    isHistoryCelsius = !isHistoryCelsius;

    searchHistory = searchHistory.map((record) => {
      if (!record.unit) return record;

      const convertedTemp = convertTemperature(record.temp, record.unit, nextUnit);
      return {
        ...record,
        temp: Number(convertedTemp.toFixed(1)),
        unit: nextUnit
      };
    });

    updateHistoryUnitToggleButton();
    updateTemperatureHeader();
    updateHistoryTable();
  });
}

if (resultUnitToggleBtn) {
  resultUnitToggleBtn.addEventListener('click', () => {
    const previousUnit = isResultCelsius ? '°C' : '°F';
    const nextUnit = isResultCelsius ? '°F' : '°C';

    isResultCelsius = !isResultCelsius;

    if (currentWeatherData) {
      currentWeatherData.main.temp = Number(
        convertTemperature(currentWeatherData.main.temp, previousUnit, nextUnit).toFixed(1)
      );
      currentWeatherData.unit = nextUnit;
      updateCurrentWeatherDisplay(currentWeatherData);
    }

    saveAppData();
    updateResultUnitToggleButton();
  });
}

if (resultWindToggleBtn) {
  resultWindToggleBtn.addEventListener('click', () => {
    const prevUnit = isResultWindMps ? 'm/s' : 'mph';
    const nextUnit = isResultWindMps ? 'mph' : 'm/s';

    isResultWindMps = !isResultWindMps;

    if (currentWeatherData) {
      currentWeatherData.wind.speed = Number(
        convertSpeed(currentWeatherData.wind.speed, prevUnit, nextUnit).toFixed(1)
      );
      updateCurrentWeatherDisplay(currentWeatherData);
    }

    saveAppData();
    updateResultWindToggleButton();
  });
}

if (historyWindToggleBtn) {
  historyWindToggleBtn.addEventListener('click', () => {
    const nextUnit = isHistoryWindMps ? 'mph' : 'm/s';
    const prevUnit = isHistoryWindMps ? 'm/s' : 'mph';

    isHistoryWindMps = !isHistoryWindMps;

    searchHistory = searchHistory.map((record) => {
      if (record.wind === undefined || record.wind === null) return record;
      const convertedWind = convertSpeed(record.wind, record.windUnit || 'm/s', nextUnit);
      return {
        ...record,
        wind: Number(convertedWind.toFixed(1)),
        windUnit: nextUnit
      };
    });

    updateHistoryWindToggleButton();
    updateWindHeader();
    updateHistoryTable();
  });
}

function convertTemperature(temp, fromUnit, toUnit) {
  if (fromUnit === toUnit) return temp;

  if (fromUnit === '°C' && toUnit === '°F') {
    return (temp * 9 / 5) + 32;
  }

  if (fromUnit === '°F' && toUnit === '°C') {
    return (temp - 32) * 5 / 9;
  }

  return temp;
}

function convertSpeed(speed, fromUnit, toUnit) {
  if (fromUnit === toUnit) return speed;
  if (fromUnit === 'm/s' && toUnit === 'mph') return speed * 2.23694;
  if (fromUnit === 'mph' && toUnit === 'm/s') return speed / 2.23694;
  return speed;
}

function updateHistoryUnitToggleButton() {
  if (!historyUnitToggleBtn) return;
  historyUnitToggleBtn.textContent = isHistoryCelsius ? 'Switch to °F' : 'Switch to °C';
}

function updateResultUnitToggleButton() {
  if (!resultUnitToggleBtn) return;
  resultUnitToggleBtn.textContent = isResultCelsius ? 'Switch to °F' : 'Switch to °C';
}

function updateTemperatureHeader() {
  const header = document.querySelector('#history-table th:nth-child(5)');
  if (header) {
    header.textContent = `Temp (${isHistoryCelsius ? '°C' : '°F'})`;
  }
}

function updateHistoryWindToggleButton() {
  if (!historyWindToggleBtn) return;
  historyWindToggleBtn.textContent = isHistoryWindMps ? 'Switch to mph' : 'Switch to m/s';
}

function updateResultWindToggleButton() {
  if (!resultWindToggleBtn) return;
  resultWindToggleBtn.textContent = isResultWindMps ? 'Switch to mph' : 'Switch to m/s';
}

function updateWindHeader() {
  const header = document.getElementById('wind-header');
  if (header) {
    header.textContent = `Wind (${isHistoryWindMps ? 'm/s' : 'mph'})`;
  }
}

// Event listener for typing in the city input box
cityInput.addEventListener('input', async (e) => {
  const query = e.target.value.trim();

  if (query.length < 2) {
    suggestionsContainer.innerHTML = '';
    suggestionsContainer.classList.add('hidden');
    return;
  }

  const suggestions = await getCitySuggestions(query);

  if (suggestions.length === 0) {
    suggestionsContainer.innerHTML = '';
    suggestionsContainer.classList.add('hidden');
    return;
  }

  suggestionsContainer.innerHTML = '';
  suggestionsContainer.classList.remove('hidden');

  suggestions.forEach(city => {
    const item = document.createElement('div');
    item.classList.add('suggestion-item');
    item.textContent = `${city.name}${city.state ? ', ' + city.state : ''} (${city.country})`;

    item.addEventListener('click', () => {
      cityInput.value = city.name;
      suggestionsContainer.innerHTML = '';
      suggestionsContainer.classList.add('hidden');
      searchBtn.click();
    });

    suggestionsContainer.appendChild(item);
  });
});

document.addEventListener('click', (e) => {
  if (!e.target.closest('.search-box-wrapper') && !e.target.closest('#suggestions-container')) {
    suggestionsContainer.classList.add('hidden');
  }
});

