let API_KEY = localStorage.getItem('weatherAppApiKey');

function getStoredApiKey() {
  let key = localStorage.getItem('weatherAppApiKey');
  if (!key) {
    key = prompt('Enter OpenWeatherMap API key (free at openweathermap.org):');
    if (key) localStorage.setItem('weatherAppApiKey', key);
    else key = 'demo';
  }
  return key;
}

API_KEY = API_KEY || getStoredApiKey();

const searchBtn = document.getElementById('search-btn');
const cityInput = document.getElementById('city-input');
const resultDiv = document.getElementById('weather-result');
const errorMsg  = document.getElementById('error-msg');
const unitToggleBtn = document.getElementById('unit-toggle-btn');
const geoBtn = document.getElementById('geo-btn');
let searchHistory = [];
let isCelsius = true;
let currentCity = null;

// Load data from localStorage on app start
function loadFromStorage() {
  const stored = localStorage.getItem('weatherAppHistory');
  if (stored) searchHistory = JSON.parse(stored);
  
  const storedUnit = localStorage.getItem('weatherAppUnit');
  if (storedUnit) isCelsius = storedUnit === 'celsius';
  
  updateHistoryTable();
  updateUnitToggleButton();
}

// Save history to localStorage
function saveToStorage() {
  localStorage.setItem('weatherAppHistory', JSON.stringify(searchHistory));
}

// Save unit preference to localStorage
function saveUnitPreference() {
  localStorage.setItem('weatherAppUnit', isCelsius ? 'celsius' : 'fahrenheit');
}

const clearHistoryBtn = document.getElementById('clear-history-btn');

function clearHistory() {
  searchHistory = [];
  saveToStorage();
  updateHistoryTable();
}

if (clearHistoryBtn) {
  clearHistoryBtn.addEventListener('click', clearHistory);
}

function updateUnitToggleButton() {
  if (!unitToggleBtn) return;
  unitToggleBtn.textContent = isCelsius ? 'Switch to °F' : 'Switch to °C';
}

// Fetch weather from the API
async function getWeather(city) {
  const units = isCelsius ? 'metric' : 'imperial';
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=${units}`;
  const response = await fetch(url);

  if (response.status === 404) throw new Error('City not found');
  if (response.status === 401) throw new Error('Invalid API key');
  if (!response.ok) throw new Error(`Error: ${response.status}`);

  return await response.json();
}


// Display the weather data on the page
function displayWeather(data) {
  errorMsg.classList.add('hidden');
  resultDiv.classList.remove('hidden');
  
  currentCity = data.name;

  const unit = isCelsius ? '°C' : '°F';
  document.getElementById('city-name').textContent    = data.name;
  document.getElementById('temperature').textContent = `🌡️ ${data.main.temp}${unit}`;
  document.getElementById('description').textContent = data.weather[0].description;
  document.getElementById('humidity').textContent    = `💧 Humidity: ${data.main.humidity}%`;
  document.getElementById('wind').textContent        = `💨 Wind: ${data.wind.speed} m/s`;

  // Save to history
  const record = {
    date: new Date().toLocaleDateString(),
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    city: data.name,
    temp: data.main.temp,
    description: data.weather[0].description,
    humidity: data.main.humidity + '%',
    wind: data.wind.speed,
    unit: unit
  };

  searchHistory.unshift(record);           // add to front
  if (searchHistory.length > 10) searchHistory.pop(); // keep max 10
  updateHistoryTable();
  saveToStorage();
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
      <td>${record.temp}</td>
      <td>${record.description}</td>
      <td>${record.humidity}</td>
      <td>${record.wind}</td>
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

  // Show loader, hide previous results and errors
  document.getElementById('loader').classList.add('active');
  resultDiv.classList.add('hidden');
  errorMsg.classList.add('hidden');

  try {
    const data = await getWeather(city);
    displayWeather(data);
  } catch (err) {
    resultDiv.classList.add('hidden');
    errorMsg.classList.remove('hidden');
    errorMsg.textContent = err.message;
  } finally {
    // Hide loader whether it succeeded or failed
    document.getElementById('loader').classList.remove('active');
  }
});

loadFromStorage();

// Also trigger on Enter key press
cityInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') searchBtn.click();
});

const clearBtn = document.getElementById('clear-btn');

clearBtn.addEventListener('click', () => {
  resultDiv.classList.add('hidden');
  cityInput.value = '';
});
