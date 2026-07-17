const API_KEY = "21774a0700355c127b983e1697dad583";
let state = {
  weather: null,
  unit: localStorage.getItem('unit') || 'C',
  history: JSON.parse(localStorage.getItem('history')) || []
};
const el = id => document.getElementById(id);

const getCondition = (code) => {
  if (code === 0) return { main: 'Clear', desc: 'clear sky' };
  if (code <= 3 || [45, 48].includes(code)) return { main: 'Clouds', desc: 'cloudy' };
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return { main: 'Rain', desc: 'rainy' };
  if ([71, 73, 75, 85, 86].includes(code)) return { main: 'Snow', desc: 'snowy' };
  return { main: 'Thunderstorm', desc: 'thunderstorm' };
};

const rules = [
  { test: w => ['rain', 'thunderstorm'].includes(w.main.toLowerCase()), items: ["☔ Pack an umbrella!", "🧥 Waterproof jacket"] },
  { test: w => w.tempC < 10, items: ["🧥 Heavy coat", "🧣 Warm scarf & gloves"] },
  { test: w => w.tempC > 30, items: ["🧴 Sunscreen & sunglasses", "🩳 Light clothing"] },
  { test: w => w.humidity > 70, items: ["🌬️ Breathable fabrics"] },
  { test: w => w.main === 'Snow', items: ["🥾 Waterproof winter boots"] },
  { test: w => w.wind > 25, items: ["🧥 Windbreaker"] }
];

function getSuggestions(w) {
  const list = rules.filter(r => r.test(w)).flatMap(r => r.items);
  return list.length ? list : ["👕 Comfortable casual wear"];
}
async function fetchWeather(city) {

  const currentResponse = await fetch(
    `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`
  );

  if (!currentResponse.ok) {
    throw new Error("City not found.");
  }

  const current = await currentResponse.json();

  const forecastResponse = await fetch(
    `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`
  );

  if (!forecastResponse.ok) {
    throw new Error("Unable to fetch forecast.");
  }

  const forecast = await forecastResponse.json();

  return {
    city: `${current.name}, ${current.sys.country}`,
    tempC: current.main.temp,
    humidity: current.main.humidity,
    wind: current.wind.speed,
    main: current.weather[0].main,
    desc: current.weather[0].description,
    icon: current.weather[0].icon,

    hourly: forecast.list.slice(0, 8).map(item => ({
      time: item.dt_txt.split(" ")[1].substring(0, 5),
      tempC: item.main.temp,
      main: item.weather[0].main
    })),

    daily: forecast.list
      .filter(item => item.dt_txt.includes("12:00:00"))
      .slice(0, 3)
      .map(item => ({
        day: new Date(item.dt_txt).toLocaleDateString("en-US", {
          weekday: "long"
        }),
        minC: item.main.temp_min,
        maxC: item.main.temp_max,
        main: item.weather[0].main,
        desc: item.weather[0].description
      }))
  };
}
function render(w) {
  const isC = state.unit === 'C';
  const temp = isC ? Math.round(w.tempC) : Math.round(w.tempC * 9/5 + 32);
  const windStr = isC ? `${Math.round(w.wind)} km/h` : `${Math.round(w.wind * 0.621371)} mph`;
  const emojis = { Clear: '☀️', Clouds: '☁️', Rain: '🌧️', Snow: '❄️', Thunderstorm: '⚡' };
  el('cityName').textContent = w.city;
  el('currentTemp').textContent = `${temp}°`;
  el('weatherDesc').textContent = w.desc;
  el('humidityVal').textContent = `${w.humidity}%`;
  el('windVal').textContent = windStr;
  el('weatherIcon').textContent = emojis[w.main] || '☁️';
  updateTheme(w.main, w.tempC);
  el('hourlyScroll').innerHTML = w.hourly.map(h => `
    <div class="hourly-card">
      <span class="hourly-time">${h.time}</span>
      <span class="hourly-icon">${emojis[h.main] || '☁️'}</span>
      <span class="hourly-temp">${isC ? Math.round(h.tempC) : Math.round(h.tempC * 9/5 + 32)}°</span>
    </div>`).join('');
  el('dailyGrid').innerHTML = w.daily.map(d => `
    <div class="daily-card">
      <span class="daily-day">${d.day}</span>
      <div class="daily-icon-container">
        <span class="daily-icon">${emojis[d.main] || '☁️'}</span>
        <span class="daily-desc">${d.desc}</span>
      </div>
      <div class="daily-temp-range">
        <span class="daily-temp-max">${isC ? Math.round(d.maxC) : Math.round(d.maxC * 9/5 + 32)}°</span>
        <span class="daily-temp-min">${isC ? Math.round(d.minC) : Math.round(d.minC * 9/5 + 32)}°</span>
      </div>
    </div>`).join('');
  const list = rules.filter(r => r.test(w)).flatMap(r => r.items);
  el('packingMeta').textContent = `Suggestions for ${w.main} weather (${Math.round(w.tempC)}°C)`;
  el('packingList').innerHTML = (list.length ? list : ["👕 Comfortable casual wear"]).map(item => `
    <div class="packing-item">
      <div class="packing-checkbox"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
      <span class="packing-item-text">${item}</span>
    </div>`).join('');
  document.querySelectorAll('.packing-item').forEach(btn => btn.addEventListener('click', () => btn.classList.toggle('checked')));
  el('dashboardGrid').classList.add('active');
}

function updateTheme(main, tempC) {
  let theme = {
    bg: 'linear-gradient(-45deg, #334155, #475569, #1e293b, #334155)',
    accent: '#94a3b8',
    cardBg: 'rgba(255, 255, 255, 0.04)',
    text: '#f8fafc',
    muted: 'rgba(248, 250, 252, 0.6)',
    border: 'rgba(255, 255, 255, 0.08)'
  };
  if (main === 'Clear') {
    theme = tempC > 22 ? {
      bg: 'linear-gradient(-45deg, #ea580c, #f59e0b, #e11d48, #ea580c)', accent: '#f43f5e',
      cardBg: 'rgba(255, 255, 255, 0.07)', text: '#ffffff', muted: 'rgba(255, 255, 255, 0.7)', border: 'rgba(255, 255, 255, 0.15)'
    } : {
      bg: 'linear-gradient(-45deg, #1d4ed8, #3b82f6, #06b6d4, #1d4ed8)', accent: '#06b6d4',
      cardBg: 'rgba(255, 255, 255, 0.06)', text: '#ffffff', muted: 'rgba(255, 255, 255, 0.7)', border: 'rgba(255, 255, 255, 0.12)'
    };
  } else if (['Rain', 'Thunderstorm'].includes(main)) {
    theme = {
      bg: 'linear-gradient(-45deg, #1e293b, #334155, #0f172a, #1e293b)', accent: '#38bdf8',
      cardBg: 'rgba(255, 255, 255, 0.04)', text: '#f1f5f9', muted: 'rgba(241, 245, 249, 0.6)', border: 'rgba(255, 255, 255, 0.08)'
    };
  } else if (main === 'Snow') {
    theme = {
      bg: 'linear-gradient(-45deg, #0ea5e9, #bae6fd, #e0f2fe, #0ea5e9)', accent: '#0284c7',
      cardBg: 'rgba(255, 255, 255, 0.4)', text: '#0f172a', muted: 'rgba(15, 23, 42, 0.6)', border: 'rgba(255, 255, 255, 0.5)'
    };
  }
  const root = document.documentElement;
  Object.keys(theme).forEach(key => root.style.setProperty(`--${key === 'bg' ? 'bg-gradient' : key === 'border' ? 'glass-border' : key === 'cardBg' ? 'card-bg' : key === 'text' ? 'text-color' : key === 'muted' ? 'text-muted' : 'accent-color'}`, theme[key]));
}

async function search(city) {
  if (!city) return;
  setLoading(true);
  el('errorBanner').classList.remove('active');
  try {
    const data = await fetchWeather(city);
    state.weather = data;
    state.history = [data.city, ...state.history.filter(c => c.toLowerCase() !== data.city.toLowerCase())].slice(0, 5);
    localStorage.setItem('history', JSON.stringify(state.history));
    renderHistory();
    render(data);
  } catch (err) {
    el('errorMessage').textContent = err.message || "Failed to fetch weather.";
    el('errorBanner').classList.add('active');
    el('dashboardGrid').classList.remove('active');
  } finally {
    setLoading(false);
  }
}

function renderHistory() {
  el('historyContainer').innerHTML = state.history.map(city => `<button class="history-chip">📍 ${city}</button>`).join('');
  el('historyContainer').querySelectorAll('.history-chip').forEach((btn, idx) => {
    btn.addEventListener('click', () => search(state.history[idx]));
  });
}

function handleGeolocation() {
  if (!navigator.geolocation) {
    alert("Geolocation not supported.");
    return;
  }

  setLoading(true);

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      try {
        const { latitude: lat, longitude: lon } = pos.coords;

        const response = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`
        );

        if (!response.ok) {
          throw new Error("Unable to fetch weather.");
        }

        const current = await response.json();

        const data = await fetchWeather(current.name);

        state.weather = data;
        state.history = [
          data.city,
          ...state.history.filter(
            c => c.toLowerCase() !== data.city.toLowerCase()
          )
        ].slice(0, 5);

        localStorage.setItem("history", JSON.stringify(state.history));

        renderHistory();
        render(data);

      } catch (err) {
        alert(err.message);
      } finally {
        setLoading(false);
      }
    },
    () => {
      setLoading(false);
      alert("Unable to access your location.");
    }
  );
}
function setLoading(loading) {
  el('loadingOverlay').classList.toggle('active', loading);
  if (loading) el('dashboardGrid').classList.remove('active');
  document.querySelectorAll('#searchForm input, #searchForm button').forEach(item => item.disabled = loading);
}

document.addEventListener('DOMContentLoaded', () => {
  el('searchForm').addEventListener('submit', (e) => { e.preventDefault(); search(el('searchInput').value.trim()); });
  el('geoBtn').addEventListener('click', handleGeolocation);
  el('unitToggle').addEventListener('click', () => {
    state.unit = state.unit === 'C' ? 'F' : 'C';
    localStorage.setItem('unit', state.unit);
    el('unitToggle').textContent = `°${state.unit}`;
    if (state.weather) render(state.weather);
  });
  el('unitToggle').textContent = `°${state.unit}`;
  renderHistory();
  search(state.history[0] || 'New York');
});
