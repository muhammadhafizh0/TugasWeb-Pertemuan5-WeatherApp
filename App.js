const BASE_URL = 'https://api.openweathermap.org/data/2.5/weather';
const HISTORY_KEY = 'weatherapp_history';
const APIKEY_KEY = 'weatherapp_apikey';

// DOM Elements
const form = document.querySelector('#searchForm');
const input = document.querySelector('#cityInput');
const apiKeyInput = document.querySelector('#apiKeyInput');
const loading = document.querySelector('#loading');
const errorBox = document.querySelector('#error');
const result = document.querySelector('#weatherResult');
const historyBar = document.querySelector('#historyBar');
const unitC = document.querySelector('#unitC');
const unitF = document.querySelector('#unitF');

let lastData = null;   // data mentah OpenWeatherMap terakhir (untuk toggle unit)
let unit = 'C';

// ---- Riwayat pencarian & API key via localStorage ----
const loadHistory = () => {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveHistory = (city) => {
  try {
    const current = loadHistory().filter(c => c.toLowerCase() !== city.toLowerCase());
    current.unshift(city);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(current.slice(0, 6)));
  } catch {
    /* localStorage tidak tersedia, abaikan */
  }
};

const renderHistory = () => {
  // Array method: map() dipakai untuk membangun chip riwayat pencarian
  const cities = loadHistory();
  historyBar.innerHTML = cities
    .map(city => `<button type="button" class="chip" data-city="${city}">${city}</button>`)
    .join('');
};

historyBar.addEventListener('click', (e) => {
  const btn = e.target.closest('.chip');
  if (btn) getWeather(btn.dataset.city);
});

try {
  const savedKey = localStorage.getItem(APIKEY_KEY);
  if (savedKey) apiKeyInput.value = savedKey;
} catch {
  /* abaikan */
}

apiKeyInput.addEventListener('change', () => {
  try {
    localStorage.setItem(APIKEY_KEY, apiKeyInput.value.trim());
  } catch {
    /* abaikan */
  }
});

// ---- UI helpers ----
const showLoading = () => {
  loading.classList.remove('hidden');
  errorBox.classList.add('hidden');
  result.classList.add('hidden');
};
const hideLoading = () => loading.classList.add('hidden');

const showError = (message) => {
  errorBox.textContent = `⚠️ ${message}`;
  errorBox.classList.remove('hidden');
  result.classList.add('hidden');
};

// ---- Fetch data cuaca (async/await + Fetch API) ----
async function getWeather(city) {
  const apiKey = apiKeyInput.value.trim();

  if (!apiKey) {
    showError('Masukkan API key OpenWeatherMap kamu dulu di kolom atas.');
    return;
  }
  if (!city || city.trim() === '') {
    showError('Nama kota tidak boleh kosong.');
    return;
  }

  try {
    showLoading();
    const url = `${BASE_URL}?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric&lang=id`;
    const res = await fetch(url);

    if (res.status === 404) {
      throw new Error(`Kota "${city}" tidak ditemukan.`);
    }
    if (res.status === 401) {
      throw new Error('API key tidak valid atau belum aktif. Cek kembali key kamu.');
    }
    if (!res.ok) {
      throw new Error(`Server error (${res.status}). Coba lagi nanti.`);
    }

    const data = await res.json();
    lastData = data;
    unit = 'C';
    unitC.classList.add('active');
    unitF.classList.remove('active');

    displayWeather(data);
    saveHistory(data.name);
    renderHistory();
    input.value = '';

  } catch (err) {
    if (err instanceof TypeError) {
      showError('Network error. Periksa koneksi internet kamu.');
    } else {
      showError(err.message);
    }
  } finally {
    hideLoading();
  }
}

// ---- Render hasil ----
const formatTemp = (celsius) => {
  const value = unit === 'C' ? celsius : celsius * 9 / 5 + 32;
  return `${Math.round(value)}°${unit}`;
};

function displayWeather(data) {
  document.querySelector('#cityName').textContent = `${data.name}, ${data.sys.country}`;
  document.querySelector('#cityMeta').textContent = new Date().toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
  document.querySelector('#temperature').textContent = formatTemp(data.main.temp);
  document.querySelector('#description').textContent = data.weather[0].description;
  document.querySelector('#humidity').textContent = `${data.main.humidity}%`;
  document.querySelector('#wind').textContent = `${data.wind.speed} m/s`;
  document.querySelector('#weatherIcon').src =
    `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;
  result.classList.remove('hidden');
}

// ---- Toggle °C / °F ----
unitC.addEventListener('click', () => {
  if (unit === 'C' || !lastData) return;
  unit = 'C';
  unitC.classList.add('active');
  unitF.classList.remove('active');
  displayWeather(lastData);
});

unitF.addEventListener('click', () => {
  if (unit === 'F' || !lastData) return;
  unit = 'F';
  unitF.classList.add('active');
  unitC.classList.remove('active');
  displayWeather(lastData);
});

// ---- Event listener form ----
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const city = input.value.trim();
  if (city) getWeather(city);
});

renderHistory();