const API_KEY = 'a53692cd01fb4ee89b98ef26d852c4b7';

const searchBtn = document.getElementById('search-btn');
const cityInput = document.getElementById('city-input');
const resultDiv = document.getElementById('weather-result');
const errorMsg  = document.getElementById('error-msg');
let searchHistory = [];

// Fetch weather from the API
async function getWeather(city) {
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=metric`;
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

  document.getElementById('city-name').textContent    = data.name;
  document.getElementById('temperature').textContent = `🌡️ ${data.main.temp}°C`;
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
    wind: data.wind.speed
  };

  searchHistory.unshift(record);           // add to front
  if (searchHistory.length > 10) searchHistory.pop(); // keep max 10
  updateHistoryTable();
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

// Also trigger on Enter key press
cityInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') searchBtn.click();
});

const clearBtn = document.getElementById('clear-btn');

clearBtn.addEventListener('click', () => {
  resultDiv.classList.add('hidden');
  cityInput.value = '';
});

document.getElementById('history-container').style.display = 'none';

